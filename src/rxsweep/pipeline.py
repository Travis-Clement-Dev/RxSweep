"""The sweep pipeline, reusable by the CLI and the web server.

One audit-event stream feeds two consumers: the JSONL audit log (governance)
and the optional on_progress callback (live UX). They can never disagree
because they observe the same events.
"""

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from pydantic import BaseModel

from rxsweep.audit import AuditLog
from rxsweep.ingest import QuarantinedRow, load_formulary
from rxsweep.matching import Candidate, aggregate_shortages, match_items
from rxsweep.report import render_report
from rxsweep.sources.openfda import OpenFDAClient, fetch_ndc_status, fetch_recalls, fetch_shortages
from rxsweep.triage import DEFAULT_MODEL, Finding, adjudicate, build_findings, summarize


class SweepResult(BaseModel):
    run_id: str
    run_dir: Path
    findings: list[Finding]
    quarantined: list[QuarantinedRow]
    manual_review: list[Candidate]
    unchecked: list[str]
    summary: str | None
    meta: dict
    tiers: dict[str, int]
    report_path: Path


class _TappedAudit(AuditLog):
    """AuditLog that also forwards every event to a progress callback."""

    def __init__(self, run_dir: Path, tap: Callable[[dict], None] | None):
        super().__init__(run_dir)
        self._tap = tap or (lambda e: None)

    def event(self, kind: str, **fields) -> None:
        super().event(kind, **fields)
        self._tap({"kind": kind, **fields})


def run_sweep(
    csv_path: Path,
    out_dir: Path,
    months_back: int = 24,
    use_ai: bool = True,
    on_progress: Callable[[dict], None] | None = None,
) -> SweepResult:
    run_ts = datetime.now(timezone.utc)
    run_id = run_ts.strftime("%Y%m%dT%H%M%SZ")
    run_dir = out_dir / run_id
    audit = _TappedAudit(run_dir, on_progress)
    audit.event(kind="run_start", csv=str(csv_path), months_back=months_back, no_ai=not use_ai)

    fl = load_formulary(csv_path)
    audit.event(
        kind="ingest",
        items=len(fl.items),
        quarantined=len(fl.quarantined),
        columns=fl.columns,
    )

    client = OpenFDAClient(
        api_key=os.environ.get("OPENFDA_API_KEY"),
        on_event=lambda e: audit.event(**e),
    )
    unchecked: list[str] = []

    def _fetch(label: str, fn, *args):
        try:
            return fn(client, *args)
        except Exception as exc:  # noqa: BLE001 - disclosed, never swallowed
            audit.event(kind="fda_unavailable", source=label, error=str(exc))
            unchecked.append(
                f"{label} source unavailable: {len(fl.items)} items unchecked against {label}"
            )
            # None = source failed; [] would be indistinguishable from a
            # legitimate empty result and mislabel items downstream.
            return None

    recalls = _fetch("recalls", fetch_recalls, months_back) or []
    raw_shortages = _fetch("shortages", fetch_shortages)
    shortages = aggregate_shortages(raw_shortages) if raw_shortages is not None else []
    canonicals = sorted(
        {c for item in fl.items if item.ndc and not item.ndc.ambiguous for c in item.ndc.canonical}
    )
    ndc_status = _fetch("ndc directory", fetch_ndc_status, canonicals)

    results = match_items(fl.items, recalls, shortages, ndc_status)
    audit.event(
        kind="match",
        hits=len(results.hits),
        candidates=len(results.candidates),
        unmatched=len(results.unmatched),
    )

    ai_available = use_ai and bool(os.environ.get("ANTHROPIC_API_KEY"))
    if not ai_available:
        audit.event(kind="ai_skipped", reason="disabled" if not use_ai else "no ANTHROPIC_API_KEY")
    verdicts = adjudicate(results.candidates, audit) if ai_available else []
    adjudicated = {id(v.candidate) for v in verdicts}
    manual_review = [c for c in results.candidates if id(c) not in adjudicated]

    findings = build_findings(results, verdicts)
    summary = summarize(findings, audit) if ai_available and findings else None

    meta = dict(
        csv_name=csv_path.name,
        items_checked=len(fl.items),
        run_ts=run_ts.isoformat(timespec="seconds"),
        months_back=months_back,
        model=os.environ.get("RXSWEEP_MODEL", DEFAULT_MODEL),
        ai_available=ai_available,
        audit_path=str(audit.path),
    )
    report_path = run_dir / "report.html"
    report_path.write_text(
        render_report(findings, fl.quarantined, manual_review, unchecked, summary, meta)
    )

    tiers: dict[str, int] = {}
    for f in findings:
        tiers[f.severity] = tiers.get(f.severity, 0) + 1
    audit.event(kind="run_end", findings=len(findings), tiers=tiers)

    return SweepResult(
        run_id=run_id,
        run_dir=run_dir,
        findings=findings,
        quarantined=fl.quarantined,
        manual_review=manual_review,
        unchecked=unchecked,
        summary=summary,
        meta=meta,
        tiers=tiers,
        report_path=report_path,
    )
