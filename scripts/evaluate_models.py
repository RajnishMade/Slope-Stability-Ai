#!/usr/bin/env python3
"""
evaluate_models.py — Slope Stability AI

Measures REAL held-out performance for each failure-mode model and records the
dataset provenance, writing everything to backend/model_metrics.json.

Nothing here is estimated: every metric comes from fitting on a train split and
scoring on data the model has not seen. Run from the project root:

    python3 scripts/evaluate_models.py
"""
import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "Src"))
os.chdir(ROOT)

SEED = 42

# request-field key -> dataset column (frontend/backend names differ for some modes)
COLUMN_MAP = {
    "circular": {
        "gamma": "gamma_kN_m3", "c": "c_kPa", "phi": "phi_deg",
        "beta": "beta_deg", "H": "H_m", "r_u": "r_u",
    },
    "planar": {
        "slope_af": "slope_angle_af_deg", "plane_dip": "failure_plane_dip_ap_deg",
        "upper_slope": "upper_slope_angle_as_deg", "H": "h_m",
        "gamma": "unit_weight_gamma_kNm3", "phi": "friction_angle_phi_deg",
        "c": "cohesion_C_kPa", "kh": "seismic_kh", "water_level": "water_fraction_or_pct",
    },
    "wedge": {
        k: k for k in [
            "dip_j1", "dip_j2", "dipdir_j1", "dipdir_j2", "dip_slope", "dipdir_slope",
            "dip_upper", "dipdir_upper", "height_m", "gamma_kN_m3",
            "c1_kPa", "phi1_deg", "c2_kPa", "phi2_deg", "w_pct",
        ]
    },
    "toppling": {
        k: k for k in [
            "slope_angle_deg", "bedding_dip_deg", "joint_spacing_m", "slope_height_m",
            "joint_friction_deg", "unit_weight_kNm3", "water_ratio",
        ]
    },
}


def ranges(df: pd.DataFrame, mode: str) -> dict:
    out = {}
    for key, col in COLUMN_MAP[mode].items():
        if col in df.columns:
            s = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(s):
                out[key] = [round(float(s.min()), 4), round(float(s.max()), 4)]
    return out


def reg_metrics(y_true, y_pred, n_train):
    return {
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "n_train": int(n_train),
        "n_test": int(len(y_true)),
    }


def evaluate_circular():
    from tabpfn import TabPFNClassifier
    import config

    df = pd.read_csv(config.CIRCULAR_DATA_PATH)
    feats = ["gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u"]
    X, y = df[feats].values, df[config.CIRCULAR_TARGET].values
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=SEED, stratify=y)

    clf = TabPFNClassifier()
    clf.fit(Xtr, ytr)
    pred = clf.predict(Xte)
    proba = clf.predict_proba(Xte)[:, 1]

    acc = float(accuracy_score(yte, pred))
    return {
        "task": "classification",
        "metrics": {
            "accuracy": round(acc, 4),
            "roc_auc": round(float(roc_auc_score(yte, proba)), 4),
            "n_train": int(len(ytr)),
            "n_test": int(len(yte)),
        },
        "plain": f"Correctly classified {acc * 100:.0f}% of slopes it had never seen.",
        "dataset": {
            "rows": int(len(df)),
            "n_features": len(feats),
            "source_kind": "real",
            "real_pct": 100,
            "synthetic_pct": 0,
            "provenance": (
                "Published case histories of circular/rotational slope failures "
                "(Sah 1994; Feng & Hudson 2004; Xu & Shao 1998; Li 2006; He 2004; "
                "Chen 2009 / Xiao 2011), including open-pit and open-cut slopes in "
                "India, the UK and the USA."
            ),
            "ranges": ranges(df, "circular"),
        },
    }


def evaluate_planar():
    from tabpfn import TabPFNRegressor
    import config
    from feature_engineering.FeaturePlane import make_plane_features

    df = pd.read_csv(config.PLANE_DATA_PATH)
    X = make_plane_features(df).values
    y = df[config.PLANE_TARGET].values
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=SEED)

    reg = TabPFNRegressor()
    reg.fit(Xtr, ytr)
    pred = np.asarray(reg.predict(Xte)).ravel()
    m = reg_metrics(yte, pred, len(ytr))

    cc = df["case_class"].fillna("UNKNOWN").value_counts().to_dict()
    total = int(sum(cc.values()))
    real = int(cc.get("REAL", 0))
    book = int(cc.get("TEXTBOOK", 0))
    return {
        "task": "regression",
        "metrics": m,
        "plain": (
            f"Explains {m['r2'] * 100:.0f}% of the variation in factor of safety on unseen "
            f"cases, typically within ±{m['mae']:.2f} FoS."
        ),
        "dataset": {
            "rows": int(len(df)),
            "n_features": X.shape[1],
            "source_kind": "mixed",
            "real_pct": round(real / total * 100),
            "synthetic_pct": round(book / total * 100),
            "provenance": (
                f"{real} documented field cases and {book} textbook/verification cases. "
                "Sources: Raghuvanshi (2019, JKSUS); Abdela (2025, QSA); RocPlane "
                "Verification Manual (Rocscience 2022) after Hoek (2000), Sharma et al. "
                "(1995) and Froldi (1996). FoS values from planar limit-equilibrium."
            ),
            "ranges": ranges(df, "planar"),
        },
    }


def evaluate_toppling():
    sys.path.insert(0, str(ROOT / "ToppilingFailure"))
    from topple_config import FEATURES, load_xy
    from tabpfn import TabPFNRegressor

    X, y = load_xy()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=SEED)
    try:
        reg = TabPFNRegressor(device="cpu", ignore_pretraining_limits=True)
    except TypeError:
        reg = TabPFNRegressor(ignore_pretraining_limits=True)
    reg.fit(Xtr, ytr)
    pred = np.asarray(reg.predict(Xte)).ravel()
    m = reg_metrics(yte, pred, len(ytr))

    df = pd.read_csv(ROOT / "Data" / "toppling_synthetic_verfied.csv")
    return {
        "task": "regression",
        "metrics": m,
        "plain": (
            f"Reproduces the Goodman–Bray solver to within ±{m['mae']:.2f} FoS on unseen "
            f"cases (R² {m['r2']:.2f}). This measures solver agreement, not field accuracy."
        ),
        "dataset": {
            "rows": int(len(df)),
            "n_features": len(FEATURES),
            "source_kind": "synthetic",
            "real_pct": 0,
            "synthetic_pct": 100,
            "provenance": (
                "Generated by a Goodman–Bray block-toppling limit-equilibrium solver "
                "swept across the parameter space. Stage-1 pretraining data only — "
                "flagged 'pretrain_only'; requires fine-tuning on real cases before "
                "any field use."
            ),
            "ranges": ranges(df, "toppling"),
        },
    }


def evaluate_wedge():
    sys.path.insert(0, str(ROOT / "WedgeFailure"))
    from wedge_config import FEATURES, load_data
    from tabpfn import TabPFNRegressor

    X, y, df = load_data(verbose=False)
    Xtr, Xte, ytr, yte = train_test_split(X.values, y.values, test_size=0.2, random_state=SEED)
    reg = TabPFNRegressor(device="cpu")
    reg.fit(Xtr, ytr)
    pred = np.asarray(reg.predict(Xte)).ravel()
    m = reg_metrics(yte, pred, len(ytr))

    return {
        "task": "regression",
        "metrics": m,
        "plain": (
            f"Reproduces the block-theory solver to within ±{m['mae']:.2f} FoS on unseen "
            f"cases (R² {m['r2']:.2f}). This measures solver agreement, not field accuracy."
        ),
        "dataset": {
            "rows": int(len(df)),
            "n_features": len(FEATURES),
            "source_kind": "synthetic",
            "real_pct": 0,
            "synthetic_pct": 100,
            "provenance": (
                "Generated by a block-theory (Hoek & Bray) wedge solver and verified "
                "against the SWedge Verification Manual (Rocscience 2022). Stage-1 "
                "pretraining data only — flagged 'pretrain_only'; requires fine-tuning "
                "on real cases before any field use."
            ),
            "ranges": ranges(df, "wedge"),
        },
    }


def main():
    out = {}
    for name, fn in [
        ("circular", evaluate_circular),
        ("planar", evaluate_planar),
        ("toppling", evaluate_toppling),
        ("wedge", evaluate_wedge),
    ]:
        print(f"evaluating {name} ...", flush=True)
        try:
            out[name] = fn()
            print(f"  -> {out[name]['metrics']}", flush=True)
        except Exception as e:  # keep going; a missing mode is better than no file
            print(f"  !! {name} failed: {e}", flush=True)

    dest = ROOT / "backend" / "model_metrics.json"
    dest.write_text(json.dumps(out, indent=2))
    print(f"\nwrote {dest}")


if __name__ == "__main__":
    main()
