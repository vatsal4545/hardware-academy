import type { ComponentEntry } from "../types";
import { Anim, Leader, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const WCX = 108;
const WCY = 100;
const R = 76;
const DX = 13;
const DY = 10;

interface Die {
  x: number;
  y: number;
  bad: boolean;
  row: number;
}

const DIES: Die[] = (() => {
  const out: Die[] = [];
  for (let gy = -8; gy <= 8; gy++) {
    for (let gx = -6; gx <= 6; gx++) {
      const cx = gx * DX;
      const cy = gy * DY;
      const far = Math.sqrt((Math.abs(cx) + DX / 2) ** 2 + (Math.abs(cy) + DY / 2) ** 2);
      if (far > R - 4) continue;
      const edge = far > R * 0.8;
      const bad = (gx * 5 + gy * 3 + gx * gy * 2 + 40) % 13 === 0 || (edge && (gx + gy * 2 + 20) % 4 === 0);
      out.push({ x: WCX + cx - DX / 2 + 0.8, y: WCY + cy - DY / 2 + 0.8, bad, row: gy + 8 });
    }
  }
  return out;
})();

const ROWS = Array.from({ length: 17 }, (_, row) => {
  const inRow = DIES.filter((d) => d.row === row);
  if (inRow.length === 0) return null;
  const minX = Math.min(...inRow.map((d) => d.x));
  const maxX = Math.max(...inRow.map((d) => d.x)) + DX - 1.6;
  return { row, x: minX, w: maxX - minX, y: inRow[0].y };
}).filter((r): r is { row: number; x: number; w: number; y: number } => r !== null);

const PADS = Array.from({ length: 8 }, (_, i) => 218 + i * 9.4);

function WaferIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Silicon wafer covered in a grid of identical dies, good dies green and failed dies red, with a zoomed view of one die showing its bond pads">
      <circle cx={WCX} cy={WCY} r={R} fill="#3a4357" stroke="#6b7590" strokeWidth={1.5} />
      {DIES.map((d, i) => (
        <rect key={i} x={d.x} y={d.y} width={DX - 1.6} height={DY - 1.6} rx={0.8} fill={d.bad ? "#b94a4a" : "#2f7a62"} />
      ))}
      {ROWS.map((r) => (
        <rect key={r.row} x={r.x} y={r.y} width={r.w} height={DY - 1.6} fill="#ffffff" opacity={0}>
          <Anim on={on} name="opacity" values="0;0.55;0" dur={2.6} begin={r.row * 0.1} />
        </rect>
      ))}
      <circle cx={WCX} cy={WCY + R} r={4.5} fill={part.bg} />
      <Leader from={[214, 62]} to={[WCX + 26, WCY - 30]} />
      <rect x={214} y={40} width={80} height={62} rx={3} fill="#25304a" stroke="#5c6c8c" strokeWidth={1.5} />
      <rect x={228} y={54} width={52} height={34} rx={2} fill="#3a4e75" />
      <rect x={236} y={61} width={16} height={8} fill="#52689a" />
      <rect x={256} y={61} width={16} height={8} fill="#52689a" />
      <rect x={236} y={74} width={36} height={8} fill="#52689a" />
      {PADS.map((x) => (
        <g key={x} fill={part.gold}>
          <rect x={x} y={43} width={5} height={5} />
          <rect x={x} y={94} width={5} height={5} />
        </g>
      ))}
      <Note x={254} y={28} size={10.5} color={part.ink}>
        one die, about 100 mm²
      </Note>
      <Mark x={254} y={118} size={10}>
        about 640 per wafer
      </Mark>
      <Mark x={254} y={134} size={10}>
        Ø 300 mm, 0.775 mm
      </Mark>
      <Mark x={254} y={152} size={10.5} color="#ffffff">
        Y = e^(−D0 · A)
      </Mark>
      <rect x={216} y={170} width={9} height={9} rx={1.5} fill="#2f7a62" />
      <Note x={230} y={175} anchor="start" size={10}>
        good
      </Note>
      <rect x={264} y={170} width={9} height={9} rx={1.5} fill="#b94a4a" />
      <Note x={278} y={175} anchor="start" size={10}>
        bad
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "wafer-and-die",
  name: "Wafer and die",
  category: "semiconductor",
  oneLiner: "A 300 mm disc of single-crystal silicon patterned with hundreds of identical chips (dies) that are tested, diced and packaged.",
  howItWorks: [
    "A boule of single-crystal silicon is grown by the Czochralski method (a seed crystal pulled from molten silicon at about 1414 °C), sliced into wafers 775 µm thick for 300 mm diameter, and polished to nanometre flatness. 300 mm wafers dominate leading-edge logic and memory, 200 mm remains common for analog, power and MEMS, and 450 mm never took off.",
    "Hundreds of process steps (oxidation, lithography, etch, implant, deposition and polishing, repeated for 40-80 mask layers) build transistors in the top few micrometres and metal wiring above them. Each die is exposed in a step-and-scan pattern through a reticle whose field is at most 26 × 33 mm (858 mm²), which caps the size of a single die.",
    "Gross dies per wafer ≈ π(d/2)²/A − πd/√(2A), where d is the wafer diameter and A the die area. A 100 mm² die on a 300 mm wafer gives about 640 candidates (707 minus 67 lost at the edge), while an 800 mm² GPU-class die gives only about 65.",
    "Yield is the fraction of dies that work. A simple Poisson model gives Y = exp(−D0·A): a defect density of 0.1 per cm² on a 1 cm² die yields 90%, but the same density on a 6 cm² die yields only 55%. Large dies are exponentially more expensive, which is one reason chiplets exist.",
    "Probe test on the wafer marks each die good or bad in a wafer map, then a diamond blade or laser cuts the wafer along 50-100 µm scribe lines. Good dies are picked, attached and wire-bonded or flip-chipped into packages.",
  ],
  whereUsed: [
    "Every chip: CPUs and GPUs from 300 mm fabs, DRAM and NAND memory, microcontrollers and power-management ICs.",
    "Power devices: 200 mm silicon and 150 mm SiC wafers yield IGBTs, MOSFETs and SiC MOSFETs.",
    "Image sensors and MEMS parts such as accelerometers, gyros and microphones, often on 200 mm lines.",
    "Test structures and process-control monitors placed in the scribe lines so the fab can measure itself.",
    "Chiplet and advanced-packaging designs that combine dies from different nodes on one interposer.",
  ],
  keySpecs: [
    { label: "Wafer diameter", value: "150 mm, 200 mm, 300 mm (450 mm was not adopted)" },
    { label: "Thickness", value: "775 µm (300 mm), 725 µm (200 mm)" },
    { label: "Dies per wafer", value: "About 640 for 100 mm² on 300 mm; about 65 for 800 mm²" },
    { label: "Defect density", value: "0.05-0.5 defects per cm² in mature processes" },
    { label: "Wafer price (rough)", value: "About $3 000 at 28 nm to $18 000 and more at 3 nm class" },
    { label: "Scribe line", value: "50-100 µm between dies" },
  ],
  failureModes: [
    "Particle and pattern defects: one dust particle or a lithography hot spot can kill a die, which is why fabs are ISO Class 1-5 cleanrooms.",
    "Edge and systematic yield loss: dies at the wafer edge fail more often because film thickness, resist and etch are less uniform there, and mask-related defects repeat at the same position in every reticle field.",
    "Dicing damage and warp: saw dicing chips and cracks dies, and wafers thinned to 50-100 µm for power or stacked devices warp and break easily.",
    "Parametric spread: dies that work but miss the speed or leakage spec are binned into lower grades, which shows up as lower yield for the top bin.",
  ],
  interviewTip:
    "Interviewer asks: \"A wafer lot is yielding 60%. How do you find out why?\" A good answer: bin the failures at wafer sort and read the wafer map for its spatial signature. A repeating position across fields points to a mask or lithography problem, an edge ring to etch or deposition uniformity, and random scatter to particles. Then do electrical failure analysis (IDDQ, scan diagnosis), physical analysis (FIB, SEM, TEM) on representative dies, and correlate with inline inspection and tool history. Quote Y = exp(−D0·A) to show defect density and die area drive the result.",
  relatedLesson: "wafer-fabrication",
  Illustration: WaferIllustration,
};
