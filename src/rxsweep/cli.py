"""RxSweep CLI: sweep a formulary CSV against FDA recalls, shortages, NDC status."""

import os
from datetime import datetime, timezone
from importlib import resources
from pathlib import Path

import typer
from dotenv import load_dotenv

from rxsweep.audit import AuditLog
from rxsweep.ingest import load_formulary
from rxsweep.matching import aggregate_shortages, match_items
from rxsweep.report import render_report
from rxsweep.sources.openfda import OpenFDAClient, fetch_ndc_status, fetch_recalls, fetch_shortages
from rxsweep.triage import DEFAULT_MODEL, adjudicate, build_findings, summarize

app = typer.Typer(help=__doc__, add_completion=False)


@app.command()
def check(
    csv_path: Path = typer.Argument(..., exists=True, readable=True, help="Formulary CSV"),
    out: Path = typer.Option(Path("runs"), help="Directory for run outputs"),
    months_back: int = typer.Option(24, help="Recall lookback window in months"),
    no_ai: bool = typer.Option(False, "--no-ai", help="Skip AI triage (deterministic only)"),
) -> None:
    """Sweep CSV_PATH and write a cited HTML report plus a JSONL audit log."""
    load_dotenv()
    run_ts = datetime.now(timezone.utc)
    run_dir = out / run_ts.strftime("%Y%m%dT%H%M%SZ")
    audit = AuditLog(run_dir)
    audit.event(kind="run_start", csv=str(csv_path), months_back=months_back, no_ai=no_ai)

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
                f"{label} source unavailable — {len(fl.items)} items unchecked against {label}"
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

    ai_available = not no_ai and bool(os.environ.get("ANTHROPIC_API_KEY"))
    if not ai_available:
        audit.event(kind="ai_skipped", reason="--no-ai" if no_ai else "no ANTHROPIC_API_KEY")
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

    typer.echo(f"Report:  {report_path}")
    typer.echo(f"Audit:   {audit.path}")
    typer.echo(
        "Findings: "
        + (", ".join(f"{t}={n}" for t, n in tiers.items()) if tiers else "none")
        + (f" · manual review: {len(manual_review)}" if manual_review else "")
    )
    if tiers.get("critical"):
        raise typer.Exit(code=1)


@app.command()
def demo(
    out: Path = typer.Option(Path("runs"), help="Directory for run outputs"),
    no_ai: bool = typer.Option(False, "--no-ai", help="Skip AI triage"),
) -> None:
    """Run check on the bundled synthetic sample formulary."""
    sample = resources.files("rxsweep") / "data" / "sample_formulary.csv"
    check(csv_path=Path(str(sample)), out=out, months_back=24, no_ai=no_ai)


if __name__ == "__main__":
    app()
