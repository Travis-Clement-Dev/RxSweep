import json

from rxsweep.audit import AuditLog


def test_events_append_jsonl(tmp_path):
    log = AuditLog(tmp_path)
    log.event(kind="run_start", argv=["check", "f.csv"])
    log.event(kind="fda_request", url="u", params={})
    lines = [json.loads(line) for line in log.path.read_text().splitlines()]
    assert [rec["kind"] for rec in lines] == ["run_start", "fda_request"]
    assert all("ts" in rec for rec in lines)


def test_non_serializable_values_stringified(tmp_path):
    log = AuditLog(tmp_path)
    log.event(kind="odd", value={1, 2})  # a set is not JSON-serializable
    rec = json.loads(log.path.read_text())
    assert rec["kind"] == "odd"


def test_creates_run_dir(tmp_path):
    run_dir = tmp_path / "nested" / "run"
    AuditLog(run_dir).event(kind="run_start")
    assert (run_dir / "audit.jsonl").exists()
