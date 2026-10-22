# EIS virtual bench — design spec

Date: 2026-10-22
Status: every decision below was approved by Vatsal in brainstorming. This written spec is awaiting review.

## 1. Purpose

Vatsal is building a real single-cell EIS (electrochemical impedance spectroscopy) tester on the AD5941 and ADI's CN0510
reference design. He owns the parts listed in his order list, except the Korad bench supply, which he will buy when the
First Board stage needs it. A 3D virtual bench on the Hardware Academy site lets him:

- rehearse each real bench step before doing it;
- learn the basics at the moment the project needs them;
- make the classic mistakes safely and see their real symptoms;
- get help with his real readings, not only the virtual ones.

This is the first of three sub-projects: the EIS bench, then a pocket assistant robot, then the rest of the component
library in 3D. Each gets its own spec and plan.

## 2. Sources and authority

The bench's content comes from Vatsal's documents in `~/Ideas Discussion/`:

| Document | Date | Used for |
|---|---|---|
| `EIS-BEGINNER-START-HERE.md` | 2026-09-07 | The learning sequence and the corrections. **Wins wherever the documents disagree.** |
| `Start-With-One-Milliohm.html` | 2026-09-04 | Achievements, targets table, cell ranges, troubleshooting table, standing rules |
| `BRINGUP-RUNBOOK.md` | 2026-09-07 | Session checklists, the BNC pre-flight, serial settings |
| `EIS-ORDER-LIST.md` | 2026-09-22 | The inventory and each part's status |
| `EIS-TESTER-BUILD-PLAN.md` | 2026-08-29 | Product definition and architecture |

These files live outside the repository. Every fact the bench uses is copied into `src/lib/bench/` data with a
`source` note naming the document. The bench states nothing beyond these documents, the ADI CN0510 materials they cite,
and standard textbook values (for example nominal cell voltages). Every model assumption (temperature coefficient,
contact-resistance spread, noise level, inductance) is marked as an assumption in the code and shown as "simulated" in
the interface.

## 3. Decisions made in brainstorming

| Question | Decision |
|---|---|
| Where it lives | In the Hardware Academy website |
| How hands-on | An open sandbox with guided missions inside it; switching between Guided and Free keeps the bench as it is |
| First sub-project | The virtual EIS bench; then the pocket assistant robot; then the rest of the components |
| Build approach | A 3D bench in React Three Fiber with a purpose-built TypeScript simulator, not a general circuit simulator |
| Assistant | Claude chat on a server route. `claude-haiku-5-5` by default, `claude-sonnet-5-5` by one setting; key on the server only; passcode on the deployed site |
| Real bench | Virtual and real: one lab log holds both, with gate checks and hints |
| Korad | A normal part of the virtual bench. The Parts tab says "not bought yet: needed at First Board"; its current-limit drill belongs to the First Board stage |
| Mission order | The beginner guide's learning sequence; the runbook's achievements are milestones |
| Foundation | Tasks 1-9 of the paused redesign plan (`docs/superpowers/plans/2026-10-22-simple-first-lessons.md`) are built first and reused; the lesson conversion stays paused |

## 4. The page

- Routes: `/bench` (index of benches; one entry for now) and `/bench/eis`. A "Bench" link joins the top menu.
- Layout on desktop: missions on the left, the 3D bench in the middle, the assistant on the right, and a drawer below
  with three tabs: Instrument, Lab log, Parts.
- **Guided mode**: the mission panel shows the current mission's steps. Steps tick themselves off when the bench state
  satisfies them, and the bench highlights the next thing to touch. A "Learn first" card opens before each new idea.
- **Free mode**: the mission panel folds away. The bench, the instrument, the warnings and the assistant all keep
  working.
- Switching modes never changes the bench. Returning to Guided resumes the mission at its first unfinished step.
- Parts tab: every part with its real-world status: on your bench, pending, or not bought yet.
- Phones: the panels become tabs (Missions, Bench, Assistant, Log) and the bench stays usable, if cramped. Desktop is the
  main target.

## 5. The bench world

### 5.1 Parts

From the order list, with their real status:

| Part | Status | Role on the bench |
|---|---|---|
| EVAL-AD5941BATZ (CN0510), four BNC jacks F+, S+, S−, F− | Owned | Measurement board |
| EVAL-ADICUP3029 with USB cable, micro-USB port P10 | Owned | Controller |
| BNC male to 4 mm banana adapters | Pending | Join the BNC jacks to the banana leads; centre pin only |
| Goupchn Kelvin clip leads (two), ZKE 4-wire fixture | Owned | Four-wire connections; the fixture takes AA and AAA |
| Shunt standards: 1 mΩ (Ohmite FC4L, ±2%, four terminals), 2, 10 and 25 mΩ (Vishay WSK2512, four terminals), 100 mΩ (Vishay WSL2512, ±1%), 7.5 mΩ (NOYITO panel shunt, screw lugs) | Owned | The accuracy ladder (Mission 5). The NOYITO terminal layout is marked "confirm on your part" |
| Alkaline AAA, AA (two brands), D (two brands), used | Owned | Unknown samples for experiments, not standards |
| Molicel P26A / Samsung 25R 18650, LiFePO4 26650 | Pending | Lithium presets for stage 2 |
| KAIWEETS multimeter | Owned | Open-circuit voltage; continuity on disconnected leads only |
| IR thermometer, USB microscope, ADuM3160 USB isolator, ESD mat and wrist strap, helping hands, metal tray, LiPo bag | Owned | Bench tools |
| Laptop | Owned | Runs the measurement software on the virtual bench |
| ESP32-S3 dev kits | Owned | Shown, not used until the custom-board stage |
| Korad KA3005DE bench supply | Not bought yet | Present on the virtual bench; needed for real at First Board |

### 5.2 Interactions

- Turn and zoom the camera, with presets for overview, boards and device under test.
- Pick up a part and place it on the mat.
- Connect a lead end to a connector or terminal: click the lead end, then the target. The red clip carries F+ and S+ on
  its two jaws, the black clip S− and F−.
- Seat cells in the ZKE fixture. D cells are held by clips in the helping hands, because they are too fat for the
  fixture.
- Plug and unplug USB, with or without the isolator in the path.
- On the virtual laptop: connect the software, choose the board, load firmware, power-cycle, measure at 1 kHz, run a
  sweep, and set the calibration value.
- Multimeter: DC volts on a cell; continuity on a disconnected lead. IR thermometer: read a cell's temperature.
  Microscope: inspect a board.

## 6. The simulator

Pure TypeScript in `src/lib/bench/`, with no React and no three.js, unit-tested on its own.

### 6.1 Devices under test

- **Shunts**: resistance = nominal × a tolerance draw fixed per part, plus a small series inductance (assumption), with
  each part's datasheet terminal map.
- **Cells**: a Randles model, Z(f) = R0 + Rct / (1 + j·2πf·Rct·Cdl) + Warburg. Presets are tuned so the real part at
  1 kHz falls inside the runbook's ranges:

  | Cell | Fresh | Used |
  |---|---|---|
  | AAA alkaline | 300-500 mΩ | 1-3 Ω |
  | AA alkaline | 150-250 mΩ | 0.5-2 Ω |
  | D alkaline | 80-150 mΩ | 0.3-1 Ω |
  | NiMH | 20-50 mΩ | 50-150 mΩ |
  | Molicel P26A / Samsung 25R / LiFePO4 (new, about 50% charge) | 15-20 / 20-25 / 10-20 mΩ | stage 2 |

  Impedance changes with temperature through a stated assumption. Open-circuit voltages are standard nominal values.

### 6.2 Contacts and leads

- Each contact gets a resistance drawn when it is made. A bite on bare metal gives a low, stable value; a bite on the
  wrapper or oxide gives a high, variable one (assumption).
- Lead resistance is included. A two-wire measurement adds leads and contacts; a four-wire measurement senses at the
  terminals and leaves a small residual.
- Sense on the force wire adds the force path between the tap and the terminal.
- A four-terminal shunt joined into two loops adds connection resistance to the sensed path.
- A BNC shell touching a cell terminal shorts the cell to board ground.

### 6.3 The instrument (CN0510 behaviour as documented)

A measurement is valid only when all of these hold:
- the boards are powered over USB;
- compatible firmware is running and the software is connected;
- a DC bias source is in the force loop, either a cell or the powered test setup.

Otherwise the result is "no valid measurement" with the reason, for example that the current sink needs a bias, which a
loose resistor cannot provide.

- Calibration: the onboard 50 mΩ reference is measured first; `RcalVal` must be `50.0`, in milliohms. `0.05` scales
  results by 1000; the external resistor's value scales them wrongly.
- Power order: connecting the cell before powering the boards, or powering down with it connected, is a fault.
- Frequency: reliable above 1 Hz; a 0.1 Hz point takes more than 40 seconds of bench time (fast-forward available).
- Noise: larger at low frequency, and near a switching supply placed close to the leads.
- Settling: readings drift for about 60 seconds after clipping (thermal EMF).
- Serial path: 230400 baud, 8N1, no flow control; a wrong baud rate gives no output.
- The ADuM3160 isolator is full-speed only; some debug interfaces fail through it, and bypassing it fixes that.
- Over-range: a cell above the 5 V project envelope is refused with a warning. The 5 V figure is the project envelope,
  not a verified rating; the eval board's own limit is in the CN0510 guide.

### 6.4 Mistake catalogue

Each row is reproducible in Free mode, shows its documented symptom, and is explained by the warnings and the assistant:

| Mistake | Simulated symptom |
|---|---|
| Clip biting the wrapper or oxide | Readings jump between reconnections |
| Sense on the force wire | Reads about 2-3× too high |
| No settle time | Slow drift |
| Calibration not run | Constant offset on everything |
| Switching supply near the leads | Noise at low frequency |
| Wrong baud rate | No serial output |
| Isolator in the debug path | Board won't enumerate or flash |
| BNC shell touching a cell | Short to board ground: fault and reset |
| Boards stacked offset by one | Board "killed": fault and reset |
| Cell connected before the boards are powered, or left connected at power-down | Power-order fault |
| `RcalVal` set to `0.05`, or to the external resistor's value | Results scaled wrongly (×1000 for `0.05`) |
| Continuity mode on a connected cell or a powered board | Warning; no measurement |
| Clipping straight onto a loose shunt | No valid measurement; explains the missing bias |
| Four-terminal shunt wired as two-terminal | Extra connection resistance in the reading |
| A 9 V battery connected | Over-range refusal |

### 6.5 Determinism

Every random draw (tolerances, contact resistance per connection, noise) comes from a seeded generator whose seed is
saved with the bench state. Server and browser render the same markup, and tests are repeatable.

## 7. Missions

| # | Mission (runbook milestone) | Learn first | Done when | Stage |
|---|---|---|---|---|
| 1 | **Identify**: ground the ESD mat and strap, create the log, lay everything out disconnected, read board names and revisions, keep the bag part numbers, map which lead fits which connector (BNC centre pin only), check continuity on disconnected leads only | Voltage, current and resistance; what each part does | A labelled inventory and connector map exist | 1 |
| 2 | **Communicate** (First Boot): microscope check, stack the boards, USB into P10 (isolator optional), SensorPal with compatible firmware, the DAPLINK device and a power cycle, no cell connected | The signal chain, laptop to cell | The board is recognised and numbers arrive with nothing connected | 1 |
| 3 | **First response**: power the boards, then connect an intact, identified cell; the onboard reference is measured first; one reading at 1 kHz | Four wires; what impedance is | One reading with frequency, units, wiring and calibration state recorded | 1 |
| 4 | **Repeat**: 10 readings without moving the leads, then 10 after reconnecting at the same contacts | Resolution, repeatability and accuracy | Mean and spread for both sets, with the variation explained | 1 |
| 5 | **Check accuracy** (First Milliohm): the shunt ladder on a powered test setup; the proposed milestone is a spread under 0.5 mΩ at 10 mΩ, which shows repeatability, not 1% accuracy | Why the current sink needs a bias | Error and spread logged per standard | 2 |
| 6 | **Sweep** (First Cell): from 1 kHz to a full sweep | Reading a Nyquist plot; series R plus (R ∥ C) makes the arc | Repeatable curves for a cell | 2 |

The powered test setup in Mission 5 is a virtual stand-in, labelled on the bench as "to be designed and verified on
your real bench". The bench never presents a specific hookup as verified.

Stage 2 also adds the comparison experiments as Free-mode activities: the size ladder (AAA → AA → D) and the brand
fight on unknown samples, and the lithium baseline once those cells arrive.

Mission engine: each step is a predicate over the bench state. Guided mode highlights the step's target part. A step
can be completed in either mode. The checked steps are saved with the bench state.

## 8. Learn-first cards

Each card is a short simple-first lesson: a big idea, one to three concept steps with a picture, and a quick check. It
is built from the redesign's building blocks (`BigIdea`, `ConceptStep`, `Picture`, `QuickCheck`, `Term`, `GoDeeper`)
and follows that spec's writing rules: total beginner, short sentences, and every comparison says where it stops being
true. The cards for stage 1 are:

1. voltage, current and resistance;
2. what each part does;
3. the signal chain;
4. four wires;
5. what impedance is;
6. resolution, repeatability and accuracy.

## 9. Lab log

- Columns from the runbook: date · time · DUT-ID · chemistry · nominal · temp °C · freq · Z_real · Z_imag ·
  clip-cycle · notes · raw-file. The beginner guide adds three more: calibration state, cell voltage, and whether the
  leads were reconnected. Each row also records its source, virtual or real.
- Units: frequency in Hz, impedance in mΩ, temperature in °C. The beginner guide asks for the displayed units to be
  recorded, so CSV import reads an optional `units` column (`mΩ` or `Ω`) and converts to mΩ, keeping the original unit
  in the row's notes.
- Stored in the browser under `hardware-academy:bench-log:v1`. CSV export goes to the spreadsheet; CSV import takes real
  readings, with a preview, per-row validation, and a report of any rows skipped and why.
- Checks without AI:
  - repeatability per DUT, with stationary and reconnection sets kept apart: mean, min, max and spread;
  - comparison against the development targets;
  - "a reading without a temperature is not data";
  - a missing calibration state;
  - the size-ladder order;
  - hints from the troubleshooting table, for example a large spread pointing at the clip contact, or a reading 2-3×
    too high pointing at sense on the force wire.

## 10. The assistant

- `POST /api/assist`, a Next.js route handler on the Node runtime, using `@anthropic-ai/sdk` and streaming the reply text
  to the browser.
- Model from `ASSIST_MODEL`: `claude-haiku-5-5` (default) or `claude-sonnet-5-5`; any other value is rejected.
  `output_config.effort: "low"` and `max_tokens: 4096`.
- Prompt:
  - a fixed system briefing built from the bench data: the standing rules, the corrections, the targets, the
    troubleshooting table, and the parts and their status, including that the Korad is not bought yet. It is cached
    with `cache_control`.
  - a user turn carrying the bench state as compact JSON, the mission and step, up to 30 recent log rows, and the
    question.
  - the conversation: up to the last 10 turns, kept in the browser and resent each time.
- `stop_reason: "refusal"` shows a plain message. Haiku has no server-side fallback, so none is configured. SDK errors
  map to plain messages, caught with the SDK's typed error classes.
- Security:
  - `ANTHROPIC_API_KEY` lives only on the server (`.env.local`, which git ignores, and Vercel settings) and never
    reaches the browser.
  - In production, the request must carry `ASSIST_PASSCODE`, compared in constant time. If no passcode is set in
    production, the route answers 503 "assistant switched off".
  - Request bodies are size-capped. Keys and passcodes are never logged.
- The panel says what is sent and that Claude can be wrong: "check the CN0510 guide for anything that could damage
  hardware".
- Cost, from current list prices: Haiku 5.5 is $0.10 / $0.50 per million input / output tokens (for prompts up to 100K
  tokens), about a tenth of a cent per question; Sonnet 5.5 is $2 / $10, about 1.5 cents.
- Missions, warnings and log checks never depend on the assistant. Without a key or a passcode the panel shows how to
  enable it, and everything else works.
- The key Vatsal shared in chat is written to `.env.local` when the assistant is built. Because it appeared in a chat
  transcript, he should replace it with a fresh key afterwards. It starts `sk-ant-usr-` rather than the usual
  `sk-ant-api…`; the first test call shows whether the API accepts it.

## 11. Architecture and files

| Path | Responsibility |
|---|---|
| `src/lib/bench/random.ts` | Seeded generator |
| `src/lib/bench/parts.ts` | Part catalogue: geometry hints, terminals, status, source notes |
| `src/lib/bench/dut.ts` | Shunt and cell impedance models and presets |
| `src/lib/bench/contacts.ts` | Leads, contacts, two- and four-wire paths |
| `src/lib/bench/instrument.ts` | Validity rules, calibration, noise, settling, sweep, limits |
| `src/lib/bench/faults.ts` | The mistake catalogue as detectors over the bench state |
| `src/lib/bench/state.ts` | Bench state, actions and reducer; save and restore |
| `src/lib/bench/missions.ts` | Missions, steps, predicates, resume rules |
| `src/lib/bench/log.ts` | Log rows, CSV import/export, checks and hints |
| `src/lib/bench/briefing.ts` | The assistant's system briefing, built from the data above |
| `src/components/bench/` | The page shell, `Bench3D` (lazy, no server rendering) and its low-poly models, `MissionPanel`, `LearnCard`, `InstrumentPanel` (Nyquist and Bode in SVG), `LabLog`, `PartsPanel`, `AssistantPanel`, `ModeToggle` |
| `src/app/bench/page.tsx`, `src/app/bench/eis/page.tsx` | Routes |
| `src/app/api/assist/route.ts` | The Claude route |

Bench state and mission progress are saved in the browser under `hardware-academy:bench:v1`. New dependency:
`@anthropic-ai/sdk`. The 3D models are built from primitives in code, like the existing motor scene; there are no
downloaded model files and no photographs.

## 12. Testing

- Unit tests for each `src/lib/bench/` module:
  - each preset's 1 kHz real part falls in its range;
  - R plus (R ∥ C) traces a semicircle;
  - two-wire adds leads and contacts and four-wire removes them;
  - sense on the force wire reads 2-3× high on the 10 mΩ standard with the default leads;
  - no bias gives no valid measurement, and `RcalVal = 0.05` gives ×1000;
  - every catalogue row triggers;
  - every step predicate is checked both ways, and missions resume correctly;
  - the CSV round trip and import validation work, and the repeatability statistics are right;
  - the briefing carries the part statuses and never contains a key.
- Route tests with the SDK mocked: passcode enforcement in production, 503 without a passcode, a missing key, refusal
  handling, rejected models, size caps.
- Component tests: the panels render; a mode switch keeps the bench; the assistant panel's disabled state.
- Hydration: the bench page's server-rendered markup is stable, and the 3D canvas renders only in the browser.
- Browser check at 1280 px and 375 px with a clean console.

## 13. Rollout

0. **Foundation:** Tasks 1-9 of the paused redesign plan.
1. **Bench stage 1:**
   - routes and the menu link;
   - the 3D bench with every part;
   - the simulator and the mistake catalogue;
   - Missions 1-4 with their learn cards;
   - the instrument, the lab log with checks, and the Parts tab;
   - the assistant, with the passcode;
   - README notes.

   Vatsal reviews it in the browser and signs off before stage 2.
2. **Bench stage 2:** Missions 5-6, the powered test setup stand-in, the sweep and the Nyquist card, the comparison
   experiments, and the lithium presets.
3. **Later:** the First Board stage (the Korad current-limit drill and Rev A bring-up), then the pocket robot under its
   own spec.

Vercel environment variables (`ANTHROPIC_API_KEY`, `ASSIST_PASSCODE`, optional `ASSIST_MODEL`) are set only with
Vatsal's approval.

Stage 1 is large. Its implementation plan may split it into three plans that land in order: the simulator, missions and
log (plain TypeScript); the page and 3D bench; and the assistant.

## 14. Non-goals

- No general circuit simulation.
- No control of real hardware (for example WebSerial to the real boards).
- No accounts or cloud storage.
- No EV packs or BESS equipment; this is single-cell only.
- The assistant does not replace the CN0510 guide or the datasheets.

## 15. Risks

| Risk | Mitigation |
|---|---|
| The bench teaches an unverified hookup | The corrections are built in; the powered test setup is a labelled stand-in; every fact carries a source note |
| Model assumptions read as facts | Assumptions are marked in code and shown as "simulated" |
| API cost or abuse | Passcode in production, low effort, `max_tokens` cap, size caps |
| Key exposure | Server-only key; the pasted key is replaced after setup |
| The assistant is wrong | A grounded briefing, an instruction to say when it is unsure, and the panel's warning |
| Slow 3D on modest devices | Low-poly models, lazy loading, phone tabs |
| Scope creep | Stages, with sign-off between them |

## 16. Success criteria

- Missions 1-4 can be completed in Guided mode.
- Every mistake in the catalogue reproduces in Free mode with its documented symptom.
- The lab log imports a real CSV and computes the repeatability statistics.
- The assistant answers with bench context on localhost and stays switched off in production without the passcode.
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass.
- Vatsal signs off on stage 1 before stage 2 starts.
