"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";

/* Plan view of one trace over a ground plane. 10 px = 1 mm. */
const PLANE = { x: 30, y: 30, w: 580, h: 240 };
const TRACE_Y = 150;
const DRIVER_X = 90;
const RECEIVER_X = 570;
const TRACE_LEN_MM = (RECEIVER_X - DRIVER_X) / 10;
const SLIT_L = 326;
const SLIT_R = 334;
const SLIT_W_MM = (SLIT_R - SLIT_L) / 10;
const CAP_OFFSET_MM = 2;
const CAP_Y = TRACE_Y - CAP_OFFSET_MM * 10;
const MARGIN = 6;

type Point = [number, number];
type Speed = "fast" | "slow";
type Height = "0.1" | "0.2" | "1.6";

interface Geometry {
  halfPx: number;
  capOn: boolean;
}

/** One return-current streamline, receiver -> driver, detouring round the nearest slit end (or through the capacitor). */
function streamline(y: number, g: Geometry | null): Point[] {
  if (!g || Math.abs(y - TRACE_Y) > g.halfPx) {
    return [
      [RECEIVER_X, y],
      [DRIVER_X, y],
    ];
  }
  const candidates = [TRACE_Y - g.halfPx - MARGIN, TRACE_Y + g.halfPx + MARGIN];
  if (g.capOn) candidates.push(CAP_Y);
  let best = candidates[0];
  for (const c of candidates) if (Math.abs(c - y) < Math.abs(best - y)) best = c;
  const d = Math.abs(best - y);
  return [
    [RECEIVER_X, y],
    [SLIT_R + d, y],
    [SLIT_R, best],
    [SLIT_L, best],
    [SLIT_L - d, y],
    [DRIVER_X, y],
  ];
}

function toPoints(pts: Point[]): string {
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

export function ReturnPathDemo() {
  const [slit, setSlit] = useState(true);
  const [slitMm, setSlitMm] = useState(12);
  const [cap, setCap] = useState(false);
  const [speed, setSpeed] = useState<Speed>("fast");
  const [heightSel, setHeightSel] = useState<Height>("0.2");
  const viz = useViz(true);

  const h = Number(heightSel);
  const half = slitMm / 2;
  const fast = speed === "fast";
  const capActive = slit && cap && fast;
  const geom: Geometry | null = slit ? { halfPx: half * 10, capOn: capActive } : null;

  // Loop-area estimate: strip under the trace plus the detour (45 degree ramps and the gap crossing).
  const detourMm = capActive ? Math.min(half, CAP_OFFSET_MM) : half;
  const baseArea = TRACE_LEN_MM * h;
  const extraArea = slit && fast ? detourMm * detourMm + SLIT_W_MM * detourMm : 0;
  const area = baseArea + extraArea;
  const ratio = area / baseArea;
  const dB = 20 * Math.log10(ratio);

  // Streamlines: tight bundle (about +/-3 h holds 80 % of the current) when fast, whole plane when slow.
  const band = Math.max(3 * h * 10, 3);
  const fastOffsets = [-1, -0.5, 0, 0.5, 1].map((k) => k * band);
  const slowOffsets = [-96, -72, -48, -24, 0, 24, 48, 72, 96];
  const offsets = fast ? fastOffsets : slowOffsets;
  const lines = offsets.map((o) => streamline(TRACE_Y + o, geom));

  // Shaded loop: signal line plus the centre streamline (drawn just above the trace so the shapes do not cross).
  const loopY = TRACE_Y - Math.max(h * 10, 3);
  const loop: Point[] = [[DRIVER_X, TRACE_Y], [RECEIVER_X, TRACE_Y], ...streamline(loopY, geom)];

  const flow = viz.t * (fast ? 46 : 14);

  let path: string;
  if (!slit) path = fast ? `directly under the trace, about ${(6 * h).toFixed(1)} mm wide` : "spread across the whole plane";
  else if (!fast) path = "spreads out and goes around both ends of the slit";
  else if (capActive) path = `hops across the slit through the capacitor, ${CAP_OFFSET_MM} mm from the trace`;
  else path = `detours ${half.toFixed(0)} mm out and back round the end of the slit`;

  return (
    <VizFrame
      title="Return current over a plane, with and without a slit"
      description="The signal runs left to right on the top layer. Its return current has to find its way back through the plane. Cut a slit across the trace and watch the loop area and the radiated emission grow."
      controls={
        <>
          <Toggle label="Cut a slit in the plane" checked={slit} onChange={setSlit} />
          {slit && (
            <Slider
              label="Slit length, centred on the trace"
              value={slitMm}
              min={4}
              max={20}
              step={1}
              unit="mm"
              onChange={setSlitMm}
            />
          )}
          {slit && <Toggle label="Add a 100 nF stitching capacitor across it" checked={cap} onChange={setCap} />}
          <Segmented<Speed>
            label="Signal edge"
            options={[
              { value: "fast", label: "Fast (above about 100 kHz)" },
              { value: "slow", label: "Slow (about DC)" },
            ]}
            value={speed}
            onChange={setSpeed}
          />
          <Segmented<Height>
            label="Plane distance below the trace"
            options={[
              { value: "0.1", label: "0.1 mm" },
              { value: "0.2", label: "0.2 mm" },
              { value: "1.6", label: "1.6 mm (2-layer)" },
            ]}
            value={heightSel}
            onChange={setHeightSel}
          />
          <PlayPause playing={viz.playing} onToggle={viz.toggle} onReset={viz.reset} />
        </>
      }
      footer={
        <div className="space-y-3">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <dt className="font-mono text-xs uppercase tracking-wide text-amber-300">Loop area</dt>
              <dd className="mt-1 text-lg text-text" data-testid="loop-area">
                {fast ? `${area.toFixed(1)} mm²` : "not a loop"}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <dt className="font-mono text-xs uppercase tracking-wide text-amber-300">Emission vs. no slit</dt>
              <dd className="mt-1 text-lg text-text" data-testid="loop-ratio">
                {fast ? `×${ratio.toFixed(1)} (${dB >= 0 ? "+" : ""}${dB.toFixed(1)} dB)` : "n/a at low frequency"}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-bg/60 p-3">
              <dt className="font-mono text-xs uppercase tracking-wide text-amber-300">Return current</dt>
              <dd className="mt-1 text-text" data-testid="return-path">
                {path}
              </dd>
            </div>
          </dl>
          <p>
            Radiated field from a small loop scales with its area, so ×{ratio.toFixed(1)} area is ×{ratio.toFixed(1)} field strength. A
            capacitor passes the fast return current but blocks DC, so it fixes the fast case only.
          </p>
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 640 300" title="Plan view of a signal trace over a ground plane showing the return current path and loop area">
        <rect x="0" y="0" width="640" height="300" rx="8" fill={vizColors.bg} />

        {/* ground plane */}
        <rect x={PLANE.x} y={PLANE.y} width={PLANE.w} height={PLANE.h} fill={vizColors.copper} opacity={0.16} stroke={vizColors.copper} strokeOpacity={0.5} />
        <Label x={PLANE.x + 8} y={PLANE.y + PLANE.h - 12} anchor="start" size={12} color={vizColors.copper}>
          {`L2 ground plane, ${heightSel} mm below the trace`}
        </Label>

        {/* slit */}
        {slit && (
          <g>
            <rect
              x={SLIT_L}
              y={TRACE_Y - half * 10}
              width={SLIT_R - SLIT_L}
              height={half * 20}
              fill={vizColors.bg}
              stroke={vizColors.red}
              strokeDasharray="3 2"
            />
            <Label x={SLIT_R + 8} y={TRACE_Y - half * 10 - 9} anchor="start" size={12} color={vizColors.red}>
              slit
            </Label>
          </g>
        )}

        {/* shaded loop area */}
        {fast && <polygon points={toPoints(loop)} fill={vizColors.amber} opacity={0.3} />}

        {/* return current */}
        {lines.map((pts, k) => (
          <polyline
            key={`r${k}`}
            points={toPoints(pts)}
            fill="none"
            stroke={vizColors.amber}
            strokeWidth={fast ? 2.2 : 1.4}
            strokeOpacity={fast ? 0.95 : 0.65}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={fast ? "1 10" : "1 12"}
            strokeDashoffset={-flow}
          />
        ))}

        {/* stitching capacitor */}
        {capActive && (
          <g>
            <rect x={SLIT_L - 10} y={CAP_Y - 5} width={10} height={10} fill={vizColors.copper} />
            <rect x={SLIT_R} y={CAP_Y - 5} width={10} height={10} fill={vizColors.copper} />
            <rect x={SLIT_L - 4} y={CAP_Y - 4} width={SLIT_R - SLIT_L + 8} height={8} fill="#2b2f3a" stroke={vizColors.silk} strokeWidth={1} />
            <Label x={SLIT_L - 16} y={CAP_Y - 14} anchor="end" size={12} color={vizColors.silk}>
              100 nF
            </Label>
          </g>
        )}

        {/* signal trace and chips */}
        <line x1={DRIVER_X} y1={TRACE_Y} x2={RECEIVER_X} y2={TRACE_Y} stroke={vizColors.cyan} strokeWidth={3} />
        <line
          x1={DRIVER_X}
          y1={TRACE_Y}
          x2={RECEIVER_X}
          y2={TRACE_Y}
          stroke={vizColors.silk}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray="1 14"
          strokeDashoffset={-flow}
        />
        <rect x={50} y={TRACE_Y - 18} width={40} height={36} rx={4} fill="#1a2235" stroke={vizColors.muted} />
        <Label x={70} y={TRACE_Y} size={11} color={vizColors.text}>
          driver
        </Label>
        <rect x={RECEIVER_X} y={TRACE_Y - 18} width={44} height={36} rx={4} fill="#1a2235" stroke={vizColors.muted} />
        <Label x={RECEIVER_X + 22} y={TRACE_Y} size={11} color={vizColors.text}>
          receiver
        </Label>
        <Label x={DRIVER_X + 90} y={TRACE_Y + 18} anchor="start" size={12} color={vizColors.cyan}>
          signal →
        </Label>
        <Label x={RECEIVER_X - 90} y={TRACE_Y + 34} anchor="end" size={12} color={vizColors.amber}>
          ← return current
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
