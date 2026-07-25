#!/usr/bin/env python3
"""
topple_tabpfn_predict.py — Slope Stability AI / ToppilingFailure
Predict the Factor of Safety (FoS) for a toppling slope using TabPFN.
TabPFN has no 'saved model' file - it retrains on the data each time
(it's fast). The trained model is cached in memory after the first call,
so repeated predictions (e.g. from a running API server) don't retrain.

Run:  python3 topple_tabpfn_predict.py
      TABPFN_ALLOW_CPU_LARGE_DATASET=1 python3 topple_tabpfn_predict.py   # if local TabPFN >1000 rows
"""
import threading

import numpy as np
try:
    from .topple_config import FEATURES, load_xy       # imported as a package (e.g. by the backend)
except ImportError:
    from topple_config import FEATURES, load_xy         # run directly: python3 topple_tabpfn_predict.py

_MODEL = None
_LOCK = threading.Lock()


def _get_regressor():
    """Prefer the hosted client (no row cap); fall back to local."""
    try:
        from tabpfn_client import TabPFNRegressor
        return TabPFNRegressor()
    except ImportError:
        pass
    from tabpfn import TabPFNRegressor
    try:
        return TabPFNRegressor(device="cpu", ignore_pretraining_limits=True)
    except TypeError:
        return TabPFNRegressor(ignore_pretraining_limits=True)


def get_model():
    """Train TabPFN on all data once, then reuse the fitted model.

    Thread-safe: fits a local variable and assigns the global last, under a
    lock, so a concurrent request can never get a half-built, unfitted model.
    """
    global _MODEL
    if _MODEL is None:
        with _LOCK:
            if _MODEL is None:
                print("Training TabPFN on all data...")
                X, y = load_xy()
                model = _get_regressor()
                model.fit(X, y)
                _MODEL = model
    return _MODEL


def predict_fos(slope_angle_deg, bedding_dip_deg, joint_spacing_m,
                 slope_height_m, joint_friction_deg, unit_weight_kNm3, water_ratio):
    """Predict FoS for one slope. Returns a result dict."""
    model = get_model()
    row = np.array([[slope_angle_deg, bedding_dip_deg, joint_spacing_m,
                      slope_height_m, joint_friction_deg, unit_weight_kNm3, water_ratio]])
    fos = float(model.predict(row)[0])
    result = {"fos": fos}

    print("-" * 45)
    print(f"  slope_angle={slope_angle_deg}  bedding_dip={bedding_dip_deg}  "
          f"joint_spacing={joint_spacing_m}")
    print(f"  slope_height={slope_height_m}  joint_friction={joint_friction_deg}  "
          f"unit_weight={unit_weight_kNm3}  water_ratio={water_ratio}")
    print("-" * 45)
    print(f"  PREDICTED FoS: {fos:.3f}")
    print("-" * 45)
    return result


if __name__ == "__main__":
    print("WATER TEST - FoS should DROP as water_ratio increases:")
    for r_u in [0.0, 0.2, 0.4]:
        predict_fos(slope_angle_deg=45, bedding_dip_deg=20, joint_spacing_m=0.5,
                    slope_height_m=30, joint_friction_deg=35, unit_weight_kNm3=26,
                    water_ratio=r_u)
