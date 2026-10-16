import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Mark, Note, PartCanvas, To92, part, useAnimate } from "../shared";

const CX = 100;
const TOP = 28;
const LEAD_TOP = TOP + 86;
const LEAD_END = 176;

function BjtIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="NPN bipolar transistor in a TO-92 package with emitter, base and collector leads: a small base current controls a larger collector current">
      <To92 cx={CX} top={TOP} leadEnd={LEAD_END} lines={["P2N2222A", "NPN"]} />
      <Flow points={[[CX, LEAD_END - 2], [CX, LEAD_TOP]]} on={on} n={1} dur={2.4} r={2.2} />
      <Flow points={[[CX + 20, LEAD_END - 2], [CX + 20, LEAD_TOP]]} on={on} n={3} dur={1.3} r={3} />
      <Flow points={[[CX - 20, LEAD_TOP], [CX - 20, LEAD_END - 2]]} on={on} n={4} dur={1.0} r={3} />
      {[
        { x: CX - 20, t: "E" },
        { x: CX, t: "B" },
        { x: CX + 20, t: "C" },
      ].map((p) => (
        <Label key={p.t} x={p.x} y={190} size={12} bold mono>
          {p.t}
        </Label>
      ))}
      <Mark x={190} y={44} anchor="start" size={16} color="#ffffff">
        IC = β × IB
      </Mark>
      <Note x={190} y={66} anchor="start" size={11}>
        β about 100-300
      </Note>
      <circle cx={194} cy={92} r={2.2} fill={part.current} />
      <Note x={204} y={92} anchor="start" size={10.5} color={vizColors.text}>
        IB: small
      </Note>
      <g fill={part.current}>
        <circle cx={190} cy={112} r={3} />
        <circle cx={198} cy={112} r={3} />
        <circle cx={206} cy={112} r={3} />
      </g>
      <Note x={216} y={112} anchor="start" size={10.5} color={vizColors.text}>
        IC: β times more
      </Note>
      <Mark x={190} y={140} anchor="start" size={11}>
        VBE about 0.65 V
      </Mark>
      <Mark x={190} y={158} anchor="start" size={11}>
        VCE(sat) 0.2 V
      </Mark>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "bjt",
  name: "BJT",
  category: "semiconductor",
  oneLiner: "A current-controlled current valve: a small base current lets a much larger collector current flow, used as a switch or an amplifier.",
  howItWorks: [
    "A bipolar junction transistor has three layers (NPN is n-p-n) and three terminals: emitter, base and collector. A small current into the base of an NPN, which forward-biases its base-emitter junction at about 0.65 V, injects carriers that cross the thin base into the collector, so IC = β × IB, with β of 100-300 for a 2N2222.",
    "As a switch, drive it into saturation by giving it a base current of at least IC/10 (a 'forced beta' of 10) so VCE(sat) drops to 0.1-0.3 V. To switch a 100 mA load from a 5 V logic pin: IB = 100 mA / 10 = 10 mA, so RB = (5 − 0.7) / 10 mA = 430 Ω, and 470 Ω is the nearest standard value.",
    "As an amplifier, bias it in the active region, where IC follows VBE exponentially (IC = IS·e^(VBE/VT)). The transconductance is gm = IC / 26 mV, which is 38 mS at 1 mA. This exponential law gives a BJT very high gain at low current, and is why bandgap references and temperature sensors are built from them.",
    "Common parts are the PN2222A (TO-92, 600 mA, 40 V), the 2N3904 (TO-92, 200 mA), the BC547 (100 mA, 45 V) and the MMBT3904 (SOT-23). TO-92 pinouts differ between families (E-B-C versus C-B-E), so always check the datasheet. PNP versions (2N2907, BC557) mirror the NPN, and Darlington pairs (TIP120) trade a higher saturation voltage for gain above 1000.",
  ],
  whereUsed: [
    "Low-side switch for relays, LEDs, buzzers and small motors driven from a microcontroller pin.",
    "Current mirrors and differential pairs inside op-amps and analog ICs.",
    "Small-signal audio and RF amplifiers, in common-emitter and emitter-follower stages.",
    "Level shifting, open-collector outputs and simple constant-current LED drivers.",
    "Bandgap references and temperature sensors, since VBE falls about 2 mV/°C.",
  ],
  keySpecs: [
    { label: "Current gain β (hFE)", value: "100-300 (PN2222A at 150 mA)" },
    { label: "Max collector current IC", value: "600 mA (PN2222A); 200 mA (2N3904); 100 mA (BC547)" },
    { label: "VCEO and VCE(sat)", value: "40 V maximum; 0.3 V at 150 mA with IB = 15 mA" },
    { label: "Base-emitter voltage", value: "0.65-0.7 V when on; falls about 2 mV/°C" },
    { label: "Transition frequency fT", value: "250-300 MHz (2N2222, 2N3904)" },
    { label: "Power dissipation", value: "625 mW (TO-92); 1.2 W (TO-18 metal can)" },
  ],
  failureModes: [
    "Under-driving a switch: with too little base current the transistor sits in the active region with several volts across it, and P = VCE × IC makes it hot even though it is 'on'. Size the base current for a forced beta of about 10.",
    "Thermal runaway: VBE falls as the transistor warms, so in an amplifier biased from a fixed voltage the collector current rises with heat. An emitter resistor adds negative feedback and cures it.",
    "Slow turn-off: a saturated BJT stores charge and takes hundreds of nanoseconds to microseconds to switch off, which limits switching speed. A speed-up capacitor helps, or use a MOSFET.",
    "Emitter-base breakdown: VEBO is only about 6 V, so driving the base more than that below the emitter damages the junction and permanently lowers β.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you pick the base resistor to drive an NPN as a switch?\" A good answer: start from the load current, assume a forced beta of 10 rather than the datasheet's 200 to guarantee saturation across parts and temperature, compute IB = IC/10, then RB = (Vdrive − 0.7) / IB, and check VCE(sat) × IC for dissipation. Add a 10 kΩ base-emitter pull-down so the transistor is off during reset, and contrast with a MOSFET, which is voltage-driven and has no continuous gate current.",
  relatedLesson: "transistors-bjt-mosfet",
  Illustration: BjtIllustration,
};
