"""Formulary CSV ingest: column auto-detection and row quarantine.

Rows never disappear silently. A row without a usable name is quarantined;
a row with an unparseable NDC keeps flowing (name matching still applies)
but is also recorded in the quarantine list so the report can disclose it.
"""

import csv
import re
from pathlib import Path

from pydantic import BaseModel

from rxsweep.matching import NormalizedNDC, normalize_ndc


class FormularyItem(BaseModel):
    row: int
    ndc: NormalizedNDC | None
    name: str
    raw: dict[str, str]


class QuarantinedRow(BaseModel):
    row: int
    reason: str
    raw: dict[str, str]


class FormularyLoad(BaseModel):
    items: list[FormularyItem]
    quarantined: list[QuarantinedRow]
    columns: dict[str, str]


def _detect(headers: list[str]) -> dict[str, str]:
    cols: dict[str, str] = {}
    for h in headers:
        if "ndc" not in cols and re.search(r"(?i)ndc", h):
            cols["ndc"] = h
        if "name" not in cols and re.search(r"(?i)(drug|description|name|item)", h):
            cols["name"] = h
    if "ndc" not in cols or "name" not in cols:
        raise ValueError(f"Could not detect NDC/name columns in headers: {headers}")
    return cols


# FormularyItem now exists — resolve matching's forward references so
# Hit/Candidate/MatchResults are constructible by any importer.
from rxsweep import matching as _matching  # noqa: E402

_matching._ensure_models()


def load_formulary(path: Path) -> FormularyLoad:
    items: list[FormularyItem] = []
    quarantined: list[QuarantinedRow] = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        cols = _detect(list(reader.fieldnames or []))
        for lineno, raw in enumerate(reader, start=2):
            name = (raw.get(cols["name"]) or "").strip()
            ndc_raw = (raw.get(cols["ndc"]) or "").strip()
            if not name:
                quarantined.append(QuarantinedRow(row=lineno, reason="missing name", raw=raw))
                continue
            ndc: NormalizedNDC | None = None
            if ndc_raw:
                n = normalize_ndc(ndc_raw)
                if n.valid:
                    ndc = n
                else:
                    quarantined.append(
                        QuarantinedRow(row=lineno, reason=f"invalid ndc: {ndc_raw!r}", raw=raw)
                    )
            items.append(FormularyItem(row=lineno, ndc=ndc, name=name, raw=raw))
    return FormularyLoad(items=items, quarantined=quarantined, columns=cols)
