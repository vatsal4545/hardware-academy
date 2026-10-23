import type { Complex } from "./complex";

/** The four measurement channels, as labelled on the AD5941BATZ's BNC jacks. */
export type Channel = "F+" | "S+" | "S-" | "F-";
export const CHANNELS: readonly Channel[] = ["F+", "S+", "S-", "F-"];

/** What one channel's lead is clipped to, as chosen on the bench. */
export interface ContactChoice {
  /** The device terminal: "+" or "-" on a cell; "I+", "V+", "V-", "I-" on a four-terminal shunt; "A" or "B" on a two-terminal one. */
  terminal: string;
  /** The adapter contact carrying the lead: the centre pin, or the shell (board ground on this bench: simulated). */
  via: "centre" | "shell";
  /** Bare metal, or the wrapper or oxide. */
  bite: "bare" | "wrapper";
  /** A sense jaw clipped onto a force lead instead of the device terminal. */
  onForceWire: boolean;
}

/** A contact as stored: the choice plus the connection count when it was made, which keys its random draws. */
export interface ChannelContact extends ContactChoice {
  made: number;
}

export type FaultId =
  | "wrapper-bite"
  | "sense-on-force"
  | "not-settled"
  | "no-calibration"
  | "switching-supply-near"
  | "wrong-baud"
  | "isolator-debug"
  | "shell-short"
  | "offset-stack"
  | "power-order"
  | "power-down-connected"
  | "rcal-wrong"
  | "continuity-live"
  | "loose-shunt"
  | "two-terminal-wiring"
  | "over-range";

/** A fault that happened: it stays until the bench is reset. */
export interface FaultEvent {
  id: FaultId;
  at: number;
}

export type InvalidReason =
  | "board-dead"
  | "no-power"
  | "not-stacked"
  | "no-firmware"
  | "not-connected"
  | "no-output"
  | "fault-active"
  | "open-force"
  | "open-sense"
  | "no-bias"
  | "over-range"
  | "miswired";

export type Wiring = "4-wire" | "2-wire" | "mixed";

export interface Reading {
  seq: number;
  /** Bench time in seconds. */
  at: number;
  dutId: string | null;
  freqHz: number;
  valid: boolean;
  /** Data reached the software, even when the reading itself is not valid. */
  dataArrived: boolean;
  reason?: InvalidReason;
  /** Displayed impedance in milliohms, rounded to 0.001 mΩ. */
  z?: Complex;
  /** The bench's connection count when the reading was taken: a change means the leads were reconnected. */
  connection: number;
  calibrated: boolean;
  /** A minute had passed since a clip last moved, so the junctions had settled and the reading doesn't drift. */
  settled: boolean;
  tempC: number | null;
  wiring: Wiring | null;
}

export interface CellRecord {
  /** Label read and checked for leakage. */
  inspected: boolean;
  /** Open-circuit voltage from the multimeter, volts. */
  ocv: number | null;
  /** Last infrared reading, °C. */
  tempC: number | null;
}

export interface BenchState {
  version: 1;
  seed: number;
  mode: "guided" | "free";
  /** Bench time in seconds. */
  clock: number;
  esd: { matGrounded: boolean; strapOn: boolean };
  logCreated: boolean;
  laidOut: boolean;
  /** Parts whose labels have been read. */
  identified: Record<string, true>;
  /** Lead plugs traced with continuity while disconnected, by the channel each will carry. */
  continuityMapped: Partial<Record<Channel, true>>;
  boards: { inspected: boolean; stack: "apart" | "aligned" | "offset"; dead: boolean };
  usb: { plugged: boolean; viaIsolator: boolean };
  software: {
    app: "none" | "sensorpal" | "serial";
    firmware: boolean;
    device: boolean;
    powerCycled: boolean;
    baud: number;
    /** The firmware's onboard reference value, in milliohms. The BATImpedance example uses 50.0. */
    rcalVal: number;
    referenceMeasured: boolean;
  };
  adapters: Partial<Record<Channel, true>>;
  /** The device the leads go to. */
  dutId: string | null;
  channels: Partial<Record<Channel, ChannelContact>>;
  /** Counts every contact made. */
  connections: number;
  /** Bench time of the last contact change. */
  lastContactAt: number;
  /** A switching supply or laptop charger sits next to the leads. */
  supplyNearLeads: boolean;
  cells: Record<string, CellRecord>;
  faults: FaultEvent[];
  /** Newest last, at most 500. */
  readings: Reading[];
  /** Mission question answers, by question id. */
  answers: Record<string, string>;
  /** Ticked mission steps, by step id. */
  missions: Record<string, true>;
  /** Event counter, for reading numbers. */
  seq: number;
}

export type BenchAction =
  | { type: "setMode"; mode: "guided" | "free" }
  | { type: "groundMat" }
  | { type: "wearStrap" }
  | { type: "createLog" }
  | { type: "layOut" }
  | { type: "identify"; partId: string }
  | { type: "inspectBoards" }
  | { type: "stackBoards"; alignment: "aligned" | "offset" }
  | { type: "unstackBoards" }
  | { type: "plugUsb"; viaIsolator: boolean }
  | { type: "unplugUsb" }
  | { type: "openApp"; app: "sensorpal" | "serial" }
  | { type: "loadFirmware" }
  | { type: "selectDevice" }
  | { type: "powerCycle" }
  | { type: "setBaud"; baud: number }
  | { type: "setRcal"; value: number }
  | { type: "measureReference" }
  | { type: "fitAdapter"; channel: Channel }
  | { type: "removeAdapter"; channel: Channel }
  | { type: "chooseDut"; dutId: string | null }
  | { type: "connect"; channel: Channel; contact: ContactChoice }
  | { type: "disconnect"; channel: Channel }
  | { type: "inspectCell"; cellId: string }
  | { type: "measureOcv"; cellId: string }
  | { type: "readTemperature"; cellId: string }
  | { type: "continuity"; target: { kind: "lead"; channel: Channel } | { kind: "cell"; cellId: string } | { kind: "board" } }
  | { type: "placeSupply"; nearLeads: boolean }
  | { type: "wait"; seconds: number }
  | { type: "measure"; freqHz: number }
  | { type: "sweep"; fromHz: number; toHz: number; perDecade: number }
  | { type: "answer"; questionId: string; choice: string }
  | { type: "resetAfterFault" }
  | { type: "markMission"; stepIds: string[] };
