"""
main.py — Slope Stability AI backend API
Serves TabPFN predictions for all four slope-failure modes behind one
FastAPI app. Each model is trained once, at server startup, and kept in
memory — requests only call .predict(), they never retrain.

Run from the project root:
    uvicorn backend.main:app --reload

Interactive docs once running:  http://127.0.0.1:8000/docs
"""
import json
import os
import sys
from contextlib import asynccontextmanager

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Held-out validation metrics + dataset provenance, produced by
# scripts/evaluate_models.py. Loaded once at import.
_METRICS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_metrics.json")
try:
    with open(_METRICS_PATH) as _f:
        MODEL_METRICS = json.load(_f)
except FileNotFoundError:
    MODEL_METRICS = {}

from CircularFailure.tabpfnPredict import get_model as _load_circular, predict_slope
from PlaneFailure.planeTabpfnPredict import get_model as _load_plane, predict_fos as predict_plane
from ToppilingFailure.topple_tabpfn_predict import get_model as _load_toppling, predict_fos as predict_toppling
from WedgeFailure.wedge_tabpfn_predict import get_model as _load_wedge, predict_fos as predict_wedge

from backend.schemas import (
    CircularRequest, CircularResponse,
    PlaneRequest, PlaneResponse,
    TopplingRequest, TopplingResponse,
    WedgeRequest, WedgeResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Warming up TabPFN models (training on full datasets once)...")
    _load_circular()
    _load_plane()
    _load_toppling()
    _load_wedge()
    print("All 4 models ready.")
    yield


app = FastAPI(title="Slope Stability AI API", lifespan=lifespan)

# Tighten allow_origins to your frontend's actual domain before going live.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/metrics")
def all_metrics():
    """Held-out accuracy metrics + dataset provenance for every mode."""
    return MODEL_METRICS


@app.get("/metrics/{mode}")
def metrics_for(mode: str):
    if mode not in MODEL_METRICS:
        raise HTTPException(status_code=404, detail=f"No metrics for mode '{mode}'")
    return MODEL_METRICS[mode]


@app.post("/predict/circular", response_model=CircularResponse)
def predict_circular_endpoint(req: CircularRequest):
    return predict_slope(gamma=req.gamma, c=req.c, phi=req.phi,
                          beta=req.beta, H=req.H, r_u=req.r_u)


@app.post("/predict/plane", response_model=PlaneResponse)
def predict_plane_endpoint(req: PlaneRequest):
    return predict_plane(slope_af=req.slope_af, plane_dip=req.plane_dip,
                          upper_slope=req.upper_slope, H=req.H, gamma=req.gamma,
                          phi=req.phi, c=req.c, kh=req.kh, water_level=req.water_level)


@app.post("/predict/toppling", response_model=TopplingResponse)
def predict_toppling_endpoint(req: TopplingRequest):
    return predict_toppling(slope_angle_deg=req.slope_angle_deg,
                             bedding_dip_deg=req.bedding_dip_deg,
                             joint_spacing_m=req.joint_spacing_m,
                             slope_height_m=req.slope_height_m,
                             joint_friction_deg=req.joint_friction_deg,
                             unit_weight_kNm3=req.unit_weight_kNm3,
                             water_ratio=req.water_ratio)


@app.post("/predict/wedge", response_model=WedgeResponse)
def predict_wedge_endpoint(req: WedgeRequest):
    return predict_wedge(dip_j1=req.dip_j1, dip_j2=req.dip_j2,
                          dipdir_j1=req.dipdir_j1, dipdir_j2=req.dipdir_j2,
                          dip_slope=req.dip_slope, dipdir_slope=req.dipdir_slope,
                          dip_upper=req.dip_upper, dipdir_upper=req.dipdir_upper,
                          height_m=req.height_m, gamma_kN_m3=req.gamma_kN_m3,
                          c1_kPa=req.c1_kPa, phi1_deg=req.phi1_deg,
                          c2_kPa=req.c2_kPa, phi2_deg=req.phi2_deg, w_pct=req.w_pct)
