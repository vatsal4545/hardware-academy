import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Quiz, ScenarioCard, InterviewQuestions } from "@/components/lesson";
import { ProgressProvider, PROGRESS_KEY } from "@/lib/progress";

const questions = [
  { q: "Question one?", choices: ["alpha", "bravo", "charlie", "delta"], answer: 1, explain: "Because bravo." },
  { q: "Question two?", choices: ["echo", "foxtrot", "golf", "hotel"], answer: 0, explain: "Because echo." },
];

describe("Quiz", () => {
  beforeEach(() => localStorage.clear());

  it("scores answers, shows explanations and records the score", () => {
    render(
      <ProgressProvider>
        <Quiz slug="lesson-x" questions={questions} />
      </ProgressProvider>,
    );
    fireEvent.click(screen.getByLabelText("bravo"));
    fireEvent.click(screen.getByLabelText("foxtrot"));
    fireEvent.click(screen.getByRole("button", { name: /check answers/i }));
    expect(screen.getByText(/1 \/ 2/)).toBeTruthy();
    expect(screen.getByText("Because bravo.")).toBeTruthy();
    expect(screen.getByText("Because echo.")).toBeTruthy();
    expect(localStorage.getItem(PROGRESS_KEY)).toContain('"lesson-x"');
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.queryByText("Because bravo.")).toBeNull();
  });
});

describe("ScenarioCard", () => {
  const scenario = {
    title: "Robot resets when motors start",
    context: "A line follower reboots the moment both motors spin up.",
    symptoms: ["Reset only under load", "USB power is fine"],
    hints: ["Where does the motor current return?", "Is there a bulk capacitor?"],
    rootCause: "Rail droop from motor inrush on a shared ground path.",
    fix: "Add a bulk capacitor near the driver and separate the ground return.",
    lesson: "Power integrity is a layout problem.",
  };

  it("reveals hints one at a time, then the root cause", () => {
    render(<ScenarioCard scenario={scenario} />);
    expect(screen.queryByText(scenario.hints[0])).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show hint/i }));
    expect(screen.getByText(scenario.hints[0])).toBeTruthy();
    expect(screen.queryByText(scenario.hints[1])).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show hint/i }));
    expect(screen.getByText(scenario.hints[1])).toBeTruthy();
    expect(screen.queryByText(scenario.rootCause)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /reveal root cause/i }));
    expect(screen.getByText(scenario.rootCause)).toBeTruthy();
    expect(screen.getByText(scenario.fix)).toBeTruthy();
  });
});

describe("InterviewQuestions", () => {
  it("renders questions with level badges", () => {
    render(
      <InterviewQuestions
        items={[
          { q: "What is a band gap?", a: "The energy between bands.", level: "screen" },
          { q: "Why exponential?", a: "Boltzmann statistics.", level: "deep" },
        ]}
      />,
    );
    expect(screen.getByText("What is a band gap?")).toBeTruthy();
    expect(screen.getAllByText(/deep/i).length).toBeGreaterThan(0);
  });
});
