#!/usr/bin/env python3
"""
Slope Stability AI — Toppling module shared config.
Single source of truth for features and paths, used by topple_tabpfn_predict.py.

Dataset: toppling_synthetic_verfied.csv (600 rows, balanced, +water_ratio)
  Raw inputs only — no engineered ratios, no redundant geometry.
"""
import csv
from pathlib import Path
import numpy as np

# ---- paths ----
HERE = Path(__file__).resolve().parent          # ToppilingFailure/
PROJECT_ROOT = HERE.parent                        # Slope Stability Project/

# Look for the CSV next to this file first, then in the shared Data/ folder.
DATA = HERE / "toppling_synthetic_verfied.csv"
if not DATA.exists():
    _alt = PROJECT_ROOT / "Data" / "toppling_synthetic_verfied.csv"
    if _alt.exists():
        DATA = _alt

# ---- features ----
# Raw ground parameters only, all derivable from a field survey.
FEATURES = [
    "slope_angle_deg",
    "bedding_dip_deg",
    "joint_spacing_m",
    "slope_height_m",
    "joint_friction_deg",
    "unit_weight_kNm3",
    "water_ratio",
]
TARGET = "FoS"


def load_xy():
    """Load synthetic pretrain data. Hard-guards against non-synthetic rows."""
    rows = list(csv.DictReader(open(DATA)))
    origins = {r["data_origin"] for r in rows}
    usable = {r["usable_for_training"] for r in rows}
    assert origins == {"synthetic_gb_solver"}, f"unexpected data_origin: {origins}"
    assert usable == {"pretrain_only"}, f"unexpected usable_for_training: {usable}"
    X = np.array([[float(r[f]) for f in FEATURES] for r in rows])
    y = np.array([float(r[TARGET]) for r in rows])
    return X, y
