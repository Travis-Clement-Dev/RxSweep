# RxSweep — agent guide

RxSweep sweeps a formulary CSV against FDA recalls, drug shortages, and NDC-directory
status; severity-ranked, cited, audit-logged, pharmacist-verified. Local, single-user
(`rxsweep serve`, 127.0.0.1:8555). Governance artifacts are product features here, not
paperwork: if your change makes a doc wrong, the change is not done.

## Design authority chain

- `design/design_handoff_federal_register/` is the **binding design spec**: the contract,
  the implementation README, the navy token drop-in, and the v5 HTML prototype as the
  acceptance reference. It **supersedes** `design/styleguide/` and `design/comps/`
  (teal era). Recorded as D10 in docs/DECISIONS.md. The dispositions addendum at
  `design/design_handoff_dispositions/` (contract v1.3, v6 prototype) governs the
  recorded-disposition workflow (D11). When in doubt, the contract wins.
- UI copy register: FDA drug-safety-communication voice. Short declarative sentences.
  **No em dashes in UI copy.** The scope banner and the openFDA disclaimer travel with
  every surface and artifact.

## Keep the documentation true (part of every change)

Stale docs are defects in this repo. Before you call a change done:

- A decision with lasting consequences gets an ADR in `docs/DECISIONS.md`
  (template at the bottom of the file: date, Context, Options, Decision, Rationale, Status).
- A milestone or notable working session gets a dated entry in `docs/JOURNAL.md`.
- Behavior, UI, or AI-job changes: re-check `README.md`, `docs/SYSTEM_CARD.md`,
  `docs/DATA_PROVENANCE.md`, `docs/GOVERNANCE.md` for claims you just invalidated.
- Frontend changes: rebuild the packaged bundle (`cd web && npm run build`; output is
  committed at `src/rxsweep/webapp/static/` so the wheel ships the app).
- Update the open PR (comment or description) with what changed, why, and any
  deliberate deviations, so the next agent pulling the branch is not guessing.

## Working in the repo

- Python via uv. Tests: `PYTHONPATH=src .venv/bin/python3 -m pytest -q` (80 passing).
  Machine gotcha: hidden `.pth` files can break the venv on this Mac; if
  `import rxsweep` fails, run `uv sync --reinstall-package rxsweep` (durable fix:
  `chflags -R nohidden .venv`).
- Backend dev server: the `rxsweep` config in the parent workspace
  `.claude/launch.json` (port 8555, loads `.env`). Frontend dev: `cd web && npm run dev`
  (vite on 5173, proxies `/api` to 8555). The Claude Code preview runner cannot spawn
  node servers in this workspace; use a plain background shell for vite.
- Frontend stack: React 19 + Vite + Tailwind v4 + React Aria Components. RAC caches
  collection rows: any Row prop that reads external state must be declared via
  `dependencies` on TableBody (see FindingsTable.tsx; this bug shipped twice).
- Secrets: `ANTHROPIC_API_KEY` lives in `rxsweep/.env`, gitignored. Never commit
  secrets, never print the key. openFDA needs no key.

## Verification bar

Browser-verify UI changes against the v5 prototype in both themes before claiming done;
run the pytest suite; conventional commits, one logical change each (per-screen for UI).
