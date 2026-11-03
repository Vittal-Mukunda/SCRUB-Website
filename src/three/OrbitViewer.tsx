import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { fitDistance } from "./hotspots";
import { blobTexture, Lights, Stand } from "./shared";
import { AdaptiveResolution } from "./adaptive";
import { topDpr } from "./dpr";
import type { Fit } from "./shared";

export interface OrbitViewerProps {
  botId: string;
  autoRotate: boolean;
  running: boolean;
}

function Scene({ botId, autoRotate, running }: OrbitViewerProps) {
  const [fit, setFit] = useState<Fit | null>(null);
  const ex = useRef(0); // the models support an exploded view; the viewer always shows them assembled
  const run = useRef(false);
  const blob = useMemo(() => blobTexture(), []);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));

  useFrame(() => {
    run.current = running;
  });

  const radius = fit ? Math.max(fit.d / 2, fit.sy * 0.7) : 1.5;
  const dist = fitDistance(radius, 40, Math.max(0.3, aspect));
  const dir = useMemo(() => new THREE.Vector3(1, 0.55, 1.15).normalize(), []);
  const target: [number, number, number] = [0, fit ? fit.sy * 0.4 : 0.3, 0];

  return (
    <>
      <Lights />
      <group>
        <mesh rotation-x={-Math.PI / 2} position-y={0.003} scale={fit ? fit.d * 0.62 : 1}>
          <planeGeometry args={[2.6, 2.6]} />
          <meshBasicMaterial map={blob} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <Stand botId={botId} ex={ex} run={run} onFit={setFit} />
      </group>
      {fit && (
        <>
          <PlaceCamera pos={dir.clone().multiplyScalar(dist).add(new THREE.Vector3(...target))} target={target} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            enablePan={false}
            minDistance={radius * 0.9}
            maxDistance={dist * 2.2}
            target={target}
            autoRotate={autoRotate}
            autoRotateSpeed={1.1}
          />
        </>
      )}
    </>
  );
}

/** Puts the camera at its starting spot once the model's size is known. */
function PlaceCamera({ pos, target }: { pos: THREE.Vector3; target: [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    camera.position.copy(pos);
    camera.lookAt(...target);
  });
  return null;
}

const MAX_DPR = 2;

export default function OrbitViewer(props: OrbitViewerProps) {
  const [dpr, setDpr] = useState(() => topDpr(MAX_DPR));
  return (
    <Canvas shadows dpr={dpr} camera={{ position: [4, 3, 5], fov: 40, near: 0.05, far: 100 }} gl={{ antialias: true, alpha: true }}>
      <AdaptiveResolution max={MAX_DPR} onDpr={setDpr} />
      <Scene {...props} />
    </Canvas>
  );
}
