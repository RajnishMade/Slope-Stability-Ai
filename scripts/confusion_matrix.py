#!/usr/bin/env python3
"""
confusion_matrix.py — Slope Stability AI
A 2x2 stable/unstable confusion matrix for each model, on held-out (5-fold
out-of-fold) predictions.

Positive class = UNSTABLE (the thing we must catch).
  Circular: native binary label (1 = unstable).
  Planar/Wedge/Toppling: FoS regressors binarised at the failure boundary FoS = 1.0
                         (FoS < 1.0 -> unstable).  (Pass --t 1.2 for the DGMS rock line.)

Cells:  TN (safe, called safe) | FP (safe, called unstable = false alarm)
        FN (unstable, called safe = DANGEROUS MISS) | TP (unstable, caught)

Outputs: figures/confusion_matrices.png , figures/confusion_matrices.csv
Run from project root:  python3 scripts/confusion_matrix.py [--t 1.0]
"""
import os
import sys
import csv
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.model_selection import KFold, StratifiedKFold

from tabpfn import TabPFNClassifier, TabPFNRegressor

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT)); sys.path.insert(0, str(ROOT / "Src"))
sys.path.insert(0, str(ROOT / "WedgeFailure")); sys.path.insert(0, str(ROOT / "ToppilingFailure"))
os.chdir(ROOT)

import config
from feature_engineering.FeaturePlane import make_plane_features
from wedge_config import load_data as wedge_load
from topple_config import load_xy as topple_load

SEED, K = 42, 5
T = 1.0
if "--t" in sys.argv:
    T = float(sys.argv[sys.argv.index("--t") + 1])


def new_regressor(cpu=False, ignore_limits=False):
    kw = {}
    if cpu: kw["device"] = "cpu"
    if ignore_limits: kw["ignore_pretraining_limits"] = True
    try:
        return TabPFNRegressor(**kw)
    except TypeError:
        kw.pop("ignore_pretraining_limits", None)
        return TabPFNRegressor(**kw)


def oof_reg(X, y, make_model):
    X = np.asarray(X, float); y = np.asarray(y, float)
    oof = np.full(len(y), np.nan)
    for tr, te in KFold(n_splits=K, shuffle=True, random_state=SEED).split(X):
        m = make_model(); m.fit(X[tr], y[tr])
        oof[te] = np.asarray(m.predict(X[te])).ravel()
    return y, oof


def counts(actual_unstable, pred_unstable):
    tp = int(np.sum(actual_unstable & pred_unstable))
    fn = int(np.sum(actual_unstable & ~pred_unstable))
    fp = int(np.sum(~actual_unstable & pred_unstable))
    tn = int(np.sum(~actual_unstable & ~pred_unstable))
    return tn, fp, fn, tp


def main():
    results = []  # (name, subtitle, tn, fp, fn, tp)

    dfp = pd.read_csv(config.PLANE_DATA_PATH)
    y, p = oof_reg(make_plane_features(dfp).values, dfp[config.PLANE_TARGET].values, lambda: new_regressor())
    results.append(("Planar", f"FoS regressor · unstable = FoS < {T:g}", *counts(y < T, p < T)))
    print("planar done", flush=True)

    Xw, yw, _ = wedge_load(verbose=False)
    y, p = oof_reg(Xw.values, yw.values, lambda: new_regressor(cpu=True))
    results.append(("Wedge", f"FoS regressor · unstable = FoS < {T:g}", *counts(y < T, p < T)))
    print("wedge done", flush=True)

    Xt, ytp = topple_load()
    y, p = oof_reg(Xt, ytp, lambda: new_regressor(cpu=True, ignore_limits=True))
    results.append(("Toppling", f"FoS regressor · unstable = FoS < {T:g}", *counts(y < T, p < T)))
    print("toppling done", flush=True)

    dfc = pd.read_csv(config.CIRCULAR_DATA_PATH)
    feats = ["gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u"]
    Xc = dfc[feats].values; yc = dfc[config.CIRCULAR_TARGET].values.astype(int)
    lab = np.full(len(yc), -1)
    for tr, te in StratifiedKFold(n_splits=K, shuffle=True, random_state=SEED).split(Xc, yc):
        clf = TabPFNClassifier(); clf.fit(Xc[tr], yc[tr]); lab[te] = clf.predict(Xc[te])
    results.append(("Circular", "native classifier · unstable = label 1", *counts(yc == 1, lab == 1)))
    print("circular done", flush=True)

    # ---- render 2x2 grid of confusion matrices ----
    fig, axes = plt.subplots(2, 2, figsize=(10, 9))
    for ax, (name, sub, tn, fp, fn, tp) in zip(axes.ravel(), results):
        M = np.array([[tn, fp], [fn, tp]])
        n = tn + fp + fn + tp
        acc = (tp + tn) / n
        recall = tp / (tp + fn) if (tp + fn) else float("nan")   # sensitivity to failure
        prec = tp / (tp + fp) if (tp + fp) else float("nan")
        fnr = fn / (tp + fn) if (tp + fn) else float("nan")
        ax.imshow(M, cmap="Blues", vmin=0, vmax=M.max())
        labels = [["TN", "FP"], ["FN", "TP"]]
        for i in range(2):
            for j in range(2):
                danger = (i == 1 and j == 0)  # FN cell
                ax.text(j, i - 0.13, str(M[i, j]), ha="center", va="center",
                        fontsize=22, fontweight="bold",
                        color=("#cf222e" if danger else ("white" if M[i, j] > M.max() * 0.55 else "#111")))
                ax.text(j, i + 0.22, labels[i][j] + (" ⚠" if danger else ""), ha="center", va="center",
                        fontsize=10, color=("#cf222e" if danger else "#444"))
        ax.set_xticks([0, 1]); ax.set_xticklabels(["Pred STABLE", "Pred UNSTABLE"], fontsize=9)
        ax.set_yticks([0, 1]); ax.set_yticklabels(["Actual STABLE", "Actual UNSTABLE"], fontsize=9, rotation=90, va="center")
        ax.set_xlabel("")
        for s in ax.spines.values():
            s.set_visible(False)
        ax.set_title(f"{name}   (n={n}, acc {acc*100:.0f}%)\n{sub}\n"
                     f"recall(unstable) {recall*100:.0f}%   FN-rate {fnr*100:.1f}%   precision {prec*100:.0f}%",
                     fontsize=10.5)
        ax.set_xticks(np.arange(-.5, 2, 1), minor=True)
        ax.set_yticks(np.arange(-.5, 2, 1), minor=True)
        ax.grid(which="minor", color="white", linewidth=3)
        ax.tick_params(which="minor", length=0)
    fig.suptitle("Confusion matrices — held-out (5-fold OOF) · positive class = UNSTABLE  ·  FN (red) = unstable slope called safe",
                 fontsize=12, y=0.995)
    fig.tight_layout(rect=[0, 0, 1, 0.97])
    out = ROOT / "figures" / "confusion_matrices.png"
    fig.savefig(out, dpi=140, bbox_inches="tight"); plt.close(fig)

    with open(ROOT / "figures" / "confusion_matrices.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["model", "threshold", "TN", "FP", "FN", "TP", "n",
                    "accuracy", "recall_unstable", "precision_unstable", "FN_rate"])
        for name, sub, tn, fp, fn, tp in results:
            n = tn + fp + fn + tp
            w.writerow([name, T if name != "Circular" else "label",
                        tn, fp, fn, tp, n, round((tp+tn)/n, 4),
                        round(tp/(tp+fn), 4) if (tp+fn) else "",
                        round(tp/(tp+fp), 4) if (tp+fp) else "",
                        round(fn/(tp+fn), 4) if (tp+fn) else ""])
            print(f"{name:9} TN={tn} FP={fp} FN={fn} TP={tp}  acc={(tp+tn)/n*100:.1f}%  FN-rate={fn/(tp+fn)*100:.1f}%")
    print(f"\nwrote {out}")


if __name__ == "__main__":
    main()
