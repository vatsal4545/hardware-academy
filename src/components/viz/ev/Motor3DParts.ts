/**
 * Geometry shared by the 3D exploded motor (Motor3DScene) and its 2D fallback drawing (Motor3D).
 * Units are arbitrary (about a decimetre each); the shaft runs along x.
 * Kept free of three.js so the wrapper can import it without pulling the 3D bundle.
 */
export const MOTOR = {
  housing: { r: 1.25, length: 2.4, fins: 7 },
  cap: { r: 1.25, thickness: 0.12, x: 1.26 },
  stator: { rOut: 1.1, rIn: 0.72, rSlot: 0.95, length: 1.6, slots: 24, laminations: 22 },
  winding: { endTurnX: 0.9, endTurnR: 0.84, tube: 0.09 },
  rotor: { r: 0.68, length: 1.6 },
  magnet: { r: 0.6, count: 8, length: 1.5, thick: 0.12, width: 0.36 },
  shaft: { r: 0.16, length: 3.6 },
  bearing: { x: 1.1, r: 0.24, tube: 0.07 },
} as const;

/** How far each sub-assembly moves at explode = 1. */
export const EXPLODE = {
  frontCap: -1.5, // along x
  housing: 2.5, // up, along y
  rotor: 2.8, // rotor, magnets, shaft and bearings slide out along x
  magnetRadial: 0.45, // magnets also pop out of the rotor
  rearCap: 3.9, // along x
} as const;

export const MOTOR_COLORS = {
  housing: "#6b7280",
  cap: "#4b5563",
  lamination: "#94a3b8",
  copper: "#d98c3f",
  rotor: "#475569",
  magnetN: "#ef4444",
  magnetS: "#3b82f6",
  shaft: "#cbd5e1",
  bearing: "#9ca3af",
} as const;

/** Where each part sits for a given explode factor e (0..1). */
export function partOffsets(e: number) {
  return {
    frontCapX: -MOTOR.cap.x + EXPLODE.frontCap * e,
    housingY: EXPLODE.housing * e,
    rotorX: EXPLODE.rotor * e,
    magnetR: MOTOR.magnet.r + EXPLODE.magnetRadial * e,
    rearCapX: MOTOR.cap.x + EXPLODE.rearCap * e,
  };
}
