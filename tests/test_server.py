import json
import time
from pathlib import Path

import httpx
import respx
from fastapi.testclient import TestClient

from rxsweep.webapp.server import create_app

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


def _wait_done(client, sweep_id, timeout=15.0) -> dict:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        payload = client.get(f"/api/sweeps/{sweep_id}").json()
        if payload["status"] in ("done", "error"):
            return payload
        time.sleep(0.05)
    raise AssertionError("sweep did not finish in time")


@respx.mock
def test_sweep_lifecycle(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _mock_openfda()
    client = TestClient(create_app(runs_root=tmp_path))
    with open(SAMPLE, "rb") as f:
        resp = client.post(
            "/api/sweeps",
            files={"file": ("formulary.csv", f, "text/csv")},
            params={"use_ai": "false"},
        )
    assert resp.status_code == 202
    sweep_id = resp.json()["sweep_id"]

    payload = _wait_done(client, sweep_id)
    assert payload["status"] == "done", payload
    assert payload["items"] > 0 and payload["fda_requests"] > 0
    result = payload["result"]
    # trimmed fixtures produce no deterministic findings; the shape is the contract
    assert "findings" in result and "tiers" in result and "summary" in result
    assert result["quarantined"] and result["manual_review"]

    report = client.get(f"/api/sweeps/{sweep_id}/report")
    assert report.status_code == 200 and "pharmacist verifies" in report.text


def test_unknown_sweep_404(tmp_path):
    client = TestClient(create_app(runs_root=tmp_path))
    assert client.get("/api/sweeps/nope").status_code == 404


@respx.mock
def test_bad_csv_surfaces_error_not_500(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _mock_openfda()
    client = TestClient(create_app(runs_root=tmp_path))
    resp = client.post(
        "/api/sweeps",
        files={"file": ("bad.csv", b"Foo,Bar\n1,2\n", "text/csv")},
        params={"use_ai": "false"},
    )
    assert resp.status_code == 202
    payload = _wait_done(client, resp.json()["sweep_id"])
    assert payload["status"] == "error"
    assert "Could not detect" in payload["error"]


def test_report_before_done_409(tmp_path):
    client = TestClient(create_app(runs_root=tmp_path))
    # no sweeps yet: unknown id is 404; a running id would be 409 (covered by
    # lifecycle timing being too fast to catch reliably; 409 path unit-tested
    # via direct state manipulation)
    from rxsweep.webapp.server import _RunState

    app = create_app(runs_root=tmp_path)
    client = TestClient(app)
    app.state.runs["abc"] = _RunState()
    assert client.get("/api/sweeps/abc/report").status_code == 409
