import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, METHOD, dgmsThreshold, outOfRange } from "../../lib/api";
import type { ModelMetrics, Prediction, Sensitivity } from "../../lib/api";
import type { ModeId } from "../../data/modes";
import { fieldsFor } from "../../data/analysisConfig";

export type RunState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "done";
      prediction: Prediction;
      at: Date;
      params: Record<string, number>;
    };

/** Sensitivity is measured separately — each probe is a full model inference. */
export type SensState =
  | { status: "idle"; probes: number; etaSec: number }
  | { status: "running"; done: number; total: number }
  | { status: "done"; items: Sensitivity[] };

/* Status colours come from the design tokens (index.css). */
const SAFE = "var(--color-safe)";
const WARN = "var(--color-warning)";
const CRIT = "var(--color-critical)";

type Tone = "safe" | "warn" | "crit" | "neutral";
const TONE_TEXT: Record<Tone, string> = {
  safe: "text-safe-fg",
  warn: "text-warning-fg",
  crit: "text-critical-fg",
  neutral: "text-primary",
};

function fosTone(fos: number, threshold: number): Tone {
  if (fos >= threshold) return "safe";
  if (fos >= threshold * 0.9) return "warn";
  return "crit";
}

/**
 * A short reliability caveat shown under the headline, so the model's known
 * limitations travel with every result: synthetic-trained (wedge/toppling),
 * classifier-not-FoS (circular), or field-informed (planar).
 */
function reliabilityBadge(mode: ModeId): { text: string; tone: "amber" | "neutral" } {
  switch (mode) {
    case "wedge":
    case "toppling":
      return { text: "Synthetic solver-trained · screening only, not field-validated", tone: "amber" };
    case "circular":
      return { text: "Classifier on real cases · screening only (~21% missed failures in testing)", tone: "amber" };
    default:
      return { text: "Trained on field + textbook cases", tone: "neutral" };
  }
}

function Row({ label, value, muted = false }: { label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-glass-border/60 py-1.5 last:border-b-0">
      <span className="text-sm text-tertiary">{label}</span>
      <span className={`text-right text-sm tabular-nums ${muted ? "text-tertiary" : "text-primary"}`}>{value}</span>
    </div>
  );
}

/** A key figure: small label over a large value. */
function Tile({ label, value, sub, tone = "neutral" }: { label: string; value: React.ReactNode; sub?: string; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-glass-border bg-white/[0.035] px-3.5 py-3">
      <div className="text-xs text-tertiary">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums tracking-[-0.01em] ${TONE_TEXT[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-tertiary">{sub}</div>}
    </div>
  );
}

/** Collapsible detail section (native <details> — keyboard + screen-reader friendly). */
function Details({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex items-center gap-2 text-xs font-normal text-tertiary">
          {hint}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="transition-transform duration-200 group-open:rotate-180">
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function Skeleton() {
  return (
    <div className="p-5" aria-busy="true" aria-live="polite">
      <p className="mb-1 text-sm text-secondary">Running prediction…</p>
      <p className="mb-5 text-xs text-tertiary">The first run for a mechanism can take a few seconds while its model loads.</p>
      <div className="animate-pulse space-y-4">
        <div className="h-12 w-44 rounded-lg bg-white/8" />
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[68px] rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="h-3 w-3/4 rounded bg-white/6" />
        <div className="h-3 w-1/2 rounded bg-white/6" />
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="flex shrink-0 items-start gap-2 border-t border-glass-border bg-white/[0.03] px-4 py-2.5 backdrop-blur-md">
      <svg width="14" height="14" viewBox="0 0 16 16" className="mt-px shrink-0 text-tertiary" aria-hidden>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <rect x="7.3" y="6.6" width="1.4" height="5" rx="0.7" fill="currentColor" />
        <circle cx="8" cy="4.6" r="0.85" fill="currentColor" />
      </svg>
      <p className="text-xs leading-relaxed text-tertiary">
        Model-generated results may contain errors and must not be the sole basis for slope design or operational
        decisions. Verify against site-specific data and the applicable DGMS regulations before use.
      </p>
    </div>
  );
}

/** Human label for a field key, from the mode config. */
function labelFor(mode: ModeId, key: string): string {
  return fieldsFor(mode).find((f) => f.key === key)?.label ?? key;
}

/** Above this panel width the key-figure tiles sit in one row of four. */
const WIDE_MIN_W = 620;

/**
 * Tracks an element's width so content can reflow to the space it has.
 *
 * Uses a CALLBACK ref, not a ref object + mount effect: the measured element
 * only exists in the "done" branch, so an effect running at mount (while the
 * panel is idle) would find nothing and never re-attach.
 */
function useWidth<T extends HTMLElement>() {
  const [w, setW] = useState(0);
  const obs = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    obs.current?.disconnect();
    obs.current = null;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    ro.observe(node);
    obs.current = ro;
    setW(node.getBoundingClientRect().width);
  }, []);

  useEffect(() => () => obs.current?.disconnect(), []);

  return [ref, w] as const;
}

const btn =
  "rounded-lg border border-glass-border bg-glass px-3 py-1.5 text-sm text-secondary transition-colors hover:border-glass-border-hover hover:bg-glass-hover hover:text-primary";

export default function ResultsPanel({
  mode,
  state,
  sens,
  metrics,
  onRerun,
  onMeasureSensitivity,
}: {
  mode: ModeId;
  state: RunState;
  sens: SensState;
  metrics: ModelMetrics | null;
  onRerun: () => void;
  onMeasureSensitivity: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // measured before any early return — hook order must stay stable
  const [scrollRef, panelW] = useWidth<HTMLDivElement>();
  const wide = panelW >= WIDE_MIN_W;
  const meta = METHOD[mode];
  const dgms = dgmsThreshold();

  function reportText(): string {
    if (state.status !== "done") return "";
    const lines: string[] = [
      `Slope Stability AI — ${mode} failure analysis`,
      `Generated: ${state.at.toISOString()}`,
      ``,
      `Method: ${meta.method}`,
      `Model:  ${meta.model}`,
      `Data:   ${meta.data}`,
      ``,
      `INPUTS`,
      ...Object.entries(state.params).map(([k, v]) => `  ${k} = ${v}`),
      ``,
      `RESULT`,
    ];
    if (state.prediction.kind === "fos") {
      const fos = state.prediction.fos;
      lines.push(`  Predicted FoS: ${fos.toFixed(3)}`);
      lines.push(
        `  DGMS minimum FoS (Circular 03/2020, para 3.2): ${dgms.value.toFixed(2)} working / ${dgms.permanent.toFixed(2)} permanent`
      );
      lines.push(`  Assessment vs working minimum: ${fos >= dgms.value ? "MEETS" : "BELOW THRESHOLD"}`);
    } else {
      lines.push(`  Classification: ${state.prediction.label}`);
      lines.push(`  Failure probability: ${(state.prediction.failureProbability * 100).toFixed(1)}%`);
    }
    if (sens.status === "done") {
      lines.push(``, `SENSITIVITY (model response, one-at-a-time)`);
      sens.items.forEach((s) =>
        lines.push(`  ${s.label}: ${s.direction === "up" ? "increases" : s.direction === "down" ? "decreases" : "no effect on"} the result`)
      );
    }
    lines.push(
      ``,
      `DISCLAIMER: Model-generated output. May contain errors. Not to be relied upon as the sole`,
      `basis for slope design or operational decisions. Verify against site-specific data and DGMS`,
      `regulations before use.`
    );
    return lines.join("\n");
  }

  async function copy() {
    await navigator.clipboard.writeText(reportText());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function exportReport() {
    const blob = new Blob([reportText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slope-stability-${mode}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------- non-result states ---------- */
  if (state.status === "idle") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-glass-border bg-glass text-accent" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 16h14M5 16V11M9 16V7M13 16V9M17 16V4" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-base font-medium text-primary">No prediction yet</p>
          <p className="max-w-sm text-sm text-tertiary">
            Set the parameters and press <span className="text-secondary">Run prediction</span> to see the factor of
            safety, DGMS check and key figures.
          </p>
        </div>
        <Disclaimer />
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-hidden">
          <Skeleton />
        </div>
        <Disclaimer />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center" role="alert">
          <p className="text-base font-medium text-critical-fg">{state.message}</p>
          <p className="text-sm text-tertiary">
            The prediction API must be reachable at <code className="text-secondary">{API_BASE}</code>.
          </p>
          <button type="button" onClick={onRerun} className={btn}>
            Retry
          </button>
        </div>
        <Disclaimer />
      </div>
    );
  }

  /* ---------- results ---------- */
  const pred = state.prediction;
  const isFos = pred.kind === "fos";
  const fos = isFos ? pred.fos : null;
  const tone: Tone = isFos ? fosTone(pred.fos, dgms.value) : pred.failureProbability > 0.5 ? "crit" : "safe";
  const headColor = tone === "safe" ? SAFE : tone === "warn" ? WARN : CRIT;
  const passes = isFos ? pred.fos >= dgms.value : pred.label !== "UNSTABLE";
  const flags = metrics ? outOfRange(metrics, state.params) : [];
  const badge = reliabilityBadge(mode);

  const verdict = isFos
    ? passes
      ? { text: `Meets DGMS minimum (${dgms.value.toFixed(2)})`, tone: "safe" as Tone }
      : tone === "warn"
        ? { text: `Marginal — below DGMS ${dgms.value.toFixed(2)}`, tone: "warn" as Tone }
        : { text: `Below DGMS minimum (${dgms.value.toFixed(2)})`, tone: "crit" as Tone }
    : { text: `${(pred.failureProbability * 100).toFixed(1)}% failure probability`, tone };

  const pillCls: Record<Tone, string> = {
    safe: "border-safe/40 bg-safe/12 text-safe-fg",
    warn: "border-warning/40 bg-warning/12 text-warning-fg",
    crit: "border-critical/40 bg-critical/12 text-critical-fg",
    neutral: "border-glass-border bg-glass text-secondary",
  };

  // prefer the 5-fold CV figure (mean ± std); fall back to the single held-out split
  const cv = metrics?.cv;
  const r2Text = cv?.r2 ? `${cv.r2.mean.toFixed(2)} ± ${cv.r2.std.toFixed(2)}` : metrics?.metrics.r2?.toFixed(3) ?? "—";
  const accText = cv?.accuracy
    ? `${(cv.accuracy.mean * 100).toFixed(0)}% ± ${(cv.accuracy.std * 100).toFixed(0)}`
    : metrics?.metrics.accuracy != null
      ? `${(metrics.metrics.accuracy * 100).toFixed(0)}%`
      : "—";
  const rmse = metrics?.metrics.rmse;
  const band = fos != null && rmse != null ? [Math.max(0, fos - 1.96 * rmse), fos + 1.96 * rmse] : null;
  const margin = fos != null ? ((fos - dgms.value) / dgms.value) * 100 : null;

  const sensHint =
    sens.status === "idle" ? "Not measured" : sens.status === "running" ? `Measuring ${sens.done}/${sens.total}…` : "Top 5";

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {/* ---- headline ---- */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <span
                className="text-5xl font-semibold leading-none tracking-[-0.03em] tabular-nums"
                style={{ color: headColor }}
              >
                {isFos ? fos!.toFixed(2) : pred.label}
              </span>
              <div className="pb-0.5">
                <div className="text-sm text-tertiary">{isFos ? "Factor of safety" : "Stability class"}</div>
                <span
                  className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${pillCls[verdict.tone]}`}
                >
                  {verdict.text}
                </span>
              </div>
            </div>
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                badge.tone === "amber"
                  ? "border-warning/35 bg-warning/10 text-warning-fg"
                  : "border-glass-border bg-white/[0.04] text-tertiary"
              }`}
            >
              {badge.tone === "amber" && <span aria-hidden>⚠</span>}
              {badge.text}
            </span>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={copy} className={btn}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={exportReport} className={btn}>
              Export
            </button>
            <button
              type="button"
              onClick={onRerun}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Re-run
            </button>
          </div>
        </div>

        {/* ---- extrapolation alert (never hidden in a collapsed section) ---- */}
        {flags.length > 0 && (
          <div className="mt-4 rounded-xl border border-warning/35 bg-warning/10 px-4 py-3" role="alert">
            <p className="text-sm font-medium text-warning-fg">
              ⚠ {flags.length} input{flags.length > 1 ? "s are" : " is"} outside the training range — treat this
              result with extra caution.
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {flags.map((f) => (
                <li key={f.key} className="text-xs text-warning-fg/90">
                  {labelFor(mode, f.key)} = {f.value} (trained {f.min}–{f.max})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---- key figures ---- */}
        <div className={`mt-4 grid gap-2.5 ${wide ? "grid-cols-4" : "grid-cols-2"}`}>
          {isFos ? (
            <>
              <Tile
                label="95% prediction band"
                value={band ? `${band[0].toFixed(2)} – ${band[1].toFixed(2)}` : "—"}
                sub="± 1.96 × validation RMSE"
              />
              <Tile
                label={`Margin vs ${dgms.value.toFixed(2)}`}
                value={margin != null ? `${margin >= 0 ? "+" : ""}${margin.toFixed(0)}%` : "—"}
                tone={margin != null ? (margin >= 0 ? "safe" : "crit") : "neutral"}
                sub="working slope"
              />
              <Tile
                label={`Permanent slope (${dgms.permanent.toFixed(2)})`}
                value={fos! >= dgms.permanent ? "Meets" : "Below"}
                tone={fos! >= dgms.permanent ? "safe" : "crit"}
                sub="long-standing walls"
              />
              <Tile label="Model R² (held-out)" value={r2Text} sub={cv?.r2 ? "5-fold cross-validation" : "test split"} />
            </>
          ) : (
            <>
              <Tile
                label="Failure probability"
                value={`${(pred.failureProbability * 100).toFixed(1)}%`}
                tone={pred.failureProbability > 0.5 ? "crit" : "safe"}
              />
              <Tile label="Stable probability" value={`${(pred.stableProbability * 100).toFixed(1)}%`} />
              <Tile label="Model accuracy" value={accText} sub={cv?.accuracy ? "5-fold cross-validation" : "test split"} />
              <Tile
                label="ROC-AUC"
                value={cv?.roc_auc ? cv.roc_auc.mean.toFixed(2) : metrics?.metrics.roc_auc?.toFixed(2) ?? "—"}
                sub="ranking quality"
              />
            </>
          )}
        </div>

        {/* ---- interpretation ---- */}
        <div className="mt-4 rounded-xl border border-glass-border bg-white/[0.035] px-4 py-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">Interpretation</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-secondary">
            {isFos ? (
              passes ? (
                <>
                  The predicted factor of safety of <strong className="text-primary">{fos!.toFixed(2)}</strong> meets the
                  DGMS working-slope minimum of {dgms.value.toFixed(2)} by {margin!.toFixed(0)}%.
                  {fos! < dgms.permanent
                    ? ` It is below the ${dgms.permanent.toFixed(2)} required for permanent or long-standing slopes.`
                    : ` It also meets the ${dgms.permanent.toFixed(2)} required for permanent slopes.`}
                </>
              ) : (
                <>
                  The predicted factor of safety of <strong className="text-primary">{fos!.toFixed(2)}</strong> is below
                  the DGMS working-slope minimum of {dgms.value.toFixed(2)}. Treat this geometry as inadequate as entered —
                  flattening or lowering the slope, or improving drainage, are the usual levers.
                </>
              )
            ) : (
              <>
                The model classifies this slope as <strong className="text-primary">{pred.label}</strong> with a{" "}
                {(pred.failureProbability * 100).toFixed(1)}% failure probability. Treat this as a screening indicator; a
                numeric factor of safety is required for a DGMS compliance assessment (≥ {dgms.value.toFixed(2)} working,
                ≥ {dgms.permanent.toFixed(2)} permanent).
              </>
            )}
          </p>
        </div>

        {/* ---- details ---- */}
        <div className="mt-4 divide-y divide-glass-border overflow-hidden rounded-xl border border-glass-border">
          <Details title="Most influential parameters" hint={sensHint}>
            {sens.status === "idle" && (
              <>
                <p className="mb-3 text-sm leading-relaxed text-tertiary">
                  Measured empirically by re-querying the model once per parameter ({sens.probes} queries, about{" "}
                  {sens.etaSec}s).
                </p>
                <button type="button" onClick={onMeasureSensitivity} className={btn}>
                  Measure sensitivity
                </button>
              </>
            )}

            {sens.status === "running" && (
              <>
                <p className="mb-2 text-sm text-secondary">
                  Probing parameter {sens.done} of {sens.total}…
                </p>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={sens.total}
                  aria-valuenow={sens.done}
                >
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${(sens.done / sens.total) * 100}%` }}
                  />
                </div>
              </>
            )}

            {sens.status === "done" &&
              (sens.items.length === 0 ? (
                <p className="text-sm text-tertiary">Sensitivity unavailable.</p>
              ) : (
                <>
                  {sens.items.map((s) => (
                    <Row
                      key={s.key}
                      label={s.label}
                      value={
                        <span
                          className={
                            s.direction === "up" ? "text-safe-fg" : s.direction === "down" ? "text-critical-fg" : "text-tertiary"
                          }
                        >
                          {s.direction === "up" ? "↑ raises" : s.direction === "down" ? "↓ lowers" : "· negligible"}
                        </span>
                      }
                    />
                  ))}
                  <p className="mt-2 text-xs leading-relaxed text-tertiary">
                    Each parameter nudged by 5% of its range; direction is the model's own response.
                  </p>
                </>
              ))}
          </Details>

          <Details title="Model accuracy detail">
            {!metrics ? (
              <p className="text-sm text-tertiary">Model metrics unavailable.</p>
            ) : isFos ? (
              <>
                <Row label="R² — test split" value={metrics.metrics.r2?.toFixed(3) ?? "—"} />
                {cv?.r2 && <Row label="R² — 5-fold CV" value={r2Text} />}
                <Row label="RMSE (test)" value={`±${metrics.metrics.rmse?.toFixed(3)} FoS`} />
                <Row label="MAE (test)" value={`±${metrics.metrics.mae?.toFixed(3)} FoS`} />
                <Row label="Held-out cases" value={`${metrics.metrics.n_test} of ${metrics.dataset.rows}`} muted />
                <p className="mt-2 text-xs leading-relaxed text-tertiary">{metrics.plain}</p>
              </>
            ) : (
              <>
                <Row label="Accuracy — test split" value={`${((metrics.metrics.accuracy ?? 0) * 100).toFixed(0)}%`} />
                {cv?.accuracy && <Row label="Accuracy — 5-fold CV" value={accText} />}
                <Row label="ROC-AUC (test)" value={metrics.metrics.roc_auc?.toFixed(3) ?? "—"} />
                <Row label="Held-out cases" value={`${metrics.metrics.n_test} of ${metrics.dataset.rows}`} muted />
                <p className="mt-2 text-xs leading-relaxed text-tertiary">{metrics.plain}</p>
              </>
            )}
          </Details>

          <Details
            title="Dataset information"
            hint={
              metrics ? (
                flags.length === 0 ? (
                  <span className="text-safe-fg">✓ inputs in range</span>
                ) : (
                  <span className="text-warning-fg">⚠ {flags.length} outside</span>
                )
              ) : undefined
            }
          >
            {!metrics ? (
              <p className="text-sm text-tertiary">Dataset information unavailable.</p>
            ) : (
              <>
                <Row
                  label="Data source"
                  value={
                    metrics.dataset.source_kind === "mixed"
                      ? `Mixed — ${metrics.dataset.real_pct}% real / ${metrics.dataset.synthetic_pct}% synthetic`
                      : metrics.dataset.source_kind === "real"
                        ? "Real-world field data"
                        : "Synthetic (solver-generated)"
                  }
                />
                <Row label="Training rows" value={metrics.dataset.rows} />
                <Row label="Input features" value={metrics.dataset.n_features} />
                <p className="mt-2 text-xs leading-relaxed text-tertiary">{metrics.dataset.provenance}</p>
              </>
            )}
          </Details>

          <Details title="Method">
            <Row label="Analysis" value={meta.method} />
            <Row label="Model" value={meta.model} />
            <Row label="Training data" value={meta.data} />
            <Row label="Run at" value={state.at.toLocaleTimeString()} />
          </Details>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
