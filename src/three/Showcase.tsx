import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { bots } from "../data/content";
import type { BotId } from "../data/content";
import { hotspots } from "./hotspots";
import { loadedScans } from "./mat";
import { REL_SIZE } from "./sizes";
import { blobTexture, Lights, Stand } from "./shared";
import { AdaptiveResolution } from "./adaptive";
import { compileAsyncAO, renderWithAO } from "./ao";
import { topDpr } from "./dpr";
import type { Fit } from "./shared";

export interface ProjectedPoint {
  x: number;
  y: number;
}

/** A grid card's rectangle in pixels, relative to the canvas. */
export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShowcaseProps {
  selected: BotId | null;
  paused: boolean;
  /** models stay hidden until this is true (the loading screen is up before that) */
  revealed: boolean;
  /** grid card rectangles; each robot is displayed in its own card */
  cellsRef: MutableRefObject<Cell[]>;
  /** index of the card under the pointer, or -1 */
  hoverRef: MutableRefObject<number>;
  onSelect: (id: BotId) => void;
  onOpen: () => void;
  /** fired once the selected robot has finished flying to the centre */
  onSettled: (settled: boolean) => void;
  /** how many of the robots have finished loading (0..4) */
  onProgress: (loaded: number) => void;
  /** pixel positions (relative to the canvas) of the selected robot's hotspots, updated every frame */
  projRef: MutableRefObject<ProjectedPoint[]>;
}

/** Yaw (radians) each robot eases to when it is shown off, picked so its features face the camera. */
const SHOW_YAW: Record<BotId, number> = { v1: -0.75, v2: -0.5, v4: 0.55 };
/** Display tilt: leans the turntable towards the camera so the tops of the robots can be seen. */
const TILT = 0.4;

const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface Slot {
  anchor: THREE.Group | null;
  spin: THREE.Group | null;
  fitGroup: THREE.Group | null;
  fit: Fit | null;
  pos: THREE.Vector3;
  scale: number;
  yaw: number;
  hover: number;
  ex: { current: number };
  run: { current: boolean };
}

function Stage({ selected, paused, revealed, cellsRef, hoverRef, onSelect, onOpen, onSettled, onProgress, projRef }: ShowcaseProps) {
  const { viewport, camera, size, gl, scene } = useThree();
  const blob = useMemo(() => blobTexture(), []);
  const slots = useRef<Slot[]>(
    bots.map(() => ({
      anchor: null,
      spin: null,
      fitGroup: null,
      fit: null,
      pos: new THREE.Vector3(),
      scale: 0,
      yaw: 0,
      hover: 0,
      ex: { current: 0 },
      run: { current: false },
    })),
  );
  const settledFor = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(0);
  // robots are built one at a time, each in its own task, so the page never freezes for all four at once
  const [mounted, setMounted] = useState(1);
  const [compiled, setCompiled] = useState(false);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => void (document.body.style.cursor = ""), []);
  useEffect(() => {
    settledFor.current = null;
    onSettled(false);
  }, [selected, onSettled]);

  useEffect(() => {
    if (loaded < mounted || mounted >= bots.length) return;
    const t = setTimeout(() => setMounted((m) => m + 1), 0);
    return () => clearTimeout(t);
  }, [loaded, mounted]);

  // Compile every shader before the robots appear. Done in one go on first sight it blocks the page for
  // seconds on a phone; compileAsync lets the GPU driver build them in the background
  // (KHR_parallel_shader_compile) while the loading screen is up. compile only visits visible objects,
  // so the hidden robots are shown for the synchronous part of the call.
  useEffect(() => {
    if (compiled || loaded < bots.length) return;
    let alive = true;
    const showAll = () => {
      const hidden = slots.current.flatMap((sl) => (sl.anchor && !sl.anchor.visible ? [sl.anchor] : []));
      hidden.forEach((a) => (a.visible = true));
      return () => hidden.forEach((a) => (a.visible = false));
    };
    let restore = showAll();
    const done = compileAsyncAO(gl, scene, camera);
    restore();
    // then upload the material scans to the GPU, one per task, instead of all in the first frame
    const upload = async () => {
      for (const t of loadedScans) {
        if (!alive) return;
        gl.initTexture(t);
        await new Promise((r) => setTimeout(r, 0));
      }
    };
    // finally one hidden frame with every robot drawn (still at scale 0): it binds the shader variants
    // compile cannot see (such as the transmission pass), so the robots' entrance does not hitch
    const warm = () => {
      if (!alive) return;
      restore = showAll();
      renderWithAO(gl, scene, camera);
      restore();
    };
    done
      .catch(() => {})
      .then(upload)
      .then(warm)
      .then(() => alive && setCompiled(true));
    return () => {
      alive = false;
    };
  }, [compiled, loaded, gl, scene, camera]);

  // the last robot only counts as loaded once its shaders are ready, so the reveal never stalls
  useEffect(() => onProgress(compiled ? loaded : Math.min(loaded, bots.length - 1)), [loaded, compiled, onProgress]);

  const vw = viewport.width;
  const vh = viewport.height;
  const narrow = size.width < 900;
  const px = vw / size.width; // world units per pixel at the display plane

  /** Apparent footprint and height of a robot at scale 1 once tilted. */
  const extent = (f: Fit) => ({ w: f.d, h: f.sy + f.d * 0.2 });

  /** Where, and how large, each robot sits for the current state. */
  const target = (i: number) => {
    const s = slots.current[i];
    const f = s.fit;
    const cell = cellsRef.current[i];
    if (!f || !cell) return { x: 0, y: 0, scale: 0 };
    const e = extent(f);
    // card layout: model in the left ~55%, text on the right
    // tall cards (desktop): model above the text; wide cards (phones): model on the left
    const tall = cell.h > cell.w * 1.1;
    const cx = cell.x + cell.w * (tall ? 0.5 : 0.27);
    // every robot at its real size next to the others: the one needing the most room just fits its card
    const fitIn = (g: Fit, c: Cell) => {
      const eg = extent(g);
      return c.h > c.w * 1.1 ? Math.min((c.w * 0.92 * px) / eg.w, (c.h * 0.46 * px) / eg.h) : Math.min((c.w * 0.48 * px) / eg.w, (c.h * 0.68 * px) / eg.h);
    };
    let foot = Infinity;
    slots.current.forEach((sl, j) => {
      const cj = cellsRef.current[j];
      if (sl.fit && cj) foot = Math.min(foot, (fitIn(sl.fit, cj) * sl.fit.d) / (REL_SIZE[bots[j].id] ?? 1));
    });
    const slotScale = (foot * (REL_SIZE[bots[i].id] ?? 1)) / f.d;
    const slotH = (e.h * slotScale) / px; // apparent height in px
    const groundPy = cell.y + cell.h * (tall ? 0.37 : 0.5) + slotH * 0.28;
    const sx = (cx - size.width / 2) * px;
    const sy = -(groundPy - size.height / 2) * px;
    if (!revealed) return { x: sx, y: sy, scale: 0 };
    if (selected === null) return { x: sx, y: sy, scale: slotScale };
    if (selected === bots[i].id) {
      // centre stage, between the title above and the buttons below
      const top = narrow ? 120 : 112;
      const bottom = narrow ? size.height * 0.5 : size.height - 108;
      const availPx = Math.max(120, bottom - top);
      const sc = narrow ? Math.min((vw * 0.8) / e.w, (availPx * 0.9 * px) / e.h) : Math.min((vw * 0.4) / e.w, (availPx * 0.92 * px) / e.h);
      const hPx = (e.h * sc) / px;
      const centerPy = (top + bottom) / 2;
      return { x: 0, y: -(centerPy + hPx * 0.28 - size.height / 2) * px, scale: sc };
    }
    // the others slide away to their own side and shrink out of view
    return { x: sx * 1.6, y: sy, scale: 0 };
  };

  useFrame((state, dt) => {
    if (paused) return;
    const k = 1 - Math.exp(-dt * 4.2);
    const t = state.clock.elapsedTime;
    slots.current.forEach((s, i) => {
      if (!s.anchor || !s.spin || !s.fit) return;
      const id = bots[i].id;
      const g = target(i);
      const isSel = selected === id;
      s.hover += ((hoverRef.current === i && selected === null ? 1 : 0) - s.hover) * Math.min(1, dt * 8);
      s.pos.x += (g.x - s.pos.x) * k;
      s.pos.y += (g.y - s.pos.y) * k;
      s.scale += (g.scale - s.scale) * k;
      s.anchor.position.set(s.pos.x, s.pos.y, 0);
      s.anchor.rotation.x = TILT;
      s.anchor.visible = s.scale > 0.004;

      if (isSel) {
        // ease to the show angle (nearest equivalent turn), then sway gently
        const goal = SHOW_YAW[id] + (reduced ? 0 : Math.sin(t * 0.5) * 0.12);
        const turns = Math.round((s.yaw - goal) / (Math.PI * 2));
        s.yaw += (goal + turns * Math.PI * 2 - s.yaw) * k;
      } else if (!reduced) {
        s.yaw += dt * (0.32 + s.hover * 0.5);
      }
      const sc = s.scale * (1 + s.hover * 0.06);
      s.spin.scale.setScalar(sc);
      s.spin.rotation.y = s.yaw;
      s.run.current = isSel;
    });

    if (selected) {
      const i = bots.findIndex((b) => b.id === selected);
      const s = slots.current[i];
      if (s?.fitGroup && s.fit && s.anchor) {
        const list = hotspots[selected] ?? [];
        const out = projRef.current;
        out.length = list.length;
        s.anchor.updateMatrixWorld(true);
        list.forEach((h, n) => {
          tmp.set(...h.pos);
          s.fitGroup!.localToWorld(tmp);
          tmp.project(camera);
          out[n] = { x: (tmp.x * 0.5 + 0.5) * size.width, y: (-tmp.y * 0.5 + 0.5) * size.height };
        });
        const g = target(i);
        const done = Math.abs(s.pos.x - g.x) < 0.02 * vw && Math.abs(s.pos.y - g.y) < 0.02 * vh && Math.abs(s.scale - g.scale) < 0.03 * g.scale;
        if (done && settledFor.current !== selected) {
          settledFor.current = selected;
          onSettled(true);
        }
      }
    }
  });

  return (
    <>
      <Lights />
      {bots.map((b, i) => {
        const s = slots.current[i];
        return (
          <group key={b.id} ref={(g) => void (s.anchor = g)} visible={false}>
            <group
              ref={(g) => void (s.spin = g)}
              onPointerOver={(e) => {
                e.stopPropagation();
                hoverRef.current = i;
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                if (hoverRef.current === i) hoverRef.current = -1;
                document.body.style.cursor = "";
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (selected === null) onSelect(b.id);
                else if (selected === b.id) onOpen();
              }}
            >
              <mesh rotation-x={-Math.PI / 2} position-y={0.004} scale={s.fit ? s.fit.d * 0.42 : 1} raycast={() => null}>
                <planeGeometry args={[2.6, 2.6]} />
                <meshBasicMaterial map={blob} transparent depthWrite={false} toneMapped={false} />
              </mesh>
              {i < mounted && <Stand
                botId={b.id}
                ex={s.ex}
                run={s.run}
                fitRef={{
                  get current() {
                    return s.fitGroup;
                  },
                  set current(g) {
                    s.fitGroup = g;
                  },
                }}
                onFit={(f) => {
                  if (s.fit) return;
                  s.fit = f;
                  setLoaded((n) => n + 1);
                }}
              />}
              {s.fit && selected === b.id && (
                <mesh position={[0, s.fit.sy / 2, 0]}>
                  <boxGeometry args={[s.fit.sx * 1.05, s.fit.sy * 1.15, s.fit.sz * 1.05]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              )}
            </group>
          </group>
        );
      })}
    </>
  );
}

const MAX_DPR = 1.75;

export default function Showcase(props: ShowcaseProps) {
  const [dpr, setDpr] = useState(() => topDpr(MAX_DPR));
  return (
    <Canvas
      frameloop={props.paused ? "never" : "always"}
      dpr={dpr}
      camera={{ position: [0, 0, 11], fov: 30, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <AdaptiveResolution max={MAX_DPR} onDpr={setDpr} />
      <Stage {...props} />
    </Canvas>
  );
}
