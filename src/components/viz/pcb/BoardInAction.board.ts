/**
 * Data for the components-in-action tour of the motor-driver board: the Rev B additions (battery divider), the eight
 * stations (which parts and copper each one lights, which current flows it animates, which controls it shows) and a
 * plain-language role for every part so any of them can be inspected. The shared board file is left untouched;
 * everything here is drawn on top of it. Units are millimetres on the board, SI in the readings.
 */

import { BOARD, type BoardInputs, type BoardModel } from "@/lib/sim/board";
import { formatSI } from "./OhmsLawCircuit.helpers";
import { nets, parts, type Net, type Part, type Pt } from "./SchematicToLayoutBoard";

/* ---------- Rev B: the battery-monitor divider ---------- */

/** A new module pad for IO35, one pitch left of IO32 on the bottom row. */
export const IO35_PAD: Pt = [36.7, 29.0];

export const revBParts: Part[] = [
  { ref: "R4", label: "100 k", kind: "res", x: 26.5, y: 31.2, w: 2.4, h: 1.2, zone: "logic" },
  { ref: "R5", label: "47 k", kind: "res", x: 29.3, y: 31.2, w: 2.4, h: 1.2, zone: "logic" },
  { ref: "C9", label: "100 nF", kind: "cap", x: 29.3, y: 32.6, w: 2.4, h: 1.2, zone: "logic" },
];

export const revBNets: Net[] = [
  {
    id: "VBAT_SENSE_FEED",
    label: "VM to R4",
    cls: "signal",
    taps: [{ ref: "R4", pin: "1", at: [25.84, 31.2] }],
    routes: [{ layer: "F", pts: [[15.0, 26.75], [15.0, 34.2], [25.84, 34.2], [25.84, 31.2]] }],
    vias: [],
  },
  {
    id: "VBAT_SENSE",
    label: "VBAT_SENSE (IO35)",
    cls: "signal",
    taps: [
      { ref: "R4", pin: "2", at: [27.16, 31.2] },
      { ref: "R5", pin: "1", at: [28.64, 31.2] },
      { ref: "C9", pin: "1", at: [28.64, 32.6] },
      { ref: "U1", pin: "IO35", at: IO35_PAD },
    ],
    routes: [
      { layer: "F", pts: [[27.16, 31.2], [28.64, 31.2]] },
      { layer: "F", pts: [[28.64, 31.2], [28.64, 32.6]] },
      { layer: "F", pts: [[27.9, 31.2], [27.9, 30.1], [36.7, 30.1], [36.7, 29.0]] },
    ],
    vias: [],
  },
  {
    id: "VBAT_SENSE_GND",
    label: "GND",
    cls: "signal",
    taps: [
      { ref: "R5", pin: "2", at: [29.96, 31.2] },
      { ref: "C9", pin: "2", at: [29.96, 32.6] },
    ],
    routes: [{ layer: "F", pts: [[29.96, 31.2], [29.96, 33.2]] }],
    vias: [[29.96, 33.2]],
  },
];

export const allParts: Part[] = [...parts, ...revBParts];
export const allNets: Net[] = [...nets, ...revBNets];

/* ---------- stations ---------- */

export type StationId = "fet" | "kcl" | "ldo" | "led" | "divider" | "en" | "decoupling" | "winding";

export type ControlId =
  | "iMotorL"
  | "iMotorR"
  | "iLogic"
  | "vPack"
  | "ledColor"
  | "ledR"
  | "enC"
  | "decouplingMm"
  | "duty"
  | "forward"
  | "dividerCap";

export interface Flow {
  id: string;
  /** polyline on the board, mm */
  pts: Pt[];
  /** geometry when the current runs the other way (the motor station); defaults to `pts` */
  reversePts?: Pt[];
  current: (m: BoardModel, i: BoardInputs) => number;
  /** amps that move the dots at the reference speed */
  referenceA: number;
  color?: string;
}

export interface Station {
  id: StationId;
  title: string;
  law: string;
  parts: string[];
  nets: string[];
  flows: Flow[];
  controls: ControlId[];
}

/** One dot every 24 px (2.4 mm of copper) on every stream, so dots per second follow the current as well as speed. */
export const FLOW_DOT_SPACING_PX = 24;

const PACK_TO_NODE: Pt[] = [
  [4.8, 26.75],
  [9.8, 26.75],
  [12.2, 26.75],
  [13.0, 26.75],
];
const NODE_TO_DRIVER: Pt[] = [
  [13.0, 26.75],
  [13.0, 21.0],
  [18.4, 21.0],
  [18.4, 20.0],
];
const NODE_TO_LDO: Pt[] = [
  [13.0, 26.75],
  [16.9, 26.75],
];
const LDO_TO_MODULE: Pt[] = [
  [23.2, 29.05],
  [33.9, 29.05],
  [33.9, 27.6],
  [34.5, 27.6],
];
const M1A_OUT: Pt[] = [
  [19.0, 11.0],
  [19.0, 9.6],
  [17.3, 7.9],
  [17.3, 5.4],
];
const M1B_BACK: Pt[] = [
  [19.3, 5.4],
  [19.3, 8.3],
  [20.6, 9.6],
  [20.6, 11.0],
];
const reversed = (p: Pt[]): Pt[] => [...p].reverse();

const ORANGE = "#fb923c";
const CYAN = "#22d3ee";

export const STATIONS: Station[] = [
  {
    id: "fet",
    title: "Power in: J1 and Q1",
    law: "Ohm's law: V = I · R, and the heat P = I² · R",
    parts: ["J1", "Q1", "R1"],
    nets: ["VBAT", "VM"],
    flows: [{ id: "pack", pts: [...PACK_TO_NODE, ...NODE_TO_DRIVER.slice(1)], current: (m) => m.fet.iPack, referenceA: 1 }],
    controls: ["iMotorL", "iMotorR"],
  },
  {
    id: "kcl",
    title: "The VM node: where the current splits",
    law: "Kirchhoff's current law: what flows in flows out",
    parts: ["C1", "C2", "C3", "U2", "U3"],
    nets: ["VM"],
    flows: [
      { id: "pack", pts: PACK_TO_NODE, current: (m) => m.kcl.iPack, referenceA: 1 },
      { id: "motors", pts: NODE_TO_DRIVER, current: (m) => m.kcl.iMotors, referenceA: 1, color: ORANGE },
      { id: "ldo", pts: NODE_TO_LDO, current: (m) => m.kcl.iLdoIn, referenceA: 1, color: CYAN },
    ],
    controls: ["iMotorL", "iMotorR", "iLogic"],
  },
  {
    id: "ldo",
    title: "U3: the regulator turns volts into heat",
    law: "Power dissipation: P = (Vin − Vout) · I",
    parts: ["U3", "C5", "C2"],
    nets: ["VM", "3V3"],
    flows: [
      { id: "in", pts: NODE_TO_LDO, current: (m) => m.kcl.iLdoIn, referenceA: 0.3 },
      { id: "out", pts: LDO_TO_MODULE, current: (_m, i) => i.iLogic, referenceA: 0.3, color: CYAN },
    ],
    controls: ["iLogic", "vPack"],
  },
  {
    id: "led",
    title: "D1 and R3: the LED loop",
    law: "Kirchhoff's voltage law: the rises equal the drops around any loop",
    parts: ["D1", "R3"],
    nets: ["3V3"],
    flows: [{ id: "rail", pts: LDO_TO_MODULE, current: (_m, i) => i.iLogic, referenceA: 0.3, color: CYAN }],
    controls: ["ledColor", "ledR"],
  },
  {
    id: "divider",
    title: "R4 and R5: the battery divider",
    law: "The voltage divider, and Thevenin's one-source-one-resistor view of it",
    parts: ["R4", "R5", "C9"],
    nets: ["VBAT_SENSE_FEED", "VBAT_SENSE", "VBAT_SENSE_GND"],
    flows: [
      { id: "feed", pts: revBNets[0].routes[0].pts, current: (m) => m.divider.iDiv, referenceA: 50e-6 },
      { id: "node", pts: revBNets[1].routes[2].pts, current: (m) => m.divider.iDiv / 10, referenceA: 50e-6, color: CYAN },
    ],
    controls: ["vPack", "dividerCap"],
  },
  {
    id: "en",
    title: "R2 and C8: the EN delay",
    law: "The RC time constant: τ = R · C",
    parts: ["R2", "C8", "SW2"],
    nets: ["3V3"],
    flows: [{ id: "rail", pts: LDO_TO_MODULE, current: (_m, i) => i.iLogic, referenceA: 0.3, color: CYAN }],
    controls: ["enC"],
  },
  {
    id: "decoupling",
    title: "C4 and C7: decoupling",
    law: "An inductor fights change: V = L · di/dt",
    parts: ["C4", "C7", "C6"],
    nets: ["3V3"],
    flows: [{ id: "rail", pts: LDO_TO_MODULE, current: (_m, i) => i.iLogic, referenceA: 0.3, color: CYAN }],
    controls: ["decouplingMm"],
  },
  {
    id: "winding",
    title: "U2 to J2: the motor winding",
    law: "The right-hand rule: current makes a magnetic field, and the field has a direction",
    parts: ["U2", "J2"],
    nets: ["M1A", "M1B"],
    flows: [
      { id: "out", pts: M1A_OUT, reversePts: reversed(M1B_BACK), current: (m) => m.winding.iAvg, referenceA: 1 },
      { id: "back", pts: M1B_BACK, reversePts: reversed(M1A_OUT), current: (m) => m.winding.iAvg, referenceA: 1 },
    ],
    controls: ["forward", "duty", "iMotorL"],
  },
];

export function stationIndex(id: StationId): number {
  return STATIONS.findIndex((s) => s.id === id);
}

/* ---------- what each part does ---------- */

export interface Reading {
  label: string;
  value: string;
}

export interface PartRole {
  /** one or two plain sentences */
  role: string;
  /** the station that features this part, if any */
  station?: StationId;
  readings: (m: BoardModel, i: BoardInputs) => Reading[];
}

const volts = (v: number) => `${v.toFixed(2)} V`;
const degC = (t: number) => `${t.toFixed(0)} °C`;

const railReadings = (m: BoardModel, i: BoardInputs): Reading[] => [
  { label: "3.3 V rail", value: volts(BOARD.ldoVout) },
  { label: "Logic current", value: formatSI(i.iLogic, "A") },
  { label: "Regulator junction", value: degC(m.ldo.tj) },
];

const decouplingReadings = (m: BoardModel, i: BoardInputs): Reading[] => [
  { label: "Distance to the pin", value: `${i.decouplingMm} mm` },
  { label: "Loop inductance", value: formatSI(m.decoupling.loopH, "H") },
  { label: "Rail dip for a 50 mA step in 2 ns", value: formatSI(m.decoupling.vDip, "V") },
];

const enReadings = (m: BoardModel): Reading[] => [
  { label: "Time constant τ = R · C", value: formatSI(m.en.tau, "s") },
  { label: "EN crosses 0.75 × VDD at", value: formatSI(m.en.tBoot, "s") },
];

const dividerReadings = (m: BoardModel, i: BoardInputs): Reading[] => [
  { label: "Pack voltage", value: volts(i.vPack) },
  { label: "ADC pin voltage", value: `${m.divider.vOut.toFixed(3)} V` },
  { label: "Thevenin resistance", value: formatSI(m.divider.rth, "Ω") },
  { label: "Divider current", value: formatSI(m.divider.iDiv, "A") },
];

const motorReadings = (current: (i: BoardInputs) => number) => (m: BoardModel, i: BoardInputs): Reading[] => [
  { label: "Winding current", value: formatSI(current(i), "A") },
  { label: "Average motor voltage", value: volts(m.winding.vAvg) },
  { label: "Field 5 mm from the trace", value: formatSI(m.winding.bTraceUt * 1e-6, "T") },
];

export const PART_ROLES: Record<string, PartRole> = {
  J1: {
    role: "Battery connector. The 2S pack plugs in here, 6.0 V when flat and 8.4 V when full; each JST XH pin is good for about 3 A.",
    station: "fet",
    readings: (m, i) => [
      { label: "Pack voltage", value: volts(i.vPack) },
      { label: "Pack current", value: formatSI(m.fet.iPack, "A") },
    ],
  },
  Q1: {
    role: "Reverse-polarity protection. A P-channel MOSFET that turns on when the pack is the right way round and stays off, body diode blocking, when it is backwards. When on, it is a 50 mΩ resistor.",
    station: "fet",
    readings: (m) => [
      { label: "Current through it", value: formatSI(m.fet.iPack, "A") },
      { label: "Drop  V = I · R", value: `${(m.fet.vFet * 1e3).toFixed(2)} mV` },
      { label: "Heat  P = I² · R", value: formatSI(m.fet.pFet, "W") },
    ],
  },
  R1: {
    role: "Gate pull-down, 100 kΩ. It holds Q1's gate at ground so the FET turns on. The whole pack voltage sits across it, but 100 kΩ makes that a tiny current.",
    station: "fet",
    readings: (_m, i) => [
      { label: "Current  V / R", value: formatSI(i.vPack / 100e3, "A") },
      { label: "Power  V² / R", value: formatSI((i.vPack * i.vPack) / 100e3, "W") },
    ],
  },
  C1: {
    role: "100 µF bulk capacitor on VM. A local reservoir for the motors' start-up surges and PWM current, so the pack leads and Q1 do not have to deliver every step.",
    station: "kcl",
    readings: (m, i) => [
      { label: "VM", value: volts(i.vPack - m.fet.vFet) },
      { label: "Droop for a 1.5 A, 10 µs step  ΔV = I·Δt / C", value: formatSI(m.kcl.droopV, "V") },
    ],
  },
  C2: {
    role: "10 µF ceramic on VM at the regulator's input. It covers the fast part of load steps that the big electrolytic is too slow for.",
    station: "kcl",
    readings: (m, i) => [
      { label: "VM", value: volts(i.vPack - m.fet.vFet) },
      { label: "Current into the regulator", value: formatSI(m.kcl.iLdoIn, "A") },
    ],
  },
  C3: {
    role: "100 nF ceramic at the TB6612FNG's VM pins. It supplies the nanosecond edges of the H-bridge switching that no bigger, slower capacitor can.",
    station: "kcl",
    readings: decouplingReadings,
  },
  U3: {
    role: "AMS1117-3.3 linear regulator. It drops VM to 3.3 V and turns the whole difference into heat, which is why its tab sits on a copper pour.",
    station: "ldo",
    readings: (m, i) => [
      { label: "Output current", value: formatSI(i.iLogic, "A") },
      { label: "Heat  P = (Vin − Vout) · I", value: formatSI(m.ldo.pLdo, "W") },
      { label: "Junction temperature at 60 °C/W", value: degC(m.ldo.tj) },
    ],
  },
  C5: {
    role: "22 µF tantalum on the regulator's output. The AMS1117's control loop needs a little series resistance here to stay stable, which a tantalum has and a ceramic does not.",
    station: "ldo",
    readings: railReadings,
  },
  U1: {
    role: "ESP32-WROOM-32 module, the brain. 3.3 V logic that is not 5 V tolerant, with Wi-Fi bursts of a few hundred milliamps.",
    readings: (m, i) => [
      { label: "Logic current", value: formatSI(i.iLogic, "A") },
      { label: "Power  P = V · I", value: formatSI(BOARD.ldoVout * i.iLogic, "W") },
      { label: "Regulator junction", value: degC(m.ldo.tj) },
    ],
  },
  C6: {
    role: "10 µF bulk capacitor on the module's 3V3 pin. It feeds the Wi-Fi current bursts that last microseconds, too long for the 100 nF and too short for the regulator.",
    station: "decoupling",
    readings: railReadings,
  },
  C7: {
    role: "100 nF decoupling at the module's 3V3 pin. It must sit within a few millimetres of the pin: every millimetre of trace is about a nanohenry.",
    station: "decoupling",
    readings: decouplingReadings,
  },
  R2: {
    role: "10 kΩ pull-up on EN (CHIP_PU). With C8 it delays the chip's start until the 3.3 V rail has settled.",
    station: "en",
    readings: enReadings,
  },
  C8: {
    role: "1 µF on EN. With R2 it sets the start-up delay: τ = R · C, and EN crosses the threshold at about 1.4 τ.",
    station: "en",
    readings: enReadings,
  },
  SW1: {
    role: "BOOT button on IO0. Hold it while the chip resets and the ESP32 enters its serial bootloader instead of running the sketch.",
    readings: (_m, i) => [
      { label: "IO0 at rest", value: "3.3 V, pulled up inside the module" },
      { label: "IO0 pressed", value: "0 V: boot from UART" },
      { label: "Logic current", value: formatSI(i.iLogic, "A") },
    ],
  },
  SW2: {
    role: "EN button. It shorts C8 to ground, so letting go restarts the RC delay and resets the chip.",
    station: "en",
    readings: enReadings,
  },
  U2: {
    role: "TB6612FNG dual H-bridge. Four MOSFET switches per motor steer the current either way; about 0.5 V is lost across them at 1 A per channel.",
    station: "winding",
    readings: (m, i) => [
      { label: "Left motor", value: formatSI(i.iMotorL, "A") },
      { label: "Right motor", value: formatSI(i.iMotorR, "A") },
      { label: "Heat in the bridges  2 · I² · 0.5 Ω", value: formatSI(i.iMotorL * i.iMotorL * BOARD.driverOhm + i.iMotorR * i.iMotorR * BOARD.driverOhm, "W") },
      { label: "VM", value: volts(i.vPack - m.fet.vFet) },
    ],
  },
  C4: {
    role: "100 nF at the TB6612FNG's logic supply pin, the same job as C7 for the driver's control logic.",
    station: "decoupling",
    readings: decouplingReadings,
  },
  J2: {
    role: "Left motor and encoder connector. Two pins carry the winding current out and back; four carry 3.3 V, ground and the encoder's A and B pulses.",
    station: "winding",
    readings: motorReadings((i) => i.iMotorL),
  },
  J3: {
    role: "Right motor and encoder connector, the mirror of J2.",
    readings: motorReadings((i) => i.iMotorR),
  },
  J4: {
    role: "HC-SR04 header: 3.3 V for an HC-SR04P, ground, TRIG out of IO16 and ECHO into IO17. A classic 5 V HC-SR04 needs its ECHO divided down first.",
    readings: railReadings,
  },
  J5: {
    role: "Left line-sensor header: power, ground and the analog output into IO32, an ADC1 pin that keeps working while Wi-Fi is on.",
    readings: railReadings,
  },
  J6: {
    role: "Right line-sensor header: power, ground and the analog output into IO33, also on ADC1.",
    readings: railReadings,
  },
  J7: {
    role: "UART header for programming and logs: TX, RX, 3.3 V and ground.",
    readings: railReadings,
  },
  D1: {
    role: "Status LED on IO13. It needs R3 to set its current, and its forward voltage depends on its colour: about 2.0 V for red, 3.0 V for blue.",
    station: "led",
    readings: (m) => [
      { label: "Forward voltage", value: volts(m.led.vf) },
      { label: "Current", value: formatSI(m.led.iLed, "A") },
    ],
  },
  R3: {
    role: "The series resistor that sets the LED current: I = (3.3 V − Vf) / R. It takes whatever voltage the LED leaves over.",
    station: "led",
    readings: (m, i) => [
      { label: "Voltage across it", value: volts(m.led.kvl.dropR) },
      { label: "Current  (3.3 − Vf) / R", value: formatSI(m.led.iLed, "A") },
      { label: "Power", value: `${formatSI(m.led.pR, "W")} of 100 mW for an 0603` },
      { label: "Value", value: formatSI(i.ledR, "Ω") },
    ],
  },
  R4: {
    role: "100 kΩ top resistor of the battery divider. With R5 it scales the pack voltage down for the 3.3 V ADC.",
    station: "divider",
    readings: dividerReadings,
  },
  R5: {
    role: "47 kΩ bottom resistor of the battery divider: the ratio 47 / 147 turns 8.4 V into 2.69 V.",
    station: "divider",
    readings: dividerReadings,
  },
  C9: {
    role: "100 nF at the ADC pin. It hands the ADC the charge each sample needs, because the 32 kΩ divider cannot deliver it in time.",
    station: "divider",
    readings: (m, i) => [
      { label: "Fitted", value: i.dividerCap ? "yes" : "no" },
      { label: "Recharge time constant  Rth · C", value: formatSI(m.divider.rechargeMs * 1e-3, "s") },
      { label: "Without it, the sample needs", value: `${m.divider.settleUs.toFixed(2)} µs to settle` },
    ],
  },
};
