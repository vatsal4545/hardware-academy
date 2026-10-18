/**
 * The virtual multimeter for the components-in-action tour: where its test pads sit on the board, how two clicks become
 * a black and a red probe, and the one-line law behind each reading. The voltages themselves come from nodeVoltages()
 * in the board model; nothing here is physics, only placement, the probe rule and words.
 */

import { nodeVoltages, type BoardInputs, type BoardModel, type TestPointId } from "@/lib/sim/board";
import { IO35_PAD } from "./BoardInAction.board";
import { formatSI } from "./OhmsLawCircuit.helpers";
import type { Pt } from "./SchematicToLayoutBoard";

export interface TestPoint {
  id: TestPointId;
  /** name in the meter readout and in the pad's accessible name */
  name: string;
  /** short silk label beside the pad */
  label: string;
  /** pad centre, mm */
  at: Pt;
  /** where the label sits, mm, and how it is anchored */
  labelAt: Pt;
  anchor: "start" | "middle" | "end";
  /** copper from the pad to the net it taps (or copper the shared board file leaves out), mm; drawn under the parts */
  stubs?: Pt[][];
}

/**
 * One pad per node, placed on free copper or on an existing pad: GND below J1's minus pin, VBAT and VM on their traces,
 * the regulator's IN pin, the 3V3 trace, the EN node between R2 and C8, the LED loop (IO13 end of R3, the anode between
 * R3 and D1, the cathode), the module's IO35 pad for the divider, and the two motor terminals between J2 and U2.
 */
export const TEST_POINTS: TestPoint[] = [
  { id: "GND", name: "GND", label: "GND", at: [4.8, 32.4], labelAt: [5.7, 32.4], anchor: "start", stubs: [[[4.8, 29.25], [4.8, 32.4]]] },
  { id: "VBAT", name: "VBAT", label: "VBAT", at: [8.3, 26.75], labelAt: [8.3, 25.55], anchor: "middle" },
  { id: "VM", name: "VM", label: "VM", at: [13.0, 23.5], labelAt: [12.2, 23.5], anchor: "end" },
  { id: "U3_IN", name: "U3 IN", label: "IN", at: [16.9, 26.75], labelAt: [17.7, 26.75], anchor: "start" },
  { id: "3V3", name: "3V3", label: "3V3", at: [26.0, 29.05], labelAt: [26.9, 28.15], anchor: "start" },
  {
    id: "EN",
    name: "EN",
    label: "EN",
    at: [38.1, 7.5],
    labelAt: [38.1, 6.5],
    anchor: "middle",
    stubs: [
      [[37.46, 9.0], [38.74, 9.0]],
      [[38.1, 9.0], [38.1, 7.5]],
    ],
  },
  { id: "IO13", name: "IO13", label: "IO13", at: [43.0, 33.8], labelAt: [43.8, 33.8], anchor: "start", stubs: [[[41.66, 33.8], [43.0, 33.8]]] },
  {
    id: "D1_A",
    name: "D1 anode (A)",
    label: "A",
    at: [40.2, 35.3],
    labelAt: [40.95, 35.3],
    anchor: "start",
    stubs: [
      [[40.34, 33.8], [38.46, 33.8]],
      [[39.4, 33.8], [40.2, 35.3]],
    ],
  },
  { id: "D1_K", name: "D1 cathode (K)", label: "K", at: [38.2, 35.3], labelAt: [38.95, 35.3], anchor: "start", stubs: [[[37.54, 33.8], [38.2, 35.3]]] },
  { id: "VBAT_SENSE", name: "VBAT_SENSE (IO35)", label: "IO35 VBAT_SENSE", at: IO35_PAD, labelAt: [35.5, 28.0], anchor: "start" },
  { id: "M1A", name: "M1A", label: "M1A", at: [19.0, 10.3], labelAt: [18.3, 10.3], anchor: "end" },
  { id: "M1B", name: "M1B", label: "M1B", at: [20.6, 10.3], labelAt: [21.3, 10.3], anchor: "start" },
];

export function testPointName(id: TestPointId | null): string | null {
  return id ? (TEST_POINTS.find((t) => t.id === id)?.name ?? id) : null;
}

/* ---------- probes ---------- */

export interface Probes {
  black: TestPointId | null;
  red: TestPointId | null;
}

export const NO_PROBES: Probes = { black: null, red: null };

/**
 * The first pad takes the black probe (COM), the second the red one. A third pad moves the red probe, as on a bench where
 * COM stays on ground and the red probe walks the board; a pad that already holds a probe lifts it.
 */
export function nextProbes(p: Probes, id: TestPointId): Probes {
  if (p.black === id) return { ...p, black: null };
  if (p.red === id) return { ...p, red: null };
  if (p.black === null) return { ...p, black: id };
  return { ...p, red: id };
}

/* ---------- the reading and the law behind it ---------- */

export interface MeterReading {
  /** V(red) − V(black) */
  volts: number;
  /** what the display shows */
  display: string;
  /** one line on which law makes the number */
  law: string;
}

/** A bench meter autoranges: millivolts below 1 V, two decimals above; the minus sign is the real one. */
export function formatMeter(v: number): string {
  if (Math.abs(v) < 5e-4) return "0.00 V";
  if (Math.abs(v) < 1) return formatSI(v, "V");
  return `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)} V`;
}

const v2 = (x: number) => `${x.toFixed(2)} V`;

type Law = (m: BoardModel, i: BoardInputs) => string;

const ldoDrop: Law = (m, i) => {
  const vm = i.vPack - m.fet.vFet;
  return `The regulator's drop, Vin − Vout = ${v2(vm)} − 3.30 V = ${v2(vm - 3.3)}; at ${formatSI(i.iLogic, "A")} that is ${formatSI(m.ldo.pLdo, "W")} of heat, P = (Vin − Vout) · I.`;
};
const motorTerminal =
  (driven: boolean): Law =>
  (m, i) => {
    const vm = i.vPack - m.fet.vFet;
    return driven
      ? `The bridge ties this terminal to VM for ${Math.round(i.duty * 100)}% of each PWM cycle, so the DC average is ${i.duty.toFixed(2)} × ${v2(vm)} = ${v2(i.duty * vm)}; the other terminal is held at ground.`
      : `0 V: the bridge holds this terminal at ground (its lower switch is on) while the other one is driven.`;
  };

/** Which law makes the number, by unordered pair of test points; pairs not listed get the plain definition of a voltmeter. */
const LAWS: Array<[TestPointId, TestPointId, Law]> = [
  ["GND", "VBAT", (_m, i) => `The pack itself, ${v2(i.vPack)} between J1's pins. Every other voltage on the board is this one minus a drop somewhere.`],
  ["VBAT", "VM", (m) => `Ohm's law across Q1: ${m.fet.iPack.toFixed(3)} A × 50 mΩ = ${formatSI(m.fet.vFet, "V")}, the on-state drop of the reverse-polarity FET.`],
  ["GND", "VM", (m, i) => `VM is the pack minus Q1's drop: ${v2(i.vPack)} − ${formatSI(m.fet.vFet, "V")} = ${v2(i.vPack - m.fet.vFet)} (Ohm's law on the FET).`],
  ["GND", "U3_IN", (m, i) => `U3's input pin sits on the VM net: ${v2(i.vPack)} from the pack minus ${formatSI(m.fet.vFet, "V")} across Q1 (Ohm's law on the FET).`],
  ["VM", "U3_IN", () => "0 V: both probes are on the VM net, and the few milliohms of copper between them drop less than this meter resolves."],
  ["VM", "3V3", ldoDrop],
  ["U3_IN", "3V3", ldoDrop],
  ["VBAT", "3V3", (_m, i) => `Q1's drop plus the regulator's: ${v2(i.vPack)} − 3.30 V = ${v2(i.vPack - 3.3)}; nearly all of it becomes heat in U3, P = (Vin − Vout) · I.`],
  ["GND", "3V3", () => "The regulator holds its output at 3.30 V whatever the pack does above dropout; the rest of VM becomes heat in U3."],
  ["GND", "EN", (m) => `EN has settled: C8 charged through R2 (τ = ${formatSI(m.en.tau, "s")}) and crossed 0.75 × VDD at ${formatSI(m.en.tBoot, "s")}; after 5τ the meter sees the full rail.`],
  ["EN", "3V3", () => "0 V across R2: once C8 is charged no current flows through the 10 kΩ, and Ohm's law with I = 0 means no drop."],
  ["GND", "IO13", () => "IO13 high: the pin sources the LED loop from the 3.3 V rail."],
  ["IO13", "D1_A", (m, i) => `Ohm's law on R3: ${formatSI(m.led.iLed, "A")} × ${formatSI(i.ledR, "Ω")} = ${v2(m.led.kvl.dropR)}, the voltage the LED leaves over.`],
  ["D1_A", "D1_K", (m) => `KVL: ${m.led.kvl.rise.toFixed(2)} − ${m.led.kvl.dropR.toFixed(2)} − ${m.led.kvl.dropLed.toFixed(2)} = 0 across the LED loop; the meter reads the LED's forward voltage, ${v2(m.led.kvl.dropLed)}.`],
  ["IO13", "D1_K", () => "The whole LED loop: IO13 drives it at 3.30 V and the cathode is grounded, so R3 and D1 share the 3.30 V between them (KVL)."],
  ["GND", "D1_A", (m) => `The anode sits at the LED's forward voltage, ${v2(m.led.kvl.dropLed)} above ground; the other ${v2(m.led.kvl.dropR)} is across R3 (KVL).`],
  ["GND", "D1_K", () => "0 V: the cathode is tied straight to ground."],
  ["GND", "VBAT_SENSE", (m, i) => `Voltage divider: ${v2(i.vPack)} × 47 k / 147 k = ${m.divider.vOut.toFixed(3)} V, which the ADC reads as ${m.divider.counts} counts.`],
  ["VBAT", "VBAT_SENSE", (m) => `The drop across R4, Ohm's law: ${formatSI(m.divider.iDiv, "A")} × 100 kΩ = ${v2(m.divider.iDiv * 100e3)}.`],
  [
    "M1A",
    "M1B",
    (m, i) => {
      const vm = i.vPack - m.fet.vFet;
      return `The H-bridge average, D · VM = ${i.duty.toFixed(2)} × ${v2(vm)} = ${v2(i.duty * vm)} (${i.forward ? "forward" : "reverse"}; a meter on DC averages the 20 kHz PWM).`;
    },
  ],
  ["GND", "M1A", (m, i) => motorTerminal(i.forward)(m, i)],
  ["GND", "M1B", (m, i) => motorTerminal(!i.forward)(m, i)],
];

function lawFor(a: TestPointId, b: TestPointId): Law | undefined {
  return LAWS.find(([p, q]) => (p === a && q === b) || (p === b && q === a))?.[2];
}

/** What the meter shows with the black probe on one test point and the red on another, and why. */
export function meterReading(black: TestPointId, red: TestPointId, m: BoardModel, i: BoardInputs): MeterReading {
  const nodes = nodeVoltages(i);
  const volts = nodes[red] - nodes[black];
  const law =
    lawFor(black, red)?.(m, i) ??
    `A voltmeter reads the difference between its probes: ${v2(nodes[red])} at ${testPointName(red)} minus ${v2(nodes[black])} at ${testPointName(black)}.`;
  const sign = volts < -5e-4 ? " Negative because the red probe is on the lower node; swap the probes to read it the usual way round." : "";
  return { volts, display: formatMeter(volts), law: law + sign };
}
