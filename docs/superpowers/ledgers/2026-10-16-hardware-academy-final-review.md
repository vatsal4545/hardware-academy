TOOL: SubagentHandback
--- input.message
# Final whole-branch review: Hardware Academy (4ed5b49..f54c0aa)

**Scope and method.** I read the whole foundation diff package in passes, then sampled the rest of the tree. That covered the robot lab and sim, both 3D wrappers, the encyclopedia browser, one or more visualisations per track, the MCP lesson and the test suites. I also checked the production build output.

At f54c0aa on a clean tree I ran `tsc --noEmit`, `npm run lint`, `vitest run` and `npm run build`, once each:
- tsc and lint: clean.
- Tests: 945 of 945 pass across 22 files.
- Build: 64 pages.

I sent read-only GET requests to the running dev server and made no changes to the repo. I did not use subagents.

HEAD has since moved to ccf337e. Two of my findings were fixed after the range:
- DebugFlowchartShortHunt now passes `role="group"` (1b8960a).
- PlayPause no longer sets `aria-pressed` (b88c8d2).

No other file behind a finding changed.

---

### Strengths

- **The foundation is contract-first and coherent.**
  - `curriculum.ts` is the single source of truth.
  - The generated registry is split into server-only data (`registry.ts`) and client-safe loaders (`bodies.ts`). The data module is imported only by three server pages and the tests, so lesson data never ships to the browser (checked).
  - `curriculum.test` and `content-complete` enforce the authoring contract (37 of 37).
- **The progress store is careful.**
  - `useSyncExternalStore` with a server snapshot makes it hydration-safe.
  - The snapshot is read lazily and cached, so references stay stable.
  - Every storage access is wrapped in try/catch, and there is a no-op store when no provider is present.
- **The quiz shuffle works.**
  - It is integer-only (FNV-1a plus an LCG), so the server and client produce the same order, and scoring uses original indices; the quiz test proves this independently of display order.
  - Measured across all 252 questions, answer positions went from [40, 106, 68, 38] to [62, 66, 60, 64].
- **The hydration-stability gate is a clever, objective test.** It caught 10 real failures. The encyclopedia has its own equivalent, and every `toLocaleString` call pins `"en-US"`.
- **The robot lab is solid.**
  - The simulator is made of pure functions with sub-stepped collision checks.
  - The loop guard sits in loop conditions, and learner try/catch cannot swallow it.
  - Errors render as escaped text in a `role="alert"` box, and storage failures are handled.
  - No code is ever loaded from the URL, so `new Function` only runs the learner's own input. There is no XSS path anywhere: no `dangerouslySetInnerHTML` in `src`.
  - Seeding the textarea from localStorage is hydration-safe; I checked this against React 19.3's `initTextarea`.
- **The 3D scenes are well contained.** They use `next/dynamic` with `ssr: false`, detect WebGL through `useSyncExternalStore`, have an error boundary and an SVG fallback, and three.js is confined to the two lazily loaded modules.
- **Reduced motion is honoured consistently.** `useViz` starts paused but stays playable, all 39 encyclopedia entries go through `useAnimate`, and the other animations start only on user action.
- **External links** in careers use `rel="noreferrer"`.
- **The Suspense-around-params ruling** matches the bundled Next 16.4 guidance for Partial Prefetching (`node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`, around lines 642-700).

---

### Issues

#### Critical (Must Fix)

None. I found no security vulnerability, no broken route and no failing gate.

#### Important (Should Fix)

**I1. Lesson bodies are not code-split in production; every lesson page loads all 37.**
- **Files:** `src/content/LessonBody.tsx:4-9`, `src/content/bodies.ts`, `src/app/learn/[track]/[slug]/page.tsx:30`.
- **Evidence:**
  - In `.next/server/app/learn/semiconductors/atoms-to-bands.html`, the `LessonBody` client-reference row `I[92992,[...14 chunks],"LessonBody"]` lists every body chunk.
  - The page loads 20 scripts: 1,742,934 bytes raw, 562,624 bytes gzipped.
  - Of that, 1,142,032 bytes raw (376,917 gzipped) are lesson bodies. That is 12 single-body chunks plus `0bw5epcfxjeja.js` (656 KB), which holds the other 25 bodies and `LessonBody` itself.
  - The script set is identical on every lesson page I checked. The home page is 602 KB raw, 187 KB gzipped.
- **Why it matters:** the whole point of the ruling at ledger line 42, and the spec's bundle mitigation, is lost. The first lesson visit downloads and compiles about 1.1 MB of JS it doesn't need, which costs mobile time-to-interactive.
- **Fix:**
  - Render the body from the server page through statically imported `"use client"` body modules (a generated server-only map), not `React.lazy` in a client wrapper. The browser loads only the chunks of client references that actually appear in the RSC payload.
  - Keep the `bodies.ts` loaders for the hydration gate.
  - Verify by counting chunks containing `"theory"` that a lesson's HTML references: it should be 1.

**I2. The progress store loses updates across tabs.**
- **Files:** `src/lib/progress.tsx:74` (the snapshot is cached once per page load) and `:87-88` (`update` applies `fn` to that cached snapshot); there is no `storage` listener anywhere.
- **Why it matters:** a learner with a lesson in one tab and a lab in another will have one tab silently erase the other's completions or lab marks, and the nav and plan views in other tabs go stale. This is the app's only persisted state.
- **Fix:**
  - Re-run `load()` inside `update` before applying `fn`.
  - Subscribe to `window` `storage` events for `PROGRESS_KEY` to refresh the snapshot and notify listeners.

**I3. There are no error boundaries.**
- **Files:** no `src/app/error.tsx` or `global-error.tsx`. The only boundaries are the 3D `SceneBoundary` classes (`Motor3D.tsx:23`, `PackageExploded.tsx:24`).
- **Why it matters:** an exception at an edge-case slider value in any of 62 visualisation files (11 authors), or a failed chunk load, replaces the whole page with Next's generic client-exception screen, including the lesson text being read.
- **Fix:**
  - Add `app/error.tsx` and `global-error.tsx`.
  - Add a small client error boundary inside `VizFrame` (51 of 62 viz files render through it) that shows "this visualization failed; reload".

**I4. Keyboard-focusable SVG nodes sit inside `role="img"`, so screen-reader users cannot operate the map.**
- **File:** `src/components/viz/semiconductors/IndustryMap.tsx:119`, with the `role="button"` / `tabIndex={0}` nodes at `:153-158`.
- **Why it matters:** there is no node selector outside the SVG, so assistive-technology users can only ever reach the default node.
- **Fix:** pass `role="group"` to `SvgCanvas`, the same one-line pattern 7 other visualisations already use.
- **Other instances:** the same defect in `DebugFlowchartShortHunt.tsx:305` was unrecorded in the ledger and is now fixed in 1b8960a. DesignPipeline and MotorEvolutionTimeline have mouse-only handlers inside `img` but do offer outside controls, so they are fine.

**I5. The careers page states the wrong pack energy.**
- **File:** `src/app/careers/careers-data.ts:196` says "96s46p 2170 pack (79.6 kWh nominal)".
- **Why it matters:** the lesson (`batteries-and-bms.tsx:298-306`, `.data.ts:70`) and the ledger ruling at line 52 give 76.3 kWh; 79.6 kWh is the 96s48p figure. This is a resume bullet learners are told to adapt, and the arithmetic is easy for an interviewer to check.
- **Fix:** change it to 76.3 kWh.

#### Minor (Nice to Have)

**M1. Unknown lesson and track URLs are soft 404s, and the prerendered lesson HTML depends on JavaScript to become visible.**
- **What happens:** on the dev server, `/learn/semiconductors/does-not-exist`, `/learn/pcb/atoms-to-bands` and `/learn/nope` all return HTTP 200 with the not-found UI and `noindex`. `/nope` returns 404.
- **Cause:** `notFound()` (`[slug]/page.tsx:25`, `[track]/page.tsx:24`) runs inside Suspense after the shell has been sent, and `partialPrefetching: true` (`next.config.ts:6`) is what drives that pattern.
- **Second effect:** every lesson's HTML puts the shell and the body in `<div hidden>` segments that inline `$RC` scripts reveal. Without JS, visitors see only the skeleton, and React's reveal batching can briefly show the skeleton or "Loading lesson…".
- **Ruling impact:** the ruling's "cost if wrong: none" understates this.
- **Option:** per the bundled guide, without Partial Prefetching you can await `params` outside Suspense. Known paths stay fully static and unlisted paths render on request, where `notFound()` should give a real 404 (verify after the change).

**M2. Duplicate id on every lesson page.** `KeyTermsRail.tsx:7` uses the static id `key-terms-heading`, and `LessonShell.tsx:126` and `:131` render the rail twice, so the id is duplicated on 37 of 37 pages. Use `useId`.

**M3. Live-region noise and unstable keys.**
- The mock-interview countdown sits in `aria-live="polite"` (`InterviewBank.tsx:80`), so it announces every second, and nothing happens at 0 s.
- The interview list keys on `${slug}-${filteredIndex}` (`:196`). The uncontrolled `<details>` open state can then attach to a different question after filtering.
- The nav pill (`Nav.tsx:51`) announces its count on every full load.

**M4. Radio semantics without the radio keyboard model.** `Segmented.tsx:16-21` (54 call sites) and the hand-rolled filters (`InterviewBank.tsx:153`, `:171`, `ScenarioBrowser`) make every option a Tab stop, and arrow keys do nothing. The radiogroup also has no name when `label` is omitted. Fix this once, centrally: roving tabindex plus arrow keys, or `aria-pressed` buttons in a group.

**M5. Two toggles still signal state twice** (label change plus `aria-pressed`): `MarkComplete.tsx:9-13` and the Stepper's Auto-play button (`Stepper.tsx:47`). PlayPause is fixed in b88c8d2.

**M6. Route changes will animate the scroll.** `globals.css:21` sets `scroll-behavior: smooth`, and Next 16 no longer neutralises it during navigation. Clicking "Next" at the bottom of a lesson will animate back to the top (`upgrading/version-16.md:950-970`). Add `data-scroll-behavior="smooth"` to `<html>` (`layout.tsx:29`).

**M7. Progress import accepts any object.** `normalize` (`progress.tsx:37`, `importJson` at `:129`) accepts `{}` or `{"foo":1}` as valid, replaces all progress, and reports success. Require at least one known key and validate value shapes.

**M8. Misleading completion glyph.** `TrackLessonList.tsx:30` puts `aria-label` on a generic span, which is not reliably announced, and the transparent "✓" stays in the DOM for incomplete lessons.

**M9. Two dead-end affordances.**
- Quiz scores are written but never read anywhere, yet `page.tsx:15` promises "Your score is saved."
- The Day-14 capstone rows (`PlanBoard.tsx:76`) look like checkboxes but can't be checked.

**M10. Blind spots in the hydration gate** (`tests/hydration-stability.test.tsx:12`).
- It does not cover:
  - the `**` operator
  - `Math.expm1`, which `PNJunction.tsx:49` uses
  - `log1p`, `log2` and `tanh`
  - module-scope constants, which are computed before the nudge
  - the lab pages
- `ArmLab.tsx:147-150` and `:216-235` render unrounded `fk2` coordinates into SVG attributes. React 19 only warns about attribute mismatches in dev, so this is benign.
- `Arrow` (`primitives.tsx`) passes its endpoints through unrounded.
- I checked every current case, and nothing slips through today.

**M11. Stepper and Slider fragilities.**
- `Stepper.tsx:21-25` keys its autoplay interval on `onChange` identity. Callers today pass stable callbacks, so this is latent; hold `onChange` in a ref.
- Slider sets no `aria-valuetext`, so formatted values and units are not announced.

**M12. Off-screen animation.** `useViz` re-renders animated visualisations at 60 fps even when they are off-screen; pausing via an IntersectionObserver would fix it.

**M13. Dead code and documentation drift.**
- Unused: `ProgressRing`, `dayFor`, `totalMinutesForDay`, and the `motion` dependency (`package.json:18`, never imported; an unrecorded spec deviation).
- `scripts/gen-registry.mts:3` gives the wrong run command.
- The README's `gen:registry` line omits `bodies.ts`.
- DEPLOY.md doesn't mention Vercel preview Deployment Protection or record the production URL (plan Task 17).
- The `aria-busy` on `LessonFallback` (`page.tsx:37`) is dropped, because `Container` doesn't forward props (0 occurrences in the built HTML).

---

### Deferred minors triage

**Must fix before production**, grouped by owner file set. These are I1-I5 plus six content one-liners of about 15 minutes total; each was verified at HEAD.

- **Controller / foundation:**
  - I1 (bundle splitting): `LessonBody.tsx`, `bodies.ts`, the lesson `page.tsx`, and generating the server map in `scripts/gen-registry.mts`.
  - I2: `progress.tsx`.
  - I3: `app/error.tsx`, `global-error.tsx`, `VizFrame.tsx`.
  - I5: `careers-data.ts:196`.
- **Semiconductors A (Task 5):** `MosfetCrossSection.tsx:114` says "darker means more electrons". It is inverted: the channel's `stopOpacity` rises with overdrive (`:91`), so more electrons render brighter. Ledger line 83.
- **Semiconductors B (Task 6):**
  - `IndustryMap.tsx:119`: add `role="group"` (ledger line 69).
  - `packaging-and-testing.tsx:126`: says the blade "cuts a street about 20-30 µm wide". That is the kerf; streets are 50-100 µm (ledger line 70).
  - `power-semiconductors.tsx:184-186`: don't use the first-generation Taycan as a SiC example (ledger line 71).
- **PCB A (Task 7):** `active-components.tsx:164` says "strapping pins ... such as IO0 and EN". EN is the enable/reset pin, not a strapping pin (ledger line 116). This is still present.
- **EV A (Task 11):** `ev-powertrain-architecture.tsx:246-248`. The 2019 Taycan proved 800 V with 1,200 V silicon IGBTs; SiC made 800 V more efficient, not possible (ledger line 87).
- **EV B (Task 12):** `tesla-roadster-and-motor-evolution.tsx:242` says "800 V with SiC: the Porsche Taycan (2019)". That is wrong: the 2019 car used Si IGBTs, and SiC arrived with the 2024 facelift's rear inverter. This is the same fact as the two entries above but appears in a new place. The user is targeting EV roles, so it matters.

**Can wait** (polish or editorial):
- **Owner fact-checks before presenting as portfolio work:**
  - CBC 11B, NEVI present tense and the assumed motor masses (ledger lines 53 and 76)
  - AMS1117 rating, and whether the TB6612FNG's STBY pin has an internal pull-down; if it does, reword the "floating enable" narrative (line 116)
  - P2N2222A pinout: onsemi's part is C-B-E while the PN2222A is E-B-C (line 107)
  - datasheet figures written from memory (lines 58, 92, 110)
  - compile the ESP32 sketch with the real toolchain (line 79), and run the MCP server against real build123d (line 89)
- **Content consistency:**
  - Robot numbers disagree between robotics lessons A and B (line 100); fold into the robotics-B round.
  - The quiz "longest option" tell remains: in 135 of 252 questions the correct choice is the longest (lines 68, 83, 100, 103, 120).
  - Other numeric and wording nuances:
    - DDR5/HBM refresh is 32 ms, not 64 ms (`cmos-logic-and-chips.tsx:232`)
    - "500 A" charging cap (`ev-powertrain-architecture.tsx:243`)
    - the "850-900 V" pack figure
    - the L36 COP of 3.2 against the lesson's band
    - "about 20 times too thick" (`pcb-layout-and-stackup.tsx:114`)
    - the "0.5 W" wording; the arithmetic is right if read from the 5 V rail
    - StateMachine gains, "eleven entries", and the AC/DC negotiate text
- **Visualisation polish:**
  - CmosInverter replays a stale pulse after Reset; carrier positions jump.
  - EV particles mirror-jump on Brake.
  - DqFrame can show "-0"; ChargingSessionFlow shows "0.0 kW left".
  - SwitchingLossCompare clips above 150 A; SenseThinkAct runs off-frame.
  - RosGraph draws stale dots; HBridge animates at 0% duty.
  - The arm lab's elbow-flip test still doesn't assert the hand position.
- **Accessibility batch:**
  - aria-live noise (I2cTransaction, ServoPwm, PidTuner; McpSequence's 0.6 s status updates)
  - the modal has no `inert` and the overflow lock causes a layout shift
  - scroll containers can't take keyboard focus
  - small labels at phone width
- **Engineering debt:**
  - Duplicated helpers: `r2` in 13 files, `rad` 6, `fmt` 5, `lerp` 5, `ease` 4, `WIRE` 14 definitions in 12 files, plus 568 raw hex literals.
  - Files over 600 lines (SchematicExplorer 807, WiringDiagram 804).
  - `data-testid` left in production markup.
  - Test gaps around reduced motion and play/pause.
  - No derivative filter in `pid.ts` (line 49).
  - Robot canvas backing-store sizing (line 66).
  - Loop-guard fail-open cases (line 98); self-inflicted only.
  - 3D OrbitControls touch-action and always-on frameloop (line 72).

**Not real, or I disagree:**
- **Main-thread hang (line 48):** superseded by the loop guard (line 65).
- **2025 facts (line 55):** correct. The 48D credit was raised to 35% in July 2025, Synopsys-Ansys closed in July 2025, and TSMC Arizona is $165B.
- **EV facts (line 61):** correct (about 9:1 reducer, first high-volume SiC inverter, 48 V, about 18 minutes, HVH).
- **Quiz position skew (line 68):** fixed by the shuffle.
- **"1000× vs 346-550×" (line 83):** the lesson now reconciles this (`atoms-to-bands.tsx:324-326`).
- **"I_s doubles every 10 °C" (line 83):** this is the standard practical rule for measured reverse leakage.
- **PNJunction "series R limits I" caption:** physically fine.
- **console.log in tests:** it is env-gated.
- **FMVSS 305 at 100 Ω/V:** correct attribution.
- **Type 2 "up to 22 kW":** the practical figure.
- **HBridge L/L row:** already fixed ("stop (coast)").
- **Missing L31 encoders:** already fixed.
- **Encyclopedia omissions** (power category, SMIL, category order): accepted by ruling.

---

### Recommendations

1. **Fix wave order:** I2 and I3 first (small, robustness), then I4, I5 and the content one-liners, then I1. For I1, re-check script counts per lesson page after the change.
2. **Decide on Partial Prefetching (M1).** It buys nothing for a fully known static route set, and dropping it should give real 404s and inline static HTML.
3. **Add a shared `viz/shared/math.ts`** (`r2`, `r3`, `rad`, `lerp`, `clamp`, `ease`) and a wire colour in `vizColors`, and make `Arrow` round its own endpoints.
4. **Harden the gate:** add `expm1`, `log1p`, `log2` and `tanh` to the nudged functions, and render the four labs twice as well.
5. **One content pass** for the longest-option tell and the robotics cross-lesson numbers.
6. **On the rulings.** All are sound, with two caveats:
   - **Line 42 (lazy loading):** the reasoning about keeping data off the client is correct and the result was verified, but the chunking goal failed (I1), and its "cost if wrong" covered only hydration timing.
   - **Line 39 (no per-task review for Tasks 1-4):** that cost materialised modestly as I1-I3.

---

### Assessment

**Ready to deploy?** With fixes.

**Reasoning:** the foundation is well structured and fully green (tsc, lint, 945 of 945 tests, 64 pages), with no security exposure. Before the production URL is shared, though, four things need fixing:
- the cross-tab progress loss (I2)
- the missing error boundaries (I3)
- the IndustryMap accessibility gap (I4)
- the wrong careers number (I5), together with the six verified content one-liners

I1 should land in the same fix wave. Every lesson page currently ships all 37 bodies (about 377 KB gzipped extra), which is a real performance cost but not a correctness blocker.

