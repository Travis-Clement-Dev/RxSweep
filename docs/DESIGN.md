# Design — RxSweep

> The repo's self-documenting design reference, in the same convention as
> [rx-shortage-mcp](https://github.com/Travis-Clement-Dev/rx-shortage-mcp): this file is the
> "what & why" of the architecture; per-change detail lives in `git log`. Business brief and
> UX journey were approved 2026-07-09 before this spec was written.

## Status

| | |
|---|---|
| **Phase** | Spec — approved brief, pre-scaffold |
| **Next** | Implementation plan → Day 1 build (engine + CLI + report + governance pack) |
| **Stack** | Python ≥3.12, `uv`-managed, `src/` layout; Typer CLI; httpx; Anthropic SDK; Day 2: Vite + shadcn/ui (custom theme) static bundle served by FastAPI |

## Context (why this exists)

Every health-system pharmacy must continuously answer: **"Of the thousands of products we stock,
which are affected by an FDA recall, a drug shortage, or a discontinued NDC — right now?"** Today
that reconciliation is manual: someone reads FDA notices and eyeballs them against a formulary
extract. Slow, tedious, and a missed match is a patient-safety and regulatory-exposure event.

**Honest framing:** the data is public and the lookups are easy — the pain is *scale and
fragmentation*. One drug is a 30-second check; three thousand line items against three moving
datasets is an afternoon of error-prone scanning. RxSweep collapses that into one command.

**Landscape:** 5+ open-source openFDA wrappers exist (all one-drug-at-a-time lookups), commercial
shortage navigators are closed and paid, and no project in this space ships governance artifacts.
Sibling project [rx-shortage-mcp](https://github.com/Travis-Clement-Dev/rx-shortage-mcp) answers
"this drug is short — what now?" (single-drug chain); RxSweep answers "what across my whole
formulary is affected?" (batch reconciliation). Complementary, cross-linked.

## Architecture

Hard boundary between **deterministic code** and **AI**. Exact matching never touches the model;
Claude is invoked only where rules can't reach (messy recall free-text ↔ line items, summary
drafting), and every AI decision is logged and cited. That boundary *is* the governance story.

```
formulary.csv
  → ingest + validate            (bad rows quarantined, shown — never dropped silently)
  → normalize                    (NDC 10-digit 4-4-2/5-3-2/5-4-1 → 11-digit; name normalization)
  → deterministic match          vs cached openFDA: enforcement (recalls) · drugshortages · ndc
  → ambiguous candidates only    → Claude adjudication (batched, cited, logged)
  → severity ranking             (human-authored rubric — see below)
  → outputs: cited HTML report + runs/<ts>/audit.jsonl        [Day 2: interactive web app]
```

## Package layout

```
src/rxsweep/
├── sources/        openFDA clients (enforcement, drugshortages, ndc) + local cache
├── matching.py     NDC normalization + deterministic matching
├── triage.py       Claude layer: candidate adjudication, cited summaries; severity rubric
├── report.py       self-contained HTML report (shared design tokens)
├── audit.py        JSONL audit logger
├── cli.py          Typer: `rxsweep check <csv>`, `rxsweep demo`
└── webapp/         Day 2: FastAPI serving the static Vite/shadcn build
```

## Data sources & contracts

| Source | Endpoint | Notes / gotchas |
|---|---|---|
| Recalls | `api.fda.gov/drug/enforcement.json` | Product described in free text (`product_description`); NDCs present but inconsistent → this is where AI adjudication earns its keep. Class I/II/III in `classification`. |
| Shortages | `api.fda.gov/drug/drugshortages.json` | Records are NDC/package-level → aggregate by status (lesson carried from rx-shortage-mcp). Status is an open set — pass through, don't enum. |
| NDC status | `api.fda.gov/drug/ndc.json` | Source of truth for active/discontinued (`marketing_category`, `listing_expiration_date`). |

No key required; optional `OPENFDA_API_KEY` env var raises rate limits (240/min → higher).
Responses cached locally per run; every request + response hash lands in the audit log.

## Matching strategy

1. **Exact NDC** after normalization — FDA uses 10-digit hyphenated NDCs in three segment
   patterns (4-4-2, 5-3-2, 5-4-1); formulary extracts usually carry 11-digit billing format
   (5-4-2) with a padded zero whose *position depends on the source pattern*. Naive string
   comparison silently misses real recalls; normalization is the most-tested code in the repo.
2. **Normalized name match** — case/salt/dosage-form normalization, deterministic.
3. **Fuzzy candidates → AI adjudication** — only unresolved candidates go to Claude, in batches,
   with the FDA source text alongside the formulary row. Output labels are explicit and surface
   in every report: `exact_ndc` · `name_match` · `ai_matched — needs verification`.

## AI usage boundary (governance-critical)

- Claude does exactly two jobs: adjudicate fuzzy match candidates; draft the cited executive
  summary. Nothing else. No open-ended generation in the pipeline.
- `ANTHROPIC_API_KEY` from env var only — never config files, never the repo. Model ID
  configurable (`RXSWEEP_MODEL`); default pinned at build time against current API docs.
- Every prompt and completion is written to the audit log verbatim. Every AI claim in the report
  links to its FDA source record.
- **Degradation path:** Claude unavailable → deterministic-only report still ships, AI sections
  marked "unavailable," run remains valid. FDA API unavailable after retries → report explicitly
  lists **checked vs. unchecked items**. Silent partial results are the one unforgivable failure.

## Severity rubric (human-authored, by design)

How a Class II recall on a stocked item ranks against a current shortage with no alternative is
**pharmacy judgment, not code judgment**. The rubric is a small decision table in `triage.py`
authored by Travis (PharmD) during implementation, documented as human-authored in the system
card. The code defines the interface: `(match_label, recall_class, shortage_status, ndc_status)
→ severity tier + rationale`.

## UX (2026 healthcare-grade)

Persona "Dana," medication-safety pharmacist. Journey: **Prepare** (drag-drop CSV, column
auto-detect, quarantine visible) → **Run** (live progress incl. AI-call count) → **Triage**
(severity-first dashboard, progressive disclosure) → **Verify** (AI reasoning side-by-side with
cited FDA record, one click to primary source) → **Act & file** (export report + audit log;
chat grounded only in this run's findings).

- Day 1 HTML report = Triage/Verify/Act in static form; Day 2 web app makes them interactive.
- One token system across both (calm clinical teal identity; severity semantics green/amber/red
  kept separate from brand accent; custom shadcn theme — no default-look components).
- WCAG 2.1 AA (HHS requirement): contrast, keyboard nav, screen-reader semantics.
- Web build ships as static assets **inside the Python package** — peers never need Node.

## Governance pack (first-class deliverables)

| File | Contents |
|---|---|
| `docs/SYSTEM_CARD.md` | What the AI does/doesn't do, models used, known failure modes, human-in-the-loop boundary |
| `docs/DATA_PROVENANCE.md` | Every data source, its authority, update cadence, limitations |
| `docs/GOVERNANCE.md` | Scope limits (informational; pharmacist verifies; not clinical advice), NIST AI RMF mapping, audit-log schema |
| `runs/<ts>/audit.jsonl` | Per-run: inputs, API calls + response hashes, prompts, completions, verdicts |

No PHI anywhere in the pipeline — formulary/item-master data only; HIPAA never triggered.

## Non-goals

Not clinical decision support. Not a procurement system. No drug-interaction checking (NLM
retired that API in 2024). No hosted service — local only, BYO keys. No PHI, ever.

## Testing & verification

- Pytest with recorded openFDA fixtures — no live calls in CI. Test weight concentrated on NDC
  normalization and matching (that's where missed-recall risk lives).
- One optional live smoke test (`-m live`).
- End-to-end: `rxsweep check sample_formulary.csv` (bundled) → report renders with citations,
  audit log complete. Day 2: drive the web app in a browser (upload → dashboard → detail →
  chat grounding) + keyboard-only pass before calling it done.

## Weekend plan

- **Day 1 (shippable by end of day):** scaffold → sources → matching → triage → CLI → HTML
  report → governance pack. Reuses proven patterns from rx-shortage-mcp (openFDA client, test
  structure, uv packaging).
- **Day 2:** Vite + shadcn custom-theme app (upload/run/triage/verify/chat) → static bundle into
  package → README + screenshots → publish public.
- **Post-build writing workstream:** revise writing-style skill (fuse high-agency stance with
  the humanistic craft rules in rx-shortage-mcp's `WRITING-STYLE.md`) → voice samples for
  approval → announcement post naming each governance artifact, cross-linking rx-shortage-mcp.

## Naming

`RxSweep` verified collision-free at selection time (2026-07-09): no web product, no GitHub
repos, PyPI `rxsweep` unclaimed. Runner-up candidates eliminated for collisions (RxRecon —
Inmar product; RxRadar — rxradar.io + multiple repos) or audience psychology (RxAudit reads
as "PBM audit").
