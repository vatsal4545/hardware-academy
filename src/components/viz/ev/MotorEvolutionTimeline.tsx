"use client";

import { useState } from "react";
import { PlayPause, Segmented, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useAnimationFrame, vizColors } from "@/components/viz/shared";

type Status = "shipped" | "claim" | "trend";

interface Entry {
  id: string;
  /** fractional year, for placing the marker */
  at: number;
  short: string;
  title: string;
  status: Status;
  specs: Array<[string, string]>;
  why: string;
}

const ENTRIES: Entry[] = [
  {
    id: "roadster-2008",
    at: 2008.1,
    short: "2008 Roadster",
    title: "Roadster (2008)",
    status: "shipped",
    specs: [
      ["Chassis", "Lotus Elise-derived"],
      ["Motor", "Three-phase AC induction, about 185 kW"],
      ["Battery", "53 kWh from 6,831 × 18650 cells"],
      ["0-60 mph", "3.7-3.9 s"],
      ["Range", "244 mi (EPA)"],
      ["Gearbox", "Single speed; the planned two-speed was abandoned"],
    ],
    why: "Proved that thousands of small laptop-class cells, monitored and cooled as one pack, could power a fast car. The induction motor needed no magnets, and its wide speed range made a second gear unnecessary.",
  },
  {
    id: "model-s-2012",
    at: 2012.47,
    short: "2012 Model S",
    title: "Model S (2012)",
    status: "shipped",
    specs: [
      ["Motor", "Liquid-cooled induction with copper rotor bars"],
      ["85 kWh pack", "7,104 × 18650 cells in 16 modules, 96s"],
      ["Performance version", "About 310 kW (416 hp)"],
      ["Dual motor (2014)", "Front induction motor added for all-wheel drive"],
    ],
    why: "Scaled the Roadster recipe into a sedan. Copper conducts about 60 % better than the aluminium usually cast into rotors, so rotor losses fall and continuous torque rises.",
  },
  {
    id: "model-3-2017",
    at: 2017.57,
    short: "2017 Model 3",
    title: "Model 3 (2017), Model Y (2020)",
    status: "shipped",
    specs: [
      ["Rear motor", "IPM-SynRM: interior permanent magnet synchronous reluctance"],
      ["Front motor (dual motor)", "Induction"],
      ["Inverter", "Silicon carbide (SiC) MOSFETs"],
      ["Cells", "2170; the Long Range pack is 96s46p (4,416 cells)"],
    ],
    why: "Highway cruising is light load, where a magnet machine beats an induction machine because no current is spent magnetizing the rotor. SiC switches cut inverter losses, so the same pack goes further.",
  },
  {
    id: "roadster-2-claims",
    at: 2017.87,
    short: "Roadster 2 (claims)",
    title: "Roadster, second generation: announced November 2017",
    status: "claim",
    specs: [
      ["0-60 mph", "Claimed 1.9 s"],
      ["Battery", "Claimed 200 kWh"],
      ["Range", "Claimed 620 mi"],
      ["Top speed", "Claimed above 250 mph"],
      ["Motors", "Claimed three (tri-motor)"],
      ["Option", "Claimed \"SpaceX package\" with cold-gas thrusters"],
    ],
    why: "Originally promised for 2020, the car has been delayed repeatedly. None of these numbers is a shipped, independently tested specification. Check Tesla's site for the current status before quoting any of them.",
  },
  {
    id: "plaid-2021",
    at: 2021.44,
    short: "2021 Plaid",
    title: "Model S Plaid (2021)",
    status: "shipped",
    specs: [
      ["Motors", "Three: one front, two rear"],
      ["Rotors", "Permanent magnet, carbon-fiber sleeved"],
      ["Motor speed", "About 20,000 rpm"],
      ["Power", "1,020 hp (about 760 kW)"],
      ["0-60 mph (Tesla's figure)", "1.99 s with a one-foot rollout subtracted"],
    ],
    why: "Power is torque times speed. The carbon sleeve holds the spinning rotor together at about 20,000 rpm, so the motors keep making power at high road speed instead of fading.",
  },
  {
    id: "cybertruck-2023",
    at: 2023.91,
    short: "2023 Cybertruck",
    title: "Cybertruck (2023)",
    status: "shipped",
    specs: [
      ["High-voltage system", "800 V class"],
      ["Low-voltage system", "48 V instead of 12 V"],
      ["Steering", "Steer-by-wire"],
      ["Cells", "4680"],
    ],
    why: "800 V halves the current for the same power, so cables and charge connectors run cooler. 48 V cuts low-voltage current to a quarter for the same power, which shrinks the wiring harness.",
  },
  {
    id: "today",
    at: 2026.8,
    short: "Today",
    title: "Industry today",
    status: "trend",
    specs: [
      ["Windings", "Hairpin: rectangular copper bars instead of round wire"],
      ["Cooling", "Oil sprayed on the end windings and pumped through the rotor"],
      ["Topology", "Axial-flux motors, e.g. YASA (bought by Mercedes-Benz in 2021)"],
      ["Magnets", "Rare-earth-free designs claimed or in development"],
      ["Packaging", "Integrated drive units: motor, inverter and gearbox in one housing"],
      ["Voltage", "800 V with SiC inverters (Porsche Taycan 2019, Hyundai E-GMP)"],
    ],
    why: "The gains now come from cooling, copper fill, magnet supply and the electrical system around the motor, rather than from a new kind of motor.",
  },
];

const statusStyle: Record<Status, { color: string; badge: string; badgeClass: string }> = {
  shipped: { color: vizColors.green, badge: "Shipped", badgeClass: "border-green-400/50 bg-green-400/10 text-green-300" },
  claim: {
    color: vizColors.amber,
    badge: "Announced claims, not shipped specifications",
    badgeClass: "border-amber-400/60 bg-amber-400/15 text-amber-300",
  },
  trend: { color: vizColors.blue, badge: "Industry trend", badgeClass: "border-blue-400/50 bg-blue-400/10 text-blue-300" },
};

const AXIS_Y = 88;
const xOfYear = (y: number) => 36 + (y - 2008) * (664 / 19);
const DWELL_S = 4;

export function MotorEvolutionTimeline() {
  const [tour, setTour] = useState({ index: 0, acc: 0 });
  const [touring, setTouring] = useState(false);
  const n = ENTRIES.length;
  const entry = ENTRIES[tour.index];
  const style = statusStyle[entry.status];
  const select = (i: number) => setTour({ index: (i + n) % n, acc: 0 });

  useAnimationFrame(
    (dt) =>
      setTour((s) => (s.acc + dt >= DWELL_S ? { index: (s.index + 1) % n, acc: 0 } : { index: s.index, acc: s.acc + dt })),
    touring,
  );

  return (
    <VizFrame
      title="Tesla motor timeline, 2008 to today"
      description="Pick a point on the timeline. Green markers are shipped cars; the amber diamond is the second-generation Roadster, which exists only as announced claims."
      controls={
        <>
          <PlayPause
            playing={touring}
            onToggle={() => setTouring(!touring)}
            onStep={() => select(tour.index + 1)}
            onReset={() => {
              setTouring(false);
              select(0);
            }}
          />
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => select(tour.index - 1)}
              className="rounded-md border border-border bg-surface px-3 py-1 text-text hover:bg-surface-2"
            >
              ← Earlier
            </button>
            <button
              type="button"
              onClick={() => select(tour.index + 1)}
              className="rounded-md border border-border bg-surface px-3 py-1 text-text hover:bg-surface-2"
            >
              Later →
            </button>
          </div>
        </>
      }
    >
      <SvgCanvas viewBox="0 0 720 150" title={`Timeline from 2008 to today; selected: ${entry.title}`}>
        <rect x={0} y={0} width={720} height={150} rx={8} fill={vizColors.bg} />
        <line x1={30} x2={706} y1={AXIS_Y} y2={AXIS_Y} stroke={vizColors.muted} strokeWidth={2} />
        {Array.from({ length: 10 }, (_, i) => 2008 + i * 2).map((y) => (
          <g key={y}>
            <line x1={xOfYear(y)} x2={xOfYear(y)} y1={AXIS_Y - 4} y2={AXIS_Y + 4} stroke={vizColors.muted} />
            <Label x={xOfYear(y)} y={AXIS_Y + 18} size={10} mono color={vizColors.muted}>
              {y}
            </Label>
          </g>
        ))}
        {ENTRIES.map((e, i) => {
          const active = i === tour.index;
          const color = statusStyle[e.status].color;
          const x = xOfYear(e.at);
          if (e.status === "claim") {
            const y = 40;
            return (
              <g key={e.id} onClick={() => select(i)} style={{ cursor: "pointer" }}>
                <line x1={x} x2={x} y1={y + 9} y2={AXIS_Y} stroke={color} strokeDasharray="3 3" />
                <polygon
                  points={`${x},${y - 9} ${x + 9},${y} ${x},${y + 9} ${x - 9},${y}`}
                  fill={active ? color : vizColors.bg}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray={active ? undefined : "3 2"}
                />
                <Label x={x} y={16} size={11} color={color} bold={active}>
                  Roadster 2: claims announced Nov 2017
                </Label>
              </g>
            );
          }
          const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
          const lx = i === 0 ? x - 6 : i === n - 1 ? 706 : x;
          return (
            <g key={e.id} onClick={() => select(i)} style={{ cursor: "pointer" }}>
              <circle cx={x} cy={AXIS_Y} r={active ? 9 : 7} fill={active ? color : vizColors.bg} stroke={color} strokeWidth={2} />
              <Label x={lx} y={AXIS_Y + 40} anchor={anchor} size={11} color={active ? vizColors.text : vizColors.muted} bold={active}>
                {e.short.replace(/^\d{4} /, "")}
              </Label>
            </g>
          );
        })}
      </SvgCanvas>

      <div className="mt-3">
        <Segmented label="Jump to" options={ENTRIES.map((e) => ({ value: e.id, label: e.short }))} value={entry.id} onChange={(id) => select(ENTRIES.findIndex((e) => e.id === id))} />
      </div>

      <article aria-label={entry.title} className="mt-4 rounded-lg border bg-bg p-4" style={{ borderColor: style.color }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold">{entry.title}</h4>
          <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${style.badgeClass}`}>{style.badge}</span>
        </div>
        {entry.status === "claim" && (
          <p className="mt-2 text-sm font-semibold text-amber-300">
            Every number on this card is a claim from the November 2017 announcement, not a measured or delivered specification.
          </p>
        )}
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {entry.specs.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="text-text">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-text/90">{entry.why}</p>
      </article>
    </VizFrame>
  );
}
