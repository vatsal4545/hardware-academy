"use client";

import { useState } from "react";
import { PlayPause, Segmented, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";
import { ROBOT, arenas, lineSensorPoints, sense, type Arena, type RobotState } from "@/lib/sim/robot";
import { r2 } from "./RoundedArrow";

// A preview of the robot simulator lab's three arenas, drawn from the lab's own arena data and sensor model.
// The world frame is the lab's: centimetres, x to the right, y up, angles counter-clockwise. The robot here follows a
// scripted sample path; in the lab, the learner's controller drives it.

type P = [number, number];

const S = 2; // px per cm
const PAD = 20;
const SPEED = 40; // cm/s, the lab's top speed
const DEG = Math.PI / 180;

function ellipse(cx: number, cy: number, rx: number, ry: number, n: number): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = (i / n) * 2 * Math.PI;
    return [cx + rx * Math.cos(f), cy + ry * Math.sin(f)] as P;
  });
}

/** Corridor sample path: east along the bottom leg, a 40 cm left turn, then north to the goal. */
function corridorPath(): P[] {
  const pts: P[] = [];
  for (let x = 30; x < 215; x += 5) pts.push([x, 40]);
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * (Math.PI / 2);
    pts.push([215 + 40 * Math.cos(a), 80 + 40 * Math.sin(a)]);
  }
  for (let y = 85; y <= 165; y += 5) pts.push([255, y]);
  return pts;
}

interface Preview {
  arena: Arena;
  blurb: string;
  path: P[];
  loop: boolean;
  weave: boolean;
}

function pathFor(arena: Arena): Omit<Preview, "arena" | "blurb"> {
  if (arena.id === "line-track" && arena.line) return { path: arena.line.map((v) => [v.x, v.y] as P), loop: true, weave: true };
  if (arena.id === "corridor") return { path: corridorPath(), loop: false, weave: false };
  return { path: ellipse(185, 80, 68, 52, 120), loop: true, weave: false }; // a loop around the big obstacle
}

const BLURBS: Record<string, string> = {
  "open-room": "Three round obstacles in an empty room: practice obstacle avoidance and wall following.",
  "line-track": "A closed rounded-rectangle line: practice line following and lost-line recovery.",
  corridor: "An L-shaped corridor with a goal at the far end: practice wall following and go-to-goal.",
};

/** The three previews, built from the lab's arenas. Exported for tests. */
export const PREVIEWS: Preview[] = arenas.map((arena) => ({ arena, blurb: BLURBS[arena.id] ?? "", ...pathFor(arena) }));

function lengths(path: P[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) out.push(out[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  return out;
}

const LENGTHS = PREVIEWS.map((p) => lengths(p.path));

/** Pose on a preview's path at arc length s (cm), in the lab's frame. Exported for tests. */
export function previewPose(index: number, s: number): { x: number; y: number; theta: number } {
  const { path, weave } = PREVIEWS[index];
  const L = LENGTHS[index];
  const d = Math.max(0, Math.min(L[L.length - 1] - 1e-6, s));
  let i = 1;
  while (i < L.length - 1 && L[i] < d) i++;
  const [ax, ay] = path[i - 1];
  const [bx, by] = path[i];
  const u = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
  const theta = Math.atan2(by - ay, bx - ax);
  let x = ax + (bx - ax) * u;
  let y = ay + (by - ay) * u;
  if (weave) {
    // a line follower weaves a little around the tape, so its two sensors take turns seeing it
    const off = 2.2 * Math.sin((2 * Math.PI * d) / 45);
    x += -Math.sin(theta) * off;
    y += Math.cos(theta) * off;
  }
  return { x, y, theta };
}

const fmtRange = (d: number) => (d > ROBOT.sensorRange ? `${d.toFixed(1)} cm (open)` : `${d.toFixed(1)} cm`);

export function ArenaPreview() {
  const { t, playing, toggle, reset } = useViz();
  const [index, setIndex] = useState(0);
  const [showRays, setShowRays] = useState(true);
  const { arena, blurb, path, loop } = PREVIEWS[index];
  const W = arena.width;
  const H = arena.height;
  const sx = (x: number) => r2(PAD + x * S);
  const sy = (y: number) => r2(PAD + (H - y) * S);
  const pathD = (pts: P[]) => pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${sx(x)} ${sy(y)}`).join(" ");

  const total = LENGTHS[index][LENGTHS[index].length - 1];
  const traveled = t * SPEED;
  // closed paths loop; the corridor runs start to goal, waits 1.5 s, then starts again
  const s = loop ? traveled % total : Math.min(total, traveled % (total + 1.5 * SPEED));
  const pose = previewPose(index, s);
  const state: RobotState = { ...pose, vl: 0, vr: 0, ticksL: 0, ticksR: 0, crashed: false, t };
  const sensors = sense(state, arena); // exactly what a controller in the lab would read here

  const readings = [sensors.ultrasonic.left, sensors.ultrasonic.front, sensors.ultrasonic.right];
  const rays = ROBOT.sensorAngles.map((deg, k) => {
    const a = pose.theta + deg * DEG;
    const ox = pose.x + ROBOT.radius * Math.cos(a);
    const oy = pose.y + ROBOT.radius * Math.sin(a);
    const len = Math.min(readings[k], ROBOT.sensorRange);
    return { key: deg, hit: readings[k] <= ROBOT.sensorRange, ox, oy, ex: ox + len * Math.cos(a), ey: oy + len * Math.sin(a) };
  });
  const linePts = lineSensorPoints(pose);
  const deg = r2((-pose.theta * 180) / Math.PI);

  return (
    <VizFrame
      title="The simulator's three arenas"
      description="The lab's own arenas and sensor model: the readings below are exactly what your controller would get at the robot's pose. Here the robot follows a scripted path; in the lab, your code drives it."
      controls={
        <>
          <Segmented
            label="Arena"
            options={PREVIEWS.map((p, i) => ({ value: String(i), label: p.arena.name }))}
            value={String(index)}
            onChange={(v) => {
              setIndex(Number(v));
              reset();
            }}
          />
          <Toggle label="Show sensor rays" checked={showRays} onChange={setShowRays} />
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={
        <div className="space-y-1">
          <p>{blurb}</p>
          <p className="font-mono text-xs text-text">
            sensors.ultrasonic: left {fmtRange(sensors.ultrasonic.left)} · front {fmtRange(sensors.ultrasonic.front)} · right{" "}
            {fmtRange(sensors.ultrasonic.right)}
            {arena.line ? ` · sensors.line: left ${sensors.line.left}, right ${sensors.line.right}` : ""}
          </p>
          <p className="text-xs">Rays beyond the 150 cm rated range are drawn red, as in the lab; their readings still run to the far wall.</p>
        </div>
      }
    >
      <SvgCanvas viewBox={`0 0 ${W * S + 2 * PAD} ${H * S + 2 * PAD}`} title={`${arena.name} arena preview with the robot and its three ultrasonic rays`}>
        <rect x={0} y={0} width={W * S + 2 * PAD} height={H * S + 2 * PAD} rx={10} fill={vizColors.bg} />
        <rect x={PAD} y={PAD} width={W * S} height={H * S} fill={vizColors.grid} fillOpacity={0.35} />
        {/* 50 cm grid */}
        <g stroke={vizColors.grid} strokeWidth={1}>
          {Array.from({ length: Math.floor(W / 50) - 1 }, (_, i) => (
            <line key={`x${i}`} x1={sx((i + 1) * 50)} y1={sy(0)} x2={sx((i + 1) * 50)} y2={sy(H)} />
          ))}
          {Array.from({ length: Math.floor(H / 50) - 1 }, (_, i) => (
            <line key={`y${i}`} x1={sx(0)} y1={sy((i + 1) * 50)} x2={sx(W)} y2={sy((i + 1) * 50)} />
          ))}
        </g>

        {arena.line && (
          <path
            d={pathD(arena.line.map((v) => [v.x, v.y] as P))}
            fill="none"
            stroke={vizColors.silk}
            strokeOpacity={0.8}
            strokeWidth={2 * ROBOT.lineHalfWidth * S}
            strokeLinejoin="round"
          />
        )}
        <path d={pathD(path)} fill="none" stroke={vizColors.cyan} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 6" />

        {arena.walls.map((w, i) => (
          <line
            key={i}
            x1={sx(w.a.x)}
            y1={sy(w.a.y)}
            x2={sx(w.b.x)}
            y2={sy(w.b.y)}
            stroke={vizColors.muted}
            strokeWidth={i < 4 ? 3 : 6}
            strokeLinecap="round"
          />
        ))}
        {arena.obstacles.map((o, i) => (
          <circle key={i} cx={sx(o.c.x)} cy={sy(o.c.y)} r={o.r * S} fill={vizColors.orange} fillOpacity={0.2} stroke={vizColors.orange} strokeWidth={2} />
        ))}
        {arena.goal && (
          <g>
            <circle cx={sx(arena.goal.x)} cy={sy(arena.goal.y)} r={14} fill="none" stroke={vizColors.amber} strokeWidth={3} />
            <circle cx={sx(arena.goal.x)} cy={sy(arena.goal.y)} r={4} fill={vizColors.amber} />
            <Label x={sx(arena.goal.x) - 22} y={sy(arena.goal.y)} anchor="end" size={12} color={vizColors.amber} bold>
              goal
            </Label>
          </g>
        )}
        {/* where the lab's robot starts */}
        <g opacity={0.8}>
          <circle cx={sx(arena.start.x)} cy={sy(arena.start.y)} r={ROBOT.radius * S} fill="none" stroke={vizColors.green} strokeDasharray="3 3" />
          <line
            x1={sx(arena.start.x)}
            y1={sy(arena.start.y)}
            x2={sx(arena.start.x + ROBOT.radius * Math.cos(arena.start.theta))}
            y2={sy(arena.start.y + ROBOT.radius * Math.sin(arena.start.theta))}
            stroke={vizColors.green}
          />
          <Label x={sx(arena.start.x)} y={sy(arena.start.y) + ROBOT.radius * S + 10} size={10} color={vizColors.green}>
            lab start
          </Label>
        </g>

        {showRays &&
          rays.map((r) => (
            <g key={r.key}>
              <line
                x1={sx(r.ox)}
                y1={sy(r.oy)}
                x2={sx(r.ex)}
                y2={sy(r.ey)}
                stroke={r.hit ? vizColors.green : vizColors.red}
                strokeOpacity={r.hit ? 0.9 : 0.5}
                strokeWidth={1.5}
                strokeDasharray={r.hit ? undefined : "4 4"}
              />
              {r.hit && <circle cx={sx(r.ex)} cy={sy(r.ey)} r={3.5} fill={vizColors.green} />}
            </g>
          ))}

        <g transform={`translate(${sx(pose.x)} ${sy(pose.y)}) rotate(${deg})`}>
          <circle r={ROBOT.radius * S} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2.5} />
          <rect x={-5} y={-(ROBOT.wheelBase / 2) * S - 2.5} width={10} height={5} rx={1.5} fill={vizColors.muted} />
          <rect x={-5} y={(ROBOT.wheelBase / 2) * S - 2.5} width={10} height={5} rx={1.5} fill={vizColors.muted} />
          <line x1={0} y1={0} x2={ROBOT.radius * S} y2={0} stroke={vizColors.cyan} strokeWidth={2.5} />
        </g>
        {arena.line && (
          <>
            <circle cx={sx(linePts.left.x)} cy={sy(linePts.left.y)} r={3} fill={sensors.line.left ? vizColors.green : vizColors.grid} stroke={vizColors.muted} strokeWidth={0.8} />
            <circle cx={sx(linePts.right.x)} cy={sy(linePts.right.y)} r={3} fill={sensors.line.right ? vizColors.green : vizColors.grid} stroke={vizColors.muted} strokeWidth={0.8} />
          </>
        )}

        <Label x={PAD + 8} y={PAD + 12} anchor="start" size={11} color={vizColors.muted}>
          {`${arena.name}: ${W} cm × ${H} cm · grid 50 cm · robot ${2 * ROBOT.radius} cm across`}
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
