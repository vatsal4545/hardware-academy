import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Lead, Mark, Note, PartCanvas, part, pathOf, round, useAnimate, type Pt } from "../shared";

const B = 3950;
const R25 = 10000;
const PLOT = { x0: 150, x1: 296, yBase: 148, yTop: 52 };
const R_MAX = 33600; // ohms at 0 degC, from the B equation

/** Resistance of a 10 kOhm, B = 3950 K NTC at `c` degrees Celsius (B-parameter equation). */
function ntc(c: number): number {
  return R25 * Math.exp(B * (1 / (c + 273.15) - 1 / 298.15));
}

function plot(c: number): Pt {
  return [round(PLOT.x0 + (c / 100) * (PLOT.x1 - PLOT.x0)), round(PLOT.yBase - (ntc(c) / R_MAX) * (PLOT.yBase - PLOT.yTop))];
}

const CURVE: Pt[] = Array.from({ length: 41 }, (_, i) => plot(i * 2.5));
const CURVE_PATH = pathOf(CURVE);
const AT_25 = plot(25);

function ThermistorIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Bead-type NTC thermistor on two leads that changes colour from cold to hot, beside the curve of its falling resistance against temperature">
      <Lead x={63} y={106} w={4} h={70} r={1} />
      <Lead x={85} y={106} w={4} h={70} r={1} />
      <ellipse cx={76} cy={76} rx={27} ry={33} fill="#3b82f6" stroke="#0f172a" strokeWidth={1.5}>
        <Anim on={on} name="fill" values="#3b82f6;#ef4444;#3b82f6" dur={5} />
      </ellipse>
      <ellipse cx={66} cy={64} rx={8} ry={14} fill="#ffffff" opacity={0.28} />
      <Mark x={76} y={188} size={10.5}>
        10 kΩ NTC, B = 3950
      </Mark>
      <Note x={76} y={28} color={part.ink} size={10.5}>
        epoxy bead
      </Note>
      <g stroke={vizColors.muted} strokeWidth={1.2} fill="none">
        <line x1={PLOT.x0} y1={PLOT.yBase} x2={PLOT.x1 + 8} y2={PLOT.yBase} />
        <line x1={PLOT.x0} y1={PLOT.yTop - 8} x2={PLOT.x0} y2={PLOT.yBase} />
      </g>
      <path d={CURVE_PATH} stroke={vizColors.cyan} strokeWidth={2.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle r={5} fill={vizColors.amber} cx={on ? undefined : AT_25[0]} cy={on ? undefined : AT_25[1]}>
        {on && <animateMotion path={CURVE_PATH} dur="5s" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" repeatCount="indefinite" />}
      </circle>
      <Label x={PLOT.x0 + 4} y={PLOT.yTop - 18} size={10} anchor="start" color={vizColors.muted}>
        resistance
      </Label>
      <Label x={PLOT.x1} y={PLOT.yBase + 14} size={10} anchor="end" color={vizColors.muted}>
        temperature, 0 to 100 °C
      </Label>
      <Mark x={PLOT.x0 + 8} y={PLOT.yTop - 2} anchor="start" size={9.5} color={vizColors.cyan}>
        33.6 kΩ at 0 °C
      </Mark>
      <Mark x={AT_25[0] + 12} y={AT_25[1] - 8} anchor="start" size={9.5} color="#ffffff">
        10 kΩ at 25 °C
      </Mark>
      <Note x={222} y={178} size={10}>
        about −4.4% per °C at 25 °C
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "thermistor",
  name: "Thermistor",
  category: "sensor",
  oneLiner: "A resistor whose value changes steeply with temperature: the cheap, sensitive way to measure temperature or limit inrush current.",
  howItWorks: [
    "An NTC (negative temperature coefficient) thermistor is a sintered metal-oxide bead whose resistance falls roughly exponentially as it heats: R(T) = R0·exp(B·(1/T − 1/T0)), with temperatures in kelvin. A common 10 kΩ NTC with B = 3950 K reads 10 kΩ at 25 °C, about 3.6 kΩ at 50 °C and about 33.6 kΩ at 0 °C by this equation.",
    "Read it with a voltage divider: a fixed 10 kΩ resistor to Vcc and the NTC to ground feeding the ADC. At 25 °C both are equal, so the output sits at half-supply, the most sensitive point, and a ratiometric ADC reading cancels supply error. Convert resistance to temperature with the B equation (about ±1 °C over a narrow range) or the Steinhart-Hart equation, 1/T = a + b·ln R + c·(ln R)³, which is good to about 0.1 °C over a wide range.",
    "Sensitivity is about −B/T² = −4.4% per °C at 25 °C, far more than a platinum RTD's 0.385% per °C, but strongly non-linear, and the part is useful from about −40 to +125 °C. Self-heating from the divider current (P = I²R, about 0.3 mW here) can add 0.1-0.5 °C of error in still air.",
    "PTC thermistors go the other way: resistance jumps by orders of magnitude above a switching temperature (about 120 °C for ceramic or polymer parts), so they work as self-resetting fuses (polyfuses) and self-regulating heaters. An inrush-current limiter is a high-power NTC, several ohms when cold and a fraction of an ohm when hot, in series with a supply input.",
  ],
  whereUsed: [
    "Battery-pack temperature sensing: an NTC on each module lets the BMS stop charging below 0 °C and above 45 °C.",
    "Motor winding, inverter and heatsink temperature in drives and EV traction systems, used to derate power.",
    "Hotend and heated-bed temperature in 3D printers, typically a 100 kΩ NTC with B = 3950.",
    "Inrush-current limiting in power supplies (NTC) and self-resetting fuses (PPTC polyfuses).",
    "Thermostats in appliances, and ambient compensation for other sensors.",
  ],
  keySpecs: [
    { label: "Resistance R25", value: "10 kΩ common; 100 kΩ for 3D printers; 2.2-47 kΩ also available" },
    { label: "B value", value: "3380-4300 K (B25/85 = 3950 K typical)" },
    { label: "Tolerance", value: "±1% to ±5% on R25; ±0.5% to ±3% on B" },
    { label: "Temperature range", value: "−40 to +125 °C for epoxy beads; glass beads to +300 °C" },
    { label: "Thermal time constant", value: "1-10 s for a bead in still air; 5-30 s for a disc" },
    { label: "Dissipation constant", value: "1-2.5 mW/°C in air" },
  ],
  failureModes: [
    "Self-heating: if the divider current is too high the thermistor warms itself and reads high, and the error varies with airflow. Use 10-100 kΩ resistors and sample briefly.",
    "Wiring faults look like extreme temperatures: an open sensor reads a very low temperature and a short reads a very high one, so heaters and BMS code must treat out-of-range values as faults. A thermistor that falls out of a 3D-printer hotend causes thermal runaway.",
    "Poor resolution at the extremes: with a 12-bit ADC the divider's sensitivity collapses at high temperature, where the NTC falls below 1 kΩ. Pick the divider resistor near the middle of the temperature span.",
    "Slow response and poor thermal contact: the part reads the temperature of what it touches, not the hot spot, and the lag causes control overshoot.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you read a 10 kΩ NTC with a microcontroller and get ±1 °C?\" A good answer: a divider with a 0.1% 10 kΩ resistor from the ADC reference rail so the reading is ratiometric, R = Rfixed·ADC / (ADCmax − ADC), then convert with Steinhart-Hart or the B equation. Average samples to cut noise, mind self-heating, choose the divider for mid-range sensitivity, check the tolerance of R25 and B, and treat open and short readings as faults. Compare it with an RTD, thermocouple or digital sensor.",
  relatedLesson: "batteries-and-bms",
  Illustration: ThermistorIllustration,
};
