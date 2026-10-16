"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import {
  Label,
  SvgCanvas,
  polyline,
  useAnimationFrame,
  usePrefersReducedMotion,
  vizColors,
} from "@/components/viz/shared";

type StepMode = "full" | "half" | "micro16";
const MICRO: Record<StepMode, number> = { full: 1, half: 2, micro16: 16 };
const FULL_STEP_DEG = 1.8;

/** Coil currents (fraction of the rated current) at microstep `k`, A4988-style: the home state is 45°,
 *  full steps sit at 45° + n·90° with both coils at 70.7%, and microsteps follow cos/sin in between. */
export function stepperCurrents(k: number, microsteps: number): { ia: number; ib: number; electricalDeg: number } {
  const electricalDeg = 45 + (k * 90) / microsteps;
  const a = (electricalDeg * Math.PI) / 180;
  return { ia: Math.cos(a), ib: Math.sin(a), electricalDeg };
}

const C = { x: 150, y: 150 };
const R_STATOR = 118;
const POLES = [
  { name: "A+", deg: -90, phase: "a", sign: 1 },
  { name: "B+", deg: 0, phase: "b", sign: 1 },
  { name: "A−", deg: 90, phase: "a", sign: -1 },
  { name: "B−", deg: 180, phase: "b", sign: -1 },
] as const;

const PLOT = { x0: 340, x1: 700, mid: 196, amp: 52 };
const rad = (deg: number) => (deg * Math.PI) / 180;

export function StepperSteps() {
  const reduced = usePrefersReducedMotion();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduced;
  const [mode, setMode] = useState<StepMode>("half");
  const [rate, setRate] = useState(1);
  const [pos, setPos] = useState(0.0001);

  useAnimationFrame((dt) => setPos((p) => p + rate * dt), playing);

  const mu = MICRO[mode];
  const k = Math.floor(pos * mu + 1e-9);
  const { ia, ib, electricalDeg } = stepperCurrents(k, mu);
  const fieldScreen = -90 + electricalDeg;
  const shaftDeg = (k / mu) * FULL_STEP_DEG;
  const stepsPerRev = 200 * mu;

  // Staircase of both currents over one electrical cycle (4 full steps), with the cursor.
  const n = 4 * mu;
  const xOf = (stepPos: number) => PLOT.x0 + (stepPos / 4) * (PLOT.x1 - PLOT.x0);
  const stair = (pick: "ia" | "ib") => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < n; i++) {
      const cur = stepperCurrents(i, mu)[pick];
      const y = PLOT.mid - cur * PLOT.amp;
      pts.push([xOf(i / mu), y], [xOf((i + 1) / mu), y]);
    }
    return polyline(pts);
  };
  const cyclePos = (k % n) / mu;
  const cursorX = xOf(cyclePos);

  const bar = (v: number, y: number, color: string, label: string) => (
    <g>
      <rect x={430} y={y - 7} width={180} height={14} rx={3} fill={vizColors.grid} />
      <rect x={v >= 0 ? 520 : 520 + v * 90} y={y - 7} width={Math.abs(v) * 90} height={14} rx={3} fill={color} />
      <line x1={520} x2={520} y1={y - 10} y2={y + 10} stroke={vizColors.muted} />
      <Label x={420} y={y} size={12} anchor="end" bold>
        {label}
      </Label>
      <Label x={620} y={y} size={11} anchor="start" mono color={vizColors.text}>
        {`${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(0)}%`}
      </Label>
    </g>
  );

  return (
    <VizFrame
      title="Stepper phases: full, half and microstepping"
      description="Two coils, A and B, steer a magnetic field; the rotor's north pole follows it. Drawn as a 2-pole rotor, so one turn here is one electrical cycle: 4 full steps, or 7.2° on a real 1.8° motor."
      controls={
        <>
          <PlayPause
            playing={playing}
            onToggle={() => setUserPlaying(!playing)}
            onStep={() => setPos((p) => (Math.floor(p * mu + 1e-9) + 1) / mu + 0.0001)}
            onReset={() => setPos(0.0001)}
          />
          <Segmented
            label="Drive mode"
            options={[
              { value: "full", label: "Full step" },
              { value: "half", label: "Half step" },
              { value: "micro16", label: "1/16 micro" },
            ]}
            value={mode}
            onChange={setMode}
          />
          <Slider label="Speed" value={rate} min={0.25} max={4} step={0.25} unit="full steps/s" onChange={setRate} format={(v) => `${v} full steps/s`} />
        </>
      }
      footer={
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide">Position</dt>
            <dd className="font-mono text-text">
              {mode === "full" ? "step" : "microstep"} {k}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Electrical angle</dt>
            <dd className="font-mono text-text">{(electricalDeg % 360).toFixed(1)}°</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Shaft angle (200-step motor)</dt>
            <dd className="font-mono text-text">{shaftDeg.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}°</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Positions per revolution</dt>
            <dd className="font-mono text-text">
              {stepsPerRev.toLocaleString("en-US")} ({(FULL_STEP_DEG / mu).toFixed(4).replace(/0+$/, "")}° each)
            </dd>
          </div>
        </dl>
      }
    >
      <SvgCanvas viewBox="0 0 720 300" title="Two-phase stepper with coil currents and the rotor following the stator field">
        {/* stator */}
        <circle cx={C.x} cy={C.y} r={R_STATOR} fill="none" stroke={vizColors.grid} strokeWidth={14} />
        {POLES.map((p) => {
          const cur = (p.phase === "a" ? ia : ib) * p.sign;
          const strength = Math.abs(cur);
          const color = p.phase === "a" ? vizColors.cyan : vizColors.violet;
          return (
            <g key={p.name} transform={`rotate(${p.deg} ${C.x} ${C.y})`}>
              <rect x={C.x + 52} y={C.y - 16} width={60} height={32} rx={4} fill={vizColors.bg} stroke={vizColors.muted} strokeWidth={1.5} />
              {[0, 1, 2, 3].map((w) => (
                <rect key={w} x={C.x + 64 + w * 11} y={C.y - 19} width={7} height={38} rx={2} fill={color} opacity={0.15 + 0.85 * strength} />
              ))}
              {/* pole face: the field points into an S face, which the rotor's N is pulled toward */}
              <rect
                x={C.x + 46}
                y={C.y - 20}
                width={8}
                height={40}
                rx={2}
                fill={cur > 0.05 ? vizColors.blue : cur < -0.05 ? vizColors.red : vizColors.muted}
                opacity={0.4 + 0.6 * strength}
              />
            </g>
          );
        })}
        {POLES.map((p) => (
          <Label key={p.name} x={C.x + 140 * Math.cos(rad(p.deg))} y={C.y + 138 * Math.sin(rad(p.deg))} size={11} bold>
            {p.name}
          </Label>
        ))}

        {/* rotor: north end points along the field */}
        <g transform={`rotate(${fieldScreen.toFixed(2)} ${C.x} ${C.y})`}>
          <rect x={C.x} y={C.y - 10} width={36} height={20} rx={4} fill={vizColors.red} />
          <rect x={C.x - 36} y={C.y - 10} width={36} height={20} rx={4} fill={vizColors.blue} />
          <Label x={C.x + 22} y={C.y} size={11} bold color={vizColors.bg}>
            N
          </Label>
          <Label x={C.x - 22} y={C.y} size={11} bold color={vizColors.bg}>
            S
          </Label>
        </g>
        <circle cx={C.x} cy={C.y} r={5} fill={vizColors.text} />

        {/* coil current bars */}
        {bar(ia, 36, vizColors.cyan, "Coil A")}
        {bar(ib, 64, vizColors.violet, "Coil B")}

        {/* one electrical cycle of current */}
        <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.mid} y2={PLOT.mid} stroke={vizColors.grid} strokeWidth={1.5} />
        <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.mid - PLOT.amp} y2={PLOT.mid - PLOT.amp} stroke={vizColors.grid} strokeWidth={1} />
        <line x1={PLOT.x0} x2={PLOT.x1} y1={PLOT.mid + PLOT.amp} y2={PLOT.mid + PLOT.amp} stroke={vizColors.grid} strokeWidth={1} />
        <Label x={PLOT.x0 - 6} y={PLOT.mid - PLOT.amp} size={9.5} anchor="end" color={vizColors.muted}>
          +100%
        </Label>
        <Label x={PLOT.x0 - 6} y={PLOT.mid + PLOT.amp} size={9.5} anchor="end" color={vizColors.muted}>
          −100%
        </Label>
        <path d={stair("ia")} fill="none" stroke={vizColors.cyan} strokeWidth={2} />
        <path d={stair("ib")} fill="none" stroke={vizColors.violet} strokeWidth={2} />
        <line x1={cursorX} x2={cursorX} y1={PLOT.mid - PLOT.amp - 14} y2={PLOT.mid + PLOT.amp + 8} stroke={vizColors.amber} strokeWidth={1.5} />
        {[0, 1, 2, 3, 4].map((s) => (
          <Label key={s} x={xOf(s)} y={PLOT.mid + PLOT.amp + 20} size={10} color={vizColors.muted}>
            {String(s)}
          </Label>
        ))}
        <Label x={(PLOT.x0 + PLOT.x1) / 2} y={PLOT.mid + PLOT.amp + 38} size={10} color={vizColors.muted}>
          position in full steps (one electrical cycle = 4 full steps = 7.2° of shaft)
        </Label>
        <Label x={PLOT.x0} y={PLOT.mid - PLOT.amp - 24} size={11} anchor="start" color={vizColors.muted}>
          coil currents over one electrical cycle
        </Label>
        <line x1={600} x2={616} y1={PLOT.mid - PLOT.amp - 24} y2={PLOT.mid - PLOT.amp - 24} stroke={vizColors.cyan} strokeWidth={2} />
        <Label x={620} y={PLOT.mid - PLOT.amp - 24} size={10} anchor="start" color={vizColors.muted}>
          A
        </Label>
        <line x1={640} x2={656} y1={PLOT.mid - PLOT.amp - 24} y2={PLOT.mid - PLOT.amp - 24} stroke={vizColors.violet} strokeWidth={2} />
        <Label x={660} y={PLOT.mid - PLOT.amp - 24} size={10} anchor="start" color={vizColors.muted}>
          B
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
