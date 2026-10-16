import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Mark, Note, PartCanvas, ScrollClip, part, squarePath, useAnimate, type Pt } from "../shared";

const BOARD = "#1d46a8";
const TRACE = "#4a7ae6";
const PERIOD = 30;
const DUTY = 0.27;

/** Inductor current: ramps up while the switch is on, down while it is off. */
function rampPath(x0: number, x1: number, mid: number, ripple: number): string {
  let d = `M${x0} ${mid + ripple / 2}`;
  for (let x = x0; x < x1; x += PERIOD) {
    d += ` L${(x + PERIOD * DUTY).toFixed(1)} ${mid - ripple / 2} L${x + PERIOD} ${mid + ripple / 2}`;
  }
  return d;
}

const CURRENT_PATH: Pt[] = [[42, 62], [88, 62], [88, 78], [128, 78], [136, 78], [182, 78], [190, 62], [198, 62]];

function Can({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#cfd5e0" stroke="#8791a6" />
      <path d={`M${cx - r} ${cy} a${r} ${r} 0 0 1 ${r * 2} 0 z`} fill="#2a3040" opacity={0.85} transform={`rotate(-90 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="none" stroke="#9aa3b5" />
    </g>
  );
}

function BuckIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Adjustable buck converter module with an LM2596 chip, a toroidal inductor, a Schottky diode and capacitors, next to the switching waveform and the inductor current ripple">
      <rect x={24} y={30} width={196} height={124} rx={6} fill={BOARD} stroke="#2f63d6" strokeWidth={1.5} />
      {[
        [32, 38],
        [212, 38],
        [32, 146],
        [212, 146],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={2.6} fill={part.bg} stroke={part.gold} />
      ))}
      <path d="M36 62 H88 V78 H134 M182 78 L190 62 H204 M36 122 H204" stroke={TRACE} strokeWidth={3} fill="none" strokeLinejoin="round" />
      {[
        { x: 36, y: 62, t: "IN+" },
        { x: 36, y: 122, t: "IN−" },
        { x: 204, y: 62, t: "OUT+" },
        { x: 204, y: 122, t: "OUT−" },
      ].map((p) => (
        <g key={p.t}>
          <circle cx={p.x} cy={p.y} r={6.5} fill={part.gold} />
          <circle cx={p.x} cy={p.y} r={2.6} fill={part.bg} />
          <Label x={p.x} y={p.y + (p.t.endsWith("+") ? -13 : 14)} size={8.5} anchor="middle" color="#ffffff" bold>
            {p.t}
          </Label>
        </g>
      ))}
      <Can cx={68} cy={96} r={14} />
      <rect x={92} y={50} width={36} height={8} fill={part.metal} />
      <rect x={92} y={58} width={36} height={40} rx={2} fill={part.epoxy} stroke={part.epoxyHi} />
      <Mark x={110} y={78} size={7.5} color="#ffffff">
        LM2596
      </Mark>
      <rect x={96} y={110} width={26} height={12} rx={1.5} fill={part.epoxy} stroke={part.epoxyHi} />
      <rect x={114} y={110} width={4} height={12} fill={part.metal} />
      <circle cx={158} cy={80} r={26} fill="#3a3f4c" />
      <circle cx={158} cy={80} r={26} fill="none" stroke={vizColors.copper} strokeWidth={9} strokeDasharray="3.1 2.2" />
      <circle cx={158} cy={80} r={13} fill={BOARD} stroke="#2f63d6" />
      <rect x={134} y={104} width={20} height={20} rx={2} fill="#2563eb" stroke="#93c5fd" />
      <circle cx={144} cy={114} r={6} fill="#cbd5e1" />
      <line x1={140} y1={114} x2={148} y2={114} stroke="#475569" strokeWidth={1.6} />
      <Can cx={176} cy={120} r={12} />
      <Flow points={CURRENT_PATH} on={on} n={5} dur={2.4} r={2.8} />
      <Note x={122} y={168} color={part.ink} size={10.5}>
        LM2596 buck module, 150 kHz, 3 A
      </Note>
      <Note x={268} y={34} size={10}>
        switch node
      </Note>
      <ScrollClip x={230} y={42} w={76} h={44} period={PERIOD} dur={1.4} on={on}>
        <path d={squarePath(230, 230 + 76 + PERIOD, 52, 82, PERIOD, DUTY)} stroke={vizColors.cyan} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <Note x={268} y={100} size={10}>
        inductor current
      </Note>
      <ScrollClip x={230} y={108} w={76} h={34} period={PERIOD} dur={1.4} on={on}>
        <path d={rampPath(230, 230 + 76 + PERIOD, 126, 18)} stroke={vizColors.orange} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <Mark x={268} y={158} size={10.5} color="#ffffff">
        Vout = D × Vin
      </Mark>
      <Note x={268} y={174} size={10}>
        12 V to 3.3 V
      </Note>
      <Note x={268} y={187} size={10}>
        D = 27%
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "buck-converter",
  name: "Buck converter",
  category: "active",
  oneLiner: "A switching regulator that chops the input and averages it with an inductor, stepping voltage down at 85-95% efficiency.",
  howItWorks: [
    "A buck converter switches the input on and off at 100 kHz-2 MHz through a MOSFET. While the switch is on, current ramps up in the inductor. When it turns off, the inductor current keeps flowing through a freewheel diode (or a second MOSFET in a synchronous buck). The inductor and output capacitor average the pulses, so Vout = D × Vin, where D is the duty cycle.",
    "To get 3.3 V from 12 V, D = 3.3 / 12 = 27.5%. Ripple current in the inductor is ΔI = (Vin − Vout) × D / (f × L). With L = 10 µH at 500 kHz that is (12 − 3.3) × 0.275 / (500 kHz × 10 µH) = 0.48 A peak to peak. A common choice is a ripple of about 30% of the load current.",
    "The output capacitor sets the voltage ripple: ΔV ≈ ΔI / (8 × f × C) plus ΔI × ESR. With 22 µF of ceramic at 500 kHz that is 0.48 / (8 × 500 kHz × 22 µF) = 5.5 mV. A feedback divider sets Vout against the controller's reference (0.6-0.8 V typical), and the control loop corrects duty cycle every cycle against load and input changes.",
    "Integrated parts bundle the switch and controller: the LM2596 (150 kHz, 3 A, external Schottky), the MP1584 (3 A, up to 1.5 MHz) and the TPS54331 (3 A, 570 kHz). Synchronous parts replace the freewheel diode with a low-side MOSFET to reach 95% efficiency. The cheap blue 'LM2596 module' is the version hobbyists meet first.",
  ],
  whereUsed: [
    "The main step-down rail on a robot: a 7.4-12 V battery to 5 V or 3.3 V at 1-3 A for the MCU and sensors.",
    "Point-of-load converters on computer boards, for example 12 V to 1.0 V at 50 A or more for a CPU.",
    "The 12 V auxiliary converter in an EV, stepping down from the 400-800 V pack.",
    "USB charging (a 12 V car supply to 5 V at 3 A) and constant-current LED drivers.",
    "Battery chargers, such as a CC-CV buck charging a Li-ion pack from a solar panel.",
  ],
  keySpecs: [
    { label: "Input voltage", value: "4.5-28 V (MP1584), 4.5-40 V (LM2596); 100 V and more for others" },
    { label: "Output current", value: "1-3 A for modules; 30-100 A for multiphase" },
    { label: "Switching frequency", value: "150 kHz (LM2596) to 2 MHz and more" },
    { label: "Efficiency", value: "85-95%; 95% and up for synchronous parts at mid load" },
    { label: "Output ripple", value: "5-50 mV typical" },
    { label: "Light-load current", value: "20-100 µA in pulse-skipping or burst mode" },
  ],
  failureModes: [
    "Layout-induced noise and ringing: the input capacitor, switch and diode form a loop with very high di/dt. A large hot loop radiates EMI and rings the switch node past the switch's voltage rating. Keep it under about 1 cm² and put the input capacitor at the pins.",
    "Inductor saturation at start-up or on a load step: the peak current exceeds Isat, the switch hits its current limit and the converter hiccups or overheats.",
    "Instability from the wrong output capacitance: ceramic ESR is too low for some controllers, and DC-bias derating changes the loop, causing oscillation or ringing on load steps.",
    "Minimum on-time limits: at high Vin and low Vout (24 V to 1.2 V) the needed pulse is shorter than the controller's minimum on-time of about 100 ns, so it skips pulses and produces sub-harmonic ripple.",
  ],
  interviewTip:
    "Interviewer asks: \"How would you choose the inductor for a 12 V to 5 V, 2 A buck converter at 500 kHz?\" A good answer: D = 5/12 = 42%. Pick a ripple of 30-40% of the load, about 0.7 A, so L = (Vin − Vout) × D / (f × ΔI) = 7 × 0.42 / (500 kHz × 0.7 A) ≈ 8.3 µH, so use a standard 10 µH. Peak current is 2 A + 0.29 A = 2.3 A, so choose Isat of at least 3 A and Irms of at least 2 A with low DCR. Then check efficiency (I²·DCR) and output capacitor ripple.",
  relatedLesson: "active-components",
  Illustration: BuckIllustration,
};
