import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Flow, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const ROWS = [68, 92, 116, 140] as const;
const WIRES = ["#ef4444", "#4b5563", "#f59e0b", "#e5e7eb"] as const;
const TRAVEL = 84;
const SPLINE = "0 0 1 1;0.45 0 0.55 1;0 0 1 1;0.45 0 0.55 1;0 0 1 1";

function JstIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="JST-XH four-pin connector: a white housing with four crimped wires slides onto a keyed header soldered to a circuit board, and current flows once they are mated">
      <rect x={252} y={36} width={68} height={140} fill={part.board} />
      <rect x={252} y={36} width={6} height={140} fill="#2a8a62" opacity={0.7} />
      <path d="M156 52 H252 V160 H156 L148 152 V60 Z" fill="#e8eaee" stroke="#9aa3b5" strokeWidth={1.5} />
      <path d="M164 60 H252 V152 H164 Z" fill="#cfd4dd" />
      {ROWS.map((y) => (
        <g key={y}>
          <rect x={170} y={y - 2.5} width={86} height={5} rx={2} fill={part.gold} />
          <rect x={252} y={y - 3.5} width={14} height={7} fill={part.gold} />
        </g>
      ))}
      <g>
        {ROWS.map((y, i) => (
          <line key={y} x1={-40} y1={y} x2={50} y2={y} stroke={WIRES[i]} strokeWidth={4} strokeLinecap="round" />
        ))}
        <path d="M50 54 H110 L116 48 H122 V160 H50 Z" fill="#f3f4f6" stroke="#9aa3b5" strokeWidth={1.5} />
        <rect x={54} y={58} width={60} height={5} rx={2} fill="#ffffff" opacity={0.7} />
        <path d="M82 54 L92 46 L102 54" fill="#d7dbe3" stroke="#9aa3b5" />
        {ROWS.map((y) => (
          <rect key={y} x={90} y={y - 3} width={34} height={6} rx={2} fill={part.metal} stroke={part.metalLo} />
        ))}
        {on && <animateTransform attributeName="transform" type="translate" values={`0 0;0 0;${TRAVEL} 0;${TRAVEL} 0;0 0;0 0`} keyTimes="0;0.15;0.35;0.65;0.85;1" calcMode="spline" keySplines={SPLINE} dur="5s" repeatCount="indefinite" />}
      </g>
      {on && (
        <g>
          <Anim on={on} name="opacity" values="0;0;1;1;0;0" keyTimes="0;0.34;0.4;0.62;0.66;1" dur={5} />
          <Flow points={[[10, ROWS[0]], [300, ROWS[0]]]} on={on} n={5} dur={2} r={2.8} />
          <Flow points={[[300, ROWS[1]], [10, ROWS[1]]]} on={on} n={5} dur={2} r={2.8} />
        </g>
      )}
      <Mark x={20} y={24} anchor="start" size={11} color={part.ink}>
        JST-XH, 4 pins
      </Mark>
      <Note x={300} y={24} anchor="end" size={10}>
        2.5 mm pitch, 3 A per pin
      </Note>
      <Note x={100} y={176} size={10} color={vizColors.muted}>
        crimped wires in a keyed housing
      </Note>
      <Note x={262} y={192} size={10} color={vizColors.muted}>
        header on the PCB
      </Note>
      <Note x={90} y={192} size={10}>
        shape stops it going in backwards
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "jst-connector",
  name: "JST connector",
  category: "connector",
  oneLiner: "A small polarised plastic connector family (JST-XH, PH, SH) that makes reliable, reversible wire-to-board connections on batteries, sensors and motors.",
  howItWorks: [
    "A JST connector is a pair: a header (shrouded pins soldered to the board) and a housing that holds crimped contacts on the wire ends. Tin-plated phosphor-bronze or brass contacts are crimped onto the stripped wire and snap into the housing, where a locking lance holds them, and the keyed shape of the shroud stops the housing going in backwards.",
    "Families are defined by pitch. XH is 2.5 mm (3 A, 250 V, 22-30 AWG, the standard for LiPo balance leads), PH is 2.0 mm (2 A), GH is 1.25 mm (1 A) and SH is 1.0 mm (1 A, used for the Qwiic and STEMMA QT I2C connectors). Small LiPo batteries usually carry a 2-pin PH connector.",
    "A good crimp is made with the right tool (a ratcheting crimper such as the IWISS SN-28B) and has two stages: the conductor barrel grips the copper in a gas-tight cold weld, and the insulation barrel grips the jacket as strain relief. A poor crimp, or a soldered joint without strain relief, breaks where the wire meets the contact.",
    "JST is a mechanical standard, not an electrical one. Different vendors wire a 2-pin PH battery connector with opposite polarity, so a plug that fits physically can reverse power and ground and destroy a board. Always check pin 1 and the battery's pinout with a meter before first connection.",
    "Alternatives include Molex KK (2.54 mm), Dupont 0.1 inch headers (cheap, no latch, about 1 A), Molex Micro-Fit (3.0 mm, 8.5 A), XT30, XT60 and XT90 power connectors (15, 30 and 90 A) and Anderson Powerpole.",
  ],
  whereUsed: [
    "LiPo and Li-ion battery connections and balance leads, using JST-XH for 2S-6S balance leads and PH for small packs.",
    "Sensor and encoder cables on robots, such as N20 motor-encoder harnesses and ultrasonic and IMU modules on PH or SH.",
    "Qwiic and STEMMA QT I2C chaining over 1.0 mm JST-SH, four pins.",
    "Board-to-board links, LED strips and fans in enclosures, and small stepper motors on 4-pin XH or PH.",
    "Quick-disconnect power for small robots and drones, using XT30 for about 15 A.",
  ],
  keySpecs: [
    { label: "Pitch", value: "XH 2.5 mm, PH 2.0 mm, GH 1.25 mm, SH 1.0 mm" },
    { label: "Current rating", value: "3 A (XH), 2 A (PH), 1 A (GH and SH) per contact" },
    { label: "Voltage rating", value: "250 V AC (XH), 100 V (PH), 50 V (GH and SH)" },
    { label: "Wire gauge", value: "22-30 AWG (XH); 24-30 AWG (PH); 28-32 AWG (SH)" },
    { label: "Mating cycles", value: "About 50 (XH, PH); about 30 (SH)" },
    { label: "Contact resistance", value: "20 mΩ or less per contact" },
  ],
  failureModes: [
    "Reversed polarity from vendor pinout differences: the connector mates but power and ground are swapped. Re-pin the plug, add reverse-polarity protection such as a P-channel FET, and label the harness.",
    "Crimp failures: a loose crimp or broken strands at the contact gives intermittent resistance (20 mΩ can become 200 mΩ), heating and voltage drops, and flex fatigue near the crimp breaks wires in moving robot cables. Use strain relief.",
    "Running at the rating: XH is rated 3 A per pin, and at 5 A the contacts heat, oxidise and can melt the housing. Above 3 A use XT30 or XT60, or share the current across pins.",
    "Wear and vibration: only 30-50 mating cycles, and PH and XH housings have only a light friction latch, so vibration unseats them on drones and robots. Use locking housings or secure them with a cable tie.",
  ],
  interviewTip:
    "Interviewer asks: \"Your robot resets only when it drives over bumps. Which connector problems could cause that?\" A good answer: look at the power-path connectors under vibration. An unlatched or poorly crimped battery connector gives momentary opens, the rail dips and the MCU browns out. Confirm with a scope on the 5 V rail triggered on dips, then check crimp quality and strain relief, compare the connector's current rating (3 A for XH) with motor stall current, switch to a locking connector such as XT30 or Micro-Fit, and add bulk capacitance at the load and a brown-out log.",
  relatedLesson: "build-your-smart-robot",
  Illustration: JstIllustration,
};
