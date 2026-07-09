"""NDC normalization and deterministic formulary matching.

FDA publishes 10-digit hyphenated NDCs in three segment patterns (4-4-2, 5-3-2,
5-4-1); formulary extracts usually carry the 11-digit billing format (5-4-2)
with a leading zero padded into the short segment. Where the zero goes depends
on the original pattern, so a 10-digit NDC *without* hyphens is genuinely
ambiguous — we surface all three candidates rather than guess.
"""

import re
from datetime import date
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel

if TYPE_CHECKING:
    from rxsweep.ingest import FormularyItem

# 10-digit hyphenated pattern → index of the segment that takes the pad zero
_PAD = {(4, 4, 2): 0, (5, 3, 2): 1, (5, 4, 1): 2}

_SALTS = {
    "sodium", "hcl", "hydrochloride", "sulfate", "tartrate",
    "besylate", "succinate", "mesylate", "maleate", "citrate",
}
_NDC_IN_TEXT = re.compile(r"\b\d{4,5}-\d{3,4}-\d{1,2}\b")


class NormalizedNDC(BaseModel):
    raw: str
    canonical: list[str]
    ambiguous: bool = False
    valid: bool = True


def _pad(segs: tuple[str, str, str], idx: int) -> str:
    parts = list(segs)
    parts[idx] = "0" + parts[idx]
    return "".join(parts)


def denormalize_ndc(canonical: str) -> list[str]:
    """11-digit (5-4-2) → possible 10-digit hyphenated originals.

    Inverse of the pad in normalize_ndc: the original had one segment shorter
    by a leading zero, so each zero-leading segment yields one candidate.
    """
    a, b, c = canonical[:5], canonical[5:9], canonical[9:]
    out: list[str] = []
    if a.startswith("0"):
        out.append(f"{a[1:]}-{b}-{c}")  # was 4-4-2
    if b.startswith("0"):
        out.append(f"{a}-{b[1:]}-{c}")  # was 5-3-2
    if c.startswith("0"):
        out.append(f"{a}-{b}-{c[1:]}")  # was 5-4-1
    return out


def normalize_ndc(raw: str) -> NormalizedNDC:
    s = raw.strip()
    if "-" in s:
        segs = tuple(s.split("-"))
        if len(segs) == 3 and all(p.isdigit() and p for p in segs):
            lens = tuple(len(p) for p in segs)
            if lens == (5, 4, 2):
                return NormalizedNDC(raw=raw, canonical=["".join(segs)])
            if lens in _PAD:
                return NormalizedNDC(raw=raw, canonical=[_pad(segs, _PAD[lens])])  # type: ignore[arg-type]
        return NormalizedNDC(raw=raw, canonical=[], valid=False)
    if s.isdigit() and len(s) == 11:
        return NormalizedNDC(raw=raw, canonical=[s])
    if s.isdigit() and len(s) == 10:
        candidates = sorted(
            {
                _pad((s[:4], s[4:8], s[8:]), 0),  # if source was 4-4-2
                _pad((s[:5], s[5:8], s[8:]), 1),  # if source was 5-3-2
                _pad((s[:5], s[5:9], s[9:]), 2),  # if source was 5-4-1
            }
        )
        return NormalizedNDC(raw=raw, canonical=candidates, ambiguous=True)
    return NormalizedNDC(raw=raw, canonical=[], valid=False)


def normalize_name(s: str) -> str:
    """Lowercase, strip punctuation and common salt suffixes."""
    tokens = re.sub(r"[^\w\s]", " ", s.lower()).split()
    return " ".join(t for t in tokens if t not in _SALTS)


def extract_ndcs_from_text(text: str) -> set[str]:
    """Harvest hyphenated NDCs from free text (code_info, product_description)."""
    out: set[str] = set()
    for m in _NDC_IN_TEXT.findall(text or ""):
        n = normalize_ndc(m)
        if n.valid and not n.ambiguous:
            out.update(n.canonical)
    return out


class Hit(BaseModel):
    item: "FormularyItem"
    source: Literal["recall", "shortage", "ndc"]
    label: Literal["exact_ndc", "name_match"]
    record: dict


class Candidate(BaseModel):
    item: "FormularyItem"
    source: str
    record: dict
    reason: str


class MatchResults(BaseModel):
    hits: list[Hit]
    candidates: list[Candidate]
    unmatched: list["FormularyItem"]


def _recall_ndcs(rec: dict) -> set[str]:
    out: set[str] = set()
    fda = rec.get("openfda") or {}
    for field in ("package_ndc", "product_ndc"):
        for raw in fda.get(field, []) or []:
            n = normalize_ndc(raw)
            if n.valid and not n.ambiguous:
                out.update(n.canonical)
    out |= extract_ndcs_from_text(rec.get("code_info", ""))
    out |= extract_ndcs_from_text(rec.get("product_description", ""))
    return out


def _tokens(name_norm: str) -> set[str]:
    return {t for t in name_norm.split() if len(t) >= 5}


_MODELS_READY = False


def _ensure_models() -> None:
    """Resolve the FormularyItem forward reference lazily.

    ingest imports matching at module load, so matching cannot import ingest
    at the top level; pydantic rebuilds the models on first use instead.
    """
    global _MODELS_READY
    if not _MODELS_READY:
        from rxsweep.ingest import FormularyItem

        globals()["FormularyItem"] = FormularyItem
        for model in (Hit, Candidate, MatchResults):
            model.model_rebuild()
        _MODELS_READY = True


def match_items(
    items: list["FormularyItem"],
    recalls: list[dict],
    shortages: list[dict],
    ndc_status: dict[str, dict],
) -> MatchResults:
    _ensure_models()
    today = date.today().strftime("%Y%m%d")
    recall_index = [(rec, _recall_ndcs(rec), normalize_name(rec.get("product_description", ""))) for rec in recalls]
    shortage_index = [
        (rec, set(normalize_ndc(rec["package_ndc"]).canonical) if rec.get("package_ndc") else set(),
         normalize_name(rec.get("generic_name", "")))
        for rec in shortages
    ]

    hits: list[Hit] = []
    candidates: list[Candidate] = []
    unmatched: list = []

    for item in items:
        item_hit = False
        name_norm = normalize_name(item.name)
        toks = _tokens(name_norm)
        canonicals = set(item.ndc.canonical) if item.ndc else set()
        ambiguous = bool(item.ndc and item.ndc.ambiguous)

        for rec, rec_ndcs, desc_norm in recall_index:
            overlap = canonicals & rec_ndcs
            if overlap and not ambiguous:
                hits.append(Hit(item=item, source="recall", label="exact_ndc", record=rec))
                item_hit = True
            elif overlap and ambiguous:
                candidates.append(Candidate(item=item, source="recall", record=rec,
                                            reason="ambiguous 10-digit NDC"))
            elif name_norm and desc_norm and name_norm in desc_norm:
                hits.append(Hit(item=item, source="recall", label="name_match", record=rec))
                item_hit = True
            elif toks & set(desc_norm.split()):
                candidates.append(Candidate(item=item, source="recall", record=rec,
                                            reason="partial name overlap with recall text"))

        for rec, rec_ndcs, gen_norm in shortage_index:
            if canonicals & rec_ndcs and not ambiguous:
                hits.append(Hit(item=item, source="shortage", label="exact_ndc", record=rec))
                item_hit = True
            elif canonicals & rec_ndcs and ambiguous:
                candidates.append(Candidate(item=item, source="shortage", record=rec,
                                            reason="ambiguous 10-digit NDC"))
            elif name_norm and gen_norm and (gen_norm in name_norm or name_norm in gen_norm):
                hits.append(Hit(item=item, source="shortage", label="name_match", record=rec))
                item_hit = True

        if item.ndc and not ambiguous:
            canonical = item.ndc.canonical[0]
            rec = ndc_status.get(canonical)
            if rec is None:
                candidates.append(Candidate(item=item, source="ndc", record={},
                                            reason="ndc not found in directory"))
            else:
                exp = rec.get("listing_expiration_date", "")
                if exp and exp < today:
                    hits.append(Hit(item=item, source="ndc", label="exact_ndc", record=rec))
                    item_hit = True

        if not item_hit and not any(c.item is item for c in candidates):
            unmatched.append(item)

    return MatchResults(hits=hits, candidates=candidates, unmatched=unmatched)
