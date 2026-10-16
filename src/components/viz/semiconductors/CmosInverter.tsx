"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useViz, vizColors } from "@/components/viz/shared";
import { Readout, ReadoutGrid, clamp } from "./semisA-shared";

export type GateKind = "inv" | "nand";

/** Activity factor and total switched capacitance used for the chip-level power bar. */
const ALPHA = 0.1;
const C_TOTAL = 1e-9;
const P_MAX = 0.75;

export function gateOutput(gate: GateKind, a: boolean, b: boolean): boolean {
  return gate === "inv" ? !a : !(a && b);
}

/** Dynamic power P = α·C·V²·f in watts, with α = 0.1 and C = 1 nF. */
export function dynamicPower(vdd: number, fHz: number): number {
  return ALPHA * C_TOTAL * vdd * vdd * fHz;
}

type EdgeKind = "rise" | "fall" | "none";
interface HistoryEntry {
  t: number;
  a: boolean;
  b: boolean;
  out: boolean;
  kind: EdgeKind;
  label: string;
}
const MAX_HISTORY = 8;

const GATE_OPTIONS: { value: GateKind; label: string }[] = [
  { value: "inv", label: "Inverter" },
  { value: "nand", label: "NAND" },
];

type Pt = [number, number];

/** Point at fraction f (0..1) along a polyline. */
function pointAt(pts: Pt[], f: number): Pt {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((s, l) => s + l, 0);
  let target = clamp(f, 0, 1) * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i] || i === lens.length - 1) {
      const k = lens[i] === 0 ? 0 : Math.min(target / lens[i], 1);
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    target -= lens[i];
  }
  return pts[pts.length - 1];
}

// charge paths: supply → pull-up → output → load capacitor, and capacitor → pull-down → ground
const PATHS: Record<string, Pt[]> = {
  invRise: [[190, 40], [190, 60], [190, 86], [170, 86], [170, 114], [190, 114], [190, 165], [320, 165], [320, 215]],
  invFall: [[320, 215], [320, 165], [190, 165], [190, 216], [170, 216], [170, 244], [190, 244], [190, 290]],
  nandRiseA: [[140, 40], [140, 71], [120, 71], [120, 99], [140, 99], [140, 135], [340, 135], [340, 200]],
  nandRiseB: [[300, 40], [300, 71], [280, 71], [280, 99], [300, 99], [300, 135], [340, 135], [340, 200]],
  nandFall: [[340, 200], [340, 135], [210, 135], [210, 161], [190, 161], [190, 189], [210, 189], [210, 241], [190, 241], [190, 269], [210, 269], [210, 305]],
};

/** Transistor symbol with its channel at x + 10 and source/drain terminals at (x + 30, y ± 40). */
function Fet({ x, y, kind, on, gateLabel, gateHigh, showLabel = true }: { x: number; y: number; kind: "p" | "n"; on: boolean; gateLabel?: string; gateHigh: boolean; showLabel?: boolean }) {
  const channel = on ? vizColors.green : vizColors.muted;
  const wire = vizColors.text;
  const gateColor = gateHigh ? vizColors.amber : vizColors.muted;
  return (
    <g>
      <line x1={x + 10} y1={y - 20} x2={x + 10} y2={y + 20} stroke={channel} strokeWidth={on ? 4 : 2} strokeDasharray={on ? undefined : "4 3"} />
      <polyline points={`${x + 10},${y - 14} ${x + 30},${y - 14} ${x + 30},${y - 40}`} fill="none" stroke={wire} strokeWidth={1.5} />
      <polyline points={`${x + 10},${y + 14} ${x + 30},${y + 14} ${x + 30},${y + 40}`} fill="none" stroke={wire} strokeWidth={1.5} />
      <line x1={x} y1={y - 16} x2={x} y2={y + 16} stroke={wire} strokeWidth={2} />
      {kind === "p" && <circle cx={x - 5} cy={y} r={4} fill={vizColors.bg} stroke={wire} strokeWidth={1.5} />}
      <line x1={kind === "p" ? x - 9 : x} y1={y} x2={x - 30} y2={y} stroke={gateColor} strokeWidth={2} />
      {gateLabel && (
        <Label x={x - 35} y={y} anchor="end" size={12} bold color={gateColor}>
          {gateLabel}
        </Label>
      )}
      {showLabel && (
        <Label x={x + 38} y={y} anchor="start" size={10} color={on ? vizColors.green : vizColors.muted}>
          {`${kind === "p" ? "PMOS" : "NMOS"} ${on ? "on" : "off"}`}
        </Label>
      )}
    </g>
  );
}

function Capacitor({ x, top, bottom, label }: { x: number; top: number; bottom: number; label: string }) {
  return (
    <g>
      <g stroke={vizColors.text} strokeWidth={1.5}>
        <line x1={x - 16} y1={top} x2={x + 16} y2={top} strokeWidth={2.5} />
        <line x1={x - 16} y1={top + 10} x2={x + 16} y2={top + 10} strokeWidth={2.5} />
        <line x1={x} y1={top + 10} x2={x} y2={bottom} />
      </g>
      <Label x={x + 20} y={top + 5} anchor="start" size={10} color={vizColors.muted}>
        {label}
      </Label>
    </g>
  );
}

function Ground({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={vizColors.text} strokeWidth={1.5}>
      <line x1={x - 12} y1={y} x2={x + 12} y2={y} />
      <line x1={x - 8} y1={y + 4} x2={x + 8} y2={y + 4} />
      <line x1={x - 4} y1={y + 8} x2={x + 4} y2={y + 8} />
    </g>
  );
}

// scope geometry (one column per input change)
const SC_X0 = 470;
const SLOT = 34;
const ROW_A = 62;
const ROW_B = 96;
const ROW_OUT = 130;
const IDD_BASE = 204;

function levelPath(entries: HistoryEntry[], value: (e: HistoryEntry) => boolean, row: number): string {
  const y = (v: boolean) => (v ? row - 10 : row + 10);
  const pts: Pt[] = [];
  entries.forEach((e, k) => {
    const x0 = SC_X0 + k * SLOT;
    pts.push([x0, y(value(e))]);
    pts.push([x0 + SLOT, y(value(e))]);
  });
  return polyline(pts);
}

export function CmosInverter() {
  const [gate, setGate] = useState<GateKind>("inv");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [fGHz, setFGHz] = useState(3);
  const [vdd, setVdd] = useState(1);
  const [history, setHistory] = useState<HistoryEntry[]>(() => [{ t: 0, a: false, b: false, out: true, kind: "none", label: "" }]);
  const { playing, toggle, reset, t } = useViz();

  const out = gateOutput(gate, a, b);
  const power = dynamicPower(vdd, fGHz * 1e9);
  const last = history[history.length - 1];

  const record = (na: boolean, nb: boolean, which: "A" | "B") => {
    const prev = gateOutput(gate, a, b);
    const next = gateOutput(gate, na, nb);
    const kind: EdgeKind = next === prev ? "none" : next ? "rise" : "fall";
    const rising = which === "A" ? na : nb;
    setHistory((h) => [...h, { t, a: na, b: nb, out: next, kind, label: `${which}${rising ? "↑" : "↓"}` }].slice(-MAX_HISTORY));
  };

  const changeGate = (g: GateKind) => {
    setGate(g);
    setHistory([{ t, a, b, out: gateOutput(g, a, b), kind: "none", label: "" }]);
  };

  // transistor states
  const pA = !a;
  const pB = !b;
  const nA = a;
  const nB = b;

  // charge flow for the most recent output switch
  let path: Pt[] | null = null;
  if (last.kind === "rise") {
    if (gate === "inv") path = PATHS.invRise;
    else path = last.label.startsWith("A") ? PATHS.nandRiseA : PATHS.nandRiseB;
  } else if (last.kind === "fall") {
    path = gate === "inv" ? PATHS.invFall : PATHS.nandFall;
  }
  const since = t - last.t;
  const flowing = path !== null && (!playing || since < 1.4);
  const charges = flowing && path
    ? Array.from({ length: 7 }, (_, i) => {
        const f = playing ? since / 1.1 - i * 0.05 : 0.55 - i * 0.05;
        if (f < 0 || f > 1) return null;
        const [x, y] = pointAt(path, f);
        return { x, y, key: i, opacity: playing ? clamp(1.3 - since, 0, 1) : 0.9 };
      }).filter((c): c is { x: number; y: number; key: number; opacity: number } => c !== null)
    : [];

  const outColor = out ? vizColors.amber : vizColors.muted;
  const lastText =
    history.length === 1
      ? "none yet: toggle an input"
      : last.kind === "rise"
        ? "output rose: C charged from VDD"
        : last.kind === "fall"
          ? "output fell: C dumped to GND"
          : "output unchanged: almost no current";

  let network: string;
  if (gate === "inv") network = a ? "NMOS on, PMOS off" : "PMOS on, NMOS off";
  else if (out) network = `${[pA && "PMOS A", pB && "PMOS B"].filter(Boolean).join(" + ")} on; NMOS chain open`;
  else network = "both NMOS on; both PMOS off";

  const shown = history;
  const barW = (clamp(power, 0, P_MAX) / P_MAX) * 280;

  return (
    <VizFrame
      title="CMOS gates: switching costs charge"
      description="Toggle the inputs and watch which transistors conduct. Charge flows only when the output actually switches: up from VDD to charge the load, or down to ground to empty it. The scope logs every input change; the bar scales a whole chip's dynamic power with V² and f."
      controls={
        <>
          <div className="space-y-3">
            <Segmented label="Gate" options={GATE_OPTIONS} value={gate} onChange={changeGate} />
            <Toggle
              label="Input A"
              checked={a}
              onChange={(v) => {
                setA(v);
                record(v, b, "A");
              }}
            />
            {gate === "nand" && (
              <Toggle
                label="Input B"
                checked={b}
                onChange={(v) => {
                  setB(v);
                  record(a, v, "B");
                }}
              />
            )}
          </div>
          <div className="space-y-3">
            <Slider label="Clock frequency f" value={fGHz} min={0.5} max={5} step={0.1} onChange={setFGHz} format={(v) => `${v.toFixed(1)} GHz`} />
            <Slider label="Supply voltage VDD" value={vdd} min={0.6} max={1.2} step={0.05} onChange={setVdd} format={(v) => `${v.toFixed(2)} V`} />
          </div>
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={
        <ReadoutGrid label="CMOS readouts">
          <Readout label="Output" value={out ? "1 (pulled up to VDD)" : "0 (pulled down to GND)"} accent={outColor} />
          <Readout label="Conducting transistors" value={network} />
          <Readout label="Static (DC) current" value="≈ 0: one network is always off" />
          <Readout label="Last input change" value={lastText} />
          <Readout label="Chip dynamic power αCV²f" value={`${power.toFixed(2)} W`} accent={vizColors.amber} />
          <Readout label="Supply energy per 0→1 switch, 1 fF load" value={`C·V² = ${(vdd * vdd).toFixed(2)} fJ`} />
        </ReadoutGrid>
      }
    >
      <SvgCanvas viewBox="0 0 760 340" title={`CMOS ${gate === "inv" ? "inverter" : "NAND gate"}, inputs A=${a ? 1 : 0}${gate === "nand" ? ` B=${b ? 1 : 0}` : ""}, output ${out ? 1 : 0}`}>
        <rect x={0} y={0} width={760} height={340} fill={vizColors.bg} rx={8} />

        {gate === "inv" ? (
          <g>
            {/* rails */}
            <line x1={110} y1={40} x2={340} y2={40} stroke={vizColors.red} strokeWidth={2.5} />
            <Label x={112} y={28} anchor="start" size={11} color={vizColors.red}>
              {`VDD = ${vdd.toFixed(2)} V`}
            </Label>
            <line x1={190} y1={40} x2={190} y2={60} stroke={vizColors.text} strokeWidth={1.5} />
            <line x1={110} y1={290} x2={340} y2={290} stroke={vizColors.text} strokeWidth={2} />
            <Ground x={225} y={300} />
            <Label x={112} y={302} anchor="start" size={11} color={vizColors.muted}>
              GND
            </Label>

            <Fet x={160} y={100} kind="p" on={pA} gateHigh={a} />
            <Fet x={160} y={230} kind="n" on={nA} gateHigh={a} />
            {/* output node */}
            <line x1={190} y1={140} x2={190} y2={190} stroke={vizColors.text} strokeWidth={1.5} />
            <line x1={190} y1={165} x2={320} y2={165} stroke={outColor} strokeWidth={2.5} />
            <line x1={190} y1={270} x2={190} y2={290} stroke={vizColors.text} strokeWidth={1.5} />
            <circle cx={190} cy={165} r={4} fill={outColor} />
            <line x1={320} y1={165} x2={320} y2={215} stroke={outColor} strokeWidth={2.5} />
            <Capacitor x={320} top={215} bottom={290} label="C load" />
            <Label x={255} y={153} size={12} bold color={outColor}>
              {`OUT = ${out ? 1 : 0}`}
            </Label>
            {/* input bus */}
            <line x1={130} y1={100} x2={130} y2={230} stroke={a ? vizColors.amber : vizColors.muted} strokeWidth={2} />
            <line x1={70} y1={165} x2={130} y2={165} stroke={a ? vizColors.amber : vizColors.muted} strokeWidth={2} />
            <Label x={62} y={165} anchor="end" size={12} bold color={a ? vizColors.amber : vizColors.muted}>
              {`A = ${a ? 1 : 0}`}
            </Label>
          </g>
        ) : (
          <g>
            <line x1={80} y1={40} x2={360} y2={40} stroke={vizColors.red} strokeWidth={2.5} />
            <Label x={82} y={28} anchor="start" size={11} color={vizColors.red}>
              {`VDD = ${vdd.toFixed(2)} V`}
            </Label>
            <line x1={140} y1={40} x2={140} y2={45} stroke={vizColors.text} strokeWidth={1.5} />
            <line x1={300} y1={40} x2={300} y2={45} stroke={vizColors.text} strokeWidth={1.5} />
            <Fet x={110} y={85} kind="p" on={pA} gateLabel={`A=${a ? 1 : 0}`} gateHigh={a} />
            <Fet x={270} y={85} kind="p" on={pB} gateLabel={`B=${b ? 1 : 0}`} gateHigh={b} />
            <line x1={140} y1={125} x2={140} y2={135} stroke={vizColors.text} strokeWidth={1.5} />
            <line x1={300} y1={125} x2={300} y2={135} stroke={vizColors.text} strokeWidth={1.5} />
            <line x1={140} y1={135} x2={340} y2={135} stroke={outColor} strokeWidth={2.5} />
            <circle cx={210} cy={135} r={4} fill={outColor} />
            <line x1={340} y1={135} x2={340} y2={200} stroke={outColor} strokeWidth={2.5} />
            <Capacitor x={340} top={200} bottom={305} label="C load" />
            <Label x={348} y={120} anchor="start" size={12} bold color={outColor}>
              {`OUT = ${out ? 1 : 0}`}
            </Label>
            <Fet x={180} y={175} kind="n" on={nA} gateLabel={`A=${a ? 1 : 0}`} gateHigh={a} />
            <Fet x={180} y={255} kind="n" on={nB} gateLabel={`B=${b ? 1 : 0}`} gateHigh={b} />
            <line x1={210} y1={295} x2={210} y2={305} stroke={vizColors.text} strokeWidth={1.5} />
            <line x1={150} y1={305} x2={360} y2={305} stroke={vizColors.text} strokeWidth={2} />
            <Ground x={255} y={313} />
            <Label x={152} y={318} anchor="start" size={11} color={vizColors.muted}>
              GND
            </Label>
            <Label x={30} y={118} anchor="start" size={10} color={vizColors.muted}>
              pull-up: parallel
            </Label>
            <Label x={30} y={215} anchor="start" size={10} color={vizColors.muted}>
              pull-down: series
            </Label>
          </g>
        )}

        {charges.map((c) => (
          <circle key={c.key} cx={c.x} cy={c.y} r={4.5} fill={vizColors.electron} opacity={c.opacity} />
        ))}
        {flowing && !playing && (
          <Label x={30} y={330} anchor="start" size={10} color={vizColors.electron}>
            Paused: dots mark the charge path of the last output switch
          </Label>
        )}

        {/* ---------- scope ---------- */}
        <rect x={420} y={14} width={330} height={228} fill={vizColors.bg} stroke={vizColors.grid} rx={6} />
        <Label x={430} y={28} anchor="start" size={11}>
          Input log: one column per change
        </Label>
        <Label x={460} y={ROW_A} anchor="end" size={11} color={vizColors.muted}>
          A
        </Label>
        {gate === "nand" && (
          <Label x={460} y={ROW_B} anchor="end" size={11} color={vizColors.muted}>
            B
          </Label>
        )}
        <Label x={460} y={ROW_OUT} anchor="end" size={11} color={vizColors.muted}>
          OUT
        </Label>
        <Label x={460} y={IDD_BASE - 18} anchor="end" size={11} color={vizColors.muted}>
          I_DD
        </Label>
        <path d={levelPath(shown, (e) => e.a, ROW_A)} fill="none" stroke={vizColors.amber} strokeWidth={2} />
        {gate === "nand" && <path d={levelPath(shown, (e) => e.b, ROW_B)} fill="none" stroke={vizColors.amber} strokeWidth={2} />}
        <path d={levelPath(shown, (e) => e.out, ROW_OUT)} fill="none" stroke={vizColors.cyan} strokeWidth={2} />
        <line x1={SC_X0} y1={IDD_BASE} x2={SC_X0 + MAX_HISTORY * SLOT} y2={IDD_BASE} stroke={vizColors.muted} strokeWidth={1.5} />
        {shown.map((e, k) => {
          if (k === 0) return null;
          const x = SC_X0 + k * SLOT;
          const h = e.kind === "rise" ? 40 : e.kind === "fall" ? 7 : 2;
          return (
            <g key={`ev${k}`}>
              <line x1={x} y1={44} x2={x} y2={IDD_BASE} stroke={vizColors.grid} strokeDasharray="2 3" />
              <polygon points={`${x - 5},${IDD_BASE} ${x},${IDD_BASE - h} ${x + 5},${IDD_BASE}`} fill={vizColors.red} />
              <Label x={x} y={IDD_BASE + 14} size={9} color={vizColors.muted}>
                {e.label}
              </Label>
            </g>
          );
        })}
        {shown.length === 1 && (
          <Label x={585} y={IDD_BASE - 30} size={10} color={vizColors.muted}>
            toggle an input to log a change
          </Label>
        )}
        <Label x={430} y={232} anchor="start" size={9} color={vizColors.muted}>
          tall spike: C charged from VDD · small: brief crowbar current only
        </Label>

        {/* ---------- power bar ---------- */}
        <Label x={420} y={262} anchor="start" size={11}>
          Whole-chip dynamic power, α = 0.1, C = 1 nF
        </Label>
        <rect x={440} y={274} width={280} height={18} fill={vizColors.grid} rx={3} />
        <rect x={440} y={274} width={barW} height={18} fill={vizColors.amber} rx={3} />
        {[0, 0.25, 0.5, 0.75].map((p) => (
          <g key={p}>
            <line x1={440 + (p / P_MAX) * 280} y1={292} x2={440 + (p / P_MAX) * 280} y2={298} stroke={vizColors.muted} />
            <Label x={440 + (p / P_MAX) * 280} y={308} size={9} color={vizColors.muted}>
              {p === 0.75 ? "0.75 W" : String(p)}
            </Label>
          </g>
        ))}
        <Label x={440} y={326} anchor="start" size={11} color={vizColors.amber} bold>
          {`P = ${power.toFixed(3)} W at ${fGHz.toFixed(1)} GHz, ${vdd.toFixed(2)} V`}
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
