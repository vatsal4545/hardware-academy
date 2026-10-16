import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Note, PartCanvas, part, round, useAnimate } from "../shared";

const CX = 160;
const CY = 94;
const RING = `M${CX - 92} ${CY} a92 50 0 1 0 184 0 a92 50 0 1 0 -184 0 Z M${CX - 40} ${CY} a40 20 0 1 1 80 0 a40 20 0 1 1 -80 0 Z`;

// Wire turns over 300 degrees of the ring, leaving a gap at the front where the leads leave.
const TURNS = Array.from({ length: 27 }, (_, i) => {
  const a = ((120 + i * 11.5) * Math.PI) / 180;
  return { x1: round(CX + 34 * Math.cos(a)), y1: round(CY + 17 * Math.sin(a)), x2: round(CX + 97 * Math.cos(a)), y2: round(CY + 53 * Math.sin(a)) };
});

function InductorIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Toroidal inductor: copper wire wound around a ferrite ring, with magnetic flux circulating inside the core">
      <path d={RING} transform="translate(0 9)" fill="#2a2f3a" fillRule="evenodd" />
      <path d={RING} fill="#4b5262" fillRule="evenodd" />
      <path d={RING} fill="none" stroke="#6a7286" strokeWidth={1} fillRule="evenodd" />
      {TURNS.map((t, i) => (
        <g key={i} strokeLinecap="round">
          <line x1={t.x1} y1={t.y1 + 1.5} x2={t.x2} y2={t.y2 + 1.5} stroke="#6b3d16" strokeWidth={6} />
          <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={vizColors.copper} strokeWidth={4.4} />
        </g>
      ))}
      <path d="M112 146 L82 188 M208 146 L238 188" stroke={part.metal} strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={CX} cy={CY} rx={66} ry={34.5} fill="none" stroke={vizColors.cyan} strokeWidth={2.6} strokeDasharray="11 9" opacity={0.95}>
        <Anim on={on} name="stroke-dashoffset" values="0;-40" dur={2} />
      </ellipse>
      <Label x={CX} y={CY} size={17} color={vizColors.cyan} bold>
        Φ
      </Label>
      <Flow points={[[82, 188], [112, 146]]} on={on} n={2} dur={1.4} />
      <Flow points={[[238, 188], [208, 146]]} on={on} n={2} dur={1.4} reverse />
      <Note x={20} y={24} anchor="start" color={part.ink} size={11}>
        Toroid wound on ferrite
      </Note>
      <Note x={20} y={39} anchor="start" size={10}>
        L = N² · AL
      </Note>
      <Note x={300} y={24} anchor="end" color={vizColors.cyan} size={10}>
        flux stays in the core
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "inductor",
  name: "Inductor",
  category: "passive",
  oneLiner: "A coil of wire that stores energy in a magnetic field and resists changes in current (V = L·di/dt).",
  howItWorks: [
    "Current through a coil makes a magnetic field, and a changing current induces a voltage that opposes the change: V = L·di/dt. A 10 µH inductor whose current changes at 1 A/µs has 10 V across it, and the stored energy is E = ½·L·I², so 10 µH carrying 2 A holds 20 µJ.",
    "Winding the coil on a ferrite or powdered-iron core multiplies the inductance, but introduces saturation. Above the saturation current the core can hold no more flux, the inductance collapses (often by 30% at Isat), and current ramps almost unopposed until something overheats.",
    "Two current ratings appear on every datasheet: Irms, the heating rating (usually the current that raises the part 40 °C), and Isat, the current where inductance drops 20-30%. Choose a power inductor whose Isat exceeds the converter's peak current (load current plus half the ripple) by at least 20%.",
    "In a buck converter the inductor turns pulsed input into a smooth load current. Ripple current is ΔI = (Vin − Vout) × D / (f × L), and a common design rule sets ΔI to 20-40% of the load current. Shielded SMD power inductors (for example 4.7 µH, 3 A in 4 × 4 mm) leak less flux into nearby traces and sensors than unshielded ones.",
  ],
  whereUsed: [
    "Buck and boost converters, using 1-100 µH power inductors rated 1-10 A.",
    "LC and π filters on supply and audio lines, and common-mode chokes on USB and mains inputs.",
    "Motor windings and relay coils are inductors, which is why every switched inductive load needs a flyback diode or snubber.",
    "Wireless charging and NFC antennas, which are flat printed or wound coils.",
    "RF matching networks, using air-core parts in the nanohenry range.",
  ],
  keySpecs: [
    { label: "Inductance", value: "1 nH (RF) to 10 mH (chokes); 1-100 µH for power" },
    { label: "Saturation current Isat", value: "Where L falls by 20-30%; 1-30 A for SMD power parts" },
    { label: "Rated current Irms", value: "Heating limit at ΔT = 40 °C, usually a bit higher than Isat" },
    { label: "DC resistance DCR", value: "5-500 mΩ; sets the I²R loss" },
    { label: "Self-resonant frequency", value: "5 MHz to over 1 GHz, depending on size and winding" },
    { label: "Tolerance", value: "±20% power inductors, ±2-5% RF parts" },
  ],
  failureModes: [
    "Saturation: past Isat the inductance collapses, current spikes and the switch (or the inductor itself) overheats. It is often triggered at start-up or a load step rather than in steady state, and Isat falls when the part is hot.",
    "Inductive kick: opening a switch in series with an inductor produces V = L·di/dt, hundreds of volts across a relay coil with no flyback diode. The spike usually kills the driving transistor.",
    "Audible noise: magnetostriction and low-frequency burst modes make light-load buck converters whine; glue or a different core material helps.",
    "Stray coupling: an unshielded inductor radiates and couples into nearby traces, Hall sensors and analog inputs.",
  ],
  interviewTip:
    "Interviewer asks: \"What happens when an inductor saturates, and how do you avoid it in a buck converter?\" A good answer: past Isat the core cannot carry more flux, so L drops sharply, di/dt rises and the peak current runs away until the switch's current limit or thermal shutdown steps in. Avoid it by taking peak current as Iload + ΔI/2 at the worst-case input voltage and temperature, then picking Isat at least 20-30% above that, or using a soft-saturating powder-core part.",
  relatedLesson: "passive-components",
  Illustration: InductorIllustration,
};
