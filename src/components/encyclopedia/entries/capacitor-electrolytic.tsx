import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Heat, Lead, Leader, Note, PartCanvas, part, pathOf, useAnimate, type Pt } from "../shared";

/** Two interleaved foils rolled into a spiral, seen from the top of the can. */
function spiral(cx: number, cy: number, phase: number): string {
  const pts: Pt[] = [];
  for (let t = 0; t <= 12.4; t += 0.2) pts.push([cx + (5 + 2.3 * t) * Math.cos(t + phase), cy + (5 + 2.3 * t) * Math.sin(t + phase)]);
  return pathOf(pts);
}

function ElectrolyticCapacitorIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Radial aluminium electrolytic capacitor with a negative stripe, a vented top, a longer positive lead and a rolled-foil cutaway">
      <Lead x={140} y={150} w={5} h={34} r={1} />
      <Lead x={172} y={150} w={5} h={42} r={1} />
      <rect x={116} y={50} width={84} height={102} rx={6} fill="#1d3f8f" />
      <rect x={116} y={50} width={24} height={102} rx={6} fill="#cfd6e3" />
      {[76, 96, 116].map((y) => (
        <Label key={y} x={128} y={y} size={16} color="#1d3f8f" bold>
          −
        </Label>
      ))}
      <rect x={116} y={141} width={84} height={11} rx={4} fill="#0d1d4a" />
      <ellipse cx={158} cy={52} rx={42} ry={9} fill={part.metal} stroke={part.metalLo} />
      <path d="M144 52 L158 50 L172 52 M158 50 V56" stroke={part.metalLo} strokeWidth={1.4} fill="none" />
      <line x1={117} y1={64} x2={199} y2={64} stroke="#0d1d4a" strokeWidth={2} />
      <Label x={168} y={103} size={12} color="#ffffff" mono rotate={-90}>
        1000µF 25V
      </Label>
      <Flow points={[[174.5, 190], [174.5, 152]]} on={on} n={3} dur={1.6} />
      <Flow points={[[142.5, 152], [142.5, 182]]} on={on} n={3} dur={1.6} />
      <Heat on={on} x={140} y={44} n={3} spacing={18} height={26} />
      <Note x={110} y={96} anchor="end" size={10}>
        stripe marks
      </Note>
      <Note x={110} y={108} anchor="end" size={10}>
        the negative lead
      </Note>
      <Leader from={[112, 102]} to={[121, 102]} />
      <circle cx={254} cy={106} r={44} fill="#0f1626" stroke={vizColors.muted} strokeWidth={1} strokeDasharray="3 3" />
      <path d={spiral(254, 106, 0)} stroke={part.metal} strokeWidth={2.4} fill="none" />
      <path d={spiral(254, 106, Math.PI)} stroke={vizColors.copper} strokeWidth={2.4} fill="none" />
      <circle cx={254} cy={106} r={3.4} fill={part.bg} />
      <Note x={254} y={166} size={10}>
        rolled foils, paper
      </Note>
      <Note x={254} y={180} size={10}>
        and electrolyte
      </Note>
      <Note x={20} y={24} anchor="start" color={part.ink} size={11}>
        Radial can, 105 °C
      </Note>
      <Note x={20} y={38} anchor="start" size={10}>
        long lead is +
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "capacitor-electrolytic",
  name: "Electrolytic capacitor",
  category: "passive",
  oneLiner: "A polarised can capacitor that packs hundreds to thousands of microfarads into a small volume, at the price of ESR, leakage and a finite life.",
  howItWorks: [
    "An aluminium electrolytic is a rolled sandwich: an etched aluminium anode foil carrying a thin oxide layer (the dielectric, formed electrochemically and only nanometres thick), a paper spacer soaked in liquid electrolyte, and a cathode foil. Etching multiplies the foil's surface area by 20-100 times, which is where the large capacitance comes from.",
    "The oxide is only stable with the correct polarity. A stripe on the sleeve marks the negative lead, and on new through-hole parts the positive lead is longer. Reverse the voltage and the oxide is stripped away, leakage rises, the electrolyte heats and gasses, and the can vents through its scored top.",
    "ESR matters as much as capacitance: 0.05-5 Ω for standard parts against a few mΩ for polymer or ceramic types. Ripple current heats the part (P = I²·ESR), and evaporation of the electrolyte roughly halves the life for every 10 °C rise: a part rated 2000 h at 105 °C lasts about 32 000 h at 65 °C.",
    "Typical sizes run from 5 × 11 mm radial cans (10-1000 µF at 10-50 V) to 35 mm snap-in cans for mains bulk storage (400 V, 470 µF). Surface-mount versions are 'V-chip' cans 4-10 mm in diameter. Polymer and hybrid types swap the liquid for a conductive polymer, giving lower ESR and a much longer life.",
  ],
  whereUsed: [
    "Bulk storage on power-supply rails, at a buck converter's output or after a rectifier, for example 1000 µF at 25 V.",
    "Motor-driver boards: a 470-1000 µF capacitor near the H-bridge supplies current spikes and absorbs regenerative energy.",
    "Audio coupling and filtering where microfarad-range values are needed in a small space.",
    "DC-link of mains and drive power supplies, where 400 V electrolytics sit beside film capacitors.",
  ],
  keySpecs: [
    { label: "Capacitance", value: "1 µF to 100 000 µF" },
    { label: "Voltage rating", value: "6.3 V to 450 V; use at 80% of rating or less" },
    { label: "Tolerance", value: "±20% typical" },
    { label: "ESR", value: "0.05-5 Ω at 100 kHz (polymer types 5-30 mΩ)" },
    { label: "Ripple current", value: "0.3-5 A rms depending on size" },
    { label: "Life", value: "1 000-10 000 h at 85-105 °C, doubling for each 10 °C cooler" },
  ],
  failureModes: [
    "Reverse polarity or overvoltage builds gas pressure: the top bulges or vents and, in the worst case, ruptures with hot electrolyte. Mark polarity clearly on the silkscreen.",
    "Dry-out: electrolyte slowly evaporates, ESR climbs and capacitance falls. A supply that is 'noisy after five years' often has an electrolytic past its end of life, usually with a bulging top.",
    "Cold: below −20 °C liquid electrolytes thicken and ESR can rise by 10-50 times, so a rail that is stable in the lab may oscillate in a cold vehicle.",
    "Leakage and charge storage: leakage is about 0.01·C·V µA, so a large part can drain a standby battery and can also hold a dangerous charge long after power is removed.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you choose the bulk capacitor on a motor driver's supply?\" A strong answer: estimate the ripple current and the allowed ripple voltage (ΔV = I·Δt / C), take a voltage rating with 50% margin for transients (a 25 V part on a 12 V rail), check the ripple-current and ESR ratings at the switching frequency, and add a 100 nF ceramic in parallel because the electrolytic's ESL makes it ineffective above a few hundred kHz. Mention the 105 °C life and placing it close to the bridge.",
  relatedLesson: "passive-components",
  Illustration: ElectrolyticCapacitorIllustration,
};
