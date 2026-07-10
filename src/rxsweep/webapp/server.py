"""Local web server: background sweeps with live progress, results, chat.

Sweeps run in a thread; the UI polls progress derived from the same audit
events that land in the run's JSONL log. The server binds localhost by
default and stores runs exactly where the CLI does.
"""

import os
import shutil
import tempfile
import threading
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from rxsweep.audit import AuditLog
from rxsweep.chat import chat_reply
from rxsweep.pipeline import SweepResult, run_sweep


class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []

STATIC_DIR = Path(__file__).parent / "static"


@dataclass
class _RunState:
    status: str = "running"  # running | done | error
    phase: str = "starting"
    items: int = 0
    fda_requests: int = 0
    ai_calls: int = 0
    error: str | None = None
    result: SweepResult | None = None
    lock: threading.Lock = field(default_factory=threading.Lock)

    def progress(self) -> dict:
        return {
            "status": self.status,
            "phase": self.phase,
            "items": self.items,
            "fda_requests": self.fda_requests,
            "ai_calls": self.ai_calls,
            "error": self.error,
        }


_PHASES = {
    "run_start": "starting",
    "ingest": "reading formulary",
    "fda_request": "querying FDA sources",
    "match": "matching items",
    "ai_request": "AI triage",
    "run_end": "finishing",
}


def create_app(runs_root: Path = Path("runs")) -> FastAPI:
    app = FastAPI(title="RxSweep", docs_url=None, redoc_url=None)
    runs: dict[str, _RunState] = {}

    def _on_event(state: _RunState, event: dict) -> None:
        with state.lock:
            kind = event.get("kind", "")
            if kind in _PHASES:
                state.phase = _PHASES[kind]
            if kind == "ingest":
                state.items = event.get("items", 0)
            elif kind == "fda_request":
                state.fda_requests += 1
            elif kind == "ai_request":
                state.ai_calls += 1

    def _execute(state: _RunState, csv_path: Path, months_back: int, use_ai: bool) -> None:
        try:
            result = run_sweep(
                csv_path,
                runs_root,
                months_back=months_back,
                use_ai=use_ai,
                on_progress=lambda e: _on_event(state, e),
            )
            with state.lock:
                state.result = result
                state.status = "done"
        except Exception as exc:  # noqa: BLE001 - surfaced to the client, never a 500
            with state.lock:
                state.error = str(exc)
                state.status = "error"
        finally:
            csv_path.unlink(missing_ok=True)

    @app.post("/api/sweeps", status_code=202)
    async def start_sweep(
        file: UploadFile,
        months_back: int = 24,
        use_ai: bool = True,
    ) -> dict:
        sweep_id = uuid.uuid4().hex[:12]
        # keep the uploaded filename: it appears in the report and audit log
        safe_name = Path(file.filename or "formulary.csv").name
        tmp = Path(tempfile.mkdtemp(prefix="rxsweep-")) / safe_name
        with open(tmp, "wb") as out:
            shutil.copyfileobj(file.file, out)
        state = _RunState()
        runs[sweep_id] = state
        threading.Thread(
            target=_execute, args=(state, tmp, months_back, use_ai), daemon=True
        ).start()
        return {"sweep_id": sweep_id}

    def _get(sweep_id: str) -> _RunState:
        state = runs.get(sweep_id)
        if state is None:
            raise HTTPException(status_code=404, detail="unknown sweep id")
        return state

    @app.get("/api/sweeps/{sweep_id}")
    async def sweep_status(sweep_id: str) -> dict:
        state = _get(sweep_id)
        with state.lock:
            payload = state.progress()
            if state.status == "done" and state.result is not None:
                payload["result"] = jsonable_encoder(state.result.model_dump())
        return payload

    @app.get("/api/sweeps/{sweep_id}/report")
    async def sweep_report(sweep_id: str) -> FileResponse:
        state = _get(sweep_id)
        with state.lock:
            if state.status != "done" or state.result is None:
                raise HTTPException(status_code=409, detail="sweep not finished")
            path = state.result.report_path
        return FileResponse(path, media_type="text/html")

    _EXPORTS = {
        "csv": ("findings.csv", "text/csv"),
        "xlsx": (
            "findings.xlsx",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
        "md": ("findings.md", "text/markdown"),
    }

    @app.get("/api/sweeps/{sweep_id}/export/{fmt}")
    async def sweep_export(sweep_id: str, fmt: str) -> FileResponse:
        if fmt not in _EXPORTS:
            raise HTTPException(status_code=404, detail=f"unknown export format {fmt!r}")
        state = _get(sweep_id)
        with state.lock:
            if state.status != "done" or state.result is None:
                raise HTTPException(status_code=409, detail="sweep not finished")
            run_dir = state.result.run_dir
        name, media = _EXPORTS[fmt]
        return FileResponse(run_dir / name, media_type=media, filename=name)

    @app.post("/api/sweeps/{sweep_id}/chat")
    async def sweep_chat(sweep_id: str, req: ChatRequest) -> dict:
        state = _get(sweep_id)
        with state.lock:
            if state.status != "done" or state.result is None:
                raise HTTPException(status_code=409, detail="sweep not finished")
            result = state.result
        if not os.environ.get("ANTHROPIC_API_KEY"):
            raise HTTPException(
                status_code=503,
                detail="Chat needs an Anthropic API key. Set ANTHROPIC_API_KEY in .env and restart.",
            )
        audit = AuditLog(result.run_dir)
        cr = chat_reply(result.findings, req.history, req.question, audit)
        from rxsweep.pricing import estimate_cost

        return {
            "reply": cr.reply,
            "usage": {
                "model": cr.model,
                "input_tokens": cr.input_tokens,
                "output_tokens": cr.output_tokens,
                "est_cost_usd": estimate_cost(cr.model, cr.input_tokens, cr.output_tokens),
            },
        }

    app.state.runs = runs  # exposed for the chat endpoint and tests

    if STATIC_DIR.is_dir():
        app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
    else:

        @app.get("/", response_class=HTMLResponse)
        async def placeholder() -> str:
            return (
                "<h1>RxSweep API is running.</h1>"
                "<p>The web frontend is not built in this install. "
                "Use <code>rxsweep check</code> for reports, or build the "
                "frontend (see README).</p>"
            )

    return app
