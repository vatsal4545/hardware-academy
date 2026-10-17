"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Segmented, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";
import { cn } from "@/lib/cn";
import { ControlBar } from "./OhmsLawCircuit.helpers";
import { CapacitorSymbol, GroundSymbol, JunctionDot, SwitchSymbol } from "./SchematicExplorer.symbols";

type NetId = "VBAT" | "3V3" | "GND" | "EN" | "PWMA" | "AIN1" | "AIN2" | "BIN1" | "BIN2" | "PWMB" | "AO1" | "AO2" | "BO1" | "BO2";
type PartId = "J1" | "C1" | "U2" | "C2" | "U1" | "C3" | "C4" | "SW1" | "C6" | "U3" | "C5" | "C7" | "C8" | "J2" | "J3";
type ErcId = 1 | 2 | 3;
type View = "all" | "power" | "mcu" | "driver";
type Selection = { kind: "part"; id: PartId } | { kind: "net"; id: NetId };

interface Net {
  color: string;
  cls: string;
  level: string;
  summary: string;
  pins: string[];
  parts: PartId[];
}

interface Part {
  title: string;
  value: string;
  pkg: string;
  role: string;
}

/** The board is wide, so each section can be shown zoomed to fit a narrow column. */
const VIEWBOX: Record<View, string> = {
  all: "0 0 980 480",
  power: "20 24 380 230",
  mcu: "215 24 470 440",
  driver: "590 24 390 450",
};

const WIRE = "#8b95a5";
const DIM = "#394252";

const NET: Record<NetId, Net> = {
  VBAT: {
    color: vizColors.red,
    cls: "Power",
    level: "6.0 to 8.4 V",
    summary:
      "The battery rail from a 2S Li-ion pack. It feeds the 3.3 V regulator and, directly, the motor driver's VM pin. The motors pull their current through it, so it gets the widest copper.",
    pins: ["J1.1", "C1.+", "U2.VIN", "U3.VM", "C5.+", "C8.1"],
    parts: ["J1", "C1", "U2", "U3", "C5", "C8"],
  },
  "3V3": {
    color: vizColors.orange,
    cls: "Power",
    level: "3.3 V",
    summary:
      "The logic rail made by U2. It powers the ESP32 and the logic side of the motor driver, with a decoupling capacitor at every load.",
    pins: ["U2.VOUT", "C2.+", "U1.3V3", "C3.1", "C4.1", "U3.VCC", "C7.1"],
    parts: ["U2", "C2", "U1", "C3", "C4", "U3", "C7"],
  },
  GND: {
    color: vizColors.blue,
    cls: "Power return",
    level: "0 V",
    summary:
      "The 0 V reference. On the finished board it becomes a copper plane; in the schematic it is drawn as repeated GND symbols, which are all one net.",
    pins: ["J1.2", "C1.2", "U2.GND", "C2.2", "U1.GND", "C3.2", "C4.2", "SW1.2", "C6.2", "U3.GND", "U3.PGND1", "C5.2", "C7.2", "C8.2"],
    parts: ["J1", "C1", "U2", "C2", "U1", "C3", "C4", "SW1", "C6", "U3", "C5", "C7", "C8"],
  },
  EN: {
    color: vizColors.green,
    cls: "Signal",
    level: "0 to 3.3 V",
    summary:
      "The ESP32's enable and reset input. The reset button SW1 and the 1 µF capacitor C6 both connect to it. Look at what else is, or is not, on this net.",
    pins: ["U1.EN", "SW1.1", "C6.1"],
    parts: ["U1", "SW1", "C6"],
  },
  PWMA: {
    color: vizColors.cyan,
    cls: "Signal",
    level: "3.3 V logic",
    summary: "Speed command for motor A: a PWM from GPIO25 into the driver's PWMA input.",
    pins: ["U1.IO25", "U3.PWMA"],
    parts: ["U1", "U3"],
  },
  AIN1: {
    color: vizColors.cyan,
    cls: "Signal",
    level: "3.3 V logic",
    summary: "Direction input 1 for motor A, from GPIO26. With AIN2 it selects forward, reverse, brake or coast.",
    pins: ["U1.IO26", "U3.AIN1"],
    parts: ["U1", "U3"],
  },
  AIN2: {
    color: vizColors.cyan,
    cls: "Signal",
    level: "3.3 V logic",
    summary: "Direction input 2 for motor A, from GPIO27.",
    pins: ["U1.IO27", "U3.AIN2"],
    parts: ["U1", "U3"],
  },
  BIN1: {
    color: vizColors.cyan,
    cls: "Signal",
    level: "3.3 V logic",
    summary: "Direction input 1 for motor B, from GPIO32.",
    pins: ["U1.IO32", "U3.BIN1"],
    parts: ["U1", "U3"],
  },
  BIN2: {
    color: vizColors.cyan,
    cls: "Signal",
    level: "3.3 V logic",
    summary: "Direction input 2 for motor B, from GPIO33.",
    pins: ["U1.IO33", "U3.BIN2"],
    parts: ["U1", "U3"],
  },
  PWMB: {
    color: vizColors.cyan,
    cls: "Signal",
    level: "3.3 V logic",
    summary: "Speed command for motor B: a PWM from GPIO13 into the driver's PWMB input.",
    pins: ["U1.IO13", "U3.PWMB"],
    parts: ["U1", "U3"],
  },
  AO1: {
    color: vizColors.amber,
    cls: "Motor",
    level: "0 to VBAT, up to 1.2 A",
    summary: "Motor A output 1. The H-bridge swings it between VM and ground at the PWM rate, so it carries the full motor current.",
    pins: ["U3.AO1", "J2.1"],
    parts: ["U3", "J2"],
  },
  AO2: {
    color: vizColors.amber,
    cls: "Motor",
    level: "0 to VBAT, up to 1.2 A",
    summary: "Motor A output 2. Swapping AO1 and AO2 reverses the wheel.",
    pins: ["U3.AO2", "J2.2"],
    parts: ["U3", "J2"],
  },
  BO1: {
    color: vizColors.amber,
    cls: "Motor",
    level: "0 to VBAT, up to 1.2 A",
    summary: "Motor B output 1, wired to the second motor connector.",
    pins: ["U3.BO1", "J3.1"],
    parts: ["U3", "J3"],
  },
  BO2: {
    color: vizColors.amber,
    cls: "Motor",
    level: "0 to VBAT, up to 1.2 A",
    summary: "Motor B output 2.",
    pins: ["U3.BO2", "J3.2"],
    parts: ["U3", "J3"],
  },
};
const NET_IDS = Object.keys(NET) as NetId[];

const PART: Record<PartId, Part> = {
  J1: {
    title: "Battery connector",
    value: "2-pin JST-XH",
    pkg: "2.5 mm pitch, keyed",
    role: "Brings VBAT (6.0 to 8.4 V from a 2S Li-ion pack) onto the board. The keyed housing stops it going in backwards; a real board adds a reverse-polarity P-FET or a fuse right after it.",
  },
  C1: {
    title: "LDO input capacitor",
    value: "10 µF, 16 V, X7R",
    pkg: "1206",
    role: "Sits at the regulator's VIN pin. It supplies the LDO's input current steps and keeps the regulator stable. Drawn next to U2 so the layout puts it there too.",
  },
  U2: {
    title: "3.3 V linear regulator",
    value: "AMS1117-3.3",
    pkg: "SOT-223",
    role: "Turns VBAT into 3.3 V at up to 800 mA. From 8.4 V at 0.2 A it dissipates (8.4 − 3.3) × 0.2 ≈ 1 W, so it needs a copper pour; from a 12 V pack it would overheat, as the Active components lesson shows.",
  },
  C2: {
    title: "LDO output capacitor",
    value: "22 µF, tantalum or polymer",
    pkg: "case B or 1210",
    role: "The AMS1117 datasheet asks for at least 22 µF with some ESR on the output. A very low-ESR ceramic can make this regulator oscillate, which is why the value and the type are both on the schematic.",
  },
  U1: {
    title: "Microcontroller module",
    value: "ESP32-WROOM-32E",
    pkg: "18 × 25.5 mm module",
    role: "Dual-core MCU with Wi-Fi and Bluetooth on a 3.3 V supply. EN resets it, and six GPIOs drive the motor driver. UART, boot and sensor pins are left out of this drawing for clarity.",
  },
  C3: {
    title: "Module bulk decoupling",
    value: "10 µF, 10 V, X7R",
    pkg: "0805",
    role: "Covers the slower current steps of Wi-Fi transmit bursts, which reach 300 mA or more. It belongs within a centimetre of the module's 3V3 pin.",
  },
  C4: {
    title: "Module fast decoupling",
    value: "100 nF, 16 V, X7R",
    pkg: "0402",
    role: "Supplies the fast edges. Drawn beside C3 so the layout places both at the 3V3 pin, with the ground via right at the pad.",
  },
  SW1: {
    title: "Reset button",
    value: "tactile switch",
    pkg: "3.5 × 6 mm SMD",
    role: "Pulls EN to ground to reset the module. Releasing it relies on a pull-up to bring EN back high.",
  },
  C6: {
    title: "EN delay capacitor",
    value: "1 µF, 16 V, X7R",
    pkg: "0603",
    role: "Forms an RC power-up delay with a 10 kΩ pull-up so EN rises only after 3V3 is stable. On this net, with no pull-up to charge it, it does nothing useful.",
  },
  U3: {
    title: "Dual H-bridge motor driver",
    value: "TB6612FNG",
    pkg: "SSOP-24",
    role: "Drives two brushed motors at 1.2 A continuous (3.2 A peak) each, from 4.5 to 13.5 V on VM, with 2.7 to 5.5 V logic. PWMx sets speed, xIN1 and xIN2 set direction, and STBY must be high to enable the outputs. VM, PGND and the outputs are drawn once; the real chip has several pins of each.",
  },
  C7: {
    title: "Driver logic decoupling",
    value: "100 nF, 16 V, X7R",
    pkg: "0402",
    role: "Decouples the driver's logic supply pin from the 3.3 V rail.",
  },
  C5: {
    title: "Motor supply bulk capacitor",
    value: "100 µF, 16 V, electrolytic",
    pkg: "6.3 × 5.4 mm SMD can",
    role: "Supplies motor start-up current and absorbs back-EMF energy so VBAT does not droop or spike every time a motor starts or stops.",
  },
  C8: {
    title: "Motor supply fast capacitor",
    value: "100 nF, 25 V, X7R",
    pkg: "0603",
    role: "Handles the fast PWM edges that the bulk capacitor is too slow and inductive to follow. It belongs right at the driver's VM pin.",
  },
  J2: {
    title: "Motor A connector",
    value: "2-pin JST-PH",
    pkg: "2.0 mm pitch",
    role: "Carries motor A's H-bridge output pair. Swapping the two wires reverses the wheel, so the polarity mark matters for firmware, not for safety.",
  },
  J3: {
    title: "Motor B connector",
    value: "2-pin JST-PH",
    pkg: "2.0 mm pitch",
    role: "Carries motor B's H-bridge output pair, mirrored from J2 so both motors turn the same way when the robot drives forward.",
  },
};

const WIRES: ReadonlyArray<{ net: NetId; d: string }> = [
  { net: "VBAT", d: "M 74 130 H 110 V 50 H 870" },
  { net: "VBAT", d: "M 160 50 V 76" },
  { net: "VBAT", d: "M 185 50 V 105 H 200" },
  { net: "VBAT", d: "M 740 50 V 150" },
  { net: "VBAT", d: "M 790 50 V 76" },
  { net: "VBAT", d: "M 870 50 V 76" },
  { net: "3V3", d: "M 290 105 H 680 V 150" },
  { net: "3V3", d: "M 320 105 V 138" },
  { net: "3V3", d: "M 405 105 V 150" },
  { net: "3V3", d: "M 490 105 V 138" },
  { net: "3V3", d: "M 548 105 V 138" },
  { net: "3V3", d: "M 620 105 V 138" },
  { net: "GND", d: "M 74 160 H 96 V 180" },
  { net: "GND", d: "M 160 84 V 104" },
  { net: "GND", d: "M 245 150 V 172" },
  { net: "GND", d: "M 320 146 V 166" },
  { net: "GND", d: "M 490 146 V 166" },
  { net: "GND", d: "M 548 146 V 166" },
  { net: "GND", d: "M 620 146 V 166" },
  { net: "GND", d: "M 405 400 V 432" },
  { net: "GND", d: "M 300 330 V 350" },
  { net: "GND", d: "M 235 308 V 330" },
  { net: "GND", d: "M 672 410 V 436 H 710 V 410" },
  { net: "GND", d: "M 790 84 V 104" },
  { net: "GND", d: "M 870 84 V 104" },
  { net: "EN", d: "M 330 260 H 235 V 300" },
  { net: "EN", d: "M 300 260 V 290" },
  { net: "PWMA", d: "M 480 190 H 650" },
  { net: "AIN1", d: "M 480 220 H 650" },
  { net: "AIN2", d: "M 480 250 H 650" },
  { net: "BIN1", d: "M 480 310 H 650" },
  { net: "BIN2", d: "M 480 340 H 650" },
  { net: "PWMB", d: "M 480 370 H 650" },
  { net: "AO1", d: "M 770 200 H 860" },
  { net: "AO2", d: "M 770 230 H 860" },
  { net: "BO1", d: "M 770 320 H 860" },
  { net: "BO2", d: "M 770 350 H 860" },
];

const GROUND_SYMBOLS: ReadonlyArray<readonly [number, number]> = [
  [96, 180],
  [160, 104],
  [245, 172],
  [320, 166],
  [490, 166],
  [548, 166],
  [620, 166],
  [405, 432],
  [300, 350],
  [235, 330],
  [691, 436],
  [790, 104],
  [870, 104],
];

const JUNCTIONS: ReadonlyArray<{ net: NetId; x: number; y: number }> = [
  { net: "VBAT", x: 160, y: 50 },
  { net: "VBAT", x: 185, y: 50 },
  { net: "VBAT", x: 740, y: 50 },
  { net: "VBAT", x: 790, y: 50 },
  { net: "3V3", x: 320, y: 105 },
  { net: "3V3", x: 405, y: 105 },
  { net: "3V3", x: 490, y: 105 },
  { net: "3V3", x: 548, y: 105 },
  { net: "3V3", x: 620, y: 105 },
  { net: "EN", x: 300, y: 260 },
];

interface ErcItem {
  id: ErcId;
  severity: "Error" | "Warning";
  rule: string;
  where: string;
  caughtBy: "ERC finds it automatically" | "Only a review finds it";
  what: string;
  why: string;
  fix: string;
  x: number;
  y: number;
}

const ERC: ErcItem[] = [
  {
    id: 1,
    severity: "Error",
    rule: "Pin not connected",
    where: "U3, STBY",
    caughtBy: "ERC finds it automatically",
    what: "The driver's standby pin has no wire, no label and no no-connect flag.",
    why: "STBY must be high for the outputs to work. Left floating, a CMOS input sits near its switching threshold and follows noise, so the driver can switch off at random.",
    fix: "Wire STBY to a spare GPIO such as IO14 with a 100 kΩ pull-down, so the driver stays off until the firmware enables it.",
    x: 634,
    y: 280,
  },
  {
    id: 2,
    severity: "Warning",
    rule: "Missing pull-up (design error)",
    where: "U1, EN",
    caughtBy: "Only a review finds it",
    what: "EN has a reset button and a capacitor but nothing pulling it up to 3V3.",
    why: "The net is not unconnected, so ERC stays quiet. Without a pull-up EN floats, so the module may reset at random or never start. The ESP32 hardware guidelines call for a 10 kΩ pull-up with the 1 µF capacitor.",
    fix: "Add R1, 10 kΩ, from EN to 3V3.",
    x: 318,
    y: 246,
  },
  {
    id: 3,
    severity: "Error",
    rule: "Pin not connected",
    where: "U3, PGND2",
    caughtBy: "ERC finds it automatically",
    what: "One of the driver's two power-ground pins is not wired to anything.",
    why: "Motor B's low-side switches return their current through PGND2. With the pin open, channel B runs weakly or not at all while channel A looks fine.",
    fix: "Connect PGND2 to GND together with the other ground pins, using a short, wide connection.",
    x: 748,
    y: 432,
  },
];

/** An accessible, clickable group. */
function Clickable({
  label,
  onSelect,
  children,
}: {
  label: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <g role="button" tabIndex={0} aria-label={label} onClick={onSelect} onKeyDown={onKey} style={{ cursor: "pointer" }}>
      {children}
    </g>
  );
}

function ErcLayer({ focus, reduced }: { focus: ErcId | null; reduced: boolean }) {
  return (
    <g>
      {/* ghost pull-up that is missing */}
      <g stroke={vizColors.red} strokeWidth={2} strokeDasharray="5 4" fill="none" opacity={0.9}>
        <path d="M 300 105 V 167" />
        <path d="M 300 203 V 260" />
        <rect x={293} y={167} width={14} height={36} rx={2} />
        <path d="M 650 280 H 644" />
        <path d="M 748 410 V 423" />
      </g>
      <Label x={300} y={217} size={10} bold color={vizColors.red}>R1 10 kΩ</Label>
      <Label x={300} y={230} size={10} color={vizColors.red}>missing</Label>
      <Label x={566} y={270} size={10} color={vizColors.red}>STBY: no wire</Label>
      <Label x={748} y={452} size={10} color={vizColors.red}>PGND2 open</Label>
      {ERC.map((e) => (
        <g key={e.id}>
          <circle cx={e.x} cy={e.y} r={focus === e.id ? 12 : 10} fill={vizColors.red} stroke={vizColors.bg} strokeWidth={2}>
            {!reduced && <animate attributeName="r" values="10;13;10" dur="1.8s" repeatCount="indefinite" />}
          </circle>
          <Label x={e.x} y={e.y + 0.5} size={11} bold color="#ffffff">{String(e.id)}</Label>
        </g>
      ))}
    </g>
  );
}

export function SchematicExplorer() {
  const reduced = usePrefersReducedMotion();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hoverNet, setHoverNet] = useState<NetId | null>(null);
  const [erc, setErc] = useState(false);
  const [ercFocus, setErcFocus] = useState<ErcId | null>(null);
  const [view, setView] = useState<View>("all");

  const activeNet: NetId | null = hoverNet ?? (selection?.kind === "net" ? selection.id : null);
  const selectedPart = selection?.kind === "part" ? selection.id : null;

  const wireColor = (net: NetId) => (activeNet === null ? WIRE : activeNet === net ? NET[net].color : DIM);
  const wireWidth = (net: NetId) => (activeNet === net ? 4 : 2.5);
  const partColor = (id: PartId) => {
    if (activeNet === null) return vizColors.text;
    return NET[activeNet].parts.includes(id) ? NET[activeNet].color : DIM;
  };
  const labelColor = (net: NetId) => (activeNet === null || activeNet === net ? NET[net].color : DIM);
  const groundColor = wireColor("GND");
  const selectNet = (id: NetId) => setSelection((s) => (s?.kind === "net" && s.id === id ? null : { kind: "net", id }));
  const selectPart = (id: PartId) => setSelection((s) => (s?.kind === "part" && s.id === id ? null : { kind: "part", id }));

  const cap = (id: PartId, cx: number, cy: number, labelAt: "left" | "right", polarized = false) => {
    const lx = labelAt === "left" ? cx - 18 : cx + (polarized ? 22 : 18);
    const anchor = labelAt === "left" ? "end" : "start";
    return (
      <Clickable key={id} label={`${id}, ${PART[id].value}`} onSelect={() => selectPart(id)}>
        <rect x={cx - 18} y={cy - 12} width={36} height={24} fill="transparent" />
        <CapacitorSymbol cx={cx} cy={cy} vertical size={26} gap={8} polarized={polarized} stroke={partColor(id)} />
        {selectedPart === id && (
          <rect x={cx - 18} y={cy - 12} width={36} height={24} rx={4} fill="none" stroke={vizColors.amber} strokeWidth={1.5} strokeDasharray="4 3" />
        )}
        <Label x={lx} y={cy - 18} anchor={anchor} size={11} bold color={partColor(id)}>{id}</Label>
        <Label x={lx} y={cy - 4} anchor={anchor} size={10} mono color={vizColors.muted}>{PART[id].value.split(",")[0]}</Label>
      </Clickable>
    );
  };

  const box = (id: PartId, x: number, y: number, w: number, h: number, children: ReactNode) => (
    <Clickable key={id} label={`${id}, ${PART[id].value}`} onSelect={() => selectPart(id)}>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={vizColors.bg} stroke={selectedPart === id ? vizColors.amber : partColor(id)} strokeWidth={selectedPart === id ? 3 : 2} />
      {children}
    </Clickable>
  );

  const info = selection?.kind === "part" ? PART[selection.id] : null;
  const netInfo = selection?.kind === "net" ? NET[selection.id] : null;

  return (
    <VizFrame
      title="Robot motor-driver schematic"
      description="Hover or click a wire to light up its whole net, or click a part to read its role. Then switch on ERC mode and see which planted errors an electrical rules check finds and which it cannot."
      footer="Simplified for teaching: UART, boot and sensor pins are omitted, and the driver's repeated VM, PGND and output pins are drawn once. Pin numbers are left off so you read the pin names, as you would in a datasheet."
    >
      <ControlBar>
        <Segmented<View>
          label="View"
          options={[
            { value: "all", label: "Whole board" },
            { value: "power", label: "Power" },
            { value: "mcu", label: "ESP32" },
            { value: "driver", label: "Motor driver" },
          ]}
          value={view}
          onChange={setView}
        />
        <Toggle label="ERC mode: reveal the planted errors" checked={erc} onChange={setErc} />
      </ControlBar>
      <div className="@container">
        <div className={view === "all" ? "overflow-x-auto" : undefined}>
          <SvgCanvas
            viewBox={VIEWBOX[view]}
            role="group"
            className={view === "all" ? "min-w-[900px]" : "mx-auto max-w-[600px]"}
            title="Schematic of a robot motor-driver board: battery connector, AMS1117 regulator, ESP32 module, TB6612FNG motor driver and two motor connectors, with decoupling capacitors"
          >
            <rect x={0} y={0} width={980} height={480} fill={vizColors.bg} rx={8} />

            {/* wires */}
            {WIRES.map((w, i) => (
              <path key={i} d={w.d} fill="none" stroke={wireColor(w.net)} strokeWidth={wireWidth(w.net)} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {JUNCTIONS.map((j, i) => (
              <JunctionDot key={i} x={j.x} y={j.y} color={wireColor(j.net)} />
            ))}
            {GROUND_SYMBOLS.map(([x, y]) => (
              <GroundSymbol key={`${x}-${y}`} x={x} y={y} size={16} stroke={groundColor} strokeWidth={activeNet === "GND" ? 3 : 2} />
            ))}

            {/* net names on the wires */}
            <Label x={470} y={39} size={11} bold mono color={labelColor("VBAT")}>VBAT</Label>
            <Label x={440} y={95} size={11} bold mono color={labelColor("3V3")}>+3V3</Label>
            {(
              [
                ["PWMA", 190],
                ["AIN1", 220],
                ["AIN2", 250],
                ["BIN1", 310],
                ["BIN2", 340],
                ["PWMB", 370],
              ] as const
            ).map(([n, y]) => (
              <Label key={n} x={565} y={y - 8} size={10} mono color={labelColor(n)}>{n}</Label>
            ))}
            {(
              [
                ["AO1", 200],
                ["AO2", 230],
                ["BO1", 320],
                ["BO2", 350],
              ] as const
            ).map(([n, y]) => (
              <Label key={n} x={815} y={y - 8} size={10} mono color={labelColor(n)}>{n}</Label>
            ))}
            <Label x={282} y={252} size={10} mono color={labelColor("EN")}>EN</Label>

            {/* J1 */}
            {box(
              "J1",
              34,
              114,
              40,
              62,
              <>
                <Label x={62} y={130} size={11} bold>+</Label>
                <Label x={62} y={160} size={11} bold>−</Label>
                <Label x={54} y={103} size={11} bold color={partColor("J1")}>J1</Label>
                <Label x={54} y={192} size={10} color={vizColors.muted}>battery in</Label>
              </>,
            )}

            {cap("C1", 160, 80, "left")}

            {/* U2 */}
            {box(
              "U2",
              200,
              90,
              90,
              60,
              <>
                <Label x={245} y={113} size={11} bold color={partColor("U2")}>U2</Label>
                <Label x={245} y={128} size={9} mono color={vizColors.muted}>AMS1117-3.3</Label>
                <Label x={206} y={105} anchor="start" size={9} mono>VIN</Label>
                <Label x={284} y={105} anchor="end" size={9} mono>VOUT</Label>
                <Label x={245} y={143} size={9} mono>GND</Label>
              </>,
            )}

            {cap("C2", 320, 142, "right", true)}

            {/* U1 */}
            {box(
              "U1",
              330,
              150,
              150,
              250,
              <>
                <Label x={405} y={165} size={9} mono>3V3</Label>
                <Label x={405} y={392} size={9} mono>GND</Label>
                <Label x={336} y={260} anchor="start" size={9} mono>EN</Label>
                {(
                  [
                    ["IO25", 190],
                    ["IO26", 220],
                    ["IO27", 250],
                    ["IO32", 310],
                    ["IO33", 340],
                    ["IO13", 370],
                  ] as const
                ).map(([n, y]) => (
                  <Label key={n} x={474} y={y} anchor="end" size={9} mono>{n}</Label>
                ))}
                <Label x={405} y={272} size={12} bold color={partColor("U1")}>U1</Label>
                <Label x={405} y={288} size={10} mono color={vizColors.muted}>ESP32-WROOM-32E</Label>
              </>,
            )}

            {cap("C3", 490, 142, "left")}
            {cap("C4", 548, 142, "right")}
            {cap("C7", 620, 142, "right")}

            {/* EN network */}
            <Clickable label={`SW1, ${PART.SW1.value}`} onSelect={() => selectPart("SW1")}>
              <rect x={286} y={288} width={42} height={44} fill="transparent" />
              <SwitchSymbol x1={300} y1={290} x2={300} y2={330} closed={false} stroke={partColor("SW1")} />
              {selectedPart === "SW1" && (
                <rect x={286} y={288} width={42} height={44} rx={4} fill="none" stroke={vizColors.amber} strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              <Label x={290} y={300} anchor="end" size={11} bold color={partColor("SW1")}>SW1</Label>
              <Label x={290} y={314} anchor="end" size={10} mono color={vizColors.muted}>reset</Label>
            </Clickable>
            {cap("C6", 235, 304, "left")}

            {/* U3 */}
            {box(
              "U3",
              650,
              150,
              120,
              260,
              <>
                <Label x={680} y={164} size={9} mono>VCC</Label>
                <Label x={740} y={164} size={9} mono>VM</Label>
                {(
                  [
                    ["PWMA", 190],
                    ["AIN1", 220],
                    ["AIN2", 250],
                    ["STBY", 280],
                    ["BIN1", 310],
                    ["BIN2", 340],
                    ["PWMB", 370],
                  ] as const
                ).map(([n, y]) => (
                  <Label key={n} x={656} y={y} anchor="start" size={9} mono>{n}</Label>
                ))}
                {(
                  [
                    ["AO1", 200],
                    ["AO2", 230],
                    ["BO1", 320],
                    ["BO2", 350],
                  ] as const
                ).map(([n, y]) => (
                  <Label key={n} x={764} y={y} anchor="end" size={9} mono>{n}</Label>
                ))}
                <Label x={672} y={402} size={8} mono>GND</Label>
                <Label x={710} y={402} size={8} mono>PGND1</Label>
                <Label x={748} y={402} size={8} mono>PGND2</Label>
                <Label x={710} y={262} size={12} bold color={partColor("U3")}>U3</Label>
                <Label x={710} y={278} size={10} mono color={vizColors.muted}>TB6612FNG</Label>
                <Label x={710} y={292} size={9} color={vizColors.muted}>dual H-bridge</Label>
              </>,
            )}

            {cap("C5", 790, 80, "right", true)}
            {cap("C8", 870, 80, "right")}

            {/* motor connectors */}
            {box(
              "J2",
              860,
              180,
              40,
              70,
              <>
                <Label x={868} y={200} anchor="start" size={10} mono>1</Label>
                <Label x={868} y={230} anchor="start" size={10} mono>2</Label>
                <Label x={880} y={168} size={11} bold color={partColor("J2")}>J2</Label>
                <Label x={880} y={264} size={10} color={vizColors.muted}>motor A</Label>
              </>,
            )}
            {box(
              "J3",
              860,
              300,
              40,
              70,
              <>
                <Label x={868} y={320} anchor="start" size={10} mono>1</Label>
                <Label x={868} y={350} anchor="start" size={10} mono>2</Label>
                <Label x={880} y={288} size={11} bold color={partColor("J3")}>J3</Label>
                <Label x={880} y={384} size={10} color={vizColors.muted}>motor B</Label>
              </>,
            )}

            {/* invisible wide hit targets so thin wires are easy to hover and click */}
            {WIRES.map((w, i) => (
              <path
                key={`hit${i}`}
                d={w.d}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                pointerEvents="stroke"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoverNet(w.net)}
                onMouseLeave={() => setHoverNet(null)}
                onClick={() => selectNet(w.net)}
              />
            ))}

            {erc && <ErcLayer focus={ercFocus} reduced={reduced} />}
          </SvgCanvas>
        </div>
        {view === "all" && (
          <p className="mt-1 text-xs text-muted @4xl:hidden">The whole board is wide: scroll sideways, or pick a view above to zoom in on one section.</p>
        )}
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <p className="mb-1.5 text-xs text-muted">Nets (hover or click, or use the buttons)</p>
          <div className="flex flex-wrap gap-1.5">
            {NET_IDS.map((n) => {
              const on = activeNet === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selection?.kind === "net" && selection.id === n}
                  onClick={() => selectNet(n)}
                  onMouseEnter={() => setHoverNet(n)}
                  onMouseLeave={() => setHoverNet(null)}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-xs transition-colors",
                    on ? "bg-surface-2 text-text" : "border-border text-muted hover:text-text",
                  )}
                  style={on ? { borderColor: NET[n].color, color: NET[n].color } : undefined}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-bg p-3 text-sm" aria-live="polite">
          {info && selection?.kind === "part" ? (
            <>
              <p className="font-semibold">
                <span className="font-mono text-amber-300">{selection.id}</span> · {info.title}
              </p>
              <p className="mt-0.5 font-mono text-xs text-muted">
                {info.value} · {info.pkg}
              </p>
              <p className="mt-2 text-text/90">{info.role}</p>
            </>
          ) : netInfo && selection?.kind === "net" ? (
            <>
              <p className="font-semibold">
                Net <span className="font-mono" style={{ color: netInfo.color }}>{selection.id}</span> · class {netInfo.cls} · {netInfo.level}
              </p>
              <p className="mt-2 text-text/90">{netInfo.summary}</p>
              <p className="mt-2 font-mono text-xs text-muted">Pins: {netInfo.pins.join(", ")}</p>
            </>
          ) : (
            <p className="text-muted">Click a part to read its role, or a wire to see every pin on its net.</p>
          )}
        </div>

        {erc && (
          <ul className="space-y-2" aria-label="ERC report">
            {ERC.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setErcFocus((f) => (f === e.id ? null : e.id))}
                  aria-expanded={ercFocus === e.id}
                  className={cn(
                    "w-full rounded-lg border bg-bg p-3 text-left text-sm transition-colors",
                    ercFocus === e.id ? "border-red-400/70" : "border-border hover:border-red-400/40",
                  )}
                >
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="rounded bg-red-400/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-red-300">
                      {e.id} · {e.severity}
                    </span>
                    <span className="font-semibold">{e.rule}</span>
                    <span className="font-mono text-xs text-muted">{e.where}</span>
                    <span className={cn("text-xs", e.caughtBy === "Only a review finds it" ? "text-orange-300" : "text-green-300")}>
                      {e.caughtBy}
                    </span>
                  </span>
                  <span className="mt-1.5 block text-text/90">{e.what}</span>
                  {ercFocus === e.id && (
                    <>
                      <span className="mt-1.5 block text-muted">{e.why}</span>
                      <span className="mt-1.5 block text-green-300">Fix: {e.fix}</span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </VizFrame>
  );
}
