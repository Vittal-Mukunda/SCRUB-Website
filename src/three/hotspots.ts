/**
 * Clickable annotations for each 3D model. Pure data (no three.js import) so the
 * viewer UI can list them without pulling the 3D bundle.
 * Text is deliberately general; refine it with the team's real engineering notes.
 */
import type { Hotspot } from "./types";

export const hotspots: Record<string, Hotspot[]> = {
  v1: [
    {
      id: "hulls",
      label: "Twin PVC hulls",
      pos: [0.25, 0.2, 0.72],
      title: "Twin PVC hulls",
      text: "Two long, sealed PVC pipes give a wide, stable catamaran stance that is cheap, buoyant and easy to repair.",
    },
    {
      id: "paddles",
      label: "Paddle rotors",
      pos: [-0.55, 0.74, 0.98],
      title: "Paddle rotors",
      text: "Bladed rotors at either end drive and steer the robot, churning through floating weeds as they go.",
    },
    {
      id: "control",
      label: "Control box",
      pos: [0, 0.7, 0.2],
      title: "Control box",
      text: "Houses the electronics for dual-mode control: manual remote or autonomous sweeping.",
    },
    {
      id: "frame",
      label: "Aluminium frame",
      pos: [0.85, 0.62, 0.5],
      title: "Aluminium frame",
      text: "A bolt-together extrusion frame carries the deck and equipment and can be rebuilt on the lake bank.",
    },
  ],
  v2: [
    {
      id: "flap",
      label: "Intake flap",
      pos: [0.6, 0.22, 0],
      title: "Passive-intake flap",
      text: "Moving forward, the flap swings open and waste flows in. Reversing closes it and traps the catch. Press Run to watch it cycle.",
    },
    {
      id: "tray",
      label: "Collection tray",
      pos: [-0.38, 0.4, 0.17],
      title: "Collection tray",
      text: "A clear tray holds the collected waste and lifts out for quick emptying.",
    },
    {
      id: "box",
      label: "Electronics box",
      pos: [-0.4, 0.93, 0.0],
      title: "Electronics box",
      text: "Raised above the splash zone, it holds the autonomy and telemetry electronics.",
    },
    {
      id: "roller",
      label: "Drive roller",
      pos: [-0.1, 0.52, 0.14],
      title: "Drive roller",
      text: "A compact motorised roller at the mouth of the intake.",
    },
    {
      id: "thrusters",
      label: "Thrusters",
      pos: [-0.98, 0.1, 0.36],
      title: "Rear thrusters",
      text: "Two small thrusters push and steer the robot.",
    },
  ],
  v3: [
    {
      id: "boom",
      label: "Floating boom",
      pos: [1.3, 0.3, -1.0],
      title: "Floating boom",
      text: "A line of buoyant floats sweeps across the flow and steers drifting debris towards the bank.",
    },
    {
      id: "ramp",
      label: "Conveyor ramp",
      pos: [-0.35, 0.55, 0.2],
      title: "Conveyor ramp",
      text: "A slatted ramp lifts intercepted waste out of the water. Press Run to see it move.",
    },
    {
      id: "tank",
      label: "Collection tank",
      pos: [-1.35, 0.78, 0.2],
      title: "Collection tank",
      text: "Debris lands in an open tank at the water's edge, ready for scheduled pick-up.",
    },
    {
      id: "shed",
      label: "Shore shelter",
      pos: [-3.05, 1.4, 0],
      title: "Shore shelter",
      text: "A roofed station on the bank protects equipment and staff from sun and rain.",
    },
  ],
  v4: [
    {
      id: "box",
      label: "Sensor & control box",
      pos: [-0.05, 0.78, 0],
      title: "Sensor & control box",
      text: "The brain of the platform: navigation, logging and the interface for water-quality sensing.",
    },
    {
      id: "plate",
      label: "Top plate",
      pos: [0.45, 0.66, 0],
      title: "Raised top plate",
      text: "Lifts the electronics clear of the water and provides room for GPS and other modules.",
    },
    {
      id: "thrusters",
      label: "Twin thrusters",
      pos: [-0.66, 0.02, 0.2],
      title: "Twin thrusters",
      text: "Two angled thrusters give agile, precise manoeuvring for holding survey lines.",
    },
    {
      id: "pontoons",
      label: "Pontoons",
      pos: [0.55, 0.05, 0.42],
      title: "Slim pontoons",
      text: "Compact twin hulls keep the platform light, stable and easy to transport.",
    },
  ],
};

/**
 * Starting view per robot. `pos` only gives the viewing direction; the distance is
 * computed so a sphere of `radius` around `target` always fits the canvas.
 */
export const cameras: Record<string, { pos: [number, number, number]; target: [number, number, number]; radius: number; min: number; floor: number }> = {
  v1: { pos: [3.6, 2.0, 4.0], target: [0, 0.28, 0], radius: 1.7, min: 2.2, floor: -0.18 },
  v2: { pos: [2.6, 1.5, 2.8], target: [-0.05, 0.3, 0], radius: 1.25, min: 1.6, floor: -0.1 },
  v3: { pos: [-3.4, 3.6, 5.4], target: [1.0, 0.4, 0.0], radius: 3.1, min: 3, floor: 0 },
  v4: { pos: [-2.7, 1.7, 2.9], target: [0, 0.15, 0], radius: 1.25, min: 1.8, floor: -0.33 },
};

/** Camera distance that fits a sphere of `radius` for a canvas of the given aspect ratio. */
export function fitDistance(radius: number, fovDeg: number, aspect: number) {
  const halfV = (fovDeg * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  return (radius / Math.sin(Math.min(halfV, halfH))) * 1.02;
}
