# Components in Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the PCB-track lesson `components-in-action`: an eight-station, live-calculating tour of the robot's motor-driver board that teaches Ohm's law, KCL, KVL, power dissipation, the voltage divider and Thevenin, the RC time constant, decoupling and the right-hand rule on real parts.

**Architecture:** A pure physics model in `src/lib/sim/board.ts` feeds a `BoardInAction` visualization made of a board top view (reusing the KiCad lesson's board data and footprints), a station panel with a mini schematic and live readouts, and a probe mode where any part can be selected. The lesson body, data and references follow the existing PCB lesson pattern; the registry generator wires the route.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Vitest + jsdom + Testing Library, inline SVG only.

**Spec:** `docs/superpowers/specs/2026-10-17-components-in-action-design.md`

## Global Constraints

- Lesson bodies are `"use client"` React components with sections `id="theory"`, `id="viz"`, `id="practice"`; theory prose 700 to 1200 words (measured as in `tests/content/pcb-a.test.tsx`).
- Every number derived from `Math.exp`, `log`, `sqrt`, `pow`, `hypot` or trig must be rounded (`r2` for coordinates, `r6` for model outputs) before it reaches markup (`tests/hydration-stability.test.tsx` nudges those functions by 1e-14 and requires identical markup).
- Controls are the existing `Slider`, `Segmented`, `Toggle`, `Stepper`, `PlayPause` from `@/components/lesson`; SVGs go through `SvgCanvas`; readouts use `Stat` from `OhmsLawCircuit.helpers`.
- An SVG that contains focusable buttons is `role="group"`, never the default `role="img"`.
- Quiz questions: four distinct choices, answers spread across slots, explanations over 40 characters; the correct choice is the single longest in at most 2 of the lesson's 8 questions and the single shortest in none.
- Lesson data: at least 5 unique key terms (defs over 20 chars), scenario with at least 2 symptoms and 2 hints, at least 4 interview questions including one `deep`, each answer 3 to 6 sentences.
- References: every lesson cites at least two ids that exist; urls start with `https://`; dois match `^10\.\d{4,9}\/\S+$`.
- Content style: plain words, short sentences, a practical example first, then the rule, then the numbers; name the source for every quoted figure.
- Work in the worktree `/Users/vatsalpatel/Projects/hardware-academy/.claude/worktrees/components-in-action` on branch `claude/components-in-action`; never `git checkout` in the shared checkout; start each shell command with `cd` to the worktree.
- Commit after each task with a one-line imperative subject and the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/sim/board.ts` (create) | Pure physics: constants, `BoardInputs`, eight station functions, `boardModel` |
| `src/lib/sim/index.ts` (modify) | Re-export `./board` |
| `src/components/viz/pcb/BoardInAction.board.ts` (create) | Rev B parts, IO35 pad, Rev B nets, `STATIONS` table, `PART_ROLES` table, flow geometry |
| `src/components/viz/pcb/RightHandRule.tsx` (create) | Coil and straight-trace right-hand-rule drawings |
| `src/components/viz/pcb/BoardInAction.view.tsx` (create) | `BoardTopView`: board, routes, footprints, glow, dots, part buttons |
| `src/components/viz/pcb/BoardInAction.panels.tsx` (create) | Eight station panels: mini schematic, readouts, controls |
| `src/components/viz/pcb/BoardInAction.tsx` (create) | Container: state, layout, `Stepper`, probe card |
| `src/content/pcb/components-in-action.data.ts` (create) | Key terms, scenario, interview, quiz |
| `src/content/pcb/components-in-action.tsx` (create) | Lesson body: theory + figure, viz, practice |
| `src/lib/curriculum.ts` (modify) | Lesson entry and day 4 |
| `src/lib/references.ts` (modify) | Four new references and the lesson's citation list |
| `src/content/pcb/passive-components.tsx`, `active-components.tsx` (modify) | One-line cross-link callout each |
| `src/content/registry.ts`, `src/content/bodies.ts`, `src/app/learn/pcb/components-in-action/page.tsx` (generated) | `node scripts/gen-registry.mts` |
| `tests/sim/board.test.ts`, `tests/components/board-in-action.test.tsx`, `tests/content/pcb-c.test.tsx` (create); `tests/curriculum.test.ts` (modify) | Tests |

---

### Task 1: The board physics model

**Files:**
- Create: `src/lib/sim/board.ts`
- Modify: `src/lib/sim/index.ts`
- Test: `tests/sim/board.test.ts`

**Interfaces:**
- Produces: `BoardInputs`, `LedColor`, `BOARD_DEFAULTS`, `BOARD`, `traceResistance`, `fetStation`, `kclStation`, `ldoStation`, `ledStation`, `dividerStation`, `enStation`, `decouplingStation`, `windingStation`, `boardModel`, `BoardModel` (exact signatures below). Every later task consumes `boardModel(inputs)`.

- [ ] **Step 1: Write the failing tests**

```ts
// tests/sim/board.test.ts
import { describe, it, expect } from "vitest";
import {
  BOARD_DEFAULTS,
  boardModel,
  decouplingStation,
  dividerStation,
  enStation,
  fetStation,
  kclStation,
  ledStation,
  ldoStation,
  traceResistance,
  windingStation,
} from "@/lib/sim/board";

const stalled = { ...BOARD_DEFAULTS, iMotorL: 1.5, iMotorR: 1.5 };
const fullPack = { ...BOARD_DEFAULTS, vPack: 8.4 };

describe("board model: power in (Ohm's law on the FET and the copper)", () => {
  it("adds the motors and the regulator's input current into the pack current", () => {
    expect(fetStation(BOARD_DEFAULTS).iPack).toBeCloseTo(1.155, 6);
    expect(fetStation(stalled).iPack).toBeCloseTo(3.155, 6);
  });
  it("50 mΩ at 3.155 A drops 0.158 V and makes 0.498 W", () => {
    const s = fetStation(stalled);
    expect(s.vFet).toBeCloseTo(0.15775, 5);
    expect(s.pFet).toBeCloseTo(0.4977, 3);
  });
  it("a 13 mm, 1.5 mm, 1 oz trace is about 4.2 mΩ", () => {
    expect(traceResistance(13, 1.5)).toBeCloseTo(0.00416, 5);
    expect(fetStation(stalled).vTrace).toBeCloseTo(0.0131, 3);
  });
});

describe("board model: KCL at the VM node", () => {
  it("the pack current is the sum of the branch currents", () => {
    const s = kclStation(BOARD_DEFAULTS);
    expect(s.iMotors).toBeCloseTo(1.0, 9);
    expect(s.iLdoIn).toBeCloseTo(0.155, 9);
    expect(s.iPack).toBeCloseTo(s.iMotors + s.iLdoIn, 12);
  });
  it("a 1.5 A, 10 µs start step droops 100 µF by 0.15 V", () => {
    expect(kclStation(BOARD_DEFAULTS).droopV).toBeCloseTo(0.15, 6);
  });
});

describe("board model: the regulator's heat", () => {
  it("8.4 V to 3.3 V at 150 mA is 0.807 W with the 5 mA ground current, 73 °C junction", () => {
    const s = ldoStation(fullPack);
    expect(s.pLdo).toBeCloseTo(0.807, 3);
    expect(s.tj).toBeCloseTo(73.4, 1);
    expect(s.verdict).toBe("fine");
  });
  it("400 mA of Wi-Fi at a full pack reaches thermal shutdown; a buck would waste a tenth", () => {
    const s = ldoStation({ ...fullPack, iLogic: 0.4 });
    expect(s.tj).toBeGreaterThan(150);
    expect(s.verdict).toBe("shutdown");
    expect(s.pBuck).toBeCloseTo((3.3 * 0.4 * (1 / 0.9 - 1)), 6);
  });
  it("is 'hot' between 100 and 150 °C", () => {
    expect(ldoStation({ ...fullPack, iLogic: 0.25 }).verdict).toBe("hot");
  });
});

describe("board model: KVL around the LED", () => {
  it("red LED through 1 kΩ on 3.3 V: 1.3 mA, and the loop sums to zero", () => {
    const s = ledStation(BOARD_DEFAULTS);
    expect(s.iLed).toBeCloseTo(0.0013, 9);
    expect(s.kvl.rise - s.kvl.dropR - s.kvl.dropLed).toBeCloseTo(0, 12);
    expect(s.verdict).toBe("ok");
  });
  it("a blue LED leaves 0.3 V across the resistor: 0.3 mA, dim", () => {
    const s = ledStation({ ...BOARD_DEFAULTS, ledColor: "blue" });
    expect(s.iLed).toBeCloseTo(0.0003, 9);
    expect(s.verdict).toBe("dim");
  });
  it("220 Ω with a red LED asks 5.9 mA, still fine; 47 Ω would be too much", () => {
    expect(ledStation({ ...BOARD_DEFAULTS, ledR: 220 }).iLed).toBeCloseTo(0.00591, 5);
    expect(ledStation({ ...BOARD_DEFAULTS, ledR: 47 }).verdict).toBe("too much");
  });
});

describe("board model: the battery divider and Thevenin", () => {
  it("8.4 V across 100 k over 47 k gives 2.686 V behind 32 kΩ, 57 µA, 3333 counts", () => {
    const s = dividerStation(fullPack);
    expect(s.vOut).toBeCloseTo(2.6857, 4);
    expect(s.rth).toBeCloseTo(31972.8, 0);
    expect(s.iDiv * 1e6).toBeCloseTo(57.1, 1);
    expect(s.counts).toBe(3333);
    expect(s.verdict).toBe("ok");
    expect(s.rechargeMs).toBeCloseTo(3.2, 1);
  });
  it("without C9 the sampling capacitor needs 2.65 µs to settle and the verdict is 'loaded'", () => {
    const s = dividerStation({ ...fullPack, dividerCap: false });
    expect(s.settleUs).toBeCloseTo(2.65, 2);
    expect(s.verdict).toBe("loaded");
  });
});

describe("board model: the EN time constant", () => {
  it("10 kΩ and 1 µF: τ = 10 ms, 75% at 13.9 ms, curve ends near 3.3 V", () => {
    const s = enStation(BOARD_DEFAULTS);
    expect(s.tau).toBeCloseTo(0.01, 12);
    expect(s.tBoot * 1e3).toBeCloseTo(13.86, 2);
    expect(s.samples).toHaveLength(41);
    expect(s.samples[0]).toBe(0);
    expect(s.samples[40]).toBeCloseTo(3.3 * (1 - Math.exp(-5)), 5);
  });
  it("scales with the capacitor", () => {
    expect(enStation({ ...BOARD_DEFAULTS, enC: 100e-9 }).tBoot * 1e3).toBeCloseTo(1.386, 3);
    expect(enStation({ ...BOARD_DEFAULTS, enC: 10e-6 }).tBoot * 1e3).toBeCloseTo(138.6, 1);
  });
});

describe("board model: decoupling, V = L·di/dt", () => {
  it("2 mm is 2.5 nH and 62.5 mV; 10 mm is 10.5 nH and 263 mV", () => {
    const near = decouplingStation(BOARD_DEFAULTS);
    expect(near.loopH).toBeCloseTo(2.5e-9, 15);
    expect(near.vDip).toBeCloseTo(0.0625, 6);
    expect(near.verdict).toBe("ok");
    const far = decouplingStation({ ...BOARD_DEFAULTS, decouplingMm: 10 });
    expect(far.vDip).toBeCloseTo(0.2625, 6);
    expect(far.verdict).toBe("marginal");
    expect(decouplingStation({ ...BOARD_DEFAULTS, decouplingMm: 30 }).verdict).toBe("bad");
  });
});

describe("board model: the motor winding", () => {
  it("0.5 A gives 20 µT at 5 mm from the trace, 89 mA of ripple at 60% duty, 4.44 V average", () => {
    const s = windingStation(BOARD_DEFAULTS);
    expect(s.bTraceUt).toBeCloseTo(20, 6);
    expect(s.earthRatio).toBeCloseTo(0.4, 6);
    expect(s.rippleA).toBeCloseTo(0.0888, 4);
    expect(s.vAvg).toBeCloseTo(4.44, 6);
    expect(s.direction).toBe("forward");
  });
  it("flyback: 1 A falling in 100 ns through 1 mH wants 10 kV; the body diode clamps at VM + 0.7", () => {
    const s = windingStation(BOARD_DEFAULTS);
    expect(s.flybackV).toBeCloseTo(10000, 6);
    expect(s.clampV).toBeCloseTo(8.1, 6);
  });
  it("reverse flips the direction and nothing else", () => {
    const f = windingStation(BOARD_DEFAULTS);
    const r = windingStation({ ...BOARD_DEFAULTS, forward: false });
    expect(r.direction).toBe("reverse");
    expect(r.bTraceUt).toBe(f.bTraceUt);
  });
});

describe("boardModel", () => {
  it("bundles the eight stations", () => {
    const m = boardModel(BOARD_DEFAULTS);
    expect(Object.keys(m).sort()).toEqual(["decoupling", "divider", "en", "fet", "kcl", "led", "ldo", "winding"]);
    expect(m.fet.iPack).toBe(m.kcl.iPack);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd /Users/vatsalpatel/Projects/hardware-academy/.claude/worktrees/components-in-action && npx vitest run tests/sim/board.test.ts`
Expected: FAIL, cannot resolve `@/lib/sim/board`.

- [ ] **Step 3: Write the model**

```ts
// src/lib/sim/board.ts
/**
 * Physics of the course robot's motor-driver board (the KiCad lesson's board, "Rev B" with a battery divider), for the
 * components-in-action lesson. Pure functions: one BoardInputs object in, SI numbers out, no rounding here. Only the EN
 * curve uses a transcendental function (exp) and its samples are rounded to 1e-6 so server and client markup agree.
 * Figures come from the course lessons and the parts' datasheets; each is named once in BOARD.
 */

export type LedColor = "red" | "green" | "blue";

export interface BoardInputs {
  /** pack voltage, 6.0 to 8.4 V for the 2S Li-ion pack */
  vPack: number;
  /** left motor current, A */
  iMotorL: number;
  /** right motor current, A */
  iMotorR: number;
  /** current drawn from the 3.3 V rail by the ESP32, sensors and driver logic, A */
  iLogic: number;
  ledColor: LedColor;
  /** R3, ohms */
  ledR: number;
  /** C8, farads */
  enC: number;
  /** distance from the decoupling capacitor to the pin, mm */
  decouplingMm: number;
  /** PWM duty on the left motor, 0 to 1 */
  duty: number;
  /** left motor direction */
  forward: boolean;
  /** C9 fitted at the ADC pin */
  dividerCap: boolean;
}

export const BOARD = {
  /** Q1 AO3401A with the full pack on its gate (datasheet: 50 mΩ max at −10 V, 65 mΩ at −4.5 V) */
  rdsOn: 0.05,
  /** the VM trace from Q1 to the TB6612FNG: route length and the KiCad lesson's 1.5 mm Motor net class, 1 oz copper */
  vmTraceMm: 13,
  vmTraceWidthMm: 1.5,
  copperRho: 1.68e-8, // Ω·m
  ozThicknessM: 35e-6,
  /** AMS1117-3.3 (Advanced Monolithic Systems datasheet): ground current about 5 mA; θJA 60 °C/W on a modest pad */
  ldoVout: 3.3,
  ldoIq: 0.005,
  ldoThetaJa: 60,
  ambientC: 25,
  shutdownC: 150,
  buckEfficiency: 0.9,
  /** LED forward voltages at a few mA: red and yellow about 2.0 V, green 2.2 V, blue and white about 3.0 V */
  ledVf: { red: 2.0, green: 2.2, blue: 3.0 } as Record<LedColor, number>,
  /** an ESP32 pin at its default drive strength (ESP-IDF drive capability 2) is good for about 20 mA */
  gpioMaxA: 0.02,
  ledDimA: 0.001,
  /** battery divider (the robot firmware's 147/47 ratio) and the ADC it feeds */
  divR1: 100e3,
  divR2: 47e3,
  divC: 100e-9,
  adcCounts: 4095,
  adcVref: 3.3,
  /** a typical SAR input: a few picofarads sampled briefly; 12-bit settling takes ln(4096) ≈ 8.3 time constants */
  adcSampleF: 10e-12,
  adcSettleTaus: 8.3,
  adcRuleOhm: 10e3,
  /** EN (CHIP_PU): R2 10 kΩ to 3V3, C8 to ground; the ESP32 datasheet puts the high threshold at 0.75 × VDD */
  enR: 10e3,
  enThreshold: 0.75,
  ln4: 1.3862943611198906,
  /** decoupling: about 1 nH per mm of thin trace plus the capacitor's own ESL; a 50 mA step in 2 ns (integrity lesson) */
  nhPerMm: 1,
  capEslH: 0.5e-9,
  stepA: 0.05,
  stepS: 2e-9,
  railTolerance: 0.1,
  /** N20 motor winding: 4 Ω (actuators lesson) and about 1 mH, typical for a 12 mm brushed motor; 20 kHz PWM */
  motorR: 4,
  motorL: 1e-3,
  pwmHz: 20e3,
  /** µ0 / 2π, the field a distance r from a long straight wire is (µ0 / 2π) · I / r */
  mu0Over2Pi: 2e-7,
  fieldAtM: 0.005,
  earthFieldT: 50e-6,
  /** flyback example: the current falls from 1 A to zero in 100 ns */
  flybackDiA: 1,
  flybackDtS: 100e-9,
  diodeDropV: 0.7,
  /** TB6612FNG: about 0.5 V at 1 A per channel, modelled as 0.5 Ω */
  driverOhm: 0.5,
  /** start-up step used for the bulk-capacitor droop figure */
  startStepA: 1.5,
  startStepS: 10e-6,
  bulkF: 100e-6,
} as const;

export const BOARD_DEFAULTS: BoardInputs = {
  vPack: 7.4,
  iMotorL: 0.5,
  iMotorR: 0.5,
  iLogic: 0.15,
  ledColor: "red",
  ledR: 1000,
  enC: 1e-6,
  decouplingMm: 2,
  duty: 0.6,
  forward: true,
  dividerCap: true,
};

/** Resistance of a copper trace, ohms. */
export function traceResistance(lengthMm: number, widthMm: number, ozCopper = 1): number {
  return (BOARD.copperRho * lengthMm * 1e-3) / (widthMm * 1e-3 * BOARD.ozThicknessM * ozCopper);
}

export function fetStation(i: BoardInputs) {
  const iPack = i.iMotorL + i.iMotorR + i.iLogic + BOARD.ldoIq;
  const rTrace = traceResistance(BOARD.vmTraceMm, BOARD.vmTraceWidthMm);
  return { iPack, vFet: iPack * BOARD.rdsOn, pFet: iPack * iPack * BOARD.rdsOn, rTrace, vTrace: iPack * rTrace };
}

export function kclStation(i: BoardInputs) {
  const iMotors = i.iMotorL + i.iMotorR;
  const iLdoIn = i.iLogic + BOARD.ldoIq;
  return { iMotors, iLdoIn, iPack: iMotors + iLdoIn, droopV: (BOARD.startStepA * BOARD.startStepS) / BOARD.bulkF };
}

export type LdoVerdict = "fine" | "hot" | "shutdown";

export function ldoStation(i: BoardInputs) {
  const pLdo = (i.vPack - BOARD.ldoVout) * i.iLogic + i.vPack * BOARD.ldoIq;
  const tj = BOARD.ambientC + BOARD.ldoThetaJa * pLdo;
  const verdict: LdoVerdict = tj >= BOARD.shutdownC ? "shutdown" : tj >= 100 ? "hot" : "fine";
  const pBuck = BOARD.ldoVout * i.iLogic * (1 / BOARD.buckEfficiency - 1);
  return { pLdo, tj, verdict, pBuck };
}

export type LedVerdict = "dim" | "ok" | "too much";

export function ledStation(i: BoardInputs) {
  const vf = BOARD.ledVf[i.ledColor];
  const iLed = Math.max(0, (BOARD.ldoVout - vf) / i.ledR);
  const verdict: LedVerdict = iLed > BOARD.gpioMaxA ? "too much" : iLed < BOARD.ledDimA ? "dim" : "ok";
  return { vf, iLed, pR: iLed * iLed * i.ledR, verdict, kvl: { rise: BOARD.ldoVout, dropR: iLed * i.ledR, dropLed: iLed > 0 ? vf : BOARD.ldoVout } };
}

export type DividerVerdict = "ok" | "loaded";

export function dividerStation(i: BoardInputs) {
  const vOut = (i.vPack * BOARD.divR2) / (BOARD.divR1 + BOARD.divR2);
  const rth = (BOARD.divR1 * BOARD.divR2) / (BOARD.divR1 + BOARD.divR2);
  const iDiv = i.vPack / (BOARD.divR1 + BOARD.divR2);
  const counts = Math.round((vOut / BOARD.adcVref) * BOARD.adcCounts);
  const settleUs = BOARD.adcSettleTaus * rth * BOARD.adcSampleF * 1e6;
  const rechargeMs = rth * BOARD.divC * 1e3;
  const verdict: DividerVerdict = i.dividerCap || rth <= BOARD.adcRuleOhm ? "ok" : "loaded";
  return { vOut, rth, iDiv, counts, settleUs, rechargeMs, verdict };
}

const EN_SAMPLES = 40;

export function enStation(i: BoardInputs) {
  const tau = BOARD.enR * i.enC;
  const vdd = BOARD.ldoVout;
  const samples = Array.from({ length: EN_SAMPLES + 1 }, (_, k) => {
    const v = vdd * (1 - Math.exp(-(5 * k) / EN_SAMPLES));
    return Math.round(v * 1e6) / 1e6 + 0;
  });
  return { tau, tBoot: tau * BOARD.ln4, threshold: vdd * BOARD.enThreshold, samples };
}

export type DecouplingVerdict = "ok" | "marginal" | "bad";

export function decouplingStation(i: BoardInputs) {
  const loopH = BOARD.nhPerMm * 1e-9 * i.decouplingMm + BOARD.capEslH;
  const vDip = (loopH * BOARD.stepA) / BOARD.stepS;
  const budget = BOARD.ldoVout * BOARD.railTolerance;
  const verdict: DecouplingVerdict = vDip <= budget / 2 ? "ok" : vDip <= budget ? "marginal" : "bad";
  return { loopH, vDip, budget, verdict };
}

export function windingStation(i: BoardInputs) {
  const iAvg = i.iMotorL;
  const bTraceT = (BOARD.mu0Over2Pi * iAvg) / BOARD.fieldAtM;
  return {
    iAvg,
    vAvg: i.duty * i.vPack,
    rippleA: (i.vPack * i.duty * (1 - i.duty)) / (BOARD.motorL * BOARD.pwmHz),
    bTraceUt: bTraceT * 1e6,
    earthRatio: bTraceT / BOARD.earthFieldT,
    flybackV: (BOARD.motorL * BOARD.flybackDiA) / BOARD.flybackDtS,
    clampV: i.vPack + BOARD.diodeDropV,
    pDriver: 2 * iAvg * iAvg * BOARD.driverOhm,
    direction: i.forward ? ("forward" as const) : ("reverse" as const),
  };
}

export function boardModel(i: BoardInputs) {
  return {
    fet: fetStation(i),
    kcl: kclStation(i),
    ldo: ldoStation(i),
    led: ledStation(i),
    divider: dividerStation(i),
    en: enStation(i),
    decoupling: decouplingStation(i),
    winding: windingStation(i),
  };
}

export type BoardModel = ReturnType<typeof boardModel>;
```

Add `export * from "./board";` to `src/lib/sim/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/sim/board.test.ts`
Expected: PASS, 22 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sim/board.ts src/lib/sim/index.ts tests/sim/board.test.ts
git commit -m "Add the motor-driver board physics model for the components-in-action lesson"
```

---

### Task 2: Rev B board data, the station table and the part roles

**Files:**
- Create: `src/components/viz/pcb/BoardInAction.board.ts`
- Test: `tests/components/board-in-action.test.tsx` (first describe block; the file grows in Tasks 4 to 6)

**Interfaces:**
- Consumes: `Part`, `Net`, `Pt`, `parts`, `nets`, `partBox` from `./SchematicToLayoutBoard`; `BoardModel`, `BoardInputs` from `@/lib/sim/board`.
- Produces:

```ts
export const IO35_PAD: Pt;                   // [36.7, 29.0]
export const revBParts: Part[];              // R4, R5, C9 (zone "logic")
export const revBNets: Net[];                // VBAT_SENSE_FEED, VBAT_SENSE, VBAT_SENSE_GND
export const allParts: Part[];               // parts + revBParts
export const allNets: Net[];                 // nets + revBNets
export type StationId = "fet" | "kcl" | "ldo" | "led" | "divider" | "en" | "decoupling" | "winding";
export type ControlId = "iMotorL" | "iMotorR" | "iLogic" | "vPack" | "ledColor" | "ledR" | "enC" | "decouplingMm" | "duty" | "forward" | "dividerCap";
export interface Flow { id: string; pts: Pt[]; current: (m: BoardModel) => number; referenceA: number; color?: string; }
export interface Station { id: StationId; title: string; law: string; parts: string[]; nets: string[]; flows: Flow[]; controls: ControlId[]; }
export const STATIONS: Station[];            // eight, in lesson order
export interface PartRole { role: string; station?: StationId; readings: (m: BoardModel, i: BoardInputs) => Array<{ label: string; value: string }>; }
export const PART_ROLES: Record<string, PartRole>;  // one entry per non-hole part, 28 keys
export const FLOW_DOT_SPACING_PX = 24;
```

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/components/board-in-action.test.tsx (start of the file)
import { describe, it, expect } from "vitest";
import { parts, partBox, nets, connectorPins } from "@/components/viz/pcb/SchematicToLayoutBoard";
import { allNets, allParts, IO35_PAD, PART_ROLES, revBNets, revBParts, STATIONS } from "@/components/viz/pcb/BoardInAction.board";
import { BOARD_DEFAULTS, boardModel } from "@/lib/sim/board";

const overlaps = (a: ReturnType<typeof partBox>, b: ReturnType<typeof partBox>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe("Rev B board data", () => {
  it("adds R4, R5 and C9 without overlapping any existing part", () => {
    expect(revBParts.map((p) => p.ref)).toEqual(["R4", "R5", "C9"]);
    for (const p of revBParts) for (const q of parts) expect(overlaps(partBox(p), partBox(q)), `${p.ref} vs ${q.ref}`).toBe(false);
    expect(allParts).toHaveLength(parts.length + 3);
    expect(allNets).toHaveLength(nets.length + revBNets.length);
  });
  it("the divider nets start on the VM trace and end on the IO35 pad", () => {
    const feed = revBNets.find((n) => n.id === "VBAT_SENSE_FEED")!;
    expect(feed.routes[0].pts[0]).toEqual([15.0, 26.75]);
    const node = revBNets.find((n) => n.id === "VBAT_SENSE")!;
    expect(node.taps.some((t) => t.ref === "U1" && t.pin === "IO35")).toBe(true);
    expect(node.routes.some((r) => r.pts[r.pts.length - 1][0] === IO35_PAD[0] && r.pts[r.pts.length - 1][1] === IO35_PAD[1])).toBe(true);
  });
  it("every station names real parts and real nets", () => {
    const refs = new Set(allParts.map((p) => p.ref));
    const netIds = new Set(allNets.map((n) => n.id));
    expect(STATIONS.map((s) => s.id)).toEqual(["fet", "kcl", "ldo", "led", "divider", "en", "decoupling", "winding"]);
    for (const s of STATIONS) {
      for (const r of s.parts) expect(refs.has(r), `${s.id}: ${r}`).toBe(true);
      for (const n of s.nets) expect(netIds.has(n), `${s.id}: ${n}`).toBe(true);
      expect(s.controls.length).toBeGreaterThan(0);
    }
  });
  it("every part except the mounting holes has a role with readings", () => {
    const m = boardModel(BOARD_DEFAULTS);
    const expected = allParts.filter((p) => p.kind !== "hole").map((p) => p.ref).sort();
    expect(Object.keys(PART_ROLES).sort()).toEqual(expected);
    for (const [ref, role] of Object.entries(PART_ROLES)) {
      expect(role.role.length, ref).toBeGreaterThan(20);
      for (const r of role.readings(m, BOARD_DEFAULTS)) expect(r.value, `${ref}: ${r.label}`).not.toMatch(/NaN|undefined/);
    }
  });
  it("J1 still has two pins (the shared board data is untouched)", () => {
    expect(connectorPins(parts.find((p) => p.ref === "J1")!)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/components/board-in-action.test.tsx`
Expected: FAIL, cannot resolve `BoardInAction.board`.

- [ ] **Step 3: Write the data file**

Geometry (millimetres, from the spec section 3): R4 at (26.5, 31.2) 2.4 × 1.2 horizontal (pads 25.84 and 27.16); R5 at (29.3, 31.2) (pads 28.64 and 29.96); C9 at (29.3, 32.6) (pads 28.64 and 29.96); IO35 pad [36.7, 29.0].

```ts
export const revBNets: Net[] = [
  { id: "VBAT_SENSE_FEED", label: "VM to R4", cls: "signal",
    taps: [{ ref: "R4", pin: "1", at: [25.84, 31.2] }],
    routes: [{ layer: "F", pts: [[15.0, 26.75], [15.0, 34.2], [25.84, 34.2], [25.84, 31.2]] }], vias: [] },
  { id: "VBAT_SENSE", label: "VBAT_SENSE (IO35)", cls: "signal",
    taps: [{ ref: "R4", pin: "2", at: [27.16, 31.2] }, { ref: "R5", pin: "1", at: [28.64, 31.2] }, { ref: "C9", pin: "1", at: [28.64, 32.6] }, { ref: "U1", pin: "IO35", at: [36.7, 29.0] }],
    routes: [
      { layer: "F", pts: [[27.16, 31.2], [28.64, 31.2]] },
      { layer: "F", pts: [[28.64, 31.2], [28.64, 32.6]] },
      { layer: "F", pts: [[27.9, 31.2], [27.9, 30.1], [36.7, 30.1], [36.7, 29.0]] },
    ], vias: [] },
  { id: "VBAT_SENSE_GND", label: "GND", cls: "signal",
    taps: [{ ref: "R5", pin: "2", at: [29.96, 31.2] }, { ref: "C9", pin: "2", at: [29.96, 32.6] }],
    routes: [{ layer: "F", pts: [[29.96, 31.2], [29.96, 33.2]] }], vias: [[29.96, 33.2]] },
];
```

Flows per station (`pts` in mm; the view converts with `bx`/`by`):

| Station | Flow id | Points | current | referenceA |
|---|---|---|---|---|
| fet | pack | [4.8,26.75] [9.8,26.75] [12.2,26.75] [13,26.75] [13,21] [18.4,21] [18.4,20] | `m.fet.iPack` | 1 |
| kcl | pack | [4.8,26.75] [13,26.75] | `m.kcl.iPack` | 1 |
| kcl | motors | [13,26.75] [13,21] [18.4,21] [18.4,20] | `m.kcl.iMotors` | 1 |
| kcl | ldo | [13,26.75] [16.9,26.75] | `m.kcl.iLdoIn` | 1 |
| ldo | in | [13,26.75] [16.9,26.75] | `m.kcl.iLdoIn` | 0.3 |
| ldo | out | [23.2,29.05] [33.9,29.05] [33.9,27.6] [34.5,27.6] | `i.iLogic` (= `m.kcl.iLdoIn − 0.005`) | 0.3 |
| led | rail | [23.2,29.05] [33.9,29.05] [33.9,27.6] [34.5,27.6] | `m.led.iLed` | 0.002 |
| divider | feed | [15,26.75] [15,34.2] [25.84,34.2] [25.84,31.2] | `m.divider.iDiv` | 50e-6 |
| divider | node | [27.9,31.2] [27.9,30.1] [36.7,30.1] [36.7,29.0] | `m.divider.iDiv` (shown at a tenth: `/10`) | 50e-6 |
| en | rail | same as led rail | `0.0003` (the pull-up's charging current at t = 0 is 3.3 / 10 k) | 0.001 |
| decoupling | rail | same as led rail | `i.iLogic` | 0.3 |
| winding | out | forward: [19,11] [19,9.6] [17.3,7.9] [17.3,5.4]; reverse: the M1B path | `m.winding.iAvg` | 1 |
| winding | back | forward: [19.3,5.4] [19.3,8.3] [20.6,9.6] [20.6,11]; reverse: M1A reversed | `m.winding.iAvg` | 1 |

Each station's `parts`, `nets` and `controls` come from the spec's station table (section 5). `PART_ROLES` has 28 entries; roles are one or two plain sentences; readings are two to four label/value pairs formatted with `formatSI` from `./OhmsLawCircuit.helpers` (R1: current `vPack / 100 k`, power; C1: start-step droop; U2: both motor currents and `pDriver`; J4 to J7, SW1, C5: readings from the rail they sit on, for example "3.3 V rail" and the logic current).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/components/board-in-action.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/viz/pcb/BoardInAction.board.ts tests/components/board-in-action.test.tsx
git commit -m "Describe the Rev B board, the eight stations and every part's role"
```

---

### Task 3: The right-hand-rule drawing

**Files:**
- Create: `src/components/viz/pcb/RightHandRule.tsx`
- Test: append to `tests/components/board-in-action.test.tsx`

**Interfaces:**
- Produces: `RightHandRule({ variant: "coil" | "trace", forward: boolean, strength?: number /* 0..1, line opacity */, compact?: boolean })` rendering a `<g>` (the caller wraps it in an `SvgCanvas`), plus `RightHandRuleFigure()` for the lesson theory figure (both variants side by side in one labelled SVG).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, cleanup } from "@testing-library/react";
import { RightHandRule, RightHandRuleFigure } from "@/components/viz/pcb/RightHandRule";

describe("RightHandRule", () => {
  afterEach(cleanup);
  it("draws the coil with field lines, a thumb and labels, and mirrors when the current reverses", () => {
    const fwd = render(<svg><RightHandRule variant="coil" forward /></svg>).container.innerHTML;
    cleanup();
    const rev = render(<svg><RightHandRule variant="coil" forward={false} /></svg>).container.innerHTML;
    expect(fwd).toContain("thumb: field");
    expect(fwd).toContain("fingers: current");
    expect(fwd).not.toBe(rev);
    expect(fwd).not.toMatch(/NaN/);
    expect(rev).not.toMatch(/NaN/);
  });
  it("the trace variant swaps the roles of thumb and fingers", () => {
    const { container } = render(<svg><RightHandRule variant="trace" forward /></svg>);
    expect(container.textContent).toContain("thumb: current");
    expect(container.textContent).toContain("fingers: field");
  });
  it("the figure is a labelled image", () => {
    const { container } = render(<RightHandRuleFigure />);
    expect(container.querySelector("svg")?.getAttribute("role")).toBe("img");
    expect(container.querySelectorAll("text").length).toBeGreaterThan(6);
  });
});
```

- [ ] **Step 2: Run to verify failure** (`npx vitest run tests/components/board-in-action.test.tsx -t RightHandRule`): FAIL, module not found.

- [ ] **Step 3: Draw it**

Coil variant (local box 0 0 300 190): six turns as ellipses `rx 10 ry 34` spaced 26 px along a horizontal axis at y 95, the near half of each turn drawn thicker with an arrowhead (polygon) pointing down when `forward` and up when reversed; three dashed field loops (`path` ellipses `rx 130/150/170`) threading the coil; `N` at the right end and `S` at the left end when forward, swapped when reversed; a thick arrow along the axis for the field inside the coil pointing toward N; the hand: palm `rect` 44 × 56 `rx 14`, four fingers as `path` arcs that curl around the axis in the direction of the current (mirrored vertically with `transform="translate(0 190) scale(1 -1)"` when reversed), and the thumb as a `path` along the axis with an arrowhead toward N; labels "fingers: current" and "thumb: field (north)". Trace variant: a vertical copper strip (`rect` 10 wide) with a current arrow, three concentric dashed circles around a dot marking the field, the hand gripping the strip with the thumb up (or down when reversed, via the same mirror transform), labels "thumb: current" and "fingers: field". All coordinates are literals; arrowheads use fixed polygons, not trig. `strength` (default 1) multiplies the field-line opacity through `r3`.

- [ ] **Step 4: Run the tests** (`npx vitest run tests/components/board-in-action.test.tsx`): PASS.

- [ ] **Step 5: Commit**: `git commit -m "Draw the right-hand rule for a coil and for a straight trace"`

---

### Task 4: The board top view

**Files:**
- Create: `src/components/viz/pcb/BoardInAction.view.tsx`
- Test: append to `tests/components/board-in-action.test.tsx`

**Interfaces:**
- Consumes: `allParts`, `allNets`, `STATIONS`, `Flow`, `FLOW_DOT_SPACING_PX`, `IO35_PAD` from `./BoardInAction.board`; `PartFootprint`, `KeepoutHatch`, `PX`, `bx`, `by`, `BOARD_FILL`, `FRONT_COPPER`, `BACK_COPPER` from `./SchematicToLayoutShapes`; `makePath`, `FlowDots`, `dotCount` from `./OhmsLawCircuit.helpers`.
- Produces:

```ts
export interface BoardTopViewProps {
  station: Station;
  phases: number[];           // one per station flow, from useFlowPhases
  flowPaths: FlowPath[];      // makePath of each flow, in px, built by the container with flowPathsFor(station)
  selected: string | null;    // part ref in probe mode
  onSelect: (ref: string | null) => void;
  forward: boolean;
}
export function flowPathsFor(station: Station, forward: boolean): FlowPath[];
export function BoardTopView(props: BoardTopViewProps): JSX.Element;
```

- [ ] **Step 1: Write the failing tests**

```tsx
import { fireEvent, screen } from "@testing-library/react";
import { BoardTopView, flowPathsFor } from "@/components/viz/pcb/BoardInAction.view";

describe("BoardTopView", () => {
  afterEach(cleanup);
  const station = STATIONS[0];
  const paths = flowPathsFor(station, true);
  it("is a group with 28 part buttons, lights the station's parts and dims the rest", () => {
    const { container } = render(<BoardTopView station={station} phases={paths.map(() => 0)} flowPaths={paths} selected={null} onSelect={() => {}} forward />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("group");
    expect(svg.querySelectorAll('[role="button"]')).toHaveLength(28);
    expect(container.querySelectorAll("[data-lit='true']").length).toBe(station.parts.length);
    expect(screen.getByRole("button", { name: /Inspect Q1/ })).toBeTruthy();
  });
  it("draws the station's flows as dots along copper", () => {
    const { container } = render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={() => {}} forward />);
    expect(container.querySelectorAll("[data-flow] circle").length).toBe(dotCount(paths[0].length, 24));
  });
  it("selects a part by click and by keyboard", () => {
    const onSelect = vi.fn();
    render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={onSelect} forward />);
    fireEvent.click(screen.getByRole("button", { name: /Inspect R3/ }));
    expect(onSelect).toHaveBeenCalledWith("R3");
    fireEvent.keyDown(screen.getByRole("button", { name: /Inspect U3/ }), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("U3");
  });
  it("the winding flows reverse with the direction", () => {
    const w = STATIONS.find((s) => s.id === "winding")!;
    const f = flowPathsFor(w, true)[0].at(0);
    const r = flowPathsFor(w, false)[0].at(0);
    expect(f).not.toEqual(r);
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

`flowPathsFor` maps each flow's mm points (choosing the reverse geometry for the winding when `!forward`) through `bx`/`by` and `makePath`. `BoardTopView` renders `<SvgCanvas viewBox="0 0 720 470" role="group" title="Top view of the motor-driver board with the current station's parts and copper highlighted">`: background rect, board rect (`bx(0)`, `by(0)`, `BOARD.w * PX`, `BOARD.h * PX`, `BOARD_FILL`, amber stroke), the antenna keep-out hatch (`useId` for the pattern id), every net's routes as polylines (`FRONT_COPPER` / `BACK_COPPER`, opacity 0.25, or 1 with a halo when the net is in `station.nets`), vias as small circles, a glow (`rect` with `rx 6`, amber, `opacity 0.35`, `data-lit="true"`) behind each lit part, every part through `PartFootprint` inside `<g role="button" tabIndex={0} aria-label={`Inspect ${p.ref}, ${p.label}`} aria-pressed={selected === p.ref} data-lit=...>` (holes are plain `<g>`), the IO35 pad as a copper square, and each flow as `<g data-flow={flow.id}><FlowDots path phase count color /></g>`. Keyboard: Enter and Space select; the container handles Escape.

- [ ] **Step 4: Run the tests**: PASS.
- [ ] **Step 5: Commit**: `git commit -m "Draw the board top view with lit parts, copper and current dots"`

---

### Task 5: The eight station panels

**Files:**
- Create: `src/components/viz/pcb/BoardInAction.panels.tsx`
- Test: append to `tests/components/board-in-action.test.tsx`

**Interfaces:**
- Consumes: `BoardModel`, `BoardInputs`, `BOARD` from `@/lib/sim/board`; symbols from `./SchematicExplorer.symbols`; `Stat`, `formatSI`, `r2`, `r6` from `./OhmsLawCircuit.helpers`; `RightHandRule`; `Slider`, `Segmented`, `Toggle`.
- Produces: `StationPanel({ station, model, inputs, onChange }: { station: Station; model: BoardModel; inputs: BoardInputs; onChange: (patch: Partial<BoardInputs>) => void })`, which renders the station's controls (from `station.controls`, through one `StationControls` component), a mini schematic (`SvgCanvas role="img"`, viewBox 0 0 320 200) and a `<dl aria-live="polite">` of `Stat`s. Readout labels (exact strings the tests use): fet: "Pack current", "Drop across Q1  V = I · R", "Heat in Q1  P = I² · R", "Drop along 13 mm of VM trace"; kcl: "Into the node (pack)", "Out to both motors", "Out to the regulator", "Sum check  KCL", "Bulk capacitor droop at start"; ldo: "Heat  P = (Vin − Vout) · I", "Junction temperature", "Verdict", "Same job with a 5 V buck"; led: "Loop  +3.3 − I·R − Vf", "LED current", "Resistor power", "Verdict"; divider: "ADC pin voltage", "Thevenin resistance  R1 ∥ R2", "Divider current", "ADC reading (12-bit)", "Verdict"; en: "Time constant  τ = R · C", "EN crosses 0.75 × VDD at", "5τ (fully charged)"; decoupling: "Loop inductance", "Rail dip  V = L · di/dt", "Verdict"; winding: "Average motor voltage  D · VM", "Current through the winding", "Field 5 mm from the trace", "PWM ripple  ΔI", "Flyback without a path", "Clamped by the body diode".
- Verdict strings: ldo "Fine" / "Hot: add copper" / "Thermal shutdown"; led "Dim: raise Vcc or lower R" / "Lit, comfortably" / "Too much for a GPIO pin"; divider "Capacitor supplies the sample" / "Reads low: 32 kΩ is too stiff for the ADC"; decoupling "Inside 5% of the rail" / "Marginal: move the capacitor closer" / "Logic will glitch".

- [ ] **Step 1: Write the failing tests**

```tsx
import { StationPanel } from "@/components/viz/pcb/BoardInAction.panels";

function readout(container: HTMLElement, label: string): string {
  const dt = Array.from(container.querySelectorAll("dt")).find((n) => n.textContent === label);
  if (!dt) throw new Error(`no readout labelled "${label}"`);
  return dt.nextElementSibling?.textContent ?? "";
}
const byId = (id: string) => STATIONS.find((s) => s.id === id)!;

describe("StationPanel", () => {
  afterEach(cleanup);
  const m = boardModel(BOARD_DEFAULTS);
  const noop = () => {};
  it("fet: shows the pack current and the drop across Q1", () => {
    const { container } = render(<StationPanel station={byId("fet")} model={m} inputs={BOARD_DEFAULTS} onChange={noop} />);
    expect(readout(container, "Pack current")).toBe("1.16 A");
    expect(readout(container, "Drop across Q1  V = I · R")).toBe("57.8 mV");
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(2);
  });
  it("kcl: the sum check closes", () => {
    const { container } = render(<StationPanel station={byId("kcl")} model={m} inputs={BOARD_DEFAULTS} onChange={noop} />);
    expect(readout(container, "Sum check  KCL")).toBe("1.155 A = 1.000 A + 0.155 A");
  });
  it("led: red through 1 k is 1.3 mA; blue is dim", () => {
    const { container } = render(<StationPanel station={byId("led")} model={m} inputs={BOARD_DEFAULTS} onChange={noop} />);
    expect(readout(container, "LED current")).toBe("1.3 mA");
    const blue = boardModel({ ...BOARD_DEFAULTS, ledColor: "blue" });
    cleanup();
    const { container: c2 } = render(<StationPanel station={byId("led")} model={blue} inputs={{ ...BOARD_DEFAULTS, ledColor: "blue" }} onChange={noop} />);
    expect(readout(c2, "Verdict")).toBe("Dim: raise Vcc or lower R");
  });
  it("divider: 7.4 V reads 2.37 V behind 32 kΩ", () => {
    const { container } = render(<StationPanel station={byId("divider")} model={m} inputs={BOARD_DEFAULTS} onChange={noop} />);
    expect(readout(container, "ADC pin voltage")).toBe("2.366 V");
    expect(readout(container, "Thevenin resistance  R1 ∥ R2")).toBe("32 kΩ");
  });
  it("en: τ = 10 ms and 13.9 ms to the threshold", () => {
    const { container } = render(<StationPanel station={byId("en")} model={m} inputs={BOARD_DEFAULTS} onChange={noop} />);
    expect(readout(container, "Time constant  τ = R · C")).toBe("10 ms");
    expect(readout(container, "EN crosses 0.75 × VDD at")).toBe("13.9 ms");
  });
  it("decoupling and winding readouts", () => {
    const { container } = render(<StationPanel station={byId("decoupling")} model={m} inputs={BOARD_DEFAULTS} onChange={noop} />);
    expect(readout(container, "Rail dip  V = L · di/dt")).toBe("62.5 mV");
    cleanup();
    const { container: c2 } = render(<StationPanel station={byId("winding")} model={m} inputs={BOARD_DEFAULTS} onChange={noop} />);
    expect(readout(c2, "Field 5 mm from the trace")).toBe("20 µT");
    expect(readout(c2, "PWM ripple  ΔI")).toBe("88.8 mA");
    expect(c2.textContent).toContain("thumb: field");
  });
  it("controls call onChange with a patch", () => {
    const onChange = vi.fn();
    render(<StationPanel station={byId("led")} model={m} inputs={BOARD_DEFAULTS} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Blue, 3.0 V" }));
    expect(onChange).toHaveBeenCalledWith({ ledColor: "blue" });
  });
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

`StationControls` switches on each `ControlId`: `iMotorL`/`iMotorR` Slider 0 to 1.5 A step 0.05 (labels "Left motor current", "Right motor current"); `iLogic` Slider 50 to 400 mA step 10 (stored as A); `vPack` Slider 6.0 to 8.4 step 0.1; `ledColor` Segmented "Red, 2.0 V" / "Green, 2.2 V" / "Blue, 3.0 V"; `ledR` Segmented 220 Ω / 470 Ω / 1 kΩ / 2.2 kΩ; `enC` Segmented 100 nF / 1 µF / 10 µF; `decouplingMm` Slider 1 to 30 mm; `duty` Slider 0 to 100 %; `forward` Segmented "Forward" / "Reverse"; `dividerCap` Toggle "C9, 100 nF at the ADC pin". Mini schematics: fet (battery, FET drawn as a rectangle with gate line and body-diode triangle, R1 to ground, VM label); kcl (one wire splitting into two at a junction dot, three current labels, "in = out"); ldo (block "AMS1117" with IN/OUT/GND, heat arrows scaled by `pLdo`); led (GPIO pin, R3, LED triangle with arrows, ground, the three voltages written around the loop); divider (R4 over R5 with the tap, C9 drawn dashed when not fitted, the Thevenin twin beside it); en (3V3, R2, EN node, C8, SW2, and the charging curve from `model.en.samples` through `makeScale` and `polyline`, with a marker at `tBoot`); decoupling (chip pin, capacitor at a distance proportional to `decouplingMm`, a loop drawn around pin, capacitor and ground); winding (`RightHandRule variant="coil"` with the H-bridge direction and a small current waveform showing the ripple).

- [ ] **Step 4: Run the tests**: PASS.
- [ ] **Step 5: Commit**: `git commit -m "Add the eight station panels with mini schematics and live readouts"`

---

### Task 6: The BoardInAction container

**Files:**
- Create: `src/components/viz/pcb/BoardInAction.tsx`
- Test: append to `tests/components/board-in-action.test.tsx`

**Interfaces:**
- Consumes everything above; `useViz`, `useFlowPhases`, `dotSpeeds`, `dotSpeedCap`.
- Produces: `BoardInAction()` (no props) and `BOARD_SPEED_CAP`.

- [ ] **Step 1: Write the failing tests**

```tsx
import { BoardInAction } from "@/components/viz/pcb/BoardInAction";

describe("BoardInAction", () => {
  afterEach(cleanup);
  it("starts at station 1 and walks all eight with Next", () => {
    render(<BoardInAction />);
    expect(screen.getByText("Step 1 / 8")).toBeTruthy();
    for (let k = 2; k <= 8; k++) {
      fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
      expect(screen.getByText(`Step ${k} / 8`)).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: /^Next$/ }).hasAttribute("disabled")).toBe(true);
  });
  it("the left-motor slider changes the pack current, and the change survives moving to the KCL station", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.change(screen.getByRole("slider", { name: /Left motor current/ }), { target: { value: "1.5" } });
    expect(readout(container, "Pack current")).toBe("2.16 A");
    fireEvent.click(screen.getByRole("button", { name: /Go to step 2/ }));
    expect(readout(container, "Into the node (pack)")).toBe("2.155 A");
  });
  it("probe mode: clicking a part shows its role and offers its station", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.click(screen.getByRole("button", { name: /Inspect R3/ }));
    expect(container.textContent).toContain("sets the LED current");
    fireEvent.click(screen.getByRole("button", { name: /Go to station 4/ }));
    expect(screen.getByText("Step 4 / 8")).toBeTruthy();
    fireEvent.keyDown(container.querySelector("[data-probe-card]")!, { key: "Escape" });
    expect(container.querySelector("[data-probe-card]")).toBeNull();
  });
  it("the frame-safe cap keeps one 60 Hz frame under half a dot spacing on the longest flow", () => {
    const longest = Math.max(...STATIONS.flatMap((s) => flowPathsFor(s, true).map((p) => p.length)));
    const spacing = longest / dotCount(longest, FLOW_DOT_SPACING_PX);
    expect(BOARD_SPEED_CAP / 60).toBeLessThan(spacing / 2);
  });
});

describe("BoardInAction hydration stability", () => {
  const drive = [
    ["default", () => {}],
    ["station 5 without C9", () => { fireEvent.click(screen.getByRole("button", { name: /Go to step 5/ })); fireEvent.click(screen.getByRole("switch")); }],
    ["station 8 reversed", () => { fireEvent.click(screen.getByRole("button", { name: /Go to step 8/ })); fireEvent.click(screen.getByRole("radio", { name: "Reverse" })); }],
    ["station 6 with 10 µF", () => { fireEvent.click(screen.getByRole("button", { name: /Go to step 6/ })); fireEvent.click(screen.getByRole("radio", { name: "10 µF" })); }],
  ] as const;
  it.each(drive)("%s renders identical markup with nudged Math", (_name, go) => {
    const plain = markupAfter(<BoardInAction />, go);
    const nudged = withNudgedMath(() => markupAfter(<BoardInAction />, go));
    expect(nudged).toBe(plain);
  });
});
```

(`markupAfter` and `withNudgedMath` are copied from `tests/content/pcb-a.test.tsx`.)

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

State: `inputs` (`BOARD_DEFAULTS`), `index`, `selected`, `viz = useViz(true)`. `model = boardModel(inputs)`. `station = STATIONS[index]`; `paths = flowPathsFor(station, inputs.forward)`; speeds `dotSpeeds(station.flows.map(f => f.current(model)), station.flows[0].referenceA, 160, BOARD_SPEED_CAP)` divided by each path length give the rates for `useFlowPhases(rates, viz.playing)` (keep the phases array length fixed at the maximum flow count, 3, padding with 0 rates, so the hook's state does not resize between stations). `BOARD_SPEED_CAP = dotSpeedCap(FLOW_DOT_SPACING_PX)`. Layout: `VizFrame` title "The board in action: eight stations, one current path", description, controls = `PlayPause` and a short legend; body = `<div className="@container"><div className="grid gap-4 @3xl:grid-cols-[1.15fr_1fr]">` board on the left, on the right `Stepper steps={STATIONS.map(s => ({ title: s.title, body: <StationPanel .../> }))} index onChange`; below, when `selected`, the probe card `<div data-probe-card tabIndex={-1} onKeyDown={Escape → clear}>` with the role, readings, "Go to station N" (when `PART_ROLES[ref].station`), "Close". The footer states the model's assumptions (50 mΩ, 60 °C/W, 1 nH/mm, 1 mH winding, typical SAR input) in one paragraph.

- [ ] **Step 4: Run the tests**: PASS. Also run `npx vitest run` to confirm nothing else broke.
- [ ] **Step 5: Commit**: `git commit -m "Assemble the BoardInAction tour: stepper, live board and probe mode"`

---

### Task 7: Lesson data, references, body, curriculum wiring and the content test

**Files:**
- Create: `src/content/pcb/components-in-action.data.ts`, `src/content/pcb/components-in-action.tsx`, `tests/content/pcb-c.test.tsx`
- Modify: `src/lib/curriculum.ts` (lesson after `active-components`, day 4 slug list), `src/lib/references.ts`, `tests/curriculum.test.ts:9-10` (37 → 38)
- Generated: `node scripts/gen-registry.mts`

- [ ] **Step 1: Write the failing content test** (`tests/content/pcb-c.test.tsx`): copy the `describe.each(lessons)` block of `tests/content/pcb-a.test.tsx` (sections, figure, controls, 700 to 1200 theory words, worked answer, complete data) for the single lesson, plus:

```tsx
import { correctIsLongest, correctIsShortest } from "../quiz-length-tell"; // only if the file exists on this branch; otherwise inline the two one-line functions
it("the quiz has no length tell", () => {
  expect(data.quiz.filter(correctIsShortest)).toHaveLength(0);
  expect(data.quiz.filter(correctIsLongest).length).toBeLessThanOrEqual(2);
});
it("is scheduled on day 4 after active components and cites the four original papers", () => {
  expect(days[3].lessonSlugs.slice(-2)).toEqual(["active-components", "components-in-action"]);
  const ids = referencesFor("components-in-action").map((r) => r.id);
  for (const id of ["ohm1827", "kirchhoff1845", "thevenin1883", "feynman-ii", "horowitz-hill"]) expect(ids).toContain(id);
});
```

Inline the tell helpers (the quiz branch's `tests/quiz-length-tell.ts` is not on main yet):

```ts
const isLongest = (q: QuizQuestion) => q.choices.every((c, i) => i === q.answer || c.length < q.choices[q.answer].length);
const isShortest = (q: QuizQuestion) => q.choices.every((c, i) => i === q.answer || c.length > q.choices[q.answer].length);
```

- [ ] **Step 2: Curriculum and registry**

Add to `lessons` after `active-components`:

```ts
{
  slug: "components-in-action",
  track: "pcb",
  title: "Components in action: one board, every law",
  day: 4,
  minutes: 55,
  summary: "Power up the robot's motor-driver board one part at a time and watch Ohm's law, Kirchhoff's laws, the RC time constant and the right-hand rule work on real values.",
  objectives: [
    "You can follow the current through a real board from the battery connector to the motor and say what each part does on the way.",
    "You can apply Ohm's law, KCL, KVL, the voltage divider, Thevenin's theorem, the RC time constant and V = L·di/dt to the parts of the motor-driver board with real numbers.",
    "You can use the right-hand rule to find the direction of the magnetic field around a trace and inside a motor winding, and say what reversing the current does.",
  ],
},
```

Day 4: `lessonSlugs: ["circuit-fundamentals", "passive-components", "active-components", "components-in-action"]`. Run `node scripts/gen-registry.mts` (creates stub body and data, the route, and rewrites registry.ts and bodies.ts). Change `37` to `38` twice in `tests/curriculum.test.ts`.

- [ ] **Step 3: References**

Add to `list`:

```ts
{ id: "ohm1827", kind: "book", title: "Die galvanische Kette, mathematisch bearbeitet", authors: "Georg Simon Ohm", year: 1827, venue: "T. H. Riemann, Berlin", note: "The book that states V = I · R. The 1891 English translation, The Galvanic Circuit Investigated Mathematically, is the easier read; scans of both are free online." },
{ id: "kirchhoff1845", kind: "paper", title: "Ueber den Durchgang eines elektrischen Stromes durch eine Ebene, insbesondere durch eine kreisförmige", authors: "Gustav Kirchhoff", year: 1845, venue: "Annalen der Physik und Chemie 140(4), 497-514", doi: "10.1002/andp.18451400402", note: "The paper with the two circuit laws, written when Kirchhoff was a 21-year-old student. The laws are in the closing section." },
{ id: "thevenin1883", kind: "paper", title: "Sur un nouveau théorème d'électricité dynamique", authors: "Léon Charles Thévenin", year: 1883, venue: "Comptes rendus hebdomadaires des séances de l'Académie des sciences 97, 159-161", note: "Two pages: any network seen from two terminals behaves like one source in series with one resistance." },
{ id: "feynman-ii", kind: "book", title: "The Feynman Lectures on Physics, Volume II: Mainly Electromagnetism and Matter", authors: "Richard P. Feynman, Robert B. Leighton and Matthew Sands", year: 1964, venue: "Addison-Wesley; free online edition by Caltech", url: "https://www.feynmanlectures.caltech.edu/", free: true, note: "Chapter 13 explains why a current makes a magnetic field and which way it points, with the right-hand rule; chapter 22 covers AC circuits." },
```

Add to `lessonReferences`:

```ts
"components-in-action": [
  { id: "horowitz-hill", read: "Chapter 1 for Ohm, Kirchhoff, dividers and Thevenin; chapter 9 for linear regulators and their heat." },
  { id: "kirchhoff1845", read: "The closing section: both circuit laws in their original words." },
  { id: "ohm1827", read: "The preface and the first chapter, to see how V = I · R was argued from experiments." },
  { id: "thevenin1883", read: "All two pages; the theorem behind the divider's 32 kΩ." },
  { id: "feynman-ii", read: "Chapter 13, sections 13-1 to 13-5: the field of a wire and of a solenoid, and the right-hand rule." },
  { id: "ott", read: "The decoupling chapter: V = L · di/dt and why distance to the pin is inductance." },
  { id: "hughes-drury", read: "The brushed DC motor chapter: torque from current, back-EMF from speed." },
  { id: "esp32-hw-guidelines", read: "The EN (CHIP_PU) RC network and the ADC input notes." },
  { id: "ams1117-ds", read: "Ground current and thermal resistance for the regulator station." },
  { id: "tb6612fng-ds", read: "Output saturation voltage and the body diodes that catch the flyback." },
],
```

- [ ] **Step 4: Lesson data** (`components-in-action.data.ts`), per spec section 6: 12 key terms (Ohm's law; Kirchhoff's current law; Kirchhoff's voltage law; Power dissipation; Voltage divider; Thevenin equivalent; RC time constant; Decoupling and L·di/dt; Right-hand grip rule; Flyback; Reverse-polarity P-FET; Bulk capacitor), the telemetry scenario (title, context, four symptoms, three hints, root cause, fix, lesson as written in the spec), six interview questions (power-on walk-through; where KCL matters for part ratings; why the LED needs a resistor and how to pick it; the right-hand rule and where it matters; deep: LDO thermal maths and when to switch to a buck; deep: diagnose the low, noisy ADC reading with Thevenin), eight quiz questions:

| # | Stem (short form) | Choices | Key |
|---|---|---|---|
| 1 | Both motors stall at 1.5 A, logic 150 mA: pack current? | 1.50 A / 3.00 A / 3.15 A / 3.30 A | 2 |
| 2 | Swap the red LED (2.0 V) for blue (3.0 V) with the same 1 kΩ: the current? | rises to 3.0 mA because… / falls to 0.3 mA because only 0.3 V is left across the resistor / stays at 1.3 mA because… / drops to zero because… | 1 |
| 3 | 50 mΩ FET carrying 3 A dissipates? | 0.15 W / 0.45 W / 1.5 W / 4.5 W | 1 |
| 4 | 100 k over 47 k: Thevenin resistance and the 10 kΩ rule? | 147 kΩ, fine as is / 47 kΩ, within the rule once averaged / 32 kΩ, above the rule, so add 100 nF at the pin / 68 kΩ, below the rule because… | 2 |
| 5 | 10 kΩ and 1 µF on EN: time to 75%? | 1.4 ms / 10 ms / 14 ms / 50 ms | 2 |
| 6 | 10 mm from the pin, 50 mA in 2 ns, 1 nH/mm: dip? | 3 mV / 25 mV / 250 mV / 2.5 V | 2 |
| 7 | Reverse the H-bridge: the winding's field? | flips direction, same strength / disappears because… / same direction but weaker / rotates a quarter turn because… | 0 |
| 8 | AMS1117, 8.4 V to 3.3 V at 150 mA (ignore 5 mA): heat and rise at 60 °C/W? | 0.50 W and 30 °C / 0.77 W and 46 °C / 1.26 W and 76 °C / 2.5 W and 150 °C | 1 |

Each explanation refutes the distractors in two sentences. Check the tell with the test in Step 1.

- [ ] **Step 5: Lesson body** (`components-in-action.tsx`): `"use client"`; imports `Section, Prose, Callout, Figure, Exercise, CodeBlock` from `@/components/lesson`, `BoardInAction`, `RightHandRuleFigure`, `WorkedAnswer`, `Label, SvgCanvas, Arrow, vizColors`. A static `PowerTreeFigure` (viewBox 0 0 720 400): boxes "2S pack 6.0 to 8.4 V" → "J1" → "Q1 P-FET, 50 mΩ: Ohm, 0.15 V at 3 A" → "VM node: KCL, 3.0 A + 0.155 A" → up to "U2 TB6612FNG → motors: right-hand rule, L·di/dt" and down to "U3 AMS1117: P = 5.1 V × 0.15 A = 0.77 W" → "3V3" → "ESP32 + C7 100 nF: V = L·di/dt", "R2/C8: τ = 10 ms", "R3/D1: KVL 3.3 = 1.3 + 2.0", "R4/R5: divider 2.69 V, Rth 32 kΩ". Theory (700 to 1200 words) in this order, each law: example, rule, board number: the water-pipe picture for voltage, current and resistance; Ohm on Q1 and the copper; KCL at the VM node and why it sizes the fuse, the JST pins and the trace; power dissipation at U3; KVL around the LED and the resistor choice; the divider and Thevenin at the ADC pin; RC on EN; decoupling as V = L·di/dt; the right-hand rule on the trace and the winding, torque from current, flyback. Then `<Figure>` with `PowerTreeFigure` and a second `<Figure>` with `RightHandRuleFigure`. `#viz`: a "Try this" callout with four checks (stall both motors and read 3.16 A and 0.5 W in Q1; pick the blue LED and read 0.3 mA; untick C9 and read the verdict; reverse the motor and watch the thumb flip) and `<BoardInAction />`. `#practice`: exercise "Audit the board at full load" with a `CodeBlock` worked answer (pack current 3.155 A; Q1 0.158 V, 0.498 W; trace 13 mV; U3 at 8.4 V and 150 mA: 0.807 W, 73 °C; at 400 mA: 2.08 W, 150 °C, shutdown → buck; blue LED at 5 mA needs (3.3 − 3.0)/0.005 = 60 Ω, so drive it from VM through a transistor or use red; C8 for a 50 ms delay: 50 ms / 1.386 / 10 kΩ = 3.6 µF → 4.7 µF).

- [ ] **Step 6: Run** `npx vitest run tests/content/pcb-c.test.tsx tests/curriculum.test.ts tests/references.test.ts tests/content-complete.test.ts tests/hydration-stability.test.tsx`: PASS. Then `npx vitest run`: PASS.

- [ ] **Step 7: Commit** in two commits: "Add the components-in-action lesson data and references" (data, references, curriculum, registry, route, curriculum test) and "Write the components-in-action lesson body" (body, content test). If the first would leave the suite red because the stub body is under 500 characters, commit both together as "Add the components-in-action lesson".

---

### Task 8: Cross-links from the two components lessons

**Files:**
- Modify: `src/content/pcb/passive-components.tsx` (after the first `</Prose>` in `#theory`), `src/content/pcb/active-components.tsx` (same place)

- [ ] **Step 1:** Add, in each, `import Link from "next/link";` and a callout:

```tsx
<Callout kind="tip" title="See these parts working">
  <p>
    Every part in this lesson is on the robot&apos;s motor-driver board. The{" "}
    <Link href="/learn/pcb/components-in-action" className="underline">components-in-action lesson</Link> powers that board up one station at a time with live numbers.
  </p>
</Callout>
```

- [ ] **Step 2:** Run `npx vitest run tests/content/pcb-a.test.tsx` (the word counts exclude callouts? No: pcb-a counts all text nodes in `#theory` except headings, figures and SVGs. Check the two lessons stay under 1200 words; if one exceeds, place the callout in `#viz` instead).

- [ ] **Step 3: Commit**: `git commit -m "Link the passive and active components lessons to the board tour"`

---

### Task 9: Gates, browser check, push and PR

- [ ] **Step 1:** `npm test`, `npm run lint`, `npm run build`, then `npx tsc --noEmit` (after the build, which generates `.next/types`). Fix anything red.
- [ ] **Step 2:** Start the dev server (`.claude/launch.json` with `npm run dev` on port 3000) and open `/learn/pcb/components-in-action` in the browser pane: check each station's drawing, the right-hand drawing in both directions, the probe card, phone width (375 px) and reduced motion.
- [ ] **Step 3:** `git push -u origin claude/components-in-action`; open the PR against `main` with `gh pr create`, describing each interactive piece in one line and listing the gate results; end the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Self-review

- Spec coverage: board and Rev B (Task 2), model (Task 1), eight stations with controls and readouts (Tasks 2, 5, 6), right-hand rule (Task 3), probe mode (Tasks 4, 6), lesson page, data, references, curriculum, cross-links (Tasks 7, 8), tests (every task), gates and PR (Task 9).
- Placeholders: none; the prose of the lesson and the data file is specified by content list and numbers, and written in Task 7.
- Type consistency: `BoardInputs`/`BoardModel` from Task 1 are used by name in Tasks 2, 5, 6; `Station`, `Flow`, `STATIONS`, `PART_ROLES`, `FLOW_DOT_SPACING_PX` from Task 2 in Tasks 4, 5, 6; `flowPathsFor` from Task 4 in Task 6; readout labels in Task 5 match the tests in Task 6.
