"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { Slider, Toggle, VizFrame } from "@/components/lesson";
import { Button } from "@/components/ui/Button";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { fk2, ik2 } from "@/lib/sim/kinematics";
import { r2 } from "./RoundedArrow";

const L1 = 120; // mm
const L2 = 90; // mm
const R_MAX = L1 + L2;
const R_MIN = Math.abs(L1 - L2);
const VB_W = 520;
const VB_H = 480;
const CX = 260; // base position in the viewBox (1 px = 1 mm)
const CY = 250;
const START = fk2(L1, L2, Math.PI / 3, -Math.PI / 3); // θ1 = 60°, θ2 = −60° → (150, 103.9)

const deg = (rad: number) => (rad * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const px = (x: number) => r2(CX + x);
const py = (y: number) => r2(CY - y);

function fmt(x: number, digits = 1): string {
  const v = Math.abs(x) < 0.5 * 10 ** -digits ? 0 : x;
  return v.toFixed(digits);
}

/** SVG arc around (cx, cy) from world angle a0 to a1 (radians, counter-clockwise positive). */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy - r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy - r * Math.sin(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 0 : 1;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} ${sweep} ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

interface Solved {
  t1: number;
  t2: number;
  reachable: boolean;
  r: number;
}

/** IK for the target; unreachable targets are projected onto the reach annulus so the arm still points at them. */
function solve(x: number, y: number, elbowUp: boolean): Solved {
  const r = Math.hypot(x, y);
  const direct = ik2(L1, L2, x, y, elbowUp);
  if (direct) return { t1: wrap(direct.t1), t2: direct.t2, reachable: true, r };
  const rc = Math.min(R_MAX - 1e-6, Math.max(R_MIN + 1e-6, r));
  const ux = r > 1e-9 ? x / r : 1;
  const uy = r > 1e-9 ? y / r : 0;
  const projected = ik2(L1, L2, ux * rc, uy * rc, elbowUp) ?? { t1: Math.atan2(uy, ux), t2: 0 };
  return { t1: wrap(projected.t1), t2: projected.t2, reachable: false, r };
}

export function ArmKinematics() {
  const [target, setTarget] = useState({ x: START.x, y: START.y });
  const [elbowUp, setElbowUp] = useState(true);
  const [showOther, setShowOther] = useState(true);
  const [dragging, setDragging] = useState(false);

  const sol = solve(target.x, target.y, elbowUp);
  const other = solve(target.x, target.y, !elbowUp);
  const pose = fk2(L1, L2, sol.t1, sol.t2);
  const ghost = fk2(L1, L2, other.t1, other.t2);
  const detJ = L1 * L2 * Math.sin(sol.t2);
  const nearSingular = Math.abs(Math.sin(sol.t2)) < 0.15;

  const setJoints = (t1: number, t2: number) => {
    const p = fk2(L1, L2, t1, t2);
    setTarget({ x: p.x, y: p.y });
    setElbowUp(t2 <= 0);
  };

  const clampTarget = (x: number, y: number) => ({
    x: Math.max(-CX + 8, Math.min(VB_W - CX - 8, x)),
    y: Math.max(-(VB_H - CY) + 8, Math.min(CY - 8, y)),
  });

  /** Client coordinates → arm coordinates (mm, y up). Returns null when the SVG has no layout yet. */
  const toArm = (e: PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const ctm = typeof svg.getScreenCTM === "function" ? svg.getScreenCTM() : null;
    if (ctm && typeof DOMPoint !== "undefined") {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      return { x: p.x - CX, y: CY - p.y };
    }
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const vx = ((e.clientX - rect.left) / rect.width) * VB_W;
    const vy = ((e.clientY - rect.top) / rect.height) * VB_H;
    return { x: vx - CX, y: CY - vy };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    const p = toArm(e);
    if (!p) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
    setTarget(clampTarget(p.x, p.y));
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const p = toArm(e);
    if (p) setTarget(clampTarget(p.x, p.y));
  };
  const endDrag = (e: PointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
  };
  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const stepMm = e.shiftKey ? 20 : 5;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [0, stepMm],
      ArrowDown: [0, -stepMm],
      ArrowLeft: [-stepMm, 0],
      ArrowRight: [stepMm, 0],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setTarget((t) => clampTarget(t.x + m[0], t.y + m[1]));
  };

  const elbowPx = { x: px(pose.elbow.x), y: py(pose.elbow.y) };
  const tipPx = { x: px(pose.x), y: py(pose.y) };
  const targetColor = sol.reachable ? vizColors.green : vizColors.red;

  const status = sol.reachable
    ? nearSingular
      ? `Reachable, but near a singularity: the arm is almost ${Math.cos(sol.t2) > 0 ? "fully stretched" : "fully folded"} and cannot move radially`
      : "Reachable: two solutions, elbow up and elbow down"
    : sol.r > R_MAX
      ? `Out of reach: target is ${fmt(sol.r)} mm from the base, beyond l1 + l2 = ${R_MAX} mm`
      : `Out of reach: target is ${fmt(sol.r)} mm from the base, inside the ${R_MIN} mm dead zone`;

  return (
    <VizFrame
      title="Two-link arm: forward and inverse kinematics"
      description="Drag anywhere on the canvas (or focus it and use the arrow keys) to move the target; IK solves the joint angles. Move the joint sliders to drive the arm by forward kinematics instead."
      controls={
        <>
          <Toggle label="Elbow up (θ2 < 0)" checked={elbowUp} onChange={setElbowUp} />
          <Toggle label="Show the other IK solution" checked={showOther} onChange={setShowOther} />
          <Button size="sm" variant="secondary" onClick={() => { setTarget({ x: START.x, y: START.y }); setElbowUp(true); }}>
            Reset target
          </Button>
          <Slider
            label="Shoulder θ1"
            value={Math.round(deg(sol.t1))}
            min={-180}
            max={180}
            step={1}
            format={(v) => `${v}°`}
            onChange={(v) => setJoints(rad(v), sol.t2)}
          />
          <Slider
            label="Elbow θ2"
            value={Math.round(deg(sol.t2))}
            min={-180}
            max={180}
            step={1}
            format={(v) => `${v}°`}
            onChange={(v) => setJoints(sol.t1, rad(v))}
          />
        </>
      }
      footer={
        <div className="grid gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-2 lg:grid-cols-3">
          <span>θ1 = {fmt(deg(sol.t1))}°</span>
          <span>θ2 = {fmt(deg(sol.t2))}°</span>
          <span>
            target ({fmt(target.x)}, {fmt(target.y)}) mm, r = {fmt(sol.r)} mm
          </span>
          <span>
            det J = l1·l2·sin θ2 = {fmt(detJ, 0)} mm²
          </span>
          <span className={sol.reachable ? "text-green-300 sm:col-span-2" : "text-red-300 sm:col-span-2"}>{status}</span>
        </div>
      }
    >
      <SvgCanvas
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        title="Two-link arm reaching for a draggable target inside its reach envelope"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        style={{ touchAction: "none", cursor: dragging ? "grabbing" : "crosshair" }}
        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <rect x={0} y={0} width={VB_W} height={VB_H} fill={vizColors.bg} rx={8} />
        <line x1={20} y1={CY} x2={VB_W - 20} y2={CY} stroke={vizColors.grid} strokeWidth={1} />
        <line x1={CX} y1={20} x2={CX} y2={VB_H - 20} stroke={vizColors.grid} strokeWidth={1} />

        {/* reach envelope: annulus between |l1 − l2| and l1 + l2 */}
        <path
          d={`M ${CX + R_MAX} ${CY} A ${R_MAX} ${R_MAX} 0 1 0 ${CX - R_MAX} ${CY} A ${R_MAX} ${R_MAX} 0 1 0 ${CX + R_MAX} ${CY} Z M ${CX + R_MIN} ${CY} A ${R_MIN} ${R_MIN} 0 1 1 ${CX - R_MIN} ${CY} A ${R_MIN} ${R_MIN} 0 1 1 ${CX + R_MIN} ${CY} Z`}
          fill={vizColors.cyan}
          fillOpacity={0.07}
          fillRule="evenodd"
          stroke={vizColors.cyan}
          strokeOpacity={0.45}
          strokeDasharray="5 5"
        />
        <Label x={CX} y={CY - R_MAX - 12} size={11} color={vizColors.muted}>
          {`reach envelope: ${R_MIN} mm to ${R_MAX} mm`}
        </Label>
        <Label x={VB_W - 12} y={VB_H - 14} anchor="end" size={11} color={vizColors.muted}>
          {`l1 = ${L1} mm, l2 = ${L2} mm`}
        </Label>

        {/* the other IK solution */}
        {showOther && (
          <g opacity={0.45}>
            <line x1={CX} y1={CY} x2={px(ghost.elbow.x)} y2={py(ghost.elbow.y)} stroke={vizColors.muted} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 8" />
            <line x1={px(ghost.elbow.x)} y1={py(ghost.elbow.y)} x2={px(ghost.x)} y2={py(ghost.y)} stroke={vizColors.muted} strokeWidth={5} strokeLinecap="round" strokeDasharray="2 8" />
            <circle cx={px(ghost.elbow.x)} cy={py(ghost.elbow.y)} r={5} fill="none" stroke={vizColors.muted} />
          </g>
        )}

        {/* joint angle arcs */}
        <path d={arcPath(CX, CY, 36, 0, sol.t1)} fill="none" stroke={vizColors.violet} strokeWidth={1.5} />
        <Label x={r2(CX + 50 * Math.cos(sol.t1 / 2))} y={r2(CY - 50 * Math.sin(sol.t1 / 2))} size={12} color={vizColors.violet}>
          θ1
        </Label>
        <line
          x1={elbowPx.x}
          y1={elbowPx.y}
          x2={r2(elbowPx.x + 40 * Math.cos(sol.t1))}
          y2={r2(elbowPx.y - 40 * Math.sin(sol.t1))}
          stroke={vizColors.muted}
          strokeDasharray="3 4"
        />
        <path d={arcPath(elbowPx.x, elbowPx.y, 26, sol.t1, sol.t1 + sol.t2)} fill="none" stroke={vizColors.amber} strokeWidth={1.5} />
        <Label
          x={r2(elbowPx.x + 40 * Math.cos(sol.t1 + sol.t2 / 2))}
          y={r2(elbowPx.y - 40 * Math.sin(sol.t1 + sol.t2 / 2))}
          size={12}
          color={vizColors.amber}
        >
          θ2
        </Label>

        {/* the arm */}
        <line x1={CX} y1={CY} x2={elbowPx.x} y2={elbowPx.y} stroke={vizColors.cyan} strokeWidth={12} strokeLinecap="round" />
        <line x1={elbowPx.x} y1={elbowPx.y} x2={tipPx.x} y2={tipPx.y} stroke={vizColors.blue} strokeWidth={9} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={11} fill={vizColors.bg} stroke={vizColors.violet} strokeWidth={3} />
        <circle cx={elbowPx.x} cy={elbowPx.y} r={8} fill={vizColors.bg} stroke={vizColors.amber} strokeWidth={3} />
        <circle cx={tipPx.x} cy={tipPx.y} r={5} fill={vizColors.green} />

        {/* target */}
        {!sol.reachable && (
          <line x1={tipPx.x} y1={tipPx.y} x2={px(target.x)} y2={py(target.y)} stroke={vizColors.red} strokeWidth={1.5} strokeDasharray="4 4" />
        )}
        <g stroke={targetColor} strokeWidth={2}>
          <circle cx={px(target.x)} cy={py(target.y)} r={10} fill={targetColor} fillOpacity={0.15} />
          <line x1={px(target.x) - 15} y1={py(target.y)} x2={px(target.x) + 15} y2={py(target.y)} />
          <line x1={px(target.x)} y1={py(target.y) - 15} x2={px(target.x)} y2={py(target.y) + 15} />
        </g>
        <Label x={px(target.x) + 16} y={py(target.y) - 16} anchor="start" size={11} color={targetColor}>
          {sol.reachable ? "target" : "unreachable"}
        </Label>
        {nearSingular && sol.reachable && (
          <Label x={20} y={VB_H - 18} anchor="start" size={12} color={vizColors.amber}>
            near a singularity: sin θ2 ≈ 0
          </Label>
        )}
      </SvgCanvas>
    </VizFrame>
  );
}
