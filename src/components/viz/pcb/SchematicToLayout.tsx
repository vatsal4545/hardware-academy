"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useAnimationFrame, vizColors } from "@/components/viz/shared";
import {
  BOARD,
  NET_WIDTH,
  antennaKeepout,
  dist,
  distPointSegment,
  nets,
  partBox,
  parts,
  polyLength,
  zones,
  type Net,
  type Part,
  type Pt,
} from "./SchematicToLayoutBoard";
import { BACK_COPPER, BOARD_FILL, FRONT_COPPER, KeepoutHatch, PX, PartFootprint, bx, by } from "./SchematicToLayoutShapes";

/* ---------- stages on the slider (0 to 100) ---------- */

type Stage = "schematic" | "footprints" | "ratsnest" | "routing" | "pour";

const FLY_START = 12;
const FLY_LEN = 26;
const RATS_START = 38;
const ROUTE_START = 50;
const ROUTE_STEP = 2;
const ROUTE_DUR = 4;
const POUR_START = 88;

function stageOf(p: number): Stage {
  if (p < FLY_START) return "schematic";
  if (p < RATS_START) return "footprints";
  if (p < ROUTE_START) return "ratsnest";
  if (p < POUR_START) return "routing";
  return "pour";
}

/** Each target sits just inside its own stage (the last moment before the next one starts). */
const STAGE_JUMP: Record<Stage, number> = { schematic: 0, footprints: RATS_START - 1, ratsnest: ROUTE_START - 1, routing: POUR_START - 1, pour: 100 };

const STAGE_INFO: Record<Stage, { title: string; text: string }> = {
  schematic: {
    title: "1. Schematic",
    text: "Symbols and net names. ERC is clean: every input is driven, power flags are in place, and the control buses connect by label rather than by wire.",
  },
  footprints: {
    title: "2. Update PCB from Schematic",
    text: "F8 brings every footprint into the board. Place them by zone: connectors on the edges, the module's antenna at the board edge, each decoupling capacitor beside its pin.",
  },
  ratsnest: {
    title: "3. Ratsnest",
    text: "Each thin line is a connection still to be routed. Short, untangled airwires mean a good placement; a hairball means move parts before you route.",
  },
  routing: {
    title: "4. Routing",
    text: "Power and motor nets first with wide traces (1.5 mm for VM and the motor outputs), then the control bus at 0.2 mm with 45° bends, hopping layers through vias only where it must.",
  },
  pour: {
    title: "5. Ground pour",
    text: "Fill zones on GND: a solid plane on layer 2 and pours on the outer layers, stitched with vias. The airwires vanish, and nothing is poured under the antenna.",
  },
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (x: number) => x * x * (3 - 2 * x);

/* ---------- schematic layout (pixels) ---------- */

interface SchPin {
  name: string;
  at: Pt;
  side: "l" | "r" | "t" | "b";
  net?: string;
}
interface SchSym {
  ref: string;
  x: number;
  y: number;
  w: number;
  h: number;
  pins: SchPin[];
}

const BUS_NAMES = ["PWMA", "AIN2", "AIN1", "STBY", "BIN1", "BIN2", "PWMB"];
const BUS_GPIO = ["IO25", "IO27", "IO26", "IO4", "IO19", "IO23", "IO18"];

const SYMS: SchSym[] = [
  { ref: "J1", x: 80, y: 130, w: 80, h: 50, pins: [{ name: "+", at: [120, 118], side: "r" }, { name: "-", at: [120, 142], side: "r" }] },
  {
    ref: "Q1",
    x: 230,
    y: 130,
    w: 80,
    h: 70,
    pins: [
      { name: "D", at: [190, 118], side: "l" },
      { name: "S", at: [270, 118], side: "r" },
      { name: "G", at: [230, 165], side: "b" },
    ],
  },
  {
    ref: "U3",
    x: 440,
    y: 130,
    w: 110,
    h: 60,
    pins: [
      { name: "IN", at: [385, 118], side: "l" },
      { name: "OUT", at: [495, 118], side: "r" },
      { name: "GND", at: [440, 160], side: "b" },
    ],
  },
  {
    ref: "U2",
    x: 330,
    y: 330,
    w: 140,
    h: 150,
    pins: [
      { name: "VM", at: [290, 255], side: "t" },
      { name: "VCC", at: [370, 255], side: "t" },
      ...BUS_NAMES.map((n, i): SchPin => ({ name: n, at: [260, 285 + 18 * i], side: "l", net: n })),
      { name: "AO1", at: [400, 322], side: "r" },
      { name: "AO2", at: [400, 340], side: "r" },
      { name: "BO1", at: [400, 377], side: "r" },
      { name: "BO2", at: [400, 395], side: "r" },
    ],
  },
  { ref: "J2", x: 480, y: 331, w: 80, h: 36, pins: [{ name: "1", at: [440, 322], side: "l" }, { name: "2", at: [440, 340], side: "l" }] },
  { ref: "J3", x: 480, y: 386, w: 80, h: 36, pins: [{ name: "1", at: [440, 377], side: "l" }, { name: "2", at: [440, 395], side: "l" }] },
  {
    ref: "U1",
    x: 620,
    y: 250,
    w: 130,
    h: 210,
    pins: [
      { name: "3V3", at: [555, 165], side: "l" },
      ...BUS_GPIO.map((g, i): SchPin => ({ name: g, at: [555, 195 + 18 * i], side: "l", net: BUS_NAMES[i] })),
      { name: "IO32", at: [585, 355], side: "b", net: "LINE_L" },
      { name: "IO16", at: [610, 355], side: "b", net: "TRIG" },
      { name: "IO17", at: [635, 355], side: "b", net: "ECHO" },
      { name: "IO33", at: [660, 355], side: "b", net: "LINE_R" },
    ],
  },
  { ref: "J5", x: 120, y: 432, w: 80, h: 30, pins: [{ name: "OUT", at: [140, 417], side: "t", net: "LINE_L" }] },
  {
    ref: "J4",
    x: 280,
    y: 432,
    w: 100,
    h: 30,
    pins: [
      { name: "TRIG", at: [255, 417], side: "t", net: "TRIG" },
      { name: "ECHO", at: [305, 417], side: "t", net: "ECHO" },
    ],
  },
  { ref: "J6", x: 440, y: 432, w: 80, h: 30, pins: [{ name: "OUT", at: [460, 417], side: "t", net: "LINE_R" }] },
];

const WIRES: Pt[][] = [
  [[120, 118], [190, 118]],
  [[270, 118], [385, 118]],
  [[327, 118], [327, 240], [290, 240], [290, 255]],
  [[495, 118], [503, 118], [503, 165], [555, 165]],
  [[503, 118], [503, 235], [370, 235], [370, 255]],
  [[400, 322], [440, 322]],
  [[400, 340], [440, 340]],
  [[400, 377], [440, 377]],
  [[400, 395], [440, 395]],
];
const JUNCTIONS: Pt[] = [
  [327, 118],
  [503, 118],
];
const WIRE_LABELS: Array<{ at: Pt; text: string }> = [
  { at: [155, 110], text: "VBAT" },
  { at: [300, 110], text: "VM" },
  { at: [520, 110], text: "+3V3" },
];

/** Straight airwires for GND; GND is filled by a zone, so it is not routed. */
const GND_CHAIN: Pt[] = [
  [4.8, 29.25],
  [11.0, 31.5],
  [16.9, 31.35],
  [28.6, 26.4],
  [47.25, 29.0],
];

/* ---------- stitching vias, computed once ---------- */

function computeStitchVias(): Pt[] {
  const out: Pt[] = [];
  const holes = parts.filter((p) => p.kind === "hole");
  let row = 0;
  for (let y = 2.5; y <= 37.5; y += 3.5, row++) {
    for (let x = 2.5 + (row % 2) * 1.75; x <= 57.5; x += 3.5) {
      const pt: Pt = [x, y];
      if (holes.some((h) => dist(h.x, h.y, x, y) < 4.6)) continue;
      if (x > antennaKeepout.x - 1.5 && y > antennaKeepout.y - 1.5 && y < antennaKeepout.y + antennaKeepout.h + 1.5) continue;
      const nearPart = parts.some((p) => {
        const b = partBox(p);
        const dx = Math.max(b.x0 - x, 0, x - b.x1);
        const dy = Math.max(b.y0 - y, 0, y - b.y1);
        return Math.sqrt(dx * dx + dy * dy) < 1.2;
      });
      if (nearPart) continue;
      const nearRoute = nets.some((n) =>
        n.routes.some((r) => r.layer === "F" && r.pts.some((_, i) => i > 0 && distPointSegment(pt, r.pts[i - 1], r.pts[i]) - NET_WIDTH[n.cls] / 2 < 1.0)),
      );
      if (nearRoute) continue;
      out.push(pt);
    }
  }
  return out;
}
const STITCH = computeStitchVias();

/* ---------- drawing helpers ---------- */

function toPx(pts: Pt[]): string {
  return pts.map(([x, y]) => `${bx(x).toFixed(1)},${by(y).toFixed(1)}`).join(" ");
}

function pxLength(pts: Pt[]): number {
  return polyLength(pts) * PX;
}

const CLASS_COLOR: Record<Net["cls"], string> = { power: vizColors.amber, motor: vizColors.orange, signal: vizColors.cyan };

function RouteLine({ pts, layer, width, progress }: { pts: Pt[]; layer: "F" | "B"; width: number; progress: number }) {
  if (progress <= 0.001) return null;
  const len = pxLength(pts);
  return (
    <polyline
      points={toPx(pts)}
      fill="none"
      stroke={layer === "F" ? FRONT_COPPER : BACK_COPPER}
      strokeOpacity={layer === "F" ? 0.95 : 0.8}
      strokeWidth={width * PX}
      strokeLinejoin="round"
      strokeLinecap="butt"
      strokeDasharray={`${len} ${len}`}
      strokeDashoffset={len * (1 - progress)}
    />
  );
}

/** Split a net's progress q over its route polylines in proportion to their lengths. */
function routeProgress(net: Net, q: number): number[] {
  const lens = net.routes.map((r) => polyLength(r.pts));
  const total = lens.reduce((a, b) => a + b, 0);
  let acc = 0;
  return lens.map((l) => {
    const a = acc / total;
    const b = (acc + l) / total;
    acc += l;
    return clamp01((q - a) / (b - a));
  });
}

function SchematicSymbol({ sym, part }: { sym: SchSym; part: Part }) {
  const tall = sym.h >= 100;
  const header = sym.pins.some((pin) => pin.side === "t") && sym.ref.startsWith("J");
  return (
    <g fontFamily="var(--font-sans)">
      {header ? (
        <text x={0} y={sym.h / 2 - 6} textAnchor="middle" fontSize={10} fontWeight={700} fill={vizColors.text}>
          {`${part.ref} ${part.label}`}
        </text>
      ) : (
        <>
          <text x={0} y={tall ? -4 : -sym.h / 2 + 15} textAnchor="middle" fontSize={tall ? 14 : 12} fontWeight={700} fill={vizColors.text}>
            {part.ref}
          </text>
          <text x={0} y={tall ? 11 : -sym.h / 2 + 29} textAnchor="middle" fontSize={10} fill={vizColors.muted}>
            {part.label}
          </text>
        </>
      )}
      {sym.pins.map((pin) => {
        const px = pin.at[0] - sym.x;
        const py = pin.at[1] - sym.y;
        const header = pin.side === "t" && sym.ref.startsWith("J");
        const name = header ? pin.net ?? pin.name : pin.name;
        const inside =
          pin.side === "l"
            ? { x: px + 6, y: py, a: "start" as const }
            : pin.side === "r"
              ? { x: px - 6, y: py, a: "end" as const }
              : pin.side === "t"
                ? { x: px, y: py + 13, a: "middle" as const }
                : { x: px, y: py - 9, a: "middle" as const };
        const showName = !sym.ref.startsWith("J") || header;
        return (
          <g key={pin.name + pin.at.join(",")}>
            <circle cx={px} cy={py} r={2.6} fill={vizColors.violet} />
            {showName && (
              <text x={inside.x} y={inside.y + 3.5} textAnchor={inside.a} fontSize={9.5} fill={vizColors.text} opacity={0.9}>
                {name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function SchematicLabels() {
  return (
    <g>
      {SYMS.flatMap((sym) =>
        sym.pins
          .filter((pin) => pin.net && pin.side !== "t")
          .map((pin) => {
            const [x, y] = pin.at;
            if (pin.side === "l") {
              return (
                <g key={`${sym.ref}-${pin.name}`} fontFamily="var(--font-sans)">
                  <line x1={x} y1={y} x2={x - 8} y2={y} stroke={vizColors.green} strokeWidth={1.4} />
                  <text x={x - 11} y={y + 3.5} textAnchor="end" fontSize={10} fontWeight={600} fill={vizColors.green}>
                    {pin.net}
                  </text>
                </g>
              );
            }
            const dir = pin.side === "b" ? 1 : -1;
            return (
              <g key={`${sym.ref}-${pin.name}`} fontFamily="var(--font-sans)">
                <line x1={x} y1={y} x2={x} y2={y + dir * 8} stroke={vizColors.green} strokeWidth={1.4} />
                <text
                  x={x}
                  y={y + dir * 11}
                  fontSize={10}
                  fontWeight={600}
                  fill={vizColors.green}
                  textAnchor={pin.side === "b" ? "start" : "end"}
                  dominantBaseline="middle"
                  transform={`rotate(90 ${x} ${y + dir * 11})`}
                >
                  {pin.net}
                </text>
              </g>
            );
          }),
      )}
    </g>
  );
}

/* ---------- component ---------- */

export function SchematicToLayout() {
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(false);
  const running = playing && p < 100;
  useAnimationFrame((dt) => setP((x) => Math.min(100, x + dt * 5)), running);

  const stage = stageOf(p);
  const fly = clamp01((p - FLY_START) / FLY_LEN);
  const e = ease(fly);
  const boardOp = clamp01((p - 8) / 12);
  const zoneOp = clamp01((p - 30) / 10);
  const ratsOp = clamp01((p - RATS_START) / 6);
  const pourOp = clamp01((p - POUR_START) / 8);
  const viaOp = clamp01((p - 95) / 4);

  const progress = nets.map((_, k) => clamp01((p - (ROUTE_START + ROUTE_STEP * k)) / ROUTE_DUR));
  const routedNets = progress.filter((q) => q >= 1).length;
  const unrouted = nets.length - routedNets + (pourOp < 1 ? 1 : 0);
  const placed = p < FLY_START ? 0 : Math.round(parts.length * e);
  const symByRef = new Map(SYMS.map((s) => [s.ref, s]));
  const hatchId = "stl-keepout-hatch";

  return (
    <VizFrame
      title="From schematic to layout: the five stages of a KiCad board"
      description="Scrub the slider (or press play) to watch the robot's driver board go from schematic symbols to footprints, a ratsnest, routed copper and a ground pour. Only the key nets are drawn."
      controls={
        <>
          <Slider
            label="Design progress"
            value={p}
            min={0}
            max={100}
            step={1}
            onChange={setP}
            format={(v) => `${Math.round(v)} %, ${STAGE_INFO[stageOf(v)].title}`}
          />
          <Segmented<Stage>
            label="Jump to stage"
            options={[
              { value: "schematic", label: "Schematic" },
              { value: "footprints", label: "Footprints" },
              { value: "ratsnest", label: "Ratsnest" },
              { value: "routing", label: "Routing" },
              { value: "pour", label: "Pour" },
            ]}
            value={stage}
            onChange={(s) => setP(STAGE_JUMP[s])}
          />
          <PlayPause
            playing={running}
            onToggle={() => {
              if (p >= 100) {
                setP(0);
                setPlaying(true);
              } else setPlaying(!playing);
            }}
            onReset={() => {
              setP(0);
              setPlaying(false);
            }}
          />
        </>
      }
      footer={
        <div className="space-y-2">
          <p className="font-medium text-text" data-testid="stl-stage">
            {STAGE_INFO[stage].title}
          </p>
          <p>{STAGE_INFO[stage].text}</p>
          <p className="font-mono text-xs" data-testid="stl-counters">
            footprints placed {placed} / {parts.length} · unrouted connections {p < RATS_START ? "not shown yet" : `${unrouted} of ${nets.length + 1}`}
          </p>
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 720 470" title={`Schematic to layout, stage: ${STAGE_INFO[stage].title}`}>
        <defs>
          <KeepoutHatch id={hatchId} />
        </defs>
        <rect x="0" y="0" width="720" height="470" rx="8" fill={vizColors.bg} />

        {/* schematic sheet */}
        <g opacity={1 - e}>
          <rect x="14" y="14" width="692" height="442" rx="4" fill="none" stroke={vizColors.grid} strokeWidth={1.5} />
          {WIRES.map((w, i) => (
            <polyline key={i} points={w.map(([x, y]) => `${x},${y}`).join(" ")} fill="none" stroke={vizColors.green} strokeWidth={1.6} />
          ))}
          {JUNCTIONS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={3.4} fill={vizColors.green} />
          ))}
          {WIRE_LABELS.map((l) => (
            <text key={l.text} x={l.at[0]} y={l.at[1]} textAnchor="middle" fontSize={10} fontWeight={600} fill={vizColors.green} fontFamily="var(--font-sans)">
              {l.text}
            </text>
          ))}
          <SchematicLabels />
          <text x="26" y="34" fontSize="11" fill={vizColors.muted} fontFamily="var(--font-sans)">
            robot-motor-driver.kicad_sch (key nets; decoupling, EN, BOOT, LED and UART omitted)
          </text>
        </g>

        {/* board outline and zones */}
        <g opacity={boardOp}>
          <rect x={bx(0)} y={by(0)} width={BOARD.w * PX} height={BOARD.h * PX} rx={10} fill={BOARD_FILL} stroke={vizColors.amber} strokeWidth={2} />
        </g>
        <g opacity={zoneOp}>
          {zones.map((z) =>
            z.rects.map(([x, y, w, h], k) => (
              <rect key={`${z.id}${k}`} x={bx(x)} y={by(y)} width={w * PX} height={h * PX} fill={z.color} opacity={0.12} stroke={z.color} strokeOpacity={0.5} strokeDasharray="5 4" />
            )),
          )}
          {zones.map((z) => (
            <Label key={`${z.id}l`} x={bx(z.label[0])} y={by(z.label[1])} anchor="start" size={11} bold color={z.color}>
              {z.name}
            </Label>
          ))}
        </g>

        {/* ground pour with clearance halos */}
        {pourOp > 0 && (
          <g opacity={pourOp}>
            <rect x={bx(0.3)} y={by(0.3)} width={(BOARD.w - 0.6) * PX} height={(BOARD.h - 0.6) * PX} rx={9} fill={FRONT_COPPER} opacity={0.24} />
            {nets.flatMap((n) =>
              n.routes
                .filter((r) => r.layer === "F")
                .map((r, i) => (
                  <polyline key={`${n.id}-halo-${i}`} points={toPx(r.pts)} fill="none" stroke={BOARD_FILL} strokeWidth={(NET_WIDTH[n.cls] + 0.7) * PX} strokeLinejoin="round" strokeLinecap="round" />
                )),
            )}
            <rect x={bx(antennaKeepout.x)} y={by(antennaKeepout.y)} width={antennaKeepout.w * PX} height={antennaKeepout.h * PX} fill={BOARD_FILL} />
          </g>
        )}

        {/* back-layer copper first, then front */}
        {nets.map((n, k) =>
          routeProgress(n, progress[k]).map((q, i) =>
            n.routes[i].layer === "B" ? <RouteLine key={`${n.id}-b${i}`} pts={n.routes[i].pts} layer="B" width={NET_WIDTH[n.cls]} progress={q} /> : null,
          ),
        )}
        {nets.map((n, k) =>
          routeProgress(n, progress[k]).map((q, i) =>
            n.routes[i].layer === "F" ? <RouteLine key={`${n.id}-f${i}`} pts={n.routes[i].pts} layer="F" width={NET_WIDTH[n.cls]} progress={q} /> : null,
          ),
        )}
        {nets.map((n, k) =>
          progress[k] > 0.5
            ? n.vias.map(([x, y]) => (
                <g key={`${n.id}-via-${x}-${y}`}>
                  <circle cx={bx(x)} cy={by(y)} r={0.45 * PX} fill={vizColors.copper} />
                  <circle cx={bx(x)} cy={by(y)} r={0.2 * PX} fill="#0b0f17" />
                </g>
              ))
            : null,
        )}

        {/* ratsnest */}
        <g>
          {nets.map((n, k) =>
            n.taps.slice(1).map((t, i) => {
              const a = n.taps[i].at;
              const op = ratsOp * (1 - progress[k]);
              if (op <= 0.01) return null;
              return <line key={`${n.id}-r${i}`} x1={bx(a[0])} y1={by(a[1])} x2={bx(t.at[0])} y2={by(t.at[1])} stroke={CLASS_COLOR[n.cls]} strokeWidth={1.2} opacity={op * 0.9} />;
            }),
          )}
          {GND_CHAIN.slice(1).map((b, i) => {
            const a = GND_CHAIN[i];
            const op = ratsOp * (1 - pourOp);
            if (op <= 0.01) return null;
            return <line key={`g${i}`} x1={bx(a[0])} y1={by(a[1])} x2={bx(b[0])} y2={by(b[1])} stroke={vizColors.violet} strokeWidth={1.2} strokeDasharray="4 3" opacity={op * 0.9} />;
          })}
        </g>

        {/* parts: schematic symbols fly into footprints */}
        {parts.map((part) => {
          const sym = symByRef.get(part.ref);
          if (!sym) {
            return (
              <g key={part.ref} transform={`translate(${bx(part.x)} ${by(part.y)})`} opacity={part.kind === "hole" ? boardOp : e}>
                <PartFootprint part={part} showRef={part.kind !== "cap" && part.kind !== "res" && part.kind !== "led"} />
              </g>
            );
          }
          const cx = lerp(sym.x, bx(part.x), e);
          const cy = lerp(sym.y, by(part.y), e);
          const w = lerp(sym.w, part.w * PX, e);
          const h = lerp(sym.h, part.h * PX, e);
          const t = clamp01((fly - 0.4) / 0.2);
          const symOp = 1 - t;
          const fpOp = t;
          const k = w / (part.w * PX);
          return (
            <g key={part.ref} transform={`translate(${cx} ${cy})`}>
              {fpOp < 1 && (
                <g opacity={e < 1 || symOp > 0 ? 1 : 0}>
                  <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill="#121826" fillOpacity={symOp} stroke={vizColors.violet} strokeWidth={1.5} strokeOpacity={symOp} />
                  <g opacity={symOp}>
                    <SchematicSymbol sym={sym} part={part} />
                  </g>
                </g>
              )}
              {fpOp > 0 && (
                <g opacity={fpOp} transform={`scale(${k})`}>
                  <PartFootprint part={part} />
                </g>
              )}
            </g>
          );
        })}

        {/* antenna keep-out */}
        <g opacity={clamp01((p - 36) / 6)}>
          <rect x={bx(antennaKeepout.x)} y={by(antennaKeepout.y)} width={antennaKeepout.w * PX} height={antennaKeepout.h * PX} fill={`url(#${hatchId})`} stroke={vizColors.red} strokeOpacity={0.7} />
        </g>

        {/* stitching vias */}
        {viaOp > 0 && (
          <g opacity={viaOp}>
            {STITCH.map(([x, y]) => (
              <g key={`${x}-${y}`}>
                <circle cx={bx(x)} cy={by(y)} r={0.4 * PX} fill={vizColors.copper} />
                <circle cx={bx(x)} cy={by(y)} r={0.18 * PX} fill="#0b0f17" />
              </g>
            ))}
          </g>
        )}

        {/* legend */}
        <g opacity={boardOp}>
          <line x1={bx(0)} x2={bx(2)} y1={by(41.8)} y2={by(41.8)} stroke={FRONT_COPPER} strokeWidth={4} />
          <Label x={bx(2.4)} y={by(41.8)} anchor="start" size={11} color={vizColors.muted}>
            F.Cu
          </Label>
          <line x1={bx(6)} x2={bx(8)} y1={by(41.8)} y2={by(41.8)} stroke={BACK_COPPER} strokeWidth={4} />
          <Label x={bx(8.4)} y={by(41.8)} anchor="start" size={11} color={vizColors.muted}>
            B.Cu
          </Label>
          <Label x={bx(60)} y={by(41.8)} anchor="end" size={11} color={vizColors.muted}>
            60 × 40 mm, M3 holes, antenna at the edge
          </Label>
        </g>
      </SvgCanvas>
    </VizFrame>
  );
}
