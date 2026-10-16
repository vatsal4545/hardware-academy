"use client";

import { useState, type KeyboardEvent } from "react";
import { PlayPause, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useAnimationFrame, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";

const VM = 7.4;

export type BridgeMode = "forward" | "reverse" | "brake-low" | "brake-high" | "coast" | "shoot-through";

/** Switch order: Q1 high-left, Q2 low-left, Q3 high-right, Q4 low-right. */
export type Switches = [boolean, boolean, boolean, boolean];

export function bridgeMode([q1, q2, q3, q4]: Switches): BridgeMode {
  if ((q1 && q2) || (q3 && q4)) return "shoot-through";
  if (q1 && q4) return "forward";
  if (q3 && q2) return "reverse";
  if (q2 && q4) return "brake-low";
  if (q1 && q3) return "brake-high";
  return "coast";
}

const MODE_TEXT: Record<BridgeMode, string> = {
  forward: "Forward: Q1 + Q4, current flows left to right through the motor",
  reverse: "Reverse: Q3 + Q2, current flows right to left",
  "brake-low": "Brake: both low sides on, back-EMF current stops the motor fast",
  "brake-high": "Brake: both high sides on, same effect through the supply rail",
  coast: "Coast: no path for drive current, the motor spins down on friction",
  "shoot-through": "SHOOT-THROUGH",
};

const PRESETS: Array<{ label: string; q: Switches }> = [
  { label: "Forward", q: [true, false, false, true] },
  { label: "Reverse", q: [false, true, true, false] },
  { label: "Brake", q: [false, true, false, true] },
  { label: "Coast", q: [false, false, false, false] },
];

const LEG_L = 200;
const LEG_R = 440;
const VM_Y = 40;
const GND_Y = 290;
const NODE_Y = 165;
const MOTOR = { x: 320, y: NODE_Y, r: 34 };
const SW = [
  { name: "Q1", side: "high-side left", x: LEG_L, y: 100 },
  { name: "Q2", side: "low-side left", x: LEG_L, y: 230 },
  { name: "Q3", side: "high-side right", x: LEG_R, y: 100 },
  { name: "Q4", side: "low-side right", x: LEG_R, y: 230 },
] as const;

interface MotorSim {
  t: number;
  omega: number;
  angle: number;
}

function SwitchSymbol({
  i,
  on,
  danger,
  onToggle,
}: {
  i: number;
  on: boolean;
  danger: boolean;
  onToggle: () => void;
}) {
  const s = SW[i];
  const color = danger ? vizColors.red : on ? vizColors.green : vizColors.muted;
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };
  const left = s.x === LEG_L;
  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={on}
      aria-label={`${s.name}, ${s.side} switch: ${on ? "on" : "off"}`}
      onClick={onToggle}
      onKeyDown={onKey}
      style={{ cursor: "pointer" }}
    >
      <rect
        x={s.x - 24}
        y={s.y - 30}
        width={48}
        height={60}
        rx={7}
        fill={danger ? vizColors.red : on ? vizColors.green : vizColors.bg}
        fillOpacity={danger ? 0.25 : on ? 0.15 : 1}
        stroke={color}
        strokeWidth={2}
      />
      <circle cx={s.x} cy={s.y - 17} r={3.5} fill={color} />
      <circle cx={s.x} cy={s.y + 17} r={3.5} fill={color} />
      {on ? (
        <line x1={s.x} y1={s.y - 17} x2={s.x} y2={s.y + 17} stroke={color} strokeWidth={3} strokeLinecap="round" />
      ) : (
        <line x1={s.x} y1={s.y + 17} x2={s.x + 15} y2={s.y - 11} stroke={color} strokeWidth={3} strokeLinecap="round" />
      )}
      <Label x={left ? s.x - 34 : s.x + 34} y={s.y - 8} size={13} bold anchor={left ? "end" : "start"}>
        {s.name}
      </Label>
      <Label x={left ? s.x - 34 : s.x + 34} y={s.y + 10} size={10} anchor={left ? "end" : "start"} color={vizColors.muted}>
        {on ? "on" : "off"}
      </Label>
    </g>
  );
}

const btn =
  "rounded-md border border-border bg-surface px-3 py-1 text-sm text-text transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

export function HBridge() {
  const reduced = usePrefersReducedMotion();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduced;
  const [q, setQ] = useState<Switches>([true, false, false, true]);
  const [duty, setDuty] = useState(60);
  const [sim, setSim] = useState<MotorSim>({ t: 0, omega: 0, angle: 0 });

  const mode = bridgeMode(q);
  const drive = mode === "forward" ? duty / 100 : mode === "reverse" ? -duty / 100 : 0;
  const tau = mode === "forward" || mode === "reverse" ? 0.35 : mode === "brake-low" || mode === "brake-high" ? 0.1 : 1.6;

  useAnimationFrame((dt) => {
    setSim((s) => {
      const omega = s.omega + ((drive - s.omega) * dt) / tau;
      return { t: s.t + dt, omega: Math.abs(omega) < 1e-4 ? 0 : omega, angle: (s.angle + omega * 420 * dt) % 360 };
    });
  }, playing);

  const toggle = (i: number) => setQ((prev) => prev.map((v, k) => (k === i ? !v : v)) as Switches);

  const shootLeft = q[0] && q[1];
  const shootRight = q[2] && q[3];
  const spinning = Math.abs(sim.omega) > 0.02;
  const flow = sim.t * 46;

  // Current paths, written in the direction conventional current flows.
  let paths: string[] = [];
  let flowSpeed = 0;
  if (mode === "forward") {
    paths = [`${LEG_L},${VM_Y} ${LEG_L},${NODE_Y} ${MOTOR.x - MOTOR.r},${NODE_Y}`, `${MOTOR.x + MOTOR.r},${NODE_Y} ${LEG_R},${NODE_Y} ${LEG_R},${GND_Y}`];
    flowSpeed = duty / 100;
  } else if (mode === "reverse") {
    paths = [`${LEG_R},${VM_Y} ${LEG_R},${NODE_Y} ${MOTOR.x + MOTOR.r},${NODE_Y}`, `${MOTOR.x - MOTOR.r},${NODE_Y} ${LEG_L},${NODE_Y} ${LEG_L},${GND_Y}`];
    flowSpeed = duty / 100;
  } else if ((mode === "brake-low" || mode === "brake-high") && spinning) {
    const rail = mode === "brake-low" ? GND_Y : VM_Y;
    const loop = `${MOTOR.x - MOTOR.r},${NODE_Y} ${LEG_L},${NODE_Y} ${LEG_L},${rail} ${LEG_R},${rail} ${LEG_R},${NODE_Y} ${MOTOR.x + MOTOR.r},${NODE_Y}`;
    paths = [loop];
    flowSpeed = sim.omega;
  }
  const dashOffset = (-flow * Math.sign(flowSpeed || 1) * Math.min(1, Math.abs(flowSpeed) + 0.25)) % 18;
  const flash = Math.floor(sim.t * 4) % 2 === 0;

  const avgV = mode === "forward" || mode === "reverse" ? (duty / 100) * VM : 0;
  const tableRow =
    mode === "forward" ? 0 : mode === "reverse" ? 1 : mode === "brake-low" ? 2 : mode === "coast" ? 3 : -1;
  const TABLE = [
    ["H", "L", "H", "forward"],
    ["L", "H", "H", "reverse"],
    ["H", "H", "x", "short brake"],
    ["L", "L", "H", "stop (coast)"],
    ["x", "x", "L", "short brake"],
  ];

  return (
    <VizFrame
      title="H-bridge: drive, brake, coast and the short you must never make"
      description="Click the four switches or use the presets. The PWM duty sets the average voltage in drive; the motor's speed responds with its own time constant."
      controls={
        <>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" className={btn} onClick={() => setQ(p.q)}>
                {p.label}
              </button>
            ))}
          </div>
          <Slider label="PWM duty (drive modes)" value={duty} min={0} max={100} step={5} unit="%" onChange={setDuty} />
          <PlayPause
            playing={playing}
            onToggle={() => setUserPlaying(!playing)}
            onReset={() => {
              setQ([false, false, false, false]);
              setSim({ t: 0, omega: 0, angle: 0 });
            }}
          />
        </>
      }
      footer={
        <div className="space-y-2">
          {mode === "shoot-through" ? (
            <p role="alert" className="font-semibold text-red-400">
              ⚠ Shoot-through: {shootLeft && shootRight ? "Q1 + Q2 and Q3 + Q4 short" : shootLeft ? "Q1 + Q2 short" : "Q3 + Q4 short"} the 7.4 V pack
              straight to ground through two on-resistances. A real bridge destroys its MOSFETs in microseconds; drivers
              add interlocks and dead time so this state can never happen.
            </p>
          ) : (
            <p>
              <span className="font-semibold text-text">{MODE_TEXT[mode]}.</span>{" "}
              {mode === "forward" || mode === "reverse"
                ? `Average motor voltage ${avgV.toFixed(1)} V (${duty}% of ${VM} V).`
                : "Average drive voltage 0 V."}{" "}
              Speed {Math.round(Math.abs(sim.omega) * 100)}% of full.
            </p>
          )}
        </div>
      }
    >
      <SvgCanvas viewBox="0 0 720 330" title="H-bridge with four switches, a DC motor, current paths and the TB6612FNG truth table">
        {/* rails */}
        <line x1={150} y1={VM_Y} x2={490} y2={VM_Y} stroke={vizColors.orange} strokeWidth={4} strokeLinecap="round" />
        <line x1={150} y1={GND_Y} x2={490} y2={GND_Y} stroke={vizColors.muted} strokeWidth={4} strokeLinecap="round" />
        <Label x={140} y={VM_Y} size={12} anchor="end" bold color={vizColors.orange}>
          VM 7.4 V
        </Label>
        <Label x={140} y={GND_Y} size={12} anchor="end" bold color={vizColors.muted}>
          GND
        </Label>

        {/* static wiring */}
        <g stroke={vizColors.grid} strokeWidth={3} fill="none">
          <line x1={LEG_L} y1={VM_Y} x2={LEG_L} y2={GND_Y} />
          <line x1={LEG_R} y1={VM_Y} x2={LEG_R} y2={GND_Y} />
          <line x1={LEG_L} y1={NODE_Y} x2={MOTOR.x - MOTOR.r} y2={NODE_Y} />
          <line x1={MOTOR.x + MOTOR.r} y1={NODE_Y} x2={LEG_R} y2={NODE_Y} />
        </g>

        {/* current paths */}
        {mode !== "shoot-through" &&
          paths.map((pts, i) => (
            <polyline
              key={i}
              points={pts}
              fill="none"
              stroke={vizColors.cyan}
              strokeWidth={4}
              strokeDasharray="8 10"
              strokeDashoffset={dashOffset}
              strokeLinejoin="round"
            />
          ))}
        {shootLeft && (
          <line x1={LEG_L} y1={VM_Y} x2={LEG_L} y2={GND_Y} stroke={vizColors.red} strokeWidth={flash ? 7 : 4} opacity={flash ? 1 : 0.6} />
        )}
        {shootRight && (
          <line x1={LEG_R} y1={VM_Y} x2={LEG_R} y2={GND_Y} stroke={vizColors.red} strokeWidth={flash ? 7 : 4} opacity={flash ? 1 : 0.6} />
        )}
        <circle cx={LEG_L} cy={NODE_Y} r={4} fill={vizColors.text} />
        <circle cx={LEG_R} cy={NODE_Y} r={4} fill={vizColors.text} />

        {/* motor */}
        <circle cx={MOTOR.x} cy={MOTOR.y} r={MOTOR.r} fill={vizColors.bg} stroke={vizColors.copper} strokeWidth={3} />
        <g transform={`rotate(${sim.angle.toFixed(1)} ${MOTOR.x} ${MOTOR.y})`}>
          <line x1={MOTOR.x - 22} y1={MOTOR.y} x2={MOTOR.x + 22} y2={MOTOR.y} stroke={vizColors.copper} strokeWidth={5} strokeLinecap="round" />
          <circle cx={MOTOR.x + 22} cy={MOTOR.y} r={4} fill={vizColors.amber} />
        </g>
        <circle cx={MOTOR.x} cy={MOTOR.y} r={5} fill={vizColors.muted} />
        <Label x={MOTOR.x} y={MOTOR.y + MOTOR.r + 14} size={11} color={vizColors.muted}>
          {spinning ? (sim.omega > 0 ? "motor ↻ forward" : "motor ↺ reverse") : "motor stopped"}
        </Label>
        <Label x={MOTOR.x - MOTOR.r - 26} y={NODE_Y - 12} size={11} color={vizColors.muted}>
          A
        </Label>
        <Label x={MOTOR.x + MOTOR.r + 26} y={NODE_Y - 12} size={11} color={vizColors.muted}>
          B
        </Label>

        {/* switches */}
        {SW.map((s, i) => (
          <SwitchSymbol
            key={s.name}
            i={i}
            on={q[i]}
            danger={(i < 2 && shootLeft) || (i >= 2 && shootRight)}
            onToggle={() => toggle(i)}
          />
        ))}
        {mode === "shoot-through" && (
          <Label x={MOTOR.x} y={NODE_Y - 60} size={14} bold color={vizColors.red}>
            ⚠ SHORT CIRCUIT
          </Label>
        )}

        {/* PWM scope */}
        <rect x={520} y={22} width={186} height={96} rx={6} fill={vizColors.grid} opacity={0.45} />
        <Label x={530} y={36} size={11} anchor="start" color={vizColors.muted}>
          PWM at 20 kHz, duty {duty}%
        </Label>
        {mode === "forward" || mode === "reverse" ? (
          <polyline
            points={[0, 1, 2]
              .map((k) => {
                const x0 = 532 + k * 56;
                const xOn = x0 + (56 * duty) / 100;
                return `${x0},100 ${x0},62 ${xOn},62 ${xOn},100 ${x0 + 56},100`;
              })
              .join(" ")}
            fill="none"
            stroke={vizColors.amber}
            strokeWidth={2}
          />
        ) : (
          <line x1={532} y1={100} x2={700} y2={100} stroke={vizColors.amber} strokeWidth={2} />
        )}
        <Label x={613} y={110} size={10} color={vizColors.muted}>
          {mode === "forward" || mode === "reverse" ? `average ${avgV.toFixed(1)} V` : "no drive"}
        </Label>

        {/* TB6612FNG truth table */}
        <Label x={520} y={140} size={11} anchor="start" bold>
          TB6612FNG, one channel
        </Label>
        {["IN1", "IN2", "PWM", "result"].map((h, c) => (
          <Label key={h} x={528 + c * 34} y={160} size={10} anchor="start" color={vizColors.muted} mono>
            {h}
          </Label>
        ))}
        {TABLE.map((row, r) => {
          const y = 180 + r * 22;
          const active = r === tableRow;
          return (
            <g key={r}>
              {active && <rect x={520} y={y - 10} width={190} height={20} rx={4} fill={vizColors.cyan} opacity={0.18} />}
              {row.map((cell, c) => (
                <Label key={c} x={528 + c * 34} y={y} size={10.5} anchor="start" mono={c < 3} color={active ? vizColors.text : vizColors.muted}>
                  {cell}
                </Label>
              ))}
            </g>
          );
        })}
        <Label x={520} y={296} size={10} anchor="start" color={vizColors.muted}>
          PWM low = short brake: slow decay
        </Label>
        <Label x={520} y={312} size={10} anchor="start" color={vizColors.muted}>
          between pulses, current keeps flowing
        </Label>
      </SvgCanvas>
    </VizFrame>
  );
}
