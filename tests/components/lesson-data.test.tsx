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
