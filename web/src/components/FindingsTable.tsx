import { useMemo, useState } from "react";
import type { Finding } from "../api";

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, moderate: 2, info: 3 };
type SortKey = "severity" | "item" | "source" | "citation";

export default function FindingsTable({
  findings,
  flashRow,
  onSelect,
}: {
  findings: Finding[];
  flashRow: number | null;
  onSelect: (f: Finding) => void;
}) {
  const [sort, setSort] = useState<SortKey>("severity");

  const sorted = useMemo(() => {
    const rows = [...findings];
    rows.sort((a, b) => {
      if (sort === "severity")
        return SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.citation - b.citation;
      if (sort === "item") return a.item_name.localeCompare(b.item_name);
      if (sort === "source") return a.source.localeCompare(b.source) || a.citation - b.citation;
      return a.citation - b.citation;
    });
    return rows;
  }, [findings, sort]);

  if (findings.length === 0) {
    return (
      <div className="panel">
        <p className="m-0">No findings match the current filter.</p>
      </div>
    );
  }

  const TH = ({ k, children }: { k: SortKey; children: string }) => (
    <th aria-sort={sort === k ? "ascending" : "none"}>
      <button onClick={() => setSort(k)}>
        {children}
        {sort === k ? " ↓" : ""}
      </button>
    </th>
  );

  return (
    <div className="worklist">
      <table className="tbl">
        <thead>
          <tr>
            <TH k="citation"># </TH>
            <TH k="severity">Severity</TH>
            <TH k="item">Item</TH>
            <th>NDC</th>
            <TH k="source">Source</TH>
            <th>Match</th>
            <th>Basis</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f) => (
            <tr
              key={f.citation}
              id={`finding-${f.citation}`}
              className={flashRow === f.citation ? "flash" : ""}
              tabIndex={0}
              onClick={() => onSelect(f)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(f);
                }
              }}
              aria-label={`Open details for ${f.item_name}`}
            >
              <td className="mono">[{f.citation}]</td>
              <td>
                <span className={`svdot ${f.severity}`} aria-hidden="true"></span>
                <span className={`svt ${f.severity}`}>{f.severity}</span>
              </td>
              <td>{f.item_name}</td>
              <td className="ndc">{f.item_ndc ?? "—"}</td>
              <td>{f.source}</td>
              <td>
                {f.label === "ai_matched" ? (
                  <span className="chip chip-verify">AI-matched: verify</span>
                ) : (
                  <span className="chip chip-label">{f.label === "exact_ndc" ? "exact NDC" : "name"}</span>
                )}
              </td>
              <td className="why">{f.severity_rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
