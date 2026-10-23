// Impedance models for the devices under test. Units: ohms, farads, hertz. Model parameters are simulated: they are
// tuned so the real part at 1 kHz lands in the runbook's ranges, not measured from Vatsal's cells.
import { add, complex, div, type Complex } from "./complex";
import { between } from "./random";

const TWO_PI = 6.283185307179586;

export type Chemistry = "alkaline" | "NiMH" | "Li-ion" | "LiFePO4";
export type CellSize = "AAA" | "AA" | "D" | "9V" | "18650" | "26650";

/** Randles parameters at 25 °C: ohmic resistance, charge-transfer resistance, double-layer capacitance, Warburg σ. */
export interface Randles {
  r0: number;
  rct: number;
  cdl: number;
  sigma: number;
}

export interface CellPreset {
  id: string;
  chemistry: Chemistry;
  size: CellSize;
  condition: "fresh" | "used";
  /** The runbook's range for the real part at 1 kHz, in milliohms; null where the runbook gives none. */
  rangeAt1kHz: [number, number] | null;
  model: Randles;
  /** Open-circuit voltage in volts: a standard nominal value, simulated. */
  ocv: number;
}

export const CELL_PRESETS: readonly CellPreset[] = [
  { id: "alkaline-aaa-fresh", chemistry: "alkaline", size: "AAA", condition: "fresh", rangeAt1kHz: [300, 500], model: { r0: 0.4, rct: 0.2, cdl: 0.25, sigma: 0.04 }, ocv: 1.55 },
  { id: "alkaline-aaa-used", chemistry: "alkaline", size: "AAA", condition: "used", rangeAt1kHz: [1000, 3000], model: { r0: 2.0, rct: 1.5, cdl: 0.25, sigma: 0.3 }, ocv: 1.2 },
  { id: "alkaline-aa-fresh", chemistry: "alkaline", size: "AA", condition: "fresh", rangeAt1kHz: [150, 250], model: { r0: 0.2, rct: 0.1, cdl: 0.5, sigma: 0.02 }, ocv: 1.55 },
  { id: "alkaline-aa-used", chemistry: "alkaline", size: "AA", condition: "used", rangeAt1kHz: [500, 2000], model: { r0: 1.0, rct: 0.8, cdl: 0.5, sigma: 0.16 }, ocv: 1.25 },
  { id: "alkaline-d-fresh", chemistry: "alkaline", size: "D", condition: "fresh", rangeAt1kHz: [80, 150], model: { r0: 0.1, rct: 0.05, cdl: 1, sigma: 0.01 }, ocv: 1.55 },
  { id: "alkaline-d-used", chemistry: "alkaline", size: "D", condition: "used", rangeAt1kHz: [300, 1000], model: { r0: 0.5, rct: 0.4, cdl: 1, sigma: 0.08 }, ocv: 1.25 },
  { id: "alkaline-9v", chemistry: "alkaline", size: "9V", condition: "used", rangeAt1kHz: null, model: { r0: 1.5, rct: 1.0, cdl: 0.1, sigma: 0.2 }, ocv: 9.0 },
  { id: "nimh-aa-fresh", chemistry: "NiMH", size: "AA", condition: "fresh", rangeAt1kHz: [20, 50], model: { r0: 0.035, rct: 0.02, cdl: 2, sigma: 0.004 }, ocv: 1.25 },
  { id: "nimh-aa-used", chemistry: "NiMH", size: "AA", condition: "used", rangeAt1kHz: [50, 150], model: { r0: 0.1, rct: 0.08, cdl: 2, sigma: 0.016 }, ocv: 1.2 },
  { id: "li-ion-p26a", chemistry: "Li-ion", size: "18650", condition: "fresh", rangeAt1kHz: [15, 20], model: { r0: 0.0175, rct: 0.012, cdl: 5, sigma: 0.002 }, ocv: 3.65 },
  { id: "li-ion-25r", chemistry: "Li-ion", size: "18650", condition: "fresh", rangeAt1kHz: [20, 25], model: { r0: 0.0225, rct: 0.015, cdl: 5, sigma: 0.003 }, ocv: 3.65 },
  { id: "lifepo4-26650", chemistry: "LiFePO4", size: "26650", condition: "fresh", rangeAt1kHz: [10, 20], model: { r0: 0.015, rct: 0.01, cdl: 8, sigma: 0.002 }, ocv: 3.3 },
];

export function cellPreset(id: string): CellPreset | undefined {
  return CELL_PRESETS.find((p) => p.id === id);
}

export interface ShuntPreset {
  id: string;
  nominalMilliohm: number;
  /** Tolerance as a fraction: 0.005 is ±0.5%. */
  tolerance: number;
  terminals: 2 | 4;
  /** Series inductance in nanohenries: simulated. */
  inductanceNh: number;
}

export const SHUNT_PRESETS: readonly ShuntPreset[] = [
  { id: "shunt-1m", nominalMilliohm: 1, tolerance: 0.02, terminals: 4, inductanceNh: 1 },
  { id: "shunt-2m", nominalMilliohm: 2, tolerance: 0.01, terminals: 4, inductanceNh: 1 },
  // The NOYITO panel shunt: no document gives its tolerance or terminal layout, so both are simulated.
  { id: "shunt-7m5", nominalMilliohm: 7.5, tolerance: 0.01, terminals: 4, inductanceNh: 5 },
  { id: "shunt-10m", nominalMilliohm: 10, tolerance: 0.005, terminals: 4, inductanceNh: 1 },
  { id: "shunt-25m", nominalMilliohm: 25, tolerance: 0.005, terminals: 4, inductanceNh: 1 },
  { id: "shunt-100m", nominalMilliohm: 100, tolerance: 0.01, terminals: 2, inductanceNh: 1 },
];

export function shuntPreset(id: string): ShuntPreset | undefined {
  return SHUNT_PRESETS.find((p) => p.id === id);
}

/** Simulated temperature dependence: ohmic resistance -1%/°C and charge transfer -3%/°C around 25 °C, clamped. */
export function atTemperature(m: Randles, tempC: number): Randles {
  const dt = tempC - 25;
  const k0 = Math.min(1.5, Math.max(0.5, 1 - 0.01 * dt));
  const kct = Math.min(2, Math.max(0.3, 1 - 0.03 * dt));
  return { ...m, r0: m.r0 * k0, rct: m.rct * kct };
}

/** Z = R0 + Rct / (1 + jωRctCdl) + σ(1 - j)/√ω, in ohms. */
export function randlesImpedance(m: Randles, freqHz: number): Complex {
  const w = TWO_PI * freqHz;
  const arc = div(complex(m.rct), complex(1, w * m.rct * m.cdl));
  const warburg = m.sigma / Math.sqrt(w);
  return add(add(complex(m.r0), arc), complex(warburg, -warburg));
}

/** One particular cell's model: its preset with a simulated ±10% spread on R0 drawn for that cell, at a temperature. */
export function cellModel(preset: CellPreset, cellId: string, seed: number, tempC: number): Randles {
  const spread = between(seed, `cell:${cellId}`, 0.9, 1.1);
  return atTemperature({ ...preset.model, r0: preset.model.r0 * spread }, tempC);
}

/** One particular shunt's impedance in ohms: its tolerance drawn for that part, plus its series inductance. */
export function shuntImpedance(preset: ShuntPreset, seed: number, freqHz: number): Complex {
  const r = (preset.nominalMilliohm / 1000) * (1 + between(seed, `shunt:${preset.id}`, -preset.tolerance, preset.tolerance));
  return complex(r, TWO_PI * freqHz * preset.inductanceNh * 1e-9);
}
