import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

// Plate y positions inside the chip; even index plates hang off the left termination, odd off the right.
const PLATES = [62, 72, 82, 92, 102, 112] as const;
const PLATE = "#7e8798";

function CeramicCapacitorIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Cutaway of a ceramic chip capacitor: interleaved metal plates inside a ceramic body with a termination at each end">
      <rect x={20} y={82} width={52} height={6} rx={2} fill={vizColors.copper} />
      <rect x={248} y={82} width={52} height={6} rx={2} fill={vizColors.copper} />
      <rect x={70} y={52} width={180} height={70} rx={3} fill={part.ceramic} />
      <rect x={72} y={54} width={176} height={5} fill="#ffffff" opacity={0.18} />
      {PLATES.map((y, i) => {
        const left = i % 2 === 0;
        const live = left ? vizColors.positive : vizColors.negative;
        return (
          <rect key={y} x={left ? 82 : 100} y={y} width={138} height={3.2} rx={1} fill={PLATE}>
            <Anim on={on} name="fill" values={`${PLATE};${live};${live};${PLATE}`} keyTimes="0;0.35;0.7;1" dur={3} />
          </rect>
        );
      })}
      <rect x={70} y={52} width={22} height={70} rx={3} fill={part.metal} />
      <rect x={228} y={52} width={22} height={70} rx={3} fill={part.metal} />
      <rect x={72} y={54} width={5} height={66} rx={2} fill={part.metalHi} opacity={0.8} />
      <rect x={230} y={54} width={5} height={66} rx={2} fill={part.metalHi} opacity={0.8} />
      <g>
        <Anim on={on} name="opacity" values="1;1;0;0" keyTimes="0;0.2;0.6;1" dur={3} />
        <Flow points={[[24, 85], [72, 85]]} on={on} n={2} dur={1.2} />
        <Flow points={[[248, 85], [296, 85]]} on={on} n={2} dur={1.2} />
      </g>
      <Mark x={56} y={102} size={15} color={vizColors.positive}>
        +
      </Mark>
      <Mark x={264} y={102} size={15} color={vizColors.negative}>
        −
      </Mark>
      <Note x={160} y={30} size={10.5}>
        ceramic dielectric between electrode layers
      </Note>
      <Note x={160} y={140} color={part.ink} size={11.5}>
        0603 chip, 1.6 × 0.8 mm
      </Note>
      <Mark x={160} y={160} size={14} color="#ffffff">
        10 µF  X5R  6.3 V
      </Mark>
      <Note x={160} y={180}>
        terminations on both ends; no polarity
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "capacitor-ceramic",
  name: "Ceramic capacitor",
  category: "passive",
  oneLiner: "Metal plates separated by ceramic: stores a little charge, blocks DC, passes AC and soaks up fast supply noise.",
  howItWorks: [
    "A multilayer ceramic capacitor (MLCC) stacks hundreds of thin metal electrodes interleaved with ceramic layers (barium titanate for X7R and X5R, titanate-free ceramics for C0G) and connects alternate layers to the two end terminations. Thinner dielectric and more layers mean more capacitance per volume, from C = ε₀·εr·A/d.",
    "The dielectric class matters more than the headline value. C0G (NP0) is stable to ±30 ppm/°C but is practical only up to about 100 nF. X7R holds ±15% from −55 to +125 °C and X5R from −55 to +85 °C, but both lose capacitance under DC bias: a 10 µF X5R in 0603 rated 6.3 V may deliver only 3-4 µF at 5 V.",
    "Ceramics have tiny ESR (a few mΩ) and ESL (about 0.5-1 nH in 0402-0805), so a 100 nF part is self-resonant around 15-30 MHz. That makes them the standard decoupling capacitor: put 100 nF within a few millimetres of each IC supply pin so the high-frequency current loop is short.",
    "Chips are usually unmarked, so the value comes from the reel and the BOM. Common sizes are 0402 (1.0 × 0.5 mm), 0603 (1.6 × 0.8 mm), 0805 (2.0 × 1.25 mm) and 1206 (3.2 × 1.6 mm), and the voltage rating shrinks with the package.",
  ],
  whereUsed: [
    "100 nF decoupling next to every microcontroller, FPGA and logic-IC supply pin.",
    "Crystal load capacitors (typically 8-22 pF C0G) and RC timing and filter networks.",
    "Input and output bypass of buck converters: 10-47 µF X5R or X7R in 0805-1206.",
    "AC coupling and DC blocking in audio and RF paths, using C0G where linearity matters.",
    "Snubber and EMI filter capacitors, including safety-rated Y capacitors in mains filters.",
  ],
  keySpecs: [
    { label: "Capacitance", value: "1 pF to 100 µF (C0G only to about 100 nF)" },
    { label: "Voltage rating", value: "6.3 V to 100 V common; 630 V-3 kV high-voltage types" },
    { label: "Dielectric", value: "C0G ±30 ppm/°C; X7R and X5R ±15%; Y5V +22 / −82%" },
    { label: "Tolerance", value: "±1% (C0G) to ±20% (X5R, X7R)" },
    { label: "ESR / ESL", value: "1-20 mΩ / 0.5-1 nH" },
    { label: "Sizes", value: "0201 to 1210; 0603 is 1.6 × 0.8 mm" },
  ],
  failureModes: [
    "DC-bias derating: an LCR meter reads the nominal value at 0 V, but in circuit the part may have lost 50-80% of it, so the rail ripples far more than the calculation predicted. Read the manufacturer's DC-bias curve.",
    "Cracking from board flex or thermal shock: a flex crack typically shorts the capacitor, a classic cause of a rail stuck near ground. Keep large MLCCs away from board edges, V-score lines and screw holes.",
    "Piezoelectric microphonics: X7R and X5R ceramics generate voltage when vibrated and can sing audibly when 1-10 kHz ripple flexes them, which shows up as noise on sensitive analog signals.",
    "Ageing and temperature: X7R loses about 2% of its capacitance for each decade of time after reflow, and Y5V parts can lose 80% when cold or under bias.",
  ],
  interviewTip:
    "Interviewer asks: \"Why does your 10 µF decoupling capacitor not behave like 10 µF?\" A good answer: class II dielectrics lose capacitance with DC bias, temperature and ageing, so read the DC-bias curve, derate by using a higher voltage rating (16 V part on a 5 V rail), a larger package or parallel parts. Then add that ESL and loop inductance limit it at high frequency, so placement matters as much as the value.",
  relatedLesson: "passive-components",
  Illustration: CeramicCapacitorIllustration,
};
