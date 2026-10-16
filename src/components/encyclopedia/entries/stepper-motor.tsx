import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const CX = 108;
const CY = 100;
const HOLES = [
  [-44, -44],
  [44, -44],
  [-44, 44],
  [44, 44],
] as const;
const COILS = ["A+", "B+", "A−", "B−"] as const;
const STEPS = Array.from({ length: 9 }, (_, i) => `${i * 45} ${CX} ${CY}`).join(";");
const KEY_TIMES = Array.from({ length: 9 }, (_, i) => (i / 8).toFixed(3)).join(";");

function StepperIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="NEMA 17 stepper motor seen from the front with four mounting holes and a shaft that advances in discrete steps, beside the four-step coil energising sequence">
      <path d={`M${CX - 46} ${CY - 60} H${CX + 46} L${CX + 60} ${CY - 46} V${CY + 46} L${CX + 46} ${CY + 60} H${CX - 46} L${CX - 60} ${CY + 46} V${CY - 46} Z`} fill="#3a4152" stroke="#6b7690" strokeWidth={1.5} />
      <rect x={CX - 56} y={CY - 58} width={112} height={6} rx={3} fill="#ffffff" opacity={0.08} />
      {HOLES.map(([dx, dy]) => (
        <circle key={`${dx}${dy}`} cx={CX + dx} cy={CY + dy} r={5} fill={part.bg} stroke="#7b869d" strokeWidth={1.2} />
      ))}
      <circle cx={CX} cy={CY} r={34} fill="#4d576c" stroke="#8c97ae" strokeWidth={1.5} />
      <g>
        <circle cx={CX} cy={CY} r={24} fill="none" stroke="#6b7690" strokeWidth={1} />
        <circle cx={CX + 29} cy={CY} r={3.2} fill={vizColors.red} />
        <circle cx={CX} cy={CY} r={10} fill={part.metal} stroke={part.metalLo} />
        <rect x={CX - 1.6} y={CY - 10} width={3.2} height={10} fill="#2b303c" />
        {on && <animateTransform attributeName="transform" type="rotate" values={STEPS} keyTimes={KEY_TIMES} calcMode="discrete" dur="2.4s" repeatCount="indefinite" />}
      </g>
      <Note x={CX} y={CY + 78} color={part.ink} size={10.5}>
        NEMA 17, 42 × 42 mm
      </Note>
      <Note x={CX} y={CY + 92} size={10}>
        1.7 A per phase
      </Note>
      <Note x={254} y={34} size={10.5} color={part.ink}>
        coil sequence
      </Note>
      {COILS.map((c, i) => (
        <g key={c}>
          <circle cx={214} cy={58 + i * 24} r={7} fill={vizColors.amber} opacity={on ? 0.15 : i === 0 ? 1 : 0.2}>
            <Anim on={on} name="opacity" values="1;0.15;0.15;0.15" keyTimes="0;0.25;0.5;0.75" calcMode="discrete" dur={1.2} begin={0.3 * i - 1.2} />
          </circle>
          <Label x={230} y={58 + i * 24} size={12} anchor="start" bold mono>
            {c}
          </Label>
        </g>
      ))}
      <Mark x={254} y={160} size={10} color="#ffffff">
        1.8° per step
      </Mark>
      <Mark x={254} y={176} size={10}>
        200 steps per turn
      </Mark>
      <Note x={254} y={192} size={9.5}>
        1/16 microstep: 3200
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "stepper-motor",
  name: "Stepper motor",
  category: "actuator",
  oneLiner: "A motor that moves in precise fixed steps, typically 1.8° or 200 per turn, so you can position it open-loop by counting pulses.",
  howItWorks: [
    "A hybrid stepper such as the NEMA 17 has a toothed rotor (50 teeth) between permanent magnets and a stator with two coil phases, A and B. Energising the coils in sequence (A+, B+, A−, B−) pulls the rotor one step at a time: 4 sequence states × 50 teeth gives 200 full steps per turn, or 1.8° per step.",
    "Each pulse on a STEP input moves one step, and DIR sets the direction. A driver (A4988, DRV8825, TMC2209) chops the coil current to a set level, for example 1.0-1.7 A per phase, and offers microstepping (1/16 or 1/256) by shaping the two coil currents like sine and cosine so the rotor settles between full steps. That gives 3200 positions per turn at 1/16 and much smoother, quieter motion, though accuracy does not improve as much as resolution.",
    "Holding torque is the key figure. A typical NEMA 17 (42 × 42 mm, 40-48 mm long) gives 0.3-0.6 N·m holding at 1.7 A, 1.5 Ω and 2.8 mH per phase (a 17HS4401 reads 1.7 A × 1.5 Ω = 2.55 V). Torque falls with speed because coil inductance limits how fast current can rise, so at 1000 rpm the torque may be a third of its holding value unless the supply is 24 V or more.",
    "Because the rotor follows the commanded field, no encoder is needed as long as the motor never loses steps. If the load torque exceeds the available torque the rotor slips silently, so closed-loop steppers add an encoder to catch and correct it. Compared with servos, steppers are cheap and stiff at standstill, but they run hot because full current flows even when stationary, and they are inefficient (30-60%) and slow above about 1000 rpm.",
  ],
  whereUsed: [
    "3D printer axes (NEMA 17 at 1/16 microstepping with a TMC2209) and extruders.",
    "CNC routers, laser cutters, camera sliders and plotters, which position without an encoder.",
    "Small robot arms, telescope mounts and valve actuators, including lead-screw linear actuators.",
    "Printers, scanners and dispensers, using small can-stack steppers.",
    "Low-speed robot wheels where feedback is unnecessary, for example a small rover with NEMA 8 motors.",
  ],
  keySpecs: [
    { label: "Step angle", value: "1.8° (200 steps per turn); 0.9° for 400-step variants" },
    { label: "Holding torque", value: "0.3-0.6 N·m (NEMA 17); 1.0-3.0 N·m (NEMA 23)" },
    { label: "Rated phase current", value: "1.0-2.0 A per phase (NEMA 17); 2-4 A (NEMA 23)" },
    { label: "Coil resistance and inductance", value: "About 1.5 Ω and 2.8 mH per phase for a 17HS4401" },
    { label: "Frame size", value: "42.3 mm square (NEMA 17); 57 mm square (NEMA 23)" },
    { label: "Useful speed", value: "About 600-1500 rpm with a 24 V supply" },
  ],
  failureModes: [
    "Lost steps from resonance or overload: the rotor slips and position drifts with no warning, since the system is open-loop. Mid-speed resonance (roughly 100-300 full steps per second) makes the motor buzz and stall. Use microstepping, lower accelerations and a homing switch.",
    "Heat: running at full rated current while stationary dissipates 2 × 1.7² × 1.5 = 8.7 W, so the case can reach 80-100 °C. Drop hold current to 30-50% when idle.",
    "Driver damage: hot-plugging a motor into a powered driver creates voltage spikes that destroy an A4988, and a wrong current setting (Vref) or no heatsink makes the driver shut down mid-print.",
    "Torque collapse at speed: with a 12 V supply the current cannot rise fast enough through the inductance, so torque drops sharply above about 300 rpm.",
  ],
  interviewTip:
    "Interviewer asks: \"Why does a stepper lose steps, and when would you pick a servo instead?\" A good answer: steppers are open-loop, so if the load torque or acceleration exceeds the pull-out torque at that speed the rotor lags a full step and the controller never knows. Torque falls with speed (back-EMF and L/R limit the current), so fast acceleration or a low supply voltage loses steps. Choose a servo or closed-loop stepper for high speed, efficiency, torque margin or guaranteed position, and a stepper for cheap, low-speed, high-torque positioning without feedback. Add that microstepping improves smoothness more than accuracy.",
  relatedLesson: "actuators-and-drivers",
  Illustration: StepperIllustration,
};
