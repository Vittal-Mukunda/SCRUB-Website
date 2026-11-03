import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../mat";
import { Bx, Cable, Cyl, Part, Pipe, Rod } from "../parts";
import type { ModelProps, RunRef, Vec3 } from "../types";

/**
 * SCRUB V2, modelled from the field photographs: white PVC floats with black clamp bands,
 * black round-tube frame with diagonal braces, white deck board with an orange edge strip
 * carrying a white electronics enclosure (black-framed window, red sticker), a hollow clear
 * storage-bin tray, a ribbed roller with a yellow gear motor, a large hinged white flap with
 * side boards, and small white fan-disc thrusters at the stern.
 */
const Z = 0.36;
const OPEN = 0.42; // flap angle (rad) going forward
const CLOSED = 0.03; // flap angle reversing
const DECK_Y = 0.64;

const WIRE: Vec3[] = [
  [-0.55, 0.62, 0.3],
  [-0.62, 0.45, 0.42],
  [-0.6, 0.25, 0.4],
  [-0.5, 0.12, 0.36],
];

/** Hinged intake flap. Idle = open. While running it opens (forward) and closes (reverse) in a slow cycle. */
function Flap({ run }: { run: RunRef }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(0);
  const ang = useRef(OPEN);
  useFrame((_, dt) => {
    if (run.current) t.current += dt;
    const forward = !run.current || Math.sin(t.current * 0.8) > -0.15;
    const target = forward ? OPEN : CLOSED;
    ang.current += (target - ang.current) * Math.min(1, dt * 3);
    if (g.current) g.current.rotation.z = -ang.current;
  });
  return (
    <group position={[0.14, 0.36, 0]}>
      <group ref={g}>
        <Bx size={[1.0, 0.016, 0.78]} pos={[0.5, 0, 0]} mat={M.boardWhite} r={0.004} />
        {[Z + 0.03, -(Z + 0.03)].map((z) => (
          <Bx key={z} size={[1.0, 0.15, 0.012]} pos={[0.5, 0.075, z]} mat={M.boardWhite} r={0.003} />
        ))}
        {/* taller back board at the hinge */}
        <Bx size={[0.012, 0.26, 0.78]} pos={[0.0, 0.12, 0]} mat={M.boardWhite} r={0.003} />
        <Bx size={[0.06, 0.012, 0.14]} pos={[0.82, 0.01, 0.2]} mat={M.orangeTape} r={0.003} />
      </group>
      <Cyl r={0.013} h={0.8} rot={[Math.PI / 2, 0, 0]} mat={M.stainless} />
    </group>
  );
}

/** Small white fan-disc thruster (axis along X). */
function FanDisc({ z, run }: { z: number; run: RunRef }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current && run.current) g.current.rotation.y += 18 * dt;
  });
  return (
    <group position={[-0.84, 0.0, z]} rotation={[0, 0, Math.PI / 2]}>
      <Cyl r={0.04} h={0.16} pos={[0, 0.1, 0]} mat={M.blackGloss} />
      <group ref={g}>
        <Cyl r={0.062} h={0.022} mat={M.pvcWhite} />
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} rotation={[0, (i / 9) * Math.PI * 2, 0]}>
            <Bx size={[0.056, 0.026, 0.006]} pos={[0.03, 0, 0]} mat={M.pvcWhite} r={0.002} />
          </group>
        ))}
        <Cyl r={0.018} h={0.04} mat={M.blackGloss} />
      </group>
    </group>
  );
}

export default function V2({ ex, run }: ModelProps) {
  return (
    <group>
      {/* floats with clamp bands and a bow cross-pipe */}
      <Part ex={ex} offset={[0, -0.3, 0]}>
        {[Z, -Z].map((z) => (
          <group key={z}>
            <Pipe length={1.5} r={0.075} pos={[0, 0, z]} mat={M.pvcCream} couplers={[-0.3, 0.3]} />
            {[-0.5, -0.12, 0.48].map((x) => (
              <mesh key={x} position={[x, 0, z]} rotation={[0, Math.PI / 2, 0]} material={M.black}>
                <torusGeometry args={[0.079, 0.006, 10, 56]} />
              </mesh>
            ))}
          </group>
        ))}
        <Cyl r={0.034} h={0.72} pos={[0.62, 0.02, 0]} rot={[Math.PI / 2, 0, 0]} mat={M.pvcCream} />
      </Part>

      {/* black round-tube frame with diagonal braces */}
      <Part ex={ex} offset={[0, 0.25, 0]}>
        {[Z, -Z].flatMap((z) =>
          [-0.62, -0.06].map((x) => <Rod key={`p${x}${z}`} a={[x, 0.06, z]} b={[x, DECK_Y, z]} r={0.015} mat={M.black} />),
        )}
        {[Z, -Z].map((z) => (
          <Rod key={`r${z}`} a={[-0.7, 0.14, z]} b={[0.56, 0.14, z]} r={0.014} mat={M.black} />
        ))}
        {[-0.62, -0.06, 0.45].map((x) => (
          <Rod key={`c${x}`} a={[x, 0.14, -Z]} b={[x, 0.14, Z]} r={0.012} mat={M.black} />
        ))}
        {[-0.62, -0.06].map((x) => (
          <Rod key={`u${x}`} a={[x, 0.47, -Z]} b={[x, 0.47, Z]} r={0.012} mat={M.black} />
        ))}
        {[Z, -Z].map((z) => (
          <group key={`d${z}`}>
            <Rod a={[-0.62, 0.14, z]} b={[-0.06, 0.47, z]} r={0.009} mat={M.black} />
            <Rod a={[-0.06, 0.14, z]} b={[-0.62, 0.47, z]} r={0.009} mat={M.black} />
          </group>
        ))}
        {[Z, -Z].map((z) => (
          <Rod key={`f${z}`} a={[0.0, 0.14, z]} b={[0.45, 0.32, z]} r={0.012} mat={M.black} />
        ))}
      </Part>

      {/* deck board, electronics enclosure and wiring */}
      <Part ex={ex} offset={[0, 0.7, 0]}>
        <Bx size={[0.8, 0.018, 0.92]} pos={[-0.34, DECK_Y + 0.01, 0]} mat={M.boardWhite} r={0.004} />
        <Bx size={[0.014, 0.02, 0.92]} pos={[0.06, DECK_Y + 0.01, 0]} mat={M.orangeTape} r={0.003} />
        {/* white enclosure: framed window on the front, red sticker on the side */}
        <Bx size={[0.34, 0.22, 0.27]} pos={[-0.4, DECK_Y + 0.12, 0.0]} mat={M.pvcWhite} r={0.016} />
        <Bx size={[0.012, 0.15, 0.2]} pos={[-0.226, DECK_Y + 0.13, 0.0]} mat={M.black} r={0.004} />
        <Bx size={[0.006, 0.12, 0.17]} pos={[-0.219, DECK_Y + 0.13, 0.0]} mat={M.blackGloss} r={0.002} />
        <Bx size={[0.1, 0.03, 0.006]} pos={[-0.42, DECK_Y + 0.07, 0.138]} mat={M.redLabel} r={0.002} />
        <Bx size={[0.05, 0.012, 0.03]} pos={[-0.32, DECK_Y + 0.03, -0.3]} mat={M.pvcWhite} r={0.004} />
        <Cable points={WIRE} r={0.005} mat={M.rubber} />
      </Part>

      {/* hollow clear storage bin (a real bin: thin walls, rim, tinted catch) */}
      <Part ex={ex} offset={[0, 0.3, 0.9]}>
        <Bx size={[0.5, 0.01, 0.34]} pos={[-0.38, 0.09, 0]} mat={M.lavender} r={0.003} />
        <Bx size={[0.5, 0.26, 0.008]} pos={[-0.38, 0.22, 0.17]} mat={M.binPlastic} r={0.002} />
        <Bx size={[0.5, 0.26, 0.008]} pos={[-0.38, 0.22, -0.17]} mat={M.binPlastic} r={0.002} />
        <Bx size={[0.008, 0.26, 0.34]} pos={[-0.63, 0.22, 0]} mat={M.binPlastic} r={0.002} />
        <Bx size={[0.008, 0.26, 0.34]} pos={[-0.13, 0.22, 0]} mat={M.binPlastic} r={0.002} />
        <Bx size={[0.52, 0.016, 0.026]} pos={[-0.38, 0.355, 0.17]} mat={M.pvcWhite} r={0.004} />
        <Bx size={[0.52, 0.016, 0.026]} pos={[-0.38, 0.355, -0.17]} mat={M.pvcWhite} r={0.004} />
        <Bx size={[0.026, 0.016, 0.36]} pos={[-0.63, 0.355, 0]} mat={M.pvcWhite} r={0.004} />
        <Bx size={[0.026, 0.016, 0.36]} pos={[-0.13, 0.355, 0]} mat={M.pvcWhite} r={0.004} />
        <Bx size={[0.07, 0.04, 0.05]} pos={[-0.3, 0.115, 0.05]} mat={M.debrisWhite} rot={[0.3, 0.5, 0]} r={0.008} />
        <Bx size={[0.08, 0.03, 0.05]} pos={[-0.45, 0.11, -0.06]} mat={M.debrisGreen} rot={[0, 0.8, 0.2]} r={0.01} />
      </Part>

      {/* ribbed roller with yellow gear motor */}
      <Part ex={ex} offset={[0.35, 0.35, 0]}>
        <Cyl r={0.06} h={0.44} pos={[-0.16, 0.42, 0.14]} rot={[0, 0, Math.PI / 2]} mat={M.rollerBrown} seg={36} />
        {[-0.3, -0.22, -0.14, -0.06, 0.02].map((x) => (
          <mesh key={x} position={[x, 0.42, 0.14]} rotation={[0, 0, Math.PI / 2]} material={M.rollerBrown}>
            <torusGeometry args={[0.062, 0.006, 8, 40]} />
          </mesh>
        ))}
        <Cyl r={0.048} h={0.13} pos={[0.1, 0.42, 0.14]} rot={[0, 0, Math.PI / 2]} mat={M.yellow} />
        <Cyl r={0.034} h={0.04} pos={[0.19, 0.42, 0.14]} rot={[0, 0, Math.PI / 2]} mat={M.blackGloss} />
        <Bx size={[0.04, 0.12, 0.04]} pos={[0.02, 0.35, 0.2]} mat={M.black} r={0.006} />
        <Bx size={[0.04, 0.12, 0.04]} pos={[-0.34, 0.35, 0.2]} mat={M.black} r={0.006} />
      </Part>

      {/* intake flap */}
      <Part ex={ex} offset={[0.95, 0.1, 0]}>
        <Flap run={run} />
      </Part>

      {/* rear fan-disc thrusters */}
      <Part ex={ex} offset={[-0.75, 0, 0]}>
        <FanDisc z={Z} run={run} />
        <FanDisc z={-Z} run={run} />
        {[Z, -Z].map((z) => (
          <Rod key={`m${z}`} a={[-0.62, 0.14, z]} b={[-0.86, 0.02, z]} r={0.013} mat={M.black} />
        ))}
      </Part>
    </group>
  );
}
