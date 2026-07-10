import json
from pathlib import Path

import httpx
import respx
from typer.testing import CliRunner

from rxsweep.cli import app

FIX = Path(__file__).parent / "fixtures"
runner = CliRunner()


def _mock_openfda():
    enf = json.loads((FIX / "enforcement_page.json").read_text())
    short = json.loads((FIX / "shortages_page.json").read_text())
    ndc = json.loads((FIX / "ndc_batch.json").read_text())
    respx.get(url__regex=r".*drug/enforcement\.json.*").mock(
        return_value=httpx.Response(200, json=enf)
    )
    respx.get(url__regex=r".*drug/shortages\.json.*").mock(
        return_value=httpx.Response(200, json=short)
    )
    respx.get(url__regex=r".*drug/ndc\.json.*").mock(return_value=httpx.Response(200, json=ndc))


@respx.mock
def test_check_end_to_end_no_ai(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _mock_openfda()
    result = runner.invoke(
        app,
        ["check", "src/rxsweep/data/sample_formulary.csv", "--out", str(tmp_path), "--no-ai"],
    )
    assert result.exit_code == 0, result.output
    run_dir = next(tmp_path.iterdir())
    html = (run_dir / "report.html").read_text()
    assert "Quarantined rows" in html
    assert "pharmacist verifies" in html
    kinds = [json.loads(line)["kind"] for line in (run_dir / "audit.jsonl").read_text().splitlines()]
    assert kinds[0] == "run_start" and kinds[-1] == "run_end"
    assert "fda_request" in kinds


@respx.mock
def test_check_fda_outage_disclosed(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _mock_openfda()
    respx.get(url__regex=r".*drug/shortages\.json.*").mock(
        return_value=httpx.Response(500)
    )
    result = runner.invoke(
        app,
        ["check", "src/rxsweep/data/sample_formulary.csv", "--out", str(tmp_path), "--no-ai"],
    )
    assert result.exit_code == 0, result.output
    run_dir = next(tmp_path.iterdir())
    html = (run_dir / "report.html").read_text()
    assert "Unchecked items" in html and "shortages source unavailable" in html


@respx.mock
def test_ndc_directory_outage_not_mislabeled_as_not_found(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _mock_openfda()
    respx.get(url__regex=r".*drug/ndc\.json.*").mock(return_value=httpx.Response(503))
    result = runner.invoke(
        app,
        ["check", "src/rxsweep/data/sample_formulary.csv", "--out", str(tmp_path), "--no-ai"],
    )
    assert result.exit_code == 0, result.output
    html = (next(tmp_path.iterdir()) / "report.html").read_text()
    assert "ndc directory source unavailable" in html
    assert "not found in directory" not in html


@respx.mock
def test_demo_command(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _mock_openfda()
    result = runner.invoke(app, ["demo", "--out", str(tmp_path), "--no-ai"])
    assert result.exit_code == 0, result.output
    assert "Memo:" in result.output and "findings.xlsx" in result.output
