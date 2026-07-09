import type { Finding } from "../api";

export default function FindingsTable({
  findings,
  flashRow,
  onSelect,
}: {
  findings: Finding[];
  flashRow: number | null;
  onSelect: (f: Finding) => void;
}) {
  if (findings.length === 0) {
    return (
      <div className="card p-5">
        <p className="m-0">No findings match the current filter.</p>
      </div>
    );
  }
  return (
    <div className="card overflow-x-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Severity</th>
            <th>Item</th>
            <th>Source</th>
            <th>Match</th>
            <th>Why it's flagged</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
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
              <td>[{f.citation}]</td>
              <td>
                <span className={`chip sev-${f.severity}`}>{f.severity}</span>
              </td>
              <td>
                {f.item_name}{" "}
                <span className="meta">{f.item_ndc ? f.item_ndc : ""}</span>
              </td>
              <td>{f.source}</td>
              <td>
                <span className={`chip ${f.label === "ai_matched" ? "chip-verify" : "chip-label"}`}>
                  {f.label === "ai_matched" ? "AI-matched: needs verification" : f.label}
                </span>
              </td>
              <td>{f.severity_rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
