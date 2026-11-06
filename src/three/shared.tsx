import { useLayoutEffect, useRef, useState } from "react";
import type { ComponentType, RefObject } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import type { ModelProps } from "./types";
import V1 from "./models/V1";
import V2 from "./models/V2";
import V4 from "./models/V4";

export const MODELS: Record<string, ComponentType<ModelProps>> = { v1: V1, v2: V2, v4: V4 };

/** Bounding info of a model in its own space, used to centre it and size it on screen. */
export interface Fit {
  cx: number;
  cz: number;
  minY: number;
  sx: number;
  sy: number;
  sz: number;
  /** footprint diameter, safe under rotation */
  d: number;
}

const cache = new Map<string, Fit>();

/** Exact bounds in `root`'s local frame, whatever transforms its parents carry. */
function measure(root: THREE.Object3D): Fit {
  root.updateWorldMatrix(true, true);
  const inv = root.matrixWorld.clone().invert();
  const m = new THREE.Matrix4();
  const box = new THREE.Box3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    m.multiplyMatrices(inv, mesh.matrixWorld);
    box.union(g.boundingBox!.clone().applyMatrix4(m));
  });
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  return { cx: c.x, cz: c.z, minY: box.min.y, sx: size.x, sy: size.y, sz: size.z, d: Math.hypot(size.x, size.z) };
}

/**
 * Renders a robot model re-centred on its footprint with its lowest point at y = 0.
 * `fitRef` receives the group the model lives in (its local space = model space).
 */
export function Stand({ botId, ex, run, fitRef, onFit }: { botId: string; ex: ModelProps["ex"]; run: ModelProps["run"]; fitRef?: RefObject<THREE.Group | null>; onFit?: (f: Fit) => void }) {
  const Model = MODELS[botId];
  const inner = useRef<THREE.Group>(null);
  const [fit, setFit] = useState<Fit | null>(() => cache.get(botId) ?? null);

  useLayoutEffect(() => {
    if (fit || !inner.current) return;
    const f = measure(inner.current);
    cache.set(botId, f);
    setFit(f);
  }, [botId, fit]);

  useLayoutEffect(() => {
    if (fit) onFit?.(fit);
  }, [fit, onFit]);

  // parts cast and receive shadows on each other (clear acrylic opts out)
  useLayoutEffect(() => {
    inner.current?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material | undefined;
      m.castShadow = !mat?.userData?.noShadow;
      m.receiveShadow = true;
    });
  }, [botId, fit]);

  return (
    <group
      ref={(g) => {
        inner.current = g;
        if (fitRef) fitRef.current = g;
      }}
      position={fit ? [-fit.cx, -fit.minY, -fit.cz] : [0, 0, 0]}
      visible={!!fit}
    >
      <Model ex={ex} run={run} />
    </group>
  );
}

/**
 * Studio lighting that suits a white page. Reflections come from a real photographed studio
 * (Poly Haven "cyclorama_hard_light", CC0, 1K, in /public/hdr) so glossy plastic and metal catch
 * believable highlights; the directional light adds the soft cast shadows.
 */
export function Lights() {
  return (
    <>
      <ProductToneMapping />
      <hemisphereLight args={["#ffffff", "#cfe3d6", 0.32]} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={1.9}
        color="#fff6e8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.6} color="#dff1ff" />
      <Environment files="/hdr/cyclorama_hard_light_1k.hdr" environmentIntensity={1.35} />
    </>
  );
}

/**
 * Khronos PBR Neutral tone mapping: made for product shots, it keeps base colours true (ACES, the
 * default, shifts creams to yellow and greys to blue-ish and crushes whites).
 */
function ProductToneMapping() {
  const gl = useThree((s) => s.gl);
  useLayoutEffect(() => {
    const prev = [gl.toneMapping, gl.toneMappingExposure] as const;
    gl.toneMapping = THREE.NeutralToneMapping;
    // ACES in three.js brightens by 1/0.6 internally; Neutral does not, but the lights were set for ACES's
    // darker mid-tones, so this brings mid-grey PVC back to the value it has in the photos
    gl.toneMappingExposure = 0.66;
    return () => {
      [gl.toneMapping, gl.toneMappingExposure] = prev;
    };
  }, [gl]);
  return null;
}

/** Soft round shadow texture (dark centre fading to transparent). */
export function blobTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(18,59,50,0.42)");
  grad.addColorStop(0.55, "rgba(18,59,50,0.16)");
  grad.addColorStop(1, "rgba(18,59,50,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
