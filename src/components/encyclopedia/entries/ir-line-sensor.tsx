import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Epoxy, Leader, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const FLOOR_Y = 138;

function IrLineIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Reflective infrared sensor above a white floor with a black line: the infrared beam bounces back to the phototransistor on white and is absorbed on black">
      <rect x={14} y={FLOOR_Y} width={292} height={34} rx={3} fill="#e4e7ee" />
      <rect x={14} y={FLOOR_Y} width={292} height={4} fill="#ffffff" opacity={0.6} />
      <rect x={145} y={FLOOR_Y} width={30} height={34} fill="#0a0a0a">
        {on && <animateTransform attributeName="transform" type="translate" from="-130 0" to="130 0" dur="4s" repeatCount="indefinite" />}
      </rect>
      <polygon points={`132,62 148,62 174,${FLOOR_Y} 150,${FLOOR_Y}`} fill={vizColors.amber} opacity={0.26} />
      <polygon points={`150,${FLOOR_Y} 174,${FLOOR_Y} 192,62 168,62`} fill={vizColors.cyan} opacity={0.5}>
        <Anim on={on} name="opacity" values="0.5;0.5;0.08;0.08;0.5;0.5" keyTimes="0;0.37;0.42;0.58;0.63;1" dur={4} />
      </polygon>
      <g stroke={vizColors.amber} strokeWidth={2} strokeDasharray="4 4" fill="none">
        <path d={`M140 62 L162 ${FLOOR_Y}`}>
          <Anim on={on} name="stroke-dashoffset" values="0;-16" dur={0.8} />
        </path>
      </g>
      <Epoxy x={116} y={20} w={88} h={42} r={4} />
      <rect x={128} y={46} width={24} height={16} rx={3} fill="#9ad0f5" opacity={0.9} />
      <circle cx={140} cy={54} r={3} fill="#2b4a63" />
      <rect x={168} y={46} width={24} height={16} rx={3} fill="#050607" stroke="#2a2f3a" />
      <Mark x={160} y={32} size={9.5}>
        TCRT5000
      </Mark>
      <Note x={104} y={34} anchor="end" size={10} color={vizColors.amber}>
        IR LED 940 nm
      </Note>
      <Leader from={[106, 38]} to={[130, 52]} color={vizColors.amber} />
      <Note x={216} y={34} anchor="start" size={10} color={vizColors.cyan}>
        phototransistor
      </Note>
      <Leader from={[214, 38]} to={[190, 52]} color={vizColors.cyan} />
      <line x1={96} y1={64} x2={96} y2={FLOOR_Y} stroke={vizColors.muted} strokeWidth={1} />
      <path d={`M92 68 L96 62 L100 68 M92 ${FLOOR_Y - 6} L96 ${FLOOR_Y} L100 ${FLOOR_Y - 6}`} stroke={vizColors.muted} strokeWidth={1} fill="none" />
      <Note x={90} y={100} anchor="end" size={10}>
        2-5 mm
      </Note>
      <Mark x={242} y={92} size={10} color={part.ink}>
        white: OUT low
      </Mark>
      <Mark x={242} y={106} size={10} color={part.ink}>
        black: OUT high
      </Mark>
      <Note x={160} y={190} size={10}>
        black absorbs the beam, white reflects it
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "ir-line-sensor",
  name: "IR line sensor",
  category: "sensor",
  oneLiner: "An infrared LED and phototransistor pair that tells a robot whether the surface below it is dark or light, used for line following.",
  howItWorks: [
    "A reflective IR sensor (TCRT5000, QRE1113) puts an IR LED (940 nm) and a phototransistor side by side, both aimed at the floor 2-10 mm away. A white surface reflects most of the IR back to the phototransistor, which then conducts, while a black line absorbs the IR and little light returns.",
    "On a typical TCRT5000 module the LED runs through about 150 Ω (roughly 20 mA) and the phototransistor is pulled to the supply through 10 kΩ. The node between them feeds either a comparator (an LM393 with a trimmer sets the threshold, giving a digital output) or the MCU's ADC for an analog value. Over white the output is low, and over black it is high.",
    "The best distance for a TCRT5000 is about 2.5 mm (usable 1-8 mm) and its response peaks at 940 nm. Sunlight and some lamps contain a lot of IR, so modulate the LED at 38 kHz, or read once with the LED off and once on and subtract, to reject ambient light.",
    "For line following, use an array of 5-8 sensors spaced 8-10 mm apart and compute the line position as a weighted average, which then feeds a PID steering loop. Two sensors straddling a 3 cm line are enough for a simple left-right follower.",
  ],
  whereUsed: [
    "Line-following robots: an array of 5-8 sensors under the front of the chassis.",
    "Edge and cliff detection on vacuum robots and tabletop robots, to stop at a drop.",
    "Wheel counting with a striped disc, and object counting on conveyors (slotted and reflective types).",
    "Proximity detection at under 10 cm, for example sensing a hand or a nearby obstacle.",
    "Paper and film presence detection in printers and scanners.",
  ],
  keySpecs: [
    { label: "Emitter wavelength", value: "940 nm infrared LED" },
    { label: "LED current", value: "20 mA typical (60 mA maximum); Vf about 1.25 V" },
    { label: "Sensing distance", value: "1-8 mm, best at about 2.5 mm" },
    { label: "Phototransistor current", value: "About 0.5-1 mA when reflecting off white" },
    { label: "Response time", value: "About 10-20 µs rise and fall" },
    { label: "Module supply", value: "3.3-5 V, about 15-25 mA" },
  ],
  failureModes: [
    "Ambient infrared saturates the phototransistor: sunlight or halogen lamps make every surface read 'white'. Shield the sensor close to the floor, modulate the LED, or calibrate in the real lighting.",
    "Surface dependence: glossy, dark-brown or coloured tape reflects IR differently from how it looks in visible light. Calibrate white and black readings on the real track and recalibrate when lighting changes.",
    "Height drift: lifting the chassis by 5 mm can change the output more than the line does. Keep a fixed mounting height of 2-5 mm and avoid wheel play.",
    "Crosstalk between neighbours in an array when the emitters are too close. Time-multiplex the LEDs so only one fires at a time.",
  ],
  interviewTip:
    "Interviewer asks: \"Your line follower works indoors but fails near a window. Why, and how do you fix it?\" A good answer: sunlight is rich in 940 nm infrared, so the phototransistor saturates and the contrast between line and floor vanishes. Fixes: shield the sensor with a skirt close to the floor, modulate the LED and read with it off and on to subtract the ambient level, calibrate thresholds at start-up, and add hysteresis in the comparator or in software.",
  relatedLesson: "sensors",
  Illustration: IrLineIllustration,
};
