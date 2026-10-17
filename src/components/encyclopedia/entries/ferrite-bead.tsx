import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Lead, Mark, Note, PartCanvas, ScrollClip, part, sinePath, useAnimate } from "../shared";

const WIRE_Y = 112;

function FerriteBeadIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Ferrite bead threaded on a wire: noisy signal on the left, clean signal on the right, noise energy turned into heat in the bead">
      <Lead x={20} y={WIRE_Y - 2.5} w={280} h={5} r={2} />
      <rect x={134} y={WIRE_Y - 26} width={52} height={52} rx={7} fill="#2b303c" stroke="#47506a" />
      <ellipse cx={134} cy={WIRE_Y} rx={9} ry={26} fill="#3a4152" stroke="#47506a" />
      <rect x={142} y={WIRE_Y - 22} width={38} height={6} rx={3} fill="#ffffff" opacity={0.09} />
      <rect x={134} y={WIRE_Y - 26} width={52} height={52} rx={7} fill={vizColors.orange} opacity={0}>
        <Anim on={on} name="opacity" values="0;0.5;0" dur={1.8} />
      </rect>
      <ScrollClip x={22} y={26} w={104} h={44} period={13} dur={0.9} on={on}>
        <path d={sinePath(22, 148, 48, 15, 13)} stroke={vizColors.orange} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <ScrollClip x={194} y={26} w={104} h={44} period={40} dur={2.4} on={on}>
        <path d={sinePath(194, 340, 48, 3, 40)} stroke={vizColors.green} strokeWidth={2.2} fill="none" strokeLinejoin="round" />
      </ScrollClip>
      <Flow points={[[24, WIRE_Y], [296, WIRE_Y]]} on={on} n={5} dur={2.6} r={2.6} />
      <Note x={74} y={84} color={vizColors.orange}>
        noisy in
      </Note>
      <Note x={246} y={84} color={vizColors.green}>
        clean out
      </Note>
      <Mark x={160} y={156} size={13.5} color="#ffffff">
        600 Ω @ 100 MHz
      </Mark>
      <Note x={160} y={176}>
        resistive at high frequency: noise becomes heat
      </Note>
      <Note x={160} y={WIRE_Y - 36} color={part.ink} size={10}>
        ferrite
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "ferrite-bead",
  name: "Ferrite bead",
  category: "passive",
  oneLiner: "A lossy inductor that is mostly resistive at high frequency: it turns noise on a line into a little heat instead of letting it pass.",
  howItWorks: [
    "A ferrite bead is a short conductor threaded through, or wound inside, a lump of lossy ferrite. At low frequency it is just a short wire with 0.02-1 Ω of DC resistance. As frequency rises the ferrite's permeability turns lossy and the impedance goes from inductive to resistive, for example 600 Ω at 100 MHz, so noise energy in that band is absorbed as heat rather than reflected back.",
    "Beads are rated by impedance at 100 MHz rather than inductance: '600 Ω @ 100 MHz', with a DC resistance around 0.2 Ω and a rated current of 0.5-6 A. The datasheet's impedance-versus-frequency curve shows which band the bead actually works in, and a good filter choice starts from that curve and the noise frequency you need to kill.",
    "Placed in series with a supply pin and followed by a capacitor to ground, the bead and capacitor form a low-pass filter that keeps switching noise from a microcontroller's digital rail out of an analog supply. Adding a second capacitor in front of the bead makes a π filter with more attenuation.",
    "Unlike a plain LC filter, a bead barely rings, because its loss damps the resonance. But it stores little energy, so it is a noise filter and not a power inductor. DC bias also reduces the impedance: close to rated current the effective impedance can fall by half or more, so check the DC-bias curve.",
  ],
  whereUsed: [
    "Isolating a noisy digital 3.3 V rail from the analog supply or PLL pins (AVDD, VDDA) of a microcontroller or ADC.",
    "USB, HDMI and Ethernet connector lines, to suppress high-frequency noise leaving or entering the board.",
    "In series with the power input of a motor-controller board, to keep switching noise off the supply cable.",
    "Sensor and audio input lines, to cut RF pickup (for example GSM burst noise) before an op-amp.",
    "Snap-on cable cores on USB and power leads, used to pass EMI limits on a finished product.",
  ],
  keySpecs: [
    { label: "Impedance @ 100 MHz", value: "30 Ω to 2 kΩ (600 Ω is typical)" },
    { label: "DC resistance", value: "0.02-1 Ω" },
    { label: "Rated current", value: "0.2-6 A for 0402 to 1206 chips" },
    { label: "Packages", value: "0402, 0603, 0805, 1206 chips; leaded beads and clamp cores" },
    { label: "Working band", value: "Resistive from roughly 10 MHz to 1 GHz, set by the ferrite material" },
  ],
  failureModes: [
    "Wrong material for the noise band: a bead that is still inductive at the noise frequency forms a high-Q LC resonance with the downstream capacitor and can amplify the noise instead of absorbing it.",
    "DC-bias derating: near rated current the impedance can drop by half, so a bead that filtered well at idle fails to filter under load.",
    "Voltage drop and rail droop: DCR times load current (0.2 Ω × 1 A = 0.2 V) can pull a 1.8 V core rail under its minimum.",
    "Used as a power inductor: its low saturation current and high loss make it overheat, and it is not a substitute for a buck converter's inductor.",
  ],
  interviewTip:
    "Interviewer asks: \"What is the difference between a ferrite bead and an inductor, and when would you use each?\" A strong answer: both look inductive at low frequency, but a bead is designed to be lossy above roughly 10-100 MHz so it absorbs noise as heat, while an inductor is designed to store energy with little loss. Use an inductor in a switching converter or an efficient LC filter, and a bead to isolate supply noise and tame EMI on cables. Mention checking the impedance curve at the real noise frequency and the DC-bias derating.",
  relatedLesson: "power-and-signal-integrity",
  Illustration: FerriteBeadIllustration,
};
