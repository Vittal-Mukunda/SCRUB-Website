import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M } from "../mat";
import { Bx, Corrugated, Cyl, Part, Rod } from "../parts";
import type { ModelProps, RunRef } from "../types";

/**
 * SCRUB V3: river / canal interceptor. Matches the pitch-deck render: a line of yellow
 * flat-ended floats strung on a rope steers debris to a slatted ramp, which lifts it into a
 * charcoal open-top tank on the bank, beside a corrugated-steel shelter with X-bracing and
 * concrete footings, all standing on a sandy concrete pad.
 */
const S = new THREE.Vector3(-2.7, 0, 2.2); // boom anchor end
const E = new THREE.Vector3(-0.1, 0, 0.2); // boom end at the ramp
const DIR = E.clone().sub(S);
const DIRN = DIR.clone().normalize();
const Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), DIRN);
const NRM = new THREE.Vector3(DIRN.z, 0, -DIRN.x); // points to the ramp side of the boom

const RAMP_A = new THREE.Vector3(-0.15, 0, -0.2);
const RAMP_B = new THREE.Vector3(0.85, 0.62, -0.2);
const RAMP_LEN = RAMP_B.clone().sub(RAMP_A).length();
const RAMP_ANG = Math.atan2(RAMP_B.y - RAMP_A.y, RAMP_B.x - RAMP_A.x);
const BANK_TOP = 0.12;

const N_FLOATS = 7;
const N_SLATS = 13;

function Boom({ run }: { run: RunRef }) {
  const floats = useRef<THREE.Group>(null);
  const debris = useRef<THREE.Group>(null);
  const t = useRef(0);
  const clock = useRef(0);

  const items = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        phase: i / 10,
        side: 0.28 + ((i * 37) % 13) / 100,
        size: 0.06 + ((i * 17) % 7) / 100,
        kind: i % 3,
        mat: [M.debrisWhite, M.debrisGreen, M.debrisBrown, M.debrisBlue][i % 4],
      })),
    [],
  );

  useFrame((_, dt) => {
    clock.current += dt;
    if (run.current) t.current += dt;
    debris.current?.children.forEach((c, i) => {
      const it = items[i];
      const u = (it.phase + t.current * 0.045) % 1;
      const p = S.clone().addScaledVector(DIR, 0.04 + u * 0.92).addScaledVector(NRM, it.side * (1 - u * 0.55));
      c.position.set(p.x, 0.07, p.z);
      c.rotation.y = i + t.current * 0.2;
      const fade = Math.min(1, u / 0.06, (1 - u) / 0.1);
      c.scale.setScalar(Math.max(0.001, fade));
    });
  });

  return (
    <group>
      {/* rope through the floats */}
      <Rod a={[S.x, 0.125, S.z]} b={[E.x, 0.125, E.z]} r={0.011} mat={M.rubber} />
      {/* anchor post */}
      <Cyl r={0.04} h={0.6} pos={[S.x - 0.06, 0.3, S.z + 0.07]} mat={M.tankDark} />
      <group ref={floats}>
        {Array.from({ length: N_FLOATS }, (_, i) => {
          const u = 0.07 + (i * 0.86) / (N_FLOATS - 1);
          const p = S.clone().addScaledVector(DIR, u);
          return (
            <group key={i} position={[p.x, 0.125, p.z]} quaternion={Q}>
              {/* flat-ended cylindrical float with a recessed face and rope eye */}
              <mesh material={M.yellow}>
                <cylinderGeometry args={[0.125, 0.125, 0.4, 48]} />
              </mesh>
              {[-1, 1].map((s) => (
                <group key={s}>
                  <mesh position={[0, s * 0.198, 0]} material={M.yellowFace}>
                    <cylinderGeometry args={[0.105, 0.105, 0.012, 48]} />
                  </mesh>
                  <mesh position={[0, s * 0.2, 0]} material={M.rubber}>
                    <torusGeometry args={[0.018, 0.007, 10, 24]} />
                  </mesh>
                  <mesh position={[0, s * 0.18, 0]} material={M.yellow}>
                    <cylinderGeometry args={[0.128, 0.128, 0.034, 48]} />
                  </mesh>
                </group>
              ))}
            </group>
          );
        })}
      </group>
      <group ref={debris}>
        {items.map((it, i) => (
          <mesh key={i} material={it.mat}>
            {it.kind === 0 ? (
              <boxGeometry args={[it.size * 1.4, it.size, it.size]} />
            ) : it.kind === 1 ? (
              <sphereGeometry args={[it.size * 0.7, 16, 12]} />
            ) : (
              <cylinderGeometry args={[it.size * 0.45, it.size * 0.45, it.size * 1.6, 16]} />
            )}
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Conveyor({ run }: { run: RunRef }) {
  const slats = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (run.current) t.current += dt * 0.12;
    slats.current?.children.forEach((c, i) => {
      c.position.x = ((i / N_SLATS + t.current) % 1) * RAMP_LEN;
    });
  });
  return (
    <group position={RAMP_A.toArray()} rotation={[0, 0, RAMP_ANG]}>
      {[0.34, -0.34].map((z) => (
        <Bx key={z} size={[RAMP_LEN + 0.06, 0.07, 0.05]} pos={[RAMP_LEN / 2, 0, z]} mat={M.tankDark} />
      ))}
      <Bx size={[RAMP_LEN, 0.01, 0.66]} pos={[RAMP_LEN / 2, -0.02, 0]} mat={M.black} />
      <group ref={slats}>
        {Array.from({ length: N_SLATS }, (_, i) => (
          <group key={i} position={[(i / N_SLATS) * RAMP_LEN, 0.022, 0]}>
            <Bx size={[0.046, 0.016, 0.64]} mat={M.alu} r={0.004} />
            <Bx size={[0.014, 0.04, 0.62]} pos={[0.018, 0.018, 0]} mat={M.steelDark} r={0.003} />
          </group>
        ))}
      </group>
      {/* side legs */}
      {[0.34, -0.34].map((z) => (
        <Rod key={`leg${z}`} a={[RAMP_LEN * 0.42, -0.03, z]} b={[RAMP_LEN * 0.4, -0.3, z]} r={0.022} mat={M.tankDark} />
      ))}
    </group>
  );
}

function Tank() {
  const w = 1.0;
  const h = 0.56;
  const d = 0.92;
  const th = 0.035;
  const cx = 1.35;
  const cz = -0.2;
  const cy = BANK_TOP + h / 2;
  return (
    <group>
      {/* shell */}
      <Bx size={[w, th, d]} pos={[cx, BANK_TOP + th / 2, cz]} mat={M.tankDark} />
      <Bx size={[th, h, d]} pos={[cx - w / 2 + th / 2, cy, cz]} mat={M.tankDark} />
      <Bx size={[th, h, d]} pos={[cx + w / 2 - th / 2, cy, cz]} mat={M.tankDark} />
      <Bx size={[w, h, th]} pos={[cx, cy, cz + d / 2 - th / 2]} mat={M.tankDark} />
      <Bx size={[w, h, th]} pos={[cx, cy, cz - d / 2 + th / 2]} mat={M.tankDark} />
      {/* rolled top rim */}
      <Bx size={[w + 0.05, 0.03, 0.05]} pos={[cx, BANK_TOP + h, cz + d / 2]} mat={M.steelDark} r={0.012} />
      <Bx size={[w + 0.05, 0.03, 0.05]} pos={[cx, BANK_TOP + h, cz - d / 2]} mat={M.steelDark} r={0.012} />
      <Bx size={[0.05, 0.03, d]} pos={[cx - w / 2, BANK_TOP + h, cz]} mat={M.steelDark} r={0.012} />
      <Bx size={[0.05, 0.03, d]} pos={[cx + w / 2, BANK_TOP + h, cz]} mat={M.steelDark} r={0.012} />
      {/* light inner chute plate */}
      <Bx size={[0.62, 0.018, 0.78]} pos={[cx - 0.1, BANK_TOP + 0.4, cz]} rot={[0, 0, -0.42]} mat={M.boardWhite} />
      {/* weld seams / corner angles */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Bx key={`${sx}${sz}`} size={[0.04, h, 0.04]} pos={[cx + (sx * w) / 2, cy, cz + (sz * d) / 2]} mat={M.steelDark} r={0.008} />
        )),
      )}
      {/* a little catch inside, visible from above */}
      <Bx size={[0.12, 0.06, 0.1]} pos={[1.4, BANK_TOP + 0.08, -0.05]} mat={M.debrisWhite} rot={[0.3, 0.4, 0]} />
      <Bx size={[0.16, 0.05, 0.12]} pos={[1.6, BANK_TOP + 0.07, -0.4]} mat={M.debrisGreen} rot={[0, 0.7, 0.1]} />
    </group>
  );
}

function Shed() {
  const XL = 2.4;
  const XR = 3.75;
  const ZF = 0.8;
  const ZB = -0.8;
  const H = 1.0;
  const posts: [number, number][] = [
    [XL, ZF],
    [XL, ZB],
    [XR, ZF],
    [XR, ZB],
    [(XL + XR) / 2, ZB],
  ];
  const T = 0.4; // roof pitch
  const ridge = BANK_TOP + H + 0.18;
  const slope = 1.0;
  return (
    <group>
      {/* concrete footings + box-section posts */}
      {posts.map(([x, z]) => (
        <group key={`${x}${z}`}>
          <Bx size={[0.17, 0.1, 0.17]} pos={[x, BANK_TOP + 0.05, z]} mat={M.concrete} r={0.012} />
          <Bx size={[0.065, H, 0.065]} pos={[x, BANK_TOP + 0.1 + H / 2 - 0.05, z]} mat={M.black} r={0.008} />
        </group>
      ))}
      {/* X-bracing on the open front */}
      <Rod a={[XL, BANK_TOP + 0.2, ZF]} b={[XR, BANK_TOP + H - 0.05, ZF]} r={0.012} mat={M.black} />
      <Rod a={[XL, BANK_TOP + H - 0.05, ZF]} b={[XR, BANK_TOP + 0.2, ZF]} r={0.012} mat={M.black} />
      {/* horizontal corrugated cladding (back + side) */}
      <Corrugated w={H - 0.1} h={ZF - ZB} waves={18} amp={0.009} pos={[XR + 0.01, BANK_TOP + 0.1 + (H - 0.1) / 2, 0]} rot={[0, Math.PI / 2, Math.PI / 2]} mat={M.roofMetal} />
      <Corrugated w={H - 0.1} h={XR - XL} waves={18} amp={0.009} pos={[(XL + XR) / 2, BANK_TOP + 0.1 + (H - 0.1) / 2, ZB - 0.01]} rot={[0, 0, Math.PI / 2]} mat={M.roofMetal} />
      {/* gable roof: corrugations run down the slope */}
      <Corrugated w={XR - XL + 0.3} h={slope} waves={24} amp={0.011} pos={[(XL + XR) / 2, ridge - 0.19, 0.46]} rot={[-Math.PI / 2 + T, 0, 0]} mat={M.roofMetal} />
      <Corrugated w={XR - XL + 0.3} h={slope} waves={24} amp={0.011} pos={[(XL + XR) / 2, ridge - 0.19, -0.46]} rot={[-Math.PI / 2 - T, 0, 0]} mat={M.roofMetal} />
      <Bx size={[XR - XL + 0.34, 0.045, 0.07]} pos={[(XL + XR) / 2, ridge + 0.005, 0]} mat={M.steelDark} r={0.014} />
      {/* eaves rails */}
      {[ZF + 0.05, ZB - 0.05].map((z) => (
        <Bx key={z} size={[XR - XL + 0.3, 0.04, 0.04]} pos={[(XL + XR) / 2, BANK_TOP + H + 0.0, z]} mat={M.black} r={0.008} />
      ))}
    </group>
  );
}

export default function V3({ ex, run }: ModelProps) {
  // turned 180° so the boom, ramp and tank face the viewer's default camera (hotspots match)
  return (
    <group rotation={[0, Math.PI, 0]}>
      <Part ex={ex} offset={[0, -0.4, 0]}>
        <Bx size={[3.6, 0.12, 4.2]} pos={[2.65, 0.06, 0]} mat={M.sand} r={0.02} />
        <Bx size={[2.9, 0.035, 2.4]} pos={[2.9, BANK_TOP - 0.005, 0]} mat={M.concrete} r={0.012} />
      </Part>
      <Part ex={ex} offset={[-1.4, 0, 1.0]}>
        <Boom run={run} />
      </Part>
      <Part ex={ex} offset={[-0.6, 0.5, 0]}>
        <Conveyor run={run} />
      </Part>
      <Part ex={ex} offset={[0.5, 0.6, 0]}>
        <Tank />
      </Part>
      <Part ex={ex} offset={[0.8, 0.7, 0]}>
        <Shed />
      </Part>
    </group>
  );
}
