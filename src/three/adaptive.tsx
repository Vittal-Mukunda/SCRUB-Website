import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { renderWithAO } from "./ao";
import { MIN_DPR, topDpr } from "./dpr";

const STEP = 0.25;
/** seconds of frames per frame-rate sample */
const SAMPLE = 1;

/** Quality rungs from best to cheapest: full resolution down to MIN_DPR, then (if allowed) MIN_DPR drawn every other frame. */
function ladder(top: number, halfRate: boolean) {
  const rungs: { dpr: number; half: boolean }[] = [];
  for (let d = top; d > MIN_DPR + 0.001; d -= STEP) rungs.push({ dpr: Math.round(d * 4) / 4, half: false });
  rungs.push({ dpr: MIN_DPR, half: false });
  if (halfRate) rungs.push({ dpr: MIN_DPR, half: true });
  return rungs;
}

/**
 * Watches the frame rate and steps quality down while frames drop (weak GPU or CPU, battery saver,
 * a busy laptop), stepping back up when there is headroom. It lowers the canvas resolution first
 * (the cost that grows with the screen); if even the lowest is too slow, it draws every other frame
 * so the page itself stays responsive. It renders the scene itself, so r3f's own render is skipped.
 * The parent owns the `dpr` state because <Canvas> re-applies its `dpr` prop on every render.
 * `halfRate={false}` never skips frames, for scenes where steady motion matters more than resolution.
 */
export function AdaptiveResolution({ max, onDpr, halfRate = true }: { max: number; onDpr: (dpr: number) => void; halfRate?: boolean }) {
  // per-canvas bookkeeping, changed every frame without re-rendering
  const state = useRef<ReturnType<typeof init> | null>(null);
  const init = () => ({ rungs: ladder(topDpr(max), halfRate), i: 0, t: 0, frames: 0, slow: 0, fast: 0, clock: 0, raisedAt: -Infinity, failedRaises: 0, odd: false });

  useFrame(({ gl, scene, camera }, dt) => {
    const st = (state.current ??= init());
    const rung = st.rungs[st.i];
    st.odd = !st.odd;
    if (!rung.half || st.odd) {
      // ambient occlusion only on the best two rungs: when frames drop, it is the first thing to go
      if (st.i <= 1) renderWithAO(gl, scene, camera);
      else gl.render(scene, camera);
    }

    // a hitch (shader compile, texture upload, tab switch, resuming from pause), not the steady rate
    if (dt > 0.25) return;
    st.t += dt;
    st.clock += dt;
    st.frames++;
    if (st.t < SAMPLE) return;
    const fps = st.frames / st.t;
    st.t = 0;
    st.frames = 0;
    st.slow = fps < 45 ? st.slow + 1 : 0;
    st.fast = fps > 55 ? st.fast + 1 : 0;

    const go = (i: number) => {
      if (st.rungs[i].dpr !== st.rungs[st.i].dpr) onDpr(st.rungs[i].dpr);
      st.i = i;
      st.slow = st.fast = 0;
    };
    if (st.slow >= 2 && st.i < st.rungs.length - 1) {
      // dropping right after a raise means that raise was too much; after two, stop trying
      if (st.clock - st.raisedAt < 8) st.failedRaises++;
      go(st.i + 1);
    } else if (st.fast >= 5 && st.i > 0 && st.failedRaises < 2) {
      st.raisedAt = st.clock;
      go(st.i - 1);
    }
  }, 1);

  return null;
}
