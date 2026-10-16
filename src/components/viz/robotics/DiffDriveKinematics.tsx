"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useAnimationFrame, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";
import { diffDrive } from "@/lib/sim/kinematics";
import { RoundedArrow as Arrow, r2 } from "./RoundedArrow";

type Mode = "free" | "square";
type Direction = "ccw" | "cw";

interface Pose {
  x: number;
  y: number;
  theta: number;
}

interface Params {
  mode: Mode;
  direction: Direction;
  vl: number;
  vr: number;
  wheelBase: number;
  /** right wheel effective diameter error, fraction (0.005 = 0.5% larger) */
  diameterErr: number;
  /** true wheel base error, fraction (0.03 = 3% wider than the nominal value odometry uses) */
  baseErr: number;
}

interface Sim {
  truth: Pose;
  est: Pose;
  trailTruth: Array<[number, number]>;
  trailEst: Array<[number, number]>;
  leg: number;
  legProgress: number;
  time: number;
  done: boolean;
}

// Arena in centimetres, drawn at S px per cm.
const W = 200;
const H = 140;
const S = 3;
const PAD = 20;
const VB_W = W * S + 2 * PAD;
const VB_H = H * S + 2 * PAD;
const SIDE = 100; // square test side, cm
const SQUARE_SPEED = 20; // cm/s on the straights
const TURN_SPEED = 12; // cm/s per wheel while turning in place
const SUBSTEP = 0.005; // s
const MAX_TRAIL = 1500;
const ARROW_SCALE = 0.75; // cm of arrow per cm/s of wheel speed

const FREE_START: Pose = { x: 100, y: 60, theta: 0 };

function squareStart(direction: Direction): Pose {
  return direction === "ccw" ? { x: 50, y: 20, theta: 0 } : { x: 50, y: 120, theta: 0 };
}

function initialSim(mode: Mode, direction: Direction): Sim {
  const start = mode === "free" ? FREE_START : squareStart(direction);
  return {
    truth: start,
    est: start,
    trailTruth: [[start.x, start.y]],
    trailEst: [[start.x, start.y]],
    leg: 0,
    legProgress: 0,
    time: 0,
    done: false,
  };
}

/** Exact arc integration of the unicycle model over dt, using the shared diffDrive kinematics. */
function integrate(p: Pose, vl: number, vr: number, wheelBase: number, dt: number): Pose {
  const { v, omega } = diffDrive(vl, vr, wheelBase);
  if (Math.abs(omega) < 1e-9) {
    return { x: p.x + v * dt * Math.cos(p.theta), y: p.y + v * dt * Math.sin(p.theta), theta: p.theta };
  }
  const theta = p.theta + omega * dt;
  const r = v / omega;
  return {
    x: p.x + r * (Math.sin(theta) - Math.sin(p.theta)),
    y: p.y - r * (Math.cos(theta) - Math.cos(p.theta)),
    theta,
  };
}

function pushTrail(trail: Array<[number, number]>, p: Pose): Array<[number, number]> {
  const last = trail[trail.length - 1];
  if (last && Math.hypot(last[0] - p.x, last[1] - p.y) < 0.8) return trail;
  const next = trail.length >= MAX_TRAIL ? trail.slice(trail.length - MAX_TRAIL + 1) : trail.slice();
  next.push([p.x, p.y]);
  return next;
}

function outOfArena(p: Pose): boolean {
  return p.x < 0 || p.x > W || p.y < 0 || p.y > H;
}

/** Commanded wheel speeds for the current leg of the square test. */
function squareCommand(leg: number, direction: Direction): { vl: number; vr: number; straight: boolean } {
  const straight = leg % 2 === 0;
  if (straight) return { vl: SQUARE_SPEED, vr: SQUARE_SPEED, straight };
  const sign = direction === "ccw" ? 1 : -1;
  return { vl: -sign * TURN_SPEED, vr: sign * TURN_SPEED, straight };
}

function advance(s: Sim, dt: number, p: Params): Sim {
  let { truth, est, leg, legProgress, time, done } = s;
  const trueBase = p.wheelBase * (1 + p.baseErr);
  const rightScale = 1 + p.diameterErr;
  let remaining = dt;
  while (remaining > 1e-9) {
    let h = Math.min(SUBSTEP, remaining);
    remaining -= h;
    if (p.mode === "free") {
      // Odometry believes the nominal wheel sizes and wheel base; the real robot does not.
      est = integrate(est, p.vl, p.vr, p.wheelBase, h);
      truth = integrate(truth, p.vl, p.vr * rightScale, trueBase, h);
      time += h;
      if (outOfArena(truth)) return initialSim("free", p.direction);
      continue;
    }
    if (done) break;
    // Square test: the controller only sees odometry, so it ends each leg when the ESTIMATE says so.
    const cmd = squareCommand(leg, p.direction);
    const { v, omega } = diffDrive(cmd.vl, cmd.vr, p.wheelBase);
    const rate = cmd.straight ? Math.abs(v) : Math.abs(omega);
    const goal = cmd.straight ? SIDE : Math.PI / 2;
    let legDone = false;
    if (legProgress + rate * h >= goal) {
      h = (goal - legProgress) / rate;
      legDone = true;
    }
    est = integrate(est, cmd.vl, cmd.vr, p.wheelBase, h);
    truth = integrate(truth, cmd.vl, cmd.vr * rightScale, trueBase, h);
    legProgress += rate * h;
    time += h;
    if (legDone) {
      leg += 1;
      legProgress = 0;
      if (leg >= 8) done = true;
    }
  }
  return {
    truth,
    est,
    trailTruth: pushTrail(s.trailTruth, truth),
    trailEst: pushTrail(s.trailEst, est),
    leg,
    legProgress,
    time,
    done,
  };
}

const sx = (x: number) => r2(PAD + x * S);
const sy = (y: number) => r2(PAD + (H - y) * S);

function fmt(x: number, digits = 1): string {
  const v = Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x;
  return v.toFixed(digits);
}

/** Wrap degrees into (−180, 180] for display. */
function wrapDeg(d: number): number {
  const w = ((((d + 180) % 360) + 360) % 360) - 180;
  return w === -180 ? 180 : w;
}

function trailPath(trail: Array<[number, number]>): string {
  return polyline(trail.map(([x, y]) => [sx(x), sy(y)]));
}

function RobotGlyph({ pose, wheelBase, color, ghost = false }: { pose: Pose; wheelBase: number; color: string; ghost?: boolean }) {
  const bodyR = (wheelBase / 2 + 1.5) * S;
  const half = (wheelBase / 2) * S;
  const deg = (-pose.theta * 180) / Math.PI;
  return (
    <g transform={`translate(${sx(pose.x).toFixed(2)} ${sy(pose.y).toFixed(2)}) rotate(${deg.toFixed(2)})`} opacity={ghost ? 0.9 : 1}>
      <circle
        r={bodyR}
        fill={ghost ? "none" : vizColors.bg}
        fillOpacity={ghost ? 0 : 0.85}
        stroke={color}
        strokeWidth={ghost ? 1.5 : 2}
        strokeDasharray={ghost ? "4 3" : undefined}
      />
      {!ghost && (
        <>
          <rect x={r2(-2.15 * S)} y={r2(-half - S)} width={r2(4.3 * S)} height={2 * S} rx={2} fill={vizColors.muted} />
          <rect x={r2(-2.15 * S)} y={r2(half - S)} width={r2(4.3 * S)} height={2 * S} rx={2} fill={vizColors.muted} />
          <circle cx={-bodyR + 4} cy={0} r={2.5} fill={vizColors.grid} stroke={vizColors.muted} />
        </>
      )}
      <line x1={0} y1={0} x2={bodyR} y2={0} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

export function DiffDriveKinematics() {
  const reducedMotion = usePrefersReducedMotion();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reducedMotion;

  const [mode, setMode] = useState<Mode>("free");
  const [direction, setDirection] = useState<Direction>("ccw");
  const [vl, setVl] = useState(15);
  const [vr, setVr] = useState(25);
  const [wheelBase, setWheelBase] = useState(12);
  const [diameterErrPct, setDiameterErrPct] = useState(0);
  const [baseErrPct, setBaseErrPct] = useState(0);
  const [sim, setSim] = useState<Sim>(() => initialSim("free", "ccw"));

  const params: Params = {
    mode,
    direction,
    vl,
    vr,
    wheelBase,
    diameterErr: diameterErrPct / 100,
    baseErr: baseErrPct / 100,
  };

  const running = playing && !(mode === "square" && sim.done);
  useAnimationFrame((dt) => setSim((s) => advance(s, dt, params)), running);

  const restart = (m: Mode = mode, d: Direction = direction) => setSim(initialSim(m, d));

  // Nominal (commanded) kinematics for the readouts.
  const nominal = diffDrive(vl, vr, wheelBase);
  // What the real robot does, for drawing the ICC at its true pose.
  const trueBase = wheelBase * (1 + params.baseErr);
  const actual = diffDrive(vl, vr * (1 + params.diameterErr), trueBase);
  const rText =
    Math.abs(nominal.omega) < 1e-9 ? (Math.abs(nominal.v) < 1e-9 ? "R = — (stopped)" : "R = ∞ (straight)") : `R = ${fmt(nominal.v / nominal.omega)} cm`;

  const { truth, est } = sim;
  const errorCm = Math.hypot(truth.x - est.x, truth.y - est.y);
  const headingErrDeg = wrapDeg(((truth.theta - est.theta) * 180) / Math.PI);

  // Wheel geometry at the true pose (world coordinates).
  const half = trueBase / 2;
  const nx = -Math.sin(truth.theta); // unit vector to the robot's left
  const ny = Math.cos(truth.theta);
  const hx = Math.cos(truth.theta);
  const hy = Math.sin(truth.theta);
  const cmd = mode === "free" ? { vl, vr } : squareCommand(sim.leg, direction);
  const realVl = sim.done && mode === "square" ? 0 : cmd.vl;
  const realVr = sim.done && mode === "square" ? 0 : cmd.vr * (1 + params.diameterErr);
  const wheelL = { x: truth.x + nx * half, y: truth.y + ny * half };
  const wheelR = { x: truth.x - nx * half, y: truth.y - ny * half };
  const tipL = { x: wheelL.x + hx * realVl * ARROW_SCALE, y: wheelL.y + hy * realVl * ARROW_SCALE };
  const tipR = { x: wheelR.x + hx * realVr * ARROW_SCALE, y: wheelR.y + hy * realVr * ARROW_SCALE };

  // ICC of the real robot (free mode only).
  const showIcc = mode === "free" && Math.abs(actual.omega) > 1e-9;
  const rActual = showIcc ? actual.v / actual.omega : 0;
  const icc = { x: truth.x + nx * rActual, y: truth.y + ny * rActual };
  const iccOnCanvas = showIcc && Math.abs(rActual) < 400;
  const farTip = Math.hypot(tipL.x - icc.x, tipL.y - icc.y) > Math.hypot(tipR.x - icc.x, tipR.y - icc.y) ? tipL : tipR;

  const start = mode === "free" ? FREE_START : squareStart(direction);
  const squareCorners: Array<[number, number]> =
    direction === "ccw"
      ? [
          [50, 20],
          [150, 20],
          [150, 120],
          [50, 120],
          [50, 20],
        ]
      : [
          [50, 120],
          [150, 120],
          [150, 20],
          [50, 20],
          [50, 120],
        ];

  const legText = sim.done
    ? `Square complete: closing error ${fmt(errorCm)} cm, while odometry reports ${fmt(Math.hypot(est.x - start.x, est.y - start.y))} cm`
    : `Leg ${sim.leg + 1} of 8: ${sim.leg % 2 === 0 ? `straight ${SIDE} cm` : `turn 90° ${direction === "ccw" ? "left" : "right"}`}`;

  const showGhost = errorCm > 0.3 || Math.abs(headingErrDeg) > 0.3;

  return (
    <VizFrame
      title="Differential drive: from wheel speeds to motion"
      description="Set the wheel speeds and watch the ICC and the path. Then add a small wheel-size or wheel-base error and compare the real path (cyan) with what odometry believes (amber, dashed)."
      controls={
        <>
          <Segmented
            label="Mode"
            options={[
              { value: "free", label: "Free drive" },
              { value: "square", label: "Square test (UMBmark)" },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              restart(m, direction);
            }}
          />
          {mode === "free" ? (
            <>
              <Slider label="Left wheel speed vL" value={vl} min={-40} max={40} step={1} unit="cm/s" onChange={setVl} />
              <Slider label="Right wheel speed vR" value={vr} min={-40} max={40} step={1} unit="cm/s" onChange={setVr} />
            </>
          ) : (
            <Segmented
              label="Direction"
              options={[
                { value: "ccw", label: "Counter-clockwise" },
                { value: "cw", label: "Clockwise" },
              ]}
              value={direction}
              onChange={(d) => {
                setDirection(d);
                restart(mode, d);
              }}
            />
          )}
          <Slider
            label="Wheel base L"
            value={wheelBase}
            min={8}
            max={24}
            step={1}
            unit="cm"
            onChange={(v) => {
              setWheelBase(v);
              if (mode === "square") restart();
            }}
          />
          <Slider
            label="Right tire diameter error"
            value={diameterErrPct}
            min={-1}
            max={1}
            step={0.1}
            format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} %`}
            onChange={(v) => {
              setDiameterErrPct(v);
              if (mode === "square") restart();
            }}
          />
          <Slider
            label="Wheel base error"
            value={baseErrPct}
            min={-5}
            max={5}
            step={0.5}
            format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} %`}
            onChange={(v) => {
              setBaseErrPct(v);
              if (mode === "square") restart();
            }}
          />
          <PlayPause
            playing={playing}
            onToggle={() => setUserPlaying(!playing)}
            onReset={() => restart()}
            onStep={() => setSim((s) => advance(s, 0.1, params))}
          />
        </>
      }
      footer={
        <div className="grid gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-2 lg:grid-cols-3">
          {mode === "free" ? (
            <>
              <span>v = {fmt(nominal.v)} cm/s</span>
              <span>ω = {fmt(nominal.omega, 2)} rad/s</span>
              <span>{rText}</span>
            </>
          ) : (
            <span className="sm:col-span-2 lg:col-span-3">{legText}</span>
          )}
          <span>
            true pose: ({fmt(truth.x)}, {fmt(truth.y)}) cm, {fmt(wrapDeg((truth.theta * 180) / Math.PI))}°
          </span>
          <span>
            odometry: ({fmt(est.x)}, {fmt(est.y)}) cm, {fmt(wrapDeg((est.theta * 180) / Math.PI))}°
          </span>
          <span>
            position error {fmt(errorCm)} cm · heading error {fmt(headingErrDeg)}°
          </span>
        </div>
      }
    >
      <SvgCanvas viewBox={`0 0 ${VB_W} ${VB_H}`} title="Differential-drive robot with its instantaneous center of curvature and odometry trace">
        <rect x={PAD} y={PAD} width={W * S} height={H * S} fill={vizColors.bg} stroke={vizColors.grid} strokeWidth={2} rx={6} />
        <g stroke={vizColors.grid} strokeWidth={1} opacity={0.7}>
          {Array.from({ length: W / 10 - 1 }, (_, i) => (
            <line key={`gx${i}`} x1={sx((i + 1) * 10)} y1={sy(0)} x2={sx((i + 1) * 10)} y2={sy(H)} />
          ))}
          {Array.from({ length: H / 10 - 1 }, (_, i) => (
            <line key={`gy${i}`} x1={sx(0)} y1={sy((i + 1) * 10)} x2={sx(W)} y2={sy((i + 1) * 10)} />
          ))}
        </g>

        {/* scale bar and legend */}
        <line x1={sx(W - 60)} y1={sy(6)} x2={sx(W - 10)} y2={sy(6)} stroke={vizColors.muted} strokeWidth={2} />
        <Label x={sx(W - 35)} y={sy(6) - 10} size={11} color={vizColors.muted}>
          50 cm
        </Label>
        <line x1={sx(W - 58)} y1={sy(H - 5)} x2={sx(W - 50)} y2={sy(H - 5)} stroke={vizColors.cyan} strokeWidth={2.5} />
        <Label x={sx(W - 48)} y={sy(H - 5)} anchor="start" size={11} color={vizColors.muted}>
          real path
        </Label>
        <line x1={sx(W - 58)} y1={sy(H - 10)} x2={sx(W - 50)} y2={sy(H - 10)} stroke={vizColors.amber} strokeWidth={2} strokeDasharray="5 4" />
        <Label x={sx(W - 48)} y={sy(H - 10)} anchor="start" size={11} color={vizColors.muted}>
          odometry estimate
        </Label>

        {mode === "square" && (
          <path d={polyline(squareCorners.map(([x, y]) => [sx(x), sy(y)]))} fill="none" stroke={vizColors.muted} strokeWidth={1} strokeDasharray="2 5" />
        )}
        <circle cx={sx(start.x)} cy={sy(start.y)} r={4} fill="none" stroke={vizColors.green} strokeWidth={2} />
        <Label x={sx(start.x)} y={sy(start.y) + 14} size={10} color={vizColors.green}>
          start
        </Label>

        <path d={trailPath(sim.trailTruth)} fill="none" stroke={vizColors.cyan} strokeWidth={2.5} strokeLinejoin="round" opacity={0.85} />
        <path d={trailPath(sim.trailEst)} fill="none" stroke={vizColors.amber} strokeWidth={2} strokeDasharray="6 5" opacity={0.9} />

        {iccOnCanvas && (
          <g>
            <circle cx={sx(icc.x)} cy={sy(icc.y)} r={r2(Math.abs(rActual) * S)} fill="none" stroke={vizColors.violet} strokeWidth={1} strokeDasharray="3 5" opacity={0.6} />
            <line x1={sx(wheelL.x)} y1={sy(wheelL.y)} x2={sx(icc.x)} y2={sy(icc.y)} stroke={vizColors.violet} strokeWidth={1} opacity={0.6} />
            <line x1={sx(wheelR.x)} y1={sy(wheelR.y)} x2={sx(icc.x)} y2={sy(icc.y)} stroke={vizColors.violet} strokeWidth={1} opacity={0.6} />
            <line x1={sx(farTip.x)} y1={sy(farTip.y)} x2={sx(icc.x)} y2={sy(icc.y)} stroke={vizColors.violet} strokeWidth={1} strokeDasharray="2 3" opacity={0.8} />
            <circle cx={sx(icc.x)} cy={sy(icc.y)} r={5} fill={vizColors.violet} />
            <Label x={sx(icc.x) + 9} y={sy(icc.y) - 10} anchor="start" size={12} color={vizColors.violet} bold>
              ICC
            </Label>
          </g>
        )}
        {mode === "free" && showIcc && !iccOnCanvas && (
          <Label x={sx(4)} y={sy(11)} anchor="start" size={11} color={vizColors.violet}>
            {`ICC off canvas: R = ${fmt(rActual)} cm`}
          </Label>
        )}

        {showGhost && <RobotGlyph pose={est} wheelBase={wheelBase} color={vizColors.amber} ghost />}
        <RobotGlyph pose={truth} wheelBase={trueBase} color={vizColors.cyan} />
        {Math.abs(realVl) > 0.5 && <Arrow x1={sx(wheelL.x)} y1={sy(wheelL.y)} x2={sx(tipL.x)} y2={sy(tipL.y)} color={vizColors.green} width={2} head={7} />}
        {Math.abs(realVr) > 0.5 && <Arrow x1={sx(wheelR.x)} y1={sy(wheelR.y)} x2={sx(tipR.x)} y2={sy(tipR.y)} color={vizColors.orange} width={2} head={7} />}
        <Label x={sx(4)} y={sy(5)} anchor="start" size={11} color={vizColors.muted}>
          {`vL arrow green · vR arrow orange · t = ${sim.time.toFixed(1)} s`}
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
