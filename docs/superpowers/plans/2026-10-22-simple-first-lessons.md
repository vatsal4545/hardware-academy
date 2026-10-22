# Simple-First Lessons: Foundation and Day 1 Pilot — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the simple-first lesson building blocks, test gates and brighter theme, then convert Day 1
(`atoms-to-bands`) as the pilot for Vatsal's sign-off.

**Architecture:** A lesson whose data has a `bigIdea` renders a new `SimpleLessonShell`; every other lesson keeps
today's layout through `ClassicLessonShell`, chosen by `LessonShell`. The shell provides the lesson's data through a
React context, so `QuickCheck` and `Term` inside a lesson body can look up questions and definitions by id. The lesson
body builds its theory section from `ConceptStep`s that carry data attributes, and tests render each converted body to
enforce the spec's limits (steps, pictures, readability, quick checks).

**Tech Stack:** Next.js 16.4.2 (App Router, static generation), React 19.3, TypeScript 5, Tailwind CSS 4.3,
Vitest 5 with Testing Library and jsdom, lucide-react 1.61 (new).

**Spec:** `docs/superpowers/specs/2026-10-22-simple-first-lessons-design.md`

## Global Constraints

- Reader: total beginner, school science, no electronics.
- Theme: dark only. New parts take colour from theme tokens and a `--track` CSS variable, so light mode can come later.
- Simple text, per lesson: 18 words per sentence on average or fewer; counting the big idea, at most 150 words before the
  first picture and at most 600 before the `viz` section.
- Steps: 4–6 per lesson, each with one picture. At least 3 quick checks per lesson, 3 choices each, the correct choice
  never the single longest. Big idea: 2–4 sentences. Takeaways: 3–5. Plain definitions: 25 words or fewer.
- A step uses two numbers at most and only facts and numbers already in the lesson's own text. Every comparison
  (`Picture`) says where it stops being true.
- "Go deeper" holds today's text word for word. Old `h3` subheadings become `h4` inside it; the words do not change.
- Contrast: body text 7:1 or better and muted text 4.5:1 or better against `bg`, `surface` and `surface-2`.
- Simple text: 17 px, line height 1.7, at most 68 characters per line.
- Motion: CSS scroll-driven animation only, inside `@supports (animation-timeline: view())` and
  `@media (prefers-reduced-motion: no-preference)`. No JavaScript animation.
- Section ids `theory`, `viz` and `practice` stay; new ids are `big-idea` and `remember`.
- Lessons not converted yet render exactly as today, apart from the brighter theme tokens.
- Markup must not depend on time, randomness or unrounded trigonometry: `tests/hydration-stability.test.tsx` renders
  every lesson twice and requires identical output.
- New dependency: `lucide-react@1.61.0`. Decorative icons get `aria-hidden`.
- This is Next.js 16.4.2, which differs from older versions. Before changing Next-specific code, read the relevant guide
  in `node_modules/next/dist/docs/` (see `AGENTS.md`).
- Commit messages: an imperative, sentence-case subject with no prefix (the repo's style, for example
  "Add the quick check card"), and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Baseline before Task 1: `npx vitest run` passes 27 files and 1062 tests on branch `claude/simple-first-lessons`.

---

## File map

Create:

| File | Responsibility |
|---|---|
| `src/lib/readability.ts` | Word, sentence and JSX-text helpers for the readability gate and the "Go deeper" check |
| `src/lib/shuffle.ts` | Stable choice shuffle shared by `Quiz` and `QuickCheck` (moved out of `Quiz.tsx`) |
| `src/components/lesson/LessonDataContext.tsx` | `LessonDataProvider` and `useLessonData()` |
| `src/components/lesson/GoDeeper.tsx` | Fold-out for the original text (native `<details>`) |
| `src/components/lesson/KeyNumber.tsx` | One number worth remembering |
| `src/components/lesson/Picture.tsx` | "Picture it" comparison card with its "where it stops being true" line |
| `src/components/lesson/FormulaCard.tsx` | A formula with each symbol explained |
| `src/components/lesson/BigIdea.tsx` | The big idea card (`#big-idea`) |
| `src/components/lesson/QuickCheck.tsx` | One quick check from `data.checks` |
| `src/components/lesson/Term.tsx` | Inline definition from `data.keyTerms` |
| `src/components/lesson/ConceptStep.tsx` | One step of "Build it up" |
| `src/components/lesson/TryThis.tsx` | "Try this" checklist for the interactive |
| `src/components/lesson/Remember.tsx` | "Remember this" (`#remember`) |
| `src/components/lesson/lessonParts.ts` | The ordered list of page parts and their ids |
| `src/components/lesson/LessonHeader.tsx` | Simple-first lesson header |
| `src/components/lesson/OnThisPage.tsx` | Sticky "On this page" list |
| `src/app/learn/lessonShellProps.ts` | `LessonShellProps`, shared by both shells |
| `src/app/learn/LessonNav.tsx` | `LessonSidebar` and `LessonPager`, moved out of `LessonShell.tsx` |
| `src/app/learn/ClassicLessonShell.tsx` | Today's layout, moved out of `LessonShell.tsx` unchanged |
| `src/app/learn/SimpleLessonShell.tsx` | The simple-first layout |
| `src/components/viz/semiconductors/AtomsToBandsPictures.tsx` | Day 1 pictures, including the moved band-structure figure |
| `scripts/check-go-deeper.mts` | CLI: lists sentences of a lesson's old theory text that went missing |
| `tests/helpers/fixtures.ts` | `lessonFixture()` |
| `tests/helpers/lesson-text.ts` | Shared `theoryWords()` for the content tests |
| `tests/helpers/simple-first-gates.ts` | `dataProblems()` and `bodyProblems()` |
| `tests/lib/readability.test.ts`, `tests/lib/shuffle.test.ts`, `tests/theme-contrast.test.ts` | Unit tests |
| `tests/components/lesson-data.test.tsx`, `simple-cards.test.tsx`, `quick-check.test.tsx`, `term.test.tsx`, `concept-step.test.tsx`, `lesson-frame.test.tsx` | Component tests |
| `tests/lesson-shell.test.tsx`, `tests/track-list.test.tsx`, `tests/simple-first-gates.test.tsx`, `tests/simple-first-lessons.test.tsx`, `tests/content/atoms-to-bands-pictures.test.tsx` | Integration and gate tests |

Modify: `src/lib/curriculum.ts` (types), `src/components/lesson/Quiz.tsx` (import the shuffle),
`src/components/lesson/index.ts` (exports), `src/app/globals.css` (tokens, simple text, motion),
`src/app/learn/LessonShell.tsx` (becomes the dispatcher), `src/app/learn/TrackLessonList.tsx`,
`src/app/learn/track-route.tsx`, `tests/hydration-stability.test.tsx`, `tests/content/semis-a.test.tsx`,
`src/content/semiconductors/atoms-to-bands.tsx`, `src/content/semiconductors/atoms-to-bands.data.ts`, `package.json`,
`README.md`.

---

### Task 1: Text helpers

**Files:**
- Create: `src/lib/readability.ts`
- Test: `tests/lib/readability.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `countWords(text: string): number`, `splitSentences(text: string): string[]`,
  `averageSentenceLength(blocks: string[]): number`, `jsxToText(source: string): string`,
  `textBlocks(source: string): string[]`, `theorySectionSource(source: string): string`,
  `missingSentences(oldSource: string, newSource: string): string[]` (compares block by block).
  The module imports nothing, so `scripts/check-go-deeper.mts` can import it with Node's native type stripping.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/readability.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  averageSentenceLength,
  countWords,
  jsxToText,
  missingSentences,
  splitSentences,
  textBlocks,
  theorySectionSource,
} from "@/lib/readability";

describe("countWords", () => {
  it("counts tokens with a letter or a digit and skips bare symbols", () => {
    expect(countWords("Silicon's gap is 1.12 eV — about 9× smaller.")).toBe(8);
  });
});

describe("splitSentences", () => {
  it("splits after . ! ? followed by a space and keeps decimals whole", () => {
    expect(splitSentences("Silicon's gap is 1.12 eV. Glass is about 9 eV! Why? Heat.")).toEqual([
      "Silicon's gap is 1.12 eV.",
      "Glass is about 9 eV!",
      "Why?",
      "Heat.",
    ]);
  });

  it("drops pieces without a word", () => {
    expect(splitSentences("One. ... Two.")).toEqual(["One.", "Two."]);
  });
});

describe("averageSentenceLength", () => {
  it("averages words per sentence over all blocks together", () => {
    expect(averageSentenceLength(["One two three. Four five.", "Six."])).toBe(2);
  });

  it("is 0 when there is no sentence", () => {
    expect(averageSentenceLength([])).toBe(0);
  });
});

describe("jsxToText", () => {
  it("drops tags, attributes and comments and resolves spacers and entities", () => {
    const source = `<p className="x">The <strong>hole</strong>{" "}moves.{/* note */} Silicon&apos;s gap.</p>`;
    expect(jsxToText(source)).toBe("The hole moves. Silicon's gap.");
  });
});

describe("theorySectionSource and missingSentences", () => {
  const before = `
    <Section id="theory" title="Old title">
      <Prose><p>Silicon has atomic number 14. Every bond holds two electrons.</p></Prose>
    </Section>
    <Section id="viz" title="Play">
      <p>Things to try in the old viz section.</p>
    </Section>`;

  it("takes only the content of the theory section", () => {
    expect(jsxToText(theorySectionSource(before))).toBe("Silicon has atomic number 14. Every bond holds two electrons.");
  });

  it("lists old sentences of four or more words that the new source lost", () => {
    const after = `<ConceptStep n={1} title="New" deeper={<p>Silicon has atomic number 14.</p>}><p>Atoms share electrons.</p></ConceptStep>`;
    expect(missingSentences(before, after)).toEqual(["Every bond holds two electrons."]);
  });

  it("finds nothing missing when the old text moved word for word", () => {
    const after = `<ConceptStep n={1} title="New" deeper={<Prose><p>Silicon has atomic number 14. Every bond holds two electrons.</p></Prose>}>
      <p>Atoms share electrons.</p>
    </ConceptStep>`;
    expect(missingSentences(before, after)).toEqual([]);
  });

  it("checks block by block, so a table and the heading after it can move into different steps", () => {
    const old = `<Section id="theory" title="T"><Prose>
      <table><tbody><tr><td>Silicon carbide in fast chargers</td></tr></tbody></table>
      <h3>Temperature rules everything here</h3>
      <p>Leakage doubles every ten degrees.</p>
    </Prose></Section><Section id="viz" title="V"></Section>`;
    const moved = `
      <ConceptStep n={3} title="A" deeper={<table><tbody><tr><td>Silicon carbide in fast chargers</td></tr></tbody></table>}><p>Simple.</p></ConceptStep>
      <ConceptStep n={4} title="B" deeper={<><h4>Temperature rules everything here</h4><p>Leakage doubles every ten degrees.</p></>}><p>Simple.</p></ConceptStep>`;
    expect(textBlocks(theorySectionSource(old))).toEqual([
      "Silicon carbide in fast chargers",
      "Temperature rules everything here",
      "Leakage doubles every ten degrees.",
    ]);
    expect(missingSentences(old, moved)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/lib/readability.test.ts`
Expected: FAIL, the import of `@/lib/readability` cannot be resolved.

- [ ] **Step 3: Write the helpers**

Create `src/lib/readability.ts`:

```ts
// Text measures for the simple-first lessons: the readability gate in the tests and the "Go deeper" check in
// scripts/check-go-deeper.mts. It imports nothing, so Node can run it directly with native type stripping.

/** Whitespace-separated tokens that contain a letter or a digit. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Sentences end at ".", "!" or "?" followed by whitespace; pieces without a word are dropped. "1.12" stays whole. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => countWords(s) > 0);
}

/** Mean words per sentence over all the blocks together; 0 when there is no sentence. */
export function averageSentenceLength(blocks: string[]): number {
  const sentences = blocks.flatMap(splitSentences);
  if (sentences.length === 0) return 0;
  return sentences.reduce((n, s) => n + countWords(s), 0) / sentences.length;
}

const ENTITIES: Record<string, string> = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

/**
 * The visible text of a stretch of JSX source: comments, tags and their attributes are dropped, {" "} and {"..."}
 * literals and HTML entities are resolved, and whitespace is collapsed. Attribute text such as captions is dropped
 * too, so compare like with like: both sides of a comparison go through this function.
 */
export function jsxToText(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\{\s*"([^"]*)"\s*\}/g, "$1")
    .replace(/\{\s*'([^']*)'\s*\}/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:apos|quot|amp|lt|gt|nbsp);/g, (e) => ENTITIES[e])
    .replace(/\s+/g, " ")
    .trim();
}

const BLOCK_TAG =
  /<\/?(?:p|li|ul|ol|h[1-6]|table|thead|tbody|tr|td|th|div|pre|blockquote|figure|figcaption|Prose|Callout|Figure|Section|Exercise)\b[^>]*>/g;

/**
 * The visible text of JSX source, cut into blocks at paragraph, list, heading, table and section tags. Text without a
 * full stop (a table, a heading) then cannot run into the next paragraph and form one "sentence" that breaks as soon
 * as the conversion puts the two in different steps.
 */
export function textBlocks(source: string): string[] {
  return source
    .split(BLOCK_TAG)
    .map(jsxToText)
    .filter((b) => b.length > 0);
}

/** The JSX between the opening tag of the section with id="theory" and the <Section that opens id="viz". */
export function theorySectionSource(source: string): string {
  const theoryAt = source.indexOf('id="theory"');
  const vizAt = source.indexOf('id="viz"');
  if (theoryAt < 0 || vizAt < theoryAt) return "";
  const start = source.indexOf(">", theoryAt) + 1;
  const end = source.lastIndexOf("<Section", vizAt);
  return source.slice(start, end > start ? end : vizAt);
}

/** Sentences of four or more words in the old theory section that appear nowhere in the new lesson source. */
export function missingSentences(oldSource: string, newSource: string): string[] {
  const now = jsxToText(newSource);
  return textBlocks(theorySectionSource(oldSource))
    .flatMap(splitSentences)
    .filter((s) => countWords(s) >= 4 && !now.includes(s));
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/lib/readability.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/readability.ts tests/lib/readability.test.ts
git commit -m "Add text helpers for the readability gate and the Go deeper check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared stable shuffle

**Files:**
- Create: `src/lib/shuffle.ts`
- Modify: `src/components/lesson/Quiz.tsx:9-29` (delete the two local functions and their comment, import instead)
- Test: `tests/lib/shuffle.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `hashString(input: string): number`, `seededOrder(seed: number, n: number): number[]`. `Quiz` keeps
  exactly the same choice order as before; `QuickCheck` (Task 6) uses the same functions.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/shuffle.test.ts`. The expected values were computed with the functions as they are today in
`Quiz.tsx`, so the test pins the quiz order across the move:

```ts
import { describe, it, expect } from "vitest";
import { hashString, seededOrder } from "@/lib/shuffle";

describe("stable shuffle", () => {
  it("hashes with FNV-1a", () => {
    expect(hashString("abc")).toBe(440920331);
  });

  it("keeps the quiz order it produced before the move", () => {
    const seed = hashString("atoms-to-bands:0:What is the band gap of silicon at room temperature?");
    expect(seededOrder(seed, 4)).toEqual([2, 3, 1, 0]);
  });

  it("treats a zero seed as 1 and always returns a permutation", () => {
    expect(seededOrder(0, 3)).toEqual(seededOrder(1, 3));
    expect([...seededOrder(12345, 5)].sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/lib/shuffle.test.ts`
Expected: FAIL, `@/lib/shuffle` cannot be resolved.

- [ ] **Step 3: Move the functions**

Create `src/lib/shuffle.ts`:

```ts
// Deterministic shuffle so a correct choice does not sit at a predictable position, while the server and the
// browser render the same order for the same question.

/** FNV-1a hash of a string. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** A Fisher-Yates order of 0..n-1 driven by a linear congruential generator; a seed of 0 counts as 1. */
export function seededOrder(seed: number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
```

In `src/components/lesson/Quiz.tsx`, replace this block (the comment and both functions, lines 9-29):

```tsx
// Deterministic shuffle so the correct choice does not sit at a predictable position,
// while server and client render the same order for a given lesson.
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function seededOrder(seed: number, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed || 1;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
```

with nothing, and add this import under `import { cn } from "@/lib/cn";`:

```tsx
import { hashString, seededOrder } from "@/lib/shuffle";
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run tests/lib/shuffle.test.ts tests/components/quiz.test.tsx`
Expected: PASS, both files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/shuffle.ts src/components/lesson/Quiz.tsx tests/lib/shuffle.test.ts
git commit -m "Move the quiz shuffle into a shared module" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Lesson data types and context

**Files:**
- Modify: `src/lib/curriculum.ts:44-54` (`KeyTerm`, new `Formula`, `LessonData`)
- Create: `src/components/lesson/LessonDataContext.tsx`
- Modify: `src/components/lesson/index.ts` (export it)
- Create: `tests/helpers/fixtures.ts`
- Test: `tests/components/lesson-data.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `KeyTerm { term: string; def: string; plain?: string }`
  - `Formula { expr: string; parts: { symbol: string; meaning: string }[] }`
  - `LessonData` gains `bigIdea?: string`, `checks?: Record<string, QuizQuestion>`,
    `remember?: { takeaways: string[]; formulas?: Formula[] }`
  - `LessonDataProvider({ data: LessonData; children: ReactNode })`, `useLessonData(): LessonData | null`
  - `lessonFixture(overrides?: Partial<LessonData>): LessonData` with key terms "Hole" (with `plain`) and
    "Band gap (Eg)" (without), and one check `"full-band"` whose answer is index 0,
    "Every spot is taken, so nothing can move".

- [ ] **Step 1: Write the fixture and the failing test**

Create `tests/helpers/fixtures.ts`:

```ts
import type { LessonData } from "@/lib/curriculum";

/** A small, complete lesson data object; tests override the fields they care about. */
export function lessonFixture(overrides: Partial<LessonData> = {}): LessonData {
  return {
    keyTerms: [
      {
        term: "Hole",
        def: "The empty state an excited electron leaves in the valence band.",
        plain: "The empty spot an electron leaves behind when it jumps up.",
      },
      { term: "Band gap (Eg)", def: "The forbidden energy range between the valence and conduction bands." },
    ],
    scenario: {
      title: "Sensor drifts when hot",
      context: "A sensor board reads high above 85 °C.",
      symptoms: ["Drift grows with temperature", "Cooling removes it"],
      hints: ["Which node has the highest impedance?", "What leaks more when hot?"],
      rootCause: "Diode leakage into a 1 MΩ node.",
      fix: "Lower the node impedance and use low-leakage clamps.",
      lesson: "Leakage sets the temperature ceiling.",
    },
    interview: [{ q: "Why do junctions leak more when hot?", a: "Thermally generated carriers grow exponentially.", level: "screen" }],
    quiz: [
      { q: "What is silicon's band gap?", choices: ["0.66 eV", "1.12 eV", "3.26 eV", "9 eV"], answer: 1, explain: "Silicon is 1.12 eV at 300 K." },
    ],
    checks: {
      "full-band": {
        q: "Why can't a full band carry current?",
        choices: [
          "Every spot is taken, so nothing can move",
          "The electrons are far too heavy to move",
          "The gap blocks them from the wires today",
        ],
        answer: 0,
        explain: "Current needs empty spots to move into, and a full band has none.",
      },
    },
    ...overrides,
  };
}
```

Create `tests/components/lesson-data.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LessonDataProvider, useLessonData } from "@/components/lesson";
import { lessonFixture } from "../helpers/fixtures";

afterEach(cleanup);

function Probe() {
  const data = useLessonData();
  return <p>{data ? `terms: ${data.keyTerms.length}` : "no lesson data"}</p>;
}

describe("LessonDataProvider", () => {
  it("hands the lesson data to components inside it", () => {
    render(
      <LessonDataProvider data={lessonFixture()}>
        <Probe />
      </LessonDataProvider>,
    );
    expect(screen.getByText("terms: 2")).toBeTruthy();
  });

  it("gives null outside a provider", () => {
    render(<Probe />);
    expect(screen.getByText("no lesson data")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/components/lesson-data.test.tsx`
Expected: FAIL, `LessonDataProvider` is not exported from `@/components/lesson`.

- [ ] **Step 3: Add the types and the context**

In `src/lib/curriculum.ts`, replace:

```ts
export interface KeyTerm {
  term: string;
  def: string;
}

export interface LessonData {
  keyTerms: KeyTerm[];
  scenario: Scenario;
  interview: InterviewQuestion[];
  quiz: QuizQuestion[];
}
```

with:

```ts
export interface KeyTerm {
  term: string;
  def: string;
  /** Beginner definition, 25 words or fewer, shown first by <Term>. */
  plain?: string;
}

export interface Formula {
  /** The expression as written, for example "V = I × R". */
  expr: string;
  /** One entry per symbol in expr. */
  parts: { symbol: string; meaning: string }[];
}

export interface LessonData {
  keyTerms: KeyTerm[];
  scenario: Scenario;
  interview: InterviewQuestion[];
  quiz: QuizQuestion[];
  /** Simple-first lessons (spec 2026-10-22): a lesson with a big idea gets the new layout. 2-4 sentences. */
  bigIdea?: string;
  /** Quick checks by id, 3 choices each, placed in the body with <ConceptStep check="id">. */
  checks?: Record<string, QuizQuestion>;
  /** "Remember this": 3-5 takeaways and the formulas worth memorising. */
  remember?: { takeaways: string[]; formulas?: Formula[] };
}
```

Create `src/components/lesson/LessonDataContext.tsx`:

```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LessonData } from "@/lib/curriculum";

const LessonDataContext = createContext<LessonData | null>(null);

/** Gives <QuickCheck> and <Term> inside a lesson body access to that lesson's data. */
export function LessonDataProvider({ data, children }: { data: LessonData; children: ReactNode }) {
  return <LessonDataContext.Provider value={data}>{children}</LessonDataContext.Provider>;
}

/** The current lesson's data, or null outside a LessonDataProvider. */
export function useLessonData(): LessonData | null {
  return useContext(LessonDataContext);
}
```

Append to `src/components/lesson/index.ts`:

```ts
export * from "./LessonDataContext";
```

- [ ] **Step 4: Run the tests and the type check**

Run: `npx vitest run tests/components/lesson-data.test.tsx && npm run typecheck`
Expected: PASS, 2 tests, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/curriculum.ts src/components/lesson/LessonDataContext.tsx src/components/lesson/index.ts tests/helpers/fixtures.ts tests/components/lesson-data.test.tsx
git commit -m "Add the simple-first data fields and a lesson data context" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Brighter theme, simple text and scroll motion

**Files:**
- Modify: `src/app/globals.css:3-18` (tokens) and append the simple-text and motion rules
- Test: `tests/theme-contrast.test.ts`

**Interfaces:**
- Consumes: `tracks` from `src/lib/curriculum.ts`.
- Produces: CSS classes `.simple-text` (Task 8) and `.reveal` (Task 8); brighter `surface`, `surface-2`, `border` and
  `muted` tokens used site-wide.

- [ ] **Step 1: Write the failing test**

Create `tests/theme-contrast.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tracks } from "@/lib/curriculum";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function token(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`--color-${name} not found in globals.css`);
  return m[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const backgrounds = ["bg", "surface", "surface-2"];

describe("theme contrast", () => {
  it.each(backgrounds)("body text is at least 7:1 on %s", (bg) => {
    expect(contrast(token("text"), token(bg))).toBeGreaterThanOrEqual(7);
  });

  it.each(backgrounds)("muted text is at least 4.5:1 on %s", (bg) => {
    expect(contrast(token("muted"), token(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it("muted text is lifted to at least 6.5:1 on surface-2", () => {
    expect(contrast(token("muted"), token("surface-2"))).toBeGreaterThanOrEqual(6.5);
  });

  it("card borders stand out from cards by at least 1.35:1", () => {
    expect(contrast(token("border"), token("surface"))).toBeGreaterThanOrEqual(1.35);
  });

  it.each(tracks.map((t) => [t.name, t.color]))("%s colour is at least 4.5:1 on surface-2", (_, color) => {
    expect(contrast(color, token("surface-2"))).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/theme-contrast.test.ts`
Expected: FAIL on exactly two tests: "muted text is lifted to at least 6.5:1 on surface-2" (today 6.25) and "card
borders stand out from cards by at least 1.35:1" (today 1.21). The other tests already pass.

- [ ] **Step 3: Brighten the tokens and add the simple-text and motion rules**

In `src/app/globals.css`, replace these four lines inside `@theme`:

```css
  --color-surface: #121826;
  --color-surface-2: #1a2235;
  --color-border: #1f2937;
```

and

```css
  --color-muted: #9ca3af;
```

with:

```css
  --color-surface: #151c2c;
  --color-surface-2: #1f2840;
  --color-border: #2a3550;
```

and

```css
  --color-muted: #aab2c0;
```

Append to the end of `src/app/globals.css`:

```css
/* Simple-first lessons: the plain layer, 17 px with a short measure */
.simple-text {
  max-width: 68ch;
  font-size: 1.0625rem;
  line-height: 1.7;
}
.simple-text p {
  margin-block: 0.75rem;
}
.simple-text p:first-child {
  margin-top: 0;
}
.simple-text p:last-child {
  margin-bottom: 0;
}
.simple-text strong {
  color: #ffffff;
  font-weight: 600;
}

/* Steps fade in as they scroll into view. CSS only: browsers without scroll-driven animations, and readers who ask
   for reduced motion, see the steps at once. */
@keyframes reveal-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: reveal-in linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 35%;
    }
  }
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/theme-contrast.test.ts`
Expected: PASS, 13 tests (3 + 3 + 1 + 1 + 5 tracks).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css tests/theme-contrast.test.ts
git commit -m "Brighten the dark theme and add the simple-text and scroll-reveal styles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Static cards (Go deeper, key number, picture, formula, big idea)

**Files:**
- Modify: `package.json`, `package-lock.json` (add `lucide-react`)
- Create: `src/components/lesson/GoDeeper.tsx`, `KeyNumber.tsx`, `Picture.tsx`, `FormulaCard.tsx`, `BigIdea.tsx`
- Modify: `src/components/lesson/index.ts`
- Test: `tests/components/simple-cards.test.tsx`

**Interfaces:**
- Consumes: `Formula` (Task 3).
- Produces:
  - `GoDeeper({ summary?: string = "Go deeper: the full engineering version"; children })`, a `<details data-deeper="">`
  - `KeyNumber({ value: string; children })`, a `<p data-key-number="">`
  - `Picture({ title: string; breaks: string; children })`, a `<figure>` captioned "Picture it: {title}"
  - `FormulaCard({ formula: Formula })`
  - `BigIdea({ text: string })`, `<section id="big-idea">` with the text in `[data-layer="simple"]`

- [ ] **Step 1: Install the icon set**

Run: `npm install lucide-react@1.61.0`
Expected: `package.json` lists `"lucide-react": "^1.61.0"` under `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `tests/components/simple-cards.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BigIdea, FormulaCard, GoDeeper, KeyNumber, Picture } from "@/components/lesson";

afterEach(cleanup);

describe("GoDeeper", () => {
  it("is closed by default but keeps its text in the page", () => {
    const { container } = render(
      <GoDeeper>
        <p>The full engineering text.</p>
      </GoDeeper>,
    );
    const details = container.querySelector("details[data-deeper]") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(screen.getByText("Go deeper: the full engineering version")).toBeTruthy();
    expect(details.textContent).toContain("The full engineering text.");
  });

  it("takes a custom summary", () => {
    render(
      <GoDeeper summary="Show the worked answer">
        <p>42</p>
      </GoDeeper>,
    );
    expect(screen.getByText("Show the worked answer")).toBeTruthy();
  });
});

describe("KeyNumber", () => {
  it("shows the value and what it means", () => {
    render(<KeyNumber value="1.12 eV">silicon&apos;s band gap</KeyNumber>);
    expect(screen.getByText("1.12 eV")).toBeTruthy();
    expect(screen.getByText("silicon's band gap")).toBeTruthy();
  });
});

describe("Picture", () => {
  it("captions the comparison and says where it stops being true", () => {
    const { container } = render(
      <Picture title="a car park" breaks="Electrons are not cars.">
        <svg aria-label="car park" />
      </Picture>,
    );
    expect(container.querySelector("figure figcaption")?.textContent).toBe("Picture it: a car park");
    expect(screen.getByText("Electrons are not cars.")).toBeTruthy();
    expect(screen.getByText(/where this picture stops being true/i)).toBeTruthy();
  });
});

describe("FormulaCard", () => {
  it("lists every symbol with its meaning", () => {
    const { container } = render(
      <FormulaCard
        formula={{
          expr: "V = I × R",
          parts: [
            { symbol: "V", meaning: "voltage, in volts" },
            { symbol: "I", meaning: "current, in amps" },
            { symbol: "R", meaning: "resistance, in ohms" },
          ],
        }}
      />,
    );
    expect(screen.getByText("V = I × R")).toBeTruthy();
    expect(Array.from(container.querySelectorAll("dt")).map((d) => d.textContent)).toEqual(["V", "I", "R"]);
    expect(screen.getByText("current, in amps")).toBeTruthy();
  });
});

describe("BigIdea", () => {
  it("is a labelled section whose text is marked as simple", () => {
    const { container } = render(<BigIdea text="Silicon conducts a little. Heat helps." />);
    expect(screen.getByRole("region", { name: "The big idea" })).toBeTruthy();
    expect(container.querySelector("#big-idea [data-layer='simple']")?.textContent).toBe("Silicon conducts a little. Heat helps.");
  });
});
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `npx vitest run tests/components/simple-cards.test.tsx`
Expected: FAIL, `GoDeeper` (and the others) are not exported from `@/components/lesson`.

- [ ] **Step 4: Write the cards**

Create `src/components/lesson/GoDeeper.tsx`:

```tsx
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** A fold-out for the full engineering text. Native <details>: closed by default, and the text stays in the page. */
export function GoDeeper({ summary = "Go deeper: the full engineering version", children }: { summary?: string; children: ReactNode }) {
  return (
    <details data-deeper="" className="group rounded-xl border border-dashed border-border bg-bg/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-muted hover:text-text [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" />
        {summary}
      </summary>
      <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}
```

Create `src/components/lesson/KeyNumber.tsx`:

```tsx
import type { ReactNode } from "react";
import { Hash } from "lucide-react";

/** One number worth remembering, and what it means. */
export function KeyNumber({ value, children }: { value: string; children: ReactNode }) {
  return (
    <p data-key-number="" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-2/60 px-4 py-2.5">
      <Hash aria-hidden className="h-4 w-4 self-center text-(--track)" />
      <span className="font-mono text-lg font-semibold text-(--track)">{value}</span>
      <span className="text-sm text-text/90">{children}</span>
    </p>
  );
}
```

Create `src/components/lesson/Picture.tsx`:

```tsx
import type { ReactNode } from "react";
import { Eye } from "lucide-react";

/** An everyday comparison drawn out, with one line on where the comparison stops being true. */
export function Picture({ title, breaks, children }: { title: string; breaks: string; children: ReactNode }) {
  return (
    <figure className="rounded-xl border border-border bg-surface p-4">
      <figcaption className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Eye aria-hidden className="h-4 w-4 text-(--track)" />
        Picture it: {title}
      </figcaption>
      <div className="mx-auto max-w-3xl">{children}</div>
      <p className="mt-3 border-t border-border pt-3 text-sm text-muted">
        <span className="font-semibold text-text">Where this picture stops being true: </span>
        {breaks}
      </p>
    </figure>
  );
}
```

Create `src/components/lesson/FormulaCard.tsx`:

```tsx
import { Sigma } from "lucide-react";
import type { Formula } from "@/lib/curriculum";

/** A formula with the meaning of each symbol under it. */
export function FormulaCard({ formula }: { formula: Formula }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <Sigma aria-hidden className="h-4 w-4 text-(--track)" />
        Formula
      </p>
      <p className="mt-2 font-mono text-lg text-white">{formula.expr}</p>
      <dl className="mt-3 space-y-1 text-sm">
        {formula.parts.map((p) => (
          <div key={p.symbol} className="flex gap-3">
            <dt className="min-w-14 font-mono text-(--track)">{p.symbol}</dt>
            <dd className="text-text/90">{p.meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
```

Create `src/components/lesson/BigIdea.tsx`:

```tsx
import { Lightbulb } from "lucide-react";

/** The lesson's main point in plain words, at the top of the page. */
export function BigIdea({ text }: { text: string }) {
  return (
    <section id="big-idea" aria-labelledby="big-idea-heading" className="scroll-mt-20 rounded-2xl border border-(--track)/40 bg-(--track)/10 p-5 sm:p-6">
      <h2 id="big-idea-heading" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-(--track)">
        <Lightbulb aria-hidden className="h-4 w-4" />
        The big idea
      </h2>
      <p data-layer="simple" className="mt-2 max-w-[68ch] text-lg leading-relaxed text-text">
        {text}
      </p>
    </section>
  );
}
```

Append to `src/components/lesson/index.ts`:

```ts
export * from "./GoDeeper";
export * from "./KeyNumber";
export * from "./Picture";
export * from "./FormulaCard";
export * from "./BigIdea";
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx vitest run tests/components/simple-cards.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/lesson/GoDeeper.tsx src/components/lesson/KeyNumber.tsx src/components/lesson/Picture.tsx src/components/lesson/FormulaCard.tsx src/components/lesson/BigIdea.tsx src/components/lesson/index.ts tests/components/simple-cards.test.tsx
git commit -m "Add the Go deeper, key number, picture, formula and big idea cards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Quick check

**Files:**
- Create: `src/components/lesson/QuickCheck.tsx`
- Modify: `src/components/lesson/index.ts`
- Test: `tests/components/quick-check.test.tsx`

**Interfaces:**
- Consumes: `useLessonData()` (Task 3), `hashString` and `seededOrder` (Task 2).
- Produces: `QuickCheck({ id: string })`. Renders `<div data-check-id={id}>` with native radios. With an unknown id it
  renders nothing and calls `console.error('QuickCheck: no check "<id>" in this lesson\'s data')`; the gate in Task 12
  relies on that exact prefix.

- [ ] **Step 1: Write the failing test**

Create `tests/components/quick-check.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LessonDataProvider, QuickCheck } from "@/components/lesson";
import { lessonFixture } from "../helpers/fixtures";

afterEach(cleanup);

const renderCheck = (id: string) =>
  render(
    <LessonDataProvider data={lessonFixture()}>
      <QuickCheck id={id} />
    </LessonDataProvider>,
  );

describe("QuickCheck", () => {
  it("shows the question with every choice and no feedback yet", () => {
    const { container } = renderCheck("full-band");
    expect(screen.getByText("Why can't a full band carry current?")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(container.querySelector("[data-check-id='full-band']")).not.toBeNull();
    expect(screen.queryByText(/Right\.|Not quite\./)).toBeNull();
  });

  it("explains a wrong pick", () => {
    renderCheck("full-band");
    fireEvent.click(screen.getByLabelText("The electrons are far too heavy to move"));
    expect(screen.getByText("Not quite.")).toBeTruthy();
    expect(screen.getByText("Current needs empty spots to move into, and a full band has none.")).toBeTruthy();
  });

  it("confirms the right pick", () => {
    renderCheck("full-band");
    fireEvent.click(screen.getByLabelText("Every spot is taken, so nothing can move"));
    expect(screen.getByText("Right.")).toBeTruthy();
  });

  it("uses one group of native radios, so the keyboard works without extra code", () => {
    renderCheck("full-band");
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios.every((r) => r.type === "radio")).toBe(true);
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
  });

  it("renders nothing and reports an unknown id", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = renderCheck("no-such-check");
    expect(container.innerHTML).toBe("");
    expect(error).toHaveBeenCalledWith('QuickCheck: no check "no-such-check" in this lesson\'s data');
    error.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/components/quick-check.test.tsx`
Expected: FAIL, `QuickCheck` is not exported.

- [ ] **Step 3: Write the quick check**

Create `src/components/lesson/QuickCheck.tsx`:

```tsx
"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { CircleQuestionMark } from "lucide-react";
import { hashString, seededOrder } from "@/lib/shuffle";
import { cn } from "@/lib/cn";
import { useLessonData } from "./LessonDataContext";

/** One question from the lesson's `checks`, answered on the spot with an explanation. Not scored or saved. */
export function QuickCheck({ id }: { id: string }) {
  const q = useLessonData()?.checks?.[id];
  const [picked, setPicked] = useState<number | null>(null);
  const name = useId();
  const order = useMemo(() => (q ? seededOrder(hashString(`check:${id}:${q.q}`), q.choices.length) : []), [id, q]);

  useEffect(() => {
    if (!q) console.error(`QuickCheck: no check "${id}" in this lesson's data`);
  }, [id, q]);

  if (!q) return null;
  const answered = picked !== null;
  const right = picked === q.answer;

  return (
    <div data-check-id={id} className="rounded-xl border border-border bg-surface-2/50 p-4">
      <fieldset>
        <legend className="w-full">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-(--track)">
            <CircleQuestionMark aria-hidden className="h-4 w-4" />
            Quick check
          </span>
          <span className="mt-1 block font-medium">{q.q}</span>
        </legend>
        <div className="mt-3 grid gap-2">
          {order.map((ci) => {
            const state = !answered ? "idle" : ci === q.answer ? "right" : ci === picked ? "wrong" : "idle";
            return (
              <label
                key={ci}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm",
                  state === "right" && "border-green-400/60 bg-green-400/10",
                  state === "wrong" && "border-red-400/60 bg-red-400/10",
                  state === "idle" && "border-border hover:bg-surface-2",
                )}
              >
                <input type="radio" name={name} checked={picked === ci} onChange={() => setPicked(ci)} className="mt-0.5 accent-cyan-400" />
                <span>{q.choices[ci]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <p aria-live="polite" className={cn("mt-3 text-sm", right ? "text-green-300" : "text-red-300")}>
        {answered && (
          <>
            <span className="font-semibold">{right ? "Right. " : "Not quite. "}</span>
            <span className="text-text/90">{q.explain}</span>
          </>
        )}
      </p>
    </div>
  );
}
```

Append to `src/components/lesson/index.ts`:

```ts
export * from "./QuickCheck";
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/components/quick-check.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/QuickCheck.tsx src/components/lesson/index.ts tests/components/quick-check.test.tsx
git commit -m "Add the quick check card" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Tap-to-define terms

**Files:**
- Create: `src/components/lesson/Term.tsx`
- Modify: `src/components/lesson/index.ts`
- Test: `tests/components/term.test.tsx`

**Interfaces:**
- Consumes: `useLessonData()` (Task 3).
- Produces: `Term({ t: string; children })`. `t` must equal a key term's `term` exactly. Closed: a `<button>` with
  `aria-expanded="false"` and no tooltip in the DOM (so the readability gate never counts definitions). Open: a
  `role="tooltip"` element referenced by `aria-describedby`. Unknown `t`: renders `children` as plain text and calls
  `console.error('Term: no key term "<t>" in this lesson\'s data')`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/term.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { LessonDataProvider, Term } from "@/components/lesson";
import { lessonFixture } from "../helpers/fixtures";

afterEach(cleanup);

const renderTerm = (t: string) =>
  render(
    <LessonDataProvider data={lessonFixture()}>
      <p>
        An electron leaves a <Term t={t}>hole</Term> behind.
      </p>
    </LessonDataProvider>,
  );

describe("Term", () => {
  it("starts closed, with no tooltip in the page", () => {
    renderTerm("Hole");
    expect(screen.getByRole("button", { name: "hole" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens on keyboard focus with the plain definition first and the technical one under it", () => {
    renderTerm("Hole");
    const button = screen.getByRole("button", { name: "hole" });
    fireEvent.focusIn(button);
    const tip = screen.getByRole("tooltip");
    expect(button.getAttribute("aria-describedby")).toBe(tip.id);
    expect(tip.textContent).toContain("The empty spot an electron leaves behind when it jumps up.");
    expect(tip.textContent).toContain("The empty state an excited electron leaves in the valence band.");
  });

  it("closes on Escape", () => {
    renderTerm("Hole");
    fireEvent.click(screen.getByRole("button", { name: "hole" }));
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes on a tap elsewhere", () => {
    renderTerm("Hole");
    fireEvent.click(screen.getByRole("button", { name: "hole" }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the technical definition alone when there is no plain one", () => {
    render(
      <LessonDataProvider data={lessonFixture()}>
        <Term t="Band gap (Eg)">band gap</Term>
      </LessonDataProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "band gap" }));
    expect(screen.getByRole("tooltip").textContent).toBe(
      "Band gap (Eg)The forbidden energy range between the valence and conduction bands.",
    );
  });

  it("renders plain text and reports a term the lesson does not define", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    renderTerm("Electron");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("An electron leaves a hole behind.")).toBeTruthy();
    expect(error).toHaveBeenCalledWith('Term: no key term "Electron" in this lesson\'s data');
    error.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/components/term.test.tsx`
Expected: FAIL, `Term` is not exported.

- [ ] **Step 3: Write the term**

Create `src/components/lesson/Term.tsx`:

```tsx
"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useLessonData } from "./LessonDataContext";

/**
 * A word from the lesson's key terms. Hover, keyboard focus or a tap shows the plain definition with the technical one
 * under it; Escape, a tap elsewhere, blur or moving the mouse away closes it.
 */
export function Term({ t, children }: { t: string; children: ReactNode }) {
  const term = useLessonData()?.keyTerms.find((k) => k.term === t);
  const [open, setOpen] = useState(false);
  const [alignEnd, setAlignEnd] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    if (!term) console.error(`Term: no key term "${t}" in this lesson's data`);
  }, [t, term]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (!term) return <>{children}</>;

  // Open towards the side with more room, so the box stays on screen near either edge of the column.
  const show = () => {
    const left = box.current?.getBoundingClientRect().left ?? 0;
    setAlignEnd(left > window.innerWidth / 2);
    setOpen(true);
  };

  return (
    <span ref={box} className="relative" onMouseEnter={show} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onClick={show}
        className="cursor-help rounded-sm underline decoration-(--track) decoration-dotted decoration-2 underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          id={tipId}
          className={cn(
            "absolute top-full z-30 mt-2 block w-72 max-w-[80vw] rounded-lg border border-border bg-surface-2 p-3 text-left text-sm font-normal leading-snug shadow-xl",
            alignEnd ? "right-0" : "left-0",
          )}
        >
          <span className="block font-semibold text-white">{term.term}</span>
          <span className="mt-1 block text-text">{term.plain ?? term.def}</span>
          {term.plain && <span className="mt-2 block text-xs text-muted">{term.def}</span>}
        </span>
      )}
    </span>
  );
}
```

Append to `src/components/lesson/index.ts`:

```ts
export * from "./Term";
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/components/term.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/Term.tsx src/components/lesson/index.ts tests/components/term.test.tsx
git commit -m "Add tap-to-define terms backed by the lesson's key terms" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Concept step and the "Try this" checklist

**Files:**
- Create: `src/components/lesson/ConceptStep.tsx`, `src/components/lesson/TryThis.tsx`
- Modify: `src/components/lesson/index.ts`
- Test: `tests/components/concept-step.test.tsx`

**Interfaces:**
- Consumes: `GoDeeper` (Task 5), `QuickCheck` (Task 6), `.simple-text` and `.reveal` (Task 4).
- Produces:
  - `ConceptStep({ n: number; title: string; picture: ReactNode; keyNumber?: ReactNode; deeper?: ReactNode; check?: string; children })`
    renders `<article data-step={n}>` with an `h3`, then in this order: `<div data-layer="simple">` (children),
    `<div data-picture="">` (picture), the key number, `GoDeeper` (deeper), `QuickCheck` (check).
  - `TryThis({ items: ReactNode[] })`, a checklist of native checkboxes, not saved.

- [ ] **Step 1: Write the failing test**

Create `tests/components/concept-step.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConceptStep, KeyNumber, LessonDataProvider, TryThis } from "@/components/lesson";
import { lessonFixture } from "../helpers/fixtures";

afterEach(cleanup);

function renderFullStep() {
  return render(
    <LessonDataProvider data={lessonFixture()}>
      <ConceptStep
        n={2}
        title="Electrons need room"
        picture={<svg aria-label="car park" />}
        keyNumber={<KeyNumber value="1.12 eV">the gap</KeyNumber>}
        deeper={<p>Original text.</p>}
        check="full-band"
      >
        <p>A full band can&apos;t carry current.</p>
      </ConceptStep>
    </LessonDataProvider>,
  );
}

describe("ConceptStep", () => {
  it("marks the step, its simple text and its picture for the gates", () => {
    const { container } = renderFullStep();
    const step = container.querySelector("[data-step='2']") as HTMLElement;
    expect(screen.getByRole("heading", { level: 3, name: "Electrons need room" })).toBeTruthy();
    expect(step.querySelector("[data-layer='simple']")?.textContent).toBe("A full band can't carry current.");
    expect(step.querySelector("[data-picture] svg")).not.toBeNull();
    expect(step.querySelector("details[data-deeper]")?.textContent).toContain("Original text.");
    expect(step.querySelector("[data-check-id='full-band']")).not.toBeNull();
  });

  it("puts the parts in reading order: text, picture, key number, go deeper, quick check", () => {
    const { container } = renderFullStep();
    const parts = Array.from(
      container.querySelectorAll("[data-layer], [data-picture], [data-key-number], [data-deeper], [data-check-id]"),
    ).map((el) => el.getAttributeNames().find((a) => a.startsWith("data-")));
    expect(parts).toEqual(["data-layer", "data-picture", "data-key-number", "data-deeper", "data-check-id"]);
  });

  it("leaves out the optional parts", () => {
    const { container } = render(
      <ConceptStep n={1} title="Atoms share electrons" picture={<svg />}>
        <p>Text.</p>
      </ConceptStep>,
    );
    expect(container.querySelector("[data-key-number], [data-deeper], [data-check-id]")).toBeNull();
  });
});

describe("TryThis", () => {
  it("lets the reader tick items off one at a time", () => {
    render(<TryThis items={["Heat silicon to 400 K", "Switch to germanium"]} />);
    const first = screen.getByLabelText("Heat silicon to 400 K") as HTMLInputElement;
    expect(first.checked).toBe(false);
    fireEvent.click(first);
    expect(first.checked).toBe(true);
    expect((screen.getByLabelText("Switch to germanium") as HTMLInputElement).checked).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/components/concept-step.test.tsx`
Expected: FAIL, `ConceptStep` is not exported.

- [ ] **Step 3: Write the step and the checklist**

Create `src/components/lesson/ConceptStep.tsx`:

```tsx
import type { ReactNode } from "react";
import { GoDeeper } from "./GoDeeper";
import { QuickCheck } from "./QuickCheck";

export interface ConceptStepProps {
  /** Step number shown in the badge, starting at 1. */
  n: number;
  title: string;
  /** The step's picture: a <Picture> comparison or a <Figure> diagram. */
  picture: ReactNode;
  /** At most one <KeyNumber>. */
  keyNumber?: ReactNode;
  /** Today's text for this part of the lesson, word for word. */
  deeper?: ReactNode;
  /** Id of a quick check in the lesson's data, shown at the end of the step. */
  check?: string;
  /** The simple explanation: 2-5 short sentences. */
  children: ReactNode;
}

/** One small step of "Build it up". The data attributes mark the parts the readability gate measures. */
export function ConceptStep({ n, title, picture, keyNumber, deeper, check, children }: ConceptStepProps) {
  return (
    <article data-step={n} aria-labelledby={`step-${n}-title`} className="reveal space-y-5 rounded-2xl border border-border bg-surface/60 p-5 sm:p-6">
      <header className="flex items-start gap-3">
        <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--track)/20 font-mono text-sm font-semibold text-(--track)">
          {n}
        </span>
        <h3 id={`step-${n}-title`} className="pt-0.5 text-xl font-semibold tracking-tight">
          {title}
        </h3>
      </header>
      <div data-layer="simple" className="simple-text">
        {children}
      </div>
      <div data-picture="">{picture}</div>
      {keyNumber}
      {deeper && <GoDeeper>{deeper}</GoDeeper>}
      {check && <QuickCheck id={check} />}
    </article>
  );
}
```

Create `src/components/lesson/TryThis.tsx`:

```tsx
"use client";

import { useId, useState, type ReactNode } from "react";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";

/** "Things to try" with the interactive, as a checklist the reader ticks off. Not saved. */
export function TryThis({ items }: { items: ReactNode[] }) {
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  const id = useId();
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <ListChecks aria-hidden className="h-4 w-4 text-(--track)" />
        Try this
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i}>
            <label htmlFor={`${id}-${i}`} className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                id={`${id}-${i}`}
                type="checkbox"
                checked={done[i]}
                onChange={() => setDone((d) => d.map((v, k) => (k === i ? !v : v)))}
                className="mt-1 accent-cyan-400"
              />
              <span className={cn(done[i] && "text-muted line-through")}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Append to `src/components/lesson/index.ts`:

```ts
export * from "./ConceptStep";
export * from "./TryThis";
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/components/concept-step.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/ConceptStep.tsx src/components/lesson/TryThis.tsx src/components/lesson/index.ts tests/components/concept-step.test.tsx
git commit -m "Add the concept step and the Try this checklist" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Remember this, the lesson header and "On this page"

**Files:**
- Create: `src/components/lesson/Remember.tsx`, `lessonParts.ts`, `LessonHeader.tsx`, `OnThisPage.tsx`
- Modify: `src/components/lesson/index.ts`
- Test: `tests/components/lesson-frame.test.tsx`

**Interfaces:**
- Consumes: `FormulaCard`, `GoDeeper` (Task 5); `Formula`, `KeyTerm`, `LessonMeta`, `Track` (curriculum).
- Produces:
  - `Remember({ takeaways: string[]; formulas?: Formula[]; keyTerms: KeyTerm[] })`, `<section id="remember">`
  - `LessonPart { id: string; label: string }`; `LESSON_PARTS` (9 parts, in page order) and `HEADER_PARTS` (the first 6)
  - `LessonHeader({ meta: LessonMeta; track: Track })`
  - `OnThisPage({ parts?: readonly LessonPart[] })`, `<nav aria-label="On this page">`; the current part's link has
    `aria-current="location"`

- [ ] **Step 1: Write the failing test**

Create `tests/components/lesson-frame.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within, act, cleanup } from "@testing-library/react";
import { LESSON_PARTS, LessonHeader, OnThisPage, Remember } from "@/components/lesson";
import { lessonBySlug, trackById } from "@/lib/curriculum";
import { lessonFixture } from "../helpers/fixtures";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Remember", () => {
  it("lists takeaways and formulas and folds the key terms away", () => {
    const { container } = render(
      <Remember
        takeaways={["One.", "Two.", "Three."]}
        formulas={[{ expr: "V = I × R", parts: [{ symbol: "V", meaning: "voltage" }] }]}
        keyTerms={lessonFixture().keyTerms}
      />,
    );
    expect(screen.getByRole("heading", { name: "Remember this" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["One.", "Two.", "Three."]);
    expect(screen.getByText("V = I × R")).toBeTruthy();
    const terms = container.querySelector("#remember details[data-deeper]") as HTMLDetailsElement;
    expect(terms.open).toBe(false);
    expect(screen.getByText("All key terms (2)")).toBeTruthy();
    expect(terms.textContent).toContain("The empty spot an electron leaves behind when it jumps up.");
  });
});

describe("LessonHeader", () => {
  it("shows the title and objectives and links to the six learning parts", () => {
    const meta = lessonBySlug("atoms-to-bands")!;
    render(<LessonHeader meta={meta} track={trackById("semiconductors")} />);
    expect(screen.getByRole("heading", { level: 1, name: meta.title })).toBeTruthy();
    for (const o of meta.objectives) expect(screen.getByText(o)).toBeTruthy();
    const links = within(screen.getByRole("navigation", { name: "Lesson parts" })).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#big-idea", "#theory", "#viz", "#practice", "#remember", "#quiz"]);
  });
});

describe("OnThisPage", () => {
  it("links every part and marks the first as current before any scrolling", () => {
    render(<OnThisPage />);
    const links = within(screen.getByRole("navigation", { name: "On this page" })).getAllByRole("link");
    expect(links).toHaveLength(LESSON_PARTS.length);
    expect(links[0].getAttribute("aria-current")).toBe("location");
    expect(links.slice(1).every((a) => !a.hasAttribute("aria-current"))).toBe(true);
  });

  it("marks the part the observer reports as on screen", () => {
    let report: IntersectionObserverCallback = () => {};
    class FakeObserver {
      constructor(callback: IntersectionObserverCallback) {
        report = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(
      <>
        <section id="big-idea" />
        <section id="theory" />
        <OnThisPage />
      </>,
    );
    act(() =>
      report(
        [{ target: document.getElementById("theory")!, isIntersecting: true } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(screen.getByRole("link", { name: /Build it up/ }).getAttribute("aria-current")).toBe("location");
    expect(screen.getByRole("link", { name: /Big idea/ }).hasAttribute("aria-current")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/components/lesson-frame.test.tsx`
Expected: FAIL, `LESSON_PARTS` (and the components) are not exported.

- [ ] **Step 3: Write the parts list and the three components**

Create `src/components/lesson/lessonParts.ts`:

```ts
export interface LessonPart {
  id: string;
  label: string;
}

/** The parts of a simple-first lesson page, in page order. Each id is the id of a section on the page. */
export const LESSON_PARTS: readonly LessonPart[] = [
  { id: "big-idea", label: "Big idea" },
  { id: "theory", label: "Build it up" },
  { id: "viz", label: "Play with it" },
  { id: "practice", label: "Practice" },
  { id: "remember", label: "Remember this" },
  { id: "quiz", label: "Check yourself" },
  { id: "scenario", label: "Real-world scenario" },
  { id: "interview", label: "Interview prep" },
  { id: "references", label: "References" },
];

/** The learning parts the header bar links to; the rest are reachable from "On this page". */
export const HEADER_PARTS: readonly LessonPart[] = LESSON_PARTS.slice(0, 6);
```

Create `src/components/lesson/Remember.tsx`:

```tsx
import { Bookmark, Check } from "lucide-react";
import type { Formula, KeyTerm } from "@/lib/curriculum";
import { FormulaCard } from "./FormulaCard";
import { GoDeeper } from "./GoDeeper";

/** End-of-lesson summary: the takeaways, the formulas, and every key term in a fold-out. */
export function Remember({ takeaways, formulas = [], keyTerms }: { takeaways: string[]; formulas?: Formula[]; keyTerms: KeyTerm[] }) {
  return (
    <section id="remember" aria-labelledby="remember-heading" className="scroll-mt-20 space-y-4">
      <h2 id="remember-heading" className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
        <Bookmark aria-hidden className="h-5 w-5 text-(--track)" />
        Remember this
      </h2>
      <ul className="space-y-2">
        {takeaways.map((t) => (
          <li key={t} className="flex gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--track)" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {formulas.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {formulas.map((f) => (
            <FormulaCard key={f.expr} formula={f} />
          ))}
        </div>
      )}
      <GoDeeper summary={`All key terms (${keyTerms.length})`}>
        <dl className="space-y-3 text-sm">
          {keyTerms.map((k) => (
            <div key={k.term}>
              <dt className="font-semibold">{k.term}</dt>
              {k.plain && <dd className="text-text/90">{k.plain}</dd>}
              <dd className="text-muted">{k.def}</dd>
            </div>
          ))}
        </dl>
      </GoDeeper>
    </section>
  );
}
```

Create `src/components/lesson/LessonHeader.tsx`:

```tsx
import Link from "next/link";
import { Check } from "lucide-react";
import type { LessonMeta, Track } from "@/lib/curriculum";
import { TrackPill } from "@/components/ui/TrackPill";
import { HEADER_PARTS } from "./lessonParts";

/** Header of a simple-first lesson: a wash of the track colour, the title and objectives, and links to the parts. */
export function LessonHeader({ meta, track }: { meta: LessonMeta; track: Track }) {
  return (
    <header className="space-y-4 rounded-2xl border border-border bg-[radial-gradient(ellipse_at_top_left,color-mix(in_oklab,var(--track)_22%,transparent),transparent_65%)] p-6 sm:p-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/learn" className="hover:text-text">
          Learn
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/learn/${track.id}`} className="hover:text-text">
          {track.name}
        </Link>
      </nav>
      <TrackPill track={track} />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{meta.title}</h1>
      <p className="max-w-[68ch] text-lg text-text/80">{meta.summary}</p>
      <p className="font-mono text-xs text-muted">
        Day {meta.day} · {meta.minutes} min
      </p>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">After this lesson</p>
        <ul className="space-y-1.5 text-sm">
          {meta.objectives.map((o) => (
            <li key={o} className="flex gap-2">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-(--track)" />
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>
      <nav aria-label="Lesson parts" className="xl:hidden">
        <ol className="flex flex-wrap gap-2">
          {HEADER_PARTS.map((p, i) => (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg/40 px-3 py-1 text-xs text-muted hover:text-text"
              >
                <span className="font-mono text-(--track)">{i + 1}</span>
                {p.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </header>
  );
}
```

Create `src/components/lesson/OnThisPage.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { LESSON_PARTS, type LessonPart } from "./lessonParts";

/** Sticky list of the lesson's parts; the part nearest the top of the screen is marked as the current location. */
export function OnThisPage({ parts = LESSON_PARTS }: { parts?: readonly LessonPart[] }) {
  const [active, setActive] = useState(parts[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = parts.find((p) => visible.get(p.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    for (const p of parts) {
      const el = document.getElementById(p.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [parts]);

  return (
    <nav aria-label="On this page" className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">On this page</p>
      <ol className="space-y-1 text-sm">
        {parts.map((p, i) => {
          const current = p.id === active;
          return (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                aria-current={current ? "location" : undefined}
                className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", current ? "bg-surface-2 text-text" : "text-muted hover:text-text")}
              >
                <span className={cn("font-mono text-xs", current && "text-(--track)")}>{String(i + 1).padStart(2, "0")}</span>
                {p.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

Append to `src/components/lesson/index.ts`:

```ts
export * from "./Remember";
export * from "./lessonParts";
export * from "./LessonHeader";
export * from "./OnThisPage";
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/components/lesson-frame.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/lesson/Remember.tsx src/components/lesson/lessonParts.ts src/components/lesson/LessonHeader.tsx src/components/lesson/OnThisPage.tsx src/components/lesson/index.ts tests/components/lesson-frame.test.tsx
git commit -m "Add Remember this, the lesson header and the On this page list" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Split the lesson shell into classic and simple-first layouts

Before editing, read `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`,
section "Context providers": the route (a server component) renders the client `LessonShell`, which wraps the lesson
body in the provider.

**Files:**
- Create: `src/app/learn/lessonShellProps.ts`, `src/app/learn/LessonNav.tsx`, `src/app/learn/ClassicLessonShell.tsx`,
  `src/app/learn/SimpleLessonShell.tsx`
- Modify: `src/app/learn/LessonShell.tsx` (whole file becomes the dispatcher)
- Test: `tests/lesson-shell.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 3-9; `src/app/learn/lesson-route.tsx` keeps calling
  `LessonShell({ meta, data, prev, next, references, children })` unchanged.
- Produces: `LessonShellProps`; `LessonSidebar({ meta })`; `LessonPager({ slug, prev?, next? })`;
  `ClassicLessonShell(props)`; `SimpleLessonShell(props)`, whose root has `data-layout="simple-first"` and sets the
  `--track` CSS variable; `LessonShell(props)`, which wraps either shell in `LessonDataProvider`.

- [ ] **Step 1: Pin today's markup**

Create `tests/lesson-shell.test.tsx` with the two tests that describe today's layout:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LessonShell } from "@/app/learn/LessonShell";
import { lessonBySlug } from "@/lib/curriculum";
import { lessonFixture } from "./helpers/fixtures";

afterEach(cleanup);

const meta = lessonBySlug("atoms-to-bands")!;

function renderShell(data = lessonFixture()) {
  return render(
    <LessonShell meta={meta} data={data} references={[]}>
      <section id="theory">
        <p>Body text.</p>
      </section>
    </LessonShell>,
  );
}

/** Markup without the ids React generates, which may shift when the component tree around them changes. */
function stableMarkup(html: string): string {
  return html.replace(/ (id|for|name|aria-labelledby|aria-describedby)="[^"]*"/g, "");
}

describe("LessonShell", () => {
  it("renders exactly today's markup for a lesson without a big idea", () => {
    const { container } = renderShell();
    expect(stableMarkup(container.innerHTML)).toMatchSnapshot();
  });

  it("keeps today's layout for a lesson without a big idea", () => {
    const { container } = renderShell();
    expect(container.querySelector("[data-layout='simple-first']")).toBeNull();
    expect(screen.getByText("After this lesson")).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Key terms" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Quiz" })).toBeTruthy();
    expect(screen.getByText("Body text.")).toBeTruthy();
  });
});
```

Run: `npx vitest run tests/lesson-shell.test.tsx`
Expected: PASS, 2 tests, and vitest writes `tests/__snapshots__/lesson-shell.test.tsx.snap`, which records today's
markup.

Commit, so the refactor below is checked against today's markup:

```bash
git add tests/lesson-shell.test.tsx tests/__snapshots__/lesson-shell.test.tsx.snap
git commit -m "Pin today's lesson layout markup before splitting the shell" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Write the failing tests for the simple-first layout**

In `tests/lesson-shell.test.tsx`, add these imports under the existing ones:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { QuickCheck } from "@/components/lesson";
```

add this constant under `const meta = ...`:

```tsx
const simple = lessonFixture({ bigIdea: "Silicon conducts a little. Heat helps.", remember: { takeaways: ["One.", "Two.", "Three."] } });
```

and add these tests inside `describe("LessonShell", ...)`, after the two existing ones:

```tsx
  it("uses the simple-first layout once the lesson has a big idea", () => {
    const { container } = renderShell(simple);
    expect(container.querySelector("[data-layout='simple-first']")).not.toBeNull();
    expect(screen.getByRole("region", { name: "The big idea" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Remember this" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Check yourself" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Interview prep" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Key terms" })).toBeNull();
    expect(screen.getByText("Body text.")).toBeTruthy();
  });

  it("sets the track colour for the simple-first parts", () => {
    const html = renderToStaticMarkup(
      <LessonShell meta={meta} data={simple} references={[]}>
        <p>Body.</p>
      </LessonShell>,
    );
    expect(html).toContain("--track:#a78bfa");
  });

  it("gives the lesson body access to the lesson data", () => {
    render(
      <LessonShell meta={meta} data={simple} references={[]}>
        <QuickCheck id="full-band" />
      </LessonShell>,
    );
    expect(screen.getByText("Why can't a full band carry current?")).toBeTruthy();
  });
```

Run: `npx vitest run tests/lesson-shell.test.tsx`
Expected: the two tests from Step 1 PASS; the three new ones FAIL (no big idea section, no `--track`, and the quick
check finds no lesson data).

- [ ] **Step 3: Move today's layout out of LessonShell**

Create `src/app/learn/lessonShellProps.ts`:

```ts
import type { ReactNode } from "react";
import type { LessonData, LessonMeta } from "@/lib/curriculum";
import type { LessonReference, Reference } from "@/lib/references";

export interface LessonShellProps {
  meta: LessonMeta;
  data: LessonData;
  prev?: LessonMeta;
  next?: LessonMeta;
  references: Array<LessonReference & { ref: Reference }>;
  children: ReactNode;
}
```

Create `src/app/learn/LessonNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { lessonsFor, trackById, type LessonMeta } from "@/lib/curriculum";
import { useProgress } from "@/lib/progress";
import { ButtonLink } from "@/components/ui/Button";
import { MarkComplete } from "@/components/lesson";
import { cn } from "@/lib/cn";

function LessonNav({ meta }: { meta: LessonMeta }) {
  const { state } = useProgress();
  const ls = lessonsFor(meta.track);
  return (
    <ol className="space-y-0.5 text-sm">
      {ls.map((l, i) => {
        const current = l.slug === meta.slug;
        const done = Boolean(state.completed[l.slug]);
        return (
          <li key={l.slug}>
            <Link
              href={`/learn/${l.track}/${l.slug}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-start gap-2 rounded-md px-2 py-1.5",
                current ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              <span className={cn("font-mono text-xs", done ? "text-green-400" : "text-muted")}>{done ? "✓" : String(i + 1).padStart(2, "0")}</span>
              <span>{l.title}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** The track's lessons: a fold-out on small screens, a sticky column from lg up. */
export function LessonSidebar({ meta }: { meta: LessonMeta }) {
  const track = trackById(meta.track);
  return (
    <aside className="mb-6 lg:mb-0">
      <details className="rounded-lg border border-border bg-surface lg:hidden">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium">{track.name} lessons</summary>
        <div className="border-t border-border p-2">
          <LessonNav meta={meta} />
        </div>
      </details>
      <div className="hidden lg:sticky lg:top-20 lg:block">
        <p className="mb-2 px-2 font-mono text-xs uppercase tracking-wide text-muted">{track.name}</p>
        <LessonNav meta={meta} />
      </div>
    </aside>
  );
}

/** Mark-complete and the previous and next lesson links at the end of a lesson. */
export function LessonPager({ slug, prev, next }: { slug: string; prev?: LessonMeta; next?: LessonMeta }) {
  return (
    <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      <MarkComplete slug={slug} />
      <div className="flex flex-wrap gap-2">
        {prev && (
          <ButtonLink variant="secondary" href={`/learn/${prev.track}/${prev.slug}`}>
            ← Previous
          </ButtonLink>
        )}
        {next && <ButtonLink href={`/learn/${next.track}/${next.slug}`}>Next: {next.title} →</ButtonLink>}
      </div>
    </div>
  );
}
```

Create `src/app/learn/ClassicLessonShell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { trackById } from "@/lib/curriculum";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { TrackPill } from "@/components/ui/TrackPill";
import { InterviewQuestions, KeyTermsRail, Quiz, ScenarioCard, Section } from "@/components/lesson";
import { ReferenceList } from "@/components/lesson/ReferenceList";
import { LessonPager, LessonSidebar } from "./LessonNav";
import type { LessonShellProps } from "./lessonShellProps";

/** Today's lesson layout, kept for lessons not yet converted to simple-first. Deleted once every lesson is converted. */
export function ClassicLessonShell({ meta, data, prev, next, references, children }: LessonShellProps) {
  const track = trackById(meta.track);
  return (
    <Container className="py-8 lg:py-10">
      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[230px_minmax(0,1fr)_250px]">
        <LessonSidebar meta={meta} />

        <article className="min-w-0 space-y-12">
          <header className="space-y-3">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <Link href="/learn" className="hover:text-text">
                Learn
              </Link>
              <span className="mx-1.5">/</span>
              <Link href={`/learn/${track.id}`} className="hover:text-text">
                {track.name}
              </Link>
            </nav>
            <TrackPill track={track} />
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{meta.title}</h1>
            <p className="text-lg text-muted">{meta.summary}</p>
            <p className="font-mono text-xs text-muted">
              Day {meta.day} · {meta.minutes} min
            </p>
            <Card className="mt-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">After this lesson</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {meta.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </Card>
          </header>

          {children}

          <Section id="scenario" title="Real-world scenario">
            <ScenarioCard scenario={data.scenario} />
          </Section>
          <Section id="interview" title="Interview questions">
            <InterviewQuestions items={data.interview} />
          </Section>
          <Section id="quiz" title="Quiz">
            <Quiz slug={meta.slug} questions={data.quiz} />
          </Section>
          <Section id="references" title="References and further reading">
            <ReferenceList items={references} />
          </Section>

          <LessonPager slug={meta.slug} prev={prev} next={next} />
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <KeyTermsRail terms={data.keyTerms} />
          </div>
        </aside>
      </div>
      <div className="mt-10 xl:hidden">
        <KeyTermsRail terms={data.keyTerms} />
      </div>
    </Container>
  );
}
```

Create `src/app/learn/SimpleLessonShell.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { trackById } from "@/lib/curriculum";
import { Container } from "@/components/ui/Container";
import {
  BigIdea,
  GoDeeper,
  InterviewQuestions,
  LessonHeader,
  OnThisPage,
  Quiz,
  Remember,
  ScenarioCard,
  Section,
} from "@/components/lesson";
import { ReferenceList } from "@/components/lesson/ReferenceList";
import { LessonPager, LessonSidebar } from "./LessonNav";
import type { LessonShellProps } from "./lessonShellProps";

/** The simple-first layout (spec 2026-10-22): big idea, steps, interactive and practice, then the checks. */
export function SimpleLessonShell({ meta, data, prev, next, references, children }: LessonShellProps) {
  const track = trackById(meta.track);
  return (
    <Container data-layout="simple-first" className="py-8 lg:py-10" style={{ "--track": track.color } as CSSProperties}>
      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[230px_minmax(0,1fr)_220px]">
        <LessonSidebar meta={meta} />

        <article className="min-w-0 space-y-12">
          <LessonHeader meta={meta} track={track} />
          {data.bigIdea && <BigIdea text={data.bigIdea} />}

          {children}

          {data.remember && <Remember takeaways={data.remember.takeaways} formulas={data.remember.formulas} keyTerms={data.keyTerms} />}
          <Section id="quiz" title="Check yourself">
            <Quiz slug={meta.slug} questions={data.quiz} />
          </Section>
          <Section id="scenario" title="Real-world scenario">
            <ScenarioCard scenario={data.scenario} />
          </Section>
          <Section id="interview" title="Interview prep">
            <InterviewQuestions items={data.interview} />
          </Section>
          {references.length > 0 && (
            <Section id="references" title="References">
              <GoDeeper summary={`Show the ${references.length} references and further reading`}>
                <ReferenceList items={references} />
              </GoDeeper>
            </Section>
          )}

          <LessonPager slug={meta.slug} prev={prev} next={next} />
        </article>

        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <OnThisPage />
          </div>
        </aside>
      </div>
    </Container>
  );
}
```

Replace the whole of `src/app/learn/LessonShell.tsx` with:

```tsx
"use client";

import { LessonDataProvider } from "@/components/lesson";
import { ClassicLessonShell } from "./ClassicLessonShell";
import { SimpleLessonShell } from "./SimpleLessonShell";
import type { LessonShellProps } from "./lessonShellProps";

export type { LessonShellProps } from "./lessonShellProps";

/** Gives the body its lesson data, and picks the simple-first layout for lessons that have a big idea. */
export function LessonShell(props: LessonShellProps) {
  return (
    <LessonDataProvider data={props.data}>
      {props.data.bigIdea ? <SimpleLessonShell {...props} /> : <ClassicLessonShell {...props} />}
    </LessonDataProvider>
  );
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `npx vitest run tests/lesson-shell.test.tsx && npm run typecheck`
Expected: PASS, 5 tests, and the snapshot matches unchanged (today's layout is untouched). If the snapshot test fails,
the classic layout changed: fix `ClassicLessonShell.tsx` or `LessonNav.tsx`; do not update the snapshot.

- [ ] **Step 5: Commit**

```bash
git add src/app/learn/lessonShellProps.ts src/app/learn/LessonNav.tsx src/app/learn/ClassicLessonShell.tsx src/app/learn/SimpleLessonShell.tsx src/app/learn/LessonShell.tsx tests/lesson-shell.test.tsx
git commit -m "Split the lesson shell into the classic and simple-first layouts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Big ideas on the track pages

**Files:**
- Modify: `src/app/learn/TrackLessonList.tsx`, `src/app/learn/track-route.tsx`
- Test: `tests/track-list.test.tsx`

**Interfaces:**
- Consumes: `lessonData` from `src/content/registry.ts` (server side only).
- Produces: `TrackLessonList({ track: TrackId; bigIdeas?: Record<string, string> })`: a lesson row shows
  `bigIdeas[slug]`, else the summary, clamped to three lines.

- [ ] **Step 1: Write the failing test**

Create `tests/track-list.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TrackLessonList } from "@/app/learn/TrackLessonList";
import { lessonsFor } from "@/lib/curriculum";

afterEach(cleanup);

describe("TrackLessonList", () => {
  it("shows a lesson's big idea in place of its summary when it has one", () => {
    const [first, second] = lessonsFor("semiconductors");
    render(<TrackLessonList track="semiconductors" bigIdeas={{ [first.slug]: "Silicon conducts a little. Heat helps." }} />);
    expect(screen.getByText("Silicon conducts a little. Heat helps.")).toBeTruthy();
    expect(screen.queryByText(first.summary)).toBeNull();
    expect(screen.getByText(second.summary)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/track-list.test.tsx`
Expected: FAIL, the big idea text is not on the page.

- [ ] **Step 3: Pass the big ideas through**

In `src/app/learn/TrackLessonList.tsx`, replace:

```tsx
export function TrackLessonList({ track }: { track: TrackId }) {
```

with:

```tsx
export function TrackLessonList({ track, bigIdeas = {} }: { track: TrackId; bigIdeas?: Record<string, string> }) {
```

and replace:

```tsx
                      <span className="block text-sm text-muted">{l.summary}</span>
```

with:

```tsx
                      <span className="line-clamp-3 text-sm text-muted">{bigIdeas[l.slug] ?? l.summary}</span>
```

In `src/app/learn/track-route.tsx`, add under the existing imports:

```tsx
import { lessonData } from "@/content/registry";
```

then replace:

```tsx
  const minutes = ls.reduce((s, l) => s + l.minutes, 0);
```

with:

```tsx
  const minutes = ls.reduce((s, l) => s + l.minutes, 0);
  // Only these strings reach the client; the rest of the lesson data stays on the server.
  const bigIdeas = Object.fromEntries(
    ls.flatMap((l) => {
      const idea = lessonData[l.slug]?.bigIdea;
      return idea ? [[l.slug, idea]] : [];
    }),
  );
```

and replace:

```tsx
        <TrackLessonList track={t.id} />
```

with:

```tsx
        <TrackLessonList track={t.id} bigIdeas={bigIdeas} />
```

- [ ] **Step 4: Run the test and the type check**

Run: `npx vitest run tests/track-list.test.tsx && npm run typecheck`
Expected: PASS, 1 test, and no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/learn/TrackLessonList.tsx src/app/learn/track-route.tsx tests/track-list.test.tsx
git commit -m "Show each converted lesson's big idea on its track page" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: The lesson gates and the Go deeper check

**Files:**
- Create: `tests/helpers/simple-first-gates.ts`, `tests/helpers/lesson-text.ts`, `tests/simple-first-gates.test.tsx`,
  `tests/simple-first-lessons.test.tsx`, `scripts/check-go-deeper.mts`
- Modify: `tests/hydration-stability.test.tsx`, `package.json` (script `check:deeper`)

**Interfaces:**
- Consumes: `readability` helpers (Task 1), `correctIsLongest` from `tests/quiz-length-tell.ts`, components from
  Tasks 3-8, `lessonData` and `lessonBodies` registries.
- Produces:
  - `LIMITS` (the spec's numbers), `dataProblems(data: LessonData): string[]`,
    `bodyProblems(Body: ComponentType, data: LessonData): string[]`, both empty when a lesson passes
  - `theoryWords(container: HTMLElement): number`: the content tests' count, but only the "Go deeper" text in a
    converted lesson
  - `npm run check:deeper -- <slug> [git-ref]`: exit 0 when nothing is missing, 1 with a list, 2 on bad input

- [ ] **Step 1: Write the failing gate tests**

Create `tests/simple-first-gates.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConceptStep, Section, Term } from "@/components/lesson";
import { bodyProblems, dataProblems } from "./helpers/simple-first-gates";
import { lessonFixture } from "./helpers/fixtures";

afterEach(cleanup);

const checks = {
  a: { q: "Which is right?", choices: ["Right one here", "Wrong one there", "Another wrong one"], answer: 0, explain: "The first one is right." },
  b: { q: "What lifts it?", choices: ["Heat lifts it", "Cold lifts it up", "Nothing lifts it"], answer: 0, explain: "Heat gives the energy." },
  c: { q: "How many doublings?", choices: ["Two doublings", "One doubling only", "Twenty doublings"], answer: 0, explain: "20 °C is two steps of 10 °C." },
};

const goodData = lessonFixture({
  bigIdea: "Silicon conducts a little. Heat frees electrons.",
  checks,
  remember: { takeaways: ["One idea.", "Two ideas.", "Three ideas."] },
  keyTerms: [{ term: "Hole", def: "The empty state an excited electron leaves.", plain: "The empty spot an electron leaves." }],
});

function step(n: number, opts: { picture?: boolean; check?: string; text?: ReactNode } = {}) {
  return (
    <ConceptStep key={n} n={n} title={`Step ${n}`} picture={opts.picture === false ? null : <svg aria-label={`picture ${n}`} />} check={opts.check}>
      <p>{opts.text ?? "A short plain sentence. Another short one."}</p>
    </ConceptStep>
  );
}

function lesson(...steps: ReactNode[]) {
  return function Body() {
    return (
      <>
        <Section id="theory" title="Build it up">
          {steps}
        </Section>
        <Section id="viz" title="Play">
          <p>Interactive.</p>
        </Section>
      </>
    );
  };
}

// 43 words: three of these push the average past 18 words per sentence.
const long =
  "This sentence keeps going on and on and on with far too many words for any beginner to follow, because it piles one idea on top of another idea and then another one without ever stopping to take a breath or a break.";

describe("simple-first gates", () => {
  it("pass a complete lesson", () => {
    expect(dataProblems(goodData)).toEqual([]);
    expect(bodyProblems(lesson(step(1, { check: "a" }), step(2, { check: "b" }), step(3, { check: "c" }), step(4)), goodData)).toEqual([]);
  });

  it("catch missing data", () => {
    const bad = lessonFixture({
      bigIdea: "Only one sentence.",
      checks: { a: checks.a },
      remember: { takeaways: ["One."] },
      keyTerms: [{ term: "Hole", def: "An empty state." }],
    });
    expect(dataProblems(bad)).toEqual([
      "the big idea has 1 sentences; it needs 2-4",
      "there are 1 quick checks; it needs at least 3",
      "there are 1 takeaways; it needs 3-5",
      'key term "Hole" has no plain definition',
    ]);
  });

  it("catch a correct choice that gives itself away by length", () => {
    const tell = lessonFixture({
      ...goodData,
      checks: { ...checks, c: { q: "Which?", choices: ["No", "Nope", "The long and carefully hedged right answer"], answer: 2, explain: "The long one is right." } },
    });
    expect(dataProblems(tell)).toContain('quick check "c": the correct choice is the single longest');
  });

  it("catch a step without a picture, a check used twice or never, and long sentences", () => {
    const problems = bodyProblems(
      lesson(step(1, { check: "a" }), step(2, { picture: false, check: "b", text: long }), step(3, { check: "a", text: long }), step(4, { text: long })),
      goodData,
    );
    expect(problems).toContain("step 2 has no picture");
    expect(problems).toContain('quick check "a" is used 2 times; it must be used exactly once');
    expect(problems).toContain('quick check "c" is used 0 times; it must be used exactly once');
    expect(problems.some((p) => p.startsWith("the simple text averages"))).toBe(true);
  });

  it("catch too much text before the first picture", () => {
    const wordy = Array.from({ length: 40 }, () => "Short words here now.").join(" ");
    const problems = bodyProblems(
      lesson(step(1, { picture: false, text: wordy, check: "a" }), step(2, { check: "b" }), step(3, { check: "c" }), step(4)),
      goodData,
    );
    expect(problems.some((p) => p.includes("before the first picture"))).toBe(true);
  });

  it("catch a term or a quick check the lesson does not define", () => {
    const problems = bodyProblems(
      lesson(
        step(1, { check: "a" }),
        step(2, { check: "b" }),
        step(3, { check: "c" }),
        step(4, { check: "zzz", text: <>A <Term t="Electron">thing</Term> here.</> }),
      ),
      goodData,
    );
    expect(problems).toContain('Term: no key term "Electron" in this lesson\'s data');
    expect(problems).toContain('QuickCheck: no check "zzz" in this lesson\'s data');
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/simple-first-gates.test.tsx`
Expected: FAIL, `./helpers/simple-first-gates` cannot be resolved.

- [ ] **Step 3: Write the gates**

Create `tests/helpers/simple-first-gates.ts`:

```ts
import { render } from "@testing-library/react";
import { createElement, type ComponentType } from "react";
import { vi } from "vitest";
import { LessonDataProvider } from "@/components/lesson";
import type { LessonData } from "@/lib/curriculum";
import { averageSentenceLength, countWords, splitSentences } from "@/lib/readability";
import { correctIsLongest } from "../quiz-length-tell";

/** Limits from docs/superpowers/specs/2026-10-22-simple-first-lessons-design.md, section 7. */
export const LIMITS = {
  bigIdeaSentences: [2, 4],
  steps: [4, 6],
  minChecks: 3,
  checkChoices: 3,
  takeaways: [3, 5],
  plainWords: 25,
  avgSentence: 18,
  wordsBeforePicture: 150,
  wordsBeforeViz: 600,
} as const;

/** Problems with a converted lesson's data, as sentences. Empty when the data is complete. */
export function dataProblems(data: LessonData): string[] {
  const problems: string[] = [];
  const sentences = splitSentences(data.bigIdea ?? "").length;
  if (sentences < LIMITS.bigIdeaSentences[0] || sentences > LIMITS.bigIdeaSentences[1]) {
    problems.push(`the big idea has ${sentences} sentences; it needs 2-4`);
  }
  const checks = Object.entries(data.checks ?? {});
  if (checks.length < LIMITS.minChecks) problems.push(`there are ${checks.length} quick checks; it needs at least ${LIMITS.minChecks}`);
  for (const [id, q] of checks) {
    if (q.choices.length !== LIMITS.checkChoices) problems.push(`quick check "${id}" has ${q.choices.length} choices; it needs ${LIMITS.checkChoices}`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.choices.length) problems.push(`quick check "${id}" has an answer index outside its choices`);
    if (q.explain.length <= 10) problems.push(`quick check "${id}" needs an explanation`);
    if (correctIsLongest(q)) problems.push(`quick check "${id}": the correct choice is the single longest`);
  }
  const takeaways = data.remember?.takeaways.length ?? 0;
  if (takeaways < LIMITS.takeaways[0] || takeaways > LIMITS.takeaways[1]) problems.push(`there are ${takeaways} takeaways; it needs 3-5`);
  for (const f of data.remember?.formulas ?? []) {
    if (f.parts.length === 0) problems.push(`formula "${f.expr}" explains none of its symbols`);
  }
  for (const k of data.keyTerms) {
    if (!k.plain) problems.push(`key term "${k.term}" has no plain definition`);
    else if (countWords(k.plain) > LIMITS.plainWords) {
      problems.push(`key term "${k.term}": the plain definition has ${countWords(k.plain)} words; the limit is ${LIMITS.plainWords}`);
    }
  }
  return problems;
}

/** An element's text with its text nodes joined by spaces, so paragraphs and inline terms do not run together. */
function spacedText(el: Element): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.textContent ?? "");
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Problems with a converted lesson's body, rendered inside its data provider. The caller runs cleanup(). */
export function bodyProblems(Body: ComponentType, data: LessonData): string[] {
  const problems: string[] = [];
  const error = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const message = String(args[0]);
    if (message.startsWith("QuickCheck:") || message.startsWith("Term:")) problems.push(message);
  });
  const { container } = (() => {
    try {
      return render(createElement(LessonDataProvider, { data }, createElement(Body)));
    } finally {
      error.mockRestore();
    }
  })();

  const steps = Array.from(container.querySelectorAll("[data-step]"));
  if (steps.length < LIMITS.steps[0] || steps.length > LIMITS.steps[1]) problems.push(`there are ${steps.length} steps; it needs 4-6`);
  steps.forEach((s, i) => {
    if (!s.querySelector("[data-picture] > *")) problems.push(`step ${i + 1} has no picture`);
  });

  const used = Array.from(container.querySelectorAll("[data-check-id]")).map((el) => el.getAttribute("data-check-id"));
  for (const id of Object.keys(data.checks ?? {})) {
    const n = used.filter((u) => u === id).length;
    if (n !== 1) problems.push(`quick check "${id}" is used ${n} times; it must be used exactly once`);
  }

  const bigIdeaWords = countWords(data.bigIdea ?? "");
  const simple = Array.from(container.querySelectorAll('[data-layer="simple"]'));
  const average = averageSentenceLength([data.bigIdea ?? "", ...simple.map(spacedText)]);
  if (average > LIMITS.avgSentence) {
    problems.push(`the simple text averages ${average.toFixed(1)} words per sentence; the limit is ${LIMITS.avgSentence}`);
  }

  let beforePicture = bigIdeaWords;
  for (const el of Array.from(container.querySelectorAll('[data-layer="simple"], [data-picture]'))) {
    if (el.hasAttribute("data-picture")) {
      if (el.firstElementChild) break; // the first real picture; an empty slot is reported above and read past
      continue;
    }
    beforePicture += countWords(spacedText(el));
  }
  if (beforePicture > LIMITS.wordsBeforePicture) {
    problems.push(`${beforePicture} words of simple text come before the first picture; the limit is ${LIMITS.wordsBeforePicture}`);
  }

  const viz = container.querySelector("#viz");
  if (!viz) {
    problems.push("the body has no #viz section");
  } else {
    const beforeViz =
      bigIdeaWords +
      simple
        .filter((el) => el.compareDocumentPosition(viz) & Node.DOCUMENT_POSITION_FOLLOWING)
        .reduce((n, el) => n + countWords(spacedText(el)), 0);
    if (beforeViz > LIMITS.wordsBeforeViz) {
      problems.push(`${beforeViz} words of simple text come before the interactive; the limit is ${LIMITS.wordsBeforeViz}`);
    }
  }
  return problems;
}
```

- [ ] **Step 4: Run the gate tests and watch them pass**

Run: `npx vitest run tests/simple-first-gates.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Apply the gates to every converted lesson, and render lessons inside the provider for the hydration test**

Create `tests/simple-first-lessons.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import type { ComponentType } from "react";
import { lessons } from "@/lib/curriculum";
import { lessonData } from "@/content/registry";
import { lessonBodies } from "@/content/bodies";
import { bodyProblems, dataProblems } from "./helpers/simple-first-gates";

afterEach(cleanup);

// A lesson counts as converted once its data has a big idea (spec 2026-10-22, section 6).
const converted = lessons.filter((l) => lessonData[l.slug].bigIdea);

describe("simple-first lessons", () => {
  it("every converted lesson has a body", () => {
    for (const l of converted) expect(lessonBodies[l.slug], l.slug).toBeDefined();
  });

  for (const l of converted) {
    it(`${l.slug}: the data is complete`, () => {
      expect(dataProblems(lessonData[l.slug])).toEqual([]);
    });

    it(`${l.slug}: steps, pictures, quick checks and readability pass`, async () => {
      const Body = (await lessonBodies[l.slug]()).default as ComponentType;
      expect(bodyProblems(Body, lessonData[l.slug])).toEqual([]);
    });
  }
});
```

Create `tests/helpers/lesson-text.ts`:

```ts
/**
 * Prose words in #theory, counted the way the content tests always have: text nodes joined with spaces, without the
 * h2 heading, figures and SVG labels. In a simple-first lesson only the "Go deeper" text counts (minus each fold-out's
 * summary line), because that is today's theory word for word; the simple layer has its own readability gate.
 */
export function theoryWords(container: HTMLElement): number {
  const theory = container.querySelector("#theory");
  if (!theory) return 0;
  const deeper = Array.from(theory.querySelectorAll("[data-deeper]"));
  const roots = deeper.length > 0 ? deeper : [theory];
  let total = 0;
  for (const root of roots) {
    const copy = root.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(deeper.length > 0 ? "h2, figure, svg, summary" : "h2, figure, svg").forEach((n) => n.remove());
    const parts: string[] = [];
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) parts.push(n.textContent ?? "");
    total += parts
      .join(" ")
      .split(/\s+/)
      .filter((w) => /[A-Za-z0-9]/.test(w)).length;
  }
  return total;
}
```

In `tests/hydration-stability.test.tsx`, add these imports under the existing ones:

```tsx
import { LessonDataProvider } from "@/components/lesson";
import { lessonData } from "@/content/registry";
```

and replace:

```tsx
    it(lesson.slug, async () => {
      const Body = (await lessonBodies[lesson.slug]()).default as ComponentType;
      renderTwice(lesson.slug, Body);
    });
```

with:

```tsx
    it(lesson.slug, async () => {
      const Body = (await lessonBodies[lesson.slug]()).default as ComponentType;
      const data = lessonData[lesson.slug];
      renderTwice(lesson.slug, () => createElement(LessonDataProvider, { data }, createElement(Body)));
    });
```

- [ ] **Step 6: Add the Go deeper check script**

Create `scripts/check-go-deeper.mts`:

```ts
// Checks that converting a lesson to simple-first kept every sentence of its old theory section.
// Usage: node scripts/check-go-deeper.mts <slug> [git-ref]    (default ref: origin/main)
// Exit codes: 0 nothing missing, 1 sentences missing (listed), 2 bad arguments or no theory section.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lessons } from "../src/lib/curriculum.ts";
import { missingSentences } from "../src/lib/readability.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [slug, ref = "origin/main"] = process.argv.slice(2);
const meta = lessons.find((l) => l.slug === slug);
if (!meta) {
  console.error(`Unknown lesson "${slug ?? ""}". Usage: node scripts/check-go-deeper.mts <slug> [git-ref]`);
  process.exit(2);
}

const file = `src/content/${meta.track}/${meta.slug}.tsx`;
const before = execFileSync("git", ["show", `${ref}:${file}`], { cwd: root, encoding: "utf8" });
if (!before.includes('id="theory"')) {
  console.error(`${ref}:${file} has no theory section`);
  process.exit(2);
}
const missing = missingSentences(before, readFileSync(join(root, file), "utf8"));
if (missing.length === 0) {
  console.log(`${slug}: every sentence of the old theory section is still in the lesson.`);
} else {
  console.log(`${slug}: ${missing.length} sentence(s) from ${ref} are missing or changed:`);
  for (const s of missing) console.log(`  - ${s}`);
  process.exit(1);
}
```

In `package.json`, add this line to `scripts` after `"gen:registry"`:

```json
    "check:deeper": "node scripts/check-go-deeper.mts"
```

(Add a comma after the `"gen:registry"` line.)

- [ ] **Step 7: Run the affected suites**

Run: `npx vitest run tests/simple-first-gates.test.tsx tests/simple-first-lessons.test.tsx tests/hydration-stability.test.tsx`
Expected: PASS. `simple-first-lessons` runs only "every converted lesson has a body", because no lesson is converted
yet; the hydration test still passes for all 38 lessons.

Run: `npm run check:deeper -- atoms-to-bands`
Expected: `atoms-to-bands: every sentence of the old theory section is still in the lesson.` (nothing has changed yet).

- [ ] **Step 8: Commit**

```bash
git add tests/helpers/simple-first-gates.ts tests/helpers/lesson-text.ts tests/simple-first-gates.test.tsx tests/simple-first-lessons.test.tsx tests/hydration-stability.test.tsx scripts/check-go-deeper.mts package.json
git commit -m "Gate converted lessons on steps, pictures, quick checks and readability" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Day 1 pictures

**Files:**
- Create: `src/components/viz/semiconductors/AtomsToBandsPictures.tsx` (the band-structure figure moves here from
  `src/content/semiconductors/atoms-to-bands.tsx` unchanged, plus four new pictures)
- Test: `tests/content/atoms-to-bands-pictures.test.tsx`

**Interfaces:**
- Consumes: `SvgCanvas`, `Label`, `Arrow`, `vizColors` from `src/components/viz/shared`.
- Produces: `BandStructuresFigure`, `SharedBondsPicture`, `CarParkPicture`, `DoublingLadderPicture`,
  `DriftLayerPicture`, each a component without props returning one labelled SVG (`role="img"`). Every coordinate
  is an integer or a fixed decimal, so the markup is hydration-safe.

- [ ] **Step 1: Write the failing test**

Create `tests/content/atoms-to-bands-pictures.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ComponentType } from "react";
import {
  BandStructuresFigure,
  CarParkPicture,
  DoublingLadderPicture,
  DriftLayerPicture,
  SharedBondsPicture,
} from "@/components/viz/semiconductors/AtomsToBandsPictures";

afterEach(cleanup);

const pictures: Array<[string, ComponentType, RegExp]> = [
  ["shared bonds", SharedBondsPicture, /four neighbours/],
  ["car park", CarParkPicture, /two-storey car park/],
  ["band structures", BandStructuresFigure, /metal, a semiconductor and an insulator/],
  ["doubling ladder", DoublingLadderPicture, /double each step/],
  ["drift layers", DriftLayerPicture, /ten times thinner/],
];

describe("atoms-to-bands pictures", () => {
  it.each(pictures)("%s is a labelled SVG", (_, Picture, name) => {
    render(<Picture />);
    expect(screen.getByRole("img", { name })).toBeTruthy();
  });

  it("draws nine atoms, and every bond carries two electrons", () => {
    const { container } = render(<SharedBondsPicture />);
    expect(container.querySelectorAll("text")).toHaveLength(9);
    // 3 rows of 4 horizontal bonds (two inner, two cut at the edges) and 3 columns of 4 vertical ones
    expect(container.querySelectorAll("line")).toHaveLength(24);
    expect(container.querySelectorAll("circle")).toHaveLength(9 + 24 * 2);
  });

  it("shows the packed floor with one empty space and the 1.12 eV climb", () => {
    const { container } = render(<CarParkPicture />);
    expect(container.querySelectorAll("rect[stroke-dasharray]")).toHaveLength(1);
    expect(screen.getByText("Climb = band gap")).toBeTruthy();
    expect(screen.getByText("1.12 eV in silicon")).toBeTruthy();
  });

  it("doubles the bar at every 10 °C step", () => {
    render(<DoublingLadderPicture />);
    for (const factor of ["×1", "×2", "×4", "×8", "×16"]) expect(screen.getByText(factor)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run tests/content/atoms-to-bands-pictures.test.tsx`
Expected: FAIL, the module cannot be resolved.

- [ ] **Step 3: Draw the pictures**

Create `src/components/viz/semiconductors/AtomsToBandsPictures.tsx`. The first part is `PANEL_W`, `EnergyAxis`, `Dots`
and `BandStructuresFigure` moved unchanged from `src/content/semiconductors/atoms-to-bands.tsx` (now exported); the
rest is new:

```tsx
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";

const PANEL_W = 190;

function EnergyAxis({ x }: { x: number }) {
  return (
    <g>
      <line x1={x} y1={214} x2={x} y2={44} stroke={vizColors.muted} strokeWidth={1.2} />
      <polygon points={`${x},36 ${x - 4},45 ${x + 4},45`} fill={vizColors.muted} />
      <Label x={x - 9} y={128} size={9} color={vizColors.muted} rotate={-90}>
        Energy
      </Label>
    </g>
  );
}

function Dots({ x0, x1, y, color, n }: { x0: number; x1: number; y: number; color: string; n: number }) {
  const step = (x1 - x0) / (n - 1);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={x0 + i * step} cy={y} r={3} fill={color} />
      ))}
    </g>
  );
}

/** Static figure: metal, semiconductor and insulator band structures side by side. */
export function BandStructuresFigure() {
  const metalX = 10;
  const semiX = metalX + PANEL_W + 5;
  const insX = semiX + PANEL_W + 5;
  return (
    <SvgCanvas viewBox="0 0 590 270" title="Band diagrams of a metal, a semiconductor and an insulator">
      <rect x={0} y={0} width={590} height={270} fill={vizColors.bg} rx={8} />

      {/* Metal: overlapping, partly filled bands */}
      <g>
        <Label x={metalX + PANEL_W / 2} y={18} size={13} bold>
          Metal (copper)
        </Label>
        <EnergyAxis x={metalX + 22} />
        <rect x={metalX + 40} y={112} width={86} height={100} fill={vizColors.blue} fillOpacity={0.15} stroke={vizColors.blue} rx={3} />
        <rect x={metalX + 92} y={52} width={86} height={100} fill={vizColors.cyan} fillOpacity={0.1} stroke={vizColors.cyan} rx={3} />
        <rect x={metalX + 40} y={132} width={86} height={80} fill={vizColors.electron} fillOpacity={0.35} />
        <rect x={metalX + 92} y={132} width={86} height={20} fill={vizColors.electron} fillOpacity={0.35} />
        <line x1={metalX + 34} y1={132} x2={metalX + 184} y2={132} stroke={vizColors.amber} strokeDasharray="5 4" strokeWidth={1.5} />
        <Label x={metalX + 150} y={124} size={10} color={vizColors.amber}>
          E_F
        </Label>
        <Label x={metalX + PANEL_W / 2 + 6} y={234} size={10} color={vizColors.text}>
          Bands overlap, partly filled
        </Label>
        <Label x={metalX + PANEL_W / 2 + 6} y={250} size={10} color={vizColors.muted}>
          8.5 × 10²² free electrons/cm³
        </Label>
      </g>

      {/* Semiconductor: 1.12 eV gap, a few excited carriers */}
      <g>
        <Label x={semiX + PANEL_W / 2} y={18} size={13} bold>
          Semiconductor (Si)
        </Label>
        <EnergyAxis x={semiX + 22} />
        <rect x={semiX + 40} y={52} width={140} height={56} fill={vizColors.cyan} fillOpacity={0.1} stroke={vizColors.cyan} rx={3} />
        <rect x={semiX + 40} y={156} width={140} height={56} fill={vizColors.blue} fillOpacity={0.15} stroke={vizColors.blue} rx={3} />
        <Dots x0={semiX + 50} x1={semiX + 170} y={170} color={vizColors.electron} n={11} />
        <Dots x0={semiX + 50} x1={semiX + 170} y={186} color={vizColors.electron} n={11} />
        <Dots x0={semiX + 50} x1={semiX + 170} y={202} color={vizColors.electron} n={11} />
        {/* two excited electrons and their holes */}
        <circle cx={semiX + 74} cy={92} r={3.4} fill={vizColors.electron} />
        <circle cx={semiX + 146} cy={82} r={3.4} fill={vizColors.electron} />
        <circle cx={semiX + 74} cy={170} r={4.2} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={1.8} />
        <circle cx={semiX + 146} cy={170} r={4.2} fill={vizColors.bg} stroke={vizColors.hole} strokeWidth={1.8} />
        <Arrow x1={semiX + 74} y1={163} x2={semiX + 74} y2={100} color={vizColors.electron} width={1.2} head={6} dashed />
        <line x1={semiX + 112} y1={110} x2={semiX + 112} y2={154} stroke={vizColors.violet} strokeWidth={1.2} />
        <Label x={semiX + 118} y={132} anchor="start" size={11} color={vizColors.violet} bold>
          Eg = 1.12 eV
        </Label>
        <Label x={semiX + PANEL_W / 2 + 6} y={234} size={10} color={vizColors.text}>
          Small gap: heat frees a few carriers
        </Label>
        <Label x={semiX + PANEL_W / 2 + 6} y={250} size={10} color={vizColors.muted}>
          n_i ≈ 1 × 10¹⁰ cm⁻³ at 300 K
        </Label>
      </g>

      {/* Insulator: ~9 eV gap, nothing crosses */}
      <g>
        <Label x={insX + PANEL_W / 2} y={18} size={13} bold>
          Insulator (SiO₂)
        </Label>
        <EnergyAxis x={insX + 22} />
        <rect x={insX + 40} y={40} width={140} height={34} fill={vizColors.cyan} fillOpacity={0.1} stroke={vizColors.cyan} rx={3} />
        <rect x={insX + 40} y={178} width={140} height={34} fill={vizColors.blue} fillOpacity={0.15} stroke={vizColors.blue} rx={3} />
        <Dots x0={insX + 50} x1={insX + 170} y={189} color={vizColors.electron} n={11} />
        <Dots x0={insX + 50} x1={insX + 170} y={203} color={vizColors.electron} n={11} />
        <line x1={insX + 112} y1={76} x2={insX + 112} y2={176} stroke={vizColors.violet} strokeWidth={1.2} />
        <Label x={insX + 118} y={126} anchor="start" size={11} color={vizColors.violet} bold>
          Eg ≈ 9 eV
        </Label>
        <Label x={insX + PANEL_W / 2 + 6} y={234} size={10} color={vizColors.text}>
          Huge gap: nothing gets across
        </Label>
        <Label x={insX + PANEL_W / 2 + 6} y={250} size={10} color={vizColors.muted}>
          kT = 0.026 eV is hopeless
        </Label>
      </g>
    </SvgCanvas>
  );
}

const ATOM_X = [100, 190, 280];
const ATOM_Y = [60, 140, 220];
const ATOM_R = 20;

/** Two electron dots side by side across a bond, the shared pair that makes the bond. */
function ElectronPair({ x, y, vertical }: { x: number; y: number; vertical: boolean }) {
  return (
    <g fill={vizColors.electron}>
      <circle cx={vertical ? x - 5 : x} cy={vertical ? y : y - 5} r={3.5} />
      <circle cx={vertical ? x + 5 : x} cy={vertical ? y : y + 5} r={3.5} />
    </g>
  );
}

/** Step 1: nine silicon atoms drawn flat, each bonded to four neighbours by a shared pair of electrons. */
export function SharedBondsPicture() {
  const bonds: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (const y of ATOM_Y) {
    bonds.push({ x1: 52, y1: y, x2: ATOM_X[0] - ATOM_R, y2: y });
    for (let c = 0; c < ATOM_X.length - 1; c++) bonds.push({ x1: ATOM_X[c] + ATOM_R, y1: y, x2: ATOM_X[c + 1] - ATOM_R, y2: y });
    bonds.push({ x1: ATOM_X[2] + ATOM_R, y1: y, x2: 328, y2: y });
  }
  for (const x of ATOM_X) {
    bonds.push({ x1: x, y1: 12, x2: x, y2: ATOM_Y[0] - ATOM_R });
    for (let r = 0; r < ATOM_Y.length - 1; r++) bonds.push({ x1: x, y1: ATOM_Y[r] + ATOM_R, x2: x, y2: ATOM_Y[r + 1] - ATOM_R });
    bonds.push({ x1: x, y1: ATOM_Y[2] + ATOM_R, x2: x, y2: 268 });
  }
  return (
    <SvgCanvas
      viewBox="0 0 380 280"
      className="mx-auto max-w-[380px]"
      title="Nine silicon atoms drawn flat, each joined to four neighbours by bonds of two shared electrons"
    >
      {bonds.map((b, i) => (
        <g key={i}>
          <line x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke={vizColors.muted} strokeWidth={2} strokeLinecap="round" />
          <ElectronPair x={(b.x1 + b.x2) / 2} y={(b.y1 + b.y2) / 2} vertical={b.x1 === b.x2} />
        </g>
      ))}
      {ATOM_Y.flatMap((y) =>
        ATOM_X.map((x) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={ATOM_R} fill={vizColors.bg} stroke={vizColors.violet} strokeWidth={2} />
            <Label x={x} y={y} size={12} bold color={vizColors.violet}>
              Si
            </Label>
          </g>
        )),
      )}
    </SvgCanvas>
  );
}

const CAR_W = 26;
const CAR_H = 16;
const SLOT_X = Array.from({ length: 10 }, (_, i) => 30 + i * 32);
const JUMPED = 8;

/** Step 2: the band picture as a two-storey car park. Cars are electrons; the climb between floors is the band gap. */
export function CarParkPicture() {
  const holeX = SLOT_X[JUMPED];
  const mid = holeX + CAR_W / 2;
  return (
    <SvgCanvas
      viewBox="0 0 530 300"
      title="A two-storey car park: a packed lower floor, one car lifted to the empty upper floor, and the empty space it left behind"
    >
      {/* upper floor: the conduction band */}
      <rect x={20} y={30} width={340} height={80} rx={10} fill={vizColors.cyan} fillOpacity={0.08} stroke={vizColors.cyan} strokeWidth={1.5} />
      <Label x={36} y={54} anchor="start" size={13} bold>
        Upper floor = conduction band
      </Label>
      <Label x={36} y={74} anchor="start" size={11} color={vizColors.muted}>
        Empty, so a car up here can drive
      </Label>
      <rect x={holeX} y={82} width={CAR_W} height={CAR_H} rx={4} fill={vizColors.electron} />
      <Arrow x1={mid + 18} y1={90} x2={mid + 50} y2={90} color={vizColors.electron} width={2} head={7} />

      {/* lower floor: the valence band, with one empty space */}
      <rect x={20} y={170} width={340} height={90} rx={10} fill={vizColors.blue} fillOpacity={0.12} stroke={vizColors.blue} strokeWidth={1.5} />
      <Label x={36} y={194} anchor="start" size={13} bold>
        Lower floor = valence band
      </Label>
      <Label x={36} y={214} anchor="start" size={11} color={vizColors.muted}>
        Packed, so no car can move
      </Label>
      {SLOT_X.map((x, i) =>
        i === JUMPED ? (
          <rect key={x} x={x} y={230} width={CAR_W} height={CAR_H} rx={4} fill="none" stroke={vizColors.hole} strokeWidth={1.5} strokeDasharray="4 3" />
        ) : (
          <rect key={x} x={x} y={230} width={CAR_W} height={CAR_H} rx={4} fill={vizColors.electron} fillOpacity={0.85} />
        ),
      )}

      {/* the jump */}
      <Arrow x1={mid} y1={226} x2={mid} y2={102} color={vizColors.amber} width={2} head={8} dashed />
      <Label x={mid - 12} y={144} anchor="end" size={11} color={vizColors.amber}>
        Heat lifts one car up
      </Label>

      {/* the climb between the floors is the band gap */}
      <line x1={368} y1={110} x2={392} y2={110} stroke={vizColors.muted} />
      <line x1={368} y1={170} x2={392} y2={170} stroke={vizColors.muted} />
      <Arrow x1={380} y1={140} x2={380} y2={113} color={vizColors.violet} width={1.5} head={6} />
      <Arrow x1={380} y1={140} x2={380} y2={167} color={vizColors.violet} width={1.5} head={6} />
      <Label x={398} y={133} anchor="start" size={12} bold color={vizColors.violet}>
        Climb = band gap
      </Label>
      <Label x={398} y={150} anchor="start" size={11} mono color={vizColors.violet}>
        1.12 eV in silicon
      </Label>

      <Label x={mid} y={284} size={11} color={vizColors.hole}>
        Empty space = a hole. Cars shuffle into it, so it moves too.
      </Label>
    </SvgCanvas>
  );
}

const LADDER_C = [25, 35, 45, 55, 65];
const LADDER_OPACITY = [0.35, 0.5, 0.65, 0.8, 0.95];

/** Step 4: free electrons in pure silicon roughly double for every 10 °C near room temperature. */
export function DoublingLadderPicture() {
  return (
    <SvgCanvas
      viewBox="0 0 480 250"
      className="mx-auto max-w-[480px]"
      title="Bars for 25, 35, 45, 55 and 65 °C that double each step: 1, 2, 4, 8 and 16 times as many free electrons"
    >
      <Label x={240} y={20} size={12} color={vizColors.muted}>
        Free electrons in pure silicon, compared with 25 °C
      </Label>
      <line x1={40} y1={210} x2={450} y2={210} stroke={vizColors.muted} />
      {LADDER_C.map((c, i) => {
        const factor = 2 ** i;
        const h = factor * 10;
        const x = 50 + i * 84;
        return (
          <g key={c}>
            <rect x={x} y={210 - h} width={56} height={h} rx={4} fill={vizColors.orange} fillOpacity={LADDER_OPACITY[i]} />
            <Label x={x + 28} y={200 - h} size={12} bold mono color={vizColors.orange}>
              ×{factor}
            </Label>
            <Label x={x + 28} y={228} size={11} mono>
              {c} °C
            </Label>
          </g>
        );
      })}
    </SvgCanvas>
  );
}

/** Step 5: the layer that blocks 1200 V, in silicon and in silicon carbide, drawn ten to one. */
export function DriftLayerPicture() {
  return (
    <SvgCanvas
      viewBox="0 0 480 250"
      className="mx-auto max-w-[480px]"
      title="Cross-sections of a 1200 volt silicon part and a silicon carbide part: the silicon carbide blocking layer is about ten times thinner"
    >
      <Label x={140} y={22} size={13} bold>
        Silicon
      </Label>
      <Label x={350} y={22} size={13} bold>
        Silicon carbide (4H-SiC)
      </Label>

      <rect x={70} y={40} width={140} height={8} fill={vizColors.muted} />
      <rect x={70} y={48} width={140} height={150} fill={vizColors.blue} fillOpacity={0.25} stroke={vizColors.blue} />
      <Label x={140} y={115} size={11}>
        layer that blocks 1200 V
      </Label>
      <Label x={140} y={132} size={11} color={vizColors.muted}>
        thick and lightly doped
      </Label>
      <rect x={70} y={198} width={140} height={24} fill={vizColors.grid} />
      <Label x={140} y={210} size={10} color={vizColors.muted}>
        substrate
      </Label>

      <Label x={350} y={146} size={11}>
        same 1200 V, about 10× thinner
      </Label>
      <Label x={350} y={162} size={11} color={vizColors.muted}>
        and far more heavily doped
      </Label>
      <rect x={280} y={175} width={140} height={8} fill={vizColors.muted} />
      <rect x={280} y={183} width={140} height={15} fill={vizColors.violet} fillOpacity={0.35} stroke={vizColors.violet} />
      <rect x={280} y={198} width={140} height={24} fill={vizColors.grid} />
      <Label x={350} y={210} size={10} color={vizColors.muted}>
        substrate
      </Label>

      <Label x={240} y={240} size={10} color={vizColors.muted}>
        Blocking layers drawn ten to one
      </Label>
    </SvgCanvas>
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run tests/content/atoms-to-bands-pictures.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/viz/semiconductors/AtomsToBandsPictures.tsx tests/content/atoms-to-bands-pictures.test.tsx
git commit -m "Draw the Day 1 pictures: shared bonds, the car park, the doubling ladder and the drift layers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Convert Day 1 (`atoms-to-bands`)

The body and data change together: once the data has a `bigIdea`, the gates in `tests/simple-first-lessons.test.tsx`
start checking the body.

**Files:**
- Modify: `src/content/semiconductors/atoms-to-bands.tsx` (whole file)
- Modify: `src/content/semiconductors/atoms-to-bands.data.ts` (add `bigIdea`, `plain`, `checks`, `remember`)
- Modify: `tests/content/semis-a.test.tsx` (render inside the provider, shared `theoryWords`)

**Interfaces:**
- Consumes: Tasks 3-8 and 13.
- Produces: the first converted lesson. Its check ids are `full-band` (step 2), `warm-glass` (step 3) and `doubling`
  (step 4).

- [ ] **Step 1: Point the semiconductors content test at the provider and the shared word count**

In `tests/content/semis-a.test.tsx`:

1. Add under the existing imports:

```tsx
import { LessonDataProvider } from "@/components/lesson";
import { theoryWords } from "../helpers/lesson-text";
```

2. Delete the local `theoryWords` function (the block that starts with the comment
   `/** Prose words in #theory: text nodes joined with spaces, without the heading, figures and SVG labels. */` and ends
   with `.filter((w) => /[A-Za-z0-9]/.test(w)).length;\n}`).

3. Replace each of the four occurrences of:

```tsx
    const { container } = render(<Lesson />);
```

inside `describe.each(lessons)` with:

```tsx
    const { container } = render(
      <LessonDataProvider data={data}>
        <Lesson />
      </LessonDataProvider>,
    );
```

Run: `npx vitest run tests/content/semis-a.test.tsx`
Expected: PASS (nothing is converted yet, so the shared helper counts the whole theory section exactly as before).

- [ ] **Step 2: Add the simple-first data**

In `src/content/semiconductors/atoms-to-bands.data.ts`:

1. Replace `const data: LessonData = {` with:

```ts
const data: LessonData = {
  bigIdea:
    "Pure silicon conducts only when some of its electrons gain enough energy to jump a small step, called the band gap. Heat or light can supply that energy. Copper needs no jump, and glass needs a huge one. Silicon sits in between, so we can control how well it conducts.",
```

2. Replace the whole `keyTerms: [ ... ],` array with this one: the `term` and `def` strings are unchanged, and each term
   gains `plain`:

```ts
  keyTerms: [
    {
      term: "Valence band",
      def: "The highest band that is completely full at 0 K. In silicon it holds the four bonding electrons of every atom, and a full band carries no net current.",
      plain: "The lower band of energies, holding the electrons that form bonds. In pure, cold silicon it is completely full.",
    },
    {
      term: "Conduction band",
      def: "The lowest band above the valence band, empty at 0 K. An electron promoted into it is free to move through the crystal and carry current.",
      plain: "The upper band of energies. An electron that reaches it can move through the whole crystal and carry current.",
    },
    {
      term: "Band gap (Eg)",
      def: "The forbidden energy range between the valence and conduction bands: 1.12 eV for Si, 0.66 eV for Ge, 1.42 eV for GaAs, 3.26 eV for 4H-SiC, 3.4 eV for GaN and about 9 eV for SiO₂.",
      plain: "The energy an electron needs to jump from the full band to the empty one. For silicon it is 1.12 eV.",
    },
    {
      term: "Intrinsic carrier density (n_i)",
      def: "Free electrons (and an equal number of holes) per cm³ in pure material from heat alone: about 1 × 10¹⁰ cm⁻³ in silicon at 300 K, roughly doubling every 10 °C.",
      plain: "How many free electrons pure material has from heat alone. In silicon it roughly doubles every 10 °C.",
    },
    {
      term: "Hole",
      def: "The empty state an excited electron leaves in the valence band. Neighbouring electrons shuffle into it, so it moves like a positive carrier with charge +q.",
      plain: "The empty spot an electron leaves when it jumps up. Neighbouring electrons fill it in turn, so it moves like a positive charge.",
    },
    {
      term: "Thermal energy (kT)",
      def: "Boltzmann's constant times absolute temperature: 25.9 meV at 300 K. Carrier density depends on exp(−Eg/2kT), so a small change in Eg/kT moves n_i by orders of magnitude.",
      plain: "The typical energy heat gives each electron. At room temperature it is far smaller than silicon's band gap.",
    },
    {
      term: "Diamond cubic lattice",
      def: "The crystal structure of Si, Ge and diamond: every atom bonds to four neighbours at 109.5°. Silicon's cube is 0.543 nm on a side, giving 5 × 10²² atoms per cm³.",
      plain: "The crystal pattern of silicon: every atom bonds to four neighbours, repeated in three dimensions.",
    },
    {
      term: "Wide-bandgap semiconductor",
      def: "A semiconductor with a gap well above silicon's, such as 4H-SiC (3.26 eV) or GaN (3.4 eV). It leaks far less when hot and withstands about ten times the electric field of silicon.",
      plain: "A material with a much bigger band gap than silicon, such as silicon carbide or gallium nitride. It leaks less when hot.",
    },
  ],
```

3. Replace the last lines of the file:

```ts
  ],
};

export default data;
```

(the end of the `quiz` array and of `data`) with:

```ts
  ],
  checks: {
    "full-band": {
      q: "Why can't a completely full band carry current?",
      choices: [
        "Every spot is taken, so no electron has anywhere to move to",
        "Its electrons are held too tightly to move in any direction",
        "The band gap blocks its electrons from reaching the wires",
      ],
      answer: 0,
      explain:
        "Current needs empty spots for electrons to move into, and a full band has none. Free one electron and two things can move: the electron in the empty band and the hole it left behind.",
    },
    "warm-glass": {
      q: "Why does glass stay an insulator even when it is warm?",
      choices: [
        "Its band gap is so wide that heat almost never lifts an electron across",
        "It has no electrons at all, so nothing is there to carry a current",
        "Its two bands overlap, so its electrons keep getting in each other's way",
      ],
      answer: 0,
      explain:
        "Glass is full of electrons, but its band gap is about 9 eV, far more than the energy heat gives at room temperature. Overlapping bands are what make copper a conductor.",
    },
    doubling: {
      q: "Silicon's free electrons roughly double for every 10 °C. About how many times more does it have at 45 °C than at 25 °C?",
      choices: ["About 2 times as many", "About 4 times as many", "About 20 times as many"],
      answer: 1,
      explain: "45 °C is 20 °C warmer: two doublings, so 2 × 2 = 4 times as many. From 25 °C to 125 °C is ten doublings, about 1000 times as many.",
    },
  },
  remember: {
    takeaways: [
      "A full band carries no current: electrons need an empty spot to move into.",
      "Every electron that jumps the band gap makes two carriers: a free electron and a hole.",
      "The size of the gap decides the material: copper has none, silicon 1.12 eV, glass about 9 eV.",
      "Near room temperature, silicon's free electrons and its leakage roughly double every 10 °C.",
      "Wide-gap materials such as silicon carbide leak less when hot, so 800 V cars use them.",
    ],
    formulas: [
      {
        expr: "n_i ∝ T^1.5 · exp(−Eg / 2kT)",
        parts: [
          { symbol: "n_i", meaning: "free electrons per cm³ in pure material, from heat alone" },
          { symbol: "∝", meaning: "is proportional to: n_i rises and falls with the right-hand side" },
          { symbol: "T", meaning: "absolute temperature, in kelvin (300 K is room temperature)" },
          { symbol: "exp(x)", meaning: "e raised to the power x" },
          { symbol: "Eg", meaning: "the band gap, in eV (1.12 eV for silicon)" },
          { symbol: "k", meaning: "Boltzmann's constant, 8.617 × 10⁻⁵ eV/K" },
        ],
      },
    ],
  },
};

export default data;
```

- [ ] **Step 3: Run the gates and watch them fail on the old body**

Run: `npx vitest run tests/simple-first-lessons.test.tsx`
Expected: "atoms-to-bands: the data is complete" PASSES; "atoms-to-bands: steps, pictures, quick checks and readability
pass" FAILS with problems including `there are 0 steps; it needs 4-6` and
`quick check "full-band" is used 0 times; it must be used exactly once`.

- [ ] **Step 4: Rewrite the lesson body**

Replace the whole of `src/content/semiconductors/atoms-to-bands.tsx` with the file below. Every word of the old theory
section is kept inside the `deeper` fold-outs (its `h3` subheadings become `h4`); the figure moves into step 3 with its
caption unchanged.

```tsx
"use client";

import {
  Callout,
  CodeBlock,
  ConceptStep,
  Exercise,
  Figure,
  GoDeeper,
  KeyNumber,
  Picture,
  Prose,
  Section,
  Term,
  TryThis,
} from "@/components/lesson";
import { BandDiagram } from "@/components/viz/semiconductors/BandDiagram";
import {
  BandStructuresFigure,
  CarParkPicture,
  DoublingLadderPicture,
  DriftLayerPicture,
  SharedBondsPicture,
} from "@/components/viz/semiconductors/AtomsToBandsPictures";

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Build it up: why silicon sits between copper and glass">
        <ConceptStep
          n={1}
          title="Silicon atoms share their outer electrons"
          picture={
            <Figure caption="Silicon atoms drawn flat. Each line is a bond: two shared electrons, the small dots, holding neighbours together. The real crystal repeats this pattern in three dimensions.">
              <SharedBondsPicture />
            </Figure>
          }
          deeper={
            <Prose>
              <p>
                Silicon has atomic number 14. Ten of its electrons sit in tightly bound inner shells and four sit in the outer,
                or valence, shell. Like carbon and germanium in the same column of the periodic table, each silicon atom shares
                those four electrons with four neighbours, forming covalent bonds at 109.5° to one another. Repeat that in three
                dimensions and you get the <strong>diamond cubic lattice</strong>: a cube 0.543 nm on a side, 5 × 10²² atoms
                per cm³, and every bond holding exactly two electrons. At absolute zero every valence electron is locked into a
                bond, and pure silicon is a perfect insulator.
              </p>
            </Prose>
          }
        >
          <p>
            Each silicon atom has four outer electrons, and it shares each one with a neighbour. Each shared pair of electrons
            is a bond, so every atom is bonded to four others. Repeated in three dimensions, this pattern makes a crystal called
            the <Term t="Diamond cubic lattice">diamond cubic lattice</Term>.
          </p>
          <p>
            At absolute zero, the coldest possible temperature, every outer electron is stuck in a bond. Then pure silicon
            carries no current at all.
          </p>
        </ConceptStep>

        <ConceptStep
          n={2}
          title="Electrons need an empty spot to move into"
          picture={
            <Picture
              title="a two-storey car park"
              breaks="Electrons are not cars in fixed spaces. The picture only shows why a full band carries no current, and why each jump makes two movers: the freed electron and the hole, which acts like a positive charge."
            >
              <CarParkPicture />
            </Picture>
          }
          keyNumber={
            <KeyNumber value="1.12 eV">silicon&apos;s band gap: the energy an electron needs to jump from the full band to the empty one</KeyNumber>
          }
          deeper={
            <Prose>
              <h4>From energy levels to energy bands</h4>
              <p>
                An isolated atom has sharp, discrete energy levels. Bring two atoms together and each level splits in two,
                because the Pauli exclusion principle forbids two electrons from sharing one state. A sugar-cube-sized crystal
                holds about 10²² atoms, so each level splits into that many sublevels, packed so closely that they form a
                continuous <strong>band</strong>. In silicon the outer 3s and 3p levels mix and split into two bands with a
                forbidden range of energy between them:
              </p>
              <ul>
                <li>
                  <strong>Valence band:</strong> the bonding states. With four electrons per atom it is exactly full at 0 K.
                </li>
                <li>
                  <strong>Conduction band:</strong> the antibonding states, empty at 0 K. An electron promoted here can roam
                  the whole crystal.
                </li>
                <li>
                  <strong>Band gap (Eg):</strong> the energy from the top of the valence band to the bottom of the conduction
                  band, 1.12 eV for silicon at 300 K.
                </li>
              </ul>
              <p>
                A completely full band cannot carry a net current: for every electron moving one way another moves the other
                way, and there are no empty states to shift into. Conduction needs a partly filled band. When an electron
                jumps the gap it becomes free in the conduction band and leaves an empty state, a <strong>hole</strong>,
                behind in the valence band, and the hole lets that band conduct as well. Every thermal jump therefore creates
                two carriers.
              </p>
            </Prose>
          }
          check="full-band"
        >
          <p>
            In a crystal, the outer electrons can only have energies inside two ranges, called bands. At absolute zero the
            lower one, the <Term t="Valence band">valence band</Term>, is full and the upper one, the{" "}
            <Term t="Conduction band">conduction band</Term>, is empty.
          </p>
          <p>
            A full band can&apos;t carry current, because no electron has an empty spot to move into. An electron that jumps up
            to the empty band can move freely. The empty spot it leaves behind, a <Term t="Hole">hole</Term>, lets the lower
            band conduct too.
          </p>
        </ConceptStep>

        <ConceptStep
          n={3}
          title="Why copper conducts, glass doesn't, and silicon sits between"
          picture={
            <Figure caption="Metal, semiconductor and insulator band structures. The gaps are not drawn to the same scale: SiO₂'s 9 eV gap is eight times silicon's.">
              <BandStructuresFigure />
            </Figure>
          }
          keyNumber={<KeyNumber value="about 9 eV">the band gap of glass (silicon dioxide), eight times silicon&apos;s</KeyNumber>}
          deeper={
            <Prose>
              <h4>Metals, semiconductors and insulators</h4>
              <p>
                In copper the bands overlap and the highest occupied band is only partly filled, so about 8.5 × 10²² free
                electrons per cm³ conduct at any temperature, giving a resistivity of 1.7 µΩ·cm. In SiO₂ the gap is about
                9 eV, and the thermal energy at room temperature, kT = 25.9 meV, is hopeless against it. Semiconductors sit in
                between with gaps of roughly 0.5 to 3.5 eV: small enough that heat, light or impurity atoms can put carriers
                into the conduction band in a controlled way.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Eg at 300 K</th>
                    <th>Where you meet it</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Germanium (Ge)</td>
                    <td>0.66 eV</td>
                    <td>The first transistors (Bell Labs, 1947), infrared detectors, SiGe in RF chips</td>
                  </tr>
                  <tr>
                    <td>Silicon (Si)</td>
                    <td>1.12 eV</td>
                    <td>More than 90% of all chips, solar cells, power MOSFETs and IGBTs</td>
                  </tr>
                  <tr>
                    <td>Gallium arsenide (GaAs)</td>
                    <td>1.42 eV, direct</td>
                    <td>Phone RF power amplifiers, laser diodes, space solar cells</td>
                  </tr>
                  <tr>
                    <td>Silicon carbide (4H-SiC)</td>
                    <td>3.26 eV</td>
                    <td>1200 V MOSFETs in EV traction inverters and fast chargers</td>
                  </tr>
                  <tr>
                    <td>Gallium nitride (GaN)</td>
                    <td>3.4 eV, direct</td>
                    <td>Blue and white LEDs, 65 W USB-C chargers, 5G radio amplifiers</td>
                  </tr>
                  <tr>
                    <td>Silicon dioxide (SiO₂)</td>
                    <td>about 9 eV</td>
                    <td>Insulator and gate oxide, grown directly on silicon</td>
                  </tr>
                </tbody>
              </table>
            </Prose>
          }
          check="warm-glass"
        >
          <p>
            How well a material conducts depends on its <Term t="Band gap (Eg)">band gap</Term>. In copper the bands overlap, so
            plenty of electrons always have room to move. In glass the gap is so wide that heat almost never lifts an electron
            across. Silicon&apos;s gap is small enough that a few electrons make it, and that number can be controlled.
          </p>
        </ConceptStep>

        <ConceptStep
          n={4}
          title="Heat frees more electrons, and fast"
          picture={
            <Figure caption="Near room temperature, each 10 °C step roughly doubles the free electrons in pure silicon. From 25 °C to 125 °C is ten doublings, about 1000×, which is why leakage climbs so fast in hot equipment.">
              <DoublingLadderPicture />
            </Figure>
          }
          keyNumber={
            <KeyNumber value="×2 every 10 °C">how fast silicon&apos;s free electrons, and the leakage they cause, grow near room temperature</KeyNumber>
          }
          deeper={
            <>
              <Prose>
                <h4>Temperature: the exponential that rules everything</h4>
                <p>
                  The density of electrons that make the jump in pure, or intrinsic, material is the{" "}
                  <strong>intrinsic carrier density</strong>, <code>n_i ∝ T^1.5 · exp(−Eg / 2kT)</code>. The factor of 2
                  appears because each jump makes an electron and a hole, and they recombine in pairs. For silicon at 300 K,
                  Eg/2kT ≈ 21.7 and n_i ≈ 1 × 10¹⁰ cm⁻³: one free electron for every five trillion atoms. Germanium, with
                  about half the gap, has 2 × 10¹³ cm⁻³; GaAs about 2 × 10⁶ cm⁻³; 4H-SiC about 10⁻⁸ cm⁻³, which works out
                  to one thermally freed electron per 100 cubic metres.
                </p>
                <p>
                  Because temperature sits in the exponent, n_i is brutally sensitive to it. In silicon it roughly doubles every
                  10 °C near room temperature. Anything that depends on thermally generated carriers, above all the reverse
                  leakage of every p-n junction, grows about 1000× between 25 °C and 125 °C. That is why silicon parts carry
                  temperature grades of 85 °C (industrial), 125 °C (automotive) and 150 °C (junction), and why a circuit can
                  work perfectly on the bench and fail in an engine bay.
                </p>
              </Prose>
              <Callout kind="tip" title="Rule of thumb">
                <p>
                  Leakage doubles every 10 °C. Before you trust a high-impedance node, multiply its room-temperature leakage by
                  2^(ΔT/10) and then by the node impedance: 1 nA at 25 °C becomes about 1 µA at 125 °C, which is 1 V across
                  1 MΩ.
                </p>
              </Callout>
            </>
          }
          check="doubling"
        >
          <p>
            Heat gives electrons the energy to jump, so a hotter crystal has more{" "}
            <Term t="Intrinsic carrier density (n_i)">free electrons</Term>. The effect is steep: near room temperature,
            silicon&apos;s free electrons roughly double for every 10 °C.
          </p>
          <p>
            That is why chips leak more current when they are hot. It is also why a circuit can work on the bench but fail in an
            engine bay.
          </p>
        </ConceptStep>

        <ConceptStep
          n={5}
          title="Why silicon won, and where wider gaps beat it"
          picture={
            <Figure caption="To block 1200 V, silicon carbide's wider gap lets its blocking layer be about ten times thinner and far more heavily doped than silicon's, so its resistance can be over a hundred times lower at the material limit.">
              <DriftLayerPicture />
            </Figure>
          }
          deeper={
            <Prose>
              <h4>Why silicon won</h4>
              <ul>
                <li>
                  <strong>A native oxide.</strong> Heating silicon in oxygen or steam at 900-1100 °C grows SiO₂ with a 9 eV gap,
                  a breakdown field near 10 MV/cm and a clean interface. That oxide enabled Jean Hoerni&apos;s planar process
                  (Fairchild, 1959) and the MOSFET (Atalla and Kahng, Bell Labs, 1959-60). Germanium&apos;s oxide dissolves
                  in water.
                </li>
                <li>
                  <strong>Abundance and purity.</strong> Silicon is about 28% of the Earth&apos;s crust by mass. Sand is
                  refined into 99.9999999% (nine nines) pure polysilicon, then grown into single crystals and sliced into
                  300 mm wafers.
                </li>
                <li>
                  <strong>A useful gap.</strong> 1.12 eV keeps leakage manageable to about 150 °C, while germanium&apos;s
                  0.66 eV limits it to roughly 70-85 °C.
                </li>
                <li>
                  <strong>Cost.</strong> Seventy years of investment mean a bare 300 mm silicon wafer costs around $100. A
                  150 mm SiC wafer, with a quarter of the area, costs several times more.
                </li>
              </ul>

              <h4>Why wide band gaps matter for EVs</h4>
              <p>
                A wider gap does two things. It slashes the intrinsic carrier density, so SiC and GaN devices keep low leakage
                at 175-200 °C, and it raises the critical electric field from about 0.3 MV/cm in silicon to about 2.8 MV/cm
                in 4H-SiC. Ten times the field means a 1200 V device needs a drift layer roughly ten times thinner and far more
                heavily doped, so its resistance per unit area can fall by over a hundred times at the material limit.
                Tesla&apos;s Model 3 (2017) was the first high-volume car with a SiC MOSFET traction inverter, and most 800 V
                platforms now use 1200 V SiC parts. GaN does the same job in 65-240 W laptop chargers, switching several times
                faster than silicon designs so the transformer can shrink.
              </p>
            </Prose>
          }
        >
          <p>
            Silicon won because heating it in oxygen grows a skin of glass, an excellent insulator. It is also plentiful and
            cheap, and its gap keeps leakage under control up to about 150 °C.
          </p>
          <p>
            Materials with <Term t="Wide-bandgap semiconductor">wider gaps</Term>, such as silicon carbide, leak far less when
            hot. They also let the layer that blocks high voltage be much thinner, so less power is lost. That is why most 800 V
            electric cars use silicon carbide in their motor inverters.
          </p>
        </ConceptStep>
      </Section>

      <Section id="viz" title="Play with it: heat the crystal">
        <BandDiagram />
        <TryThis
          items={[
            "Silicon from 300 K to 400 K: the conduction band gains about three electrons, which on this log scale means several hundred times more carriers.",
            "Germanium at 300 K against silicon at 440-450 K: they have about the same n_i, so room-temperature germanium leaks like silicon at 170 °C. That is why germanium transistors failed in hot equipment.",
            "SiC at 600 K (327 °C): at most one electron in the conduction band, and an intrinsic conductivity about 40,000 times lower than silicon's at room temperature.",
          ]}
        />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="How much hotter is 'hot' for silicon?">
          <p>
            Silicon&apos;s n_i at 300 K is 1 × 10¹⁰ cm⁻³. Using n_i ∝ T^1.5 · exp(−Eg/2kT) with Eg = 1.12 eV and
            k = 8.617 × 10⁻⁵ eV/K, estimate n_i at 400 K (127 °C). Then explain why a SiC MOSFET can run with its
            junction at 200 °C while a silicon power device cannot.
          </p>
          <GoDeeper summary="Show the worked answer">
            <CodeBlock
              lang="text"
              code={
                "Eg / 2k   = 1.12 / (2 × 8.617e-5)       = 6499 K\n" +
                "exponent  = 6499 × (1/300 − 1/400)      = 6499 × 8.33e-4 = 5.42\n" +
                "exp(5.42) = 225\n" +
                "(400/300)^1.5                           = 1.54\n" +
                "ratio     = 1.54 × 225                  ≈ 350\n" +
                "n_i(400 K) ≈ 350 × 1e10                 ≈ 3.5e12 cm^-3\n\n" +
                "SiC at 473 K: Eg/2kT = 3.26 / (2 × 8.617e-5 × 473) = 40.0\n" +
                "Si  at 300 K: Eg/2kT = 1.12 / (2 × 8.617e-5 × 300) = 21.7\n" +
                "e^-40 / e^-21.7 = e^-18.3 ≈ 1e-8"
              }
            />
            <p>
              <strong>Answer:</strong> about 350× with the gap held at 1.12 eV, so n_i ≈ 3.5 × 10¹² cm⁻³. Silicon&apos;s gap
              actually shrinks to about 1.10 eV at 400 K, and measured data give roughly 550×. Either way it is hundreds of
              times. The doubling-every-10 °C rule predicts 2¹⁰ ≈ 1000×, a slight overestimate for n_i, because the
              doubling interval stretches from about 9 °C at room temperature to about 15 °C at 400 K. Junction leakage has
              a diffusion component that grows as n_i², so real leakage often rises even faster than n_i, and 1000× remains
              a sensible design margin.
            </p>
            <p>
              For SiC at 200 °C the exponent Eg/2kT is still 40, far larger than silicon&apos;s 21.7 at room temperature, so
              hot SiC has tens of millions of times fewer intrinsic carriers than cool silicon (n_i ≈ 2 × 10² cm⁻³) and its
              junction leakage stays negligible. Silicon at 200 °C reaches n_i ≈ 10¹⁴ cm⁻³, comparable to the doping of the
              drift layer in a 1200 V device, so that layer stops behaving like doped material and the part can no longer
              block. For SiC the real 200 °C limits are the package (solder, gel, mould compound) and gate-oxide
              reliability, not the semiconductor.
            </p>
          </GoDeeper>
        </Exercise>
      </Section>
    </>
  );
}
```

- [ ] **Step 5: Run the gates, the content test and the hydration test**

Run: `npx vitest run tests/simple-first-lessons.test.tsx tests/content/semis-a.test.tsx tests/hydration-stability.test.tsx tests/quiz-length-tell.test.ts`
Expected: PASS. The gates measure about 14.4 words per sentence, about 118 words before the first picture and about
389 before the interactive; `atoms-to-bands` still has 700-1200 words of theory, now counted in its "Go deeper" text.

If a gate fails, read its message: it names the step or check to fix. Do not loosen `LIMITS`.

- [ ] **Step 6: Confirm that no old sentence went missing**

Run: `npm run check:deeper -- atoms-to-bands`
Expected: `atoms-to-bands: every sentence of the old theory section is still in the lesson.` If it lists sentences, copy
them back word for word from `git show origin/main:src/content/semiconductors/atoms-to-bands.tsx` into the right
`deeper` block.

- [ ] **Step 7: Commit**

```bash
git add src/content/semiconductors/atoms-to-bands.tsx src/content/semiconductors/atoms-to-bands.data.ts tests/content/semis-a.test.tsx
git commit -m "Convert Day 1 to the simple-first layout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Check the pilot in the browser, document it, and hand it over

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a pilot ready for Vatsal's review, and the README notes stage 3 relies on.

- [ ] **Step 1: Run every check**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: lint and type check clean; every test passes (the baseline 1062 plus the new ones); the build prerenders
every route, including `/learn/semiconductors/atoms-to-bands`.

- [ ] **Step 2: Check the pilot page in the browser**

Start the dev server (`npm run dev`, or the `dev` entry in `.claude/launch.json`) and open
http://localhost:3000/learn/semiconductors/atoms-to-bands at a 1280 px wide window. Confirm each item and fix anything
that fails before moving on:

1. The header has the violet wash, the objectives with check marks, and no "Lesson parts" bar (it is for narrower
   screens). The right column shows "On this page", and its highlight follows the section at the top as you scroll.
2. "The big idea" card sits right under the header; the shared-bonds picture appears in step 1 without scrolling past
   step 1's text.
3. Steps fade in as they scroll into view in Chrome; with reduced motion turned on in the OS they appear at once.
4. Hover or tab to "valence band": the definition box opens with the plain line first; Escape closes it. Near the right
   edge of the column the box opens towards the left.
5. Each quick check shows "Right." or "Not quite." with the explanation when you pick an answer.
6. Each "Go deeper" opens to the original text; find-in-page in Chrome for "Pauli exclusion" opens step 2's fold-out.
7. "Play with it" shows the band diagram and the "Try this" checklist; "Practice" hides the worked answer until opened.
8. "Remember this" lists five takeaways, the formula card, and "All key terms (8)".
9. The browser console shows no errors or warnings.

Then check a 375 px wide window: no horizontal scroll; the "Lesson parts" bar wraps under the objectives; the
definition boxes stay on screen.

Finally open http://localhost:3000/learn/semiconductors/doping-and-carriers: it shows today's layout with the key-terms
column. Open http://localhost:3000/learn/semiconductors: the Day 1 row shows the big idea instead of the summary.

Take screenshots of the pilot at both widths for Vatsal.

- [ ] **Step 3: Document the simple-first layout**

In `README.md`, in the `## Scripts` code block, add after the `npm run gen:registry` line:

```bash
npm run check:deeper -- <slug>  # after converting a lesson: lists any sentence of its old theory text that went missing
```

In the `## Structure` code block, add after the `src/lib/progress.tsx` line:

```
src/lib/readability.ts  word and sentence measures for the simple-first readability gate and check:deeper
```

At the end of step 3 of `## Adding a lesson`, add:

```
   Lessons use the simple-first layout: give the data a `bigIdea`, at least three `checks`, `remember` and a `plain`
   definition for every key term, and build the theory section from 4-6 `ConceptStep`s. Follow
   `src/content/semiconductors/atoms-to-bands.tsx` and the writing rules in
   `docs/superpowers/specs/2026-10-22-simple-first-lessons-design.md`.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "Document the simple-first layout and the Go deeper check" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Stop for the pilot review**

Send Vatsal the screenshots and the local URL. Do not start stage 3 until Vatsal signs off. Feed any changes they ask
for back into the components, the gates or the writing rules, and re-run Step 1 after each round.

---

## Stage 3: converting the other 37 lessons (after sign-off)

One branch and one pull request per track, in course order: Semiconductors (8), PCB (10), Robotics (10), EV (6),
AI design (3). For each lesson, in its own commit ("Convert <slug> to the simple-first layout"):

1. Read the lesson's body and data in full. List its `h3` subsections and group them into 4-6 steps; a lesson with
   fewer than four uses its intro paragraph as a step.
2. Write the simple layer under the writing rules in spec section 8: the big idea; 2-5 short sentences per step; `Term`
   on the first use of each key term; at most one `KeyNumber` and two numbers per step; only facts and numbers already
   in the lesson.
3. Give every step a picture: the lesson's existing figure (caption unchanged), a new diagram in
   `src/components/viz/<track>/<LessonName>Pictures.tsx` drawn with integer coordinates, or a `Picture` comparison
   with its `breaks` line.
4. Move the old theory text word for word into each step's `deeper`, turning `h3` into `h4`; keep its tables and
   callouts.
5. Turn "Things to try" into `TryThis` with the original items word for word, titled "Play with it: …"; put the
   practice answer behind `<GoDeeper summary="Show the worked answer">` unless it already uses `WorkedAnswer`.
6. Add `bigIdea`, `checks` (at least 3, 3 choices, the correct one never the single longest), `remember` and a `plain`
   definition for every key term to the data.
7. In the track's content test under `tests/content/`, render the lesson inside `LessonDataProvider` and count words
   with `theoryWords` from `tests/helpers/lesson-text.ts`, as Task 14 Step 1 did for `semis-a`.
8. Run `npx vitest run tests/simple-first-lessons.test.tsx tests/content tests/hydration-stability.test.tsx tests/quiz-length-tell.test.ts`
   and `npm run check:deeper -- <slug>`; both must pass.
9. Have a second reader (a fresh subagent with no part in the writing) check every simple sentence, caption, key
   number, quick check and plain definition against the "Go deeper" text, and list any claim the lesson does not
   support. Fix each one.
10. Check the page in the browser at 1280 px and 375 px, as in Task 15 Step 2.

Before opening each track's pull request, run `npm run lint && npm run typecheck && npm test && npm run build`.

## Stage 4: finishing (after all 38 lessons are converted)

1. Make `bigIdea`, `checks` and `remember` required in `LessonData` and `plain` required in `KeyTerm`; update the stub
   data in `scripts/gen-registry.mts` to match.
2. Delete `ClassicLessonShell.tsx`, the classic tests and snapshot in `tests/lesson-shell.test.tsx`, and `KeyTermsRail`
   if nothing else uses it; `LessonShell` then always renders `SimpleLessonShell`.
3. Check every lesson in the browser at 1280 px and 375 px.
4. Deploy with `npx vercel --prod --yes` once Vatsal approves.
