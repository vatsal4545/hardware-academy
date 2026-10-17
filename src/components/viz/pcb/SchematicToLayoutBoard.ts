/**
 * Placement and routing data for the course robot's motor-driver board (60 x 40 mm), shared by the
 * SchematicToLayout visualization, the placement-plan figure in the KiCad lesson and the find-the-short game
 * in the bring-up lesson. Units are millimetres, origin top-left, y down. Part boxes include their pads.
 * Only the key nets are routed here; decoupling, the gate resistor, EN/BOOT, the LED, UART and the encoders
 * are placed but their copper is left out to keep the picture readable.
 */

export const BOARD = { w: 60, h: 40 } as const;

export type Pt = [number, number];

export type ZoneId = "motor" | "power" | "logic" | "io";

export interface Zone {
  id: ZoneId;
  name: string;
  /** one or more rectangles [x, y, w, h] */
  rects: Array<[number, number, number, number]>;
  /** label anchor */
  label: Pt;
  color: string;
  note: string;
}

export const zones: Zone[] = [
  {
    id: "motor",
    name: "Motor driver",
    rects: [[0, 0, 36, 23]],
    label: [1.2, 10.4],
    color: "#fb923c",
    note: "TB6612FNG, bulk capacitor and motor connectors; loud, high di/dt",
  },
  {
    id: "power",
    name: "Power entry",
    rects: [[0, 23, 30, 10]],
    label: [1.2, 32.3],
    color: "#f87171",
    note: "Battery connector, reverse-polarity P-FET and the 3.3 V regulator",
  },
  {
    id: "logic",
    name: "ESP32 and logic",
    rects: [
      [36, 0, 24, 31],
      [30, 24, 6, 7],
    ],
    label: [36.8, 10.35],
    color: "#22d3ee",
    note: "Module with its antenna at the board edge, decoupling, EN and BOOT",
  },
  {
    id: "io",
    name: "Sensor edge",
    rects: [[7, 33.5, 47, 6.5]],
    label: [8, 39.3],
    color: "#a78bfa",
    note: "HC-SR04, line-sensor and UART headers on the front edge",
  },
];

export type PartKind = "module" | "ic" | "conn" | "cap" | "res" | "led" | "switch" | "fet" | "hole";

export interface Part {
  ref: string;
  label: string;
  kind: PartKind;
  /** centre, mm */
  x: number;
  y: number;
  /** size including pads, mm */
  w: number;
  h: number;
  zone: ZoneId | null;
}

export const parts: Part[] = [
  // mounting holes, M3 clearance 3.2 mm
  { ref: "H1", label: "M3", kind: "hole", x: 3.5, y: 3.5, w: 3.2, h: 3.2, zone: null },
  { ref: "H2", label: "M3", kind: "hole", x: 56.5, y: 3.5, w: 3.2, h: 3.2, zone: null },
  { ref: "H3", label: "M3", kind: "hole", x: 3.5, y: 36.5, w: 3.2, h: 3.2, zone: null },
  { ref: "H4", label: "M3", kind: "hole", x: 56.5, y: 36.5, w: 3.2, h: 3.2, zone: null },

  // motor zone
  { ref: "J2", label: "Motor A", kind: "conn", x: 14.3, y: 5.4, w: 14, h: 5.7, zone: "motor" },
  { ref: "J3", label: "Motor B", kind: "conn", x: 28.6, y: 5.4, w: 14, h: 5.7, zone: "motor" },
  { ref: "U2", label: "TB6612FNG", kind: "ic", x: 22, y: 15.5, w: 9.5, h: 9, zone: "motor" },
  { ref: "C1", label: "100 µF", kind: "cap", x: 10.8, y: 16.8, w: 7, h: 7, zone: "motor" },
  { ref: "C3", label: "100 nF", kind: "cap", x: 16.3, y: 19.0, w: 1.2, h: 2.4, zone: "motor" },
  { ref: "C4", label: "100 nF", kind: "cap", x: 29.2, y: 18.0, w: 1.2, h: 2.4, zone: "motor" },

  // power entry
  { ref: "J1", label: "Battery", kind: "conn", x: 4.8, y: 28, w: 5, h: 5.75, zone: "power" },
  { ref: "Q1", label: "AO3401A", kind: "fet", x: 11, y: 26.75, w: 3.2, h: 3.6, zone: "power" },
  { ref: "R1", label: "100 k", kind: "res", x: 11, y: 30.6, w: 1.2, h: 2.4, zone: "power" },
  { ref: "C2", label: "10 µF", kind: "cap", x: 15.8, y: 24.0, w: 3.4, h: 2, zone: "power" },
  { ref: "U3", label: "AMS1117-3.3", kind: "ic", x: 20, y: 29.2, w: 7, h: 7.6, zone: "power" },
  { ref: "C5", label: "22 µF", kind: "cap", x: 26.4, y: 26.4, w: 4.4, h: 2, zone: "power" },

  // logic zone
  { ref: "U1", label: "ESP32-WROOM-32", kind: "module", x: 47.25, y: 20, w: 25.5, h: 18, zone: "logic" },
  { ref: "C6", label: "10 µF", kind: "cap", x: 31.1, y: 27.3, w: 3.4, h: 2, zone: "logic" },
  { ref: "C7", label: "100 nF", kind: "cap", x: 31.1, y: 24.9, w: 2.4, h: 1.2, zone: "logic" },
  { ref: "R2", label: "10 k", kind: "res", x: 36.8, y: 9.0, w: 2.4, h: 1.2, zone: "logic" },
  { ref: "C8", label: "1 µF", kind: "cap", x: 39.4, y: 9.0, w: 2.4, h: 1.2, zone: "logic" },
  { ref: "SW1", label: "BOOT", kind: "switch", x: 42.5, y: 4.9, w: 6.5, h: 6.5, zone: "logic" },
  { ref: "SW2", label: "EN", kind: "switch", x: 49.5, y: 4.9, w: 6.5, h: 6.5, zone: "logic" },

  // sensor edge
  { ref: "J5", label: "Line L", kind: "conn", x: 12.8, y: 37.3, w: 7.6, h: 2.5, zone: "io" },
  { ref: "J7", label: "UART", kind: "conn", x: 23.1, y: 37.3, w: 10.2, h: 2.5, zone: "io" },
  { ref: "J4", label: "HC-SR04", kind: "conn", x: 34.7, y: 37.3, w: 10.2, h: 2.5, zone: "io" },
  { ref: "J6", label: "Line R", kind: "conn", x: 45.0, y: 37.3, w: 7.6, h: 2.5, zone: "io" },
  { ref: "D1", label: "LED", kind: "led", x: 38.0, y: 33.8, w: 2, h: 1.2, zone: "io" },
  { ref: "R3", label: "1 k", kind: "res", x: 41.0, y: 33.8, w: 2.4, h: 1.2, zone: "io" },
];

/** Copper keep-out under and around the antenna end of the module. */
export const antennaKeepout = { x: 53.5, y: 11, w: 6.5, h: 18 };

export function partBox(p: Part): { x0: number; y0: number; x1: number; y1: number } {
  return { x0: p.x - p.w / 2, y0: p.y - p.h / 2, x1: p.x + p.w / 2, y1: p.y + p.h / 2 };
}

export function partByRef(ref: string): Part {
  const p = parts.find((q) => q.ref === ref);
  if (!p) throw new Error(`Unknown part ${ref}`);
  return p;
}

/** Connector pin positions (pad centres), evaluated from the part's centre. */
export function connectorPins(p: Part): Pt[] {
  const count = { J1: 2, J2: 6, J3: 6, J4: 4, J5: 3, J6: 3, J7: 4 }[p.ref as "J1"] ?? 0;
  if (!count) return [];
  const pitch = { J1: 2.5, J2: 2, J3: 2, J4: 2.54, J5: 2.54, J6: 2.54, J7: 2.54 }[p.ref as "J1"];
  const vertical = p.ref === "J1";
  return Array.from({ length: count }, (_, k): Pt => {
    const off = (k - (count - 1) / 2) * pitch;
    return vertical ? [p.x, p.y + off] : [p.x + off, p.y];
  });
}

export type NetClass = "power" | "motor" | "signal";

export interface Route {
  layer: "F" | "B";
  pts: Pt[];
}

export interface Net {
  id: string;
  label: string;
  cls: NetClass;
  /** pads the net connects, in the order the ratsnest chains them */
  taps: Array<{ ref: string; pin: string; at: Pt }>;
  routes: Route[];
  vias: Pt[];
}

/** Drawn copper width in mm (the real board uses 1.5 mm for motor and VM). */
export const NET_WIDTH: Record<NetClass, number> = { power: 0.9, motor: 0.9, signal: 0.3 };

// --- control bus: U2 bottom pins to the module's left-end pins, ordered so the lines never cross ---
const BUS = [
  { id: "PWMA", gpio: "IO25", x: 19.4 },
  { id: "AIN2", gpio: "IO27", x: 20.4 },
  { id: "AIN1", gpio: "IO26", x: 21.4 },
  { id: "STBY", gpio: "IO4", x: 23.4 },
  { id: "BIN1", gpio: "IO19", x: 24.4 },
  { id: "BIN2", gpio: "IO23", x: 25.4 },
  { id: "PWMB", gpio: "IO18", x: 26.4 },
];

export const busNets: Net[] = BUS.map((b, i): Net => {
  const yCh = 20.8 + 0.5 * (6 - i);
  const xRise = 33.2 - 0.5 * i;
  const yPin = 20.6 - 1.27 * i;
  return {
    id: b.id,
    label: `${b.id} (${b.gpio})`,
    cls: "signal",
    taps: [
      { ref: "U2", pin: b.id, at: [b.x, 20.0] },
      { ref: "U1", pin: b.gpio, at: [34.5, yPin] },
    ],
    routes: [
      {
        layer: "F",
        pts: [
          [b.x, 20.0],
          [b.x, yCh],
          [xRise, yCh],
          [xRise, yPin],
          [34.5, yPin],
        ],
      },
    ],
    vias: [],
  };
});

export const nets: Net[] = [
  {
    id: "VBAT",
    label: "VBAT",
    cls: "power",
    taps: [
      { ref: "J1", pin: "+", at: [4.8, 26.75] },
      { ref: "Q1", pin: "D", at: [9.8, 26.75] },
    ],
    routes: [{ layer: "F", pts: [[4.8, 26.75], [9.8, 26.75]] }],
    vias: [],
  },
  {
    id: "VM",
    label: "VM",
    cls: "power",
    taps: [
      { ref: "Q1", pin: "S", at: [12.2, 26.75] },
      { ref: "C1", pin: "+", at: [13.0, 19.8] },
      { ref: "U2", pin: "VM", at: [18.4, 20.0] },
      { ref: "U3", pin: "IN", at: [16.9, 26.75] },
    ],
    routes: [
      { layer: "F", pts: [[12.2, 26.75], [13.0, 26.75], [13.0, 21.0], [18.4, 21.0], [18.4, 20.0]] },
      { layer: "F", pts: [[13.0, 21.0], [13.0, 19.8]] },
      { layer: "F", pts: [[13.0, 26.75], [16.9, 26.75]] },
    ],
    vias: [],
  },
  {
    id: "3V3",
    label: "+3V3",
    cls: "power",
    taps: [
      { ref: "U3", pin: "OUT", at: [23.2, 29.05] },
      { ref: "U1", pin: "3V3", at: [34.5, 27.6] },
      { ref: "U2", pin: "VCC", at: [22.4, 20.0] },
    ],
    routes: [
      { layer: "F", pts: [[23.2, 29.05], [33.9, 29.05], [33.9, 27.6], [34.5, 27.6]] },
      { layer: "B", pts: [[24.2, 29.05], [24.2, 21.6], [22.4, 21.6], [22.4, 20.8]] },
      { layer: "F", pts: [[22.4, 20.8], [22.4, 20.0]] },
    ],
    vias: [[24.2, 29.05], [22.4, 20.8]],
  },
  {
    id: "M1A",
    label: "M1A",
    cls: "motor",
    taps: [
      { ref: "U2", pin: "AO1", at: [19.0, 11.0] },
      { ref: "J2", pin: "1", at: [17.3, 5.4] },
    ],
    routes: [{ layer: "F", pts: [[19.0, 11.0], [19.0, 9.6], [17.3, 7.9], [17.3, 5.4]] }],
    vias: [],
  },
  {
    id: "M1B",
    label: "M1B",
    cls: "motor",
    taps: [
      { ref: "U2", pin: "AO2", at: [20.6, 11.0] },
      { ref: "J2", pin: "2", at: [19.3, 5.4] },
    ],
    routes: [{ layer: "F", pts: [[20.6, 11.0], [20.6, 9.6], [19.3, 8.3], [19.3, 5.4]] }],
    vias: [],
  },
  {
    id: "M2A",
    label: "M2A",
    cls: "motor",
    taps: [
      { ref: "U2", pin: "BO2", at: [23.4, 11.0] },
      { ref: "J3", pin: "1", at: [23.6, 5.4] },
    ],
    routes: [{ layer: "F", pts: [[23.4, 11.0], [23.4, 8.2], [23.6, 8.0], [23.6, 5.4]] }],
    vias: [],
  },
  {
    id: "M2B",
    label: "M2B",
    cls: "motor",
    taps: [
      { ref: "U2", pin: "BO1", at: [25.0, 11.0] },
      { ref: "J3", pin: "2", at: [25.6, 5.4] },
    ],
    routes: [{ layer: "F", pts: [[25.0, 11.0], [25.0, 8.4], [25.6, 7.8], [25.6, 5.4]] }],
    vias: [],
  },
  ...busNets,
  {
    id: "LINE_L",
    label: "LINE_L (IO32)",
    cls: "signal",
    taps: [
      { ref: "U1", pin: "IO32", at: [38.0, 29.0] },
      { ref: "J5", pin: "OUT", at: [15.34, 37.3] },
    ],
    routes: [
      { layer: "F", pts: [[38.0, 29.0], [38.0, 30.5]] },
      { layer: "B", pts: [[38.0, 30.5], [15.34, 30.5], [15.34, 36.4]] },
      { layer: "F", pts: [[15.34, 36.4], [15.34, 37.3]] },
    ],
    vias: [[38.0, 30.5], [15.34, 36.4]],
  },
  {
    id: "TRIG",
    label: "TRIG (IO16)",
    cls: "signal",
    taps: [
      { ref: "U1", pin: "IO16", at: [39.3, 29.0] },
      { ref: "J4", pin: "TRIG", at: [33.43, 37.3] },
    ],
    routes: [{ layer: "F", pts: [[39.3, 29.0], [39.3, 31.3], [33.43, 31.3], [33.43, 37.3]] }],
    vias: [],
  },
  {
    id: "ECHO",
    label: "ECHO (IO17)",
    cls: "signal",
    taps: [
      { ref: "U1", pin: "IO17", at: [40.6, 29.0] },
      { ref: "J4", pin: "ECHO", at: [35.97, 37.3] },
    ],
    routes: [{ layer: "F", pts: [[40.6, 29.0], [40.6, 32.1], [35.97, 32.1], [35.97, 37.3]] }],
    vias: [],
  },
  {
    id: "LINE_R",
    label: "LINE_R (IO33)",
    cls: "signal",
    taps: [
      { ref: "U1", pin: "IO33", at: [41.9, 29.0] },
      { ref: "J6", pin: "OUT", at: [47.54, 37.3] },
    ],
    routes: [{ layer: "F", pts: [[41.9, 29.0], [41.9, 32.9], [47.54, 32.9], [47.54, 37.3]] }],
    vias: [],
  },
];

/** The module's fixed pad positions that are not part of a routed net (for drawing pads). */
export const modulePads: Pt[] = [
  [34.5, 12.98],
  [34.5, 14.25],
  [34.5, 15.52],
  [34.5, 16.79],
  [34.5, 18.06],
  [34.5, 19.33],
  [34.5, 20.6],
  [34.5, 27.6],
  [38.0, 29.0],
  [39.3, 29.0],
  [40.6, 29.0],
  [41.9, 29.0],
];

/** Euclidean distance with plain arithmetic and sqrt, which every JavaScript engine rounds identically (unlike Math.hypot). */
export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function polyLength(pts: Pt[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i][0], pts[i][1], pts[i - 1][0], pts[i - 1][1]);
  return total;
}

export function distPointSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p[0], p[1], a[0] + t * dx, a[1] + t * dy);
}

/** Smallest distance between two segments (adequate for axis-aligned and 45 degree routes). */
export function distSegmentSegment(a: Pt, b: Pt, c: Pt, d: Pt): number {
  const ccw = (p: Pt, q: Pt, r: Pt) => (r[1] - p[1]) * (q[0] - p[0]) > (q[1] - p[1]) * (r[0] - p[0]);
  if (ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)) return 0;
  return Math.min(distPointSegment(a, c, d), distPointSegment(b, c, d), distPointSegment(c, a, b), distPointSegment(d, a, b));
}
