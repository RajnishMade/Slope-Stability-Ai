"""
planeTabpfnPredict.py
Predict the Factor of Safety (FoS) for a plane-failure slope using TabPFN.
TabPFN has no 'saved model' file - it retrains on the data each time
(it's fast). The trained model is cached in memory after the first call,
so repeated predictions (e.g. from a running API server) don't retrain.
"""

import sys, os
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(PROJECT_ROOT, "Src"))

import config
from feature_engineering.FeaturePlane import make_plane_features, build_plane_row
from tabpfn import TabPFNRegressor

import threading

_MODEL = None
_LOCK = threading.Lock()


def get_model():
    """Train TabPFN on all data once, then reuse the fitted model.

    Thread-safe: fits a local variable and assigns the global last, under a
    lock, so a concurrent request can never get a half-built, unfitted model.
    """
    global _MODEL
    if _MODEL is None:
        with _LOCK:
            if _MODEL is None:
                import pandas as pd
                print("Training TabPFN on all data...")
                df = pd.read_csv(config.PLANE_DATA_PATH)
                X = make_plane_features(df)
                y = df[config.PLANE_TARGET].values
                model = TabPFNRegressor()
                model.fit(X.values, y)
                _MODEL = model
    return _MODEL


def predict_fos(slope_af, plane_dip, upper_slope, H, gamma, phi, c, kh, water_level):
    """Predict FoS for one slope. Returns a result dict.
    water_level: 0.0 (dry), 0.5 (moderate), 1.0 (saturated)."""
    model = get_model()
    row = build_plane_row(slope_af, plane_dip, upper_slope, H, gamma, phi, c, kh, water_level)
    fos = float(model.predict(row.values)[0])
    result = {"fos": fos}

    print("-" * 45)
    print(f"  slope_af={slope_af}  plane_dip={plane_dip}  upper={upper_slope}  H={H}")
    print(f"  gamma={gamma}  phi={phi}  c={c}  kh={kh}  water={water_level}")
    print("-" * 45)
    print(f"  PREDICTED FoS: {fos:.3f}")
    print("-" * 45)
    return result


if __name__ == "__main__":
    print("WATER TEST - FoS should DROP as water increases:")
    for w in [0.0, 0.5, 1.0]:
        predict_fos(slope_af=60, plane_dip=35, upper_slope=15, H=40,
                    gamma=26, phi=30, c=40, kh=0.0, water_level=w)
