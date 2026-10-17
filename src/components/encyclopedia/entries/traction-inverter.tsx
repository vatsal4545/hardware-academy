import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Mark, Note, PartCanvas, ScrollClip, part, sinePath, useAnimate } from "../shared";

const LEGS = [
  { x: 86, phase: "U", top: "Q1", bottom: "Q4", color: vizColors.red, delay: 0 },
  { x: 124, phase: "V", top: "Q3", bottom: "Q6", color: vizColors.green, delay: -0.27 },
  { x: 162, phase: "W", top: "Q5", bottom: "Q2", color: vizColors.blue, delay: -0.53 },
] as const;
const ON = vizColors.amber;
const OFF = "#232b3a";
const RAIL_TOP = 44;
const RAIL_BOT = 156;
const PWM = 0.8; // seconds per switching period in the animation

function Switch({ x, y, label, hi, delay, on }: { x: number; y: number; label: string; hi: boolean; delay: number; on: boolean }) {
  // The high-side device conducts for the first 60% of the period, the low-side one for the rest.
  const values = hi ? `${ON};${OFF}` : `${OFF};${ON}`;
  return (
    <g>
      <rect x={x - 12} y={y} width={24} height={26} rx={3} fill={hi ? ON : OFF} stroke="#7a86a0" strokeWidth={1.2}>
        <Anim on={on} name="fill" values={values} keyTimes="0;0.6" calcMode="discrete" dur={PWM} begin={delay} />
      </rect>
      <Label x={x} y={y + 13} size={8.5} bold color="#ffffff" mono>
        {label}
      </Label>
    </g>
  );
}

function InverterIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Traction inverter: a DC-link capacitor feeds three half-bridge legs of two power switches each, which alternate to build three-phase output voltages U, V and W for the motor">
      <rect x={14} y={24} width={188} height={150} rx={8} fill="#2a303d" stroke="#6f7b94" strokeWidth={1.5} />
      <rect x={6} y={50} width={12} height={12} fill={vizColors.red} />
      <rect x={6} y={136} width={12} height={12} fill="#9ca3af" />
      <g stroke={vizColors.text} strokeWidth={2} fill="none" strokeLinecap="round">
        <line x1={24} y1={RAIL_TOP} x2={190} y2={RAIL_TOP} />
        <line x1={24} y1={RAIL_BOT} x2={190} y2={RAIL_BOT} />
        <line x1={44} y1={RAIL_TOP} x2={44} y2={70} />
        <line x1={44} y1={130} x2={44} y2={RAIL_BOT} />
      </g>
      <rect x={34} y={70} width={20} height={60} rx={3} fill="#2c4a7a" stroke="#6fa0e8" />
      <Label x={44} y={100} size={9} bold color="#ffffff">
        C
      </Label>
      {LEGS.map((l) => (
        <g key={l.phase}>
          <g stroke={vizColors.text} strokeWidth={1.8} fill="none">
            <line x1={l.x} y1={RAIL_TOP} x2={l.x} y2={58} />
            <line x1={l.x} y1={84} x2={l.x} y2={116} />
            <line x1={l.x} y1={142} x2={l.x} y2={RAIL_BOT} />
          </g>
          <Switch x={l.x} y={58} label={l.top} hi delay={l.delay} on={on} />
          <Switch x={l.x} y={116} label={l.bottom} hi={false} delay={l.delay} on={on} />
          <line x1={l.x} y1={100} x2={l.x + 16} y2={100} stroke={l.color} strokeWidth={2.4} />
          <Label x={l.x + 24} y={100} size={11} bold color={l.color}>
            {l.phase}
          </Label>
        </g>
      ))}
      <Label x={30} y={34} size={9} anchor="start" bold color={vizColors.red}>
        DC+
      </Label>
      <Label x={30} y={166} size={9} anchor="start" bold color={vizColors.muted}>
        DC−
      </Label>
      <Note x={110} y={190} color={part.ink} size={10}>
        6 switches, 3 legs
      </Note>
      <Note x={258} y={22} size={10} color={part.ink}>
        3-phase to the motor
      </Note>
      {LEGS.map((l, i) => {
        const y = 38 + i * 44;
        return (
          <ScrollClip key={l.phase} x={216} y={y} w={92} h={34} period={46} dur={1.6} on={on}>
            <path d={sinePath(216, 216 + 92 + 46, y + 17, 12, 46, -(i * 2 * Math.PI) / 3)} stroke={l.color} strokeWidth={2.4} fill="none" strokeLinejoin="round" />
          </ScrollClip>
        );
      })}
      <Mark x={262} y={170} size={9.5} color="#ffffff">
        400-800 V DC in
      </Mark>
      <Note x={262} y={185} size={9.5}>
        8-16 kHz PWM (IGBT)
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "traction-inverter",
  name: "Traction inverter",
  category: "ev",
  oneLiner: "Six power switches and a controller turn the battery's DC into three-phase AC of variable voltage and frequency, setting the motor's torque and speed.",
  howItWorks: [
    "The traction inverter takes DC from the pack (400 V or 800 V) and builds three-phase AC with six switches in three half-bridges, one phase leg each. Each leg's high-side and low-side switch is PWM-modulated (8-16 kHz for IGBTs, 15-50 kHz for SiC), and the motor's inductance averages the pulses so that sinusoidal currents flow. Output frequency sets speed and current amplitude sets torque.",
    "A DC-link capacitor bank (film capacitors, 200-1000 µF) sits between the pack and the bridge to supply the pulsed current. Ripple current can reach 100-300 A rms in a 150 kW unit, and the bank also absorbs inductive spikes and regenerative braking energy. The pack connects through contactors with a precharge circuit so that no surge hits the empty capacitor.",
    "Field-oriented control (FOC) measures phase currents (two or three current sensors) and rotor angle (a resolver or encoder), transforms the currents to the rotating d-q frame (Clarke and Park), regulates them with PI controllers and transforms back to PWM duty cycles. Iq makes torque, and a negative Id weakens the field to go above base speed.",
    "Isolated gate drivers (digital isolators rated 5 kV reinforced) switch each device with about +15 V and −4 V, with desaturation protection that trips in under 2 µs and an active Miller clamp. NTC sensors on the power module let the controller derate power as it heats. Peak power for a passenger car is typically 100-300 kW.",
    "Moving from Si IGBTs to SiC MOSFETs (Tesla's Model 3 from 2018, followed by many newer designs) cuts inverter losses by roughly half and lifts peak efficiency from about 97-98% to about 99%, at the price of faster edges that stress the motor insulation and demand a low-inductance layout.",
  ],
  whereUsed: [
    "Every battery-electric car, bus and truck, with one inverter per traction motor (front and rear in dual-motor cars).",
    "Electric motorcycles, e-bikes and scooters, using smaller 48-96 V controllers rated 200-400 A.",
    "Trains, ships and industrial drives, as variable-frequency drives for pumps and fans.",
    "Regenerative braking: the same bridge run backwards charges the pack at 50-100 kW.",
    "Integrated drive units where the inverter, motor and gearbox share one housing.",
  ],
  keySpecs: [
    { label: "DC bus voltage", value: "400 V (250-450 V) or 800 V (600-900 V)" },
    { label: "Peak phase current", value: "300-800 A rms for 100-250 kW" },
    { label: "Power devices", value: "Si IGBT or SiC MOSFET modules (650-1200 V), three half-bridges" },
    { label: "Switching frequency", value: "8-16 kHz (IGBT); 15-50 kHz (SiC)" },
    { label: "Efficiency", value: "97-98% (Si IGBT); 98.5-99% (SiC)" },
    { label: "DC-link capacitance", value: "200-1000 µF of film capacitor" },
  ],
  failureModes: [
    "Shoot-through or a short in a phase leg: a gate-drive fault or a failed device conducts across the DC bus at 400-800 V. Protection (desaturation and current sensing in under 2 µs) must open the devices, and a device that fails short needs a contactor or an active short circuit.",
    "Thermal fatigue of the module's solder and bond wires: junction temperature swings of 50-100 K delaminate layers and lift wires. Lifetime is modelled with power-cycling curves.",
    "Voltage spikes: stray inductance of 20-50 nH in the DC-link loop with 5 kA/µs of di/dt gives 100-250 V of overshoot on top of 800 V. Laminated busbars and snubbers reduce it.",
    "Loss of rotor-angle information: with no resolver or encoder signal, FOC cannot run, so the inverter must disable torque or enter a safe state. An uncontrolled permanent-magnet motor at high speed can generate more than the bus voltage, which is why an active short circuit is used.",
  ],
  interviewTip:
    "Interviewer asks: \"How does an inverter make a motor produce a requested torque?\" A good answer: the torque request becomes d-q current commands (for example maximum torque per amp), the controller measures phase currents and rotor angle, Clarke and Park transform them to the rotating frame, PI loops on Id and Iq produce voltage commands, and the inverse Park transform plus space-vector PWM gives six gate signals with dead time. Limits are the DC bus (peak phase voltage Vdc/√3), the thermal current limit and, above base speed, field weakening against back-EMF.",
  relatedLesson: "inverters-pwm-and-foc",
  Illustration: InverterIllustration,
};
