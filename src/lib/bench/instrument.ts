// What the AD5941BATZ and its software return for one frequency, given the bench. The validity rules follow the
// CN0510 behaviour described in the beginner guide; the error sizes are simulated.
import { cellModel, cellPreset, randlesImpedance } from "./dut";
import { jumpMilliohm, residualMilliohm, senseOffsetMilliohm, wiringOf } from "./contacts";
import { partById } from "./parts";
import { between, gaussian } from "./random";
import type { BenchState, ChannelContact, FaultId, InvalidReason, Reading } from "./types";

/** The firmware's onboard reference, in milliohms: the BATImpedance example's RcalVal. */
export const RCAL_MILLIOHM = 50;
/** The project's 0–5 V envelope. Not a verified rating: the eval board's limit is in the CN0510 guide. */
export const ENVELOPE_VOLTS = 5;
/** Serial settings for the firmware's output. */
export const SERIAL_BAUD = 230400;
/** Readings drift for this long after a clip moves, while junctions settle. */
export const SETTLE_SECONDS = 60;
/** Simulated offset when the reference hasn't been measured. */
const UNCALIBRATED_OFFSET_MILLIOHM = 2.5;
/** Simulated room temperature: the cells sit at it, and the infrared thermometer reads it with a little noise. */
export const AMBIENT_C = 23.8;

/**
 * Seconds of bench time one frequency point takes, simulated as 4.5 cycles and at least 1 s. CN0510 is optimised above
 * 1 Hz, and the guide says a 0.1 Hz point takes over 40 s.
 */
export function pointSeconds(freqHz: number): number {
  return Math.max(1, 4.5 / freqHz);
}

/** Frequencies for a sweep from high to low, evenly spaced per decade. */
export function sweepFrequencies(fromHz: number, toHz: number, perDecade: number): number[] {
  const hi = Math.max(fromHz, toHz);
  const lo = Math.min(fromHz, toHz);
  const decades = Math.log10(hi / lo);
  const n = Math.max(1, Math.round(decades * perDecade));
  return Array.from({ length: n + 1 }, (_, i) => Math.round(hi * 10 ** (-(i * decades) / n) * 1000) / 1000);
}

/** The boards are powered over USB and alive. */
export function powered(s: BenchState): boolean {
  return s.usb.plugged && !s.boards.dead;
}

/** Whether the software sees the board and receives data, and if not, why. */
export function softwareLink(s: BenchState): { ok: true } | { ok: false; reason: InvalidReason } {
  if (s.boards.dead) return { ok: false, reason: "board-dead" };
  if (!s.usb.plugged) return { ok: false, reason: "no-power" };
  if (s.boards.stack !== "aligned") return { ok: false, reason: "not-stacked" };
  if (!s.software.firmware) return { ok: false, reason: "no-firmware" };
  if (s.software.app === "serial") return s.software.baud === SERIAL_BAUD ? { ok: true } : { ok: false, reason: "no-output" };
  if (s.software.app === "sensorpal" && s.software.device && s.software.powerCycled) return { ok: true };
  return { ok: false, reason: "not-connected" };
}

/** Faults that block measurement until the bench is reset: the catalogue's danger faults. */
export const BLOCKING_FAULTS: ReadonlySet<FaultId> = new Set<FaultId>(["shell-short", "offset-stack", "power-order", "power-down-connected", "over-range"]);

type Outcome = Omit<Reading, "seq" | "at" | "connection">;

function invalid(s: BenchState, freqHz: number, reason: InvalidReason, dataArrived: boolean): Outcome {
  const settled = s.clock - s.lastContactAt >= SETTLE_SECONDS;
  return { dutId: s.dutId, freqHz, valid: false, dataArrived, reason, calibrated: s.software.referenceMeasured, settled, tempC: null, wiring: null };
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}

/** One frequency point. `seq` keys the measurement noise, so every reading has its own. */
export function measurePoint(s: BenchState, freqHz: number, seq: number): Outcome {
  const link = softwareLink(s);
  if (!link.ok) return invalid(s, freqHz, link.reason, false);
  if (s.faults.some((f) => BLOCKING_FAULTS.has(f.id))) return invalid(s, freqHz, "fault-active", true);

  const ch = s.channels;
  if (!s.dutId || !ch["F+"] || !ch["F-"]) return invalid(s, freqHz, "open-force", true);
  if (!ch["S+"] || !ch["S-"]) return invalid(s, freqHz, "open-sense", true);

  const part = partById(s.dutId);
  if (part?.kind === "shunt") return invalid(s, freqHz, "no-bias", true);
  const preset = part?.preset ? cellPreset(part.preset) : undefined;
  if (!preset) return invalid(s, freqHz, "open-force", true);
  if (preset.ocv > ENVELOPE_VOLTS) return invalid(s, freqHz, "over-range", true);

  const onPlus = (c: ChannelContact) => c.terminal === "+";
  if (!onPlus(ch["F+"]) || !onPlus(ch["S+"]) || onPlus(ch["F-"]) || onPlus(ch["S-"])) return invalid(s, freqHz, "miswired", true);

  // The cell sits at room temperature; the reading records what the thermometer last showed.
  const tempC = s.cells[s.dutId]?.tempC ?? null;
  const z = randlesImpedance(cellModel(preset, s.dutId, s.seed, AMBIENT_C), freqHz);
  let re = z.re * 1000;
  let im = z.im * 1000;

  re += senseOffsetMilliohm(s.seed, ch) + jumpMilliohm(s.seed, ch) + residualMilliohm(s.seed, ch);
  if (!s.software.referenceMeasured) re += UNCALIBRATED_OFFSET_MILLIOHM;

  const sinceContact = s.clock - s.lastContactAt;
  if (sinceContact < SETTLE_SECONDS) {
    const sign = between(s.seed, `drift:${s.connections}`, 0, 1) < 0.5 ? -1 : 1;
    re += sign * 0.4 * (1 - sinceContact / SETTLE_SECONDS);
  }

  const sd = 0.03 * (1 + 1 / freqHz) * (s.supplyNearLeads ? 4 : 1);
  re += gaussian(s.seed, `noise:${seq}:re`, 0, sd);
  im += gaussian(s.seed, `noise:${seq}:im`, 0, sd);

  // The firmware computes impedance as a ratio against the onboard reference times RcalVal.
  const k = s.software.rcalVal / RCAL_MILLIOHM;
  return {
    dutId: s.dutId,
    freqHz,
    valid: true,
    dataArrived: true,
    z: { re: round3(re * k), im: round3(im * k) },
    calibrated: s.software.referenceMeasured,
    settled: sinceContact >= SETTLE_SECONDS,
    tempC,
    wiring: wiringOf(ch),
  };
}
