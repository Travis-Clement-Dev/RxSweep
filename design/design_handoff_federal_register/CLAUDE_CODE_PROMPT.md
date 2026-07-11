# Kickoff prompt for the implementing agent (Claude Code)

Commit this folder to the repo as `design/design_handoff_federal_register/` on branch
`explore/react-aria-styleguide`, then paste the prompt below into Claude Code from the
repo root.

---

Read `design/design_handoff_federal_register/README.md` and
`design/design_handoff_federal_register/RxSweep Design Contract.md` in full before writing
any code. They are the binding design spec for restyling `web/` (React 19 + Vite +
Tailwind v4). The contract SUPERSEDES `design/styleguide/` and `design/comps/` — the teal
accent is retired; use the navy token family in
`design/design_handoff_federal_register/theme.tokens.css`.

Task order:
1. Replace the token blocks in `web/src/theme.css` with `theme.tokens.css` from the handoff
   folder (keep the Tailwind import and any non-token rules that still apply; retire
   teal-era rules as each component migrates).
2. Implement the masthead and the nested floating-layer shell in `App.tsx` per the README
   "Shell architecture" section, including the icon theme toggle
   (`data-theme` on `<html>` + `localStorage["rxsweep-theme"]`).
3. Migrate screens in order: `screens/Upload.tsx` (document-receipt attachment with
   Replace/Remove, drag-over affect, invalid-CSV error) → `screens/Progress.tsx` →
   `screens/Dashboard.tsx` (+ `components/FindingsTable.tsx`) →
   `components/FindingDrawer.tsx` → new `components/AssistantPanel.tsx` (retire
   `ChatPanel.tsx` and `Tiles.tsx`) → new Memo view.
4. Wire real data through `src/api.ts`. The "Prepare the executive briefing" chip reveals
   `result.summary` with NO API call; chat goes through `sendChat` and shows the usage
   meter from its response.
5. Honor every state in the README acceptance checklist: zero findings,
   `unchecked.length > 0`, `ai_available === false`, invalid CSV, the sub-1100px overlay
   panel, `prefers-reduced-motion`, and the letter-format print memo.

Rules: no em dashes in UI copy; severity renders typographically (never filled pills at
scale); exactly one accent family; square document language inside the canvas; motion per
contract §8; WCAG 2.1 AA.

Acceptance: open
`design/design_handoff_federal_register/prototype/RxSweep - Federal Register v5.dc.html`
in a browser and match it in both themes, state by state (screenshots/ has quick
references). Do NOT implement the "Prototype scenarios · design review" footnote — it is
design-review chrome.

Work in small commits per screen. When in doubt, the contract wins.
