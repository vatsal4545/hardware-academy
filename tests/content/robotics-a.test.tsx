import type { ComponentType } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LessonData } from "@/lib/curriculum";
import AnatomyOfARobot from "@/content/robotics/anatomy-of-a-robot";
import anatomyData from "@/content/robotics/anatomy-of-a-robot.data";
import Sensors from "@/content/robotics/sensors";
import sensorsData from "@/content/robotics/sensors.data";
import ActuatorsAndDrivers from "@/content/robotics/actuators-and-drivers";
import actuatorsData from "@/content/robotics/actuators-and-drivers.data";
import MicrocontrollersAndFirmware from "@/content/robotics/microcontrollers-and-firmware";
import firmwareData from "@/content/robotics/microcontrollers-and-firmware.data";
import ControlSystemsAndPid from "@/content/robotics/control-systems-and-pid";
import pidData from "@/content/robotics/control-systems-and-pid.data";
import { stopOutcome } from "@/components/viz/robotics/SenseThinkAct";
import { pingResult } from "@/components/viz/robotics/UltrasonicPing";
import { quadratureChannels, quadratureCount } from "@/components/viz/robotics/QuadratureEncoder";
import { HBridge, bridgeMode } from "@/components/viz/robotics/HBridge";
import { ServoPwm, servoTarget } from "@/components/viz/robotics/ServoPwm";
import { stepperCurrents } from "@/components/viz/robotics/StepperSteps";
import { McuPeripheralMap } from "@/components/viz/robotics/McuPeripheralMap";
import { I2cTransaction, i2cSequence } from "@/components/viz/robotics/I2cTransaction";
import { PidTuner, runTuner } from "@/components/viz/robotics/PidTuner";

afterEach(cleanup);

const lessons: Array<[string, ComponentType, LessonData]> = [
  ["anatomy-of-a-robot", AnatomyOfARobot, anatomyData],
  ["sensors", Sensors, sensorsData],
  ["actuators-and-drivers", ActuatorsAndDrivers, actuatorsData],
  ["microcontrollers-and-firmware", MicrocontrollersAndFirmware, firmwareData],
  ["control-systems-and-pid", ControlSystemsAndPid, pidData],
];

/** Words in the theory section, not counting text drawn inside SVG figures. */
function theoryWordCount(theory: Element): number {
  const copy = theory.cloneNode(true) as Element;
  copy.querySelectorAll("svg").forEach((svg) => svg.remove());
  return (copy.textContent ?? "").split(/\s+/).filter(Boolean).length;
}

describe.each(lessons)("%s", (_slug, Lesson, data) => {
  it("renders theory, viz and practice sections", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory")).not.toBeNull();
    expect(container.querySelector("#viz")).not.toBeNull();
    expect(container.querySelector("#practice")).not.toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("has a static figure in theory and interactive controls in viz", () => {
    const { container } = render(<Lesson />);
    expect(container.querySelector("#theory figure svg")).not.toBeNull();
    const viz = container.querySelector("#viz");
    expect(viz).not.toBeNull();
    expect(viz?.querySelector("svg") ?? null).not.toBeNull();
    expect(viz?.querySelectorAll("button, input").length ?? 0).toBeGreaterThan(0);
  });

  it("has 700-1200 words of theory", () => {
    const { container } = render(<Lesson />);
    const theory = container.querySelector("#theory");
    expect(theory).not.toBeNull();
    const words = theoryWordCount(theory as Element);
    expect(words).toBeGreaterThanOrEqual(700);
    expect(words).toBeLessThanOrEqual(1200);
  });

  it("has a code or worked-calculation listing in practice", () => {
    const { container } = render(<Lesson />);
    const practice = container.querySelector("#practice");
    expect(practice).not.toBeNull();
    expect(practice?.querySelector("pre code") ?? null).not.toBeNull();
  });

  it("has complete lesson data", () => {
    expect(data.keyTerms.length).toBeGreaterThanOrEqual(5);
    for (const k of data.keyTerms) {
      expect(k.term.length).toBeGreaterThan(1);
      expect(k.def.length).toBeGreaterThan(20);
    }
    const s = data.scenario;
    for (const field of [s.title, s.context, s.rootCause, s.fix, s.lesson]) {
      expect(field).not.toBe("TODO");
      expect(field.length).toBeGreaterThan(10);
    }
    expect(s.symptoms.length).toBeGreaterThanOrEqual(2);
    expect(s.hints.length).toBeGreaterThanOrEqual(2);
    expect(data.interview.length).toBeGreaterThanOrEqual(4);
    expect(data.interview.some((q) => q.level === "deep")).toBe(true);
    for (const q of data.interview) expect(q.a.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(3);
    expect(data.quiz.length).toBeGreaterThanOrEqual(5);
    for (const q of data.quiz) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(q.explain.length).toBeGreaterThan(40);
    }
  });
});

describe("robotics-a visualizations", () => {
  it("SenseThinkAct: a 20 Hz loop at 0.5 m/s can step over 19 mm tape", () => {
    const seen = stopOutcome(0.5, 20, 0.3);
    expect(seen.cycleMm).toBeCloseTo(25);
    expect(seen.seen).toBe(true);
    expect(seen.stopMm - 400).toBeCloseTo(74.2, 1);
    expect(stopOutcome(0.5, 20, 0.8).seen).toBe(false);
    expect(stopOutcome(0.5, 100, 0.8).seen).toBe(true);
    expect(stopOutcome(1, 1000, 0.5).brakingMm).toBeCloseTo(166.7, 1);
  });

  it("UltrasonicPing: echo time follows d = t·c/2 and a tilted wall loses the echo", () => {
    const square = pingResult(100, 0, 20);
    expect(square.received).toBe(true);
    expect(square.echoUs ?? 0).toBeCloseTo((2 / 343.42) * 1e6, -1);
    expect(pingResult(100, 10, 20).received).toBe(true);
    expect(pingResult(100, 10, 20).perpCm).toBeCloseTo(98.48, 1);
    expect(pingResult(100, 20, 20).received).toBe(false);
    expect(pingResult(380, 0, 0).firmwareCm ?? 0).toBeCloseTo(393.4, 0);
  });

  it("QuadratureEncoder: A leads B going forward and x4 decoding counts 28 per motor turn", () => {
    const states = [0.125, 0.375, 0.625, 0.875].map((e) => {
      const c = quadratureChannels(e / 7);
      return `${c.a}${c.b}`;
    });
    expect(states).toEqual(["10", "11", "01", "00"]);
    expect(quadratureCount(1 + 1 / 56, "x4")).toBe(28);
    expect(quadratureCount(1 + 1 / 56, "x1")).toBe(7);
  });

  it("HBridge: closing Q1 and Q2 together raises a shoot-through alarm", () => {
    expect(bridgeMode([true, false, false, true])).toBe("forward");
    expect(bridgeMode([false, true, true, false])).toBe("reverse");
    expect(bridgeMode([false, true, false, true])).toBe("brake-low");
    render(<HBridge />);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Q2/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/shoot-through/i);
    fireEvent.click(screen.getByRole("button", { name: "Coast" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ServoPwm and StepperSteps map commands to positions", () => {
    expect(servoTarget(1.5, "nominal").angle).toBeCloseTo(90);
    expect(servoTarget(2.3, "nominal").beyond).toBe(true);
    expect(servoTarget(0.5, "sg90").angle).toBeCloseTo(0);
    const home = stepperCurrents(0, 1);
    expect(home.ia).toBeCloseTo(Math.SQRT1_2);
    expect(home.ib).toBeCloseTo(Math.SQRT1_2);
    expect(stepperCurrents(1, 2).electricalDeg).toBe(90);
    render(<ServoPwm />);
    fireEvent.change(screen.getByRole("slider", { name: /pulse width/i }), { target: { value: "2.3" } });
    expect(screen.getByRole("alert").textContent).toMatch(/end stop/i);
  });

  it("McuPeripheralMap shows the details of the clicked peripheral", () => {
    render(<McuPeripheralMap />);
    fireEvent.click(screen.getByRole("button", { name: /^I2C/ }));
    expect(screen.getByText(/MPU-6050 IMU at 0x68/)).toBeTruthy();
  });

  it("I2cTransaction builds the MPU-6050 write, read and missing-device sequences", () => {
    const write = i2cSequence("write", false);
    expect(write).toHaveLength(29);
    expect(write.slice(1, 9).map((s) => s.level).join("")).toBe("11010000");
    const read = i2cSequence("read", false);
    expect(read.some((s) => s.kind === "Sr")).toBe(true);
    expect(read.filter((s) => s.by === "slave" && s.kind === "bit").map((s) => s.level).join("")).toBe("01101000");
    const missing = i2cSequence("write", true);
    expect(missing[9].kind).toBe("nack");
    expect(missing[missing.length - 1].kind).toBe("P");
    render(<I2cTransaction />);
    expect(screen.getByRole("img", { name: /SDA and SCL/ })).toBeTruthy();
  });

  it("PidTuner plots simulatePid and its readouts follow the gains", () => {
    const pOnly = runTuner(2, 0, 0, 100, false).result;
    expect(pOnly.steadyStateError / 0.5).toBeCloseTo(1 / 3, 2);
    const tuned = runTuner(2, 8, 0, 100, false).result;
    expect(tuned.overshootPct).toBeLessThan(10);
    expect(tuned.settlingTime ?? Infinity).toBeLessThan(1);
    render(<PidTuner />);
    expect(screen.getByTestId("pid-sse").textContent).toMatch(/33\.3%/);
    fireEvent.click(screen.getByRole("button", { name: "PI, tuned" }));
    expect(screen.getByTestId("pid-overshoot").textContent).toBe("0.5%");
    expect(screen.getByTestId("pid-settling").textContent).toBe("0.47 s");
    fireEvent.change(screen.getByRole("slider", { name: /^Kp/ }), { target: { value: "5" } });
    expect(screen.getByTestId("pid-overshoot").textContent).not.toBe("0.5%");
  });

  it("the PID lesson links to the PID lab instead of importing it", () => {
    const { container } = render(<ControlSystemsAndPid />);
    expect(container.querySelector('a[href="/labs/pid"]')).not.toBeNull();
  });
});
