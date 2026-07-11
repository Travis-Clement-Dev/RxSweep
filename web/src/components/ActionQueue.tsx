import { useEffect, useRef, useState } from "react";
import { postDisposition, type Disposition, type Finding } from "../api";
import { fmtHM } from "../format";

// Required actions (contract §6 + v1.3 D11): the verb-led disposition queue.
// Every critical, exact-NDC high, and AI-matched moderate, citation order,
// uncapped. The verb button RECORDS the disposition (append-only audit
// events; Undo writes a reversal). Wording mirrors report.py action_queue()
// so the served memo and the app read the same.
export function buildQueue(findings: Finding[]): Finding[] {
  return findings.filter(
    (f) =>
      f.severity === "critical" ||
      (f.severity === "high" && f.label === "exact_ndc") ||
      (f.severity === "moderate" && f.label === "ai_matched"),
  );
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

const VERB_ACTION: Record<string, Disposition["action"]> = {
  Quarantine: "quarantined",
  Review: "reviewed",
  Escalate: "escalated",
  Confirm: "confirmed",
};

export const DISP_LABEL: Record<Disposition["action"], string> = {
  quarantined: "Quarantined",
  reviewed: "Reviewed",
  escalated: "Escalated",
  confirmed: "Confirmed",
  verified: "Match verified",
  dismissed: "Not a match",
  reopened: "Reopened",
};

// The inline strip opens only when input is needed: the verification outcome
// on AI rows, initials on the session's first disposition, a reason on
// dismissals. Otherwise the verb records in one click.
interface Strip {
  citation: number;
  mode: "outcome" | "fields";
  dismiss: boolean;
  ai: boolean;
  verb: string;
  reason: string;
  initials: string;
  error: string | null;
  // Set when the strip exists to complete a known action (an undo needing
  // initials, or a failed one-click record offered for retry).
  retryAction: Disposition["action"] | null;
}

export default function ActionQueue({
  findings,
  tiers,
  onOpen,
  sweepId,
  reduced,
  operator,
  onOperatorChange,
  onDisposition,
}: {
  findings: Finding[];
  tiers: Record<string, number>;
  onOpen: (f: Finding) => void;
  sweepId: string;
  reduced: Map<number, Disposition>;
  operator: string;
  onOperatorChange: (op: string) => void;
  onDisposition: (e: Disposition) => void;
}) {
  const [strip, setStrip] = useState<Strip | null>(null);
  const [busy, setBusy] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const focusUndo = useRef<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const rows = buildQueue(findings).map(actionRow);
  const headNote =
    findings.length === 0
      ? "(none)"
      : `(${tiers["critical"] ?? 0} critical · ${tiers["high"] ?? 0} high)`;

  // Focus follows the workflow: into the strip when it opens, onto the new
  // record's Undo after recording (handoff README a11y).
  const stripCitation = strip?.citation ?? null;
  const stripMode = strip?.mode ?? null;
  useEffect(() => {
    if (stripCitation !== null && stripRef.current) {
      const el = stripRef.current.querySelector<HTMLElement>("input, button");
      el?.focus();
    }
  }, [stripCitation, stripMode]);
  useEffect(() => {
    if (focusUndo.current !== null) {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-undo="${focusUndo.current}"]`)
        ?.focus();
      focusUndo.current = null;
    }
  });

  async function record(citation: number, action: Disposition["action"], note?: string) {
    const initials = (strip?.initials.trim() || operator).toUpperCase();
    setBusy(true);
    try {
      const event = await postDisposition(sweepId, { citation, action, operator: initials, note });
      onDisposition(event);
      if (!operator) onOperatorChange(event.operator);
      setStrip(null);
      if (action !== "reopened") focusUndo.current = citation;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "The disposition could not be recorded.";
      setStrip((s) =>
        s && s.citation === citation
          ? { ...s, error: detail }
          : {
              citation,
              mode: "fields",
              dismiss: false,
              ai: false,
              verb: "",
              reason: "",
              initials: "",
              error: detail,
              retryAction: action,
            },
      );
    } finally {
      setBusy(false);
    }
  }

  function startDisposition(r: ActionRow) {
    const citation = r.finding.citation;
    if (r.verb === "Verify match") {
      setStrip({ citation, mode: "outcome", dismiss: false, ai: true, verb: r.verb, reason: "", initials: "", error: null, retryAction: null });
      return;
    }
    if (!operator) {
      setStrip({ citation, mode: "fields", dismiss: false, ai: false, verb: r.verb, reason: "", initials: "", error: null, retryAction: null });
      return;
    }
    void record(citation, VERB_ACTION[r.verb] ?? "confirmed");
  }

  function chooseConfirm(citation: number) {
    if (!operator) {
      setStrip({ citation, mode: "fields", dismiss: false, ai: true, verb: "Confirm match", reason: "", initials: "", error: null, retryAction: null });
      return;
    }
    void record(citation, "verified");
  }

  function chooseNotMatch(citation: number) {
    setStrip({ citation, mode: "fields", dismiss: true, ai: true, verb: "Not a match", reason: "", initials: "", error: null, retryAction: null });
  }

  function recordFromStrip() {
    if (!strip) return;
    if (!operator && strip.initials.trim().length < 2) return;
    if (strip.dismiss && !strip.reason.trim()) return;
    if (strip.retryAction) void record(strip.citation, strip.retryAction, strip.reason.trim() || undefined);
    else if (strip.dismiss) void record(strip.citation, "dismissed", strip.reason.trim());
    else if (strip.ai) void record(strip.citation, "verified");
    else void record(strip.citation, VERB_ACTION[strip.verb] ?? "confirmed");
  }

  function undo(citation: number) {
    if (!operator) {
      // Recorded rows can arrive without a session operator (seeded from the
      // server); a reversal still needs a signature.
      setStrip({ citation, mode: "fields", dismiss: false, ai: false, verb: "Undo", reason: "", initials: "", error: null, retryAction: "reopened" });
      return;
    }
    void record(citation, "reopened");
  }

  const recordDisabled =
    busy ||
    (strip !== null &&
      ((!operator && strip.initials.trim().length < 2) ||
        (strip.dismiss && !strip.reason.trim())));

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
        <ol className="queue" aria-label="Required actions" ref={listRef}>
          {rows.map((r, i) => {
            const citation = r.finding.citation;
            const disp = reduced.get(citation);
            const done = disp !== undefined && disp.action !== "reopened";
            const stripOpen = strip !== null && strip.citation === citation && !done;
            const recordLabel = !strip
              ? ""
              : strip.retryAction === "reopened"
                ? "Record undo"
                : strip.retryAction
                  ? "Try again"
                  : strip.dismiss
                    ? "Record dismissal"
                    : strip.ai
                      ? "Record verification"
                      : `Record ${strip.verb.toLowerCase()}`;
            return (
              <li key={citation} className={`qrow${done ? " done" : ""}`}>
                <div className="main">
                  <span className="idx">{i + 1}.</span>
                  <span className="sentence">
                    <b>{r.lead}</b>
                    {r.rest}{" "}
                    <button className="fdaref" onClick={() => onOpen(r.finding)}>
                      [{citation}] FDA record
                    </button>
                  </span>
                  <span className={`sevtag ${r.tone}`}>{r.sevTag}</span>
                  {done && disp ? (
                    <span className="recblock">
                      <span className="recverb">
                        <span className="dot" />
                        {DISP_LABEL[disp.action]}
                      </span>
                      <span className="recby">
                        <span>
                          {disp.operator} · {fmtHM(disp.ts)}
                        </span>
                        <button
                          className="undo"
                          data-undo={citation}
                          aria-label="Undo this disposition; a reversal is recorded"
                          onClick={() => undo(citation)}
                        >
                          Undo
                        </button>
                      </span>
                    </span>
                  ) : (
                    <span className="actcol">
                      <button
                        className="actbtn"
                        aria-expanded={stripOpen}
                        onClick={() => startDisposition(r)}
                      >
                        {r.verb}
                      </button>
                      <span className="qstatus">
                        <span className={`dot ${r.dot}`} />
                        {r.status}
                      </span>
                    </span>
                  )}
                </div>
                {stripOpen && strip && (
                  <div
                    className="dstrip"
                    ref={stripRef}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setStrip(null);
                    }}
                  >
                    {strip.mode === "outcome" ? (
                      <>
                        <span className="lbl">Record the verification outcome:</span>
                        <button className="confirm" onClick={() => chooseConfirm(citation)}>
                          Confirm match
                        </button>
                        <button className="notmatch" onClick={() => chooseNotMatch(citation)}>
                          Not a match
                        </button>
                      </>
                    ) : (
                      <>
                        {strip.dismiss && (
                          <label className="field reason">
                            Reason
                            <input
                              value={strip.reason}
                              placeholder="One line: why this is not a match"
                              onChange={(e) =>
                                setStrip((s) => (s ? { ...s, reason: e.target.value } : s))
                              }
                            />
                          </label>
                        )}
                        {!operator && (
                          <label className="field initials">
                            Initials
                            <input
                              value={strip.initials}
                              maxLength={3}
                              placeholder="TC"
                              aria-label="Operator initials, 2 to 3 characters"
                              onChange={(e) =>
                                setStrip((s) =>
                                  s ? { ...s, initials: e.target.value.toUpperCase() } : s,
                                )
                              }
                            />
                          </label>
                        )}
                        <button
                          className="recordbtn"
                          disabled={recordDisabled}
                          onClick={recordFromStrip}
                        >
                          {recordLabel}
                        </button>
                      </>
                    )}
                    <button className="cancel" onClick={() => setStrip(null)}>
                      Cancel
                    </button>
                    {strip.mode === "fields" && !operator && (
                      <span className="fullnote">
                        Initials sign every disposition this session and are written to the
                        audit log with the action and time.
                      </span>
                    )}
                    {strip.error && (
                      <span className="fullnote error" role="alert">
                        {strip.error}
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
