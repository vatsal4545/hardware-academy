# Hardware Academy — design spec

Date: 2026-10-16
Status: written under autonomous-mode assumptions. Every decision below is open to override by Vatsal.

## 1. Purpose

A personal learning site that takes Vatsal from fundamentals to interview-ready in roughly two weeks across five tracks:
semiconductors, PCB design, robotics (including building and simulating a small smart robot), EV powertrains
(Tesla motors and their evolution), and AI-assisted hardware design (the "AI generates a manufacturable heat pump" pipeline,
and how to put that kind of tool inside Claude).

Each lesson pairs theory with an interactive visualization, a practical exercise, a real-world problem scenario,
interview questions, and a quiz. Progress persists in the browser. The site is a Next.js app hosted on Vercel with the
source on GitHub.

### Success criteria

- `npm run build` and `npm test` pass; the project deploys to Vercel with zero extra configuration.
- Every lesson has: objectives, theory with figures, at least one interactive visualization, one real-world scenario,
  interview questions with model answers, a quiz, and a "mark complete" control.
- An in-browser robot simulator where the learner writes a controller in JavaScript and watches the robot run it.
- A component encyclopedia with an animated SVG illustration and a "how it works" explanation for each component.
- A 14-day plan page that links every lesson and shows progress.
- A careers page mapping the tracks to job roles, tools, portfolio projects, and resume bullets.

### Non-goals

- No backend, accounts, or database. Progress lives in `localStorage`.
- No photographs (licensing). Every component is drawn as SVG so it can animate. Photos can be added later.
- No video. No CMS. No user-generated content.

## 2. Audience and honest scope

Two weeks does not make a device physicist or a senior PCB designer. It can make someone who can explain how a MOSFET,
a PCB stack-up, a PID loop, and a permanent-magnet motor work, who has built and simulated a robot controller,
and who can answer first-round interview questions for roles such as hardware/electrical engineer (junior),
embedded or robotics software engineer, applications or field engineer at a semiconductor or EV company,
and technical product roles in hardware. The careers page states this plainly.

## 3. Approaches considered

A. **Next.js (App Router) + TSX lessons + Tailwind + Framer Motion + React Three Fiber** (chosen).
   Vercel-native, rich interactivity, every lesson is a React component so visualizations sit inline with theory.
   Risk: bundle size. Mitigation: 3D scenes are lazy-loaded and limited to two (motor, chip package).

B. **Astro + MDX with React islands.** Great for prose, but every lesson here is visualization-heavy, and mixing islands,
   shared state, and animation libraries adds friction. Not chosen.

C. **Single static HTML/canvas page.** Simplest deploy, but 37 lessons, routing, and progress tracking would become a tangle.
   Not chosen.

## 4. Architecture

Stack: Next.js 16 (App Router, TypeScript, static generation), Tailwind CSS v4, `motion` (Framer Motion),
`three` + `@react-three/fiber` + `@react-three/drei` (lazy-loaded), Vitest for pure-logic tests, ESLint.

```
src/
  app/                      routes (see below)
  content/
    <track>/<slug>.tsx      lesson body (default export: React component)
    <track>/<slug>.data.ts  lesson data: quiz, interview questions, scenario, key terms
    registry.ts             slug -> { data, Body } map (written once; lessons plug in)
  components/
    ui/                     buttons, cards, nav, progress ring, sliders, toggles
    lesson/                 LessonLayout, Section, Callout, Figure, KeyTerms, ScenarioCard,
                            InterviewQuestions, Quiz, MarkComplete, VizFrame
    viz/shared/             SVG helpers, PlayPause, animation hooks (reduced-motion aware)
    viz/<track>/            per-track visualizations
    labs/                   RobotSim, PidLab, ArmLab, TraceWidthLab
    encyclopedia/           component illustrations + data
  lib/
    curriculum.ts           tracks, lessons, days (single source of truth for navigation)
    progress.ts             useProgress hook (localStorage, SSR-safe)
    sim/                    pure logic: robot.ts, pid.ts, kinematics.ts, traceWidth.ts, motor.ts, pn.ts
tests/                      Vitest tests for src/lib/sim and curriculum integrity
docs/superpowers/           this spec and the implementation plan
DEPLOY.md, README.md
```

Routes:

| Route | Purpose |
|---|---|
| `/` | Hero, five track cards with progress, how-it-works, featured labs, start CTA |
| `/plan` | 14-day plan; each day lists lessons/labs with checkboxes and time estimates |
| `/learn/[track]` | Track overview, lesson list with completion state |
| `/learn/[track]/[slug]` | Lesson page (sidebar of track lessons, body, objectives rail, prev/next) |
| `/labs` | Index of labs |
| `/labs/robot-sim`, `/labs/pid`, `/labs/arm`, `/labs/trace-width` | Full-page labs |
| `/components` | Component encyclopedia with category filter |
| `/scenarios` | All real-world scenarios across tracks, with staged reveal |
| `/interview` | Question bank by track, plus mock-interview mode (random set, timer, reveal) |
| `/careers` | Roles, skills matrix, tools, portfolio projects, resume bullets, resources |

All routes are statically generated (`generateStaticParams` from `curriculum.ts`).

## 5. Content model

```ts
type TrackId = "semiconductors" | "pcb" | "robotics" | "ev" | "ai-design";

interface LessonMeta { slug: string; track: TrackId; title: string; day: number; minutes: number;
                       summary: string; objectives: string[]; }

interface QuizQuestion { q: string; choices: string[]; answer: number; explain: string; }
interface InterviewQuestion { q: string; a: string; level: "screen" | "deep"; }
interface Scenario { title: string; context: string; symptoms: string[]; hints: string[];
                     rootCause: string; fix: string; lesson: string; }
interface KeyTerm { term: string; def: string; }

interface LessonData { quiz: QuizQuestion[]; interview: InterviewQuestion[]; scenario: Scenario; keyTerms: KeyTerm[]; }
```

`curriculum.ts` holds every `LessonMeta`. `registry.ts` maps slug to its data module and lazily-imported body.
The interview and scenarios pages aggregate `*.data.ts` only, so they never pull visualization code.

## 6. Curriculum (37 lessons, 14 days, about 3 hours/day)

**Semiconductors (days 1-3)**: atoms-to-bands, doping-and-carriers, pn-junction-and-diodes,
transistors-bjt-mosfet, cmos-logic-and-chips, wafer-fabrication, packaging-and-testing, power-semiconductors,
semiconductor-industry-and-roles.

**PCB design (days 4-6)**: circuit-fundamentals, passive-components, active-components, schematic-capture,
pcb-layout-and-stackup, power-and-signal-integrity, dfm-and-manufacturing, bring-up-and-debugging,
kicad-project-walkthrough (designs the robot's motor-driver board).

**Robotics (days 7-10)**: anatomy-of-a-robot, sensors, actuators-and-drivers, microcontrollers-and-firmware,
control-systems-and-pid, kinematics-and-motion, perception-and-navigation, build-your-smart-robot
(BOM, wiring diagram, firmware skeleton), simulate-before-you-build (uses the robot sim lab),
ros2-and-the-robotics-stack.

**EV powertrain (days 11-12)**: ev-powertrain-architecture, three-phase-motors, inverters-pwm-and-foc,
batteries-and-bms, tesla-roadster-and-motor-evolution (2008 Roadster induction motor, Model S/X, Model 3/Y
IPM-SynRM, Plaid carbon-sleeved rotor, Cybertruck 800 V, second-generation Roadster claims flagged as claims),
ev-charging-systems (ties to Vatsal's EVCS work).

**AI-assisted design (day 13)**: cad-kernels-and-parametric-design, ai-agents-for-hardware-design
(the heat-pump pipeline: wiring/P&ID first, geometry second, DFM at "compile time"), build-a-claude-cad-tool
(an MCP server exposing a code-CAD kernel to Claude Desktop, with DFM check tool).

**Day 14**: interview marathon (mock mode), careers page, capstone checklist (robot build + KiCad board + write-up).

## 7. Visualizations (all `'use client'`, SVG unless noted, controls via shared Slider/Toggle/PlayPause)

Semiconductors: BandDiagram (temperature slider), DopingLattice, PNJunction (bias slider, depletion width, I-V plot),
MosfetCrossSection (Vgs/Vds, channel formation), CmosInverter, FabProcessStepper, PackageExploded (3D, lazy),
SwitchingLossCompare (Si vs SiC), IndustryMap.

PCB: OhmsLawCircuit (animated current), RcCharging, BuckConverter (duty slider), SchematicExplorer (net highlight),
PcbStackupExploded (2-layer / 4-layer), TraceWidthCalculator, DecouplingDemo, ReturnPathDemo, SmtAssemblyStepper,
DebugFlowchart, SchematicToLayout.

Robotics: SenseThinkAct, UltrasonicPing, QuadratureEncoder, HBridge, ServoPwm, StepperSteps, McuPeripheralMap,
I2cTransaction, PidTuner (shared with lab), DiffDriveKinematics, ArmKinematics (shared with lab), StateMachine,
WiringDiagram (robot build), RosGraph.

EV: EvDrivetrainFlow (regen toggle), ThreePhaseField (induction vs PM, speed slider), Motor3D (3D exploded, lazy),
ThreePhaseInverterPwm, BatteryPackExplorer, ChargingCurve, MotorEvolutionTimeline, TorqueSpeedCurve,
ChargingSessionFlow.

AI design: BRepExplorer (faces/edges/vertices), ParametricBracket, DesignPipeline (checks animate), McpSequence.

Every visualization honors `prefers-reduced-motion` (starts paused, still interactive).

## 8. Labs

**Robot simulator** (`/labs/robot-sim`). Pure logic in `lib/sim/robot.ts`: differential-drive kinematics,
arena with walls and obstacles and an optional line track, sensors (three ultrasonic rays, two line sensors,
wheel encoders, yaw rate), collision stop. Learner code is a JavaScript function
`control(sensors, memory) -> { left, right }` with wheel commands in -1..1, compiled with `new Function` inside
try/catch; runtime errors show in the panel. Presets: obstacle avoidance, line following, wall following, go-to-goal.
Canvas rendering, play/pause/step/reset, speed multiplier, three arenas, telemetry panel, sensor rays drawn.

**PID lab**: first-order motor model, PID with anti-windup, step response plot, Kp/Ki/Kd sliders, disturbance button.

**Arm lab**: 2-link planar arm, FK sliders, drag the target for IK, elbow-up/down toggle, reach envelope.

**Trace-width lab**: IPC-2221 calculator with copper weight, temperature rise, internal/external, plus via sizing notes.

## 9. Design system

Dark, technical "lab notebook" look. Tokens in `globals.css` via Tailwind v4 `@theme`: background `#0b0f17`,
surface `#121826`, border `#1f2937`, text `#e5e7eb`, muted `#9ca3af`. Track accents: semiconductors violet `#a78bfa`,
PCB green `#34d399`, robotics cyan `#22d3ee`, EV orange `#fb923c`, AI design amber `#fbbf24`.
Fonts: Inter (text) and JetBrains Mono (code, labels) via `next/font`. Mobile-first; lesson sidebar collapses.

Lesson page anatomy: breadcrumb and track pill; title, day, minutes; objectives; body sections
(theory, visualization, in practice, scenario, interview, quiz); key terms rail; prev/next; mark complete.

## 10. Progress persistence

`useProgress()` reads/writes `localStorage["hardware-academy:progress:v1"]`:
`{ completed: Record<slug, isoDate>, quiz: Record<slug, { score, total, at }>, labs: Record<labId, isoDate> }`.
SSR-safe (reads in `useEffect`), all reads wrapped in try/catch, export/import as JSON on the plan page.

## 11. Testing

Vitest over `src/lib/sim/*` (robot step, raycast, line sensor, PID convergence, FK/IK round trip, IPC-2221 known
values) and a curriculum integrity test (unique slugs, every slug registered, days 1-13 all non-empty, every lesson
data module has quiz, interview, scenario, key terms). Browser verification of key pages before deploy.

## 12. Repository and deployment

- Folder: `/Users/vatsalpatel/Projects/hardware-academy`, its own git repo, commits per milestone so the history
  reads as a step-by-step build.
- GitHub: public repo `vatsal4545/hardware-academy` created with `gh repo create --source . --push`.
  Public because the site is a portfolio piece; it can be flipped to private in one click.
- Vercel: the CLI is not installed or logged in on this Mac and the login is an OAuth step only Vatsal can do.
  `DEPLOY.md` gives both paths: `npx vercel login` then `npx vercel --prod`, or import the GitHub repo in the
  Vercel dashboard (which also enables preview deploys per push).

## 13. Assumptions made in autonomous mode

- Name: Hardware Academy. Repo visibility: public.
- Dark theme only (tokens allow a light theme later).
- Second-generation Tesla Roadster specifications are presented as announced claims, not shipped facts.
- Illustrations are SVG, not photographs.
