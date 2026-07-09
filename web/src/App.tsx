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
    <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8">
      <header className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display text-2xl font-bold m-0">RxSweep</h1>
          <p className="meta m-0">
            Sweep a formulary against FDA recalls, shortages, and discontinued NDCs.
          </p>
        </div>
        {phase.name === "dashboard" && (
          <button className="btn btn-quiet" onClick={() => setPhase({ name: "upload" })}>
            New sweep
          </button>
        )}
      </header>

      <div className="banner mb-6" role="note">
        Informational tool. A pharmacist verifies every finding before action. Not
        clinical advice.
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

      <footer className="faint mt-14 border-t pt-4 text-[0.8rem]" style={{ borderColor: "var(--line)" }}>
        Data source notice (openFDA): "Do not rely on openFDA to make decisions
        regarding medical care. While we make every effort to ensure that data is
        accurate, you should assume all results are unvalidated."{" "}
        <a href="https://open.fda.gov/terms/">Terms</a> ·{" "}
        <a href="https://open.fda.gov/license/">License</a> · Severity rubric
        human-authored (Travis Clement, PharmD) ·{" "}
        <a href="https://github.com/Travis-Clement-Dev/RxSweep">RxSweep on GitHub</a>
      </footer>
    </div>
  );
}
