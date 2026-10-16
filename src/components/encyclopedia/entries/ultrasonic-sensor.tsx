import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const TX = { x: 100, y: 96 };
const RX = { x: 220, y: 96 };
const PINS = [
  { x: 124, t: "VCC" },
  { x: 148, t: "TRIG" },
  { x: 172, t: "ECHO" },
  { x: 196, t: "GND" },
] as const;

function Transducer({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={40} fill="#c3cad6" stroke="#8791a6" strokeWidth={2} />
      <circle cx={x} cy={y} r={33} fill="#1f2530" />
      <circle cx={x} cy={y} r={26} fill="none" stroke="#3b4456" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={17} fill="none" stroke="#3b4456" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={8} fill="#2c3342" stroke="#48536a" />
      <Label x={x} y={y + 54} size={10} bold color="#dbe4ff">
        {label}
      </Label>
    </g>
  );
}

function UltrasonicIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="HC-SR04 ultrasonic sensor module with a transmitter and a receiver transducer, a four-pin header, ping rings leaving the transmitter and echo rings returning to the receiver">
      {/* rings sit behind the board so the module stays crisp */}
      {on ? (
        <g fill="none" strokeWidth={2.4}>
          {[0, 1, 2].map((i) => (
            <circle key={`p${i}`} cx={TX.x} cy={TX.y} r={42} stroke={vizColors.amber} opacity={0}>
              <Anim on name="r" values="42;86" dur={2.4} begin={-i * 0.8} />
              <Anim on name="opacity" values="0.85;0" dur={2.4} begin={-i * 0.8} />
            </circle>
          ))}
          {[0, 1, 2].map((i) => (
            <circle key={`e${i}`} cx={RX.x} cy={RX.y} r={86} stroke={vizColors.cyan} opacity={0}>
              <Anim on name="r" values="86;42" dur={2.4} begin={-i * 0.8 - 1.2} />
              <Anim on name="opacity" values="0;0.85" dur={2.4} begin={-i * 0.8 - 1.2} />
            </circle>
          ))}
        </g>
      ) : (
        <g fill="none" strokeWidth={2.2}>
          <circle cx={TX.x} cy={TX.y} r={54} stroke={vizColors.amber} opacity={0.5} />
          <circle cx={TX.x} cy={TX.y} r={68} stroke={vizColors.amber} opacity={0.28} />
          <circle cx={RX.x} cy={RX.y} r={54} stroke={vizColors.cyan} opacity={0.5} />
          <circle cx={RX.x} cy={RX.y} r={68} stroke={vizColors.cyan} opacity={0.28} />
        </g>
      )}
      {PINS.map((p) => (
        <g key={p.t}>
          <rect x={p.x - 3} y={154} width={6} height={20} fill={part.gold} />
          <Label x={p.x} y={185} size={8.5} bold color={vizColors.text} mono>
            {p.t}
          </Label>
        </g>
      ))}
      <rect x={36} y={44} width={248} height={112} rx={5} fill="#1c43a3" stroke="#3b66d8" strokeWidth={1.5} />
      <rect x={146} y={64} width={28} height={20} rx={2} fill={part.epoxy} stroke={part.epoxyHi} />
      <rect x={140} y={112} width={40} height={16} rx={8} fill={part.metal} />
      <Mark x={160} y={120} size={7} color="#222834">
        8.000
      </Mark>
      <Transducer x={TX.x} y={TX.y} label="TX" />
      <Transducer x={RX.x} y={RX.y} label="RX" />
      <Mark x={160} y={34} size={11} color="#ffffff">
        HC-SR04
      </Mark>
      <Note x={20} y={186} anchor="start" size={10}>
        d = v × t / 2
      </Note>
      <Note x={300} y={186} anchor="end" size={10}>
        58 µs per cm
      </Note>
      <Note x={20} y={26} anchor="start" size={10} color={vizColors.amber}>
        40 kHz ping
      </Note>
      <Note x={300} y={26} anchor="end" size={10} color={vizColors.cyan}>
        echo returns
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "ultrasonic-sensor",
  name: "Ultrasonic sensor",
  category: "sensor",
  oneLiner: "Measures distance by timing the echo of a 40 kHz ultrasonic ping; the HC-SR04 reads 2 cm to 4 m for a few dollars.",
  howItWorks: [
    "The HC-SR04 carries two piezo transducers, one to transmit and one to receive. A 10 µs high pulse on TRIG makes the module fire a burst of eight 40 kHz cycles. The ECHO pin then goes high and stays high until the echo returns, so the width of the ECHO pulse equals the round-trip time of flight.",
    "Distance is d = (t × v) / 2, with the speed of sound v = 331.3 + 0.606 × T(°C) m/s, about 343 m/s at 20 °C. A 5.8 ms echo means 0.0058 × 343 / 2 = 0.995 m, and each centimetre of range adds about 58 µs of echo.",
    "Range is about 2 cm to 400 cm with roughly 3 mm resolution in a cone of about 15°, so the sensor reports the nearest strong reflector in the cone rather than a precise point. Measurements must be at least 60 ms apart so earlier echoes die out, which limits the update rate to about 16 Hz.",
    "The module needs 5 V and about 15 mA, and ECHO outputs 5 V, so with a 3.3 V microcontroller divide it with 1 kΩ and 2 kΩ or use a level shifter. Waterproof (JSN-SR04T) and 3.3 V (HC-SR04P) variants exist, and some boards offer I2C or UART output.",
  ],
  whereUsed: [
    "Obstacle avoidance on the course robot: three sensors at 45°, 0° and −45° give left, front and right distances.",
    "Parking sensors, and non-contact tank or liquid-level measurement.",
    "Presence detection and people counting in doorways.",
    "Wall following and docking for small robots.",
    "Low-altitude hold on small drones, below about 2 m, alongside a barometer.",
  ],
  keySpecs: [
    { label: "Range", value: "2-400 cm (best accuracy at 2-200 cm)" },
    { label: "Resolution", value: "About 3 mm; ±3 mm to ±1 cm accuracy if temperature is compensated" },
    { label: "Beam angle", value: "About 15° cone (±15° effective at 30° detection angle)" },
    { label: "Operating frequency", value: "40 kHz" },
    { label: "Supply", value: "5 V, 15 mA" },
    { label: "Trigger", value: "10 µs pulse; at least 60 ms between measurements" },
  ],
  failureModes: [
    "Soft or angled surfaces (fabric, foam, or a wall more than about 30° off-axis) absorb or deflect the ping so the echo never returns. The module reports a long range or no object, and the robot drives into the curtain.",
    "Cross-talk and multi-path: two sensors firing together hear each other, and echoes from side walls give false readings. Stagger the firing by 30-60 ms and take a median of 3-5 samples.",
    "Temperature changes the speed of sound by about 0.6 m/s per °C, so uncorrected error is about ±2% at ±10 °C. Add a temperature sensor if you need accuracy.",
    "Blind zone and timeouts: closer than 2 cm the receiver is still ringing, and with no echo ECHO times out near 38 ms. Handle both in code, or the controller blocks inside pulseIn().",
  ],
  interviewTip:
    "Interviewer asks: \"How does an ultrasonic sensor measure distance, and how would you make it robust on a moving robot?\" A good answer: time of flight, d = v·t/2 with v = 343 m/s, so 58 µs per centimetre. Make it robust by taking a median of 3-5 readings, enforcing a timeout, staggering multiple sensors, compensating temperature, and fusing it with a second sensor type because soft or angled surfaces are invisible to ultrasound. Read the echo with an input-capture timer or interrupt rather than a blocking pulseIn.",
  relatedLesson: "sensors",
  Illustration: UltrasonicIllustration,
};
