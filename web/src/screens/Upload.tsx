import { useState } from "react";
import { Button, DropZone, FileTrigger } from "react-aria-components";
import { startSweep } from "../api";
import Logomark from "../components/Logomark";

// React Aria DropZone + FileTrigger: accessible drag-and-drop with a
// built-in keyboard/browse path. https://react-aria.adobe.com/DropZone
//
// Upload states (contract round 10): empty drop zone teaches the format and
// tints on drag-over; an attached file renders as a document receipt with
// explicit Replace/Remove; a non-CSV shows the inline critical error and
// attaches nothing. Footprints are stable (306px) so nothing jumps.

const INVALID_CSV = (name: string) =>
  `RxSweep could not read '${name}'. Provide a CSV file with columns for NDC and drug name. Nothing was uploaded.`;

export default function Upload({ onStarted }: { onStarted: (sweepId: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string | null>(null);
  const [monthsBack, setMonthsBack] = useState(24);
  const [useAi, setUseAi] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function accept(f: File | null | undefined) {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      // Matches the prototype: an invalid pick clears any attachment too.
      setError(INVALID_CSV(f.name));
      setFile(null);
      setColumns(null);
      return;
    }
    setError(null);
    setFile(f);
    // Preview the file's own header row on the receipt. The server detects
    // columns authoritatively during ingest; this only shows what was sent.
    try {
      const head = await f.slice(0, 4096).text();
      const names = (head.split(/\r?\n/)[0] ?? "")
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
      setColumns(names.length ? names.join(", ") : null);
    } catch {
      setColumns(null);
    }
  }

  async function useSample() {
    try {
      const resp = await fetch("/sample_formulary.csv");
      if (!resp.ok) throw new Error(String(resp.status));
      const blob = await resp.blob();
      await accept(new File([blob], "sample_formulary.csv", { type: "text/csv" }));
    } catch {
      setError("The bundled sample_formulary.csv could not be loaded. Attach a CSV instead.");
    }
  }

  async function onDrop(e: { items: { kind: string; getFile?: () => Promise<File> }[] }) {
    const item = e.items.find((i) => i.kind === "file");
    if (item?.getFile) await accept(await item.getFile());
  }

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
    <div className="fadeup" style={{ animationDuration: ".45s" }}>
      <div style={{ padding: "22px 22px 0" }}>
        <h1 className="h-doc">Sweep a formulary</h1>
        <p className="h-sub">
          Check every line item against FDA recalls, drug shortages, and discontinued NDCs.
          Every finding cites its FDA source record and is verified by a pharmacist.
        </p>
        <hr className="rule" />
        <hr className="rule thin" />
      </div>
      <div className="scopebar" role="note" style={{ margin: "18px 22px 0" }}>
        <b>Scope.</b>
        <span>
          Informational tool. A pharmacist verifies every finding before action. Not clinical
          advice. openFDA: assume all results are unvalidated.
        </span>
      </div>

      <section className="upgrid" aria-label="Start a sweep">
        {file === null ? (
          <DropZone
            className={({ isDropTarget }) => `dropzone${isDropTarget ? " drag" : ""}`}
            onDrop={onDrop}
            aria-label="Drop a formulary CSV file"
          >
            <FileTrigger acceptedFileTypes={[".csv", "text/csv"]} onSelect={(fs) => void accept(fs?.[0])}>
              <Button className="zonehit">
                <Logomark width={34} height={33} fill="var(--line)" />
                <span className="zt" style={{ marginTop: 14 }}>
                  Drop your formulary CSV here
                </span>
                <span className="zs">
                  or click to browse. Accepts a .csv with NDC and drug name columns; headers are
                  detected automatically.
                </span>
              </Button>
            </FileTrigger>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              <button className="samplelink" onClick={() => void useSample()}>
                Use the bundled sample_formulary.csv
              </button>
              {error && (
                <div className="uperror" role="alert">
                  {error}
                </div>
              )}
            </div>
          </DropZone>
        ) : (
          <DropZone className="receipt-wrap" onDrop={onDrop} aria-label="Attached formulary CSV">
            <div className="receipt">
              <Logomark width={22} height={21} fill="var(--accent)" />
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div className="fname">{file.name}</div>
                <div className="fmeta">
                  CSV · {(file.size / 1024).toFixed(1)} KB
                  {columns ? ` · columns detected: ${columns}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flex: "none" }}>
                <FileTrigger acceptedFileTypes={[".csv", "text/csv"]} onSelect={(fs) => void accept(fs?.[0])}>
                  <Button className="receipt-act">Replace</Button>
                </FileTrigger>
                <Button
                  className="receipt-act remove"
                  aria-label="Remove attached file"
                  onPress={() => {
                    setFile(null);
                    setColumns(null);
                    setError(null);
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              Ready to sweep. Review the options, then run.
            </div>
          </DropZone>
        )}

        <div className="optcard">
          <div className="title">Sweep options</div>
          <label className="optrow">
            Recall lookback (months)
            <input
              type="number"
              min={1}
              max={120}
              value={monthsBack}
              onChange={(e) => setMonthsBack(Number(e.target.value) || 24)}
            />
          </label>
          <label className="optrow">
            AI triage of fuzzy matches
            <button
              type="button"
              className="aitoggle"
              aria-pressed={useAi}
              onClick={() => setUseAi((v) => !v)}
            >
              <span className="knob" />
            </button>
          </label>
          <div className="optnote">
            AI triage adjudicates only fuzzy matches, using your Anthropic API key from the
            server environment. Your key, your cost; every call is logged. Deterministic
            findings work without it.
          </div>
          <Button
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
            isDisabled={!file || busy}
            onPress={() => void submit()}
          >
            {busy ? "Starting sweep" : "Run sweep"}
          </Button>
          {error && file !== null && (
            <p className="m-0 text-sm" style={{ color: "var(--critical)", margin: 0 }} role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
