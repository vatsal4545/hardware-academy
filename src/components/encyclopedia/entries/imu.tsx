import { Label, vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Mark, Note, PartCanvas, part, useAnimate } from "../shared";

const HEADER = ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"] as const;
const OX = 258;
const OY = 112;

function ImuIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="GY-521 breakout board carrying an MPU-6050 six-axis IMU chip with an eight-pin header, and an X, Y, Z axis triad that tilts as the board would">
      <rect x={28} y={40} width={168} height={132} rx={6} fill="#4b2c88" stroke="#7a52c9" strokeWidth={1.5} />
      {HEADER.map((t, i) => {
        const x = 44 + i * 19.5;
        return (
          <g key={t}>
            <circle cx={x} cy={54} r={5.2} fill={part.gold} />
            <circle cx={x} cy={54} r={2.2} fill={part.bg} />
            <Label x={x} y={64} size={7} anchor="start" color="#ffffff" mono rotate={90}>
              {t}
            </Label>
          </g>
        );
      })}
      <rect x={100} y={100} width={34} height={34} rx={2.5} fill={part.epoxy} stroke={part.epoxyHi} />
      <circle cx={106} cy={106} r={2} fill="#46506a" />
      <Mark x={117} y={116} size={7.5} color="#ffffff">
        MPU
      </Mark>
      <Mark x={117} y={126} size={7.5} color="#ffffff">
        6050
      </Mark>
      <rect x={58} y={106} width={22} height={14} rx={2} fill={part.epoxy} stroke={part.epoxyHi} />
      <Mark x={69} y={113} size={6} color={part.ink}>
        3V3
      </Mark>
      {[
        [58, 132],
        [76, 132],
        [150, 106],
        [150, 124],
        [168, 112],
      ].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width={10} height={6} rx={1} fill={part.ceramic} />
      ))}
      <circle cx={44} cy={158} r={4.5} fill={part.bg} stroke={part.gold} />
      <circle cx={180} cy={158} r={4.5} fill={part.bg} stroke={part.gold} />
      <Note x={112} y={188} color={part.ink} size={10.5}>
        GY-521 board, I2C address 0x68
      </Note>
      <g stroke={vizColors.muted} strokeDasharray="3 3" strokeWidth={1.2}>
        <line x1={OX} y1={OY} x2={OX} y2={OY + 56} />
      </g>
      <Note x={OX} y={OY + 72} size={10} color={vizColors.muted}>
        gravity: 1 g down
      </Note>
      <g>
        <g strokeWidth={3} strokeLinecap="round">
          <line x1={OX} y1={OY} x2={OX} y2={OY - 52} stroke={vizColors.blue} />
          <line x1={OX} y1={OY} x2={OX + 44} y2={OY + 26} stroke={vizColors.red} />
          <line x1={OX} y1={OY} x2={OX - 44} y2={OY + 26} stroke={vizColors.green} />
        </g>
        <Label x={OX} y={OY - 62} size={12} color={vizColors.blue} bold>
          Z
        </Label>
        <Label x={OX + 52} y={OY + 32} size={12} color={vizColors.red} bold>
          X
        </Label>
        <Label x={OX - 52} y={OY + 32} size={12} color={vizColors.green} bold>
          Y
        </Label>
        {on && <animateTransform attributeName="transform" type="rotate" values={`-14 ${OX} ${OY};14 ${OX} ${OY};-14 ${OX} ${OY}`} dur="4s" repeatCount="indefinite" />}
      </g>
      <Note x={OX} y={26} size={10} color={part.ink}>
        6 axes: gyro + accel
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "imu",
  name: "IMU",
  category: "sensor",
  oneLiner: "An inertial measurement unit packs a 3-axis accelerometer and 3-axis gyroscope (often a magnetometer too) to track orientation and motion.",
  howItWorks: [
    "A MEMS accelerometer is a tiny proof mass on silicon springs. Acceleration displaces it, and the change in capacitance between comb fingers is converted to a voltage and digitised. It measures specific force, so at rest it reads 1 g (9.81 m/s²) pointing up, which is how it gives tilt.",
    "A MEMS gyroscope drives a mass into vibration (about 20-30 kHz). When the chip rotates, the Coriolis force pushes the mass sideways in proportion to the rotation rate, again sensed capacitively. It reports angular velocity in °/s (the MPU-6050 covers ±250 to ±2000 °/s with 16 bits), and integrating that gives angle.",
    "The two sensors fail in opposite ways. The accelerometer is noisy and corrupted by motion (vibration, centripetal force) but has no long-term drift. The gyro is smooth and fast, but its bias integrates into an angle error that grows without bound. A complementary filter, angle = α(angle + ω·dt) + (1 − α)·atan2(ax, az) with α ≈ 0.98, or a Kalman or Madgwick filter, fuses them.",
    "The MPU-6050 (six axes, 16-bit ADCs, I2C up to 400 kHz at address 0x68 or 0x69, about 3.9 mA) sits on the cheap GY-521 board with a 3.3 V regulator. Newer parts such as the ICM-42688, BMI270 and LSM6DSO have lower noise and output rates up to 32 kHz. A magnetometer (the AK8963 in an MPU-9250) adds absolute heading from Earth's 25-65 µT field but needs hard- and soft-iron calibration.",
  ],
  whereUsed: [
    "Self-balancing robots and drones: tilt angle at 200-1000 Hz inside the control loop.",
    "Dead reckoning between wheel-odometry updates, yaw-rate for turn control and detecting wheel slip.",
    "Phones and wearables: step counting, screen rotation and gesture detection.",
    "Vehicle dynamics: IMUs in EV stability control and in ADAS sensor fusion with GNSS.",
    "Vibration and impact monitoring, such as shipment logging and motor condition monitoring.",
  ],
  keySpecs: [
    { label: "Gyro range and noise", value: "±250 to ±2000 °/s, 0.005 °/s/√Hz (MPU-6050)" },
    { label: "Accelerometer range", value: "±2, ±4, ±8 or ±16 g, 16-bit (MPU-6050)" },
    { label: "Interface", value: "I2C to 400 kHz (MPU-6050); SPI to 10 MHz on newer parts" },
    { label: "Output data rate", value: "Up to 1 kHz (MPU-6050 with filter); up to 32 kHz on newer parts" },
    { label: "Supply", value: "2.4-3.5 V and about 3.9 mA (MPU-6050); the board accepts 3-5 V" },
    { label: "Package", value: "QFN 4 × 4 mm (MPU-6050); LGA 2.5 × 3 mm for newer parts" },
  ],
  failureModes: [
    "Gyro bias and drift: the MPU-6050's zero-rate offset can be several °/s (up to ±20 °/s uncalibrated) and wanders with temperature, so integrated angle drifts by degrees per minute. Average 1-2 seconds of stationary data at start-up and fuse with the accelerometer or magnetometer.",
    "Accelerometer corrupted by vibration and acceleration: on a motor-driven robot it reads vibration, not tilt, unless it is low-pass filtered and soft-mounted.",
    "I2C lock-ups: a reset in the middle of a transaction can leave the slave holding SDA low. Recover by clocking SCL up to nine times, and use 4.7 kΩ pull-ups at 3.3 V levels.",
    "Magnetometer disturbance: nearby currents, magnets and steel distort the heading, so calibrate in place and keep the sensor away from motors and battery leads.",
  ],
  interviewTip:
    "Interviewer asks: \"Why fuse a gyroscope and an accelerometer, and how does a complementary filter work?\" A good answer: the gyro is good in the short term but its bias integrates into drift, while the accelerometer is noisy in the short term but correct in the long term because gravity is a reference. A complementary filter is a high-pass on the gyro angle plus a low-pass on the accelerometer angle, angle = α(angle + ω·dt) + (1 − α)·θacc. With α = 0.98 at 100 Hz the crossover time constant is α·dt/(1 − α) ≈ 0.5 s. Mention Kalman and Madgwick as upgrades, and that yaw needs a magnetometer or vision.",
  relatedLesson: "sensors",
  Illustration: ImuIllustration,
};
