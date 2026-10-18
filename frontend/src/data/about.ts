/* ============================================================================
 *  ABOUT / METHODOLOGY — PAGE CONTENT   (edit here, not in the page component)
 *  Numbers match the held-out results on the Validation page
 *  (scripts/evaluate_models.py, 5-fold cross-validation, seed 42).
 * ========================================================================== */

export const ABOUT_INTRO =
  "Slope Stability AI estimates how close an open-cast mine slope is to failure. For each of the four " +
  "classic failure mechanisms it uses a dedicated machine-learning model, trained on the cases for that " +
  "mechanism, and checks the result against the minimum factors of safety in DGMS (Tech) Circular No. 03 of 2020.";

export interface PipelineStep {
  title: string;
  body: string;
}

/** The prediction pipeline, left → right. */
export const PIPELINE: PipelineStep[] = [
  {
    title: "Site inputs",
    body: "Slope geometry, shear strength (c, φ), unit weight, groundwater and seismic loading — the set differs per mechanism.",
  },
  {
    title: "Range check",
    body: "Every input is compared with the model's training envelope; anything outside it is flagged as extrapolation.",
  },
  {
    title: "TabPFN model",
    body: "A pretrained transformer approximates the Bayesian posterior predictive p(y | x, D) over the mechanism's training cases in one forward pass.",
  },
  {
    title: "Prediction",
    body: "A factor of safety with a 95% band (planar, wedge, toppling), or a failure probability (circular classifier).",
  },
  {
    title: "DGMS check",
    body: "FoS is compared with ≥ 1.30 for working slopes and ≥ 1.50 for permanent ones (Circular 03/2020, para 3.2).",
  },
];

export interface ModelRow {
  mechanism: string;
  output: string;
  data: string;
  cases: string;
  heldOut: string;
}

export const MODELS: ModelRow[] = [
  { mechanism: "Circular", output: "Stable / unstable", data: "Published field case histories", cases: "184", heldOut: "Accuracy 0.79 ± 0.03" },
  { mechanism: "Planar", output: "Factor of safety", data: "128 field + 21 textbook cases", cases: "149", heldOut: "R² 0.94 ± 0.09" },
  { mechanism: "Wedge", output: "Factor of safety", data: "Block-theory solver (synthetic)", cases: "280", heldOut: "R² 0.86 ± 0.04" },
  { mechanism: "Toppling", output: "Factor of safety", data: "Goodman–Bray solver (synthetic)", cases: "600", heldOut: "R² 0.96 ± 0.02" },
];

export const WHY_TABPFN =
  "On these small tabular datasets (149–600 rows) TabPFN outperformed tuned-default RandomForest and " +
  "XGBoost on every mechanism under identical 5-fold cross-validation — decisively on the three FoS " +
  "models (wedge R² 0.86 vs 0.49 and 0.60) — with no hyper-parameter tuning.";

export const LIMITATIONS: string[] = [
  "Wedge and toppling models learn from solver-generated (synthetic) data: they reproduce the limit-equilibrium solvers faithfully but are not yet validated against field failures.",
  "The circular model is a classifier on real cases and misses about 21% of failures in held-out testing — use it as a screening indicator only.",
  "No model reaches a zero false-negative rate, so none should be the sole basis for a slope-design or operational decision.",
  "Predictions outside the training range are extrapolations and are flagged as such in the input panel.",
  "Results support — and never replace — a site-specific slope-stability study by a competent person under CMR 2017, Reg. 106.",
];

export const TECH_STACK: { area: string; items: string }[] = [
  { area: "Models", items: "TabPFN (Prior Labs) — classifier & regressors" },
  { area: "API", items: "Python · FastAPI · Uvicorn · pandas · scikit-learn" },
  { area: "Interface", items: "React · TypeScript · Vite · Tailwind CSS · Three.js (react-three-fiber)" },
  { area: "Deployment", items: "Vercel — website and serverless API" },
];

/** Optional credits — add names here and a "Credits" card appears; empty = hidden. */
export const CREDITS: string[] = [];
