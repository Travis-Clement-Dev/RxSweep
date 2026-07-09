import json
from unittest.mock import MagicMock, patch

from anthropic import APIConnectionError

from rxsweep.audit import AuditLog
from rxsweep.ingest import FormularyItem
from rxsweep.matching import Candidate, Hit, MatchResults, normalize_ndc
from rxsweep.triage import (
    AdjudicationResult,
    Verdict,
    VerdictItem,
    adjudicate,
    build_findings,
    rank_severity,
    summarize,
)


def _item(name="Cefazolin", ndc="0409-4058-01"):
    return FormularyItem(row=2, name=name, ndc=normalize_ndc(ndc), raw={})


def _candidate(reason="partial name overlap with recall text"):
    return Candidate(
        item=_item(),
        source="recall",
        record={"product_description": "Cefazolin 1g vial", "classification": "Class II"},
        reason=reason,
    )


@patch("rxsweep.triage.Anthropic")
def test_adjudicate_maps_verdicts_and_audits(mock_cls, tmp_path):
    mock_client = mock_cls.return_value
    mock_client.messages.parse.return_value = MagicMock(
        parsed_output=AdjudicationResult(
            verdicts=[VerdictItem(index=0, is_match=True, confidence="high", rationale="same drug")]
        )
    )
    audit = AuditLog(tmp_path)
    out = adjudicate([_candidate()], audit)
    assert len(out) == 1 and out[0].is_match and out[0].confidence == "high"
    kinds = [json.loads(line)["kind"] for line in audit.path.read_text().splitlines()]
    assert kinds == ["ai_request", "ai_response"]


@patch("rxsweep.triage.Anthropic")
def test_adjudicate_api_failure_degrades_to_empty(mock_cls, tmp_path):
    mock_client = mock_cls.return_value
    mock_client.messages.parse.side_effect = APIConnectionError(request=MagicMock())
    audit = AuditLog(tmp_path)
    assert adjudicate([_candidate()], audit) == []
    kinds = [json.loads(line)["kind"] for line in audit.path.read_text().splitlines()]
    assert "ai_unavailable" in kinds


@patch("rxsweep.triage.Anthropic")
def test_adjudicate_malformed_structured_output_degrades(mock_cls, tmp_path):
    from pydantic import ValidationError

    mock_cls.return_value.messages.parse.side_effect = ValidationError.from_exception_data(
        "AdjudicationResult", []
    )
    audit = AuditLog(tmp_path)
    assert adjudicate([_candidate()], audit) == []
    kinds = [json.loads(line)["kind"] for line in audit.path.read_text().splitlines()]
    assert "ai_unavailable" in kinds


@patch("rxsweep.triage.Anthropic")
def test_summarize_returns_text(mock_cls, tmp_path):
    block = MagicMock()
    block.type = "text"
    block.text = "Summary [1]."
    mock_cls.return_value.messages.create.return_value = MagicMock(content=[block])
    findings = build_findings(
        MatchResults(
            hits=[Hit(item=_item(), source="recall", label="exact_ndc",
                      record={"classification": "Class II"})],
            candidates=[],
            unmatched=[],
        ),
        [],
    )
    text = summarize(findings, AuditLog(tmp_path))
    assert text == "Summary [1]."


def test_summarize_empty_findings_no_api_call(tmp_path):
    assert summarize([], AuditLog(tmp_path)) is None


def test_rank_severity_tiers_exist():
    tier, rationale = rank_severity("exact_ndc", "recall", "Class I", None, False)
    assert tier == "critical" and rationale


def test_build_findings_orders_by_severity_and_renumbers():
    class_i = Hit(item=_item("DrugA"), source="recall", label="exact_ndc",
                  record={"classification": "Class I"})
    shortage_v = Verdict(
        candidate=Candidate(item=_item("DrugB", "54868-0123-1"), source="shortage",
                            record={"status": "Resolved"}, reason="x"),
        is_match=True, confidence="medium", rationale="matched",
    )
    findings = build_findings(
        MatchResults(hits=[class_i], candidates=[shortage_v.candidate], unmatched=[]),
        [shortage_v],
    )
    assert [f.severity for f in findings] == ["critical", "info"]
    assert [f.citation for f in findings] == [1, 2]
    assert findings[1].label == "ai_matched"


def test_build_findings_groups_multiple_records_per_item_and_source():
    hits = [
        Hit(item=_item("DrugA"), source="recall", label="exact_ndc",
            record={"classification": "Class II", "recall_number": "D-1"}),
        Hit(item=_item("DrugA"), source="recall", label="exact_ndc",
            record={"classification": "Class II", "recall_number": "D-2"}),
        Hit(item=_item("DrugA"), source="recall", label="exact_ndc",
            record={"classification": "Class I", "recall_number": "D-3"}),
    ]
    findings = build_findings(MatchResults(hits=hits, candidates=[], unmatched=[]), [])
    assert len(findings) == 1
    f = findings[0]
    assert f.severity == "critical"  # worst record wins
    assert "+2 more record" in f.severity_rationale


def test_build_findings_rejected_verdicts_excluded():
    v = Verdict(candidate=_candidate(), is_match=False, confidence="low", rationale="different")
    findings = build_findings(MatchResults(hits=[], candidates=[v.candidate], unmatched=[]), [v])
    assert findings == []
