import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, it, expect, afterEach } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import KinematicsLesson from "@/content/robotics/kinematics-and-motion";
import kinematicsData from "@/content/robotics/kinematics-and-motion.data";
import PerceptionLesson from "@/content/robotics/perception-and-navigation";
import perceptionData from "@/content/robotics/perception-and-navigation.data";
import BuildLesson from "@/content/robotics/build-your-smart-robot";
import buildData from "@/content/robotics/build-your-smart-robot.data";
import SimulateLesson from "@/content/robotics/simulate-before-you-build";
import simulateData from "@/content/robotics/simulate-before-you-build.data";
import RosLesson from "@/content/robotics/ros2-and-the-robotics-stack";
import rosData from "@/content/robotics/ros2-and-the-robotics-stack.data";
import { DiffDriveKinematics } from "@/components/viz/robotics/DiffDriveKinematics";
import { ArmKinematics } from "@/components/viz/robotics/ArmKinematics";
import { StateMachine } from "@/components/viz/robotics/StateMachine";
import { WiringDiagram } from "@/components/viz/robotics/WiringDiagram";
import { ArenaPreview } from "@/components/viz/robotics/ArenaPreview";
import { RosGraph } from "@/components/viz/robotics/RosGraph";

afterEach(cleanup);

const lessons: Array<{ slug: string; Lesson: ComponentType; data: LessonData; maxWords?: number }> = [
  { slug: "kinematics-and-motion", Lesson: KinematicsLesson, data: kinematicsData, maxWords: 1200 },
  { slug: "perception-and-navigation", Lesson: PerceptionLesson, data: perceptionData, maxWords: 1200 },
  { slug: "build-your-smart-robot", Lesson: BuildLesson, data: buildData },
  { slug: "simulate-before-you-build", Lesson: SimulateLesson, data: simulateData, maxWords: 1200 },
  { slug: "ros2-and-the-robotics-stack", Lesson: RosLesson, data: rosData, maxWords: 1200 },
];

/** Words of theory prose: the #theory section without its figure, SVG text and code blocks. */
function theoryWordCount(container: HTMLElement): number {
  const theory = container.querySelector("#theory");
  if (!theory) return 0;
  const clone = theory.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("figure, svg, pre, h2").forEach((n) => n.remove());
  return (clone.textContent ?? "").split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

describe.each(lessons)("$slug", ({ Lesson, data, maxWords }) => {
  it("renders theory, viz and practice sections", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a static figure and an interactive visualization", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory figure svg")).not.toBeNull();
    const viz = container.querySelector("#viz") as HTMLElement;
    expect(viz.querySelector("svg")).not.toBeNull();
    // real controls: at least one button, slider or switch inside the viz section
    expect(viz.querySelectorAll("button, input").length).toBeGreaterThan(0);
  });

  it("has 700+ words of theory", () => {
    const { container } = render(<Lesson />);
    const words = theoryWordCount(container);
    expect(words).toBeGreaterThanOrEqual(700);
    if (maxWords) expect(words).toBeLessThanOrEqual(maxWords);
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    expect(new Set(data.keyTerms.map((k) => k.term)).size).toBe(data.keyTerms.length);
    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    for (const q of data.interview) expect(q.a.split(/[.!?](\s|$)/).filter((s) => s.trim().length > 0).length).toBeGreaterThanOrEqual(3);
    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of data.quiz) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(40);
    }
    const s = data.scenario;
    for (const field of [s.title, s.context, s.rootCause, s.fix, s.lesson]) {
      expect(field.length).toBeGreaterThan(10);
      expect(field).not.toBe("TODO");
    }
    expect(s.symptoms.length).toBeGreaterThanOrEqual(2);
    expect(s.hints.length).toBeGreaterThanOrEqual(2);
    expect(new Set(s.symptoms).size).toBe(s.symptoms.length);
    expect(new Set(s.hints).size).toBe(s.hints.length);
  });
});

describe("lesson specifics", () => {
  it("build lesson ships the BOM, pin map and full firmware sketch", () => {
    const { container } = render(<BuildLesson />);
    const text = container.textContent ?? "";
    expect(text).toContain("TB6612FNG");
    expect(text).toContain("HC-SR04");
    expect(container.querySelectorAll("table").length).toBeGreaterThanOrEqual(2);
    const code = Array.from(container.querySelectorAll("pre code")).map((c) => c.textContent ?? "").join("\n");
    expect(code).toContain("attachInterrupt");
    expect(code).toContain("class Motor");
    expect(code).toContain("void loop()");
  });

  it("simulation lesson links to the robot simulator lab", () => {
    const { container } = render(<SimulateLesson />);
    expect(container.querySelector('a[href="/labs/robot-sim"]')).not.toBeNull();
  });
});

describe("DiffDriveKinematics", () => {
  it("computes v, ω and the ICC radius from the wheel speeds", () => {
    render(<DiffDriveKinematics />);
    fireEvent.change(screen.getByRole("slider", { name: /left wheel/i }), { target: { value: "10" } });
    fireEvent.change(screen.getByRole("slider", { name: /right wheel/i }), { target: { value: "30" } });
    expect(screen.getByText("v = 20.0 cm/s")).toBeTruthy();
    expect(screen.getByText("ω = 1.67 rad/s")).toBeTruthy();
    expect(screen.getByText("R = 12.0 cm")).toBeTruthy();
  });

  it("reports a straight line and a spin in place", () => {
    render(<DiffDriveKinematics />);
    const left = screen.getByRole("slider", { name: /left wheel/i });
    const right = screen.getByRole("slider", { name: /right wheel/i });
    fireEvent.change(left, { target: { value: "20" } });
    fireEvent.change(right, { target: { value: "20" } });
    expect(screen.getByText("R = ∞ (straight)")).toBeTruthy();
    fireEvent.change(left, { target: { value: "-15" } });
    fireEvent.change(right, { target: { value: "15" } });
    expect(screen.getByText("v = 0.0 cm/s")).toBeTruthy();
    expect(screen.getByText("R = 0.0 cm")).toBeTruthy();
  });

  it("switches to the square calibration test", () => {
    render(<DiffDriveKinematics />);
    fireEvent.click(screen.getByRole("radio", { name: /square test/i }));
    expect(screen.getByText(/leg 1 of 8/i)).toBeTruthy();
  });
});

describe("ArmKinematics", () => {
  it("solves IK for the starting target and flips the elbow", () => {
    render(<ArmKinematics />);
    expect(screen.getByText("θ1 = 60.0°")).toBeTruthy();
    expect(screen.getByText("θ2 = -60.0°")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: /elbow up/i }));
    expect(screen.getByText("θ2 = 60.0°")).toBeTruthy();
    expect(screen.getByText("θ1 = 9.4°")).toBeTruthy();
  });

  it("flags an unreachable target moved with the keyboard", () => {
    render(<ArmKinematics />);
    const svg = screen.getByRole("img", { name: /two-link arm/i });
    for (let i = 0; i < 25; i++) fireEvent.keyDown(svg, { key: "ArrowUp" });
    expect(screen.getByText(/out of reach/i)).toBeTruthy();
  });
});

describe("StateMachine", () => {
  it("walks Idle → Follow → Avoid → Recover → Follow → Idle and ignores invalid events", () => {
    render(<StateMachine />);
    const status = () => screen.getByTestId("fsm-status").textContent;
    expect(status()).toContain("Idle");
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(status()).toContain("Follow");
    fireEvent.click(screen.getByRole("button", { name: /obstacle/i }));
    expect(status()).toContain("Avoid");
    fireEvent.click(screen.getByRole("button", { name: "Line found" }));
    expect(status()).toContain("Avoid");
    expect(screen.getByText(/ignored/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Path clear" }));
    expect(status()).toContain("Recover");
    fireEvent.click(screen.getByRole("button", { name: "Line found" }));
    expect(status()).toContain("Follow");
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(status()).toContain("Idle");
  });
});

describe("WiringDiagram", () => {
  it("shows the signal and pin of a focused wire and filters by view", () => {
    render(<WiringDiagram />);
    const wire = screen.getByRole("button", { name: /left encoder a/i });
    fireEvent.focus(wire);
    const info = screen.getByTestId("wire-info");
    expect(within(info).getByText(/GPIO 18/)).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "Power" }));
    expect(screen.getByRole("radio", { name: "Power" }).getAttribute("aria-checked")).toBe("true");
  });

  it("starts the power-on sequence", () => {
    render(<WiringDiagram />);
    fireEvent.click(screen.getByRole("button", { name: /power on/i }));
    expect(screen.getByTestId("power-step").textContent).toMatch(/switch on/i);
  });
});

describe("ArenaPreview", () => {
  it("switches between the three arenas", () => {
    render(<ArenaPreview />);
    for (const name of ["Open room", "Line track", "Corridor"]) {
      fireEvent.click(screen.getByRole("radio", { name }));
      expect(screen.getByRole("img", { name: new RegExp(name, "i") })).toBeTruthy();
    }
  });
});

describe("RosGraph", () => {
  it("shows message types for a clicked node and flags a QoS mismatch", () => {
    render(<RosGraph />);
    fireEvent.click(screen.getByRole("button", { name: /\/detector/ }));
    expect(screen.getAllByText(/vision_msgs\/msg\/Detection2DArray/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("radio", { name: /reliable/i }));
    expect(screen.getByText(/incompatible qos/i)).toBeTruthy();
  });
});
