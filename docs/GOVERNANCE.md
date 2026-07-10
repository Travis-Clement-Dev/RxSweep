# Governance

*How RxSweep's design maps to AI-governance practice. Written alongside the code it
describes — each control names its implementing file.*

## Scope limits

- **Informational tool.** A pharmacist verifies every finding before action; the
  report states this in a banner on every run.
- **Not clinical advice.** No dosing, no therapy recommendations, no interaction
  checking.
- **No PHI.** Inputs are formulary/item-master data. Patient data is out of scope
  by design, so HIPAA is never triggered.
- **Local-first.** No hosted service; users bring their own API keys via
  environment variables. Secrets never enter the repository (`.gitignore` blocks
  `.env`; run outputs in `runs/` are also excluded).

## NIST AI RMF mapping

| Function | RxSweep control | Artifact |
|---|---|---|
| **GOVERN** | Documented AI boundary (two jobs, nothing else); human-authored severity rubric with named ownership; scope limits stated in-product | [`SYSTEM_CARD.md`](SYSTEM_CARD.md); `rank_severity()` docstring; report banner |
| **MAP** | Every data source documented with authority, cadence, and known limitations; user-data flow described | [`DATA_PROVENANCE.md`](DATA_PROVENANCE.md) |
| **MEASURE** | Per-run audit trail of every external call and every model input/output; automated test suite concentrated on the highest-risk code (NDC normalization, matching); verdicts carry model-reported confidence | `runs/<ts>/audit.jsonl`; `tests/` |
| **MANAGE** | Graceful degradation paths that disclose rather than hide (AI unavailable → manual-review list; FDA source down → unchecked-items list; malformed rows → quarantine section); ambiguity downgrade prevents false certainty | `cli.py`, `triage.py`, `ingest.py`, `matching.py` |

## Export artifacts (written per run, same story in every format)

| File | Audience |
|---|---|
| `findings.csv` | Spreadsheet workflows |
| `findings.xlsx` | Circulation (severity-tinted, filterable) |
| `findings.md` | The user's own AI assistant; citations and the openFDA disclaimer travel with the data |
| `report.html` | Committees: institutional memo format with a pharmacist verification line; print to PDF |
| `audit.jsonl` | Compliance file |

## Audit log schema

One JSON object per line in `runs/<timestamp>/audit.jsonl`. Every record carries
`ts` (UTC ISO-8601) and `kind`. AI prompts and completions are logged **verbatim**;
FDA responses are logged as counts plus a SHA-256 body hash.

| `kind` | Fields | Meaning |
|---|---|---|
| `run_start` | `csv`, `months_back`, `no_ai` | Run parameters |
| `ingest` | `items`, `quarantined` | CSV intake result |
| `fda_request` | `url`, `params` | Outbound openFDA call (API key redacted) |
| `fda_response` | `url`, `count`, `sha256` | Result size + body hash |
| `fda_unavailable` | `source`, `error` | Source failed after retries; items disclosed as unchecked |
| `match` | `hits`, `candidates`, `unmatched` | Deterministic matching result |
| `ai_skipped` | `reason` | AI not used (`--no-ai` or no key) |
| `ai_request` | `model`, `prompt`, optional `stage: "chat"` | Verbatim prompt sent to Claude (chat questions included) |
| `ai_response` | `model`, `completion`, `input_tokens`, `output_tokens`, optional `stage: "chat"` | Verbatim/structured model output with token usage — AI cost is an audited, per-run fact |
| `ai_unavailable` | `stage`, `error` | API failure; run degraded to deterministic-only |
| `run_end` | `findings`, `tiers` | Final counts by severity |

## Change control

The severity rubric and AI prompts are code — changes to them are visible in
`git log` like any other change. The rubric's authorship note names its human
approver and date; re-approval accompanies any change to its table.
