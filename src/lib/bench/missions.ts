// Missions 1-4 of the virtual bench, in the beginner guide's learning sequence. Each step is a check over the bench
// and the lab log; steps tick in order and stay ticked.
import { partById, partsOfKind } from "./parts";
import { BLOCKING_FAULTS, SETTLE_SECONDS, softwareLink } from "./instrument";
import type { LogRow } from "./log";
import { CHANNELS, type BenchState, type Channel } from "./types";

export interface MissionContext {
  bench: BenchState;
  log: readonly LogRow[];
}

export interface MissionQuestion {
  id: string;
  prompt: string;
  choices: Array<{ id: string; text: string }>;
  correct: string;
  explain: string;
}

export interface MissionStep {
  id: string;
  title: string;
  /** The part the bench highlights in Guided mode. */
  target?: string;
  question?: MissionQuestion;
  done: (ctx: MissionContext) => boolean;
}

export interface Mission {
  id: string;
  number: number;
  title: string;
  /** The runbook achievement this mission earns, if any. */
  milestone?: string;
  /** Learn-first card ids, shown before the first step. */
  learn: string[];
  doneWhen: string;
  steps: MissionStep[];
}

const EXPECTED: Record<Channel, string> = { "F+": "+", "S+": "+", "S-": "-", "F-": "-" };

/** All four leads clipped correctly: right terminals, centre pins, bare metal, sense on the terminals. */
export function clippedCorrectly(s: BenchState): boolean {
  return CHANNELS.every((ch) => {
    const c = s.channels[ch];
    return c !== undefined && c.terminal === EXPECTED[ch] && c.via === "centre" && c.bite === "bare" && !c.onForceWire;
  });
}

/** The device under test is a cell that has been inspected, has a voltage reading and isn't leaking. */
export function identifiedIntactCell(s: BenchState): boolean {
  const part = partById(s.dutId ?? "");
  if (part?.kind !== "cell" || part.leaking || part.id === "cell-9v") return false;
  const record = s.cells[part.id];
  return record?.inspected === true && record.ocv !== null;
}

function validAt1k(s: BenchState) {
  return s.readings.filter((r) => r.valid && r.dutId === s.dutId && r.freqHz === 1000);
}

/** The largest group of valid 1 kHz readings taken without the leads moving. */
export function stationaryCount(s: BenchState): number {
  const counts = new Map<number, number>();
  for (const r of validAt1k(s)) counts.set(r.connection, (counts.get(r.connection) ?? 0) + 1);
  return Math.max(0, ...counts.values());
}

/** Valid 1 kHz readings each taken after the leads were reconnected. */
export function reconnectionCount(s: BenchState): number {
  const readings = validAt1k(s);
  return readings.filter((r, i) => i > 0 && r.connection !== readings[i - 1].connection).length;
}

function logged(ctx: MissionContext): LogRow[] {
  return ctx.log.filter((r) => r.source === "virtual" && r.dutId === ctx.bench.dutId && r.freqHz === 1000);
}

export const MISSIONS: readonly Mission[] = [
  {
    id: "identify",
    number: 1,
    title: "Identify",
    learn: ["basics", "parts"],
    doneWhen: "A labelled inventory and connector map exist.",
    steps: [
      { id: "identify.mat", title: "Ground the anti-static mat: cord to the plug's earth pin", target: "esd-kit", done: ({ bench }) => bench.esd.matGrounded },
      { id: "identify.strap", title: "Put on the wrist strap and snap it to the mat", target: "esd-kit", done: ({ bench }) => bench.esd.strapOn },
      { id: "identify.log", title: "Create the lab log", done: ({ bench }) => bench.logCreated },
      { id: "identify.layout", title: "Lay everything out with USB, bench power and cells disconnected", done: ({ bench }) => bench.laidOut && !bench.usb.plugged && CHANNELS.every((ch) => !bench.channels[ch]) },
      { id: "identify.boards", title: "Read both board names and revision labels", target: "eval-ad5941batz", done: ({ bench }) => Boolean(bench.identified["eval-ad5941batz"] && bench.identified["eval-adicup3029"]) },
      { id: "identify.bags", title: "Note the full part number on every resistor bag", target: "shunt-10m", done: ({ bench }) => partsOfKind("shunt").every((p) => bench.identified[p.id]) },
      { id: "identify.leads", title: "Trace each lead plug to its jaw with continuity, leads disconnected", target: "kelvin-leads", done: ({ bench }) => CHANNELS.every((ch) => bench.continuityMapped[ch]) },
      { id: "identify.adapters", title: "Fit a BNC to banana adapter on each jack: centre pin only", target: "bnc-banana-adapters", done: ({ bench }) => CHANNELS.every((ch) => bench.adapters[ch]) },
    ],
  },
  {
    id: "communicate",
    number: 2,
    title: "Communicate",
    milestone: "First Boot",
    learn: ["signal-chain"],
    doneWhen: "The board is recognised and numbers arrive with nothing connected.",
    steps: [
      { id: "communicate.inspect", title: "Inspect both boards under the microscope", target: "usb-microscope", done: ({ bench }) => bench.boards.inspected },
      { id: "communicate.stack", title: "Stack the AD5941BATZ onto the ADICUP3029, pins aligned", target: "eval-ad5941batz", done: ({ bench }) => bench.boards.stack === "aligned" && !bench.boards.dead },
      { id: "communicate.usb", title: "Plug USB into P10", target: "eval-adicup3029", done: ({ bench }) => bench.usb.plugged && !bench.boards.dead },
      { id: "communicate.firmware", title: "Open SensorPal and load compatible firmware", target: "laptop", done: ({ bench }) => bench.software.app === "sensorpal" && bench.software.firmware },
      { id: "communicate.device", title: "Select the DAPLINK device and power-cycle the board", target: "laptop", done: ({ bench }) => bench.software.device && bench.software.powerCycled },
      { id: "communicate.data", title: "Run one measurement with nothing connected", target: "laptop", done: ({ bench }) => bench.readings.some((r) => r.dutId === null && r.dataArrived) },
    ],
  },
  {
    id: "first-response",
    number: 3,
    title: "First response",
    learn: ["four-wires", "impedance"],
    doneWhen: "One reading with frequency, units, wiring and calibration state recorded.",
    steps: [
      { id: "response.cell", title: "Pick an intact cell and identify it: label, leakage check, open-circuit voltage", target: "cell-d-duracell", done: ({ bench }) => identifiedIntactCell(bench) },
      { id: "response.power", title: "Power the boards first, with the software connected", target: "eval-adicup3029", done: ({ bench }) => softwareLink(bench).ok },
      { id: "response.clip", title: "Clip four-wire: F+ and S+ on +, S− and F− on −, bare metal", target: "kelvin-leads", done: ({ bench }) => clippedCorrectly(bench) && !bench.faults.some((f) => BLOCKING_FAULTS.has(f.id)) },
      { id: "response.reference", title: "Keep RcalVal at 50.0 and measure the onboard reference", target: "laptop", done: ({ bench }) => bench.software.rcalVal === 50 && bench.software.referenceMeasured },
      { id: "response.read", title: "Measure once at 1 kHz", target: "laptop", done: ({ bench }) => validAt1k(bench).some((r) => r.calibrated) },
      {
        id: "response.log",
        title: "Log it with frequency, wiring, calibration state and temperature",
        target: "ir-thermometer",
        done: (ctx) => logged(ctx).some((r) => r.calibration === "measured" && r.wiring === "4-wire" && r.tempC !== null),
      },
    ],
  },
  {
    id: "repeat",
    number: 4,
    title: "Repeat",
    learn: ["res-rep-acc"],
    doneWhen: "Mean and spread for both sets, with the variation explained.",
    steps: [
      { id: "repeat.settle", title: "Let the junctions settle for a minute after clipping", done: ({ bench }) => clippedCorrectly(bench) && bench.clock - bench.lastContactAt >= SETTLE_SECONDS },
      { id: "repeat.stationary", title: "Take 10 readings at 1 kHz without moving the leads", target: "laptop", done: ({ bench }) => stationaryCount(bench) >= 10 },
      { id: "repeat.reconnect", title: "Take 10 more, reconnecting the clips at the same contacts before each", target: "kelvin-leads", done: ({ bench }) => reconnectionCount(bench) >= 10 },
      {
        id: "repeat.log",
        title: "Log both sets",
        done: (ctx) => {
          const rows = logged(ctx);
          return rows.filter((r) => !r.reconnected).length >= 10 && rows.filter((r) => r.reconnected).length >= 10;
        },
      },
      {
        id: "repeat.explain",
        title: "Explain which set spreads more",
        question: {
          id: "repeat.cause",
          prompt: "Which set spreads more, and why?",
          choices: [
            { id: "contact", text: "The reconnection set: each reconnection changes the clip contact" },
            { id: "warmup", text: "The stationary set: the board heats up a little between each reading" },
            { id: "same", text: "Neither set: both always show exactly the same spread" },
          ],
          correct: "contact",
          explain: "Every reconnection makes a new contact with its own resistance, so readings spread more. Readings without moving the leads only see noise.",
        },
        done: ({ bench }) => bench.answers["repeat.cause"] === "contact",
      },
    ],
  },
];

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

/**
 * Step ids that tick now, given what is already ticked: in each mission, steps tick in order, so a step ticks only
 * when every earlier step is ticked (or ticks in this same pass) and its own check passes.
 */
export function newlyDone(ctx: MissionContext): string[] {
  const ticked = new Set(Object.keys(ctx.bench.missions));
  const fresh: string[] = [];
  for (const mission of MISSIONS) {
    for (const step of mission.steps) {
      if (ticked.has(step.id)) continue;
      if (!step.done(ctx)) break;
      ticked.add(step.id);
      fresh.push(step.id);
    }
  }
  return fresh;
}

export function missionComplete(bench: BenchState, mission: Mission): boolean {
  return mission.steps.every((step) => bench.missions[step.id]);
}

/** The mission and step to resume at: the first unticked step of the first unfinished mission. */
export function resumePoint(bench: BenchState): { mission: Mission; step: MissionStep } | null {
  for (const mission of MISSIONS) {
    const step = mission.steps.find((st) => !bench.missions[st.id]);
    if (step) return { mission, step };
  }
  return null;
}
