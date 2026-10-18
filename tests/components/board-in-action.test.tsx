import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { BoardTopView, flowPathsFor } from "@/components/viz/pcb/BoardInAction.view";
import { StationPanel } from "@/components/viz/pcb/BoardInAction.panels";
import { dotCount } from "@/components/viz/pcb/OhmsLawCircuit.helpers";
import { RightHandRule, RightHandRuleFigure } from "@/components/viz/pcb/RightHandRule";
import { parts, partBox, nets, connectorPins } from "@/components/viz/pcb/SchematicToLayoutBoard";
import { allNets, allParts, FLOW_DOT_SPACING_PX, IO35_PAD, PART_ROLES, revBNets, revBParts, STATIONS } from "@/components/viz/pcb/BoardInAction.board";
import { BOARD_DEFAULTS, boardModel } from "@/lib/sim/board";

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
    const { container } = render(<BoardTopView station={station} phases={paths.map(() => 0)} flowPaths={paths} selected={null} onSelect={noop} forward />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("role")).toBe("group");
    expect(svg.querySelectorAll('[role="button"]')).toHaveLength(28);
    expect(container.querySelectorAll('[data-part][data-lit="true"]')).toHaveLength(station.parts.length);
    expect(screen.getByRole("button", { name: "Inspect Q1, AO3401A" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Inspect R4, 100 k" })).toBeTruthy();
    for (const b of Array.from(svg.querySelectorAll('[role="button"]'))) expect(b.getAttribute("tabindex")).toBe("0");
  });

  it("draws the station's flows as evenly spaced dots along the copper", () => {
    const { container } = render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={noop} forward />);
    expect(container.querySelectorAll('[data-flow="pack"] circle')).toHaveLength(dotCount(paths[0].length, FLOW_DOT_SPACING_PX));
  });

  it("marks the station's nets bright and leaves the others dim", () => {
    const { container } = render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={noop} forward />);
    expect(container.querySelectorAll('[data-net="VM"][data-lit="true"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-net="PWMA"][data-lit="false"]').length).toBeGreaterThan(0);
  });

  it("selects a part by click, by Enter and by Space, and shows which part is selected", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected={null} onSelect={onSelect} forward />);
    fireEvent.click(screen.getByRole("button", { name: /Inspect R3/ }));
    expect(onSelect).toHaveBeenLastCalledWith("R3");
    fireEvent.keyDown(screen.getByRole("button", { name: /Inspect U3/ }), { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("U3");
    fireEvent.keyDown(screen.getByRole("button", { name: /Inspect C9/ }), { key: " " });
    expect(onSelect).toHaveBeenLastCalledWith("C9");
    rerender(<BoardTopView station={station} phases={[0]} flowPaths={paths} selected="R3" onSelect={onSelect} forward />);
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
      const { container } = render(<BoardTopView station={s} phases={ps.map(() => 0.3)} flowPaths={ps} selected={null} onSelect={noop} forward />);
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
  const m = boardModel(BOARD_DEFAULTS);
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
