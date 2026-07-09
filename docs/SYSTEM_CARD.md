# RxSweep System Card

*Last updated: 2026-07-09. Every claim in this document is verifiable against the
source files cited beside it.*

## Purpose

RxSweep batch-checks a pharmacy formulary CSV against three public FDA datasets —
recall enforcement reports, drug shortages, and the NDC directory — and produces a
severity-ranked, cited HTML report plus a machine-readable audit log. It exists to
replace manual eyeball-reconciliation of FDA notices against thousands of line items.

## Exactly where AI is used — and where it is not

Claude has **three jobs** in this system, in [`triage.py`](../src/rxsweep/triage.py)
and [`chat.py`](../src/rxsweep/chat.py):

1. **Candidate adjudication** (`adjudicate()`): judging whether a *fuzzy* candidate —
   a formulary item and an FDA record that share partial name text — refers to the
   same product. The prompt instructs conservatism: when in doubt, not a match.
2. **Summary drafting** (`summarize()`): a two-paragraph executive summary in which
   every drug mentioned carries a `[n]` citation to its finding.
3. **Run-grounded chat** (`chat_reply()`, web app only): answering pharmacist
   questions strictly from one run's numbered findings, with mandatory citations;
   questions beyond the findings are declined and redirected to primary sources.

AI is **never** used for: exact NDC matching, name matching, severity ranking,
data fetching, or report assembly — those are deterministic code
([`matching.py`](../src/rxsweep/matching.py), [`report.py`](../src/rxsweep/report.py)).
An exact NDC match never touches the model. Outputs labeled `ai_matched` are
displayed as **"AI-matched — needs verification"** in the report, distinct from
deterministic `exact_ndc` and `name_match` labels.

## Models

- Default: `claude-haiku-4-5` (cost-efficient tier; a full sweep costs cents).
- Override: `RXSWEEP_MODEL` environment variable.
- API key: `ANTHROPIC_API_KEY` environment variable only — never a config file,
  never the repository. Users bring their own key.

## Human-in-the-loop boundary

**AI drafts; a pharmacist verifies.** The report's scope banner states this on every
run. The severity rubric (`rank_severity()` in
[`triage.py`](../src/rxsweep/triage.py)) — which decides what a pharmacist sees
first — was **reviewed and approved by Travis Clement, PharmD (2026-07-09)**, not
generated at runtime. AI match rationales are displayed beside their findings so the
verifying pharmacist sees *why* the model matched, next to a one-click link to the
FDA source record.

## Known failure modes

| Failure mode | Behavior | Where handled |
|---|---|---|
| Ambiguous 10-digit NDC (no hyphens) | Never claimed as exact; downgraded to a needs-verification candidate with all 3 possible readings. Design choice: ambiguous NDCs are excluded from the NDC-directory status check (a discontinuation judgment on a guessed reading would be false certainty) | `matching.py` (`normalize_ndc`, ambiguity downgrade), `cli.py` |
| Recall free-text doesn't name NDCs | Deterministic pass harvests NDCs from `code_info`/description text; residual fuzz goes to AI adjudication, labeled as such | `matching.py` (`extract_ndcs_from_text`) |
| Claude API unavailable | Run completes deterministic-only; report banner discloses that candidates were not adjudicated; candidates appear under "Needs manual review" | `triage.py`, `cli.py` |
| openFDA source unavailable after retries | Run completes; report lists **unchecked items** explicitly ("treat as unknown, not clear") | `cli.py` (`_fetch`) |
| Malformed CSV rows | Quarantined and shown in the report — never silently dropped | `ingest.py` |
| Name collisions (different products, similar names) | Adjudication prompt requires same active ingredient and dosage-form family; confidence reported; low-confidence matches still say "needs verification" | `triage.py` |

## What this system is not

Not clinical decision support. Not a procurement system. No drug-interaction
checking. No hosted service — it runs on the user's machine with their keys. No
patient data: the pipeline touches formulary/item-master data only, so HIPAA is
never triggered.
