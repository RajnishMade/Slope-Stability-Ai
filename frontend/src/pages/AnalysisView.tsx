import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import InputPanel from "../components/analysis/InputPanel";
import ResultsPanel from "../components/analysis/ResultsPanel";
import type { RunState, SensState } from "../components/analysis/ResultsPanel";
import SplitHandle from "../components/analysis/SplitHandle";
import SlopeViz from "../components/analysis/viz/SlopeViz";
import { fieldError, fieldsFor } from "../data/analysisConfig";
import { getMode } from "../data/modes";
import type { ModeId } from "../data/modes";
import {
  HANDLE_PX,
  MIN_PANEL_PX,
  useMediaQuery,
  usePanelLayout,
} from "../hooks/usePanelLayout";
import { PREDICT_COST_MS, fetchMetrics, predict, sensitivity, toNumbers } from "../lib/api";
import type { ModelMetrics } from "../lib/api";
import { useInputs } from "../state/InputsProvider";

const EASE = [0.25, 0.1, 0.25, 1] as const;

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden
      className={`transition-transform duration-200 ${up ? "" : "rotate-180"}`}
    >
      <path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Panel({
  label,
  children,
  collapsed = false,
  onToggle,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <section
      className={[
        "flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-glass-border",
        "bg-panel backdrop-blur-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.45)]",
        className,
      ].join(" ")}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-glass-border bg-white/[0.02] px-5 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">{label}</h2>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${label}` : `Minimise ${label}`}
            title={collapsed ? `Expand ${label}` : `Minimise ${label}`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-tertiary transition-colors duration-200 hover:bg-glass-hover hover:text-primary"
          >
            <ChevronIcon up={!collapsed} />
          </button>
        )}
      </header>
      {/* kept mounted while collapsed so the 3D scene and results state survive */}
      <div className={collapsed ? "hidden" : "min-h-0 flex-1"}>{children}</div>
    </section>
  );
}

export default function AnalysisView() {
  const { mode: modeParam } = useParams();
  const navigate = useNavigate();
  const mode = getMode(modeParam ?? "");
  const { values } = useInputs();
  const [run, setRun] = useState<RunState>({ status: "idle" });
  const [sens, setSens] = useState<SensState>({ status: "idle", probes: 0, etaSec: 0 });
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);

  const modeId = (mode?.id ?? "circular") as ModeId;
  const raw = values(modeId);

  // dragging is only offered on the wide (side-by-side) layout
  const isWide = useMediaQuery("(min-width: 1024px)");
  const { layout, setVizFrac, setInputW, toggleCollapse, resetSplit } = usePanelLayout(modeId);
  const rightColRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  // model metrics + dataset provenance are static per mode; fetch once
  useEffect(() => {
    let live = true;
    setMetrics(null);
    fetchMetrics(modeId)
      .then((m) => live && setMetrics(m))
      .catch(() => live && setMetrics(null));
    return () => {
      live = false;
    };
  }, [modeId]);

  const params = useMemo(() => toNumbers(modeId, raw), [modeId, raw]);
  const allValid = useMemo(
    () => fieldsFor(modeId).every((f) => fieldError(f, raw[f.key] ?? "") === null),
    [modeId, raw]
  );

  const nProbes = fieldsFor(modeId).length;

  const doRun = useCallback(async () => {
    if (!allValid) return;
    setRun({ status: "loading" });
    setSens({ status: "idle", probes: nProbes, etaSec: Math.round((nProbes * PREDICT_COST_MS) / 1000) });
    try {
      const payload = toNumbers(modeId, raw);
      const prediction = await predict(modeId, payload);
      setRun({ status: "done", prediction, at: new Date(), params: payload });
    } catch (e) {
      setRun({ status: "error", message: e instanceof Error ? e.message : "Prediction failed" });
    }
  }, [allValid, modeId, raw, nProbes]);

  const doSensitivity = useCallback(async () => {
    if (run.status !== "done") return;
    setSens({ status: "running", done: 0, total: nProbes });
    const items = await sensitivity(modeId, run.params, run.prediction, (done, total) =>
      setSens({ status: "running", done, total })
    );
    setSens({ status: "done", items });
  }, [modeId, run, nProbes]);

  // ---- drag handlers -------------------------------------------------
  const onSplitDrag = useCallback(
    (clientY: number) => {
      const el = rightColRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const usable = r.height - HANDLE_PX;
      if (usable <= 0) return;
      const y = clientY - r.top - HANDLE_PX / 2;
      // clamp so neither panel can be collapsed away by dragging
      const lo = MIN_PANEL_PX / usable;
      const hi = 1 - MIN_PANEL_PX / usable;
      if (lo >= hi) return; // container too short to honour both minimums
      setVizFrac(Math.min(hi, Math.max(lo, y / usable)));
    },
    [setVizFrac]
  );

  const onColumnDrag = useCallback(
    (clientX: number) => {
      const el = shellRef.current;
      if (!el) return;
      setInputW(clientX - el.getBoundingClientRect().left);
    },
    [setInputW]
  );

  if (!mode) return <Navigate to="/" replace />;

  const { vizFrac, inputW, collapsed } = layout;
  const canDrag = isWide && collapsed === "none";

  // grid rows for the right column: fr split, or header-height when collapsed
  const gridRows =
    collapsed === "viz"
      ? `auto ${HANDLE_PX}px 1fr`
      : collapsed === "results"
        ? `1fr ${HANDLE_PX}px auto`
        : `${vizFrac}fr ${HANDLE_PX}px ${1 - vizFrac}fr`;

  return (
    <div className="relative z-10 h-full w-full">
      {/* Fades only — deliberately no scale. A transform on this wrapper is
          included in getBoundingClientRect, so R3F would measure the canvas
          against a scaled rect and size it wrongly until the animation ends. */}
      <motion.div
        className="relative flex h-full flex-col gap-4 p-4 lg:gap-5 lg:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <header className="flex shrink-0 items-center gap-4 rounded-[20px] border border-glass-border bg-panel px-5 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.40)] backdrop-blur-[16px]">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="All mechanisms"
            className="flex shrink-0 items-center gap-2 rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm text-secondary transition-colors duration-200 hover:border-glass-border-hover hover:bg-glass-hover hover:text-primary"
          >
            <span aria-hidden>←</span>
            {/* label collapses to the arrow on phones so the page title has room */}
            <span className="hidden sm:inline">All mechanisms</span>
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-[-0.01em] text-primary">{mode.title} failure</h1>
            <p className="truncate text-sm text-tertiary">{mode.description}</p>
          </div>
          <span className="ml-auto hidden shrink-0 rounded-full border border-glass-border bg-white/[0.04] px-3 py-1 text-xs text-tertiary sm:inline">
            {mode.meta}
          </span>
        </header>

        <div
          ref={shellRef}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:gap-0 lg:overflow-hidden"
        >
          <aside
            className="w-full shrink-0 overflow-hidden rounded-[22px] border border-glass-border bg-panel shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-[16px] lg:h-full"
            style={isWide ? { width: inputW } : undefined}
          >
            <InputPanel mode={modeId} metrics={metrics} onRun={doRun} />
          </aside>

          {/* column divider — width of the input panel */}
          {isWide && (
            <SplitHandle
              orientation="vertical"
              label="Resize input panel"
              onDrag={onColumnDrag}
              onReset={() => setInputW(380)}
            />
          )}

          <main
            ref={rightColRef}
            className="grid min-h-0 flex-1 gap-0 lg:h-full"
            style={
              isWide
                ? { gridTemplateRows: gridRows }
                : // stacked (mobile/tablet): give results enough height for the
                  // headline, verdict and key-figure tiles without a cramped inner scroll
                  { gridTemplateRows: `minmax(320px, auto) 0px minmax(600px, auto)`, rowGap: 16 }
            }
          >
            <Panel
              label="Failure visualisation"
              collapsed={collapsed === "viz"}
              onToggle={isWide ? () => toggleCollapse("viz") : undefined}
            >
              <SlopeViz mode={modeId} params={params} />
            </Panel>

            {/* row divider — split between visualisation and results */}
            <div className="flex items-center justify-center">
              <SplitHandle
                orientation="horizontal"
                disabled={!canDrag}
                label="Resize visualisation and results"
                onDrag={onSplitDrag}
                onReset={resetSplit}
              />
            </div>

            <Panel
              label="Results"
              collapsed={collapsed === "results"}
              onToggle={isWide ? () => toggleCollapse("results") : undefined}
            >
              <ResultsPanel
                mode={modeId}
                state={run}
                sens={sens}
                metrics={metrics}
                onRerun={doRun}
                onMeasureSensitivity={doSensitivity}
              />
            </Panel>
          </main>
        </div>
      </motion.div>
    </div>
  );
}
