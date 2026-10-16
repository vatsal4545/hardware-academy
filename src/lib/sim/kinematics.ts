export interface ArmPose {
  x: number;
  y: number;
  elbow: { x: number; y: number };
}

/** Forward kinematics of a planar 2-link arm. Angles in radians; θ2 is relative to link 1. */
export function fk2(l1: number, l2: number, t1: number, t2: number): ArmPose {
  const ex = l1 * Math.cos(t1);
  const ey = l1 * Math.sin(t1);
  return { x: ex + l2 * Math.cos(t1 + t2), y: ey + l2 * Math.sin(t1 + t2), elbow: { x: ex, y: ey } };
}

/** Inverse kinematics by the law of cosines. elbowUp = true gives θ2 ≤ 0. Returns null when unreachable. */
export function ik2(l1: number, l2: number, x: number, y: number, elbowUp = true): { t1: number; t2: number } | null {
  const d2 = x * x + y * y;
  const c2 = (d2 - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  if (c2 > 1 + 1e-9 || c2 < -1 - 1e-9) return null;
  const cc = Math.max(-1, Math.min(1, c2));
  const t2 = (elbowUp ? -1 : 1) * Math.acos(cc);
  const t1 = Math.atan2(y, x) - Math.atan2(l2 * Math.sin(t2), l1 + l2 * Math.cos(t2));
  return { t1, t2 };
}

/** Differential-drive body velocities from wheel speeds (same units) and wheel base. */
export function diffDrive(vl: number, vr: number, wheelBase: number): { v: number; omega: number } {
  return { v: (vl + vr) / 2, omega: (vr - vl) / wheelBase };
}
