# Kickoff prompt: RxSweep recorded dispositions (design round 13)

Paste to the implementing agent once this folder is committed under `design/`.

---

# Round 13 build: recorded dispositions + "Excluded rows" rename

Travis approved the disposition-workflow design (contract v1.3, round 13). Build it in
`web/` as its OWN PR after the current `explore/react-aria-styleguide` branch merges.

<spec>
Design authority: `design/design_handoff_dispositions/` —
- `README.md`: implementation map (endpoint spec, file-by-file onto web/src, exact
  styles and copy strings, acceptance checklist). Follow it.
- `RxSweep Design Contract.md` v1.3: the round-13 amendment block is the binding spec.
- `prototype/RxSweep - Federal Register v6.dc.html`: acceptance reference. Open it in a
  browser (keep support.js beside it) and walk: sample link → Run sweep → Quarantine
  action 1 (initials gate) → Verify match on the AI row (Confirm / Not a match →
  required reason) → Undo → gear → Dispositions → memo.html. Match it in both themes.
  The "Prototype scenarios" footnote is design-review chrome — do not implement.
</spec>

<summary>
The queue's action verb button now RECORDS the disposition: POST
/api/sweeps/{id}/dispositions appends a `disposition` event to audit.jsonl (server
timestamp), GET returns accumulated events, client reduces last-per-citation with
`reopened` as the append-only undo. Enum: quarantined | reviewed | escalated |
confirmed | verified | dismissed | reopened. Checkbox retired. Operator initials
(2–3 chars, mono) captured inline at first disposition — never masthead chrome —
editable in Run record, future dispositions only. AI rows get two-outcome verify
(Confirm match → "Match verified" / Not a match → required one-line reason →
register row fades + strikes + neutral "Dismissed" tag; "AI: verified" calms to a
neutral tag). Drawer gains a DISPOSITION record block. Run record gains a
DISPOSITIONS section. Memo items carry status clauses plus an honest partial-state
line. The cap-7 queue is RETIRED (web + report.py action_queue) — list every
critical, exact-NDC high, and AI-matched moderate. Ingest card "Quarantined" renames
to "Excluded rows" (display/memo/report copy only; API field unchanged).
</summary>

<out_of_scope>
No auth or multi-user anything. No run-history browsing. Export columns for
dispositions deferred. Do not restyle surfaces the README does not name.
</out_of_scope>

<acceptance>
The README's acceptance checklist, verified live in a real browser in both themes,
plus a keyboard-only walkthrough and prefers-reduced-motion. audit.jsonl must show
disposition and reopened events verbatim. Full pytest green (update report tests for
the cap removal + ai_matched rule + rename). Reply with the commit range; the design
agent re-checks the diff before merge.
</acceptance>
