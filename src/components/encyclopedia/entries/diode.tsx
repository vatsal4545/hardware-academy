import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Lead, Leader, Note, PartCanvas, part, useAnimate } from "../shared";

function DiodeIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="1N4007 rectifier diode in a black DO-41 axial package with a silver cathode stripe, and its schematic symbol: current flows from anode to cathode">
      <Lead x={20} y={77} w={92} h={6} />
      <Lead x={208} y={77} w={92} h={6} />
      <rect x={108} y={60} width={104} height={40} rx={9} fill={part.epoxy} stroke={part.epoxyHi} />
      <rect x={116} y={63} width={88} height={5} rx={2.5} fill="#ffffff" opacity={0.08} />
      <rect x={186} y={60} width={14} height={40} fill={part.metal} />
      <rect x={188} y={60} width={4} height={40} fill={part.metalHi} opacity={0.8} />
      <Label x={146} y={70} size={12} color={part.ink} mono>
        1N4007
      </Label>
      <Flow points={[[24, 80], [296, 80]]} on={on} n={5} dur={2.4} />
      <Note x={62} y={56}>
        anode (A)
      </Note>
      <Note x={258} y={56}>
        cathode (K)
      </Note>
      <Note x={193} y={32} color={part.ink}>
        silver stripe = cathode
      </Note>
      <Leader from={[193, 38]} to={[193, 58]} />
      <g stroke={vizColors.text} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <line x1={118} y1={150} x2={146} y2={150} />
        <path d="M146 134 L146 166 L174 150 Z" />
        <line x1={174} y1={134} x2={174} y2={166} />
        <line x1={174} y1={150} x2={202} y2={150} />
      </g>
      <Label x={110} y={150} size={12} anchor="end" bold>
        A
      </Label>
      <Label x={210} y={150} size={12} anchor="start" bold>
        K
      </Label>
      <Flow points={[[120, 150], [200, 150]]} on={on} n={3} dur={2} r={2.4} />
      <Note x={160} y={184}>
        conducts at about 0.7 V forward, blocks in reverse
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "diode",
  name: "Diode",
  category: "semiconductor",
  oneLiner: "A one-way valve for current: a p-n junction that conducts above about 0.7 V forward (silicon) and blocks in reverse.",
  howItWorks: [
    "A diode is a p-n junction. Forward-biased above roughly 0.6-0.7 V (silicon) the depletion region shrinks and carriers cross, so current rises exponentially: I = Is·(e^(V/(n·Vt)) − 1), with Vt = 26 mV at room temperature. Reverse-biased, only a tiny leakage current (nanoamps to microamps) flows until the breakdown voltage is reached.",
    "The 1N4007 is the classic rectifier: 1 A average, 1000 V reverse, about 1 V drop at 1 A, in a DO-41 axial package. A silver stripe marks the cathode, and it matches the bar in the schematic symbol, so conventional current flows from the anode toward the bar.",
    "Rectifiers are slow. The 1N4007's reverse recovery time is about 30 µs, which is fine at 50 or 60 Hz mains but poor at 100 kHz and above, where fast-recovery (50-500 ns), ultrafast or Schottky diodes are needed. Small-signal diodes like the 1N4148 (100 V, 200 mA, trr 4 ns) are cheap fast switches for clamping and logic.",
    "Dissipation is Vf × If, so 1 A at 1 V is a full watt, enough to run an axial diode warm in free air. For 3 A use a 1N5408 (3 A, DO-201), and above that move to a heat-sinked or SMD power package.",
  ],
  whereUsed: [
    "Mains rectification: four 1N4007s in a bridge turn 12 V AC into DC, minus two diode drops.",
    "Reverse-polarity protection of a battery input (a series diode, or better a P-channel MOSFET to avoid the 0.7 V loss).",
    "Flyback (freewheel) diodes across relays, solenoids and motors to catch the inductive kick when the switch opens.",
    "Signal clamping, wired-OR logic and level protection with 1N4148 diodes.",
    "Peak detection and envelope detection in simple AM radios and sensor circuits.",
  ],
  keySpecs: [
    { label: "Forward voltage Vf", value: "0.6-0.7 V (small signal); about 1.0 V at 1 A (1N4007)" },
    { label: "Max reverse voltage Vr", value: "75-100 V (1N4148); 50-1000 V (1N4001-1N4007)" },
    { label: "Forward current If", value: "200 mA (1N4148); 1 A (1N4007); 3 A (1N5408)" },
    { label: "Reverse recovery trr", value: "4 ns (1N4148); about 30 µs (1N4007)" },
    { label: "Reverse leakage", value: "5 µA at 1000 V (1N4007); roughly doubles every 10 °C" },
    { label: "Packages", value: "DO-35 (1N4148), DO-41 (1N4007), SOD-123, SMA and SMB" },
  ],
  failureModes: [
    "Overcurrent or thermal overload: past its If rating, or on inrush into an empty capacitor bank, a diode usually fails shorted, which then puts full AC across the next stage.",
    "Reverse overvoltage beyond Vr drives avalanche breakdown and heat, and the part usually fails shorted. Mains spikes above 1 kV need design margin, a TVS or a varistor.",
    "Wrong type for the frequency: a 1N4007 in a 100 kHz switching supply has a long reverse recovery, which causes shoot-through current, heat and EMI.",
    "Installed backwards: the stripe is the cathode, and a reversed diode in a protection circuit conducts when it should block.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you check a diode with a multimeter, and what should you read?\" A good answer: use diode-test mode. Red on the anode and black on the cathode should read about 0.5-0.7 V for silicon and OL when reversed. A short (0 V both ways) or an open (OL both ways) means it has failed. A Schottky reads about 0.2-0.4 V and an LED lights faintly. Add that resistance mode rarely forward-biases the junction enough, and in-circuit readings can mislead because other paths are in parallel.",
  relatedLesson: "pn-junction-and-diodes",
  Illustration: DiodeIllustration,
};
