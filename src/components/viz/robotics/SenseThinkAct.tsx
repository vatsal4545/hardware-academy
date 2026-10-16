"use client";

import { useState } from "react";
import { PlayPause, Slider, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";

/** Leading edge of the stop tape, in mm from the robot's start. */
const LINE_MM = 400;
/** Width of a strip of electrical tape. */
const TAPE_MM = 19;
/** Far end of the drawn floor. */
const END_MM = 620;
/** Short-brake deceleration of a ~0.5 kg robot. */
const DECEL_MM_S2 = 3000;
/** On-screen seconds the approach to the line takes, whatever the speed. */
const APPROACH_S = 3;
/** On-screen pause after each run before it repeats. */
const HOLD_S = 1.4;
/** Fastest loop the ring animates in step with the samples; faster loops spin it at this rate. */
const MAX_VISIBLE_HZ = 2.5;

const X0 = 120;
const PX_PER_MM = 0.9;
const sx = (mm: number) => X0 + mm * PX_PER_MM;

const BAR_X = 418;
const BAR_W = 272;
const BAR_MAX_MM = 250;
const barScale = BAR_W / BAR_MAX_MM;

export interface StopOutcome {
  periodS: number;
  cycleMm: number;
  seen: boolean;
  /** position of the sensor at the sample that saw the tape */
  detectMm: number | null;
  /** index of that sample (0 = first sample) */
  detectSample: number | null;
  brakeStartS: number;
  brakeStartMm: number;
  brakingMm: number;
  stopMm: number;
  /** real seconds until the robot stops or leaves the floor */
  runEndS: number;
}

/** Where a robot driving at `speedMs` stops, if its loop samples the floor at `hz` with the
 *  first sample `phase` (0..1) of a period after the start, reacts one tick after seeing the tape,
 *  then brakes at 3 m/s². Pure, so the lesson text and tests can use it too. */
export function stopOutcome(speedMs: number, hz: number, phase: number): StopOutcome {
  const v = speedMs * 1000;
  const periodS = 1 / hz;
  const cycleMm = v * periodS;
  const brakingMm = (v * v) / (2 * DECEL_MM_S2);
  const k = Math.max(0, Math.ceil(LINE_MM / cycleMm - phase - 1e-9));
  const xk = cycleMm * (phase + k);
  if (xk <= LINE_MM + TAPE_MM) {
    const brakeStartS = (phase + k) * periodS + periodS;
    const brakeStartMm = v * brakeStartS;
    return {
      periodS,
      cycleMm,
      seen: true,
      detectMm: xk,
      detectSample: k,
      brakeStartS,
      brakeStartMm,
      brakingMm,
      stopMm: brakeStartMm + brakingMm,
      runEndS: brakeStartS + v / DECEL_MM_S2,
    };
  }
  return {
    periodS,
    cycleMm,
    seen: false,
    detectMm: null,
    detectSample: null,
    brakeStartS: Infinity,
    brakeStartMm: END_MM,
    brakingMm,
    stopMm: END_MM,
    runEndS: END_MM / v,
  };
}

function positionAt(o: StopOutcome, speedMs: number, t: number): number {
  const v = speedMs * 1000;
  if (t <= o.brakeStartS) return Math.min(v * t, END_MM);
  const s = Math.min(t - o.brakeStartS, v / DECEL_MM_S2);
  return o.brakeStartMm + v * s - 0.5 * DECEL_MM_S2 * s * s;
}

const RING = { cx: 92, cy: 262, r: 44 };
const PHASES = [
  { label: "Sense", detail: "read the line sensor", angle: -90 },
  { label: "Think", detail: "on the tape? then stop", angle: 30 },
  { label: "Act", detail: "write the motor PWM", angle: 150 },
] as const;

const rad = (deg: number) => (deg * Math.PI) / 180;
const ringPoint = (deg: number, r = RING.r) => ({ x: RING.cx + r * Math.cos(rad(deg)), y: RING.cy + r * Math.sin(rad(deg)) });

function formatMm(mm: number): string {
  return mm < 10 ? mm.toFixed(1) : mm.toFixed(0);
}

export function SenseThinkAct() {
  const clock = useViz(true);
  const [logHz, setLogHz] = useState(Math.log10(20));
  const [speed, setSpeed] = useState(0.5);
  const [phase, setPhase] = useState(0.3);

  const hz = Math.round(10 ** logHz);
  const o = stopOutcome(speed, hz, phase);
  const v = speed * 1000;

  // Slow motion: the approach always takes APPROACH_S on screen.
  const rate = LINE_MM / v / APPROACH_S;
  const cycleDisplayS = o.runEndS / rate + HOLD_S;
  const tDisplay = clock.t % cycleDisplayS;
  const tReal = Math.min(tDisplay * rate, o.runEndS);
  const finished = tReal >= o.runEndS;
  const pos = positionAt(o, speed, tReal);
  const braking = o.seen && tReal > o.brakeStartS && !finished;

  // Samples taken so far (drawn up to the one that saw the tape).
  const sampleLimitS = o.seen ? o.brakeStartS - o.periodS : tReal;
  const lastSample = Math.floor(Math.min(tReal, sampleLimitS) / o.periodS - phase + 1e-9);
  const sampleCount = Math.max(0, lastSample + 1);
  const dense = o.cycleMm < 3;
  const samples = dense
    ? []
    : Array.from({ length: sampleCount }, (_, k) => {
        const x = positionAt(o, speed, (phase + k) * o.periodS);
        return { x, onTape: x >= LINE_MM && x <= LINE_MM + TAPE_MM };
      });
  const denseEndMm = dense && sampleCount > 0 ? positionAt(o, speed, (phase + sampleCount - 1) * o.periodS) : 0;

  // Where we are inside the current loop cycle (0 = the sample instant). When the loop is too
  // fast to follow on screen, the ring spins at a capped rate instead of in step with the ticks.
  const visibleHz = hz * rate;
  const inStep = visibleHz <= MAX_VISIBLE_HZ;
  const cyclePos = inStep ? (tDisplay * rate) / o.periodS - phase : clock.t * MAX_VISIBLE_HZ;
  const frac = cyclePos - Math.floor(cyclePos);
  const activePhase = Math.min(2, Math.floor(frac * 3));
  const token = ringPoint(-90 + 360 * frac);

  const pastLineMm = o.stopMm - LINE_MM;
  const lateMm = o.seen && o.detectMm !== null ? o.detectMm - LINE_MM : 0;
  const segments = o.seen
    ? [
        { key: "late", label: "seen late", mm: lateMm, color: vizColors.violet },
        { key: "react", label: "reaction, 1 cycle", mm: o.cycleMm, color: vizColors.cyan },
        { key: "brake", label: "braking v²/2a", mm: o.brakingMm, color: vizColors.orange },
      ]
    : [];
  let cursor = 0;
  const bars = segments.map((s) => {
    const start = Math.min(cursor, BAR_MAX_MM);
    const end = Math.min(cursor + s.mm, BAR_MAX_MM);
    cursor += s.mm;
    const w = (end - start) * barScale;
    return { ...s, x: BAR_X + start * barScale, w: w > 4 ? w - 2 : w };
  });
  const clipped = o.seen && pastLineMm > BAR_MAX_MM;

  const restart = () => clock.reset();

  let status = "";
  if (!o.seen && pos >= LINE_MM + TAPE_MM) status = "missed the line";
  else if (braking) status = "braking";
  else if (finished && o.seen) status = `stopped ${formatMm(pastLineMm)} mm past the line`;

  return (
    <VizFrame
      title="Sense, think, act at a fixed rate"
      description="The robot looks at the floor once per loop cycle (ticks under the track), reacts one cycle after it sees the tape, then brakes at 3 m/s². Change the loop rate and speed and watch where it stops."
      controls={
        <>
          <PlayPause playing={clock.playing} onToggle={clock.toggle} onReset={restart} />
          <Slider
            label="Loop rate"
            value={logHz}
            min={Math.log10(5)}
            max={3}
            step={0.01}
            onChange={(val) => {
              setLogHz(val);
              restart();
            }}
            format={(val) => `${Math.round(10 ** val)} Hz`}
          />
          <Slider
            label="Speed"
            value={speed}
            min={0.1}
            max={1}
            step={0.05}
            unit="m/s"
            onChange={(val) => {
              setSpeed(val);
              restart();
            }}
            format={(val) => `${val.toFixed(2)} m/s`}
          />
          <Slider
            label="Loop phase (when the first sample lands)"
            value={phase}
            min={0}
            max={0.95}
            step={0.05}
            onChange={(val) => {
              setPhase(val);
              restart();
            }}
            format={(val) => `${Math.round(val * 100)}% of a cycle`}
          />
        </>
      }
      footer={
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide">Travel per cycle</dt>
            <dd className="font-mono text-text">
              {formatMm(o.cycleMm)} mm ({(o.periodS * 1000).toFixed(o.periodS < 0.01 ? 1 : 0)} ms period)
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Line detected</dt>
            <dd className="font-mono text-text">
              {o.seen ? `sample ${o.detectSample}, ${formatMm(lateMm)} mm onto the tape` : "never: samples stepped over it"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Braking distance</dt>
            <dd className="font-mono text-text">{formatMm(o.brakingMm)} mm</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Stops</dt>
            <dd className="font-mono text-text">{o.seen ? `${formatMm(pastLineMm)} mm past the line` : "drives through the line"}</dd>
          </div>
        </dl>
      }
    >
      <SvgCanvas viewBox="0 0 720 330" title="A robot approaching a stop line while sampling the floor once per control-loop cycle">
        {/* floor and tape */}
        <rect x={sx(-110)} y={30} width={sx(END_MM) - sx(-110)} height={110} rx={8} fill={vizColors.grid} opacity={0.55} />
        <rect x={sx(LINE_MM)} y={30} width={TAPE_MM * PX_PER_MM} height={110} fill={vizColors.amber} opacity={0.85} />
        <Label x={sx(LINE_MM + TAPE_MM / 2)} y={18} size={11} color={vizColors.muted}>
          stop tape, 19 mm
        </Label>
        <Label x={sx(END_MM)} y={18} size={11} color={vizColors.muted} anchor="end">
          {`playback ${rate < 1 ? rate.toFixed(2) : rate.toFixed(1)}× real time`}
        </Label>
        {status && (
          <Label x={sx(-104)} y={18} size={12} anchor="start" color={!o.seen ? vizColors.red : vizColors.text} bold>
            {!o.seen ? `✕ ${status}` : status}
          </Label>
        )}

        {/* predicted stop position, shown while paused or once the run is over */}
        {o.seen && (!clock.playing || finished) && (
          <g>
            <line
              x1={sx(Math.min(o.stopMm, END_MM))}
              x2={sx(Math.min(o.stopMm, END_MM))}
              y1={30}
              y2={140}
              stroke={vizColors.text}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          </g>
        )}

        {/* robot, sensor at the front edge */}
        <g>
          <rect x={sx(pos) - 92} y={52} width={88} height={66} rx={10} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />
          <rect x={sx(pos) - 66} y={43} width={36} height={9} rx={2} fill={vizColors.muted} />
          <rect x={sx(pos) - 66} y={118} width={36} height={9} rx={2} fill={vizColors.muted} />
          <line x1={sx(pos) - 4} y1={85} x2={sx(pos) - 22} y2={85} stroke={vizColors.cyan} strokeWidth={2} />
          <circle cx={sx(pos) - 3} cy={85} r={5} fill={pos >= LINE_MM && pos <= LINE_MM + TAPE_MM ? vizColors.amber : vizColors.cyan} />
          <Label x={sx(pos) - 52} y={85} size={10} color={vizColors.muted}>
            robot
          </Label>
        </g>

        {/* samples */}
        {samples.map((s, i) => (
          <line
            key={i}
            x1={sx(s.x)}
            x2={sx(s.x)}
            y1={144}
            y2={156}
            stroke={s.onTape ? vizColors.amber : vizColors.green}
            strokeWidth={s.onTape ? 3 : 1.5}
          />
        ))}
        {dense && sampleCount > 0 && (
          <rect x={sx(0)} y={146} width={Math.max(1, sx(denseEndMm) - sx(0))} height={8} rx={2} fill={vizColors.green} opacity={0.7} />
        )}
        <Label x={sx(-104)} y={150} size={10} anchor="start" color={vizColors.muted}>
          samples
        </Label>

        {/* ruler */}
        {Array.from({ length: 7 }, (_, i) => i * 100).map((mm) => (
          <g key={mm}>
            <line x1={sx(mm)} x2={sx(mm)} y1={162} y2={168} stroke={vizColors.muted} strokeWidth={1} />
            <Label x={sx(mm)} y={178} size={10} color={vizColors.muted}>
              {mm === 600 ? "600 mm" : String(mm)}
            </Label>
          </g>
        ))}

        {/* the loop */}
        <circle cx={RING.cx} cy={RING.cy} r={RING.r} fill="none" stroke={vizColors.grid} strokeWidth={3} />
        {[-30, 90, 210].map((a) => {
          const p = ringPoint(a);
          const tx = -Math.sin(rad(a));
          const ty = Math.cos(rad(a));
          return <Arrow key={a} x1={p.x - 5 * tx} y1={p.y - 5 * ty} x2={p.x + 5 * tx} y2={p.y + 5 * ty} color={vizColors.muted} width={2} head={7} />;
        })}
        <circle cx={token.x} cy={token.y} r={5} fill={vizColors.amber} />
        {PHASES.map((ph, i) => {
          const p = ringPoint(ph.angle);
          const active = i === activePhase;
          return (
            <g key={ph.label}>
              <circle cx={p.x} cy={p.y} r={19} fill={active ? vizColors.cyan : vizColors.bg} stroke={vizColors.cyan} strokeWidth={1.5} />
              <Label x={p.x} y={p.y} size={10} color={active ? vizColors.bg : vizColors.text} bold>
                {ph.label}
              </Label>
            </g>
          );
        })}
        <Label x={RING.cx} y={RING.cy} size={10} color={vizColors.muted} mono>
          {`#${sampleCount}`}
        </Label>
        {PHASES.map((ph, i) => (
          <Label
            key={ph.label}
            x={168}
            y={226 + i * 20}
            size={11}
            anchor="start"
            color={i === activePhase ? vizColors.text : vizColors.muted}
            bold={i === activePhase}
          >
            {`${ph.label}: ${ph.detail}`}
          </Label>
        ))}
        <Label x={168} y={292} size={11} anchor="start" color={vizColors.muted}>
          {inStep ? `${(o.periodS * 1000).toFixed(0)} ms loop, in step with the ticks` : `${hz} Hz loop, ring slowed to follow`}
        </Label>

        {/* overshoot breakdown */}
        <Label x={BAR_X} y={206} size={12} anchor="start" bold>
          Where the overshoot comes from
        </Label>
        {o.seen ? (
          <>
            {bars.map((b) =>
              b.w > 0 ? <rect key={b.key} x={b.x} y={220} width={b.w} height={16} rx={3} fill={b.color} /> : null,
            )}
            {clipped && (
              <Label x={BAR_X + BAR_W + 4} y={228} size={12} anchor="start" color={vizColors.text}>
                ▸
              </Label>
            )}
            {[0, 50, 100, 150, 200, 250].map((mm) => (
              <g key={mm}>
                <line x1={BAR_X + mm * barScale} x2={BAR_X + mm * barScale} y1={240} y2={245} stroke={vizColors.muted} />
                <Label x={BAR_X + mm * barScale} y={253} size={9} color={vizColors.muted}>
                  {mm === 250 ? "250 mm" : String(mm)}
                </Label>
              </g>
            ))}
            {segments.map((s, i) => (
              <g key={s.key}>
                <rect x={BAR_X} y={266 + i * 17} width={10} height={10} rx={2} fill={s.color} />
                <Label x={BAR_X + 16} y={271 + i * 17} size={11} anchor="start" color={vizColors.muted}>
                  {`${s.label}: ${formatMm(s.mm)} mm`}
                </Label>
              </g>
            ))}
            <Label x={BAR_X + BAR_W} y={271} size={11} anchor="end" bold>
              {`total ${formatMm(pastLineMm)} mm`}
            </Label>
          </>
        ) : (
          <>
            <Label x={BAR_X} y={232} size={12} anchor="start" color={vizColors.red} bold>
              ✕ No sample landed on the tape
            </Label>
            <Label x={BAR_X} y={254} size={11} anchor="start" color={vizColors.muted}>
              {`Travel per cycle (${formatMm(o.cycleMm)} mm) is wider than the 19 mm tape,`}
            </Label>
            <Label x={BAR_X} y={272} size={11} anchor="start" color={vizColors.muted}>
              so two samples straddled it. Raise the loop rate,
            </Label>
            <Label x={BAR_X} y={290} size={11} anchor="start" color={vizColors.muted}>
              or slow down near the line.
            </Label>
          </>
        )}
      </SvgCanvas>
    </VizFrame>
  );
}
