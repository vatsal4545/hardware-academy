import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Leader, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

function ShuntIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Four-terminal current shunt: a milliohm alloy strip between two heavy terminals carries the current, while two small Kelvin sense pads feed a millivolt reading">
      <rect x={38} y={76} width={66} height={56} rx={4} fill={part.metal} />
      <rect x={216} y={76} width={66} height={56} rx={4} fill={part.metal} />
      <rect x={40} y={78} width={62} height={7} rx={3} fill={part.metalHi} opacity={0.7} />
      <rect x={218} y={78} width={62} height={7} rx={3} fill={part.metalHi} opacity={0.7} />
      <circle cx={62} cy={104} r={9} fill={part.bg} stroke={part.metalLo} strokeWidth={2} />
      <circle cx={258} cy={104} r={9} fill={part.bg} stroke={part.metalLo} strokeWidth={2} />
      <rect x={104} y={86} width={112} height={36} fill="#b4803f" />
      <rect x={104} y={86} width={112} height={7} fill="#e0b073" opacity={0.7} />
      <rect x={104} y={86} width={112} height={36} fill={vizColors.orange} opacity={0}>
        <Anim on={on} name="opacity" values="0;0.35;0" dur={2.2} />
      </rect>
      <Mark x={160} y={111} size={12} color="#2a1a08">
        10 mΩ
      </Mark>
      <rect x={108} y={66} width={10} height={12} rx={1} fill={part.metal} />
      <rect x={202} y={66} width={10} height={12} rx={1} fill={part.metal} />
      <path d="M113 66 V44 H132 M207 66 V44 H188" stroke={vizColors.cyan} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
      <rect x={130} y={26} width={60} height={34} rx={5} fill="#0e1424" stroke={vizColors.cyan} strokeWidth={1.4} />
      <Mark x={160} y={43} size={14} color={vizColors.cyan}>
        50 mV
      </Mark>
      <Flow points={[[24, 104], [296, 104]]} on={on} n={6} dur={2.4} r={3} />
      <Note x={50} y={150} size={10}>
        I = 5 A in
      </Note>
      <Note x={270} y={150} size={10}>
        5 A out
      </Note>
      <Note x={270} y={44} anchor="end" size={10} color={vizColors.cyan}>
        Kelvin sense
      </Note>
      <Leader from={[246, 48]} to={[212, 62]} color={vizColors.cyan} />
      <Mark x={160} y={166} size={11} color="#ffffff">
        V = I × R = 5 A × 10 mΩ
      </Mark>
      <Note x={160} y={184} size={10}>
        P = I²R = 0.25 W of heat
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "current-shunt",
  name: "Current shunt",
  category: "sensor",
  oneLiner: "A precision milliohm resistor that turns current into a small voltage you can measure, using V = I × R.",
  howItWorks: [
    "A shunt is a low-value, low-drift resistor (1-100 mΩ, usually a metal-alloy strip such as manganin or copper-nickel) placed in the current path. Measure the millivolts across it and Ohm's law gives the current: 10 mΩ passing 5 A drops 50 mV and dissipates P = I²R = 0.25 W.",
    "At milliohm levels a Kelvin (four-terminal) connection matters. Two large terminals carry the current and two tiny sense pads pick up the voltage right at the resistive element, so the resistance of solder and copper in the current path does not corrupt the reading. For scale, 10 mm of 1 mm-wide, 1 oz copper trace is about 5 mΩ, as large as the shunt itself.",
    "Low-side sensing (shunt between load and ground) is simple but lifts the load's ground and misses faults to ground. High-side sensing sees both, but the small signal rides on a large common-mode voltage and needs a current-sense amplifier (INA219 to 26 V, INA226 to 36 V, INA240 to 80 V). Gains of 20-100 V/V scale 50 mV into an ADC's 3.3 V range.",
    "Choose R so the full-scale drop is 50-100 mV, balancing resolution (amplifier offset of 10-100 µV) against power loss. A metal-strip part has a temperature coefficient of 20-75 ppm/°C against 100-200 ppm/°C for thick film, and low inductance (under 5 nH) matters when measuring fast PWM edges. EV packs use bulk shunts of about 100 µΩ for 500 A (50 mV, 25 W) with isolated amplifiers, or Hall sensors for isolation.",
  ],
  whereUsed: [
    "Motor-driver current limiting and torque control: a 10-50 mΩ shunt per phase or per bridge leg.",
    "Battery current measurement and coulomb counting in a BMS, with 0.5-5 mΩ shunts at 100-500 A.",
    "Power monitoring on development boards and meters, such as an INA219 module with a 100 mΩ shunt.",
    "Overcurrent protection in chargers, power supplies and hot-swap controllers.",
    "Solar charge controllers and bench supplies for current readback.",
  ],
  keySpecs: [
    { label: "Resistance", value: "0.1 mΩ to 100 mΩ, commonly 1-50 mΩ" },
    { label: "Power rating", value: "0.5-5 W for chip shunts (2512); 10-100 W and more for bulk strips" },
    { label: "Tolerance", value: "±0.5-1%; ±0.1% for precision parts" },
    { label: "Temperature coefficient", value: "±25-75 ppm/°C for metal-strip parts" },
    { label: "Full-scale drop", value: "50-100 mV typical" },
    { label: "Package", value: "0805-2512 chip, four-terminal Kelvin, bolt-on strips" },
  ],
  failureModes: [
    "Thermal drift and self-heating: a shunt running at its rated power warms by 40-100 °C and its resistance moves with the TCR. In a 100 A BMS that drift becomes a current error, and integrating it gives state-of-charge error.",
    "Poor Kelvin routing: sense traces that tap the current path inside the solder fillet, or share current with other loads, add 5-20% error. Route the sense lines as a differential pair to the sense pads.",
    "Noise and common-mode pickup: PWM edges couple into the high-impedance sense traces. A good amplifier CMRR and a small RC filter (10-100 Ω with 10-100 nF) help.",
    "Offset at low current: an amplifier offset of 50 µV on a 1 mΩ shunt is 50 mA of error, so low-current accuracy needs a larger R or an auto-zero amplifier.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you choose a shunt value for measuring 0-20 A in a motor driver?\" A good answer: pick the full-scale drop (say 100 mV), so R = 0.1 V / 20 A = 5 mΩ, then check power 20² × 5 mΩ = 2 W (use a 3 W 2512 or a larger part), TCR and inductance. Choose an amplifier with gain 33 so 100 mV maps to 3.3 V, check offset error (100 µV is 20 mA) and common-mode range, and use Kelvin routing. Then compare low-side, high-side and isolated Hall sensing.",
  relatedLesson: "inverters-pwm-and-foc",
  Illustration: ShuntIllustration,
};
