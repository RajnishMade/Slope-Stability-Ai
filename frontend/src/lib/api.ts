import { fieldsFor } from "../data/analysisConfig";
import type { ModeId } from "../data/modes";
import type { ModeValues } from "../state/InputsProvider";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000";

/** Frontend mode id -> backend route segment (the plane endpoint is /predict/plane). */
const ROUTE: Record<ModeId, string> = {
  circular: "circular",
  planar: "plane",
  wedge: "wedge",
  toppling: "toppling",
};

/**
 * Circular is a CLASSIFIER (stable/unstable + probability); the other three are
 * FoS REGRESSORS. The UI has to represent both honestly.
 */
export type Prediction =
  | { kind: "fos"; fos: number }
  | { kind: "classification"; label: string; failureProbability: number; stableProbability: number };

export function toNumbers(mode: ModeId, values: ModeValues): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of fieldsFor(mode)) out[f.key] = Number(values[f.key]);
  return out;
}

/** A single TabPFN inference costs ~2.4 s, so requests are never fired in parallel. */
export const PREDICT_COST_MS = 2400;

export async function predict(mode: ModeId, payload: Record<string, number>): Promise<Prediction> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/predict/${ROUTE[mode]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Solver timed out after 45s — it may be busy.");
    }
    throw new Error("Could not reach the solver API.");
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Solver returned ${res.status} ${res.statusText}`);
  const data = await res.json();

  if (mode === "circular") {
    return {
      kind: "classification",
      label: data.label,
      failureProbability: data.failure_probability,
      stableProbability: data.stable_probability,
    };
  }
  return { kind: "fos", fos: data.fos };
}

/** The single scalar we rank sensitivity against (higher = safer for FoS modes). */
function metricOf(p: Prediction): number {
  return p.kind === "fos" ? p.fos : p.failureProbability;
}

export interface Sensitivity {
  key: string;
  label: string;
  unit: string;
  /** Change in the metric for the applied step. */
  delta: number;
  /** Sign of influence on the metric per unit increase of the parameter. */
  direction: "up" | "down" | "flat";
}

/**
 * Local one-at-a-time sensitivity measured against the LIVE model: each
 * parameter is nudged by 5% of its range and re-predicted. Nothing here is
 * assumed or hardcoded — it is the model's own response.
 *
 * Runs STRICTLY SEQUENTIALLY: the solver is a single worker and firing these
 * in parallel saturates it (measured: concurrent requests deadlock it).
 */
export async function sensitivity(
  mode: ModeId,
  payload: Record<string, number>,
  base: Prediction,
  onProgress?: (done: number, total: number) => void
): Promise<Sensitivity[]> {
  const baseMetric = metricOf(base);
  const fields = fieldsFor(mode);
  const runs: { key: string; label: string; unit: string; delta: number }[] = [];

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const step = (f.max - f.min) * 0.05;
    let probe = payload[f.key] + step;
    let sign = 1;
    if (probe > f.max) {
      probe = payload[f.key] - step;
      sign = -1;
    }
    try {
      const p = await predict(mode, { ...payload, [f.key]: probe });
      runs.push({
        key: f.key,
        label: f.label,
        unit: f.unit,
        delta: (metricOf(p) - baseMetric) * sign, // per unit increase
      });
    } catch {
      /* skip this parameter and carry on */
    }
    onProgress?.(i + 1, fields.length);
  }

  return runs
    .map((r) => ({
      ...r,
      direction: (Math.abs(r.delta) < 1e-4 ? "flat" : r.delta > 0 ? "up" : "down") as Sensitivity["direction"],
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Model metrics + dataset provenance (from GET /metrics/:mode)        */
/* ------------------------------------------------------------------ */

export interface ModelMetrics {
  task: "regression" | "classification";
  metrics: {
    r2?: number;
    rmse?: number;
    mae?: number;
    accuracy?: number;
    roc_auc?: number;
    n_train: number;
    n_test: number;
  };
  plain: string;
  dataset: {
    rows: number;
    n_features: number;
    source_kind: "real" | "synthetic" | "mixed";
    real_pct: number;
    synthetic_pct: number;
    provenance: string;
    ranges: Record<string, [number, number]>;
  };
}

export async function fetchMetrics(mode: ModeId): Promise<ModelMetrics> {
  // metrics are keyed by the frontend mode id (circular/planar/wedge/toppling),
  // NOT the predict-route segment — the plane predict route is /predict/plane
  // but its metrics live under /metrics/planar.
  const res = await fetch(`${API_BASE}/metrics/${mode}`);
  if (!res.ok) throw new Error(`Metrics unavailable (${res.status})`);
  return res.json();
}

/** Parameters whose current value falls outside the model's training range. */
export function outOfRange(
  metrics: ModelMetrics,
  payload: Record<string, number>
): { key: string; value: number; min: number; max: number }[] {
  const flags: { key: string; value: number; min: number; max: number }[] = [];
  for (const [key, [min, max]] of Object.entries(metrics.dataset.ranges)) {
    const v = payload[key];
    if (Number.isFinite(v) && (v < min || v > max)) flags.push({ key, value: v, min, max });
  }
  return flags;
}

/** DGMS minimum factor of safety by material type. */
export function dgmsThreshold(mode: ModeId): { value: number; material: string } {
  // Circular here is the dump / overburden case; the rock modes take 1.2.
  return mode === "circular" ? { value: 1.3, material: "dump" } : { value: 1.2, material: "rock" };
}

/** Analysis provenance shown in the results panel. */
export const METHOD: Record<ModeId, { method: string; model: string; data: string }> = {
  circular: {
    method: "Stability classification (stable / unstable)",
    model: "TabPFN classifier",
    data: "Curated circular-failure case set",
  },
  planar: {
    method: "Limit-equilibrium planar sliding",
    model: "TabPFN regressor",
    data: "Curated plane-failure case set",
  },
  wedge: {
    method: "Block theory wedge sliding (Hoek & Bray / SWedge)",
    model: "TabPFN regressor",
    data: "Stage-1 synthetic solver set (pretrain only)",
  },
  toppling: {
    method: "Goodman–Bray block toppling",
    model: "TabPFN regressor",
    data: "Stage-1 synthetic solver set (pretrain only)",
  },
};
