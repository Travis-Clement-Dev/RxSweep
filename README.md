# RxSweep

Sweep your entire formulary against FDA recalls, drug shortages, and discontinued NDCs in one
command — with every AI decision cited, logged, and verifiable.

**Status: core + web app complete** — engine, CLI, cited HTML report, local web app
(upload → live progress → triage dashboard → verify drawer → grounded chat), and
governance pack ([SYSTEM_CARD](docs/SYSTEM_CARD.md) ·
[DATA_PROVENANCE](docs/DATA_PROVENANCE.md) · [GOVERNANCE](docs/GOVERNANCE.md)),
verified end to end against live FDA data. The design lives in
[docs/DESIGN.md](docs/DESIGN.md). This README will be rewritten before the v1
announcement.

```bash
# try it now (no AI key needed for deterministic mode)
git clone https://github.com/Travis-Clement-Dev/RxSweep.git && cd RxSweep
uv run rxsweep demo --no-ai

# the web app (frontend ships prebuilt; no Node needed)
uv run rxsweep serve   # then open http://127.0.0.1:8555

# with AI triage + chat: put ANTHROPIC_API_KEY=sk-ant-... in .env first
uv run rxsweep demo
```

Contributors changing the frontend: `cd web && npm install && npm run dev`
(dev server proxies `/api` to `rxsweep serve`); `npm run build` writes the
static bundle into the package.
