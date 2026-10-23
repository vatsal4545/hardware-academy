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
