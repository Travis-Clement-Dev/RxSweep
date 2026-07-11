# Engineering Journal

Chronological narrative + cumulative lessons. Design reference →
[`DESIGN.md`](./DESIGN.md). Per-change detail → `git log`. Governance artifacts →
[`SYSTEM_CARD.md`](./SYSTEM_CARD.md) · [`DATA_PROVENANCE.md`](./DATA_PROVENANCE.md) ·
[`GOVERNANCE.md`](./GOVERNANCE.md).

---

## Cumulative lessons (durable)

### openFDA (pinned against live responses, not docs)
- **The shortages endpoint is `drug/shortages.json`** — `drug/drugshortages.json` does not
  exist ("Cannot GET"). Fetch fixtures from the live API before writing mocks; the plan's
  guessed endpoint was wrong and only reality caught it.
- **Shortage records are package-level** — one drug in shortage spans dozens of rows
  (same lesson as rx-shortage-mcp). Match against **per-drug aggregates** or a 40-item
  formulary "finds" 500+ hits. Any `Current` status wins the group.
- **Shortage records carry `package_ndc`** — exact-NDC shortage matching is possible,
  not just name-level (better than assumed).
- **Enforcement (recall) records often ship an empty `openfda` section** — the NDCs
  frequently live in free-text `code_info` instead. Regex-harvest hyphenated NDCs from
  `code_info`/`product_description` before falling back to name matching.
- **openFDA returns 404 for an empty result set** — that's data, not an error.

### NDC handling (the missed-recall risk lives here)
- **10-digit hyphenated NDCs come in three patterns** (4-4-2 / 5-3-2 / 5-4-1); the 11-digit
  billing form pads a zero whose position depends on the source pattern. A 10-digit NDC
  *without* hyphens is genuinely ambiguous → surface all three candidates and **never let an
  ambiguous NDC claim an exact match** (downgrade to needs-verification).
- **Salt-stripping must never eat the leading token** — in "Sodium Chloride" the sodium IS
  the drug; in "Cefazolin Sodium" it's a suffix. Strip salts at position ≥1 only.
- **Common chemistry tokens make junk fuzzy candidates** ("chloride", "injection"…).
  Require the item's identifying lead token for candidacy. Side effect: tighter deterministic
  matching cut AI adjudication cost ~6× (199 junk candidates → ~30 real ones).

### Python / macOS environment
- **Something on this Mac sets `UF_HIDDEN` on files under dot-directories** (`.venv`,
  `~/.cache/uv`), and **Python 3.11+ silently skips hidden `.pth` files**
  (`site.addpackage` checks `st_flags & UF_HIDDEN`) → recurring, mysterious
  `ModuleNotFoundError` after every `uv` re-sync. Recovery: `chflags -R nohidden .venv
  ~/.cache/uv`. Mitigations here: pytest `pythonpath = ["src"]`; launch scripts self-heal.
  Root cause hunt is a separate task.
- **Jinja's `select_autoescape(["html"])` matches the TEMPLATE name** — `report.html.j2`
  ends in `.j2`, so autoescaping was silently OFF (CSV drug names could inject live HTML).
  Use `autoescape=True` for single-purpose environments, and test with a `<script>` payload.
- **`client.messages.parse()` raises `pydantic.ValidationError`** on malformed structured
  output — catch it in the same degradation path as API errors or a truncated model reply
  crashes the run.

### Deployment
- **A cached index.html is a stale deployment nobody can see.** Vite's hashed assets are
  immutable, but the browser happily caches the entry page on localhost; after the React
  Aria port, a previously-open browser showed the old build and read as a failed deploy
  (2026-07-10). Server now sends `Cache-Control: no-cache` on all HTML. When "none of the
  changes are there," compare disk vs served vs rendered before touching code.

### Product / governance
- **Disclose, never mask, source failures**: an NDC-directory outage must not read as
  "NDC not found in directory" — a `None` sentinel (source failed) is not `{}` (source
  empty). Silent partial results are the one unforgivable failure in a safety tool.
- **Generated text is a governed artifact**: the FDA-regulatory register (short declarative
  sentences, no markdown, no em dashes) is encoded in the prompts, so voice is versioned in
  git like any other change. Markdown leakage into HTML was a bug, not a style preference.
- **Propagate upstream terms downstream**: openFDA's "assume all results are unvalidated"
  disclaimer appears verbatim in every report and in DATA_PROVENANCE, mapped to the design
  decisions that answer it.
- **AI narrative belongs to its register**: local validation judged the dashboard-hero AI
  summary a generic-AI signal. Mature pattern: worklist first; AI rationale attached to
  objects (drawer); narrative on demand (chat "Brief me") and in the formal export — the
  Phase 3 redesign.

---

## Narrative

**2026-07-09 — brief → spec → Day 1 core.** Brainstorm ran landscape due diligence (5+
generic openFDA MCP lookup wrappers exist; no formulary-level batch reconciliation; nobody
ships governance artifacts) → business brief approved → name RxSweep verified collision-free
→ spec committed → 11-task Day 1 plan executed inline with per-task commits. Severity rubric
reviewed and approved by Travis Clement, PharmD (governance feature: human-authored ranking).
First live run exposed over-matching (530 findings / 38 items); fixes above brought it to a
clinically plausible 55. Independent code review then caught the autoescape XSS plus three
correctness issues — all fixed same-day with regression tests.

**2026-07-09 — Day 2 web app.** Pipeline extracted from the CLI (one audit-event stream, two
consumers); FastAPI backend with background sweeps and live progress; run-grounded cited chat;
React/Vite frontend on the clinical token system; static bundle into the wheel; full journey
browser-verified against live FDA data (a real Class I saline recall surfaced in the verify
drawer during testing). Local validation by Travis: engine and governance strong; UX judged
"competent generic"; exports missing for the pharmacy-informatics workflow (Excel/PDF/Markdown).

**2026-07-09 — v0.1.0 checkpoint.** Docs trued up, this journal created, tag cut. Phase 3
(regulatory-instrument UX + action queue + export suite) proceeds on a branch via PR — design
comps gate first, HeroUI as the agreed fallback if the custom direction misses.

**2026-07-11 — Federal Register implementation.** The Claude Design exploration closed:
handoff package committed under design/design_handoff_federal_register/ (binding contract,
implementation README, navy token drop-in, v5 prototype as acceptance reference; the
package's kickoff prompt was reconstructed from the design workspace after the download
omitted it). Implemented on the explore branch in per-screen commits: token migration with
a manual theme toggle, masthead band + floating-card shell, document-receipt upload,
radar run screen on real server phases, dashboard canvas (run-meta strip, outage notice,
verb-led required actions, fixed-grid register, disclosure cards), finding-record drawer,
right-docked assistant panel with run record and seam resize (ChatPanel retired), letter
memo view with print CSS. Browser-verified live in both themes including metered chat,
zero-cost briefing, AI-off degradation, and the sub-1100px overlay. Register column
sorting was deliberately dropped per the contract; the required-actions queue extends the
report.py rule with AI-matched moderates. The 2026-07-10 audit's row-flash finding recurred
in the rewritten table and was fixed by declaring the flash state in the RAC collection's
dependencies. DECISIONS.md gains D10 recording the contract adoption.

**2026-07-11 — design-QA round closed.** The design agent reviewed the implementation
against the contract: approve pending 1 must-fix and 4 polish items, plus two additions
Travis approved. Landed same-day: outage notice copy no longer contradicts the Unchecked
card (the pipeline records one line per failed source, and the copy now says so),
audit.jsonl joined the export manifest as a real download, the served report.html memo
queue gained AI-matched moderates to match the web memo word-for-word, run phase labels
render sentence case, the AI-off composer shows off instead of a model id, memo rows avoid
print page breaks, and the register's no-findings statement got v5's roomier block.
Re-verified live including a genuinely failed sweep (openFDA egress blocked through a dead
proxy) to render the outage and zero-findings states with real data. 82 tests.

**2026-07-11 — round 13: recorded dispositions.** Travis's product decision (the queue
recorded nothing; the pharmacist's verification was the one unlogged event) came back
from the design workspace as contract v1.3 with a v6 prototype, approved same day.
Implemented on feat/dispositions: a disposition endpoint appending verbatim audit
events (enum-validated, initials-signed, dismissals require a reason, reopened as the
append-only undo), the queue's verb buttons now record (initials gate on first use,
two-outcome AI verification, inline strip only when input is needed), register rows
fade and strike on dismissal, the drawer and run record surface the record, and the
memo states the honest partial state per item. The queue cap is retired end to end and
the ingest card reads Excluded rows. Verified live against real FDA data including
genuinely AI-adjudicated fuzzy matches crafted for the walkthrough; the audit trail
reads quarantined, reopened, dismissed-with-reason, verified, re-recorded under an
edited operator. 84 pytest + 5 vitest (new web test runner for the event reducer).

**2026-07-11 — v0.2.0: merged to main, demo-stable.** Travis deemed the build stable for
demo and called the merge train: PR #3 (dispositions) into explore, PR #2 (React Aria +
Federal Register redesign) into phase-3, PR #1 into main, all with merge commits and the
release narrated on PR #1. The design agent's diff re-check of the disposition round was
superseded by the demo-stable call and can run against main. README trued up for the
release: disposition workflow paragraph, register no longer described as sortable, the
renamed briefing chip, five downloadable artifacts, current test counts, and the design
contract replacing the retired styleguide as the named design authority. Tagged v0.2.0.
