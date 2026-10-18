#!/usr/bin/env python3
"""
evaluation_matrix.py — Slope Stability AI
Regulator-facing evaluation matrix for each trained model, computed on
OUT-OF-FOLD cross-validated predictions (5-fold, seed 42) so every number is
held-out: each row is scored by a model that never saw it.

Metrics per regressor (planar, wedge, toppling):
  R2 (CV)           goodness of fit — the weakest safety signal
  MAE, RMSE         RMSE >> MAE means big-error tail
  MAPE (%)          scale-free (FoS spans a wide range)
  Signed bias       mean(pred - true); POSITIVE = over-predicts FoS = UNCONSERVATIVE
  Signed bias (%)   same, relative
  FN@1.0            unsafe (true FoS<1.0) predicted safe (pred>=1.0) — must be ~0
  FN@1.2 (DGMS rock)  true FoS<1.2 predicted >=1.2
  FN@1.3 (DGMS dump)  true FoS<1.3 predicted >=1.3
  worst miss        largest single UNCONSERVATIVE error (pred-true) and its %

Circular is a CLASSIFIER (predicts stable/unstable, not FoS), so the FoS metrics
are n/a; it gets accuracy, ROC-AUC, and the FN rate that matters: truly-unstable
slopes called stable.

Run from project root:  python3 scripts/evaluation_matrix.py
"""
import os
import sys
import csv
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.metrics import (accuracy_score, roc_auc_score, r2_score,
                             mean_absolute_error, mean_squared_error,
                             precision_score, recall_score)

from tabpfn import TabPFNClassifier, TabPFNRegressor  # local, batchable

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "Src"))
sys.path.insert(0, str(ROOT / "WedgeFailure"))
sys.path.insert(0, str(ROOT / "ToppilingFailure"))
os.chdir(ROOT)

import config
from feature_engineering.FeaturePlane import make_plane_features
from wedge_config import load_data as wedge_load
from topple_config import load_xy as topple_load

SEED = 42
K = 5
THRESHOLDS = [1.0, 1.2, 1.3]  # 1.0 = failure; 1.2 = DGMS rock; 1.3 = DGMS dump


def new_regressor(cpu=False, ignore_limits=False):
    kw = {}
    if cpu:
        kw["device"] = "cpu"
    if ignore_limits:
        kw["ignore_pretraining_limits"] = True
    try:
        return TabPFNRegressor(**kw)
    except TypeError:
        kw.pop("ignore_pretraining_limits", None)
        return TabPFNRegressor(**kw)


def oof_regression(X, y, make_model):
    """Return out-of-fold predictions aligned to y (each row scored held-out)."""
    X = np.asarray(X, float)
    y = np.asarray(y, float)
    oof = np.full(len(y), np.nan)
    kf = KFold(n_splits=K, shuffle=True, random_state=SEED)
    for i, (tr, te) in enumerate(kf.split(X), 1):
        m = make_model()
        m.fit(X[tr], y[tr])
        oof[te] = np.asarray(m.predict(X[te])).ravel()
        print(f"    fold {i}/{K} done", flush=True)
    return y, oof


def fn_rate(y_true, y_pred, t):
    """False-negative rate at FoS threshold t: of truly-unsafe (true<t) rows,
    the fraction the model calls safe (pred>=t). Target 0."""
    unsafe = y_true < t
    n = int(unsafe.sum())
    if n == 0:
        return None, 0, 0
    missed = int(np.sum(unsafe & (y_pred >= t)))
    return missed / n, missed, n


def reg_row(name, y_true, y_pred):
    err = y_pred - y_true                       # signed; + = over-predict = unconservative
    mape = float(np.mean(np.abs(err) / np.abs(y_true)) * 100)
    bias = float(np.mean(err))
    bias_pct = float(np.mean(err / y_true) * 100)
    worst_i = int(np.argmax(err))               # most unconservative single case
    row = {
        "model": name,
        "type": "regressor",
        "n": len(y_true),
        "R2_cv": round(float(r2_score(y_true, y_pred)), 4),
        "MAE": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "RMSE_over_MAE": round(float(np.sqrt(mean_squared_error(y_true, y_pred)) /
                                     mean_absolute_error(y_true, y_pred)), 2),
        "MAPE_pct": round(mape, 2),
        "signed_bias": round(bias, 4),
        "signed_bias_pct": round(bias_pct, 2),
        "worst_miss_FoS": round(float(err[worst_i]), 3),
        "worst_miss_pct": round(float(err[worst_i] / y_true[worst_i] * 100), 1),
        "worst_miss_true_FoS": round(float(y_true[worst_i]), 3),
    }
    for t in THRESHOLDS:
        rate, missed, n = fn_rate(y_true, y_pred, t)
        row[f"FN@{t}"] = (f"{rate*100:.1f}% ({missed}/{n})" if rate is not None else "n/a (no cases)")
    return row


def clf_row(name, y_true, y_pred, proba):
    # positive/dangerous class = unstable (1). FN = unstable called stable.
    unstable = y_true == 1
    n_unstable = int(unstable.sum())
    fn = int(np.sum(unstable & (y_pred == 0)))
    return {
        "model": name,
        "type": "classifier",
        "n": len(y_true),
        "R2_cv": "n/a",
        "MAE": "n/a", "RMSE": "n/a", "RMSE_over_MAE": "n/a", "MAPE_pct": "n/a",
        "signed_bias": "n/a", "signed_bias_pct": "n/a",
        "worst_miss_FoS": "n/a", "worst_miss_pct": "n/a", "worst_miss_true_FoS": "n/a",
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_true, proba)), 4),
        "recall_unstable": round(float(recall_score(y_true, y_pred, pos_label=1)), 4),
        "precision_unstable": round(float(precision_score(y_true, y_pred, pos_label=1)), 4),
        "FN@1.0": f"{fn/n_unstable*100:.1f}% ({fn}/{n_unstable})",
        "FN@1.2": "n/a (binary label, no FoS)",
        "FN@1.3": "n/a (binary label, no FoS)",
    }


def main():
    rows = []

    print("planar ...", flush=True)
    dfp = pd.read_csv(config.PLANE_DATA_PATH)
    yt, yp = oof_regression(make_plane_features(dfp).values, dfp[config.PLANE_TARGET].values,
                            lambda: new_regressor())
    rows.append(reg_row("planar", yt, yp))

    print("wedge ...", flush=True)
    Xw, yw, _ = wedge_load(verbose=False)
    yt, yp = oof_regression(Xw.values, yw.values, lambda: new_regressor(cpu=True))
    rows.append(reg_row("wedge", yt, yp))

    print("toppling ...", flush=True)
    Xt, ytp = topple_load()
    yt, yp = oof_regression(Xt, ytp, lambda: new_regressor(cpu=True, ignore_limits=True))
    rows.append(reg_row("toppling", yt, yp))

    print("circular ...", flush=True)
    dfc = pd.read_csv(config.CIRCULAR_DATA_PATH)
    feats = ["gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u"]
    Xc = dfc[feats].values
    yc = dfc[config.CIRCULAR_TARGET].values.astype(int)
    oof_lab = np.full(len(yc), -1)
    oof_prob = np.full(len(yc), np.nan)
    skf = StratifiedKFold(n_splits=K, shuffle=True, random_state=SEED)
    for i, (tr, te) in enumerate(skf.split(Xc, yc), 1):
        clf = TabPFNClassifier()
        clf.fit(Xc[tr], yc[tr])
        oof_lab[te] = clf.predict(Xc[te])
        oof_prob[te] = clf.predict_proba(Xc[te])[:, 1]
        print(f"    fold {i}/{K} done", flush=True)
    rows.append(clf_row("circular", yc, oof_lab, oof_prob))

    out = ROOT / "figures" / "evaluation_matrix.csv"
    out.parent.mkdir(exist_ok=True)
    # union of keys, stable order
    keyorder = ["model", "type", "n", "R2_cv", "MAE", "RMSE", "RMSE_over_MAE", "MAPE_pct",
                "signed_bias", "signed_bias_pct", "FN@1.0", "FN@1.2", "FN@1.3",
                "worst_miss_FoS", "worst_miss_pct", "worst_miss_true_FoS",
                "accuracy", "roc_auc", "recall_unstable", "precision_unstable"]
    with open(out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=keyorder)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in keyorder})

    # console dump
    for r in rows:
        print("\n" + "=" * 60)
        print(r["model"].upper(), f"({r['type']}, n={r['n']})")
        for k in keyorder[3:]:
            if r.get(k, "") not in ("", "n/a"):
                print(f"  {k:20} {r[k]}")
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
