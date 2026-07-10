import { useRef, useState } from "react";
import { startSweep } from "../api";

export default function Upload({ onStarted }: { onStarted: (sweepId: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [monthsBack, setMonthsBack] = useState(24);
  const [useAi, setUseAi] = useState(true);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onStarted(await startSweep(file, monthsBack, useAi));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-5 md:grid-cols-[1fr_320px]" aria-label="Start a sweep">
      <button
        type="button"
        className={`dropzone ${drag ? "drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        aria-label="Choose or drop a formulary CSV file"
      >
        <div className="text-lg font-bold">
          {file ? file.name : "Drop your formulary CSV here"}
        </div>
        <p className="meta mt-2 mb-0">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB. Click to choose a different file.`
            : "or click to browse. Columns for NDC and drug name are detected automatically."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </button>

      <div className="panel flex flex-col gap-4">
        <h2 className="m-0 text-base font-semibold">Sweep options</h2>
        <label className="flex items-center justify-between gap-3 text-sm">
          Recall lookback (months)
          <input
            type="number"
            min={1}
            max={120}
            value={monthsBack}
            onChange={(e) => setMonthsBack(Number(e.target.value))}
            className="w-20 rounded-lg border px-2 py-1"
            style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          AI triage of fuzzy matches
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
          />
        </label>
        <p className="meta m-0 text-[0.8rem]">
          AI triage uses your Anthropic API key from the server's environment.
          Deterministic findings work without it.
        </p>
        <button className="btn" disabled={!file || busy} onClick={submit}>
          {busy ? "Starting sweep" : "Run sweep"}
        </button>
        {error && (
          <p className="m-0 text-sm" style={{ color: "var(--critical)" }} role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
