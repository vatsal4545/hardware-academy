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
