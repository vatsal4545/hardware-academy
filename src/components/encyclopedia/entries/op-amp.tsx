import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Epoxy, Lead, Mark, Note, PartCanvas, ScrollClip, part, sinePath, useAnimate } from "../shared";

const CX = 215;
const ROWS = [60, 88, 116, 144] as const;
const LEFT = ["OUT1", "IN1−", "IN1+", "GND"] as const;
const RIGHT = ["V+", "OUT2", "IN2−", "IN2+"] as const;

function OpAmpIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="LM358 dual op-amp in an eight-pin DIP package with a small input wave on the left and a larger amplified output wave">
      {ROWS.map((y) => (
        <g key={y}>
          <Lead x={CX - 49} y={y - 3.5} w={14} h={7} r={1} />
          <Lead x={CX + 35} y={y - 3.5} w={14} h={7} r={1} />
        </g>
      ))}
      <Epoxy x={CX - 35} y={44} w={70} h={112} r={4} />
      <path d={`M${CX - 8} 44 A8 8 0 0 0 ${CX + 8} 44 Z`} fill={part.bg} stroke={part.epoxyHi} />
      <circle cx={CX - 26} cy={52} r={2.4} fill="#46506a" />
      {ROWS.map((y, i) => (
        <g key={y}>
          <Mark x={CX - 30} y={y} anchor="start" size={8} color={part.ink}>
            {LEFT[i]}
          </Mark>
          <Mark x={CX + 30} y={y} anchor="end" size={8} color={part.ink}>
            {RIGHT[i]}
          </Mark>
        </g>
      ))}
      <Mark x={CX} y={102} size={13} color="#ffffff">
        LM358
      </Mark>
      <line x1={110} y1={60} x2={CX - 49} y2={60} stroke={vizColors.green} strokeWidth={2} />
      <line x1={110} y1={116} x2={CX - 49} y2={116} stroke={vizColors.cyan} strokeWidth={2} />
      <ScrollClip x={22} y={42} w={88} h={36} period={24} dur={1.2} on={on}>
        <path d={sinePath(22, 134, 60, 14, 24)} stroke={vizColors.green} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <ScrollClip x={22} y={100} w={88} h={32} period={24} dur={1.2} on={on}>
        <path d={sinePath(22, 134, 116, 5, 24)} stroke={vizColors.cyan} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <Label x={22} y={32} size={11} anchor="start" color={vizColors.green} bold>
        Vout
      </Label>
      <Label x={22} y={136} size={11} anchor="start" color={vizColors.cyan} bold>
        Vin
      </Label>
      <Mark x={20} y={172} anchor="start" size={10.5} color="#ffffff">
        gain = 1 + Rf / Rg
      </Mark>
      <Note x={CX} y={178} size={10}>
        GBW 1 MHz, slew 0.3 V/µs
      </Note>
      <Note x={CX} y={192} size={10}>
        3-32 V single supply
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "op-amp",
  name: "Op-amp",
  category: "active",
  oneLiner: "A high-gain differential amplifier that, with negative feedback, gives precise gain, filtering and signal conditioning.",
  howItWorks: [
    "An op-amp amplifies the difference between its two inputs, V+ − V−, by a huge open-loop gain A (100 000 or more at DC). With negative feedback the output moves until the difference between the inputs is nearly zero, so the circuit's gain is set by the feedback resistors alone and not by the amplifier.",
    "Two golden rules describe an ideal op-amp in feedback: the inputs draw no current, and the inputs sit at the same voltage (a virtual short). Non-inverting gain is 1 + Rf/Rg, so Rf = 90 kΩ and Rg = 10 kΩ give a gain of 10, and inverting gain is −Rf/Rin.",
    "Real op-amps are limited. The gain-bandwidth product (1 MHz for an LM358, 3 MHz for a TL072, over 100 MHz for fast parts) means a gain of 10 leaves 100 kHz of bandwidth. Slew rate (0.3 V/µs for an LM358) limits large signals: a 5 V amplitude sine at 10 kHz needs 2π·f·V = 0.31 V/µs, right at that limit.",
    "Input offset voltage (2 mV typical for an LM358, under 100 µV for precision parts) is multiplied by the gain, so 2 mV at a gain of 100 is 200 mV at the output. Input bias current (45 nA for the LM358's bipolar inputs) flowing through large resistors adds further error.",
    "A single-supply part like the LM358 has an input range that includes ground and an output that swings to within about 20 mV of ground but only to about V+ − 1.5 V at the top. Rail-to-rail parts (MCP6002, TLV9002) swing to within millivolts of both rails.",
  ],
  whereUsed: [
    "Sensor signal conditioning: amplifying a thermocouple, strain gauge or shunt voltage, with an instrumentation amplifier built from three op-amps.",
    "Active filters such as a 1 kHz Sallen-Key low-pass, and anti-alias filters ahead of an ADC.",
    "Comparators and Schmitt triggers (open loop), and unity-gain buffers that isolate a high-impedance source.",
    "Current-sense stages on motor drivers, with a gain of 20-50 on a 10 mΩ shunt.",
    "Audio preamps, analog PID error amplifiers and DAC output buffers.",
  ],
  keySpecs: [
    { label: "Gain-bandwidth product", value: "1 MHz (LM358), 3 MHz (TL072), 100 MHz and up (high speed)" },
    { label: "Slew rate", value: "0.3 V/µs (LM358), 13 V/µs (TL072)" },
    { label: "Input offset voltage", value: "2 mV typical (LM358); about 10 µV for chopper-stabilised parts" },
    { label: "Input bias current", value: "45 nA (LM358, bipolar); 65 pA (TL072, JFET)" },
    { label: "Supply range", value: "3-32 V single (LM358); 1.8-5.5 V for low-voltage rail-to-rail" },
    { label: "Packages", value: "DIP-8, SOIC-8, SOT-23-5; dual and quad versions" },
  ],
  failureModes: [
    "Instability with capacitive loads or too much speed: an op-amp driving a long cable or a capacitor can oscillate. A 10-100 Ω isolation resistor at the output or a small feedback capacitor restores phase margin.",
    "Output saturation and phase reversal: some JFET-input parts such as the older TL07x invert when an input leaves the common-mode range, which can latch a control loop in the wrong direction. Check the input range.",
    "Offset and bias-current drift: a 100 kΩ source with 45 nA of bias current develops 4.5 mV, which a gain of 100 turns into 450 mV and drives a sensor chain into saturation.",
    "Input overvoltage: exceeding the supply by more than about 0.3 V without current limiting turns on the ESD diodes and can latch the part up. Protect inputs with a series resistor of 1-10 kΩ and clamps.",
  ],
  interviewTip:
    "Interviewer asks: \"How would you build a non-inverting amplifier with a gain of 11, and what bandwidth will it have?\" A good answer: gain = 1 + Rf/Rg, so Rf = 10 kΩ and Rg = 1 kΩ. Closed-loop bandwidth is about GBW divided by gain, so with an LM358 (1 MHz) that is roughly 91 kHz. Then mention input offset (2 mV × 11 = 22 mV), bias-current error, the output swing near the rails, and a small series resistor or compensation capacitor if the load is capacitive.",
  relatedLesson: "active-components",
  Illustration: OpAmpIllustration,
};
