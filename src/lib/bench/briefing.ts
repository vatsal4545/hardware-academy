// What the assistant is told. The briefing is fixed text built from the bench's own data, so it is cacheable and can
// never disagree with the simulator; the snapshot is the small, changing part sent with each question.
import { activeFaults, FAULTS } from "./faults";
import { ENVELOPE_VOLTS, RCAL_MILLIOHM, SERIAL_BAUD, SETTLE_SECONDS } from "./instrument";
import { TARGETS, type LogRow } from "./log";
import { MISSIONS, resumePoint } from "./missions";
import { PARTS, partById } from "./parts";
import { CHANNELS, type BenchState } from "./types";

const STATUS: Record<string, string> = { owned: "on Vatsal's bench", pending: "pending (ordered or still to buy)", "not-bought": "not bought yet" };

const RULES = [
  "Power the boards before connecting the cell, and disconnect the cell before powering down or cycling the boards.",
  "Use the centre (red) jack of each adapter only, and never let a shell touch a cell terminal: the bench treats shells as board ground (simulated), and on real adapters the guide says to check the wiring first.",
  `The BATImpedance example's onboard reference is 50 mΩ and RcalVal is entered in milliohms: ${RCAL_MILLIOHM.toFixed(1)}. Never 0.05, never an external resistor's value.`,
  "CN0510 excites with a transistor current sink. A loose, unpowered resistor can't provide the bias it needs; shunts wait for a verified, powered low-voltage test setup, which Vatsal's real plan has not designed yet.",
  "A dead AA is an unknown sample, not an accuracy standard. Use an intact, identified cell.",
  "Use each shunt's datasheet terminal map; joining four terminals into two loops adds connection resistance.",
  "Continuity mode only on disconnected leads; never on a connected battery or a powered board. A handheld multimeter cannot resolve milliohms.",
  `The 0–${ENVELOPE_VOLTS} V figure is the project envelope, not a verified input rating; the eval board's limit is in the CN0510 guide. The 9 V battery is not allowed.`,
  `SensorPal is ADI's Windows GUI (compatible firmware, DAPLINK device, power cycle). The old CrossCore instructions don't apply; a Mac needs a separate verified firmware plan. Serial output: ${SERIAL_BAUD} baud, 8N1, no flow control.`,
  `CN0510 is optimised above 1 Hz; a 0.1 Hz point takes more than 40 s. Let the setup settle ${SETTLE_SECONDS} s after clipping: readings taken sooner drift, so the bench shows them but doesn't log them.`,
  "Every reading needs a temperature and a timestamp. Resolution, repeatability and accuracy are different things: a small spread doesn't prove accuracy.",
  "This instrument only measures: never charge, discharge or load a cell with it. No puffy, dented or leaking cells on the bench.",
];

/** The fixed system prompt for the bench assistant. */
export function assistantBriefing(): string {
  const parts = PARTS.map((p) => `- ${p.name}: ${STATUS[p.status]}. ${p.role}${p.note ? ` ${p.note}` : ""}`).join("\n");
  const targets = TARGETS.map((t) => `- ${t.nominalMilliohm} mΩ: accuracy ${t.accuracy}, spread under ${t.spreadMaxMilliohm} mΩ over 10 reconnections (${t.purpose}).`).join("\n");
  const troubleshooting = Object.values(FAULTS)
    .map((f) => `- ${f.message} Fix: ${f.fix}`)
    .join("\n");
  const missions = MISSIONS.map((m) => `- Mission ${m.number}, ${m.title}${m.milestone ? ` (${m.milestone})` : ""}: done when ${m.doneWhen.toLowerCase()}`).join("\n");
  return [
    "You are the bench assistant on Hardware Academy's virtual EIS bench. You help Vatsal, a beginner, build a real single-cell EIS tester on the EVAL-AD5941BATZ and EVAL-ADICUP3029 (ADI's CN0510 reference design), both on the virtual bench and on his real bench.",
    "How to answer: plain words, short sentences, one idea at a time. Use the bench snapshot and log rows in each message, and say which part of them you're looking at. Say clearly when something is simulated rather than measured. When you aren't sure, say so. For anything that could damage hardware or a cell, point to the CN0510 guide and the datasheets rather than guessing. Never invent a hookup or claim a test setup is verified.",
    "Where Vatsal's documents disagree, his beginner guide of 2026-09-07 wins over the older runbook.",
    `Rules:\n${RULES.map((r) => `- ${r}`).join("\n")}`,
    `Parts and their real status:\n${parts}`,
    `Development targets for the shunt ladder (targets, not a specification):\n${targets}`,
    `Known mistakes and fixes:\n${troubleshooting}`,
    `Missions:\n${missions}`,
  ].join("\n\n");
}

/** A small, JSON-ready picture of the bench and the log for one question. */
export function benchSnapshot(bench: BenchState, log: readonly LogRow[]) {
  const resume = resumePoint(bench);
  return {
    mode: bench.mode,
    benchTimeSeconds: bench.clock,
    mission: resume ? { mission: resume.mission.title, step: resume.step.title } : "all missions complete",
    boards: { ...bench.boards },
    usb: { ...bench.usb },
    software: { ...bench.software },
    dut: bench.dutId ? { id: bench.dutId, name: partById(bench.dutId)?.name ?? bench.dutId, ...bench.cells[bench.dutId] } : null,
    leads: Object.fromEntries(CHANNELS.map((ch) => [ch, bench.channels[ch] ? { ...bench.channels[ch] } : "unclipped"])),
    faults: activeFaults(bench).map((f) => f.message),
    recentReadings: bench.readings.slice(-3).map((r) => ({ freqHz: r.freqHz, valid: r.valid, settled: r.settled, reason: r.reason, zMilliohm: r.z, wiring: r.wiring, tempC: r.tempC })),
    log: log.slice(-30).map((r) => ({ source: r.source, dut: r.dutId, freqHz: r.freqHz, zReal: r.zReal, zImag: r.zImag, tempC: r.tempC, reconnected: r.reconnected, calibration: r.calibration })),
  };
}
