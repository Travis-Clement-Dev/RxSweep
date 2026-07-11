import { reduceDispositions, type Disposition, type SweepResultData } from "../api";
import { actionRow, buildQueue, DISP_LABEL } from "../components/ActionQueue";
import Logomark from "../components/Logomark";
import { fmtHM } from "../format";

// The institutional memorandum (contract §4: Georgia belongs to the memo
// only). The sheet is always a white letter page with fixed light-palette
// severity colors in both themes: it prints. App chrome carries data-noprint
// and the print CSS in theme.css flattens the sheet to the page.

const MEMO_SEV: Record<string, string> = {
  critical: "#9a3a2e",
  high: "#9a3a2e",
  moderate: "#8a5d0b",
  info: "#256b43",
};

const SRC_LABEL: Record<string, string> = {
  recall: "Recall",
  shortage: "Shortage",
  ndc: "NDC status",
};

function longDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function Memo({
  result,
  dispositions,
  onBack,
}: {
  result: SweepResultData;
  dispositions: Disposition[];
  onBack: () => void;
}) {
  const meta = result.meta;
  const actions = buildQueue(result.findings).map(actionRow);
  const reduced = reduceDispositions(dispositions);
  const recorded = actions.filter((a) => reduced.has(a.finding.citation)).length;
  const asOf = fmtHM(new Date().toISOString());
  // The memo states the honest partial truth: what was recorded when it was
  // printed, and what remains open.
  const stateLine =
    actions.length === 0
      ? null
      : recorded === 0
        ? `No dispositions recorded as of ${asOf}; all ${actions.length} actions remain open.`
        : recorded === actions.length
          ? `All ${actions.length} actions recorded as of ${asOf}. None remain open.`
          : `${recorded} of ${actions.length} actions recorded as of ${asOf}; ${actions.length - recorded} remain open.`;

  function statusClause(a: ReturnType<typeof actionRow>): string {
    const d = reduced.get(a.finding.citation);
    if (!d) return /due/.test(a.status) ? "Open, due today." : "Open.";
    const note = d.note ? `: ${d.note.replace(/\.+$/, "")}` : "";
    return `${DISP_LABEL[d.action]}${note}. ${d.operator}, ${fmtHM(d.ts)}.`;
  }
  const paragraphs = result.summary
    ? result.summary.split(/\n\n+/).filter(Boolean)
    : [
        "AI summary was off for this sweep. Deterministic findings are listed below with " +
          "their FDA source records. Run the sweep with AI triage enabled to draft a cited " +
          "narrative summary.",
      ];

  return (
    <div className="memo-well">
      <div className="memo-toolbar" data-noprint="">
        <button className="btn-tint" onClick={onBack}>
          ← Back to findings
        </button>
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="note">Letter · portrait · prints to PDF</span>
          <button className="btn" style={{ padding: "8px 14px", fontSize: 12.5 }} onClick={() => window.print()}>
            Print to PDF
          </button>
        </span>
      </div>

      <div className="memo-sheet">
        <div className="letterhead">
          <span className="lh-brand">
            <Logomark width={16} height={15} fill="#1e3f63" />
            RxSweep
          </span>
          <span className="lh-role">Formulary surveillance · FDA public data</span>
        </div>

        <div className="memotitle">MEMORANDUM</div>
        <hr className="mrule" />
        <hr className="mrule thin" />

        <div className="docket">
          <span className="k">TO</span>
          <span>Pharmacy and Therapeutics Committee</span>
          <span className="k">FROM</span>
          <span>Travis Clement, PharmD · RxSweep run {result.run_id}</span>
          <span className="k">DATE</span>
          <span>{longDate(meta.run_ts)}</span>
          <span className="k">RE</span>
          <span>
            Formulary sweep findings: {meta.csv_name} ({meta.items_checked} items,{" "}
            {meta.months_back} month recall window)
          </span>
        </div>
        <hr className="mrule thin" style={{ marginTop: 14 }} />

        <p className="scope">
          Informational tool. A pharmacist verifies every finding before action. Not clinical
          advice. Source: openFDA; assume all results are unvalidated.
        </p>

        <div className="mh">Summary</div>
        {paragraphs.map((p, i) => (
          <p className="para" key={i}>
            {p}
          </p>
        ))}

        <div className="mh">Required actions</div>
        {stateLine && <p className="stateline">{stateLine}</p>}
        {actions.length === 0 ? (
          <p className="para">None. This sweep returned no findings.</p>
        ) : (
          <ol>
            {actions.map((a) => (
              <li key={a.finding.citation}>
                <span
                  style={{
                    textDecoration: reduced.has(a.finding.citation) ? "line-through" : "none",
                  }}
                >
                  {a.lead}
                  {a.rest}
                </span>{" "}
                <span className="status">({statusClause(a)})</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mh">Findings ({result.findings.length})</div>
        {result.findings.length === 0 ? (
          <p className="para">No findings in the {meta.months_back}-month window.</p>
        ) : (
          result.findings.map((f) => (
            <div className="frow" key={f.citation}>
              <span className="n">[{f.citation}]</span>
              <span className="sv" style={{ color: MEMO_SEV[f.severity] }}>
                {f.severity}
              </span>
              <span>{f.item_name}</span>
              <span className="ndc">{f.item_ndc ?? ""}</span>
              <span>{SRC_LABEL[f.source]}</span>
              <span className="basis">{f.severity_rationale}</span>
            </div>
          ))
        )}

        <hr className="mrule thin" style={{ marginTop: 26 }} />
        <p className="mfoot">
          openFDA: do not rely on these data to make decisions regarding medical care; assume
          all results are unvalidated. Severity rubric human-authored (Travis Clement, PharmD).
          Full audit trail: <span className="path">{meta.audit_path}</span>
        </p>
      </div>
    </div>
  );
}
