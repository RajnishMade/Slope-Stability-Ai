import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import {
  ACCENT,
  AngleArc,
  DIM_COLOR,
  DimLine,
  Extruded,
  PlaneStrip,
  PressureArrows,
  Tag,
  V,
  WATER_COLOR,
} from "./annotations";

const ROCK = "#3f434b";
const D2R = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;

export interface SceneProps {
  p: Record<string, number>;
  showAngles: boolean;
  showDims: boolean;
  showWater: boolean;
  wireframe: boolean;
  playing: boolean;
}

/** Visual height kept in a readable band while still responding to real H. */
function vizHeight(H: number) {
  return clamp(H / 12, 2.6, 8.5);
}

/** Slides a group down a direction on a loop while `playing`. */
function useSlide(playing: boolean, dir: THREE.Vector3, dist: number) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    if (!playing) {
      g.position.lerp(new THREE.Vector3(0, 0, 0), 0.15);
      return;
    }
    const t = (state.clock.elapsedTime % 3.4) / 3.4;
    const e = t < 0.25 ? 0 : Math.min(1, (t - 0.25) / 0.5);
    g.position.copy(dir.clone().multiplyScalar(e * dist));
  });
  return ref;
}

/* ------------------------------------------------------------------ */
/* PLANAR                                                              */
/* ------------------------------------------------------------------ */
export function PlanarScene({ p, showAngles, showDims, showWater, wireframe, playing }: SceneProps) {
  const Hv = vizHeight(p.H);
  const psf = clamp(p.slope_af, 5, 89);
  const psp = clamp(p.plane_dip, 2, Math.min(psf - 1, 85));
  const pss = clamp(p.upper_slope, 0, 44);

  const g = useMemo(() => {
    const tf = Math.tan(psf * D2R);
    const tp = Math.tan(psp * D2R);
    const ts = Math.tan(pss * D2R);
    const xt = Hv / tf; // toe, crest sits at x = 0
    let px = Math.abs(ts - tp) > 1e-6 ? (Hv - xt * tp) / (ts - tp) : NaN;
    if (!Number.isFinite(px) || px > -0.05 || px < -3 * Hv) px = -1.1 * Hv;
    const py = (xt - px) * tp;
    const Lb = 2.4 * Hv;
    return { tf, tp, ts, xt, px, py, Lb, W: Math.max(1.8, Hv * 0.85) };
  }, [Hv, psf, psp, pss]);

  const toe = V(g.xt, 0);
  const crest = V(0, Hv);
  const P = V(g.px, g.py);
  const slideDir = useMemo(() => toe.clone().sub(P).normalize(), [g.xt, g.px, g.py]);
  const slideRef = useSlide(playing, slideDir, Hv * 0.55);

  const wl = p.water_level ?? 0;

  return (
    <group position={[-g.xt * 0.35, -Hv * 0.42, 0]}>
      {/* intact rock mass */}
      <Extruded
        points={[
          [-g.Lb, 0],
          [g.xt, 0],
          [0, Hv],
          [-g.Lb, Hv + g.Lb * g.ts],
        ]}
        depth={g.W}
        color={ROCK}
        wireframe={wireframe}
      />

      {/* failure surface, highlighted and translucent */}
      <PlaneStrip a={[g.xt, 0]} b={[g.px, g.py]} depth={g.W} color={ACCENT} opacity={0.5} wireframe={wireframe} />

      {/* sliding block above the plane */}
      <group ref={slideRef}>
        <Extruded
          points={[
            [g.xt, 0],
            [0, Hv],
            [g.px, g.py],
          ]}
          depth={g.W * 0.98}
          color="#6a5340"
          opacity={0.82}
          transparent
          wireframe={wireframe}
        />
      </group>

      {/* discontinuity trace on the near face */}
      <Line points={[V(g.xt, 0, g.W / 2), V(g.px, g.py, g.W / 2)]} color={ACCENT} lineWidth={1.8} />

      {showAngles && (
        <>
          <AngleArc vertex={toe} from={V(-1, 0)} to={crest.clone().sub(toe)} radius={Hv * 0.3} label={`ψf ${psf.toFixed(0)}°`} />
          <AngleArc vertex={toe} from={V(-1, 0)} to={P.clone().sub(toe)} radius={Hv * 0.52} label={`ψp ${psp.toFixed(0)}°`} />
          <AngleArc vertex={crest} from={V(-1, 0)} to={V(-1, g.ts)} radius={Hv * 0.26} label={`ψs ${pss.toFixed(0)}°`} />
          {/* friction reference on the failure plane */}
          <AngleArc
            vertex={toe}
            from={V(-1, 0)}
            to={V(-Math.cos(p.phi * D2R), Math.sin(p.phi * D2R))}
            radius={Hv * 0.72}
            label={`φ ${p.phi.toFixed(0)}°`}
            color="#7ee08a"
          />
          <Line
            points={[toe, toe.clone().add(V(-Math.cos(p.phi * D2R), Math.sin(p.phi * D2R)).multiplyScalar(Hv * 0.95))]}
            color="#7ee08a"
            lineWidth={1.1}
            dashed
            dashSize={0.12}
            gapSize={0.1}
          />
        </>
      )}

      {showDims && (
        <DimLine from={V(g.xt + 0.7, 0)} to={V(g.xt + 0.7, Hv)} label={`H = ${p.H} m`} />
      )}

      {showWater && wl > 0 && (
        <>
          <PlaneStrip
            a={[g.px, wl * Hv * 0.72]}
            b={[g.xt, wl * Hv * 0.72]}
            depth={g.W * 1.02}
            color={WATER_COLOR}
            opacity={0.24}
          />
          <PressureArrows
            from={toe}
            to={P}
            normal={V(-(g.py - 0), g.px - g.xt).normalize().multiplyScalar(-1)}
            peak={wl * Hv * 0.3}
          />
        </>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* CIRCULAR                                                            */
/* ------------------------------------------------------------------ */
export function CircularScene({ p, showAngles, showDims, showWater, wireframe, playing }: SceneProps) {
  const Hv = vizHeight(p.H);
  const beta = clamp(p.beta, 5, 85);

  const g = useMemo(() => {
    const tb = Math.tan(beta * D2R);
    const xt = Hv / tb;
    const Lb = 2.4 * Hv;
    const W = Math.max(1.8, Hv * 0.85);
    // circle through toe and crest, bulging below the slope face
    const A = new THREE.Vector2(xt, 0);
    const B = new THREE.Vector2(0, Hv);
    const chord = A.distanceTo(B);
    const R = chord * 0.95;
    const mid = A.clone().add(B).multiplyScalar(0.5);
    const d = B.clone().sub(A).normalize();
    const perp = new THREE.Vector2(-d.y, d.x); // points up-right, away from the mass
    const h = Math.sqrt(Math.max(0, R * R - (chord / 2) ** 2));
    const O = mid.clone().add(perp.clone().multiplyScalar(h));
    return { tb, xt, Lb, W, R, O, A, B };
  }, [Hv, beta]);

  const arcPts = useMemo(() => {
    const a0 = Math.atan2(g.A.y - g.O.y, g.A.x - g.O.x);
    const a1 = Math.atan2(g.B.y - g.O.y, g.B.x - g.O.x);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Array.from({ length: 49 }, (_, i) => {
      const a = a0 + (i / 48) * d;
      return V(g.O.x + g.R * Math.cos(a), g.O.y + g.R * Math.sin(a));
    });
  }, [g]);

  const rotRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    const r = rotRef.current;
    if (!r) return;
    if (!playing) {
      r.rotation.z += (0 - r.rotation.z) * 0.15;
      return;
    }
    const t = (state.clock.elapsedTime % 3.4) / 3.4;
    const e = t < 0.25 ? 0 : Math.min(1, (t - 0.25) / 0.5);
    r.rotation.z = -e * 0.12;
  });

  return (
    <group position={[-g.xt * 0.35, -Hv * 0.42, 0]}>
      <Extruded
        points={[
          [-g.Lb, 0],
          [g.xt, 0],
          [0, Hv],
          [-g.Lb, Hv],
        ]}
        depth={g.W}
        color={ROCK}
        wireframe={wireframe}
      />

      {/* rotational failure mass, pivoting about the circle centre */}
      <group position={[g.O.x, g.O.y, 0]} ref={rotRef}>
        <group position={[-g.O.x, -g.O.y, 0]}>
          <Extruded
            points={[
              [g.xt, 0],
              [0, Hv],
              [-g.Lb * 0.35, Hv],
              ...arcPts.slice().reverse().map((v) => [v.x, v.y] as [number, number]),
            ]}
            depth={g.W * 0.98}
            color="#6a5340"
            opacity={0.8}
            transparent
            wireframe={wireframe}
          />
        </group>
      </group>

      {/* the slip circle itself */}
      <Line points={arcPts.map((v) => V(v.x, v.y, g.W / 2))} color={ACCENT} lineWidth={2.4} />

      {/* centre O and radius R */}
      <mesh position={[g.O.x, g.O.y, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshBasicMaterial color={ACCENT} />
      </mesh>
      <Tag position={V(g.O.x, g.O.y + 0.28)} color={ACCENT}>
        O
      </Tag>
      <Line
        points={[V(g.O.x, g.O.y), arcPts[24]]}
        color={ACCENT}
        lineWidth={1.2}
        dashed
        dashSize={0.14}
        gapSize={0.1}
      />
      <Tag
        position={V(g.O.x, g.O.y).lerp(arcPts[24], 0.55).add(V(0.25, 0.15))}
        color={ACCENT}
      >
        R
      </Tag>

      {showAngles && (
        <AngleArc
          vertex={V(g.xt, 0)}
          from={V(-1, 0)}
          to={V(-g.xt, Hv)}
          radius={Hv * 0.34}
          label={`β ${beta.toFixed(0)}°`}
        />
      )}

      {showDims && <DimLine from={V(g.xt + 0.7, 0)} to={V(g.xt + 0.7, Hv)} label={`H = ${p.H} m`} />}

      {showWater && p.r_u > 0 && (
        <PlaneStrip
          a={[-g.Lb * 0.9, p.r_u * Hv * 1.2]}
          b={[g.xt, p.r_u * Hv * 1.2]}
          depth={g.W * 1.02}
          color={WATER_COLOR}
          opacity={0.24}
        />
      )}
      {showWater && p.r_u > 0 && (
        <Tag position={V(-g.Lb * 0.55, p.r_u * Hv * 1.2 + 0.25)} color={WATER_COLOR}>
          rᵤ {p.r_u}
        </Tag>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* TOPPLING                                                            */
/* ------------------------------------------------------------------ */
export function ToppleScene({ p, showAngles, showDims, wireframe, playing }: SceneProps) {
  const Hv = vizHeight(p.slope_height_m);
  const psf = clamp(p.slope_angle_deg, 15, 85);
  const dip = clamp(p.bedding_dip_deg, 0, 80);

  // b/h from real values, normalised so the block reads at the scene scale
  const bReal = p.joint_spacing_m;
  const hReal = p.slope_height_m / 4;
  const ratio = hReal / Math.max(0.01, bReal);

  const g = useMemo(() => {
    const n = 6;
    const b = Math.max(0.22, Math.min(0.75, Hv / Math.max(2, ratio) / 1.2));
    const base = Math.tan(psf * D2R);
    const cols = Array.from({ length: n }, (_, i) => {
      const x = -i * b * 1.12;
      const h = Hv * (0.42 + 0.58 * (1 - i / n));
      return { x, h, y: -x * Math.tan(dip * D2R) * 0.35 };
    });
    return { b, cols, base, W: Math.max(1.6, Hv * 0.7) };
  }, [Hv, psf, dip, ratio]);

  const refs = useRef<THREE.Group[]>([]);
  useFrame((state) => {
    for (let i = 0; i < refs.current.length; i++) {
      const gr = refs.current[i];
      if (!gr) continue;
      if (!playing) {
        gr.rotation.z += (0 - gr.rotation.z) * 0.15;
        continue;
      }
      const t = (state.clock.elapsedTime % 4) / 4;
      const s = 0.15 + i * 0.09;
      const e = clamp((t - s) / 0.2, 0, 1);
      gr.rotation.z = -e * 0.5;
    }
  });

  const rep = g.cols[1];

  return (
    <group position={[g.cols[g.cols.length - 1].x / -2 - 0.6, -Hv * 0.45, 0]}>
      {/* basal plane, dipping into the slope */}
      <group rotation={[0, 0, -dip * D2R * 0.35]}>
        <Extruded
          points={[
            [-Hv * 2.2, -0.42],
            [Hv * 0.7, -0.42],
            [Hv * 0.7, 0],
            [-Hv * 2.2, 0],
          ]}
          depth={g.W}
          color={ROCK}
          wireframe={wireframe}
        />
      </group>

      {g.cols.map((c, i) => (
        <group
          key={i}
          position={[c.x, c.y, 0]}
          ref={(el) => {
            if (el) refs.current[i] = el;
          }}
        >
          <Extruded
            points={[
              [0, 0],
              [g.b, 0],
              [g.b, c.h],
              [0, c.h],
            ]}
            depth={g.W * 0.92}
            color={i === 1 ? "#6a5340" : ROCK}
            opacity={i === 1 ? 0.9 : 1}
            transparent={i === 1}
            wireframe={wireframe}
          />
        </group>
      ))}

      {showAngles && (
        <>
          <AngleArc
            vertex={V(Hv * 0.7, 0)}
            from={V(-1, 0)}
            to={V(-Math.cos(dip * D2R * 0.35), -Math.sin(dip * D2R * 0.35))}
            radius={Hv * 0.34}
            label={`ψp ${dip.toFixed(0)}°`}
          />
          <Tag position={V(-Hv * 1.5, Hv * 1.15)} color={ACCENT}>
            h/b = {ratio.toFixed(2)} {ratio > 1 / Math.tan(Math.max(1, dip) * D2R) ? "(topple)" : "(stable)"}
          </Tag>
        </>
      )}

      {showDims && rep && (
        <>
          <DimLine from={V(rep.x, rep.y - 0.35)} to={V(rep.x + g.b, rep.y - 0.35)} label={`b = ${bReal} m`} />
          <DimLine
            from={V(rep.x - 0.3, rep.y)}
            to={V(rep.x - 0.3, rep.y + rep.h)}
            label={`h ≈ ${hReal.toFixed(1)} m`}
            color={DIM_COLOR}
          />
        </>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* WEDGE                                                               */
/* ------------------------------------------------------------------ */
/** Unit normal of a plane from dip / dip-direction (x=E, y=Up, z=N). */
export function planeNormal(dipDeg: number, dipDirDeg: number) {
  const d = dipDeg * D2R;
  const a = dipDirDeg * D2R;
  return new THREE.Vector3(Math.sin(a) * Math.sin(d), Math.cos(d), Math.cos(a) * Math.sin(d)).normalize();
}

export function intersectionLine(n1: THREE.Vector3, n2: THREE.Vector3) {
  const d = new THREE.Vector3().crossVectors(n1, n2);
  if (d.lengthSq() < 1e-9) return { dir: new THREE.Vector3(0, -1, 0), plunge: 90, trend: 0 };
  d.normalize();
  if (d.y > 0) d.negate(); // take the downward sense
  const plunge = Math.asin(clamp(-d.y, -1, 1)) / D2R;
  let trend = Math.atan2(d.x, d.z) / D2R;
  if (trend < 0) trend += 360;
  return { dir: d, plunge, trend };
}

function DiscPlane({
  normal,
  size,
  color,
  wireframe,
}: {
  normal: THREE.Vector3;
  size: number;
  color: string;
  wireframe: boolean;
}) {
  const q = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize()),
    [normal]
  );
  return (
    <mesh quaternion={q}>
      <circleGeometry args={[size, 48]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.34}
        side={THREE.DoubleSide}
        emissive={color}
        emissiveIntensity={0.3}
        wireframe={wireframe}
      />
    </mesh>
  );
}

export function WedgeScene({ p, showAngles, showDims, wireframe, playing }: SceneProps) {
  const Hv = vizHeight(p.height_m);
  const n1 = useMemo(() => planeNormal(p.dip_j1, p.dipdir_j1), [p.dip_j1, p.dipdir_j1]);
  const n2 = useMemo(() => planeNormal(p.dip_j2, p.dipdir_j2), [p.dip_j2, p.dipdir_j2]);
  const li = useMemo(() => intersectionLine(n1, n2), [n1, n2]);

  const slideRef = useSlide(playing, li.dir, Hv * 0.5);
  const R = Hv * 0.85;

  return (
    <group position={[0, Hv * 0.1, 0]}>
      <DiscPlane normal={n1} size={R} color="#4A90D9" wireframe={wireframe} />
      <DiscPlane normal={n2} size={R} color="#D97B4A" wireframe={wireframe} />

      {/* line of intersection */}
      <Line
        points={[li.dir.clone().multiplyScalar(-R * 0.2), li.dir.clone().multiplyScalar(R * 1.25)]}
        color={ACCENT}
        lineWidth={2.6}
      />

      {/* wedge block sliding along it */}
      <group ref={slideRef}>
        <mesh position={li.dir.clone().multiplyScalar(R * 0.45)}>
          <tetrahedronGeometry args={[Hv * 0.3]} />
          <meshStandardMaterial color="#6a5340" flatShading roughness={0.9} wireframe={wireframe} />
        </mesh>
      </group>

      {showAngles && (
        <>
          <Tag position={n1.clone().multiplyScalar(R * 0.55).add(V(0, 0.2))} color="#79b6f2">
            J1 {p.dip_j1.toFixed(0)}° / {p.dipdir_j1.toFixed(0)}°
          </Tag>
          <Tag position={n2.clone().multiplyScalar(R * 0.55).add(V(0, 0.2))} color="#e8a172">
            J2 {p.dip_j2.toFixed(0)}° / {p.dipdir_j2.toFixed(0)}°
          </Tag>
          <Tag position={li.dir.clone().multiplyScalar(R * 1.35)} color={ACCENT}>
            ψi {li.plunge.toFixed(0)}° → {li.trend.toFixed(0)}°
          </Tag>
        </>
      )}

      {showDims && (
        <DimLine from={V(R * 1.15, -R * 0.55)} to={V(R * 1.15, R * 0.55)} label={`H = ${p.height_m} m`} />
      )}
    </group>
  );
}
