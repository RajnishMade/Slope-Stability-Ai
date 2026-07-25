"""
schemas.py — Slope Stability AI backend
Request/response models for each of the four failure-mode endpoints.
"""
from pydantic import BaseModel


# ---------------------------------------------------------------
# CIRCULAR FAILURE (classifier: stable / unstable)
# ---------------------------------------------------------------

class CircularRequest(BaseModel):
    gamma: float   # unit weight, kN/m3
    c: float       # cohesion, kPa
    phi: float     # friction angle, deg
    beta: float    # slope angle, deg
    H: float       # slope height, m
    r_u: float     # pore pressure ratio


class CircularResponse(BaseModel):
    label: str
    failure_probability: float
    stable_probability: float


# ---------------------------------------------------------------
# PLANE FAILURE (regressor: FoS)
# ---------------------------------------------------------------

class PlaneRequest(BaseModel):
    slope_af: float
    plane_dip: float
    upper_slope: float
    H: float
    gamma: float
    phi: float
    c: float
    kh: float           # seismic coefficient
    water_level: float  # 0.0 dry -> 1.0 saturated


class PlaneResponse(BaseModel):
    fos: float


# ---------------------------------------------------------------
# TOPPLING FAILURE (regressor: FoS)
# ---------------------------------------------------------------

class TopplingRequest(BaseModel):
    slope_angle_deg: float
    bedding_dip_deg: float
    joint_spacing_m: float
    slope_height_m: float
    joint_friction_deg: float
    unit_weight_kNm3: float
    water_ratio: float


class TopplingResponse(BaseModel):
    fos: float


# ---------------------------------------------------------------
# WEDGE FAILURE (regressor: FoS)
# ---------------------------------------------------------------

class WedgeRequest(BaseModel):
    dip_j1: float
    dip_j2: float
    dipdir_j1: float
    dipdir_j2: float
    dip_slope: float
    dipdir_slope: float
    dip_upper: float
    dipdir_upper: float
    height_m: float
    gamma_kN_m3: float
    c1_kPa: float
    phi1_deg: float
    c2_kPa: float
    phi2_deg: float
    w_pct: float


class WedgeResponse(BaseModel):
    fos: float
