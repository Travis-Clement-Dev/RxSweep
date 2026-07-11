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
    usage = result["meta"]["ai_usage"]
    assert set(usage) == {"model", "input_tokens", "output_tokens", "est_cost_usd"}
    assert result["quarantined"] and result["manual_review"]

    report = client.get(f"/api/sweeps/{sweep_id}/report")
    assert report.status_code == 200 and "pharmacist verifies" in report.text

    audit = client.get(f"/api/sweeps/{sweep_id}/export/audit")
    assert audit.status_code == 200
    assert "audit.jsonl" in audit.headers["content-disposition"]
    assert '"kind": "run_start"' in audit.text.splitlines()[0].replace('"kind":"', '"kind": "')


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


def _finished_state(tmp_path):
    """A done _RunState with citations 1 (recall) and 2 (AI-matched)."""
    from rxsweep.pipeline import SweepResult
    from rxsweep.triage import Finding

    def finding(citation, **kw):
        base = dict(
            item_name="Cefazolin Sodium",
            item_row=2,
            item_ndc="0409-4058-01",
            source="recall",
            label="exact_ndc",
            record={"recall_number": "D-0001-2026", "classification": "Class I"},
            severity="critical",
            severity_rationale="Class I recall",
            citation=citation,
        )
        base.update(kw)
        return Finding(**base)

    run_dir = tmp_path / "run"
    run_dir.mkdir(parents=True, exist_ok=True)
    from rxsweep.webapp.server import _RunState

    state = _RunState()
    state.status = "done"
    state.result = SweepResult(
        run_id="testrun",
        run_dir=run_dir,
        findings=[
            finding(1),
            finding(2, severity="moderate", label="ai_matched", item_name="Metformin HCl ER"),
        ],
        quarantined=[],
        manual_review=[],
        unchecked=[],
        summary=None,
        meta={},
        tiers={"critical": 1, "moderate": 1},
        report_path=run_dir / "report.html",
    )
    return state


def test_disposition_lifecycle(tmp_path):
    from rxsweep.webapp.server import create_app

    app = create_app(runs_root=tmp_path)
    client = TestClient(app)
    app.state.runs["abc"] = _finished_state(tmp_path)

    resp = client.post(
        "/api/sweeps/abc/dispositions",
        json={"citation": 1, "action": "quarantined", "operator": "tc"},
    )
    assert resp.status_code == 201
    event = resp.json()
    assert event["kind"] == "disposition"
    assert event["action"] == "quarantined"
    assert event["operator"] == "TC"  # normalized to uppercase
    assert event["note"] is None and event["ts"]

    # dismissal requires a note; reopened is the append-only undo
    resp = client.post(
        "/api/sweeps/abc/dispositions",
        json={"citation": 2, "action": "dismissed", "operator": "TC", "note": "Different package size"},
    )
    assert resp.status_code == 201
    resp = client.post(
        "/api/sweeps/abc/dispositions",
        json={"citation": 1, "action": "reopened", "operator": "TC"},
    )
    assert resp.status_code == 201

    payload = client.get("/api/sweeps/abc").json()
    events = payload["result"]["dispositions"]
    assert [(e["citation"], e["action"]) for e in events] == [
        (1, "quarantined"),
        (2, "dismissed"),
        (1, "reopened"),
    ]

    # every event lands verbatim in the run's audit trail
    audit_lines = [
        json.loads(line)
        for line in (tmp_path / "run" / "audit.jsonl").read_text().splitlines()
    ]
    assert [e for e in audit_lines if e["kind"] == "disposition"] == events


def test_disposition_validation(tmp_path):
    from rxsweep.webapp.server import create_app

    app = create_app(runs_root=tmp_path)
    client = TestClient(app)
    app.state.runs["abc"] = _finished_state(tmp_path)

    post = lambda body: client.post("/api/sweeps/abc/dispositions", json=body)  # noqa: E731
    assert post({"citation": 1, "action": "archived", "operator": "TC"}).status_code == 422
    assert post({"citation": 1, "action": "quarantined", "operator": "T"}).status_code == 422
    assert post({"citation": 2, "action": "dismissed", "operator": "TC"}).status_code == 422
    assert post({"citation": 2, "action": "dismissed", "operator": "TC", "note": "  "}).status_code == 422
    assert post({"citation": 99, "action": "quarantined", "operator": "TC"}).status_code == 404

    from rxsweep.webapp.server import _RunState

    app.state.runs["running"] = _RunState()
    resp = client.post(
        "/api/sweeps/running/dispositions",
        json={"citation": 1, "action": "quarantined", "operator": "TC"},
    )
    assert resp.status_code == 409


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
