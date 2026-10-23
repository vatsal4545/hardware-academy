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
