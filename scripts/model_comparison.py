#!/usr/bin/env python3
"""
model_comparison.py — Slope Stability AI
Head-to-head: TabPFN vs RandomForest vs XGBoost, same datasets, same 5-fold CV
(seed 42), same feature matrices. Every metric is on pooled out-of-fold
predictions, so all three models are judged on identical held-out rows.

Regressors (planar, wedge, toppling): R2, MAE, RMSE.
Circular (classifier): accuracy, ROC-AUC.

Run from project root:  python3 scripts/model_comparison.py
Outputs: figures/model_comparison.csv , figures/model_comparison.png
"""
import os, sys, csv
# XGBoost and TabPFN (PyTorch) each ship an OpenMP runtime; loading both in one
# process segfaults on macOS (duplicate libomp). Allow it and pin threads BEFORE
# numpy/torch/xgboost import.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("OMP_NUM_THREADS", "1")
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.metrics import (r2_score, mean_absolute_error, mean_squared_error,
                             accuracy_score, roc_auc_score)
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from xgboost import XGBRegressor, XGBClassifier
from tabpfn import TabPFNRegressor, TabPFNClassifier

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "Src"))
sys.path.insert(0, str(ROOT / "WedgeFailure")); sys.path.insert(0, str(ROOT / "ToppilingFailure"))
os.chdir(ROOT)

import config
from feature_engineering.FeaturePlane import make_plane_features
from wedge_config import load_data as wedge_load
from topple_config import load_xy as topple_load

SEED, K = 42, 5


def tabpfn_reg(cpu=False, ig=False):
    kw = {}
    if cpu: kw["device"] = "cpu"
    if ig: kw["ignore_pretraining_limits"] = True
    try: return TabPFNRegressor(**kw)
    except TypeError: return TabPFNRegressor(device="cpu") if cpu else TabPFNRegressor()

def rf_reg():  return RandomForestRegressor(n_estimators=400, random_state=SEED, n_jobs=-1)
def xgb_reg(): return XGBRegressor(n_estimators=400, max_depth=4, learning_rate=0.05,
                                   subsample=0.9, colsample_bytree=0.9, random_state=SEED, n_jobs=-1)

REG_MODELS = {"TabPFN": None, "RandomForest": rf_reg, "XGBoost": xgb_reg}  # TabPFN factory set per-dataset


def oof_reg(X, y, make_model):
    X = np.asarray(X, float); y = np.asarray(y, float)
    oof = np.full(len(y), np.nan)
    for tr, te in KFold(n_splits=K, shuffle=True, random_state=SEED).split(X):
        m = make_model(); m.fit(X[tr], y[tr]); oof[te] = np.asarray(m.predict(X[te])).ravel()
    return oof

def reg_metrics(y, p):
    return {"R2": round(r2_score(y, p), 4),
            "MAE": round(mean_absolute_error(y, p), 4),
            "RMSE": round(float(np.sqrt(mean_squared_error(y, p))), 4)}


def run_regressor(name, X, y, tab_factory):
    X = np.asarray(X, float); y = np.asarray(y, float)
    out = {}
    for model, fac in [("TabPFN", tab_factory), ("RandomForest", rf_reg), ("XGBoost", xgb_reg)]:
        p = oof_reg(X, y, fac)
        out[model] = reg_metrics(y, p)
        print(f"  {name:9} {model:13} R2={out[model]['R2']:.4f} MAE={out[model]['MAE']:.4f} RMSE={out[model]['RMSE']:.4f}", flush=True)
    return out


def run_circular():
    df = pd.read_csv(config.CIRCULAR_DATA_PATH)
    feats = ["gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u"]
    X = df[feats].values; y = df[config.CIRCULAR_TARGET].values.astype(int)
    models = {
        "TabPFN": lambda: TabPFNClassifier(),
        "RandomForest": lambda: RandomForestClassifier(n_estimators=400, random_state=SEED, n_jobs=-1),
        "XGBoost": lambda: XGBClassifier(n_estimators=400, max_depth=4, learning_rate=0.05,
                                         subsample=0.9, colsample_bytree=0.9, random_state=SEED,
                                         n_jobs=-1, eval_metric="logloss"),
    }
    out = {}
    for model, fac in models.items():
        lab = np.full(len(y), -1); prob = np.full(len(y), np.nan)
        for tr, te in StratifiedKFold(n_splits=K, shuffle=True, random_state=SEED).split(X, y):
            m = fac(); m.fit(X[tr], y[tr]); lab[te] = m.predict(X[te]); prob[te] = m.predict_proba(X[te])[:, 1]
        out[model] = {"accuracy": round(accuracy_score(y, lab), 4), "roc_auc": round(roc_auc_score(y, prob), 4)}
        print(f"  circular  {model:13} acc={out[model]['accuracy']:.4f} auc={out[model]['roc_auc']:.4f}", flush=True)
    return out


def main():
    results = {}  # dataset -> model -> metrics

    print("planar ...", flush=True)
    dfp = pd.read_csv(config.PLANE_DATA_PATH)
    results["planar"] = run_regressor("planar", make_plane_features(dfp).values,
                                      dfp[config.PLANE_TARGET].values, lambda: tabpfn_reg())

    print("wedge ...", flush=True)
    Xw, yw, _ = wedge_load(verbose=False)
    results["wedge"] = run_regressor("wedge", Xw.values, yw.values, lambda: tabpfn_reg(cpu=True))

    print("toppling ...", flush=True)
    Xt, ytp = topple_load()
    results["toppling"] = run_regressor("toppling", Xt, ytp, lambda: tabpfn_reg(cpu=True, ig=True))

    print("circular ...", flush=True)
    results["circular"] = run_circular()

    # ---- CSV ----
    with open(ROOT / "figures" / "model_comparison.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["dataset", "task", "model", "R2", "MAE", "RMSE", "accuracy", "roc_auc", "best_by_primary"])
        for ds in ["planar", "wedge", "toppling", "circular"]:
            reg = ds != "circular"
            prim = "R2" if reg else "accuracy"
            best = max(results[ds], key=lambda m: results[ds][m][prim])
            for model, mm in results[ds].items():
                w.writerow([ds, "regression" if reg else "classification", model,
                            mm.get("R2", ""), mm.get("MAE", ""), mm.get("RMSE", ""),
                            mm.get("accuracy", ""), mm.get("roc_auc", ""),
                            "★" if model == best else ""])

    # ---- chart: primary metric per dataset, grouped by model ----
    ds_order = ["planar", "wedge", "toppling", "circular"]
    prim = {d: ("R2" if d != "circular" else "accuracy") for d in ds_order}
    models = ["TabPFN", "RandomForest", "XGBoost"]
    colors = {"TabPFN": "#0071e3", "RandomForest": "#30d158", "XGBoost": "#ff9f0a"}
    x = np.arange(len(ds_order)); wbar = 0.26
    fig, ax = plt.subplots(figsize=(10, 5.2))
    for i, model in enumerate(models):
        vals = [results[d][model][prim[d]] for d in ds_order]
        bars = ax.bar(x + (i - 1) * wbar, vals, wbar, label=model, color=colors[model])
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width()/2, v + 0.008, f"{v:.3f}", ha="center", va="bottom", fontsize=8)
    ax.set_xticks(x); ax.set_xticklabels([f"{d}\n({prim[d]})" for d in ds_order])
    ax.set_ylabel("R²  /  accuracy  (higher = better)"); ax.set_ylim(0, 1.05)
    ax.axhline(1.0, color="#ccc", lw=0.8, ls="--")
    ax.set_title("TabPFN vs RandomForest vs XGBoost — 5-fold CV (same folds, same features)")
    ax.legend(frameon=False, ncol=3, loc="lower center", bbox_to_anchor=(0.5, -0.22))
    ax.grid(axis="y", alpha=0.25); fig.tight_layout()
    fig.savefig(ROOT / "figures" / "model_comparison.png", dpi=140, bbox_inches="tight")
    plt.close(fig)
    print("\nwrote figures/model_comparison.csv and figures/model_comparison.png")


if __name__ == "__main__":
    main()
