import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { BoardTopView, flowPathsFor } from "@/components/viz/pcb/BoardInAction.view";
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
