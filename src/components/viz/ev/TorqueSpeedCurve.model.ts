// Illustrative torque-speed envelopes for TorqueSpeedCurve. The shapes follow the physics of each
// machine type; the numbers are round teaching values, not measured data for any production motor.

export type MotorId = "induction" | "ipm" | "sleeved";

export interface MotorCurve {
  id: MotorId;
  label: string;
  peakTorqueNm: number;
  /** end of the constant-torque region (current limit) */
  baseRpm: number;
  /** end of the constant-power region (field weakening runs out) */
  cornerRpm: number;
  maxRpm: number;
  note: string;
}

export const MOTORS: Record<MotorId, MotorCurve> = {
  induction: {
    id: "induction",
    label: "Induction (copper rotor)",
    peakTorqueNm: 440,
    baseRpm: 5000,
    cornerRpm: 9000,
    maxRpm: 16000,
    note: "Rotor current is induced by slip. Past about twice base speed the breakdown torque limit makes power fall roughly as 1/speed. With the inverter off there is no rotor field, so it freewheels with almost no drag.",
  },
  ipm: {
    id: "ipm",
    label: "IPM-SynRM",
    peakTorqueNm: 420,
    baseRpm: 4800,
    cornerRpm: 14000,
    maxRpm: 17000,
    note: "Buried magnets supply the field and flux barriers add reluctance torque, so a negative d-axis current can weaken the field over a wide speed range. Partial-load efficiency is high because no current is spent magnetizing the rotor.",
  },
  sleeved: {
    id: "sleeved",
    label: "Carbon-sleeved PM",
    peakTorqueNm: 420,
    baseRpm: 6000,
    cornerRpm: 18000,
    maxRpm: 20000,
    note: "A carbon-fiber sleeve holds the rotor together at about 20,000 rpm. Since P = T × ω, the same torque held to a higher speed gives more power from the same size of machine.",
  },
};

export type Region = "constant-torque" | "constant-power" | "reduced-power" | "beyond-max";

export const regionLabels: Record<Region, string> = {
  "constant-torque": "Constant torque (current limit)",
  "constant-power": "Constant power (field weakening)",
  "reduced-power": "Falling power (voltage / breakdown limit)",
  "beyond-max": "Beyond maximum speed",
};

export function radPerSec(rpm: number): number {
  return (rpm * 2 * Math.PI) / 60;
}

export function peakPowerKw(m: MotorCurve): number {
  return (m.peakTorqueNm * radPerSec(m.baseRpm)) / 1000;
}

export function operatingPoint(m: MotorCurve, rpm: number): { torqueNm: number; powerKw: number; region: Region } {
  if (rpm > m.maxRpm) return { torqueNm: 0, powerKw: 0, region: "beyond-max" };
  const pPeak = peakPowerKw(m);
  if (rpm <= m.baseRpm) {
    return { torqueNm: m.peakTorqueNm, powerKw: (m.peakTorqueNm * radPerSec(rpm)) / 1000, region: "constant-torque" };
  }
  const w = radPerSec(rpm);
  if (rpm <= m.cornerRpm) return { torqueNm: (pPeak * 1000) / w, powerKw: pPeak, region: "constant-power" };
  const p = (pPeak * m.cornerRpm) / rpm;
  return { torqueNm: (p * 1000) / w, powerKw: p, region: "reduced-power" };
}

/** Road speed for a single fixed reduction and tire radius. */
export function roadSpeedMph(rpm: number, gearRatio = 9, tireRadiusM = 0.35): number {
  return (radPerSec(rpm) / gearRatio) * tireRadiusM * 2.23694;
}
