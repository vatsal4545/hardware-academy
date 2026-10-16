import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Mark, Note, PartCanvas, Spin, part, round, useAnimate } from "../shared";

const WX = 240;
const WY = 100;
const SPOKES = [0, 72, 144, 216, 288];

function BrushedMotorIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="N20 brushed DC gearmotor with two terminals at the back, a gearbox and an output shaft driving a robot wheel that spins when current flows">
      <rect x={150} y={96} width={92} height={8} rx={2} fill={part.metal} />
      <rect x={118} y={70} width={44} height={60} rx={3} fill="#c9b27d" stroke="#8d7a4c" />
      <g stroke="#8d7a4c" strokeWidth={1.2}>
        <line x1={128} y1={74} x2={128} y2={126} />
        <line x1={152} y1={74} x2={152} y2={126} />
      </g>
      <rect x={34} y={76} width={86} height={48} rx={7} fill={part.metal} />
      <rect x={38} y={80} width={78} height={8} rx={4} fill={part.metalHi} opacity={0.75} />
      <rect x={26} y={80} width={12} height={40} rx={3} fill="#a4aebd" />
      <rect x={16} y={88} width={14} height={5} fill={part.gold} />
      <rect x={16} y={107} width={14} height={5} fill={part.gold} />
      <line x1={4} y1={90.5} x2={18} y2={90.5} stroke={vizColors.red} strokeWidth={2.4} strokeLinecap="round" />
      <line x1={4} y1={109.5} x2={18} y2={109.5} stroke="#9ca3af" strokeWidth={2.4} strokeLinecap="round" />
      <Spin cx={WX} cy={WY} on={on} dur={2.4}>
        <circle cx={WX} cy={WY} r={56} fill="#161b25" stroke="#2c3445" strokeWidth={2} />
        <circle cx={WX} cy={WY} r={40} fill="#4b5568" stroke="#707c94" />
        {SPOKES.map((a) => (
          <line key={a} x1={WX} y1={WY} x2={round(WX + 36 * Math.cos((a * Math.PI) / 180))} y2={round(WY + 36 * Math.sin((a * Math.PI) / 180))} stroke="#2d3545" strokeWidth={5} strokeLinecap="round" />
        ))}
        <circle cx={WX} cy={WY} r={10} fill={part.metal} stroke={part.metalLo} />
        <circle cx={WX + 46} cy={WY} r={4} fill={vizColors.red} />
      </Spin>
      <Flow points={[[6, 90.5], [30, 90.5]]} on={on} n={2} dur={1} r={2.4} />
      <Flow points={[[30, 109.5], [6, 109.5]]} on={on} n={2} dur={1} r={2.4} />
      <Note x={76} y={150} color={part.ink} size={10.5}>
        N20 gearmotor, 6 V
      </Note>
      <Note x={76} y={164} size={10}>
        motor + 1:100 gearbox
      </Note>
      <Note x={22} y={70} anchor="start" size={9.5}>
        + / − terminals
      </Note>
      <Mark x={76} y={186} size={10.5} color="#ffffff">
        τ = Kt × I   E = Ke × ω
      </Mark>
      <Note x={240} y={176} size={10}>
        robot wheel
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "dc-brushed-motor",
  name: "Brushed DC motor",
  category: "actuator",
  oneLiner: "A permanent-magnet DC motor whose brushes and commutator switch the rotor current, so voltage sets speed and current sets torque.",
  howItWorks: [
    "A brushed DC motor has permanent magnets on the stator and a wound rotor (the armature). Carbon or metal brushes press on a split-ring commutator and feed current to whichever coil is lined up with the magnets. As the rotor turns, the commutator reverses each coil's current at the right moment, so the torque always pushes the same way.",
    "Two simple laws describe it: torque τ = Kt·I and back-EMF E = Ke·ω, with Kt = Ke in SI units (about 3-4 mN·m/A for an N20 motor). Speed settles where V = I·R + Ke·ω. At stall (ω = 0) the current is V/R, so a 6 V motor with 3 Ω of winding resistance draws 2 A, far above its running current.",
    "Speed is controlled by average voltage using PWM (1-20 kHz) through an H-bridge, and reversing polarity reverses direction. Torque is current, so limit the current to protect the motor and driver. A gearbox trades speed for torque: 1:100 gives about 100 times the torque at 1/100 of the speed, less 20-30% lost to gear friction, which is why N20 and TT gearmotors dominate small robots.",
    "A good small motor is 50-80% efficient, and much less when stalled or heavily geared. Heat comes from I²R in the windings, brush friction and iron losses. Continuous torque is limited by temperature and peak torque by current. Carbon brushes last about 1000-3000 hours, and the arcing makes broadband EMI, so fit a 100 nF ceramic across the terminals.",
  ],
  whereUsed: [
    "The wheels of the course robot: N20 or TT gearmotors with a quadrature encoder, driven through a TB6612FNG.",
    "Toys, fans, pumps and power tools, and vehicle seat and window mechanisms.",
    "Low-cost hobby servos, which pair a small brushed motor with a potentiometer (SG90).",
    "Automotive wipers, door locks, HVAC dampers and starter motors (brushed, 1-2 kW).",
    "Small positioning axes with an encoder, such as low-cost robot-arm joints.",
  ],
  keySpecs: [
    { label: "Rated voltage", value: "3-12 V for small motors; 12-24 V for larger ones" },
    { label: "No-load speed and current", value: "N20 ungeared about 15 000 rpm at 6 V; geared 30-1000 rpm; 40-100 mA" },
    { label: "Stall current", value: "0.5-1.5 A for a 6 V N20 gearmotor" },
    { label: "Torque constant", value: "Kt = Ke, about 3-4 mN·m/A for an N20" },
    { label: "Efficiency", value: "50-80% for the motor, lower with a gearbox" },
    { label: "Brush life", value: "About 1000-3000 h for carbon brushes" },
  ],
  failureModes: [
    "Stall overheating: at stall the whole V/R current flows with no back-EMF to oppose it. A 6 V motor pulls 1-2 A, heats within tens of seconds, and can melt winding insulation and weaken the magnets. Limit current in the driver.",
    "Brush and commutator wear: sparking, carbon dust and rising noise, and eventually intermittent torque in some rotor positions. Replace the motor, and add EMI suppression.",
    "Back-EMF and regeneration spikes: a motor turned by its load pumps current back into the supply and can overvoltage a bridge. Add a bulk capacitor or TVS, and do not drive from a supply that cannot sink current.",
    "Gearbox failure: plastic N20 gears strip under shock loads, and backlash of 1-5° makes positioning loops oscillate.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you select a motor and gear ratio for a 1 kg robot that must climb a 10° slope?\" A good answer: wheel force F = m·g·(sin θ + Crr·cos θ) = 1 × 9.81 × (0.174 + 0.02) ≈ 1.9 N; with a 0.03 m wheel radius that is 0.057 N·m in total, or 0.029 N·m per motor. Add a 2× margin, choose a motor and gearbox whose continuous torque exceeds that at the speed you want (0.5 m/s is 16.7 rad/s, about 160 rpm), then check the stall current against the driver and allow for roughly 60% efficiency.",
  relatedLesson: "actuators-and-drivers",
  Illustration: BrushedMotorIllustration,
};
