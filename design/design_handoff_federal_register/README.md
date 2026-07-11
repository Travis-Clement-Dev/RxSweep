# Handoff: RxSweep — "Federal Register" redesign (design contract v1.1)

**For:** Claude Code (Opus) implementing in `Travis-Clement-Dev/RxSweep`, branch
`explore/react-aria-styleguide`, directory `web/` (React 19 + Vite + Tailwind v4).
**Design authority:** `RxSweep Design Contract.md` in this folder — the binding spec
(decision log, tokens, component law, motion rules, copy register). This README is the
implementation *map* onto the existing codebase. Where they disagree, the contract wins.
**Supersedes:** the repo's `design/styleguide/` and `design/comps/` (teal accent, flat gray
document, bottom ask bar are all retired decisions). Do not follow them.

## Overview

RxSweep sweeps a formulary CSV against FDA recalls, drug shortages, and discontinued NDCs —
severity-ranked, cited, audit-logged, pharmacist-verified. This handoff restyles and
restructures the existing working web app (`web/`) to the approved "Federal Register"
design: an authoritative, government-grade instrument in a single navy accent family, with a
right-docked assistant panel, nested floating-card shell, light + dark themes, a printable
memo, and honest empty/degraded states. Audience: pharmacy informaticists and regulatory
professionals.

## About the design files

`prototype/RxSweep - Federal Register v5.dc.html` (open it in a browser; keep `support.js`
beside it) is a **design reference created in HTML** — a working prototype showing intended
look, motion, and behavior. It is **not production code**. The task is to **recreate this
design in the existing `web/` React app**, using its established patterns: the
`App.tsx` phase machine, the typed client in `api.ts`, `theme.css` (Tailwind v4 +
CSS custom properties), and the existing screen/component files. Real data comes from the
existing endpoints; the prototype's data is realistic dummy content.

## Fidelity

**High-fidelity.** Recreate pixel-perfectly: exact tokens, type sizes, spacing, borders,
and motion timings are specified below and in the contract. The prototype is the acceptance
reference — when in doubt, open it and match it in both themes.

## Walking the prototype

Upload → attach a file or click "Use the bundled sample_formulary.csv" → Run sweep →
radar progress → dashboard. Theme toggle: masthead icon. Assistant panel: right dock
(chat glyph = Assistant, gear = Run record, chevron = collapse; drag the seam to resize).
Click any register row or `[n]` citation. Run record → `memo.html` opens the print memo.
The bottom **"Prototype scenarios · design review"** footnote (findings 55 · clean sweep ·
NDC source outage) switches demo states — **this footnote is design-review chrome; do NOT
implement it in production.** The real app reaches those states from real data:
`findings.length === 0`, `unchecked.length > 0`, `meta.ai_available === false`.

## Theme system

Copy `theme.tokens.css` (in this folder) over the token blocks in `web/src/theme.css`.
- Tokens key off `:root[data-theme="light"|"dark"]`; keep a `prefers-color-scheme` fallback
  for `:root:not([data-theme])` (already written in the file).
- The masthead theme toggle is an **icon button** (☾ in light, ☀ in dark; 30×30px, 1px
  `rgba(255,255,255,.28)` border, transparent bg). It sets
  `document.documentElement.dataset.theme` and persists `localStorage["rxsweep-theme"]`;
  initialize from storage on boot. Never render the words "Dark/Light" (contract D7).
- New tokens: `--panel`, `--elev`, `--field`. `--card`/`--high*` kept as aliases.
- The memo sheet is always white with fixed light-palette severity colors (it prints).

## Shell architecture — nested floating layers (contract round 7)

The window is a **frame**, not a canvas. On the **dashboard** phase:
- `<body>` background `var(--ground)` is the frame.
- Masthead band belongs to the frame layer: full-width, `var(--band)` bg, 4px
  `var(--accent)` bottom rule, padding 9px 22px. Left: logomark (the repo's
  `web/public/favicon.svg` chevron path, fill `#7fa0cf`, 15×14) + "RxSweep" 800/15
  `letter-spacing:.02em` + role line "Formulary surveillance · FDA public data · pharmacist
  verifies" (12px, `#aab2b8`, 1px `rgba(255,255,255,.18)` left border, 10px padding-left).
  Right: theme toggle (and, under 1100px, an assistant-toggle icon button — see Responsive).
- Two working surfaces float inside the frame as **independently rounded cards
  (border-radius 14px, all corners)** separated by a ~10px gutter of frame background on
  all sides: the **canvas** (paper bg; fills remaining width; inner content max-width
  1604px centered, 22px side padding) and the **assistant panel** (`--panel` bg; fixed;
  top 54px / right 10px / bottom 10px; width 340px default).
- **No divider strokes at the shell level** — separation comes from the seam gap and the
  one-step tonal shift (dark: frame `#0a0b0c`, cards `#131416`). Hairline rules live only
  *inside* the canvas (document language).
- **The seam is a live resize handle:** 10px hit area between the cards, `cursor:col-resize`,
  centered 4×38px pill (`var(--line)`, radius 999). Drag range 280–560px. While dragging,
  disable the panel's width transition; otherwise `width .2s ease`.
- Upload and run phases keep the **centered instrument card** instead (max-width 1240,
  radius 14, no panel): ceremony moments.
- Canvas bottom: openFDA footer strip on paper (13px 22px padding, hairline top rule):
  "openFDA: do not rely on these data to make decisions regarding medical care; assume all
  results are unvalidated. Terms · License · Severity rubric human-authored (Travis Clement,
  PharmD) · RxSweep on GitHub".

## File-by-file mapping (`web/src/`)

### `App.tsx` (edit)
- Keep the `Phase` state machine; add `"memo"` phase (dashboard → memo → back).
- Move the h1/docket/notice INTO the dashboard canvas card (see Dashboard). The masthead
  band gains the theme toggle. Remove nothing from the copy register.
- "New sweep" (quiet bordered button, canvas header right) resets to upload AND clears the
  previous file selection.

### `screens/Upload.tsx` (restyle + new states)
Two-column grid `minmax(0,1fr) 336px`, gap 18, inside the centered card. Header block:
"Sweep a formulary" 800/26 `-.01em`; sub 13.5/1.55 `--ink-soft`; then 3px ink rule + 1px
line rule stacked (3px gap). Scope banner: `--accent-soft` bg, 3px accent left rule,
"Scope." bold `--accent-ink` + standard scope sentence.
- **Empty drop zone** (a `<label>` wrapping the file input): 2px dashed `var(--line)`,
  paper bg, min-height 306px, centered column. Ghost logomark (34×33, fill `var(--line)`).
  Title 700/16 "Drop your formulary CSV here". Sub 12.5/1.5 `--ink-faint`, max-width 46ch:
  "or click to browse. Accepts a .csv with NDC and drug name columns; headers are detected
  automatically." Quiet link 600/12.5 underline `--accent-ink`: "Use the bundled
  sample_formulary.csv".
  **Drag-over:** border `var(--accent)`, bg `var(--accent-soft)`, 150ms ease transition.
- **Attached state — document receipt** (replaces the zone, same 306px footprint,
  fade-up entrance): solid 1px `var(--line)` surface; centered receipt row (max-width 520):
  1px `--line-soft` border on `--ground`, padding 15px 18px; accent logomark 22×21;
  filename 700/14.5; mono meta 11.5 `--ink-faint` "CSV · {size} KB · columns detected:
  ndc, drug_name" (use the real detected headers from ingest); actions right: **Replace**
  (label-wrapped hidden input; 600/12 `--accent-ink`, 1px `--line` border, 7px 12px) and
  **Remove** (same geometry, `--ink-soft`; hover text+border `--critical`; clears the file).
  Below the row, 12px `--ink-faint`: "Ready to sweep. Review the options, then run."
- **Invalid file:** non-CSV drop/pick shows an inline error under the zone content
  (12px, `--critical` on `--critical-soft`, 3px critical left rule): "RxSweep could not
  read '{name}'. Provide a CSV file with columns for NDC and drug name. Nothing was
  uploaded." Nothing is uploaded; zone stays empty.
- **Sweep options card** (right column): paper, 1px `--line-soft`, padding 20. Micro-caps
  title "SWEEP OPTIONS" 800/12 `.12em`. Rows: "Recall lookback (months)" numeric input
  (72px, mono 13, 1px `--line`, `--field` bg) and "AI triage of fuzzy matches" toggle
  (44×24 square track, `--accent` when on, 20px white knob, 200ms). Cost note 11.5/1.5
  `--ink-faint` above a hairline: "AI triage adjudicates only fuzzy matches, using your
  Anthropic API key from the server environment. Your key, your cost; every call is logged.
  Deterministic findings work without it." Primary button "Run sweep" (accent fill,
  600/13.5, 12px 16px, full width; disabled = `var(--line)` bg + not-allowed) →
  `startSweep(file, monthsBack, useAi)`.

### `screens/Progress.tsx` (restyle)
Centered column, 54px+ vertical padding: **radar** 130px circle (1px `--line` border,
two `--accent-soft` radar rings via radial-gradients, conic sweep to `var(--accent)`
rotating 2s linear — see `.sweep` in old theme.css, recolor + 2s), phase label 800/18
(server `phase` strings), 4px progress track (`--line-soft` / `--accent` fill, width from
polled progress), three counters (800/26 tabular + micro-caps 800/10 `.12em` labels:
ITEMS READ / FDA REQUESTS / AI CALLS ← `SweepProgress.items/fda_requests/ai_calls`),
footnote 12px `--ink-faint`: "Every request and AI call shown here is also written to this
run's audit log."

### `screens/Dashboard.tsx` (restructure)
Canvas card content, top to bottom (all inner content max-width 1604 centered):
1. Header row: "Formulary Sweep Findings" 800/26 + sub 13px; "New sweep" quiet button
   right. Then 3px ink rule + 1px line rule (the 3px rule animates scaleX from left,
   500ms ease, once).
2. Scope banner (same as upload).
3. **Run-meta strip:** responsive grid `repeat(auto-fit, minmax(185px, 1fr))` with **1px
   gaps on a `--line-soft` background** (gap trick renders hairlines both axes), hairline
   top/bottom borders. Cells: `--ground` bg, 11px 20px padding; micro-caps label 800/9.5
   `.1em` `--ink-faint` over 600/13.5 value. Cells: FORMULARY (csv_name) / ITEMS CHECKED /
   RECALL WINDOW ({months} months) / AI MODEL (model or "off") / RUN (run_ts local).
4. **Outage notice** (only when `unchecked.length > 0`): `--moderate-soft` bg, 3px moderate
   left rule, bold lead "NDC directory unavailable." + "The NDC directory could not be
   reached after retries. N items were not checked against it and are listed under
   Unchecked. Treat them as unknown, not clear. Re-run the sweep to complete coverage."
   (Generalize the source name from the `unchecked` strings.)
5. **Required actions** (verb-led queue, contract §6): h2 micro-caps 800/15 `.08em`
   "REQUIRED ACTIONS (N critical · N high)" — derive from tiers. Rows: grid
   `24px 20px 1fr auto auto`, gap 11, padding 10px 4px, hairline bottom. Index 800/14 ·
   checkbox (16px, `accent-color: var(--accent)`; checking strikes the sentence to
   `--ink-faint`) · sentence 14/1.5 with **bold verb lead** ("Verify lots for …",
   "Confirm supply plan for …", "Review …") + mono `[n] FDA record` link (11.5, opens the
   drawer) · severity tag (small-caps 800/11 `.09em`, 3px left rule in severity color) ·
   action verb button (accent fill 600/11.5, 6px 11px: Quarantine / Escalate / Verify
   match / Confirm) over a status line (10.5 `--ink-faint` with 6px square dot: "Open ·
   due today" dot `--critical`; "Needs verification" dot `--moderate`; "Open" dot
   `--ink-faint`). Derive rows from critical/high findings + ai_matched moderates.
   **Zero findings:** header "(none)" + bordered statement row: "No disposition is
   required. This sweep returned no findings."
6. **Findings register** (`components/FindingsTable.tsx`): h2 "FINDINGS REGISTER (N)".
   Filter toggles right of the h2 (hidden when zero findings): All findings · Critical ·
   High · Moderate · Info with counts; 600/12, 7px 11px, active = accent bg + `--btn-ink`;
   inactive = paper bg, `--line-soft` border, 7px severity dot.
   Table: 1px `--line` outer border; columns
   `52px 96px minmax(0,1.5fr) 120px 92px 128px minmax(0,1.9fr)` =
   `[#] Severity Item NDC Source Match Basis`. Header row `--ground` bg, micro-caps 800/10.5
   `.06em`. Cells 9px 10px. `[n]` mono 12 `--ink-faint`. Severity = 8px square dot + 800/11
   small-caps colored text (typographic, never pills). Item 500/13. NDC mono 11.5.
   **Match column center-aligned, bordered tags** 700/10 caps 4px 7px: Exact NDC
   (`--accent-ink` on `--accent-soft`, `--accent` border) · Name match (`--ink-soft`,
   transparent bg, `--line-soft` border) · AI: verify (`--moderate` on `--moderate-soft`,
   `--moderate` border). Basis 12/1.4 `--ink-soft` = `severity_rationale`.
   Row: pointer cursor, hover `--focus-row`, click opens drawer. **Citation flash:** jumped
   row gets `--focus-row` bg + inset 3px `--accent` left bar, decaying ~1.9s.
   **Zero findings:** replace the table with a bordered statement: "**No findings.** N items
   were checked against FDA recalls, drug shortages, and the NDC directory over the trailing
   {months} months. A clean result is still a record: export the memo from the run record to
   file this sweep." Note line under the table: "Showing X of N…" (omit when zero).
7. **Disclosure cards** (3-up grid, gap 14): Manual review / Quarantined / Unchecked —
   bordered `--ground` cards, micro-caps titles with counts, hairline-separated rows
   (12/1.4). Manual review empty state: "No fuzzy candidates required manual adjudication
   this run." Unchecked zero state: "All three FDA sources were reachable this run. No items
   were left unchecked."; otherwise list the `unchecked` strings.
8. Retire `components/Tiles.tsx` (severity tiles replaced by stamps/filters).

### `components/FindingDrawer.tsx` (restyle)
Fixed right, width 476 (max 94vw), paper bg, 1px `--line` left border, overlay scrim
`rgba(10,14,18,.5)`; slide-in 240ms (translateX 30px → 0 + fade). Content padding 22px 24px:
micro-caps "FINDING RECORD" + Close quiet button over a **3px ink rule**; title 800/19 with
mono `[n]`; mono docket line "Formulary row {row} · NDC {ndc}"; severity dot+small-caps ·
source · match tag row; "WHY IT'S FLAGGED" (micro-caps h3) + `severity_rationale` 13.5/1.55;
if `ai_matched`: "AI MATCH REASONING" + `ai_rationale` + caution block (`--moderate-soft`,
3px moderate rule): "AI-matched: needs verification. Confirm this reasoning against the FDA
record below before acting."; "FDA RECORD" as a bordered key/value grid (136px mono keys on
`--ground` / values 12.5); primary button "Open FDA source record ↗" → `sourceUrl(f)`.
Esc closes; focus-trapped.

### `components/ChatPanel.tsx` → **new `components/AssistantPanel.tsx`** (right dock)
Replaces the old sticky chat card. Geometry per Shell above. Dashboard phase only.
- **Header** (on `--band`, radius clipped by the card): micro-caps title ("SWEEP ASSISTANT"
  or "RUN RECORD") left; right icon row: chat glyph (11×14 outlined bubble) · gear ⚙ ·
  1px divider · chevron › (collapse). Active view icon: full opacity + 2px bottom
  underline in `--band-ink`; inactive 55%.
- **Collapsed rail:** 44px wide card; band header keeps only ‹ ; below, vertical icon stack
  (chat, gear) — clicking opens that view.
- **Assistant view:** governance line 11.5/1.5 `--ink-soft` under a hairline: "Answers come
  only from this run's findings, with citations. A pharmacist verifies." Transcript scroll
  area (12px 14px, gap 10). Empty state chips: primary **"Prepare the executive briefing"**
  (700/12.5, `--accent-soft` bg, 1px `--accent` border) — reveals `result.summary`
  **without any API call**, meter reads "Drafted during the sweep by {model} · no additional
  API call"; then four suggestion chips (500/12, paper bg, `--line-soft` border; hover
  border/text accent): "Which recalls have exact NDC matches?" / "What needs verification
  first?" / "Which shortages have no alternative?" / "Draft a memo for the critical
  findings" → `sendChat`. Bubbles: user right-aligned `--accent-soft`/`--accent-ink` with
  `--accent` border; assistant left `--ground` with `--line-soft` border; 12.5/1.55, padding
  9px 11px, max-width 94%. Inline `[n]` citations are buttons (mono 600/11 `--accent-ink`)
  that scroll the register row into view (**instant** scroll, never smooth) and trigger the
  row flash. Metered replies append a mono meter line 10px `--ink-faint`:
  "{model} · {input_tokens} in / {output_tokens} out tokens · ~${est_cost_usd}" + "Billed to
  your own API key. Logged in audit.jsonl." (from `sendChat` usage).
- **Composer — floating card** (contract round 6): margins 6px 14px 16px, `--elev` bg, 1px
  `--line-soft` border, radius 3. Borderless transparent input (13/1.5, padding
  14px 14px 6px). Bottom utility row (6px 8px 8px 14px): mono 10px `--ink-faint` model id
  left; **Ask** button right (accent fill 600/12, 7px 14px, radius 2) — the only accent in
  the composer.
- **AI-off state** (`meta.ai_available === false`): moderate-tint notice block under the
  governance line ("AI was off for this sweep. The assistant needs an Anthropic API key on
  the server. Findings, the register, and exports remain fully usable."), chips hidden,
  composer input+Ask disabled (Ask bg `--line`, placeholder "AI is off for this sweep").
- **Run record view** (gear): sections with micro-caps 10.5 `.12em` headers over hairline
  kv rows (label 11.5 `--ink-soft` / value mono 11.5 right-aligned): RUN (file, items
  checked, recall window, run id, started) · MODEL USAGE (model, AI calls, tokens, est.
  cost; AI-off shows "off · deterministic", 0, 0, $0.00) + "Billed to your own API key.
  Every prompt and completion is logged verbatim." · EXPORTS — manifest list, each a mono
  underlined link + 11px description: findings.csv ("Flat register for spreadsheets and
  imports.") / findings.xlsx ("Severity-tinted workbook with frozen header and
  autofilter.") / findings.md ("Markdown interchange for your AI tools.") / memo.html
  ("Institutional memorandum; prints to letter PDF." — opens the Memo view) / audit.jsonl
  ("Verbatim log of every request, prompt, and completion."). Footer note: "Full audit
  trail for this run: runs/{run_id}/audit.jsonl".

### New: `screens/Memo.tsx` (print memo — contract §4: Georgia belongs to the memo only)
Reached from Run record → memo.html. Canvas shows a `--ground` well containing a **white
letter sheet** (max-width 816px, padding 58px 66px, Georgia/'Times New Roman' serif,
`#1b1b1b` ink — fixed colors in both themes). Toolbar above the sheet (hidden in print):
"← Back to findings" quiet + "Print to PDF" accent (`window.print()`), meta note "Letter ·
portrait · prints to PDF". Sheet anatomy: letterhead row (logomark #1e3f63 16px +
"RxSweep" Public Sans 800/14 `#12203a`; right micro-caps 800/9 `.14em` `#71767a`
"FORMULARY SURVEILLANCE · FDA PUBLIC DATA") → "MEMORANDUM" Georgia 700/21 `.04em` → 3px +
1px rules → TO/FROM/DATE/RE grid (64px micro-caps Public Sans labels `#565c65`; serif 13.5
values; RE = "Formulary sweep findings: {csv} ({items} items, {months} month recall
window)") → 1px rule → italic scope line 12 `#565c65` → SUMMARY (micro-caps header) +
`result.summary` paragraphs serif 13.5/1.75 (AI-off: explain the narrative is absent) →
REQUIRED ACTIONS ordered list (or "None. This sweep returned no findings.") → FINDINGS (N)
compact grid `30px 78px 1.35fr 96px 76px 1.5fr` serif 11.5, severity small-caps in fixed
light palette (#9a3a2e / #8a5d0b / #256b43), hairline row rules → footer rule + openFDA
disclaimer + rubric credit + mono audit path.
Print CSS: `@page { size: letter; margin: 0.5in }`; hide app chrome (masthead, toolbar,
footer, panel) via a `data-noprint` attribute + `@media print { [data-noprint]{display:none
!important} }`; sheet loses shadow/margins and fills the page.

## Motion (contract §8 — all gated behind `prefers-reduced-motion: reduce`)
- Entrances: staggered fade-up (opacity 0 + translateY 9px → none), 300–450ms ease-out,
  delays .05/.08/.12/.16/.20s, max ~6 elements, once per phase change.
- Title rule: scaleX 0→1 from left, 500ms ease, once.
- Radar: conic rotation 2s linear (Run screen only).
- Micro: hover tints 120–150ms; drag-over zone tint 150ms; drawer slide 240ms; panel width
  .2s ease (suspended while seam-dragging); check-off strike 150ms; theme/filter switches
  instant; citation row flash 1.6–1.9s decay; **citation scrolling is instant** (never
  `behavior:'smooth'`).
- Never: parallax, bounce, looping decorative motion, skeleton shimmer.

## State management
Extend the existing `App.tsx` machine: `phase: upload | progress | dashboard | memo`.
Component state: `theme` (persisted); upload `{file, error, dragOver}`; dashboard
`{sevFilter, selected(finding), checked(action ids), flashN}`; panel `{open, width 280–560,
mode: chat|record, messages, input}`; `winW` (resize listener) for the <1100px overlay.
Data: existing `startSweep`/`getSweep` polling/`sendChat`; `result.summary` powers the
briefing chip; `meta.ai_usage` powers the meters.

## Responsive (contract round 9)
Below 1100px viewport width on the dashboard: the panel **overlays** the canvas (same
right-docked card + `0 14px 44px rgba(0,0,0,.4)` shadow + full scrim `rgba(10,14,18,.45)`,
click-to-close) instead of reserving width; the seam/drag is disabled; a chat-glyph icon
button appears in the masthead to toggle it; the panel starts closed when a run finishes on
a narrow window. The canvas keeps 10px gutters.

## Design tokens
See `theme.tokens.css` (drop-in) — light/dark values for every custom property, plus alias
notes. Type: Public Sans 400/500/600/700/800 (self-host or Google Fonts) + IBM Plex Mono
400/500/600 for identifiers only (NDC, run ids, [n], file names, meters) + Georgia for the
memo sheet only. Scale: doc title 26/800 −1%; section labels 15/800 caps +8%; body 14;
table 12.5–13; mono ids 11.5; micro labels 9.5–10.5/800 caps +10–14%. Tabular numerals on
all counts. Radii: 14px shell cards / 3px composer & receipt chips / 0 inner document
elements. Spacing: 4px base unit; canvas side padding 22px; section gaps 26–30px.

## Accessibility
WCAG 2.1 AA. `:focus-visible` 2px accent outline offset 2 (already in theme.css — keep).
`aria-pressed` on toggles/filters; `aria-label` on icon buttons (theme, panel icons, seam
`role="separator"` `aria-orientation="vertical"`, Remove); drawer focus-trap + Esc; the
seam needs a keyboard alternative (arrow-key resize when focused). Copy register: FDA
drug-safety-communication voice, **no em dashes in UI copy**, scope banner on every surface.

## Assets
- Logomark: reuse `web/public/favicon.svg` path (the chevron sweep glyph); recolor via
  `fill` per surface (band `#7fa0cf`, drop-zone ghost `var(--line)`, receipt
  `var(--accent)`, memo `#1e3f63`). No other icons: panel glyphs are tiny inline SVG /
  unicode (⚙ › ‹ ☾ ☀ ↗ ←) styled as text.
- Fonts: Public Sans, IBM Plex Mono (Google Fonts or self-hosted), Georgia (system).

## Files in this folder
- `README.md` — this file.
- `RxSweep Design Contract.md` — binding design law + §11 status/handover + decision log.
- `theme.tokens.css` — drop-in token blocks for `web/src/theme.css`.
- `prototype/RxSweep - Federal Register v5.dc.html` + `prototype/support.js` — the
  acceptance reference. Open the HTML in a browser and walk every state in both themes.

## Acceptance checklist
In both themes: upload (empty zone → drag tint → receipt → Replace/Remove → invalid CSV
error) · run (radar, counters, phase labels) · dashboard (strip reflow at any width,
required actions check-off, register filters, row hover/click, citation jump + flash) ·
drawer (ai_matched caution, FDA record grid, source link) · assistant (briefing = no API
call, suggestion chips metered, AI-off degradation, collapse rail, seam drag 280–560) ·
run record (docket, usage, export manifest) · memo (letter print, chrome hidden) ·
zero-findings dashboard · unchecked/outage notice · <1100px overlay panel ·
`prefers-reduced-motion` disables all motion · no teal anywhere · no em dashes in copy.
