"use client";

import { useState, type ReactNode } from "react";
import { PlayPause, Slider, Stepper, Toggle, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, makeScale, polyline, useViz, vizColors } from "@/components/viz/shared";

/* ---------- reflow profile model (SAC305) ---------- */

const LIQUIDUS = 217;
const PROFILE_END_X = 420; // fixed chart width in seconds so sliders do not rescale the axis

interface ProfilePoint {
  t: number;
  T: number;
}

/** Preheat at `ramp`, 80 s soak 150 to 190 C, 0.9 C/s ramp to the peak, dwell, cool at 2.5 C/s. */
function buildProfile(peak: number, ramp: number, dwell: number): ProfilePoint[] {
  const pts: ProfilePoint[] = [{ t: 0, T: 25 }];
  let t = (150 - 25) / ramp;
  pts.push({ t, T: 150 });
  t += 80;
  pts.push({ t, T: 190 });
  t += (peak - 190) / 0.9;
  pts.push({ t, T: peak });
  if (dwell > 0) {
    t += dwell;
    pts.push({ t, T: peak });
  }
  t += (peak - 100) / 2.5;
  pts.push({ t, T: 100 });
  t += 30;
  pts.push({ t, T: 60 });
  return pts;
}

function tempAt(pts: ProfilePoint[], t: number): number {
  if (t <= 0) return pts[0].T;
  for (let k = 1; k < pts.length; k++) {
    if (t <= pts[k].t) {
      const a = pts[k - 1];
      const b = pts[k];
      return a.T + ((b.T - a.T) * (t - a.t)) / (b.t - a.t);
    }
  }
  return pts[pts.length - 1].T;
}

/** Seconds spent at or above `level`, counting only time up to `until`. */
function timeAbove(pts: ProfilePoint[], level: number, until = Infinity): number {
  let total = 0;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    const t0 = a.t;
    const t1 = Math.min(b.t, until);
    if (t1 <= t0) continue;
    const slope = (b.T - a.T) / (b.t - a.t);
    const t0T = a.T + slope * (t0 - a.t);
    const t1T = a.T + slope * (t1 - a.t);
    if (t0T >= level && t1T >= level) total += t1 - t0;
    else if (t0T < level && t1T < level) continue;
    else {
      const tc = a.t + (level - a.T) / slope;
      total += t0T >= level ? tc - t0 : t1 - tc;
    }
  }
  return total;
}

/** First time the curve reaches `level` and the last time it leaves it (null if it never gets there). */
function crossings(pts: ProfilePoint[], level: number): { up: number; down: number } | null {
  let up: number | null = null;
  let down: number | null = null;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    const slope = (b.T - a.T) / (b.t - a.t);
    if (a.T < level && b.T >= level && up === null) up = a.t + (level - a.T) / slope;
    if (a.T >= level && b.T < level) down = a.t + (level - a.T) / slope;
  }
  return up !== null && down !== null ? { up, down } : null;
}

function verdict(peak: number, tal: number, ramp: number): string[] {
  const issues: string[] = [];
  if (peak < 232) issues.push("Peak too low to wet reliably: cold, dull joints. SAC305 needs about 235 °C or more.");
  if (tal < 40) issues.push("Under 40 s above 217 °C: poor wetting and trapped voids.");
  if (peak > 255) issues.push("Peak above 255 °C: close to the 260 °C limit of most components.");
  if (tal > 90) issues.push("Over 90 s above 217 °C: brittle intermetallics and laminate damage.");
  if (ramp > 3) issues.push("Preheat above 3 °C/s: thermal shock, and tombstoning of small parts.");
  return issues;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/* ---------- side-view geometry (100 px = 1 mm, not to scale vertically) ---------- */

const PAD_TOP = 154;
const PASTE = "#8b95a5";
const PADS = [
  { x: 130, w: 55 },
  { x: 225, w: 55 },
  { x: 370, w: 55 },
  { x: 465, w: 55 },
];
const CHIP_A = 155;
const CHIP_B = 395;
const CHIP_W = 100;
const CHIP_H = 50;

function Board() {
  return (
    <g>
      <rect x={20} y={160} width={600} height={26} fill={vizColors.substrate} opacity={0.85} />
      <rect x={20} y={157} width={600} height={3} fill={vizColors.mask} />
      {PADS.map((p) => (
        <rect key={p.x} x={p.x} y={PAD_TOP} width={p.w} height={6} fill={vizColors.copper} />
      ))}
    </g>
  );
}

function Caption({ line1, line2, color = vizColors.text, bold = false }: { line1: string; line2: string; color?: string; bold?: boolean }) {
  return (
    <g>
      <Label x={28} y={204} anchor="start" size={13} color={color} bold={bold}>
        {line1}
      </Label>
      <Label x={28} y={221} anchor="start" size={12} color={vizColors.muted}>
        {line2}
      </Label>
    </g>
  );
}

function Chip({ x, y, tilt = 0 }: { x: number; y: number; tilt?: number }) {
  return (
    <g transform={tilt ? `rotate(${-tilt} ${x} ${y + CHIP_H})` : undefined}>
      <rect x={x + 25} y={y} width={CHIP_W - 50} height={CHIP_H} fill="#7a5a43" />
      <rect x={x} y={y} width={25} height={CHIP_H} fill="#d7dce5" />
      <rect x={x + CHIP_W - 25} y={y} width={25} height={CHIP_H} fill="#d7dce5" />
    </g>
  );
}

function PasteBricks() {
  return (
    <g>
      {PADS.map((p) => (
        <rect key={p.x} x={p.x + 4} y={PAD_TOP - 12} width={p.w - 8} height={12} rx={1.5} fill={PASTE} />
      ))}
    </g>
  );
}

/** Stencil as the gaps between apertures, resting on the board. */
function Stencil({ dy = 0 }: { dy?: number }) {
  const segs: Array<[number, number]> = [];
  let cur = 20;
  for (const p of PADS) {
    segs.push([cur, p.x + 3]);
    cur = p.x + p.w - 3;
  }
  segs.push([cur, 620]);
  return (
    <g transform={`translate(0 ${dy})`}>
      {segs.map(([x0, x1]) => (
        <rect key={x0} x={x0} y={PAD_TOP - 12} width={x1 - x0} height={12} fill="#5b6472" stroke="#8a93a3" strokeWidth={0.5} />
      ))}
    </g>
  );
}

function StencilScene({ t }: { t: number }) {
  const phase = (t / 4.5) % 1;
  const sx = 30 + phase * 540;
  return (
    <g>
      <Board />
      {PADS.filter((p) => p.x + p.w / 2 < sx).map((p) => (
        <rect key={p.x} x={p.x + 3} y={PAD_TOP - 12} width={p.w - 6} height={12} fill={PASTE} />
      ))}
      <Stencil />
      <polygon points={`${sx},140 ${sx + 14},140 ${sx + 38},60 ${sx + 24},60`} fill="#9ca3af" />
      <rect x={sx + 18} y={48} width={50} height={14} rx={3} fill="#6b7280" />
      <circle cx={sx - 10} cy={132} r={9} fill={PASTE} />
      <circle cx={sx - 22} cy={136} r={6} fill={PASTE} />
      <Caption line1="Stainless stencil, about 0.12 mm thick" line2="The squeegee wipes paste through the apertures onto the pads" />
      <Arrow x1={sx + 84} y1={104} x2={sx + 124} y2={104} color={vizColors.cyan} />
    </g>
  );
}

function PasteScene({ t }: { t: number }) {
  const lift = 80 * (0.5 - 0.5 * Math.cos((2 * Math.PI * t) / 5));
  return (
    <g>
      <Board />
      <PasteBricks />
      <Stencil dy={-lift} />
      <Caption line1="The stencil lifts away and leaves a brick of paste on every pad" line2="Paste volume is aperture area times stencil thickness" />
    </g>
  );
}

function PlaceScene({ t }: { t: number }) {
  const p = (t / 6) % 1;
  const xFeeder = 560;
  const xPlace = CHIP_A + CHIP_W / 2;
  let nx = xFeeder;
  let ny = 0;
  if (p < 0.3) {
    nx = lerp(xFeeder, xPlace, p / 0.3);
  } else if (p < 0.5) {
    nx = xPlace;
    ny = lerp(0, 54, (p - 0.3) / 0.2);
  } else if (p < 0.62) {
    nx = xPlace;
    ny = 54;
  } else if (p < 0.82) {
    nx = xPlace;
    ny = lerp(54, 0, (p - 0.62) / 0.2);
  } else {
    nx = lerp(xPlace, xFeeder, (p - 0.82) / 0.18);
  }
  const carried = p < 0.5;
  const chipX = carried ? nx - CHIP_W / 2 : CHIP_A;
  const chipY = carried ? ny + 38 : 92;
  return (
    <g>
      <Board />
      <PasteBricks />
      <Chip x={CHIP_B} y={92} />
      <Chip x={chipX} y={chipY} />
      <rect x={nx - 9} y={ny} width={18} height={38} rx={3} fill="#9ca3af" />
      <rect x={nx - 4} y={ny - 22} width={8} height={22} fill="#6b7280" />
      <rect x={xFeeder - 40} y={30} width={90} height={8} fill="#374151" />
      <Caption line1="A vacuum nozzle takes each part from the tape reel and places it where the centroid file says" line2="Tacky paste holds the part in place until reflow" />
    </g>
  );
}

interface JointProps {
  side: "left" | "right";
  pad: { x: number; w: number };
  chipX: number;
  state: "paste" | "molten" | "solid";
  wet: number;
  cold: boolean;
}

function Joint({ side, pad, chipX, state, wet, cold }: JointProps) {
  if (state === "paste") {
    return <rect x={pad.x + 4} y={PAD_TOP - 12} width={pad.w - 8} height={12} rx={1.5} fill={PASTE} />;
  }
  const fill = state === "molten" ? "#f5f7fb" : cold ? "#7a828e" : "#c9d1dc";
  const outer = side === "left" ? pad.x + 3 : pad.x + pad.w - 3;
  const face = side === "left" ? chipX + 3 : chipX + CHIP_W - 3;
  const stroke = state === "molten" ? "#ffffff" : "none";
  if (wet < 0.5) {
    // Not enough time above liquidus: the solder balls up on the pad and never reaches the termination.
    const cxBall = outer + (face - outer) * (0.35 + 0.3 * wet);
    return <ellipse cx={cxBall} cy={PAD_TOP - 8} rx={19} ry={8 + 3 * wet} fill={fill} stroke={stroke} />;
  }
  // Wetted: a concave meniscus from the pad edge up the termination, 8 to 32 px tall.
  const hTop = 8 + 24 * ((wet - 0.5) / 0.5);
  const d = `M ${outer} ${PAD_TOP} Q ${face} ${PAD_TOP} ${face} ${PAD_TOP - hTop} L ${face} ${PAD_TOP} Z`;
  return <path d={d} fill={fill} stroke={stroke} strokeWidth={1} />;
}

function ReflowScene({ pts, tau, tal }: { pts: ProfilePoint[]; tau: number; tal: number }) {
  const T = tempAt(pts, tau);
  const cr = crossings(pts, LIQUIDUS);
  const wetFinal = clamp((tal - 15) / 30, 0, 1);
  const elapsed = timeAbove(pts, LIQUIDUS, tau);
  const state: "paste" | "molten" | "solid" = !cr || tau < cr.up ? "paste" : tau <= cr.down ? "molten" : "solid";
  const wet = tal > 0 ? wetFinal * clamp(elapsed / tal, 0, 1) : 0;
  const settle = state === "paste" ? 0 : clamp(elapsed / 8, 0, 1);
  const chipY = 92 + 12 * settle;
  const cold = wetFinal < 0.8;
  const tag = state === "paste" ? "paste, unmelted" : state === "molten" ? "molten" : cold ? "solid, but dull and poorly wetted" : "solid, shiny joint";
  return (
    <g>
      <Board />
      <Chip x={CHIP_A} y={chipY} />
      <Chip x={CHIP_B} y={chipY} />
      <Joint side="left" pad={PADS[0]} chipX={CHIP_A} state={state} wet={wet} cold={cold} />
      <Joint side="right" pad={PADS[1]} chipX={CHIP_A} state={state} wet={wet} cold={cold} />
      <Joint side="left" pad={PADS[2]} chipX={CHIP_B} state={state} wet={wet} cold={cold} />
      <Joint side="right" pad={PADS[3]} chipX={CHIP_B} state={state} wet={wet} cold={cold} />
      <Caption line1={`${T.toFixed(0)} °C: ${tag}`} line2="Paste melts at 217 °C, wets the pad and the termination, then solidifies on the way down" bold />
    </g>
  );
}

function AoiScene({ t, defect }: { t: number; defect: boolean }) {
  const phase = (t / 5) % 1;
  const cx = 40 + phase * 560;
  const joints = [
    { x: PADS[0].x, w: PADS[0].w, ok: true },
    { x: PADS[1].x, w: PADS[1].w, ok: true },
    { x: PADS[2].x, w: PADS[2].w, ok: true },
    { x: PADS[3].x, w: PADS[3].w, ok: !defect },
  ];
  return (
    <g>
      <Board />
      <Chip x={CHIP_A} y={104} />
      <Chip x={CHIP_B} y={104} tilt={defect ? 62 : 0} />
      <path d={`M ${PADS[0].x + 3} ${PAD_TOP} Q ${PADS[0].x + 20} ${PAD_TOP - 6} ${CHIP_A + 3} ${PAD_TOP - 24} L ${CHIP_A + 3} ${PAD_TOP} Z`} fill="#c9d1dc" />
      <path d={`M ${PADS[1].x + PADS[1].w - 3} ${PAD_TOP} Q ${PADS[1].x + PADS[1].w - 20} ${PAD_TOP - 6} ${CHIP_A + CHIP_W - 3} ${PAD_TOP - 24} L ${CHIP_A + CHIP_W - 3} ${PAD_TOP} Z`} fill="#c9d1dc" />
      <path d={`M ${PADS[2].x + 3} ${PAD_TOP} Q ${PADS[2].x + 20} ${PAD_TOP - 6} ${CHIP_B + 3} ${PAD_TOP - 24} L ${CHIP_B + 3} ${PAD_TOP} Z`} fill="#c9d1dc" />
      {defect ? (
        <ellipse cx={PADS[3].x + PADS[3].w / 2} cy={PAD_TOP - 6} rx={18} ry={6} fill="#c9d1dc" />
      ) : (
        <path d={`M ${PADS[3].x + PADS[3].w - 3} ${PAD_TOP} Q ${PADS[3].x + PADS[3].w - 20} ${PAD_TOP - 6} ${CHIP_B + CHIP_W - 3} ${PAD_TOP - 24} L ${CHIP_B + CHIP_W - 3} ${PAD_TOP} Z`} fill="#c9d1dc" />
      )}
      {joints.map((j, k) => {
        if (cx < j.x + j.w / 2) return null;
        const colour = j.ok ? vizColors.green : vizColors.red;
        return <rect key={k} x={j.x - 3} y={PAD_TOP - 52} width={j.w + 6} height={64} rx={4} fill="none" stroke={colour} strokeWidth={2} strokeDasharray={j.ok ? undefined : "5 3"} />;
      })}
      <polygon points={`${cx - 8},44 ${cx + 8},44 ${cx + 36},152 ${cx - 36},152`} fill={vizColors.cyan} opacity={0.14} />
      <rect x={cx - 24} y={16} width={48} height={28} rx={5} fill="#1a2235" stroke={vizColors.cyan} />
      <circle cx={cx} cy={30} r={7} fill={vizColors.cyan} opacity={0.8} />
      <Caption
        line1={defect ? "1 defect: tombstone, open joint on the right pad of C2" : "4 of 4 joints pass"}
        line2="The AOI camera compares every joint with a golden image"
        color={defect ? vizColors.red : vizColors.green}
        bold
      />
    </g>
  );
}

/* ---------- temperature chart ---------- */

const CX0 = 58;
const CX1 = 626;
const CY0 = 24;
const CY1 = 176;
const cx = makeScale([0, PROFILE_END_X], [CX0, CX1]);
const cy = makeScale([25, 270], [CY1, CY0]);

function ReflowChart({ pts, tau, peak }: { pts: ProfilePoint[]; tau: number; peak: number }) {
  const path = polyline(pts.map((p): [number, number] => [cx(p.t), cy(p.T)]));
  const cr = crossings(pts, LIQUIDUS);
  const T = tempAt(pts, tau);
  let above = "";
  if (cr) {
    const top = pts.filter((p) => p.T >= LIQUIDUS);
    const poly: Array<[number, number]> = [[cx(cr.up), cy(LIQUIDUS)], ...top.map((p): [number, number] => [cx(p.t), cy(p.T)]), [cx(cr.down), cy(LIQUIDUS)]];
    above = poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  }
  const t1 = pts[1].t;
  const t2 = pts[2].t;
  const t3 = pts[3].t;
  const peakEnd = pts[pts.map((p) => p.T).lastIndexOf(peak)].t;
  const zones = [
    { x0: 0, x1: t1, name: "preheat" },
    { x0: t1, x1: t2, name: "soak" },
    { x0: t2, x1: peakEnd, name: "reflow" },
    { x0: peakEnd, x1: pts[pts.length - 1].t, name: "cooling" },
  ];
  return (
    <SvgCanvas viewBox="0 0 640 210" title="Reflow temperature profile for SAC305 solder with the time above liquidus shaded">
      <rect x="0" y="0" width="640" height="210" rx="8" fill={vizColors.bg} />
      {[50, 100, 150, 200, 250].map((v) => (
        <g key={v}>
          <line x1={CX0} x2={CX1} y1={cy(v)} y2={cy(v)} stroke={vizColors.grid} />
          <Label x={CX0 - 6} y={cy(v)} anchor="end" size={11} color={vizColors.muted}>
            {v}
          </Label>
        </g>
      ))}
      <Label x={CX0 - 6} y={CY0 - 10} anchor="end" size={11} color={vizColors.muted}>
        °C
      </Label>
      {[0, 100, 200, 300, 400].map((v) => (
        <Label key={v} x={cx(v)} y={CY1 + 14} size={11} color={vizColors.muted}>
          {v}
        </Label>
      ))}
      <Label x={CX1} y={CY1 + 30} anchor="end" size={11} color={vizColors.muted}>
        time, s
      </Label>
      {zones.map((z) => (
        <g key={z.name}>
          <line x1={cx(z.x0)} x2={cx(z.x0)} y1={CY0} y2={CY1} stroke={vizColors.grid} strokeDasharray="2 3" />
          <Label x={(cx(z.x0) + cx(z.x1)) / 2} y={CY1 - 9} size={11} color={vizColors.muted}>
            {z.name}
          </Label>
        </g>
      ))}
      <line x1={CX0} x2={CX1} y1={cy(LIQUIDUS)} y2={cy(LIQUIDUS)} stroke={vizColors.orange} strokeDasharray="5 4" />
      <Label x={CX1} y={cy(LIQUIDUS) - 8} anchor="end" size={11} color={vizColors.orange}>
        217 °C liquidus
      </Label>
      {cr && <polygon points={above} fill={vizColors.amber} opacity={0.3} />}
      <path d={path} fill="none" stroke={vizColors.cyan} strokeWidth={2.5} strokeLinejoin="round" />
      <Label x={cx(t3)} y={cy(peak) - 10} size={11} color={vizColors.text}>
        {`peak ${peak} °C`}
      </Label>
      <line x1={cx(tau)} x2={cx(tau)} y1={CY0} y2={CY1} stroke={vizColors.muted} strokeDasharray="2 4" />
      <circle cx={cx(tau)} cy={cy(T)} r={5} fill={T >= LIQUIDUS ? vizColors.amber : vizColors.cyan} stroke={vizColors.bg} strokeWidth={2} />
    </SvgCanvas>
  );
}

/* ---------- the stepper ---------- */

const STEPS = [
  {
    title: "Stencil",
    body: (
      <p>
        A laser-cut stainless-steel stencil, about 0.12 mm thick, is aligned over the board and a squeegee pushes solder paste through its apertures.
        Apertures must have an area ratio of at least 0.66 and an aspect ratio of at least 1.5, or the paste sticks to the walls instead of the pad.
      </p>
    ),
  },
  {
    title: "Paste",
    body: (
      <p>
        Lifting the stencil leaves a brick of paste on every pad. Paste is about 50 % metal by volume (88 to 90 % by weight): SAC305 powder in a
        flux gel, Type 3 powder (25 to 45 µm) for 0.5 mm pitch and Type 4 (20 to 38 µm) for finer. Too much paste bridges pins, too little makes weak
        joints.
      </p>
    ),
  },
  {
    title: "Place",
    body: (
      <p>
        A pick-and-place machine lifts each part from its tape reel with a vacuum nozzle and places it using the centroid file (X, Y, rotation, side)
        to roughly 0.05 mm. A wrong rotation in that file is the usual reason a diode or tantalum capacitor arrives reversed.
      </p>
    ),
  },
  {
    title: "Reflow",
    body: (
      <p>
        The board rides a conveyor through heating zones. Preheat at 3 °C/s or less, soak at 150 to 200 °C for 60 to 120 s to activate the flux, melt
        at 217 °C, peak near 245 °C with 45 to 90 s above liquidus, then cool at 4 to 6 °C/s at most. Drag the sliders and watch the joint.
      </p>
    ),
  },
  {
    title: "Inspect",
    body: (
      <p>
        Automated optical inspection compares each joint and part with a golden image and flags missing, shifted, rotated, tombstoned and starved
        parts. X-ray sees under BGAs and QFN thermal pads, where voids above about 25 % of the area are rejected.
      </p>
    ),
  },
];

export function SmtAssemblyStepper() {
  const [index, setIndex] = useState(0);
  const [peak, setPeak] = useState(245);
  const [ramp, setRamp] = useState(2);
  const [dwell, setDwell] = useState(10);
  const [defect, setDefect] = useState(false);
  const viz = useViz(true);

  const pts = buildProfile(peak, ramp, dwell);
  const end = pts[pts.length - 1].t;
  const tal = timeAbove(pts, LIQUIDUS);
  const tau = (viz.t * 22) % end;
  const issues = verdict(peak, tal, ramp);

  let scene: ReactNode;
  if (index === 0) scene = <StencilScene t={viz.t} />;
  else if (index === 1) scene = <PasteScene t={viz.t} />;
  else if (index === 2) scene = <PlaceScene t={viz.t} />;
  else if (index === 3) scene = <ReflowScene pts={pts} tau={tau} tal={tal} />;
  else scene = <AoiScene t={viz.t} defect={defect} />;

  return (
    <VizFrame
      title="SMT assembly: stencil, paste, place, reflow, inspect"
      description="Step through the five stages one board goes through on an assembly line. At the reflow step, set the peak temperature, ramp and dwell and see when SAC305 wets, balls up or overheats."
      controls={
        <>
          {index === 3 && (
            <>
              <Slider label="Peak temperature" value={peak} min={225} max={265} step={1} unit="°C" onChange={setPeak} />
              <Slider label="Preheat ramp" value={ramp} min={1} max={4} step={0.5} unit="°C/s" onChange={setRamp} />
              <Slider label="Dwell at peak" value={dwell} min={0} max={30} step={1} unit="s" onChange={setDwell} />
            </>
          )}
          {index === 4 && <Toggle label="Inject a tombstone defect" checked={defect} onChange={setDefect} />}
          <PlayPause playing={viz.playing} onToggle={viz.toggle} onReset={viz.reset} />
        </>
      }
      footer={
        index === 3 ? (
          <div className="space-y-2" data-testid="reflow-readout">
            <p className="font-mono text-xs text-text">
              peak {peak} °C · time above 217 °C: {tal.toFixed(0)} s · preheat {ramp.toFixed(1)} °C/s
            </p>
            {issues.length === 0 ? (
              <p className="text-green-300" data-testid="reflow-verdict">
                Inside the SAC305 window: 235 to 250 °C peak, 45 to 90 s above liquidus, ramp at 3 °C/s or less.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-orange-300" data-testid="reflow-verdict">
                {issues.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p>
            Cross-sections are not to scale (a real pad is 35 µm thick). On a prototype line the stencil print takes about 20 s, placement 0.5 to 2 s
            per part and reflow 4 to 6 minutes door to door.
          </p>
        )
      }
    >
      <div className="space-y-4">
        <SvgCanvas viewBox="0 0 640 230" title={`SMT assembly step ${index + 1}: ${STEPS[index].title}`}>
          <rect x="0" y="0" width="640" height="230" rx="8" fill={vizColors.bg} />
          {scene}
        </SvgCanvas>
        {index === 3 && <ReflowChart pts={pts} tau={tau} peak={peak} />}
        <Stepper steps={STEPS} index={index} onChange={setIndex} autoplayMs={6000} />
      </div>
    </VizFrame>
  );
}
