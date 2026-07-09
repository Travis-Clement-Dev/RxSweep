"""NDC normalization and deterministic formulary matching.

FDA publishes 10-digit hyphenated NDCs in three segment patterns (4-4-2, 5-3-2,
5-4-1); formulary extracts usually carry the 11-digit billing format (5-4-2)
with a leading zero padded into the short segment. Where the zero goes depends
on the original pattern, so a 10-digit NDC *without* hyphens is genuinely
ambiguous — we surface all three candidates rather than guess.
"""

from pydantic import BaseModel

# 10-digit hyphenated pattern → index of the segment that takes the pad zero
_PAD = {(4, 4, 2): 0, (5, 3, 2): 1, (5, 4, 1): 2}


class NormalizedNDC(BaseModel):
    raw: str
    canonical: list[str]
    ambiguous: bool = False
    valid: bool = True


def _pad(segs: tuple[str, str, str], idx: int) -> str:
    parts = list(segs)
    parts[idx] = "0" + parts[idx]
    return "".join(parts)


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
