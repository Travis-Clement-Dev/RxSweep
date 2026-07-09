import { useRef, useState } from "react";
import { sendChat } from "../api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function Cited({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (!m) return <span key={i}>{part}</span>;
        const n = Number(m[1]);
        return (
          <button
            key={i}
            onClick={() => onCite(n)}
            className="mono"
            style={{
              color: "var(--accent-ink)",
              background: "var(--accent-soft)",
              border: "none",
              borderRadius: 6,
              padding: "0 4px",
              cursor: "pointer",
            }}
            aria-label={`Jump to finding ${n}`}
          >
            [{n}]
          </button>
        );
      })}
    </>
  );
}

export default function ChatPanel({
  sweepId,
  aiAvailable,
  onCite,
}: {
  sweepId: string;
  aiAvailable: boolean;
  onCite: (n: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  async function ask() {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    const history = messages;
    setMessages((m) => [...m, { role: "user", content: question }]);
    const resp = await sendChat(sweepId, question, history);
    if (resp.ok) {
      setMessages((m) => [...m, { role: "assistant", content: resp.reply }]);
    } else {
      setNotice(resp.detail);
      setMessages((m) => m.slice(0, -1));
      setInput(question);
    }
    setBusy(false);
    requestAnimationFrame(() =>
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }),
    );
  }

  return (
    <aside className="card flex h-fit flex-col p-4 xl:sticky xl:top-4" aria-label="Ask about this sweep">
      <h2 className="m-0 text-base font-semibold">Ask about this sweep</h2>
      <p className="meta mt-1 text-[0.8rem]">
        Answers come only from this run's findings, with citations. AI-drafted:
        verify against sources.
      </p>

      {!aiAvailable && (
        <p className="banner text-[0.82rem]" role="note">
          AI was off for this sweep. Chat needs an Anthropic API key on the server.
        </p>
      )}

      <div
        ref={logRef}
        className="my-3 flex max-h-[380px] min-h-[120px] flex-col gap-3 overflow-y-auto"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <p className="faint m-0 text-[0.85rem]">
            Try: "Which items have Class I recalls?" or "What needs verification first?"
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className="rounded-xl px-3 py-2 text-[0.88rem]"
            style={
              m.role === "user"
                ? { background: "var(--accent-soft)", color: "var(--accent-ink)", alignSelf: "flex-end", maxWidth: "90%" }
                : { background: "var(--paper)", border: "1px solid var(--line)", maxWidth: "95%" }
            }
          >
            {m.role === "assistant" ? <Cited text={m.content} onCite={onCite} /> : m.content}
          </div>
        ))}
        {busy && <p className="faint m-0 text-[0.85rem]">Thinking…</p>}
      </div>

      {notice && (
        <p className="m-0 mb-2 text-[0.8rem]" style={{ color: "var(--moderate)" }} role="alert">
          {notice}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about these findings"
          aria-label="Question about this sweep"
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
        />
        <button className="btn" disabled={busy || !input.trim()}>
          Ask
        </button>
      </form>
    </aside>
  );
}
