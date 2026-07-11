"""JSONL audit trail: every external interaction in one append-only file.

FDA responses are logged as counts (public data, but bulky); AI prompts and
completions are logged verbatim — that verbatim trail is the governance
guarantee that lets a pharmacist reconstruct exactly what the model saw
and said.
"""

import json
from datetime import datetime, timezone
from pathlib import Path


class AuditLog:
    def __init__(self, run_dir: Path):
        run_dir.mkdir(parents=True, exist_ok=True)
        self.path = run_dir / "audit.jsonl"

    def event(self, kind: str, **fields) -> dict:
        rec = {"ts": datetime.now(timezone.utc).isoformat(), "kind": kind, **fields}
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, default=str) + "\n")
        return rec
