"""
wedge_tabpfn_predict.py — Slope Stability AI / WedgeFailure
Predict the Factor of Safety (FoS) for a wedge-failure slope using TabPFN.
TabPFN has no 'saved model' file - it retrains on the data each time
(it's fast). The trained model is cached in memory after the first call,
so repeated predictions (e.g. from a running API server) don't retrain.

Run from the WedgeFailure folder:  python3 wedge_tabpfn_predict.py
"""
import numpy as np
from tabpfn import TabPFNRegressor

try:
    from .wedge_config import FEATURES, _wrap180, load_data   # imported as a package (e.g. by the backend)
except ImportError:
    from wedge_config import FEATURES, _wrap180, load_data     # run directly: python3 wedge_tabpfn_predict.py

_MODEL = None


def get_model():
    """Train TabPFN on all data once, then reuse the fitted model."""
    global _MODEL
    if _MODEL is None:
        print("Training TabPFN on all data...")
        X_train, y_train, _ = load_data()
        _MODEL = TabPFNRegressor(device="cpu")
        _MODEL.fit(X_train.values, y_train.values)
    return _MODEL


def predict_fos(dip_j1, dip_j2, dipdir_j1, dipdir_j2,
                 dip_slope, dipdir_slope, dip_upper, dipdir_upper,
                 height_m, gamma_kN_m3, c1_kPa, phi1_deg, c2_kPa, phi2_deg, w_pct):
    """Predict FoS from raw field-measurable inputs (absolute dip directions).
    Returns a result dict."""
    model = get_model()
    row = {
        "dip_j1": dip_j1, "dip_j2": dip_j2,
        "dip_slope": dip_slope, "dip_upper": dip_upper,
        "d_j1_slope": _wrap180(dipdir_j1 - dipdir_slope),
        "d_j2_slope": _wrap180(dipdir_j2 - dipdir_slope),
        "d_upper_slope": _wrap180(dipdir_upper - dipdir_slope),
        "height_m": height_m, "gamma_kN_m3": gamma_kN_m3,
        "c1_kPa": c1_kPa, "phi1_deg": phi1_deg,
        "c2_kPa": c2_kPa, "phi2_deg": phi2_deg,
        "w_pct": w_pct,
    }
    X = np.array([[row[f] for f in FEATURES]])
    fos = float(model.predict(X)[0])
    result = {"fos": fos}

    print("-" * 45)
    print(f"  dip_j1={dip_j1}  dip_j2={dip_j2}  dip_slope={dip_slope}  dip_upper={dip_upper}")
    print(f"  height={height_m}  gamma={gamma_kN_m3}  c1={c1_kPa}  phi1={phi1_deg}  "
          f"c2={c2_kPa}  phi2={phi2_deg}  w_pct={w_pct}")
    print("-" * 45)
    print(f"  PREDICTED FoS: {fos:.3f}")
    print("-" * 45)
    return result


if __name__ == "__main__":
    print("WATER TEST - FoS should DROP as w_pct increases:")
    for w in [0, 30, 60]:
        predict_fos(dip_j1=40, dip_j2=70, dipdir_j1=165, dipdir_j2=286,
                    dip_slope=65, dipdir_slope=134, dip_upper=11, dipdir_upper=122,
                    height_m=30, gamma_kN_m3=25, c1_kPa=15, phi1_deg=35,
                    c2_kPa=5, phi2_deg=20, w_pct=w)
