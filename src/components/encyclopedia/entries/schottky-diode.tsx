import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Leader, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const SCALE = 120; // px per volt in the comparison bars

function SchottkyIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  const bars = [
    { y: 124, v: 0.45, color: vizColors.green, label: "Schottky" },
    { y: 152, v: 1.0, color: vizColors.red, label: "1N4007" },
  ];
  return (
    <PartCanvas title="SS34 Schottky diode in an SMA surface-mount package with a cathode stripe, and bars comparing its forward drop of 0.45 volts with 1.0 volt for a silicon rectifier">
      <rect x={88} y={43} width={20} height={34} rx={2} fill={part.metal} />
      <rect x={212} y={43} width={20} height={34} rx={2} fill={part.metal} />
      <rect x={100} y={34} width={120} height={52} rx={4} fill={part.epoxy} stroke={part.epoxyHi} />
      <rect x={104} y={37} width={112} height={6} rx={3} fill="#ffffff" opacity={0.08} />
      <rect x={196} y={34} width={9} height={52} fill={part.metalHi} opacity={0.85} />
      <Mark x={146} y={54} size={14} color="#ffffff">
        SS34
      </Mark>
      <Mark x={146} y={72} size={10.5}>
        3 A  40 V
      </Mark>
      <Flow points={[[60, 60], [260, 60]]} on={on} n={4} dur={2} r={2.8} />
      <Note x={60} y={30} anchor="middle" color={part.ink} size={10.5}>
        SMA package
      </Note>
      <Note x={262} y={22} anchor="middle" size={10}>
        cathode stripe
      </Note>
      <Leader from={[248, 27]} to={[203, 38]} />
      <Note x={160} y={108} color={part.ink} size={10.5}>
        forward drop at 1 A
      </Note>
      {bars.map((b) => (
        <g key={b.label}>
          <Label x={100} y={b.y + 7} size={11} anchor="end" color={vizColors.muted}>
            {b.label}
          </Label>
          <rect x={108} y={b.y} width={b.v * SCALE} height={14} rx={3} fill={b.color}>
            <Anim on={on} name="width" values={`0;${b.v * SCALE};${b.v * SCALE};0`} keyTimes="0;0.4;0.9;1" dur={3.2} />
          </rect>
          <Label x={108 + b.v * SCALE + 8} y={b.y + 7} size={11.5} anchor="start" bold mono>
            {b.v.toFixed(2)} V
          </Label>
        </g>
      ))}
      <Note x={160} y={184}>
        half the drop, half the heat, no reverse recovery
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "schottky-diode",
  name: "Schottky diode",
  category: "semiconductor",
  oneLiner: "A metal-semiconductor diode with roughly a 0.3-0.5 V forward drop and no reverse recovery, at the cost of higher leakage.",
  howItWorks: [
    "Instead of a p-n junction, a Schottky diode joins a metal (platinum, molybdenum or titanium) to lightly doped n-type silicon. Current is carried only by majority carriers, so there is no stored minority charge to sweep out at turn-off: reverse recovery is essentially zero (tens of picoseconds) and the diode can switch at hundreds of MHz.",
    "The barrier is lower than a p-n junction's, so the forward drop is 0.2-0.5 V instead of 0.6-1.0 V. A 1N5819 drops about 0.45 V at 1 A, against about 1.0 V for a 1N4007, so it dissipates 0.45 W instead of 1.0 W. In a 5 V converter output stage that is the difference between about 9% and 20% loss at 1 A.",
    "The price is reverse leakage. A 1N5819 can leak 1 mA or more at 40 V and 100 °C, and the leakage rises steeply with temperature and voltage. Most Schottky diodes are rated 20-100 V; higher-voltage silicon types (150-200 V) have a larger drop of 0.7-0.9 V.",
    "Silicon-carbide Schottky diodes (650 V and 1200 V) combine zero recovery with high blocking voltage and a forward drop around 1.5 V. They are used in PFC stages and EV chargers, where the lack of recovery loss lets the converter run faster.",
  ],
  whereUsed: [
    "Freewheel (catch) diode in non-synchronous buck converters, such as an SS34 (3 A, 40 V, SMA) at the switch node.",
    "Reverse-polarity and power OR-ing where a 0.7 V loss is too much, for example on battery-powered 3.3 V systems.",
    "Solar panel blocking and bypass diodes and battery charger input diodes.",
    "RF detectors and mixers, using small-signal Schottky types.",
    "SiC Schottky diodes in power-factor-correction boost stages and fast chargers.",
  ],
  keySpecs: [
    { label: "Forward voltage Vf", value: "0.2-0.5 V; about 0.45 V at 1 A for a 1N5819" },
    { label: "Reverse voltage Vr", value: "20-100 V (1N5817-1N5819: 20-40 V)" },
    { label: "Forward current If", value: "1 A (1N5819) up to 40 A rectifiers" },
    { label: "Reverse recovery", value: "None (under 100 ps); only junction capacitance" },
    { label: "Reverse leakage", value: "0.1-10 mA at rated Vr, rising with temperature" },
    { label: "Packages", value: "DO-41, SMA (SS14, SS34), SOD-123, SMC, TO-220" },
  ],
  failureModes: [
    "Thermal runaway: leakage rises with temperature, and leakage times voltage is heat. At high ambient temperature and high reverse voltage the diode can heat itself to destruction, so check hot enclosures.",
    "Reverse-voltage overshoot: Schottky parts have little avalanche margin, so ringing at a buck switch node above Vr damages them. Pick Vr at least 2 times Vin and snub the node.",
    "Leakage in the wrong place: 100 µA to 1 mA of leakage ruins a battery-powered standby budget or corrupts a high-impedance sensor input.",
    "Paralleling for current: unequal forward drops and temperature differences make one diode carry most of the current, so derate or use a single larger part.",
  ],
  interviewTip:
    "Interviewer asks: \"Why a Schottky and not a normal rectifier as the freewheel diode in a buck converter?\" A good answer: the lower Vf (about 0.4 V against 0.7 V or more) cuts conduction loss, P = Vf × Iout × (1 − D), and the lack of reverse recovery means no recovery-charge spike, so less switching loss, less EMI and no shoot-through. Then name the trade-offs: leakage that rises with temperature and a limited voltage rating. Add that a synchronous MOSFET replaces the diode at high currents to cut the loss further.",
  relatedLesson: "pn-junction-and-diodes",
  Illustration: SchottkyIllustration,
};
