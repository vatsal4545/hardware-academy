// A deliberately simple DC fast-charging model for ChargingCurve. It is a teaching model, not any
// manufacturer's BMS map: open-circuit voltage + resistance per cell, a BMS current map that falls
// with temperature extremes and rising state of charge, a 4.2 V per-cell ceiling and a charger power limit.

export const CURVE_PACK = {
  series: 96,
  parallel: 46,
  cellAh: 4.8,
  cellMaxV: 4.2,
  /** nominal energy at 3.6 V per cell */
  energyKWh: (96 * 46 * 4.8 * 3.6) / 1000,
} as const;

const CELLS_TOTAL = CURVE_PACK.series * CURVE_PACK.parallel;

/** Piecewise-linear lookup in a sorted [x, y] table, clamped at both ends. */
function lerpTable(table: ReadonlyArray<readonly [number, number]>, x: number): number {
  if (x <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return table[table.length - 1][1];
}

/** Open-circuit voltage of a nickel-rich cell vs state of charge (0..1). */
const OCV_TABLE = [
  [0, 3.0],
  [0.05, 3.35],
  [0.1, 3.47],
  [0.2, 3.56],
  [0.3, 3.62],
  [0.4, 3.67],
  [0.5, 3.73],
  [0.6, 3.81],
  [0.7, 3.9],
  [0.8, 3.98],
  [0.9, 4.08],
  [0.95, 4.14],
  [1.0, 4.2],
] as const;

/** Peak charge C-rate the BMS allows vs pack temperature: plating risk when cold, ageing when hot. */
const C_RATE_VS_TEMP = [
  [-10, 0.3],
  [0, 0.7],
  [10, 1.2],
  [20, 2.0],
  [30, 2.6],
  [40, 3.3],
  [45, 3.3],
  [50, 2.6],
] as const;

/** Fraction of that peak allowed vs state of charge: the anode fills up, plating risk rises. */
const C_RATE_VS_SOC = [
  [0, 1],
  [0.15, 1],
  [0.3, 0.8],
  [0.5, 0.55],
  [0.7, 0.38],
  [0.8, 0.27],
  [0.9, 0.2],
  [1.0, 0.16],
] as const;

export function ocv(soc: number): number {
  return lerpTable(OCV_TABLE, soc);
}

/** Effective cell resistance (ohmic plus polarization) in ohms; roughly doubles every 15-20 °C colder. */
export function cellResistance(tempC: number): number {
  const r25 = 0.035;
  return r25 * Math.exp(3200 * (1 / (tempC + 273.15) - 1 / 298.15));
}

export function bmsCRate(tempC: number, soc: number): number {
  return lerpTable(C_RATE_VS_TEMP, tempC) * lerpTable(C_RATE_VS_SOC, soc);
}

export type ChargeLimit = "charger" | "bms" | "voltage";

export interface ChargePoint {
  soc: number;
  currentA: number;
  voltageV: number;
  powerKw: number;
  cRate: number;
  limit: ChargeLimit;
}

/** Operating point at a given state of charge: the lowest of the three current limits wins. */
export function chargePoint(soc: number, tempC: number, chargerKw: number): ChargePoint {
  const e = ocv(soc);
  const r = cellResistance(tempC);
  const iBms = bmsCRate(tempC, soc) * CURVE_PACK.cellAh;
  const iVolt = Math.max(0, (CURVE_PACK.cellMaxV - e) / r);
  // charger power limit: P_cell = (E + I R) I  ->  I = (-E + sqrt(E^2 + 4 R P)) / 2R
  const pCell = (chargerKw * 1000) / CELLS_TOTAL;
  const iPow = (-e + Math.sqrt(e * e + 4 * r * pCell)) / (2 * r);
  let i = iPow;
  let limit: ChargeLimit = "charger";
  if (iBms < i) {
    i = iBms;
    limit = "bms";
  }
  if (iVolt < i) {
    i = iVolt;
    limit = "voltage";
  }
  const vCell = Math.min(CURVE_PACK.cellMaxV, e + i * r);
  const voltageV = vCell * CURVE_PACK.series;
  const currentA = i * CURVE_PACK.parallel;
  return { soc, currentA, voltageV, powerKw: (voltageV * currentA) / 1000, cRate: i / CURVE_PACK.cellAh, limit };
}

/** d(SoC)/dt in 1/s at this operating point. */
export function socRate(soc: number, tempC: number, chargerKw: number): number {
  const p = chargePoint(soc, tempC, chargerKw);
  return p.currentA / CURVE_PACK.parallel / (CURVE_PACK.cellAh * 3600);
}

/** Charging stops when, in the constant-voltage phase, current falls below C/20. */
export function isComplete(soc: number, tempC: number, chargerKw: number): boolean {
  if (soc >= 0.999) return true;
  const p = chargePoint(soc, tempC, chargerKw);
  return p.limit === "voltage" && p.cRate < 0.05;
}

/** Minutes to charge between two states of charge at constant pack temperature. */
export function minutesBetween(from: number, to: number, tempC: number, chargerKw: number): number {
  const step = 0.0025;
  let seconds = 0;
  for (let s = from; s < to - 1e-9; s += step) {
    const ds = Math.min(step, to - s);
    const rate = socRate(s + ds / 2, tempC, chargerKw);
    if (rate <= 0) return Infinity;
    seconds += ds / rate;
  }
  return seconds / 60;
}
