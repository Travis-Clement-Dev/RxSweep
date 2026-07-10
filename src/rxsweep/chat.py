"""Run-grounded chat: questions answered only from this sweep's findings.

Same governance guarantees as the rest of the AI layer: prompts and replies
are audit-logged verbatim, citations are mandatory, scope is bounded, and
failure degrades to a plain unavailable message instead of an error page.
"""

from pydantic import BaseModel

from rxsweep.audit import AuditLog
from rxsweep.triage import _AI_ERRORS, Anthropic, Finding, _model, usage_tokens

UNAVAILABLE = (
    "The AI assistant is unavailable right now. The findings table and the "
    "FDA source links remain fully usable."
)


class ChatResult(BaseModel):
    reply: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0

_SYSTEM = (
    "You are a pharmacy informatics assistant discussing the results of one "
    "formulary sweep with a pharmacist. Answer ONLY from the numbered "
    "findings provided. Every drug you mention must carry its [n] citation. "
    "If a question goes beyond these findings, say the sweep does not cover "
    "it and suggest checking primary sources. Write in the plain regulatory "
    "register of an FDA drug safety communication: short declarative "
    "sentences, active voice. Plain text only. No markdown. No em dashes. "
    "You provide information for pharmacist verification, never clinical "
    "advice."
)


def _context(findings: list[Finding]) -> str:
    lines = [
        f"[{f.citation}] {f.item_name} (NDC {f.item_ndc or 'n/a'}), {f.source}, "
        f"{f.severity}, match={f.label}: {f.severity_rationale}"
        for f in findings
    ]
    return "Sweep findings:\n" + "\n".join(lines)


def chat_reply(
    findings: list[Finding],
    history: list[dict],
    question: str,
    audit: AuditLog,
    model: str | None = None,
) -> ChatResult:
    client = Anthropic()
    model = model or _model()
    messages = [
        {"role": "user", "content": _context(findings)},
        {"role": "assistant", "content": "Understood. I will answer only from these findings, with citations."},
        *[{"role": m["role"], "content": m["content"]} for m in history],
        {"role": "user", "content": question},
    ]
    audit.event(kind="ai_request", stage="chat", model=model, prompt=question)
    try:
        response = client.messages.create(
            model=model,
            max_tokens=1024,
            system=_SYSTEM,
            messages=messages,
        )
    except _AI_ERRORS as exc:
        audit.event(kind="ai_unavailable", stage="chat", error=str(exc))
        return ChatResult(reply=UNAVAILABLE, model=model)
    text = "".join(block.text for block in response.content if block.type == "text")
    in_tok, out_tok = usage_tokens(response)
    audit.event(
        kind="ai_response", stage="chat", model=model, completion=text,
        input_tokens=in_tok, output_tokens=out_tok,
    )
    return ChatResult(reply=text, model=model, input_tokens=in_tok, output_tokens=out_tok)
