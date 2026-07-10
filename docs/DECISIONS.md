# Decision Log

Architecture and product decisions, recorded when made. Format per entry:
Context / Options / Decision / Rationale / Status. Chronological narrative
lives in [`JOURNAL.md`](./JOURNAL.md); this file is the *why* of the choices.

---

## D1 — Product name: RxSweep (2026-07-09)

- **Context:** Public GitHub project; the name is also the CLI command.
- **Options:** RxSweep, RxRecon, RxRadar, RxAudit, Formulary Sentinel.
- **Decision:** RxSweep.
- **Rationale:** Verified collision-free (web, GitHub, PyPI). RxRecon collides
  with an Inmar product; RxRadar with rxradar.io and multiple repos; RxAudit
  reads as "PBM audit" to pharmacists (audience psychology). The verb is the
  product action.
- **Status:** Final.

## D2 — Product shape: engine-first hybrid (2026-07-09)

- **Context:** Weekend build; needed a guaranteed shippable midpoint.
- **Options:** CLI-only; web-app-first; engine+CLI with web app as day-2; MCP layer.
- **Decision:** Engine + CLI + governance pack first; web app second; MCP deferred
  (5+ generic openFDA MCP lookup servers already exist; the workflow is the novelty).
- **Rationale:** Risk structure: cap what a bad day 2 can cost without capping upside.
- **Status:** Final; MCP layer remains a candidate phase.

## D3 — Severity rubric is human-authored (2026-07-09)

- **Context:** Ranking a Class II recall against an active shortage is clinical judgment.
- **Decision:** The rubric table in `triage.py` is authored/approved by Travis
  Clement, PharmD, and documented as such in the system card; changes require
  re-approval.
- **Rationale:** Human-in-the-loop as an architectural fact, not a disclaimer.
- **Status:** Final.

## D4 — Default model `claude-haiku-4-5`, BYO key via env (2026-07-09)

- **Context:** Users pay for their own AI; a sweep makes a handful of small calls.
- **Decision:** Cost-efficient default, `RXSWEEP_MODEL` override, key only from
  `ANTHROPIC_API_KEY` env / gitignored `.env`.
- **Rationale:** A full sweep costs cents; tighter deterministic matching later cut
  AI cost ~6× by shrinking candidates. Secrets never in the repo.
- **Status:** Final.

## D5 — Two writing registers (2026-07-09)

- **Context:** Generated product text read as generic AI (markdown leakage, em dashes).
- **Decision:** Product artifacts speak the FDA drug-safety-communication register
  (short declarative sentences, plain text, no em dashes), encoded in prompts and
  template copy. Announcement/social voice is a separate humanistic register
  (rx-shortage-mcp `WRITING-STYLE.md`), handled in its own workstream.
- **Rationale:** Voice is a governed, versioned artifact; each register lives where
  its audience expects it.
- **Status:** Final.

## D6 — AI narrative relocated off the dashboard (2026-07-09)

- **Context:** Validation judged the dashboard-hero AI summary a generic-AI signal
  and an inversion of worklist-first enterprise patterns (Epic In Basket,
  ServiceNow Now Assist attach AI to records/moments, not landing pages).
- **Decision:** Dashboard hero = verb-led action queue. AI rationale stays on the
  finding (drawer). Narrative brief = on-demand chat "Brief me" (zero-cost reuse
  of the sweep-time summary) + the formal memo export.
- **Rationale:** Register-native placement; trust follows user-summoned AI.
- **Status:** Final.

## D7 — Comp gate outcome: A + B density, C as the memo (2026-07-09)

- **Context:** Three comps built from real sweep data before any UI code
  (`design/comps/`): A Federal Register, B Clinical console, C Memo-first.
  HeroUI pre-agreed as fallback if none met the bar.
- **Decision:** A as the app shell, B's rail/density folded in, C becomes the
  exported memorandum design. Fallback not needed.
- **Rationale:** Each idea shipped where it is strongest.
- **Status:** Final for phase 3.

## D8 — Component library for the exploration branch: React Aria Components over HeroUI (2026-07-10)

- **Context:** Exploration branch tests a component-library expression of the same
  instrument. Travis asked for the selection basis to be explicit and auditable.
- **Method — generic-AI-risk rubric (expert inference, not a metric; scored on):**
  1. AI-default prevalence (is it what AI tools emit unprompted?)
  2. Default-skin strength (does it look like something out of the box?)
  3. Theming depth (token swap vs structural CSS ownership)
  4. Signature recognizability (name the library from a screenshot?)
  5. Composition gravity (do its templates pull toward one layout grammar?)

| Library | Risk | Note |
|---|---|---|
| React Aria Components | Lowest | Headless, zero visual opinion, best-in-class a11y |
| Base UI | Lowest | Headless, newest generation (Radix+MUI teams) |
| Ark UI | Lowest | Headless |
| react-uswds | Low | Strong look, but the look is our chosen direction |
| Mantine | Medium | Themeable, increasingly common in AI output |
| HeroUI | Medium-high | Quality components; rounded SaaS grain fights our square identity |
| shadcn defaults | Highest | The house style of AI codegen |
| MUI / Ant | High | Pre-AI ubiquity; instantly recognizable |

- **Decision:** React Aria Components (`react-aria-components`), styled entirely by
  our style guide. Every adopted component documented with a link to its official
  page (react-aria.adobe.com), the journey stage it serves, and a one-sentence
  design rationale.
- **Rationale:** Headless + top-tier accessibility (WCAG 2.1 AA is a product
  requirement) gives the style guide total authority — the recipe phase 3 already
  validated with Radix primitives. HeroUI stays viable if this exploration
  disappoints (documented fallback).
- **Status:** Decided; exploration in progress on `explore/react-aria-styleguide`.

---

*Template for new entries: date, Context, Options, Decision, Rationale, Status.*
