"""
FeaturePlane.py
Feature engineering for plane failure. Maps the raw 'saturation'
text to a numeric 3-level water feature, and returns the 9 features.
"""

import numpy as np
import pandas as pd

def make_plane_features(df):
    df = df.copy()
    # use the cleaned water fraction column directly (values 0-1)
    df["water_level"] = df["water_fraction_or_pct"].astype(float)

    return df[[
        "slope_angle_af_deg",
        "failure_plane_dip_ap_deg",
        "upper_slope_angle_as_deg",
        "h_m",
        "unit_weight_gamma_kNm3",
        "friction_angle_phi_deg",
        "cohesion_C_kPa",
        "seismic_kh",
        "water_level",
    ]]


def build_plane_row(slope_af, plane_dip, upper_slope, H, gamma, phi, c, kh, water_level):
    """Wrap raw inputs into a one-row DataFrame for prediction.
    water_level: 0.0 (dry), 0.5 (moderate), 1.0 (saturated)."""
    return pd.DataFrame([{
        "slope_angle_af_deg": slope_af,
        "failure_plane_dip_ap_deg": plane_dip,
        "upper_slope_angle_as_deg": upper_slope,
        "h_m": H,
        "unit_weight_gamma_kNm3": gamma,
        "friction_angle_phi_deg": phi,
        "cohesion_C_kPa": c,
        "seismic_kh": kh,
        "water_level": water_level,
    }])