"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { ArenaPreview } from "@/components/viz/robotics/ArenaPreview";
import { RoundedArrow } from "@/components/viz/robotics/RoundedArrow";
import { RobotSim } from "@/components/labs/RobotSim";

function Wave({ y, segments, color }: { y: number; segments: Array<[number, number]>; color: string }) {
  // segments: [x0, x1] spans where the signal is high; everything else is low
  const parts: string[] = [`M 110 ${y}`];
  for (const [a, b] of segments) parts.push(`L ${a} ${y} L ${a} ${y - 12} L ${b} ${y - 12} L ${b} ${y}`);
  parts.push(`L 700 ${y}`);
  return <path d={parts.join(" ")} fill="none" stroke={color} strokeWidth={2} />;
}

function SensorFigure() {
  // cone geometry: half-angle 15° from the sensor at (424, 140), 260 px long
  const coneTop = { x: 675.1, y: 72.7 };
  const coneBottom = { x: 675.1, y: 207.3 };
  return (
    <SvgCanvas viewBox="0 0 720 350" title="Sensor model versus reality: a simulated ray against a real ultrasonic cone, with echo timing and timeout">
      <rect x={0} y={0} width={720} height={350} rx={10} fill={vizColors.bg} />
      <rect x={10} y={10} width={340} height={222} rx={8} fill={vizColors.grid} fillOpacity={0.35} />
      <rect x={370} y={10} width={340} height={222} rx={8} fill={vizColors.grid} fillOpacity={0.35} />
      <Label x={180} y={28} size={13} bold>
        Simulator: an ideal ray
      </Label>
      <Label x={540} y={28} size={13} bold>
        Real HC-SR04: a cone about 30° wide
      </Label>

      {/* simulator panel */}
      <line x1={274} y1={60} x2={334} y2={220} stroke={vizColors.muted} strokeWidth={5} strokeLinecap="round" />
      <circle cx={180} cy={112} r={5} fill={vizColors.orange} />
      <Label x={180} y={96} size={10} color={vizColors.orange}>
        pole: the ray misses it
      </Label>
      <line x1={64} y1={140} x2={304} y2={140} stroke={vizColors.green} strokeWidth={2} />
      <circle cx={304} cy={140} r={4} fill={vizColors.green} />
      <circle cx={50} cy={140} r={14} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2.5} />
      <Label x={184} y={156} size={11} color={vizColors.green}>
        reads 120 cm, every time
      </Label>
      <Label x={180} y={204} size={10} color={vizColors.muted}>
        no noise, no delay, no beam width
      </Label>

      {/* real panel */}
      <polygon points={`424,140 ${coneTop.x},${coneTop.y} ${coneBottom.x},${coneBottom.y}`} fill={vizColors.cyan} fillOpacity={0.12} stroke={vizColors.cyan} strokeOpacity={0.5} />
      <line x1={634} y1={60} x2={694} y2={220} stroke={vizColors.muted} strokeWidth={5} strokeLinecap="round" />
      <circle cx={544} cy={112} r={5} fill={vizColors.orange} />
      <line x1={424} y1={140} x2={540} y2={113} stroke={vizColors.green} strokeWidth={2} />
      <Label x={530} y={50} size={10} color={vizColors.green}>
        reads 59 cm: the pole, not the wall
      </Label>
      <RoundedArrow x1={664} y1={140} x2={619} y2={179} color={vizColors.red} width={1.5} dashed />
      <Label x={604} y={196} anchor="end" size={10} color={vizColors.red}>
        angled wall: the ping bounces away
      </Label>
      <circle cx={410} cy={140} r={14} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2.5} />
      <Label x={540} y={222} size={10} color={vizColors.muted}>
        ±1 cm noise, one reading per 60 ms, missed echoes
      </Label>

      {/* timing */}
      <Label x={20} y={262} anchor="start" size={11} mono>
        TRIG
      </Label>
      <Wave y={268} segments={[[120, 126]]} color={vizColors.cyan} />
      <Label x={132} y={252} anchor="start" size={10} color={vizColors.muted}>
        10 µs pulse, then 8 cycles at 40 kHz leave the transducer
      </Label>
      <Label x={20} y={292} anchor="start" size={11} mono>
        ECHO
      </Label>
      <Wave y={298} segments={[[150, 210]]} color={vizColors.green} />
      <Label x={220} y={290} anchor="start" size={10} color={vizColors.green}>
        pole at 59 cm: high for 59 × 58 µs = 3.4 ms
      </Label>
      <Label x={20} y={326} anchor="start" size={11} mono>
        ECHO
      </Label>
      <Wave y={332} segments={[[150, 640]]} color={vizColors.red} />
      <Label x={395} y={312} size={10} color={vizColors.red}>
        no echo: the line stays high for about 38 ms, then gives up
      </Label>
      <Label x={672} y={318} size={10} color={vizColors.muted}>
        timeout
      </Label>
    </SvgCanvas>
  );
}

const urdf = `<robot name="course_robot">
  <link name="base_link">
    <visual><geometry><cylinder radius="0.07" length="0.04"/></geometry></visual>
    <collision><geometry><cylinder radius="0.07" length="0.04"/></geometry></collision>
    <inertial><mass value="0.45"/><inertia ixx="6e-4" iyy="6e-4" izz="1.1e-3" ixy="0" ixz="0" iyz="0"/></inertial>
  </link>

  <link name="left_wheel"><visual><geometry><cylinder radius="0.0215" length="0.012"/></geometry></visual></link>
  <joint name="left_wheel_joint" type="continuous">
    <parent link="base_link"/><child link="left_wheel"/>
    <origin xyz="0 0.06 0" rpy="-1.5708 0 0"/>   <!-- 6 cm to the left: wheel base 12 cm -->
    <axis xyz="0 0 1"/>
  </joint>
  <!-- right_wheel: the same with y = -0.06 -->

  <link name="sonar_link"/>
  <joint name="sonar_joint" type="fixed">
    <parent link="base_link"/><child link="sonar_link"/>
    <origin xyz="0.07 0 0.08" rpy="0 0 0"/>      <!-- front edge, 8 cm up -->
  </joint>
</robot>`;

const avoidCode = `// Part 1 - obstacle avoidance for the open-room arena.
// sensors.ultrasonic.{left, front, right} are in cm (capped at 150); return wheel commands in -1..1.
function control(sensors, memory) {
  const { left, front, right } = sensors.ultrasonic;
  const t = sensors.t;

  // Escape: when something is close ahead, commit to a spin for 0.6 s (memory beats oscillation).
  if (memory.escapeUntil !== undefined && t < memory.escapeUntil) return memory.escapeCmd;
  if (front < 25) {
    const dir = left > right ? 1 : -1;               // +1 = turn left, toward the open side
    memory.escapeUntil = t + 0.6;
    memory.escapeCmd = { left: -0.5 * dir, right: 0.5 * dir };
    return memory.escapeCmd;
  }

  // Braitenberg steering: an obstacle on the right slows the left wheel, so the robot turns left.
  const p = (d) => Math.max(0, 1 - d / 60);          // proximity 0..1 inside 60 cm
  const base = front < 60 ? 0.35 : 0.6;              // slow down when something is ahead
  return { left: base - 0.6 * p(right), right: base - 0.6 * p(left) };
}`;

const latencyCode = `// Part 3 - add 150 ms of sensor latency to any controller (the lab steps at 100 Hz: 15 ticks).
function control(sensors, memory) {
  memory.queue = memory.queue || [];
  memory.queue.push(JSON.parse(JSON.stringify(sensors)));
  const delayed = memory.queue.length > 15 ? memory.queue.shift() : memory.queue[0];
  return avoid(delayed, memory);                     // paste your Part 1 controller here as avoid()
}`;

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Why simulate, and what simulation gets wrong">
        <Prose>
          <h3>Why simulate first</h3>
          <p>
            In the browser lab a run takes seconds and resets instantly. On the real robot each test costs a battery, a reset, a rescue
            from under the sofa and now and then a broken servo horn. A simulator also makes runs repeatable: the same start pose and
            the same code give the same result, so two controllers can be compared fairly and every bug can become a regression test.
            Industry leans on this hard. Waymo reported more than 20 billion simulated miles by 2021, roughly a thousand for every mile
            driven on public roads, and Rudin and colleagues trained an ANYmal quadruped to walk in under 20 minutes on one GPU by
            simulating 4,096 robots in parallel in NVIDIA Isaac Gym.
          </p>

          <h3>The sim-to-real gap</h3>
          <p>A simulator is a model, and every model leaves something out. The usual suspects:</p>
          <ul>
            <li>
              <strong>Friction and slip.</strong> Simulated wheels never slip. Real tires grip tile and carpet very differently and
              cannot deliver accelerations the motors can.
            </li>
            <li>
              <strong>Motor dynamics.</strong> In simulation speed jumps to the command. A real N20 takes 50 to 100 ms to respond and
              does not turn at all below roughly 15% duty.
            </li>
            <li>
              <strong>Noise and dropouts.</strong> An HC-SR04 jitters by about a centimeter, misses echoes from soft or angled surfaces
              and measures only every 60 ms. Reflectance sensors drift with sunlight, which is full of infrared.
            </li>
            <li>
              <strong>Sensor geometry.</strong> A simulated range sensor is a thin ray. A real ultrasonic beam is a cone roughly 30°
              wide that reports the nearest thing anywhere inside it.
            </li>
            <li>
              <strong>Latency.</strong> Sensing, filtering, computing and the motors&apos; response add up to 100 to 200 ms. At 40 cm/s,
              150 ms is 6 cm driven blind.
            </li>
            <li>
              <strong>Power.</strong> A sagging battery slows the motors and, as lesson 26 showed, can reset the brain.
            </li>
          </ul>

          <h3>What the lab models</h3>
          <p>
            The <a href="/labs/robot-sim">robot simulator lab</a> models the course robot as a differential drive with a 12 cm wheel
            base, a 7 cm radius and a top wheel speed of 40 cm/s, integrated exactly along arcs. It has three ultrasonic rays at +45°,
            0° and −45°, capped at 150 cm and measured from the robot&apos;s edge; two line sensors 6 cm ahead and 5 cm apart; wheel
            encoders at 10 ticks per cm; and a yaw rate. Touching a wall or an obstacle stops the robot and sets{" "}
            <code>crashed</code>. It deliberately leaves out noise, cones, latency, slip and motor lag, so you learn the logic first;
            margins for the real world are your job.
          </p>

          <h3>Structure the controller: read, estimate, decide, act</h3>
          <p>
            Every tick does four things. <strong>Read</strong>: copy the sensor values. <strong>Estimate</strong>: filter them into a
            belief about the world, such as a median of the last three ranges, the time since the line was last seen, or a pose
            integrated from the encoders. <strong>Decide</strong>: a state machine picks a behavior. <strong>Act</strong>: the
            behavior&apos;s desired speed and turn rate become wheel commands, clamped to −1…1. Keep each step a small function and all
            state in the lab&apos;s <code>memory</code> object. The same shape ports straight to the firmware in lesson 26, where{" "}
            <code>control(sensors, memory)</code> becomes <code>controlStep()</code>.
          </p>

          <h3>Testing and logging</h3>
          <p>
            Turn behaviors into scenarios with pass criteria: no crash in 60 s, a lap in under 45 s, never closer than 5 cm to a wall.
            Then randomize: start pose ±5 cm and ±10°, sensor noise, latency. A controller that passes 100 of 100 randomized runs is far
            more likely to survive the floor than one tuned on a single perfect run. Log every tick (time, sensors, state, commands) as
            CSV with the same columns the robot&apos;s telemetry uses, so you can overlay a simulated run and a real one and see exactly
            where they diverge.
          </p>

          <h3>Professional simulators</h3>
          <ul>
            <li>
              <strong>Gazebo</strong> (Open Robotics): the standard ROS 2 companion. It loads URDF and SDF models and simulates lidar,
              cameras and IMUs; Gazebo Classic reached end of life in January 2025 in favor of the new Gazebo releases such as
              Harmonic.
            </li>
            <li>
              <strong>Webots</strong> (Cyberbotics): open source since 2018, with a large library of ready robot models; popular in
              teaching.
            </li>
            <li>
              <strong>MuJoCo</strong> (DeepMind, open-sourced in 2022): fast, accurate contact dynamics; the standard for
              reinforcement learning on legs and hands.
            </li>
            <li>
              <strong>NVIDIA Isaac Sim</strong>: PhysX physics and RTX ray-traced cameras and lidar for photorealistic synthetic data,
              with Isaac Lab for massively parallel RL.
            </li>
            <li>
              <strong>PyBullet</strong>: Python bindings for the Bullet engine, quick to script for research prototypes.
            </li>
          </ul>

          <h3>URDF basics</h3>
          <p>
            ROS tools and most simulators describe a robot with <strong>URDF</strong>, an XML tree of <code>link</code> elements
            (visual, collision and inertial properties) joined by <code>joint</code> elements (fixed, continuous, revolute or
            prismatic), each with a parent, a child, an origin in meters and radians and an axis. The course robot is a base_link, two
            continuous wheel joints 6 cm either side of center and fixed joints for the caster and sensors. Gazebo extends it with SDF,
            MuJoCo uses its own MJCF format, and xacro macros keep the left and right wheels from being written twice.
          </p>
        </Prose>
        <CodeBlock lang="xml" title="course_robot.urdf (excerpt)" code={urdf} />
        <Figure caption="Sensor model versus reality. The simulated ray sees exactly one point. The real ultrasonic cone reports the nearest object inside it, angled walls can send the ping away, and a missing echo is a 38 ms timeout, not a distance.">
          <SensorFigure />
        </Figure>
      </Section>

      <Section id="viz" title="Interactive: tour the arenas, then open the lab">
        <ArenaPreview />
        <div className="mt-6">
          <p className="mb-2 text-sm text-muted">
            A live copy of the simulator running the obstacle-avoid preset in the open room. Press Run, watch the rays, then open the
            full lab to edit the controller.
          </p>
          <RobotSim presetId="obstacle-avoid" compact />
        </div>
        <Callout kind="tip" title="Rule of thumb for real-world margins">
          Threshold = speed × total latency + braking distance + clearance. At 40 cm/s with 200 ms of latency, 5 cm of braking and
          8 cm of clearance, that is 21 cm. The lab has no latency, so a threshold that works there is a lower bound, not an answer.
        </Callout>
        <div className="flex flex-col gap-3 rounded-xl border border-cyan-400/40 bg-cyan-400/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Ready to drive it yourself?</p>
            <p className="text-sm text-muted">
              The lab runs your JavaScript <code>control(sensors, memory)</code> function 100 times a second against the same three
              arenas, with telemetry and the sensor rays drawn live.
            </p>
          </div>
          <a
            href="/labs/robot-sim"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-text px-4 text-sm font-medium text-bg hover:bg-white"
          >
            Open the robot simulator lab →
          </a>
        </div>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Obstacle avoidance, then line following, then a lap without a crash">
          <ol>
            <li>
              Open the <a href="/labs/robot-sim">robot simulator lab</a>, choose the open room and write an obstacle avoider. Pass:
              60 s without a crash.
            </li>
            <li>
              Switch to the line track and implement the line-following state machine from lesson 25. Pass: one full lap without
              leaving the line for more than 1 s and without a crash.
            </li>
            <li>
              Make it realistic: wrap your avoider in the latency wrapper below (150 ms) and run it again. Then fix it without removing
              the latency.
            </li>
          </ol>
          <p>
            <strong>Worked answer, part 1.</strong> A Braitenberg steering law plus a committed escape spin, which stops the
            left-right dithering that pure reactive steering shows in corners:
          </p>
          <CodeBlock lang="js" title="obstacle-avoid.js" code={avoidCode} />
          <p>
            <strong>Part 2</strong> is the state machine from lesson 25, unchanged: follow with P control on the line error, recover
            toward the side the line was last seen, stop after 3 s of searching. If it oscillates on the straights, lower the steering
            gain; if it loses the line on the corners, lower the base speed first.
          </p>
          <CodeBlock lang="js" title="latency-wrapper.js" code={latencyCode} />
          <p>
            <strong>Part 3, what to look for:</strong> at 0.6 commanded speed (24 cm/s), 150 ms of latency means every reaction
            happens about 4 cm later, and twice that at full speed. Watch the minimum clearance in the telemetry: it shrinks, and
            glancing contacts appear first at obstacle edges, where the ±45° rays see the obstacle late. The robust fix is the one from
            the scenario: make the threshold a function of speed (speed × latency + braking distance + clearance) and slow down
            whenever anything is within 60 cm. Raising the threshold alone also works, but makes the robot timid in narrow corridors.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
