import { useState } from "react";
import type { Finding, SweepResultData } from "../api";
import Tiles from "../components/Tiles";
import FindingsTable from "../components/FindingsTable";
import FindingDrawer from "../components/FindingDrawer";
import ChatPanel from "../components/ChatPanel";

const TABS = ["Findings", "Manual review", "Quarantined", "Unchecked"] as const;
type Tab = (typeof TABS)[number];

export default function Dashboard({
  sweepId,
  result,
}: {
  sweepId: string;
  result: SweepResultData;
}) {
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Finding | null>(null);
  const [tab, setTab] = useState<Tab>("Findings");
  const [flashRow, setFlashRow] = useState<number | null>(null);

  const filtered = severityFilter
    ? result.findings.filter((f) => f.severity === severityFilter)
    : result.findings;

  function citeJump(citation: number) {
    setTab("Findings");
    setSeverityFilter(null);
    setFlashRow(citation);
    requestAnimationFrame(() =>
      document
        .getElementById(`finding-${citation}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    setTimeout(() => setFlashRow(null), 1800);
  }

  const counts: Record<Tab, number> = {
    Findings: result.findings.length,
    "Manual review": result.manual_review.length,
    Quarantined: result.quarantined.length,
    Unchecked: result.unchecked.length,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div>
        <p className="meta mt-0">
          {result.meta.csv_name} · {result.meta.items_checked} items checked · recalls
          window {result.meta.months_back} months · AI:{" "}
          {result.meta.ai_available ? result.meta.model : "off"} ·{" "}
          <a href={`/api/sweeps/${sweepId}/report`}>download report</a>
        </p>

        <Tiles
          tiers={result.tiers}
          active={severityFilter}
          onToggle={(t) => setSeverityFilter(severityFilter === t ? null : t)}
        />

        {result.summary && (
          <div className="card mb-5 p-5">
            <span className="chip chip-label mb-2">
              AI-drafted summary: cited, pharmacist verifies
            </span>
            {result.summary.split("\n\n").map((para, i) => (
              <p key={i} className="mb-0 mt-2 text-[0.92rem]">
                {para}
              </p>
            ))}
          </div>
        )}

        <div role="tablist" className="mb-3 flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`chip ${tab === t ? "chip-label" : ""}`}
              style={tab !== t ? { background: "var(--card)", border: "1px solid var(--line)", color: "var(--ink-soft)" } : {}}
              onClick={() => setTab(t)}
            >
              {t} ({counts[t]})
            </button>
          ))}
        </div>

        {tab === "Findings" && (
          <FindingsTable findings={filtered} flashRow={flashRow} onSelect={setSelected} />
        )}
        {tab === "Manual review" && (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Source</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.manual_review.map((c, i) => (
                  <tr key={i} style={{ cursor: "default" }}>
                    <td>
                      {c.item.name} <span className="meta">(row {c.item.row})</span>
                    </td>
                    <td>{c.source}</td>
                    <td>{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "Quarantined" && (
          <div className="card overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>CSV line</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.quarantined.map((q, i) => (
                  <tr key={i} style={{ cursor: "default" }}>
                    <td>{q.row}</td>
                    <td>{q.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "Unchecked" && (
          <div className="card p-5">
            <p className="meta mt-0">
              These items could not be checked against one or more sources this run.
              Treat them as unknown, not clear.
            </p>
            <ul className="mb-0">
              {result.unchecked.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
            {result.unchecked.length === 0 && <p className="mb-0">All sources were reachable.</p>}
          </div>
        )}
      </div>

      <ChatPanel sweepId={sweepId} aiAvailable={result.meta.ai_available} onCite={citeJump} />

      <FindingDrawer finding={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
