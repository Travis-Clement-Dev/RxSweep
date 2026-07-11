import { useRef, useState } from "react";
import { sendChat, type SweepResultData } from "../api";
import { fmtRunTs } from "../format";

// Right-docked assistant panel (contract D6, shell rounds 6-7): a floating
// card with a band header whose icons switch between the Assistant transcript
// and the Run record (docket, usage, export manifest). Collapses to a 44px
// icon rail; below 1100px it overlays the canvas with a scrim instead of
// reserving width. Dashboard phase only; chat is grounded in a finished run.

interface Message {
  role: "user" | "assistant";
  content: string;
  meter?: string;
  billed?: boolean;
}

const SUGGESTIONS = [
  "Which recalls have exact NDC matches?",
  "What needs verification first?",
  "Which shortages have no alternative?",
  "Draft a memo for the critical findings",
];

export const PANEL_MIN = 280;
export const PANEL_MAX = 560;

function Cited({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^\[(\d+)\]$/.exec(part);
        if (!m) return <span key={i}>{part}</span>;
        const n = Number(m[1]);
        return (
          <button key={i} className="cit" onClick={() => onCite(n)} aria-label={`Jump to finding ${n}`}>
            [{n}]
          </button>
        );
      })}
    </>
  );
}

export default function AssistantPanel({
  sweepId,
  result,
  aiCalls,
  open,
  width,
  overlay,
  onOpenChange,
  onWidthChange,
  onCite,
  onOpenMemo,
}: {
  sweepId: string;
  result: SweepResultData;
  aiCalls: number;
  open: boolean;
  width: number;
  overlay: boolean;
  onOpenChange: (open: boolean) => void;
  onWidthChange: (w: number) => void;
  onCite: (n: number) => void;
  onOpenMemo: () => void;
}) {
  const [mode, setMode] = useState<"chat" | "record">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [chatUsage, setChatUsage] = useState({ calls: 0, in: 0, out: 0, cost: 0, costKnown: true });
  const logRef = useRef<HTMLDivElement>(null);

  const meta = result.meta;
  const aiOff = !meta.ai_available;

  function push(msg: Message) {
    setMessages((m) => [...m, msg]);
    // Instant scroll: smooth scrolling violates reduced-motion (contract §8).
    requestAnimationFrame(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    });
  }

  function briefMe() {
    // result.summary was drafted by summarize() during the sweep: revealing
    // it costs nothing and makes no API call (contract D5).
    push({
      role: "assistant",
      content:
        result.summary ??
        "No briefing is available for this run. AI was off during the sweep; the deterministic findings are in the register.",
      meter: `Drafted during the sweep by ${meta.model} · no additional API call`,
      billed: false,
    });
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy || aiOff) return;
    setInput("");
    setNotice(null);
    setBusy(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    push({ role: "user", content: q });
    const resp = await sendChat(sweepId, q, history);
    if (resp.ok) {
      const u = resp.usage;
      const cost = u.est_cost_usd != null ? ` · ~$${u.est_cost_usd.toFixed(4)}` : " · cost unknown";
      push({
        role: "assistant",
        content: resp.reply,
        meter: `${u.model} · ${u.input_tokens.toLocaleString()} in / ${u.output_tokens.toLocaleString()} out tokens${cost}`,
        billed: true,
      });
      setChatUsage((t) => ({
        calls: t.calls + 1,
        in: t.in + u.input_tokens,
        out: t.out + u.output_tokens,
        cost: t.cost + (u.est_cost_usd ?? 0),
        costKnown: t.costKnown && u.est_cost_usd !== null,
      }));
    } else {
      setNotice(resp.detail);
      setMessages((m) => m.slice(0, -1));
      setInput(q);
    }
    setBusy(false);
  }

  function seamDown(e: React.MouseEvent) {
    if (!open) return;
    e.preventDefault();
    setDragging(true);
    const move = (ev: MouseEvent) => {
      onWidthChange(Math.max(PANEL_MIN, Math.min(PANEL_MAX, window.innerWidth - ev.clientX - 10)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setDragging(false);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  function seamKey(e: React.KeyboardEvent) {
    // Keyboard alternative to the drag (WCAG): arrows resize in 16px steps.
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const delta = e.key === "ArrowLeft" ? 16 : -16;
      onWidthChange(Math.max(PANEL_MIN, Math.min(PANEL_MAX, width + delta)));
    }
  }

  // Sweep usage plus anything asked in this session (record view totals).
  const totalIn = (meta.ai_usage?.input_tokens ?? 0) + chatUsage.in;
  const totalOut = (meta.ai_usage?.output_tokens ?? 0) + chatUsage.out;
  const sweepCost = meta.ai_usage?.est_cost_usd ?? null;
  const totalCost = sweepCost !== null && chatUsage.costKnown ? sweepCost + chatUsage.cost : null;
  const runKv: [string, string][] = [
    ["File", meta.csv_name],
    ["Items checked", String(meta.items_checked)],
    ["Recall window", `${meta.months_back} months`],
    ["Run id", result.run_id],
    ["Started", fmtRunTs(meta.run_ts)],
  ];
  const modelKv: [string, string][] = aiOff
    ? [
        ["Model", "off · deterministic"],
        ["AI calls", "0"],
        ["Tokens", "0"],
        ["Est. cost", "$0.00"],
      ]
    : [
        ["Model", meta.model],
        ["AI calls", String(aiCalls + chatUsage.calls)],
        ["Tokens", `${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out`],
        ["Est. cost", totalCost !== null ? `~$${totalCost.toFixed(4)}` : "cost unknown"],
      ];
  const exports: { file: string; desc: string; href?: string }[] = [
    { file: "findings.csv", desc: "Flat register for spreadsheets and imports.", href: `/api/sweeps/${sweepId}/export/csv` },
    { file: "findings.xlsx", desc: "Severity-tinted workbook with frozen header and autofilter.", href: `/api/sweeps/${sweepId}/export/xlsx` },
    { file: "findings.md", desc: "Markdown interchange for your AI tools.", href: `/api/sweeps/${sweepId}/export/md` },
    { file: "memo.html", desc: "Institutional memorandum; prints to letter PDF." },
    { file: "audit.jsonl", desc: "Verbatim log of every request, prompt, and completion." },
  ];

  const showChips = messages.length === 0 && !aiOff;

  // Overlay mode: closed means gone entirely; the masthead icon reopens it.
  if (overlay && !open) return null;

  return (
    <>
      {!overlay && (
        <div
          className="seam"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize assistant panel"
          aria-valuenow={width}
          aria-valuemin={PANEL_MIN}
          aria-valuemax={PANEL_MAX}
          tabIndex={open ? 0 : -1}
          style={{ right: (open ? width : 44) + 10 }}
          onMouseDown={seamDown}
          onKeyDown={seamKey}
        >
          <span className="grip" />
        </div>
      )}
      {overlay && open && <div className="panel-scrim" onClick={() => onOpenChange(false)} />}

      <div
        className={`apanel${dragging ? " dragging" : ""}${overlay ? " over" : ""}`}
        style={{ width: open ? width : 44 }}
        aria-label={mode === "chat" ? "Sweep assistant" : "Run record"}
      >
        {open ? (
          <>
            <div className="bandhead">
              <span className="title">{mode === "chat" ? "Sweep assistant" : "Run record"}</span>
              <span className="icons">
                <button
                  className="pico"
                  aria-label="Assistant"
                  title="Assistant"
                  aria-pressed={mode === "chat"}
                  onClick={() => setMode("chat")}
                >
                  <span className="glyph-chat" />
                </button>
                <button
                  className="pico"
                  aria-label="Run record"
                  title="Run record"
                  aria-pressed={mode === "record"}
                  onClick={() => setMode("record")}
                >
                  ⚙
                </button>
                <span className="divider" />
                <button
                  className="pico plain"
                  aria-label="Collapse panel"
                  title="Collapse panel"
                  onClick={() => onOpenChange(false)}
                >
                  ›
                </button>
              </span>
            </div>

            {mode === "chat" ? (
              <>
                <div className="govline">
                  Answers come only from this run's findings, with citations. A pharmacist
                  verifies.
                </div>
                {aiOff && (
                  <div className="ainotice" role="note">
                    AI was off for this sweep. The assistant needs an Anthropic API key on the
                    server. Findings, the register, and exports remain fully usable.
                  </div>
                )}
                <div className="translog" ref={logRef} aria-live="polite">
                  {showChips && (
                    <>
                      <button className="chip-brief" onClick={briefMe}>
                        Prepare the executive briefing
                      </button>
                      {SUGGESTIONS.map((s) => (
                        <button key={s} className="chip-suggest" onClick={() => void ask(s)}>
                          {s}
                        </button>
                      ))}
                    </>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`bubble-wrap ${m.role}`}>
                      <div className="bubble">
                        {m.role === "assistant" ? <Cited text={m.content} onCite={onCite} /> : m.content}
                      </div>
                      {m.meter && (
                        <div className="meterline">
                          {m.meter}
                          {m.billed && (
                            <>
                              <br />
                              Billed to your own API key. Logged in audit.jsonl.
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {busy && <div className="meterline">…</div>}
                  {notice && (
                    <div className="ainotice" role="alert" style={{ margin: 0 }}>
                      {notice}
                    </div>
                  )}
                </div>
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ask(input);
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={aiOff}
                    placeholder={aiOff ? "AI is off for this sweep" : "Ask about these findings"}
                    aria-label="Ask about these findings"
                  />
                  <div className="util">
                    <span className="modelid">{meta.model}</span>
                    <button className="askbtn" disabled={aiOff || busy || !input.trim()}>
                      Ask
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="record">
                <div className="rh">Run</div>
                {runKv.map(([k, v]) => (
                  <div className="kv" key={k}>
                    <span>{k}</span>
                    <span className="v">{v}</span>
                  </div>
                ))}
                <div className="rh">Model usage</div>
                {modelKv.map(([k, v]) => (
                  <div className="kv" key={k}>
                    <span>{k}</span>
                    <span className="v">{v}</span>
                  </div>
                ))}
                <div className="note">
                  Billed to your own API key. Every prompt and completion is logged verbatim.
                </div>
                <div className="rh">Exports</div>
                {exports.map((x) => (
                  <div className="export" key={x.file}>
                    {x.file === "memo.html" ? (
                      <button className="aslink" onClick={onOpenMemo}>
                        {x.file}
                      </button>
                    ) : x.href ? (
                      <a href={x.href}>{x.file}</a>
                    ) : (
                      <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                        {x.file}
                      </span>
                    )}
                    <div className="desc">{x.desc}</div>
                  </div>
                ))}
                <div className="note" style={{ marginTop: 14 }}>
                  Full audit trail for this run:{" "}
                  <span className="mono">{meta.audit_path}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="railhead">
              <button
                className="pico plain"
                aria-label="Expand panel"
                title="Expand panel"
                onClick={() => onOpenChange(true)}
              >
                ‹
              </button>
            </div>
            <div className="railstack">
              <button
                className="pico"
                aria-label="Assistant"
                title="Assistant"
                onClick={() => {
                  setMode("chat");
                  onOpenChange(true);
                }}
              >
                <span className="glyph-chat" />
              </button>
              <button
                className="pico"
                aria-label="Run record"
                title="Run record"
                onClick={() => {
                  setMode("record");
                  onOpenChange(true);
                }}
              >
                ⚙
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
