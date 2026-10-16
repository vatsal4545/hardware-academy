import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Mark, Note, PartCanvas, ScrollClip, Spin, part, squarePath, useAnimate } from "../shared";

const CX = 82;
const CY = 112;
const SLOTS = 12;
const RING_R = 46;
const CIRC = 2 * Math.PI * RING_R;
const WAVE_X = 188;
const WAVE_W = 116;
const PERIOD = 32;
const LOOP = 8; // seconds per disc revolution; one slot passes every LOOP / SLOTS seconds

function EncoderIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  const slotPeriod = LOOP / SLOTS;
  return (
    <PartCanvas title="Optical rotary encoder: a slotted disc turns between an LED and two photodiodes, producing channel A and channel B square waves 90 degrees apart">
      <circle cx={CX} cy={CY} r={66} fill="#1b2230" stroke="#3a4558" strokeWidth={1.5} />
      <Spin cx={CX} cy={CY} on={on} dur={LOOP}>
        <circle cx={CX} cy={CY} r={RING_R} fill="none" stroke="#7f8aa3" strokeWidth={18} strokeDasharray={`${CIRC / SLOTS / 2} ${CIRC / SLOTS / 2}`} />
        <circle cx={CX} cy={CY} r={14} fill={part.metal} stroke={part.metalLo} />
        <circle cx={CX} cy={CY} r={5.5} fill="#2b303c" />
        <rect x={CX - 1.5} y={CY - 14} width={3} height={8} fill={vizColors.red} />
      </Spin>
      <rect x={CX - 20} y={CY - RING_R - 22} width={40} height={44} rx={4} fill="#0b0d12" stroke="#38445c" opacity={0.92} />
      <circle cx={CX - 4} cy={CY - RING_R} r={3.2} fill={vizColors.cyan} />
      <circle cx={CX + 6} cy={CY - RING_R} r={3.2} fill={vizColors.violet} />
      <Note x={CX} y={190} size={9.5}>
        LED + 2 photodiodes
      </Note>
      <Label x={WAVE_X - 10} y={50} size={12} anchor="end" color={vizColors.cyan} bold>
        A
      </Label>
      <Label x={WAVE_X - 10} y={104} size={12} anchor="end" color={vizColors.violet} bold>
        B
      </Label>
      <ScrollClip x={WAVE_X} y={36} w={WAVE_W} h={40} period={PERIOD} dur={slotPeriod} on={on}>
        <path d={squarePath(WAVE_X, WAVE_X + WAVE_W + PERIOD, 40, 70, PERIOD)} stroke={vizColors.cyan} strokeWidth={2.4} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <ScrollClip x={WAVE_X} y={90} w={WAVE_W} h={40} period={PERIOD} dur={slotPeriod} on={on}>
        <path d={squarePath(WAVE_X - 24, WAVE_X + WAVE_W + PERIOD, 94, 124, PERIOD)} stroke={vizColors.violet} strokeWidth={2.4} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <Note x={WAVE_X + WAVE_W / 2} y={84} size={9.5}>
        B lags A by 90°
      </Note>
      <Mark x={246} y={150} size={10}>
        A leads B: clockwise
      </Mark>
      <Mark x={246} y={166} size={10}>
        B leads A: counter-cw
      </Mark>
      <Mark x={246} y={184} size={10} color="#ffffff">
        4 edges per slot
      </Mark>
      <Note x={20} y={22} anchor="start" color={part.ink} size={10.5}>
        12 slots = 48 counts per turn
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "rotary-encoder",
  name: "Rotary encoder",
  category: "sensor",
  oneLiner: "Turns shaft rotation into digital pulses: an optical or magnetic encoder gives position and speed from A/B quadrature.",
  howItWorks: [
    "An incremental encoder produces two square waves, channels A and B, 90° out of phase as the shaft turns. In an optical encoder a slotted disc interrupts an LED beam read by two photodiodes. In a magnetic encoder, as on N20 gearmotors, a multipole ring magnet passes two Hall sensors.",
    "Direction comes from which channel leads: when A rises while B is low the shaft turns one way, and when A rises while B is high it turns the other. Counting every edge of both channels (4× decoding) multiplies the resolution by four, so a 12 pulses-per-revolution magnetic encoder gives 48 counts per motor turn, and 48 × 30 (a 30:1 gearbox) gives 1440 counts per wheel turn.",
    "Speed is Δcounts/Δt. At 1 kHz sampling, one count per sample is the slowest speed you can resolve, so low speeds read in steps. Controllers often time the gap between edges at low speed and count edges at high speed. An index channel Z gives one pulse per turn for homing.",
    "Absolute encoders (a 12-bit AS5600 magnetic part over I2C, or Gray-coded optical discs) report the angle at power-up with no homing, at higher cost. Mechanical knob encoders (EC11, 20 detents) are the cheap, bouncy version and need debouncing.",
    "Count in hardware: an STM32 timer in encoder mode, or the ESP32's PCNT peripheral, counts edges at up to megahertz rates with no CPU load. Polling in a slow loop, or a busy interrupt, misses edges at speed.",
  ],
  whereUsed: [
    "Wheel odometry on the course robot: an N20 gearmotor with a 12 PPR magnetic encoder gives 1440 counts per wheel turn for position and speed.",
    "Closed-loop speed and position control with PID on DC and servo motors.",
    "Robot-arm joints, CNC machines and 3D printers, including steppers with encoders for closed-loop operation.",
    "User-interface knobs for volume and menus (EC11 types).",
    "Rotor-position feedback in servo drives and EV traction motors (encoders and resolvers).",
  ],
  keySpecs: [
    { label: "Resolution", value: "12-2000 PPR; 4× decoding gives 48-8000 counts per turn" },
    { label: "Outputs", value: "A, B quadrature and optional Z index; 3.3-5 V, open-collector or push-pull" },
    { label: "Maximum speed", value: "6 000-30 000 rpm (optical); signal limit about 100 kHz-1 MHz" },
    { label: "Supply", value: "3.3-5 V at 5-20 mA" },
    { label: "Phase offset", value: "90° ± 22-45° electrical" },
    { label: "Knob type (EC11)", value: "15-30 detents; contact bounce 1-5 ms" },
  ],
  failureModes: [
    "Missed or doubled counts from noise: long unshielded wires, motor PWM noise and slow edges create spurious transitions. Use shielded cable, Schmitt-trigger inputs and small RC filters, or differential RS-422 lines for long runs.",
    "Magnetic encoders need the right magnet gap, about 1-3 mm. Too large a gap gives low signal amplitude and missed counts at some angles.",
    "Software loses counts: polling too slowly, interrupts starved by other handlers, or a 16-bit counter that wraps unnoticed. Use hardware counters and handle wrap-around.",
    "Mechanical wear and bounce in knob encoders: the contacts bounce for 1-5 ms and give wrong direction. Debounce with 10 nF and 10 kΩ or in software.",
  ],
  interviewTip:
    "Interviewer asks: \"How does a quadrature encoder tell you direction, and what is 4× decoding?\" A good answer: A and B are 90° apart, so the order of transitions encodes direction, and the four states form a Gray-code cycle 00, 01, 11, 10. Counting every edge on both channels gives four counts per cycle, quadrupling resolution. Then cover speed from Δcounts/Δt and its quantization at low speed, why you count in a hardware timer, and what to do with an illegal state jump (ignore it and flag an error).",
  relatedLesson: "sensors",
  Illustration: EncoderIllustration,
};
