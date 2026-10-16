"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Segmented, VizFrame } from "@/components/lesson";
import { Button } from "@/components/ui/Button";
import { useAnimationFrame } from "@/components/viz/shared";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";
import {
  ROBOT,
  arenas,
  compileController,
  initialState,
  presets,
  sense,
  step,
  wrapAngle,
  type Arena,
  type Controller,
  type Preset,
  type RobotState,
  type Sensors,
  type Vec,
} from "@/lib/sim/robot";
import { ControllerEditor } from "./ControllerEditor";
import { GOAL_RADIUS, RobotCanvas, drawRobotScene } from "./RobotCanvas";

const DT = 0.01; // fixed 100 Hz control loop
const STEP_TICKS = 10; // the Step button advances 0.1 s
const MAX_BACKLOG = 0.25; // seconds of simulated time a single frame may catch up
const TRAIL_MAX = 2000;
const LAB_ID = "robot-sim";
const LAB_DISTANCE = 100; // cm driven without crashing completes the lab
/** The full lab keeps the learner's code across reloads; compact lesson embeds always run their preset. */
export const CODE_STORAGE_KEY = "hardware-academy:robot-sim:code:v1";

type Speed = "1" | "2" | "4";
const SPEEDS: { value: Speed; label: string }[] = [
  { value: "1", label: "×1" },
  { value: "2", label: "×2" },
  { value: "4", label: "×4" },
];
const PRESET_OPTIONS = presets.map((p) => ({ value: p.id, label: p.name }));
const ARENA_OPTIONS = arenas.map((a) => ({ value: a.id, label: a.name }));

type Stop = "crash" | "error" | null;

/** Mutable simulation state; lives in a ref and is advanced from the animation loop. */
interface Sim {
  arena: Arena;
  state: RobotState;
  /** sensors for the current state, for telemetry and drawing */
  sensors: Sensors;
  memory: Record<string, unknown>;
  trail: Vec[];
  /** simulated seconds owed to the fixed-step loop */
  acc: number;
  /** path length driven since the last reset, cm */
  distance: number;
  goalAt: number | null;
  control: Controller | null;
  controlCode: string | null;
}

/** What React renders: published once per animation frame. */
interface Frame {
  state: RobotState;
  sensors: Sensors;
  distance: number;
  goalAt: number | null;
}

function readSavedCode(): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(CODE_STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode, sandboxed iframe)
  }
}

function writeSavedCode(code: string): void {
  try {
    window.localStorage.setItem(CODE_STORAGE_KEY, code);
  } catch {
    // storage unavailable or full: the code stays in memory for this visit
  }
}

function arenaById(id: string | undefined): Arena {
  return arenas.find((a) => a.id === id) ?? arenas[0];
}

function presetById(id: string | undefined): Preset {
  return presets.find((p) => p.id === id) ?? presets[0];
}

function makeSim(arena: Arena, keep?: Pick<Sim, "control" | "controlCode">): Sim {
  const state = initialState(arena);
  return {
    arena,
    state,
    sensors: sense(state, arena),
    memory: {},
    trail: [{ x: state.x, y: state.y }],
    acc: 0,
    distance: 0,
    goalAt: null,
    control: keep?.control ?? null,
    controlCode: keep?.controlCode ?? null,
  };
}

function ensureSim(ref: RefObject<Sim | null>, arenaId: string): Sim {
  if (!ref.current) ref.current = makeSim(arenaById(arenaId));
  return ref.current;
}

function frameOf(sim: Sim): Frame {
  return { state: sim.state, sensors: sim.sensors, distance: sim.distance, goalAt: sim.goalAt };
}

function paint(canvas: HTMLCanvasElement | null, sim: Sim): void {
  drawRobotScene(canvas, { arena: sim.arena, state: sim.state, sensors: sim.sensors, trail: sim.trail });
}

/** One 10 ms control tick: sense, run the learner's controller, integrate. */
function tick(sim: Sim): Stop {
  const control = sim.control;
  if (!control) return "error";
  const cmd = control(sense(sim.state, sim.arena), sim.memory);
  if (control.lastError) return "error";
  const prev = sim.state;
  sim.state = step(prev, cmd, sim.arena, DT);
  sim.distance += Math.hypot(sim.state.x - prev.x, sim.state.y - prev.y);
  const last = sim.trail[sim.trail.length - 1];
  if (!last || Math.hypot(sim.state.x - last.x, sim.state.y - last.y) >= 1) {
    sim.trail.push({ x: sim.state.x, y: sim.state.y });
    if (sim.trail.length > TRAIL_MAX) sim.trail.splice(0, sim.trail.length - TRAIL_MAX);
  }
  const goal = sim.arena.goal;
  if (goal && sim.goalAt === null && Math.hypot(sim.state.x - goal.x, sim.state.y - goal.y) < GOAL_RADIUS) {
    sim.goalAt = sim.state.t;
  }
  return sim.state.crashed ? "crash" : null;
}

export interface RobotSimProps {
  /** preset to start with (defaults to the first preset) */
  presetId?: string;
  /** arena to start in (defaults to the preset's arena) */
  arenaId?: string;
  /** hide the code editor and telemetry, for embedding in a lesson */
  compact?: boolean;
}

export function RobotSim({ presetId, arenaId: arenaProp, compact = false }: RobotSimProps) {
  const [selectedId, setSelectedId] = useState(() => presetById(presetId).id);
  const [loadedId, setLoadedId] = useState(selectedId);
  const [arenaId, setArenaId] = useState(() => arenaById(arenaProp ?? presetById(presetId).arenaId).id);
  // Saved code is read on the client only; React patches the server-rendered textarea value when it hydrates.
  const [code, setCode] = useState(() => (compact ? null : readSavedCode()) ?? presetById(presetId).code);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<Speed>("1");
  const [error, setError] = useState<string | null>(null);
  /** the code the current controller was compiled from; edits apply on the next Run or Step */
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [frame, setFrame] = useState<Frame>(() => frameOf(makeSim(arenaById(arenaId))));

  const simRef = useRef<Sim | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markedRef = useRef(false);
  const { state: progress, markLab } = useProgress();
  const labDone = Boolean(progress.labs[LAB_ID]);

  const arena = arenaById(arenaId);
  const selected = presetById(selectedId);

  // First paint, and a repaint whenever the arena changes.
  useEffect(() => {
    paint(canvasRef.current, ensureSim(simRef, arenaId));
  }, [arenaId]);

  const getSim = () => ensureSim(simRef, arenaId);

  const publish = (sim: Sim) => {
    sim.sensors = sense(sim.state, sim.arena);
    paint(canvasRef.current, sim);
    setFrame(frameOf(sim));
  };

  const advance = (sim: Sim, ticks: number): Stop => {
    let stop: Stop = null;
    for (let i = 0; i < ticks && !stop; i++) {
      stop = tick(sim);
      if (!labDone && !markedRef.current && !sim.state.crashed && sim.distance >= LAB_DISTANCE) {
        markedRef.current = true;
        markLab(LAB_ID);
      }
    }
    return stop;
  };

  const settle = (sim: Sim, stop: Stop) => {
    publish(sim);
    if (stop) setRunning(false);
    if (stop === "error") {
      const message = sim.control?.lastError ?? "no controller is compiled";
      setError(`Runtime error at t = ${sim.state.t.toFixed(2)} s: ${message}`);
    }
  };

  useAnimationFrame((dt) => {
    const sim = getSim();
    sim.acc = Math.min(sim.acc + dt * Number(speed), MAX_BACKLOG);
    const ticks = Math.floor(sim.acc / DT + 1e-9);
    sim.acc = Math.max(0, sim.acc - ticks * DT);
    settle(sim, advance(sim, ticks));
  }, running);

  /** Compiles the editor code unless the current controller already runs it cleanly. */
  const ensureController = (sim: Sim): boolean => {
    if (sim.control && sim.controlCode === code && !sim.control.lastError) return true;
    const compiled = compileController(code);
    if (!compiled.control) {
      setError(`Controller error: ${compiled.error ?? "unknown error"}`);
      return false;
    }
    sim.control = compiled.control;
    sim.controlCode = code;
    setAppliedCode(code);
    setError(null);
    return true;
  };

  const resetSim = (id: string): Sim => {
    const sim = makeSim(arenaById(id), simRef.current ?? undefined);
    simRef.current = sim;
    publish(sim);
    return sim;
  };

  const onRun = () => {
    if (running) {
      setRunning(false);
      return;
    }
    let sim = getSim();
    if (sim.state.crashed) sim = resetSim(arenaId); // a crashed robot starts over
    if (!ensureController(sim)) return;
    setRunning(true);
  };

  const onStep = () => {
    const sim = getSim();
    if (running || sim.state.crashed || !ensureController(sim)) return;
    settle(sim, advance(sim, STEP_TICKS));
  };

  const onCodeChange = (next: string) => {
    setCode(next);
    if (!compact) writeSavedCode(next);
  };

  const onReset = () => {
    setRunning(false);
    setError(null);
    if (!compact) writeSavedCode(code); // Reset keeps the code; the saved copy matches the editor
    resetSim(arenaId);
  };

  const onArena = (id: string) => {
    setArenaId(id);
    setRunning(false);
    setError(null);
    resetSim(id);
  };

  const loadPreset = (id: string) => {
    const p = presetById(id);
    setSelectedId(p.id);
    setLoadedId(p.id);
    setCode(p.code);
    if (!compact) writeSavedCode(p.code);
    setArenaId(p.arenaId);
    setRunning(false);
    setError(null);
    setAppliedCode(null);
    const sim = resetSim(p.arenaId);
    sim.control = null;
    sim.controlCode = null;
  };

  const onPreset = (id: string) => {
    if (compact) loadPreset(id);
    else setSelectedId(id);
  };

  const buttons = (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onRun}>
        {running ? "Pause" : "Run"}
      </Button>
      <Button size="sm" variant="secondary" onClick={onStep} disabled={running || frame.state.crashed}>
        Step
      </Button>
      <Button size="sm" variant="secondary" onClick={onReset}>
        Reset
      </Button>
      {!compact && (
        <Button size="sm" variant={selectedId !== loadedId ? "secondary" : "ghost"} onClick={() => loadPreset(selectedId)}>
          Load preset
        </Button>
      )}
    </div>
  );

  const presetPicker = <Segmented label="Preset" options={PRESET_OPTIONS} value={selectedId} onChange={onPreset} />;
  const arenaPicker = <Segmented label="Arena" options={ARENA_OPTIONS} value={arenaId} onChange={onArena} />;
  const speedPicker = <Segmented label="Speed" options={SPEEDS} value={speed} onChange={setSpeed} />;
  const errorBox = error ? (
    <div
      role="alert"
      className="whitespace-pre-wrap rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300"
    >
      {error}
    </div>
  ) : null;
  const canvas = <RobotCanvas ref={canvasRef} label={`Simulated robot in the ${arena.name} arena`} />;
  const status = <StatusLine frame={frame} running={running} speed={speed} labDone={labDone} />;

  if (compact) {
    return (
      <VizFrame
        title="Robot simulator"
        description={`${selected.name}: ${selected.description}`}
        controls={
          <>
            {presetPicker}
            {arenaPicker}
            {speedPicker}
            <div className="flex items-end">{buttons}</div>
          </>
        }
        footer={
          <div className="space-y-2">
            {status}
            {errorBox}
          </div>
        }
      >
        {canvas}
      </VizFrame>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="min-w-0 space-y-3">
          {canvas}
          {status}
          <p className="text-xs text-muted">
            Rays turn green when an echo returns within {ROBOT.sensorRange} cm and red (dashed) when the way is open.
            Amber dots are line sensors over the tape; the dashed amber ring is the goal zone.
          </p>
        </div>
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            {presetPicker}
            <p className="text-xs text-muted">
              {selected.description}
              {selectedId !== loadedId && " Press Load preset to put its code in the editor."}
            </p>
          </div>
          {arenaPicker}
          <ControllerEditor value={code} onChange={onCodeChange} />
          {buttons}
          {appliedCode !== null && code !== appliedCode && (
            <p className="text-xs text-amber-300">
              {running ? "Pause, then Run, to apply your edits." : "Your edits apply the next time you press Run or Step."}
            </p>
          )}
          {errorBox}
          {speedPicker}
          <Telemetry frame={frame} />
          <SensorReference />
        </div>
      </div>
    </div>
  );
}

function StatusLine({ frame, running, speed, labDone }: { frame: Frame; running: boolean; speed: Speed; labDone: boolean }) {
  const { state, goalAt, distance } = frame;
  let tone = "text-muted";
  let text: ReactNode;
  if (state.crashed) {
    tone = "text-red-300";
    text = `Crashed at t = ${state.t.toFixed(2)} s. Change the controller, then Run to start over.`;
  } else if (goalAt !== null) {
    tone = "text-green-300";
    text = `Goal reached at t = ${goalAt.toFixed(2)} s.`;
  } else if (running) {
    text = `Running at ×${speed}.`;
  } else {
    text = state.t > 0 ? `Paused at t = ${state.t.toFixed(2)} s.` : "Ready. Press Run.";
  }
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
      <p role="status" className={tone}>
        {text}
      </p>
      <p className="font-mono text-xs text-muted">
        {labDone ? "Lab complete" : `Lab goal: ${Math.min(distance, LAB_DISTANCE).toFixed(0)} / ${LAB_DISTANCE} cm without a crash`}
      </p>
    </div>
  );
}

function fmt(v: number, digits = 1): string {
  return v.toFixed(digits);
}

function Telemetry({ frame }: { frame: Frame }) {
  const { state, sensors } = frame;
  const u = sensors.ultrasonic;
  const rows: Array<[string, string]> = [
    ["t", `${fmt(state.t, 2)} s`],
    ["x", `${fmt(state.x)} cm`],
    ["y", `${fmt(state.y)} cm`],
    ["θ", `${fmt((wrapAngle(state.theta) * 180) / Math.PI)}°`],
    ["Ultrasonic L / F / R", `${fmt(u.left)} / ${fmt(u.front)} / ${fmt(u.right)} cm`],
    ["Line L / R", `${sensors.line.left} / ${sensors.line.right}`],
    ["Encoders L / R", `${sensors.encoders.left} / ${sensors.encoders.right} ticks`],
    ["Crashed", state.crashed ? "yes" : "no"],
  ];
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">Telemetry</h3>
      <dl aria-label="Telemetry" className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className={cn("text-right font-mono tabular-nums", k === "Crashed" && state.crashed && "text-red-300")}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SensorReference() {
  return (
    <details className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-muted">
      <summary className="cursor-pointer text-sm text-text">Controller reference</summary>
      <ul className="mt-2 space-y-1 font-mono">
        <li>control(s, memory) → {"{ left, right }"}, each -1..1</li>
        <li>s.ultrasonic.left / front / right: cm from the robot&apos;s edge (rays at +45°, 0°, -45°)</li>
        <li>s.line.left / right: 1 over the tape, else 0</li>
        <li>s.encoders.left / right: ticks, {ROBOT.ticksPerCm} per cm</li>
        <li>s.yawRate: rad/s, positive turning left</li>
        <li>s.pose.x / y / theta: cm and rad (-π..π), y points up</li>
        <li>s.goal.x / y: only in arenas with a goal</li>
        <li>s.t: seconds since reset</li>
        <li>memory: an object kept between calls until Reset</li>
      </ul>
      <p className="mt-2">
        Sensors only change between calls, so a loop that waits for one never ends. Loops stop with an error after
        1,000,000 passes in one call; to wait, remember the state in memory and check again next tick.
      </p>
      <p className="mt-2">
        The loop runs at 100 Hz. Wheel base {ROBOT.wheelBase} cm, top speed {ROBOT.maxSpeed} cm/s, body radius{" "}
        {ROBOT.radius} cm. Your code is saved in this browser; Load preset replaces it.
      </p>
    </details>
  );
}
