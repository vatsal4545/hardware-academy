"use client";

import { useState } from "react";
import { Segmented, VizFrame } from "@/components/lesson";
import { Button } from "@/components/ui/Button";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";

type WireKind = "power" | "ground" | "signal" | "motor";
type View = "all" | "power" | "signal";
type Pt = [number, number];

interface Wire {
  id: string;
  name: string;
  kind: WireKind;
  color: string;
  paths: Pt[][];
  /** net tags drawn at the end of stubs, e.g. "3V3" or "GND" */
  tags?: Array<{ x: number; y: number; text: string }>;
  /** small inline part drawn on the wire, e.g. a voltage divider */
  part?: { x: number; y: number; w: number; text: string };
  junctions?: Pt[];
  pin: string;
  from: string;
  to: string;
  signal: string;
  note: string;
  /** power-on stage at which this wire becomes live */
  stage: number;
}

interface Block {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
  stage: number;
}

const C7V4 = vizColors.orange;
const C5V = vizColors.red;
const C3V3 = vizColors.amber;
const CGND = vizColors.muted;
const CDRV = vizColors.violet;
const CENC = vizColors.green;
const CSEN = vizColors.cyan;
const CMOT = vizColors.blue;

const BLOCKS: Block[] = [
  { id: "pack", x: 20, y: 385, w: 150, h: 70, title: "2S Li-ion pack", sub: "7.4 V nom · 8.4 V full", stage: 0 },
  { id: "switch", x: 20, y: 290, w: 150, h: 50, title: "Switch + 3 A fuse", stage: 0 },
  { id: "buck", x: 20, y: 170, w: 150, h: 60, title: "5 V buck (3 A)", sub: "set to 5.0 V first", stage: 1 },
  { id: "esp32", x: 250, y: 120, w: 170, h: 250, title: "ESP32 DevKitC", sub: "3.3 V logic", stage: 2 },
  { id: "driver", x: 510, y: 150, w: 140, h: 190, title: "TB6612FNG", sub: "dual H-bridge", stage: 0 },
  { id: "motorL", x: 668, y: 55, w: 90, h: 90, title: "Left motor", sub: "N20 + encoder", stage: 4 },
  { id: "motorR", x: 668, y: 355, w: 90, h: 90, title: "Right motor", sub: "N20 + encoder", stage: 4 },
  { id: "sonar", x: 250, y: 20, w: 120, h: 50, title: "HC-SR04", sub: "5 V sonar", stage: 1 },
  { id: "servo", x: 385, y: 20, w: 95, h: 50, title: "SG90 servo", sub: "pans the sonar", stage: 1 },
  { id: "lineL", x: 250, y: 410, w: 75, h: 48, title: "TCRT5000", sub: "left", stage: 2 },
  { id: "lineR", x: 340, y: 410, w: 75, h: 48, title: "TCRT5000", sub: "right", stage: 2 },
];

const driverLine = (id: string, name: string, gpio: number, y: number, pinName: string, signal: string, note: string): Wire => ({
  id,
  name,
  kind: "signal",
  color: CDRV,
  paths: [
    [
      [420, y],
      [510, y],
    ],
  ],
  pin: `GPIO ${gpio}`,
  from: "ESP32",
  to: `TB6612 ${pinName}`,
  signal,
  note,
  stage: 4,
});

const WIRES: Wire[] = [
  {
    id: "pack",
    name: "Pack to switch",
    kind: "power",
    color: C7V4,
    paths: [
      [
        [95, 385],
        [95, 340],
      ],
    ],
    pin: "none (power)",
    from: "Pack +",
    to: "Rocker switch and 3 A fuse",
    signal: "6.0 to 8.4 V DC",
    note: "Put the fuse within a few centimeters of the pack: it protects the wiring and the cells from a short, not the electronics.",
    stage: 0,
  },
  {
    id: "vm",
    name: "Motor supply VM",
    kind: "power",
    color: C7V4,
    paths: [
      [
        [170, 300],
        [190, 300],
        [190, 100],
        [530, 100],
        [530, 150],
      ],
    ],
    pin: "none (power)",
    from: "Switch output",
    to: "TB6612 VM",
    signal: "6.0 to 8.4 V, up to about 2 A when both motors start",
    note: "Solder a 470 µF electrolytic across VM and GND right at the driver to absorb motor current spikes.",
    stage: 0,
  },
  {
    id: "buckin",
    name: "Buck input",
    kind: "power",
    color: C7V4,
    paths: [
      [
        [95, 290],
        [95, 230],
      ],
    ],
    pin: "none (power)",
    from: "Switch output",
    to: "Buck IN+",
    signal: "6.0 to 8.4 V",
    note: "A buck needs roughly 1 to 1.5 V of headroom; if motor inrush sags the pack below about 6.5 V, the 5 V rail sags with it.",
    stage: 0,
  },
  {
    id: "5v",
    name: "5 V rail",
    kind: "power",
    color: C5V,
    paths: [
      [
        [170, 200],
        [250, 200],
      ],
      [
        [225, 200],
        [225, 8],
        [432, 8],
        [432, 20],
      ],
      [
        [300, 8],
        [300, 20],
      ],
    ],
    junctions: [
      [225, 200],
      [300, 8],
    ],
    pin: "ESP32 5V pin",
    from: "Buck OUT+",
    to: "ESP32 5V pin, SG90 V+, HC-SR04 VCC",
    signal: "5.0 V",
    note: "Peak load is about 1 A: ESP32 Wi-Fi bursts (about 0.4 A), a stalled servo (about 0.65 A) and the sonar (15 mA). Never feed this pin and USB at the same time.",
    stage: 1,
  },
  {
    id: "3v3",
    name: "3.3 V rail",
    kind: "power",
    color: C3V3,
    paths: [
      [
        [250, 262],
        [232, 262],
      ],
      [
        [560, 150],
        [560, 134],
      ],
      [
        [700, 145],
        [700, 158],
      ],
      [
        [700, 355],
        [700, 342],
      ],
      [
        [262, 458],
        [262, 468],
      ],
      [
        [352, 458],
        [352, 468],
      ],
    ],
    tags: [
      { x: 214, y: 262, text: "3V3" },
      { x: 560, y: 126, text: "3V3" },
      { x: 700, y: 166, text: "3V3" },
      { x: 700, y: 334, text: "3V3" },
      { x: 262, y: 476, text: "3V3" },
      { x: 352, y: 476, text: "3V3" },
    ],
    pin: "ESP32 3V3 pin",
    from: "ESP32 onboard LDO (AMS1117, 1 A max)",
    to: "TB6612 VCC, both encoders, both TCRT5000 modules",
    signal: "3.3 V",
    note: "Powering the encoders and line sensors from 3.3 V keeps their outputs safe for ESP32 inputs, which are not 5 V tolerant.",
    stage: 2,
  },
  {
    id: "gnd",
    name: "Common ground",
    kind: "ground",
    color: CGND,
    paths: [
      [
        [60, 455],
        [60, 468],
      ],
      [
        [40, 230],
        [40, 244],
      ],
      [
        [250, 352],
        [232, 352],
      ],
      [
        [590, 150],
        [590, 134],
      ],
      [
        [740, 145],
        [740, 158],
      ],
      [
        [740, 355],
        [740, 342],
      ],
      [
        [362, 70],
        [362, 80],
      ],
      [
        [440, 70],
        [440, 80],
      ],
      [
        [310, 458],
        [310, 468],
      ],
      [
        [400, 458],
        [400, 468],
      ],
    ],
    tags: [
      { x: 60, y: 476, text: "GND" },
      { x: 40, y: 252, text: "GND" },
      { x: 214, y: 352, text: "GND" },
      { x: 590, y: 126, text: "GND" },
      { x: 740, y: 166, text: "GND" },
      { x: 740, y: 334, text: "GND" },
      { x: 362, y: 88, text: "GND" },
      { x: 440, y: 88, text: "GND" },
      { x: 310, y: 476, text: "GND" },
      { x: 400, y: 476, text: "GND" },
    ],
    pin: "ESP32 GND",
    from: "Pack −",
    to: "Every module",
    signal: "0 V reference",
    note: "One ground for everything. Without a ground between the ESP32 and the driver the PWM inputs float: motors twitch or do nothing.",
    stage: 0,
  },
  driverLine("pwma", "Left motor PWM (PWMA)", 25, 180, "PWMA", "20 kHz PWM, 10-bit duty, 3.3 V logic", "Duty sets the speed. Capped at 6.0 V / pack voltage (about 71% on a full pack) because the motors are rated 6 V."),
  driverLine("ain1", "Left motor direction AIN1", 26, 195, "AIN1", "3.3 V logic level", "AIN1 high and AIN2 low drive forward; both low coasts; both high brakes."),
  driverLine("ain2", "Left motor direction AIN2", 27, 210, "AIN2", "3.3 V logic level", "The complement of AIN1 for direction."),
  driverLine("pwmb", "Right motor PWM (PWMB)", 13, 225, "PWMB", "20 kHz PWM, 10-bit duty, 3.3 V logic", "20 kHz is above hearing, so the motors do not whine."),
  driverLine("bin1", "Right motor direction BIN1", 4, 240, "BIN1", "3.3 V logic level", "Mirrors AIN1 for the right motor; the right motor is mounted reversed, so firmware flips its sign."),
  driverLine("bin2", "Right motor direction BIN2", 16, 255, "BIN2", "3.3 V logic level", "The complement of BIN1."),
  {
    ...driverLine("stby", "Driver standby (STBY)", 17, 270, "STBY", "3.3 V logic level, low = standby", "A 10 kΩ pull-down keeps the driver in standby while the ESP32 boots; setup() drives STBY high only after the PWM pins are configured."),
    stage: 3,
  },
  {
    id: "encla",
    name: "Left encoder A",
    kind: "signal",
    color: CENC,
    paths: [
      [
        [668, 72],
        [450, 72],
        [450, 140],
        [420, 140],
      ],
    ],
    pin: "GPIO 18",
    from: "Left motor encoder C1",
    to: "ESP32 (interrupt on the rising edge)",
    signal: "3.3 V square wave, 1050 pulses per wheel turn (7 per motor turn × 150:1)",
    note: "The ISR reads channel B on each rising edge of A to decide whether to count up or down.",
    stage: 5,
  },
  {
    id: "enclb",
    name: "Left encoder B",
    kind: "signal",
    color: CENC,
    paths: [
      [
        [668, 88],
        [466, 88],
        [466, 155],
        [420, 155],
      ],
    ],
    pin: "GPIO 19",
    from: "Left motor encoder C2",
    to: "ESP32 (read inside the A interrupt)",
    signal: "Same as A, shifted 90°",
    note: "Which channel leads tells the direction; swap A and B in firmware if forward counts down.",
    stage: 5,
  },
  {
    id: "encra",
    name: "Right encoder A",
    kind: "signal",
    color: CENC,
    paths: [
      [
        [668, 425],
        [450, 425],
        [450, 320],
        [420, 320],
      ],
    ],
    pin: "GPIO 32",
    from: "Right motor encoder C1",
    to: "ESP32 (interrupt on the rising edge)",
    signal: "3.3 V square wave, 1050 pulses per wheel turn",
    note: "Route encoder wires away from the motor leads, or twist the motor leads, to keep PWM noise out of the counts.",
    stage: 5,
  },
  {
    id: "encrb",
    name: "Right encoder B",
    kind: "signal",
    color: CENC,
    paths: [
      [
        [668, 440],
        [466, 440],
        [466, 335],
        [420, 335],
      ],
    ],
    pin: "GPIO 33",
    from: "Right motor encoder C2",
    to: "ESP32 (read inside the A interrupt)",
    signal: "Same as A, shifted 90°",
    note: "GPIO 32 and 33 have internal pull-ups; GPIO 34 to 39 do not, so they are kept for analog inputs.",
    stage: 5,
  },
  {
    id: "motora",
    name: "Left motor leads (AO1, AO2)",
    kind: "motor",
    color: CMOT,
    paths: [
      [
        [650, 200],
        [656, 200],
        [656, 110],
        [668, 110],
      ],
      [
        [650, 214],
        [662, 214],
        [662, 124],
        [668, 124],
      ],
    ],
    pin: "none (driver output)",
    from: "TB6612 AO1 and AO2",
    to: "Left motor terminals",
    signal: "±VM chopped at 20 kHz, 1.2 A continuous per channel (3.2 A peak)",
    note: "If the wheel spins backwards, swap these two wires or flip the motor's sign in firmware.",
    stage: 4,
  },
  {
    id: "motorb",
    name: "Right motor leads (BO1, BO2)",
    kind: "motor",
    color: CMOT,
    paths: [
      [
        [650, 300],
        [656, 300],
        [656, 385],
        [668, 385],
      ],
      [
        [650, 314],
        [662, 314],
        [662, 399],
        [668, 399],
      ],
    ],
    pin: "none (driver output)",
    from: "TB6612 BO1 and BO2",
    to: "Right motor terminals",
    signal: "±VM chopped at 20 kHz",
    note: "A 100 nF ceramic soldered across each motor's terminals cuts brush noise.",
    stage: 4,
  },
  {
    id: "trig",
    name: "Sonar trigger",
    kind: "signal",
    color: CSEN,
    paths: [
      [
        [280, 120],
        [280, 70],
      ],
    ],
    pin: "GPIO 14",
    from: "ESP32",
    to: "HC-SR04 Trig",
    signal: "10 µs, 3.3 V pulse every 60 ms",
    note: "3.3 V is above the HC-SR04's input threshold, so TRIG needs no level shifter.",
    stage: 5,
  },
  {
    id: "echo",
    name: "Sonar echo",
    kind: "signal",
    color: CSEN,
    paths: [
      [
        [330, 70],
        [330, 120],
      ],
    ],
    part: { x: 330, y: 84, w: 30, text: "1k/2k" },
    pin: "GPIO 34",
    from: "HC-SR04 Echo",
    to: "ESP32 through a 1 kΩ / 2 kΩ divider (input-only pin)",
    signal: "5 V pulse lasting 58 µs per cm of range, divided to 3.3 V",
    note: "ESP32 pins are not 5 V tolerant: 1 kΩ in series and 2 kΩ to ground turn 5 V into 3.3 V.",
    stage: 5,
  },
  {
    id: "servo",
    name: "Servo signal",
    kind: "signal",
    color: CSEN,
    paths: [
      [
        [410, 120],
        [410, 70],
      ],
    ],
    pin: "GPIO 23",
    from: "ESP32",
    to: "SG90 signal (orange wire)",
    signal: "50 Hz PWM, 0.5 to 2.4 ms pulses",
    note: "Signal only: the servo's power comes from the 5 V rail, never from the ESP32's 3.3 V pin.",
    stage: 5,
  },
  {
    id: "linel",
    name: "Left line sensor",
    kind: "signal",
    color: CSEN,
    paths: [
      [
        [285, 370],
        [285, 410],
      ],
    ],
    pin: "GPIO 36 (VP)",
    from: "Left TCRT5000 AO",
    to: "ESP32 ADC1 channel 0",
    signal: "Analog 0 to 3.3 V, higher over black tape",
    note: "Use ADC1 pins (GPIO 32 to 39): ADC2 cannot be read while Wi-Fi is on.",
    stage: 5,
  },
  {
    id: "liner",
    name: "Right line sensor",
    kind: "signal",
    color: CSEN,
    paths: [
      [
        [375, 370],
        [375, 410],
      ],
    ],
    pin: "GPIO 39 (VN)",
    from: "Right TCRT5000 AO",
    to: "ESP32 ADC1 channel 3",
    signal: "Analog 0 to 3.3 V",
    note: "Calibrate on your floor: record the reading over tape and over the floor, and set the threshold halfway.",
    stage: 5,
  },
  {
    id: "vbat",
    name: "Battery sense",
    kind: "signal",
    color: vizColors.copper,
    paths: [
      [
        [170, 325],
        [215, 325],
        [215, 300],
        [250, 300],
      ],
    ],
    part: { x: 194, y: 325, w: 30, text: "÷3.1" },
    pin: "GPIO 35",
    from: "Switch output through a 100 kΩ / 47 kΩ divider",
    to: "ESP32 ADC1 channel 7",
    signal: "Pack voltage × 47/147: 2.69 V at 8.4 V, 1.92 V at 6.0 V",
    note: "Firmware cuts the motors below 6.4 V (3.2 V per cell) so the cells are never over-discharged.",
    stage: 2,
  },
];

const PIN_LABELS: Array<{ x: number; y: number; text: string; anchor: "start" | "middle" | "end" }> = [
  { x: 416, y: 140, text: "18", anchor: "end" },
  { x: 416, y: 155, text: "19", anchor: "end" },
  { x: 416, y: 180, text: "25", anchor: "end" },
  { x: 416, y: 195, text: "26", anchor: "end" },
  { x: 416, y: 210, text: "27", anchor: "end" },
  { x: 416, y: 225, text: "13", anchor: "end" },
  { x: 416, y: 240, text: "4", anchor: "end" },
  { x: 416, y: 255, text: "16", anchor: "end" },
  { x: 416, y: 270, text: "17", anchor: "end" },
  { x: 416, y: 320, text: "32", anchor: "end" },
  { x: 416, y: 335, text: "33", anchor: "end" },
  { x: 280, y: 131, text: "14", anchor: "middle" },
  { x: 330, y: 131, text: "34", anchor: "middle" },
  { x: 410, y: 131, text: "23", anchor: "end" },
  { x: 285, y: 360, text: "36", anchor: "middle" },
  { x: 375, y: 360, text: "39", anchor: "middle" },
  { x: 254, y: 200, text: "5V", anchor: "start" },
  { x: 254, y: 262, text: "3V3", anchor: "start" },
  { x: 254, y: 300, text: "35", anchor: "start" },
  { x: 254, y: 352, text: "GND", anchor: "start" },
  { x: 514, y: 180, text: "PWMA", anchor: "start" },
  { x: 514, y: 195, text: "AIN1", anchor: "start" },
  { x: 514, y: 210, text: "AIN2", anchor: "start" },
  { x: 514, y: 225, text: "PWMB", anchor: "start" },
  { x: 514, y: 240, text: "BIN1", anchor: "start" },
  { x: 514, y: 255, text: "BIN2", anchor: "start" },
  { x: 514, y: 270, text: "STBY", anchor: "start" },
  { x: 530, y: 162, text: "VM", anchor: "middle" },
  { x: 560, y: 162, text: "VCC", anchor: "middle" },
  { x: 590, y: 162, text: "GND", anchor: "middle" },
  { x: 646, y: 200, text: "AO1", anchor: "end" },
  { x: 646, y: 214, text: "AO2", anchor: "end" },
  { x: 646, y: 300, text: "BO1", anchor: "end" },
  { x: 646, y: 314, text: "BO2", anchor: "end" },
];

const STEPS = [
  "Switch on: the pack (about 8.2 V) reaches the fuse, the TB6612 VM pin and the buck input. The driver has motor power but no logic power yet, so its outputs stay off.",
  "Buck soft-start: the 5 V rail ramps up in about a millisecond (slowed down here) and feeds the ESP32's 5V pin, the servo and the sonar.",
  "LDO: the ESP32's AMS1117 makes 3.3 V for the chip, the driver logic, the encoders and the line sensors. An RC delay on EN holds the ESP32 in reset until the rail is stable.",
  "Boot: every GPIO starts as an input and the 10 kΩ pull-down holds STBY low, so the motors cannot twitch while the bootloader runs.",
  "setup(): PWM channels attached at 20 kHz, direction pins set, then STBY driven high. The H-bridges are live but the duty is still zero.",
  "Running: 100 Hz control loop, encoder interrupts counting, a sonar ping every 60 ms, line sensors sampled every tick and telemetry printed at 10 Hz.",
];
const STEP_S = 1.6;

function pathD(points: Pt[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}

function matchesView(w: Wire, view: View): boolean {
  if (view === "all") return true;
  if (view === "power") return w.kind !== "signal";
  return w.kind === "signal";
}

export function WiringDiagram() {
  // the clock only runs during the power-on sequence; under reduced motion use Next step instead
  const { t, playing, setPlaying, reducedMotion } = useViz(false);
  const [view, setView] = useState<View>("all");
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [seq, setSeq] = useState<{ at: number; offset: number } | null>(null);

  const stage = seq ? Math.min(STEPS.length - 1, seq.offset + (playing ? Math.floor((t - seq.at) / STEP_S) : 0)) : null;
  const activeId = hover ?? pinned;
  const active = WIRES.find((w) => w.id === activeId) ?? null;

  const wireOpacity = (w: Wire) => {
    if (!matchesView(w, view)) return 0.12;
    if (stage !== null && w.stage > stage) return 0.15;
    return 1;
  };
  const blockLive = (b: Block) => stage === null || b.stage <= stage;

  return (
    <VizFrame
      title="Wiring diagram: the course robot"
      description="Hover, tap or tab to a wire to see its signal, ESP32 pin and why it is wired that way. Filter by power or signals, then run the power-on sequence."
      controls={
        <>
          <Segmented
            label="View"
            options={[
              { value: "all", label: "All" },
              { value: "power", label: "Power" },
              { value: "signal", label: "Signals" },
            ]}
            value={view}
            onChange={setView}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSeq({ at: t, offset: 0 });
                if (!reducedMotion) setPlaying(true);
              }}
            >
              Power on
            </Button>
            <Button size="sm" variant="ghost" disabled={stage === null || stage >= STEPS.length - 1} onClick={() => setSeq({ at: t, offset: (stage ?? -1) + 1 })}>
              Next step
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={seq === null}
              onClick={() => {
                setSeq(null);
                setPlaying(false);
              }}
            >
              Power off
            </Button>
          </div>
          <p className="text-xs text-muted">
            Logical layout: pins are grouped by what they connect to. The pin map table below gives the physical header pins.
          </p>
        </>
      }
      footer={
        <div className="grid gap-3 md:grid-cols-2">
          <div data-testid="wire-info" aria-live="polite" className="space-y-1">
            {active ? (
              <>
                <p className="font-semibold text-text">{active.name}</p>
                <p>ESP32 pin: {active.pin}</p>
                <p>
                  {active.from} → {active.to}
                </p>
                <p>Signal: {active.signal}</p>
                <p className="text-text/80">{active.note}</p>
              </>
            ) : (
              <p>Hover, tap or tab to a wire to see its signal, pin and purpose.</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-text">Power-on sequence</p>
            <p data-testid="power-step">
              {stage === null ? "Power is off. Press Power on to watch the rails come up in order." : `Step ${stage + 1} of ${STEPS.length}. ${STEPS[stage]}`}
            </p>
          </div>
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 760 490" title="Wiring diagram of the ESP32 robot: pack, buck, ESP32, TB6612, motors, sonar, servo and line sensors" role="group">
        <rect x={0} y={0} width={760} height={490} rx={10} fill={vizColors.bg} />

        {/* blocks */}
        {BLOCKS.map((b) => {
          const live = blockLive(b);
          const justOn = stage !== null && b.stage === stage;
          return (
            <g key={b.id} opacity={live ? 1 : 0.35}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={8}
                fill={vizColors.grid}
                fillOpacity={0.55}
                stroke={justOn ? vizColors.green : vizColors.muted}
                strokeWidth={justOn ? 2.5 : 1.2}
              />
              <Label x={b.x + b.w / 2} y={b.id === "esp32" ? 235 : b.id === "driver" ? 300 : b.y + b.h / 2 - (b.sub ? 8 : 0)} size={12} bold>
                {b.title}
              </Label>
              {b.sub && (
                <Label x={b.x + b.w / 2} y={b.id === "esp32" ? 252 : b.id === "driver" ? 316 : b.y + b.h / 2 + 9} size={10} color={vizColors.muted}>
                  {b.sub}
                </Label>
              )}
            </g>
          );
        })}
        {PIN_LABELS.map((p) => (
          <Label key={`${p.x}-${p.y}-${p.text}`} x={p.x} y={p.y} size={9} anchor={p.anchor} color={vizColors.muted} mono>
            {p.text}
          </Label>
        ))}

        {/* wires */}
        {WIRES.map((w) => {
          const isActive = w.id === activeId;
          const energized = stage !== null && w.stage <= stage && (w.kind === "power" || w.kind === "motor");
          return (
            <g
              key={w.id}
              role="button"
              tabIndex={0}
              aria-label={`${w.name}: ${w.pin}, ${w.from} to ${w.to}`}
              opacity={wireOpacity(w)}
              onMouseEnter={() => setHover(w.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setPinned(w.id)}
              onClick={() => setPinned(w.id)}
              style={{ cursor: "pointer", outline: "none" }}
            >
              {w.paths.map((p, i) => (
                <g key={i}>
                  <path d={pathD(p)} fill="none" stroke="transparent" strokeWidth={12} pointerEvents="stroke" />
                  <path
                    d={pathD(p)}
                    fill="none"
                    stroke={w.color}
                    strokeWidth={isActive ? 4 : 2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={energized && playing ? "7 7" : undefined}
                    strokeDashoffset={energized && playing ? Math.round(-t * 24) : undefined}
                  />
                </g>
              ))}
              {w.junctions?.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill={w.color} />)}
              {w.tags?.map((tg) => (
                <g key={`${tg.x}-${tg.y}`}>
                  <rect x={tg.x - 14} y={tg.y - 7} width={28} height={14} rx={3} fill={vizColors.bg} stroke={w.color} strokeWidth={isActive ? 2 : 1} />
                  <Label x={tg.x} y={tg.y} size={8} color={w.color} mono>
                    {tg.text}
                  </Label>
                </g>
              ))}
              {w.part && (
                <g>
                  <rect x={w.part.x - w.part.w / 2} y={w.part.y - 7} width={w.part.w} height={14} rx={3} fill={vizColors.bg} stroke={w.color} />
                  <Label x={w.part.x} y={w.part.y} size={8} color={w.color} mono>
                    {w.part.text}
                  </Label>
                </g>
              )}
            </g>
          );
        })}

        {/* legend */}
        <g>
          {[
            { c: C7V4, t: "pack 7.4 V" },
            { c: C5V, t: "5 V" },
            { c: C3V3, t: "3.3 V" },
            { c: CDRV, t: "driver logic" },
            { c: CENC, t: "encoders" },
            { c: CSEN, t: "sensors" },
            { c: CMOT, t: "motor leads" },
          ].map((l, i) => (
            <g key={l.t}>
              <line x1={492 + (i % 3) * 90} y1={14 + Math.floor(i / 3) * 16} x2={506 + (i % 3) * 90} y2={14 + Math.floor(i / 3) * 16} stroke={l.c} strokeWidth={3} />
              <Label x={510 + (i % 3) * 90} y={14 + Math.floor(i / 3) * 16} anchor="start" size={10} color={vizColors.muted}>
                {l.t}
              </Label>
            </g>
          ))}
        </g>
      </SvgCanvas>
    </VizFrame>
  );
}
