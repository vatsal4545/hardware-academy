"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { SenseThinkAct } from "@/components/viz/robotics/SenseThinkAct";

const POWER_BUDGET = `MOTOR DOMAIN   2S Li-ion pack, 6.0-8.4 V, 3 A fuse + switch
  TB6612FNG VM  ->  2 x N20 gearmotor   ~0.15 A each running, ~1.5 A each at stall
  Worst case: about 3 A peaks (both motors stalled or reversing)

5 V DOMAIN     buck converter 7.4 V -> 5 V, rated 3 A
  ESP32 DevKitC 5V pin (feeds the 3.3 V LDO below)     0.50 A peak
  SG90 servo        0.25 A moving, 0.7 A stalled         0.70 A
  HC-SR04           15 mA                                 0.02 A
  Total worst case                                      ~1.2 A  -> ~0.9 A from the pack at 90 % efficiency

3.3 V DOMAIN   AMS1117 LDO on the DevKitC, 1 A maximum
  ESP32-WROOM-32    ~80 mA computing, ~240 mA on Wi-Fi transmit
  2 x encoder Hall sensors                               2 x 5 mA
  2 x TCRT5000 modules (IR LED + comparator)             2 x 25 mA
  TB6612FNG VCC (logic)                                  < 2 mA
  Total worst case                                      ~0.4 A  -> LDO burns (5 - 3.3) V x 0.4 A = 0.7 W

SIGNALS (dashed)                                         level
  ESP32 -> TB6612   PWMA, PWMB at 20 kHz; AIN1/2, BIN1/2; STBY   3.3 V
  encoders -> ESP32 A and B, both wheels                        3.3 V (sensors powered at 3.3 V)
  ESP32 -> HC-SR04  TRIG                                        3.3 V triggers it
  HC-SR04 -> ESP32  ECHO through a 1 k / 2 k divider            5 V -> 3.3 V
  TCRT5000 -> ESP32 digital out or ADC1 input                   3.3 V
  ESP32 -> SG90     50 Hz servo pulse                           3.3 V

GROUND  one star point at the pack's negative terminal; motor current returns there directly.`;

function Block({
  x,
  y,
  w,
  h,
  color,
  lines,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  lines: string[];
}) {
  const top = y + h / 2 - ((lines.length - 1) * 16) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={vizColors.bg} stroke={color} strokeWidth={1.5} />
      {lines.map((line, i) => (
        <Label key={line} x={x + w / 2} y={top + i * 16} size={i === 0 ? 12 : 10.5} bold={i === 0} color={i === 0 ? vizColors.text : vizColors.muted}>
          {line}
        </Label>
      ))}
    </g>
  );
}

function PowerDomainDiagram() {
  const motor = vizColors.orange;
  const five = vizColors.amber;
  const three = vizColors.cyan;
  const sig = vizColors.violet;
  return (
    <SvgCanvas viewBox="0 0 760 452" title="Block diagram of the course robot with motor, 5 V and 3.3 V power domains sharing one ground">
      {/* domain bands */}
      <rect x={8} y={8} width={744} height={128} rx={12} fill={motor} fillOpacity={0.06} stroke={motor} strokeOpacity={0.5} />
      <rect x={8} y={146} width={744} height={116} rx={12} fill={five} fillOpacity={0.06} stroke={five} strokeOpacity={0.5} />
      <rect x={8} y={272} width={744} height={130} rx={12} fill={three} fillOpacity={0.06} stroke={three} strokeOpacity={0.5} />
      <Label x={22} y={24} size={11} anchor="start" color={motor} bold>
        MOTOR DOMAIN · pack voltage 6.0–8.4 V · amps, noisy
      </Label>
      <Label x={22} y={162} size={11} anchor="start" color={five} bold>
        5 V DOMAIN · buck
      </Label>
      <Label x={22} y={288} size={11} anchor="start" color={three} bold>
        3.3 V DOMAIN · LDO · quiet
      </Label>

      {/* motor domain */}
      <Block x={24} y={40} w={140} h={80} color={motor} lines={["2S Li-ion pack", "2 × 18650 cells", "7.4 V nominal"]} />
      <Block x={186} y={58} w={88} h={44} color={motor} lines={["3 A fuse", "+ switch"]} />
      <Block x={330} y={40} w={180} h={80} color={motor} lines={["TB6612FNG", "dual H-bridge, VM ≤ 13.5 V", "1.2 A/ch, 3.2 A peak"]} />
      <Block x={560} y={36} w={180} h={38} color={motor} lines={["N20 motor L + encoder"]} />
      <Block x={560} y={86} w={180} h={38} color={motor} lines={["N20 motor R + encoder"]} />
      <g stroke={motor} strokeWidth={3} fill="none" strokeLinejoin="round">
        <line x1={164} y1={80} x2={186} y2={80} />
        <line x1={274} y1={80} x2={330} y2={80} />
        <polyline points="510,62 535,62 535,55 560,55" />
        <polyline points="510,98 535,98 535,105 560,105" />
      </g>
      <circle cx={300} cy={80} r={4} fill={motor} />

      {/* 5 V domain */}
      <polyline points="300,80 300,170 235,170 235,184" fill="none" stroke={motor} strokeWidth={3} strokeLinejoin="round" />
      <Block x={170} y={184} w={130} h={56} color={five} lines={["Buck converter", "7.4 V → 5 V, 3 A"]} />
      <Block x={540} y={184} w={92} h={56} color={five} lines={["SG90 servo", "0.7 A stalled"]} />
      <Block x={646} y={184} w={96} h={56} color={five} lines={["HC-SR04", "5 V, 15 mA"]} />
      <g stroke={five} strokeWidth={2.5} fill="none" strokeLinejoin="round">
        <line x1={300} y1={212} x2={330} y2={212} />
        <polyline points="300,196 314,196 314,176 694,176 694,184" />
        <line x1={586} y1={176} x2={586} y2={184} />
      </g>

      {/* the DevKitC straddles the 5 V and 3.3 V domains */}
      <rect x={330} y={184} width={170} height={198} rx={6} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={1.5} />
      <line x1={330} y1={267} x2={500} y2={267} stroke={vizColors.muted} strokeDasharray="3 3" />
      <Label x={415} y={202} size={12} bold>
        ESP32 DevKitC
      </Label>
      <Label x={415} y={222} size={10.5} color={vizColors.muted}>
        5V pin → onboard
      </Label>
      <Label x={415} y={238} size={10.5} color={vizColors.muted}>
        AMS1117 LDO
      </Label>
      <Label x={415} y={298} size={12} bold>
        ESP32-WROOM-32
      </Label>
      <Label x={415} y={318} size={10.5} color={vizColors.muted}>
        2 × 240 MHz, 520 KB SRAM
      </Label>
      <Label x={415} y={336} size={10.5} color={vizColors.muted}>
        Wi-Fi + Bluetooth
      </Label>
      <Label x={415} y={354} size={10.5} color={vizColors.muted}>
        GPIO are 3.3 V only
      </Label>

      {/* battery monitor on ADC1 */}
      <Block x={40} y={312} w={250} h={60} color={three} lines={["Battery monitor", "pack + → 100 kΩ / 33 kΩ divider", "8.4 V → 2.08 V on an ADC1 pin"]} />
      <line x1={290} y1={342} x2={330} y2={342} stroke={sig} strokeWidth={1.6} strokeDasharray="5 4" />

      {/* 3.3 V loads */}
      <Block x={560} y={290} w={184} h={26} color={three} lines={["Encoders × 2 (Hall)"]} />
      <Block x={560} y={324} w={184} h={26} color={three} lines={["TCRT5000 line sensors × 2"]} />
      <Block x={560} y={358} w={184} h={26} color={three} lines={["TB6612FNG logic (VCC)"]} />
      <g stroke={three} strokeWidth={2.5} fill="none" strokeLinejoin="round">
        <polyline points="500,376 530,376 530,303 560,303" />
        <line x1={530} y1={337} x2={560} y2={337} />
        <line x1={530} y1={371} x2={560} y2={371} />
      </g>

      {/* signals */}
      <g stroke={sig} strokeWidth={1.6} fill="none" strokeDasharray="5 4">
        <line x1={455} y1={184} x2={455} y2={120} />
        <polyline points="586,240 586,252 500,252" />
        <polyline points="694,240 694,258 500,258" />
        <line x1={560} y1={296} x2={500} y2={296} />
        <line x1={560} y1={330} x2={500} y2={330} />
      </g>
      <Label x={462} y={158} size={10} anchor="start" color={sig}>
        PWM 20 kHz + direction, STBY
      </Label>
      <Label x={506} y={282} size={10} anchor="start" color={sig}>
        servo pulse · TRIG · ECHO via 1 kΩ/2 kΩ divider
      </Label>

      {/* ground */}
      <line x1={20} y1={420} x2={740} y2={420} stroke={vizColors.muted} strokeWidth={3} />
      <Label x={20} y={438} size={10.5} anchor="start" color={vizColors.muted}>
        GND: every domain returns to one star point at the pack&apos;s negative terminal
      </Label>
      <Label x={740} y={438} size={10.5} anchor="end" color={vizColors.muted}>
        solid = power · dashed = signal
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Sense, think, act: what a robot is made of">
        <Prose>
          <p>
            A robot is a machine that closes a loop through the physical world. It <strong>senses</strong> (reads its
            encoders, a range finder, a line sensor), <strong>thinks</strong> (estimates where it is and decides what to
            do) and <strong>acts</strong> (sets motor duty cycles), then does it all again. SRI&apos;s Shakey
            (1966-1972) ran this cycle as sense-plan-act and often paused for minutes to plan a single move; a balancing
            robot today runs its inner loop 200-500 times a second. The loop is the robot. Every part you add either feeds it or is driven
            by it.
          </p>

          <h3>Six subsystems</h3>
          <p>
            Every mobile robot, from a $50 kit to a warehouse robot, has the same six subsystems. The table maps them
            onto the robot you will build in this track.
          </p>
          <table>
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Job</th>
                <th>Course robot</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Power</td>
                <td>Store energy, regulate rails, protect</td>
                <td>Two 18650 Li-ion cells in series: 7.4 V nominal, 8.4 V full, about 6.0 V empty; 5 V buck; 3.3 V LDO</td>
              </tr>
              <tr>
                <td>Compute</td>
                <td>Run the loop, talk to the outside</td>
                <td>ESP32: two 240 MHz cores, 520 KB SRAM, Wi-Fi and Bluetooth</td>
              </tr>
              <tr>
                <td>Sensing</td>
                <td>Measure the robot and the world</td>
                <td>Two Hall encoders (7 pulses per motor turn), an HC-SR04 ultrasonic ranger, two TCRT5000 line sensors</td>
              </tr>
              <tr>
                <td>Actuation</td>
                <td>Turn commands into motion</td>
                <td>Two 6 V N20 gearmotors on a TB6612FNG dual H-bridge; an SG90 servo pans the ultrasonic sensor</td>
              </tr>
              <tr>
                <td>Communication</td>
                <td>Move data on and off the robot</td>
                <td>GPIO, I2C and UART on board; Wi-Fi telemetry at 10 Hz</td>
              </tr>
              <tr>
                <td>Mechanics</td>
                <td>Hold it together, transmit force</td>
                <td>Chassis, 50:1 gearboxes, 44 mm wheels, a ball caster</td>
              </tr>
            </tbody>
          </table>
          <p>
            Sensors split into <strong>proprioceptive</strong> ones, which measure the robot itself (encoders, IMU,
            motor current), and <strong>exteroceptive</strong> ones, which measure the world (ultrasonic, lidar,
            camera). You need both: encoders tell you how far the wheels turned, but only an exteroceptive sensor
            notices the wall.
          </p>

          <h3>Robot types and degrees of freedom</h3>
          <p>
            A <strong>degree of freedom</strong> (DOF) is one independent way to move. A rigid body in space has six:
            three translations and three rotations.
          </p>
          <ul>
            <li>
              <strong>Differential drive</strong> (the course robot, a Roomba): two driven wheels. Its pose on the floor
              has 3 DOF (x, y, heading) but it has only 2 inputs and cannot slide sideways. That restriction is called
              nonholonomic.
            </li>
            <li>
              <strong>Car-like (Ackermann) steering</strong>: also nonholonomic, and it needs room to turn.
            </li>
            <li>
              <strong>Mecanum or omni wheels</strong>: holonomic; four wheels give independent control of x, y and
              rotation.
            </li>
            <li>
              <strong>Arms</strong>: six joints place a tool at any position and orientation (UR5e); a seventh adds
              redundancy (Franka, KUKA iiwa).
            </li>
            <li>
              <strong>Legged</strong>: Boston Dynamics&apos; Spot has 12 leg joints, three per leg.
            </li>
            <li>
              <strong>Quadrotors</strong>: four motors control a 6-DOF body, so they are underactuated and must tilt to
              move sideways.
            </li>
          </ul>

          <h3>Loop rates: a robot is a stack of loops</h3>
          <p>
            A real robot runs several loops at different rates. Each inner loop runs 5-10 times faster than the loop
            that commands it, and fast enough to sample its own dynamics 10-20 times per response time.
          </p>
          <table>
            <thead>
              <tr>
                <th>Loop</th>
                <th>Typical rate</th>
                <th>Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Motor current and torque</td>
                <td>10-40 kHz</td>
                <td>Field-oriented control inside a BLDC drive</td>
              </tr>
              <tr>
                <td>Attitude and balance</td>
                <td>0.2-8 kHz</td>
                <td>Drone flight controllers at several kHz; balancing robots at 200-500 Hz</td>
              </tr>
              <tr>
                <td>Wheel speed and heading</td>
                <td>100 Hz-1 kHz</td>
                <td>The course robot&apos;s 100 Hz PID loop</td>
              </tr>
              <tr>
                <td>Local planning and avoidance</td>
                <td>10-50 Hz</td>
                <td>The ROS 2 Nav2 controller server defaults to 20 Hz</td>
              </tr>
              <tr>
                <td>Mapping, global planning, mission</td>
                <td>0.1-5 Hz</td>
                <td>Replanning a path around a new obstacle</td>
              </tr>
            </tbody>
          </table>
          <p>
            The rate that matters most on a small robot is the one that decides when to stop or turn, because the robot
            drives blind between decisions. Travel per cycle is speed divided by rate. At 0.5 m/s a 1 kHz loop moves
            0.5 mm per cycle, 100 Hz moves 5 mm, 20 Hz moves 25 mm and 5 Hz moves 100 mm. A strip of electrical tape is
            19 mm wide, so a line sensor read at 20 Hz can step over a stop line without ever seeing it.
          </p>
          <p>
            Rate is not the only delay. Stopping distance is the travel while noticing the event (up to one period),
            plus the travel during compute and actuator delay, plus the braking distance v²/2a. A small robot
            short-braking at about 3 m/s² needs 42 mm to stop from 0.5 m/s even with an infinitely fast loop, and
            braking distance grows with the square of speed.
          </p>
        </Prose>

        <Callout kind="tip" title="Rule of thumb">
          Keep the travel per cycle below a quarter of the narrowest thing you must detect. For 19 mm tape that is about
          5 mm, which at 0.5 m/s means a loop of at least 100 Hz.
        </Callout>

        <Prose>
          <h3>The course robot&apos;s power architecture</h3>
          <p>The robot you will build on day 9 has three power domains that share one ground:</p>
          <ul>
            <li>
              <strong>Motor domain, 6.0-8.4 V.</strong> The pack feeds the TB6612FNG&apos;s motor supply (VM, rated
              2.5-13.5 V) directly. Each N20 can pull more than an amp at stall; the driver handles 1.2 A continuous and
              3.2 A peak per channel. A 6 V motor on an 8.4 V pack should be limited to about 70% PWM duty.
            </li>
            <li>
              <strong>5 V domain.</strong> A buck converter rated about 3 A feeds the ESP32 DevKitC&apos;s 5 V pin, the
              HC-SR04 and the SG90, which can draw 0.7 A when it stalls.
            </li>
            <li>
              <strong>3.3 V domain.</strong> The DevKitC&apos;s onboard LDO powers the ESP32, the TB6612FNG&apos;s logic
              supply, the encoder Hall sensors and the line sensors. Espressif recommends a 3.3 V supply good for at
              least 500 mA, because Wi-Fi transmit bursts draw well over 200 mA.
            </li>
          </ul>
          <p>
            Signals cross domains, and every crossing needs a check. ESP32 pins are 3.3 V only, so the HC-SR04&apos;s
            5 V echo goes through a divider (1 kΩ over 2 kΩ gives 3.3 V). All grounds meet at one point near the
            battery, so motor return current never flows through the logic ground.
          </p>
        </Prose>

        <Figure caption="The course robot: the pack feeds the motor driver directly, a buck makes 5 V, and the DevKitC's LDO makes the quiet 3.3 V rail. Dashed lines are signals.">
          <PowerDomainDiagram />
        </Figure>
      </Section>

      <Section id="viz" title="Interactive: loop rate versus the stop line">
        <SenseThinkAct />
        <Prose>
          <p>
            Start at 20 Hz and 0.5 m/s: the robot sees the tape late and stops about 74 mm past it. Slide the loop phase
            to 80% and the samples straddle the tape completely. Then raise the rate to 1 kHz at 1 m/s: sampling delay
            vanishes, and braking (167 mm) is all that is left.
          </p>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Draw your robot's block diagram with power domains">
          <p>
            Draw the course robot (or your own design) on paper or in a drawing tool, then compare it with the worked
            answer below.
          </p>
          <ol>
            <li>List every powered part from the bill of materials.</li>
            <li>Group the parts into power domains by supply voltage and draw each domain as a box.</li>
            <li>Write the worst-case current next to every part and total each rail. Size each regulator for at least 1.5 times that total.</li>
            <li>Draw signals as dashed lines, mark their voltage, and flag every 5 V output that enters a 3.3 V pin.</li>
            <li>Mark where the grounds join.</li>
          </ol>
          <p>
            <strong>Worked answer.</strong>
          </p>
          <CodeBlock lang="text" title="power budget and signal map" code={POWER_BUDGET} />
          <p>
            The 5 V rail needs about 1.2 A worst case, so a 3 A buck has margin, and it draws about 0.9 A from the pack.
            The motor domain sees peaks near 3 A, which is why the pack connects to the driver with short, thick wires
            and a 470 µF capacitor at VM. The onboard LDO burns about 0.7 W at 0.4 A: acceptable, but the reason not to
            hang more 3.3 V loads on it.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
