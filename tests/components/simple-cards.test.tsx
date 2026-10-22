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
