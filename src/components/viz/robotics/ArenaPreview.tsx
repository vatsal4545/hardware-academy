"use client";

import { useState } from "react";
import { PlayPause, Segmented, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";
import { r2 } from "./RoundedArrow";

// A preview of the robot simulator lab's three arenas (300 cm × 200 cm, y down) with a robot driving a sample path.
// It does not import the lab: geometry here is a sketch, and the lab's arenas may differ in detail.

type ArenaId = "open-room" | "line-track" | "corridor";
type P = [number, number];

interface Arena {
  id: ArenaId;
  name: string;
  blurb: string;
  walls: Array<[P, P]>;
  obstacles: Array<{ c: P; r: number }>;
  line?: P[];
  goal?: P;
  path: P[];
  loop: boolean;
}

const W = 300;
const H = 200;
const S = 2; // px per cm
const PAD = 20;
const ROBOT_R = 7;
const RANGE = 150;
const SPEED = 40; // cm/s, the lab's top speed

const BOX: Array<[P, P]> = [
  [
    [0, 0],
    [W, 0],
  ],
  [
    [W, 0],
    [W, H],
  ],
  [
    [W, H],
    [0, H],
  ],
  [
    [0, H],
    [0, 0],
  ],
];

function ellipse(cx: number, cy: number, rx: number, ry: number, n: number): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const f = (i / n) * 2 * Math.PI;
    return [cx + rx * Math.cos(f), cy + ry * Math.sin(f)] as P;
  });
}

function roundedRect(x0: number, y0: number, x1: number, y1: number, rad: number): P[] {
  const pts: P[] = [];
  const arc = (cx: number, cy: number, a0: number, a1: number) => {
    for (let i = 0; i <= 12; i++) {
      const a = a0 + (i / 12) * (a1 - a0);
      pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
    }
  };
  // start mid-bottom heading right, then counter-clockwise on screen (y points down)
  const midX = (x0 + x1) / 2;
  pts.push([midX, y1]);
  arc(x1 - rad, y1 - rad, Math.PI / 2, 0);
  arc(x1 - rad, y0 + rad, 0, -Math.PI / 2);
  arc(x0 + rad, y0 + rad, -Math.PI / 2, -Math.PI);
  arc(x0 + rad, y1 - rad, Math.PI, Math.PI / 2);
  pts.push([midX, y1]);
  return pts;
}

function corridorPath(): P[] {
  const pts: P[] = [];
  for (let x = 30; x <= 235; x += 5) pts.push([x, 165]);
  for (let i = 1; i <= 12; i++) {
    const a = Math.PI / 2 - (i / 12) * (Math.PI / 2);
    pts.push([235 + 35 * Math.cos(a), 130 + 35 * Math.sin(a)]);
  }
  for (let y = 125; y >= 30; y -= 5) pts.push([270, y]);
  return pts;
}

const TRACK = roundedRect(40, 40, 260, 160, 40);

const ARENAS: Arena[] = [
  {
    id: "open-room",
    name: "Open room",
    blurb: "Three round obstacles in an empty room: practice obstacle avoidance and wall following.",
    walls: BOX,
    obstacles: [
      { c: [90, 80], r: 18 },
      { c: [190, 128], r: 22 },
      { c: [240, 40], r: 15 },
    ],
    path: ellipse(190, 128, 72, 56, 120),
    loop: true,
  },
  {
    id: "line-track",
    name: "Line track",
    blurb: "A closed rounded-rectangle line: practice line following and lost-line recovery.",
    walls: BOX,
    obstacles: [],
    line: TRACK,
    path: TRACK,
    loop: true,
  },
  {
    id: "corridor",
    name: "Corridor",
    blurb: "An L-shaped corridor with a goal at the far end: practice wall following and go-to-goal.",
    walls: [
      ...BOX,
      [
        [0, 130],
        [230, 130],
      ],
      [
        [230, 130],
        [230, 0],
      ],
    ],
    obstacles: [],
    goal: [270, 30],
    path: corridorPath(),
    loop: false,
  },
];

/** Cumulative arc length along a polyline. */
function lengths(path: P[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) out.push(out[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  return out;
}

const LENGTHS: Record<ArenaId, number[]> = Object.fromEntries(ARENAS.map((a) => [a.id, lengths(a.path)])) as Record<ArenaId, number[]>;

/** Pose at arc length s (cm): position and heading (radians, screen coordinates). */
function poseAt(arena: Arena, s: number): { x: number; y: number; theta: number } {
  const L = LENGTHS[arena.id];
  const total = L[L.length - 1];
  const d = Math.max(0, Math.min(total - 1e-6, s));
  let i = 1;
  while (i < L.length - 1 && L[i] < d) i++;
  const [ax, ay] = arena.path[i - 1];
  const [bx, by] = arena.path[i];
  const seg = L[i] - L[i - 1] || 1;
  const u = (d - L[i - 1]) / seg;
  let x = ax + (bx - ax) * u;
  let y = ay + (by - ay) * u;
  const theta = Math.atan2(by - ay, bx - ax);
  if (arena.id === "line-track") {
    // a line follower weaves a little around the line, so its sensors flicker on and off
    const off = 2.2 * Math.sin((2 * Math.PI * d) / 45);
    x += -Math.sin(theta) * off;
    y += Math.cos(theta) * off;
  }
  return { x, y, theta };
}

/** Distance along a ray to the nearest wall or obstacle (cm), or Infinity. */
function raycast(arena: Arena, ox: number, oy: number, angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = Infinity;
  for (const [[ax, ay], [bx, by]] of arena.walls) {
    const ex = bx - ax;
    const ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - ox) * ey - (ay - oy) * ex) / den;
    const u = ((ax - ox) * dy - (ay - oy) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
  }
  for (const { c, r } of arena.obstacles) {
    const fx = ox - c[0];
    const fy = oy - c[1];
    const b = fx * dx + fy * dy;
    const cc = fx * fx + fy * fy - r * r;
    const disc = b * b - cc;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    if (t > 0) best = Math.min(best, t);
  }
  return best;
}

function pointSegDist(px: number, py: number, a: P, b: P): number {
  const vx = b[0] - a[0];
  const vy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - a[0] - t * vx, py - a[1] - t * vy);
}

function onLine(line: P[] | undefined, x: number, y: number): 0 | 1 {
  if (!line) return 0;
  for (let i = 1; i < line.length; i++) if (pointSegDist(x, y, line[i - 1], line[i]) <= 1.5) return 1;
  return 0;
}

const sx = (x: number) => r2(PAD + x * S);
const sy = (y: number) => r2(PAD + y * S);

function pathD(points: P[]): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${sx(x)} ${sy(y)}`).join(" ");
}

const fmtRange = (d: number) => (d >= RANGE ? "150+ (open)" : `${d.toFixed(1)} cm`);

export function ArenaPreview() {
  const { t, playing, toggle, reset } = useViz();
  const [arenaId, setArenaId] = useState<ArenaId>("open-room");
  const [showRays, setShowRays] = useState(true);
  const arena = ARENAS.find((a) => a.id === arenaId) ?? ARENAS[0];

  const total = LENGTHS[arena.id][LENGTHS[arena.id].length - 1];
  const traveled = t * SPEED;
  // closed tracks loop; the corridor runs start to goal, waits 1.5 s, then starts again
  const s = arena.loop ? traveled % total : Math.min(total, traveled % (total + 1.5 * SPEED));
  const pose = poseAt(arena, s);

  const rays = [
    { key: "left", angle: pose.theta - Math.PI / 4 },
    { key: "front", angle: pose.theta },
    { key: "right", angle: pose.theta + Math.PI / 4 },
  ].map((r) => {
    const ox = pose.x + ROBOT_R * Math.cos(r.angle);
    const oy = pose.y + ROBOT_R * Math.sin(r.angle);
    const hit = raycast(arena, ox, oy, r.angle);
    const d = Math.min(RANGE, hit);
    return { ...r, ox, oy, d, hit: hit <= RANGE, ex: ox + d * Math.cos(r.angle), ey: oy + d * Math.sin(r.angle) };
  });

  const sensorPos = (side: -1 | 1) => ({
    x: pose.x + 6 * Math.cos(pose.theta) - side * 2.5 * Math.sin(pose.theta),
    y: pose.y + 6 * Math.sin(pose.theta) + side * 2.5 * Math.cos(pose.theta),
  });
  const lineL = sensorPos(-1);
  const lineR = sensorPos(1);
  const lineReading: [0 | 1, 0 | 1] = [onLine(arena.line, lineL.x, lineL.y), onLine(arena.line, lineR.x, lineR.y)];
  const deg = r2((pose.theta * 180) / Math.PI);

  return (
    <VizFrame
      title="The simulator's three arenas"
      description="A preview of what the robot simulator lab gives you: the arenas, the robot and the three ultrasonic rays your controller reads. The robot here follows a scripted path and the layouts are sketches; in the lab, your code drives it and the exact geometry may differ."
      controls={
        <>
          <Segmented
            label="Arena"
            options={ARENAS.map((a) => ({ value: a.id, label: a.name }))}
            value={arenaId}
            onChange={(v) => {
              setArenaId(v);
              reset();
            }}
          />
          <Toggle label="Show sensor rays" checked={showRays} onChange={setShowRays} />
          <PlayPause playing={playing} onToggle={toggle} onReset={reset} />
        </>
      }
      footer={
        <div className="space-y-1">
          <p>{arena.blurb}</p>
          <p className="font-mono text-xs text-text">
            sensors.ultrasonic: left {fmtRange(rays[0].d)} · front {fmtRange(rays[1].d)} · right {fmtRange(rays[2].d)}
            {arena.line ? ` · sensors.line: left ${lineReading[0]}, right ${lineReading[1]}` : ""}
          </p>
        </div>
      }
    >
      <SvgCanvas viewBox={`0 0 ${W * S + 2 * PAD} ${H * S + 2 * PAD}`} title={`${arena.name} arena preview with the robot and its three ultrasonic rays`}>
        <rect x={0} y={0} width={W * S + 2 * PAD} height={H * S + 2 * PAD} rx={10} fill={vizColors.bg} />
        <rect x={PAD} y={PAD} width={W * S} height={H * S} fill={vizColors.grid} fillOpacity={0.35} />
        {/* 50 cm grid */}
        <g stroke={vizColors.grid} strokeWidth={1}>
          {Array.from({ length: W / 50 - 1 }, (_, i) => (
            <line key={`x${i}`} x1={sx((i + 1) * 50)} y1={sy(0)} x2={sx((i + 1) * 50)} y2={sy(H)} />
          ))}
          {Array.from({ length: H / 50 - 1 }, (_, i) => (
            <line key={`y${i}`} x1={sx(0)} y1={sy((i + 1) * 50)} x2={sx(W)} y2={sy((i + 1) * 50)} />
          ))}
        </g>

        {arena.line && <path d={`${pathD(arena.line)} Z`} fill="none" stroke={vizColors.silk} strokeOpacity={0.8} strokeWidth={3 * S} strokeLinejoin="round" />}
        <path d={pathD(arena.path)} fill="none" stroke={vizColors.cyan} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 6" />

        {arena.walls.map(([a, b], i) => (
          <line key={i} x1={sx(a[0])} y1={sy(a[1])} x2={sx(b[0])} y2={sy(b[1])} stroke={vizColors.muted} strokeWidth={i < 4 ? 3 : 6} strokeLinecap="round" />
        ))}
        {arena.obstacles.map(({ c, r }, i) => (
          <circle key={i} cx={sx(c[0])} cy={sy(c[1])} r={r * S} fill={vizColors.orange} fillOpacity={0.2} stroke={vizColors.orange} strokeWidth={2} />
        ))}
        {arena.goal && (
          <g>
            <circle cx={sx(arena.goal[0])} cy={sy(arena.goal[1])} r={14} fill="none" stroke={vizColors.amber} strokeWidth={3} />
            <circle cx={sx(arena.goal[0])} cy={sy(arena.goal[1])} r={4} fill={vizColors.amber} />
            <Label x={sx(arena.goal[0]) - 22} y={sy(arena.goal[1])} anchor="end" size={12} color={vizColors.amber} bold>
              goal
            </Label>
          </g>
        )}

        {showRays &&
          rays.map((r) => (
            <g key={r.key}>
              <line
                x1={sx(r.ox)}
                y1={sy(r.oy)}
                x2={sx(r.ex)}
                y2={sy(r.ey)}
                stroke={r.hit ? vizColors.green : vizColors.red}
                strokeOpacity={r.hit ? 0.9 : 0.45}
                strokeWidth={1.5}
                strokeDasharray={r.hit ? undefined : "4 4"}
              />
              {r.hit && <circle cx={sx(r.ex)} cy={sy(r.ey)} r={3.5} fill={vizColors.green} />}
            </g>
          ))}

        <g transform={`translate(${sx(pose.x)} ${sy(pose.y)}) rotate(${deg})`}>
          <circle r={ROBOT_R * S} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2.5} />
          <rect x={-5} y={-6 * S - 2.5} width={10} height={5} rx={1.5} fill={vizColors.muted} />
          <rect x={-5} y={6 * S - 2.5} width={10} height={5} rx={1.5} fill={vizColors.muted} />
          <line x1={0} y1={0} x2={ROBOT_R * S} y2={0} stroke={vizColors.cyan} strokeWidth={2.5} />
          {arena.line && (
            <>
              <circle cx={6 * S} cy={-2.5 * S} r={3} fill={lineReading[0] ? vizColors.green : vizColors.grid} stroke={vizColors.muted} strokeWidth={0.8} />
              <circle cx={6 * S} cy={2.5 * S} r={3} fill={lineReading[1] ? vizColors.green : vizColors.grid} stroke={vizColors.muted} strokeWidth={0.8} />
            </>
          )}
        </g>

        <Label x={PAD + 8} y={PAD + H * S - 12} anchor="start" size={11} color={vizColors.muted}>
          {`${arena.name}: 300 cm × 200 cm · grid 50 cm · robot 14 cm across`}
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
