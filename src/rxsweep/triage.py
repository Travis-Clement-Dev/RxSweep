"""Bounded AI triage: adjudicate fuzzy candidates, draft the cited summary.

Claude has exactly two jobs here and nothing else:
1. adjudicate() — judge whether a fuzzy candidate (formulary item ↔ FDA
   record) is a true match. Deterministic exact-NDC hits never reach it.
2. summarize() — draft the cited executive summary a pharmacist verifies.

Every prompt and completion is written verbatim to the audit log. If the
API is unavailable, the pipeline degrades to deterministic-only and says
so — it never fails the run or silently drops candidates.
"""

import os
from typing import Literal

from anthropic import Anthropic, APIConnectionError, APIStatusError, RateLimitError
from pydantic import BaseModel

from rxsweep.audit import AuditLog
from rxsweep.matching import Candidate, MatchResults

DEFAULT_MODEL = "claude-haiku-4-5"  # cost-efficient tier; override via RXSWEEP_MODEL
ADJUDICATION_BATCH = 10


def _model() -> str:
    return os.environ.get("RXSWEEP_MODEL", DEFAULT_MODEL)


class VerdictItem(BaseModel):
    index: int
    is_match: bool
    confidence: Literal["high", "medium", "low"]
    rationale: str


class AdjudicationResult(BaseModel):
    verdicts: list[VerdictItem]


class Verdict(BaseModel):
    candidate: Candidate
    is_match: bool
    confidence: Literal["high", "medium", "low"]
    rationale: str


class Finding(BaseModel):
    item_name: str
    item_row: int
    item_ndc: str | None
    source: str
    label: str
    record: dict
    severity: str
    severity_rationale: str
    ai_rationale: str | None = None
    citation: int


def _candidate_block(i: int, c: Candidate) -> str:
    ndc = c.item.ndc.raw if c.item.ndc else "none"
    rec_desc = (
        c.record.get("product_description")
        or c.record.get("generic_name")
        or str({k: c.record[k] for k in list(c.record)[:4]})
    )
    return (
        f"[{i}] Formulary item: name={c.item.name!r}, NDC={ndc}\n"
        f"    FDA {c.source} record: {rec_desc!r}\n"
        f"    Why it's a candidate: {c.reason}"
    )


def adjudicate(
    candidates: list[Candidate], audit: AuditLog, model: str | None = None
) -> list[Verdict]:
    """Judge fuzzy candidates in batches. Returns [] if AI is unavailable."""
    if not candidates:
        return []
    client = Anthropic()
    model = model or _model()
    verdicts: list[Verdict] = []
    for start in range(0, len(candidates), ADJUDICATION_BATCH):
        batch = candidates[start : start + ADJUDICATION_BATCH]
        prompt = (
            "You adjudicate whether pharmacy formulary items match FDA records. "
            "For each numbered candidate, decide is_match: true only if the FDA "
            "record plausibly refers to the same drug product as the formulary "
            "item (same active ingredient and dosage form family). Be "
            "conservative: when in doubt, is_match=false with confidence low. "
            "Return one verdict per candidate, using each candidate's index.\n\n"
            + "\n".join(_candidate_block(start + j, c) for j, c in enumerate(batch))
        )
        audit.event(kind="ai_request", model=model, prompt=prompt)
        try:
            response = client.messages.parse(
                model=model,
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
                output_format=AdjudicationResult,
            )
        except (RateLimitError, APIStatusError, APIConnectionError) as exc:
            audit.event(kind="ai_unavailable", stage="adjudicate", error=str(exc))
            return []
        result: AdjudicationResult = response.parsed_output
        audit.event(kind="ai_response", model=model, completion=result.model_dump())
        for v in result.verdicts:
            if start <= v.index < start + len(batch):
                verdicts.append(
                    Verdict(
                        candidate=candidates[v.index],
                        is_match=v.is_match,
                        confidence=v.confidence,
                        rationale=v.rationale,
                    )
                )
    return verdicts


def summarize(findings: list[Finding], audit: AuditLog, model: str | None = None) -> str | None:
    """Two-paragraph executive summary; every drug claim cites its [n] source."""
    if not findings:
        return None
    client = Anthropic()
    model = model or _model()
    lines = [
        f"[{f.citation}] {f.item_name} — {f.source} ({f.severity}): {f.severity_rationale}"
        for f in findings
    ]
    prompt = (
        "Draft a two-paragraph executive summary of these formulary sweep "
        "findings for a pharmacy operations huddle. Every drug you mention "
        "must carry its [n] citation. Factual and specific; no advice beyond "
        "flagging what needs pharmacist review.\n\n" + "\n".join(lines)
    )
    audit.event(kind="ai_request", model=model, prompt=prompt)
    try:
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
    except (RateLimitError, APIStatusError, APIConnectionError) as exc:
        audit.event(kind="ai_unavailable", stage="summarize", error=str(exc))
        return None
    text = "".join(block.text for block in response.content if block.type == "text")
    audit.event(kind="ai_response", model=model, completion=text)
    return text


def rank_severity(
    label: str,
    source: str,
    recall_class: str | None,
    shortage_status: str | None,
    ndc_missing: bool,
) -> tuple[str, str]:
    """Severity rubric — human-reviewed and approved by Travis Clement,
    PharmD (2026-07-09); see docs/SYSTEM_CARD.md.

    Tiers: critical | high | moderate | info.
    """
    if source == "recall" and recall_class == "Class I":
        return "critical", "Class I recall: reasonable probability of serious harm"
    if source == "recall" and recall_class == "Class II":
        if label == "exact_ndc":
            return "high", "Class II recall with exact NDC match to a stocked item"
        return "moderate", "Class II recall, name-level match — verify product identity"
    if source == "recall":
        return "moderate", f"Recall ({recall_class or 'unclassified'}) — verify scope"
    if source == "shortage" and (shortage_status or "").lower() == "current":
        return "high", "Active shortage on a stocked item"
    if source == "shortage":
        return "info", f"Shortage record with status {shortage_status!r}"
    if source == "ndc" and ndc_missing:
        return "moderate", "NDC not found in FDA directory — possible data issue"
    if source == "ndc":
        return "moderate", "NDC listing expired/discontinued — check reorder viability"
    return "info", "Unclassified finding"


def build_findings(results: MatchResults, verdicts: list[Verdict]) -> list[Finding]:
    """Merge deterministic hits with AI-confirmed candidates, rank and cite."""
    findings: list[Finding] = []
    n = 0

    def _mk(item, source, label, record, ai_rationale=None) -> Finding:
        nonlocal n
        n += 1
        severity, rationale = rank_severity(
            label=label,
            source=source,
            recall_class=record.get("classification"),
            shortage_status=record.get("status"),
            ndc_missing=(source == "ndc" and not record),
        )
        return Finding(
            item_name=item.name,
            item_row=item.row,
            item_ndc=item.ndc.raw if item.ndc else None,
            source=source,
            label=label,
            record=record,
            severity=severity,
            severity_rationale=rationale,
            ai_rationale=ai_rationale,
            citation=n,
        )

    for hit in results.hits:
        findings.append(_mk(hit.item, hit.source, hit.label, hit.record))
    for v in verdicts:
        if v.is_match:
            findings.append(
                _mk(v.candidate.item, v.candidate.source, "ai_matched", v.candidate.record,
                    ai_rationale=f"{v.rationale} (confidence: {v.confidence})")
            )

    order = {"critical": 0, "high": 1, "moderate": 2, "info": 3}
    findings.sort(key=lambda f: order.get(f.severity, 9))
    for i, f in enumerate(findings, start=1):
        f.citation = i
    return findings
