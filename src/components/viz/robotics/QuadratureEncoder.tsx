"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import {
  Arrow,
  Label,
  SvgCanvas,
  polyline,
  useAnimationFrame,
  usePrefersReducedMotion,
  vizColors,
} from "@/components/viz/shared";

/** N20 magnetic encoder: 7 pulses per motor revolution on each channel. */
const PPR = 7;
const GEAR = 50;
const WHEEL_MM = 44;
const WINDOW_S = 2.5;
/** Start half an edge into a state so single steps land in the middle of the next one. */
const EDGE_REV = 1 / (4 * PPR);
const START_REV = EDGE_REV / 2;

type Decoding = "x1" | "x2" | "x4";

const CX = 130;
const CY = 132;
const R_OUT = 92;
const R_IN = 58;
/** Sensor A at the top; B sits 1¼ pole-pair pitches away, which is 90° electrical. */
const PHI_A = -90;
const PHI_B = PHI_A + (360 * 1.25) / PPR;

const SCOPE_X0 = 272;
const SCOPE_X1 = 700;
const A_HI = 44;
const A_LO = 78;
const B_HI = 112;
const B_LO = 146;

const frac = (x: number) => x - Math.floor(x);
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Channel levels for a shaft position in revolutions. A leads B when the shaft turns clockwise. */
export function quadratureChannels(rev: number): { a: 0 | 1; b: 0 | 1 } {
  const e = rev * PPR;
  return { a: frac(e) < 0.5 ? 1 : 0, b: frac(e - 0.25) < 0.5 ? 1 : 0 };
}

/** Signed count since the start position for a decoding mode. */
export function quadratureCount(rev: number, decoding: Decoding): number {
  const per = decoding === "x4" ? 4 : decoding === "x2" ? 2 : 1;
  return Math.floor(rev * PPR * per + 1e-9) - Math.floor(START_REV * PPR * per + 1e-9);
}

interface Sim {
  t: number;
  rev: number;
  hist: Array<[number, number]>;
}

const initialSim = (): Sim => ({ t: 0, rev: START_REV, hist: [[0, START_REV]] });

function pushSample(s: Sim, dt: number, rev: number): Sim {
  const t = s.t + dt;
  const cutoff = t - WINDOW_S - 0.2;
  const keepFrom = s.hist.findIndex(([ht]) => ht >= cutoff);
  const hist = (keepFrom > 0 ? s.hist.slice(keepFrom - 1) : s.hist).concat([[t, rev]]);
  return { t, rev, hist };
}

function sectorPath(a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(CX + r * Math.cos(rad(a))).toFixed(2)} ${(CY + r * Math.sin(rad(a))).toFixed(2)}`;
  return `M${p(R_OUT, a0)} A${R_OUT} ${R_OUT} 0 0 1 ${p(R_OUT, a1)} L${p(R_IN, a1)} A${R_IN} ${R_IN} 0 0 0 ${p(R_IN, a0)} Z`;
}

/** Disk-frame segments: a point at disk angle λ is a north pole when channel A would read 1 there. */
const SEGMENTS = Array.from({ length: 2 * PPR }, (_, m) => {
  const a1 = PHI_A - (360 / (2 * PPR)) * m;
  const a0 = a1 - 360 / (2 * PPR);
  const mid = (a0 + a1) / 2;
  const north = frac((PPR * (PHI_A - mid)) / 360) < 0.5;
  return { a0, a1, north };
});

const STATES = ["10", "11", "01", "00"] as const;

export function QuadratureEncoder() {
  const reduced = usePrefersReducedMotion();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduced;
  const [rpm, setRpm] = useState(12);
  const [decoding, setDecoding] = useState<Decoding>("x4");
  const [sim, setSim] = useState<Sim>(initialSim);

  useAnimationFrame((dt) => {
    setSim((s) => pushSample(s, dt, s.rev + (rpm / 60) * dt));
  }, playing);

  const step = () => {
    const dir = rpm < 0 ? -1 : 1;
    setSim((s) => {
      const k = Math.round((s.rev - START_REV) / EDGE_REV) + dir;
      return pushSample(s, 0.18, START_REV + k * EDGE_REV);
    });
  };

  const { a, b } = quadratureChannels(sim.rev);
  const state = `${a}${b}`;
  const count = quadratureCount(sim.rev, decoding);
  const prev = sim.hist.length > 1 ? sim.hist[sim.hist.length - 2][1] : sim.rev;
  const moving = Math.abs(sim.rev - prev) > 1e-9;
  const cw = sim.rev - prev > 0;
  const direction = !moving ? (rpm === 0 ? "stopped" : rpm > 0 ? "clockwise" : "counter-clockwise") : cw ? "clockwise" : "counter-clockwise";
  const leader = direction === "stopped" ? "no edges" : direction === "clockwise" ? "A leads B" : "B leads A";
  const wheelMm = ((sim.rev - START_REV) / GEAR) * Math.PI * WHEEL_MM;
  const perMm = (PPR * (decoding === "x4" ? 4 : decoding === "x2" ? 2 : 1) * GEAR) / (Math.PI * WHEEL_MM);

  // Scope traces: step lines over the last WINDOW_S seconds.
  const xOf = (t: number) => SCOPE_X1 - ((sim.t - t) / WINDOW_S) * (SCOPE_X1 - SCOPE_X0);
  const tracePts = (chan: "a" | "b", hi: number, lo: number) => {
    const pts: Array<[number, number]> = [];
    let last: number | null = null;
    for (const [t, rev] of sim.hist) {
      const x = Math.max(SCOPE_X0, xOf(t));
      const level = quadratureChannels(rev)[chan];
      const y = level ? hi : lo;
      if (last !== null && last !== y) pts.push([x, last]);
      pts.push([x, y]);
      last = y;
    }
    return pts;
  };
  const aPts = tracePts("a", A_HI, A_LO);
  const bPts = tracePts("b", B_HI, B_LO);
  const psi = sim.rev * 360;

  const sensor = (phi: number, label: "A" | "B", on: boolean, color: string) => {
    const x = CX + (R_OUT + 14) * Math.cos(rad(phi));
    const y = CY + (R_OUT + 14) * Math.sin(rad(phi));
    return (
      <g>
        <rect
          x={x - 10}
          y={y - 8}
          width={20}
          height={16}
          rx={3}
          fill={on ? color : vizColors.bg}
          stroke={color}
          strokeWidth={2}
          transform={`rotate(${phi + 90} ${x} ${y})`}
        />
        <Label x={x + 18 * Math.cos(rad(phi))} y={y + 18 * Math.sin(rad(phi))} size={12} bold color={vizColors.text}>
          {label}
        </Label>
      </g>
    );
  };

  return (
    <VizFrame
      title="Quadrature encoder: two channels, direction and count"
      description="The N20's magnetic disc has 7 pole pairs, so each Hall sensor gives 7 pulses per motor turn. B sits a quarter cycle behind A. Watch which channel leads when you reverse."
      controls={
        <>
          <PlayPause
            playing={playing}
            onToggle={() => setUserPlaying(!playing)}
            onStep={step}
            onReset={() => setSim(initialSim())}
          />
          <Slider label="Shaft speed (slowed down)" value={rpm} min={-40} max={40} step={1} unit="rpm" onChange={setRpm} />
          <Segmented
            label="Decoding"
            options={[
              { value: "x1", label: "×1" },
              { value: "x2", label: "×2" },
              { value: "x4", label: "×4" },
            ]}
            value={decoding}
            onChange={setDecoding}
          />
        </>
      }
      footer={
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide">Direction</dt>
            <dd className="font-mono text-text">
              {direction} ({leader})
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Count ({decoding.replace("x", "×")})</dt>
            <dd className="font-mono text-text">{count}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Resolution at the wheel</dt>
            <dd className="font-mono text-text">{perMm.toFixed(2)} counts/mm</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Wheel travel (50:1, 44 mm)</dt>
            <dd className="font-mono text-text">{wheelMm.toFixed(2)} mm</dd>
          </div>
        </dl>
      }
    >
      <SvgCanvas viewBox="0 0 720 300" title="Encoder disc with two Hall sensors and the A and B square waves they produce">
        {/* disc */}
        <g transform={`rotate(${psi.toFixed(2)} ${CX} ${CY})`}>
          {SEGMENTS.map((sg, i) => (
            <path key={i} d={sectorPath(sg.a0, sg.a1)} fill={sg.north ? vizColors.red : vizColors.blue} opacity={0.75} stroke={vizColors.bg} strokeWidth={1.5} />
          ))}
          <circle cx={CX} cy={CY} r={R_IN - 2} fill={vizColors.bg} stroke={vizColors.grid} />
          <line x1={CX} y1={CY} x2={CX + R_IN - 8} y2={CY} stroke={vizColors.text} strokeWidth={3} strokeLinecap="round" />
        </g>
        <circle cx={CX} cy={CY} r={9} fill={vizColors.muted} />
        {sensor(PHI_A, "A", a === 1, vizColors.cyan)}
        {sensor(PHI_B, "B", b === 1, vizColors.violet)}
        <Label x={CX} y={CY + R_OUT + 30} size={11} color={vizColors.muted}>
          red = N pole, blue = S pole
        </Label>
        {direction !== "stopped" && (
          <Arrow
            x1={CX + (cw ? -26 : 26)}
            y1={CY + R_OUT + 46}
            x2={CX + (cw ? 26 : -26)}
            y2={CY + R_OUT + 46}
            color={vizColors.amber}
            width={2.5}
          />
        )}
        <Label x={CX} y={CY + R_OUT + 64} size={11} color={vizColors.text}>
          {direction}
        </Label>

        {/* scope */}
        <rect x={SCOPE_X0 - 8} y={26} width={SCOPE_X1 - SCOPE_X0 + 16} height={138} rx={6} fill={vizColors.grid} opacity={0.4} />
        <Label x={SCOPE_X0 - 16} y={(A_HI + A_LO) / 2} size={13} anchor="end" bold>
          A
        </Label>
        <Label x={SCOPE_X0 - 16} y={(B_HI + B_LO) / 2} size={13} anchor="end" bold>
          B
        </Label>
        <path d={polyline(aPts)} fill="none" stroke={vizColors.cyan} strokeWidth={2} />
        <path d={polyline(bPts)} fill="none" stroke={vizColors.violet} strokeWidth={2} />
        {[2, 1, 0].map((s) => (
          <Label key={s} x={SCOPE_X1 - (s / WINDOW_S) * (SCOPE_X1 - SCOPE_X0)} y={176} size={10} color={vizColors.muted}>
            {s === 0 ? "now" : `−${s} s`}
          </Label>
        ))}

        {/* state sequence */}
        <Label x={SCOPE_X0 - 8} y={204} size={11} anchor="start" color={vizColors.muted}>
          AB state, clockwise →
        </Label>
        {STATES.map((st, i) => {
          const x = SCOPE_X0 + 130 + i * 76;
          const active = st === state;
          return (
            <g key={st}>
              <rect x={x} y={190} width={54} height={30} rx={6} fill={active ? vizColors.amber : vizColors.bg} stroke={vizColors.amber} strokeWidth={1.5} />
              <Label x={x + 27} y={205} size={13} mono bold color={active ? vizColors.bg : vizColors.text}>
                {st}
              </Label>
              {i < STATES.length - 1 && <Arrow x1={x + 58} y1={205} x2={x + 72} y2={205} color={vizColors.muted} width={1.5} head={6} />}
            </g>
          );
        })}
        <path
          d={`M${SCOPE_X0 + 130 + 3 * 76 + 27} 222 L${SCOPE_X0 + 130 + 3 * 76 + 27} 236 L${SCOPE_X0 + 157} 236 L${SCOPE_X0 + 157} 224`}
          fill="none"
          stroke={vizColors.muted}
          strokeWidth={1.5}
        />
        <Label x={SCOPE_X0 - 8} y={252} size={11} anchor="start" color={vizColors.muted}>
          Counter-clockwise walks the same ring backwards.
        </Label>
        <Label x={SCOPE_X0 - 8} y={268} size={11} anchor="start" color={vizColors.muted}>
          Only one bit changes per edge (a Gray code), so every
        </Label>
        <Label x={SCOPE_X0 - 8} y={284} size={11} anchor="start" color={vizColors.muted}>
          transition tells the decoder which way the shaft moved.
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
