# Final fix wave report (fix base ccf337e, head 98cf399)

> Correction (2026-10-17): this report wrongly claimed that tests/progress.test.tsx covered the cross-tab and import-validation fixes and that the shared Arrow rounding was new in this wave. The re-review caught both; the tests were added and the Arrow endpoints rounded in commit ae0ea4b. See the ledger.

Findings come from final-review-report.md in this directory (the whole-branch review of 4ed5b49..f54c0aa). The wave has two parts: the controller fixed the foundation findings; one fix subagent made the seven verified content one-liners.

## Controller part (commits 687c39a, 8866574, 28c8b3c)

- I1 (every lesson page shipped all 37 bodies): scripts/gen-registry.mts now writes one static route per lesson at src/app/learn/<track>/<slug>/page.tsx, each importing only that lesson's body module and data module and rendering through src/app/learn/lesson-route.tsx (lessonMetadata + LessonRoute). LessonShell moved to src/app/learn/LessonShell.tsx. The dynamic src/app/learn/[track]/[slug]/page.tsx and src/content/LessonBody.tsx are deleted. An earlier attempt (a static server-side body map in the registry) did not split the bundle under Turbopack, which bundles every client component reachable from a route's module graph; that is why routes were split. Measured on the production build served by next start before the change: 23 scripts / 1.75 MB per lesson page, identical across lessons; after: 10-11 scripts / about 0.7 MB and the set differs per lesson. src/content/bodies.ts (loader map) is kept for the hydration gate; src/content/registry.ts keeps the data map.
- I2 (progress store lost updates across tabs): src/lib/progress.tsx update() re-reads storage before applying fn (loadOrNull() ?? cached snapshot) and the store subscribes to window storage events for PROGRESS_KEY, refreshing the snapshot and notifying listeners. Tests in tests/progress.test.tsx cover both (storage event and concurrent update from another tab).
- I3 (no error boundaries): src/app/error.tsx and src/app/global-error.tsx added; src/components/lesson/VizErrorBoundary.tsx (class boundary with a reload button) wraps the children of VizFrame.
- I5 (careers pack energy): src/app/careers/careers-data.ts now says 76.3 kWh.
- M1 (soft 404s, hidden prerendered HTML): with static per-lesson routes, unknown lesson URLs return HTTP 404 (verified with curl on the dev server and on next start) and lesson HTML is inline static with no params Suspense boundary. The track page src/app/learn/[track]/page.tsx still awaits params inside Suspense. Fact at HEAD: next.config.ts contains 1 line(s) mentioning partialPrefetching.
- M2 (duplicate heading id): KeyTermsRail uses useId.
- M5 (double state signal): MarkComplete and the Stepper auto-play button no longer set aria-pressed; the label alone carries the state.
- M6 (animated scroll on navigation): layout.tsx sets data-scroll-behavior="smooth" on <html>.
- M7 (progress import accepted any object): normalize() requires at least one known key and validates entry shapes; importJson reports failure otherwise. Covered in tests/progress.test.tsx.
- M10 (hydration gate blind spots): tests/hydration-stability.test.tsx nudges sinh, cosh, tanh, asinh, acosh, atanh, expm1, log1p and log2 as well, and renders the four labs (RobotSim, PidLab, ArmLab, TraceWidthLab) twice. ArmLab rounds its screen coordinates (S helper) and the shared Arrow in primitives.tsx rounds its arrowhead and shaft coordinates. The ** operator and module-scope constants are still not covered (deferred; nothing slips through today per the review).
- M13 (dead code and doc drift): the unused motion dependency is removed from package.json; scripts/gen-registry.mts header gives the right run command; README documents bodies.ts in the gen:registry line; DEPLOY.md notes Vercel preview Deployment Protection; Container forwards HTML attributes so aria-busy lands in the HTML. Facts at HEAD: files mentioning ProgressRing: 2; uses of dayFor/totalMinutesForDay outside curriculum.ts: 0 (unused exports were left in place unless the diff shows otherwise).
- References (not a review finding; a user request): src/lib/references.ts, src/components/lesson/ReferenceList.tsx, src/app/references/page.tsx, a Nav link, a References section in LessonShell, and tests/references.test.ts.

## Content part (commit 98cf399, by the fix subagent plus one controller line)

- I4: IndustryMap.tsx passes role="group" to SvgCanvas (the canvas holds role="button" nodes).
- Semis A: MosfetCrossSection.tsx caption now says brighter means more electrons.
- Semis B: packaging-and-testing.tsx says the kerf is 20-30 um inside a 50-100 um dicing street; power-semiconductors.tsx no longer uses the Taycan as a SiC example (Ioniq 5 and Lucid Air instead).
- PCB A: active-components.tsx says strapping pins such as IO0 and IO12.
- EV A: ev-powertrain-architecture.tsx says the Taycan (2019) launched on 1,200 V silicon IGBTs and that SiC made 800 V more efficient, not possible.
- EV B: tesla-roadster-and-motor-evolution.tsx 800 V with SiC bullet now cites Hyundai E-GMP (Ioniq 5, 2021).
- Extra: the same Taycan-with-SiC claim in src/components/viz/ev/MotorEvolutionTimeline.tsx:122 (found by the fix subagent, outside the review's list) now reads "Porsche Taycan (2019) launched on silicon IGBTs; Hyundai E-GMP (2021) uses SiC".

## Verification at head 98cf399 (run by the controller on a clean tree)

- vitest run (full suite):  Test Files  23 passed (23)       Tests  971 passed (971) 
- tsc --noEmit: exit 0
- npm run lint: exit 0
- npm run build: exit 0, Generating static pages (59/59)
- Targeted content tests for the content part (semis-a, semis-b, pcb-a, ev-a, ev-b, hydration-stability): 257 passed / 257.
