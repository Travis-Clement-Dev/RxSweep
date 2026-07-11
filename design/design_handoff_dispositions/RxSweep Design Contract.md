# RxSweep Design Contract — v1 (2026-07-10)

**Authority.** Single source of truth for RxSweep product design. It merges: (1) the approved
direction "1a / Public Record" from the design exploration canvas, (2) the binding content and
governance requirements from the repo (branch `explore/react-aria-styleguide`, PR #2:
`design/claude-design-brief.md`, `plans/2026-07-09-phase3-ux.md`), and (3) Travis's decisions
from the 2026-07-10 review rounds and inline comments. Where the repo's `design/styleguide`
or comps conflict with this contract (teal accent, flat gray document surfaces, bottom ask bar),
**this contract wins**. Everything else in the repo brief — content, governance, writing
register, accessibility — remains binding.

## 1 · Product, audience, tone
- RxSweep sweeps a formulary CSV against FDA recalls, drug shortages, and NDC-directory status;
  severity-ranked, cited, audit-logged. Local, single-user (`rxsweep serve`, 127.0.0.1). No auth,
  no sign-in UI, ever.
- Audience: pharmacy informaticists and regulatory professionals. Tone: authoritative,
  government-grade trust with contemporary craft. Never generic SaaS, never dated.
- Writing: FDA drug-safety-communication register. Short declarative sentences, active voice.
  No em dashes anywhere in UI copy. No markdown in generated text. Scope banner on every
  surface: "Informational tool. A pharmacist verifies every finding before action. Not clinical
  advice." openFDA disclaimer travels with every artifact.

## 2 · Decision log (binding)
| # | Decision | Source |
|---|---|---|
| D1 | Navy accent family, not teal. Exactly one accent. | Travis, alignment round 2 |
| D2 | Composition follows option **1a**: white instrument card on a cool ground, navy masthead band, structured internal strips. Not the repo comp's flat gray document. | Travis pick + inline comment 2026-07-10 |
| D3 | Square document language: hairline borders, rules, registers. Corners 0 inner, max 3px on the outer card. | Repo guide + 1a |
| D4 | Severity colors are semantic only. Dense rows use typographic state (square dot + small-caps text). Summary level may use count **stamps** (soft-tint pill with dot + count) as permitted "stamps/tags". Never filled pills at scale, never severity as decoration. | Repo guide, reconciled with 1a |
| D5 | Worklist-first; AI is never the hero. The brief is summoned ("Brief me for the huddle", renders `result.summary` instantly, no API call) and then **persists in the assistant panel**. | Repo D6 + Travis preference |
| D6 | Assistant: **right-docked, full-height collapsible panel** (Claude-Design-style sidebar behavior), icon-driven. Two views: **Assistant** (chat) and **Run record** (gear icon: docket, model usage stats, export manifest, audit trail). Collapses to a slim icon rail. Dashboard phase only (chat is grounded in a finished run). | Travis, round 3–4 |
| D7 | Theme toggle is an **icon control** (sun/moon glyphs), not the words "Dark"/"Light". Lives in the masthead band. | Travis inline comment |
| D8 | Motion is subtle and professional per §8; `prefers-reduced-motion` disables all. | Travis, alignment round 2 |
| D9 | Light and dark themes, same token names re-derived. Never an inversion filter. | Brief Prompt 1 |
| D10 | Binding content (from PR #2): run docket; verb-led Required Actions queue; findings register with severity filters; Manual review / Quarantined / Unchecked registers; exports CSV · XLSX · Markdown-for-AI · print memo plus `audit.jsonl`; grounded chat with mandatory [n] citations that jump to register rows; model/token/cost meter ("your key, your cost"); severity rubric credit (human-authored, Travis Clement, PharmD). | Repo brief + phase-3 plan |

## 3 · Color tokens
| Token | Light | Dark | Role |
|---|---|---|---|
| --ground | #f3f4f4 | #16181a | Page background only |
| --paper | #ffffff | #1e2022 | Instrument card, panels, drawer |
| --ink | #1b1b1b | #e6e7e8 | Primary text |
| --ink-soft | #565c65 | #a9adb1 | Secondary text |
| --ink-faint | #71767a | #7d8286 | Tertiary/micro labels |
| --line | #a9aeb1 | #3d4145 | Structural borders, table cells |
| --line-soft | #dfe1e2 | #2a2d30 | Hairlines |
| --band | #12203a | #0e1626 | Masthead + assistant header (navy-black) |
| --band-ink | #ffffff | #f2f3f3 | Text on band |
| --accent | #1c4a72 | #5b9bd5 | Primary buttons, band rule, focus, active filter |
| --accent-ink | #143a5e | #8fbce6 | Links, quiet-button text |
| --accent-soft | #e8eef4 | #16283a | Tints: quiet buttons, focus-row, user bubbles |
| --critical / --high | #9a3a2e | #db8377 | Severity urgent (shared red) |
| --moderate | #8a5d0b | #d9a94f | Severity caution |
| --info | #256b43 | #5cb884 | Severity normal |
| --*-soft | #f6e4e1 / #f5ebd8 / #e3f0e8 | #3a211d / #372c15 / #1c3227 | Stamp tints only |
| --focus-row | #eaf0f6 | #1a2c3d | Row focus/flash |
| --btn-ink | #ffffff | #101214 | Text on accent fills |
| --field | #ffffff | #14161a | Inputs |

Usage rules: ground is the page; paper is the card. Surfaces are never brand-tinted. Accent is
sparse: primary action, links, focus, the 4px band rule, active filter. Note D2 amendment vs the
repo guide: the band is **navy-black (#12203a family)**, carrying the brand into the chrome the
way 1a did, rather than pure #1b1b1b.

## 4 · Typography
- **Public Sans** (400/500/600/700/800), Helvetica fallback. **IBM Plex Mono** for identifiers
  only: NDCs, run ids, [n] citations, file names, the cost meter. Georgia serif belongs to the
  memo export only.
- Scale: document title 26/800, letter-spacing -1%; section label 13–15/800 caps, +8–12%;
  body 14/400; table/data 12.5/400; identifier mono 11.5; micro label 10.5/800 caps +14%.
  Tabular numerals on all counts.

## 5 · Layout and surfaces
- Page on ground. One **instrument card**, max-width 1240, centered, paper background,
  1px line border, 3px radius, one restrained card-level shadow permitted.
- Card anatomy, top to bottom:
  1. **Masthead band** (navy-black, 4px accent bottom rule): logomark (favicon chevron path,
     recolored) + "RxSweep" 800 + role line "Formulary surveillance · FDA public data ·
     pharmacist verifies" + icon theme toggle. Honest local indicator permitted
     ("Local instance · 127.0.0.1:8555"). No user identity.
  2. **Product header**: wordmark 26/800 + tagline; action right: "New sweep". Exports live in
     the assistant panel's Run record view, not the header.
  3. **Scope banner** (accent-soft tint, 3px accent left rule).
  4. **Run-meta strip**: boxed labeled cells with hairline dividers — FORMULARY / ITEMS CHECKED /
     RECALL WINDOW / AI MODEL / RUN (micro caps label over 600-weight value).
  5. **Severity stamps row** + Required Actions header ("N findings need disposition ·
     severity-ordered · N critical due today").
  6. **Required Actions queue** (§6).
  7. **Findings register** with filter toggles, then the disclosure registers
     (Manual review / Quarantined / Unchecked) as their own bordered sections.
  8. **Footer notice**: openFDA disclaimer verbatim, Terms/License, rubric credit, GitHub.
- Verify drawer: right-anchored, 472px, square, paper, focus-trapped, Esc closes.
- Assistant panel: per §7 decision.
- Density: queue rows ~40px; table rows 32–36px; panel padding 18–22px; section gaps 32–40px;
  4px base unit.

## 6 · Component specs
- **Required Actions row**: index number 800 · checkbox (accent) · verb-led sentence with the
  verb bold ("Verify lots for …", "Confirm supply plan for …", "Review …") · mono
  "[n] FDA record" link (opens the drawer) · severity tag right (small-caps, 3px left rule in
  severity color) · **action verb button** (accent fill, e.g. Quarantine / Escalate / Verify
  match) with a status line beneath (Open · due today / Needs verification / In review).
  Check-off strikes the sentence.
- **Findings register**: bordered document table (hairline cells, ground header row with micro
  caps). Columns: # (mono) / Severity (dot + small-caps) / Item / NDC (mono) / Source / Match
  (Exact NDC bold ink · Name match soft · AI: verify in moderate color) / Basis (rubric wording).
  Row hover tint; row click opens drawer; citation jump flashes the row (focus-row + 3px inset
  accent bar, ~1.8s decay). Severity filter toggles with counts sit on the register header line.
- **Verify drawer**: Finding record rule-off header; [n] + item title; mono docket (formulary
  row, NDC); severity/source/match line; "Why it's flagged" (rubric text); "AI match reasoning"
  + moderate-tint caution ("AI-matched: needs verification…") when label = ai_matched; "FDA
  record" as a bordered key/value grid (mono keys); "Open FDA source record ↗" accent button
  linking to the real api.fda.gov query.
- **Severity rubric wording is code-accurate** (`triage.rank_severity`): only Class I ⇒
  critical; Class II + exact NDC ⇒ high; active shortage ⇒ high; Class II name-level ⇒ moderate
  "Verify product identity."; discontinued NDC ⇒ moderate; non-current shortage ⇒ info; grouped
  records get "(+N more records)".
- **Cost meter** (assistant): mono line — model · tokens in/out · ~$cost — plus "Billed to your
  own API key. Every call is in this run's audit log."

## 7 · Assistant panel — state of decision (2026-07-10, round 3)
Rejected: thin bottom footnote bar (comp A's mock).
**Agreed in principle (Travis):**
- The assistant is a docked side panel structured as a **tabbed workspace surface**:
  - **Assistant** tab: suggested-prompt chips, transcript with clickable [n] citations that jump
    to register rows, input field, per-reply model/token/cost meter.
  - **Run record** tab: docket (file, items, window, run id), model, token/cost totals, the full
    export manifest (CSV · XLSX · Markdown for AI · Memo print-to-PDF), audit.jsonl trail.
- "Brief me for the huddle" is a suggested-prompt chip. It reveals the summary already drafted
  by `summarize()` during the sweep: instant, cited, zero additional API cost. Other suggested
  prompts call `chat_reply` (metered on the cost meter). Once revealed, the brief persists in
  the transcript (amends D5).
**Decided (Travis, round 4): RIGHT dock.** Full-height fixed panel, Claude-Design-style
behavior: collapsible to a 44px icon rail; header icons switch views — chat glyph = Assistant,
gear = Run record, chevron = collapse/expand.
- **Assistant view**: governance line; primary chip **"Prepare the executive briefing"**
  (reveals the summary drafted by `summarize()` during the sweep; meter states "no additional
  API call"); suggestion chips: "Which recalls have exact NDC matches?", "What needs
  verification first?", "Which shortages have no alternative?", "Draft a memo for the critical
  findings"; transcript with clickable [n] citations; input + Ask at the panel foot;
  model/token/cost meter under metered replies.
- **Run record view**: docket (file, items, window, run id, started); model + token/cost
  totals; export manifest (findings.csv · findings.xlsx · findings.md · memo print-to-PDF ·
  audit.jsonl) with one-line descriptions; audit-trail note.
- Panel exists on the dashboard phase only. Drawer overlays above it.

## 8 · Motion (subtle, professional)
- Signature: the radar sweep, Run screen only (conic rotation ~2s linear).
- Entrance: staggered fade-up, 300–450ms ease-out, max ~6 elements, once per screen change.
- Micro: hover tints 120ms; citation row flash 1.6–1.9s decay; drawer slide 220–240ms;
  check-off strike 150ms; theme/filter switches instant.
- Scrolling for citation jumps is instant (smooth-behavior scrollTo is unreliable and violates
  reduced-motion).
- Never: parallax, bounce, looping decorative motion, skeleton shimmer.
- All motion gated behind `prefers-reduced-motion: reduce`.

## 9 · Anti-patterns (reject on sight)
Teal or any second accent hue · brand-tinted surfaces · gradients, glassmorphism, emoji ·
rounded-card SaaS grammar and shadow grids · severity colors as decoration or filled pills at
scale · AI prose as the dashboard hero · footnote chat · centered marketing layouts ·
"Dark/Light" text toggles (icon only) · sign-in or user-identity chrome · em dashes in UI copy ·
browser-default link blue.

## 10 · Implementation notes (for the implementing agent)
- Working file: `RxSweep - Federal Register.dc.html`. Copy to a new version file for major
  revisions. Composition reference for 1a: `RxSweep Redesign.dc.html` (option 1a section).
  Content requirements source: repo branch `explore/react-aria-styleguide`, `design/` + `plans/`.
- Full journey stays interactive: upload (drop zone + sample link + options with "your key,
  your cost" note) → run (radar + items read / FDA requests / AI calls counters + phase labels
  matching the real pipeline order) → dashboard → drawer → exports → assistant. AI-off path
  degrades honestly (deterministic note, assistant disabled with plain-language notice).
- Realistic pharmacy data only; NDCs in valid 4-4-2/5-3-2/5-4-1 or 11-digit forms; no PHI.
- WCAG 2.1 AA: 2px accent focus outline offset 2 on every interactive element, keyboard
  operability, aria-pressed on toggles, labels on inputs.

## Amendments — v1.1 (2026-07-10, round 5)
- **D2 refined (split view goes full-bleed):** on the dashboard the workspace is a full-bleed
  paper surface sharing its edge with the assistant panel (fluid split; inner content capped at
  ~1560px, 28px gutters). The bordered instrument card is retained for the upload and run
  screens only (ceremony moments). Approved by Travis.
- **D4 refined (match tags):** severity stays typographic at scale; the register's **Match**
  column renders as bordered soft-tint tags — Exact NDC (accent tint), Name match (neutral
  hairline), AI: verify (moderate tint). Restores 1a scannability within the stamps/tags rule.
- **Dark theme re-derived, Vercel value discipline (replaces §3 dark column):**
  ground #0a0b0c · paper #131416 · panel #0f1011 · ink #ececef · ink-soft #a3a7ad ·
  ink-faint #74787e · line #34363b · line-soft #26282c · band #0e1626 · band-ink #f2f4f6 ·
  accent #6ea8e8 · accent-ink #96c0f0 · accent-soft #14263f · critical/high #f0705f ·
  moderate #e8b04b · info #4cc38a · softs #401f19/#3a2d13/#123122 · focus-row #142337 ·
  btn-ink #0a0b0c · field #101113. New token `--panel` (light #ffffff; panel differentiation in
  light comes from the hairline + band header, in dark from the value step).
- **§9 addition:** no network identifiers (IP addresses, ports, hostnames) anywhere in the UI.
  The masthead local-instance line is removed; run provenance lives in Run record without
  server addresses.
- Working file: `RxSweep - Federal Register v3.dc.html`.
- **Composer (round 6):** the assistant composer is a **floating card**, not an attached bar:
  margins on all sides, depth from a one-step surface shift (`--elev`: light #f6f7f8, dark
  #17191c) plus a hairline border, oversized interior padding, borderless transparent input,
  and a bottom-anchored utility row (model identifier in mono at left; the accent is reserved
  exclusively for the primary Ask action at right).
- **Shell language — nested floating layers (round 7):** the window is a frame, not a canvas.
  App chrome (masthead band) belongs to the frame layer; the two working surfaces — canvas and
  assistant panel — float inside it as independently **rounded cards (14px, all four corners)**
  separated by a ~10px gutter of frame background on all sides. **No divider strokes at the
  shell level**: separation comes from the seam and a one-step tonal shift (dark: frame #0a0b0c,
  panels #131416, composer --elev #1b1d21). Document rules/registers remain inside the canvas
  per the document language. The seam between canvas and panel is a **live resize handle**
  (col-resize cursor, centered grip pill, drag range 280–560px, no transition while dragging).
  Composer utility row shows the model identifier only ("grounded" removed as purposeless).
  Chat remains right-docked per D6; the reference description's left placement is the source
  app's arrangement, not a decision.
- Working file: `RxSweep - Federal Register v4.dc.html`.
- **Round 8 (validated fixes):** run-meta strip is a responsive grid (`auto-fit,
  minmax(185px,1fr)`, 1px hairline gaps on line-soft) so it reflows at any canvas width with
  rules on both axes. Match column is center-aligned and widened to 128px so tags align as a
  clean column. **Blue consolidation:** all interactive blues share the band's ~218° hue —
  light accent #1e3f63 / accent-ink #16324f / accent-soft #e7edf4; dark accent #6d9ae8 /
  accent-ink #9bb9ee / accent-soft #13233d; logomark #7fa0cf. One blue, three depths: chrome
  darkest, action mid, tint light.

## Amendments — v1.3 (2026-07-11, round 13: disposition workflow)

Travis's product decision after hands-on review of the implemented app (relayed as the
"round 11 request"; numbered round 13 in this contract's sequence).

- **D11 — Disposition is a recorded workflow.** The queue's action verb button records
  the disposition; it no longer merely opens the drawer. The independent checkbox is
  retired. States: **Open** (verb button + status line, incl. "Open · due today") →
  **Recorded** (sentence struck to ink-faint; action column shows a small-caps record
  line "{Verb past} · then mono {INITIALS} · {HH:MM}" with a quiet mono **Undo** link).
  Corrections are append-only: Undo writes a reversal event, the row returns to Open,
  history lives only in the audit trail. The [n] FDA record link and row click keep
  opening the drawer (evidence path unchanged).
- **Disposition strip** (new component): pressing a verb opens an inline sub-row under
  the queue row (ground bg, hairline border, indented to the sentence column, 150ms
  fade-up) only when input is needed; otherwise recording is one click. Contents by case:
  (a) first disposition of the session — micro-caps INITIALS label + 2–3 char mono input
  (uppercase) + note "Initials sign every disposition this session and are written to the
  audit log with the action and time."; (b) AI-matched rows — outcome choice first:
  **Confirm match** (accent fill) / **Not a match** (quiet, hover critical); Not a match
  then requires a one-line **Reason** input; (c) Record button (accent; disabled until
  initials ≥2 chars and, for dismissals, a reason exists) + underlined text Cancel.
  Fully keyboard-operable; Esc = Cancel is an implementation nicety, Cancel button is
  the contract requirement.
- **Operator attribution:** initials captured once per session at first disposition,
  never in the masthead (§9 stands: no identity chrome). Shown and editable (mono, 2–3
  chars) in Run record; edits apply to future dispositions only, past records keep the
  initials they were signed with.
- **Dismissed findings in the register** (typographic, D4): row at 50% opacity, item
  name struck, Match tag swaps to neutral hairline **"Dismissed"**. Severity cell keeps
  the rubric fact. Verified AI rows calm the Match tag from moderate-tint "AI: verify"
  to neutral hairline **"AI: verified"** (extension of the D4-refined tag set — approved
  by Travis, round-13 review). Drawer gains a **DISPOSITION** record block (bordered, ground):
  mono "{Verb past} · {initials} · {time}", reason line for dismissals, and "Recorded in
  this run's audit log. Corrections append a reversal; nothing is erased." The AI caution
  block hides once the match is verified or dismissed.
- **Run record — DISPOSITIONS section** (between MODEL USAGE and EXPORTS): kv rows
  Recorded "N of M" / Open / Dismissed + Operator (editable) + note "Each disposition
  and reversal is appended to this run's audit log as its own event. Nothing is erased."
- **Memo:** under REQUIRED ACTIONS, an italic serif line states the honest partial
  state ("3 of 7 actions recorded as of 15:12; 4 remain open." / "No dispositions
  recorded as of …"). Each item carries a status clause in italic serif parentheses:
  "(Quarantined. TC, 14:31.)" · "(Open, due today.)" · "(Not a match: {reason}. TC,
  14:35.)"; recorded items are struck.
- **D12 — "Quarantined" renamed "Excluded rows"** in the ingest disclosure card, memo,
  and report copy (display only; API field name unchanged). Card keeps the disclosure
  line "Rows the sweep could not read are disclosed here; nothing is silently dropped."
- **Backend contract (approved by Travis, round-13 review):** action enum
  `quarantined | reviewed | escalated | confirmed | verified | dismissed | reopened`,
  server-stamped timestamps returned by GET, dismissal note required. **Cap-7 retired**
  on the queue (web + report.py) — a worklist that hides disposition-required findings
  contradicts D5.
- Working file: `RxSweep - Federal Register v6.dc.html` — **approved by Travis
  2026-07-11** with all round-13 flags resolved as recommended. Handoff addendum built
  at `design_handoff_dispositions/` (README map + v6 prototype + kickoff prompt);
  Travis commits it under `design/` and implementation proceeds as its own PR after the
  current branch merges.

## 11 · Status & handover (2026-07-11, round 9 — read this first on takeover)

**Approved working design: `RxSweep - Federal Register v5.dc.html`** (v6 adds the round-13
disposition workflow and awaits Travis review; continue from v6). All §1–§10 + amendment
rounds 5–8 are implemented in v5, plus the round-9 gap states below. v4 is the last
Travis-approved state BEFORE the gap states. Any new agent continues from the newest
version file; never resume from an older file.

**Round 9 (2026-07-11) — gap states built in v5 (roadmap step 1):**
- **Scenario samples on upload:** three bundled-sample links (findings 55 · clean · source
  outage demo) drive the prototype's demo scenarios; a real dropped CSV runs the findings
  scenario. Non-CSV files show an inline critical-tint error ("RxSweep could not read …").
- **Clean sweep:** Required actions "(none)" + "No disposition is required." statement;
  register (0) renders a bordered no-findings block ("A clean result is still a record…");
  filters hidden; Manual review (0) all-clear line; briefing/chat answer the clean narrative.
- **Outage:** moderate-tint notice under the run-meta strip ("NDC directory unavailable…
re-run to complete coverage"); Unchecked (12) lists affected items; NDC-status finding and its
  action drop out; counts 54; briefing includes the unchecked caveat.
- **AI-off:** panel shows a moderate-tint notice, chips hidden, composer disabled
  (placeholder "AI is off for this sweep"), Run record model kv reads off · 0 calls · $0.00;
  memo summary section explains the missing narrative.
- **Memo export:** clicking memo.html in Run record opens the memo phase: white letter sheet
  (816px), Georgia serif, MEMORANDUM letterhead with logomark, TO/FROM/DATE/RE docket,
  italic scope line, Summary paragraphs, Required actions list, compact findings table with
  light-palette severity colors (print-fixed), openFDA footer. Toolbar: Back to findings +
  Print to PDF (window.print). Print CSS: @page letter 0.5in; [data-noprint] hides chrome;
  sheet flattens (no shadow/margins).
- **Small screens (<1100px):** assistant panel overlays with scrim + shadow instead of
  squeezing the canvas; seam/drag hidden; a chat-glyph toggle appears in the masthead;
  panel starts closed when a run finishes on a narrow window.
- **Upload state rule (Travis, round 9 review):** the selected-file name in the drop zone
  appears only while an attachment exists. "New sweep" clears the previous selection
  (file name, size, error, scenario) and returns the drop zone to its empty prompt.
- **Round 10 (upload attachment UX, senior-design pass):** the empty drop zone teaches the
  format up front ("Accepts a .csv with NDC and drug name columns; headers are detected
  automatically") and tints on drag-over (accent border + accent-soft, 150ms). An attached
  file renders as a **document receipt** in place of the zone: solid hairline surface, accent
  logomark, filename, mono meta line ("CSV · size · columns detected: ndc, drug_name"), and
  explicit **Replace** / **Remove** actions (Remove hover shifts to critical). Receipt and
  zone enter with fade-up; footprint is stable (min-height 306px) so nothing jumps. The
  bundled-sample link (one, product-faithful) returns to the zone. The three demo scenarios
  (findings 55 · clean sweep · NDC source outage) are **design-review chrome, not product
  UI** — demoted to a "Prototype scenarios · design review" mono footnote under a hairline
  at the bottom of the upload screen; the handoff package must exclude them from the
  production build.

**File inventory (project root):**
- `RxSweep - Federal Register v5.dc.html` — CURRENT. v4 + round-9 gap states (clean sweep,
  outage, AI-off, invalid CSV, memo export phase, small-screen overlay panel).
- `RxSweep - Federal Register v4.dc.html` — last approved pre-gap-states reference.
- `RxSweep - Federal Register v3.dc.html` — superseded (pre nested-shell/seam).
- `RxSweep - Federal Register v2.dc.html` — superseded (pre full-bleed split + Vercel dark).
- `RxSweep - Federal Register.dc.html` — v1, superseded (centered card, teal-era layout fixed).
- `RxSweep - Public Record.dc.html` — round-2 deep build, rejected (broke style-guide rules);
  kept for history only.
- `RxSweep Redesign.dc.html` — original 3-option canvas (1a/1b/1c). 1a is the approved lineage.
- `screenshots/` — verification captures per round.

**Repo state at last check (2026-07-11, PR #2 head `89e8a58`):** unchanged. React app in
`web/` (`App.tsx`; screens `Upload/Progress/Dashboard`; components
`ChatPanel/FindingDrawer/FindingsTable/Tiles`; `theme.css`). `design/` still carries the OLD
teal styleguide + comps — this contract supersedes them (see Authority). Any handoff artifact
must restate that so the implementing agent does not follow the repo styleguide.

**Round 12 (2026-07-11) — design QA of the branch implementation.** The handoff was
implemented and pushed (commits `722631d..8e96fdc`, PR #2; adoption recorded as repo D10;
handoff package committed at `design/design_handoff_federal_register/`). Conformance
review: `design_qa/Conformance Report - Federal Register implementation (2026-07-11).md`
— verdict APPROVE with 1 must-fix (outage-notice copy vs the source-level `unchecked`
data), 5 polish, 2 questions (audit.jsonl export route; report.py queue back-port).
Contract corrections adopted from that review: §5 drawer width is **476px** (not 472);
the round-9 outage clause is amended — the Unchecked register lists the server's
**per-source failure lines**, not per-item lines; §5's "severity stamps row" and the old
Required-Actions header phrasing are retired (filter toggles carry counts; header reads
"(N critical · N high)"), matching the approved v4/v5 lineage. **Travis answered both
questions (2026-07-11): Q1 — add the audit.jsonl export route and link it in the
manifest; Q2 — back-port the ai_matched queue rule to `report.py` so the server memo
matches the web memo.** Merge sign-off is pending the must-fix and these two follow-ups.

**Agreed roadmap (Travis approved, 2026-07-11), execute in order:**
1. **Gap states — DONE in v5 (round 9, above), pending Travis review.**
   1b. **Round 10 upload-UX pass — DONE in v5** (attachment receipt, Remove/Replace,
   drag-over affect, format instruction, scenarios demoted to design-review footnote).
   1c. **Round 11 — DONE:** Claude Code handoff package built at
   `design_handoff_federal_register/` (README implementation map onto `web/src` file by
   file, `theme.tokens.css` drop-in, contract copy, v5 prototype + support.js). Travis
   downloads the zip and commits it under `design/` on the PR branch.
2. **Claude Code handoff package — DONE (round 11); committed to the PR branch and
   implemented. Design QA — DONE (round 12, above); awaiting must-fix + Travis answers.**
3. **Standalone share bundle:** single-file offline HTML of v4 for LinkedIn/stakeholder
   demos.
4. **Round 13 dispositions (inserted 2026-07-11, Travis decision):** v6 built and
   **approved by Travis (2026-07-11)**; all six round-13 flags resolved as the design
   agent recommended — see Amendments v1.3. Handoff addendum DONE at
   `design_handoff_dispositions/`. Next: Travis commits it under `design/`, kickoff
   prompt goes to the implementing agent, implementation lands as its own PR after the
   current branch merges; design re-checks the diff before that merge.

**Implementation route (decided):** development happens in the repo via Claude Code
(Opus 4.8) against `web/`, using this contract as the spec and v4 as the acceptance
reference. This design workspace remains the design-of-record until the handoff lands.

**Open items — decided by no one yet (ask Travis, do not assume):**
- Transcript bubble treatment refinement (same surface-shift logic as the composer) was
  offered, not yet requested.
- Whether severity pills ever replace typographic severity at scale (D4 stands unless Travis
  reopens it).
