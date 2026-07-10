"""RxSweep CLI: sweep a formulary CSV against FDA recalls, shortages, NDC status."""

from importlib import resources
from pathlib import Path

import typer
from dotenv import load_dotenv

from rxsweep.pipeline import run_sweep

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
    result = run_sweep(csv_path, out, months_back=months_back, use_ai=not no_ai)

    typer.echo(f"Memo:    {result.report_path}  (print to PDF from the browser)")
    typer.echo(f"Exports: {result.run_dir / 'findings.csv'} · findings.xlsx · findings.md")
    typer.echo(f"Audit:   {result.meta['audit_path']}")
    typer.echo(
        "Findings: "
        + (", ".join(f"{t}={n}" for t, n in result.tiers.items()) if result.tiers else "none")
        + (f" · manual review: {len(result.manual_review)}" if result.manual_review else "")
    )
    if result.tiers.get("critical"):
        raise typer.Exit(code=1)


@app.command()
def demo(
    out: Path = typer.Option(Path("runs"), help="Directory for run outputs"),
    no_ai: bool = typer.Option(False, "--no-ai", help="Skip AI triage"),
) -> None:
    """Run check on the bundled synthetic sample formulary."""
    sample = resources.files("rxsweep") / "data" / "sample_formulary.csv"
    check(csv_path=Path(str(sample)), out=out, months_back=24, no_ai=no_ai)


@app.command()
def serve(
    host: str = typer.Option("127.0.0.1", help="Bind address (local-first by default)"),
    port: int = typer.Option(8555, help="Port"),
) -> None:
    """Serve the RxSweep web app locally."""
    load_dotenv()
    import uvicorn

    from rxsweep.webapp.server import create_app

    uvicorn.run(create_app(), host=host, port=port)


if __name__ == "__main__":
    app()
