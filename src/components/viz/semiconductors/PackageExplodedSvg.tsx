"use client";

import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { packageColors, packageLayers, type PackageKind } from "./PackageExplodedLayers";

/** Vertical gap added between neighbouring layers at full explode, in SVG units. */
const GAP = 30;
const PCB_TOP = 300;
/** The top cover (lid or mold) is tall, so it gets extra lift to clear the layer below it. */
const COVER_EXTRA: Record<PackageKind, number> = { bga: 24, qfn: 60 };

/** Upward shift (negative y) of layer k at the given explode fraction. */
function layerLift(kind: PackageKind, k: number, explode: number): number {
  const extra = k === packageLayers[kind].length - 1 ? COVER_EXTRA[kind] : 0;
  return -(k * GAP + extra) * explode;
}

/** Compact (unexploded) centre y and right edge of each layer, used for the label leader lines. */
const anchors: Record<PackageKind, Array<{ y: number; right: number }>> = {
  bga: [
    { y: 291, right: 427 },
    { y: 272, right: 430 },
    { y: 258, right: 338 },
    { y: 247, right: 326 },
    { y: 237, right: 326 },
    { y: 229, right: 390 },
  ],
  qfn: [
    { y: 297, right: 430 },
    { y: 290, right: 430 },
    { y: 283, right: 325 },
    { y: 273, right: 320 },
    { y: 248, right: 361 },
    { y: 256, right: 434 },
  ],
};

function BgaStack({ explode }: { explode: number }) {
  const lift = (k: number) => layerLift("bga", k, explode);
  const balls = Array.from({ length: 15 }, (_, i) => 82 + i * 24);
  const bumps = Array.from({ length: 13 }, (_, i) => 176 + i * 12.33);
  return (
    <g>
      {/* 0: solder balls */}
      <g transform={`translate(0 ${lift(0)})`}>
        {balls.map((x) => (
          <circle key={x} cx={x} cy={291} r={9} fill={packageColors.balls} />
        ))}
      </g>
      {/* 1: substrate with internal copper and vias */}
      <g transform={`translate(0 ${lift(1)})`}>
        <rect x={70} y={262} width={360} height={20} rx={2} fill={packageColors.substrate} />
        {[267, 272, 277].map((y) => (
          <line key={y} x1={74} y1={y} x2={426} y2={y} stroke={vizColors.copper} strokeWidth={1} strokeDasharray="10 6" />
        ))}
        {[130, 200, 250, 300, 370].map((x) => (
          <line key={x} x1={x} y1={263} x2={x} y2={281} stroke={vizColors.copper} strokeWidth={2} />
        ))}
      </g>
      {/* 2: bumps and underfill */}
      <g transform={`translate(0 ${lift(2)})`}>
        <polygon points="162,262 174,255 326,255 338,262" fill={packageColors.underfill} opacity={0.45} />
        {bumps.map((x) => (
          <circle key={x} cx={x} cy={258.5} r={3.5} fill={packageColors.bump} />
        ))}
      </g>
      {/* 3: die, active side down */}
      <g transform={`translate(0 ${lift(3)})`}>
        <rect x={174} y={239} width={152} height={16} fill={packageColors.die} />
        <line x1={174} y1={254} x2={326} y2={254} stroke={vizColors.cyan} strokeWidth={2} />
      </g>
      {/* 4: TIM */}
      <g transform={`translate(0 ${lift(4)})`}>
        <rect x={174} y={235} width={152} height={4} fill={packageColors.tim} />
      </g>
      {/* 5: lid */}
      <g transform={`translate(0 ${lift(5)})`} fill={packageColors.lid}>
        <rect x={110} y={223} width={280} height={12} />
        <rect x={110} y={235} width={12} height={27} />
        <rect x={378} y={235} width={12} height={27} />
      </g>
    </g>
  );
}

function QfnStack({ explode }: { explode: number }) {
  const lift = (k: number) => layerLift("qfn", k, explode);
  return (
    <g>
      {/* 0: solder (window-pane print on the thermal pad) */}
      <g transform={`translate(0 ${lift(0)})`} fill={packageColors.solder}>
        <rect x={70} y={295} width={30} height={5} />
        <rect x={400} y={295} width={30} height={5} />
        <rect x={158} y={295} width={54} height={5} />
        <rect x={223} y={295} width={54} height={5} />
        <rect x={288} y={295} width={54} height={5} />
      </g>
      {/* 1: lead frame */}
      <g transform={`translate(0 ${lift(1)})`} fill={packageColors.leadframe}>
        <rect x={70} y={285} width={34} height={10} />
        <rect x={396} y={285} width={34} height={10} />
        <rect x={150} y={285} width={200} height={10} />
      </g>
      {/* 2: die attach */}
      <g transform={`translate(0 ${lift(2)})`}>
        <rect x={175} y={281} width={150} height={4} fill={packageColors.attach} />
      </g>
      {/* 3: die with edge bond pads */}
      <g transform={`translate(0 ${lift(3)})`}>
        <rect x={180} y={265} width={140} height={16} fill={packageColors.die} />
        <rect x={184} y={263} width={9} height={2} fill={vizColors.silk} />
        <rect x={307} y={263} width={9} height={2} fill={vizColors.silk} />
      </g>
      {/* 4: bond wires */}
      <g transform={`translate(0 ${lift(4)})`} fill="none" stroke={packageColors.wire} strokeWidth={1.6}>
        <path d="M188 264 Q140 222 88 285" />
        <path d="M194 264 Q150 230 98 285" />
        <path d="M312 264 Q360 222 412 285" />
        <path d="M306 264 Q350 230 402 285" />
      </g>
      {/* 5: mold compound */}
      <g transform={`translate(0 ${lift(5)})`}>
        <rect x={66} y={243} width={368} height={52} rx={3} fill={packageColors.mold} opacity={0.6} stroke="#6b7280" />
      </g>
    </g>
  );
}

/** 2-D exploded side view; also the fallback for PackageExploded when 3-D is unavailable or loading. */
export function PackageExplodedSvg({ kind = "bga", explode = 0.6 }: { kind?: PackageKind; explode?: number }) {
  const layers = packageLayers[kind];
  return (
    <SvgCanvas
      viewBox="0 0 640 330"
      title={kind === "bga" ? "Exploded side view of a flip-chip BGA package" : "Exploded side view of a wire-bonded QFN package"}
    >
      <rect x={0} y={0} width={640} height={330} fill={vizColors.bg} />
      <rect x={50} y={PCB_TOP} width={400} height={16} rx={2} fill={packageColors.pcb} />
      <Label x={58} y={PCB_TOP + 8} anchor="start" size={10} color={vizColors.silk}>
        PCB
      </Label>

      {kind === "bga" ? <BgaStack explode={explode} /> : <QfnStack explode={explode} />}

      {layers.map((layer, k) => {
        const a = anchors[kind][k];
        const y = a.y + layerLift(kind, k, explode);
        const slot = 296 - k * 44;
        return (
          <g key={layer.id}>
            <line x1={a.right + 4} y1={y} x2={452} y2={slot} stroke={vizColors.muted} strokeWidth={1} opacity={0.6} />
            <circle cx={a.right + 4} cy={y} r={2} fill={vizColors.muted} />
            <Label x={458} y={slot - 6} anchor="start" size={12} color={vizColors.text} bold>
              {layer.name}
            </Label>
            <Label x={458} y={slot + 9} anchor="start" size={10} color={vizColors.muted}>
              {layer.short}
            </Label>
          </g>
        );
      })}
    </SvgCanvas>
  );
}
