import { useState } from "react";
import { Button, DropZone, FileTrigger } from "react-aria-components";
import { startSweep } from "../api";

// React Aria DropZone + FileTrigger: accessible drag-and-drop with a
// built-in keyboard/browse path. https://react-aria.adobe.com/DropZone
export default function Upload({ onStarted }: { onStarted: (sweepId: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [monthsBack, setMonthsBack] = useState(24);
  const [useAi, setUseAi] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      <DropZone
        className={({ isDropTarget }) => `dropzone ${isDropTarget ? "drag" : ""}`}
        onDrop={async (e) => {
          const item = e.items.find((i) => i.kind === "file");
          if (item && item.kind === "file") setFile(await item.getFile());
        }}
        aria-label="Drop a formulary CSV file"
      >
        <div className="text-lg font-bold">
          {file ? file.name : "Drop your formulary CSV here"}
        </div>
        <p className="meta mt-2 mb-3">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB selected.`
            : "Columns for NDC and drug name are detected automatically."}
        </p>
        <FileTrigger
          acceptedFileTypes={[".csv", "text/csv"]}
          onSelect={(files) => {
            const f = files?.[0];
            if (f) setFile(f);
          }}
        >
          <Button className="btn btn-quiet">{file ? "Choose a different file" : "Browse files"}</Button>
        </FileTrigger>
      </DropZone>

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
            className="w-20 border px-2 py-1"
            style={{ borderColor: "var(--line)", background: "var(--paper)", color: "var(--ink)" }}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm">
          AI triage of fuzzy matches
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
        </label>
        <p className="meta m-0 text-[0.8rem]">
          AI triage uses your Anthropic API key from the server's environment.
          Deterministic findings work without it.
        </p>
        <Button className="btn" isDisabled={!file || busy} onPress={submit}>
          {busy ? "Starting sweep" : "Run sweep"}
        </Button>
        {error && (
          <p className="m-0 text-sm" style={{ color: "var(--critical)" }} role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
