import json
from pathlib import Path

import httpx
import respx

from rxsweep.pipeline import run_sweep

FIX = Path(__file__).parent / "fixtures"
SAMPLE = Path("src/rxsweep/data/sample_formulary.csv")


def _mock_openfda():
    for pattern, fixture in [
        (r".*drug/enforcement\.json.*", "enforcement_page.json"),
        (r".*drug/shortages\.json.*", "shortages_page.json"),
        (r".*drug/ndc\.json.*", "ndc_batch.json"),
    ]:
        payload = json.loads((FIX / fixture).read_text())
        respx.get(url__regex=pattern).mock(return_value=httpx.Response(200, json=payload))


@respx.mock
def test_run_sweep_returns_result_and_streams_progress(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _mock_openfda()
    events = []
    result = run_sweep(SAMPLE, tmp_path, use_ai=False, on_progress=events.append)
    assert result.report_path.exists()
    assert (result.run_dir / "audit.jsonl").exists()
    kinds = [e["kind"] for e in events]
    assert kinds[0] == "run_start" and kinds[-1] == "run_end"
    assert "fda_request" in kinds and "match" in kinds
    # progress events mirror the audit log exactly
    logged = [json.loads(line)["kind"] for line in (result.run_dir / "audit.jsonl").read_text().splitlines()]
    assert kinds == logged
    assert result.quarantined and isinstance(result.tiers, dict)
