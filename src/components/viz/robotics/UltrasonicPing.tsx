"use client";

import { useId, useState } from "react";
import { PlayPause, Slider, VizFrame } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, useViz, vizColors } from "@/components/viz/shared";

/** Speed of sound the firmware assumes (20 °C). */
const C_FIRMWARE = 343;
/** Half-angle of the transducer's beam and acceptance cone. */
const HALF_CONE_DEG = 15;
const MIN_CM = 2;
const MAX_CM = 400;

const SX = 64;
const SY = 120;
const PX_PER_CM = 1.5;
const WALL_HALF = 100;
/** On-screen speed of the wavefront, px per second (sound slowed down about 170 times). */
const WAVE_PX_S = 300;
const HOLD_S = 0.9;

const rad = (deg: number) => (deg * Math.PI) / 180;

export function speedOfSound(tempC: number): number {
  return 331.3 + 0.606 * tempC;
}

export interface PingResult {
  received: boolean;
  /** perpendicular distance from the sensor to the wall's plane */
  perpCm: number;
  echoUs: number | null;
  /** what firmware computes with 343 m/s */
  firmwareCm: number | null;
}

/** A smooth wall at `distanceCm` along the beam axis, tilted `wallDeg` from square-on. The echo
 *  returns only if the wall's normal lies inside the ~15° cone; it then comes from the nearest
 *  point, the foot of the perpendicular, so the round trip is 2 · d · cos(tilt). */
export function pingResult(distanceCm: number, wallDeg: number, tempC: number): PingResult {
  const perpCm = distanceCm * Math.cos(rad(wallDeg));
  const received = wallDeg <= HALF_CONE_DEG && perpCm >= MIN_CM && perpCm <= MAX_CM;
  if (!received) return { received, perpCm, echoUs: null, firmwareCm: null };
  const echoUs = ((2 * perpCm) / 100 / speedOfSound(tempC)) * 1e6;
  return { received, perpCm, echoUs, firmwareCm: ((echoUs / 1e6) * C_FIRMWARE * 100) / 2 };
}

function arcPath(cx: number, cy: number, r: number, centerDeg: number, halfDeg: number): string {
  const a1 = rad(centerDeg - halfDeg);
  const a2 = rad(centerDeg + halfDeg);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function wedgePath(cx: number, cy: number, len: number, centerDeg: number, halfDeg: number): string {
  const a1 = rad(centerDeg - halfDeg);
  const a2 = rad(centerDeg + halfDeg);
  return `M${cx} ${cy} L${(cx + len * Math.cos(a1)).toFixed(1)} ${(cy + len * Math.sin(a1)).toFixed(1)} L${(
    cx +
    len * Math.cos(a2)
  ).toFixed(1)} ${(cy + len * Math.sin(a2)).toFixed(1)} Z`;
}

const STRIP_X0 = 104;
const STRIP_X1 = 690;

export function UltrasonicPing() {
  const clock = useViz(true);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const clipId = `ping-clip-${uid}`;
  const sceneId = `ping-scene-${uid}`;
  const [distanceCm, setDistanceCm] = useState(120);
  const [wallDeg, setWallDeg] = useState(0);
  const [tempC, setTempC] = useState(20);

  const res = pingResult(distanceCm, wallDeg, tempC);
  const c = speedOfSound(tempC);

  // Geometry: wall through P with outward normal n (pointing away from the sensor).
  const th = rad(wallDeg);
  const P = { x: SX + distanceCm * PX_PER_CM, y: SY };
  const n = { x: Math.cos(th), y: Math.sin(th) };
  const u = { x: -Math.sin(th), y: Math.cos(th) };
  const perpPx = res.perpCm * PX_PER_CM;
  // Mirror image of the sensor across the wall, and the reflected beam axis.
  const S2 = { x: SX + 2 * perpPx * n.x, y: SY + 2 * perpPx * n.y };
  const reflectedDeg = 180 + 2 * wallDeg;

  // Half-plane on the sensor's side of the wall, used to clip waves and cones.
  const far = 2000;
  const clipPoly = [
    [P.x + far * u.x, P.y + far * u.y],
    [P.x - far * u.x, P.y - far * u.y],
    [P.x - far * u.x - far * n.x, P.y - far * u.y - far * n.y],
    [P.x + far * u.x - far * n.x, P.y + far * u.y - far * n.y],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  // One ping cycle on screen: emit, travel, (maybe) return, hold.
  const returnS = (2 * perpPx) / WAVE_PX_S;
  const lostEndS = Math.min(5, (2 * perpPx + 280) / WAVE_PX_S);
  const activeS = res.received ? returnS : lostEndS;
  const cycleS = activeS + HOLD_S;
  const tau = clock.t % cycleS;
  const r = WAVE_PX_S * Math.min(tau, activeS + 0.05);
  const waveVisible = tau <= activeS;
  const heard = res.received && tau >= returnS;

  const radii = [0, 9, 18].map((k) => r - k).filter((x) => x > 0);
  const stripX = (s: number) => STRIP_X0 + (Math.min(s, activeS) / activeS) * (STRIP_X1 - STRIP_X0);
  const echoRiseX = STRIP_X0 + 14;
  const echoFallX = res.received ? STRIP_X1 : null;
  const cursorX = stripX(tau);

  const wallA = { x: P.x + WALL_HALF * u.x, y: P.y + WALL_HALF * u.y };
  const wallB = { x: P.x - WALL_HALF * u.x, y: P.y - WALL_HALF * u.y };
  const wallTop = wallA.y < wallB.y ? wallA : wallB;
  const errCm = res.received && res.firmwareCm !== null ? res.firmwareCm - res.perpCm : 0;

  return (
    <VizFrame
      title="Ultrasonic ping: time of flight and the lost echo"
      description="An HC-SR04 sends eight 40 kHz cycles and times the echo. Sound is slowed about 170× here. Tilt the wall past about 15° and the echo misses the receiver."
      controls={
        <>
          <PlayPause playing={clock.playing} onToggle={clock.toggle} onReset={clock.reset} />
          <Slider label="Distance to wall (along the beam)" value={distanceCm} min={2} max={400} step={1} unit="cm" onChange={setDistanceCm} />
          <Slider label="Wall angle from square-on" value={wallDeg} min={0} max={60} step={1} unit="°" onChange={setWallDeg} />
          <Slider label="Air temperature" value={tempC} min={-10} max={40} step={1} unit="°C" onChange={setTempC} />
        </>
      }
      footer={
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide">Echo pulse</dt>
            <dd className="font-mono text-text">
              {res.received && res.echoUs !== null ? `${Math.round(res.echoUs)} µs` : "none: ~38 ms timeout"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Firmware reads (343 m/s)</dt>
            <dd className="font-mono text-text">
              {res.received && res.firmwareCm !== null ? `${res.firmwareCm.toFixed(1)} cm` : "0 cm (pulseIn timeout)"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">True distance to the wall</dt>
            <dd className="font-mono text-text">
              {res.perpCm.toFixed(1)} cm{wallDeg > 0 ? " (perpendicular)" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Speed of sound</dt>
            <dd className="font-mono text-text">
              {c.toFixed(1)} m/s{res.received ? `, error ${errCm >= 0 ? "+" : ""}${errCm.toFixed(1)} cm` : ""}
            </dd>
          </div>
        </dl>
      }
    >
      <SvgCanvas viewBox="0 0 720 320" title="Top view of an ultrasonic sensor pinging a wall, with trigger and echo timing below">
        <defs>
          <clipPath id={clipId}>
            <polygon points={clipPoly} />
          </clipPath>
          <clipPath id={sceneId}>
            <rect x={10} y={10} width={700} height={220} rx={8} />
          </clipPath>
        </defs>

        {/* scene frame */}
        <rect x={10} y={10} width={700} height={220} rx={8} fill={vizColors.grid} opacity={0.35} />

        {/* beam and the reflected cone, clipped to the scene and to the sensor's side of the wall */}
        <g clipPath={`url(#${sceneId})`}>
          <g clipPath={`url(#${clipId})`}>
            <path d={wedgePath(SX, SY, 900, 0, HALF_CONE_DEG)} fill={vizColors.cyan} opacity={0.08} />
            <path d={wedgePath(S2.x, S2.y, 1400, reflectedDeg, HALF_CONE_DEG)} fill={vizColors.amber} opacity={0.07} />
            {waveVisible &&
              radii.map((rr, i) => (
                <g key={i} opacity={1 - i * 0.28}>
                  <path d={arcPath(SX, SY, rr, 0, HALF_CONE_DEG)} fill="none" stroke={vizColors.cyan} strokeWidth={2} />
                  <path
                    d={arcPath(S2.x, S2.y, rr, reflectedDeg, HALF_CONE_DEG)}
                    fill="none"
                    stroke={vizColors.amber}
                    strokeWidth={2}
                  />
                </g>
              ))}
          </g>
        </g>

        {/* wall */}
        <line x1={wallA.x} y1={wallA.y} x2={wallB.x} y2={wallB.y} stroke={vizColors.text} strokeWidth={5} strokeLinecap="round" />
        <Label
          x={wallTop.x > 560 ? wallTop.x - 10 : wallTop.x + 10}
          y={Math.max(wallTop.y + 8, 24)}
          size={11}
          anchor={wallTop.x > 560 ? "end" : "start"}
          color={vizColors.muted}
        >
          {wallDeg === 0 ? "smooth wall" : `wall ${wallDeg}° off square`}
        </Label>
        {!res.received && wallDeg > HALF_CONE_DEG && (
          <g>
            <Arrow
              x1={P.x}
              y1={P.y}
              x2={P.x + 80 * Math.cos(rad(reflectedDeg))}
              y2={P.y + 80 * Math.sin(rad(reflectedDeg))}
              color={vizColors.amber}
              width={2}
              dashed
            />
            <Label
              x={P.x + 80 * Math.cos(rad(reflectedDeg)) + 8}
              y={P.y + 80 * Math.sin(rad(reflectedDeg))}
              size={10.5}
              anchor="start"
              color={vizColors.text}
            >
              {`echo leaves ${2 * wallDeg}° off the axis`}
            </Label>
          </g>
        )}

        {/* the HC-SR04 */}
        <rect x={30} y={88} width={22} height={64} rx={3} fill={vizColors.blue} opacity={0.6} />
        <circle cx={SX} cy={SY - 15} r={11} fill={vizColors.bg} stroke={vizColors.silk} strokeWidth={2} />
        <circle cx={SX} cy={SY + 15} r={11} fill={heard ? vizColors.amber : vizColors.bg} stroke={vizColors.silk} strokeWidth={2} />
        <Label x={SX} y={SY - 15} size={10} bold>
          T
        </Label>
        <Label x={SX} y={SY + 15} size={10} bold color={heard ? vizColors.bg : vizColors.text}>
          R
        </Label>
        <Label x={20} y={170} size={10} anchor="start" color={vizColors.muted}>
          HC-SR04
        </Label>

        {/* status */}
        <Label x={24} y={26} size={12} anchor="start" bold color={res.received ? vizColors.text : vizColors.red}>
          {res.received ? (heard ? "✓ echo heard" : "listening…") : "✕ no echo: the module times out"}
        </Label>

        {/* timing strip */}
        <Label x={20} y={254} size={11} anchor="start" color={vizColors.muted} mono>
          TRIG
        </Label>
        <Label x={20} y={298} size={11} anchor="start" color={vizColors.muted} mono>
          ECHO
        </Label>
        <polyline
          points={`${STRIP_X0},262 ${STRIP_X0 + 4},262 ${STRIP_X0 + 4},246 ${STRIP_X0 + 10},246 ${STRIP_X0 + 10},262 ${STRIP_X1},262`}
          fill="none"
          stroke={vizColors.cyan}
          strokeWidth={2}
        />
        <polyline
          points={
            echoFallX !== null
              ? `${STRIP_X0},308 ${echoRiseX},308 ${echoRiseX},290 ${echoFallX},290 ${echoFallX},308`
              : `${STRIP_X0},308 ${echoRiseX},308 ${echoRiseX},290 ${STRIP_X1},290`
          }
          fill="none"
          stroke={vizColors.amber}
          strokeWidth={2}
        />
        <line x1={cursorX} x2={cursorX} y1={240} y2={314} stroke={vizColors.text} strokeWidth={1} opacity={0.6} />
        <Label x={(echoRiseX + STRIP_X1) / 2} y={276} size={10.5} color={vizColors.muted}>
          {res.received && res.echoUs !== null
            ? `echo high for ${Math.round(res.echoUs)} µs → d = t × 343 / 2 = ${(res.firmwareCm ?? 0).toFixed(1)} cm`
            : "echo pin stays high until the ~38 ms timeout → pulseIn() returns 0"}
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
