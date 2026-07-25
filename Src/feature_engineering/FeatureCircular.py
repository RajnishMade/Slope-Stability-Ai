"""
feature_engineering.py
Converts the 6 raw slope parameters into the 3 dimensionless ratios
that the circular-failure model actually trains and predicts on.

This SAME function is used at training time AND at prediction time,
so the model always sees features computed the identical way.
"""

import numpy as np
import pandas as pd


def make_circular_features(df):
    """
    Input:  a DataFrame containing the 6 raw columns:
            gamma_kN_m3, c_kPa, phi_deg, beta_deg, H_m, r_u
    Output: a DataFrame with 3 engineered columns:
            cohesion_ratio, stability_ratio, pore_ratio
    """
    df = df.copy()

    # c / (gamma * H)  -- dimensionless cohesion number
    df["cohesion_ratio"] = df["c_kPa"] / (df["gamma_kN_m3"] * df["H_m"])

    # tan(phi) / tan(beta)  -- friction angle vs slope angle
    df["stability_ratio"] = (
        np.tan(np.radians(df["phi_deg"])) / np.tan(np.radians(df["beta_deg"]))
    )

    # return the 6 raw params + 2 ratios (pore handled by raw r_u)
    return df[[
        "gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u",
        "cohesion_ratio", "stability_ratio",
    ]]

def build_raw_row(gamma, c, phi, beta, H, r_u):
    """
    Helper for prediction time: takes 6 loose numbers a user types,
    and wraps them into a one-row DataFrame with the correct column names
    so make_circular_features() can process them.
    """
    return pd.DataFrame(
        [{
            "gamma_kN_m3": gamma,
            "c_kPa": c,
            "phi_deg": phi,
            "beta_deg": beta,
            "H_m": H,
            "r_u": r_u,
        }]
    )