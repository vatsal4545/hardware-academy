import { Arrow, Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Lead, Note, PartCanvas, useAnimate } from "../shared";

const BANDS = [
  { x: 118, color: "#7b3f14", label: "1" },
  { x: 138, color: "#0a0a0a", label: "0" },
  { x: 158, color: "#f08a24", label: "×1k" },
  { x: 192, color: "#d9b43a", label: "±5%" },
] as const;

function ResistorIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Axial through-hole resistor with brown, black, orange and gold colour bands: 10 kilohms, 5 percent tolerance">
      <Lead x={20} y={97} w={94} h={6} />
      <Lead x={206} y={97} w={94} h={6} />
      <rect x={96} y={82} width={128} height={36} rx={15} fill="#d9bf8c" />
      <rect x={108} y={86} width={104} height={5} rx={2.5} fill="#ffffff" opacity={0.28} />
      <rect x={108} y={110} width={104} height={5} rx={2.5} fill="#000000" opacity={0.14} />
      {BANDS.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={82} width={9} height={36} fill={b.color} />
          <line x1={b.x + 4.5} y1={80} x2={b.x + 4.5} y2={72} stroke={vizColors.muted} strokeWidth={0.9} opacity={0.7} />
          <Label x={b.x + 4.5} y={63} size={11} color={vizColors.muted}>
            {b.label}
          </Label>
        </g>
      ))}
      <rect x={96} y={82} width={128} height={36} rx={15} fill={vizColors.orange} opacity={0}>
        <Anim on={on} name="opacity" values="0;0.4;0" dur={2.4} />
      </rect>
      <Flow points={[[24, 100], [296, 100]]} on={on} n={5} dur={2.4} />
      <Arrow x1={28} y1={74} x2={66} y2={74} color={vizColors.amber} width={1.6} head={7} />
      <Note x={47} y={60} color={vizColors.amber} size={13} bold>
        I
      </Note>
      <Label x={160} y={148} size={15} bold mono>
        10 kΩ ±5%
      </Label>
      <Note x={160} y={168}>
        brown, black, orange, gold: 1 0 ×1000 ±5%
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "resistor",
  name: "Resistor",
  category: "passive",
  oneLiner: "Resists current in proportion to voltage (V = I × R), setting currents, dividing voltages and turning the rest into heat.",
  howItWorks: [
    "A resistor is a controlled obstacle to current. A carbon-film, metal-film or thick-film layer (or a length of resistance wire) sits between two terminals, and the voltage across it is V = I × R. A 10 kΩ resistor with 5 V across it passes 0.5 mA and dissipates P = V²/R = 2.5 mW.",
    "Through-hole axial parts show their value as colour bands. On a 4-band part the first two bands are digits, the third is the multiplier and the fourth the tolerance, so brown-black-orange-gold reads 1, 0, ×1000, ±5%, which is 10 kΩ. Precision 5-band parts add a third digit, and surface-mount chips print a code such as 103 (10 kΩ) or 1002 (10.0 kΩ).",
    "Values come from the E-series: E12 has 12 values per decade at ±10%, E24 has 24 at ±5%, and E96 has 96 at ±1%. That is why you can buy 4.7 kΩ and 5.1 kΩ but not exactly 5.0 kΩ off the shelf, and why designers pick the nearest standard value and check the result.",
    "The power rating follows the size: 0402 is 1/16 W, 0603 is 1/10 W, 0805 is 1/8 W, 1206 is 1/4 W, and a classic through-hole quarter-watt part is about 6.3 mm long. Ratings assume a 70 °C ambient and fall to zero near 155 °C, so keep real dissipation under half the rating.",
  ],
  whereUsed: [
    "Current-limiting an LED: R = (Vsupply − Vf) / If, for example (5 V − 2 V) / 10 mA = 300 Ω.",
    "Pull-up and pull-down resistors that give a digital input a defined level, typically 4.7-10 kΩ on GPIO and reset lines and 2.2-4.7 kΩ on I2C.",
    "Voltage dividers for ADC inputs, and the feedback divider that sets a regulator's output voltage.",
    "Series termination of 22-33 Ω on fast digital outputs to damp ringing on the trace.",
    "Bleeder resistors across bulk capacitors, so a supply discharges safely after it is switched off.",
  ],
  keySpecs: [
    { label: "Resistance", value: "1 Ω to 10 MΩ, E12 / E24 / E96 series" },
    { label: "Tolerance", value: "±5% carbon film, ±1% metal film, ±0.1% precision thin film" },
    { label: "Power rating", value: "1/16 W (0402) to 1/4 W (1206 or axial); 0.5-3 W power types" },
    { label: "Temperature coefficient", value: "±100 ppm/°C thick film, ±25 ppm/°C metal film, ±5 ppm/°C precision" },
    { label: "Working voltage", value: "50 V (0402) to about 200 V (1206 and axial)" },
  ],
  failureModes: [
    "Overheating: the film burns and the body chars, and the part usually fails open. The node it served then floats and causes a fault that is hard to trace. Calculate worst-case dissipation, not typical.",
    "Tolerance stacking and drift: two ±5% resistors in a divider give about ±10% output error, and thick-film parts drift with heat and humidity. Use 1% or better for references and feedback dividers.",
    "A hot spot on the board: a 0603 resistor carrying 0.3 W discolours the laminate and unsolders neighbouring parts. Check the rating at the real temperature and give it copper to spread heat.",
    "Pulse damage: a thin chip resistor can vaporise on a short spike (for example inrush into a snubber) that its average power rating allows. Use pulse-rated or wirewound parts there.",
  ],
  interviewTip:
    "Interviewer asks: \"You have an LED on a 5 V supply that drops 2 V at 10 mA. What resistor and wattage do you pick?\" A good answer shows the steps in order: (5 − 2) / 0.010 = 300 Ω, round to the nearest standard value (330 Ω gives about 9 mA), then check power I²R = 0.009² × 330 ≈ 27 mW, which a 0603 rated 0.1 W handles with margin. Mention tolerance and that you derate.",
  relatedLesson: "passive-components",
  Illustration: ResistorIllustration,
};
