# Simple-first lessons — design spec

Date: 2026-10-22
Status: direction, reader level, theme, page layout, build approach and rollout approved by Vatsal in brainstorming.
This written spec is awaiting review.

## 1. Problem

Lessons feel hard to read, and the concepts lack a clear, simple explanation. Measured across the 38 lessons:

- Between 800 and 1,500 words of dense reading (1,000 on average) come before the interactive part, and on average 594
  words before the first picture.
- Theory sentences average 23 words, with a number roughly every 13 words. Day 1 opens with the atomic number, the bond
  angle and the lattice size before it says why silicon conducts a little.
- Everyday comparisons are almost absent: "imagine", "think of", "like a", "analogy", "picture a" and "as if" match 5
  times in 38 lessons.
- Each lesson has one figure. Every section is a heading followed by paragraphs, and the key terms sit in small muted
  text in a side rail.

The content itself is accurate and was checked against primary sources (PR #2). The fix is a simple layer on top of it,
not deleting it.

## 2. Goals and non-goals

Goals:

- Every lesson opens with a plain big idea and builds the concept in small, picture-led steps that a total beginner
  (school science, no electronics) can follow.
- Lessons look livelier while staying dark: track colour, an icon per card type, larger text, formula cards.
- Learners check their understanding as they go, not only in the quiz at the end.
- No existing fact is lost: today's theory text moves word for word into "Go deeper" fold-outs.

Non-goals (possible later): light mode, flashcards, a concept map, streaks, an AI tutor, translations, changes to the
labs or the component encyclopedia, and new quiz, interview or scenario content.

## 3. Decisions made in brainstorming

| Question | Decision |
|---|---|
| Direction | Simple-first redesign: build the parts, pilot one lesson, then convert all 38 |
| Reader | Total beginner: school science, no electronics |
| Theme | Dark only, brighter and more colourful. New parts use theme variables so light mode can come later without rework |
| Pilot lesson | Day 1, `atoms-to-bands` |

## 4. Lesson page anatomy

Top to bottom:

| # | Part | Comes from | Notes |
|---|---|---|---|
| 1 | Header | `LessonMeta` | Track-colour wash, title, day and minutes, summary, objectives as "You'll be able to", a bar linking to the parts below |
| 2 | Big idea | `data.bigIdea` | 2–4 sentences, no unexplained jargon |
| 3 | Build it up (section id `theory`) | lesson body | 4–6 `ConceptStep`s made from the lesson's existing h3 subsections. Lessons have 3–9 subsections today; related ones merge, and a lesson with 3 uses its intro paragraph as a step |
| 4 | Play with it (`viz`) | lesson body | The existing interactive, always as its own section right after the steps. "Things to try" becomes a 3-item checklist |
| 5 | Practice (`practice`) | lesson body | The existing exercise. The worked answer moves behind a "Show answer" fold-out (25 lessons show it inline today) |
| 6 | Remember this | `data.remember`, `data.keyTerms` | 3–5 takeaways, formulas with every symbol explained, and an "All key terms" fold-out |
| 7 | Check yourself | `data.quiz` | The existing quiz |
| 8 | Real-world scenario | `data.scenario` | Unchanged |
| 9 | Interview prep | `data.interview` | Already one fold-out per question; unchanged |
| 10 | References | `referencesFor(slug)` | The section becomes a fold-out |

Each `ConceptStep` has:

- a title phrased plainly, often as the question the step answers;
- 2–5 short sentences of simple explanation;
- one picture: a `Picture` comparison card, or a diagram, which may be the lesson's existing figure;
- at most one `KeyNumber`;
- for a comparison, one line on where it stops being true;
- a `GoDeeper` fold-out holding the original text of that subsection, unchanged.

At least three steps per lesson end with a `QuickCheck`.

Around the page:

- **Jargon.** `Term` underlines a word. Hover, focus or tap shows the plain definition with the technical one below it.
  This replaces the key-terms rail for converted lessons; the full list stays available under "Remember this".
- **On this page.** At 1280 px and wider, the right column shows a sticky list of the parts and highlights the current one.
  Below that width, the header's parts bar links to the same anchors.
- **Look.** Still dark, but brighter. The token values are tuned during the pilot: slightly lighter surfaces and
  borders, and lifted muted text, while keeping body text at 7:1 contrast or better and muted text at 4.5:1 or better
  against every surface. Lesson prose is 17 px with 1.7 line height and at most 68 characters per line. A `--track` CSS
  variable on the lesson root colours step numbers, card accents and the header wash. Each card type has an icon from
  `lucide-react`. Formulas sit in their own cards.
- **Motion.** Steps fade in as they scroll into view, using CSS scroll-driven animation inside
  `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. There is no JavaScript
  for this; browsers without support show the steps immediately.
- **Track pages.** Each lesson row shows its big idea in place of the one-line summary, and falls back to the summary for
  lessons not converted yet. The track route passes the strings from the registry, so no lesson data reaches the client
  bundle beyond those strings.

## 5. Components

New, in `src/components/lesson/` and exported from its `index.ts`:

| Component | State | Purpose |
|---|---|---|
| `LessonHeader` | none | Header with track wash, meta, objectives and parts bar |
| `OnThisPage` | client | Sticky parts list; an IntersectionObserver highlights the current part |
| `BigIdea` | none | Card the shell renders from `data.bigIdea` |
| `ConceptStep` | none | Numbered step: title, simple text, picture slot, key number, "Go deeper" slot |
| `Picture` | none | "Picture it" card: caption, drawing, and the "where it stops being true" line |
| `KeyNumber` | none | A value and what it means |
| `GoDeeper` | none | Native `<details>`. The text stays in the page for search engines, and find-in-page opens it in Chromium browsers |
| `QuickCheck` | client | One question from `data.checks` by id, with instant feedback. Not scored or saved |
| `Term` | client | Inline definition looked up by an exact match on the key term's `term` string. Works with mouse, touch and keyboard; Escape closes it |
| `FormulaCard` | none | An expression and the meaning of each symbol |
| `Remember` | none | Takeaways, formulas, and the "All key terms" fold-out |

Data access: `LessonShell` wraps the page in a `LessonDataContext` holding the lesson's `LessonData`, and `QuickCheck`
and `Term` read it through `useLessonData()`. An unknown id renders nothing and logs `console.error`; the tests in
section 7 make that case unreachable in shipped lessons.

Test markers: `ConceptStep` renders `data-step`, its simple text inside `data-layer="simple"` and its picture inside
`data-picture`. `BigIdea` also uses `data-layer="simple"`.

Existing files that change: `src/app/learn/LessonShell.tsx`, the types in `src/lib/curriculum.ts`,
`src/app/globals.css`, `src/app/learn/TrackLessonList.tsx` and `src/app/learn/track-route.tsx`, the tests, and each
lesson's `<slug>.tsx` and `<slug>.data.ts` as it is converted. `scripts/gen-registry.mts` and the generated routes stay
as they are. New dependency: `lucide-react` (1.61.0 at the time of writing; its peer range includes React 19).

## 6. Data model

```ts
export interface KeyTerm {
  term: string;
  def: string; // technical definition (existing)
  plain?: string; // beginner definition, 25 words or fewer
}

export interface Formula {
  expr: string; // for example "V = I × R"
  parts: { symbol: string; meaning: string }[]; // one entry per symbol in expr
}

export interface LessonData {
  keyTerms: KeyTerm[];
  scenario: Scenario;
  interview: InterviewQuestion[];
  quiz: QuizQuestion[];
  bigIdea?: string; // 2–4 sentences
  checks?: Record<string, QuizQuestion>; // quick checks by id, 3 choices each
  remember?: { takeaways: string[]; formulas?: Formula[] };
}
```

A lesson counts as converted once `bigIdea` is set. The shell renders the new layout for converted lessons and today's
layout for the rest. At the end of the rollout the four fields become required, and the old layout path, including
`KeyTermsRail` in the shell, is removed.

## 7. Tests

Added to `npm test`:

- **Completeness** for converted lessons: `bigIdea` has 2–4 sentences; at least 3 `checks`, each with 3 choices, a valid
  answer index and an explanation longer than 10 characters; 3–5 takeaways; every key term has `plain`.
- **Structure**, by rendering the body inside the provider with jsdom: 4–6 `[data-step]` elements, each containing a
  `[data-picture]`; every `QuickCheck` id exists in `checks`, and every check is used exactly once; every `Term` matches
  a key term.
- **Readability**, per lesson: the simple text (the big idea plus every `[data-layer="simple"]`) averages 18 words per
  sentence or fewer; counting the big idea, at most 150 words of simple text come before the first picture and at most
  600 before the `viz` section.
- **Length tell**: quick checks join the existing gate, so the correct choice is never the single longest.
- **Hydration stability**: lesson bodies render inside the provider.
- **Components**: `QuickCheck` (select, feedback, keyboard), `GoDeeper` (closed by default, content present in the
  markup), `Term` (opens on focus and click, closes on Escape, wired with `aria-describedby`).
- **After the rollout**: the new fields are required for all 38 lessons.

Migration check: a script, run for each lesson as it is converted rather than in `npm test`. It compares the sentences of
the lesson's theory section at the commit before conversion with the new "Go deeper" text, and lists any sentence that
went missing or changed.

## 8. Writing rules for the simple layer

- Write for a total beginner with school science. Use "you" and the active voice.
- Give the idea first, then the picture, then at most one number. A step uses two numbers at most.
- Keep sentences to 18 words on average or fewer (tested) and paragraphs to three sentences or fewer.
- Wrap each new word in `Term` the first time it appears.
- Every comparison gets one line saying where it stops being true.
- Use only facts and numbers already in the lesson's own text. Prefer established teaching comparisons, such as
  Shockley's two-storey car park for bands and water in pipes for circuits.
- Quick checks test understanding, not recall of numbers. Give three choices, no length tell, and an explanation that
  teaches.
- The big idea is 2–4 sentences with no unexplained jargon. Plain definitions are 25 words or fewer.
- "Go deeper" text is today's lesson text, word for word, split by subsection.

## 9. Rollout

1. **Foundation.** Components, data types, tests and tokens. The shell supports both layouts. Lessons not converted yet
   look the same apart from the brighter tokens.
2. **Pilot.** Convert `atoms-to-bands`. Vatsal reviews it in the browser on desktop and phone, and the components and
   writing rules are tuned. No other lesson is converted before Vatsal signs off.
3. **Conversion by track,** in course order: Semiconductors (8 remaining), PCB (10), Robotics (10), EV (6), AI design (3).
   Each track gets one branch and one pull request. For each lesson: draft the simple layer, have a second reader check
   it against the "Go deeper" text, run the migration check and the tests, and check the page in the browser.
4. **Finish.** Make the new fields required and remove the old layout path. Check every lesson in the browser at
   1280 px and 375 px. Deploy with `npx vercel --prod --yes` once Vatsal approves.

The first implementation plan covers stages 1 and 2 in full and writes down the per-lesson conversion procedure that
stage 3 repeats. Stages 3 and 4 start only after the pilot sign-off.

## 10. Success criteria

- All 38 lessons use the new layout, and `npm run lint`, `npm test` and `npm run build` pass.
- The completeness, structure and readability tests pass for every lesson.
- At most 150 words of simple text come before the first picture (today: 594 dense words on average before the first
  figure), and at most 600 before the interactive (today: 1,000 dense words on average).
- The migration check reports no missing or changed original sentence in any lesson.
- Vatsal signed off on the pilot before stage 3 started.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Simplifying introduces errors | Only facts already in the lesson; every comparison states where it stops being true; a second reader checks each lesson; the migration check runs on each lesson |
| Pages get longer (simple layer plus original text) | The original text, interview answers and references fold away; tests cap the words before the first picture and before the interactive |
| New client components cause hydration mismatches | No time-, random- or float-derived markup; the hydration test covers every body inside the provider |
| Scroll-driven animation support varies by browser | Progressive enhancement only; without support, content shows immediately |
| Content volume: 38 lessons of about 5 steps each, plus 360 plain definitions | One pull request per track; established comparisons reused; subagents draft and a separate reviewer checks |
