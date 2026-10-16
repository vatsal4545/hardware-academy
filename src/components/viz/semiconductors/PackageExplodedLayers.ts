/**
 * Layer table shared by PackageExploded (wrapper and legend), PackageExplodedSvg (2-D fallback)
 * and PackageExploded3D (React Three Fiber scene). Layers are listed bottom to top.
 */
import { vizColors } from "@/components/viz/shared";

export type PackageKind = "bga" | "qfn";

export interface PackageLayer {
  id: string;
  name: string;
  /** a few words for the SVG label */
  short: string;
  /** one or two sentences for the legend */
  detail: string;
  color: string;
}

export const packageColors = {
  balls: "#cbd5e1",
  substrate: "#8b6b3d",
  underfill: vizColors.amber,
  bump: "#e5e7eb",
  die: "#475569",
  dieTop: "#64748b",
  tim: "#9ca3af",
  lid: "#b8c0cc",
  solder: "#cbd5e1",
  leadframe: vizColors.copper,
  attach: "#a1a1aa",
  wire: "#fbbf24",
  mold: "#374151",
  pcb: "#166534",
} as const;

export const packageLayers: Record<PackageKind, PackageLayer[]> = {
  bga: [
    {
      id: "balls",
      name: "Solder balls",
      short: "Ø ≈0.5 mm, 1.0 mm pitch",
      detail: "SAC305 solder balls about 0.5 mm across at 1.0 mm pitch, reflowed onto matching pads on the PCB.",
      color: packageColors.balls,
    },
    {
      id: "substrate",
      name: "Package substrate",
      short: "≈1 mm organic laminate",
      detail:
        "Organic build-up laminate about 1 mm thick whose copper layers fan out from about 150 µm bump pitch to 1 mm ball pitch.",
      color: packageColors.substrate,
    },
    {
      id: "underfill",
      name: "Bumps + underfill",
      short: "C4 bumps ≈150 µm pitch",
      detail:
        "C4 solder bumps or copper pillars under the whole die, locked in an epoxy underfill that shares the thermal-expansion strain.",
      color: packageColors.underfill,
    },
    {
      id: "die",
      name: "Silicon die (face down)",
      short: "active side toward bumps",
      detail: "The active side and metal stack face the bumps, so heat leaves through the bare back of the die.",
      color: packageColors.die,
    },
    {
      id: "tim",
      name: "Thermal interface (TIM1)",
      short: "indium or gel",
      detail: "Indium solder or a polymer gel that fills the microscopic gap between the die back and the lid.",
      color: packageColors.tim,
    },
    {
      id: "lid",
      name: "Heat spreader (lid)",
      short: "Ni-plated copper",
      detail: "Nickel-plated copper lid that spreads heat toward the heat sink and protects the die during assembly.",
      color: packageColors.lid,
    },
  ],
  qfn: [
    {
      id: "solder",
      name: "Solder joints",
      short: "pad paste ≈50-60%",
      detail:
        "Paste on the perimeter pads and the thermal pad. The thermal pad is printed as a window pane at 50-60% coverage to avoid voids and a floating package.",
      color: packageColors.solder,
    },
    {
      id: "leadframe",
      name: "Lead frame",
      short: "0.5 mm lead pitch",
      detail: "Copper lead frame: 32 perimeter leads at 0.5 mm pitch and the exposed die pad that carries heat into the PCB.",
      color: packageColors.leadframe,
    },
    {
      id: "attach",
      name: "Die attach",
      short: "≈25 µm Ag epoxy",
      detail: "Silver-filled epoxy or solder, about 25 µm thick, bonding the die to the pad.",
      color: packageColors.attach,
    },
    {
      id: "die",
      name: "Silicon die (face up)",
      short: "bond pads on the edge",
      detail: "Active side up, with bond pads in a ring around the edge of the die.",
      color: packageColors.die,
    },
    {
      id: "wires",
      name: "Bond wires",
      short: "20-25 µm Au or Cu",
      detail: "Gold or copper wires 20-25 µm thick, ball-bonded on the die and stitch-bonded on each lead.",
      color: packageColors.wire,
    },
    {
      id: "mold",
      name: "Mold compound",
      short: "silica-filled epoxy",
      detail: "Silica-filled epoxy that encapsulates the die and wires and sets the 5 × 5 mm outline.",
      color: packageColors.mold,
    },
  ],
};

export const packageKindOptions: Array<{ value: PackageKind; label: string }> = [
  { value: "bga", label: "Flip-chip BGA" },
  { value: "qfn", label: "QFN (wire bond)" },
];
