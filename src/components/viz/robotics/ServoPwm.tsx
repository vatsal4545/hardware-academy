"use client";

import { useState } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useAnimationFrame, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";

const FRAME_MS = 20;
/** SG90 at 4.8 V: 0.1 s per 60°. */
const SLEW_DEG_S = 600;

type Calibration = "nominal" | "sg90";
const CAL: Record<Calibration, { min: number; max: number; label: string }> = {
  nominal: { min: 1.0, max: 2.0, label: "Nominal 1.0–2.0 ms" },
  sg90: { min: 0.5, max: 2.5, label: "SG90-style 0.5–2.5 ms" },
};

/** Commanded angle (0-180°) for a pulse width, and whether the pulse is past the end stops. */
export function servoTarget(pulseMs: number, cal: Calibration): { angle: number; beyond: boolean } {
  const { min, max } = CAL[cal];
  const raw = ((pulseMs - min) / (max - min)) * 180;
  return { angle: Math.max(0, Math.min(180, raw)), beyond: pulseMs < min - 1e-9 || pulseMs > max + 1e-9 };
}

const SPLINE = { x: 150, y: 168 };
const HORN = 82;
const ARC_R = 104;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** Servo angle 0° points left, 90° up, 180° right. */
const dirOf = (servoDeg: number) => ({ x: -Math.cos(rad(servoDeg)), y: -Math.sin(rad(servoDeg)) });

const W1 = { x0: 330, x1: 700, hi: 50, lo: 92 };
const W2 = { x0: 330, x1: 700, hi: 168, lo: 214 };

export function ServoPwm() {
  const reduced = usePrefersReducedMotion();
  const [pulseMs, setPulseMs] = useState(1.5);
  const [cal, setCal] = useState<Calibration>("nominal");
  const [horn, setHorn] = useState(90);

  const target = servoTarget(pulseMs, cal);
  const moving = !reduced && Math.abs(horn - target.angle) > 0.05;
  useAnimationFrame((dt) => {
    setHorn((h) => {
      const step = SLEW_DEG_S * dt;
      const diff = target.angle - h;
      return Math.abs(diff) <= step ? target.angle : h + Math.sign(diff) * step;
    });
  }, moving);
  const shown = reduced ? target.angle : horn;

  const d = dirOf(shown);
  const tip = { x: SPLINE.x + HORN * d.x, y: SPLINE.y + HORN * d.y };
  const tgt = dirOf(target.angle);
  const duty = pulseMs / FRAME_MS;
  const ledc = Math.round(duty * 65536);

  // Two 20 ms frames, then a 3 ms zoom.
  const k1 = (W1.x1 - W1.x0) / (2 * FRAME_MS);
  const frames = [0, 1]
    .map((f) => {
      const x0 = W1.x0 + f * FRAME_MS * k1;
      const xe = x0 + pulseMs * k1;
      return `${x0.toFixed(1)},${W1.lo} ${x0.toFixed(1)},${W1.hi} ${xe.toFixed(1)},${W1.hi} ${xe.toFixed(1)},${W1.lo}`;
    })
    .join(" ");
  const k2 = (W2.x1 - W2.x0) / 3;
  const zoomEnd = W2.x0 + pulseMs * k2;
  const { min, max } = CAL[cal];

  return (
    <VizFrame
      title="Servo PWM: the pulse width is the position"
      description="A hobby servo reads one pulse every 20 ms (50 Hz). Its internal controller turns the horn until its potentiometer matches the pulse width, at about 60° per 0.1 s."
      controls={
        <>
          <Slider
            label="Pulse width"
            value={pulseMs}
            min={0.5}
            max={2.5}
            step={0.01}
            onChange={setPulseMs}
            format={(v) => `${v.toFixed(2)} ms`}
          />
          <Segmented
            label="Servo calibration"
            options={[
              { value: "nominal", label: CAL.nominal.label },
              { value: "sg90", label: CAL.sg90.label },
            ]}
            value={cal}
            onChange={setCal}
          />
        </>
      }
      footer={
        <div className="space-y-2">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide">Commanded angle</dt>
              <dd className="font-mono text-text">{target.angle.toFixed(0)}°</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Duty cycle</dt>
              <dd className="font-mono text-text">{(duty * 100).toFixed(2)}% of 20 ms</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">ESP32 LEDC, 16-bit at 50 Hz</dt>
              <dd className="font-mono text-text">duty = {ledc}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide">Arduino Servo library</dt>
              <dd className="font-mono text-text">writeMicroseconds({Math.round(pulseMs * 1000)})</dd>
            </div>
          </dl>
          {target.beyond && (
            <p role="alert" className="text-orange-300">
              ⚠ {pulseMs.toFixed(2)} ms is outside this servo&apos;s {min.toFixed(1)}–{max.toFixed(1)} ms range. It drives into
              its end stop, buzzes, and draws stall current (about 0.7 A for an SG90) until the pulse changes.
            </p>
          )}
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 720 260" title="Top view of a hobby servo whose horn angle follows the pulse width, with the 50 Hz pulse train">
        {/* servo body */}
        <rect x={40} y={176} width={260} height={66} rx={8} fill={vizColors.blue} opacity={0.45} />
        <rect x={16} y={192} width={24} height={34} rx={4} fill={vizColors.blue} opacity={0.35} />
        <rect x={300} y={192} width={24} height={34} rx={4} fill={vizColors.blue} opacity={0.35} />
        <circle cx={28} cy={209} r={5} fill={vizColors.bg} />
        <circle cx={312} cy={209} r={5} fill={vizColors.bg} />
        <Label x={220} y={214} size={11} color={vizColors.text}>
          SG90
        </Label>

        {/* angle scale */}
        <path
          d={`M${SPLINE.x - ARC_R} ${SPLINE.y} A${ARC_R} ${ARC_R} 0 0 1 ${SPLINE.x + ARC_R} ${SPLINE.y}`}
          fill="none"
          stroke={vizColors.grid}
          strokeWidth={2}
        />
        {[0, 45, 90, 135, 180].map((a) => {
          const p = dirOf(a);
          return (
            <g key={a}>
              <line
                x1={SPLINE.x + (ARC_R - 6) * p.x}
                y1={SPLINE.y + (ARC_R - 6) * p.y}
                x2={SPLINE.x + (ARC_R + 6) * p.x}
                y2={SPLINE.y + (ARC_R + 6) * p.y}
                stroke={vizColors.muted}
                strokeWidth={1.5}
              />
              <Label x={SPLINE.x + (ARC_R + 20) * p.x} y={SPLINE.y + (ARC_R + 16) * p.y} size={10.5} color={vizColors.muted}>
                {`${a}°`}
              </Label>
            </g>
          );
        })}
        <polygon
          points={`${SPLINE.x + (ARC_R - 10) * tgt.x},${SPLINE.y + (ARC_R - 10) * tgt.y} ${SPLINE.x + (ARC_R + 2) * tgt.x + 5 * tgt.y},${
            SPLINE.y + (ARC_R + 2) * tgt.y - 5 * tgt.x
          } ${SPLINE.x + (ARC_R + 2) * tgt.x - 5 * tgt.y},${SPLINE.y + (ARC_R + 2) * tgt.y + 5 * tgt.x}`}
          fill={target.beyond ? vizColors.orange : vizColors.amber}
        />

        {/* horn */}
        <line x1={SPLINE.x} y1={SPLINE.y} x2={tip.x} y2={tip.y} stroke={vizColors.silk} strokeWidth={16} strokeLinecap="round" />
        {[0.45, 0.65, 0.85].map((f) => (
          <circle key={f} cx={SPLINE.x + HORN * f * d.x} cy={SPLINE.y + HORN * f * d.y} r={2.2} fill={vizColors.bg} />
        ))}
        <circle cx={SPLINE.x} cy={SPLINE.y} r={12} fill={vizColors.silk} stroke={vizColors.muted} strokeWidth={2} />
        <circle cx={SPLINE.x} cy={SPLINE.y} r={4} fill={vizColors.muted} />

        {/* 50 Hz frames */}
        <Label x={W1.x0} y={30} size={11} anchor="start" color={vizColors.muted}>
          signal wire, two 20 ms frames (50 Hz)
        </Label>
        <line x1={W1.x0} y1={W1.lo} x2={W1.x1} y2={W1.lo} stroke={vizColors.grid} strokeWidth={2} />
        <polyline points={frames} fill="none" stroke={vizColors.amber} strokeWidth={2} />
        {[0, 10, 20, 30, 40].map((ms) => (
          <Label key={ms} x={W1.x0 + ms * k1} y={106} size={9.5} color={vizColors.muted}>
            {ms === 40 ? "40 ms" : String(ms)}
          </Label>
        ))}

        {/* zoom on the pulse */}
        <Label x={W2.x0} y={140} size={11} anchor="start" color={vizColors.muted}>
          zoom: the first 3 ms of a frame
        </Label>
        <rect
          x={W2.x0 + min * k2}
          y={W2.hi - 8}
          width={(max - min) * k2}
          height={W2.lo - W2.hi + 16}
          fill={vizColors.green}
          opacity={0.08}
        />
        {[min, (min + max) / 2, max].map((ms, i) => (
          <g key={ms}>
            <line x1={W2.x0 + ms * k2} x2={W2.x0 + ms * k2} y1={W2.hi - 8} y2={W2.lo + 8} stroke={vizColors.muted} strokeDasharray="3 4" />
            <Label x={W2.x0 + ms * k2} y={W2.lo + 20} size={9.5} color={vizColors.muted}>
              {`${ms.toFixed(1)} ms`}
            </Label>
            <Label x={W2.x0 + ms * k2} y={W2.lo + 33} size={9.5} color={vizColors.muted}>
              {`${[0, 90, 180][i]}°`}
            </Label>
          </g>
        ))}
        <polyline
          points={`${W2.x0},${W2.lo} ${W2.x0},${W2.hi} ${zoomEnd.toFixed(1)},${W2.hi} ${zoomEnd.toFixed(1)},${W2.lo} ${W2.x1},${W2.lo}`}
          fill="none"
          stroke={vizColors.amber}
          strokeWidth={2.5}
        />
        <Label x={Math.min(zoomEnd + 6, 690)} y={W2.hi + 2} size={11} anchor={zoomEnd > 640 ? "end" : "start"} color={vizColors.text} bold>
          {`${pulseMs.toFixed(2)} ms`}
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
