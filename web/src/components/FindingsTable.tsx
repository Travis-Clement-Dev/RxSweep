import { Cell, Column, Row, Table, TableBody, TableHeader } from "react-aria-components";
import type { Disposition, Finding } from "../api";

// React Aria Table for keyboard grid navigation and row actions; rendered as
// the contract's bordered document register (fixed column grid, ground header
// row, typographic severity, bordered match tags). The register keeps
// citation order so [n] references read top to bottom; contract v1.1 dropped
// the old sortable columns.
// https://react-aria.adobe.com/Table

const SRC_LABEL: Record<Finding["source"], string> = {
  recall: "Recall",
  shortage: "Shortage",
  ndc: "NDC status",
};

const MATCH: Record<Finding["label"], { label: string; cls: string }> = {
  exact_ndc: { label: "Exact NDC", cls: "exact" },
  name_match: { label: "Name match", cls: "name" },
  ai_matched: { label: "AI: verify", cls: "ai" },
};

export default function FindingsTable({
  findings,
  flashRow,
  reduced,
  onSelect,
}: {
  findings: Finding[];
  flashRow: number | null;
  reduced: Map<number, Disposition>;
  onSelect: (f: Finding) => void;
}) {
  return (
    <div className="register">
      <Table aria-label="Findings register">
        <TableHeader>
          <Column>#</Column>
          <Column>Severity</Column>
          <Column isRowHeader>Item</Column>
          <Column>NDC</Column>
          <Column>Source</Column>
          <Column className="center">Match</Column>
          <Column>Basis</Column>
        </TableHeader>
        {/* dependencies: row rendering reads flashRow and the reduced
            disposition state, and RAC caches collection rows — without this
            neither the citation flash nor a dismissal ever re-renders. */}
        <TableBody items={findings} dependencies={[flashRow, reduced]}>
          {(f: Finding) => {
            const disp = reduced.get(f.citation);
            const dismissed = disp?.action === "dismissed";
            const verified = disp?.action === "verified";
            // Dismissals stay typographic (D4): faded row, struck item name,
            // neutral tag. The severity cell keeps the rubric fact.
            const match = dismissed
              ? { label: "Dismissed", cls: "name" }
              : verified
                ? { label: "AI: verified", cls: "name" }
                : MATCH[f.label];
            return (
              <Row
                id={f.citation}
                className={`${flashRow === f.citation ? "flash" : ""}${dismissed ? " dismissed" : ""}`}
                onAction={() => onSelect(f)}
                aria-label={`Open details for ${f.item_name}`}
              >
                <Cell className="cite">
                  <span id={`finding-${f.citation}`}>[{f.citation}]</span>
                </Cell>
                <Cell className="sevcell">
                  <span className={`svdot ${f.severity}`} aria-hidden="true" />
                  <span className={`svt ${f.severity}`}>{f.severity}</span>
                </Cell>
                <Cell className="item">{f.item_name}</Cell>
                <Cell className="ndc">{f.item_ndc ?? ""}</Cell>
                <Cell className="src">{SRC_LABEL[f.source]}</Cell>
                <Cell className="center">
                  <span className={`matchtag ${match.cls}`}>{match.label}</span>
                </Cell>
                <Cell className="basis">{f.severity_rationale}</Cell>
              </Row>
            );
          }}
        </TableBody>
      </Table>
    </div>
  );
}
