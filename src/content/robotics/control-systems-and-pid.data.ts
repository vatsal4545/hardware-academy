import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Closed-loop control",
      def: "Measuring the output, comparing it with the setpoint and correcting the input continuously. Open loop ('60% duty and hope') drifts with battery voltage, load and friction; closed loop does not.",
    },
    {
      term: "Error",
      def: "Setpoint minus measurement, e = r − y. Every PID term is computed from it: P from its size, I from its history and D from its rate of change.",
    },
    {
      term: "Steady-state error",
      def: "The offset left once the response settles. A P-only speed loop keeps an error of 1/(1 + K·Kp) of the setpoint, 33% with Kp = 2 on a unit-gain plant; integral action removes it.",
    },
    {
      term: "Integral windup",
      def: "The integral term growing while the actuator is saturated, then overshooting badly when the error finally reverses. Anti-windup stops integrating while the output is clamped in the same direction.",
    },
    {
      term: "Derivative kick",
      def: "A spike in the output when the setpoint steps, because the derivative of the error is momentarily huge. Taking the derivative of the measurement instead avoids it.",
    },
    {
      term: "Overshoot and settling time",
      def: "How far the response passes the setpoint, as a percentage, and how long it takes to stay within a band around it, here ±2%. The two usually trade off against each other.",
    },
    {
      term: "Ziegler-Nichols tuning",
      def: "Raise Kp alone until the loop oscillates steadily at gain Ku with period Tu, then set Kp = 0.6·Ku, Ki = 1.2·Ku/Tu and Kd = 0.075·Ku·Tu. It gives about 25% overshoot, a starting point to detune.",
    },
    {
      term: "Cascade control",
      def: "Nested loops: an outer loop (heading or position) sets the setpoint of a faster inner loop (wheel speed or yaw rate). The inner loop should run 5-10 times faster than the outer.",
    },
    {
      term: "Feedforward",
      def: "An output computed directly from the setpoint, such as duty = speed / top speed plus a static-friction offset, so the PID only corrects the residual error.",
    },
  ],
  scenario: {
    title: "Heading hold weaves ±10° down the hallway",
    context:
      "A robot holds its heading with a P controller on a gyro-integrated yaw angle: wheel speed difference = Kp × heading error. To fix a slow drift, the team doubled Kp. They had also set the MPU-6050's digital low-pass filter to its 5 Hz setting to quiet motor vibration, and the heading controller runs in the 20 Hz behavior loop rather than the 100 Hz control loop. Now the robot weaves left and right about ±10° as it drives straight.",
    symptoms: [
      "The weave has a steady period of about 0.7 s and does not die out.",
      "Halving Kp stops the weaving but brings back the slow drift.",
      "The weave gets worse at higher drive speeds and after the low-pass filter was set to 5 Hz.",
      "A log of heading error and commanded turn rate shows the command peaking well after the error peaks.",
    ],
    hints: [
      "The MPU-6050's 5 Hz filter setting adds about 19 ms of delay. Add up every delay between the robot turning and the wheels responding.",
      "For a loop around an integrating plant (heading is the integral of yaw rate), a pure delay d makes it oscillate at a period of about 4·d once the gain is high enough.",
      "Which term reacts to the rate of change of heading, and does the gyro already measure that rate directly?",
    ],
    rootCause:
      "Lag, not just gain. The filter (about 19 ms), the 20 Hz behavior loop (up to 50 ms plus a cycle of latency) and the wheels' own response (about 100 ms) add roughly 175 ms of delay. Heading integrates the turn rate, so the loop already has 90° of phase lag; the delay adds the rest at the frequency where 2π·f·0.175 s = π/2, about 1.4 Hz, a 0.7 s period. Doubling Kp pushed the loop gain above 1 at that frequency, so the weave sustained itself instead of decaying.",
    fix:
      "Move the heading controller into the 100 Hz control loop and raise the MPU-6050 filter to 42 Hz (about 4.8 ms of delay), which removes most of the lag. Add a derivative term that uses the gyro's yaw rate directly (D on measurement, no differentiation noise), set Kp back to about half the value where weaving began, and add a small integral term for the slow drift. Better still, cascade it: the heading loop commands a yaw rate and an inner yaw-rate loop drives the wheel-speed setpoints.",
    lesson:
      "Oscillation is a lag problem as much as a gain problem. Every filter, slow loop and actuator delay in the feedback path costs phase margin, so remove lag before you reduce gain.",
  },
  interview: [
    {
      q: "What does each term of a PID controller do?",
      a: "P reacts to the present error: the bigger the error, the harder it pushes, but on its own it usually leaves a steady offset because some error is needed to produce any output. I sums the error over time, so it keeps pushing until the offset is gone; too much of it causes overshoot and slow oscillation. D reacts to how fast the error, or better the measurement, is changing, which damps a plant with inertia, but it amplifies noise. On a wheel-speed loop I usually run PI; on heading or position loops, where the plant integrates, D earns its keep.",
      level: "screen",
    },
    {
      q: "What is integral windup and how do you prevent it?",
      a: "Windup happens when the actuator saturates, say the motor is at 100% duty because the robot is pushing against a wall, and the integral keeps accumulating error it can do nothing about. When the obstacle clears, that huge integral drives a long overshoot. The fixes are to stop integrating while the output is clamped in the same direction as the error (conditional integration), to clamp the integral term itself, or to bleed it back with back-calculation from the saturated output. I also reset or pre-load the integral when the controller is enabled, so the switch-on is bumpless.",
      level: "screen",
    },
    {
      q: "Why compute the derivative on the measurement instead of the error, and what else do you do to the D term?",
      a: "The error is setpoint minus measurement, so a step change in setpoint makes the error's derivative enormous for one sample, a spike called derivative kick that slams the actuator. The measurement's derivative is the same as the error's except during setpoint changes, so using −dy/dt keeps the damping and removes the kick. I also low-pass filter the D term, typically with a time constant of a few samples, because differentiation multiplies high-frequency noise; at 100 Hz, one encoder count of quantization becomes a large spurious rate. When the sensor measures the rate directly, like a gyro for heading, I use that signal instead of differentiating at all.",
      level: "deep",
    },
    {
      q: "A robot's heading oscillates by about ±10°. How do you diagnose and fix it?",
      a: "First I log heading error and the controller's output with timestamps and measure the oscillation period; a steady oscillation means the loop gain at that frequency is too high for the phase lag present. Then I add up the lag: sensor filtering, the loop rate, communication and actuator response. For a heading loop, the oscillation period is roughly four times the total delay, so a 0.7 s period points to about 175 ms of lag. The fixes, in order, are to remove lag (run the loop faster, loosen the filter), add damping with the gyro's rate as the D term, then reduce Kp to about half the value where oscillation began and use a little I for drift.",
      level: "deep",
    },
    {
      q: "How does Ziegler-Nichols tuning work, and what are its limits?",
      a: "With I and D off, you raise Kp until the output oscillates with constant amplitude; that gain is Ku and the period is Tu. The classic PID table then gives Kp = 0.6·Ku, Ki = 1.2·Ku/Tu and Kd = 0.075·Ku·Tu, or for PI, Kp = 0.45·Ku and Ki = 0.54·Ku/Tu. It aims for quarter-amplitude decay, which means about 25% overshoot, too aggressive for most robots, so I treat it as a starting point and detune. It is also risky on real hardware, because you deliberately drive the system to the edge of instability.",
      level: "screen",
    },
    {
      q: "Explain cascade control and feedforward for a wheeled robot.",
      a: "In a cascade, an outer loop sets the setpoint of an inner loop: the heading loop outputs a turn-rate command, the turn-rate loop outputs wheel-speed setpoints, and per-wheel PI loops drive the PWM. The inner loops must be 5-10 times faster than the outer ones so the outer loop sees them as nearly ideal, and they reject disturbances such as a carpet edge before the heading even changes. Feedforward adds a model-based guess to the output: duty = kS·sign(v) + kV·v (+ kA·a), from a quick characterization of the motor. With good feedforward the PID only corrects small residuals, so the gains can stay low and the response is fast without overshoot.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "A P-only speed loop has Kp = 4 on a plant with a steady-state gain of 1. What fraction of the setpoint is left as steady-state error?",
      choices: ["0%", "20%", "25%", "80%"],
      answer: 1,
      explain:
        "At steady state y = Kp/(1 + Kp)·r, so the error is r/(1 + Kp) = 1/5 = 20%. More Kp shrinks the error but never removes it; an integral term does, because it keeps growing until the error is zero.",
    },
    {
      q: "Which PID term removes steady-state error?",
      choices: ["Proportional", "Derivative", "Integral", "None of them; only feedforward can"],
      answer: 2,
      explain:
        "The integral accumulates error for as long as any remains, so the output keeps changing until the error is zero. Proportional action needs a nonzero error to produce output, and derivative action responds only to change.",
    },
    {
      q: "When does derivative kick happen, and how is it avoided?",
      choices: [
        "When the sensor is noisy; low-pass filter the input before the derivative term sees it",
        "When the output saturates; clamp the integral so the derivative cannot wind up",
        "When the loop rate drops; use a faster MCU so the time step stays constant",
        "When the setpoint steps; take the derivative of the measurement instead of the error",
      ],
      answer: 3,
      explain:
        "A setpoint step makes the error jump in one sample, so d(error)/dt spikes. The measurement does not jump, so using −dy/dt gives the same damping without the spike. The simulator in this lesson uses derivative on measurement.",
    },
    {
      q: "Ziegler-Nichols testing finds Ku = 10 and Tu = 0.5 s. Which classic PID gains does it give?",
      choices: ["Kp 6, Ki 24, Kd 0.375", "Kp 4.5, Ki 9, Kd 0", "Kp 10, Ki 20, Kd 0.5", "Kp 6, Ki 12, Kd 0.75"],
      answer: 0,
      explain:
        "Kp = 0.6·10 = 6, Ki = 1.2·10/0.5 = 24 and Kd = 0.075·10·0.5 = 0.375. Expect about 25% overshoot, then detune by lowering Kp and Ki.",
    },
    {
      q: "When does integral windup occur?",
      choices: [
        "When the setpoint changes slowly and the integral has time to grow",
        "When the derivative gain is set too high",
        "When the actuator is saturated while the error persists",
        "When the loop runs faster than about 1 kHz",
      ],
      answer: 2,
      explain:
        "If the motor is already at full duty, for example while the robot is held against a wall, the integral keeps growing without any effect. When the error reverses it must unwind, causing a long overshoot. Anti-windup stops integration while the output is clamped.",
    },
    {
      q: "In a cascade, how much faster should the inner loop run than the outer loop?",
      choices: ["The same rate", "About 5-10 times", "About 100 times", "At least 1,000 times"],
      answer: 1,
      explain:
        "A 5-10× separation lets the outer loop treat the inner loop as an almost perfect actuator, and lets the inner loop reject disturbances before the outer loop sees them. A typical robot runs wheel speed at 100 Hz-1 kHz and heading at 20-100 Hz.",
    },
    {
      q: "In the tuner, raising Kd on the wheel-speed plant makes the overshoot slightly worse. Why?",
      choices: [
        "The simulator has a bug in its derivative term that adds the step instead of subtracting it",
        "D always increases overshoot, whatever the plant, because it amplifies the setpoint step",
        "The derivative is computed on the error, so the setpoint step appears as a spike",
        "A first-order speed plant has no inertia for D to damp; D on measurement acts like extra lag",
      ],
      answer: 3,
      explain:
        "A first-order plant like wheel speed already responds without oscillating, so there is nothing for D to damp; −Kd·dy/dt just resists every change, slowing the loop. That is why speed loops are usually PI, and D is reserved for plants with inertia such as heading or position.",
    },
  ],
};

export default data;
