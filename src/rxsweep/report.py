"""Self-contained HTML report: severity-first, cited, nothing hidden."""

from urllib.parse import quote

from jinja2 import Environment, PackageLoader

from rxsweep.ingest import QuarantinedRow
from rxsweep.matching import Candidate
from rxsweep.triage import Finding

# autoescape=True, not select_autoescape(["html"]): suffix sniffing checks the
# TEMPLATE name (report.html.j2 ends in .j2) and would silently disable
# escaping — CSV drug names and AI text must never render as live HTML.
_env = Environment(
    loader=PackageLoader("rxsweep", "templates"),
    autoescape=True,
)


def source_url(finding: Finding) -> str | None:
    """A one-click, verifiable openFDA query that returns the cited record."""
    rec = finding.record
    if finding.source == "recall" and rec.get("recall_number"):
        q = quote(f'recall_number:"{rec["recall_number"]}"')
        return f"https://api.fda.gov/drug/enforcement.json?search={q}"
    if finding.source == "shortage" and rec.get("generic_name"):
        q = quote(f'generic_name:"{rec["generic_name"]}"')
        return f"https://api.fda.gov/drug/shortages.json?search={q}"
    if finding.source == "ndc" and rec.get("product_ndc"):
        q = quote(f'product_ndc:"{rec["product_ndc"]}"')
        return f"https://api.fda.gov/drug/ndc.json?search={q}"
    return None


_QUEUE_VERBS = {
    "recall": "Verify lots for {item}{ndc} against the recall record; quarantine affected stock.",
    "shortage": "Confirm supply plan for {item}{ndc}; active shortage match.",
    "ndc": "Review NDC status for {item}{ndc}; listing discontinued or missing.",
}


def action_queue(findings: list[Finding], cap: int = 7) -> list[dict]:
    """Verb-led actions from the findings a pharmacist must disposition.

    Criticals plus exact-NDC highs plus AI-matched moderates, citation order,
    capped. Wording is mirrored by the web queue (web/src/components/
    ActionQueue.tsx) so the served memo and the app read the same.
    """
    queue: list[dict] = []
    for f in findings:
        ndc = f" ({f.item_ndc})" if f.item_ndc else ""
        if f.severity == "critical" or (f.severity == "high" and f.label == "exact_ndc"):
            rec_class = f.record.get("classification")
            tag = rec_class if f.source == "recall" and rec_class else (
                "Active shortage" if f.source == "shortage" else "NDC status"
            )
            queue.append(
                {
                    "text": _QUEUE_VERBS[f.source].format(item=f.item_name, ndc=ndc),
                    "severity": f.severity,
                    "tag": tag,
                    "citation": f.citation,
                }
            )
        elif f.severity == "moderate" and f.label == "ai_matched":
            queue.append(
                {
                    "text": (
                        f"Verify product identity for {f.item_name}{ndc}; "
                        "AI-matched to the FDA record, not yet verified."
                    ),
                    "severity": f.severity,
                    "tag": "AI: verify",
                    "citation": f.citation,
                }
            )
        if len(queue) >= cap:
            break
    return queue


def render_report(
    findings: list[Finding],
    quarantined: list[QuarantinedRow],
    manual_review: list[Candidate],
    unchecked: list[str],
    summary: str | None,
    meta: dict,
) -> str:
    counts: dict[str, int] = {}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    rows = [dict(f.model_dump(), source_url=source_url(f)) for f in findings]
    template = _env.get_template("report.html.j2")
    return template.render(
        findings=rows,
        counts=counts,
        queue=action_queue(findings),
        quarantined=quarantined,
        manual_review=manual_review,
        unchecked=unchecked,
        summary=summary,
        meta=meta,
    )
