import * as THREE from "three";
import { clamp, easeInOutSine, smooth, TL } from "./timeline";
import type { LeafSources } from "./timeline";
import type { Ripples } from "./ripples";

/** Fixed per-leaf randomness, so the same leaves are produced after every re-layout. */
export interface LeafSpec {
  /** where in the text this leaf is picked up (0..1 through all the ink, in reading order) */
  q: number;
  fx: number;
  fy: number;
  jitter: number;
  /** resting depth across the lake, -1..1 */
  rz: number;
  yaw: number;
  /** extra turns about its own normal on the way down */
  spin: number;
  roll: number;
  /** how many side-to-side swings it makes while falling, and how wide (in leaf lengths) */
  swings: number;
  swing: number;
  /** how far it banks into each swing, radians */
  bank: number;
  phase: number;
  size: number;
  /** where it hangs once it has turned into a leaf, relative to its letter, in leaf lengths */
  liftX: number;
  liftY: number;
  liftZ: number;
  /** how it is turned while hanging in the air */
  airX: number;
  airY: number;
  final: THREE.Color;
}

/** Where each leaf starts (on the text) and lands, once the slide has been measured. */
export interface LeafLayout {
  sx: Float32Array;
  sy: Float32Array;
  rx: Float32Array;
  /** when (in u) it turns from ink into a leaf, and when it starts to fall */
  a0: Float32Array;
  b0: Float32Array;
  /** length of the tiny leaf that stands in for a bit of ink, in world units */
  len0: number;
  start: THREE.Color[];
  /** last flight progress, to notice the moment a leaf touches the water */
  prevT: Float32Array;
  /** last colour mix written, so unchanged colours are not re-sent */
  colorMix: Float32Array;
}

/** Where the lake, the leaves and V1's pass sit in the scene, in world units. */
export interface LeafField {
  leftW: number;
  rightW: number;
  groundY: number;
  unit: number;
  leafLen: number;
  bandZ: number;
  startX: number;
  endX: number;
  restX: number;
  /** how far left of V1's centre its intake (the belt's low end) is, in world units */
  front: number;
  /** horizontal span of the belt from the intake towards V1's centre */
  ramp: number;
  /** the belt's centre line relative to V1's centre: low end and top end as (along the lake, height, across) */
  beltLow: [number, number, number];
  beltTop: [number, number, number];
  /** slope of the belt in the scene (radians) */
  rampPitch: number;
  tilt: number;
}

/** Length (in u) of one leaf's turning into a leaf, and of its fall. */
const A_DUR = 0.13;
const B_DUR = 0.2;

/** how far ahead of the intake the bow wave starts nudging leaves */
const PUSH = 0.2;

/** One leaf in this many stays on the lake for V1 to collect; the rest are crumbs that sink as they land. */
export const KEEP_EVERY = 5;

const PALETTE = ["#2f9e5a", "#3dbb73", "#5fb85a", "#7fb36b", "#9bbf4a", "#b7b84a", "#c9a23b", "#a0753a", "#7a5a2e"];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeSpecs(n: number): LeafSpec[] {
  const rnd = mulberry32(11);
  return Array.from({ length: n }, (_, i) => ({
    q: (i + 0.5) / n,
    fx: rnd(),
    fy: rnd(),
    jitter: rnd() - 0.5,
    rz: rnd() * 2 - 1,
    yaw: rnd() * Math.PI * 2,
    spin: (rnd() - 0.5) * 2.4,
    roll: rnd() * Math.PI * 2,
    swings: 1.2 + rnd() * 1.3,
    swing: 1.1 + rnd() * 1.5,
    bank: 0.5 + rnd() * 0.5,
    phase: rnd() * Math.PI * 2,
    size: 0.75 + rnd() * 0.6,
    liftX: (rnd() - 0.5) * 2.4,
    liftY: 0.5 + rnd() * 1.4,
    liftZ: 0.4 + rnd() * 1.6,
    airX: (rnd() - 0.5) * 1.3,
    airY: (rnd() - 0.5) * 1.1,
    final: new THREE.Color(PALETTE[Math.floor(rnd() * PALETTE.length)]).offsetHSL(0, 0, (rnd() - 0.5) * 0.08),
  }));
}

/**
 * Puts one tiny leaf on each of a sample of the text's ink pixels (so together they redraw the words) and fixes
 * where each one will land. `pxw` = world units per pixel.
 */
export function layoutLeaves(specs: LeafSpec[], src: LeafSources, W: number, H: number, pxw: number): LeafLayout {
  const n = specs.length;
  const k = src.w > 0 ? W / src.w : 1;
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const px = new Float32Array(n);
  const start: THREE.Color[] = [];
  for (let i = 0; i < n; i++) {
    const sp = specs[i];
    let x: number;
    let y: number;
    if (src.count > 0) {
      // evenly spaced through the ink in reading order = an even sample of all the letters
      const p = Math.min(src.count - 1, Math.floor(sp.q * src.count)) * 5;
      x = src.pts[p] * k;
      y = src.pts[p + 1] * k;
      start.push(new THREE.Color().setRGB(src.pts[p + 2] / 255, src.pts[p + 3] / 255, src.pts[p + 4] / 255, THREE.SRGBColorSpace));
    } else {
      x = sp.fx * W;
      y = H * (0.25 + sp.fy * 0.5);
      start.push(new THREE.Color("#123B32"));
    }
    px[i] = x;
    sx[i] = (x - W / 2) * pxw;
    sy[i] = -(y - H / 2) * pxw;
  }

  // a tiny leaf covers about as much as the ink it came from: about n leaves spread over the ink area
  const len0 = clamp(Math.sqrt((7 * src.ink * k * k) / n), 4, 14) * pxw;

  // leaves land in the same left-to-right order they left the text in, so the flow looks like one current
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => px[a] - px[b]);
  const rx = new Float32Array(n);
  order.forEach((leaf, rank) => (rx[leaf] = clamp((rank + 0.5) / n + specs[leaf].jitter * 0.22)));

  const rnd = mulberry32(5);
  const a0 = new Float32Array(n);
  const b0 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // both motions ripple through the words from left to right; the fall starts as the lift is finishing, so each
    // leaf flies up and comes straight down in one continuous arc rather than hanging in between
    a0[i] = 0.01 + 0.07 * (px[i] / W) + rnd() * 0.03;
    b0[i] = TL.leaves - 0.065 + 0.06 * (px[i] / W) + rnd() * 0.03;
  }
  return { sx, sy, rx, a0, b0, len0, start, prevT: new Float32Array(n), colorMix: new Float32Array(n).fill(-1) };
}

/** V1's x while it sweeps: waits off to the right, swims through the leaves, then returns to its spot. */
export function sweepX(u: number, f: LeafField) {
  if (u <= TL.botIn) return f.startX;
  if (u <= TL.sweepEnd) return f.startX + (f.endX - f.startX) * easeInOutSine((u - TL.botIn) / (TL.sweepEnd - TL.botIn));
  if (u <= TL.botBack) return f.endX + (f.restX - f.endX) * easeInOutSine((u - TL.sweepEnd) / (TL.botBack - TL.sweepEnd));
  return f.restX;
}

/** Where V1 must stop so that its conveyor has carried even the left-most leaf into the bin. */
export const sweepEndFor = (leftW: number, front: number, ramp: number, unit: number) => leftW + front - ramp - 0.02 * unit;

/** V1's heading while it sweeps: bow to the left, mostly side-on so the belt shows in profile. */
export const SWEEP_YAW = Math.PI + 0.3;
/** Its yaw on the journey slide: held through the sweep, then eased to the robot's show angle while it backs to its spot. */
export const sweepYaw = (u: number, showYaw: number) => SWEEP_YAW + (showYaw - SWEEP_YAW) * smooth(TL.sweepEnd, TL.botBack, u);

/** A leaf outline with a pointed tip, UV-mapped so a vein texture lines up. */
export function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.bezierCurveTo(-0.3, 0.28, 0.15, 0.3, 0.5, 0);
  s.bezierCurveTo(0.15, -0.3, -0.3, -0.28, -0.5, 0);
  const g = new THREE.ShapeGeometry(s, 10);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) + 0.5;
    uv[i * 2 + 1] = (pos.getY(i) + 0.25) / 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** White leaf with a darker midrib and veins; multiplied by each leaf's own colour. */
export function leafTexture() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 64);
  g.lineCap = "round";
  g.strokeStyle = "rgba(0,0,0,0.34)";
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(4, 32);
  g.lineTo(124, 32);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,0.16)";
  g.lineWidth = 1.5;
  for (let k = 1; k <= 6; k++) {
    const x = 8 + k * 16;
    g.beginPath();
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32 - 20 + k * 2);
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32 + 20 - k * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const M = new THREE.Matrix4();
const P = new THREE.Vector3();
const S = new THREE.Vector3();
const Q = new THREE.Quaternion();
const QG = new THREE.Quaternion();
const QFLAT = new THREE.Quaternion();
const QRAMP = new THREE.Quaternion();
const QF = new THREE.Quaternion();
const QA = new THREE.Quaternion();
const QB = new THREE.Quaternion();
const QH = new THREE.Quaternion();
const C = new THREE.Color();
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export function hideLeaves(mesh: THREE.InstancedMesh, lay?: LeafLayout | null) {
  for (let i = 0; i < mesh.count; i++) mesh.setMatrixAt(i, ZERO);
  mesh.instanceMatrix.needsUpdate = true;
  lay?.prevT.fill(0);
}

/**
 * Places every leaf for clock `u`, in four motions (a quarter of the scroll each):
 * 1. each speck of a letter turns into a leaf and lifts a little off the page, hanging there and fluttering;
 * 2. the leaves fall the way real ones do, rocking side to side and banking into each swing, and settle flat on
 *    the water with a ripple (the small crumbs sink);
 * 3. V1 comes through: the bow wave nudges leaves into its path, the intake scoops them up and the conveyor
 *    carries them up into the bin;
 * 4. V1 glides back to the centre (the robot itself; the leaves are all gone by then).
 */
export function updateLeaves(mesh: THREE.InstancedMesh, specs: LeafSpec[], lay: LeafLayout, f: LeafField, u: number, time: number, ripples: Ripples) {
  const sinT = Math.sin(f.tilt);
  const cosT = Math.cos(f.tilt);
  QG.setFromAxisAngle(X_AXIS, f.tilt);
  // lying flat on the water, and tipped up the conveyor
  QFLAT.copy(QG).multiply(QA.setFromAxisAngle(X_AXIS, -Math.PI / 2));
  QRAMP.copy(QG).multiply(QA.setFromAxisAngle(Z_AXIS, f.rampPitch)).multiply(QF.setFromAxisAngle(X_AXIS, -Math.PI / 2));
  const U = f.unit;
  const L = f.leafLen;
  const botX = sweepX(u, f);
  // the furthest V1 has got: a leaf it has passed stays collected while it turns back
  const frontMin = (u <= TL.sweepEnd ? botX : f.endX) - f.front;
  const [bx0, bh0, bz0] = f.beltLow;
  const [bx1, bh1, bz1] = f.beltTop;
  const show = smooth(0, 0.02, u);
  let colours = false;

  for (let i = 0; i < specs.length; i++) {
    const sp = specs[i];
    const ta = clamp((u - lay.a0[i]) / A_DUR);
    const tb = clamp((u - lay.b0[i]) / B_DUR);
    const prev = lay.prevT[i];
    lay.prevT[i] = tb;
    const keep = i % KEEP_EVERY === 0;

    if (ta <= 0) {
      // still part of a word: a tiny leaf sitting on its bit of ink, appearing as the real text fades out
      if (show <= 0) {
        mesh.setMatrixAt(i, ZERO);
        continue;
      }
      Q.setFromAxisAngle(Z_AXIS, sp.roll);
      M.compose(P.set(lay.sx[i], lay.sy[i], 0), Q, S.setScalar(lay.len0 * show));
      mesh.setMatrixAt(i, M);
      if (lay.colorMix[i] !== 0) {
        mesh.setColorAt(i, lay.start[i]);
        lay.colorMix[i] = 0;
        colours = true;
      }
      continue;
    }
    if (!keep && tb >= 1) {
      // the crumbs have sunk
      mesh.setMatrixAt(i, ZERO);
      continue;
    }

    // ---- motion 1: from a speck of ink to a leaf hanging in the air ----
    const lift = smooth(0, 1, ta);
    const hx = lay.sx[i] + sp.liftX * L * lift;
    const hy = lay.sy[i] + sp.liftY * L * lift;
    const hz = sp.liftZ * L * lift;
    // while it hangs between the two motions it keeps fluttering, so a paused page still feels alive
    const air = smooth(0.5, 1, ta) * (1 - smooth(0, 0.3, tb));
    const fx = Math.sin(time * 1.7 + sp.phase) * 0.22 * L * air;
    const fy = Math.sin(time * 2.3 + sp.phase * 1.3) * 0.3 * L * air;
    QA.setFromAxisAngle(X_AXIS, sp.airX * lift + Math.sin(time * 2 + sp.phase) * 0.3 * air);
    QB.setFromAxisAngle(Y_AXIS, sp.airY * lift + Math.sin(time * 1.4 + sp.phase) * 0.25 * air);
    const qAir = QH.setFromAxisAngle(Z_AXIS, sp.roll).multiply(QA).multiply(QB);

    // ---- where it ends up: floating on the water, drifting a little ----
    const fl = smooth(0.85, 1, tb);
    const restX = f.leftW + lay.rx[i] * (f.rightW - f.leftW);
    const restZ = bz0 + sp.rz * f.bandZ; // the band of leaves lies in line with the belt's intake
    let lx = restX + fl * Math.sin(time * 0.23 + sp.phase) * 0.012 * U;
    let lz = restZ + fl * Math.cos(time * 0.19 + sp.phase) * 0.01 * U;
    let lh = 0.008 * U + fl * Math.sin(time * 1.3 + sp.phase) * 0.0025 * U;

    // ---- motion 3: V1 reaching it (bow wave, then the conveyor) ----
    const d = restX - frontMin; // > 0 once the intake has passed this leaf
    const push = smooth(-PUSH * U, 0, d);
    const c = clamp(d / f.ramp);
    if (c >= 1) {
      mesh.setMatrixAt(i, ZERO);
      continue;
    }
    if (push > 0) {
      lx -= push * 0.035 * U; // carried ahead by the bow wave
      lz = bz0 + (lz - bz0) * (1 - 0.55 * push); // and funnelled onto the belt's intake
    }
    if (c > 0) {
      // riding the belt: the leaf is picked up at the low end and carried up its running surface to the basket
      const ride = smooth(0, 0.14, c);
      lx += (botX + bx0 + c * (bx1 - bx0) - lx) * ride;
      lz += (bz0 + c * (bz1 - bz0) + sp.rz * f.bandZ * (1 - 0.4 * c) - lz) * ride; // still spread across the belt, easing in as it nears the basket
      lh += (bh0 + c * (bh1 - bh0) - lh) * ride;
    }
    const X1 = lx;
    const Y1 = f.groundY + lh * cosT - lz * sinT;
    const Z1 = lh * sinT + lz * cosT;

    // ---- motion 2: the fall ----
    const w = Math.PI * 2 * sp.swings;
    const env = Math.pow(Math.sin(Math.PI * tb), 0.85);
    const sw = Math.sin(w * tb + sp.phase);
    const swV = Math.cos(w * tb + sp.phase);
    // it drops fastest through the bottom of each swing and hangs at the ends; soft start, soft landing
    const yT = smooth(0, 1, tb - (0.42 * Math.sin(w * tb)) / w);
    const xT = 0.55 * smooth(0, 1, tb) + 0.45 * (1 - (1 - tb) * (1 - tb));
    const amp = sp.swing * L * env;
    const x = hx + fx + (X1 - hx) * xT + sw * amp;
    const y = hy + fy + (Y1 - hy) * yT;
    const z = hz + (Z1 - hz) * smooth(0, 1, tb) + swV * amp * 0.5;

    // turning from its hanging pose to lying (almost) flat, banking into each swing on the way down
    QF.copy(c > 0 ? QRAMP : QFLAT)
      .multiply(QA.setFromAxisAngle(Z_AXIS, sp.yaw + sp.spin * tb + fl * Math.sin(time * 0.6 + sp.phase) * 0.08))
      .multiply(QB.setFromAxisAngle(X_AXIS, sp.bank * swV * env))
      .multiply(QA.setFromAxisAngle(Y_AXIS, 0.35 * sw * env));
    Q.copy(qAir).slerp(QF, smooth(0, 0.35, tb));

    const full = L * sp.size * (keep ? 1 : 0.5);
    const sink = keep ? 1 : 1 - smooth(0.7, 1, tb);
    const sc = (lay.len0 + (full * 0.9 - lay.len0) * smooth(0, 0.8, ta) + full * 0.1 * smooth(0, 0.4, tb)) * sink * (1 - smooth(0.75, 1, c));
    M.compose(P.set(x, y, z), Q, S.set(sc, sc * 0.95, sc));
    mesh.setMatrixAt(i, M);

    const mix = Math.round(smooth(0.1, 0.85, ta) * 64) / 64;
    if (mix !== lay.colorMix[i]) {
      mesh.setColorAt(i, C.copy(lay.start[i]).lerp(sp.final, mix));
      lay.colorMix[i] = mix;
      colours = true;
    }

    // touching down: a ripple where it lands (some of the kept leaves, and a few of the sinking crumbs)
    if (prev < 1 && tb >= 1 && keep && c <= 0 && i % (KEEP_EVERY * 2) === 0) ripples.spawn(time, X1, Y1, Z1, L * 0.3, L * 2.2, 1.6, 0.35);
    else if (!keep && i % 23 === 1 && prev < 0.9 && tb >= 0.9) ripples.spawn(time, X1, Y1, Z1, L * 0.15, L * 1.1, 1.1, 0.22);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (colours && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
