import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Epoxy, Flow, Lead, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const CX = 200;
const LEADS = [
  { x: CX - 23, t: "G" },
  { x: CX, t: "D" },
  { x: CX + 23, t: "S" },
] as const;

function MosfetIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="IRLZ44N logic-level power MOSFET in a TO-220 package with gate, drain and source leads; a gate voltage turns on drain-to-source current">
      {LEADS.map((l) => (
        <Lead key={l.t} x={l.x - 3} y={128} w={6} h={52} r={1} />
      ))}
      <rect x={CX - 46} y={16} width={92} height={56} rx={4} fill={part.metal} />
      <rect x={CX - 42} y={19} width={84} height={6} rx={3} fill={part.metalHi} opacity={0.8} />
      <circle cx={CX} cy={40} r={8} fill={part.bg} stroke={part.metalLo} strokeWidth={2} />
      <Epoxy x={CX - 46} y={70} w={92} h={60} r={3} />
      <Mark x={CX} y={92} size={12} color="#ffffff">
        IRLZ44N
      </Mark>
      <Mark x={CX} y={110} size={9.5}>
        55 V  47 A
      </Mark>
      <g>
        <Anim on={on} name="opacity" values="0.15;0.15;1;1;0.15" keyTimes="0;0.3;0.42;0.85;1" dur={4} />
        <Flow points={[[CX, 178], [CX, 130]]} on={on} n={3} dur={1.2} />
        <Flow points={[[CX + 23, 130], [CX + 23, 178]]} on={on} n={3} dur={1.2} />
        <path d={`M${CX} 124 H${CX + 23}`} stroke={part.current} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
        <circle cx={CX - 23} cy={150} r={5} fill={vizColors.green} />
        <Note x={CX - 36} y={152} anchor="end" size={10.5} color={vizColors.green}>
          gate high: channel on
        </Note>
      </g>
      {LEADS.map((l) => (
        <Label key={l.t} x={l.x} y={191} size={12} bold mono>
          {l.t}
        </Label>
      ))}
      <Mark x={20} y={34} anchor="start" size={12} color="#ffffff">
        IRLZ44N
      </Mark>
      <Note x={20} y={52} anchor="start" size={10.5}>
        logic-level n-channel
      </Note>
      <Mark x={20} y={80} anchor="start" size={10.5}>
        Rds(on) 22 mΩ
      </Mark>
      <Mark x={20} y={98} anchor="start" size={10.5}>
        Qg 48 nC
      </Mark>
      <Mark x={20} y={116} anchor="start" size={10.5}>
        fully on at 5 V
      </Mark>
      <Note x={254} y={40} anchor="start" size={10}>
        tab = drain
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "mosfet",
  name: "MOSFET",
  category: "semiconductor",
  oneLiner: "A voltage-controlled switch: a gate voltage opens a conductive channel from drain to source while drawing almost no gate current.",
  howItWorks: [
    "A MOSFET has a gate, a drain and a source. The gate sits on a thin oxide insulator (a few nanometres in logic chips, much thicker in power parts), so it draws no DC current and behaves as a capacitor. In an n-channel enhancement device, raising VGS above the threshold Vth (1-3 V) attracts electrons to the surface and forms a channel that conducts between drain and source.",
    "Rds(on) is the channel's on-resistance: 22 mΩ at VGS = 5 V for the IRLZ44N, and a few milliohms for modern 60 V trench parts. Conduction loss is I²·Rds(on), so 10 A through 22 mΩ dissipates 2.2 W, which is why a TO-220 in free air runs hot without a heatsink.",
    "'Logic-level' MOSFETs such as the IRLZ44N are fully on at 4.5-5 V, but a standard part like the IRF540N needs 10 V. Drive that part from a 3.3 V microcontroller pin and it is only partly on and gets hot, the classic 'it works but it is hot' failure.",
    "Gate capacitance (Ciss, 1-5 nF) and total gate charge Qg (48 nC maximum for the IRLZ44N) decide switching speed: a driver that can source 1 A moves 50 nC in about 50 ns. A 10-100 Ω gate resistor damps ringing between the gate capacitance and trace inductance. The body diode conducts when the drain goes below the source, which carries freewheeling current in bridges.",
  ],
  whereUsed: [
    "Low-side switch for motors, solenoids and LED strips driven from microcontroller pins.",
    "Half-bridges and H-bridges in motor drivers, and the switches in synchronous buck converters.",
    "Load switches and reverse-battery protection, using P-channel parts on the high side.",
    "Every digital chip: billions of MOSFETs make up CMOS gates and memory cells.",
    "Battery protection and hot-swap circuits, for example on BMS boards.",
  ],
  keySpecs: [
    { label: "VDS and ID (max)", value: "55 V and 47 A (IRLZ44N); 30 V and 5.7 A (SOT-23 AO3400)" },
    { label: "On-resistance Rds(on)", value: "22 mΩ at VGS = 5 V, ID = 25 A (IRLZ44N)" },
    { label: "Threshold Vgs(th)", value: "1-2 V (logic level); 2-4 V (standard)" },
    { label: "Gate charge Qg", value: "48 nC maximum (IRLZ44N); 5-100 nC typical range" },
    { label: "Gate voltage limit", value: "±16 V (IRLZ44N); ±20 V on many parts" },
    { label: "Packages", value: "TO-220, D2PAK, DPAK, SOT-23, PowerPAK and DFN" },
  ],
  failureModes: [
    "Gate overvoltage: the oxide fails above VGS(max), and spikes coupled through Cgd can exceed it. Add a gate resistor and a Zener across the gate, and keep the gate loop short.",
    "Insufficient gate drive: a 10 V-class part driven at 3.3 V runs in its linear region with a large Rds(on), dissipating tens of watts and failing within seconds.",
    "Floating gate: with no pull-down the gate drifts, picks up noise or turns on at power-up. Always add a 10-100 kΩ pull-down.",
    "Shoot-through in bridges: if both devices in a half-bridge conduct at once the supply is shorted through them. Dead time and correct gate-drive timing prevent it.",
  ],
  interviewTip:
    "Interviewer asks: \"My MOSFET switch works on the bench but gets very hot under load. Why?\" A good answer: check that VGS really reaches the value at which Rds(on) is specified (a 3.3 V MCU driving a 10 V-class part is the classic mistake), then compute I²·Rds(on). Next look at switching: a slow edge from a large gate resistor or weak driver causes switching loss, and a scope will show any oscillation. Fixes are a logic-level part, a gate driver, a lower Rds(on) or a heatsink.",
  relatedLesson: "transistors-bjt-mosfet",
  Illustration: MosfetIllustration,
};
