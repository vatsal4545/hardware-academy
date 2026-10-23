// Every part on the virtual bench, with its real-world status. Facts come from Vatsal's documents in
// ~/Ideas Discussion/, named in each part's source; anything simulated says so in its note.

export const SOURCES = {
  guide: "EIS-BEGINNER-START-HERE.md (2026-09-07)",
  runbook: "Start-With-One-Milliohm.html (2026-09-04)",
  bringup: "BRINGUP-RUNBOOK.md (2026-09-07)",
  orders: "EIS-ORDER-LIST.md (2026-09-22)",
} as const;

export type PartStatus = "owned" | "pending" | "not-bought";
export type PartKind = "board" | "chip" | "adapter" | "leads" | "fixture" | "shunt" | "cell" | "meter" | "tool" | "computer" | "supply" | "devkit";

export interface Part {
  id: string;
  name: string;
  kind: PartKind;
  status: PartStatus;
  qty: number;
  /** What it does on this bench, in plain words. */
  role: string;
  source: string;
  note?: string;
  /** Cells and shunts: the simulator preset (see dut.ts). */
  preset?: string;
  /** Cells only: a simulated condition the bench reveals when the cell is inspected. */
  leaking?: boolean;
}

export const PARTS: readonly Part[] = [
  { id: "eval-ad5941batz", name: "EVAL-AD5941BATZ", kind: "board", status: "owned", qty: 1, role: "The measurement board: it generates the test signal and measures the response. Four BNC jacks: F+, S+, S−, F−.", source: SOURCES.orders },
  { id: "eval-adicup3029", name: "EVAL-ADICUP3029 and USB cable", kind: "board", status: "owned", qty: 1, role: "The controller: it runs the program and talks to the computer. Power and USB go in at the micro-USB port P10.", source: SOURCES.bringup },
  { id: "ad5941-chips", name: "AD5941BCPZ bare chips", kind: "chip", status: "owned", qty: 3, role: "For your future custom board, after the evaluation boards work.", source: SOURCES.orders },
  { id: "bnc-banana-adapters", name: "BNC male to dual 4 mm banana adapters", kind: "adapter", status: "pending", qty: 5, role: "Join the board's BNC jacks to the banana leads. Use the red (centre) jack only: the BNC shell is board ground.", source: SOURCES.orders, note: "Purchase not confirmed; the real bench needs these before any lead reaches the board." },
  { id: "kelvin-leads", name: "Goupchn Kelvin clip leads, 4 mm banana", kind: "leads", status: "owned", qty: 2, role: "Four-wire connections. Each clip has two insulated jaws: one carries force, the other sense.", source: SOURCES.orders },
  { id: "zke-fixture", name: "ZKE 4-wire battery test fixture", kind: "fixture", status: "owned", qty: 1, role: "Holds AA and AAA cells for four-wire measurement. D cells are too fat for it.", source: SOURCES.runbook },
  { id: "shunt-1m", name: "Ohmite FC4L76R001GER, 1 mΩ ±2%, four terminals", kind: "shunt", status: "owned", qty: 4, role: "Known resistance for checking accuracy, once a powered test setup exists.", source: SOURCES.orders, preset: "shunt-1m" },
  { id: "shunt-2m", name: "Vishay WSK25122L000FEA, 2 mΩ ±1%, four terminals", kind: "shunt", status: "owned", qty: 3, role: "Known resistance for checking accuracy, once a powered test setup exists.", source: SOURCES.orders, preset: "shunt-2m" },
  { id: "shunt-7m5", name: "NOYITO 75 mV / 10 A panel shunt (7.5 mΩ), screw lugs", kind: "shunt", status: "owned", qty: 2, role: "A chunky warm-up target with screw lugs, once a powered test setup exists.", source: SOURCES.orders, preset: "shunt-7m5", note: "Confirm its terminal layout on your part." },
  { id: "shunt-10m", name: "Vishay WSK2512R0100DTA, 10 mΩ ±0.5%, four terminals", kind: "shunt", status: "owned", qty: 2, role: "The headline repeatability target, once a powered test setup exists.", source: SOURCES.orders, preset: "shunt-10m" },
  { id: "shunt-25m", name: "Vishay WSK2512R0250DEA, 25 mΩ ±0.5%, four terminals", kind: "shunt", status: "owned", qty: 3, role: "Stands in for a healthy cell, once a powered test setup exists.", source: SOURCES.orders, preset: "shunt-25m" },
  { id: "shunt-100m", name: "Vishay WSL2512R1000FEA, 100 mΩ ±1%", kind: "shunt", status: "owned", qty: 4, role: "The upper end of the ladder, once a powered test setup exists.", source: SOURCES.orders, preset: "shunt-100m" },
  { id: "cell-aaa-duracell", name: "Duracell AAA alkaline (used)", kind: "cell", status: "owned", qty: 1, role: "An unknown sample for experiments, not a standard.", source: SOURCES.orders, preset: "alkaline-aaa-used" },
  { id: "cell-aa-energizer", name: "Energizer MAX AA alkaline", kind: "cell", status: "owned", qty: 1, role: "An unknown sample for experiments, not a standard.", source: SOURCES.orders, preset: "alkaline-aa-fresh", note: "Simulated as still healthy: a pile of 'dead' cells often hides one." },
  { id: "cell-aa-amazon", name: "Amazon Basics AA alkaline (used)", kind: "cell", status: "owned", qty: 1, role: "An unknown sample for experiments, not a standard.", source: SOURCES.orders, preset: "alkaline-aa-used" },
  { id: "cell-d-duracell", name: "Duracell D alkaline (used)", kind: "cell", status: "owned", qty: 1, role: "The safest proxy for lithium territory you own.", source: SOURCES.runbook, preset: "alkaline-d-used" },
  { id: "cell-d-generic", name: "Generic LR20 D alkaline (used)", kind: "cell", status: "owned", qty: 1, role: "An unknown sample for experiments, not a standard.", source: SOURCES.orders, preset: "alkaline-d-used", leaking: true, note: "Simulated with white crusty leakage, to practise the discard rule." },
  { id: "cell-9v", name: "9 V alkaline battery", kind: "cell", status: "owned", qty: 1, role: "Six cells in series: above this project's 0–5 V envelope. It belongs in the v2 test-article bag.", source: SOURCES.runbook, preset: "alkaline-9v" },
  { id: "cell-18650", name: "Molicel P26A / Samsung 25R 18650", kind: "cell", status: "pending", qty: 3, role: "Lithium baseline, new, near 50% charge.", source: SOURCES.orders, preset: "li-ion-p26a", note: "Order from a lithium specialist, not Amazon. The simulator uses the P26A preset." },
  { id: "cell-26650", name: "LiFePO4 26650", kind: "cell", status: "pending", qty: 2, role: "Lithium iron phosphate baseline.", source: SOURCES.orders, preset: "lifepo4-26650" },
  { id: "kaiweets-dmm", name: "KAIWEETS multimeter, 20000 counts", kind: "meter", status: "owned", qty: 1, role: "Open-circuit voltage, and continuity on disconnected leads. It cannot resolve milliohms.", source: SOURCES.runbook },
  { id: "ir-thermometer", name: "Infrared thermometer", kind: "tool", status: "owned", qty: 1, role: "Cell temperature for every reading: a reading without a temperature is not data.", source: SOURCES.runbook },
  { id: "usb-microscope", name: "Jiusion USB microscope, 40–1000×", kind: "tool", status: "owned", qty: 1, role: "Inspect boards before power, and solder joints later.", source: SOURCES.bringup },
  { id: "usb-isolator", name: "USB isolator (ADuM3160)", kind: "tool", status: "owned", qty: 1, role: "Isolates USB. It is full-speed only: bypass it if flashing or enumeration fails.", source: SOURCES.bringup },
  { id: "esd-kit", name: "Anti-static mat, wrist strap and grounding plug", kind: "tool", status: "owned", qty: 1, role: "Mat to grounding cord to the plug's earth pin; strap onto the mat's snap whenever a board is exposed.", source: SOURCES.runbook },
  { id: "helping-hands", name: "Magnetic helping hands with magnifier lamp", kind: "tool", status: "owned", qty: 1, role: "Holds the Kelvin clips against a D cell's ends.", source: SOURCES.runbook },
  { id: "metal-tray", name: "Stainless instrument tray", kind: "tool", status: "owned", qty: 1, role: "Cells are handled over the tray.", source: SOURCES.runbook },
  { id: "lipo-bag", name: "Fireproof LiPo storage bag", kind: "tool", status: "owned", qty: 1, role: "Cells live in the bag when they are not on the bench.", source: SOURCES.runbook },
  { id: "soldering-kit", name: "Soldering iron, solder, flux and wick", kind: "tool", status: "owned", qty: 1, role: "Fixtures and, later, your own board.", source: SOURCES.orders },
  { id: "perfboard", name: "Perfboard kit", kind: "tool", status: "owned", qty: 1, role: "Mounting the shunts as test fixtures, following each datasheet's terminal map.", source: SOURCES.guide },
  { id: "resistor-kit", name: "Metal film resistor kit, 1/4 W ±1%", kind: "tool", status: "owned", qty: 1, role: "Simple circuits whose impedance can be calculated, in later lessons.", source: SOURCES.guide },
  { id: "esp32-s3", name: "ESP32-S3-DEV-KIT-N8R8", kind: "devkit", status: "owned", qty: 2, role: "The controller for the later custom product, after the ADI controller reproduces the measurements.", source: SOURCES.guide },
  { id: "laptop", name: "Your laptop", kind: "computer", status: "owned", qty: 1, role: "Runs the measurement software. SensorPal is a Windows program; a Mac needs a separate, verified firmware-loading plan.", source: SOURCES.guide },
  { id: "korad", name: "Korad KA3005DE bench supply (linear)", kind: "supply", status: "not-bought", qty: 1, role: "Current-limited power (50 mA) for the first power-on of your own board.", source: SOURCES.orders, note: "Not bought yet: needed at First Board, the Rev A bring-up." },
];

export function partById(id: string): Part | undefined {
  return PARTS.find((p) => p.id === id);
}

export function partsOfKind(kind: PartKind): Part[] {
  return PARTS.filter((p) => p.kind === kind);
}
