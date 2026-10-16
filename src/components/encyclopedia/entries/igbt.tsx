import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Epoxy, Flow, Lead, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const CX = 92;
const LEADS = [
  { x: CX - 27, t: "G" },
  { x: CX, t: "C" },
  { x: CX + 27, t: "E" },
] as const;

// Collector current at turn-off: an IGBT keeps a slow "tail" after the fast drop, a MOSFET does not.
const TAIL = "M186 72 H224 L230 106 C238 122 254 132 272 139 L298 140";
const FAST = "M186 72 H224 L227 140 H298";

function IgbtIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="IGBT in a TO-247 package with gate, collector and emitter leads, beside a plot of its turn-off current showing the slow tail that a MOSFET does not have">
      {LEADS.map((l) => (
        <Lead key={l.t} x={l.x - 3.5} y={128} w={7} h={50} r={1} />
      ))}
      <rect x={CX - 44} y={14} width={88} height={50} rx={4} fill={part.metal} />
      <rect x={CX - 40} y={17} width={80} height={6} rx={3} fill={part.metalHi} opacity={0.8} />
      <circle cx={CX} cy={36} r={8} fill={part.bg} stroke={part.metalLo} strokeWidth={2} />
      <Epoxy x={CX - 44} y={62} w={88} h={68} r={3} />
      <Mark x={CX} y={84} size={11} color="#ffffff">
        IKW40N65
      </Mark>
      <Mark x={CX} y={102} size={9.5}>
        650 V  40 A
      </Mark>
      <Mark x={CX} y={118} size={9.5}>
        TO-247
      </Mark>
      <Flow points={[[CX, 176], [CX, 130]]} on={on} n={3} dur={1.2} r={2.8} />
      <Flow points={[[CX + 27, 130], [CX + 27, 176]]} on={on} n={3} dur={1.2} r={2.8} />
      {LEADS.map((l) => (
        <Label key={l.t} x={l.x} y={190} size={12} bold mono>
          {l.t}
        </Label>
      ))}
      <rect x={176} y={26} width={132} height={132} rx={6} fill="#0f1626" stroke={vizColors.grid} />
      <Note x={242} y={42} size={10} color={part.ink}>
        collector current at turn-off
      </Note>
      <g stroke={vizColors.muted} strokeWidth={1} fill="none">
        <line x1={186} y1={141} x2={300} y2={141} />
        <line x1={186} y1={58} x2={186} y2={141} />
      </g>
      <path d="M230 106 C238 122 254 132 272 139 L230 140 Z" fill={vizColors.red} opacity={0.4} />
      <path d={FAST} stroke={vizColors.muted} strokeWidth={1.6} strokeDasharray="4 3" fill="none" />
      <path d={TAIL} stroke={vizColors.cyan} strokeWidth={2.6} fill="none" strokeLinejoin="round" />
      <circle r={4.5} fill={vizColors.amber} cx={on ? undefined : 186} cy={on ? undefined : 72}>
        {on && <animateMotion path={TAIL} dur="3s" repeatCount="indefinite" />}
      </circle>
      <Note x={300} y={96} anchor="end" size={9.5} color={vizColors.red}>
        tail = loss
      </Note>
      <Note x={300} y={152} anchor="end" size={9.5}>
        MOSFET: no tail
      </Note>
      <Mark x={242} y={174} size={10}>
        VCE(sat) about 1.7 V
      </Mark>
      <Mark x={242} y={188} size={10}>
        fsw 5-30 kHz
      </Mark>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "igbt",
  name: "IGBT",
  category: "semiconductor",
  oneLiner: "A power switch with a MOSFET's voltage-driven gate and a bipolar transistor's low conduction loss at high voltage and current.",
  howItWorks: [
    "An IGBT (insulated-gate bipolar transistor) is a MOSFET gate driving a PNP bipolar stage. The MOS gate turns the device on, and the p+ collector injects holes into the lightly doped drift region, flooding it with carriers (conductivity modulation). That keeps the on-state voltage near 1.5-2.5 V even at 600-1700 V blocking, where a silicon MOSFET's Rds(on) would be enormous.",
    "On-state loss is roughly VCE(sat) × I, a fixed voltage drop plus a small resistance, rather than I²R. IGBTs therefore win at high voltage and current: a 650 V part with VCE(sat) of 1.7 V dissipates 1.7 × 40 A = 68 W conducting 40 A, where a silicon MOSFET of the same voltage rating would lose several times more.",
    "The cost is turn-off speed. When the gate turns off, the stored carriers can only leave by recombination, producing a tail current that lasts 0.2-1 µs and adds turn-off energy (Eoff). That limits switching frequency: motor drives run at roughly 4-16 kHz, and even fast 650 V parts top out around 50-100 kHz.",
    "Gate drive is +15 V on and 0 to −8 V off through a 5-20 Ω gate resistor. An IGBT has no body diode, so modules and most discretes co-pack a fast anti-parallel diode to carry freewheeling current. Discretes come in TO-247 (650 V, 40-75 A) and modules (EconoPACK, HybridPACK) go to 100-800 A.",
  ],
  whereUsed: [
    "Industrial motor drives and servo drives in the 1200 V class, switching at 5-16 kHz.",
    "Traction inverters in trains and in many EVs, though SiC MOSFETs are replacing them in new 800 V designs.",
    "Welding machines, induction heating and UPS inverters in the 5-100 kW range.",
    "Solar and wind inverters, and induction cooker half-bridges using 650-1350 V parts.",
    "Power-factor correction and grid-tied converters above a few kilowatts.",
  ],
  keySpecs: [
    { label: "Collector-emitter voltage VCES", value: "600 V, 650 V, 1200 V and 1700 V are common classes" },
    { label: "Collector current IC", value: "20-800 A (discretes 40-75 A, modules up to 800 A)" },
    { label: "VCE(sat)", value: "1.5-2.5 V at rated current" },
    { label: "Switching speed", value: "Turn-off tail 0.2-1 µs; fsw about 5-30 kHz in drives" },
    { label: "Gate drive", value: "+15 V on, 0 to −8 V off; VGE(max) ±20 V" },
    { label: "Short-circuit withstand", value: "3-10 µs at 15 V gate drive (needs desaturation protection)" },
  ],
  failureModes: [
    "Short circuit: an IGBT survives only 3-10 µs of short-circuit current, so the gate driver needs desaturation detection that shuts it off inside that window. Without it the device overheats and ruptures.",
    "Latch-up of the parasitic thyristor at excess current or dv/dt: the gate loses control and the device cannot turn off. Modern designs make this rare, but it sets the safe operating area.",
    "Thermal cycling: bond wires and solder layers fatigue under repeated 50-100 K junction temperature swings. Wire lift-off and delamination are the main wear-out modes in traction inverters.",
    "Parasitic turn-on (Miller effect): high dv/dt on the collector injects current through the gate-collector capacitance and can partially turn on the opposite device. A negative gate-off voltage or a Miller clamp prevents it.",
  ],
  interviewTip:
    "Interviewer asks: \"Why do traction inverters use IGBTs, or now SiC, rather than silicon MOSFETs at 400-800 V?\" A good answer: a silicon MOSFET's Rds(on) grows roughly with the 2.5th power of its voltage rating, so conduction loss explodes above a few hundred volts. An IGBT injects carriers and holds VCE(sat) near 1.5-2 V, at the price of a turn-off tail and a frequency ceiling of a few tens of kHz. SiC MOSFETs now give low Rds(on) at 1200 V and fast switching, which is why 800 V EVs are moving to them.",
  relatedLesson: "power-semiconductors",
  Illustration: IgbtIllustration,
};
