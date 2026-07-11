import { useEffect, useState } from "react";
import { ProgressBar } from "react-aria-components";
import { getSweep, type SweepProgress } from "../api";

// The server reports a phase name, not a percentage; the track maps each
// pipeline phase (webapp/server.py _PHASES, in order) to how far along the
// run is. Counters carry the honest live numbers.
const PHASE_PCT: Record<string, number> = {
  starting: 5,
  "reading formulary": 18,
  "querying FDA sources": 45,
  "matching items": 68,
  "AI triage": 84,
  finishing: 95,
};

export default function Progress({
  sweepId,
  onDone,
  onReset,
}: {
  sweepId: string;
  onDone: (result: NonNullable<SweepProgress["result"]>) => void;
  onReset: () => void;
}) {
  const [progress, setProgress] = useState<SweepProgress | null>(null);

  useEffect(() => {
    let live = true;
    const timer = setInterval(async () => {
      try {
        const p = await getSweep(sweepId);
        if (!live) return;
        setProgress(p);
        if (p.status === "done" && p.result) {
          clearInterval(timer);
          onDone(p.result);
        }
        if (p.status === "error") clearInterval(timer);
      } catch {
        /* transient poll failure: keep polling */
      }
    }, 700);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [sweepId, onDone]);

  if (progress?.status === "error") {
    return (
      <div className="runwrap" role="alert">
        <h2 className="runphase" style={{ margin: 0 }}>
          This file could not be swept
        </h2>
        <p className="meta" style={{ margin: 0, maxWidth: "60ch", textAlign: "center" }}>
          {progress.error}
        </p>
        <button className="btn" onClick={onReset}>
          Try another file
        </button>
      </div>
    );
  }

  const phase = progress?.phase ?? "starting";
  const pct = PHASE_PCT[phase] ?? 5;
  const counters: [string, number][] = [
    ["items read", progress?.items ?? 0],
    ["FDA requests", progress?.fda_requests ?? 0],
    ["AI calls", progress?.ai_calls ?? 0],
  ];

  return (
    <div className="runwrap" aria-live="polite">
      <ProgressBar
        value={pct}
        aria-label={`Sweep in progress: ${phase}`}
        className="flex flex-col items-center gap-6"
      >
        <div className="radar" aria-hidden="true" />
      </ProgressBar>
      <div className="runphase">{phase}</div>
      <div className="runtrack" aria-hidden="true">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="runcounts">
        {counters.map(([label, n]) => (
          <div key={label}>
            <div className="v">{n.toLocaleString("en-US")}</div>
            <div className="l">{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
        Every request and AI call shown here is also written to this run's audit log.
      </div>
    </div>
  );
}
