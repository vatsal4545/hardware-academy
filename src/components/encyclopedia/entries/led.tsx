import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Lead, Leader, Mark, Note, PartCanvas, part, round, useAnimate } from "../shared";

const RED = "#ef4444";
const CX = 160;
const CY = 66;

const RAYS = [-170, -150, -130, -110, -90, -70, -50, -30, -10].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x1: round(CX + 38 * Math.cos(a)), y1: round(CY + 38 * Math.sin(a)), x2: round(CX + 54 * Math.cos(a)), y2: round(CY + 54 * Math.sin(a)) };
});

function LedIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="5 millimetre red LED with a domed lens, a longer anode lead and a flat on the cathode side; the glow pulses when current flows">
      {[
        { r: 74, base: 0.05, peak: 0.16 },
        { r: 56, base: 0.08, peak: 0.26 },
        { r: 40, base: 0.12, peak: 0.4 },
      ].map((h) => (
        <circle key={h.r} cx={CX} cy={CY} r={h.r} fill={RED} opacity={h.base}>
          <Anim on={on} name="opacity" values={`${h.base};${h.peak};${h.base}`} dur={1.6} />
        </circle>
      ))}
      <g stroke={RED} strokeWidth={2.6} strokeLinecap="round">
        {RAYS.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} opacity={0.25}>
            <Anim on={on} name="opacity" values="0.15;0.95;0.15" dur={1.6} />
          </line>
        ))}
      </g>
      <Lead x={149} y={134} w={4} h={56} r={1} />
      <Lead x={167} y={134} w={4} h={34} r={1} />
      <path d={`M${CX - 20} 128 V${CY} A20 20 0 0 1 ${CX + 20} ${CY} V128 Z`} fill={RED} fillOpacity={0.4} stroke={RED} strokeWidth={1.5} />
      <rect x={134} y={126} width={52} height={8} rx={2} fill={RED} fillOpacity={0.75} stroke={RED} />
      <rect x={176} y={CY} width={3} height={60} fill="#ffffff" opacity={0.2} />
      <g stroke={part.metal} strokeWidth={3} strokeLinecap="round" fill="none">
        <line x1={151} y1={128} x2={151} y2={86} />
        <line x1={169} y1={128} x2={169} y2={94} />
      </g>
      <path d="M162 92 L176 92 L173 100 L165 100 Z" fill={part.metal} />
      <rect x={166} y={86} width={7} height={6} fill={part.gold} />
      <path d="M151 86 Q160 76 168 86" stroke={part.gold} strokeWidth={1.2} fill="none" />
      <path d="M146 72 A14 14 0 0 1 153 55" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" fill="none" opacity={0.4} />
      <Flow points={[[151, 188], [151, 136]]} on={on} n={3} dur={1.6} r={2.6} />
      <Flow points={[[169, 136], [169, 166]]} on={on} n={2} dur={1.6} r={2.6} />
      <Note x={142} y={166} anchor="end" color={vizColors.amber}>
        anode (+)
      </Note>
      <Note x={142} y={180} anchor="end" size={10}>
        longer lead
      </Note>
      <Note x={184} y={150} anchor="start" color={vizColors.blue}>
        cathode (−)
      </Note>
      <Note x={184} y={164} anchor="start" size={10}>
        shorter lead
      </Note>
      <Note x={206} y={100} anchor="start" size={10}>
        flat edge
      </Note>
      <Leader from={[204, 100]} to={[179, 100]} />
      <Note x={20} y={24} anchor="start" color={part.ink} size={11}>
        5 mm red LED
      </Note>
      <Note x={20} y={39} anchor="start" size={10}>
        Vf about 2 V at 10-20 mA
      </Note>
      <Mark x={300} y={24} anchor="end" size={11}>
        R = (Vs − Vf) / If
      </Mark>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "led",
  name: "LED",
  category: "semiconductor",
  oneLiner: "A p-n junction that emits light when current flows: efficient, fast and long-lived, but it must be current-limited.",
  howItWorks: [
    "In a forward-biased LED, electrons and holes recombine in the active layer and release the energy as photons. The photon energy is set by the semiconductor's band gap, so the colour is the material: AlGaInP gives red and amber (Vf 1.8-2.2 V), InGaN gives blue, green and white (Vf 2.8-3.4 V), and GaAs-based parts give infrared at 1.2-1.6 V.",
    "Brightness follows current, not voltage, and Vf varies from part to part, so an LED is driven through a series resistor or a constant-current driver: R = (Vs − Vf) / If. A standard 5 mm indicator LED runs at 10-20 mA, while modern low-current LEDs are bright at 1-2 mA.",
    "The longer lead is the anode. The flat on the plastic rim, the shorter lead and the larger internal anvil mark the cathode. SMD LEDs have a green mark, a notch or a dot on the cathode side. A 5 mm LED is rated about 20 mA continuous and 30 mA peak, and it tolerates only about 5 V in reverse.",
    "White LEDs are blue LEDs coated with a yellow phosphor, described by colour temperature (2700 K warm to 6500 K cool) and CRI (80-95). Efficacy of 100-200 lm/W is normal for lighting parts. LEDs switch in nanoseconds, so PWM dimming at 1 kHz or more is invisible, and 940 nm IR LEDs modulated at 38 kHz drive remote controls.",
  ],
  whereUsed: [
    "Indicators and status lights on boards, where 1-5 mA is plenty.",
    "General and automotive lighting, display backlights, LED matrices and addressable strips such as the WS2812.",
    "Infrared emitters for remote controls, proximity sensors and the reflective sensors used in line-following robots.",
    "Optocouplers, where an LED and a phototransistor give isolation in gate drivers and mains interfaces.",
    "Fibre-optic transmitters, and UV LEDs for curing and disinfection.",
  ],
  keySpecs: [
    { label: "Forward voltage Vf", value: "Red about 2.0 V; green, blue, white 3.0-3.4 V; IR 1.2-1.5 V" },
    { label: "Forward current If", value: "20 mA typical for 5 mm; 1-5 mA for indicators" },
    { label: "Reverse voltage", value: "About 5 V maximum" },
    { label: "Luminous intensity", value: "20 mcd (standard) to 10 000 mcd (ultra-bright 5 mm)" },
    { label: "Viewing angle", value: "15° (narrow) to 120° (wide)" },
    { label: "Wavelength", value: "About 630 nm red, 525 nm green, 465 nm blue, 940 nm IR" },
  ],
  failureModes: [
    "No current limit: wired straight across 5 V an LED is limited only by its small dynamic resistance, and it can pass hundreds of milliamps and burn out within milliseconds.",
    "Thermal runaway when paralleled: Vf falls with temperature (about −2 mV/°C), so the hotter LED draws more current. Use one resistor per LED instead of sharing one across parallel LEDs.",
    "Lumen depreciation: LEDs fade slowly. L70, the time to 70% brightness, is 25 000-50 000 h at rated junction temperature and far less when overdriven or run hot.",
    "ESD damage: blue and white InGaN LEDs are sensitive to static (about 2 kV HBM), and a damaged LED glows dimly at low current because its junction leaks.",
  ],
  interviewTip:
    "Interviewer asks: \"How do you size the resistor for a red LED on a 3.3 V GPIO, and what current would you choose?\" A good answer: Vf is about 2.0 V and 5 mA is enough for an indicator, so R = (3.3 − 2.0) / 0.005 = 260 Ω, so use 270 Ω (4.8 mA) and check the pin's current limit. Then note that a blue LED with Vf of 3.0 V leaves only 0.3 V of headroom, making current very sensitive to Vf, so use a constant-current driver or a higher supply.",
  relatedLesson: "pn-junction-and-diodes",
  Illustration: LedIllustration,
};
