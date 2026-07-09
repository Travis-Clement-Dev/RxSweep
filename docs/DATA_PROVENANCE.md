# Data Provenance

*Every external fact in an RxSweep report traces to one of the three sources below.
Each finding in the report links to an openFDA query URL that returns the exact
cited record.*

| Source | Endpoint | Authority | Update cadence | Known limitations |
|---|---|---|---|---|
| Drug recalls | `api.fda.gov/drug/enforcement.json` | FDA enforcement reports | Weekly (typically) | Reporting lag between firm action and publication; product descriptions are free text; NDC fields (`openfda.package_ndc`) are frequently absent, in which case NDCs are harvested from `code_info` text or matching falls back to name-level |
| Drug shortages | `api.fda.gov/drug/shortages.json` | FDA drug shortages database | As reported by manufacturers | Manufacturer self-reporting; statuses are an open set (`Current`, `Resolved`, `To Be Discontinued`, …) and passed through unmodified; records are package-level |
| NDC directory | `api.fda.gov/drug/ndc.json` | FDA NDC directory | Daily | Directory listing ≠ market availability; `listing_expiration_date` in the past is treated as discontinued; absence from the directory is flagged for review, not asserted as discontinuation |

## Retrieval design

- Recalls and shortages are **bulk-downloaded once per run** (paged, `limit=1000`)
  and matched locally; the recall window defaults to 24 months (`--months-back`).
- NDC-directory status is queried per-item in batches of 25
  (`packaging.package_ndc.exact` search).
- No API key is required; an optional `OPENFDA_API_KEY` raises rate limits.
- Every request and response is recorded in the audit log — responses as record
  counts plus a SHA-256 hash of the raw body, so a run's inputs can be verified
  after the fact.

## The user's own data

The formulary CSV never leaves the machine except as the item names/NDCs embedded
in AI adjudication prompts sent to the Anthropic API under the user's own key. Run
outputs (`runs/`) are gitignored by default. No PHI: item-master data only.
