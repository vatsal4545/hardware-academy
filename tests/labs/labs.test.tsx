import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { ProgressProvider, useProgress } from "@/lib/progress";
import { presets, arenas } from "@/lib/sim/robot";
import { traceWidth } from "@/lib/sim/traceWidth";
import { labs } from "@/lib/labs";
import { RobotSim } from "@/components/labs/RobotSim";
import { PidLab } from "@/components/labs/PidLab";
import { ArmLab } from "@/components/labs/ArmLab";
import { TraceWidthLab } from "@/components/labs/TraceWidthLab";
import RobotSimPage from "@/app/labs/robot-sim/page";
import PidLabPage from "@/app/labs/pid/page";
import ArmLabPage from "@/app/labs/arm/page";
import TraceWidthLabPage from "@/app/labs/trace-width/page";

/** Shows which labs the progress store has marked. */
function LabsProbe() {
  const { state } = useProgress();
  return <output data-testid="labs-done">{Object.keys(state.labs).sort().join(",")}</output>;
}

function renderLab(ui: ReactElement) {
  return render(
    <ProgressProvider>
      {ui}
      <LabsProbe />
    </ProgressProvider>,
  );
}

const marked = () => screen.getByTestId("labs-done").textContent ?? "";
const editor = () => screen.getByRole("textbox", { name: /controller code/i }) as HTMLTextAreaElement;

beforeEach(() => {
  localStorage.clear();
});

// vitest runs without globals here, so Testing Library cannot register its own cleanup
afterEach(() => {
  cleanup();
});

describe("RobotSim", () => {
  it("renders the canvas, pickers, editor, buttons and telemetry", () => {
    renderLab(<RobotSim />);
    expect(screen.getByRole("img", { name: /simulated robot/i }).tagName).toBe("CANVAS");
    for (const name of ["Run", "Step", "Reset", "Load preset"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(within(screen.getByRole("radiogroup", { name: "Preset" })).getAllByRole("radio")).toHaveLength(presets.length);
    expect(within(screen.getByRole("radiogroup", { name: "Arena" })).getAllByRole("radio")).toHaveLength(arenas.length);
    const speeds = within(screen.getByRole("radiogroup", { name: "Speed" })).getAllByRole("radio");
    expect(speeds.map((r) => r.textContent)).toEqual(["×1", "×2", "×4"]);
    expect(editor().value).toContain("function control");
    expect(editor().rows).toBe(18);
    expect(screen.getByRole("heading", { name: "Telemetry" })).toBeTruthy();
    expect(screen.getByText("0.00 s")).toBeTruthy();
  });

  it("Step advances the simulation by 0.1 s", () => {
    renderLab(<RobotSim />);
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByText("0.10 s")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows compile errors instead of running", () => {
    renderLab(<RobotSim />);
    fireEvent.change(editor(), { target: { value: "function control(s{" } });
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByRole("alert").textContent).toMatch(/compile error/i);
    expect(screen.getByRole("button", { name: "Run" })).toBeTruthy();
  });

  it("surfaces runtime errors thrown by the controller", () => {
    renderLab(<RobotSim />);
    fireEvent.change(editor(), {
      target: { value: "function control(s) { if (s.t > 0.05) throw new Error('boom'); return { left: 1, right: 1 }; }" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByRole("alert").textContent).toMatch(/runtime error.*boom/i);
  });

  it("Tab in the editor inserts two spaces", () => {
    renderLab(<RobotSim />);
    fireEvent.change(editor(), { target: { value: "ab" } });
    editor().setSelectionRange(1, 1);
    fireEvent.keyDown(editor(), { key: "Tab" });
    expect(editor().value).toBe("a  b");
  });

  it("Load preset swaps the code and the arena", () => {
    renderLab(<RobotSim />);
    fireEvent.click(screen.getByRole("radio", { name: "Line follow" }));
    expect(editor().value).not.toContain("s.line");
    fireEvent.click(screen.getByRole("button", { name: "Load preset" }));
    expect(editor().value).toContain("s.line");
    expect(screen.getByRole("radio", { name: "Line track" }).getAttribute("aria-checked")).toBe("true");
  });

  it("marks the lab after the robot drives 100 cm without crashing", () => {
    renderLab(<RobotSim />);
    expect(marked()).toBe("");
    for (let i = 0; i < 60; i++) fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByText("Lab complete")).toBeTruthy();
    expect(marked()).toBe("robot-sim");
  });

  it("runs from the animation loop and pauses", async () => {
    renderLab(<RobotSim />);
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("0.00 s")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Run" })).toBeTruthy();
  });

  it("compact mode hides the editor and telemetry and loads presets directly", () => {
    renderLab(<RobotSim compact presetId="line-follow" />);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Telemetry" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Load preset" })).toBeNull();
    expect(screen.getByRole("button", { name: "Run" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Line track" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Wall follow" }));
    expect(screen.getByRole("radio", { name: "L corridor" }).getAttribute("aria-checked")).toBe("true");
  });

  it("honours an explicit arena", () => {
    renderLab(<RobotSim presetId="go-to-goal" arenaId="open-room" />);
    expect(screen.getByRole("radio", { name: "Go to goal" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Open room" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("PidLab", () => {
  it("renders sliders, setpoint, disturbance and metrics", () => {
    const { container } = renderLab(<PidLab />);
    for (const name of [/kp/i, /ki/i, /kd/i]) expect(screen.getByRole("slider", { name })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "1 krpm" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "2 krpm" })).toBeTruthy();
    for (const label of ["Overshoot", "Settling time (2 %)", "Steady-state error"]) expect(screen.getByText(label)).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Target not met yet")).toBeTruthy();
    const load = screen.getByRole("button", { name: /load step/i });
    fireEvent.click(load);
    expect(load.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Load dip")).toBeTruthy();
  });

  it("shows the badge and marks the lab when the target is met", () => {
    renderLab(<PidLab />);
    fireEvent.change(screen.getByRole("slider", { name: /kp/i }), { target: { value: "10" } });
    expect(marked()).toBe("");
    fireEvent.change(screen.getByRole("slider", { name: /ki/i }), { target: { value: "5" } });
    expect(screen.getByText("Target met")).toBeTruthy();
    expect(marked()).toBe("pid");
  });

  it("warns when too much derivative gain makes the loop chatter", () => {
    renderLab(<PidLab />);
    fireEvent.change(screen.getByRole("slider", { name: /kd/i }), { target: { value: "4" } });
    expect(screen.getByRole("alert").textContent).toMatch(/chattering/i);
  });
});

describe("ArmLab", () => {
  it("renders the arm svg, joint sliders and elbow switch", () => {
    const { container } = renderLab(<ArmLab />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByRole("slider", { name: /θ1/ })).toBeTruthy();
    expect(screen.getByRole("slider", { name: /θ2/ })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /elbow up/i }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/reachable: ik found a solution/i)).toBeTruthy();
  });

  it("flips the elbow while keeping the hand in place", () => {
    renderLab(<ArmLab />);
    fireEvent.click(screen.getByRole("switch", { name: /elbow up/i }));
    expect(screen.getByRole("switch", { name: /elbow up/i }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getAllByText("70.0°").length).toBeGreaterThan(0);
  });

  it("solves IK from the keyboard, marks the lab, and flags unreachable targets", () => {
    renderLab(<ArmLab />);
    const handle = screen.getByRole("button", { name: /arm target/i });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(marked()).toBe("arm");
    for (let i = 0; i < 8; i++) fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
    expect(screen.getByText(/unreachable/i)).toBeTruthy();
  });

  it("drags the target with the pointer", () => {
    const { container } = renderLab(<ArmLab />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 480, height: 480, right: 480, bottom: 480, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(svg, { clientX: 240 + 150, clientY: 240 - 50, pointerId: 1 });
    fireEvent.pointerMove(svg, { clientX: 240 + 140, clientY: 240 - 60, pointerId: 1 });
    fireEvent.pointerUp(svg, { pointerId: 1 });
    expect(screen.getByText("140, 60 px")).toBeTruthy();
    expect(marked()).toBe("arm");
  });
});

describe("TraceWidthLab", () => {
  it("renders inputs, a result after Calculate, and the reference table", () => {
    renderLab(<TraceWidthLab />);
    expect(screen.getByLabelText(/current/i)).toBeTruthy();
    expect(screen.getByLabelText(/temperature rise/i)).toBeTruthy();
    expect(screen.getByRole("radio", { name: "1 oz" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "External" }).getAttribute("aria-checked")).toBe("true");
    expect(marked()).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
    const expected = traceWidth({ currentA: 2, tempRiseC: 10, copperOz: 1, layer: "external" });
    expect(screen.getByText(`${expected.widthMil.toFixed(1)} mil`)).toBeTruthy();
    expect(marked()).toBe("trace-width");
    const reference = screen.getByRole("heading", { name: /reference/i }).closest("section") as HTMLElement;
    expect(within(reference).getAllByRole("row")).toHaveLength(7);
  });

  it("rejects a zero current", () => {
    renderLab(<TraceWidthLab />);
    fireEvent.change(screen.getByLabelText(/current/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
    expect(screen.getByRole("alert").textContent).toMatch(/current above 0/i);
    expect(marked()).toBe("");
  });
});

describe("lab pages", () => {
  const pages = [
    ["robot-sim", RobotSimPage],
    ["pid", PidLabPage],
    ["arm", ArmLabPage],
    ["trace-width", TraceWidthLabPage],
  ] as const;

  it.each(pages)("%s renders its title, description and a link back, without a provider", (id, Page) => {
    const lab = labs.find((l) => l.id === id)!;
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(lab.title);
    expect(screen.getByText(lab.description)).toBeTruthy();
    expect(screen.getByRole("link", { name: /back to labs/i }).getAttribute("href")).toBe("/labs");
  });
});
