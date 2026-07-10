import json
from unittest.mock import MagicMock, patch

from anthropic import APIConnectionError

from rxsweep.audit import AuditLog
from rxsweep.chat import UNAVAILABLE, chat_reply
from rxsweep.triage import Finding


def _finding(citation=1):
    return Finding(
        item_name="Cefazolin Sodium",
        item_row=2,
        item_ndc="0409-4058-01",
        source="recall",
        label="exact_ndc",
        record={},
        severity="critical",
        severity_rationale="Class I recall: reasonable probability of serious harm",
        citation=citation,
    )


@patch("rxsweep.chat.Anthropic")
def test_chat_grounds_in_findings_and_audits(mock_cls, tmp_path):
    block = MagicMock()
    block.type = "text"
    block.text = "Cefazolin Sodium [1] carries a Class I recall."
    mock_client = mock_cls.return_value
    mock_client.messages.create.return_value = MagicMock(
        content=[block], usage=MagicMock(input_tokens=120, output_tokens=45)
    )

    audit = AuditLog(tmp_path)
    res = chat_reply([_finding()], [], "Which items have Class I recalls?", audit)
    assert "[1]" in res.reply
    assert res.input_tokens == 120 and res.output_tokens == 45

    # grounding context was sent as the first user message
    sent = mock_client.messages.create.call_args.kwargs["messages"]
    assert "Cefazolin Sodium" in sent[0]["content"]
    assert sent[-1]["content"] == "Which items have Class I recalls?"

    kinds = [json.loads(line) for line in audit.path.read_text().splitlines()]
    assert [k["kind"] for k in kinds] == ["ai_request", "ai_response"]
    assert all(k.get("stage") == "chat" for k in kinds)


@patch("rxsweep.chat.Anthropic")
def test_chat_failure_returns_unavailable_message(mock_cls, tmp_path):
    mock_cls.return_value.messages.create.side_effect = APIConnectionError(request=MagicMock())
    res = chat_reply([_finding()], [], "anything", AuditLog(tmp_path))
    assert res.reply == UNAVAILABLE and res.input_tokens == 0


def test_chat_endpoint_requires_finished_run_and_key(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from rxsweep.webapp.server import _RunState, create_app

    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    app = create_app(runs_root=tmp_path)
    client = TestClient(app)

    # unfinished run → 409
    app.state.runs["run1"] = _RunState()
    resp = client.post("/api/sweeps/run1/chat", json={"question": "hi"})
    assert resp.status_code == 409

    # finished but no key → 503 with actionable message
    state = _RunState()
    state.status = "done"
    state.result = MagicMock(run_dir=tmp_path, findings=[])
    app.state.runs["run2"] = state
    resp = client.post("/api/sweeps/run2/chat", json={"question": "hi"})
    assert resp.status_code == 503
    assert "ANTHROPIC_API_KEY" in resp.json()["detail"]
