"""
config.py
Central settings for the Slope Stability AI circular-failure and plane-failure
TabPFN models. Everything the prediction code needs to know lives here:
which columns, which target, where the data is.
"""
from pathlib import Path

# Data paths are resolved from this file's location, not the process's working
# directory, so they hold wherever the code runs (Docker, Vercel, a script run
# from another folder).
_DATA_DIR = Path(__file__).resolve().parent.parent / "Data"

# ---------------------------------------------------------------
# CIRCULAR FAILURE
# ---------------------------------------------------------------

# The column the model predicts (y): 0 = stable, 1 = unstable
CIRCULAR_TARGET = "status_binary"

# Where the cleaned circular CSV lives.
CIRCULAR_DATA_PATH = str(_DATA_DIR / "circular_failure_CLEAN.csv")

# ---------------------------------------------------------------
# PLANE FAILURE (regression - predicts FoS)
# ---------------------------------------------------------------

PLANE_FEATURES = [
    "slope_angle_af_deg", "failure_plane_dip_ap_deg", "upper_slope_angle_as_deg",
    "h_m", "unit_weight_gamma_kNm3", "friction_angle_phi_deg", "cohesion_C_kPa",
    "seismic_kh", "water_level",
]

PLANE_TARGET = "FoS"

PLANE_DATA_PATH = str(_DATA_DIR / "plane_failure_CLEAN.csv")