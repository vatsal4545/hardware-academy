import { benchReducer, initialBench } from "@/lib/bench/state";
import { CHANNELS, type BenchAction, type BenchState, type Channel, type ContactChoice } from "@/lib/bench/types";

/** Applies actions in order. */
export function run(s: BenchState, ...actions: BenchAction[]): BenchState {
  return actions.reduce(benchReducer, s);
}

/** Correct four-wire contacts on a cell: F+ and S+ on +, S− and F− on −, centre pins, bare metal. */
export const GOOD: Record<Channel, ContactChoice> = {
  "F+": { terminal: "+", via: "centre", bite: "bare", onForceWire: false },
  "S+": { terminal: "+", via: "centre", bite: "bare", onForceWire: false },
  "S-": { terminal: "-", via: "centre", bite: "bare", onForceWire: false },
  "F-": { terminal: "-", via: "centre", bite: "bare", onForceWire: false },
};

/** Boards stacked and powered, SensorPal set up, adapters fitted; nothing clipped. */
export function poweredBench(seed = 7): BenchState {
  return run(
    initialBench(seed),
    { type: "inspectBoards" },
    { type: "stackBoards", alignment: "aligned" },
    { type: "plugUsb", viaIsolator: false },
    { type: "openApp", app: "sensorpal" },
    { type: "loadFirmware" },
    { type: "selectDevice" },
    { type: "powerCycle" },
    ...CHANNELS.map((channel): BenchAction => ({ type: "fitAdapter", channel })),
  );
}

/** Chooses the device and clips all four leads, with optional per-channel changes to the good contacts. */
export function clipped(s: BenchState, dutId: string, changes: Partial<Record<Channel, Partial<ContactChoice>>> = {}): BenchState {
  let next = benchReducer(s, { type: "chooseDut", dutId });
  for (const channel of CHANNELS) {
    next = benchReducer(next, { type: "connect", channel, contact: { ...GOOD[channel], ...changes[channel] } });
  }
  return next;
}

/** Unclips and reclips every lead at the same contacts, then lets the junctions settle. */
export function reclip(s: BenchState, changes: Partial<Record<Channel, Partial<ContactChoice>>> = {}): BenchState {
  let next = s;
  for (const channel of CHANNELS) next = benchReducer(next, { type: "disconnect", channel });
  for (const channel of CHANNELS) {
    next = benchReducer(next, { type: "connect", channel, contact: { ...GOOD[channel], ...changes[channel] } });
  }
  return benchReducer(next, { type: "wait", seconds: 60 });
}

/** A powered, calibrated bench clipped four-wire to a cell and settled: ready for a valid reading. */
export function readyBench(seed = 7, dutId = "cell-d-duracell"): BenchState {
  return run(clipped(run(poweredBench(seed), { type: "measureReference" }), dutId), { type: "wait", seconds: 60 });
}

/** The newest reading. */
export function last(s: BenchState) {
  return s.readings[s.readings.length - 1];
}

/** Max minus min. */
export function spread(xs: number[]): number {
  return Math.max(...xs) - Math.min(...xs);
}
