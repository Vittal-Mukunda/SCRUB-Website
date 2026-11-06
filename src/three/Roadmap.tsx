import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { bots } from "../data/content";
import { loadedScans } from "./mat";
import { blobTexture, Lights, Stand } from "./shared";
import { AdaptiveResolution } from "./adaptive";
import { compileAsyncAO, renderWithAO } from "./ao";
import { topDpr } from "./dpr";
import { hideLeaves, layoutLeaves, leafGeometry, leafTexture, makeSpecs, SWEEP_YAW, sweepEndFor, sweepX, sweepYaw, updateLeaves } from "./leaves";
import { REL_SIZE } from "./sizes";
import { BELT_LOW, BELT_TOP } from "./v1Belt";
import { Ripples } from "./ripples";
import type { LeafField, LeafLayout } from "./leaves";
import type { LeafSources } from "./timeline";
import type { Fit } from "./shared";

export interface RoadmapSceneProps {
  /**
   * Which robot is on stage: 0..3, -1 on the journey slide before V1 (every robot waits off to the
   * right) and 4 once it is over (every robot has swum off to the left).
   */
  activeRef: MutableRefObject<number>;
  /** the journey slide's transition, 0..1 with scrolling: text breaking into leaves, then V1 sweeping them up */
  uRef: MutableRefObject<number>;
  /** where the journey slide's text sits, so the leaves can come out of it */
  sourcesRef: MutableRefObject<LeafSources>;
  /** fired once V1 and the leaves are ready to play the transition */
  onLeavesReady: () => void;
  /** on phones the text sits under the robot; this is the height in px the text needs at the bottom */
  reserveRef: MutableRefObject<number>;
  paused: boolean;
  /** fired once every robot is built and its shaders are ready */
  onReady: () => void;
}

/** Yaw (radians) each robot holds while it is on stage, picked so its features face the camera. */
// every robot travels left on this page, so each rests with its bow to the left, turned a little towards the viewer
const SHOW_YAW: Record<string, number> = { v1: Math.PI + 0.75, v2: Math.PI + 0.55, v4: Math.PI + 0.55 };
const TILT = 0.4;
/** seconds a robot takes to swim to a new spot: eases out of rest and into it, like a boat */
const SWIM_TIME = 0.6;
const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Slot {
  anchor: THREE.Group | null;
  fit: Fit | null;
  x: number;
  /** velocity, world units per second */
  v: number;
  /** smoothed acceleration, for the bow lifting as it speeds up */
  acc: number;
  /** seconds since the last wake ripple */
  wake: number;
  wakeSide: number;
  scale: number;
  ex: { current: number };
  run: { current: boolean };
}

/** Critically damped spring towards `target` (Unity's SmoothDamp): no jolt when it starts or when the target moves. */
function smoothDamp(s: Slot, target: number, smoothTime: number, dt: number) {
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = s.x - target;
  const temp = (s.v + omega * change) * dt;
  s.v = (s.v - omega * temp) * decay;
  s.x = target + (change + temp) * decay;
}

function Stage({ activeRef, uRef, sourcesRef, reserveRef, onReady, onLeavesReady }: RoadmapSceneProps) {
  const { viewport, size, gl, scene, camera } = useThree();
  const blob = useMemo(() => blobTexture(), []);
  const narrow = size.width < 900;
  const leafCount = narrow ? 520 : 1100;
  const specs = useMemo(() => makeSpecs(leafCount), [leafCount]);
  const leafGeo = useMemo(() => leafGeometry(), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ map: leafTexture(), roughness: 0.55, metalness: 0, side: THREE.DoubleSide }), []);
  const ripples = useMemo(() => new Ripples(180, TILT), []);
  const leafMesh = useRef<THREE.InstancedMesh>(null);
  const layout = useRef<{ key: string; lay: LeafLayout } | null>(null);
  const leavesShown = useRef(false);

  // the instance colour buffer has to exist before the first frame that sets a colour
  useLayoutEffect(() => {
    const m = leafMesh.current;
    if (!m) return;
    const c = new THREE.Color("#ffffff");
    for (let i = 0; i < m.count; i++) m.setColorAt(i, c);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    hideLeaves(m);
    layout.current = null;
    leavesShown.current = false;
  }, [leafCount]);

  const slots = useRef<Slot[]>(
    bots.map(() => ({ anchor: null, fit: null, x: 0, v: 0, acc: 0, wake: 0, wakeSide: 1, scale: 0, ex: { current: 0 }, run: { current: false } })),
  );
  const spins = useRef<(THREE.Group | null)[]>([]);
  const [loaded, setLoaded] = useState(0);
  // robots are built one at a time, each in its own task, so the page never freezes for all four at once
  const [mounted, setMounted] = useState(1);
  const [compiled, setCompiled] = useState(false);

  useEffect(() => {
    if (loaded < mounted || mounted >= bots.length) return;
    const t = setTimeout(() => setMounted((m) => m + 1), 0);
    return () => clearTimeout(t);
  }, [loaded, mounted]);

  const vw = viewport.width;
  const px = vw / size.width; // world units per pixel at the display plane

  /** Where, and how large, the on-stage robot sits. Wide screens: right half. Phones: upper half. */
  const rest = (f: Fit, i: number) => {
    const availW = narrow ? size.width * 0.9 : size.width * 0.5;
    const top = 76; // the nav bar
    const availH = narrow ? Math.min(size.height * 0.4, Math.max(size.height * 0.22, size.height - top - reserveRef.current - 16)) : size.height * 0.58;
    const fits = (g: Fit) => Math.min((availW * px) / g.d, (availH * px) / (g.sy + g.d * 0.2));
    // one footprint for the lot: the robot that needs the most room just fits, and the others keep their size next to it
    // one robot fills this stage at a time, so the size difference is softened (square root of the real ratio)
    // or the compact V4 would look lost next to the big V1; the products grid shows the true ratios
    const rel = (id: string) => Math.sqrt(REL_SIZE[id] ?? 1);
    let foot = (fits(f) * f.d) / rel(bots[i].id);
    slots.current.forEach((sl, j) => {
      if (sl.fit) foot = Math.min(foot, (fits(sl.fit) * sl.fit.d) / rel(bots[j].id));
    });
    const scale = (foot * rel(bots[i].id)) / f.d;
    const e = { w: f.d, h: f.sy + f.d * 0.2 };
    const hPx = (e.h * scale) / px;
    const cx = narrow ? size.width / 2 : size.width * 0.7;
    const cy = narrow ? top + availH / 2 : size.height * 0.5;
    const groundPy = cy + hPx * 0.28;
    return { x: (cx - size.width / 2) * px, y: -(groundPy - size.height / 2) * px, scale };
  };

  // build every shader and upload the scans while the robots are still hidden, so the first swim-in is smooth
  useEffect(() => {
    if (compiled || loaded < bots.length) return;
    let alive = true;
    const showAll = () => {
      const hidden = slots.current.flatMap((sl) => (sl.anchor && !sl.anchor.visible ? [sl.anchor] : []));
      hidden.forEach((a) => (a.visible = true));
      return () => hidden.forEach((a) => (a.visible = false));
    };
    const restore = showAll();
    const done = compileAsyncAO(gl, scene, camera);
    restore();
    const upload = async () => {
      for (const t of loadedScans) {
        if (!alive) return;
        gl.initTexture(t);
        await new Promise((r) => setTimeout(r, 0));
      }
    };
    // one hidden frame with every robot drawn at full size: it builds what compiling cannot, such as the extra
    // pass for V1's clear acrylic, so a robot's first appearance does not stall a frame
    const warm = () => {
      if (!alive) return;
      const undo = showAll();
      const saved = slots.current.map((sl, i) => {
        const spin = spins.current[i];
        if (!sl.anchor || !spin || !sl.fit) return null;
        const prev = { pos: sl.anchor.position.clone(), scale: spin.scale.x };
        sl.anchor.position.set(0, 0, 0);
        spin.scale.setScalar(rest(sl.fit, i).scale);
        return prev;
      });
      renderWithAO(gl, scene, camera);
      saved.forEach((p, i) => {
        const sl = slots.current[i];
        if (!p || !sl.anchor) return;
        sl.anchor.position.copy(p.pos);
        spins.current[i]?.scale.setScalar(p.scale);
      });
      undo();
    };
    done
      .catch(() => {})
      .then(upload)
      .then(warm)
      .then(() => {
        if (!alive) return;
        setCompiled(true);
        onReady();
      });
    return () => {
      alive = false;
    };
    // `rest` only sizes the robots for the hidden warm-up frame, so a stale copy is fine and must not re-run it
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [compiled, loaded, gl, scene, camera, onReady]);

  useEffect(() => {
    if (loaded >= 1) onLeavesReady();
  }, [loaded, onLeavesReady]);

  /** The lake, the leaves and V1's pass, derived from where V1 sits on this screen. */
  const field = (f: Fit): LeafField => {
    const r = rest(f, 0);
    const unit = f.d * r.scale;
    const toWorld = (p: number) => (p - size.width / 2) * px;
    // V1's belt as it sits in the scene while it sweeps: model points turned to the sweep heading and scaled,
    // relative to V1's centre (x along the lake, height above the water, z across), a leaf's thickness above the surface
    const cy = Math.cos(SWEEP_YAW);
    const sy = Math.sin(SWEEP_YAW);
    const onBelt = (m: [number, number]): [number, number, number] => {
      const rx = m[0] - f.cx;
      const rz = -f.cz;
      return [r.scale * (rx * cy + rz * sy), r.scale * (m[1] - f.minY) + 0.012 * unit, r.scale * (-rx * sy + rz * cy)];
    };
    const beltLow = onBelt(BELT_LOW);
    const beltTop = onBelt(BELT_TOP);
    const front = -beltLow[0];
    const ramp = beltTop[0] - beltLow[0];
    // on wide screens the leaves settle to the right of the text, so V1 never has to cross it
    const leftW = toWorld(size.width * (narrow ? 0.1 : 0.56));
    return {
      leftW,
      rightW: toWorld(size.width * (narrow ? 0.9 : 0.97)),
      groundY: r.y,
      unit,
      leafLen: unit * 0.085,
      bandZ: 0.11 * unit, // narrower than the belt, so every kept leaf is on its path
      // just past the right edge, so it is in view for the whole of its cleaning motion
      startX: toWorld(size.width) + 0.55 * unit,
      endX: sweepEndFor(leftW, front, ramp, unit),
      restX: r.x,
      front,
      ramp,
      beltLow,
      beltTop,
      rampPitch: Math.atan2(beltTop[1] - beltLow[1], ramp),
      tilt: TILT,
    };
  };

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20); // a dropped frame should not fling anything
    const t = state.clock.elapsedTime;
    const a = activeRef.current;
    const u = uRef.current;
    const f0 = slots.current[0].fit;
    const lf = f0 ? field(f0) : null;
    const sinT = Math.sin(TILT);
    const cosT = Math.cos(TILT);

    slots.current.forEach((s, i) => {
      const spin = spins.current[i];
      if (!s.anchor || !spin || !s.fit) return;
      const r = rest(s.fit, i);
      const ub = s.fit.d * r.scale;
      const away = size.width * 1.15 * px;
      // V1 on the journey slide follows the scroll-driven sweep exactly; otherwise earlier robots have
      // swum off to the left and later ones wait off to the right
      const sweeping = i === 0 && a <= 0 && lf;
      const goal = sweeping ? sweepX(u, lf) : i < a ? r.x - away : i > a ? r.x + away : r.x;
      const prevV = s.v;
      if (s.scale === 0 || reduced) {
        // first sight: start where it belongs instead of flying across
        s.x = goal;
        s.v = 0;
      } else if (sweeping) {
        s.v = (goal - s.x) / Math.max(dt, 1e-4);
        s.x = goal;
      } else {
        smoothDamp(s, goal, SWIM_TIME, dt);
      }
      s.scale = r.scale;
      s.acc += ((s.v - prevV) / Math.max(dt, 1e-4) - s.acc) * (1 - Math.exp(-dt * 5));

      const dx = s.x - r.x;
      const bob = reduced ? 0 : Math.sin(t * 1.5 + i * 1.7);
      s.anchor.position.set(s.x, r.y + bob * 0.009 * r.scale * s.fit.sy, 0);
      // a gentle roll on the water, and the bow lifting as it speeds up (dipping as it slows)
      const pitch = THREE.MathUtils.clamp(s.acc / (6 * ub), -0.05, 0.05);
      s.anchor.rotation.set(TILT, 0, (reduced ? 0 : Math.sin(t * 1.1 + i) * 0.014) + pitch);
      s.anchor.visible = Math.abs(dx) < away * 0.96;
      // nose turns along the way it is travelling while it swims, then settles to its show angle
      const lean = THREE.MathUtils.clamp(dx / away, -1, 1);
      const showYaw = SHOW_YAW[bots[i].id] ?? Math.PI + 0.5;
      const wobble = reduced ? 0 : Math.sin(t * 0.5 + i) * 0.06;
      // V1 sweeping the leaves keeps its heading (so the belt line the leaves ride stays put); the others
      // turn along the way they are travelling
      spin.rotation.y = sweeping ? sweepYaw(u, showYaw) : showYaw + wobble - lean * 0.7;
      spin.scale.setScalar(s.scale);
      s.run.current = s.anchor.visible;

      // a wake: ripples peel off behind the hulls while it is moving
      const speed = Math.abs(s.v);
      s.wake += dt;
      if (!reduced && s.anchor.visible && speed > 0.2 * ub && s.wake > 0.11) {
        s.wake = 0;
        s.wakeSide = -s.wakeSide;
        const bx = s.x - Math.sign(s.v) * 0.38 * ub;
        const bz = s.wakeSide * 0.2 * ub;
        const h = 0.002 * ub;
        ripples.spawn(t, bx, r.y + h * cosT - bz * sinT, h * sinT + bz * cosT, 0.05 * ub, 0.34 * ub, 1.4, Math.min(0.4, speed / (4 * ub)));
      }
    });

    // the leaves only exist while the transition is part-way: outside it they are all hidden once
    const mesh = leafMesh.current;
    if (mesh && lf) {
      const src = sourcesRef.current;
      const key = `${src.version}:${size.width}x${size.height}:${leafCount}`;
      // laid out ahead, while the journey slide is still being read, so the first scroll does not stall
      if (layout.current?.key !== key && src.count > 0) layout.current = { key, lay: layoutLeaves(specs, src, size.width, size.height, px) };
      if (u > 0 && u < 1 && layout.current) {
        updateLeaves(mesh, specs, layout.current.lay, lf, u, t, ripples);
        leavesShown.current = true;
      } else if (leavesShown.current) {
        hideLeaves(mesh, layout.current?.lay);
        leavesShown.current = false;
      }
    }
    ripples.update(t);
  });

  return (
    <>
      <Lights />
      <primitive object={ripples.mesh} />
      <instancedMesh key={leafCount} ref={leafMesh} args={[leafGeo, leafMat, leafCount]} frustumCulled={false} />
      {bots.map((b, i) => {
        const s = slots.current[i];
        return (
          <group key={b.id} ref={(g) => void (s.anchor = g)} visible={false}>
            <group ref={(g) => void (spins.current[i] = g)}>
              {s.fit && (
                <mesh rotation-x={-Math.PI / 2} position-y={0.004} scale={s.fit.d * 0.42} raycast={() => null}>
                  <planeGeometry args={[2.6, 2.6]} />
                  <meshBasicMaterial map={blob} transparent depthWrite={false} toneMapped={false} />
                </mesh>
              )}
              {i < mounted && (
                <Stand
                  botId={b.id}
                  ex={s.ex}
                  run={s.run}
                  onFit={(f) => {
                    if (s.fit) return;
                    s.fit = f;
                    setLoaded((n) => n + 1);
                  }}
                />
              )}
            </group>
          </group>
        );
      })}
    </>
  );
}

const MAX_DPR = 1.5;

/** Memoised so the page's own re-renders (a new step, the rail) never re-render the robots mid-animation. */
export default memo(function RoadmapScene(props: RoadmapSceneProps) {
  const [dpr, setDpr] = useState(() => topDpr(MAX_DPR));
  return (
    <Canvas
      frameloop={props.paused ? "never" : "always"}
      dpr={dpr}
      camera={{ position: [0, 0, 11], fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <AdaptiveResolution max={MAX_DPR} onDpr={setDpr} halfRate={false} />
      <Stage {...props} />
    </Canvas>
  );
});
