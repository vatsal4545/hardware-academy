"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { PidTuner } from "@/components/viz/robotics/PidTuner";

const PID_CODE = `// Discrete PID: derivative on measurement, output clamping, anti-windup.
// The same algorithm as simulatePid() behind the tuner, plus an optional derivative filter.
struct Pid {
  float kp, ki, kd;
  float outMin = -1.0f, outMax = 1.0f;   // motor duty limits
  float dAlpha = 1.0f;                   // derivative EMA: 1 = unfiltered, 0.2 = heavily filtered
  float integral = 0.0f;
  float prevMeas = 0.0f;
  float dFilt = 0.0f;
  bool primed = false;

  // A real constructor: the default member initialisers above stop Pid being an aggregate
  // before C++14, and the Arduino-ESP32 2.x core compiles as gnu++11.
  Pid(float p, float i, float d) : kp(p), ki(i), kd(d) {}

  float update(float setpoint, float meas, float dt) {
    if (!primed) { prevMeas = meas; primed = true; }  // no derivative spike on the first call
    float error = setpoint - meas;
    float dRaw = -(meas - prevMeas) / dt;             // derivative of the measurement: no kick
    prevMeas = meas;
    dFilt += dAlpha * (dRaw - dFilt);

    float newIntegral = integral + error * dt;
    float out = kp * error + ki * newIntegral + kd * dFilt;
    if (out > outMax) {
      out = outMax;
      if (error < 0) integral = newIntegral;          // only integrate if it pulls the output back
    } else if (out < outMin) {
      out = outMin;
      if (error > 0) integral = newIntegral;
    } else {
      integral = newIntegral;
    }
    return out;
  }

  void reset(float meas) {                            // call when enabling: bumpless start
    integral = 0.0f;
    prevMeas = meas;
    dFilt = 0.0f;
    primed = true;
  }
};

// The tuner works in fractions of top speed. On the robot, speeds are in mm/s,
// so divide its gains by the top speed (about 230 mm/s for 100 rpm motors on 44 mm wheels).
constexpr float TOP_SPEED = 230.0f;
Pid pidLeft(2.0f / TOP_SPEED, 8.0f / TOP_SPEED, 0.0f);
Pid pidRight(2.0f / TOP_SPEED, 8.0f / TOP_SPEED, 0.0f);

// These are the pidLeft / pidRight that controlStep() in the firmware lesson's 100 Hz loop calls:
//   float left = pidLeft.update(targetLeft, speedLeft(), dt);
//   float right = pidRight.update(targetRight, speedRight(), dt);`;

function ClosedLoopDiagram() {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, color: string) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={vizColors.bg} stroke={color} strokeWidth={1.6} />
      <Label x={x + w / 2} y={y + h / 2 - 8} size={12} bold>
        {title}
      </Label>
      <Label x={x + w / 2} y={y + h / 2 + 10} size={10} color={vizColors.muted}>
        {sub}
      </Label>
    </g>
  );
  const sum = (x: number, y: number) => (
    <g>
      <circle cx={x} cy={y} r={13} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={1.6} />
      <Label x={x} y={y + 1} size={14}>
        Σ
      </Label>
    </g>
  );
  const Y = 132;
  return (
    <SvgCanvas viewBox="0 0 760 300" title="Closed-loop block diagram with PID controller, feedforward, actuator, plant, disturbance and sensor feedback">
      {/* setpoint and feedforward */}
      <Label x={22} y={Y} size={13} bold>
        r
      </Label>
      <Label x={22} y={Y + 18} size={9.5} color={vizColors.muted}>
        setpoint
      </Label>
      <Arrow x1={34} y1={Y} x2={93} y2={Y} color={vizColors.text} width={1.6} />
      <polyline points={`60,${Y} 60,46 196,46`} fill="none" stroke={vizColors.violet} strokeWidth={1.6} strokeDasharray="5 4" />
      {box(196, 24, 150, 44, "Feedforward", "kS + kV · r", vizColors.violet)}
      <polyline points={`346,46 392,46 392,${Y - 16}`} fill="none" stroke={vizColors.violet} strokeWidth={1.6} strokeDasharray="5 4" />
      <polygon points={`392,${Y - 13} 387,${Y - 22} 397,${Y - 22}`} fill={vizColors.violet} />

      {/* forward path */}
      {sum(106, Y)}
      <Label x={94} y={Y - 20} size={12} color={vizColors.text}>
        +
      </Label>
      <Label x={94} y={Y + 24} size={12} color={vizColors.text}>
        −
      </Label>
      <Arrow x1={119} y1={Y} x2={156} y2={Y} color={vizColors.text} width={1.6} />
      <Label x={137} y={Y - 12} size={11} color={vizColors.cyan} bold>
        e
      </Label>
      {box(158, Y - 30, 200, 60, "PID controller", "Kp·e + Ki∫e dt − Kd·dy/dt", vizColors.cyan)}
      <Arrow x1={358} y1={Y} x2={377} y2={Y} color={vizColors.text} width={1.6} />
      {sum(392, Y)}
      <Arrow x1={405} y1={Y} x2={432} y2={Y} color={vizColors.text} width={1.6} />
      <Label x={418} y={Y - 12} size={11} color={vizColors.cyan} bold>
        u
      </Label>
      {box(434, Y - 30, 118, 60, "Driver + motor", "duty → torque", vizColors.orange)}
      <Arrow x1={552} y1={Y} x2={573} y2={Y} color={vizColors.text} width={1.6} />
      {sum(588, Y)}
      <Arrow x1={588} y1={58} x2={588} y2={Y - 14} color={vizColors.red} width={1.6} />
      <Label x={588} y={44} size={11} color={vizColors.red} bold>
        disturbance d
      </Label>
      <Label x={588} y={30} size={9.5} color={vizColors.muted}>
        slope, carpet, battery sag
      </Label>
      <Arrow x1={601} y1={Y} x2={624} y2={Y} color={vizColors.text} width={1.6} />
      {box(626, Y - 30, 104, 60, "Robot wheel", "torque → speed", vizColors.amber)}
      <line x1={730} y1={Y} x2={748} y2={Y} stroke={vizColors.text} strokeWidth={1.6} />
      <Label x={748} y={Y - 14} size={12} bold anchor="end">
        y
      </Label>

      {/* feedback */}
      <polyline points={`748,${Y} 748,236 560,236`} fill="none" stroke={vizColors.text} strokeWidth={1.6} />
      <polygon points={`556,236 566,231 566,241`} fill={vizColors.text} />
      {box(396, 210, 160, 52, "Sensor + filter", "encoder or gyro, adds delay", vizColors.green)}
      <polyline points={`396,236 106,236 106,${Y + 17}`} fill="none" stroke={vizColors.text} strokeWidth={1.6} />
      <polygon points={`106,${Y + 13} 101,${Y + 23} 111,${Y + 23}`} fill={vizColors.text} />
      <Arrow x1={476} y1={290} x2={476} y2={264} color={vizColors.muted} width={1.4} />
      <Label x={490} y={286} size={10} anchor="start" color={vizColors.muted}>
        noise
      </Label>
      <Label x={250} y={250} size={10.5} color={vizColors.muted}>
        measured y, subtracted from r
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Closing the loop">
        <Prose>
          <p>
            Open-loop control sets an output and hopes: 60% duty for &quot;about half speed&quot;. Hope fails fast. A
            2S pack sags from 8.4 V to about 6.4 V over a run, a 24% drop in motor voltage; carpet adds load; one
            gearbox has more friction than the other, so the robot curves. <strong>Closed-loop control</strong>{" "}
            measures what actually happened and corrects it, recomputing the error e = r − y (setpoint minus
            measurement) every cycle.
          </p>

          <h3>P, I and D</h3>
          <ul>
            <li>
              <strong>Proportional</strong>, u = Kp·e: push harder the further away you are. On a plant that needs a
              steady input to hold its output, such as a wheel at constant speed, P alone always leaves an offset of
              1/(1 + K·Kp) of the setpoint, where K is the plant&apos;s gain. With Kp = 2 on the tuner&apos;s
              unit-gain plant, a third of the setpoint is missing. More Kp shrinks the offset but, once lag is present,
              starts oscillation.
            </li>
            <li>
              <strong>Integral</strong> adds Ki·∫e dt. It keeps growing while any error remains, so it removes the
              offset. Too much of it overshoots and rings, because the accumulated error can only be unwound by passing
              the setpoint.
            </li>
            <li>
              <strong>Derivative</strong> adds Kd·de/dt, reacting to how fast things change, which brakes an approach
              before it overshoots. It helps plants with inertia, such as heading or position, amplifies noise, and does
              little on a first-order speed loop. That is why wheel-speed loops are usually PI.
            </li>
          </ul>

          <h3>Discrete PID, done properly</h3>
          <p>
            On a microcontroller the controller runs every dt seconds: u = Kp·e + Ki·Σe·dt − Kd·(y − y_prev)/dt. Four
            details separate a PID that works from one that bites:
          </p>
          <ul>
            <li>
              <strong>Constant, known sample time.</strong> dt appears in the I and D terms, so a jittery loop is a
              noisy controller. Run it from a timer or vTaskDelayUntil().
            </li>
            <li>
              <strong>Derivative on measurement.</strong> The derivative of the error spikes when the setpoint steps
              (derivative kick); the derivative of the measurement does not, and it damps just the same otherwise.
              Filter it, or use a sensor that measures the rate directly, such as a gyro.
            </li>
            <li>
              <strong>Output clamping.</strong> A motor driver accepts −100% to +100% duty, so clamp to that.
            </li>
            <li>
              <strong>Anti-windup.</strong> While the output is clamped, stop integrating in the direction that pushes
              it further. Otherwise a robot held against a wall winds up a huge integral and lunges when released.
            </li>
          </ul>
          <p>The tuner below runs exactly this controller on a model of the course robot&apos;s wheel speed.</p>

          <h3>Tuning by hand and by Ziegler-Nichols</h3>
          <p>
            A reliable manual recipe: set Ki = Kd = 0 and raise Kp until the response is brisk with a little overshoot
            or the first sign of ringing, then back off by a third to a half. Add Ki until the offset disappears fast
            enough, stopping before overshoot grows. Add Kd only if a plant with inertia still overshoots. Change one
            gain at a time by about 1.5×, and test with both setpoint steps and disturbances.
          </p>
          <p>
            Ziegler and Nichols (1942) offered a formula. With Ki and Kd at zero, raise Kp until the loop oscillates
            steadily; call that gain Ku and the period Tu. Then Kp = 0.6·Ku, Ki = 1.2·Ku/Tu and Kd = 0.075·Ku·Tu. The
            result overshoots about 25%, so treat it as a starting point, and remember that the test deliberately drives
            real hardware to the edge of instability.
          </p>

          <h3>Why loops oscillate: lag</h3>
          <p>
            Every delay in the loop (sensor filtering, sample time, communication, actuator response) makes the
            controller act on old information. At some frequency the total lag reaches 180°, and if the loop gain there
            is 1 or more, each correction arrives just in time to make things worse: a sustained oscillation. That is
            why high gains that settle at 100 Hz oscillate at 10 Hz in the tuner. Remove lag first, then raise gain.
          </p>

          <h3>Cascades and feedforward</h3>
          <p>
            Real robots nest loops. The course robot&apos;s heading loop outputs a turn-rate command, which becomes left
            and right wheel-speed setpoints (v ∓ ω·L/2 for a wheel base L); per-wheel PI loops at 100 Hz turn those into
            PWM. Each inner loop runs 5-10 times faster than the one above it, so the outer loop sees an almost ideal
            actuator, and the wheel loops fix a carpet edge before the heading even moves.
          </p>
          <p>
            <strong>Feedforward</strong> adds what you already know: duty = kS·sign(v) + kV·v, measured by stepping the
            motor at a few duty cycles. Feedforward then supplies most of the output and the PID only trims the rest, so
            gains stay low and the response is fast without overshoot.
          </p>

          <h3>Wheel speed and heading in practice</h3>
          <p>
            Speed comes from encoder counts per cycle, which quantizes it: at 0.2 m/s and 100 Hz, ×1 decoding gives
            about 5 ticks per cycle, so one tick is a 20% speed step; ×4 decoding makes it 5%. Heading comes from
            integrating the gyro&apos;s yaw rate or from the wheel-speed difference. Wrap the heading error into ±180°
            before using it, or the robot will turn the long way round.
          </p>
        </Prose>

        <Figure caption="Closed loop: the PID acts on the error between setpoint and measurement, feedforward adds a model-based guess, and the sensor path brings back the measurement with its delay and noise.">
          <ClosedLoopDiagram />
        </Figure>

        <Callout kind="tip" title="Speed loops are PI; position and heading loops get the D">
          A wheel&apos;s speed responds to duty without oscillating, so derivative action has nothing to damp. Heading
          and position integrate speed, which adds inertia-like lag, and that is where D (ideally the gyro&apos;s
          measured rate) pays off.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: tune the wheel-speed loop">
        <PidTuner />
        <Prose>
          <p>
            Start with the P-only preset and add the load bump: the offset grows from 33% to 53% of the setpoint. Add Ki
            and the integral pulls it back. Then try the slow-loop preset: the same kind of gains at 10 Hz limit-cycle
            between full forward and full reverse duty. For a full-screen version, open the <a href="/labs/pid">PID lab</a>.
          </p>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Tune to under 10% overshoot and 1 s settling">
          <p>
            In the tuner, at 100 Hz, find gains that give less than 10% overshoot, settle within ±2% in under 1 s, leave
            no steady-state error, and recover from the load bump. Change one gain at a time and note each result.
          </p>
          <table>
            <thead>
              <tr>
                <th>Step</th>
                <th>Kp</th>
                <th>Ki</th>
                <th>Kd</th>
                <th>Overshoot</th>
                <th>Settling (±2%)</th>
                <th>Steady-state error</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>P only</td>
                <td>2</td>
                <td>0</td>
                <td>0</td>
                <td>0%</td>
                <td>never</td>
                <td>33%</td>
              </tr>
              <tr>
                <td>More P</td>
                <td>5</td>
                <td>0</td>
                <td>0</td>
                <td>0%</td>
                <td>never</td>
                <td>17%</td>
              </tr>
              <tr>
                <td>Add I</td>
                <td>2</td>
                <td>5</td>
                <td>0</td>
                <td>0%</td>
                <td>1.20 s</td>
                <td>0%</td>
              </tr>
              <tr>
                <td>More I</td>
                <td>2</td>
                <td>10</td>
                <td>0</td>
                <td>2.8%</td>
                <td>0.73 s</td>
                <td>0%</td>
              </tr>
              <tr>
                <td>Too much I</td>
                <td>1</td>
                <td>20</td>
                <td>0</td>
                <td>21.7%</td>
                <td>0.97 s</td>
                <td>0%</td>
              </tr>
              <tr>
                <td>Final</td>
                <td>2</td>
                <td>8</td>
                <td>0</td>
                <td>0.5%</td>
                <td>0.47 s</td>
                <td>0%</td>
              </tr>
            </tbody>
          </table>
          <p>
            <strong>Answer.</strong> Kp = 2, Ki = 8, Kd = 0 gives 0.5% overshoot and 0.47 s settling, with no offset, and
            returns within 2% about 0.85 s after the load bump; Kp = 3, Ki = 15 also passes (0.3%, 0.39 s). Adding Kd =
            0.1 to Kp = 2, Ki = 10 raises the overshoot from 2.8% to 6.9%: derivative action does not help this plant.
          </p>
        </Exercise>
        <Exercise title="Write the PID in C++">
          <p>
            Implement the controller for the ESP32 with derivative on measurement, clamping and anti-windup, then wire it
            into the 100 Hz loop from the previous lesson.
          </p>
          <CodeBlock lang="cpp" title="pid.h" code={PID_CODE} />
        </Exercise>
      </Section>
    </>
  );
}
