import { vizColors } from "@/components/viz/shared";
import type { ComponentEntry } from "../types";
import { Anim, Mark, Note, PartCanvas, Spin, part, round, useAnimate } from "../shared";

const CX = 160;
const CY = 102;
const SPIN = 4; // seconds per revolution
const OBSTACLES = [
  { x: 216, y: 76, r: 13 },
  { x: 100, y: 132, r: 12 },
];

/** Distance from the scanner to the nearest wall or obstacle along `deg` (0 = right, clockwise on screen). */
function range(deg: number): number {
  const a = (deg * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (276 - CX) / dx);
  if (dx < -1e-6) t = Math.min(t, (44 - CX) / dx);
  if (dy > 1e-6) t = Math.min(t, (176 - CY) / dy);
  if (dy < -1e-6) t = Math.min(t, (28 - CY) / dy);
  for (const o of OBSTACLES) {
    const fx = CX - o.x;
    const fy = CY - o.y;
    const b = fx * dx + fy * dy;
    const disc = b * b - (fx * fx + fy * fy - o.r * o.r);
    if (disc >= 0) {
      const hit = -b - Math.sqrt(disc);
      if (hit > 0) t = Math.min(t, hit);
    }
  }
  return t;
}

const POINTS = Array.from({ length: 90 }, (_, i) => {
  const deg = i * 4;
  const t = range(deg);
  const a = (deg * Math.PI) / 180;
  return { deg, x: round(CX + t * Math.cos(a), 1), y: round(CY + t * Math.sin(a), 1) };
});

function LidarIllustration({ animate }: { animate?: boolean }) {
  const on = useAnimate(animate);
  return (
    <PartCanvas title="Top view of a spinning 2D lidar in a room: a laser beam sweeps around and lights up the points where it hits walls and obstacles, building a map">
      <rect x={44} y={28} width={232} height={148} rx={3} fill="none" stroke="#243049" strokeWidth={1.2} strokeDasharray="2 4" />
      {OBSTACLES.map((o) => (
        <circle key={`${o.x}${o.y}`} cx={o.x} cy={o.y} r={o.r} fill="none" stroke="#243049" strokeWidth={1.2} strokeDasharray="2 4" />
      ))}
      {POINTS.map((p) => (
        <circle key={p.deg} cx={p.x} cy={p.y} r={2.4} fill={vizColors.red} opacity={on ? 0.15 : 0.85}>
          <Anim on={on} name="opacity" values="1;0.12" keyTimes="0;1" dur={SPIN} begin={(p.deg / 360) * SPIN - SPIN} />
        </circle>
      ))}
      <g transform={on ? undefined : `rotate(-35 ${CX} ${CY})`}>
        <Spin cx={CX} cy={CY} on={on} dur={SPIN}>
          <path d={`M${CX} ${CY} L${CX + 124} ${CY - 12} L${CX + 124} ${CY + 12} Z`} fill={vizColors.red} opacity={0.12} />
          <line x1={CX} y1={CY} x2={CX + 124} y2={CY} stroke={vizColors.red} strokeWidth={1.6} opacity={0.85} />
        </Spin>
      </g>
      <circle cx={CX} cy={CY} r={15} fill={part.epoxy} stroke={part.epoxyHi} strokeWidth={1.5} />
      <circle cx={CX} cy={CY} r={5} fill={vizColors.red} opacity={0.9} />
      <Note x={20} y={20} anchor="start" color={part.ink} size={10.5}>
        2D lidar, top view
      </Note>
      <Mark x={300} y={20} anchor="end" size={10}>
        sample = angle + distance
      </Mark>
      <Note x={20} y={192} anchor="start" size={10}>
        RPLIDAR A1: 12 m range
      </Note>
      <Note x={300} y={192} anchor="end" size={10}>
        8000 samples/s
      </Note>
    </PartCanvas>
  );
}

export const entry: ComponentEntry = {
  id: "lidar",
  name: "Lidar",
  category: "sensor",
  oneLiner: "Measures distance with laser light; a spinning or solid-state scanner turns single ranges into a 2D or 3D map around the robot.",
  howItWorks: [
    "Time-of-flight lidar fires a short laser pulse (905 or 1550 nm) and times the reflection: distance = c·t/2, so 10 m is a 66.7 ns round trip and 1 cm of resolution needs about 67 ps of timing. Single-point modules such as the VL53L0X use a 940 nm VCSEL and a SPAD array with a time-to-digital converter, and read up to 2 m over I2C at about 30 Hz for a few dollars.",
    "Low-cost spinning scanners such as the RPLIDAR A1 use laser triangulation instead: a laser spot lands at a position on a small camera chip that depends on range, so the distance follows from triangle geometry. It reaches 12 m at 8000 samples per second and about 5.5 turns per second (roughly 1450 points per scan), but resolution is about 1% of range and sunlight can blind it.",
    "A motor spins the emitter and receiver, and each sample is an (angle, distance) pair, giving a polar scan of one plane at sensor height. 3D lidars stack 16-128 laser and detector pairs (a Velodyne VLP-16 makes 300 000 points per second) or use solid-state scanning such as MEMS mirrors, optical phased arrays and flash illumination.",
    "The scans feed SLAM and obstacle-avoidance software. Each scan is aligned with the previous one by scan matching (ICP) to estimate motion, and the points are accumulated into an occupancy grid or a point-cloud map that a planner can use.",
  ],
  whereUsed: [
    "Warehouse and service robots: a 2D lidar 10-20 cm above the floor for SLAM and obstacle avoidance.",
    "Robot vacuum cleaners (the turret on top is a 2D lidar) and drones (altimeters such as the Garmin LIDAR-Lite).",
    "Autonomous vehicles and robotaxis, with 3D lidars on the roof and bumpers at 100-250 m range.",
    "Surveying and mapping: terrestrial and airborne scanners producing centimetre-accurate point clouds.",
    "Small robots, using VL53L0X or VL53L1X modules as a compact ranging sensor.",
  ],
  keySpecs: [
    { label: "Range", value: "0.03-2 m (VL53L0X); 0.15-12 m (RPLIDAR A1); 100-250 m (automotive)" },
    { label: "Accuracy", value: "±3% (VL53L0X); about 1% of range (RPLIDAR A1); ±2 cm (automotive)" },
    { label: "Scan rate", value: "5-15 Hz (2D); 10-20 Hz (3D)" },
    { label: "Angular resolution", value: "About 1° (RPLIDAR A1); 0.1-0.4° (3D automotive)" },
    { label: "Wavelength", value: "785 nm (A1), 905 nm, 940 nm VCSEL, 1550 nm (eye-safe at high power)" },
    { label: "Eye safety", value: "Class 1 (IEC 60825-1) for robot-grade units" },
  ],
  failureModes: [
    "Glass, mirrors, and black or shiny surfaces: windows pass the beam, mirrors deflect it, and very dark or angled surfaces return too little light, so obstacles vanish from the scan.",
    "Sunlight and other lidars: sunlight raises the noise floor at 905 and 940 nm, and nearby units cause ghost points. Narrow optical filters and coded pulse trains mitigate it.",
    "Rain, fog, dust and snow create false near returns and cut the range. 1550 nm light allows more power, which helps but does not remove the problem.",
    "Motion distortion and calibration: the robot moves during a scan, skewing the cloud, so compensate with IMU or odometry data, and calibrate the lidar-to-robot transform to avoid mis-registration.",
  ],
  interviewTip:
    "Interviewer asks: \"How do lidar, ultrasonic and camera compare for an indoor robot?\" A good answer: ultrasonic is cheap (about $2) with a wide beam and poor angular resolution, and it fails on soft surfaces. Lidar gives precise ranging at centimetre level over a wide field of view, independent of lighting, at higher cost and with trouble on glass. A camera gives rich semantic information but depends on lighting and needs heavy compute for depth. Real robots fuse them: lidar for mapping and localisation, ultrasonic or ToF for low obstacles the lidar misses, camera for recognition.",
  relatedLesson: "sensors",
  Illustration: LidarIllustration,
};
