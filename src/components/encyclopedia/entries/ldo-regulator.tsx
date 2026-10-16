import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Epoxy, Flow, Heat, Lead, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const CX = 124;
const BASE = 150;
const PER_V = 18;
const LEADS = [
  { x: CX - 30, t: "GND" },
  { x: CX, t: "OUT" },
  { x: CX + 30, t: "IN" },
] as const;

function LdoIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  const vinH = 5 * PER_V;
  const voutH = 3.3 * PER_V;
  return (
    <PartCanvas title="AMS1117-3.3 linear regulator in a SOT-223 package, beside bars showing 5 volts in, 3.3 volts out and the 1.7 volt difference lost as heat">
      <Heat x={CX - 14} y={64} on={on} n={3} spacing={14} height={34} />
      {LEADS.map((l) => (
        <Lead key={l.t} x={l.x - 6} y={134} w={12} h={32} r={1} />
      ))}
      <rect x={CX - 20} y={70} width={40} height={20} rx={2} fill={part.metal} />
      <rect x={CX - 18} y={72} width={36} height={4} rx={2} fill={part.metalHi} opacity={0.8} />
      <Epoxy x={CX - 43} y={88} w={86} h={46} r={3} />
      <Mark x={CX} y={104} size={10.5} color="#ffffff">
        AMS1117
      </Mark>
      <Mark x={CX} y={120} size={10.5}>
        -3.3
      </Mark>
      <Flow points={[[CX + 30, 166], [CX + 30, 136]]} on={on} n={2} dur={1.2} r={2.6} />
      <Flow points={[[CX, 136], [CX, 166]]} on={on} n={2} dur={1.2} r={2.6} />
      {LEADS.map((l) => (
        <Label key={l.t} x={l.x} y={180} size={10} bold mono>
          {l.t}
        </Label>
      ))}
      <Note x={20} y={26} anchor="start" color={part.ink} size={11}>
        AMS1117-3.3
      </Note>
      <Note x={20} y={41} anchor="start" size={10}>
        SOT-223, 1 A
      </Note>
      <Note x={20} y={56} anchor="start" size={10}>
        dropout 1.1 V
      </Note>
      <line x1={184} y1={BASE} x2={306} y2={BASE} stroke={vizColors.muted} strokeWidth={1} />
      <rect x={196} y={BASE - vinH} width={30} height={vinH} rx={2} fill={vizColors.blue} />
      <rect x={256} y={BASE - voutH} width={30} height={voutH} rx={2} fill={vizColors.green} />
      <rect x={256} y={BASE - vinH} width={30} height={vinH - voutH} rx={2} fill={vizColors.orange} fillOpacity={0.3} stroke={vizColors.orange} strokeDasharray="3 2">
        <Anim on={on} name="fill-opacity" values="0.2;0.75;0.2" dur={1.6} />
      </rect>
      <Label x={211} y={BASE - vinH / 2} size={11} bold mono>
        5 V
      </Label>
      <Label x={271} y={BASE - voutH / 2} size={11} bold mono color="#0b0f17">
        3.3
      </Label>
      <Note x={271} y={BASE - vinH - 10} color={vizColors.orange} size={10.5} bold>
        1.7 V heat
      </Note>
      <Note x={211} y={BASE + 13} size={10.5}>
        Vin
      </Note>
      <Note x={271} y={BASE + 13} size={10.5}>
        Vout
      </Note>
      <Mark x={246} y={178} size={10}>
        P = (Vin − Vout) × I
      </Mark>
      <Mark x={246} y={192} size={10}>
        0.85 W at 0.5 A
      </Mark>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "ldo-regulator",
  name: "LDO regulator",
  category: "active",
  oneLiner: "A linear regulator that drops a higher input to a steady lower output, burning the difference as heat.",
  howItWorks: [
    "A low-dropout (LDO) regulator is a pass transistor controlled by an error amplifier that compares a divided copy of the output with an internal reference (a bandgap, about 1.2 V). If the output sags the amplifier opens the pass element further, and if it rises the amplifier closes it, so the pass element acts as a variable resistor in series with the load.",
    "Dissipation is P = (Vin − Vout) × Iload. An AMS1117-3.3 supplying 500 mA from 5 V dissipates 0.85 W, and in a SOT-223 with 60-90 °C/W that raises the junction by 50-75 °C. From 12 V the same load would dissipate 4.35 W, which a SOT-223 cannot handle.",
    "'Low dropout' means the minimum Vin − Vout for regulation is small: 1.1-1.3 V for the AMS1117, only 178 mV at 250 mA for an MCP1700, against about 2 V for the classic 7805. That is what lets an LDO run a 3.3 V rail from a 3.6-4.2 V lithium cell.",
    "The strengths are no switching noise, a tiny parts count (two capacitors), a quiet output (PSRR of 60-80 dB at low frequency, 10-50 µVrms noise for good parts) and fast transient response. The weakness is efficiency, which equals Vout/Vin: 66% for 3.3 V from 5 V and only 27% for 3.3 V from 12 V.",
    "Stability depends on the output capacitor. The AMS1117 wants at least 22 µF of tantalum, whose ESR keeps the loop stable, while modern LDOs accept 1-10 µF low-ESR ceramics. Always read the stable-ESR chart in the datasheet before choosing the output capacitor.",
  ],
  whereUsed: [
    "3.3 V and 1.8 V rails from 5 V for microcontrollers and sensors, such as the AMS1117-3.3 on cheap development boards.",
    "A post-regulator after a buck converter to clean the supply of an ADC reference, PLL, RF stage or audio chain.",
    "Battery-powered products that need microamp quiescent current to protect standby life, such as an MCP1700 at 1.6 µA.",
    "Local rails on mixed-signal boards, with one LDO per sensitive island.",
    "Isolating a noisy digital supply from a clean analog one without a magnetic component.",
  ],
  keySpecs: [
    { label: "Dropout voltage", value: "1.1-1.3 V (AMS1117); 0.18 V at 250 mA (MCP1700); about 2 V (7805)" },
    { label: "Output current", value: "1 A (AMS1117, thermally limited); 250 mA (MCP1700)" },
    { label: "Quiescent current Iq", value: "5-10 mA (AMS1117); 1.6 µA (MCP1700)" },
    { label: "Output accuracy", value: "±1-2% over temperature" },
    { label: "PSRR", value: "60-80 dB at low frequency, falling to about 30 dB at 1 MHz" },
    { label: "Packages", value: "SOT-223, SOT-23-5, TO-220, DFN" },
  ],
  failureModes: [
    "Thermal shutdown: with too large a Vin − Vout drop or too much current the regulator overheats and cycles in thermal limit, so the rail browns out under load. Calculate (Vin − Vout) × I against θJA before placing it.",
    "Oscillation with the wrong output capacitor: a low-ESR ceramic on an LDO that expects ESR can make it ring, visible as a noisy or sinusoidal output.",
    "Reverse current: with Vout above Vin (a backup supply, or Vin removed while the output is held up) current can flow backward through the pass element and destroy the part. Add a Schottky from output to input or pick a part with reverse-current protection.",
    "Dropout: as a battery sags toward Vout plus the dropout voltage, regulation is lost and ripple passes through. A 3.3 V rail from one lithium cell (3.0-4.2 V) needs an LDO with 0.2 V dropout or a buck-boost.",
  ],
  interviewTip:
    "Interviewer asks: \"When would you pick an LDO over a buck converter?\" A good answer: compare the losses. For 5 V to 3.3 V at 100 mA the LDO dissipates (5 − 3.3) × 0.1 = 170 mW, which is fine, with no EMI and two capacitors. At 12 V to 3.3 V and 1 A it is 8.7 W, impossible without a heatsink, so a buck at 85-95% efficiency wins. Mention noise-sensitive loads (ADC reference, RF, sensors) where an LDO follows the buck, and quote PSRR and dropout for battery designs.",
  relatedLesson: "active-components",
  Illustration: LdoIllustration,
};
