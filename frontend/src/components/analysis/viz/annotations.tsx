import { useMemo } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";

export const ACCENT = "#ff9d55";
export const ANGLE_COLOR = "#ffd08a";
export const DIM_COLOR = "#9fb6d8";
export const WATER_COLOR = "#4aa3ff";

const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
export { V };

/** Floating label that stays screen-readable regardless of camera angle. */
export function Tag({
  position,
  children,
  color = ANGLE_COLOR,
}: {
  position: THREE.Vector3;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span
        style={{
          color,
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
          textShadow: "0 1px 3px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {children}
      </span>
    </Html>
  );
}

/**
 * An angle arc drawn in the plane containing directions u and v, swept from u
 * to v about their common vertex. Real 3D geometry — it tilts with the model.
 */
export function AngleArc({
  vertex,
  from,
  to,
  radius,
  label,
  color = ANGLE_COLOR,
}: {
  vertex: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  radius: number;
  label: string;
  color?: string;
}) {
  const { pts, mid } = useMemo(() => {
    const u = from.clone().normalize();
    const v = to.clone().normalize();
    let axis = new THREE.Vector3().crossVectors(u, v);
    if (axis.lengthSq() < 1e-9) axis.set(0, 0, 1);
    axis.normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(u.dot(v), -1, 1));
    const out: THREE.Vector3[] = [];
    const seg = 40;
    for (let i = 0; i <= seg; i++) {
      const t = (i / seg) * angle;
      out.push(vertex.clone().add(u.clone().applyAxisAngle(axis, t).multiplyScalar(radius)));
    }
    const m = vertex
      .clone()
      .add(u.clone().applyAxisAngle(axis, angle / 2).multiplyScalar(radius * 1.28));
    return { pts: out, mid: m };
  }, [vertex, from, to, radius]);

  return (
    <group>
      <Line points={pts} color={color} lineWidth={1.6} />
      <Tag position={mid} color={color}>
        {label}
      </Tag>
    </group>
  );
}

/** Dimension line with arrowheads at both ends and a centred label. */
export function DimLine({
  from,
  to,
  label,
  color = DIM_COLOR,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  label: string;
  color?: string;
}) {
  const dir = useMemo(() => to.clone().sub(from).normalize(), [from, to]);
  const len = from.distanceTo(to);
  const head = Math.min(0.22, len * 0.14);
  const qA = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate()),
    [dir]
  );
  const qB = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
    [dir]
  );
  const mid = useMemo(() => from.clone().add(to).multiplyScalar(0.5), [from, to]);

  return (
    <group>
      <Line points={[from, to]} color={color} lineWidth={1.3} />
      <mesh position={from} quaternion={qA}>
        <coneGeometry args={[head * 0.4, head, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={to} quaternion={qB}>
        <coneGeometry args={[head * 0.4, head, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Tag position={mid} color={color}>
        {label}
      </Tag>
    </group>
  );
}

/** Array of pressure arrows along a segment, normal to it, triangular taper. */
export function PressureArrows({
  from,
  to,
  normal,
  peak,
  count = 7,
  color = WATER_COLOR,
  peakAt = 0.5,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  normal: THREE.Vector3;
  peak: number;
  count?: number;
  color?: string;
  peakAt?: number;
}) {
  const n = useMemo(() => normal.clone().normalize(), [normal]);
  const q = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n),
    [n]
  );
  const arrows = useMemo(() => {
    const out: { base: THREE.Vector3; len: number }[] = [];
    for (let i = 1; i < count; i++) {
      const t = i / count;
      // triangular distribution peaking at `peakAt`
      const mag = t <= peakAt ? t / peakAt : (1 - t) / Math.max(1e-3, 1 - peakAt);
      out.push({ base: from.clone().lerp(to, t), len: Math.max(0.04, mag * peak) });
    }
    return out;
  }, [from, to, count, peak, peakAt]);

  return (
    <group>
      {arrows.map((a, i) => {
        const tip = a.base.clone().add(n.clone().multiplyScalar(a.len));
        return (
          <group key={i}>
            <Line points={[a.base, tip]} color={color} lineWidth={1.1} />
            <mesh position={tip} quaternion={q}>
              <coneGeometry args={[0.045, 0.11, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Extrudes a 2D cross-section along z, centred on the origin. */
export function Extruded({
  points,
  depth,
  color,
  opacity = 1,
  transparent = false,
  wireframe = false,
}: {
  points: [number, number][];
  depth: number;
  color: string;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
}) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }, [points, depth]);

  return (
    <mesh geometry={geo} position={[0, 0, -depth / 2]}>
      <meshStandardMaterial
        color={color}
        roughness={0.95}
        metalness={0.02}
        flatShading
        transparent={transparent}
        opacity={opacity}
        wireframe={wireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Flat quad spanning a cross-section segment across the model width. */
export function PlaneStrip({
  a,
  b,
  depth,
  color,
  opacity = 0.45,
  wireframe = false,
}: {
  a: [number, number];
  b: [number, number];
  depth: number;
  color: string;
  opacity?: number;
  wireframe?: boolean;
}) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const hz = depth / 2;
    const v = new Float32Array([
      a[0], a[1], -hz, b[0], b[1], -hz, b[0], b[1], hz,
      a[0], a[1], -hz, b[0], b[1], hz, a[0], a[1], hz,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  }, [a, b, depth]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        roughness={0.6}
        emissive={color}
        emissiveIntensity={0.35}
        wireframe={wireframe}
      />
    </mesh>
  );
}
