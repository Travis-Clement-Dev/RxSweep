import { useState } from "react";
import type { Finding } from "../api";

// Mirrors report.py action_queue(): criticals plus exact-NDC highs, capped.
const VERBS: Record<Finding["source"], (f: Finding) => string> = {
  recall: (f) =>
    `Verify lots for ${f.item_name}${f.item_ndc ? ` (${f.item_ndc})` : ""} against the recall record; quarantine affected stock.`,
  shortage: (f) =>
    `Confirm supply plan for ${f.item_name}${f.item_ndc ? ` (${f.item_ndc})` : ""}; active shortage match.`,
  ndc: (f) =>
    `Review NDC status for ${f.item_name}${f.item_ndc ? ` (${f.item_ndc})` : ""}; listing discontinued or missing.`,
};

export function buildQueue(findings: Finding[], cap = 7): Finding[] {
  return findings
    .filter((f) => f.severity === "critical" || (f.severity === "high" && f.label === "exact_ndc"))
    .slice(0, cap);
}

export default function ActionQueue({
  findings,
  onOpen,
}: {
  findings: Finding[];
  onOpen: (f: Finding) => void;
}) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const queue = buildQueue(findings);
  if (queue.length === 0) return null;

  return (
    <>
      <h2 className="sect">Required actions ({queue.length})</h2>
      <div className="queue" role="list" aria-label="Required actions">
        {queue.map((f) => {
          const tag =
            f.source === "recall"
              ? String(f.record["classification"] ?? "Recall")
              : f.source === "shortage"
                ? "Active shortage"
                : "NDC status";
          const isDone = done.has(f.citation);
          return (
            <div key={f.citation} role="listitem" className={`qrow ${isDone ? "done" : ""}`}>
              <input
                type="checkbox"
                checked={isDone}
                aria-label={`Mark action for ${f.item_name} done`}
                onChange={() =>
                  setDone((s) => {
                    const next = new Set(s);
                    if (next.has(f.citation)) next.delete(f.citation);
                    else next.add(f.citation);
                    return next;
                  })
                }
              />
              <span className="qact">
                <button onClick={() => onOpen(f)}>{VERBS[f.source](f)}</button>
              </span>
              <span className="qmeta">
                <span className={`svt ${f.severity}`}>{tag}</span>
              </span>
              <span className="qmeta">[{f.citation}]</span>
            </div>
          );
        })}
      </div>
    </>
  );
}
