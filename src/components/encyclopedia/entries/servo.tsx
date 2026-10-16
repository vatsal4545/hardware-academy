import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Leader, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const PX = 112; // output shaft pivot
const PY = 100;
const SPLINE = "0.45 0 0.55 1;0.45 0 0.55 1";

function ServoIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="SG90 micro servo with mounting ears, a three-wire cable and a rotating output horn; the pulse width of the control signal sets the horn angle">
      <rect x={46} y={86} width={20} height={26} rx={3} fill="#2a63c9" stroke="#8cb4ff" />
      <rect x={214} y={86} width={20} height={26} rx={3} fill="#2a63c9" stroke="#8cb4ff" />
      <circle cx={56} cy={99} r={3} fill={part.bg} />
      <circle cx={224} cy={99} r={3} fill={part.bg} />
      <rect x={64} y={72} width={152} height={56} rx={4} fill="#2f6fe0" stroke="#8cb4ff" strokeWidth={1.5} />
      <rect x={68} y={75} width={144} height={7} rx={3} fill="#ffffff" opacity={0.18} />
      <rect x={150} y={92} width={52} height={16} rx={2} fill="#1d4fb0" opacity={0.7} />
      <Mark x={176} y={100} size={9} color="#ffffff">
        SG90
      </Mark>
      <g strokeWidth={3} strokeLinecap="round">
        <line x1={216} y1={92} x2={270} y2={92} stroke="#8b5a2b" />
        <line x1={216} y1={99} x2={270} y2={99} stroke="#ef4444" />
        <line x1={216} y1={106} x2={270} y2={106} stroke="#f59e0b" />
      </g>
      <rect x={268} y={86} width={28} height={26} rx={2} fill="#f3f4f6" />
      {[92, 99, 106].map((y) => (
        <rect key={y} x={274} y={y - 2} width={16} height={4} fill={part.gold} />
      ))}
      <circle cx={PX} cy={PY} r={14} fill="#e5e7eb" stroke="#9ca3af" />
      <g>
        <rect x={PX - 8} y={PY - 6} width={84} height={12} rx={6} fill="#f3f4f6" stroke="#9ca3af" />
        <circle cx={PX + 62} cy={PY} r={2} fill="#6b7280" />
        <circle cx={PX + 44} cy={PY} r={2} fill="#6b7280" />
        <circle cx={PX + 26} cy={PY} r={2} fill="#6b7280" />
        {on && <animateTransform attributeName="transform" type="rotate" values={`-55 ${PX} ${PY};55 ${PX} ${PY};-55 ${PX} ${PY}`} keyTimes="0;0.5;1" calcMode="spline" keySplines={SPLINE} dur="4s" repeatCount="indefinite" />}
      </g>
      <circle cx={PX} cy={PY} r={5} fill="#6b7280" />
      <Note x={PX + 40} y={58} size={10}>
        output horn
      </Note>
      <Leader from={[PX + 40, 64]} to={[PX + 40, PY - 8]} />
      <line x1={26} y1={172} x2={196} y2={172} stroke={vizColors.muted} strokeWidth={1.4} />
      <rect x={26} y={160} width={12} height={12} fill={vizColors.cyan}>
        <Anim on={on} name="width" values="8;16;8" keyTimes="0;0.5;1" calcMode="spline" keySplines={SPLINE} dur={4} />
      </rect>
      <Note x={26} y={152} anchor="start" size={10} color={vizColors.cyan}>
        control pulse: 1-2 ms
      </Note>
      <Note x={196} y={186} anchor="end" size={10}>
        repeats every 20 ms
      </Note>
      <Note x={20} y={24} anchor="start" color={part.ink} size={10.5}>
        SG90 micro servo, 9 g
      </Note>
      <Note x={300} y={24} anchor="end" size={10}>
        1.8 kg·cm at 4.8 V
      </Note>
      <Note x={300} y={40} anchor="end" size={10}>
        0.1 s per 60°
      </Note>
      <Note x={260} y={140} size={10}>
        brown GND
      </Note>
      <Note x={260} y={154} size={10} color="#ef7a7a">
        red 5 V
      </Note>
      <Note x={260} y={168} size={10} color="#f4b04a">
        orange signal
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "servo",
  name: "Servo",
  category: "actuator",
  oneLiner: "A motor, gearbox, feedback potentiometer and control board in one case: send it an angle as a pulse width and it holds that position.",
  howItWorks: [
    "A hobby servo (SG90, MG996R) holds a small brushed DC motor, a plastic or metal gear train (reduction of 1:150-1:300), a potentiometer on the output shaft and a control board. The board compares the commanded angle with the potentiometer reading and drives the motor to remove the error, so it is a complete closed-loop position system for a few dollars.",
    "The command is a PWM pulse repeated every 20 ms (50 Hz). A pulse of 1.0 ms is one end of travel, 1.5 ms is centre and 2.0 ms is the other end, and many servos accept 0.5-2.5 ms for a wider sweep. The SG90 turns about 180° with 1.8 kg·cm of torque at 4.8 V and 0.1 s per 60°, while an MG996R gives 9.4 kg·cm at 0.19 s per 60°.",
    "Power matters. A servo draws about 10 mA idle but 500-800 mA when stalled, so on a shared USB or 5 V rail a stalled servo browns out the microcontroller. Power servos from their own 5-6 V supply with a 470-1000 µF capacitor and share only ground with the MCU.",
    "Continuous-rotation servos replace the potentiometer with fixed resistors, so the pulse width sets speed and direction (1.5 ms is stop) instead of position. Digital servos update their loop at about 300 Hz against 50 Hz for analog ones and hold stiffer. Smart bus servos (Dynamixel, Feetech STS3215) add daisy-chained serial control and telemetry such as position, load and temperature.",
  ],
  whereUsed: [
    "Robot-arm joints and grippers: SG90 or MG90S for light loads, MG996R-class servos for 1-2 kg·cm-scale arms.",
    "Pan-tilt camera mounts, and ultrasonic sensors swept through 0-180°.",
    "Steering and control surfaces in RC cars and planes.",
    "Animatronics and legged-robot joints, such as the twelve servos of a quadruped.",
    "Valve and damper actuation in test rigs and models.",
  ],
  keySpecs: [
    { label: "Control signal", value: "50 Hz PWM, 1.0-2.0 ms (0.5-2.5 ms extended), 3-5 V logic" },
    { label: "Supply", value: "4.8-6 V; stall current 0.5-0.8 A (SG90)" },
    { label: "Torque", value: "1.8 kg·cm (SG90), 9.4 kg·cm (MG996R) at 4.8 V" },
    { label: "Speed", value: "0.10 s per 60° (SG90), 0.19 s per 60° (MG996R) at 4.8 V" },
    { label: "Travel and resolution", value: "About 180°, with a deadband of 5-10 µs (about 1°)" },
    { label: "Size and weight", value: "22.5 × 12 × 28 mm and 9 g (SG90)" },
  ],
  failureModes: [
    "Jitter and buzzing: a noisy supply (servo and MCU on one rail), software-timed PWM, or a load near the torque limit makes the servo shudder. Use hardware PWM, separate power and a bulk capacitor.",
    "Stall and stripped gears: holding against a block draws stall current continuously, overheats the motor and can strip plastic gears. Add limits in software, or use metal-gear servos with a clutch.",
    "Brown-outs when several servos move together: six SG90s starting at once draw 2-4 A, the 5 V rail dips and the MCU resets. Use a supply or BEC of at least 3 A and sequence the moves.",
    "Wrong range and calibration: sending pulses beyond the mechanical limits (2.5 ms to a servo built for 1-2 ms) drives it into its end stop and can burn out the motor.",
  ],
  interviewTip:
    "Interviewer asks: \"How does a hobby servo hold a position with a single signal wire, and how would you drive twelve of them from one MCU?\" A good answer: the pulse width encodes the target angle, and an internal analog or digital loop compares it with the potentiometer. The 20 ms frame leaves room to multiplex, either staggering several channels within one frame or using a PCA9685 (16 channels, 12-bit, I2C) to offload PWM. Budget the stall current times the number moving at once, use a separate 5-6 V supply with bulk capacitance, and consider smart serial servos if you need feedback.",
  relatedLesson: "actuators-and-drivers",
  Illustration: ServoIllustration,
};
