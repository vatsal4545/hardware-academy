# Hardware Academy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a Next.js learning site with 37 interactive lessons across five hardware tracks, four labs (including a programmable robot simulator), a component encyclopedia, scenarios, interview prep, a 14-day plan, and a careers page.

**Architecture:** Statically generated Next.js 16 App Router site. `src/lib/curriculum.ts` is the single source of truth for tracks, lessons and days; `src/content/registry.ts` maps each lesson slug to a data module (quiz, interview, scenario, key terms) and a lazily imported body component. Lesson bodies are React components that compose shared lesson building blocks and per-track visualization components. Pure simulation logic lives in `src/lib/sim` with Vitest tests; UI wraps it.

**Tech Stack:** Next.js 16.4, React 19, TypeScript, Tailwind CSS v4, `motion` (Framer Motion), `three` + `@react-three/fiber` + `@react-three/drei` (lazy), Vitest + jsdom + Testing Library, ESLint, npm, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-16-hardware-academy-design.md`

## Global Constraints

- Node 24, npm only. Never run `npm install` inside a content task; all dependencies are installed in Task 1.
- Parallel tasks (5-15) must never run `npm run build` or `npm run dev` (they share `.next/`). They verify with `npx tsc --noEmit`, `npx eslint <their paths>` and `npx vitest run <their test file>`.
- Parallel tasks must not commit. The integrator commits one commit per task after review.
- Parallel tasks only create files under their own paths listed in the task. They never edit shared files (`src/lib/*`, `src/components/ui/*`, `src/components/lesson/*`, `src/components/viz/shared/*`, `src/content/registry.ts`, `src/app/*` except where a task explicitly lists an `src/app/labs/...` page).
- No photographs, no `next/image`, no external assets, no new npm packages. All illustrations are inline SVG (or the two lazy 3D scenes).
- Every visualization honors reduced motion: it starts paused when `usePrefersReducedMotion()` is true and remains interactive.
- Theory text uses real numbers and names. Second-generation Tesla Roadster figures are labeled as announced claims.
- Site name: Hardware Academy. Dark theme only. Track colors from `src/lib/curriculum.ts`.

---

## Section C: Contracts (read before any task)

### C1. Types and curriculum (`src/lib/curriculum.ts`, written in Task 2)

```ts
export type TrackId = "semiconductors" | "pcb" | "robotics" | "ev" | "ai-design";

export interface Track {
  id: TrackId;
  name: string;         // "Semiconductors"
  tagline: string;
  color: string;        // hex, e.g. "#a78bfa"
  days: string;         // "Days 1-3"
}

export interface LessonMeta {
  slug: string;         // kebab-case, unique across tracks
  track: TrackId;
  title: string;
  day: number;          // 1..13
  minutes: number;
  summary: string;      // one sentence
  objectives: string[]; // 3-4 "You can ..." statements
}

export interface QuizQuestion { q: string; choices: string[]; answer: number; explain: string; }
export interface InterviewQuestion { q: string; a: string; level: "screen" | "deep"; }
export interface Scenario {
  title: string; context: string; symptoms: string[]; hints: string[];
  rootCause: string; fix: string; lesson: string;
}
export interface KeyTerm { term: string; def: string; }
export interface LessonData {
  keyTerms: KeyTerm[];          // >= 5
  scenario: Scenario;           // exactly one, >= 2 symptoms, >= 2 hints
  interview: InterviewQuestion[]; // >= 4, at least one level "deep"
  quiz: QuizQuestion[];         // >= 5, 4 choices each, answer is the index
}

export interface DayPlan { day: number; title: string; focus: string; lessonSlugs: string[]; labIds: string[]; }

export const tracks: Track[];
export const lessons: LessonMeta[];
export const days: DayPlan[];
export function trackById(id: TrackId): Track;
export function lessonsFor(track: TrackId): LessonMeta[];
export function lessonBySlug(slug: string): LessonMeta | undefined;
export function neighbors(slug: string): { prev?: LessonMeta; next?: LessonMeta };
```

Labs metadata in `src/lib/labs.ts`:

```ts
export interface LabMeta { id: "robot-sim" | "pid" | "arm" | "trace-width"; title: string; description: string; minutes: number; track: TrackId; }
export const labs: LabMeta[];
```

### C2. Lesson authoring contract

Every lesson is two files. `<slug>.data.ts`:

```ts
import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    { term: "Band gap", def: "Energy difference between the valence and conduction bands; 1.12 eV for silicon." },
    // >= 5 total
  ],
  scenario: {
    title: "Sensor board reads garbage above 125 °C",
    context: "A silicon-based sensor front end works on the bench but ...",
    symptoms: ["Readings drift upward with temperature", "Problem disappears below 100 °C"],
    hints: ["Junction leakage roughly doubles every 10 °C", "Which node has the highest impedance?"],
    rootCause: "Reverse leakage of the protection diodes flows into a 1 MΩ node ...",
    fix: "Lower the node impedance to 10 kΩ, pick a low-leakage diode, or move to an SOI/SiC part.",
    lesson: "Leakage, not just gain, sets the temperature ceiling of silicon circuits.",
  },
  interview: [
    { q: "Why is silicon a semiconductor and copper a conductor?", a: "...", level: "screen" },
    { q: "...", a: "...", level: "deep" },
    // >= 4 total
  ],
  quiz: [
    { q: "The band gap of silicon is about", choices: ["0.1 eV", "1.1 eV", "3.3 eV", "9 eV"], answer: 1, explain: "Silicon's band gap is 1.12 eV at 300 K." },
    // >= 5 total
  ],
};
export default data;
```

`<slug>.tsx` (the body; theory + visualization + practice only; scenario, interview, quiz, key terms and completion are rendered by the layout from the data file):

```tsx
"use client";
import { Section, Prose, Callout, Figure, Exercise, CodeBlock } from "@/components/lesson";
import { SvgCanvas, vizColors } from "@/components/viz/shared";
import { BandDiagram } from "@/components/viz/semiconductors/BandDiagram";

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Why silicon sits between copper and glass">
        <Prose>
          <p>Theory paragraphs with real numbers ...</p>
          <ul><li>...</li></ul>
        </Prose>
        <Figure caption="Metal, semiconductor and insulator band structures.">
          <SvgCanvas viewBox="0 0 600 240" title="Band diagrams of a metal, a semiconductor and an insulator">
            {/* static illustration */}
          </SvgCanvas>
        </Figure>
        <Callout kind="tip" title="Rule of thumb">Intrinsic carrier density roughly doubles every 10 °C ...</Callout>
      </Section>

      <Section id="viz" title="Interactive: heat the crystal">
        <BandDiagram />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Estimate the carrier density ratio">
          <p>Using n_i ∝ T^1.5 · exp(−Eg / 2kT), compute ...</p>
          <CodeBlock lang="text" code={"k = 8.617e-5 eV/K\nratio = ..."} />
        </Exercise>
      </Section>
    </>
  );
}
```

Rules for bodies:
- Ids `theory`, `viz`, `practice` must exist (extra sections allowed, any ids). 700-1200 words of theory. At least one static `Figure` with an inline SVG and at least one interactive visualization component.
- Use only the lesson components, shared viz helpers, your track's viz components and `src/lib/sim/*`.
- Do not import anything from another track or from `src/components/labs` (link with `<a href="/labs/robot-sim">` instead).

### C3. Lesson building blocks (`src/components/lesson`, written in Task 3)

```tsx
Section({ id: string; title: string; children })        // <section id><h2>title</h2>children</section>
Prose({ children })                                       // typography wrapper for p/ul/ol/table/code
Callout({ kind: "info" | "tip" | "warning" | "interview"; title?: string; children })
Figure({ caption: string; children })                     // figure + figcaption, centers an SVG
Exercise({ title: string; children })                     // bordered "In practice" card
CodeBlock({ code: string; lang?: string })                // <pre><code>, monospace, scrolls
VizFrame({ title: string; description?: string; controls?: ReactNode; children; footer?: ReactNode })
Slider({ label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; format?: (v: number) => string })
Toggle({ label: string; checked: boolean; onChange: (v: boolean) => void })
Segmented<T extends string>({ label?: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void })
PlayPause({ playing: boolean; onToggle: () => void; onReset?: () => void; onStep?: () => void })
Stepper({ steps: { title: string; body: ReactNode }[]; index: number; onChange: (i: number) => void; autoplayMs?: number })
```

Rendered by the layout, not by bodies: `ScenarioCard`, `InterviewQuestions`, `Quiz`, `KeyTermsRail`, `MarkComplete`.

### C4. Shared viz helpers (`src/components/viz/shared`, written in Task 3)

```tsx
SvgCanvas({ viewBox: string; title: string; className?: string; children })  // responsive <svg role="img" aria-label>
useAnimationFrame(callback: (dtSeconds: number, tSeconds: number) => void, playing: boolean)
usePrefersReducedMotion(): boolean
useViz(initialPlaying = true): { playing, setPlaying, t, reset }  // t advances only while playing; starts paused under reduced motion
vizColors: { bg, grid, text, muted, violet, green, cyan, orange, amber, red, blue, copper, mask, silk, substrate, electron, hole, positive, negative }
Arrow({ x1, y1, x2, y2, color?, width? })  // SVG line with marker
Label({ x, y, children, anchor?: "start" | "middle" | "end", size?: number, color? })
```

### C5. Simulation library (`src/lib/sim`)

Written in Task 2 (with tests):

```ts
// traceWidth.ts — IPC-2221
export function traceWidth(i: { currentA: number; tempRiseC: number; copperOz: number; layer: "external" | "internal" }): { areaMil2: number; widthMil: number; widthMm: number }
// pid.ts
export interface PidParams { kp: number; ki: number; kd: number; outMin?: number; outMax?: number }
export interface PidState { integral: number; prevMeasurement: number }
export function pidStep(p: PidParams, s: PidState, setpoint: number, measurement: number, dt: number): { output: number; state: PidState }
export function simulatePid(opts: { params: PidParams; setpoint: number; seconds: number; dt: number; plant: { gain: number; tau: number }; disturbanceAt?: number; disturbance?: number }): { t: number[]; y: number[]; u: number[]; overshootPct: number; settlingTime: number | null; steadyStateError: number }
// kinematics.ts
export function fk2(l1: number, l2: number, t1: number, t2: number): { x: number; y: number; elbow: { x: number; y: number } }
export function ik2(l1: number, l2: number, x: number, y: number, elbowUp?: boolean): { t1: number; t2: number } | null
export function diffDrive(vl: number, vr: number, wheelBase: number): { v: number; omega: number }
```

Written in Task 14 (labs task) with tests:

```ts
// robot.ts
export interface Vec { x: number; y: number }
export interface Segment { a: Vec; b: Vec }
export interface Circle { c: Vec; r: number }
export interface Arena { id: string; name: string; width: number; height: number; walls: Segment[]; obstacles: Circle[]; line?: Vec[]; goal?: Vec; start: { x: number; y: number; theta: number } }
export interface RobotState { x: number; y: number; theta: number; vl: number; vr: number; ticksL: number; ticksR: number; crashed: boolean; t: number }
export interface Sensors { ultrasonic: { left: number; front: number; right: number }; line: { left: 0 | 1; right: 0 | 1 }; encoders: { left: number; right: number }; yawRate: number; pose: { x: number; y: number; theta: number }; goal?: Vec; t: number }
export interface WheelCommand { left: number; right: number }   // -1..1, clamped
export const ROBOT: { wheelBase: 12; radius: 7; maxSpeed: 40; ticksPerCm: 10; sensorRange: 150; sensorAngles: [45, 0, -45]; lineSensorOffset: 6; lineSensorSpacing: 5; lineHalfWidth: 1.5 }
export function raycast(origin: Vec, angleRad: number, arena: Arena, maxRange: number): number
export function sense(state: RobotState, arena: Arena): Sensors
export function step(state: RobotState, cmd: WheelCommand, arena: Arena, dt: number): RobotState
export function initialState(arena: Arena): RobotState
export const arenas: Arena[]   // ids: "open-room", "line-track", "corridor"
export interface Preset { id: string; name: string; description: string; arenaId: string; code: string }
export const presets: Preset[] // ids: "obstacle-avoid", "line-follow", "wall-follow", "go-to-goal"
export function compileController(code: string): { control?: (s: Sensors, memory: Record<string, unknown>) => WheelCommand; error?: string }
```

### C6. Encyclopedia contract (`src/components/encyclopedia/types.ts`, written in Task 3)

```ts
export type ComponentCategory = "passive" | "active" | "power" | "sensor" | "actuator" | "compute" | "semiconductor" | "ev" | "connector";
export interface ComponentEntry {
  id: string; name: string; category: ComponentCategory;
  oneLiner: string;
  howItWorks: string[];          // 3-6 short paragraphs
  whereUsed: string[];           // 3-5 bullets
  keySpecs: { label: string; value: string }[];  // 3-6
  failureModes: string[];        // 2-4
  interviewTip: string;
  relatedLesson?: string;        // lesson slug
  Illustration: React.ComponentType<{ animate?: boolean }>;  // inline SVG, animates when animate=true
}
```

### C7. Content test contract

Each content task adds `tests/content/<task-id>.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Lesson from "@/content/semiconductors/atoms-to-bands";

describe("atoms-to-bands", () => {
  it("renders theory, viz and practice sections", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
```

Data completeness for every lesson is checked by `tests/curriculum.test.ts` (Task 2), which the integrator runs.

---
## Part A: Foundation (integrator-owned, sequential)

### Task 1: Scaffold the app, dependencies, test runner, design tokens

**Files:**
- Create (via create-next-app): `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/smoke.test.ts`
- Modify: `package.json` scripts, `src/app/globals.css` (tokens), `src/app/layout.tsx` (fonts, metadata)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `test` (`vitest run`), `test:watch`; CSS tokens listed below; `@/*` path alias; jsdom test environment with polyfills.

- [ ] **Step 1: Scaffold into the existing repo folder**

```bash
cd /Users/vatsalpatel/Projects/hardware-academy
npx -y create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes --disable-git --no-agent-feedback
```
Expected: `src/app`, `package.json`, `next.config.ts` exist; `docs/` and `.git/` untouched.

- [ ] **Step 2: Install runtime and test dependencies**

```bash
npm i motion three @react-three/fiber @react-three/drei
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @types/three vite-tsconfig-paths
```

- [ ] **Step 3: Add the Vitest config and setup**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    css: false,
  },
});
```

`tests/setup.ts`:
```ts
class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
const g = globalThis as unknown as Record<string, unknown>;
g.ResizeObserver ??= ResizeObserverStub;
if (typeof window !== "undefined") {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
    })) as typeof window.matchMedia;
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16)) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as typeof window.cancelAnimationFrame;
  }
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
```

`tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("test runner", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Design tokens and fonts**

Replace `src/app/globals.css` with:
```css
@import "tailwindcss";

@theme {
  --color-bg: #0b0f17;
  --color-surface: #121826;
  --color-surface-2: #1a2235;
  --color-border: #1f2937;
  --color-text: #e5e7eb;
  --color-muted: #9ca3af;
  --color-semiconductors: #a78bfa;
  --color-pcb: #34d399;
  --color-robotics: #22d3ee;
  --color-ev: #fb923c;
  --color-ai-design: #fbbf24;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, SFMono-Regular, monospace;
}

html { color-scheme: dark; }
body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-sans); }
```

`src/app/layout.tsx` loads Inter and JetBrains Mono via `next/font/google` with CSS variables `--font-inter` and `--font-jetbrains`, sets metadata title "Hardware Academy" and description "Silicon to motion: a 14-day hands-on path through semiconductors, PCBs, robotics, EV powertrains and AI-assisted design."

- [ ] **Step 5: Verify**

```bash
npm run build && npm test && npm run lint
```
Expected: build succeeds, 1 test passes, lint clean.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "Scaffold Next.js 16 app with Tailwind, Vitest and design tokens"`

---

### Task 2: Curriculum, simulation library, registry and stubs

**Files:**
- Create: `src/lib/curriculum.ts`, `src/lib/labs.ts`, `src/lib/sim/traceWidth.ts`, `src/lib/sim/pid.ts`, `src/lib/sim/kinematics.ts`, `src/lib/sim/index.ts`
- Create: `scripts/gen-registry.ts` (Node 24 runs TypeScript directly), `src/content/registry.ts` (generated), 37 × `src/content/<track>/<slug>.tsx` and `.data.ts` stubs (generated only when missing)
- Test: `tests/sim/traceWidth.test.ts`, `tests/sim/pid.test.ts`, `tests/sim/kinematics.test.ts`, `tests/curriculum.test.ts`, `tests/content-complete.test.ts`

**Interfaces:**
- Produces: everything in C1 and the Task-2 half of C5.

- [ ] **Step 1: Write failing sim tests**

`tests/sim/traceWidth.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { traceWidth } from "@/lib/sim/traceWidth";
describe("traceWidth (IPC-2221)", () => {
  it("1 A, 10 °C rise, 1 oz external is about 12 mil", () => {
    const r = traceWidth({ currentA: 1, tempRiseC: 10, copperOz: 1, layer: "external" });
    expect(r.widthMil).toBeGreaterThan(11); expect(r.widthMil).toBeLessThan(13);
    expect(r.widthMm).toBeCloseTo(r.widthMil * 0.0254, 3);
  });
  it("internal layers need roughly 2.6x the width", () => {
    const e = traceWidth({ currentA: 1, tempRiseC: 10, copperOz: 1, layer: "external" });
    const i = traceWidth({ currentA: 1, tempRiseC: 10, copperOz: 1, layer: "internal" });
    expect(i.widthMil / e.widthMil).toBeGreaterThan(2.4); expect(i.widthMil / e.widthMil).toBeLessThan(2.8);
  });
  it("2 oz copper halves the width", () => {
    const a = traceWidth({ currentA: 3, tempRiseC: 20, copperOz: 1, layer: "external" });
    const b = traceWidth({ currentA: 3, tempRiseC: 20, copperOz: 2, layer: "external" });
    expect(b.widthMil).toBeCloseTo(a.widthMil / 2, 3);
  });
});
```

`tests/sim/pid.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { simulatePid, pidStep } from "@/lib/sim/pid";
const plant = { gain: 1, tau: 0.5 };
describe("pid", () => {
  it("P-only leaves steady-state error", () => {
    const r = simulatePid({ params: { kp: 2, ki: 0, kd: 0 }, setpoint: 1, seconds: 6, dt: 0.01, plant });
    expect(r.steadyStateError).toBeGreaterThan(0.2);
  });
  it("PI removes steady-state error", () => {
    const r = simulatePid({ params: { kp: 2, ki: 2, kd: 0 }, setpoint: 1, seconds: 8, dt: 0.01, plant });
    expect(Math.abs(r.steadyStateError)).toBeLessThan(0.02);
  });
  it("clamps output", () => {
    const { output } = pidStep({ kp: 100, ki: 0, kd: 0, outMin: -1, outMax: 1 }, { integral: 0, prevMeasurement: 0 }, 10, 0, 0.01);
    expect(output).toBe(1);
  });
  it("reports overshoot for an aggressive loop", () => {
    const r = simulatePid({ params: { kp: 20, ki: 40, kd: 0 }, setpoint: 1, seconds: 4, dt: 0.005, plant });
    expect(r.overshootPct).toBeGreaterThan(5);
  });
});
```

`tests/sim/kinematics.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { fk2, ik2, diffDrive } from "@/lib/sim/kinematics";
describe("kinematics", () => {
  it("fk2 straight arm", () => { const p = fk2(1, 1, 0, 0); expect(p.x).toBeCloseTo(2); expect(p.y).toBeCloseTo(0); });
  it("ik2 round-trips", () => {
    for (const [t1, t2] of [[0.3, 0.8], [1.2, -0.5], [-0.4, 1.9]]) {
      const p = fk2(1, 0.8, t1, t2);
      const s = ik2(1, 0.8, p.x, p.y, t2 < 0)!;
      const q = fk2(1, 0.8, s.t1, s.t2);
      expect(q.x).toBeCloseTo(p.x, 6); expect(q.y).toBeCloseTo(p.y, 6);
    }
  });
  it("ik2 returns null when unreachable", () => { expect(ik2(1, 1, 3, 0)).toBeNull(); });
  it("diffDrive", () => {
    expect(diffDrive(1, 1, 0.1)).toEqual({ v: 1, omega: 0 });
    expect(diffDrive(-1, 1, 2).omega).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: Run tests, expect failures** — `npx vitest run tests/sim` → "Failed to resolve import".

- [ ] **Step 3: Implement the sim library**

`traceWidth.ts`: `k = layer === "external" ? 0.048 : 0.024`; `areaMil2 = (currentA / (k * tempRiseC ** 0.44)) ** (1 / 0.725)`; `widthMil = areaMil2 / (copperOz * 1.378)`; `widthMm = widthMil * 0.0254`.

`pid.ts`: `pidStep` uses error = setpoint − measurement, integral += error·dt (skip accumulating when output is saturated in the same direction: anti-windup), derivative on measurement `−(measurement − prevMeasurement)/dt`, clamp to `[outMin, outMax]` (defaults ±Infinity). `simulatePid` integrates the first-order plant `y' = (gain·u − y)/tau` with forward Euler, adds `disturbance` to `u` from `disturbanceAt`, computes `overshootPct = max(0, (max(y) − setpoint)/setpoint·100)`, `settlingTime` = first time after which |y − setpoint| stays within 2% (null if never), `steadyStateError` = setpoint − mean of last 5% of samples.

`kinematics.ts`: `fk2` standard; `ik2` via law of cosines: `c2 = (x²+y²−l1²−l2²)/(2 l1 l2)`, null if |c2| > 1, `t2 = ±acos(c2)` (negative for elbowUp=true… choose sign so that `elbowUp` means t2 ≤ 0), `t1 = atan2(y,x) − atan2(l2 sin t2, l1 + l2 cos t2)`; `diffDrive(vl, vr, L) = { v: (vl+vr)/2, omega: (vr−vl)/L }`.

- [ ] **Step 4: Run tests, expect pass** — `npx vitest run tests/sim`.

- [ ] **Step 5: Write `src/lib/curriculum.ts` and `src/lib/labs.ts`**

Exact track definitions:
```ts
export const tracks: Track[] = [
  { id: "semiconductors", name: "Semiconductors", tagline: "From atoms to chips: how silicon becomes logic and power.", color: "#a78bfa", days: "Days 1-3" },
  { id: "pcb", name: "PCB Design", tagline: "From schematic to a manufactured, debugged board.", color: "#34d399", days: "Days 4-6" },
  { id: "robotics", name: "Robotics", tagline: "Sense, think, act: build and simulate a smart robot.", color: "#22d3ee", days: "Days 7-10" },
  { id: "ev", name: "EV Powertrain", tagline: "Motors, inverters, batteries and the Tesla lineage.", color: "#fb923c", days: "Days 11-12" },
  { id: "ai-design", name: "AI-Assisted Design", tagline: "CAD kernels, design agents and a Claude CAD tool.", color: "#fbbf24", days: "Day 13" },
];
```
Lessons: the 37 entries listed in Part B with the stated day and minutes, each with a one-sentence summary and 3-4 objectives written from the lesson spec. Days: 1 → L1-L3; 2 → L4-L6; 3 → L7-L9; 4 → L10-L12; 5 → L13-L15 + lab `trace-width`; 6 → L16-L18; 7 → L19-L21; 8 → L22-L24 + labs `pid`, `arm`; 9 → L25-L26; 10 → L27-L28 + lab `robot-sim`; 11 → L29-L31; 12 → L32-L34; 13 → L35-L37; 14 → no lessons, title "Interview marathon and capstone", focus "Mock interview mode, careers page, capstone checklist".

`labs.ts`: four entries (`robot-sim` "Robot simulator" 60 min robotics; `pid` "PID tuning lab" 25 min robotics; `arm` "2-link arm kinematics" 20 min robotics; `trace-width` "Trace width calculator" 10 min pcb).

- [ ] **Step 6: Registry generator and stubs**

`scripts/gen-registry.ts` imports `../src/lib/curriculum.ts`, writes `src/content/registry.ts` (header comment "generated by scripts/gen-registry.ts"), importing every `<track>/<slug>.data` statically and every body via `dynamic(() => import("./<track>/<slug>"))`, and creates missing stub files:

Stub body: `"use client"; import { Section, Prose } from "@/components/lesson"; export default function Lesson() { return <Section id="theory" title="This lesson is being written"><Prose><p>Check back soon.</p></Prose></Section>; }`

Stub data: `LessonData` with empty arrays and a scenario whose every field is `"TODO"`.

Add script `"gen:registry": "node scripts/gen-registry.ts"` and run it.

- [ ] **Step 7: Curriculum tests**

`tests/curriculum.test.ts` (must pass now): unique slugs; every lesson track exists; `days` covers 1..14; every day 1-13 has lessons; every `days[].lessonSlugs` entry exists; every lesson slug appears in some day; `neighbors` of the first lesson has no prev; registry has an entry for every slug in both maps.

`tests/content-complete.test.ts` (expected to fail until Part B lands; the integrator runs it in Task 17): for every lesson, `lessonData[slug]` has ≥5 key terms, ≥4 interview questions with ≥1 `deep`, ≥5 quiz questions with exactly 4 choices and `answer` in range, and scenario fields non-empty and not "TODO".

- [ ] **Step 8: Verify and commit** — `npx vitest run tests/sim tests/curriculum.test.ts && npx tsc --noEmit`, then `git commit -m "Add curriculum, simulation library, registry and lesson stubs"`.

---

### Task 3: UI kit, lesson building blocks, shared viz helpers, progress, encyclopedia placeholder

**Files:**
- Create: `src/components/ui/{Container,Nav,Footer,Card,Button,ProgressRing,TrackPill}.tsx`
- Create: `src/components/lesson/{index.ts,Section,Prose,Callout,Figure,Exercise,CodeBlock,VizFrame,Slider,Toggle,Segmented,PlayPause,Stepper,ScenarioCard,InterviewQuestions,Quiz,KeyTermsRail,MarkComplete}.tsx`
- Create: `src/components/viz/shared/{index.ts,SvgCanvas,hooks,colors,primitives}.tsx`
- Create: `src/lib/progress.tsx` (`ProgressProvider`, `useProgress`)
- Create: `src/components/encyclopedia/types.ts`, `src/components/encyclopedia/entries/index.ts` (exports `entries: ComponentEntry[] = []`), `src/components/encyclopedia/EncyclopediaBrowser.tsx` (placeholder that lists entries; replaced in Task 15)
- Test: `tests/components/quiz.test.tsx`, `tests/components/controls.test.tsx`, `tests/progress.test.tsx`

**Interfaces:**
- Produces: C3, C4, C6, and:
```ts
// src/lib/progress.tsx
export interface ProgressState { completed: Record<string, string>; quiz: Record<string, { score: number; total: number; at: string }>; labs: Record<string, string>; }
export function ProgressProvider({ children }): JSX.Element   // wraps app in layout
export function useProgress(): { state: ProgressState; ready: boolean; markComplete(slug: string): void; unmark(slug: string): void; recordQuiz(slug: string, score: number, total: number): void; markLab(id: string): void; exportJson(): string; importJson(json: string): boolean; reset(): void; }
export const PROGRESS_KEY = "hardware-academy:progress:v1";
```

- [ ] **Step 1: Failing tests**

`tests/components/quiz.test.tsx`: render `<Quiz slug="x" questions={[two questions]} />` inside `ProgressProvider`; click the correct choice for Q1 and a wrong one for Q2; click "Check answers"; expect text "1 / 2" and both explanations visible.

`tests/components/controls.test.tsx`: `Slider` calls `onChange` with a number when the range input fires `change`; `Segmented` calls `onChange` with the clicked value; `Stepper` "Next" button advances `onChange(index + 1)`.

`tests/progress.test.tsx`: `markComplete("a")` then `state.completed.a` is an ISO string and `localStorage[PROGRESS_KEY]` contains `"a"`; `importJson("{bad")` returns false.

- [ ] **Step 2: Run tests, expect failures.**

- [ ] **Step 3: Implement**

Design notes: `Nav` is sticky, shows the logo text "Hardware Academy", links Plan, Learn, Labs, Components, Scenarios, Interview, Careers, and a progress pill "N / 37 lessons" (from `useProgress`). Mobile: links collapse behind a "Menu" button. `Card` is a bordered `surface` panel with optional accent color stripe. `TrackPill` renders the track name in its color. `ProgressRing` is an SVG ring with a percentage.

`Quiz`: one radio group per question, "Check answers" button, score line "X / N correct", per-question explanation shown after checking, "Try again" resets, `recordQuiz` on check. `ScenarioCard`: context and symptoms visible; "Show hint" reveals hints one at a time; "Reveal root cause" shows root cause, fix and lesson. `InterviewQuestions`: accordion (`<details>`), level badge. `MarkComplete`: toggles completion with a check icon. `KeyTermsRail`: definition list.

`Slider` uses `<input type="range">` with the label and formatted value; `Toggle` is a switch button with `aria-pressed`; `Segmented` is a radio-group of buttons; `PlayPause` shows Play/Pause, optional Step and Reset; `Stepper` shows step `index + 1 / n`, title, body, Prev/Next, and when `autoplayMs` is set, a Play/Pause that advances automatically.

`hooks.tsx`: `usePrefersReducedMotion` (matchMedia, SSR-safe), `useAnimationFrame(cb, playing)` using rAF with dt clamped to 0.05 s, `useViz(initialPlaying)` returning `{ playing, setPlaying, t, reset }` where `t` increments while playing.

`colors.ts` exact values: bg `#0b0f17`, grid `#1f2937`, text `#e5e7eb`, muted `#9ca3af`, violet `#a78bfa`, green `#34d399`, cyan `#22d3ee`, orange `#fb923c`, amber `#fbbf24`, red `#f87171`, blue `#60a5fa`, copper `#d98c3f`, mask `#1f7a4d`, silk `#f3f4f6`, substrate `#c8b67a`, electron `#22d3ee`, hole `#fb7185`, positive `#f87171`, negative `#60a5fa`.

- [ ] **Step 4: Run tests, expect pass; `npx tsc --noEmit`; `npm run lint`.**

- [ ] **Step 5: Commit** — `git commit -m "Add UI kit, lesson building blocks, viz helpers and progress tracking"`.

---

### Task 4: Routes

**Files:**
- Create: `src/app/page.tsx`, `src/app/not-found.tsx`, `src/app/plan/page.tsx`, `src/app/learn/page.tsx`, `src/app/learn/[track]/page.tsx`, `src/app/learn/[track]/[slug]/page.tsx`, `src/app/learn/[track]/[slug]/LessonShell.tsx` (client: sidebar, body, rails, data-driven sections), `src/app/labs/page.tsx`, `src/app/components/page.tsx`, `src/app/scenarios/page.tsx`, `src/app/scenarios/ScenarioBrowser.tsx` (client: filter by track), `src/app/interview/page.tsx`, `src/app/interview/InterviewBank.tsx` (client: filter, search, mock mode with 10 random questions, 90-second timer per question, reveal), `src/app/careers/page.tsx` (placeholder heading; content in Task 16)
- Modify: `src/app/layout.tsx` (Nav, Footer, ProgressProvider)

**Interfaces:**
- Consumes: C1, C3, `registry.ts`, `useProgress`.

- [ ] **Step 1: Lesson route** — `generateStaticParams` from `lessons`; the page is a server component that resolves `lessonBySlug`, `lessonData[slug]`, `lessonBodies[slug]`, `neighbors(slug)` and renders `LessonShell` with the body as a child. `LessonShell` layout: breadcrumb (Learn / Track / Lesson), `TrackPill`, title, "Day N · M min", objectives list, body, then `ScenarioCard`, `InterviewQuestions`, `Quiz`, `MarkComplete`, prev/next links; left sidebar lists the track's lessons with completion checks (collapsible on mobile); right rail shows key terms.
- [ ] **Step 2: Track route** — header with tagline and days, lesson list with day grouping, minutes and completion state, progress bar.
- [ ] **Step 3: Home** — hero ("Silicon to motion"), "Start Day 1" CTA, five track cards with progress, "How a lesson works" (theory → visualization → practice → scenario → interview → quiz), featured labs, 14-day summary strip.
- [ ] **Step 4: Plan** — 14 day cards: title, focus, lesson rows with checkbox state, lab rows, total minutes; export/import progress buttons (JSON textarea).
- [ ] **Step 5: Labs index, Components page (renders `EncyclopediaBrowser`), Scenarios (all lessons' scenarios via `ScenarioBrowser`), Interview (`InterviewBank` over all lessons' questions), Careers placeholder, not-found.
- [ ] **Step 6: Verify** — `npm run build` lists all `/learn/<track>/<slug>` routes; `npm test`; `npm run lint`; open `/`, `/plan`, one lesson in the browser.
- [ ] **Step 7: Commit** — `git commit -m "Add routes: home, plan, tracks, lessons, labs, components, scenarios, interview"`.

---
## Part B: Content tasks (parallel, one fresh worker each)

Every content task follows the same steps; the lesson specs differ.

**Common steps for Tasks 5-13:**

- [ ] **Step 1:** Read `docs/superpowers/plans/2026-10-16-hardware-academy.md` section C (contracts) and your task's lesson specs. Read `src/components/lesson/index.ts`, `src/components/viz/shared/index.ts` and one existing lesson under `src/content/` if any is complete.
- [ ] **Step 2:** Write the content test `tests/content/<task-id>.test.tsx` covering every lesson in the task (C7). Run `npx vitest run tests/content/<task-id>.test.tsx` and confirm it fails (stub bodies have no `#viz`).
- [ ] **Step 3:** For each lesson, in order: write `<slug>.data.ts` (replace the stub), write the visualization component(s) under `src/components/viz/<track>/`, write `<slug>.tsx` (replace the stub).
- [ ] **Step 4:** `npx vitest run tests/content/<task-id>.test.tsx` → pass. `npx tsc --noEmit` → no errors in your files. `npx eslint src/content/<track> src/components/viz/<track> tests/content/<task-id>.test.tsx` → clean.
- [ ] **Step 5:** Report: list of files, word count per lesson, any spec deviation. Do not commit.

**Quality bar for every lesson:** 700-1200 words of theory in plain, specific language; every claim with a number or a name; one static SVG figure drawn with `SvgCanvas`; one or more interactive visualizations with real controls; a practice exercise with concrete numbers and an answer; a scenario that reads like a real incident; interview answers of 3-6 sentences that a candidate could say aloud; quiz explanations that teach.

### Task 5: Semiconductors A (`semis-a`) — lessons L1-L5

**Files:** `src/content/semiconductors/{atoms-to-bands,doping-and-carriers,pn-junction-and-diodes,transistors-bjt-mosfet,cmos-logic-and-chips}.{tsx,data.ts}`, `src/components/viz/semiconductors/{BandDiagram,DopingLattice,PNJunction,MosfetCrossSection,CmosInverter}.tsx`, `tests/content/semis-a.test.tsx`

#### L1 `atoms-to-bands` — "From atoms to energy bands" (day 1, 40 min)
Theory: silicon atom (14 electrons, 4 valence), diamond-cubic lattice and covalent bonds; discrete levels become bands in a crystal; valence band, conduction band, band gap; Si 1.12 eV, Ge 0.66 eV, GaAs 1.42 eV, SiC 3.26 eV, GaN 3.4 eV, SiO2 about 9 eV; metals have overlapping bands; intrinsic carrier density of Si about 1e10 cm⁻³ at 300 K and roughly doubling every 10 °C; why silicon won (native oxide, abundance, cost); why wide-bandgap matters for EVs.
Figure: metal, semiconductor, insulator band diagrams side by side.
Viz `BandDiagram`: temperature slider 0-600 K, material `Segmented` (Si, Ge, GaAs, SiC); electrons animate hopping from valence to conduction band with rate ∝ exp(−Eg/2kT); readout of relative n_i and a conductivity bar.
Practice: compute the n_i ratio between 300 K and 400 K for Si (about 900×) and explain why SiC devices can run at 200 °C.
Scenario: sensor front end reads garbage above 125 °C (junction leakage into a high-impedance node).

#### L2 `doping-and-carriers` — "Doping, electrons and holes" (day 1, 40 min)
Theory: intrinsic vs extrinsic; donors (P, As) give n-type, acceptors (B) give p-type; majority/minority carriers; n·p = n_i²; typical doping 1e15-1e20 cm⁻³; σ = q(nμn + pμp) with μn ≈ 1400 and μp ≈ 450 cm²/V·s in Si; drift vs diffusion; resistivity and sheet resistance; how dopants get in (diffusion, ion implantation, anneal).
Figure: lattice with a phosphorus atom and its free electron; lattice with boron and a hole.
Viz `DopingLattice`: `Segmented` intrinsic/n-type/p-type; concentration slider; apply-field `Toggle` makes electrons and holes drift in opposite directions; readouts n, p, σ.
Practice: resistivity of n-Si at 1e16 cm⁻³ (about 0.45 Ω·cm).
Scenario: two "identical" wafers differ 3× in resistivity (missed activation anneal).

#### L3 `pn-junction-and-diodes` — "The p-n junction and diodes" (day 1, 50 min)
Theory: diffusion at the junction, depletion region, built-in potential ≈ 0.6-0.7 V in Si; forward bias I = I_s(exp(V/nV_T) − 1), V_T = 26 mV at 300 K; reverse leakage and breakdown (avalanche, Zener); diode families: rectifier (1N4007), Schottky (0.2-0.4 V, fast), Zener (reference), LED (direct-gap, color = Eg: red ≈ 1.8 eV, blue ≈ 2.7 eV), photodiode; junction capacitance; datasheet terms Vf, If, Vr, trr.
Figure: junction cross-section with depletion region and band bending.
Viz `PNJunction`: bias slider −5 to +1 V; depletion width ∝ sqrt(V_bi − V); carriers animate crossing in forward bias and are blocked in reverse; live I-V curve with marker; `Segmented` Si/Schottky changes Vf.
Practice: multimeter diode test; series resistor for an LED (5 V, Vf 2 V, 10 mA → 300 Ω, use 330 Ω).
Scenario: reverse-polarity protection diode runs hot at 1 A (1 W in a 1N4007; use Schottky or P-MOSFET ideal diode).

#### L4 `transistors-bjt-mosfet` — "Transistors: BJT and MOSFET" (day 2, 55 min)
Theory: NPN BJT (β 50-300, Vbe 0.7 V, active vs saturation); MOSFET structure (gate, oxide, body), threshold voltage, inversion channel; cutoff/triode/saturation; I_D = ½μCox(W/L)(Vgs − Vth)²; as a switch: Rds(on), gate charge, logic-level parts; why MOSFETs won (voltage control, scaling, no static current); power MOSFET vertical structure and body diode; gate driving.
Figure: labeled NMOS cross-section.
Viz `MosfetCrossSection`: Vgs 0-5 V and Vds 0-5 V sliders; channel appears above Vth = 1.5 V with density shading; pinch-off shown; region label; output-curve plot with the operating point.
Practice: choose a MOSFET to switch a 2 A motor from a 3.3 V MCU (Vgs(th) < 2 V, Rds(on) specified at 2.5 V, I²R loss).
Scenario: "MOSFET is on but hot" (10 V-threshold part driven from 3.3 V, linear region).

#### L5 `cmos-logic-and-chips` — "CMOS logic: from gates to chips" (day 2, 50 min)
Theory: CMOS inverter, no static current, P = αCV²f; NAND/NOR; combinational vs sequential, flip-flops, clock; gates → ALU → CPU; SRAM (6T), DRAM (1T1C, refresh), Flash (floating gate); transistor counts in the tens of billions; node names are marketing; planar → FinFET → gate-all-around; TDP and thermal limits.
Figure: CMOS inverter schematic beside its cross-section.
Viz `CmosInverter`: input `Toggle` animates PMOS/NMOS states and output; NAND with A/B toggles; transient current pulse shown only on transitions; frequency slider scales a power bar.
Practice: truth table for NAND from the transistor network; dynamic power for C = 1 nF total, V = 1 V, f = 3 GHz, α = 0.1 (0.3 W).
Scenario: chip overheats after a 10% voltage bump (21% more dynamic power).

### Task 6: Semiconductors B (`semis-b`) — lessons L6-L9

**Files:** `src/content/semiconductors/{wafer-fabrication,packaging-and-testing,power-semiconductors,semiconductor-industry-and-roles}.{tsx,data.ts}`, `src/components/viz/semiconductors/{FabProcessStepper,PackageExploded,PackageExploded3D,SwitchingLossCompare,IndustryMap}.tsx`, `tests/content/semis-b.test.tsx`

#### L6 `wafer-fabrication` — "How chips are made: wafer fabrication" (day 2, 55 min)
Theory: polysilicon → Czochralski ingot → 300 mm wafers; cleanrooms; unit processes: oxidation, deposition (CVD/PVD/ALD), photolithography (resist, reticle, scanner; DUV 193 nm immersion, EUV 13.5 nm), etch (wet, plasma), ion implantation and anneal, CMP, copper damascene metallization with 10-15+ layers; FEOL vs BEOL; hundreds of steps over about 3 months; yield and defect density; fab cost above $20B.
Figure: cross-section of a finished transistor with the metal stack.
Viz `FabProcessStepper` (use `Stepper` with autoplay): 9 steps on an animated wafer cross-section: bare wafer, oxide, resist, expose through mask, develop, etch, strip, implant, metal.
Practice: dies per 300 mm wafer for a 100 mm² die (about 600) and yield at D0 = 0.1 /cm² with the Poisson model (about 90%).
Scenario: yield drops after a CMP pad change (scratches found by inline inspection).

#### L7 `packaging-and-testing` — "Packaging and test" (day 3, 45 min)
Theory: wafer sort, dicing, die attach, wire bond vs flip-chip bumps; DIP, SOIC, QFN, BGA, CSP; 2.5D interposers, 3D stacking, chiplets, HBM; thermal path and θJA; final test, burn-in; electromigration and thermal cycling; packaging as a frontier.
Figure: BGA cross-section.
Viz `PackageExploded`: wrapper that lazy-loads `PackageExploded3D` (`next/dynamic`, `ssr: false`) which renders a React Three Fiber exploded QFN/BGA (die, underfill, substrate, solder balls, heat spreader) with an explode slider and auto-rotate; the wrapper shows an SVG fallback while loading and under reduced motion.
Practice: θJA 40 °C/W at 1.5 W and 50 °C ambient → Tj 110 °C; OK under 125 °C with little margin.
Scenario: QFN opens after reflow (thermal pad voids; stencil redesign).

#### L8 `power-semiconductors` — "Power semiconductors: Si, SiC and GaN" (day 3, 45 min)
Theory: blocking voltage, Rds(on), conduction vs switching losses; IGBT (bipolar, tail current) vs MOSFET; SiC (3.26 eV, about 10× breakdown field, thinner drift region, 1200 V class, 200 °C); GaN HEMT (lateral, 650 V, very fast, chargers); Tesla Model 3's SiC inverter; dv/dt and EMI tradeoffs; cost trends.
Figure: Si vs SiC drift region thickness for the same voltage.
Viz `SwitchingLossCompare`: switching waveforms (V and I overlap) for Si IGBT vs SiC MOSFET; frequency slider 2-50 kHz; loss bars (conduction, switching); efficiency readout; temperature slider raises Rds(on).
Practice: 100 A, 10 kHz, Rds(on) 10 mΩ, Esw 1 mJ → 100 W conduction, 10 W switching.
Scenario: SiC inverter fails EMI (50 V/ns edges; gate resistor, snubber, layout).

#### L9 `semiconductor-industry-and-roles` — "The industry map and the jobs" (day 3, 40 min)
Theory: EDA (Synopsys, Cadence, Siemens EDA) → IP (Arm) → fabless (NVIDIA, Qualcomm, AMD, Apple) → foundry (TSMC, Samsung, Intel Foundry, GlobalFoundries) → IDM (Intel, TI, Infineon, ST) → equipment (ASML, Applied Materials, Lam, Tokyo Electron, KLA) → OSAT (ASE, Amkor); Moore's law history; CHIPS Act and export controls; roles (process, device, design, verification, applications/field, product/test, yield) and what each interview asks; what a two-week learner can credibly target.
Figure: value-chain flow.
Viz `IndustryMap`: clickable nodes revealing companies, roles and interview topics; a "trace a chip" animation from design to OSAT.
Practice: write a two-sentence pitch for an applications-engineer role from an EV/software background.
Scenario: interview prompt "our part fails in the field at high temperature, what do you do?" (structured failure-analysis flow).

### Task 7: PCB A (`pcb-a`) — lessons L10-L14

**Files:** `src/content/pcb/{circuit-fundamentals,passive-components,active-components,schematic-capture,pcb-layout-and-stackup}.{tsx,data.ts}`, `src/components/viz/pcb/{OhmsLawCircuit,RcCharging,BuckConverter,SchematicExplorer,PcbStackupExploded,TraceWidthCalculator}.tsx`, `tests/content/pcb-a.test.tsx`

#### L10 `circuit-fundamentals` — "Circuit fundamentals you actually use" (day 4, 45 min)
Theory: charge, current, voltage, power; Ohm's law; KVL/KCL; series/parallel; voltage divider and loading; Thevenin intuition; DC vs AC; τ = RC and 5τ; impedance of C and L; decibels; multimeter use; floating inputs and ground reference.
Figure: divider plus a KVL loop.
Viz `OhmsLawCircuit`: V and R sliders; current dots animate at speed ∝ I; power readout; resistor glow; divider mode with R1/R2 sliders and Vout.
Practice: divider for a 12 V battery into a 3.3 V ADC drawing under 0.5 mA (e.g. 27 kΩ / 10 kΩ).
Scenario: ADC reads 2.9 V instead of 3.3 V (divider loaded by the ADC sampling capacitor).

#### L11 `passive-components` — "Passives: resistors, capacitors, inductors" (day 4, 45 min)
Theory: resistor types, tolerance, power, tempco, packages (0402 = 1.0×0.5 mm, 0603, 0805, 1206), pull-ups; ceramic classes (C0G, X7R, Y5V) and DC-bias derating, electrolytic (polarity, ESR, lifetime), tantalum, film; roles (decoupling, filtering, timing); inductors, saturation current, DCR, ferrite beads; ESR/ESL; reading markings.
Figure: capacitor cutaway and inductor.
Viz `RcCharging`: R and C sliders, step `Toggle`, animated charging curve with electrons on plates, τ readout; "X7R DC-bias derating" toggle showing capacitance vs voltage.
Practice: decoupling set for an MCU (100 nF X7R 0402 per pin, 10 µF bulk).
Scenario: timer drifts with supply (Y5V cap loses half its capacitance at bias; use C0G).

#### L12 `active-components` — "Active components: regulators, op-amps, MCUs" (day 4, 50 min)
Theory: LDO (dropout, P = (Vin − Vout)·I) vs buck (85-95%, needs L and C and layout), boost, buck-boost; op-amp golden rules, inverting/non-inverting gain, comparator; MCU on a board (power, reset, crystal, programming header); crystals vs oscillators; level shifting; TVS/ESD; connectors.
Figure: LDO vs buck block diagrams.
Viz `BuckConverter`: high/low-side switch animation, inductor current ramp, output ripple; duty slider sets Vout = D·Vin; load slider; LDO-vs-buck loss readout.
Practice: 12 V → 3.3 V at 500 mA: LDO 4.35 W vs buck about 0.2 W.
Scenario: LDO shuts down after two minutes (thermal; add a buck pre-regulator).

#### L13 `schematic-capture` — "Schematic capture: drawing a circuit people can read" (day 5, 45 min)
Theory: symbols, reference designators (R, C, L, D, Q, U, J, Y, SW), nets and labels, power symbols, hierarchical sheets, net classes, decoupling drawn next to its IC, reading a datasheet reference design, ERC, BOM thinking (MPN, alternates), conventions (inputs left, outputs right, power top, ground bottom), version control.
Figure: the same circuit drawn well and badly.
Viz `SchematicExplorer`: the robot motor-driver schematic (ESP32 module, TB6612FNG, two motor connectors, AMS1117-3.3, decoupling); hover or click a net to highlight it; click a part for its role; "ERC mode" toggle reveals three planted errors (floating enable pin, missing pull-up, unconnected ground).
Practice: find the three ERC errors; write the BOM.
Scenario: works on the bench, fails in the field (floating enable pin).

#### L14 `pcb-layout-and-stackup` — "PCB layout and stack-up" (day 5, 60 min)
Theory: FR-4 core, prepreg, copper (1 oz = 35 µm), mask, silkscreen, HASL vs ENIG; 2-layer vs 4-layer (SIG/GND/PWR/SIG); footprints and IPC land patterns; placement first; routing; trace width vs current (IPC-2221); clearance and creepage; through, blind, buried and microvias; thermal relief; design rules (6/6 mil, 0.3 mm drill); outline, mounting holes, keep-outs; panelization.
Figure: 4-layer stack-up with dimensions.
Viz `PcbStackupExploded`: exploded layers, 2-layer/4-layer `Segmented`, hover a layer for its description, explode slider. `TraceWidthCalculator`: imports `traceWidth` from `@/lib/sim/traceWidth`; current, temperature rise, copper weight, layer; shows mil and mm.
Practice: placement order for the motor-driver board.
Scenario: board browns under the driver (10 mil trace at 3 A; 60 mil or 2 oz or polygon).

### Task 8: PCB B (`pcb-b`) — lessons L15-L18

**Files:** `src/content/pcb/{power-and-signal-integrity,dfm-and-manufacturing,bring-up-and-debugging,kicad-project-walkthrough}.{tsx,data.ts}`, `src/components/viz/pcb/{DecouplingDemo,ReturnPathDemo,SmtAssemblyStepper,DfmChecker,DebugFlowchart,SchematicToLayout}.tsx`, `tests/content/pcb-b.test.tsx`

#### L15 `power-and-signal-integrity` — "Power integrity, signal integrity and EMI" (day 5, 50 min)
Theory: return currents follow the signal over a plane; plane splits; decoupling placement and loop area; PDN impedance intuition; rise time vs trace length (critical length ≈ tr/6 rule); 50 Ω single-ended, 90/100 Ω differential; termination; crosstalk and the 3W rule; length matching; loops as antennas, common-mode noise, filtering, shielding; partitioning motor currents from analog; ADC layout.
Figure: return path over a solid plane vs over a split.
Viz `DecouplingDemo`: MCU current pulses with/without a decoupling cap; trace inductance slider; rail-noise waveform. `ReturnPathDemo`: toggle a slit in the plane; animated return current and loop-area readout.
Practice: find and shrink the loop areas in the motor-driver layout.
Scenario: robot resets when motors start (rail droop, shared ground path, no bulk cap).

#### L16 `dfm-and-manufacturing` — "DFM and how boards get made" (day 6, 50 min)
Theory: DRC vs DFM; fab capabilities (trace/space, drill, annular ring, mask sliver, copper-to-edge); Gerbers (RS-274X), Excellon, IPC-2581, centroid, BOM, assembly drawings; fab steps (imaging, etch, lamination, drill, plating, mask, legend, finish, e-test); assembly (stencil, paste, pick-and-place, reflow profile with SAC305 peak about 245 °C, wave/selective, AOI, X-ray); pitfalls (tombstoning, acid traps, bridges, thermal relief, fiducials, rails); cost drivers; the "DFM at compile time" idea from AI design pipelines.
Figure: reflow profile.
Viz `SmtAssemblyStepper`: stencil → paste → place → reflow (temperature curve animates as solder melts) → AOI. `DfmChecker`: toggle rules on a tiny layout and watch violations highlight (acid trap, mask sliver, clearance).
Practice: Gerber export checklist and reading a capability sheet.
Scenario: half the 0402s tombstone (asymmetric pad thermal mass; add relief).

#### L17 `bring-up-and-debugging` — "Board bring-up and debugging" (day 6, 45 min)
Theory: bring-up plan (inspection, continuity on rails, current-limited power-up, rails, clocks, programming, peripheral by peripheral); DMM, oscilloscope (probe ground lead, bandwidth), logic analyzer, thermal camera, current probe; common failures (bridges, opens, rotated parts, cold joints, brown-outs, ESD); systematic method; documenting; rework basics.
Figure: good vs bad probe grounding.
Viz `DebugFlowchart`: interactive decision tree from a symptom to measurements and interpretation; "find the short" mini-game with a simulated thermal overlay on a board graphic.
Practice: bring-up checklist for the motor-driver board.
Scenario: new board draws 800 mA idle (reversed tantalum found with a thermal camera).

#### L18 `kicad-project-walkthrough` — "Practical: design the robot's motor-driver board in KiCad" (day 6, 60 min)
Theory/practice: KiCad 9 workflow end to end for the exact circuit (ESP32-WROOM-32 module, TB6612FNG, AMS1117-3.3, two JST motor connectors, HC-SR04 header, two line-sensor headers, battery input with reverse-polarity P-FET, decoupling, status LED, boot/EN buttons; 60×40 mm, M3 holes): project → schematic → annotate → ERC → footprints → board setup and stack-up → DRC rules → placement → routing → ground zones → 3D viewer → DRC → Gerbers → JLCPCB order → assembly; self-review checklist.
Figure: placement plan with zones.
Viz `SchematicToLayout`: scrub slider animates schematic → footprints → ratsnest → traces routed one by one → ground pour.
Practice: do it in KiCad; submit to the fab's DFM check.
Scenario: DRC passes but the board does not fit the chassis (import the DXF outline and keep-outs).

### Task 9: Robotics A (`robotics-a`) — lessons L19-L23

**Files:** `src/content/robotics/{anatomy-of-a-robot,sensors,actuators-and-drivers,microcontrollers-and-firmware,control-systems-and-pid}.{tsx,data.ts}`, `src/components/viz/robotics/{SenseThinkAct,UltrasonicPing,QuadratureEncoder,HBridge,ServoPwm,StepperSteps,McuPeripheralMap,I2cTransaction,PidTuner}.tsx`, `tests/content/robotics-a.test.tsx`

#### L19 `anatomy-of-a-robot` — "Anatomy of a robot" (day 7, 40 min)
Theory: sense-think-act; subsystems (power, compute, sensing, actuation, communication, mechanics); robot types and degrees of freedom; control-loop rates 100 Hz-1 kHz; the course robot's architecture.
Figure: block diagram of the course robot with power domains.
Viz `SenseThinkAct`: animated loop; loop-rate slider; shows how a slow loop overshoots a stop line.
Practice: draw your robot's block diagram with power domains.
Scenario: robot overshoots lines at speed (loop rate vs distance per cycle).

#### L20 `sensors` — "Sensors" (day 7, 55 min)
Theory: HC-SR04 (10 µs trigger, echo pulse, d = t·343/2, 2-400 cm, about 15° cone, soft/angled surfaces); IR reflectance (TCRT5000); quadrature encoders (A/B, direction, CPR); IMU (accel, gyro, mag, drift, complementary filter α ≈ 0.98); lidar; cameras; sampling, noise, EMA filtering; calibration; fusion intro.
Figure: HC-SR04 timing diagram.
Viz `UltrasonicPing`: pulse travels, echo returns, distance readout, surface-angle slider shows a lost echo. `QuadratureEncoder`: rotating disk, A/B waveforms, direction, count.
Practice: EMA filter code; ticks per mm for 7 PPR × 50:1 × 44 mm wheel (about 2.5 ticks/mm).
Scenario: ultrasonic reads 0 near angled walls (specular reflection; timeouts, multiple sensors).

#### L21 `actuators-and-drivers` — "Actuators and motor drivers" (day 7, 55 min)
Theory: brushed DC (commutation, back-EMF, Kv/Kt, stall current), N20 gearmotors, BLDC and ESCs, servos (50 Hz, 1-2 ms), steppers (200 steps, microstepping, A4988/TMC drivers), H-bridge (shoot-through, PWM, brake vs coast), driver ICs (L298N's 2 V drop vs TB6612FNG vs DRV8833), current sensing, flyback; torque/speed/power; gear ratios; sizing for wheels.
Figure: brushed DC motor cutaway.
Viz `HBridge`: clickable switches, direction/brake/coast animation, PWM duty slider, shoot-through warning. `ServoPwm`: pulse-width slider moves the horn. `StepperSteps`: full/half/micro-step phases.
Practice: torque for a 500 g robot on a 10° ramp with 44 mm wheels.
Scenario: driver resets the MCU on reversal (inductive spikes, inrush; flyback, caps, ramping).

#### L22 `microcontrollers-and-firmware` — "Microcontrollers and firmware" (day 8, 55 min)
Theory: MCU anatomy; ESP32 vs Arduino Uno vs RP2040 vs STM32; GPIO modes and pull-ups; ADC resolution and rate; PWM timers; I2C (addresses, pull-ups, 100/400 kHz); SPI; UART; interrupts vs polling; timers; superloop vs FreeRTOS; firmware structure (HAL, drivers, fixed-rate control loop, telemetry); debugging; OTA.
Figure: firmware layer diagram.
Viz `McuPeripheralMap`: clickable ESP32 block diagram with robot usage per peripheral. `I2cTransaction`: SDA/SCL animation of start, address, ACK, register, data, stop.
Practice: 100 Hz control-loop skeleton in Arduino C++.
Scenario: I2C IMU stops responding (pull-ups, bus lockup, clock-out recovery).

#### L23 `control-systems-and-pid` — "Control systems and PID" (day 8, 50 min)
Theory: open vs closed loop; P, I, D intuition; discrete PID code; manual tuning and Ziegler-Nichols; anti-windup, derivative on measurement, clamping, sample time; cascaded loops; feedforward; wheel speed and heading control.
Figure: closed-loop block diagram.
Viz `PidTuner`: step-response plot from `simulatePid` in `@/lib/sim/pid`; Kp/Ki/Kd sliders; disturbance button; overshoot, settling time and steady-state error readouts.
Practice: tune to under 10% overshoot and 1 s settling; PID in C++.
Scenario: heading oscillates ±10° (Kp too high with sensor lag).

### Task 10: Robotics B (`robotics-b`) — lessons L24-L28

**Files:** `src/content/robotics/{kinematics-and-motion,perception-and-navigation,build-your-smart-robot,simulate-before-you-build,ros2-and-the-robotics-stack}.{tsx,data.ts}`, `src/components/viz/robotics/{DiffDriveKinematics,ArmKinematics,StateMachine,WiringDiagram,ArenaPreview,RosGraph}.tsx`, `tests/content/robotics-b.test.tsx`

#### L24 `kinematics-and-motion` — "Kinematics and motion" (day 8, 50 min)
Theory: v = (vr + vl)/2, ω = (vr − vl)/L; odometry integration and drift; unicycle model; go-to-goal heading controller; 2-link FK and IK (law of cosines), workspace, singularities, elbow up/down; trapezoidal velocity profiles; body vs world frames.
Figure: differential-drive geometry with ICC.
Viz `DiffDriveKinematics`: wheel-speed sliders, ICC arc, odometry trace (uses `diffDrive`). `ArmKinematics`: drag target, IK via `ik2`, elbow toggle, reach envelope (uses `fk2`/`ik2` from `@/lib/sim/kinematics`).
Practice: odometry update from encoder ticks.
Scenario: odometry off by 1 m after a lap (wheel-diameter and base calibration, UMBmark).

#### L25 `perception-and-navigation` — "Perception and navigation" (day 9, 50 min)
Theory: Braitenberg-style obstacle avoidance; wall following with P on side distance; line following with P/PD on sensor error and lost-line recovery; Bug0/Bug2; finite state machines and behavior trees; occupancy grids; SLAM in a paragraph; A* and Dijkstra intuition.
Figure: Bug2 path around an obstacle.
Viz `StateMachine`: interactive FSM (Idle → Follow → Avoid → Recover) with event buttons animating transitions and a tiny robot acting them out.
Practice: FSM for a line follower with obstacle avoidance, then implement it in the robot sim lab.
Scenario: robot loops forever at a corner (local minimum; add state and memory).

#### L26 `build-your-smart-robot` — "Build your smart robot" (day 9, 75 min)
Content: BOM table with approximate prices (ESP32 DevKitC ≈ $8, TB6612FNG breakout ≈ $4, 2× N20 encoder gearmotors 6 V 100 rpm ≈ $10, HC-SR04 ≈ $2 on an SG90 ≈ $3, 2× TCRT5000 ≈ $2, 2× 18650 with holder and 5 V buck ≈ $10, chassis/wheels/caster ≈ $10, wires; total ≈ $50-60); power architecture (7.4 V pack → 5 V buck → ESP32 3.3 V; motors from the pack through the driver; common ground); pin map table; mechanical steps; full Arduino sketch (motor class, encoder ISRs, ultrasonic read, line sensors, 100 Hz loop, obstacle-avoid behavior, serial telemetry) as a `CodeBlock`; bring-up tests; Li-ion safety; upgrades (ESP32-CAM, lidar, micro-ROS).
Figure: wiring diagram.
Viz `WiringDiagram`: hover a wire for signal and pin; power/signal view toggle; animated power-on sequence.
Practice: build it; the checklist.
Scenario: works on USB, dies on battery (buck cannot cover motor inrush plus Wi-Fi bursts).

#### L27 `simulate-before-you-build` — "Simulate before you build" (day 10, 60 min)
Theory: why simulate; sim-to-real gap (friction, noise, latency, sensor cones); what the lab models; controller structure (read → estimate → decide → act); testing behaviors; logging; Webots, Gazebo, MuJoCo, Isaac Sim, PyBullet; URDF basics. Link prominently to `/labs/robot-sim` (do not import the lab).
Figure: sensor model vs reality (cone, timeout).
Viz `ArenaPreview`: static-plus-animated SVG of the three arenas with a robot following a sample path, to orient the learner before opening the lab.
Practice: in the lab, write obstacle avoidance then line following; complete a lap without a crash.
Scenario: sim controller crashes the real robot (unmodeled latency; margins, timeouts, randomization).

#### L28 `ros2-and-the-robotics-stack` — "ROS 2 and the robotics stack" (day 10, 45 min)
Theory: nodes, topics, services, actions, parameters, launch files, DDS and QoS; TF, URDF, RViz, rosbag; Nav2, MoveIt, micro-ROS; team structure in robotics companies; presenting the robot as a portfolio project; roles and interview expectations.
Figure: TF tree for the robot.
Viz `RosGraph`: animated node graph (/camera → /detector → /planner → /cmd_vel → /motor_driver); click a node for message types; QoS toggle shows dropped messages.
Practice: node graph for your robot; install ROS 2.
Scenario: publisher works, subscriber never receives (QoS mismatch).

### Task 11: EV A (`ev-a`) — lessons L29-L31

**Files:** `src/content/ev/{ev-powertrain-architecture,three-phase-motors,inverters-pwm-and-foc}.{tsx,data.ts}`, `src/components/viz/ev/{EvDrivetrainFlow,ThreePhaseField,Motor3D,Motor3DScene,ThreePhaseInverterPwm,DqFrame}.tsx`, `tests/content/ev-a.test.tsx`

#### L29 `ev-powertrain-architecture` — "EV powertrain architecture" (day 11, 50 min)
Theory: pack → contactors and fuses → HV bus → inverter → motor → single-speed reducer (about 9:1) → wheels; DC-DC to 12/48 V, on-board charger, thermal loops and heat pump, vehicle controller; regen path; efficiency chain; 400 V vs 800 V (current, cable mass, charging speed, 1200 V SiC); integrated drive units; Model 3 RWD about 208 kW.
Figure: full block diagram.
Viz `EvDrivetrainFlow`: energy particles flow with an accelerator slider; brake toggle reverses flow for regen; 400/800 V `Segmented` shows bus current at 150 kW.
Practice: cable current at 150 kW for 400 V (375 A) vs 800 V (187 A).
Scenario: regen disappears on a cold morning (BMS charge-current limit at low temperature).

#### L30 `three-phase-motors` — "Three-phase motors" (day 11, 60 min)
Theory: rotating field from three currents 120° apart; n_sync = 120f/p; induction motor (squirrel cage, slip, no magnets; 2008 Roadster, Model S/X); PMSM (NdFeB, efficiency, demagnetization, back-EMF and field weakening); synchronous reluctance; Model 3's interior-PM synchronous reluctance hybrid; T = Kt·Iq; efficiency maps; oil cooling; hairpin windings.
Figure: stator with three windings and the resulting field.
Viz `ThreePhaseField`: three coils, phase-current plot, rotating resultant vector; rotor `Segmented` (induction with slip slider / PM synchronous); frequency slider. `Motor3D`: wrapper lazy-loading `Motor3DScene` (`next/dynamic`, `ssr: false`) which renders a React Three Fiber exploded motor (housing, stator laminations, windings, rotor, magnets, shaft) with an explode slider and auto-rotate; SVG fallback while loading or under reduced motion.
Practice: synchronous speed for 4 poles at 400 Hz (12,000 rpm).
Scenario: PM motor loses torque after a track session (demagnetization; cooling, derating).

#### L31 `inverters-pwm-and-foc` — "Inverters, PWM and field-oriented control" (day 11, 55 min)
Theory: six-switch bridge; PWM sine synthesis; SVPWM; dead time; DC-link capacitor; gate drivers; FOC chain (phase currents → Clarke → Park → PI on Id/Iq → inverse Park → SVPWM); resolver/encoder vs sensorless; 8-20 kHz switching; SiC enabling higher frequency; torque control; protections (overcurrent, desaturation).
Figure: FOC block diagram.
Viz `ThreePhaseInverterPwm`: switch states animate; carrier vs reference; filtered sine output; modulation-index slider. `DqFrame`: rotating vector with Id/Iq sliders and the resulting phase currents.
Practice: why 10 kHz PWM is audible; dead-time loss at 1 µs and 10 kHz (1%).
Scenario: inverter trips on overcurrent at launch (current-sensor offset).

### Task 12: EV B (`ev-b`) — lessons L32-L34

**Files:** `src/content/ev/{batteries-and-bms,tesla-roadster-and-motor-evolution,ev-charging-systems}.{tsx,data.ts}`, `src/components/viz/ev/{BatteryPackExplorer,ChargingCurve,MotorEvolutionTimeline,TorqueSpeedCurve,ChargingSessionFlow}.tsx`, `tests/content/ev-b.test.tsx`

#### L32 `batteries-and-bms` — "Batteries and the BMS" (day 12, 55 min)
Theory: Li-ion cell 3.0-4.2 V; NCA/NMC/LFP tradeoffs; about 250 Wh/kg; 18650 → 2170 → 4680; pack topology (Model S 7,104 × 18650 in 16 modules, 96s); BMS (voltage/temperature monitoring, passive balancing, SoC by coulomb counting plus OCV, SoH, contactors, isolation monitoring, limits); cooling ribbons and glycol loops; thermal runaway; CC-CV charging, C-rate, tapering, preconditioning; structural packs.
Figure: cell → module → pack.
Viz `BatteryPackExplorer`: zoom cell/module/pack; s/p sliders compute pack V, Ah, kWh. `ChargingCurve`: SoC vs current/voltage/power animation; temperature slider changes the taper.
Practice: 96s46p of 2170 cells (4.8 Ah, 3.6 V nominal) ≈ 79.6 kWh.
Scenario: one module always balances (weak cell group with high self-discharge).

#### L33 `tesla-roadster-and-motor-evolution` — "Tesla Roadster and motor evolution" (day 12, 55 min)
Theory: 2008 Roadster (Lotus-derived chassis, 3-phase AC induction motor about 185 kW, 53 kWh from 6,831 × 18650, 0-60 mph 3.7-3.9 s, 244 mi EPA, two-speed gearbox abandoned for single speed); Model S 2012 induction; Plaid 2021 (three motors, carbon-fiber-sleeved PM rotors, about 20,000 rpm, 1,020 hp); Model 3/Y 2017 (rear IPM-SynRM, front induction on AWD, SiC inverter); Cybertruck 2023 (800 V class, 48 V low-voltage, steer-by-wire); second-generation Roadster announced November 2017 (claims: 0-60 in 1.9 s, 200 kWh, 620 mi, 250+ mph, tri-motor, "SpaceX package" thrusters; repeatedly delayed; present every number as an announced claim, not a shipped fact); broader advances (hairpin windings, oil cooling, axial-flux motors, rare-earth-free magnet claims, integrated drive units, 800 V SiC); what EV-company interviews ask.
Figure: induction vs IPM rotor cross-sections.
Viz `MotorEvolutionTimeline`: interactive timeline 2008 → today with spec cards. `TorqueSpeedCurve`: constant-torque and constant-power regions; motor `Segmented` changes the curve; speed slider shows the operating point and power.
Practice: specific power (kW/kg) across generations from given numbers.
Scenario: design review, PM vs induction for a front motor (induction has no drag when unpowered).

#### L34 `ev-charging-systems` — "EV charging systems" (day 12, 45 min)
Theory: AC L1 about 1.4 kW, L2 7-19 kW (on-board charger does AC→DC); DC fast charging 50-350 kW; J1772, CCS1, NACS/J3400, CHAdeMO, Type 2/CCS2; ISO 15118 plug-and-charge; OCPP; charger internals (power modules, rectifier plus isolated DC-DC, liquid-cooled cables); site design (transformer, switchgear, load management, ADA layouts); V2G/V2H; interoperability.
Figure: DC fast charger internals.
Viz `ChargingSessionFlow`: sequence animation plug → handshake → auth → negotiation → charging → taper → stop; AC/DC `Segmented`; power slider shows site load.
Practice: 8 × 150 kW dispensers with 2:1 power sharing → 600 kW → transformer sizing.
Scenario: charger derates to 50 kW on a hot day (cable thermal limit).

### Task 13: AI-assisted design (`ai-design`) — lessons L35-L37

**Files:** `src/content/ai-design/{cad-kernels-and-parametric-design,ai-agents-for-hardware-design,build-a-claude-cad-tool}.{tsx,data.ts}`, `src/components/viz/ai-design/{BRepExplorer,ParametricBracket,DesignPipeline,McpSequence}.tsx`, `tests/content/ai-design.test.tsx`

#### L35 `cad-kernels-and-parametric-design` — "CAD kernels and parametric design" (day 13, 50 min)
Theory: mesh (STL) vs B-rep (faces, edges, vertices with exact geometry) vs CSG vs implicit/SDF; kernels (Parasolid in SolidWorks and NX, ACIS, OpenCascade in FreeCAD, CadQuery and build123d); feature trees and constraint solvers; STEP, IGES, STL, 3MF; a build123d example (plate with holes and a fillet); why code-CAD suits AI (text in, geometry out, diffable); topological naming problem; tolerances.
Figure: B-rep topology of a bracket.
Viz `BRepExplorer`: isometric SVG bracket; toggle highlight of vertices, edges, faces with counts. `ParametricBracket`: sliders (length, hole diameter, fillet) regenerate the drawing live.
Practice: build123d code for a motor mount with given dimensions; export STEP.
Scenario: fillet fails after a hole-size change (feature order, topological naming).

#### L36 `ai-agents-for-hardware-design` — "AI agents for hardware design" (day 13, 50 min)
Theory: the heat-pump pipeline: requirements → system schematics (electrical single-line and wiring, P&ID for refrigerant piping) → component selection → end-to-end simulation → geometry through a CAD kernel → DFM checkers at "compile time" → iterate → subassemblies and assembly order; why systems-first then geometry works; what AI does well (search, boilerplate, consistency) and badly (tolerances, tacit shop knowledge, unsimulated physics); verification layers (rule-based DFM, simulation, human review); an evaluation rubric for AI-generated designs; adjacent tools (Zoo/KittyCAD, CadQuery agents, Flux and JITX for PCBs, Quilter autorouting, AI P&ID tools); the EV-charging site-design engine as another instance.
Figure: pipeline with feedback loops.
Viz `DesignPipeline`: animated stages with checks; click a stage for inputs/outputs; "inject a defect" button shows a DFM catch and a retry loop.
Practice: ten-check rubric for an AI-generated heat-pump design.
Scenario: bracket passes DFM but cannot be assembled (DFA vs DFM).

#### L37 `build-a-claude-cad-tool` — "Build a Claude CAD tool with MCP" (day 13, 60 min)
Theory/practice: Model Context Protocol basics; Claude Desktop config; a Python FastMCP server exposing `make_box`, `make_plate_with_holes`, `fillet_edges`, `export_step` and `dfm_check` (minimum wall, hole-to-edge distance, fillet feasibility) over build123d, shown as a complete `CodeBlock` of about 120 lines; example conversation; viewing results in Blender (the local 3D agent pattern) or FreeCAD; extending to KiCad's Python API and to simulation; sandboxing and testing tools.
Figure: Claude ↔ MCP server ↔ kernel architecture.
Viz `McpSequence`: animated sequence diagram of a design request with tool calls, a DFM failure and a retry.
Practice: run the server, design a motor mount, run `dfm_check`, export STEP.
Scenario: Claude keeps producing 0.5 mm walls (encode constraints in the tool and reject in DFM).

---
## Part C: Labs, encyclopedia, careers, integration

### Task 14: Labs (`labs`) — robot simulator, PID lab, arm lab, trace-width lab

**Files:**
- Create: `src/lib/sim/robot.ts`, `src/components/labs/{RobotSim,RobotCanvas,ControllerEditor,PidLab,ArmLab,TraceWidthLab}.tsx`, `src/app/labs/robot-sim/page.tsx`, `src/app/labs/pid/page.tsx`, `src/app/labs/arm/page.tsx`, `src/app/labs/trace-width/page.tsx`
- Test: `tests/sim/robot.test.ts`, `tests/labs/labs.test.tsx`

**Interfaces:**
- Consumes: C3 controls, C4 helpers, `simulatePid`, `fk2`/`ik2`, `traceWidth`, `useProgress().markLab`, `labs` from `@/lib/labs`.
- Produces: the Task-14 half of C5; `RobotSim({ presetId?: string; arenaId?: string; compact?: boolean })`.

- [ ] **Step 1: Failing robot tests** (`tests/sim/robot.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { arenas, initialState, step, sense, raycast, compileController, presets, ROBOT } from "@/lib/sim/robot";
const room = arenas.find(a => a.id === "open-room")!;
describe("robot sim", () => {
  it("drives straight at max speed", () => {
    let s = { ...initialState(room), x: 50, y: 50, theta: 0 };
    for (let i = 0; i < 100; i++) s = step(s, { left: 1, right: 1 }, room, 0.01);
    expect(s.x).toBeCloseTo(50 + ROBOT.maxSpeed, 0); expect(s.y).toBeCloseTo(50, 1);
  });
  it("turns in place", () => {
    let s = { ...initialState(room), x: 50, y: 50, theta: 0 };
    for (let i = 0; i < 50; i++) s = step(s, { left: -1, right: 1 }, room, 0.01);
    expect(s.theta).toBeGreaterThan(0.5); expect(s.x).toBeCloseTo(50, 1);
  });
  it("raycasts to the right wall", () => {
    expect(raycast({ x: 50, y: 50 }, 0, { ...room, obstacles: [] }, 500)).toBeCloseTo(room.width - 50, 0);
  });
  it("front ultrasonic matches raycast", () => {
    const s = { ...initialState(room), x: 50, y: 50, theta: 0 };
    expect(sense(s, { ...room, obstacles: [] }).ultrasonic.front).toBeCloseTo(room.width - 50 - ROBOT.radius, 0);
  });
  it("stops and flags crash on wall contact", () => {
    let s = { ...initialState(room), x: room.width - ROBOT.radius - 1, y: 50, theta: 0 };
    s = step(s, { left: 1, right: 1 }, room, 0.1);
    expect(s.crashed).toBe(true);
  });
  it("line sensors see the track", () => {
    const track = arenas.find(a => a.id === "line-track")!;
    const s = initialState(track);                    // start is on the line, heading along it
    const l = sense(s, track).line;
    expect(l.left + l.right).toBeGreaterThanOrEqual(1);
  });
  it("compiles valid and rejects invalid controllers", () => {
    expect(compileController("function control(s){ return {left:1,right:1}; }").control).toBeTypeOf("function");
    expect(compileController("function control(s{").error).toBeTruthy();
  });
  it("every preset runs 15 s in its arena without crashing", () => {
    for (const p of presets) {
      const arena = arenas.find(a => a.id === p.arenaId)!;
      const { control, error } = compileController(p.code);
      expect(error).toBeUndefined();
      let s = initialState(arena); const memory: Record<string, unknown> = {};
      for (let i = 0; i < 1500; i++) s = step(s, control!(sense(s, arena), memory), arena, 0.01);
      expect(s.crashed).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run, expect failure.**

- [ ] **Step 3: Implement `robot.ts`**

Kinematics per step: `vl = clamp(cmd.left) · maxSpeed`, `vr = clamp(cmd.right) · maxSpeed`, `v = (vl + vr)/2`, `ω = (vr − vl)/wheelBase`; integrate pose with exact arc when |ω| > 1e-6, else straight. Collision: after integration, if the robot circle intersects any wall segment or obstacle circle, revert the pose and set `crashed = true` (subsequent steps keep it stopped). Encoders accumulate `|v| · ticksPerCm · dt` per wheel with sign. `sense`: ultrasonic rays at +45°, 0°, −45° from the robot's heading, measured from the robot edge (subtract radius), capped at `sensorRange`; line sensors at `lineSensorOffset` ahead and ±`lineSensorSpacing/2` sideways, 1 when within `lineHalfWidth` of the polyline; `yawRate = ω`; `pose` always included; `goal` from the arena. The arena outer boundary is four wall segments.

Arenas (cm): `open-room` 300×200 with three circular obstacles; `line-track` 300×200 with a closed rounded-rectangle polyline track (start on the track heading along it); `corridor` 300×200 with an internal wall forming an L-shaped corridor and a goal at the end.

Presets (JavaScript source strings; each must survive the 15 s test): `obstacle-avoid` (turn away from the nearest short ray, slow when front < 30), `line-follow` (P on left/right line difference, spin to search when both 0), `wall-follow` (keep right ray near 25 cm with P control; turn left when front < 25), `go-to-goal` (heading error from pose to goal, ω = 2·error, stop within 10 cm; arena `corridor`).

`compileController` wraps `new Function("sensors", "memory", code + "\nreturn control(sensors, memory);")` in try/catch for both compile and a first dry call; returns `{ error }` with the message on failure. The returned `control` wraps the user function so a thrown error produces `{ left: 0, right: 0 }` and rethrows the message through a `lastError` property.

- [ ] **Step 4: Tests pass.**

- [ ] **Step 5: Lab UI**

`RobotSim`: left: `RobotCanvas` (canvas element, arena scaled to fit 640×427 logical pixels, draws walls, obstacles, line, goal, robot body, heading arrow, wheels, sensor rays green when hitting within range and red when open, trail polyline); right: preset `Segmented`, arena `Segmented`, `ControllerEditor` (a `<textarea>` with monospace font, 18 rows, tab inserts two spaces), buttons Run/Pause, Step, Reset, Load preset, speed `Segmented` ×1 ×2 ×4, telemetry list (t, x, y, θ°, ultrasonic L/F/R, line L/R, encoders, crashed), error box in red. `compact` hides the editor and telemetry. Simulation runs via `useAnimationFrame` at fixed 100 Hz substeps. Calls `markLab("robot-sim")` the first time the robot drives 100 cm without crashing.

`PidLab`: `simulatePid` plot (SVG) with Kp 0-20, Ki 0-20, Kd 0-5 sliders, setpoint toggle 1/2, disturbance button at t = 3 s, metrics; "target met" badge when overshoot < 10% and settling < 1 s, which calls `markLab("pid")`.

`ArmLab`: SVG 2-link arm, l1 = 120, l2 = 90 px; FK sliders θ1, θ2; drag the target (pointer events) → `ik2`; elbow toggle; reach annulus; unreachable shown in red. Marks the lab on first successful IK drag.

`TraceWidthLab`: form with current, rise, copper, layer; results table; plus a reference table of common values. Marks the lab when a calculation runs.

Pages render each lab with a title, the `LabMeta` description, and a "Back to labs" link.

- [ ] **Step 6: Verify** — `npx vitest run tests/sim/robot.test.ts tests/labs`, `npx tsc --noEmit`, `npx eslint src/lib/sim/robot.ts src/components/labs src/app/labs tests/sim/robot.test.ts tests/labs`. Do not run the dev server; the integrator will.

### Task 15: Component encyclopedia (`encyclopedia`)

**Files:**
- Create: `src/components/encyclopedia/entries/<id>.tsx` for each id below, replace `src/components/encyclopedia/entries/index.ts` (exports `entries` sorted by category then name) and `src/components/encyclopedia/EncyclopediaBrowser.tsx`
- Test: `tests/encyclopedia.test.tsx` (every entry has the required fields with the minimum counts from C6; every `Illustration` renders an `<svg>`; ids unique; the browser filters by category and search)

Entries (34): passive: `resistor`, `capacitor-ceramic`, `capacitor-electrolytic`, `inductor`, `ferrite-bead`, `crystal`; semiconductor: `diode`, `zener-diode`, `schottky-diode`, `led`, `bjt`, `mosfet`, `igbt`, `sic-mosfet`, `wafer-and-die`; active: `op-amp`, `ldo-regulator`, `buck-converter`, `tvs-diode`; compute: `microcontroller`, `fpga`; sensor: `ultrasonic-sensor`, `ir-line-sensor`, `rotary-encoder`, `imu`, `lidar`, `hall-sensor`, `thermistor`, `current-shunt`; actuator: `dc-brushed-motor`, `bldc-motor`, `servo`, `stepper-motor`, `h-bridge-driver`; ev: `li-ion-cell`, `bms`, `traction-inverter`; connector: `jst-connector`, `pin-header`.

Each `Illustration` is an inline SVG drawing of the physical part (package outline, leads, markings) with a small animation when `animate` is true (current dots, a rotating rotor, a charging plate, a pulsing LED), built with `SvgCanvas` and `vizColors`, using CSS or `motion` animations that pause under reduced motion.

`EncyclopediaBrowser`: search input, category chips, responsive card grid (illustration animates on hover/focus, name, category, one-liner), click opens a detail panel (`<dialog>` or side panel) with how it works, where used, key specs table, failure modes, interview tip, link to the related lesson.

- [ ] Steps: write the failing test, implement entries in batches of 6, run `npx vitest run tests/encyclopedia.test.tsx`, `npx tsc --noEmit`, `npx eslint src/components/encyclopedia tests/encyclopedia.test.tsx`.

### Task 16: Careers page, home polish, README and DEPLOY (integrator)

**Files:** `src/app/careers/page.tsx`, `src/app/careers/careers-data.ts`, `README.md`, `DEPLOY.md`, `src/app/page.tsx` (final copy)

Careers content: five roles (Hardware/Electrical Engineer, Embedded Firmware Engineer, Robotics Software Engineer, Semiconductor Applications/Field Engineer, EV Powertrain/Test Engineer): what they do, must-know topics mapped to lessons, tools (KiCad/Altium, SPICE, oscilloscope, C/C++, Python, ROS 2, MATLAB, SolidWorks), portfolio projects (the robot, the KiCad board, the PID write-up, the MCP CAD tool), resume bullet templates, a 30-second pitch template, interview loop shape, honest note on what two weeks does and does not make you.

`README.md`: what the site is, stack, scripts, structure, how lessons are authored, how to deploy. `DEPLOY.md`: step-by-step GitHub push and Vercel deploy (CLI and dashboard import), custom domain note, how preview deploys work per push.

- [ ] Verify with `npm run build`, commit "Add careers page, README and deploy guide".

### Task 17: Integration, verification, GitHub, Vercel (integrator)

- [ ] For each finished parallel task: review the diff, run its test file, `npx tsc --noEmit`, `npm run lint`; fix or send back; commit with a message naming the task ("Add semiconductors lessons 1-5").
- [ ] Add the `RobotSim` compact embed to `simulate-before-you-build` once Task 14 and Task 10 are both in.
- [ ] `npm test` including `tests/content-complete.test.ts`; `npm run build`; start `npm run dev` and open `/`, `/plan`, three lessons across tracks, `/labs/robot-sim` (run a preset), `/components`, `/scenarios`, `/interview` (mock mode), `/careers` in the browser; fix what is broken.
- [ ] `gh repo create hardware-academy --public --source . --remote origin --push --description "Hardware Academy: a 14-day hands-on path through semiconductors, PCBs, robotics, EV powertrains and AI-assisted design"`.
- [ ] `npx vercel link --yes` then `npx vercel --prod --yes`; record the production URL in `DEPLOY.md` and `README.md`; commit and push.
- [ ] Report: URLs, what was verified in the browser, what was not.
