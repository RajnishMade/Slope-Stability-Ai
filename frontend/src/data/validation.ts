/* ============================================================================
 *  MODEL & VALIDATION — PAGE CONTENT   (edit here, not in the page component)
 * ----------------------------------------------------------------------------
 *  Numbers below come from the offline validation scripts in /scripts:
 *    • scripts/evaluate_models.py      → 5-fold cross-validation metrics
 *    • scripts/model_comparison.py     → TabPFN vs RandomForest vs XGBoost
 *    • scripts/confusion_matrix.py     → stable/unstable confusion matrices
 *    • scripts/verify_sensitivity.py   → physics direction checks
 *  All are held-out (out-of-fold) results — every row scored by a model that
 *  never saw it. Re-run those scripts and update the figures in
 *  public/validation/ + the numbers here if the datasets change.
 * ========================================================================== */

export interface CvRow {
  model: string;
  task: "FoS regressor" | "Classifier";
  primary: string; // headline metric text
  detail: string; // supporting metrics
}

/** 5-fold CV, mean ± std. */
export const CV_METRICS: CvRow[] = [
  { model: "Planar", task: "FoS regressor", primary: "R² 0.94 ± 0.09", detail: "MAE 0.06 · RMSE 0.15 FoS" },
  { model: "Wedge", task: "FoS regressor", primary: "R² 0.86 ± 0.04", detail: "MAE 0.15 · RMSE 0.24 FoS" },
  { model: "Toppling", task: "FoS regressor", primary: "R² 0.96 ± 0.02", detail: "MAE 0.04 · RMSE 0.08 FoS" },
  { model: "Circular", task: "Classifier", primary: "Accuracy 0.79 ± 0.03", detail: "ROC-AUC 0.89 ± 0.03" },
];

export interface CompareRow {
  dataset: string;
  metric: string;
  tabpfn: number;
  rf: number;
  xgb: number;
}

/** Same folds, same features, higher = better. */
export const COMPARISON: CompareRow[] = [
  { dataset: "Planar", metric: "R²", tabpfn: 0.967, rf: 0.839, xgb: 0.919 },
  { dataset: "Wedge", metric: "R²", tabpfn: 0.863, rf: 0.488, xgb: 0.598 },
  { dataset: "Toppling", metric: "R²", tabpfn: 0.962, rf: 0.705, xgb: 0.783 },
  { dataset: "Circular", metric: "Accuracy", tabpfn: 0.788, rf: 0.783, xgb: 0.777 },
];

export interface ConfusionRow {
  model: string;
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  accuracyPct: number;
  fnRatePct: number;
}

/** Positive class = UNSTABLE. FN = an unstable slope called safe. Threshold FoS<1.0 (circular: native label). */
export const CONFUSION: ConfusionRow[] = [
  { model: "Planar", tn: 73, fp: 5, fn: 3, tp: 68, accuracyPct: 95, fnRatePct: 4.2 },
  { model: "Wedge", tn: 191, fp: 10, fn: 18, tp: 61, accuracyPct: 90, fnRatePct: 22.8 },
  { model: "Toppling", tn: 286, fp: 14, fn: 9, tp: 291, accuracyPct: 96, fnRatePct: 3.0 },
  { model: "Circular", tn: 68, fp: 18, fn: 21, tp: 77, accuracyPct: 79, fnRatePct: 21.4 },
];

export const SENSITIVITY_SUMMARY =
  "24 of 26 physics-direction checks pass (92%). Each input was swept across its range " +
  "with the others held at the median; the model's predicted response was checked against " +
  "the expected geotechnical direction (e.g. more cohesion → higher FoS, more water → lower FoS). " +
  "The two exceptions are the circular classifier's friction-angle and slope-angle responses, " +
  "which are non-monotonic at the tested baseline — consistent with it being the weakest model.";

export const VALIDATION_TAKEAWAYS: string[] = [
  "TabPFN beats RandomForest and XGBoost on every failure mode — decisively on the three FoS regressors (wedge R² 0.86 vs 0.49 / 0.60), and marginally on the circular classifier.",
  "Wedge and toppling are trained on synthetic solver data (pretrain-only): the metrics measure how faithfully the model reproduces the solver, not field accuracy.",
  "No model reaches a zero false-negative rate, so none is safe as a sole arbiter — wedge (22.8%) and the real-data circular classifier (21.4%) miss the most failures and are screening tools only.",
  "Toppling and planar are the strongest and best-behaved; planar is the most field-informed regressor.",
];
