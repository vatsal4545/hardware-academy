import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Slider, Segmented, Toggle, Stepper, PlayPause, VizFrame, Section } from "@/components/lesson";

describe("controls", () => {
  it("Slider emits numbers", () => {
    const onChange = vi.fn();
    render(<Slider label="Voltage" value={1} min={0} max={5} step={0.5} unit="V" onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider", { name: /voltage/i }), { target: { value: "2.5" } });
    expect(onChange).toHaveBeenCalledWith(2.5);
    expect(screen.getByText(/1\s?V/)).toBeTruthy();
  });

  it("Segmented emits the clicked value", () => {
    const onChange = vi.fn();
    render(
      <Segmented
        label="Material"
        options={[
          { value: "si", label: "Silicon" },
          { value: "ge", label: "Germanium" },
        ]}
        value="si"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Germanium" }));
    expect(onChange).toHaveBeenCalledWith("ge");
    expect(screen.getByRole("radio", { name: "Silicon" }).getAttribute("aria-checked")).toBe("true");
  });

  it("Toggle flips", () => {
    const onChange = vi.fn();
    render(<Toggle label="Apply field" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: /apply field/i }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("Stepper advances and shows the current step", () => {
    const onChange = vi.fn();
    render(
      <Stepper
        steps={[
          { title: "Oxidize", body: <p>grow oxide</p> },
          { title: "Coat", body: <p>spin resist</p> },
        ]}
        index={0}
        onChange={onChange}
      />,
    );
    expect(screen.getByText("grow oxide")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("PlayPause toggles and resets", () => {
    const onToggle = vi.fn();
    const onReset = vi.fn();
    render(<PlayPause playing={false} onToggle={onToggle} onReset={onReset} />);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(onToggle).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
  });

  it("VizFrame and Section render their structure", () => {
    render(
      <Section id="viz" title="Interactive">
        <VizFrame title="Band diagram" description="Heat the crystal." controls={<span>controls</span>}>
          <svg />
        </VizFrame>
      </Section>,
    );
    expect(document.querySelector("section#viz h2")?.textContent).toBe("Interactive");
    expect(screen.getByText("Band diagram")).toBeTruthy();
    expect(screen.getByText("controls")).toBeTruthy();
  });
});
