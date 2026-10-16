import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Mark, Note, PartCanvas, part, useAnimate, type Pt } from "../shared";

const RED_BOARD = "#b3262b";
const PINS = Array.from({ length: 12 }, (_, i) => 66 + i * 4.9);
const HEADERS = Array.from({ length: 8 }, (_, i) => 46 + i * 18);
const FWD: Pt[] = [[200, 76], [244, 76], [250, 88], [244, 100], [200, 100]];

function HBridgeIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="TB6612FNG motor driver breakout board with its chip, header pins and a screw terminal wired to a motor; the motor current reverses direction in turn">
      <rect x={30} y={34} width={160} height={112} rx={5} fill={RED_BOARD} stroke="#e0575c" strokeWidth={1.5} />
      {HEADERS.map((x) => (
        <g key={x}>
          <rect x={x - 3} y={40} width={6} height={6} fill={part.gold} />
          <rect x={x - 3} y={134} width={6} height={6} fill={part.gold} />
        </g>
      ))}
      <Mark x={110} y={60} size={8.5} color="#ffffff">
        MOTOR DRIVER
      </Mark>
      {PINS.map((x) => (
        <g key={x} fill={part.metal}>
          <rect x={x - 1.2} y={70} width={2.4} height={4.5} />
          <rect x={x - 1.2} y={97.5} width={2.4} height={4.5} />
        </g>
      ))}
      <rect x={62} y={74} width={64} height={24} rx={2} fill={part.epoxy} stroke={part.epoxyHi} />
      <circle cx={67} cy={79} r={1.6} fill="#46506a" />
      <Mark x={94} y={86} size={6.5} color="#ffffff">
        TB6612FNG
      </Mark>
      {[
        [136, 76],
        [136, 90],
        [50, 76],
        [50, 90],
      ].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={9} height={6} rx={1} fill={part.ceramic} />
      ))}
      <Mark x={94} y={118} size={7.5} color="#ffd9da">
        2 x H-BRIDGE
      </Mark>
      <rect x={178} y={62} width={24} height={52} rx={2} fill="#2563eb" stroke="#93c5fd" />
      {[76, 100].map((y) => (
        <g key={y}>
          <circle cx={190} cy={y} r={7} fill="#cbd5e1" />
          <line x1={186} y1={y} x2={194} y2={y} stroke="#475569" strokeWidth={1.6} />
        </g>
      ))}
      <Label x={190} y={54} size={8.5} bold color="#ffffff">
        A01 A02
      </Label>
      <g stroke="#e5e7eb" strokeWidth={2.4} strokeLinecap="round" fill="none">
        <path d="M202 76 H246" />
        <path d="M202 100 H246" />
      </g>
      <g>
        <Flow points={FWD} on={on} n={4} dur={1.6} r={2.6} />
        <Anim on={on} name="opacity" values="1;1;0;0" keyTimes="0;0.46;0.5;1" dur={4} />
      </g>
      {on && (
        <g>
          <Flow points={FWD} on={on} n={4} dur={1.6} r={2.6} reverse />
          <Anim on={on} name="opacity" values="0;0;1;1" keyTimes="0;0.5;0.54;1" dur={4} />
        </g>
      )}
      <circle cx={268} cy={88} r={24} fill="#1f2735" stroke={part.metal} strokeWidth={2} />
      <Label x={268} y={88} size={18} bold>
        M
      </Label>
      <Note x={268} y={128} size={10}>
        N20 gearmotor
      </Note>
      <Note x={268} y={48} size={10.5} color={vizColors.amber} bold>
        {on ? "forward / reverse" : "forward"}
      </Note>
      <Mark x={30} y={166} anchor="start" size={9.5}>
        IN1 IN2: 1 0 forward, 0 1 reverse
      </Mark>
      <Mark x={30} y={181} anchor="start" size={9.5}>
        1 1 brake, 0 0 coast; PWM sets speed
      </Mark>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "h-bridge-driver",
  name: "H-bridge motor driver",
  category: "actuator",
  oneLiner: "Four switches arranged in an H let a microcontroller run a motor both ways, with PWM for speed: the TB6612FNG puts two bridges in one chip.",
  howItWorks: [
    "An H-bridge has four switches (MOSFETs) around the motor: high-side Q1 and Q3 to the supply, low-side Q2 and Q4 to ground. Closing Q1 and Q4 sends current left to right through the motor (forward), and Q3 with Q2 sends it right to left (reverse). Closing both low-side switches shorts the motor terminals so back-EMF brakes it, and opening all four lets it coast.",
    "Never close both switches of the same leg (Q1 with Q2, or Q3 with Q4): that is shoot-through, a short circuit across the supply. Driver ICs insert dead time and decode their inputs so the illegal state cannot be requested.",
    "Speed control is PWM on the enable or one input, at about 20 kHz so it is inaudible, so the average motor voltage is duty × supply. The TB6612FNG's logic is simple: IN1 and IN2 choose forward, reverse, brake or stop, a PWM pin sets the speed, and STBY enables the chip, for two motors (channels A and B).",
    "The TB6612FNG takes a 4.5-13.5 V motor supply and a 2.7-5.5 V logic supply, handles 1.2 A continuous and 3.2 A peak per channel, has about 0.5 Ω of total on-resistance, built-in thermal shutdown and flyback diodes, and accepts PWM up to 100 kHz. The older L298N uses bipolar transistors that drop about 2 V and run hot. The DRV8833 (1.5 A), DRV8871 (3.6 A) and VNH5019 (30 A) sit further up the scale.",
    "Add a 100-470 µF bulk capacitor on the motor supply and 100 nF at each supply pin: motor spikes and regeneration push the supply up when braking. Internal body diodes clamp the inductive kick at the supply rail.",
  ],
  whereUsed: [
    "The wheel motors of the course robot: one TB6612FNG runs two N20 gearmotors from 20 kHz PWM on an ESP32.",
    "Brushed DC motors in toys, printers, valves and power-window actuators.",
    "Motor shields and breakouts such as L298N, DRV8833 and TB6612FNG boards.",
    "Solenoids and other bidirectional loads: door locks, linear actuators and pumps.",
    "Discrete MOSFET bridges for 20-100 A loads in electric skateboards, wheelchairs and brushed-motor ESCs.",
  ],
  keySpecs: [
    { label: "Motor supply VM", value: "4.5-13.5 V (TB6612FNG)" },
    { label: "Current per channel", value: "1.2 A continuous, 3.2 A peak" },
    { label: "On-resistance", value: "About 0.5 Ω high plus low side (the L298N drops about 2 V)" },
    { label: "Logic supply and inputs", value: "2.7-5.5 V, compatible with 3.3 V MCUs" },
    { label: "PWM frequency", value: "Up to 100 kHz (L298N: about 25 kHz)" },
    { label: "Package", value: "SSOP24 (TB6612FNG), usually sold on a breakout board" },
  ],
  failureModes: [
    "Shoot-through from bad firmware or noise: if both gate inputs of a leg are on, the supply is shorted through the MOSFETs in microseconds. Use a driver with built-in dead time and never bit-bang the gates of a discrete bridge.",
    "Overheating at stall: a stalled motor can pull 2-3 A through 0.5 Ω, which is 2-4.5 W in a small SSOP, so the chip trips thermal shutdown or fails. Limit current in firmware or choose a larger driver.",
    "Overvoltage from regeneration: a braking or back-driven motor pumps energy into VM. If the battery cannot absorb it, spikes damage the driver. Add a bulk capacitor or TVS and choose brake or coast deliberately.",
    "Floating control pins: unconnected STBY or IN pins at boot make the motor twitch or run. Add pull-downs and set pins before enabling the driver.",
  ],
  interviewTip:
    "Interviewer asks: \"What is the difference between brake and coast in an H-bridge, and how do you avoid shoot-through?\" A good answer: in brake, both low-side (or both high-side) switches are on, the motor terminals are shorted and back-EMF drives a braking current I = E/R. In coast, all switches are off and the rotor free-wheels through the body diodes. Shoot-through is both switches of one leg being on together, which shorts the supply. Avoid it with non-overlapping gate drive and dead time of 100 ns to 1 µs, interlocking logic in the driver IC, and by checking the logic table in firmware.",
  relatedLesson: "actuators-and-drivers",
  Illustration: HBridgeIllustration,
};
