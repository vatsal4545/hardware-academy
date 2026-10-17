import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Mark, Note, PartCanvas, part, pathOf, round, useAnimate, type Pt } from "../shared";

const SX = 262;
const SY = 98;
const ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function spiral(phase: number): string {
  const pts: Pt[] = [];
  for (let t = 0; t <= 11.6; t += 0.2) pts.push([SX + (6 + 2.3 * t) * Math.cos(t + phase), SY + (6 + 2.3 * t) * Math.sin(t + phase)]);
  return pathOf(pts);
}

function LiIonIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="18650 lithium-ion cell with its blue wrapper and positive button, beside a cutaway of the rolled electrode layers where lithium ions shuttle in and out as the cell charges and discharges">
      <rect x={12} y={58} width={178} height={52} rx={6} fill="#1f5f96" stroke="#5aa2dd" strokeWidth={1.5} />
      <rect x={16} y={61} width={170} height={8} rx={4} fill="#ffffff" opacity={0.18} />
      <rect x={190} y={74} width={9} height={20} rx={2} fill={part.metal} />
      <rect x={170} y={58} width={9} height={52} fill="#e5e7eb" opacity={0.85} />
      <rect x={12} y={58} width={9} height={52} rx={4} fill="#d6dbe5" />
      <Mark x={96} y={78} size={12} color="#ffffff">
        NCR18650GA
      </Mark>
      <Mark x={96} y={96} size={10} color="#dbeafe">
        3500 mAh  3.6 V
      </Mark>
      <Label x={30} y={84} size={18} bold color="#ffffff">
        −
      </Label>
      <Label x={158} y={84} size={18} bold color="#ffffff">
        +
      </Label>
      <Note x={96} y={44} size={10} color={part.ink}>
        18 mm × 65 mm, about 47 g
      </Note>
      <circle cx={SX} cy={SY} r={42} fill="#101728" stroke={vizColors.muted} strokeWidth={1} strokeDasharray="3 3" />
      <path d={spiral(0)} stroke={part.metal} strokeWidth={2.4} fill="none" />
      <path d={spiral(Math.PI)} stroke={vizColors.copper} strokeWidth={2.4} fill="none" />
      {ANGLES.map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        const x1 = round(SX + 8 * Math.cos(a));
        const y1 = round(SY + 8 * Math.sin(a));
        const x2 = round(SX + 34 * Math.cos(a));
        const y2 = round(SY + 34 * Math.sin(a));
        return (
          <circle key={deg} r={3} fill={vizColors.cyan} cx={on ? undefined : round((x1 + x2) / 2)} cy={on ? undefined : round((y1 + y2) / 2)}>
            {on && <animateMotion path={`M${x1} ${y1} L${x2} ${y2}`} dur="2.4s" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" begin={`${-i * 0.15}s`} repeatCount="indefinite" />}
          </circle>
        );
      })}
      <Note x={SX} y={152} size={10} color={vizColors.cyan}>
        Li+ ions shuttle
      </Note>
      <Note x={SX} y={165} size={10} color={vizColors.cyan}>
        between the foils
      </Note>
      <Mark x={96} y={140} size={10}>
        4.20 V full
      </Mark>
      <Mark x={96} y={156} size={10}>
        3.6 V nominal
      </Mark>
      <Mark x={96} y={172} size={10}>
        2.5 V empty
      </Mark>
      <Mark x={SX} y={181} size={10} color="#ffffff">
        12.6 Wh per cell
      </Mark>
      <Note x={SX} y={194} size={9.5}>
        about 260 Wh/kg
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "li-ion-cell",
  name: "Li-ion cell",
  category: "ev",
  oneLiner: "The 18650 is a 3.6 V, 2.5-3.5 Ah lithium-ion cylinder: the building block of laptop packs and of early Tesla battery packs.",
  howItWorks: [
    "A Li-ion cell is a rolled sandwich (a jelly roll) of an anode (graphite on copper foil), a porous polyolefin separator and a cathode (NMC, NCA or LFP on aluminium foil), soaked in a lithium-salt electrolyte (LiPF6 in organic carbonates). Charging pushes lithium ions from the cathode through the separator into the graphite, and discharging lets them flow back while electrons do work in the external circuit.",
    "Voltage tells you the state of charge. An NMC cell is 4.20 V full, about 3.6-3.7 V nominal and 2.5-3.0 V empty. An 18650 (18 × 65 mm, about 47 g) stores roughly 3.5 Ah × 3.6 V = 12.6 Wh, which is about 260 Wh/kg at cell level. A Tesla Model S 85 kWh pack used 7104 such cells in a 96-series, 74-parallel arrangement.",
    "Charging is constant current then constant voltage (CC-CV): about 0.5-1C up to 4.20 V ± 0.05 V, then hold 4.20 V while the current tapers to about C/20 and stop. Charging above about 4.3 V plates lithium metal and makes the cell unsafe. The normal discharge cut-off is about 2.5 V (many packs stop at 2.8-3.0 V), and forcing a cell far below that, toward 1.5-2 V, can dissolve the copper current collector.",
    "Power capability is set by C-rate and internal resistance. A 3.5 Ah high-energy cell (NCR18650GA) gives 10 A continuous (about 3C), while a high-power cell (Samsung 25R, 2.5 Ah) gives 20 A. Internal resistance of 20-50 mΩ turns current into heat, which is 3 W per cell at 10 A and 30 mΩ.",
    "Newer formats are the 21700 (21 × 70 mm, 4-5 Ah, used in the Model 3 and Y) and the tabless 4680 (46 × 80 mm), plus prismatic and pouch cells (BYD Blade) that cut parts count. LFP chemistry gives up energy density (160-200 Wh/kg) for longer cycle life (3000 cycles and more), lower cost and better thermal stability.",
  ],
  whereUsed: [
    "Laptop, power-tool and e-bike packs: for example a 36 V 10S3P pack of 3.5 Ah cells is 10.5 Ah and 378 Wh.",
    "Early Tesla Model S and X packs (18650 cells) and the Model 3 and Y (21700 cells, with 4680 cells in some Model Y): thousands of cells in series and parallel.",
    "Robots: 2S (7.4 V) or 3S (11.1 V) packs of 18650 cells for the course robot.",
    "Flashlights, vapes and power banks: a 20 000 mAh power bank holds six or seven 18650 cells.",
    "Stationary storage and uninterruptible supplies built from cylindrical cells.",
  ],
  keySpecs: [
    { label: "Voltage (full / nominal / empty)", value: "4.20 V / 3.6-3.7 V / 2.5-3.0 V (NMC)" },
    { label: "Capacity", value: "2.5-3.5 Ah; 3.5 Ah is about 12.6 Wh" },
    { label: "Energy density", value: "About 250-270 Wh/kg and 600-700 Wh/L at cell level" },
    { label: "Max continuous discharge", value: "10 A (NCR18650GA); 20 A (25R)" },
    { label: "Internal resistance", value: "20-50 mΩ when new" },
    { label: "Cycle life", value: "500-1000 cycles to 80% (NMC); over 3000 (LFP)" },
  ],
  failureModes: [
    "Thermal runaway: an internal short (dendrite, crushed cell, damaged separator), overcharge or overheating (the separator melts around 130 °C) triggers exothermic reactions that vent hot gas and flame above 600 °C and spread to neighbouring cells. Packs use cell spacing, fusing and vent paths.",
    "Over-charge and over-discharge damage: charging above about 4.3 V plates lithium, and deep discharge toward 1.5-2 V dissolves the copper collector (2.5 V is the normal cut-off). Both permanently cut capacity and can cause a short later, which is why the BMS enforces limits.",
    "Capacity fade and calendar ageing: about 20% loss after 500-1000 cycles, faster above 40 °C and when stored at 100% charge, and charging below 0 °C plates lithium.",
    "Imbalance in packs: cells of different capacity or resistance drift apart in series and the weakest cell is over-discharged first, so the pack needs balancing.",
  ],
  interviewTip:
    "Interviewer asks: \"Why do EV packs use series and parallel cell groups, and how do you size one?\" A good answer: series raises voltage and parallel raises capacity and current capability. Pack voltage is Ns × 3.6 V, capacity is Np × cell Ah, and energy is voltage × Ah. For example 96s74p of 3.4 Ah cells is 346 V, 252 Ah and 87 kWh from 7104 cells. Then check power: peak current per cell is (P/V)/Np and must stay within the cell's C-rate, along with thermal limits, and the parallel group is balanced as a single brick by the BMS.",
  relatedLesson: "batteries-and-bms",
  Illustration: LiIonIllustration,
};
