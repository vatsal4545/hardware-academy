import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { BoardTopView, flowPathsFor } from "@/components/viz/pcb/BoardInAction.view";
import { StationPanel } from "@/components/viz/pcb/BoardInAction.panels";
import { BOARD_SPEED_CAP, BoardInAction } from "@/components/viz/pcb/BoardInAction";
import type { ReactElement } from "react";
import type { RenderResult } from "@testing-library/react";
import { dotCount } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { RightHandRule, RightHandRuleFigure } from "@/components/viz/pcb/RightHandRule";
import { parts, partBox, nets, connectorPins, dist } from "@/components/viz/pcb/SchematicToLayoutBoard";
import { allNets, allParts, FLOW_DOT_SPACING_PX, IO35_PAD, PART_ROLES, revBNets, revBParts, STATIONS } from "@/components/viz/pcb/BoardInAction.board";
import { BOARD_DEFAULTS, boardModel, TEST_POINT_IDS, type TestPointId } from "@/lib/sim/board";
import { meterReading, nextProbes, NO_PROBES, TEST_POINTS } from "@/components/viz/pcb/BoardInAction.meter";

const overlaps = (a: ReturnType<typeof partBox>, b: ReturnType<typeof partBox>) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe("Rev B board data", () => {
  it("adds R4, R5 and C9 without overlapping any existing part", () => {
    expect(revBParts.map((p) => p.ref)).toEqual(["R4", "R5", "C9"]);
    for (const p of revBParts) for (const q of parts) expect(overlaps(partBox(p), partBox(q)), `${p.ref} vs ${q.ref}`).toBe(false);
    expect(allParts).toHaveLength(parts.length + 3);
    expect(allNets).toHaveLength(nets.length + revBNets.length);
  });

  it("the divider nets start on the VM trace and end on the IO35 pad", () => {
    const feed = revBNets.find((n) => n.id === "VBAT_SENSE_FEED")!;
    expect(feed.routes[0].pts[0]).toEqual([15.0, 26.75]);
    const node = revBNets.find((n) => n.id === "VBAT_SENSE")!;
    expect(node.taps.some((t) => t.ref === "U1" && t.pin === "IO35")).toBe(true);
    expect(node.routes.some((r) => r.pts[r.pts.length - 1][0] === IO35_PAD[0] && r.pts[r.pts.length - 1][1] === IO35_PAD[1])).toBe(true);
  });

  it("every station names real parts and real nets, in the lesson's order", () => {
    const refs = new Set(allParts.map((p) => p.ref));
    const netIds = new Set(allNets.map((n) => n.id));
    expect(STATIONS.map((s) => s.id)).toEqual(["fet", "kcl", "ldo", "led", "divider", "en", "decoupling", "winding"]);
    for (const s of STATIONS) {
      for (const r of s.parts) expect(refs.has(r), `${s.id}: ${r}`).toBe(true);
      for (const n of s.nets) expect(netIds.has(n), `${s.id}: ${n}`).toBe(true);
      expect(s.controls.length).toBeGreaterThan(0);
      expect(s.flows.length).toBeGreaterThan(0);
    }
  });

  it("every part except the mounting holes has a role with readings that are real numbers", () => {
    const m = boardModel(BOARD_DEFAULTS);
    const expected = allParts.filter((p) => p.kind !== "hole").map((p) => p.ref).sort();
    expect(expected).toHaveLength(28);
    expect(Object.keys(PART_ROLES).sort()).toEqual(expected);
    for (const [ref, role] of Object.entries(PART_ROLES)) {
      expect(role.role.length, ref).toBeGreaterThan(20);
      const readings = role.readings(m, BOARD_DEFAULTS);
      expect(readings.length, ref).toBeGreaterThan(0);
      for (const r of readings) expect(r.value, `${ref}: ${r.label}`).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it("leaves the shared board data untouched (J1 still has two pins, 29 parts)", () => {
    expect(connectorPins(parts.find((p) => p.ref === "J1")!)).toHaveLength(2);
    expect(parts).toHaveLength(29);
  });
});

describe("RightHandRule", () => {
  afterEach(cleanup);

  it("draws the coil with field lines, a thumb and labels, and mirrors when the current reverses", () => {
    const fwd = render(
      <svg>
        <RightHandRule variant="coil" forward />
      </svg>,
    ).container.innerHTML;
    cleanup();
    const rev = render(
      <svg>
        <RightHandRule variant="coil" forward={false} />
      </svg>,
    ).container.innerHTML;
    expect(fwd).toContain("thumb: field");
    expect(fwd).toContain("fingers: current");
    expect(fwd).not.toBe(rev);
    expect(fwd).not.toMatch(/NaN/);
    expect(rev).not.toMatch(/NaN/);
  });

  it("the trace variant swaps the roles of thumb and fingers", () => {
    const { container } = render(
      <svg>
        <RightHandRule variant="trace" forward />
      </svg>,
    );
    expect(container.textContent).toContain("thumb: current");
    expect(container.textContent).toContain("fingers: field");
  });

  it("the figure is a labelled image with both variants", () => {
    const { container } = render(<RightHandRuleFigure />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("img");
    expect(container.textContent).toContain("thumb: current");
    expect(container.textContent).toContain("thumb: field");
    expect(container.querySelectorAll("text").length).toBeGreaterThan(6);
  });
});

describe("BoardTopView", () => {
  afterEach(cleanup);
  const station = STATIONS[0];
  const paths = flowPathsFor(station, true);
  const noop = () => {};

  it("is a group with 28 part buttons, lights the station's parts and names them for a screen reader", () => {
    const { container } = render(<BoardTopView station={station} phases={paths.map(() => 0)} flowPaths={paths} selected={null} onSelect={noop} forward probes={NO_PROBES} onProbe={noop} onClearProbes={noop} meterOn={false} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("group");
    expect(svg.querySelectorAll('[role="button"][data-part]')).toHaveLength(28);
    expect(svg.querySelectorAll('[role="button"][data-test-point]')).toHaveLength(12);
    expect(container.querySelectorAll('[data-part][data-lit="true"]')).toHaveLength(station.parts.length);
    expect(screen.getByRole("button", { name: "Inspect Q1, AO3401A" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect R4, 100 k" })).toBeTruthy();
    for (const b of Array.from(svg.querySelectorAll('[role="button"]'))) expect(b.getAttribute("tabindex")).toBe("0");
  });

  it("draws the station's flows as evenly spaced dots along the copper", () => {
    const { container } = render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={noop} forward probes={NO_PROBES} onProbe={noop} onClearProbes={noop} meterOn={false} />);
    expect(container.querySelectorAll('[data-flow="pack"] circle')).toHaveLength(dotCount(paths[0].length, FLOW_DOT_SPACING_PX));
  });

  it("marks the station's nets bright and leaves the others dim", () => {
    const { container } = render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={noop} forward probes={NO_PROBES} onProbe={noop} onClearProbes={noop} meterOn={false} />);
    expect(container.querySelectorAll('[data-net="VM"][data-lit="true"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-net="PWMA"][data-lit="false"]').length).toBeGreaterThan(0);
  });

  it("selects a part by click, by Enter and by Space, and shows which part is selected", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={onSelect} forward probes={NO_PROBES} onProbe={noop} onClearProbes={noop} meterOn={false} />);
    fireEvent.click(screen.getByRole("button", { name: /Inspect R3/ }));
    expect(onSelect).toHaveBeenLastCalledWith("R3");
    fireEvent.keyDown(screen.getByRole("button", { name: /Inspect U3/ }), { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("U3");
    fireEvent.keyDown(screen.getByRole("button", { name: /Inspect C9/ }), { key: " " });
    expect(onSelect).toHaveBeenLastCalledWith("C9");
    rerender(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected="R3" onSelect={onSelect} forward probes={NO_PROBES} onProbe={noop} onClearProbes={noop} meterOn={false} />);
    expect(screen.getByRole("button", { name: /Inspect R3/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Inspect U3/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("the winding flows reverse their geometry with the direction", () => {
    const w = STATIONS.find((s) => s.id === "winding")!;
    const f = flowPathsFor(w, true)[0].at(0);
    const r = flowPathsFor(w, false)[0].at(0);
    expect(f).not.toEqual(r);
    expect(flowPathsFor(w, true)[0].length).toBeCloseTo(flowPathsFor(w, false)[1].length, 6);
  });

  it("every flow in every station has at least two dots and no NaN coordinate", () => {
    for (const s of STATIONS) {
      const ps = flowPathsFor(s, true);
      expect(ps).toHaveLength(s.flows.length);
      const { container } = render(<BoardTopView station={s} phases={ps.map(() => 0.3)} flowPaths={ps} selected={null} onSelect={noop} forward probes={NO_PROBES} onProbe={noop} onClearProbes={noop} meterOn={false} />);
      for (const flow of s.flows) expect(container.querySelectorAll(`[data-flow="${flow.id}"] circle`).length).toBeGreaterThanOrEqual(2);
      expect(container.innerHTML).not.toMatch(/NaN/);
      cleanup();
    }
  });
});

/** Text of the <dd> that follows the <dt> with this exact label. */
function readout(container: HTMLElement, label: string): string {
  const dt = Array.from(container.querySelectorAll("dt")).find((n) => n.textContent === label);
  if (!dt) throw new Error(`no readout labelled "${label}"`);
  return dt.nextElementSibling?.textContent ?? "";
}
const byId = (id: string) => STATIONS.find((s) => s.id === id)!;

describe("StationPanel", () => {
  afterEach(cleanup);
  const noop = () => {};
  const panel = (id: string, inputs = BOARD_DEFAULTS, onChange: (p: object) => void = noop) =>
    render(<StationPanel station={byId(id)} model={boardModel(inputs)} inputs={inputs} onChange={onChange} />);

  it("fet: shows the pack current and the drop across Q1, with the two motor sliders", () => {
    const { container } = panel("fet");
    expect(readout(container, "Pack current")).toBe("1.155 A");
    expect(readout(container, "Drop across Q1  V = I · R")).toBe("57.75 mV");
    expect(readout(container, "Heat in Q1  P = I² · R")).toBe("66.7 mW");
    expect(readout(container, "Drop along 13 mm of VM trace")).toBe("4.80 mV");
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(2);
    expect(container.querySelector("svg")?.getAttribute("role")).toBe("img");
  });

  it("kcl: the sum check closes and the droop figure is there", () => {
    const { container } = panel("kcl");
    expect(readout(container, "Sum check  KCL")).toBe("1.155 A = 1.000 A + 0.155 A");
    expect(readout(container, "Bulk capacitor droop at start")).toBe("150 mV");
    expect(container.querySelectorAll('input[type="range"]')).toHaveLength(3);
  });

  it("ldo: heat, junction temperature and the buck comparison", () => {
    const { container } = panel("ldo", { ...BOARD_DEFAULTS, vPack: 8.4 });
    expect(readout(container, "Heat  P = (Vin − Vout) · I")).toBe("807 mW");
    expect(readout(container, "Junction temperature")).toBe("73 °C");
    expect(readout(container, "Verdict")).toBe("Fine");
    expect(readout(container, "Same job with a 5 V buck")).toBe("55 mW");
  });

  it("led: red through 1 k is 1.3 mA and the loop sums to zero; blue is dim", () => {
    const { container } = panel("led");
    expect(readout(container, "LED current")).toBe("1.3 mA");
    expect(readout(container, "Loop  +3.3 − I·R − Vf")).toBe("+3.30 − 1.30 − 2.00 = 0 V");
    cleanup();
    const { container: c2 } = panel("led", { ...BOARD_DEFAULTS, ledColor: "blue" });
    expect(readout(c2, "LED current")).toBe("300 µA");
    expect(readout(c2, "Verdict")).toBe("Dim: raise Vcc or lower R");
  });

  it("divider: 7.4 V reads 2.366 V behind 32 kΩ; without C9 the verdict changes", () => {
    const { container } = panel("divider");
    expect(readout(container, "ADC pin voltage")).toBe("2.366 V");
    expect(readout(container, "Thevenin resistance  R1 ∥ R2")).toBe("32 kΩ");
    expect(readout(container, "ADC reading (12-bit)")).toBe("2936 counts");
    expect(readout(container, "Verdict")).toBe("Capacitor supplies the sample");
    cleanup();
    const { container: c2 } = panel("divider", { ...BOARD_DEFAULTS, dividerCap: false });
    expect(readout(c2, "Verdict")).toBe("Reads low: 32 kΩ is too stiff for the ADC");
  });

  it("en: τ = 10 ms and 13.9 ms to the threshold, with the curve drawn", () => {
    const { container } = panel("en");
    expect(readout(container, "Time constant  τ = R · C")).toBe("10 ms");
    expect(readout(container, "EN crosses 0.75 × VDD at")).toBe("13.9 ms");
    expect(readout(container, "5τ (fully charged)")).toBe("50 ms");
    expect(container.querySelector("path[data-curve]")).not.toBeNull();
  });

  it("decoupling and winding readouts", () => {
    const { container } = panel("decoupling");
    expect(readout(container, "Loop inductance")).toBe("2.5 nH");
    expect(readout(container, "Rail dip  V = L · di/dt")).toBe("62.5 mV");
    expect(readout(container, "Verdict")).toBe("Inside 5% of the rail");
    cleanup();
    const { container: c2 } = panel("winding");
    expect(readout(c2, "Average motor voltage  D · VM")).toBe("4.44 V");
    expect(readout(c2, "Field 5 mm from the trace")).toBe("20 µT");
    expect(readout(c2, "PWM ripple  ΔI")).toBe("88.8 mA");
    expect(readout(c2, "Flyback without a path")).toBe("10 kV");
    expect(readout(c2, "Clamped by the body diode")).toBe("8.10 V");
    expect(c2.textContent).toContain("thumb: field");
  });

  it("controls call onChange with a patch", () => {
    const onChange = vi.fn();
    panel("led", BOARD_DEFAULTS, onChange);
    fireEvent.click(screen.getByRole("radio", { name: "Blue, 3.0 V" }));
    expect(onChange).toHaveBeenCalledWith({ ledColor: "blue" });
    fireEvent.click(screen.getByRole("radio", { name: "220 Ω" }));
    expect(onChange).toHaveBeenCalledWith({ ledR: 220 });
    cleanup();
    const onChange2 = vi.fn();
    panel("kcl", BOARD_DEFAULTS, onChange2);
    fireEvent.change(screen.getByRole("slider", { name: /Logic current/ }), { target: { value: "300" } });
    expect(onChange2).toHaveBeenCalledWith({ iLogic: 0.3 });
    cleanup();
    const onChange3 = vi.fn();
    panel("winding", BOARD_DEFAULTS, onChange3);
    fireEvent.click(screen.getByRole("radio", { name: "Reverse" }));
    expect(onChange3).toHaveBeenCalledWith({ forward: false });
    fireEvent.change(screen.getByRole("slider", { name: /PWM duty/ }), { target: { value: "25" } });
    expect(onChange3).toHaveBeenCalledWith({ duty: 0.25 });
  });
});

describe("BoardInAction", () => {
  afterEach(cleanup);

  it("starts at station 1 and walks all eight with Next", () => {
    render(<BoardInAction />);
    expect(screen.getByText("Step 1 / 8")).toBeTruthy();
    for (let k = 2; k <= 8; k++) {
      fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
      expect(screen.getByText(`Step ${k} / 8`)).toBeTruthy();
    }
    expect((screen.getByRole("button", { name: /^Next$/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("the left-motor slider changes the pack current, and the change survives moving to the KCL station", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.change(screen.getByRole("slider", { name: /Left motor current/ }), { target: { value: "1.5" } });
    expect(readout(container, "Pack current")).toBe("2.155 A");
    fireEvent.click(screen.getByRole("button", { name: /Go to step 2/ }));
    expect(readout(container, "Into the node (pack)")).toBe("2.155 A");
    expect(container.querySelectorAll('[data-part][data-lit="true"]')).toHaveLength(5);
  });

  it("probe mode: clicking a part shows its role and offers its station; Escape and Close clear it", () => {
    const { container } = render(<BoardInAction />);
    expect(container.querySelector("[data-probe-card]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Inspect R3/ }));
    const card = container.querySelector("[data-probe-card]")!;
    expect(card.textContent).toContain("sets the LED current");
    expect(readout(card as HTMLElement, "Current  (3.3 − Vf) / R")).toBe("1.3 mA");
    fireEvent.click(screen.getByRole("button", { name: /Go to station 4/ }));
    expect(screen.getByText("Step 4 / 8")).toBeTruthy();
    fireEvent.keyDown(container.querySelector("[data-probe-card]")!, { key: "Escape" });
    expect(container.querySelector("[data-probe-card]")).toBeNull();
    fireEvent.keyDown(screen.getByRole("button", { name: /Inspect U3/ }), { key: " " });
    expect(container.querySelector("[data-probe-card]")?.textContent).toContain("AMS1117-3.3 linear regulator");
    fireEvent.click(screen.getByRole("button", { name: /^Close$/ }));
    expect(container.querySelector("[data-probe-card]")).toBeNull();
  });

  it("the probe readings follow the sliders", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.click(screen.getByRole("button", { name: /Inspect Q1/ }));
    expect(readout(container.querySelector("[data-probe-card]") as HTMLElement, "Drop  V = I · R")).toBe("57.75 mV");
    fireEvent.change(screen.getByRole("slider", { name: /Right motor current/ }), { target: { value: "1.5" } });
    expect(readout(container.querySelector("[data-probe-card]") as HTMLElement, "Drop  V = I · R")).toBe("107.75 mV");
  });

  it("the frame-safe cap keeps one 60 Hz frame under half a dot spacing on every flow", () => {
    const lengths = STATIONS.flatMap((s) => flowPathsFor(s, true).map((p) => p.length));
    for (const length of lengths) {
      const spacing = length / dotCount(length, FLOW_DOT_SPACING_PX);
      expect(BOARD_SPEED_CAP / 60).toBeLessThan(spacing / 2);
    }
  });
});

describe("multimeter test points", () => {
  it("has one pad per node, inside the board outline and at least 1 mm from every other pad", () => {
    expect(TEST_POINTS.map((t) => t.id)).toEqual([...TEST_POINT_IDS]);
    for (const t of TEST_POINTS) {
      expect(t.at[0], t.id).toBeGreaterThan(0);
      expect(t.at[0], t.id).toBeLessThan(60);
      expect(t.at[1], t.id).toBeGreaterThan(0);
      expect(t.at[1], t.id).toBeLessThan(40);
      expect(t.name.length, t.id).toBeGreaterThan(1);
      for (const u of TEST_POINTS) if (u !== t) expect(dist(t.at[0], t.at[1], u.at[0], u.at[1]), `${t.id} vs ${u.id}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("probe rule: the first pad is black, the second red, a third moves red, and a held pad lifts its probe", () => {
    let p = nextProbes(NO_PROBES, "GND");
    expect(p).toEqual({ black: "GND", red: null });
    p = nextProbes(p, "VM");
    expect(p).toEqual({ black: "GND", red: "VM" });
    p = nextProbes(p, "3V3");
    expect(p).toEqual({ black: "GND", red: "3V3" });
    p = nextProbes(p, "GND");
    expect(p).toEqual({ black: null, red: "3V3" });
    p = nextProbes(p, "EN");
    expect(p).toEqual({ black: "EN", red: "3V3" });
    p = nextProbes(p, "3V3");
    expect(p).toEqual({ black: "EN", red: null });
  });

  it("meterReading is V(red) − V(black), autoranged like a meter, with the law behind the number", () => {
    const m = boardModel(BOARD_DEFAULTS);
    const read = (black: TestPointId, red: TestPointId, inputs = BOARD_DEFAULTS) => meterReading(black, red, boardModel(inputs), inputs);
    expect(read("GND", "VM").display).toBe("7.34 V");
    expect(read("GND", "VM").law).toContain("Ohm's law on the FET");
    expect(read("VM", "VBAT").display).toBe("57.8 mV");
    expect(read("VM", "VBAT").law).toContain("1.155 A × 50 mΩ");
    expect(read("VBAT", "VM").display).toBe("−57.8 mV");
    expect(read("VBAT", "VM").law).toContain("red probe");
    expect(read("D1_K", "D1_A").display).toBe("2.00 V");
    expect(read("D1_K", "D1_A").law).toContain("KVL: 3.30 − 1.30 − 2.00 = 0 across the LED loop");
    expect(read("D1_A", "IO13").display).toBe("1.30 V");
    expect(read("D1_A", "IO13").law).toContain("Ohm's law on R3");
    expect(read("GND", "VBAT_SENSE").display).toBe("2.37 V");
    expect(read("GND", "VBAT_SENSE").law).toContain("47 k / 147 k");
    expect(read("M1B", "M1A").display).toBe("4.41 V");
    expect(read("M1B", "M1A").law).toContain("0.60 × 7.34");
    expect(read("EN", "3V3").display).toBe("0.00 V");
    expect(read("EN", "3V3").law).toContain("I = 0");
    expect(read("VM", "3V3").law).toContain("P = (Vin − Vout) · I");
    expect(read("GND", "3V3", { ...BOARD_DEFAULTS, vPack: 8.4 }).display).toBe("3.30 V");
    expect(read("EN", "VBAT_SENSE").law).toContain("difference");
    expect(m.fet.iPack).toBeCloseTo(1.155, 9);
  });
});

describe("BoardTopView test pads", () => {
  afterEach(cleanup);
  const station = STATIONS[0];
  const paths = flowPathsFor(station, true);
  const noop = () => {};
  const pad = (name: string) => screen.getByRole("button", { name: `Test point ${name}` });

  it("draws twelve labelled pads that place a probe by click, Enter and Space, and lift them with Escape", () => {
    const onProbe = vi.fn();
    const onClearProbes = vi.fn();
    const { container } = render(
      <BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={noop} forward probes={NO_PROBES} onProbe={onProbe} onClearProbes={onClearProbes} meterOn />,
    );
    expect(container.querySelectorAll('[role="button"][data-test-point]')).toHaveLength(12);
    expect(container.querySelectorAll('[role="button"][data-part]')).toHaveLength(28);
    expect(container.textContent).toContain("VBAT_SENSE");
    fireEvent.click(pad("VM"));
    expect(onProbe).toHaveBeenLastCalledWith("VM");
    fireEvent.keyDown(pad("GND"), { key: "Enter" });
    expect(onProbe).toHaveBeenLastCalledWith("GND");
    fireEvent.keyDown(pad("3V3"), { key: " " });
    expect(onProbe).toHaveBeenLastCalledWith("3V3");
    expect(onClearProbes).not.toHaveBeenCalled();
    fireEvent.keyDown(pad("3V3"), { key: "Escape" });
    expect(onClearProbes).toHaveBeenCalledTimes(1);
  });

  it("marks the pads that hold the black and the red probe", () => {
    render(
      <BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={noop} forward probes={{ black: "GND", red: "VM" }} onProbe={noop} onClearProbes={noop} meterOn />,
    );
    expect(pad("GND").getAttribute("data-probe")).toBe("black");
    expect(pad("GND").getAttribute("aria-pressed")).toBe("true");
    expect(pad("VM").getAttribute("data-probe")).toBe("red");
    expect(pad("3V3").getAttribute("data-probe")).toBeNull();
    expect(pad("3V3").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("BoardInAction multimeter", () => {
  afterEach(cleanup);
  const pad = (name: string) => screen.getByRole("button", { name: `Test point ${name}` });
  const meterSwitch = () => screen.getByRole("switch", { name: "Multimeter" });
  const meter = (c: HTMLElement) => c.querySelector("[data-meter]") as HTMLElement | null;
  const READING = "Reading  V(red) − V(black)";

  it("is off until the Multimeter switch is on; then it asks for the black probe first", () => {
    const { container } = render(<BoardInAction />);
    expect(meter(container)).toBeNull();
    expect(meterSwitch().getAttribute("aria-checked")).toBe("false");
    fireEvent.click(meterSwitch());
    expect(meterSwitch().getAttribute("aria-checked")).toBe("true");
    expect(meter(container)?.textContent).toContain("black probe");
  });

  it("GND then VM by click reads 7.34 V, the pack minus Q1's drop, and follows the sliders", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.click(meterSwitch());
    fireEvent.click(pad("GND"));
    expect(pad("GND").getAttribute("data-probe")).toBe("black");
    expect(meter(container)!.textContent).toContain("red probe");
    fireEvent.click(pad("VM"));
    const card = meter(container)!;
    expect(readout(card, "Black probe (COM)")).toBe("GND");
    expect(readout(card, "Red probe")).toBe("VM");
    expect(readout(card, READING)).toBe("7.34 V");
    expect(card.textContent).toContain("Ohm's law on the FET");
    fireEvent.change(screen.getByRole("slider", { name: /Left motor current/ }), { target: { value: "1.5" } });
    expect(readout(meter(container)!, READING)).toBe("7.29 V");
    fireEvent.click(pad("VBAT"));
    expect(readout(meter(container)!, "Red probe")).toBe("VBAT");
    expect(readout(meter(container)!, READING)).toBe("7.40 V");
  });

  it("the LED cathode to anode by keyboard reads the forward voltage and names KVL", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.click(meterSwitch());
    fireEvent.keyDown(pad("D1 cathode (K)"), { key: "Enter" });
    fireEvent.keyDown(pad("D1 anode (A)"), { key: " " });
    const card = meter(container)!;
    expect(readout(card, READING)).toBe("2.00 V");
    expect(card.textContent).toContain("KVL: 3.30 − 1.30 − 2.00 = 0 across the LED loop");
  });

  it("Escape on a pad, Escape on the meter and the Clear button all lift both probes", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.click(meterSwitch());
    const place = () => {
      fireEvent.click(pad("GND"));
      fireEvent.click(pad("VM"));
      expect(readout(meter(container)!, READING)).toBe("7.34 V");
    };
    const lifted = () => {
      expect(pad("GND").getAttribute("data-probe")).toBeNull();
      expect(pad("VM").getAttribute("data-probe")).toBeNull();
      expect(meter(container)!.textContent).toContain("black probe");
    };
    place();
    fireEvent.keyDown(pad("VM"), { key: "Escape" });
    lifted();
    place();
    fireEvent.keyDown(meter(container)!, { key: "Escape" });
    lifted();
    place();
    fireEvent.click(screen.getByRole("button", { name: /^Clear/ }));
    lifted();
    expect(meterSwitch().getAttribute("aria-checked")).toBe("true");
  });

  it("the meter and the part card do not fight: a pad never opens the card, a part never moves a probe", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.click(meterSwitch());
    fireEvent.click(pad("GND"));
    expect(container.querySelector("[data-probe-card]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Inspect Q1/ }));
    expect(container.querySelector("[data-probe-card]")).not.toBeNull();
    expect(pad("GND").getAttribute("data-probe")).toBe("black");
    expect(container.querySelectorAll('[data-probe="red"]')).toHaveLength(0);
    fireEvent.click(pad("VM"));
    expect(readout(meter(container)!, READING)).toBe("7.34 V");
    expect(container.querySelector("[data-probe-card]")).not.toBeNull();
  });

  it("a pad clicked while the meter is off switches it on and takes the black probe; switching off lifts the probes", () => {
    const { container } = render(<BoardInAction />);
    fireEvent.click(pad("VM"));
    expect(meterSwitch().getAttribute("aria-checked")).toBe("true");
    expect(pad("VM").getAttribute("data-probe")).toBe("black");
    fireEvent.click(meterSwitch());
    expect(meter(container)).toBeNull();
    expect(pad("VM").getAttribute("data-probe")).toBeNull();
  });
});

// Same approach as tests/content/pcb-a.test.tsx: render a state with and without the transcendental functions nudged
// by one part in 10^14 and require identical markup.
const NUDGE_FUNCS = ["sin", "cos", "tan", "atan2", "atan", "asin", "acos", "exp", "log", "log10", "sqrt", "pow", "hypot", "cbrt"] as const;

function withNudgedMath<T>(fn: () => T): T {
  const saved: Array<[string, (...args: number[]) => number]> = [];
  for (const name of NUDGE_FUNCS) {
    const original = Math[name] as (...args: number[]) => number;
    saved.push([name, original]);
    (Math as unknown as Record<string, unknown>)[name] = (...args: number[]) => {
      const v = original(...args);
      return v === 0 || !Number.isFinite(v) ? v : v * (1 + 1e-14);
    };
  }
  try {
    return fn();
  } finally {
    for (const [name, original] of saved) (Math as unknown as Record<string, unknown>)[name] = original;
  }
}

function markupAfter(ui: ReactElement, drive: (utils: RenderResult) => void): string {
  const utils = render(ui);
  drive(utils);
  // useId values differ between two client renders in one test (they never differ between server and client), and the
  // keep-out hatch refers to its pattern id through fill="url(#id)", so both forms are neutralised.
  const html = utils.container.innerHTML.replace(/\b(id|for|aria-labelledby|aria-describedby)="[^"]*"/g, '$1=""').replace(/url\(#[^)]*\)/g, "url(#)");
  cleanup();
  return html;
}

describe("BoardInAction hydration stability", () => {
  const go = (n: number) => fireEvent.click(screen.getByRole("button", { name: new RegExp(`Go to step ${n}`) }));
  const drive: Array<[string, (utils: RenderResult) => void]> = [
    ["default", () => {}],
    ["station 5 without C9", () => (go(5), fireEvent.click(screen.getByRole("switch", { name: /C9/ })))],
    ["station 8 reversed at 1.5 A", ({ container }) => (go(8), fireEvent.click(screen.getByRole("radio", { name: "Reverse" })), fireEvent.change(container.querySelector('input[type="range"]')!, { target: { value: "25" } }))],
    ["station 6 with 10 µF", () => (go(6), fireEvent.click(screen.getByRole("radio", { name: "10 µF" })))],
    ["meter on at station 3, black on GND, red on VM, then the LED pair", () => (go(3), fireEvent.click(screen.getByRole("switch", { name: "Multimeter" })), fireEvent.click(screen.getByRole("button", { name: "Test point GND" })), fireEvent.click(screen.getByRole("button", { name: "Test point VM" })))],
    ["meter across the LED with the blue LED at station 4", () => (go(4), fireEvent.click(screen.getByRole("radio", { name: "Blue, 3.0 V" })), fireEvent.click(screen.getByRole("button", { name: "Test point D1 cathode (K)" })), fireEvent.click(screen.getByRole("button", { name: "Test point D1 anode (A)" })))],
    ["station 3 at 8.4 V with R3 probed", ({ container }) => (go(3), fireEvent.change(container.querySelectorAll('input[type="range"]')[1], { target: { value: "8.4" } }), fireEvent.click(screen.getByRole("button", { name: /Inspect R3/ })))],
  ];
  it.each(drive)("%s renders identical markup when sin, cos, exp, log, sqrt, pow and hypot differ in the last bits", (_name, d) => {
    const plain = markupAfter(<BoardInAction />, d);
    const nudged = withNudgedMath(() => markupAfter(<BoardInAction />, d));
    expect(plain.length).toBeGreaterThan(5000);
    expect(nudged).toBe(plain);
  });
});
