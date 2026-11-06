/**
 * Clickable annotations for each 3D model. Pure data (no three.js import) so the
 * viewer UI can list them without pulling the 3D bundle.
 * Text is deliberately general; refine it with the team's real engineering notes.
 */
import type { Hotspot } from "./types";

export const hotspots: Record<string, Hotspot[]> = {
  v1: [
    {
      id: "conveyor",
      label: "Conveyor",
      pos: [0.35, 0.24, 0],
      title: "Inclined conveyor",
      text: "A broad belt rises from the water at the bow and carries floating waste up towards the basket. Press Run to watch it move.",
    },
    {
      id: "basket",
      label: "Collection basket",
      pos: [-0.3, 0.43, 0],
      title: "Collection basket",
      text: "A perforated basket catches what the conveyor delivers and lets water drain straight through.",
    },
    {
      id: "pontoons",
      label: "Twin pontoons",
      pos: [-0.1, 0.12, 0.6],
      title: "Wide twin pontoons",
      text: "Two broad pontoons carry the load and keep the platform stable while the conveyor works.",
    },
    {
      id: "frame",
      label: "T-slot cross-beams",
      pos: [-0.15, 0.16, 0.7],
      title: "T-slot cross-beams",
      text: "Aluminium T-slot beams tie the pontoons together and carry the basket, so the frame is simple to adjust and rebuild.",
    },
  ],
  v2: [
    {
      id: "bin",
      label: "Collection bin",
      pos: [0.45, 0.26, 0],
      title: "Collection bin",
      text: "Waste flows in through the bow as the robot advances and is held in the open-top bin. There is no conveyor to jam.",
    },
    {
      id: "hulls",
      label: "Twin box hulls",
      pos: [-0.55, 0.14, 0.5],
      title: "Twin box hulls",
      text: "Two long, rigid hulls with pointed bows carry the load and keep the robot steady.",
    },
    {
      id: "roof",
      label: "Roof",
      pos: [0.24, 0.6, 0],
      title: "Roof",
      text: "A flat roof on four posts shades the bin and the electronics from sun and rain.",
    },
    {
      id: "rails",
      label: "T-slot rails",
      pos: [-0.05, 0.2, 0.32],
      title: "Rails and deck",
      text: "Grey rails run along the inner edge of each hull and carry the deck between them.",
    },
    {
      id: "electronics",
      label: "Electronics",
      pos: [-0.4, 0.14, -0.12],
      title: "Electronics",
      text: "Control and power electronics sit on the deck behind the bin, out of the water.",
    },
  ],
  v4: [
    {
      id: "canopy",
      label: "Solar canopy",
      pos: [0.3, 0.38, 0],
      title: "Solar canopy",
      text: "A shield-shaped canopy shades the deck and carries a solar panel to top up the batteries on the water.",
    },
    {
      id: "box",
      label: "Equipment box",
      pos: [-0.47, 0.24, 0],
      title: "Equipment box",
      text: "The blue enclosure at the stern holds the power and control electronics.",
    },
    {
      id: "thrusters",
      label: "Twin thrusters",
      pos: [-0.8, -0.02, 0.225],
      title: "Twin thrusters",
      text: "Two raked shafts with three-blade propellers give agile, precise manoeuvring for holding survey lines.",
    },
    {
      id: "pontoons",
      label: "Banded pontoons",
      pos: [0.55, 0.05, 0.45],
      title: "Banded pontoons",
      text: "Slim twin hulls with tapered ends keep the platform light, stable and easy to transport.",
    },
    {
      id: "pod",
      label: "Underslung pod",
      pos: [0, -0.13, 0],
      title: "Underslung pod",
      text: "A small pod hangs below the deck on the centreline, in the water where probes can reach it.",
    },
  ],
};

/** Camera distance that fits a sphere of `radius` for a canvas of the given aspect ratio. */
export function fitDistance(radius: number, fovDeg: number, aspect: number) {
  const halfV = (fovDeg * Math.PI) / 360;
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  return (radius / Math.sin(Math.min(halfV, halfH))) * 1.02;
}
