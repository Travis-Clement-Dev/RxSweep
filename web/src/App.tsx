import { useEffect, useState } from "react";
import type { SweepResultData } from "./api";
import Upload from "./screens/Upload";
import Progress from "./screens/Progress";
import Dashboard from "./screens/Dashboard";
import Memo from "./screens/Memo";
import Logomark from "./components/Logomark";

type Phase =
  | { name: "upload" }
  | { name: "progress"; sweepId: string }
  | { name: "dashboard"; sweepId: string; result: SweepResultData; aiCalls: number }
  | { name: "memo"; sweepId: string; result: SweepResultData; aiCalls: number };

type Theme = "light" | "dark";

// The openFDA strip travels with every frame (contract: the disclaimer
// accompanies every artifact).
function FrameFooter() {
  return (
    <div className="framefoot" data-noprint="">
      <div className="inner">
        openFDA: do not rely on these data to make decisions regarding medical care; assume
        all results are unvalidated.{" "}
        <a href="https://open.fda.gov/terms/" target="_blank" rel="noreferrer">
          Terms
        </a>{" "}
        ·{" "}
        <a href="https://open.fda.gov/license/" target="_blank" rel="noreferrer">
          License
        </a>{" "}
        · Severity rubric human-authored (Travis Clement, PharmD) ·{" "}
        <a href="https://github.com/Travis-Clement-Dev/RxSweep" target="_blank" rel="noreferrer">
          RxSweep on GitHub
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: "upload" });
  // index.html applies the stored theme before first paint; read it back here.
  const [theme, setTheme] = useState<Theme>(() => {
    const set = document.documentElement.dataset.theme;
    if (set === "light" || set === "dark") return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [winW, setWinW] = useState(() => window.innerWidth);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(340);

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("rxsweep-theme", next);
    setTheme(next);
  }

  // Below 1100px the assistant panel overlays the canvas instead of reserving
  // width; a masthead icon toggles it (contract round 9).
  const overlay = winW < 1100;
  const onWorkspace = phase.name === "dashboard" || phase.name === "memo";
  const isMemo = phase.name === "memo";

  return (
    <>
      <header className="band" data-noprint="">
        <div className="inner">
          <span className="left">
            <Logomark width={15} height={14} fill="#7fa0cf" />
            <span className="brand">RxSweep</span>
            <span className="tag">
              Formulary surveillance · FDA public data · pharmacist verifies
            </span>
          </span>
          <span className="right">
            {phase.name === "dashboard" && overlay && (
              <button
                className="iconbtn"
                onClick={() => setPanelOpen((o) => !o)}
                aria-label="Toggle assistant panel"
                title="Assistant"
              >
                <span className="glyph-chat" />
              </button>
            )}
            <button
              className="iconbtn"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              title={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
            >
              {theme === "light" ? "☾" : "☀"}
            </button>
          </span>
        </div>
      </header>

      {phase.name === "upload" && (
        <div className="shellpad">
          <div className="frame">
            <Upload onStarted={(sweepId) => setPhase({ name: "progress", sweepId })} />
            <FrameFooter />
          </div>
        </div>
      )}

      {phase.name === "progress" && (
        <div className="shellpad">
          <div className="frame">
            <Progress
              sweepId={phase.sweepId}
              onDone={(result, aiCalls) => {
                setPhase({ name: "dashboard", sweepId: phase.sweepId, result, aiCalls });
                // A run finishing on a narrow window keeps the overlay closed.
                setPanelOpen(window.innerWidth >= 1100);
              }}
              onReset={() => setPhase({ name: "upload" })}
            />
            <FrameFooter />
          </div>
        </div>
      )}

      {onWorkspace && (
        <>
          {/* The dashboard stays mounted (hidden) behind the memo so checked
              actions, filters, and the assistant transcript survive the trip. */}
          <div
            className="shellpad split"
            hidden={isMemo}
            style={{ paddingRight: overlay ? 10 : (panelOpen ? panelWidth : 44) + 20 }}
          >
            <div className="frame split">
              <div className="canvas-body">
                <Dashboard
                  sweepId={phase.sweepId}
                  result={phase.result}
                  aiCalls={phase.aiCalls}
                  onReset={() => setPhase({ name: "upload" })}
                  onOpenMemo={() => setPhase({ ...phase, name: "memo" })}
                  overlay={overlay}
                  panelOpen={panelOpen}
                  onPanelOpenChange={setPanelOpen}
                  panelWidth={panelWidth}
                  onPanelWidthChange={setPanelWidth}
                />
              </div>
              <FrameFooter />
            </div>
          </div>
          {isMemo && (
            <div className="shellpad">
              <div className="frame">
                <Memo
                  result={phase.result}
                  onBack={() => setPhase({ ...phase, name: "dashboard" })}
                />
                <FrameFooter />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
