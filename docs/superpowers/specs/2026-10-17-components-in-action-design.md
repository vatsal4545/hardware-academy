# Components in action: design spec

Date: 2026-10-17. Status: design agreed with Vatsal in chat (board, placement and interactivity level); this document
is the written form for review before the implementation plan.

## 1. Purpose

Vatsal asked to learn the components in a practical way, to see step by step on a PCB how each one acts, and to have one
complex, real circuit explained with a visualization that teaches the fundamental laws: Ohm's law, Kirchhoff's current and
voltage laws, the right-hand rule for current and magnetic field, and the everyday rules that follow from them (voltage
divider, Thevenin, RC time constant, power dissipation, LED current limiting, decoupling).

One new lesson in the PCB track does this on the board the course already designs: the robot's motor-driver board from
the KiCad lesson. The learner follows the current from the battery connector to the motor through eight stations. Each
station lights the parts and copper it is about, animates the charge flow at a speed proportional to the current, shows a
small schematic of that corner, and recomputes the law's numbers live as the learner moves sliders.

## 2. Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Board | The KiCad lesson's motor-driver board (`src/components/viz/pcb/SchematicToLayoutBoard.ts`) as drawn, plus one "Rev B" addition: the battery-monitor divider R4 100 kΩ / R5 47 kΩ with C9 100 nF at an ADC pin (IO35) | Same board as the schematic explorer, the schematic-to-layout animation and the find-the-short game, so the track tells one story. The robot firmware already reads this divider; the KiCad board had no divider, and no divider meant no Thevenin problem to teach. |
| Lesson vs enhancement | New lesson `components-in-action`, day 4, after `active-components`, 55 minutes | The passive and active lessons sit at the 1200-word test cap and each has its own interactive. One new page keeps one story. Each of the two existing lessons gets a one-line link to the new one. |
| Interactivity | Level B: guided stations with live sliders and live law readouts, plus "click any part" probe mode | Level A (fixed numbers) teaches less; level C (virtual multimeter) is a follow-up once B ships. |

Consequences: day 4 grows from 140 to 195 minutes; `tests/curriculum.test.ts` changes its lesson count from 37 to 38.

## 3. The board, as this lesson describes it

Everything from the KiCad lesson's table stays: J1 battery input (2S, 6.0 to 8.4 V), Q1 AO3401A reverse-polarity P-FET
with R1 100 kΩ gate pull-down, C1 100 µF + C2 10 µF + C3 100 nF on VM, U3 AMS1117-3.3 with C5 22 µF tantalum, U1
ESP32-WROOM-32 with C6 10 µF and C7 100 nF, R2 10 kΩ + C8 1 µF + SW2 on EN, SW1 on IO0, U2 TB6612FNG with C4 100 nF,
J2/J3 motor and encoder connectors, J4 HC-SR04, J5/J6 line sensors, J7 UART, D1 LED + R3 1 kΩ on IO13, H1 to H4.

Rev B adds R4 (100 kΩ), R5 (47 kΩ) and C9 (100 nF) in the free pocket below the 3V3 trace (around x 26 to 30 mm,
y 31 to 33 mm), fed from the VM trace at (15.0, 26.75) mm and wired to a new module pad IO35 at (36.7, 29.0) mm. The
lesson says in one sentence that Rev B moves the right encoder's B channel from IO35 to IO21 to free the ADC pin. The
shared board data file is not modified; the Rev B parts, pad and nets live in the new lesson's own module and are drawn
on top.

## 4. Physics model (`src/lib/sim/board.ts`)

Pure functions, no React, unit-tested. Inputs are one object:

```ts
export type LedColor = "red" | "green" | "blue";
export interface BoardInputs {
  vPack: number;        // V, 6.0 to 8.4
  iMotorL: number;      // A, 0 to 1.5
  iMotorR: number;      // A, 0 to 1.5
  iLogic: number;       // A on the 3V3 rail, 0.05 to 0.4
  ledColor: LedColor;   // forward voltage 2.0 / 2.2 / 3.0 V
  ledR: number;         // ohm: 220, 470, 1000, 2200
  enC: number;          // F: 100e-9, 1e-6, 10e-6
  decouplingMm: number; // mm from capacitor to pin, 1 to 30
  duty: number;         // 0 to 1, PWM on the left motor
  forward: boolean;     // left motor direction
  dividerCap: boolean;  // C9 fitted
}
```

Constants (course values, each named once in the file): Q1 on-resistance 50 mΩ; VM trace 13 mm long, 1.5 mm wide,
35 µm copper, ρ = 1.68e-8 Ω·m; AMS1117 Vout 3.3 V, ground current 5 mA, θJA 60 °C/W, ambient 25 °C, shutdown 150 °C;
LED forward voltages red 2.0, green 2.2, blue 3.0 V; GPIO drive guidance 20 mA; divider 100 kΩ / 47 kΩ, 12-bit ADC at
3.3 V full scale, SAR sampling capacitor 10 pF, 12-bit settling 8.3 τ; EN pull-up 10 kΩ, threshold 0.75 × 3.3 V,
ln 4 = 1.3862943611198906; decoupling 1 nH per mm plus 0.5 nH capacitor ESL, step 50 mA in 2 ns, 3V3 tolerance 10%;
motor winding 4 Ω and 1 mH (labelled as typical for a 12 mm brushed motor), PWM 20 kHz, µ0 / 2π = 2e-7, field quoted
at 5 mm from the trace, Earth's field 50 µT, flyback example 1 A falling in 100 ns; TB6612 0.5 Ω per channel for heat.

Station functions and what they return (all SI, unrounded; the UI rounds):

| Function | Returns |
|---|---|
| `traceResistance(lengthMm, widthMm, ozCopper = 1)` | ohms |
| `fetStation(i)` | `iPack` (motors + LDO input current), `vFet = iPack·Rds`, `pFet = iPack²·Rds`, `rTrace`, `vTrace` |
| `kclStation(i)` | `iMotors`, `iLdoIn = iLogic + 5 mA`, `iPack`, `droopV` for a 1.5 A, 10 µs start step on 100 µF |
| `ldoStation(i)` | `pLdo = (vPack − 3.3)·iLogic + vPack·5 mA`, `tj = 25 + 60·pLdo`, `verdict` (`"fine"` < 100 °C, `"hot"` < 150, `"shutdown"`), `pBuck = 3.3·iLogic·(1/0.9 − 1)` |
| `ledStation(i)` | `vf`, `iLed = max(0, (3.3 − vf) / R)`, `pR`, `verdict` (`"dim"` < 1 mA, `"ok"` ≤ 20 mA, `"too much"`), `kvl` = `{ rise: 3.3, dropR: iLed·R, dropLed: vf }` |
| `dividerStation(i)` | `vOut = vPack·47/147`, `rth = 100k ∥ 47k`, `iDiv`, `counts = round(vOut/3.3·4095)`, `settleUs = 8.3·rth·10 pF`, `rechargeMs = rth·100 nF` (when fitted), `verdict` (`"ok"` with cap, `"loaded"` without) |
| `enStation(i)` | `tau = 10 kΩ·enC`, `tBoot = tau·ln 4`, `samples` (41 values of `3.3·(1 − e^(−t/τ))` over 0..5τ, rounded to 1e-6) |
| `decouplingStation(i)` | `loopH = 1e-9·mm + 0.5e-9`, `vDip = loopH·0.05/2e-9`, `verdict` (`"ok"` ≤ 165 mV, 5% of the rail; `"marginal"` ≤ 330 mV; `"bad"`) |
| `windingStation(i)` | `iAvg = iMotorL`, `vAvg = duty·vPack`, `rippleA = vPack·duty·(1 − duty)/(L·f)`, `bTraceUt = 2e-7·iAvg/0.005·1e6`, `earthRatio`, `flybackV = L·1/100e-9` (no path), `clampV = vPack + 0.7`, `direction` ("forward"/"reverse") |
| `boardModel(i)` | all eight results in one object |

`BOARD_DEFAULTS`: vPack 7.4, iMotorL 0.5, iMotorR 0.5, iLogic 0.15, red, 1000 Ω, 1 µF, 2 mm, duty 0.6, forward, C9 fitted.

Numbers at the defaults that the lesson text quotes: iPack 1.155 A; at both motors stalled (1.5 A each) iPack 3.155 A,
vFet 0.158 V, pFet 0.498 W; LDO at 8.4 V and 150 mA: 0.807 W including ground current (0.765 W without), tj 73 °C;
LED red/1 kΩ 1.3 mA, blue 0.3 mA; divider at 8.4 V: 2.686 V, 32.0 kΩ, 57 µA, 3333 counts; EN 1 µF: τ 10 ms, boot
13.9 ms; decoupling 2 mm: 2.5 nH, 62.5 mV; 10 mm: 10.5 nH, 263 mV; winding at 0.5 A: 20 µT at 5 mm, ripple 89 mA at
duty 0.6 and 7.4 V; flyback 10 kV without a path, clamped to 8.1 V.

Only `exp` is transcendental; its outputs are rounded to 1e-6 before they reach the UI. Nothing uses `Math.log`,
`sqrt`, `hypot` or trig, so the hydration gate (`tests/hydration-stability.test.tsx`) sees identical markup.

## 5. The interactive (`BoardInAction`)

Files, each with one job:

- `src/components/viz/pcb/BoardInAction.tsx`: state (`BoardInputs`, station index, selected part, play/pause), the
  `VizFrame`, the two-column layout (board left, station panel right; stacked under 48rem), the `Stepper`, the probe card.
- `src/components/viz/pcb/BoardInAction.board.ts`: Rev B parts (`revBParts`), the IO35 pad, the Rev B nets
  (`revBNets`), the station table (`STATIONS`: id, title, law, parts to light, nets to highlight, flow definitions, the
  controls to show) and the part-role table (`PART_ROLES`: for every ref, a plain-language role and which readings to
  show).
- `src/components/viz/pcb/BoardInAction.view.tsx`: `BoardTopView`: the board outline, all routes dimmed, the station's
  nets bright, part footprints via the existing `PartFootprint`, a glow behind the station's parts, flow dots along the
  station's copper, and one `role="button"` group per part for probe mode. The SVG is `role="group"`.
- `src/components/viz/pcb/BoardInAction.panels.tsx`: the eight station panels: a small schematic (`role="img"`), a
  `<dl>` of `Stat` readouts, and the station's controls. The right-hand-rule drawing is its own component.
- `src/components/viz/pcb/RightHandRule.tsx`: a coil with current arrows and field lines, a stylised right hand (fingers
  along the current, thumb along the field), and a straight-trace variant (thumb along the current, fingers curling along
  the field). Mirrors with a transform when the current reverses. Also used as the lesson's theory figure.

Stations, in order, with the controls each shows:

| # | Station | Parts lit | Copper lit and animated | Law and readouts | Controls |
|---|---|---|---|---|---|
| 1 | Power in: J1 and Q1 | J1, Q1, R1 | VBAT, VM | Ohm's law on the FET channel and on the copper: V = I·R, P = I²·R | Left motor A, right motor A |
| 2 | The VM node | C1, C2, C3, U2 (VM pins), U3 (IN) | VM to U2, VM to U3 (two streams whose speeds add) | KCL: I_pack = I_L + I_R + I_LDO; i = C·dv/dt droop | Left motor, right motor, logic current |
| 3 | U3, the regulator | U3, C5, C2 | VM to U3, 3V3 | Power dissipation: P = (Vin − Vout)·I; Tj; buck what-if | Logic current, pack voltage |
| 4 | D1 and R3 | D1, R3 | 3V3 (the LED branch is drawn in the panel) | KVL: 3.3 − I·R − Vf = 0; LED current limiting | LED colour, R3 |
| 5 | The battery divider | R4, R5, C9 | VBAT_SENSE feed and node | Voltage divider and Thevenin; the 10 kΩ ADC rule | Pack voltage, C9 fitted |
| 6 | The EN network | R2, C8, SW2 | 3V3 (EN branch drawn in the panel) | RC time constant: τ = R·C, 75% at 1.39 τ | C8 value |
| 7 | C4 and C7: decoupling | C4, C7, C6 | 3V3 | V = L·di/dt; loop inductance from distance | Distance from pin |
| 8 | U2 to J2: the winding | U2, J2 | M1A, M1B (direction follows the toggle) | Right-hand rule; B around the trace; PWM ripple; flyback | Direction, PWM duty, left motor A |

Flow dots use the existing `makePath`, `FlowDots`, `dotSpeeds`, `dotCount` and `useFlowPhases` from
`OhmsLawCircuit.helpers`, so speed on screen is proportional to current with the same frame-safe cap; one dot spacing is
used for every stream on the board.

Probe mode: every part on the board is a focusable button (`aria-label="Inspect R3, 1 k resistor"`, `aria-pressed`).
Selecting one shows a card under the station panel: the part's role in plain words, its live readings from the same
model (for example R3: current, power, "comfortably inside the 100 mW of an 0603"), and a "Go to station N" button when
a station features it. Keyboard: Enter or Space selects, Escape or the Close button clears.

Play/pause: `useViz(true)`; starts paused under reduced motion; the `PlayPause` control sits in the VizFrame strip.

## 6. The lesson page (`src/content/pcb/components-in-action.tsx` and `.data.ts`)

Sections: `theory`, `viz`, `practice`, as in every PCB lesson. Theory is 700 to 1200 words, each law introduced in this
order: an everyday example, the rule in one sentence, the number on this board. The theory figure is a static power tree
of the board (pack → J1 → Q1 → VM node → U2 and motors, U3 → 3V3 → ESP32, LED, EN, decoupling) with each law pinned
where it acts, plus the right-hand-rule drawing. The viz section has a "Try this" callout with four checks whose numbers
match the model. Practice: one exercise with a worked answer in a code block: the full-load power budget and heat check
(KCL, Ohm on Q1, LDO heat), the LED resistor for a blue LED at 5 mA, and C8 for a 50 ms EN delay.

Data: 12 key terms; the scenario "Telemetry says the pack is at 7.0 V while the meter says 7.9 V" (root cause: the
32 kΩ Thevenin source cannot charge the ADC's sampling capacitor in time; fix: C9); six interview questions (two deep)
of three to six sentences; eight quiz questions, four choices each, answers spread across slots, written so the correct
choice is the single longest in one question and the single shortest in none (gate: `tests/quiz-length-tell.test.ts`
on the quiz branch).

Curriculum entry: slug `components-in-action`, track `pcb`, title "Components in action: one board, every law", day 4,
55 minutes, summary "Power up the robot's motor-driver board one part at a time and watch Ohm's law, Kirchhoff's laws,
the RC time constant and the right-hand rule work on real values.", three objectives (follow the current through the
board and name each part's job; apply the laws to the board with numbers; use the right-hand rule on a trace and a
winding). Day 4's `lessonSlugs` gets the new slug last.

References (`src/lib/references.ts`): new entries `ohm1827` (Die galvanische Kette, mathematisch bearbeitet, 1827),
`kirchhoff1845` (Annalen der Physik und Chemie 140(4), 497–514, doi 10.1002/andp.18451400402), `thevenin1883`
(Comptes rendus 97, 159–161), `feynman-ii` (The Feynman Lectures on Physics, Volume II, free at
feynmanlectures.caltech.edu); the lesson also cites `horowitz-hill`, `zumbahlen`, `ott`, `hughes-drury`,
`esp32-hw-guidelines`, `tb6612fng-ds` and `ams1117-ds`.

Cross-links: `passive-components.tsx` and `active-components.tsx` each get a one-line tip callout linking to
`/learn/pcb/components-in-action` ("See every one of these parts working on the robot's board").

## 7. Testing

- `tests/sim/board.test.ts`: every station function at the defaults and at the lesson's quoted points (the numbers in
  section 4), KCL closure, LED verdicts at the three colours, divider with and without C9, EN at the three capacitors,
  decoupling verdict boundaries, winding direction and ripple.
- `tests/components/board-in-action.test.tsx`: renders; eight stations reachable with Next and the step dots; the
  readouts at the defaults; a slider changes a readout; LED colour changes the current; the divider toggle changes the
  verdict; probe mode selects a part by click and by keyboard, shows its role, and "Go to station" moves the stepper;
  the board SVG is `role="group"` with 31 focusable part buttons (mounting holes are not buttons) and no nested `role="img"` conflicts; and a hydration
  check that renders four interactive states with nudged Math functions and requires identical markup (same approach as
  `tests/content/pcb-a.test.tsx`).
- `tests/content/pcb-c.test.tsx`: the lesson has `#theory`, `#viz`, `#practice`, a theory figure with an SVG, range or
  radio controls in the viz, 700 to 1200 theory words, a worked answer, and complete data with the same rules as
  `tests/content/pcb-a.test.tsx` (unique key terms, 3 to 6 sentences per interview answer, four distinct choices per
  question, answers not all in one slot). It also checks the quiz against the length-tell rule locally (no question's key
  is the single shortest; at most two are the single longest).
- `tests/curriculum.test.ts`: 38 lessons.
- Existing gates: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` (the hydration test covers the new
  body automatically through the generated registry).

## 8. Accessibility, determinism and performance

Every control is an existing labelled component (Slider, Segmented, Toggle, Stepper, PlayPause). The board's part buttons
are reachable by Tab and operable with Enter and Space. Live readouts sit in a `<dl aria-live="polite">`. The SVG keeps
under about 500 elements: 32 footprints, about 30 route polylines, at most 40 dots, one glow rect per lit part. All
coordinates derived from arithmetic on constants; the only transcendental value (the EN curve) is rounded to 1e-6 before
it becomes a path. Reduced motion stops the dots until the learner presses Play. The section-level error boundary in
`Section` and the one in `VizFrame` contain any throw.

## 9. Out of scope

A virtual multimeter (level C), any change to the shared board data file, encoder internals, the HC-SR04 5 V divider on
the board, and rebalancing other days of the plan.
