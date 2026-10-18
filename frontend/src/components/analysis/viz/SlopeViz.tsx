import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ModeId } from "../../../data/modes";
import { CircularScene, PlanarScene, ToppleScene, WedgeScene } from "./scenes";
import type { SceneProps } from "./scenes";
import Stereonet from "./Stereonet";

const DEFAULT_CAM: [number, number, number] = [9, 6, 11];

/**
 * Debounces the canvas resize so dragging the divider stays smooth instead of
 * re-allocating the drawing buffer on every pointer move.
 *
 * MUST be a stable module-level object: R3F feeds this straight into
 * react-use-measure, and a fresh literal each render tears down and re-creates
 * the ResizeObserver, which leaves the canvas stuck at its mount-time size.
 */
const RESIZE_OPTS = { debounce: 90, scroll: false } as const;

/**
 * Keeps the slope framed when the panel is resized. R3F already updates the
 * camera aspect (so nothing distorts); this additionally pulls the camera in or
 * out so the model still fits after the panel changes shape — fitting against
 * the SMALLER of the vertical/horizontal FOV so a short, wide panel still shows
 * the whole slope. The orbit direction the user chose is preserved.
 */
function FitOnResize({
  targetRef,
  controlsRef,
  register,
}: {
  targetRef: React.RefObject<THREE.Group | null>;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  register: (fn: () => void) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const fit = useCallback(() => {
    const group = targetRef.current;
    if (!group) return;
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) return;

    const cam = camera as THREE.PerspectiveCamera;
    const vFov = (cam.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect);
    // 1.03 leaves just enough margin for the annotation labels that sit
    // outside the geometry, without stranding the model in dead space
    const dist = (sphere.radius / Math.sin(Math.min(vFov, hFov) / 2)) * 1.03;

    // Re-centre on the model itself. The mode scenes are offset from the
    // origin, so orbiting around (0,0,0) would leave the slope floating to
    // one side of the panel instead of sitting in the middle.
    const controls = controlsRef.current;
    const target = sphere.center.clone();
    const dir = cam.position.clone().sub(controls ? controls.target : target);
    if (dir.lengthSq() < 1e-8) dir.set(0, 0, 1);
    cam.position.copy(target.clone().add(dir.normalize().multiplyScalar(dist)));
    if (controls) controls.target.copy(target);
    cam.updateProjectionMatrix();
    controls?.update();
  }, [camera, controlsRef, targetRef]);

  // expose to the Reset view button
  useEffect(() => register(fit), [register, fit]);

  // re-fit whenever the canvas changes size (debounced by Canvas `resize`)
  useEffect(() => {
    fit();
  }, [size.width, size.height, fit]);

  return null;
}

/**
 * Keeps the 3D annotation labels from printing on top of one another.
 *
 * Labels share vertices (e.g. three angle arcs at the planar toe) and their
 * on-screen order changes with geometry and camera angle, so fixed offsets
 * can't work. Instead, every frame: measure each label's real screen box,
 * sort top-to-bottom, and push any label that collides with one already
 * placed down until it clears. The nudge is written to the CSS `translate`
 * property, which composes with (rather than overwrites) a label's own
 * transform. A handful of labels → negligible cost; rAF pauses off-screen.
 */
function useLabelDeconflict(rootRef: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !active) return;
    const GAP = 2;
    let raf = 0;

    const tick = () => {
      const els = Array.from(root.querySelectorAll<HTMLElement>("[data-viz-label]"));
      if (els.length > 1) {
        const items = els.map((el) => {
          const r = el.getBoundingClientRect();
          const cur = Number(el.dataset.dy || 0);
          return { el, x: r.left, y: r.top - cur, w: r.width, h: r.height, cur };
        });
        items.sort((a, b) => a.y - b.y || a.x - b.x);
        const placed: { x: number; y: number; w: number; h: number }[] = [];
        for (const it of items) {
          let y = it.y;
          for (let pass = 0, moved = true; moved && pass < 12; pass++) {
            moved = false;
            for (const p of placed) {
              const ix = Math.min(it.x + it.w, p.x + p.w) - Math.max(it.x, p.x);
              const iy = Math.min(y + it.h, p.y + p.h) - Math.max(y, p.y);
              if (ix > 0 && iy > 0) {
                y = p.y + p.h + GAP;
                moved = true;
              }
            }
          }
          const dy = Math.round(y - it.y);
          if (dy !== it.cur) {
            it.el.style.translate = dy ? `0 ${dy}px` : "";
            it.el.dataset.dy = String(dy);
          }
          placed.push({ x: it.x, y, w: it.w, h: it.h });
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rootRef, active]);
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors duration-200",
        on
          ? "border-accent/60 bg-accent/20 text-accent-hover backdrop-blur-md"
          : "border-glass-border bg-black/40 text-secondary backdrop-blur-md hover:bg-black/55 hover:text-primary",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function SlopeViz({ mode, params }: { mode: ModeId; params: Record<string, number> }) {
  const [showAngles, setShowAngles] = useState(true);
  const [showDims, setShowDims] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [playing, setPlaying] = useState(false);
  const controls = useRef<OrbitControlsImpl>(null);
  const fitGroup = useRef<THREE.Group>(null);
  const fitFn = useRef<(() => void) | null>(null);
  const register = useCallback((fn: () => void) => {
    fitFn.current = fn;
  }, []);

  const sceneProps: SceneProps = { p: params, showAngles, showDims, showWater, wireframe, playing };
  const valid = Object.values(params).every((v) => Number.isFinite(v));
  const wrapRef = useRef<HTMLDivElement>(null);
  useLabelDeconflict(wrapRef, valid);

  function resetView() {
    const c = controls.current;
    if (!c) return;
    c.object.position.set(...DEFAULT_CAM);
    c.target.set(0, 0, 0);
    c.update();
    // re-frame for the panel's current shape rather than the default aspect
    fitFn.current?.();
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      {valid ? (
        <Canvas
          camera={{ position: DEFAULT_CAM, fov: 42 }}
          dpr={[1, 1.8]}
          gl={{ antialias: true }}
          resize={RESIZE_OPTS}
        >
          <color attach="background" args={["#0b0d11"]} />
          <ambientLight intensity={0.75} color="#b9c4d6" />
          <directionalLight position={[6, 10, 6]} intensity={1.5} color="#ffd9b0" />
          <directionalLight position={[-6, 4, -5]} intensity={0.5} color="#7f96c0" />

          <Grid
            args={[40, 40]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#2c3038"
            sectionSize={5}
            sectionThickness={0.9}
            sectionColor="#3d434e"
            fadeDistance={44}
            fadeStrength={1.5}
            position={[0, -0.001, 0]}
            infiniteGrid
          />

          {/* only the slope itself is measured for framing — the infinite grid
              and gizmo are excluded so they can't blow up the bounding sphere */}
          <group ref={fitGroup}>
            {mode === "planar" && <PlanarScene {...sceneProps} />}
            {mode === "circular" && <CircularScene {...sceneProps} />}
            {mode === "toppling" && <ToppleScene {...sceneProps} />}
            {mode === "wedge" && <WedgeScene {...sceneProps} />}
          </group>

          <OrbitControls ref={controls} enablePan enableZoom enableRotate makeDefault />
          <FitOnResize targetRef={fitGroup} controlsRef={controls} register={register} />
          <GizmoHelper alignment="bottom-right" margin={[58, 58]}>
            <GizmoViewport axisColors={["#ff6b5e", "#7ee08a", "#5aa9ff"]} labelColor="#e8e8ea" />
          </GizmoHelper>
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-tertiary">
          Fix the out-of-range parameters to render the slope.
        </div>
      )}

      {mode === "wedge" && valid && (
        <Stereonet
          dip1={params.dip_j1}
          dipdir1={params.dipdir_j1}
          dip2={params.dip_j2}
          dipdir2={params.dipdir_j2}
          phi={Math.min(params.phi1_deg, params.phi2_deg)}
          dipSlope={params.dip_slope}
          dipdirSlope={params.dipdir_slope}
        />
      )}

      {/* toggles */}
      <div className="pointer-events-auto absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
        <Toggle on={showAngles} onClick={() => setShowAngles((v) => !v)}>
          Angles
        </Toggle>
        <Toggle on={showDims} onClick={() => setShowDims((v) => !v)}>
          Dimensions
        </Toggle>
        <Toggle on={showWater} onClick={() => setShowWater((v) => !v)}>
          Water
        </Toggle>
        <Toggle on={wireframe} onClick={() => setWireframe((v) => !v)}>
          Wireframe
        </Toggle>
        <Toggle on={playing} onClick={() => setPlaying((v) => !v)}>
          {playing ? "❚❚ Pause" : "▶ Play"}
        </Toggle>
        <button
          type="button"
          onClick={resetView}
          className="rounded-lg border border-glass-border bg-black/40 px-2.5 py-1 text-xs font-medium text-secondary backdrop-blur-md transition-colors duration-200 hover:bg-black/55 hover:text-primary"
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
