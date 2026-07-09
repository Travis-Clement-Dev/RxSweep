"""Self-contained HTML report: severity-first, cited, nothing hidden."""

from urllib.parse import quote

from jinja2 import Environment, PackageLoader, select_autoescape

from rxsweep.ingest import QuarantinedRow
from rxsweep.matching import Candidate
from rxsweep.triage import Finding

_env = Environment(
    loader=PackageLoader("rxsweep", "templates"),
    autoescape=select_autoescape(["html"]),
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
        quarantined=quarantined,
        manual_review=manual_review,
        unchecked=unchecked,
        summary=summary,
        meta=meta,
    )
