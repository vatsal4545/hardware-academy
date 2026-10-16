import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Epoxy, Flow, Lead, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const CX = 92;
const LEADS = [
  { x: CX - 27, t: "D" },
  { x: CX - 9, t: "S" },
  { x: CX + 9, t: "KS" },
  { x: CX + 27, t: "G" },
] as const;

const BASE = 146;
const PER_EV = 23;
const GAPS = [
  { x: 190, ev: 1.12, label: "Si", color: vizColors.blue },
  { x: 232, ev: 3.26, label: "SiC", color: vizColors.green },
  { x: 274, ev: 3.4, label: "GaN", color: vizColors.violet },
] as const;

function SicMosfetIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Silicon carbide MOSFET in a four-lead TO-247 package with a Kelvin source pin, beside bars comparing the band gap of silicon, silicon carbide and gallium nitride">
      {LEADS.map((l) => (
        <Lead key={l.t} x={l.x - 3} y={128} w={6} h={50} r={1} />
      ))}
      <rect x={CX - 44} y={14} width={88} height={50} rx={4} fill={part.metal} />
      <rect x={CX - 40} y={17} width={80} height={6} rx={3} fill={part.metalHi} opacity={0.8} />
      <circle cx={CX} cy={36} r={8} fill={part.bg} stroke={part.metalLo} strokeWidth={2} />
      <Epoxy x={CX - 44} y={62} w={88} h={68} r={3} />
      <Mark x={CX} y={84} size={10} color="#ffffff">
        C3M0040120K
      </Mark>
      <Mark x={CX} y={102} size={9.5}>
        1200 V  40 mΩ
      </Mark>
      <Mark x={CX} y={118} size={9.5}>
        SiC  TO-247-4
      </Mark>
      <Flow points={[[CX - 27, 176], [CX - 27, 130]]} on={on} n={3} dur={1.0} r={2.8} />
      <Flow points={[[CX - 9, 130], [CX - 9, 176]]} on={on} n={3} dur={1.0} r={2.8} />
      {LEADS.map((l) => (
        <Label key={l.t} x={l.x} y={190} size={11.5} bold mono>
          {l.t}
        </Label>
      ))}
      <rect x={176} y={26} width={132} height={132} rx={6} fill="#0f1626" stroke={vizColors.grid} />
      <Note x={242} y={42} size={10} color={part.ink}>
        band gap, eV
      </Note>
      <line x1={184} y1={BASE} x2={302} y2={BASE} stroke={vizColors.muted} strokeWidth={1} />
      {GAPS.map((g) => {
        const h = g.ev * PER_EV;
        return (
          <g key={g.label}>
            <rect x={g.x} y={BASE - h} width={26} height={h} rx={2} fill={g.color}>
              <Anim on={on} name="y" values={`${BASE};${BASE - h};${BASE - h};${BASE}`} keyTimes="0;0.4;0.9;1" dur={3.2} />
              <Anim on={on} name="height" values={`0;${h};${h};0`} keyTimes="0;0.4;0.9;1" dur={3.2} />
            </rect>
            <Label x={g.x + 13} y={BASE - h - 9} size={10.5} bold mono>
              {g.ev}
            </Label>
            <Label x={g.x + 13} y={BASE + 11} size={11} bold>
              {g.label}
            </Label>
          </g>
        );
      })}
      <Mark x={242} y={174} size={10}>
        10x the critical field
      </Mark>
      <Mark x={242} y={188} size={10}>
        dv/dt 50-100 V/ns
      </Mark>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "sic-mosfet",
  name: "SiC MOSFET",
  category: "semiconductor",
  oneLiner: "A silicon-carbide MOSFET: a wide-bandgap switch with low loss at 650-1700 V and switching speeds silicon IGBTs cannot reach.",
  howItWorks: [
    "Silicon carbide has a band gap of 3.26 eV (4H-SiC) against 1.12 eV for silicon, and a critical electric field about ten times higher (roughly 2.8 MV/cm against 0.3 MV/cm). A 1200 V device can therefore use a drift layer about ten times thinner and far more heavily doped, which cuts its specific on-resistance by orders of magnitude compared with a silicon MOSFET of the same rating.",
    "A 1200 V, 40 mΩ part such as the C3M0040120K conducts 30 A with I²R loss of 36 W. Rds(on) rises by roughly 1.4-1.8 times between 25 °C and 150 °C, so datasheets quote a hot value, and a design must use that one. The junction can run at up to 175 °C.",
    "With no minority-carrier tail, SiC MOSFETs switch in tens of nanoseconds at 50-100 V/ns, giving roughly 3-5 times lower switching energy than an IGBT and letting inverters run at 20-100 kHz with smaller magnetics. The same fast edges raise EMI, gate-loop ringing and motor insulation stress, so layout and gate drive need much more discipline.",
    "Gate drive is unusual: +15 to +18 V on (Rds(on) is quoted near +18 V) and 0 to −5 V off, because the threshold is low (about 2-3 V) and drifts with bias stress, and Miller coupling can turn the device on falsely. The TO-247-4 package adds a Kelvin source pin so the gate loop does not share the power source inductance.",
  ],
  whereUsed: [
    "EV traction inverters at 400-800 V: the 2018 Tesla Model 3 popularised SiC in cars with STMicroelectronics 650 V devices.",
    "On-board chargers and DC fast chargers at 800 V and 350 kW, where 100 kHz switching shrinks the transformers.",
    "Solar string inverters and energy-storage converters, up to megawatt scale.",
    "Industrial drives, server power-supply PFC stages and rail traction.",
    "Aerospace power conversion, where 175-200 °C junction capability and low weight are valuable.",
  ],
  keySpecs: [
    { label: "Voltage class", value: "650 V, 750 V, 900 V, 1200 V, 1700 V" },
    { label: "Rds(on)", value: "10-80 mΩ at VGS = 18 V and 25 °C, 1.4-1.8 times higher at 150 °C" },
    { label: "Gate drive", value: "+15 to +18 V on, 0 to −5 V off; absolute maximum about +19 to +25 V and −6 to −10 V" },
    { label: "Switching", value: "dv/dt 50-100 V/ns; switching energy 3-5 times below an IGBT" },
    { label: "Max junction temperature", value: "175 °C (200 °C for some parts)" },
    { label: "Body diode", value: "Forward drop 3-4 V; near-zero reverse recovery" },
  ],
  failureModes: [
    "Short-circuit withstand is brief, 2-3 µs against 5-10 µs for an IGBT, so desaturation detection must trip within about 1 µs.",
    "Gate-oxide reliability and threshold shift: positive and negative gate bias stress can move Vth by hundreds of millivolts over the life of the part, and the oxide is less tolerant of overshoot. Designs derate VGS and monitor Vth.",
    "dv/dt-induced false turn-on: 50-100 V/ns edges push current through Cgd into a low-threshold gate. A negative off-voltage and a Miller clamp are needed.",
    "EMI and ringing: just 10 nH of power-loop inductance with a 10 A/ns edge gives 100 V of overshoot, so a low-inductance layout is mandatory.",
  ],
  interviewTip:
    "Interviewer asks: \"What do you gain, and what do you pay, by moving an EV inverter from IGBTs to SiC MOSFETs?\" A good answer: you gain lower conduction loss at partial load (a resistive characteristic rather than a fixed VCE(sat)), several times lower switching loss, a few percent more range, and smaller cooling and passives. You pay higher device cost, tighter gate-drive and layout requirements, a shorter short-circuit time, EMI and motor-insulation stress from fast dv/dt, and a younger reliability record with threshold drift. Quantify with numbers where you can.",
  relatedLesson: "power-semiconductors",
  Illustration: SicMosfetIllustration,
};
