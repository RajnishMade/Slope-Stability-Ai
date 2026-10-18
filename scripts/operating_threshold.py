#!/usr/bin/env python3
"""
operating_threshold.py — Slope Stability AI
"How do we deploy this safely?" For each model, find the decision cutoff that
catches EVERY truly-unsafe slope in the held-out (out-of-fold) predictions
(false-negative rate = 0), and report the price of that safety: how many safe
slopes get needlessly flagged for engineer review.

Regressors: flag a slope for review when predicted FoS <= T. To miss no failure
(true FoS < B), T must be >= the largest FoS the model predicted for any actual
failure. That worst over-prediction sets the cutoff — one bad unconservative
miss forces a high cutoff and a large false-alarm rate.

Circular (classifier): lower the P(unstable) cutoff to p* = the smallest failure
probability assigned to any truly-unstable slope.

Run from project root:  python3 scripts/operating_threshold.py
"""
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import KFold, StratifiedKFold

from tabpfn import TabPFNClassifier, TabPFNRegressor

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
BOUNDARIES = [1.0, 1.2]  # failure boundary; DGMS rock threshold


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


def oof_reg(X, y, make_model):
    X = np.asarray(X, float); y = np.asarray(y, float)
    oof = np.full(len(y), np.nan)
    for tr, te in KFold(n_splits=K, shuffle=True, random_state=SEED).split(X):
        m = make_model(); m.fit(X[tr], y[tr])
        oof[te] = np.asarray(m.predict(X[te])).ravel()
    return y, oof


def reg_threshold(name, y, p):
    print(f"\n{name.upper()}")
    for B in BOUNDARIES:
        unsafe = y < B
        safe = ~unsafe
        n_unsafe, n_safe = int(unsafe.sum()), int(safe.sum())
        if n_unsafe == 0:
            print(f"  boundary FoS<{B}: no unsafe cases"); continue
        # current policy: flag when predicted < B
        fn_now = int(np.sum(unsafe & (p >= B)))
        # zero-FN cutoff: must catch the worst over-predicted failure
        T = float(np.max(p[unsafe]))
        flagged_safe = int(np.sum(safe & (p <= T)))
        fa = flagged_safe / n_safe if n_safe else 0.0
        workload = float(np.mean(p <= T)) * 100
        print(f"  boundary FoS<{B:<3}  (n_unsafe={n_unsafe}, n_safe={n_safe})")
        print(f"    current cutoff {B}: FN = {fn_now}/{n_unsafe} = {fn_now/n_unsafe*100:.1f}%")
        print(f"    zero-FN cutoff T* = {T:.3f}  ->  false alarms {flagged_safe}/{n_safe} "
              f"= {fa*100:.1f}% of safe slopes | total review workload {workload:.0f}%")


def main():
    print("computing out-of-fold predictions (5-fold)...", flush=True)

    dfp = pd.read_csv(config.PLANE_DATA_PATH)
    y, p = oof_reg(make_plane_features(dfp).values, dfp[config.PLANE_TARGET].values,
                   lambda: new_regressor())
    reg_threshold("planar", y, p)

    Xw, yw, _ = wedge_load(verbose=False)
    y, p = oof_reg(Xw.values, yw.values, lambda: new_regressor(cpu=True))
    reg_threshold("wedge", y, p)

    Xt, ytp = topple_load()
    y, p = oof_reg(Xt, ytp, lambda: new_regressor(cpu=True, ignore_limits=True))
    reg_threshold("toppling", y, p)

    # circular classifier
    dfc = pd.read_csv(config.CIRCULAR_DATA_PATH)
    feats = ["gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u"]
    Xc = dfc[feats].values
    yc = dfc[config.CIRCULAR_TARGET].values.astype(int)
    prob = np.full(len(yc), np.nan)
    for tr, te in StratifiedKFold(n_splits=K, shuffle=True, random_state=SEED).split(Xc, yc):
        clf = TabPFNClassifier(); clf.fit(Xc[tr], yc[tr])
        prob[te] = clf.predict_proba(Xc[te])[:, 1]
    print("\nCIRCULAR (classifier)")
    unstable = yc == 1; stable = ~unstable
    fn_now = int(np.sum(unstable & (prob < 0.5)))
    pstar = float(np.min(prob[unstable]))
    fa = int(np.sum(stable & (prob >= pstar)))
    print(f"  current P(unstable) cutoff 0.50: FN = {fn_now}/{int(unstable.sum())} "
          f"= {fn_now/unstable.sum()*100:.1f}%")
    print(f"  zero-FN cutoff p* = {pstar:.3f}  ->  false alarms {fa}/{int(stable.sum())} "
          f"= {fa/stable.sum()*100:.1f}% of stable slopes")


if __name__ == "__main__":
    main()
