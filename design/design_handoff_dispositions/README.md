# Handoff addendum: RxSweep dispositions (design contract v1.3, round 13)

**For:** Claude Code implementing in `Travis-Clement-Dev/RxSweep`, `web/` — as its **own
PR after the current `explore/react-aria-styleguide` branch merges**.
**Design authority:** `RxSweep Design Contract.md` in this folder (v1.3; the round-13
amendment block is the spec for this build). This README is the implementation map.
**Acceptance reference:** `prototype/RxSweep - Federal Register v6.dc.html` (open in a
browser with `support.js` beside it). Walk: sample link → Run sweep → dashboard →
Quarantine action 1 (initials strip) → Verify match on the AI row (Confirm / Not a match
→ reason) → Undo → gear → Dispositions → memo.html. The bottom "Prototype scenarios"
footnote stays design-review chrome — do not implement.

## What this round is

Disposition becomes a recorded workflow (contract D11). The queue's action verb button
records the disposition to the audit trail with operator initials and time; the checkbox
retires; corrections are append-only reversals. The ingest disclosure card renames
"Quarantined" → "Excluded rows" (D12) to end the collision with the Quarantine action.

## Decisions already made (Travis, 2026-07-11) — build to these

1. Action enum: `quarantined | reviewed | escalated | confirmed | verified | dismissed |
   reopened`. `verified` = AI match confirmed; `dismissed` = AI match rejected (note
   required); `reopened` = reversal (undo).
2. **The cap-7 queue is retired** in both the web queue and `report.py action_queue()`:
   list ALL criticals + exact-NDC highs + AI-matched moderates, citation (= severity)
   order. This supersedes "cap kept for parity" from the prior round.
3. Confirming an AI match IS the disposition of the Verify action (recorded "Match
   verified"); no follow-on verb appears.
4. Dismissal reason is required, one line.
5. Verified rows calm the register Match tag to neutral hairline "AI: verified";
   dismissed rows render the neutral "Dismissed" tag (D4-refined tag set extended).
6. Operator initials are editable in Run record; edits apply to future dispositions
   only — past records keep the initials they were signed with.

## Endpoint (new)

`POST /api/sweeps/{sweep_id}/dispositions` body
`{ citation: int, action: <enum above>, operator: str, note?: str }` →
appends a `disposition` audit event verbatim (server stamps `ts`, ISO) to
`runs/{run_id}/audit.jsonl` and returns the stored event. Validation: enum member;
operator 2–3 chars; `note` required iff `action == "dismissed"`; 404 unknown citation;
409 sweep not finished. `GET /api/sweeps/{sweep_id}` result gains
`dispositions: [<event>, …]` in append order. **Client reduction:** fold in order; last
event per citation wins; `reopened` returns the row to Open. Nothing is ever deleted.

## File-by-file (`web/src/`)

### `api.ts`
`Disposition` interface (citation, action, operator, note: string|null, ts: string);
`postDisposition(sweepId, {citation, action, operator, note?}): Promise<Disposition>`;
`SweepResultData` unchanged — accumulated dispositions ride the GET payload; add a
`reduceDispositions(events): Map<citation, Disposition>` helper (pure, tested).

### `App.tsx`
Owns `operator: string` (session state, "" until first capture) and
`dispositions: Disposition[]` (seeded from the GET result, extended on each POST
response). Pass both + setters to Dashboard and Memo — the memo renders live status, and
the dashboard stays mounted behind it, so the single source of truth lives here.

### `components/ActionQueue.tsx`
- `buildQueue`: drop the `cap` parameter (decision 2).
- Row grid becomes `24px minmax(0,1fr) auto auto` — checkbox column deleted.
- **Open state** (no reduced disposition): unchanged status line (dot + "Open · due
  today" / "Needs verification" / "Open"), verb button (accent). `aria-expanded` when
  its strip is open.
- **Recorded state**: sentence struck to `--ink-faint` (150ms color transition); action
  column replaced by the record block — line 1: 6px square `--ink-soft` dot + small-caps
  800/10.5 `.07em` `--ink-soft` verb past ("Quarantined" / "Reviewed" / "Escalated" /
  "Confirmed" / "Match verified" / "Not a match"); line 2: mono 500/10.5 `--ink-faint`
  "{INITIALS} · {HH:MM}" + underlined mono **Undo** button (aria-label "Undo this
  disposition; a reversal is recorded") → `postDisposition(..., action: "reopened")`.
  Index number goes `--ink-faint`.
- **Disposition strip** (render inline under the row; one open at a time): container
  `margin: 2px 4px 12px 35px`, 1px `--line-soft` border, `--ground` bg, padding
  11px 13px, flex wrap gap 10, fade-up 150ms. Cases:
  - AI row first shows: "Record the verification outcome:" 600/12 `--ink-soft` +
    **Confirm match** (accent fill 600/11.5, 7px 12px) + **Not a match** (paper bg, 1px
    `--line` border, hover text+border `--critical`).
  - Fields: REASON (dismissals; micro-caps 800/9.5 `.1em` label + flex-1 input, 1px
    `--line`, `--field` bg, min-width 230) · INITIALS (only while operator unset;
    52px mono input, maxLength 3, uppercase, aria-label "Operator initials, 2 to 3
    characters") · **Record …** button ("Record quarantine" / "Record verification" /
    "Record dismissal"; accent fill; disabled → `--line-soft` bg + `--ink-faint` text +
    not-allowed while initials <2 chars or dismissal reason empty) · underlined text
    **Cancel**.
  - First-time note (full-width, 10.5 `--ink-faint`): "Initials sign every disposition
    this session and are written to the audit log with the action and time."
  - No strip needed (operator known, non-AI verb): the verb button records in one click.
  Keyboard: everything tabbable; Esc closes the strip (Cancel is the visible affordance).
- Verb→action map: Quarantine→quarantined, Review→reviewed, Escalate→escalated,
  Confirm→confirmed; AI outcomes → verified / dismissed.

### `components/FindingsTable.tsx`
Reduced-dismissed rows: row opacity .5, item cell `line-through`, Match tag → "Dismissed"
(`--ink-soft` text, transparent bg, `--line-soft` border). Reduced-verified rows: Match
tag → "AI: verified", same neutral hairline treatment. Severity cell unchanged (rubric
fact). Row click and citation flash unchanged.

### `components/FindingDrawer.tsx`
When the finding has a reduced disposition, insert a **DISPOSITION** block between the
sevline and "Why it's flagged": 1px `--line` border on `--ground`, padding 10px 12px;
micro-caps 800/10 `.1em` `--ink-soft` "Disposition"; mono 500/12 `--ink`
"{Verb past} · {INITIALS} · {HH:MM}"; dismissals add 12.5 `--ink-soft`
"Reason: {note}"; note line 10.5 `--ink-faint`: "Recorded in this run's audit log.
Corrections append a reversal; nothing is erased." Hide the AI caution block once the
match is verified or dismissed.

### `components/AssistantPanel.tsx`
Run record view: new **DISPOSITIONS** section between MODEL USAGE and EXPORTS — kv rows
Recorded "N of M" / Open "K" / Dismissed "J" + **Operator** kv whose value is an editable
mono input (maxLength 3, uppercase, right-aligned, borderless on the panel surface,
placeholder "not set", aria-label "Operator initials"); section note: "Each disposition
and reversal is appended to this run's audit log as its own event. Nothing is erased."

### `screens/Memo.tsx`
Under REQUIRED ACTIONS: italic serif 12/1.6 `#565c65` state line — "No dispositions
recorded as of {HH:MM}; all N actions remain open." / "K of N actions recorded as of
{HH:MM}; M remain open." / "All N actions recorded as of {HH:MM}. None remain open."
Each `<li>`: sentence span (struck when recorded) + italic clause
"({Verb past}[: {note, trailing period stripped}]. {INITIALS}, {HH:MM}.)" or
"(Open.)" / "(Open, due today.)". Serif register, fixed light palette, prints as-is.

### `screens/Dashboard.tsx`
Disclosure card: title "Excluded rows (N)"; zero copy "No rows were excluded during
ingest."; non-zero list unchanged + closing line 11/1.5 `--ink-faint`: "Rows the sweep
could not read are disclosed here; nothing is silently dropped."

### `src/rxsweep/report.py` + templates
`action_queue()`: drop the cap; add the ai_matched rule (wording per ActionQueue).
Rename "Quarantined" → "Excluded rows" in `report.html.j2` display copy and any memo
copy. API/field names unchanged. Update tests.

## Copy register
No em dashes. All new strings above are verbatim from the prototype — lift them exactly.
Times display as local HH:MM derived from the server `ts`.

## Motion & a11y
Strip fade-up 150ms; strike 150ms; all gated behind `prefers-reduced-motion`. WCAG 2.1
AA: the full record/verify/dismiss/undo path is keyboard-operable; focus moves into the
strip when it opens and returns to the row's record block (Undo) after recording.

## Acceptance checklist (both themes)
Fresh queue (all rows Open, no cap truncation) · first disposition opens the initials
gate, Record disabled until 2 chars · subsequent non-AI dispositions record in one click
· record line format + Undo reversal (row returns to Open; audit.jsonl shows disposition
+ reopened events) · AI row: Confirm match → "Match verified"; Not a match requires a
reason → register row fades/strikes with "Dismissed" tag · drawer DISPOSITION block,
caution hidden after verify/dismiss · Run record DISPOSITIONS counts + operator edit
(future-only) · memo partial-state line + per-item clauses, no double periods, prints
clean · "Excluded rows" rename everywhere user-visible · keyboard-only walkthrough ·
`prefers-reduced-motion` · full pytest green.
