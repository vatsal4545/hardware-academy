import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const SX = 196; // flat face of the sensor body
const SY = 104;

function HallIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="A3144 Hall effect switch in a TO-92 package seen from above, with a bar magnet that moves toward its flat face; the output lamp lights when the magnet is close">
      <path d={`M${SX} ${SY - 38} A38 38 0 0 1 ${SX} ${SY + 38} Z`} fill={part.epoxy} stroke={part.epoxyHi} strokeWidth={1.5} />
      <path d={`M${SX + 4} ${SY - 32} A32 32 0 0 1 ${SX + 4} ${SY + 32} Z`} fill="#ffffff" opacity={0.05} />
      <rect x={SX - 2} y={SY - 38} width={3} height={76} fill={part.metalHi} opacity={0.5} />
      <Mark x={SX + 24} y={SY} size={10.5} color="#ffffff">
        A3144
      </Mark>
      <path d={`M${SX - 70} ${SY} H${SX - 2}`} stroke={vizColors.cyan} strokeWidth={2.4} strokeDasharray="5 4" opacity={on ? 0.1 : 0.7}>
        <Anim on={on} name="opacity" values="0.1;0.1;0.95;0.95;0.1;0.1" keyTimes="0;0.25;0.45;0.62;0.8;1" dur={4} />
      </path>
      <g transform={on ? undefined : "translate(34 0)"}>
        <g>
          <path d="M120 88 C142 52 52 52 62 88" stroke={vizColors.muted} strokeWidth={1.4} fill="none" strokeDasharray="3 3" opacity={0.7} />
          <path d="M120 120 C142 156 52 156 62 120" stroke={vizColors.muted} strokeWidth={1.4} fill="none" strokeDasharray="3 3" opacity={0.7} />
          <rect x={46} y={86} width={36} height={36} rx={2} fill={vizColors.red} />
          <rect x={82} y={86} width={36} height={36} rx={2} fill={vizColors.blue} />
          <Label x={64} y={104} size={15} bold color="#ffffff">
            N
          </Label>
          <Label x={100} y={104} size={15} bold color="#ffffff">
            S
          </Label>
          {on && <animateTransform attributeName="transform" type="translate" values="0 0;62 0;62 0;0 0" keyTimes="0;0.4;0.62;1" dur="4s" repeatCount="indefinite" />}
        </g>
      </g>
      <circle cx={262} cy={40} r={9} fill="#1f2937" stroke={vizColors.muted}>
        <Anim on={on} name="fill" values="#1f2937;#1f2937;#34d399;#34d399;#1f2937;#1f2937" keyTimes="0;0.3;0.42;0.62;0.72;1" dur={4} />
      </circle>
      <Label x={262} y={60} size={10} color={vizColors.muted}>
        OUT (active low)
      </Label>
      <Note x={20} y={22} anchor="start" color={part.ink} size={10.5}>
        A3144 Hall switch, TO-92
      </Note>
      <Note x={20} y={36} anchor="start" size={10}>
        top view, flat face to the left
      </Note>
      <Mark x={160} y={160} size={10.5} color="#ffffff">
        operates at 7-35 mT
      </Mark>
      <Note x={160} y={178} size={10}>
        south pole at the marked face turns it on
      </Note>
      <Note x={160} y={192} size={10}>
        field falls roughly as 1 / gap³
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "hall-sensor",
  name: "Hall sensor",
  category: "sensor",
  oneLiner: "Detects magnetic field with a Hall element, so it can sense magnets, rotor position and current without any contact.",
  howItWorks: [
    "When current flows through a thin semiconductor plate and a magnetic field passes through it at right angles, the charge carriers are pushed sideways and a small Hall voltage appears across the plate: VH = I·B / (n·q·t). On-chip amplifiers and comparators turn those microvolts into a usable signal.",
    "Digital types are switches and latches. The A3144 is a unipolar switch with an open-collector output (4.5-24 V supply, 25 mA sink): the output goes low when a south pole of roughly 7-35 mT (70-350 gauss) reaches the marked face, and releases about 2-3 mT lower. Bipolar latches such as the US1881 and DRV5013 switch on one pole and off on the opposite one, which is what BLDC motors use.",
    "Linear types (SS49E, DRV5055, A1324) give a ratiometric analog output: Vcc/2 at zero field plus 1.4 mV per gauss for the SS49E over about ±650 G. They measure field strength, distance to a magnet, or the current in a conductor through a core. The ACS712-05B is a Hall current sensor with 185 mV per amp and an 80 kHz bandwidth.",
    "Three Hall sensors spaced 120° electrical around a BLDC motor give a 3-bit code that changes every 60° and tells the controller which windings to energise (six-step commutation). The same idea gives wheel speed (a sensor reading a magnet or gear tooth), e-bike throttles and non-contact angle sensing (AS5600 reads a diametric magnet to 12 bits).",
  ],
  whereUsed: [
    "BLDC motor commutation: three Hall sensors in a hobby or e-bike motor tell the controller the rotor position in 60° steps.",
    "Wheel speed and cadence: a magnet on the wheel and one Hall sensor give one pulse per turn.",
    "Position and limit sensing: door-open detection, flap angle, joysticks and throttles (linear types).",
    "Contactless current measurement with ACS712 or ACS758 parts and core-based sensors in chargers and EV systems.",
    "Magnetic encoders: parts like the AS5600 and AS5048 read a magnet's angle at 12-14 bits.",
  ],
  keySpecs: [
    { label: "Supply", value: "4.5-24 V (A3144); 2.7-6.5 V (SS49E, DRV5055)" },
    { label: "Switching thresholds (A3144)", value: "Operate about 7-35 mT; hysteresis about 2-3 mT" },
    { label: "Linear sensitivity", value: "1.4 mV/G with 2.5 V at zero field (SS49E at 5 V)" },
    { label: "Output", value: "Open-collector, 25 mA sink (A3144); ratiometric analog (SS49E)" },
    { label: "Bandwidth", value: "About 20 kHz (A3144, DRV5055); 80 kHz (ACS712)" },
    { label: "Package", value: "TO-92UA with VCC, GND and OUT; SOT-23 for small parts" },
  ],
  failureModes: [
    "Wrong magnet polarity or orientation: a unipolar switch ignores the wrong pole and responds to one face only, so a magnet fitted backwards gives a 'dead' sensor.",
    "Stray fields and temperature: nearby motor magnets and currents add offsets, and sensitivity drifts about −0.1%/°C. Read linear sensors ratiometrically and calibrate.",
    "Air gap too large: a magnet's field falls roughly with the cube of distance, so doubling the gap leaves one eighth of the field and the sensor switches late or never.",
    "Open-collector with no pull-up: the A3144 only pulls low, so an MCU input without a 4.7-10 kΩ pull-up floats and reads random values.",
  ],
  interviewTip:
    "Interviewer asks: \"How does a BLDC controller know the rotor position, and what are the alternatives?\" A good answer: three Hall sensors 120° apart electrically give six distinct codes per electrical revolution, and each code maps to the two phases to energise (six-step commutation), keeping the stator field about 90° ahead of the rotor. The alternatives are an encoder or resolver for field-oriented control and smooth torque, or sensorless back-EMF zero-crossing detection, which fails at standstill and needs an open-loop start. Halls are cheap and robust but their 60° resolution causes torque ripple.",
  relatedLesson: "actuators-and-drivers",
  Illustration: HallIllustration,
};
