# Hardware Academy

A 14-day, hands-on learning site: semiconductors, PCB design, robotics (with a buildable robot and a browser
simulator), EV powertrains (motors, inverters, batteries, the Tesla lineage, charging) and AI-assisted hardware design
(CAD kernels, design agents, a Claude MCP CAD tool).

Every lesson has theory with real numbers, a drawn figure, an interactive visualization, a practice exercise, a
real-world problem scenario with staged hints, interview questions with answers, and a quiz. Progress is saved in the
browser.

## Stack

- Next.js 16 (App Router, static generation, Cache Components), React 19, TypeScript
- Tailwind CSS v4, `motion`, React Three Fiber (two lazy-loaded 3D scenes)
- Vitest + Testing Library (jsdom) for simulation logic, components, content and curriculum integrity
- Deployed on Vercel

## Scripts

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (type-checks too)
npm test             # vitest run
npm run lint         # eslint
npm run gen:registry # regenerate src/content/registry.ts from the curriculum and create stubs for new lessons
```

## Structure

```
src/app                 routes: /, /plan, /learn/[track]/[slug], /labs/*, /components, /scenarios, /interview, /careers
src/lib/curriculum.ts   tracks, lessons, days (single source of truth)
src/lib/sim             pure simulation logic: robot, PID, kinematics, IPC-2221 trace width
src/lib/progress.tsx    localStorage-backed progress store
src/content/<track>     one <slug>.tsx (lesson body) and <slug>.data.ts (quiz, interview, scenario, key terms) per lesson
src/content/registry.ts generated map from slug to data and lazily-loaded body
src/components/lesson   lesson building blocks (Section, Prose, Figure, VizFrame, Slider, Quiz, ScenarioCard, ...)
src/components/viz      visualizations per track, plus shared SVG helpers and animation hooks
src/components/labs     robot simulator, PID lab, arm lab, trace-width lab
src/components/encyclopedia  component encyclopedia entries and browser
tests                   vitest tests
docs/superpowers        design spec and implementation plan
```

## Adding a lesson

1. Add its metadata to `src/lib/curriculum.ts` (slug, track, title, day, minutes, summary, objectives) and put the slug
   in the right day.
2. Run `npm run gen:registry` to create stub files and update the registry.
3. Write `src/content/<track>/<slug>.data.ts` (key terms, scenario, interview questions, quiz) and
   `src/content/<track>/<slug>.tsx` (sections with ids `theory`, `viz`, `practice`).
4. `npm test` checks the data is complete; `npm run build` prerenders the page.

## Deploying

See [DEPLOY.md](DEPLOY.md).
