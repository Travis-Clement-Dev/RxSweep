import { useState } from "react";
import type { Finding } from "../api";

// Required actions (contract §6): the verb-led disposition queue. Extends
// report.py action_queue() — criticals plus exact-NDC highs, capped at 7 —
// with the AI-matched moderates the design's "Verify match" action covers
// (handoff README). Kept in citation order so [n] references stay stable.
export function buildQueue(findings: Finding[], cap = 7): Finding[] {
  return findings
    .filter(
      (f) =>
        f.severity === "critical" ||
        (f.severity === "high" && f.label === "exact_ndc") ||
        (f.severity === "moderate" && f.label === "ai_matched"),
    )
    .slice(0, cap);
}

export interface ActionRow {
  finding: Finding;
  lead: string; // bold verb phrase
  rest: string; // remainder of the sentence
  sevTag: string;
  tone: "critical" | "moderate"; // tag + left-rule color family
  verb: string; // action button label
  status: string;
  dot: "critical" | "moderate" | "faint";
}

// Sentence wording mirrors report.py _QUEUE_VERBS so the web queue reads the
// same as the server-rendered memo; the AI-matched row is the one addition.
export function actionRow(f: Finding): ActionRow {
  const ndc = f.item_ndc ? ` (${f.item_ndc})` : "";
  if (f.label === "ai_matched") {
    return {
      finding: f,
      lead: `Verify product identity for ${f.item_name}`,
      rest: `${ndc}; AI-matched to the FDA record, not yet verified.`,
      sevTag: "AI: verify",
      tone: "moderate",
      verb: "Verify match",
      status: "Needs verification",
      dot: "moderate",
    };
  }
  if (f.source === "recall") {
    const cls = f.record["classification"];
    return {
      finding: f,
      lead: `Verify lots for ${f.item_name}`,
      rest: `${ndc} against the recall record; quarantine affected stock.`,
      sevTag: cls ? `${String(cls)} recall` : "Recall",
      tone: f.severity === "moderate" ? "moderate" : "critical",
      verb: f.severity === "critical" ? "Quarantine" : "Review",
      status: f.severity === "critical" ? "Open · due today" : "Open",
      dot: f.severity === "critical" ? "critical" : "faint",
    };
  }
  if (f.source === "shortage") {
    return {
      finding: f,
      lead: `Confirm supply plan for ${f.item_name}`,
      rest: `${ndc}; active shortage match.`,
      sevTag: "Active shortage",
      tone: f.severity === "moderate" ? "moderate" : "critical",
      verb: "Escalate",
      status: "Open",
      dot: "faint",
    };
  }
  return {
    finding: f,
    lead: `Review NDC status for ${f.item_name}`,
    rest: `${ndc}; listing discontinued or missing.`,
    sevTag: "NDC status",
    tone: "moderate",
    verb: "Confirm",
    status: "Open",
    dot: "faint",
  };
}

export default function ActionQueue({
  findings,
  tiers,
  onOpen,
}: {
  findings: Finding[];
  tiers: Record<string, number>;
  onOpen: (f: Finding) => void;
}) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const rows = buildQueue(findings).map(actionRow);
  const headNote =
    findings.length === 0
      ? "(none)"
      : `(${tiers["critical"] ?? 0} critical · ${tiers["high"] ?? 0} high)`;

  function toggle(citation: number) {
    setDone((s) => {
      const next = new Set(s);
      if (next.has(citation)) next.delete(citation);
      else next.add(citation);
      return next;
    });
  }

  return (
    <>
      <h2 className="h-sect">
        Required actions <span className="n">{headNote}</span>
      </h2>
      {findings.length === 0 ? (
        <div className="statement">
          No disposition is required. This sweep returned no findings.
        </div>
      ) : rows.length === 0 ? (
        <div className="statement">
          No disposition is required. Review the findings register below.
        </div>
      ) : (
        <ol className="queue" aria-label="Required actions">
          {rows.map((r, i) => {
            const isDone = done.has(r.finding.citation);
            return (
              <li key={r.finding.citation} className={`qrow${isDone ? " done" : ""}`}>
                <span className="idx">{i + 1}.</span>
                <input
                  type="checkbox"
                  checked={isDone}
                  aria-label={`Mark action for ${r.finding.item_name} done`}
                  onChange={() => toggle(r.finding.citation)}
                />
                <span className="sentence">
                  <b>{r.lead}</b>
                  {r.rest}{" "}
                  <button className="fdaref" onClick={() => onOpen(r.finding)}>
                    [{r.finding.citation}] FDA record
                  </button>
                </span>
                <span className={`sevtag ${r.tone}`}>{r.sevTag}</span>
                <span className="actcol">
                  <button className="actbtn" onClick={() => onOpen(r.finding)}>
                    {r.verb}
                  </button>
                  <span className="qstatus">
                    <span className={`dot ${r.dot}`} />
                    {r.status}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
