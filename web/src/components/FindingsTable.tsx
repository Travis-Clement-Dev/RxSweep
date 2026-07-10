import { useMemo, useState } from "react";
import {
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader,
  type SortDescriptor,
} from "react-aria-components";
import type { Finding } from "../api";

// React Aria Table: native accessible column sorting + keyboard grid
// navigation. https://react-aria.adobe.com/Table
const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, moderate: 2, info: 3 };

export default function FindingsTable({
  findings,
  flashRow,
  onSelect,
}: {
  findings: Finding[];
  flashRow: number | null;
  onSelect: (f: Finding) => void;
}) {
  const [sort, setSort] = useState<SortDescriptor>({
    column: "severity",
    direction: "ascending",
  });

  const sorted = useMemo(() => {
    const rows = [...findings];
    const dir = sort.direction === "descending" ? -1 : 1;
    rows.sort((a, b) => {
      let cmp = 0;
      if (sort.column === "severity")
        cmp = SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || a.citation - b.citation;
      else if (sort.column === "item") cmp = a.item_name.localeCompare(b.item_name);
      else if (sort.column === "source")
        cmp = a.source.localeCompare(b.source) || a.citation - b.citation;
      else cmp = a.citation - b.citation;
      return cmp * dir;
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

  return (
    <div className="worklist">
      <Table
        aria-label="Findings register"
        className="tbl"
        sortDescriptor={sort}
        onSortChange={setSort}
      >
        <TableHeader>
          <Column id="citation" allowsSorting>#</Column>
          <Column id="severity" allowsSorting>Severity</Column>
          <Column id="item" allowsSorting isRowHeader>Item</Column>
          <Column>NDC</Column>
          <Column id="source" allowsSorting>Source</Column>
          <Column>Match</Column>
          <Column>Basis</Column>
        </TableHeader>
        <TableBody items={sorted}>
          {(f: Finding) => (
            <Row
              id={f.citation}
              className={flashRow === f.citation ? "flash" : ""}
              onAction={() => onSelect(f)}
              aria-label={`Open details for ${f.item_name}`}
            >
              <Cell>
                <span id={`finding-${f.citation}`} className="mono">[{f.citation}]</span>
              </Cell>
              <Cell>
                <span className={`svdot ${f.severity}`} aria-hidden="true"></span>
                <span className={`svt ${f.severity}`}>{f.severity}</span>
              </Cell>
              <Cell>{f.item_name}</Cell>
              <Cell><span className="ndc">{f.item_ndc ?? "—"}</span></Cell>
              <Cell>{f.source}</Cell>
              <Cell>
                {f.label === "ai_matched" ? (
                  <span className="chip chip-verify">AI-matched: verify</span>
                ) : (
                  <span className="chip chip-label">
                    {f.label === "exact_ndc" ? "exact NDC" : "name"}
                  </span>
                )}
              </Cell>
              <Cell><span className="why">{f.severity_rationale}</span></Cell>
            </Row>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
