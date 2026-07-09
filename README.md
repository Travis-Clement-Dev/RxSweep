# RxSweep

Sweep your entire formulary against FDA recalls, drug shortages, and discontinued NDCs in one
command — with every AI decision cited, logged, and verifiable.

**Status: Day 1 core complete** — engine, CLI, cited HTML report, and governance pack
([SYSTEM_CARD](docs/SYSTEM_CARD.md) · [DATA_PROVENANCE](docs/DATA_PROVENANCE.md) ·
[GOVERNANCE](docs/GOVERNANCE.md)) are built and verified against live FDA data.
Web UI lands next. The design lives in [docs/DESIGN.md](docs/DESIGN.md).
This README will be rewritten before the v1 announcement.

```bash
# try it now (no AI key needed for deterministic mode)
git clone https://github.com/Travis-Clement-Dev/RxSweep.git && cd RxSweep
uv run rxsweep demo --no-ai
# with AI triage: put ANTHROPIC_API_KEY=sk-ant-... in .env first
uv run rxsweep demo
```
