// The virtual bench as data: its starting state and how each action changes it. Pure and deterministic: the same
// seed and the same actions always give the same bench.
import { cellPreset } from "./dut";
import { AMBIENT_C, ENVELOPE_VOLTS, RCAL_MILLIOHM, measurePoint, pointSeconds, powered, sweepFrequencies } from "./instrument";
import { partById } from "./parts";
import { gaussian } from "./random";
import { CHANNELS, type BenchAction, type BenchState, type CellRecord, type Channel, type FaultId, type Reading } from "./types";

const MAX_READINGS = 500;
/** Seconds of bench time that clipping and unclipping a lead take. */
const CLIP_SECONDS = 5;
const UNCLIP_SECONDS = 2;

export function initialBench(seed: number): BenchState {
  return {
    version: 1,
    seed,
    mode: "guided",
    clock: 0,
    esd: { matGrounded: false, strapOn: false },
    logCreated: false,
    laidOut: false,
    identified: {},
    continuityMapped: {},
    boards: { inspected: false, stack: "apart", dead: false },
    usb: { plugged: false, viaIsolator: false },
    software: { app: "none", firmware: false, device: false, powerCycled: false, baud: 115200, rcalVal: RCAL_MILLIOHM, referenceMeasured: false },
    adapters: {},
    dutId: null,
    channels: {},
    connections: 0,
    lastContactAt: 0,
    supplyNearLeads: false,
    cells: {},
    faults: [],
    readings: [],
    answers: {},
    missions: {},
    seq: 0,
  };
}

/** The device under test is a cell. */
export function dutIsCell(s: BenchState): boolean {
  return partById(s.dutId ?? "")?.kind === "cell";
}

/** At least one lead is clipped to the device under test. */
export function anyConnected(s: BenchState): boolean {
  return CHANNELS.some((ch) => s.channels[ch]);
}

function withFault(s: BenchState, id: FaultId): BenchState {
  if (s.faults.some((f) => f.id === id)) return s;
  return { ...s, faults: [...s.faults, { id, at: s.clock }] };
}

function cell(s: BenchState, cellId: string): CellRecord {
  return s.cells[cellId] ?? { inspected: false, ocv: null, tempC: null };
}

function withCell(s: BenchState, cellId: string, patch: Partial<CellRecord>): BenchState {
  return { ...s, cells: { ...s.cells, [cellId]: { ...cell(s, cellId), ...patch } } };
}

function addReadings(s: BenchState, freqs: number[]): BenchState {
  let next = s;
  const added: Reading[] = [];
  for (const freqHz of freqs) {
    const seq = next.seq + 1;
    const outcome = measurePoint(next, freqHz, seq);
    added.push({ ...outcome, seq, at: next.clock, connection: next.connections });
    next = { ...next, seq, clock: next.clock + pointSeconds(freqHz) };
  }
  return { ...next, readings: [...next.readings, ...added].slice(-MAX_READINGS) };
}

export function benchReducer(s: BenchState, a: BenchAction): BenchState {
  switch (a.type) {
    case "setMode":
      return { ...s, mode: a.mode };
    case "groundMat":
      return { ...s, esd: { ...s.esd, matGrounded: true } };
    case "wearStrap":
      return { ...s, esd: { ...s.esd, strapOn: true } };
    case "createLog":
      return { ...s, logCreated: true };
    case "layOut":
      return { ...s, laidOut: true };
    case "identify":
      return { ...s, identified: { ...s.identified, [a.partId]: true } };
    case "inspectBoards":
      return { ...s, boards: { ...s.boards, inspected: true } };
    case "stackBoards": {
      const next = { ...s, boards: { ...s.boards, stack: a.alignment } };
      if (a.alignment === "offset" && s.usb.plugged) return withFault({ ...next, boards: { ...next.boards, dead: true } }, "offset-stack");
      return next;
    }
    case "unstackBoards":
      return { ...s, boards: { ...s.boards, stack: "apart" } };
    case "plugUsb": {
      const next = { ...s, usb: { plugged: true, viaIsolator: a.viaIsolator } };
      if (s.boards.stack === "offset") return withFault({ ...next, boards: { ...next.boards, dead: true } }, "offset-stack");
      return next;
    }
    case "unplugUsb": {
      const next = { ...s, usb: { ...s.usb, plugged: false }, software: { ...s.software, referenceMeasured: false } };
      return dutIsCell(s) && anyConnected(s) ? withFault(next, "power-down-connected") : next;
    }
    case "openApp":
      return { ...s, software: { ...s.software, app: a.app } };
    case "loadFirmware":
      if (!powered(s)) return s;
      if (s.usb.viaIsolator) return withFault(s, "isolator-debug");
      return { ...s, software: { ...s.software, firmware: true } };
    case "selectDevice":
      return s.software.app === "sensorpal" ? { ...s, software: { ...s.software, device: true } } : s;
    case "powerCycle": {
      if (!s.usb.plugged) return s;
      const next = { ...s, software: { ...s.software, powerCycled: true, referenceMeasured: false } };
      return dutIsCell(s) && anyConnected(s) ? withFault(next, "power-down-connected") : next;
    }
    case "setBaud":
      return { ...s, software: { ...s.software, baud: a.baud } };
    case "setRcal":
      return { ...s, software: { ...s.software, rcalVal: a.value } };
    case "measureReference":
      return powered(s) && s.software.firmware ? { ...s, clock: s.clock + 2, software: { ...s.software, referenceMeasured: true } } : s;
    case "fitAdapter":
      return { ...s, adapters: { ...s.adapters, [a.channel]: true } };
    case "removeAdapter": {
      if (s.channels[a.channel]) return s;
      const adapters = { ...s.adapters };
      delete adapters[a.channel];
      return { ...s, adapters };
    }
    case "chooseDut":
      return anyConnected(s) ? s : { ...s, dutId: a.dutId };
    case "connect": {
      if (!s.dutId || !s.adapters[a.channel]) return s;
      const connections = s.connections + 1;
      let next: BenchState = {
        ...s,
        channels: { ...s.channels, [a.channel]: { ...a.contact, made: connections } },
        connections,
        lastContactAt: s.clock,
        clock: s.clock + CLIP_SECONDS,
      };
      if (dutIsCell(s)) {
        const preset = cellPreset(partById(s.dutId)?.preset ?? "");
        if (a.contact.via === "shell") next = withFault(next, "shell-short");
        if (!powered(s)) next = withFault(next, "power-order");
        if (preset && preset.ocv > ENVELOPE_VOLTS) next = withFault(next, "over-range");
      }
      return next;
    }
    case "disconnect": {
      if (!s.channels[a.channel]) return s;
      const channels = { ...s.channels };
      delete channels[a.channel];
      return { ...s, channels, lastContactAt: s.clock, clock: s.clock + UNCLIP_SECONDS };
    }
    case "inspectCell":
      return withCell(s, a.cellId, { inspected: true });
    case "measureOcv": {
      const preset = cellPreset(partById(a.cellId)?.preset ?? "");
      if (!preset) return s;
      const ocv = Math.round(gaussian(s.seed, `ocv:${a.cellId}`, preset.ocv, 0.01) * 1000) / 1000;
      return withCell({ ...s, clock: s.clock + 3 }, a.cellId, { ocv });
    }
    case "readTemperature": {
      const tempC = Math.round(gaussian(s.seed, `temp:${a.cellId}:${s.clock}`, AMBIENT_C, 0.3) * 10) / 10;
      return withCell(s, a.cellId, { tempC });
    }
    case "continuity": {
      const t = a.target;
      if (t.kind === "lead") {
        if (s.channels[t.channel]) return dutIsCell(s) ? withFault(s, "continuity-live") : s;
        return { ...s, continuityMapped: { ...s.continuityMapped, [t.channel]: true } };
      }
      if (t.kind === "cell") return s.dutId === t.cellId && anyConnected(s) ? withFault(s, "continuity-live") : s;
      return s.usb.plugged ? withFault(s, "continuity-live") : s;
    }
    case "placeSupply":
      return { ...s, supplyNearLeads: a.nearLeads };
    case "wait":
      return { ...s, clock: s.clock + Math.max(0, a.seconds) };
    case "measure":
      return addReadings(s, [a.freqHz]);
    case "sweep":
      return addReadings(s, sweepFrequencies(a.fromHz, a.toHz, a.perDecade));
    case "answer":
      return { ...s, answers: { ...s.answers, [a.questionId]: a.choice } };
    case "markMission": {
      const missions = { ...s.missions };
      for (const id of a.stepIds) missions[id] = true;
      return { ...s, missions };
    }
    case "resetAfterFault":
      // The safe state: power off, every lead unclipped, a working board in place.
      return {
        ...s,
        faults: [],
        boards: { ...s.boards, dead: false, stack: s.boards.stack === "offset" ? "apart" : s.boards.stack },
        usb: { ...s.usb, plugged: false },
        software: { ...s.software, referenceMeasured: false },
        channels: {},
        lastContactAt: s.clock,
      };
  }
}

/** Why a lead can't be connected to a channel right now, or null when it can. */
export function connectBlocker(s: BenchState, channel: Channel): string | null {
  if (!s.dutId) return "Choose the device under test first.";
  if (!s.adapters[channel]) return `Fit a BNC to banana adapter on ${channel} first: banana plugs don't mate with BNC.`;
  return null;
}
