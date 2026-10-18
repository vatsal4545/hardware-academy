// Reports, per lesson, how many quiz questions have the correct choice as the single longest (or
// single shortest) string. The gate for this lives in tests/quiz-length-tell.test.ts; this script is
// for looking at the numbers while editing quizzes.
// Run with: node scripts/quiz-length-tell.mts [--list]   (Node 24 strips the types natively)
// --list also prints every question with the longest tell, with the choice lengths and the key marked.
import type { LessonData } from "../src/lib/curriculum.ts";
import { lessons } from "../src/lib/curriculum.ts";
import { correctIsLongest, lengthTellReport } from "../tests/quiz-length-tell.ts";

// Same lesson list the registry is generated from (scripts/gen-registry.mts), loaded with explicit
// extensions because plain Node cannot follow the registry's extension-less imports.
const data: Record<string, LessonData> = {};
for (const l of lessons) {
  const mod = (await import(`../src/content/${l.track}/${l.slug}.data.ts`)) as { default: LessonData };
  data[l.slug] = mod.default;
}

const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
const report = lengthTellReport(data);
const width = Math.max(...report.lessons.map((l) => l.slug.length));

console.log(`${"lesson".padEnd(width)}  qs  longest  shortest`);
for (const l of report.lessons) {
  const flag = l.longest * 2 > l.questions ? "  <- more than half" : "";
  console.log(`${l.slug.padEnd(width)}  ${String(l.questions).padStart(2)}  ${String(l.longest).padStart(7)}  ${String(l.shortest).padStart(8)}${flag}`);
}
console.log();
console.log(`correct choice is the single longest:  ${report.longest} / ${report.questions} (${pct(report.longest, report.questions)})`);
console.log(`correct choice is the single shortest: ${report.shortest} / ${report.questions} (${pct(report.shortest, report.questions)})`);

if (process.argv.includes("--list")) {
  console.log();
  for (const l of lessons) {
    data[l.slug].quiz.forEach((q, i) => {
      if (!correctIsLongest(q)) return;
      console.log(`${l.slug} #${i}  lengths ${q.choices.map((c) => c.length).join("/")}  key=${q.answer}`);
      console.log(`  Q: ${q.q}`);
      q.choices.forEach((c, ci) => console.log(`  ${ci === q.answer ? "*" : " "} [${String(c.length).padStart(3)}] ${c}`));
    });
  }
}
