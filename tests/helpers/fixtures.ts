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
