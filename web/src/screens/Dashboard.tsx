import { useState } from "react";
import type { Finding, SweepResultData } from "../api";
import ActionQueue from "../components/ActionQueue";
import FindingsTable from "../components/FindingsTable";
import FindingDrawer from "../components/FindingDrawer";
import ChatPanel from "../components/ChatPanel";

const TIERS = ["critical", "high", "moderate", "info"] as const;
const REGISTERS = ["Findings", "Manual review", "Quarantined", "Unchecked"] as const;
type Register = (typeof REGISTERS)[number];

export default function Dashboard({
  sweepId,
  result,
}: {
  sweepId: string;
  result: SweepResultData;
}) {
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [register, setRegister] = useState<Register>("Findings");
  const [flashRow, setFlashRow] = useState<number | null>(null);

  const filtered = severityFilter
    ? result.findings.filter((f) => f.severity === severityFilter)
    : result.findings;

  function citeJump(citation: number) {
    setRegister("Findings");
    setSeverityFilter(null);
    setFlashRow(citation);
    setTimeout(
      () =>
        document
          .getElementById(`finding-${citation}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      60,
    );
    setTimeout(() => setFlashRow(null), 1800);
  }

  const counts: Record<Register, number> = {
    Findings: result.findings.length,
    "Manual review": result.manual_review.length,
    Quarantined: result.quarantined.length,
    Unchecked: result.unchecked.length,
  };

  return (
    <div className="layout">
      <nav className="rail" aria-label="Run, filters, and exports">
        <h3>Run</h3>
        <div className="kv"><span>File</span><b>{result.meta.csv_name}</b></div>
        <div className="kv"><span>Items</span><b>{result.meta.items_checked}</b></div>
        <div className="kv"><span>Window</span><b>{result.meta.months_back} mo</b></div>
        <div className="kv"><span>AI</span><b>{result.meta.ai_available ? result.meta.model.replace("claude-", "") : "off"}</b></div>

        <h3>Severity</h3>
        <button
          className="filter"
          aria-pressed={severityFilter === null && register === "Findings"}
          onClick={() => {
            setRegister("Findings");
            setSeverityFilter(null);
          }}
        >
          <span>All findings</span>
          <span className="n">{counts.Findings}</span>
        </button>
        {TIERS.map((tier) => (
          <button
            key={tier}
            className="filter"
            aria-pressed={severityFilter === tier}
            onClick={() => {
              setRegister("Findings");
              setSeverityFilter(severityFilter === tier ? null : tier);
            }}
          >
            <span>
              <span className={`svdot ${tier}`} aria-hidden="true"></span>
              {tier[0].toUpperCase() + tier.slice(1)}
            </span>
            <span className="n">{result.tiers[tier] ?? 0}</span>
          </button>
        ))}

        <h3>Registers</h3>
        {REGISTERS.slice(1).map((r) => (
          <button key={r} className="filter" aria-pressed={register === r} onClick={() => setRegister(r)}>
            <span>{r}</span>
            <span className="n">{counts[r]}</span>
          </button>
        ))}

        <h3>Export</h3>
        <a className="link" href={`/api/sweeps/${sweepId}/export/csv`}>findings.csv</a>
        <a className="link" href={`/api/sweeps/${sweepId}/export/xlsx`}>findings.xlsx</a>
        <a className="link" href={`/api/sweeps/${sweepId}/export/md`}>findings.md · for your AI</a>
        <a className="link" href={`/api/sweeps/${sweepId}/report`} target="_blank" rel="noreferrer">
          memo · print to PDF
        </a>
        <span className="link faint mono text-[11px]">audit.jsonl in run folder</span>
      </nav>

      <main>
        {register === "Findings" && (
          <>
            <ActionQueue findings={result.findings} onOpen={setSelected} />
            <h2 className="sect">
              Findings register ({filtered.length}
              {severityFilter ? ` · ${severityFilter}` : ""})
            </h2>
            <FindingsTable findings={filtered} flashRow={flashRow} onSelect={setSelected} />
          </>
        )}

        {register === "Manual review" && (
          <>
            <h2 className="sect">Needs manual review ({counts["Manual review"]})</h2>
            <div className="worklist">
              <table className="tbl">
                <thead><tr><th>Item</th><th>Source</th><th>Reason</th></tr></thead>
                <tbody>
                  {result.manual_review.map((c, i) => (
                    <tr key={i} style={{ cursor: "default" }}>
                      <td>{c.item.name} <span className="meta">(row {c.item.row})</span></td>
                      <td>{c.source}</td>
                      <td className="why">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {register === "Quarantined" && (
          <>
            <h2 className="sect">Quarantined rows ({counts.Quarantined})</h2>
            <p className="meta">Rows we could not fully process. Shown, never silently dropped.</p>
            <div className="worklist">
              <table className="tbl">
                <thead><tr><th>CSV line</th><th>Reason</th></tr></thead>
                <tbody>
                  {result.quarantined.map((q, i) => (
                    <tr key={i} style={{ cursor: "default" }}>
                      <td className="mono">{q.row}</td>
                      <td>{q.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {register === "Unchecked" && (
          <>
            <h2 className="sect">Unchecked items ({counts.Unchecked})</h2>
            <div className="panel">
              {counts.Unchecked === 0 ? (
                <p className="m-0">All three FDA sources were reachable this run.</p>
              ) : (
                <>
                  <p className="meta mt-0">
                    These items could not be checked against one or more sources this run. Treat
                    them as unknown, not clear.
                  </p>
                  <ul className="mb-0">
                    {result.unchecked.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </main>

      <ChatPanel
        sweepId={sweepId}
        aiAvailable={result.meta.ai_available}
        summary={result.summary}
        onCite={citeJump}
      />

      <FindingDrawer finding={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
