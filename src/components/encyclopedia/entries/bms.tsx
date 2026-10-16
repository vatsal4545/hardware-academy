import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Epoxy, Flow, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const BASE = 150;
const PER_V = 75;
const MIN_V = 3.2;
const CELLS = [
  { x: 234, v: 4.1, end: 4.17, label: "C1" },
  { x: 252, v: 4.2, end: 4.18, label: "C2" },
  { x: 270, v: 4.05, end: 4.16, label: "C3" },
  { x: 288, v: 4.15, end: 4.18, label: "C4" },
] as const;

function h(v: number): number {
  return (v - MIN_V) * PER_V;
}

function BmsIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  const limitY = BASE - h(4.2);
  return (
    <PartCanvas title="Four-cell battery management board with a balance connector, protection MOSFETs and large pads, beside cell voltage bars where the highest cell is bled down and the others catch up until all four match">
      <rect x={16} y={34} width={192} height={112} rx={5} fill={part.board} stroke="#2a8a62" strokeWidth={1.5} />
      <rect x={48} y={38} width={84} height={18} rx={2} fill="#f3f4f6" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={56 + i * 16} y={42} width={5} height={10} fill={part.gold} />
      ))}
      <Mark x={90} y={64} size={7.5} color="#ffffff">
        B−  C1  C2  C3  B+
      </Mark>
      <Epoxy x={72} y={80} w={34} h={34} r={3} />
      <circle cx={78} cy={86} r={2} fill="#46506a" />
      <Mark x={89} y={99} size={7.5} color="#ffffff">
        BMS IC
      </Mark>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <Epoxy x={112 + i * 22} y={118} w={18} h={22} r={2} />
          <rect x={115 + i * 22} y={136} width={12} height={3} fill={part.metal} />
        </g>
      ))}
      <Mark x={150} y={110} size={7} color="#bff0d6">
        MOSFETs
      </Mark>
      {[
        { x: 28, y: 76, t: "B+" },
        { x: 28, y: 122, t: "B−" },
        { x: 196, y: 76, t: "P+" },
        { x: 196, y: 122, t: "P−" },
      ].map((p) => (
        <g key={p.t}>
          <circle cx={p.x} cy={p.y} r={8} fill={part.gold} />
          <circle cx={p.x} cy={p.y} r={3} fill={part.bg} />
          <Label x={p.x} y={p.y + (p.y < 100 ? -14 : 15)} size={8.5} bold color="#ffffff">
            {p.t}
          </Label>
        </g>
      ))}
      <Flow points={[[28, 76], [60, 76], [60, 128], [190, 128], [196, 122]]} on={on} n={4} dur={2.6} r={2.4} />
      <Note x={112} y={166} color={part.ink} size={10.5}>
        4S battery management board
      </Note>
      <Note x={112} y={182} size={10}>
        watches V, I and temperature
      </Note>
      <Note x={272} y={34} size={10} color={part.ink}>
        cell voltages
      </Note>
      <line x1={228} y1={limitY} x2={312} y2={limitY} stroke={vizColors.red} strokeWidth={1.2} strokeDasharray="4 3" />
      <Note x={298} y={limitY - 8} anchor="end" size={9} color={vizColors.red}>
        4.20 V limit
      </Note>
      {CELLS.map((c) => (
        <g key={c.label}>
          <rect x={c.x} y={BASE - h(c.v)} width={13} height={h(c.v)} rx={2} fill={vizColors.green}>
            <Anim on={on} name="y" values={`${BASE - h(c.v)};${BASE - h(c.end)};${BASE - h(c.end)};${BASE - h(c.v)}`} keyTimes="0;0.5;0.9;1" dur={4} />
            <Anim on={on} name="height" values={`${h(c.v)};${h(c.end)};${h(c.end)};${h(c.v)}`} keyTimes="0;0.5;0.9;1" dur={4} />
          </rect>
          <Label x={c.x + 6.5} y={BASE + 11} size={9} color={vizColors.muted} bold>
            {c.label}
          </Label>
        </g>
      ))}
      <circle cx={258.5} cy={limitY - 2} r={3.4} fill={vizColors.orange} opacity={0.2}>
        <Anim on={on} name="opacity" values="0.9;0.9;0.1;0.1" keyTimes="0;0.5;0.55;1" dur={4} />
      </circle>
      <Note x={270} y={176} size={9.5}>
        bleed the top cell,
      </Note>
      <Note x={270} y={190} size={9.5}>
        others catch up
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "bms",
  name: "Battery management system",
  category: "ev",
  oneLiner: "Watches every cell's voltage, current and temperature, balances them, and disconnects the pack before anything leaves its safe window.",
  howItWorks: [
    "A BMS measures the voltage of each series cell group (with a 12-16-bit ADC at ±1-2 mV accuracy in chips like the BQ76952 and LTC6811, which handle 12-16 cells), the pack current (shunt or Hall sensor) and several temperatures (NTC thermistors). It enforces limits: for NMC cells about 2.5-4.2 V each, current limits that depend on temperature, and temperature windows of roughly 0-45 °C for charging and −20 to 60 °C for discharging.",
    "Protection hardware is a pair of back-to-back MOSFETs (a contactor in an EV pack) that cut charge and discharge current, with a fuse as the last resort. Thresholds act in layers: over-voltage (about 4.25 V), under-voltage (about 2.8 V), over-current (a short-circuit trip in 100-500 µs) and over-temperature, each with its own delay and recovery rule.",
    "Balancing handles cells that drift apart from capacity and self-discharge differences. Passive balancing bleeds the highest cells through resistors (50-100 mA, turning energy into heat) near the top of charge. Active balancing moves charge between cells with inductors or capacitors at 0.5-5 A.",
    "State estimation turns measurements into useful numbers. State of charge comes from coulomb counting (SOC = SOC0 − ∫I dt / Q) corrected by the cell's open-circuit voltage curve and, in good systems, a Kalman filter on a cell model. State of health tracks capacity fade and rising resistance. Typical SOC accuracy is ±3-5%, and LFP's flat voltage curve makes voltage correction hard.",
    "The BMS talks to the rest of the vehicle over CAN (typically 500 kbit/s), runs a precharge sequence (a resistor limits the inrush into the inverter's capacitors before the main contactors close) and logs faults. EV BMSs are ASIL-C/D safety systems with redundant measurement, while hobby ones (JBD, Daly) are a PCB with an MCU and MOSFETs.",
  ],
  whereUsed: [
    "EV packs of 96-216 series cells at 400-800 V: monitoring every cell group, balancing, and controlling contactors and thermal management.",
    "E-bike and scooter packs (10S-20S, 30-80 A) with a protection board.",
    "Home storage and solar systems (LFP 4S-16S, 51.2 V) and UPS packs.",
    "Laptops, phones and tools: a one- or two-cell protection IC such as a DW01 with an 8205 dual MOSFET.",
    "Robots and drones: a 2S or 3S BMS board to protect the pack and balance it while charging.",
  ],
  keySpecs: [
    { label: "Cell count", value: "1S (protection IC) to 16S (BQ76952) to 192S and more (daisy-chained)" },
    { label: "Voltage accuracy", value: "±1-5 mV per cell for monitor ICs" },
    { label: "Balancing current", value: "20-100 mA passive; 0.5-5 A active" },
    { label: "Current sensing", value: "0.5-5 mΩ shunt, ±0.5-2%" },
    { label: "Protection response", value: "Short-circuit trip in 100-500 µs; over/under-voltage delays 0.5-2 s" },
    { label: "Communication", value: "CAN 500 kbit/s, UART, SMBus, isolated SPI daisy-chain" },
  ],
  failureModes: [
    "A disconnected or poor cell-sense wire: the BMS reads a wrong voltage or none, fails to balance or trips, and a loose sense line can leave a cell overcharging undetected.",
    "State-of-charge drift: coulomb-counting error accumulates (a 10 mA sensor offset adds 240 mAh per day), and the displayed SOC jumps when voltage correction kicks in. Periodic full-charge and rest calibration is needed.",
    "Balancing too weak or never reached: a 50 mA bleed on a 10 Ah pack with a 5% (500 mAh) mismatch needs about 10 hours, and a charger that never reaches the balancing voltage lets the cells drift further apart.",
    "Single point of failure: if the protection MOSFET fails shorted the BMS can no longer disconnect the pack. Automotive designs add contactors, redundant monitoring and a fuse.",
  ],
  interviewTip:
    "Interviewer asks: \"What does a BMS do, and what happens if it fails?\" A good answer: it measures (voltage, current, temperature), protects (opens the contactors on over- or under-voltage, over-current and over-temperature), balances cells, estimates SOC and SOH, and communicates. If it fails the pack can be overcharged, which leads to lithium plating and thermal runaway, so protection must be layered and independent: hardware comparators separate from the MCU, a fuse, a contactor and a pack-level thermal fuse. Automotive designs follow ISO 26262 (ASIL C/D) with diagnostics and a safe state.",
  relatedLesson: "batteries-and-bms",
  Illustration: BmsIllustration,
};
