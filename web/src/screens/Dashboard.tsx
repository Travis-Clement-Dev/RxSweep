import { useState } from "react";
import { ToggleButton } from "react-aria-components";
import type { Finding, SweepResultData } from "../api";
import ActionQueue from "../components/ActionQueue";
import FindingsTable from "../components/FindingsTable";
import FindingDrawer from "../components/FindingDrawer";
import AssistantPanel from "../components/AssistantPanel";
import { fmtRunTs } from "../format";

const TIERS = ["critical", "high", "moderate", "info"] as const;
type Tier = (typeof TIERS)[number];

// unchecked strings arrive as one line per failed source:
//   "ndc directory source unavailable: 42 items unchecked against ndc directory"
// The notice names the source when one failed and generalizes otherwise.
function outageNotice(unchecked: string[]): { lead: string; body: string } {
  const parsed = unchecked
    .map((u) => /^(.+?) source unavailable: (\d+) items? unchecked/.exec(u))
    .filter((m): m is RegExpExecArray => m !== null);
  if (parsed.length === 1) {
    const raw = parsed[0][1];
    const name = raw === "ndc directory" ? "NDC directory" : raw.charAt(0).toUpperCase() + raw.slice(1);
    return {
      lead: `${name} unavailable.`,
      body:
        `The ${raw === "ndc directory" ? "NDC directory" : `${raw} source`} could not be ` +
        `reached after retries. ${parsed[0][2]} items were not checked against it and are ` +
        `listed under Unchecked. Treat them as unknown, not clear. Re-run the sweep to ` +
        `complete coverage.`,
    };
  }
  return {
    lead: "FDA sources unavailable.",
    body:
      "One or more FDA sources could not be reached after retries. Affected items were not " +
      "checked and are listed under Unchecked. Treat them as unknown, not clear. Re-run the " +
      "sweep to complete coverage.",
  };
}

export default function Dashboard({
  sweepId,
  result,
  aiCalls,
  onReset,
  onOpenMemo,
  overlay,
  panelOpen,
  onPanelOpenChange,
  panelWidth,
  onPanelWidthChange,
}: {
  sweepId: string;
  result: SweepResultData;
  aiCalls: number;
  onReset: () => void;
  onOpenMemo: () => void;
  overlay: boolean;
  panelOpen: boolean;
  onPanelOpenChange: (open: boolean) => void;
  panelWidth: number;
  onPanelWidthChange: (w: number) => void;
}) {
  const [sevFilter, setSevFilter] = useState<Tier | null>(null);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [flashRow, setFlashRow] = useState<number | null>(null);

  // Citation jump from the assistant transcript: clear the filter so the row
  // exists, flash it, and scroll instantly (smooth scroll violates §8).
  function citeJump(n: number) {
    setSevFilter(null);
    setFlashRow(n);
    setTimeout(
      () => document.getElementById(`finding-${n}`)?.scrollIntoView({ block: "center" }),
      60,
    );
    setTimeout(() => setFlashRow((cur) => (cur === n ? null : cur)), 1900);
  }

  const findings = result.findings;
  const filtered = sevFilter ? findings.filter((f) => f.severity === sevFilter) : findings;
  const hasFindings = findings.length > 0;
  const meta = result.meta;

  const filters: { key: Tier | null; label: string; count: number }[] = [
    { key: null, label: "All findings", count: findings.length },
    ...TIERS.map((t) => ({
      key: t as Tier | null,
      label: t.charAt(0).toUpperCase() + t.slice(1),
      count: result.tiers[t] ?? 0,
    })),
  ];

  const registerNote = !hasFindings
    ? null
    : sevFilter
      ? `Filtered to ${sevFilter.charAt(0).toUpperCase() + sevFilter.slice(1)}. ${filtered.length} shown; clear the filter to see all.`
      : `Showing ${findings.length} of ${findings.length}.`;

  return (
    <div style={{ maxWidth: 1604, margin: "0 auto" }}>
      <div
        className="fadeup"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, padding: "20px 22px 0" }}
      >
        <div>
          <h1 className="h-doc">Formulary Sweep Findings</h1>
          <p className="h-sub" style={{ fontSize: 13 }}>
            Sweep a formulary against FDA recalls, drug shortages, and discontinued NDCs.
          </p>
        </div>
        <button className="btn-quiet" onClick={onReset}>
          New sweep
        </button>
      </div>
      <div style={{ padding: "0 22px" }}>
        <hr className="rule grow" style={{ marginTop: 13 }} />
        <hr className="rule thin" />
      </div>
      <div className="scopebar fadeup d1" role="note" style={{ margin: "16px 22px 0" }}>
        <b>Scope.</b>
        <span>
          Informational tool. A pharmacist verifies every finding before action. Not clinical
          advice. openFDA: assume all results are unvalidated.
        </span>
      </div>

      <div className="metastrip fadeup d2">
        <div className="cell">
          <div className="k">Formulary</div>
          <div className="v">{meta.csv_name}</div>
        </div>
        <div className="cell">
          <div className="k">Items checked</div>
          <div className="v">{meta.items_checked}</div>
        </div>
        <div className="cell">
          <div className="k">Recall window</div>
          <div className="v">{meta.months_back} months</div>
        </div>
        <div className="cell">
          <div className="k">AI model</div>
          <div className="v">{meta.ai_available ? meta.model : "off"}</div>
        </div>
        <div className="cell">
          <div className="k">Run</div>
          <div className="v">{fmtRunTs(meta.run_ts)}</div>
        </div>
      </div>

      {result.unchecked.length > 0 && (
        <div className="noticebar warn" role="note" style={{ margin: "16px 22px 0" }}>
          <b>{outageNotice(result.unchecked).lead}</b>
          <span>{outageNotice(result.unchecked).body}</span>
        </div>
      )}

      <div className="fadeup d3" style={{ padding: "22px 22px 0" }}>
        <ActionQueue findings={findings} tiers={result.tiers} onOpen={setSelected} />
      </div>

      <div className="fadeup d4" style={{ padding: "26px 22px 0" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 10 }}
        >
          <h2 className="h-sect" style={{ margin: 0 }}>
            Findings register <span className="n">({findings.length})</span>
          </h2>
          {hasFindings && (
            <div className="regfilters">
              {filters.map((fl) => (
                <ToggleButton
                  key={fl.label}
                  className="regfilter"
                  isSelected={sevFilter === fl.key}
                  onChange={() =>
                    setSevFilter(fl.key === null ? null : sevFilter === fl.key ? null : fl.key)
                  }
                >
                  {fl.key !== null && <span className={`dot ${fl.key}`} />}
                  {fl.label} · {fl.count}
                </ToggleButton>
              ))}
            </div>
          )}
        </div>
        {hasFindings ? (
          <FindingsTable findings={filtered} flashRow={flashRow} onSelect={setSelected} />
        ) : (
          <div className="statement">
            <b>No findings.</b> {meta.items_checked} items were checked against FDA recalls,
            drug shortages, and the NDC directory over the trailing {meta.months_back} months.
            A clean result is still a record: export the memo from the run record to file this
            sweep.
          </div>
        )}
        {registerNote && <p className="regnote">{registerNote}</p>}
      </div>

      <div className="disclose fadeup d5" style={{ padding: "26px 22px 0" }}>
        <div className="card">
          <div className="title">Manual review ({result.manual_review.length})</div>
          {result.manual_review.length === 0 ? (
            <div className="row">No fuzzy candidates required manual adjudication this run.</div>
          ) : (
            result.manual_review.map((m, i) => (
              <div className="row" key={i}>
                <b>{m.item.name}</b> <span className="id">row {m.item.row}</span>
                <br />
                {m.reason}
              </div>
            ))
          )}
        </div>
        <div className="card">
          <div className="title">Quarantined ({result.quarantined.length})</div>
          {result.quarantined.length === 0 ? (
            <div className="row">No rows were quarantined during ingest.</div>
          ) : (
            result.quarantined.map((q, i) => (
              <div className="row" key={i}>
                <span className="id">line {q.row}</span> · {q.reason}
              </div>
            ))
          )}
        </div>
        <div className="card">
          <div className="title">Unchecked ({result.unchecked.length})</div>
          {result.unchecked.length === 0 ? (
            <div className="row">
              All three FDA sources were reachable this run. No items were left unchecked.
            </div>
          ) : (
            result.unchecked.map((u, i) => (
              <div className="row" key={i}>
                {u}
              </div>
            ))
          )}
        </div>
      </div>
      <div style={{ height: 26 }} />

      <FindingDrawer finding={selected} onClose={() => setSelected(null)} />

      <AssistantPanel
        sweepId={sweepId}
        result={result}
        aiCalls={aiCalls}
        open={panelOpen}
        width={panelWidth}
        overlay={overlay}
        onOpenChange={onPanelOpenChange}
        onWidthChange={onPanelWidthChange}
        onCite={citeJump}
        onOpenMemo={() => {
          setSelected(null);
          onOpenMemo();
        }}
      />
    </div>
  );
}
