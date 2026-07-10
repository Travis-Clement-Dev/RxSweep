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
          <button key={i} className="cit" onClick={() => onCite(n)} aria-label={`Jump to finding ${n}`}>
            [{n}]
          </button>
        );
      })}
    </>
  );
}

const SUGGESTED = ["What needs verification first?", "Which recalls have exact NDC matches?"];

export default function ChatPanel({
  sweepId,
  aiAvailable,
  summary,
  onCite,
}: {
  sweepId: string;
  aiAvailable: boolean;
  summary: string | null;
  onCite: (n: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  function scrollLog() {
    requestAnimationFrame(() =>
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }),
    );
  }

  function briefMe() {
    // The brief already exists (generated at sweep time, in the memo export):
    // surface it on demand, no API call, no cost.
    setMessages((m) => [
      ...m,
      { role: "user", content: "Brief me for the huddle" },
      {
        role: "assistant",
        content:
          summary ??
          "No brief is available for this run. AI was off during the sweep; the deterministic findings are in the register.",
      },
    ]);
    scrollLog();
  }

  async function ask(question: string) {
    if (!question.trim() || busy) return;
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
    scrollLog();
  }

  return (
    <aside className="chatdock" aria-label="Ask about this sweep">
      <h2>Ask about this sweep</h2>
      <p className="meta mt-0 mb-3 text-[12px]">
        Answers come only from this run's findings, with citations. AI-drafted; pharmacist
        verifies.
      </p>

      <button className="chatchip" onClick={briefMe}>
        Brief me for the huddle
      </button>
      {aiAvailable &&
        SUGGESTED.map((q) => (
          <button key={q} className="chatchip" onClick={() => void ask(q)} disabled={busy}>
            {q}
          </button>
        ))}

      {!aiAvailable && (
        <p className="noticebar warn text-[12px]" role="note">
          AI was off for this sweep. Live questions need an Anthropic API key on the server; the
          brief above still works if one was generated.
        </p>
      )}

      <div ref={logRef} className="my-2 flex max-h-[380px] flex-col gap-2 overflow-y-auto" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "user" : ""}`}>
            {m.role === "assistant" ? <Cited text={m.content} onCite={onCite} /> : m.content}
          </div>
        ))}
        {busy && <p className="faint m-0 text-[12px]">Thinking…</p>}
      </div>

      {notice && (
        <p className="m-0 mb-2 text-[12px]" style={{ color: "var(--moderate)" }} role="alert">
          {notice}
        </p>
      )}

      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about these findings"
          aria-label="Question about this sweep"
          disabled={!aiAvailable}
        />
        <button className="btn" disabled={busy || !aiAvailable || !input.trim()}>
          Ask
        </button>
      </form>
    </aside>
  );
}
