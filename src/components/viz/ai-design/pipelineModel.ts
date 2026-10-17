/**
 * The design-agent pipeline used by the DesignPipeline visualization: seven stages with two checks each,
 * four injectable defects, and a pure event script that is replayed up to any step to get a snapshot.
 * The numbers are illustrative artifacts for a 10 kW R290 air-to-water heat pump, not data from a real project.
 */

export interface Stage {
  id: string;
  title: string;
  short: string;
  agent: string;
  inputs: string[];
  outputs: string[];
  checks: [string, string];
  tools: string;
}

export const STAGES: Stage[] = [
  {
    id: "requirements",
    title: "Requirements",
    short: "spec + test plan",
    agent: "Turns the brief into a numbered spec in which every target has a unit, a test condition and a limit.",
    inputs: [
      "Brief: a 10 kW air-to-water heat pump for a house",
      "Operating point: 7 °C outdoor air, 35 °C water supply (A7/W35)",
      "Constraints: R290 (propane), 240 V single phase, 1.2 × 0.5 × 1.0 m",
    ],
    outputs: ["Spec table with units and limits", "Test plan: one test per requirement", "Risk list: R290 is flammable, so charge limits apply"],
    checks: ["Every requirement has a number and a unit", "Every requirement maps to a test"],
    tools: "LLM with a spec template; a human signs off",
  },
  {
    id: "schematics",
    title: "Schematics",
    short: "P&ID + wiring",
    agent: "Drafts the refrigerant P&ID and the electrical single-line and wiring as graphs, not pictures.",
    inputs: ["Spec table", "Cycle: compressor, condenser, expansion valve, evaporator, reversing valve", "Standards: ISA-5.1 symbols, wire colour rules"],
    outputs: ["P&ID: 14 components, 22 line segments with sizes", "Single-line: supply, breaker, contactor, inverter, fans, controller", "Wire list: 31 conductors with gauge and colour"],
    checks: ["Refrigerant loop closes and safety devices are present", "Electrical rules: every wire ends on a terminal, no net with two drivers"],
    tools: "Graph model plus a rule checker (ERC-style)",
  },
  {
    id: "components",
    title: "Components",
    short: "real parts",
    agent: "Searches catalogs for parts whose datasheet envelope covers each duty.",
    inputs: ["Duties from the P&ID: compressor 3.1 kW electrical input at A7/W35", "Voltage, refrigerant and pressure class", "Preferred suppliers and lead-time limits"],
    outputs: ["BOM with real part numbers", "Per-part envelope table: pressure, temperature, current", "Alternates for single-source parts"],
    checks: ["Operating point sits inside every datasheet envelope", "Every part number resolves in the supplier catalog"],
    tools: "Catalog search APIs and datasheet extraction",
  },
  {
    id: "simulation",
    title: "Simulation",
    short: "COP, current",
    agent: "Runs the refrigerant cycle and the electrical model together and reads the numbers back.",
    inputs: ["P&ID with the chosen components", "Refrigerant property tables (for example CoolProp)", "Operating points: A7/W35, A-7/W35, A2/W45"],
    outputs: ["State points: pressure, temperature, enthalpy at each node", "Heat output, COP and line pressure drops", "Electrical load and inrush current"],
    checks: ["Heat output meets the spec at every operating point", "Energy balance closes within 3% and COP is 35 to 55% of Carnot"],
    tools: "Modelica or a cycle solver, CoolProp, a circuit simulator",
  },
  {
    id: "geometry",
    title: "Geometry",
    short: "CAD kernel",
    agent: "Writes code that places each part, routes tubes and wires, and builds the frame.",
    inputs: ["Part envelopes and port positions", "Pipe sizes and bend rules from the P&ID", "Sheet-metal rules: thickness and bend radius"],
    outputs: ["B-rep assembly exported as STEP", "Routed tube and wire paths", "Part drawings with hole and bend tables"],
    checks: ["Geometry netlist matches the P&ID (layout versus schematic)", "No interference, and everything fits the 1.2 × 0.5 × 1.0 m envelope"],
    tools: "build123d or CadQuery on OpenCascade, plus a routing library",
  },
  {
    id: "dfm",
    title: "DFM / DFA",
    short: "compile-time checks",
    agent: "Runs rule checkers on every generated part and reads the report the way a compiler reads errors.",
    inputs: ["B-rep parts and the assembly", "Shop rules: bend radius at least 2 × OD, wall at least 1.5 mm, hole rim at least 1 × diameter from the edge", "Tool envelopes for fasteners and brazing torches"],
    outputs: ["Report: rule, part, measured, limit, pass or fail", "Machine-readable diagnostics for the agent", "Waiver list for human review"],
    checks: ["DFM: bend radius, wall, hole to edge, flange length", "DFA: tool access and a free insertion path for every part"],
    tools: "Geometry queries on the kernel and collision sweeps",
  },
  {
    id: "assembly",
    title: "Assembly",
    short: "order + animation",
    agent: "Groups parts into subassemblies and finds an order in which every part can be inserted.",
    inputs: ["Geometry that passed the checks", "Subassembly boundaries: fan module, compressor skid, frame", "Fixture and pallet sizes"],
    outputs: ["Subassembly tree with part counts", "Assembly sequence with insertion directions", "Animation and work instructions for the line"],
    checks: ["Sequence has no cycles and each subassembly fits its fixture", "Fastener count and tool changes stay within budget"],
    tools: "Disassembly path planning and sequencing search",
  },
];

export type DefectId = "none" | "bend" | "edge" | "compressor" | "fastener";

export interface Defect {
  id: DefectId;
  label: string;
  stage: number;
  check: 0 | 1;
  retryTo: number;
  diagnostic: string;
  fix: string;
}

export const DEFECTS: Defect[] = [
  { id: "none", label: "Clean run", stage: -1, check: 0, retryTo: -1, diagnostic: "", fix: "" },
  {
    id: "bend",
    label: "Tight tube bend",
    stage: 5,
    check: 0,
    retryTo: 4,
    diagnostic: "DFM FAIL: suction-line bend R18 mm on a 12.7 mm tube. The rule is at least 2 × OD = 25.4 mm.",
    fix: "Diagnostics return to the geometry stage. The agent re-routes the tube with R26 mm and regenerates the assembly.",
  },
  {
    id: "edge",
    label: "Hole near the edge",
    stage: 5,
    check: 0,
    retryTo: 4,
    diagnostic: "DFM FAIL: bracket hole rim is 2.1 mm from the plate edge. The rule is at least 1 × diameter = 6.5 mm.",
    fix: "The agent moves the hole 5 mm inward, regenerates the bracket and runs the checks again.",
  },
  {
    id: "compressor",
    label: "Undersized compressor",
    stage: 3,
    check: 0,
    retryTo: 2,
    diagnostic: "SIM FAIL: heat output is 8.1 kW at 7 °C outdoor air. The spec says 10 kW.",
    fix: "The result goes back to component selection. The agent picks the next compressor size (3.1 to 4.0 kW input) and re-simulates. No geometry existed yet, so nothing is redone.",
  },
  {
    id: "fastener",
    label: "Hidden fastener (DFA)",
    stage: 5,
    check: 1,
    retryTo: 4,
    diagnostic: "DFA FAIL: the fan-bracket M6 screw has no tool path. A socket and extension need 40 mm on the screw axis and the coil leaves 12 mm.",
    fix: "The agent adds a 25 mm access hole in the coil end plate, regenerates, and the sweep is checked again.",
  },
];

export type CheckResult = "pass" | "fail" | "skipped";
export type Event =
  | { kind: "enter"; stage: number; text: string }
  | { kind: "check"; stage: number; check: 0 | 1; result: CheckResult; text: string }
  | { kind: "retry"; from: number; to: number; text: string }
  | { kind: "done"; text: string }
  | { kind: "escape"; text: string };

const DFA_STAGE = 5;
const DFA_CHECK = 1;

/** The ordered events of one run. `dfa` is false when nobody wrote the assembly-access check. */
export function buildScript(defectId: DefectId, dfa: boolean): Event[] {
  const defect = DEFECTS.find((d) => d.id === defectId) ?? DEFECTS[0];
  const events: Event[] = [];
  const escapes = defect.id === "fastener" && !dfa;
  const enter = (s: number, retry = false): Event => ({
    kind: "enter",
    stage: s,
    text: `${retry ? "Retry. " : ""}Stage ${s + 1}: ${STAGES[s].title}. ${STAGES[s].agent}`,
  });
  const passing = (s: number, c: 0 | 1): Event => {
    if (!dfa && s === DFA_STAGE && c === DFA_CHECK) {
      return { kind: "check", stage: s, check: c, result: "skipped", text: "DFA check not written: nothing verifies that a tool can reach each fastener." };
    }
    return { kind: "check", stage: s, check: c, result: "pass", text: `Passed: ${STAGES[s].checks[c]}.` };
  };

  for (let s = 0; s < STAGES.length; s++) {
    events.push(enter(s));
    for (const c of [0, 1] as const) {
      const bad = defect.id !== "none" && !escapes && defect.stage === s && defect.check === c;
      if (!bad) {
        events.push(passing(s, c));
        continue;
      }
      events.push({ kind: "check", stage: s, check: c, result: "fail", text: defect.diagnostic });
      events.push({ kind: "retry", from: s, to: defect.retryTo, text: defect.fix });
      for (let r = defect.retryTo; r <= s; r++) {
        events.push(enter(r, true));
        events.push(passing(r, 0));
        events.push(passing(r, 1));
      }
      break;
    }
  }
  const skipped = dfa ? 0 : 1;
  events.push({
    kind: "done",
    text: `Released: ${STAGES.length * 2 - skipped} checks passed${skipped ? ", 1 not written" : ""}. Subassemblies and assembly order are ready for the line.`,
  });
  if (escapes) {
    events.push({
      kind: "escape",
      text: "Shop floor: the operator cannot reach the fan screw. Every DFM rule passed and nothing asked whether a tool can get to it, so the fix now costs a drawing change plus rework.",
    });
  }
  return events;
}

export type StageState = "idle" | "active" | "pass" | "fail";
export type CheckState = "idle" | "pass" | "fail" | "skipped";
export type Tone = "info" | "ok" | "bad" | "warn";

export interface Snapshot {
  active: number | null;
  stages: StageState[];
  checks: CheckState[][];
  loop: { from: number; to: number } | null;
  message: string;
  tone: Tone;
  log: Array<{ text: string; tone: Tone }>;
  finished: boolean;
  escaped: boolean;
}

/** Replays events 0..index and returns what the diagram should show. */
export function snapshotAt(events: Event[], index: number): Snapshot {
  const stages: StageState[] = STAGES.map(() => "idle");
  const checks: CheckState[][] = STAGES.map(() => ["idle", "idle"]);
  const snap: Snapshot = { active: null, stages, checks, loop: null, message: "Ready.", tone: "info", log: [], finished: false, escaped: false };
  const last = Math.min(index, events.length - 1);
  for (let k = 0; k <= last; k++) {
    const e = events[k];
    if (e.kind === "enter") {
      stages[e.stage] = "active";
      checks[e.stage] = ["idle", "idle"];
      snap.active = e.stage;
      snap.loop = null;
      snap.tone = "info";
    } else if (e.kind === "check") {
      checks[e.stage][e.check] = e.result;
      if (e.result === "fail") stages[e.stage] = "fail";
      else if (e.check === 1) stages[e.stage] = "pass";
      snap.tone = e.result === "fail" ? "bad" : e.result === "skipped" ? "warn" : "ok";
    } else if (e.kind === "retry") {
      snap.loop = { from: e.from, to: e.to };
      for (let s = e.to; s < e.from; s++) {
        stages[s] = "idle";
        checks[s] = ["idle", "idle"];
      }
      snap.tone = "warn";
    } else if (e.kind === "done") {
      snap.active = null;
      snap.finished = true;
      snap.tone = "ok";
    } else {
      snap.escaped = true;
      snap.tone = "bad";
    }
    snap.message = e.text;
    snap.log.push({ text: e.text, tone: snap.tone });
  }
  return snap;
}
