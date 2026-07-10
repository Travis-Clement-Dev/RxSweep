import { useEffect, useState } from "react";
import { ProgressBar } from "react-aria-components";
import { getSweep, type SweepProgress } from "../api";

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
      <section className="panel text-center" role="alert">
        <h2 className="m-0">This file could not be swept</h2>
        <p className="meta">{progress.error}</p>
        <button className="btn" onClick={onReset}>
          Try another file
        </button>
      </section>
    );
  }

  return (
    <section className="panel flex flex-col items-center gap-6 p-10" aria-live="polite">
      <ProgressBar
        isIndeterminate
        aria-label={`Sweep in progress: ${progress?.phase ?? "starting"}`}
        className="flex flex-col items-center"
      >
        <div className="sweep" aria-hidden="true" />
      </ProgressBar>
      <h2 className="m-0 text-lg font-bold capitalize">
        {progress?.phase ?? "starting"}
      </h2>
      <div className="flex gap-8 text-center">
        {[
          ["items read", progress?.items ?? 0],
          ["FDA requests", progress?.fda_requests ?? 0],
          ["AI calls", progress?.ai_calls ?? 0],
        ].map(([label, n]) => (
          <div key={label as string}>
            <div className="text-2xl font-extrabold tabular-nums">{n}</div>
            <div className="lbl faint text-[0.72rem] uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>
      <p className="meta m-0">
        Every request and AI call shown here is also in this run's audit log.
      </p>
    </section>
  );
}
