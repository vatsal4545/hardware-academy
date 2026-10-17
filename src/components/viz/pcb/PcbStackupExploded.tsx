"use client";

import { useState, type KeyboardEvent } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { ControlBar, Stat } from "./OhmsLawCircuit.helpers";

type Count = "2" | "4";
type Kind = "silk" | "mask" | "copper" | "prepreg" | "core";
type Pattern = "top" | "gnd" | "pwr" | "bottom" | "pour";

interface Layer {
  id: string;
  name: string;
  kind: Kind;
  /** thickness as printed on the drawing */
  thick: string;
  /** thickness in µm, counted in the total only for copper and dielectric */
  um: number;
  /** drawn height in px (not to scale: the core would dwarf the copper) */
  h: number;
  pattern?: Pattern;
  desc: string;
}

const STACK_4: Layer[] = [
  {
    id: "silk-t",
    name: "Top silkscreen",
    kind: "silk",
    thick: "10 µm",
    um: 0,
    h: 4,
    desc: "Legend ink for designators, polarity marks and outlines. Keep lines at least 0.15 mm wide and text at least 1 mm tall, and keep it off pads: the fab clips any silkscreen that touches copper.",
  },
  {
    id: "mask-t",
    name: "Top solder mask",
    kind: "mask",
    thick: "20 µm",
    um: 0,
    h: 5,
    desc: "Liquid photoimageable epoxy, opened over the pads and covering the rest of the copper. It stops solder bridging. Green is the cheapest colour and every colour works the same. Keep at least 0.1 mm of mask between neighbouring pads.",
  },
  {
    id: "l1",
    name: "L1 · top copper (SIG)",
    kind: "copper",
    thick: "35 µm (1 oz)",
    um: 35,
    h: 7,
    pattern: "top",
    desc: "Components and their short connections live here: 1 oz finished copper after plating. Routing on L1 runs 0.21 mm above the ground plane, so each signal's return current is right beside it, which is what keeps loops small.",
  },
  {
    id: "pp1",
    name: "Prepreg 7628",
    kind: "prepreg",
    thick: "0.21 mm",
    um: 210,
    h: 16,
    desc: "Prepreg is partly cured glass-and-epoxy sheet. In the press at about 180 °C it flows, fills the copper gaps and bonds the layers. At 0.21 mm it sets the impedance of L1 routing: a 0.35 mm trace over it is about 50 Ω.",
  },
  {
    id: "l2",
    name: "L2 · inner copper (GND)",
    kind: "copper",
    thick: "17.5 µm (0.5 oz)",
    um: 17.5,
    h: 7,
    pattern: "gnd",
    desc: "An unbroken ground plane directly under L1. Every top-layer signal returns through it, so do not cut slots in it under fast signals. Vias that pass through need clearance holes called antipads; the blind via ties into it.",
  },
  {
    id: "core",
    name: "Core FR-4",
    kind: "core",
    thick: "1.065 mm",
    um: 1065,
    h: 36,
    desc: "A fully cured glass-epoxy core, copper-clad on both faces. FR-4 has a dielectric constant near 4.3 and a glass transition between 135 and 170 °C. This 1.065 mm of core gives the board its stiffness.",
  },
  {
    id: "l3",
    name: "L3 · inner copper (PWR)",
    kind: "copper",
    thick: "17.5 µm (0.5 oz)",
    um: 17.5,
    h: 7,
    pattern: "pwr",
    desc: "A power plane or large pour, split here into a 3V3 region (orange) and a VBAT region (red). It distributes power at low impedance. Because the core between L2 and L3 is 1.065 mm thick, this plane pair adds almost no useful capacitance, so decoupling capacitors still do the work.",
  },
  {
    id: "pp2",
    name: "Prepreg 7628",
    kind: "prepreg",
    thick: "0.21 mm",
    um: 210,
    h: 16,
    desc: "The second prepreg layer bonds L3 to L4. Matching it to the first keeps the stack symmetric, which stops the board bowing and twisting during reflow.",
  },
  {
    id: "l4",
    name: "L4 · bottom copper (SIG)",
    kind: "copper",
    thick: "35 µm (1 oz)",
    um: 35,
    h: 7,
    pattern: "bottom",
    desc: "The bottom signal layer, 1 oz after plating. Its nearest plane is L3, so route fast signals on L1 and keep L4 for slower nets and a few power links.",
  },
  {
    id: "mask-b",
    name: "Bottom solder mask",
    kind: "mask",
    thick: "20 µm",
    um: 0,
    h: 5,
    desc: "The same epoxy coating on the underside. Mask-defined openings expose the pads for components, test points and edge connectors.",
  },
  {
    id: "silk-b",
    name: "Bottom silkscreen",
    kind: "silk",
    thick: "10 µm",
    um: 0,
    h: 4,
    desc: "Legend ink on the underside, for example a revision mark, a date code and the fab's order number. Same rules as the top: off the pads, thick enough to print.",
  },
];

const STACK_2: Layer[] = [
  { ...STACK_4[0], id: "2:silk-t" },
  { ...STACK_4[1], id: "2:mask-t" },
  {
    id: "2:l1",
    name: "L1 · top copper",
    kind: "copper",
    thick: "35 µm (1 oz)",
    um: 35,
    h: 7,
    pattern: "top",
    desc: "Top copper carries the components and most of the routing. With no plane beneath it, return currents have to find their own path, so a ground pour on the other side matters a lot.",
  },
  {
    id: "2:core",
    name: "Core FR-4",
    kind: "core",
    thick: "1.53 mm",
    um: 1530,
    h: 44,
    desc: "A single 1.53 mm core is the only dielectric. It is cheap and stiff, but signal and return paths are separated by 1.5 mm of FR-4, so loops are large and a 50 Ω trace would have to be about 3 mm wide.",
  },
  {
    id: "2:l2",
    name: "L2 · bottom copper",
    kind: "copper",
    thick: "35 µm (1 oz)",
    um: 35,
    h: 7,
    pattern: "pour",
    desc: "Bottom copper usually becomes a ground pour with the leftover routing. Keep it as unbroken as you can, because it is the return path for the top layer.",
  },
  { ...STACK_4[9], id: "2:mask-b" },
  { ...STACK_4[10], id: "2:silk-b" },
];

const X0 = 172;
const W = 260;
const PW = 290; // the trace patterns are designed on a 290-unit-wide face and scaled to W
const U = W / PW;
const DX = 70;
const DY = 30;
const H = 540;
const VIEW_W = 520;
const VIA = { u: 250, v: 50 } as const;
const BLIND = { u: 110, v: 70 } as const;
const GAP_MAX = 36;
const SLOT = 36;

const FACES: Record<Kind, { top: string; front: string; side: string }> = {
  silk: { top: "#f3f4f6", front: "#cbd0d8", side: "#9aa1ad" },
  mask: { top: "#2fa06b", front: "#1f7a4d", side: "#165c3a" },
  copper: { top: "#e3a05a", front: "#d98c3f", side: "#a8672a" },
  prepreg: { top: "#d8d28f", front: "#bfb874", side: "#9b9559" },
  core: { top: "#cdbb80", front: "#b6a368", side: "#8e7e4e" },
};

function Traces({ pattern }: { pattern: Pattern }) {
  const cu = FACES.copper.front;
  switch (pattern) {
    case "top":
      return (
        <g fill={cu}>
          <rect x={16} y={20} width={22} height={14} rx={2} />
          <rect x={38} y={25} width={70} height={4} />
          <rect x={108} y={16} width={22} height={14} rx={2} />
          <rect x={130} y={21} width={4} height={34} />
          <rect x={134} y={52} width={60} height={4} />
          <rect x={194} y={44} width={22} height={18} rx={2} />
          <rect x={50} y={70} width={90} height={4} />
          <rect x={140} y={66} width={20} height={12} rx={2} />
        </g>
      );
    case "bottom":
      return (
        <g fill={cu}>
          <rect x={30} y={30} width={150} height={4} />
          <rect x={176} y={30} width={4} height={50} />
          <rect x={60} y={60} width={120} height={4} />
          <rect x={20} y={74} width={80} height={4} />
        </g>
      );
    case "gnd":
      return <rect x={0} y={0} width={PW} height={100} fill={FACES.copper.top} />;
    case "pwr":
      return (
        <g>
          <rect x={0} y={0} width={150} height={100} fill={vizColors.orange} opacity={0.9} />
          <rect x={154} y={0} width={PW - 154} height={100} fill={vizColors.red} opacity={0.85} />
        </g>
      );
    case "pour":
      return (
        <g>
          <rect x={0} y={0} width={PW} height={100} fill={FACES.copper.top} />
          <rect x={70} y={64} width={110} height={5} fill="#2b3140" />
        </g>
      );
  }
}

function ViaMarks({ pattern, kind, blind }: { pattern?: Pattern; kind: Kind; blind: "ring" | "dot" | "hole" | null }) {
  const plane = pattern === "gnd" || pattern === "pwr" || pattern === "pour";
  if (kind === "silk") return null;
  return (
    <g>
      {plane && <circle cx={VIA.u} cy={VIA.v} r={13} fill="#1b2130" />}
      {kind === "copper" && <circle cx={VIA.u} cy={VIA.v} r={9} fill="none" stroke={FACES.copper.front} strokeWidth={4} />}
      <circle cx={VIA.u} cy={VIA.v} r={4.5} fill="#0b0f17" />
      {blind === "ring" && <circle cx={BLIND.u} cy={BLIND.v} r={8} fill="none" stroke="#fde68a" strokeWidth={3.5} />}
      {blind === "dot" && <circle cx={BLIND.u} cy={BLIND.v} r={6} fill="#fde68a" />}
      {blind === "hole" && <circle cx={BLIND.u} cy={BLIND.v} r={3.5} fill="#0b0f17" />}
    </g>
  );
}

export function PcbStackupExploded() {
  const [count, setCount] = useState<Count>("4");
  const [explode, setExplode] = useState(70);
  const [active, setActive] = useState<string>("l1");

  const stack = count === "4" ? STACK_4 : STACK_2;
  const current = stack.find((l) => l.id === active) ?? stack.find((l) => l.kind === "copper") ?? stack[0];
  const gap = (explode / 100) * GAP_MAX;
  const n = stack.length;
  const totalH = stack.reduce((a, l) => a + l.h, 0) + (n - 1) * gap + DY;
  const start = (H - totalH) / 2 + DY;

  // top-front y of every slab, top of the stack first
  const ys: number[] = [];
  let acc = start;
  for (const l of stack) {
    ys.push(acc);
    acc += l.h + gap;
  }

  const labelTop = (H - (n - 1) * SLOT) / 2;
  const copperUm = stack.filter((l) => l.kind === "copper" || l.kind === "prepreg" || l.kind === "core").reduce((a, l) => a + l.um, 0);
  const copperLayers = stack.filter((l) => l.kind === "copper").length;
  const blindOn = count === "4";

  const slabs = stack.map((l, i) => ({ l, i, y: ys[i] }));
  const drawn = [...slabs].reverse(); // bottom layer first, so upper slabs occlude lower ones

  const onKey = (e: KeyboardEvent<SVGGElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setActive(id);
    }
  };

  return (
    <VizFrame
      title="Exploded PCB stack-up"
      description="Pull the layers apart and hover, focus or tap one to read what it does. Switch between a 2-layer and a 4-layer board to see where the ground plane and the 50 Ω trace come from."
      footer="Thicknesses are labelled in real units but drawn out of scale: at true scale the 35 µm copper would be a hairline next to a 1 mm core. The example stack-up follows a common 1.6 mm, 7628 prepreg, 4-layer fab build."
    >
      <ControlBar>
        <Segmented<Count>
          label="Board"
          options={[
            { value: "2", label: "2 layers" },
            { value: "4", label: "4 layers" },
          ]}
          value={count}
          onChange={setCount}
        />
        <Slider label="Explode" value={explode} min={0} max={100} step={1} unit="%" onChange={setExplode} />
      </ControlBar>
      <div>
        <SvgCanvas
          viewBox={`0 0 ${VIEW_W} ${H}`}
          className="mx-auto max-w-[560px]"
          title={`Exploded view of a ${count}-layer PCB with ${n} layers from top silkscreen to bottom silkscreen`}
        >
          <rect x={0} y={0} width={VIEW_W} height={H} fill={vizColors.bg} rx={8} />
          {drawn.map(({ l, i, y }) => {
            const isActive = l.id === current.id;
            const f = FACES[l.kind];
            const topFill = l.pattern === "top" || l.pattern === "bottom" ? "#2b3140" : f.top;
            const stroke = isActive ? "#ffffff" : "rgba(0,0,0,0.35)";
            const sw = isActive ? 2 : 0.8;
            const midY = y + l.h / 2;
            const slot = labelTop + i * SLOT;
            const blind: "ring" | "dot" | "hole" | null = !blindOn
              ? null
              : l.id === "l1"
                ? "ring"
                : l.id === "l2"
                  ? "dot"
                  : l.id === "pp1"
                    ? "hole"
                    : null;
            return (
              <g
                key={l.id}
                role="button"
                tabIndex={0}
                aria-label={`${l.name}, ${l.thick}`}
                aria-pressed={isActive}
                onMouseEnter={() => setActive(l.id)}
                onFocus={() => setActive(l.id)}
                onClick={() => setActive(l.id)}
                onKeyDown={(e) => onKey(e, l.id)}
                style={{ cursor: "pointer" }}
              >
                {/* leader lines and labels */}
                <line x1={164} y1={slot} x2={X0 - 3} y2={midY} stroke={isActive ? vizColors.amber : vizColors.grid} strokeWidth={1} />
                <Label x={158} y={slot - 7} anchor="end" size={11} bold={isActive} color={isActive ? vizColors.amber : vizColors.text}>
                  {l.name}
                </Label>
                <Label x={158} y={slot + 8} anchor="end" size={10} mono color={isActive ? vizColors.amber : vizColors.muted}>
                  {l.thick}
                </Label>

                {/* slab */}
                <polygon points={`${X0},${y} ${X0 + W},${y} ${X0 + W + DX},${y - DY} ${X0 + DX},${y - DY}`} fill={topFill} stroke={stroke} strokeWidth={sw} />
                <polygon
                  points={`${X0 + W},${y} ${X0 + W + DX},${y - DY} ${X0 + W + DX},${y - DY + l.h} ${X0 + W},${y + l.h}`}
                  fill={f.side}
                  stroke={stroke}
                  strokeWidth={sw}
                />
                <rect data-face="front" x={X0} y={y} width={W} height={l.h} fill={f.front} stroke={stroke} strokeWidth={sw} />
                <g transform={`matrix(${U} 0 ${DX / 100} ${-DY / 100} ${X0} ${y})`}>
                  {l.pattern && <Traces pattern={l.pattern} />}
                  <ViaMarks pattern={l.pattern} kind={l.kind} blind={blind} />
                </g>
              </g>
            );
          })}

          {/* via barrels, visible in the gaps between layers */}
          {stack.slice(0, -1).map((l, i) => {
            if (gap < 1) return null;
            const yTop = ys[i] + l.h - DY * (VIA.v / 100);
            return (
              <line
                key={`barrel-${l.id}`}
                x1={X0 + VIA.u * U + DX * (VIA.v / 100)}
                y1={yTop}
                x2={X0 + VIA.u * U + DX * (VIA.v / 100)}
                y2={yTop + gap}
                stroke={FACES.copper.front}
                strokeWidth={3}
                strokeDasharray="4 3"
                pointerEvents="none"
              />
            );
          })}
          {blindOn &&
            [2, 3].map((i) => {
              if (gap < 1) return null;
              const yTop = ys[i] + stack[i].h - DY * (BLIND.v / 100);
              return (
                <line
                  key={`blind-${i}`}
                  x1={X0 + BLIND.u * U + DX * (BLIND.v / 100)}
                  y1={yTop}
                  x2={X0 + BLIND.u * U + DX * (BLIND.v / 100)}
                  y2={yTop + gap}
                  stroke="#fde68a"
                  strokeWidth={3}
                  strokeDasharray="4 3"
                  pointerEvents="none"
                />
              );
            })}
        </SvgCanvas>
      </div>

      <div className="mt-3 rounded-lg border border-border bg-bg p-3 text-sm" aria-live="polite">
        <p className="font-semibold">
          <span className="text-amber-300">{current.name}</span>
          <span className="ml-2 font-mono text-xs text-muted">{current.thick}</span>
        </p>
        <p className="mt-1 text-text/90">{current.desc}</p>
        {blindOn && (current.id === "l1" || current.id === "pp1" || current.id === "l2") && (
          <p className="mt-1 text-xs text-muted">The pale yellow via on this layer is a blind via: it joins L1 to L2 and stops there. The dark-ringed via goes right through the board.</p>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Copper layers" value={String(copperLayers)} />
        <Stat label="Copper plus dielectric" value={`${(copperUm / 1000).toFixed(2)} mm`} hint="finished board: 1.6 mm" />
        <Stat
          label="50 Ω trace on the top layer"
          value={count === "4" ? "0.35 mm (14 mil)" : "about 2.9 mm (115 mil)"}
          tone={count === "4" ? "ok" : "warn"}
          hint={count === "4" ? "0.21 mm to the plane" : "1.53 mm to the other side"}
        />
        <Stat label="Return path under L1" value={count === "4" ? "solid GND plane" : "bottom pour, if you keep it whole"} />
      </dl>
    </VizFrame>
  );
}
