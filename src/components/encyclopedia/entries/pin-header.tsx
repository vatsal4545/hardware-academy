import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Flow, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const PITCH = 25.4;
const X0 = 96.5;
const PINS = Array.from({ length: 6 }, (_, i) => X0 + i * PITCH);
// Lift, slide one position along, drop, pause, then lift and return.
const PATH = `0 0;0 0;0 -30;${PITCH} -30;${PITCH} 0;${PITCH} 0;${PITCH} -30;0 -30;0 0`;
const TIMES = "0;0.12;0.25;0.4;0.5;0.62;0.75;0.88;1";

function PinHeaderIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Six-pin 2.54 millimetre male pin header with a black plastic spacer and gold pins, and a shorting jumper that lifts and moves from the first pair of pins to the next">
      {PINS.map((x, i) => (
        <g key={x}>
          <rect x={x - 3.2} y={56} width={6.4} height={56} fill={part.gold} />
          <path d={`M${x - 3.2} 56 L${x} 50 L${x + 3.2} 56 Z`} fill="#f1d27a" />
          <rect x={x - 3.2} y={132} width={6.4} height={30} fill={part.gold} opacity={0.9} />
          <Label x={x} y={176} size={10} bold color={vizColors.muted} mono>
            {i + 1}
          </Label>
        </g>
      ))}
      <rect x={83.8} y={108} width={152.4} height={26} rx={2} fill={part.epoxy} stroke={part.epoxyHi} strokeWidth={1.2} />
      <rect x={86} y={110} width={148} height={5} rx={2} fill="#ffffff" opacity={0.08} />
      {PINS.slice(0, -1).map((x) => (
        <line key={x} x1={x + PITCH / 2} y1={110} x2={x + PITCH / 2} y2={132} stroke={part.epoxyHi} strokeWidth={1} />
      ))}
      <g>
        <rect x={X0 - 14} y={66} width={PITCH + 28} height={38} rx={3} fill="#1b2748" stroke="#4863a8" strokeWidth={1.2} />
        <rect x={X0 - 11} y={69} width={PITCH + 22} height={5} rx={2} fill="#ffffff" opacity={0.14} />
        <rect x={X0 - 9} y={94} width={PITCH + 18} height={5} rx={1.5} fill={part.metal} />
        <Flow points={[[X0, 96.5], [X0 + PITCH, 96.5]]} on={on} n={2} dur={1} r={2.2} />
        {on && <animateTransform attributeName="transform" type="translate" values={PATH} keyTimes={TIMES} dur="5s" repeatCount="indefinite" />}
      </g>
      <g stroke={vizColors.muted} strokeWidth={1} fill="none">
        <path d={`M${PINS[3]} 40 H${PINS[4]} M${PINS[3]} 36 V44 M${PINS[4]} 36 V44`} />
      </g>
      <Note x={(PINS[3] + PINS[4]) / 2} y={28} size={10}>
        2.54 mm
      </Note>
      <Note x={20} y={24} anchor="start" color={part.ink} size={10.5}>
        1 × 6 male header
      </Note>
      <Mark x={300} y={64} anchor="end" size={9.5}>
        0.64 mm pins
      </Mark>
      <Mark x={300} y={80} anchor="end" size={9.5}>
        1 A per pin
      </Mark>
      <Note x={10} y={62} anchor="start" size={9.5} color={vizColors.cyan}>
        jumper shorts
      </Note>
      <Note x={10} y={75} anchor="start" size={9.5} color={vizColors.cyan}>
        two pins
      </Note>
      <Note x={160} y={194} size={10}>
        tails go through the board, solder on the far side
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "pin-header",
  name: "Pin header",
  category: "connector",
  oneLiner: "A row of 0.1 inch (2.54 mm) square pins soldered into a board: the universal breadboard-friendly way to connect modules, programmers and jumpers.",
  howItWorks: [
    "A pin header is a strip of gold- or tin-plated brass pins, 0.64 mm (0.025 inch) square, held in a black plastic spacer at 2.54 mm (0.1 inch) pitch. Male headers solder into plated through-holes, female headers (sockets) accept the pins, and Dupont jumper wires crimp a female socket onto each wire for breadboards and prototyping.",
    "The pitch dates from the DIP package era: a DIP chip's pins are 0.1 inch apart, so breadboards, perfboards, headers, sockets and modules (the Arduino, the Raspberry Pi's 2 × 20 GPIO) all share one grid. Variants include 1.27 mm (0.05 inch) for Arm SWD debug ports, 2.0 mm for XBee and ESP modules, and right-angle and SMD versions.",
    "A standard header is about 11.5 mm long in total: roughly 3 mm of tail through the board, 2.5 mm of plastic and 6 mm of mating pin. Vendors rate it at up to 3 A per pin and 250 V, but keep to about 1 A when many adjacent pins carry load. Contact resistance is 10-20 mΩ and insertion force 0.5-1 N per pin.",
    "For the footprint, use a finished hole of about 1.0 mm with 1.7-1.8 mm pads for the 0.64 mm square pin (its diagonal is 0.9 mm). On a 2.54 mm pitch that leaves about 0.8 mm between pads, enough for one trace at 6 mil width and clearance. To solder a header square, tack one pin, check alignment, then solder the rest, or seat it in a breadboard to hold it upright.",
  ],
  whereUsed: [
    "Programming and debug ports: UART (4-pin), SWD (5-pin, 0.1 inch or 1.27 mm) and AVR ICSP (2 × 3).",
    "Breakout module interfaces: IMU, ultrasonic and other sensor boards plug into female headers using Dupont jumpers.",
    "Jumpers (shorting blocks) that choose a configuration such as an I2C address, boot mode or supply voltage.",
    "Stackable shield headers (Arduino) and the Raspberry Pi GPIO connector.",
    "Test points for bring-up: a 1 × 2 header on a rail lets you clip a probe on or measure current in series.",
  ],
  keySpecs: [
    { label: "Pitch", value: "2.54 mm (0.1 inch); 2.0 mm and 1.27 mm also common" },
    { label: "Pin size", value: "0.64 mm square for a 1.0 mm finished hole" },
    { label: "Current rating", value: "1-3 A per pin" },
    { label: "Voltage rating", value: "250 V AC or DC" },
    { label: "Contact resistance", value: "20 mΩ or less; insulation resistance 1000 MΩ" },
    { label: "Mating cycles", value: "About 100 (tin) or 500 and more (gold)" },
  ],
  failureModes: [
    "Intermittent contact on breadboards and Dupont leads: 0.64 mm pins in worn sockets give resistance spikes, so a robot in motion drops sensor power or I2C lines. Solder it, or use locking connectors such as JST for anything that moves.",
    "Mis-plugging: with no polarity key, a 2 × 5 header can go in rotated 180° (ICSP, JTAG), shorting VCC to GND. Use shrouded box headers, add keying and mark pin 1 on the silkscreen.",
    "Solder-joint failure: strain on tall pins fatigues the joint, and cold joints come from poor wetting. Use flux and enough heat, and support the header during repeated insertions.",
    "Bent pins and bridges: forced insertion bends pins or crosses rows, and fine 1.27 mm SWD headers are prone to solder bridges between adjacent pins.",
  ],
  interviewTip:
    "Interviewer asks: \"Why would you add headers or test points to a production board, and where would you put them?\" A good answer: for bring-up and debugging access. That means a programming and debug header (SWD, UART console), test points on every power rail and key signal (I2C, reset, enable) on one side within reach of a probe (1.5 mm or larger pads, or 2.54 mm for clips), Tag-Connect footprints for no-component debugging, clear silkscreen with pin 1 marked, and current-measurement jumpers on the rails. Weigh the cost and board space against the ability to diagnose faults.",
  relatedLesson: "bring-up-and-debugging",
  Illustration: PinHeaderIllustration,
};
