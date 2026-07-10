import { useState } from "react";
import type { SweepResultData } from "./api";
import Upload from "./screens/Upload";
import Progress from "./screens/Progress";
import Dashboard from "./screens/Dashboard";

type Phase =
  | { name: "upload" }
  | { name: "progress"; sweepId: string }
  | { name: "dashboard"; sweepId: string; result: SweepResultData };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: "upload" });

  return (
    <>
      <header className="band">
        <div className="inner">
          <span className="brand">RxSweep</span>
          <span className="tag">Formulary surveillance · FDA public data · pharmacist verifies</span>
        </div>
      </header>

      <div className="shell">
        {phase.name === "dashboard" ? (
          <p className="docket">
            Sweep {phase.result.run_id} · {phase.result.meta.csv_name} ·{" "}
            {phase.result.meta.items_checked} items · recall window{" "}
            {phase.result.meta.months_back} months · AI:{" "}
            {phase.result.meta.ai_available ? phase.result.meta.model : "off"}
            {phase.result.meta.ai_usage?.est_cost_usd != null &&
              ` · AI cost ~$${phase.result.meta.ai_usage.est_cost_usd.toFixed(4)}`}
          </p>
        ) : (
          <p className="docket">Sweep a formulary against FDA recalls, shortages, and discontinued NDCs.</p>
        )}
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="h-doc">
            {phase.name === "dashboard" ? "Formulary Sweep Findings" : "New Formulary Sweep"}
          </h1>
          {phase.name === "dashboard" && (
            <button className="btn btn-quiet" onClick={() => setPhase({ name: "upload" })}>
              New sweep
            </button>
          )}
        </div>
        <hr className="rule" />
        <hr className="rule thin" />

        <div className="noticebar" role="note">
          Informational tool. A pharmacist verifies every finding before action. Not clinical
          advice. openFDA: "assume all results are unvalidated."{" "}
          <a href="https://open.fda.gov/terms/">Terms</a>
        </div>

        {phase.name === "upload" && (
          <Upload onStarted={(sweepId) => setPhase({ name: "progress", sweepId })} />
        )}
        {phase.name === "progress" && (
          <Progress
            sweepId={phase.sweepId}
            onDone={(result) => setPhase({ name: "dashboard", sweepId: phase.sweepId, result })}
            onReset={() => setPhase({ name: "upload" })}
          />
        )}
        {phase.name === "dashboard" && (
          <Dashboard sweepId={phase.sweepId} result={phase.result} />
        )}

        <footer className="faint mt-14 border-t pt-4 text-[12px]" style={{ borderColor: "var(--line-soft)" }}>
          Severity rubric human-authored (Travis Clement, PharmD) · Every AI prompt and reply is
          audit-logged verbatim ·{" "}
          <a href="https://github.com/Travis-Clement-Dev/RxSweep">RxSweep on GitHub</a>
        </footer>
      </div>
    </>
  );
}
