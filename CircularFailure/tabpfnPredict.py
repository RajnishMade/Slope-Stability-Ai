"""
tabpfnPredict.py
Predict stable/unstable for a slope you specify, using TabPFN.
TabPFN has no 'saved model' file - it retrains on the data each time
(it's fast). The trained model is cached in memory after the first call,
so repeated predictions (e.g. from a running API server) don't retrain.
"""

import sys, os
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(PROJECT_ROOT, "Src"))

import numpy as np
import pandas as pd
import config
from tabpfn import TabPFNClassifier

FEATURES = ["gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u"]

_MODEL = None


def get_model():
    """Train TabPFN on all data once, then reuse the fitted model."""
    global _MODEL
    if _MODEL is None:
        print("Training TabPFN on all data...")
        df = pd.read_csv(config.CIRCULAR_DATA_PATH)
        X = df[FEATURES].values
        y = df[config.CIRCULAR_TARGET].values
        _MODEL = TabPFNClassifier()
        _MODEL.fit(X, y)
    return _MODEL


def predict_slope(gamma, c, phi, beta, H, r_u):
    """Predict stable/unstable for one slope. Returns a result dict."""
    model = get_model()
    row = np.array([[gamma, c, phi, beta, H, r_u]])
    pred = model.predict(row)[0]
    proba = model.predict_proba(row)[0]   # [prob_stable, prob_unstable]
    label = "UNSTABLE" if pred == 1 else "STABLE"

    result = {
        "label": label,
        "failure_probability": float(proba[1]),
        "stable_probability": float(proba[0]),
    }

    print("-" * 45)
    print(f"  gamma={gamma}  c={c}  phi={phi}  beta={beta}  H={H}  r_u={r_u}")
    print("-" * 45)
    print(f"  PREDICTION: {label}")
    print(f"  Failure probability: {result['failure_probability']*100:.1f}%")
    print(f"  (stable: {result['stable_probability']*100:.1f}%  |  "
          f"unstable: {result['failure_probability']*100:.1f}%)")
    print("-" * 45)
    return result


if __name__ == "__main__":
    print("PORE PRESSURE TEST - failure prob should RISE as water increases:")
    for ru in [0.0, 0.1, 0.2, 0.3, 0.4, 0.5]:
        predict_slope(gamma=21, c=50, phi=38, beta=30, H=45, r_u=ru)
