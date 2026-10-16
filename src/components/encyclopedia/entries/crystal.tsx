import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Leader, Lead, Note, PartCanvas, ScrollClip, part, sinePath, useAnimate } from "../shared";

function CrystalIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Metal-can quartz crystal with two leads, and a zoomed view of the quartz blank shearing back and forth to give a clock wave">
      <Lead x={83} y={116} w={4} h={60} r={1} />
      <Lead x={115} y={116} w={4} h={60} r={1} />
      <rect x={61} y={22} width={80} height={96} rx={16} fill={part.metal} />
      <rect x={65} y={26} width={16} height={86} rx={8} fill={part.metalHi} opacity={0.55} />
      <rect x={61} y={106} width={80} height={12} rx={5} fill={part.metalLo} />
      <Label x={105} y={52} size={15} color="#161b27" bold mono>
        16.000
      </Label>
      <Label x={105} y={70} size={12} color="#161b27" mono>
        MHz
      </Label>
      <Label x={105} y={90} size={9.5} color="#3a4252" mono>
        HC-49/U
      </Label>
      <Flow points={[[85, 176], [85, 118]]} on={on} n={2} dur={1.4} r={2.4} />
      <Flow points={[[117, 118], [117, 176]]} on={on} n={2} dur={1.4} r={2.4} />
      <Leader from={[142, 62]} to={[190, 62]} />
      <circle cx={238} cy={68} r={46} fill="#0f1626" stroke={vizColors.muted} strokeWidth={1} strokeDasharray="3 3" />
      <g transform="translate(238 68)">
        <g>
          <rect x={-30} y={-13} width={60} height={26} rx={2} fill="#9ad0f5" opacity={0.78} />
          <rect x={-30} y={-15} width={60} height={3} fill={part.gold} />
          <rect x={-30} y={12} width={60} height={3} fill={part.gold} />
          {on && <animateTransform attributeName="transform" type="skewX" values="-16;16;-16" dur="0.8s" repeatCount="indefinite" />}
        </g>
      </g>
      <Note x={238} y={126} size={10}>
        quartz blank, shear mode
      </Note>
      <ScrollClip x={176} y={138} w={124} h={30} period={31} dur={0.8} on={on}>
        <path d={sinePath(176, 340, 153, 11, 31)} stroke={vizColors.cyan} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <Note x={238} y={184} color={part.ink} size={10.5}>
        ±20 ppm = 1.7 s per day
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "crystal",
  name: "Crystal",
  category: "passive",
  oneLiner: "A slice of quartz that vibrates at a precise frequency when excited electrically, giving a microcontroller or radio its time base.",
  howItWorks: [
    "Quartz is piezoelectric: squeezing it makes a voltage, and a voltage flexes it. A thin AT-cut slice between two electrodes resonates mechanically at a frequency set by its thickness (an 8 MHz blank is about 0.2 mm thick) with a Q of 10 000-100 000, so its frequency is exceptionally stable.",
    "Wired across an inverting amplifier (the Pierce oscillator inside most microcontrollers), the crystal makes the loop oscillate at its resonance. Two small load capacitors, typically 12-22 pF, set the exact frequency: the crystal's specified load capacitance is CL = (C1 × C2) / (C1 + C2) + Cstray, with Cstray about 3-5 pF.",
    "Standard values are 32.768 kHz (a 2^15 divider gives exactly 1 Hz for real-time clocks), 8-25 MHz for MCU cores, 25 MHz for Ethernet PHYs and 16 MHz for many USB and AVR designs. Tolerance is ±10-30 ppm, and 20 ppm means 1.7 seconds of error per day.",
    "AT-cut crystals drift along a cubic temperature curve of about ±20 ppm from −40 to +85 °C. A TCXO (temperature-compensated, ±0.5-2.5 ppm) and an OCXO (oven-controlled, ±0.01 ppm or better) trade size, power and cost for stability.",
  ],
  whereUsed: [
    "The system clock of microcontrollers (8-25 MHz) when the internal RC oscillator, good to only ±1-2%, is not accurate enough for USB or CAN timing.",
    "32.768 kHz crystals for real-time clocks and low-power sleep timers.",
    "Radio and Ethernet reference clocks (25 or 26 MHz), where frequency error appears directly as link errors.",
    "UART and CAN timing in noisy industrial equipment, where baud-rate error must stay under 1-2%.",
    "Reference oscillators in GPS receivers and test instruments, using TCXO or OCXO parts.",
  ],
  keySpecs: [
    { label: "Frequency", value: "32.768 kHz, and 8-48 MHz for common MCU crystals" },
    { label: "Frequency tolerance", value: "±10-30 ppm at 25 °C" },
    { label: "Load capacitance CL", value: "6-20 pF (match the load capacitors to it)" },
    { label: "ESR", value: "30-100 Ω for MHz crystals; 50-70 kΩ for 32.768 kHz" },
    { label: "Drive level", value: "10-100 µW maximum" },
    { label: "Packages", value: "HC-49 can, 3.2 × 2.5 mm SMD, 2 × 1.2 mm tuning fork" },
  ],
  failureModes: [
    "Wrong load capacitance pulls the frequency by tens to hundreds of ppm, enough to break USB or CAN timing even though the oscillator runs.",
    "Failure to start: a high-ESR crystal paired with a low-gain oscillator works on the bench and refuses to start when cold or aged. Check the negative-resistance margin, which should be at least 5 times the crystal ESR.",
    "Noise and layout: long traces, copper pours under the crystal or a nearby switching node inject jitter. Keep traces short, guard them with ground and route nothing underneath.",
    "Overdrive and shock: too much drive level or a mechanical shock can crack the quartz blank, and an over-driven part can jump to an overtone and run at the wrong frequency.",
  ],
  interviewTip:
    "Interviewer asks: \"Your microcontroller runs from a crystal but sometimes does not start on cold mornings. What do you check?\" A good answer: oscillator margin first, meaning crystal ESR and drive level against the MCU's gain; then the load capacitors (CL1 = CL2 = 2 × (CL − Cstray), so 16 pF for a 12 pF crystal with 4 pF stray); then supply ramp and layout. Measure with a low-capacitance probe (under 1 pF), because a normal 10 pF scope probe loads the oscillator and changes its behaviour.",
  relatedLesson: "active-components",
  Illustration: CrystalIllustration,
};
