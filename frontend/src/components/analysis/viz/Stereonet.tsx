import { useMemo } from "react";
import * as THREE from "three";
import { intersectionLine, planeNormal } from "./scenes";

const R = 74;
const CX = 84;
const CY = 84;
const D2R = Math.PI / 180;

/** Equal-angle (Wulff) lower-hemisphere projection of a downward unit vector. */
function project(v: THREE.Vector3): [number, number] | null {
  if (v.y > 0) return null;
  const plunge = Math.asin(THREE.MathUtils.clamp(-v.y, -1, 1));
  const trend = Math.atan2(v.x, v.z);
  const r = R * Math.tan((Math.PI / 2 - plunge) / 2);
  return [CX + r * Math.sin(trend), CY - r * Math.cos(trend)];
}

/** Great circle of a plane = all unit vectors orthogonal to its normal. */
function greatCircle(n: THREE.Vector3): string {
  const up = Math.abs(n.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const e1 = new THREE.Vector3().crossVectors(n, up).normalize();
  const e2 = new THREE.Vector3().crossVectors(n, e1).normalize();
  const segs: string[] = [];
  let pen = false;
  for (let i = 0; i <= 180; i++) {
    const t = (i / 180) * Math.PI * 2;
    const v = e1.clone().multiplyScalar(Math.cos(t)).add(e2.clone().multiplyScalar(Math.sin(t)));
    const pt = project(v.normalize());
    if (!pt) {
      pen = false;
      continue;
    }
    segs.push(`${pen ? "L" : "M"}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`);
    pen = true;
  }
  return segs.join(" ");
}

/**
 * Wedge stereonet inset: both discontinuity great circles, their intersection,
 * and the friction cone. The intersection flashes red when it plots inside the
 * friction circle (i.e. plunges more steeply than φ → kinematically unstable).
 */
export default function Stereonet({
  dip1,
  dipdir1,
  dip2,
  dipdir2,
  phi,
  dipSlope,
  dipdirSlope,
}: {
  dip1: number;
  dipdir1: number;
  dip2: number;
  dipdir2: number;
  phi: number;
  dipSlope: number;
  dipdirSlope: number;
}) {
  const { p1, p2, ps, ip, frictionR, unstable } = useMemo(() => {
    const n1 = planeNormal(dip1, dipdir1);
    const n2 = planeNormal(dip2, dipdir2);
    const ns = planeNormal(dipSlope, dipdirSlope);
    const li = intersectionLine(n1, n2);
    return {
      p1: greatCircle(n1),
      p2: greatCircle(n2),
      ps: greatCircle(ns),
      ip: project(li.dir),
      frictionR: R * Math.tan((Math.PI / 2 - phi * D2R) / 2),
      unstable: li.plunge > phi && li.plunge < dipSlope,
    };
  }, [dip1, dipdir1, dip2, dipdir2, phi, dipSlope, dipdirSlope]);

  return (
    <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-white/12 bg-black/55 p-2 backdrop-blur-md">
      <svg width={168} height={182} viewBox="0 0 168 182">
        <circle cx={CX} cy={CY} r={R} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.28)" strokeWidth="1" />
        {/* friction cone */}
        <circle
          cx={CX}
          cy={CY}
          r={frictionR}
          fill="rgba(126,224,138,0.07)"
          stroke="#7ee08a"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {/* cardinal ticks */}
        <line x1={CX} y1={CY - R} x2={CX} y2={CY - R + 7} stroke="rgba(255,255,255,0.5)" />
        <text x={CX} y={CY - R - 3} fill="rgba(255,255,255,0.55)" fontSize="9" textAnchor="middle">
          N
        </text>

        <path d={ps} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeDasharray="4 3" />
        <path d={p1} fill="none" stroke="#4A90D9" strokeWidth="1.8" />
        <path d={p2} fill="none" stroke="#D97B4A" strokeWidth="1.8" />

        {ip && (
          <>
            <circle cx={ip[0]} cy={ip[1]} r={4.5} fill={unstable ? "#ff453a" : "#ff9d55"} />
            <circle cx={ip[0]} cy={ip[1]} r={8} fill="none" stroke={unstable ? "#ff453a" : "#ff9d55"} strokeWidth="1" opacity="0.6" />
          </>
        )}

        <text x={CX} y={172} fill="rgba(255,255,255,0.45)" fontSize="9" textAnchor="middle">
          {unstable ? "Intersection inside friction cone" : "Intersection outside friction cone"}
        </text>
      </svg>
    </div>
  );
}
