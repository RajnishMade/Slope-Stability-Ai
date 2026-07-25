# Slope Stability AI

An AI-powered slope stability prediction platform for **open-cast mining operations**, designed to estimate the **Factor of Safety (FoS)** and predict the stability status of different geological slope failure mechanisms using machine learning.

The project combines **geotechnical engineering principles**, **TabPFN-based tabular deep learning**, and an interactive web application to provide rapid slope stability assessment for research and educational purposes.

---

## Overview

Slope Stability AI covers the four major slope failure mechanisms commonly encountered in surface mines:

| Mode | Mechanism | Output |
| --- | --- | --- |
| Planar | Sliding along a single discontinuity | Factor of Safety |
| Wedge | Sliding along the intersection of two planes | Factor of Safety |
| Toppling | Block rotation about the base | Factor of Safety |
| Circular | Rotational failure in dump / weak rock | Stable / Unstable + failure probability |

The three rock modes are **regression** models that predict a numeric FoS, which is then compared against the applicable DGMS threshold. Circular failure is a **classification** model — it returns a stability verdict and a failure probability rather than a numeric FoS, so the DGMS threshold cannot be applied to it directly. The interface states this explicitly wherever a circular result is shown.

### DGMS thresholds applied

| Material | Minimum FoS |
| --- | --- |
| Rock slopes (planar, wedge, toppling) | ≥ 1.2 |
| Dump / overburden (circular) | ≥ 1.3 |

Results are colour-coded green (clears the threshold), amber (marginal) or red (below).

---

## Features

- AI-based prediction using **TabPFN**
- Support for four different slope failure modes
- Interactive React + TypeScript frontend with glassmorphic UI
- FastAPI backend with typed request/response schemas
- Live parametric 3D slope visualisation with angle arcs, dimension callouts and water pressure arrows
- Stereonet inset for wedge kinematic analysis
- Held-out model accuracy metrics and dataset provenance surfaced in the UI
- Empirical sensitivity analysis — measures the model's own response to each parameter
- Training-range checks that warn when inputs fall outside the data the model saw
- Report copy / export
- Dataset preprocessing and evaluation utilities

---

## Supported Failure Modes

### 1. Planar Failure

Sliding of a rock block along a single continuous discontinuity that daylights in the slope face.

**Model inputs (9)**

| Group | Parameters |
| --- | --- |
| Geometry | Slope face angle ψf, failure plane dip ψp, upper slope angle ψs, slope height H |
| Material | Unit weight γ, cohesion c, friction angle φ |
| Groundwater | Water level (0 = dry, 1 = saturated) |
| Loading | Seismic coefficient kₕ |

### 2. Wedge Failure

Instability of a tetrahedral block formed by the intersection of two discontinuity planes, sliding along their line of intersection.

**Model inputs (14)**

| Group | Parameters |
| --- | --- |
| Geometry | Slope dip & dip direction, upper surface dip & dip direction, slope height |
| Joint set 1 | Dip, dip direction, cohesion c₁, friction angle φ₁ |
| Joint set 2 | Dip, dip direction, cohesion c₂, friction angle φ₂ |
| Material | Unit weight γ |
| Groundwater | Joint water fill (%) |

Absolute dip directions are converted internally to **slope-relative azimuth differences**, wrapped to (−180°, 180°]. This removes the 0°/360° wraparound discontinuity while preserving which side of the face each joint sits on.

### 3. Toppling Failure

Forward rotation of rock columns about their base, following Goodman–Bray block toppling.

**Model inputs (7)**

| Group | Parameters |
| --- | --- |
| Geometry | Slope angle, bedding dip, joint spacing, slope height |
| Material | Joint friction angle, unit weight γ |
| Groundwater | Water ratio rᵤ |

### 4. Circular Failure

Rotational failure typical of dumps, overburden and weak rock masses.

**Model inputs (6)**

| Group | Parameters |
| --- | --- |
| Geometry | Slope angle β, slope height H |
| Material | Unit weight γ, cohesion c, friction angle φ |
| Groundwater | Pore pressure ratio rᵤ |

---

## Machine Learning Model

The prediction engine is built on **TabPFN (Tabular Prior-data Fitted Network)** — a transformer pre-trained on synthetic tabular tasks that performs inference in a single forward pass, with no per-dataset training loop or hyperparameter tuning. This suits the small, high-quality geotechnical datasets available here, where gradient-boosted models tend to overfit.

TabPFN has no saved weights file per mode: each model is fitted on its dataset **once at API startup** and held in memory, so requests only run inference.

### Measured performance

Metrics from an 80/20 held-out split (`scripts/evaluate_models.py`), not training scores:

| Mode | Task | Performance | Rows | Features |
| --- | --- | --- | --- | --- |
| Planar | Regression | R² 0.966 · MAE 0.072 FoS | 149 | 9 |
| Toppling | Regression | R² 0.948 · MAE 0.046 FoS | 600 | 7 |
| Wedge | Regression | R² 0.911 · MAE 0.140 FoS | 280 | 14 |
| Circular | Classification | Accuracy 73% · ROC-AUC 0.84 | 184 | 6 |

> **Reading these numbers honestly.** The wedge and toppling datasets are entirely solver-generated, so their high R² measures how well the model reproduces the closed-form solver — **not** field accuracy. Circular's 73% is the real figure on a small set of genuine case histories; it is lower precisely because it is not learning an equation. Treat the synthetic modes as stage-1 pretraining that requires fine-tuning on real cases before any site use.

Run `python3 scripts/evaluate_models.py` to regenerate `backend/model_metrics.json`, which the API serves to the frontend.

---

## Technology Stack

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, React Three Fiber + drei (Three.js), Framer Motion, React Router

**Backend** — Python, FastAPI, Pydantic, Uvicorn

**Machine Learning** — TabPFN, NumPy, Pandas, scikit-learn

---

## Project Structure

```text
backend/              FastAPI app, request/response schemas, model metrics
CircularFailure/      Circular-failure predictor (TabPFN classifier)
PlaneFailure/         Planar-failure predictor (TabPFN regressor)
WedgeFailure/         Wedge predictor + wedge_config (features, leakage blocklist)
ToppilingFailure/     Toppling predictor + topple_config
Src/                  Shared config and feature engineering
Data/                 Curated datasets, one per failure mode
scripts/              Held-out evaluation / metrics generation
frontend/             React + TypeScript single-page application
```

Each failure-mode package owns its own feature list and data loading, including provenance assertions and — for wedge — a leakage blocklist that prevents solver *outputs* (weight, areas, driving/resisting forces) from being used as *inputs*. The backend is a thin HTTP layer that imports these modules; it contains no duplicated model logic.

---

## Dataset

| Dataset | Mode | Rows | Source |
| --- | --- | --- | --- |
| `circular_failure_CLEAN.csv` | Circular | 184 | 100% real — published case histories |
| `plane_failure_CLEAN.csv` | Planar | 149 | 86% real field cases, 14% textbook/verification |
| `toppling_synthetic_verfied.csv` | Toppling | 600 | 100% synthetic — Goodman–Bray solver |
| `wedge_synthetic_280.csv` | Wedge | 280 | 100% synthetic — block-theory solver, SWedge-verified |

Real records are drawn from published literature (Sah 1994; Feng & Hudson 2004; Xu & Shao 1998; Li 2006; He 2004; Raghuvanshi 2019; Abdela 2025) and verification manuals (RocPlane, SWedge — Rocscience 2022) after Hoek (2000), Sharma et al. (1995) and Froldi (1996). Synthetic records are generated by validated closed-form solvers and flagged `pretrain_only` in the data itself.

These datasets are intended for **research, educational purposes, and AI model development**.

---

## Prediction Workflow

```text
User Input (parameter form)
      │
      ▼
Validation + Feature Processing
      │
      ▼
TabPFN Model  (fitted once at startup, held in memory)
      │
      ▼
Factor of Safety   ── or ──   Stable / Unstable + probability
      │                                    (circular mode)
      ▼
DGMS Threshold Comparison  (≥ 1.2 rock / ≥ 1.3 dump)
      │
      ▼
Interactive 3D Visualisation + Interpretation
```

---

## Installation

**Requirements:** Python 3.9+, Node.js 18+

Clone the repository:

```bash
git clone https://github.com/RajnishMade/Slope-Stability-Ai.git
```

```bash
cd Slope-Stability-Ai
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd frontend && npm install
```

### Running

Start the backend **from the project root** (two terminals are needed):

```bash
uvicorn backend.main:app --reload
```

The first start takes roughly 30–60 seconds while all four TabPFN models are fitted. It is ready when the log prints `All 4 models ready.`

Start the frontend from the `frontend/` directory:

```bash
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 |
| Interactive API docs | http://localhost:8000/docs |

The backend must be running for predictions and the model-accuracy panels to populate; the frontend degrades gracefully and reports a solver error if it is unreachable.

---

## API Reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service check |
| `GET` | `/metrics` | Held-out metrics + dataset provenance, all modes |
| `GET` | `/metrics/{mode}` | Metrics for one mode |
| `POST` | `/predict/circular` | Stability class + failure probability |
| `POST` | `/predict/plane` | Factor of Safety |
| `POST` | `/predict/wedge` | Factor of Safety |
| `POST` | `/predict/toppling` | Factor of Safety |

Example:

```bash
curl -X POST http://localhost:8000/predict/plane -H "Content-Type: application/json" -d '{"slope_af":60,"plane_dip":35,"upper_slope":15,"H":40,"gamma":26,"phi":30,"c":40,"kh":0,"water_level":0.5}'
```

A single inference takes roughly 2.4 seconds on CPU. Requests are handled sequentially — the optional sensitivity analysis issues one query per parameter and reports progress accordingly.

---

## Research Applications

- Open-cast coal mines
- Rock slope engineering
- Geotechnical education
- Slope stability assessment
- Engineering decision support
- Mine planning
- AI-assisted geotechnical analysis

---

## Future Development

- Stage-2 fine-tuning of the synthetic wedge and toppling models on real field cases
- Deterministic limit-equilibrium solver alongside the ML prediction, for side-by-side comparison and a force breakdown
- Explainable AI (XAI) analysis and SHAP-based feature importance
- Drone-based slope monitoring integration
- Real-time sensor data support
- Geological map integration and automatic risk zoning
- Multi-model ensemble prediction

---

## Disclaimer

This software is intended for **research, educational, and experimental purposes**.

Predictions are model-generated and may contain errors. They must not be relied upon as the sole basis for slope design or operational decisions. All outputs require verification by a competent person against site-specific ground investigation data and the applicable DGMS regulations. Predictions should support — not replace — professional geotechnical engineering judgement and detailed site investigation.

---

## Author

**Rajnish Kumar Singh**
Mining Engineering Student, BIT Sindri
GitHub: [@RajnishMade](https://github.com/RajnishMade)
