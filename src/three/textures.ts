import * as THREE from "three";

/**
 * Procedural textures. Everything is generated on a canvas at runtime so the
 * site needs no image downloads and works offline.
 */

function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable fractal value noise in [0, 1]. */
function fbm(size: number, baseCells: number, octaves: number, seed: number) {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const cells = baseCells * 2 ** o;
    const r = rng(seed + o * 101);
    const lat = new Float32Array(cells * cells);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    for (let y = 0; y < size; y++) {
      const v = (y / size) * cells;
      const iy = Math.floor(v);
      const fy = v - iy;
      const sy = fy * fy * (3 - 2 * fy);
      const y0 = iy % cells;
      const y1 = (iy + 1) % cells;
      for (let x = 0; x < size; x++) {
        const u = (x / size) * cells;
        const ix = Math.floor(u);
        const fx = u - ix;
        const sx = fx * fx * (3 - 2 * fx);
        const x0 = ix % cells;
        const x1 = (ix + 1) % cells;
        const a = lat[y0 * cells + x0] + (lat[y0 * cells + x1] - lat[y0 * cells + x0]) * sx;
        const b = lat[y1 * cells + x0] + (lat[y1 * cells + x1] - lat[y1 * cells + x0]) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function finish(c: HTMLCanvasElement, srgb = false, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

interface NoiseOpts {
  size?: number;
  cells?: number;
  octaves?: number;
  seed?: number;
  /** output grey range 0..255 */
  lo?: number;
  hi?: number;
  /** number of fine scratches drawn on top */
  scratches?: number;
  repeat?: number;
}

/** Greyscale noise, used for roughness variation and bump. */
export function noiseMap({ size = 256, cells = 6, octaves = 5, seed = 1, lo = 120, hi = 255, scratches = 0, repeat = 1 }: NoiseOpts = {}) {
  const n = fbm(size, cells, octaves, seed);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let i = 0; i < n.length; i++) {
    const v = lo + (hi - lo) * n[i];
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (scratches) {
    const r = rng(seed + 7);
    g.lineCap = "round";
    for (let i = 0; i < scratches; i++) {
      const x = r() * size;
      const y = r() * size;
      const len = 6 + r() * 38;
      const a = r() * Math.PI;
      g.strokeStyle = `rgba(${r() > 0.5 ? 255 : 40},${r() > 0.5 ? 255 : 40},${r() > 0.5 ? 255 : 40},${0.1 + r() * 0.25})`;
      g.lineWidth = 0.5 + r() * 1.2;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  }
  return finish(c, false, repeat);
}
