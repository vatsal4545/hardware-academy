import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Lead, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const BREAKDOWN = "M110 158 L109 188";

function ZenerIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Zener diode in a glass DO-35 package with a black cathode band, and its I-V curve: in reverse the voltage stays near 5.1 volts while the current changes">
      <Lead x={20} y={53} w={96} h={6} />
      <Lead x={204} y={53} w={96} h={6} />
      <rect x={112} y={38} width={96} height={36} rx={14} fill="#d9772b" opacity={0.9} />
      <rect x={116} y={46} width={30} height={20} rx={2} fill={part.metalLo} opacity={0.75} />
      <rect x={168} y={46} width={38} height={20} rx={2} fill={part.metalLo} opacity={0.75} />
      <rect x={146} y={49} width={22} height={14} fill="#262a36" />
      <rect x={120} y={41} width={80} height={5} rx={2.5} fill="#ffffff" opacity={0.28} />
      <rect x={186} y={38} width={10} height={36} fill="#0b0b0b" />
      <Flow points={[[296, 56], [24, 56]]} on={on} n={5} dur={2.4} />
      <Mark x={160} y={20} size={11}>
        BZX55C5V1  5.1 V  500 mW
      </Mark>
      <g stroke={vizColors.muted} strokeWidth={1.2} fill="none">
        <line x1={40} y1={150} x2={286} y2={150} />
        <line x1={200} y1={100} x2={200} y2={192} />
      </g>
      <path d="M200 150 L126 151 Q112 152 110 168 L109 190" stroke={vizColors.cyan} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M200 150 L212 149 Q219 146 221 132 L224 102" stroke={vizColors.cyan} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <circle cx={109.5} cy={174} r={4.5} fill={vizColors.amber}>
        {on && <animateMotion path={BREAKDOWN} dur="3s" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" repeatCount="indefinite" />}
      </circle>
      <Note x={286} y={140} anchor="end" size={10}>
        V
      </Note>
      <Note x={208} y={104} anchor="start" size={10}>
        I
      </Note>
      <Note x={100} y={140} anchor="end" color={vizColors.cyan} size={10.5}>
        Vz = 5.1 V
      </Note>
      <Note x={210} y={170} anchor="start" size={10}>
        current swings,
      </Note>
      <Note x={210} y={183} anchor="start" size={10}>
        voltage holds
      </Note>
      <Note x={232} y={116} anchor="start" size={10}>
        forward: 0.7 V
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "zener-diode",
  name: "Zener diode",
  category: "semiconductor",
  oneLiner: "A diode built to conduct in reverse at a precise breakdown voltage, giving a simple shunt reference and voltage clamp.",
  howItWorks: [
    "A Zener is a heavily doped diode whose reverse breakdown is sharp and repeatable at a voltage Vz: tunnelling below about 5 V, avalanche above about 7 V. Forward it behaves like any diode with a 0.7 V drop, but in reverse it conducts hard once the voltage reaches Vz and then holds that voltage almost constant while the current changes.",
    "A shunt regulator is a series resistor plus a Zener across the load: Rs = (Vin − Vz) / (Iload + Iz). With 12 V in, a 5.1 V Zener, a 20 mA load and 5 mA of Zener bias, Rs = 6.9 V / 25 mA ≈ 270 Ω. With the load removed, the Zener takes all 25.6 mA and dissipates 130 mW, which a 500 mW part handles comfortably.",
    "Stiffness is the dynamic impedance Zz: about 7 Ω for a 1N4733A at 49 mA and up to 60 Ω for a BZX55 at 5 mA, so a 10 mA change moves Vz by 70-600 mV. The temperature coefficient is about −2 mV/°C near 3.3 V, close to zero around 5-6 V and roughly +8 to +10 mV/°C near 12 V, which is why 5.6 V Zeners make the most stable references.",
    "Common parts are the 500 mW BZX55 series in a glass DO-35 and the 1 W 1N4733A series in DO-41, in E24 voltages from 2.4 V to 200 V at ±5% tolerance, plus 3 W and 5 W power types. Power derates above about 50 °C.",
  ],
  whereUsed: [
    "Clamping an MCU or ADC input: a 3.3 V Zener with a series resistor limits an input that could see more than the supply.",
    "A simple shunt regulator for low-current bias rails, such as 5.1 V for a reference or a gate supply.",
    "Gate-source protection of a MOSFET: a 15-18 V Zener across Vgs stops the gate oxide being overstressed (limit about 20 V).",
    "Level shifting and floating supplies, and reference voltages in older analog circuits.",
    "Crowbar and overvoltage trips that fire a thyristor or transistor when a rail goes too high.",
  ],
  keySpecs: [
    { label: "Zener voltage Vz", value: "2.4 V to 200 V (E24 series), ±2% to ±5%" },
    { label: "Test current Iz", value: "5 mA (BZX55); 49 mA (1N4733A, 5.1 V)" },
    { label: "Power rating Pd", value: "0.5 W (DO-35), 1 W (DO-41), 3-5 W power types" },
    { label: "Dynamic impedance Zz", value: "7 Ω (1N4733A at 49 mA) to 60 Ω (BZX55 at 5 mA)" },
    { label: "Temperature coefficient", value: "−2 mV/°C at 3.3 V; about 0 at 5-6 V; +8 to +10 mV/°C at 12 V" },
  ],
  failureModes: [
    "Overpower: P = Vz × Iz, so if the input rises or the load disconnects, all the series-resistor current goes through the Zener. A 0.5 W part at 5.1 V can take only about 98 mA before it fails, usually shorted.",
    "Poor regulation: dynamic impedance and temperature drift move Vz by hundreds of millivolts over load and temperature, which is unacceptable for an ADC reference. Use a reference IC such as the TL431 or LM4040 instead.",
    "Noise: avalanche Zeners above about 6 V generate broadband noise of tens of microvolts, so do not use a raw Zener as an audio or sensor reference without a bypass capacitor.",
    "Below the knee current the Zener does not regulate, and the voltage can sag 10-20% under its nominal value at light bias.",
  ],
  interviewTip:
    "Interviewer asks: \"How would you make a 5.1 V rail from 12 V for a 20 mA load with a Zener, and what can go wrong?\" A good answer: Rs = (12 − 5.1) / (20 mA + 5 mA) ≈ 270 Ω; at no load the Zener sees 25.6 mA, so 130 mW, which a 500 mW part tolerates. Then name the weaknesses: load regulation set by Zz, no-load dissipation, only about 33% efficiency, and supply ripple passing through. Conclude that above a few milliamps you use an LDO or a TL431 instead.",
  relatedLesson: "pn-junction-and-diodes",
  Illustration: ZenerIllustration,
};
