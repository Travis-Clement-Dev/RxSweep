from rxsweep.ingest import FormularyItem, QuarantinedRow
from rxsweep.matching import Candidate, normalize_ndc
from rxsweep.report import action_queue, render_report, source_url
from rxsweep.triage import Finding


def _finding(**kw):
    base = dict(
        item_name="Cefazolin Sodium",
        item_row=2,
        item_ndc="0409-4058-01",
        source="recall",
        label="exact_ndc",
        record={"recall_number": "D-0001-2026", "classification": "Class II"},
        severity="high",
        severity_rationale="Class II recall with exact NDC match to a stocked item",
        citation=1,
    )
    base.update(kw)
    return Finding(**base)


META = dict(
    csv_name="sample_formulary.csv",
    items_checked=40,
    run_ts="2026-07-09T18:00:00Z",
    months_back=24,
    model="claude-haiku-4-5",
    ai_available=True,
    audit_path="runs/20260709T180000/audit.jsonl",
)


def test_report_contains_scope_banner_and_finding():
    html = render_report([_finding()], [], [], [], "Summary [1].", META)
    assert "pharmacist verifies" in html
    assert "Cefazolin Sodium" in html
    assert "sev-high" in html
    assert "api.fda.gov/drug/enforcement.json" in html


def test_action_queue_includes_ai_matched_moderates():
    crit = _finding(severity="critical", label="name_match", citation=1)
    ai_mod = _finding(
        item_name="Metformin HCl ER",
        item_ndc="68382-0730-10",
        severity="moderate",
        label="ai_matched",
        citation=2,
    )
    plain_mod = _finding(severity="moderate", label="name_match", citation=3)
    queue = action_queue([crit, ai_mod, plain_mod])
    assert [a["citation"] for a in queue] == [1, 2]
    assert queue[1]["text"] == (
        "Verify product identity for Metformin HCl ER (68382-0730-10); "
        "AI-matched to the FDA record, not yet verified."
    )
    assert queue[1]["tag"] == "AI: verify"


def test_action_queue_lists_every_disposition_row():
    # Contract v1.3 (D11): the queue is uncapped — hiding disposition-required
    # findings contradicts worklist-first.
    finds = [
        _finding(severity="moderate", label="ai_matched", citation=i) for i in range(1, 10)
    ]
    assert len(action_queue(finds)) == 9


def test_ai_matched_label_shows_needs_verification():
    f = _finding(label="ai_matched", ai_rationale="same product (confidence: medium)")
    html = render_report([f], [], [], [], None, META)
    assert "needs verification" in html


def test_quarantine_and_unchecked_sections():
    q = QuarantinedRow(row=5, reason="invalid ndc: 'BADNDC'", raw={})
    html = render_report([], [q], [], ["shortages source unavailable"], None, META)
    assert "Excluded rows (1)" in html
    assert "Unchecked items (1)" in html
    assert "Treat them as unknown, not clear" in html


def test_ai_unavailable_banner_and_manual_review():
    meta = dict(META, ai_available=False)
    cand = Candidate(
        item=FormularyItem(row=3, name="Lidocaine", ndc=normalize_ndc("0143-9575-01"), raw={}),
        source="recall",
        record={},
        reason="partial name overlap with recall text",
    )
    html = render_report([], [], [cand], [], None, meta)
    assert "AI triage was unavailable" in html
    assert "Needs manual review (1)" in html


def test_untrusted_text_is_escaped():
    f = _finding(
        item_name="<script>alert(1)</script>",
        severity_rationale='<img src=x onerror="x()">',
    )
    html = render_report([f], [], [], [], "<b>summary</b> [1]", META)
    assert "<script>alert(1)</script>" not in html
    assert "<img src=x" not in html
    assert "<b>summary</b>" not in html


def test_no_external_assets():
    html = render_report([_finding()], [], [], [], None, META)
    for tag in ("<script src", "<link rel=\"stylesheet\"", "@import", "fonts.googleapis"):
        assert tag not in html


def test_source_url_shortage():
    f = _finding(source="shortage", record={"generic_name": "Amoxicillin", "status": "Current"})
    assert "drug/shortages.json" in (source_url(f) or "")
