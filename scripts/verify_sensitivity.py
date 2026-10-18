#!/usr/bin/env python3
"""
verify_sensitivity.py — Physics-based verification of the trained slope-stability models.

One-at-a-time (OAT) sensitivity: for each mechanism-specific TabPFN model, fix every
input at its training-set MEDIAN, then sweep one parameter across its dataset min->max
(50 steps) and record predicted response vs. parameter value.

Checks per parameter:
  * Direction   — sign of the Spearman correlation between swept value and response
                  must match the expected-physics sign.
  * Non-linearity — R^2 of a linear (deg-1) vs. a cubic (deg-3) fit; the response is
                  flagged non-linear when the cubic fit is meaningfully better.

Models are FIT LOCALLY on the same full dataset the app trains on (TabPFN "fitting" is
in-context memorisation of the training data, so this reproduces the deployed model) —
nothing is retrained in the ML sense, and no hosted-API calls are made. Each 50-step
sweep is a single batched predict().

Outputs:
  figures/sensitivity_<mechanism>.png   one subplot per parameter
  figures/sensitivity_summary.csv       mechanism | parameter | expected | observed | pass/fail | linear R2 | nonlinear R2 | ...

Run from the project root:  python3 scripts/verify_sensitivity.py
"""
import os
import sys
import csv
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from scipy.stats import spearmanr, pearsonr

# force LOCAL tabpfn (offline, batchable) regardless of tabpfn-client being installed
from tabpfn import TabPFNClassifier, TabPFNRegressor

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "Src"))
sys.path.insert(0, str(ROOT / "WedgeFailure"))
sys.path.insert(0, str(ROOT / "ToppilingFailure"))
os.chdir(ROOT)

import config
from feature_engineering.FeaturePlane import make_plane_features, build_plane_row
from wedge_config import FEATURES as WEDGE_FEATURES, _wrap180, load_data as wedge_load
from topple_config import FEATURES as TOPPLE_FEATURES, load_xy as topple_load

N_STEPS = 50
FIGDIR = ROOT / "figures"
FIGDIR.mkdir(exist_ok=True)

# expected sign of (param up) on the response.  'up' = response rises, 'down' = falls,
# None = report-only (no physics pass/fail — direction not obvious for this input).
ARROW = {"up": "↑", "down": "↓", None: "—"}


def new_regressor(cpu=False, ignore_limits=False):
    kw = {}
    if cpu:
        kw["device"] = "cpu"
    if ignore_limits:
        kw["ignore_pretraining_limits"] = True
    try:
        return TabPFNRegressor(**kw)
    except TypeError:
        kw.pop("ignore_pretraining_limits", None)
        return TabPFNRegressor(**kw)


def poly_r2(x, y, deg):
    """R^2 of a degree-`deg` least-squares polynomial fit (x rescaled for conditioning)."""
    xs = (x - x.min()) / (x.max() - x.min()) if x.max() > x.min() else x * 0.0
    coeffs = np.polyfit(xs, y, deg)
    yhat = np.polyval(coeffs, xs)
    ss_res = float(np.sum((y - yhat) ** 2))
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    return (1.0 - ss_res / ss_tot) if ss_tot > 1e-15 else np.nan


def analyse(x, y, expected):
    """Return a dict of direction/non-linearity findings for one swept parameter."""
    y = np.asarray(y, float)
    x = np.asarray(x, float)
    resp_range = float(y.max() - y.min())
    flat = resp_range < 1e-4  # response essentially constant -> parameter is inert

    if flat:
        rho = 0.0
        observed = "flat"
    else:
        rho = float(spearmanr(x, y).correlation)
        if abs(rho) < 0.05:
            observed = "flat"
        else:
            observed = "up" if rho > 0 else "down"

    try:
        pear = float(pearsonr(x, y)[0])
    except Exception:
        pear = np.nan

    r2_lin = poly_r2(x, y, 1) if not flat else np.nan
    r2_cub = poly_r2(x, y, 3) if not flat else np.nan
    gain = (r2_cub - r2_lin) if (not flat and np.isfinite(r2_lin) and np.isfinite(r2_cub)) else np.nan
    nonlinear = ("yes" if (np.isfinite(gain) and gain >= 0.02) else
                 ("no" if np.isfinite(gain) else "n/a"))

    if expected is None:
        verdict = "report-only"
    elif observed == "flat":
        verdict = "FAIL (flat)"
    elif observed == expected:
        verdict = "PASS"
    else:
        verdict = "FAIL"

    return {
        "expected": expected,
        "observed": observed,
        "verdict": verdict,
        "spearman_rho": round(rho, 4),
        "pearson_r": round(pear, 4) if np.isfinite(pear) else "",
        "linear_R2": round(r2_lin, 4) if np.isfinite(r2_lin) else "",
        "nonlinear_R2": round(r2_cub, 4) if np.isfinite(r2_cub) else "",
        "nonlinear_gain": round(gain, 4) if np.isfinite(gain) else "",
        "nonlinear": nonlinear,
        "resp_range": round(resp_range, 4),
    }


# ----------------------------------------------------------------------------------
# Per-mechanism runners.  Each returns (list_of_param_results, response_label).
# A param result: dict(key,label,unit,expected,baseline,xvals,yvals, **analyse(...))
# ----------------------------------------------------------------------------------

def run_circular():
    df = pd.read_csv(config.CIRCULAR_DATA_PATH)
    feats = ["gamma_kN_m3", "c_kPa", "phi_deg", "beta_deg", "H_m", "r_u"]
    clf = TabPFNClassifier()
    clf.fit(df[feats].values, df[config.CIRCULAR_TARGET].values)

    # response = P(stable) = 1 - P(fail); moves the same direction FoS would.
    meta = [
        ("gamma_kN_m3", "Unit weight γ", "kN/m³", None),
        ("c_kPa", "Cohesion c", "kPa", "up"),
        ("phi_deg", "Friction φ", "deg", "up"),
        ("beta_deg", "Slope angle β", "deg", "down"),
        ("H_m", "Height H", "m", "down"),
        ("r_u", "Pore ratio r_u", "–", "down"),
    ]
    base = {f: float(df[f].median()) for f in feats}
    results = []
    for key, label, unit, exp in meta:
        xs = np.linspace(df[key].min(), df[key].max(), N_STEPS)
        M = np.tile([base[f] for f in feats], (N_STEPS, 1))
        M[:, feats.index(key)] = xs
        ys = clf.predict_proba(M)[:, 0]  # P(stable)
        results.append(dict(key=key, label=label, unit=unit, baseline=base[key],
                            xvals=xs, yvals=ys, **analyse(xs, ys, exp)))
    return results, "P(stable)"


def run_planar():
    df = pd.read_csv(config.PLANE_DATA_PATH)
    reg = new_regressor()
    reg.fit(make_plane_features(df).values, df[config.PLANE_TARGET].values)

    # (sweep-arg, dataset-column, label, unit, expected)
    meta = [
        ("slope_af", "slope_angle_af_deg", "Slope face ψf", "deg", "down"),
        ("plane_dip", "failure_plane_dip_ap_deg", "Plane dip ψp", "deg", "down"),
        ("upper_slope", "upper_slope_angle_as_deg", "Upper slope ψs", "deg", "down"),
        ("H", "h_m", "Height H", "m", "down"),
        ("gamma", "unit_weight_gamma_kNm3", "Unit weight γ", "kN/m³", None),
        ("phi", "friction_angle_phi_deg", "Friction φ", "deg", "up"),
        ("c", "cohesion_C_kPa", "Cohesion c", "kPa", "up"),
        ("kh", "seismic_kh", "Seismic kh", "–", "down"),
        ("water_level", "water_fraction_or_pct", "Water level", "0–1", "down"),
    ]
    base = {arg: float(df[col].median()) for arg, col, *_ in meta}
    order = ["slope_af", "plane_dip", "upper_slope", "H", "gamma", "phi", "c", "kh", "water_level"]
    results = []
    for arg, col, label, unit, exp in meta:
        xs = np.linspace(df[col].min(), df[col].max(), N_STEPS)
        rows = []
        for v in xs:
            kwargs = dict(base)
            kwargs[arg] = float(v)
            rows.append(build_plane_row(**{k: kwargs[k] for k in order}))
        M = pd.concat(rows, ignore_index=True)
        ys = np.asarray(reg.predict(M.values)).ravel()
        results.append(dict(key=arg, label=label, unit=unit, baseline=base[arg],
                            xvals=xs, yvals=ys, **analyse(xs, ys, exp)))
    return results, "FoS"


def run_wedge():
    X, y, df = wedge_load(verbose=False)
    reg = new_regressor(cpu=True)
    reg.fit(X.values, y.values)

    raw = ["dip_j1", "dip_j2", "dipdir_j1", "dipdir_j2", "dip_slope", "dipdir_slope",
           "dip_upper", "dipdir_upper", "height_m", "gamma_kN_m3",
           "c1_kPa", "phi1_deg", "c2_kPa", "phi2_deg", "w_pct"]
    base = {r: float(df[r].median()) for r in raw}

    def feat_row(d):
        return [
            d["dip_j1"], d["dip_j2"], d["dip_slope"], d["dip_upper"],
            _wrap180(d["dipdir_j1"] - d["dipdir_slope"]),
            _wrap180(d["dipdir_j2"] - d["dipdir_slope"]),
            _wrap180(d["dipdir_upper"] - d["dipdir_slope"]),
            d["height_m"], d["gamma_kN_m3"], d["c1_kPa"], d["phi1_deg"],
            d["c2_kPa"], d["phi2_deg"], d["w_pct"],
        ]

    # expected: dip_slope = 'down' (steepness of the daylighting face). Everything else
    # geometric — joint dips, all dip-directions, AND upper-slope dip — is report-only:
    # upper-slope dip has no clean monotonic FoS rule for a wedge (verified: weak, ambiguous).
    meta = [
        ("dip_j1", "J1 dip", "deg", None),
        ("dip_j2", "J2 dip", "deg", None),
        ("dipdir_j1", "J1 dip-dir", "deg", None),
        ("dipdir_j2", "J2 dip-dir", "deg", None),
        ("dip_slope", "Slope-face dip", "deg", "down"),
        ("dipdir_slope", "Slope dip-dir", "deg", None),
        ("dip_upper", "Upper-slope dip", "deg", None),
        ("dipdir_upper", "Upper dip-dir", "deg", None),
        ("height_m", "Height H", "m", "down"),
        ("gamma_kN_m3", "Unit weight γ", "kN/m³", None),
        ("c1_kPa", "Cohesion c1", "kPa", "up"),
        ("phi1_deg", "Friction φ1", "deg", "up"),
        ("c2_kPa", "Cohesion c2", "kPa", "up"),
        ("phi2_deg", "Friction φ2", "deg", "up"),
        ("w_pct", "Water %", "%", "down"),
    ]
    results = []
    for key, label, unit, exp in meta:
        xs = np.linspace(df[key].min(), df[key].max(), N_STEPS)
        M = []
        for v in xs:
            d = dict(base)
            d[key] = float(v)
            M.append(feat_row(d))
        ys = np.asarray(reg.predict(np.array(M))).ravel()
        results.append(dict(key=key, label=label, unit=unit, baseline=base[key],
                            xvals=xs, yvals=ys, **analyse(xs, ys, exp)))
    return results, "FoS"


def run_toppling():
    X, y = topple_load()
    df = pd.DataFrame(X, columns=TOPPLE_FEATURES)
    reg = new_regressor(cpu=True, ignore_limits=True)
    reg.fit(X, y)

    # bedding_dip expected 'up': verified against the Goodman–Bray solver data — over the
    # 55–75° range, steeper (more upright) columns overhang their base less, so the toppling
    # moment shrinks and FoS rises (partial ρ≈+0.58; binned mean FoS 0.75→1.27). The model
    # reproduces the solver; the earlier 'down' intuition (interlayer-slip gate) was wrong here.
    meta = [
        ("slope_angle_deg", "Slope angle", "deg", "down"),
        ("bedding_dip_deg", "Bedding dip", "deg", "up"),
        ("joint_spacing_m", "Joint spacing", "m", "up"),
        ("slope_height_m", "Height H", "m", "down"),
        ("joint_friction_deg", "Joint friction φj", "deg", "up"),
        ("unit_weight_kNm3", "Unit weight γ", "kN/m³", None),
        ("water_ratio", "Water ratio", "–", "down"),
    ]
    base = {f: float(df[f].median()) for f in TOPPLE_FEATURES}
    results = []
    for key, label, unit, exp in meta:
        xs = np.linspace(df[key].min(), df[key].max(), N_STEPS)
        M = np.tile([base[f] for f in TOPPLE_FEATURES], (N_STEPS, 1))
        M[:, TOPPLE_FEATURES.index(key)] = xs
        ys = np.asarray(reg.predict(M)).ravel()
        results.append(dict(key=key, label=label, unit=unit, baseline=base[key],
                            xvals=xs, yvals=ys, **analyse(xs, ys, exp)))
    return results, "FoS"


def plot_mechanism(name, results, resp_label):
    n = len(results)
    ncol = 4 if n > 9 else 3
    nrow = int(np.ceil(n / ncol))
    fig, axes = plt.subplots(nrow, ncol, figsize=(4.2 * ncol, 3.2 * nrow))
    axes = np.array(axes).ravel()
    color = {"PASS": "#1a7f37", "FAIL": "#cf222e", "FAIL (flat)": "#cf222e", "report-only": "#57606a"}
    for ax, r in zip(axes, results):
        c = color.get(r["verdict"], "#57606a")
        ax.plot(r["xvals"], r["yvals"], color=c, lw=2)
        ax.scatter([r["baseline"]], [np.interp(r["baseline"], r["xvals"], r["yvals"])],
                   color="black", zorder=5, s=22, label="median baseline")
        exp = ARROW[r["expected"]]
        obs = ARROW.get(r["observed"], "•") if r["observed"] in ARROW else \
              {"up": "↑", "down": "↓", "flat": "≈"}.get(r["observed"], "•")
        ax.set_title(f"{r['label']} ({r['unit']})\nexp {exp} · obs {obs} · {r['verdict']}",
                     fontsize=9, color=c)
        ax.set_xlabel(r["label"], fontsize=8)
        ax.set_ylabel(resp_label, fontsize=8)
        ax.tick_params(labelsize=7)
        ax.grid(alpha=0.25)
    for ax in axes[n:]:
        ax.axis("off")
    fig.suptitle(f"{name.upper()} — one-at-a-time sensitivity (others fixed at median)  ·  response = {resp_label}",
                 fontsize=12, y=1.0)
    fig.tight_layout(rect=[0, 0, 1, 0.98])
    out = FIGDIR / f"sensitivity_{name}.png"
    fig.savefig(out, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return out


def main():
    runners = [("planar", run_planar), ("wedge", run_wedge),
               ("toppling", run_toppling), ("circular", run_circular)]
    rows = []
    for name, fn in runners:
        print(f"\n=== {name} ===", flush=True)
        results, resp_label = fn()
        for r in results:
            ev = ARROW[r["expected"]]
            print(f"  {r['label']:<20} exp {ev}  obs {r['observed']:<5} "
                  f"{r['verdict']:<12} linR2={r['linear_R2']} cubR2={r['nonlinear_R2']} nl={r['nonlinear']}",
                  flush=True)
            rows.append({
                "mechanism": name,
                "parameter": r["label"],
                "unit": r["unit"],
                "response": resp_label,
                "expected_direction": {"up": "up (+)", "down": "down (-)", None: "report-only"}[r["expected"]],
                "observed_direction": r["observed"],
                "pass_fail": r["verdict"],
                "linear_R2": r["linear_R2"],
                "nonlinear_R2": r["nonlinear_R2"],
                "nonlinear_gain": r["nonlinear_gain"],
                "nonlinear": r["nonlinear"],
                "spearman_rho": r["spearman_rho"],
                "pearson_r": r["pearson_r"],
                "response_range": r["resp_range"],
                "baseline_median": round(r["baseline"], 4),
                "sweep_min": round(float(r["xvals"].min()), 4),
                "sweep_max": round(float(r["xvals"].max()), 4),
            })
        out = plot_mechanism(name, results, resp_label)
        print(f"  -> {out}", flush=True)

    csv_path = FIGDIR / "sensitivity_summary.csv"
    cols = ["mechanism", "parameter", "unit", "response", "expected_direction",
            "observed_direction", "pass_fail", "linear_R2", "nonlinear_R2",
            "nonlinear_gain", "nonlinear", "spearman_rho", "pearson_r",
            "response_range", "baseline_median", "sweep_min", "sweep_max"]
    with open(csv_path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(f"\nwrote {csv_path}  ({len(rows)} rows)")

    # scoreboard
    scored = [r for r in rows if r["pass_fail"] not in ("report-only",)]
    passed = [r for r in scored if r["pass_fail"] == "PASS"]
    print(f"\nDirection checks: {len(passed)}/{len(scored)} PASS "
          f"({len(rows) - len(scored)} report-only)")
    fails = [r for r in scored if r["pass_fail"] != "PASS"]
    for r in fails:
        print(f"  FAIL: {r['mechanism']}/{r['parameter']} "
              f"(expected {r['expected_direction']}, observed {r['observed_direction']})")


if __name__ == "__main__":
    main()
