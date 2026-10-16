"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Slider, Toggle, VizFrame } from "@/components/lesson";
import { Grid, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";
import { fk2, ik2 } from "@/lib/sim/kinematics";

const LAB_ID = "arm";
const L1 = 120; // px
const L2 = 90; // px
const R_MAX = L1 + L2;
const R_MIN = Math.abs(L1 - L2);
const VIEW = 240; // half-size of the square viewBox, centred on the base
const DEG = Math.PI / 180;
const KEY_STEP = 5;
const KEY_STEP_BIG = 20;

interface Vec {
  x: number;
  y: number;
}

const START = { t1: 60, t2: -70 };

/** Wraps degrees to (-180, 180]. */
function wrapDeg(d: number): number {
  const a = ((((d + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : a;
}

function endOf(t1: number, t2: number): Vec {
  const p = fk2(L1, L2, t1 * DEG, t2 * DEG);
  return { x: p.x, y: p.y };
}

/** SVG arc path (screen coordinates, y down) for a math-convention angle sweep around (cx, cy). */
function arcPath(cx: number, cy: number, r: number, fromRad: number, sweepRad: number): string {
  const a1 = fromRad + sweepRad;
  const x0 = cx + r * Math.cos(fromRad);
  const y0 = cy - r * Math.sin(fromRad);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  const large = Math.abs(sweepRad) > Math.PI ? 1 : 0;
  const sweep = sweepRad > 0 ? 0 : 1;
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function ArmLab() {
  const [t1, setT1] = useState(START.t1);
  const [t2, setT2] = useState(START.t2);
  const [elbowUp, setElbowUp] = useState(true);
  const [target, setTarget] = useState<Vec>(() => endOf(START.t1, START.t2));
  const [reachable, setReachable] = useState(true);
  const [focused, setFocused] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const markedRef = useRef(false);
  const hintId = useId();
  const { state: progress, markLab } = useProgress();
  const done = Boolean(progress.labs[LAB_ID]);

  const pose = fk2(L1, L2, t1 * DEG, t2 * DEG);
  const elbow = pose.elbow;
  const distance = Math.hypot(target.x, target.y);

  /** Forward kinematics: the sliders drive the joints and the target follows the hand. */
  const setJoints = (n1: number, n2: number) => {
    setT1(n1);
    setT2(n2);
    setTarget(endOf(n1, n2));
    setReachable(true);
    setElbowUp(n2 <= 0);
  };

  /** Inverse kinematics: move the target and solve for the joints. */
  const solveFor = (p: Vec, up: boolean): boolean => {
    setTarget(p);
    const sol = ik2(L1, L2, p.x, p.y, up);
    if (!sol) {
      setReachable(false);
      return false;
    }
    setT1(wrapDeg(sol.t1 / DEG));
    setT2(wrapDeg(sol.t2 / DEG));
    setReachable(true);
    return true;
  };

  const dragTo = (p: Vec) => {
    if (solveFor(p, elbowUp) && !done && !markedRef.current) {
      markedRef.current = true;
      markLab(LAB_ID);
    }
  };

  const onElbow = (up: boolean) => {
    setElbowUp(up);
    if (reachable) solveFor(target, up); // same hand position, mirrored elbow
  };

  const toArm = (clientX: number, clientY: number): Vec | null => {
    const svg = svgRef.current;
    if (!svg || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
    const m = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
    if (m && typeof DOMPoint !== "undefined") {
      const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
      return { x: p.x, y: -p.y };
    }
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const sx = -VIEW + ((clientX - r.left) / r.width) * 2 * VIEW;
    const sy = -VIEW + ((clientY - r.top) / r.height) * 2 * VIEW;
    return { x: sx, y: -sy };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const p = toArm(e.clientX, e.clientY);
    if (!p) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragTo(p);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return;
    const p = toArm(e.clientX, e.clientY);
    if (p) dragTo(p);
  };

  const endDrag = (e: PointerEvent<SVGSVGElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onHandleKey = (e: KeyboardEvent<SVGGElement>) => {
    const d = e.shiftKey ? KEY_STEP_BIG : KEY_STEP;
    const moves: Record<string, Vec> = {
      ArrowLeft: { x: -d, y: 0 },
      ArrowRight: { x: d, y: 0 },
      ArrowUp: { x: 0, y: d },
      ArrowDown: { x: 0, y: -d },
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    dragTo({ x: target.x + m.x, y: target.y + m.y });
  };

  // screen coordinates (y down)
  const S = (p: Vec) => ({ x: p.x, y: -p.y });
  const es = S(elbow);
  const hs = S(pose);
  const tg = S(target);
  const targetColor = reachable ? vizColors.green : vizColors.red;
  const annulus = `M${R_MAX} 0 A${R_MAX} ${R_MAX} 0 1 0 ${-R_MAX} 0 A${R_MAX} ${R_MAX} 0 1 0 ${R_MAX} 0 Z M${R_MIN} 0 A${R_MIN} ${R_MIN} 0 1 0 ${-R_MIN} 0 A${R_MIN} ${R_MIN} 0 1 0 ${R_MIN} 0 Z`;
  const t1Rad = t1 * DEG;
  const t2Rad = t2 * DEG;

  return (
    <VizFrame
      title="Planar 2-link arm"
      description={`Link 1 is ${L1} px and link 2 is ${L2} px, so the hand reaches anywhere from ${R_MIN} to ${R_MAX} px from the base.`}
      controls={
        <>
          <Slider label="θ1 (shoulder)" value={t1} min={-180} max={180} step={0.1} format={(v) => `${v.toFixed(1)}°`} onChange={(v) => setJoints(v, t2)} />
          <Slider label="θ2 (elbow)" value={t2} min={-180} max={180} step={0.1} format={(v) => `${v.toFixed(1)}°`} onChange={(v) => setJoints(t1, v)} />
          <div className="flex items-end">
            <Toggle label="Elbow up (θ2 ≤ 0)" checked={elbowUp} onChange={onElbow} />
          </div>
        </>
      }
      footer={
        <p id={hintId}>
          Drag anywhere in the workspace, or focus the target and use the arrow keys (Shift for bigger steps), to run
          inverse kinematics. The sliders run forward kinematics.
        </p>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        <SvgCanvas
          ref={svgRef}
          viewBox={`${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`}
          title="Two-link arm with its reachable workspace"
          role="group"
          className="mx-auto max-w-[520px] cursor-crosshair rounded-lg bg-bg"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <Grid width={2 * VIEW} height={2 * VIEW} step={30} x={-VIEW} y={-VIEW} />
          <line x1={-VIEW} x2={VIEW} y1={0} y2={0} stroke={vizColors.muted} strokeOpacity={0.35} />
          <line x1={0} x2={0} y1={-VIEW} y2={VIEW} stroke={vizColors.muted} strokeOpacity={0.35} />

          {/* reachable workspace */}
          <path d={annulus} fill={vizColors.cyan} fillOpacity={0.07} fillRule="evenodd" />
          <circle r={R_MAX} fill="none" stroke={vizColors.cyan} strokeOpacity={0.5} strokeDasharray="6 6" />
          <circle r={R_MIN} fill="none" stroke={vizColors.cyan} strokeOpacity={0.5} strokeDasharray="4 4" />
          <Label x={0} y={-R_MAX - 12} size={11} color={vizColors.muted}>
            reach {R_MAX} px
          </Label>

          {/* joint angle arcs */}
          <path d={arcPath(0, 0, 34, 0, t1Rad)} fill="none" stroke={vizColors.amber} strokeWidth={1.5} />
          <path d={arcPath(es.x, es.y, 24, t1Rad, t2Rad)} fill="none" stroke={vizColors.violet} strokeWidth={1.5} />

          {/* unreachable: show the gap between the hand and the target */}
          {!reachable && (
            <line x1={hs.x} y1={hs.y} x2={tg.x} y2={tg.y} stroke={vizColors.red} strokeWidth={1.5} strokeDasharray="5 4" />
          )}

          {/* arm */}
          <rect x={-18} y={4} width={36} height={14} rx={3} fill={vizColors.grid} stroke={vizColors.muted} />
          <line x1={0} y1={0} x2={es.x} y2={es.y} stroke={vizColors.cyan} strokeWidth={12} strokeLinecap="round" />
          <line x1={es.x} y1={es.y} x2={hs.x} y2={hs.y} stroke={vizColors.blue} strokeWidth={9} strokeLinecap="round" />
          <circle r={8} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
          <circle cx={es.x} cy={es.y} r={7} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
          <circle cx={hs.x} cy={hs.y} r={4} fill={vizColors.text} />

          {/* target handle */}
          <g
            role="button"
            tabIndex={0}
            aria-label={`Arm target at x ${target.x.toFixed(0)}, y ${target.y.toFixed(0)} px, ${reachable ? "reachable" : "out of reach"}`}
            aria-describedby={hintId}
            onKeyDown={onHandleKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="cursor-grab touch-none outline-none"
          >
            <circle cx={tg.x} cy={tg.y} r={16} fill={targetColor} fillOpacity={0.15} stroke={targetColor} strokeWidth={2} />
            <line x1={tg.x - 22} x2={tg.x + 22} y1={tg.y} y2={tg.y} stroke={targetColor} strokeWidth={1.5} />
            <line x1={tg.x} x2={tg.x} y1={tg.y - 22} y2={tg.y + 22} stroke={targetColor} strokeWidth={1.5} />
            {focused && <circle cx={tg.x} cy={tg.y} r={22} fill="none" stroke={vizColors.text} strokeDasharray="3 3" />}
          </g>
          {!reachable && (
            <Label x={tg.x} y={tg.y + 32} size={11} color={vizColors.red}>
              out of reach
            </Label>
          )}
        </SvgCanvas>

        <div className="grid content-start gap-2 text-sm">
          <dl className="grid gap-2">
            <Readout label="θ1" value={`${t1.toFixed(1)}°`} />
            <Readout label="θ2" value={`${t2.toFixed(1)}°`} />
            <Readout label="Hand (x, y)" value={`${pose.x.toFixed(0)}, ${pose.y.toFixed(0)} px`} />
            <Readout label="Target distance" value={`${distance.toFixed(0)} px`} />
          </dl>
          <div
            role="status"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              reachable ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-red-500/40 bg-red-500/10 text-red-300",
            )}
          >
            {reachable
              ? "Reachable: IK found a solution."
              : `Unreachable: the target is ${distance.toFixed(0)} px from the base, outside ${R_MIN}-${R_MAX} px.`}
          </div>
          {done && <p className="text-xs text-green-300">Lab complete.</p>}
        </div>
      </div>
    </VizFrame>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border bg-bg px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono tabular-nums">{value}</dd>
    </div>
  );
}
