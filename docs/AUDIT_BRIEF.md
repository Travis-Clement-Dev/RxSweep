# Independent Audit Brief — RxSweep

You are an independent auditor. You did not build this project, and your job is to
verify it adversarially: trust nothing the builder claimed until you have reproduced
it yourself. The builder was an AI agent working with Travis Clement (PharmD, AIGP
candidate); this audit exists because Travis requires independent verification of
both the product and the process. Report findings; do not fix anything without
Travis's explicit approval.

## Ground truth locations

- Repo: `~/Documents/Pharmacy Informatics/rxsweep`
- Branches: `main` (tagged `v0.1.0`), `phase-3/regulatory-instrument-ux`
  ([PR #1](https://github.com/Travis-Clement-Dev/RxSweep/pull/1)),
  `explore/react-aria-styleguide` ([PR #2](https://github.com/Travis-Clement-Dev/RxSweep/pull/2),
  branched from phase-3). Audit the explore branch tip; it contains everything.
- One line of what this is: batch-checks a formulary CSV against openFDA recalls,
  shortages, and NDC status, with a strictly bounded, fully audited AI layer.

## Read first, in this order

1. `README.md`, then `docs/DESIGN.md` (as-built architecture)
2. `docs/DECISIONS.md` (D1–D9: every decision with rationale) and `docs/JOURNAL.md`
   (lessons, incident history)
3. Governance pack: `docs/SYSTEM_CARD.md`, `docs/DATA_PROVENANCE.md`, `docs/GOVERNANCE.md`
4. Plans with checkboxes: `plans/2026-07-09-day1-build.md`, `-day2-webapp.md`, `-phase3-ux.md`
5. The style guide: `design/styleguide/index.html` (open in a browser) and comps in `design/comps/`
6. Both PRs: bodies and every comment (`gh pr view 1 --comments`, `gh pr view 2 --comments`)

## Environment facts you need (documented incidents, not speculation)

- macOS here sets `UF_HIDDEN` on files under dot-directories and Python then silently
  skips `.pth` files. If imports vanish: `chflags -R nohidden .venv ~/.cache/uv`.
  Tests are immune (`pythonpath = ["src"]` in pyproject).
- Serve with: `uv run rxsweep serve` (127.0.0.1:8555). HTML is sent `Cache-Control:
  no-cache` after a stale-browser-cache incident; hard-refresh if anything looks old.
- `ANTHROPIC_API_KEY` lives in the gitignored `.env` (30-day key). Never print it.
  Live AI sweeps cost roughly $0.02 on Travis's key: run ONE full live sweep for
  verification, use `--no-ai` for everything else unless Travis approves more.

## The audit itself

For each area, record PASS / FAIL / CONCERN with the exact evidence (command, file:line,
or screenshot). "The doc says so" is not evidence.

1. **Claims versus reality.** Every factual claim in README.md and the governance pack,
   reproduced: test count (`uv run pytest`), the exports written per run, the memo's
   structure and print stylesheet, the audit-log schema versus `docs/GOVERNANCE.md`'s
   table, cost-meter arithmetic versus `runs/<ts>/audit.jsonl` token sums.
2. **Style-guide conformance.** Tokens in `web/src/theme.css` match the guide's values
   exactly; the guide's live contrast checks pass in BOTH themes (use its toggle);
   every React Aria component the guide promises is either imported in `web/src`
   (verify imports programmatically, not by eye) or explicitly dispositioned in the
   PR #2 conformance comment. Then verify behavior in the running app: column sort
   moves `aria-sort`, the drawer traps and restores focus, Esc dismisses,
   `role="progressbar"` appears during a sweep, keyboard-only navigation works
   end to end (this human-style pass has never been done by a person).
3. **Writing register.** Generated artifacts (memo, findings.md, UI copy, AI summary
   from a live run) contain no markdown leakage and no em dashes; README has zero em
   dashes (`grep -c "—" README.md` must print 0); product text reads as FDA
   plain-language register.
4. **Governance truth.** Severity rubric carries human authorship and the system card
   names the author; openFDA's disclaimer appears verbatim in the report, the app
   shell, and DATA_PROVENANCE; `runs/` and `.env` are gitignored; **verify no secret
   ever entered history**: `git log -p | grep -c "sk-ant"` must print 0.
5. **Process fidelity.** DECISIONS.md entries match what the code actually does;
   plan checkboxes correspond to shipped work; PR comments' claims are accurate.
   Flag any claim you cannot reproduce.

## Known open items (do not re-flag as discoveries)

Key rotation scheduled for project end; the UF_HIDDEN root-cause hunt is a separate
task; the LinkedIn announcement and merge decision (PR #1 vs #2 order) are pending
Travis; bundle grew ~130 KB with react-aria-components (accepted, documented).

## Deliverables

1. `docs/AUDIT_2026-07-10.md`: findings ranked by severity, each with evidence and a
   verdict per area above, plus an overall PASS/FAIL recommendation for the merge.
2. A summary comment on PR #2 (gh is authenticated as Travis; posting under his
   account is authorized; note in the body that the audit was AI-executed).
3. Commit the report to the explore branch. Fix nothing without Travis's approval.

## Process requirements (Travis's standing rules)

Root cause before any proposed fix. Decisions surfaced, never silent. If you write
prose for Travis, his `~/.claude/skills/ghostwriter` skill governs voice (connected
sentences, no em dashes, no staccato). Conventional commits. When in doubt, ask him.
