"""
config.py
Central settings for the Slope Stability AI circular-failure and plane-failure
TabPFN models. Everything the prediction code needs to know lives here:
which columns, which target, where the data is.
"""

# ---------------------------------------------------------------
# CIRCULAR FAILURE
# ---------------------------------------------------------------

# The column the model predicts (y): 0 = stable, 1 = unstable
CIRCULAR_TARGET = "status_binary"

# Where the cleaned circular CSV lives (the one with 575 rows).
# Adjust this filename to match what you saved in your Data/ folder.
CIRCULAR_DATA_PATH = "Data/circular_failure_CLEAN.csv"

# ---------------------------------------------------------------
# PLANE FAILURE (regression - predicts FoS)
# ---------------------------------------------------------------

PLANE_FEATURES = [
    "slope_angle_af_deg", "failure_plane_dip_ap_deg", "upper_slope_angle_as_deg",
    "h_m", "unit_weight_gamma_kNm3", "friction_angle_phi_deg", "cohesion_C_kPa",
    "seismic_kh", "water_level",
]

PLANE_TARGET = "FoS"

# adjust path to where you saved the cleaned file
PLANE_DATA_PATH = "Data/plane_failure_CLEAN.csv"