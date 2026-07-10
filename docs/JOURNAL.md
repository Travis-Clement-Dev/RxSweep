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
