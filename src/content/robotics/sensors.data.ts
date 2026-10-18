import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Time of flight (ToF)",
      def: "Ranging by timing a pulse's round trip: d = t·c/2. Ultrasonic sensors use sound (343 m/s at 20 °C, about 58 µs per cm of range); lidar uses light (6.7 ns per metre of range).",
    },
    {
      term: "Quadrature encoder",
      def: "An encoder with two outputs, A and B, a quarter cycle (90 electrical degrees) apart. Which one leads gives the direction; counting every edge of both (×4 decoding) gives four counts per pulse.",
    },
    {
      term: "PPR and CPR",
      def: "Pulses per revolution counts one channel's cycles; counts per revolution includes the decoding. A 7 PPR motor encoder gives 28 CPR at ×4, or 1,400 counts per wheel turn behind a 50:1 gearbox.",
    },
    {
      term: "Gyro bias and drift",
      def: "A gyro's output at zero rotation is not exactly zero. Integrated, an uncorrected 0.5 °/s bias becomes 30° of heading error per minute, so the bias is measured at rest and subtracted.",
    },
    {
      term: "Complementary filter",
      def: "angle = α·(angle + gyroRate·dt) + (1 − α)·accelAngle. With α = 0.98 at 100 Hz the gyro handles changes faster than about 0.5 s and the accelerometer removes slower drift.",
    },
    {
      term: "Exponential moving average (EMA)",
      def: "A one-line low-pass filter: y += α·(x − y). α = dt/(τ + dt) sets the time constant τ; a smaller α removes more noise and adds more lag.",
    },
    {
      term: "Specular reflection",
      def: "A mirror-like bounce from a surface that is smooth compared with the wavelength (8.6 mm for 40 kHz sound). A tilted wall sends the echo away, so an ultrasonic sensor hears nothing.",
    },
    {
      term: "Sensor fusion",
      def: "Combining sensors whose errors differ, such as a smooth but drifting gyro and a noisy but drift-free accelerometer, to get an estimate better than either alone. The Kalman filter is the optimal linear version.",
    },
  ],
  scenario: {
    title: "Robot drives into angled walls its ultrasonic sensor never reported",
    context:
      "An obstacle-avoiding robot uses one forward-facing HC-SR04 and turns away whenever the reading drops below 25 cm. In square-on bench tests it never touches a wall. During a hallway demo it drives straight into walls it meets at a shallow angle, and into a fabric-covered partition. Early in the project the team made the firmware convert a pulseIn() timeout, which returns 0, into 400 cm, because zeros were causing spurious stops in open rooms.",
    symptoms: [
      "Square-on walls are detected reliably from a few centimetres to beyond 2 m.",
      "Walls met roughly 30-45° off square are never reported; the log shows 0 (converted to 400 cm) for the last second before every impact.",
      "The fabric-covered partition gives readings that jump between a plausible 40-60 cm and 0.",
      "A second HC-SR04 angled 30° outward and fired at the same moment as the first made the readings noisier, not better.",
    ],
    hints: [
      "At 40 kHz the wavelength is 343/40,000 = 8.6 mm. Is a painted wall rough or smooth at that scale, and where does a mirror send a beam that strikes it 40° off square?",
      "What does pulseIn() return when no echo arrives before its timeout, and what did the firmware do with that value?",
      "What does each sensor hear when two HC-SR04s ping at the same instant?",
    ],
    rootCause:
      "A smooth wall is a mirror for 40 kHz sound. Struck about 40° off square, the echo leaves 80° away from the sensor's axis, far outside the receiver's roughly 15° cone, so nothing returns and the HC-SR04 times out with its echo pin high for about 38 ms. pulseIn() returned 0, and the firmware turned that 0 into 400 cm, a clear road, at exactly the moment the sensor knew nothing. The fabric absorbed most of the sound, so its echoes came and went. The two sensors pinged together, so each heard the other's burst and reported crosstalk distances.",
    fix:
      "Treat a timeout as unknown, never as clear: slow down after two consecutive misses and stop after five. Add sensors angled about ±30° so any wall is close to square for at least one of them, and fire them in turn about 30 ms apart so each echo dies before the next ping. Reject single-sample outliers with a median of three readings, and back the ultrasonics with a short-range IR time-of-flight sensor such as a VL53L1X, or a bump switch, for soft and angled targets.",
    lesson:
      "A sensor's 'no reading' is information, not a number. Model when each sensor goes blind (angle, material, timeout) and make the behavior more careful, not less, when it does.",
  },
  interview: [
    {
      q: "How does an HC-SR04 measure distance, and what limits it?",
      a: "You give the trigger pin a 10 µs pulse, the module sends eight cycles of 40 kHz sound, and it holds its echo pin high until the reflection comes back. Distance is the pulse width times the speed of sound divided by two, about 58 µs per centimetre at 20 °C. It works from about 2 cm to 4 m inside a cone of roughly 15°. It fails on soft materials that absorb sound and on smooth surfaces at an angle, which reflect the sound away like a mirror. The speed of sound also changes by about 0.6 m/s per °C, so a 30 °C swing is roughly a 5% error unless you compensate.",
      level: "screen",
    },
    {
      q: "What is a quadrature encoder, and how do you get direction from it?",
      a: "It has two outputs, A and B, that produce square waves a quarter cycle apart. If A's edges come before B's the shaft turns one way; if B leads, it turns the other way. Counting every rising and falling edge of both channels, called ×4 decoding, gives four counts per pulse period, so a 7 PPR encoder gives 28 counts per motor revolution. I would count in hardware, such as the ESP32's pulse-counter unit, or in short interrupts that run a 2-bit state machine so reversals and glitches are handled correctly.",
      level: "screen",
    },
    {
      q: "Explain how a complementary filter estimates tilt from a gyro and an accelerometer. How do you choose α, and what can it not fix?",
      a: "The gyro measures angular rate with little noise, but integrating it accumulates bias, so the angle drifts; the accelerometer measures the direction of gravity without drift, but it is noisy and fooled by vibration and acceleration. The filter blends them: angle = α·(angle + rate·dt) + (1 − α)·accelAngle, which high-passes the gyro and low-passes the accelerometer. The crossover time constant is about α·dt/(1 − α), so α = 0.98 at 100 Hz gives roughly 0.5 s: the gyro wins for anything faster and the accelerometer for anything slower. It cannot fix yaw, because gravity carries no heading information, so heading needs a magnetometer, a camera or another absolute reference. It also assumes the accelerometer mostly sees gravity, so during long accelerations you lower its weight or move to a Kalman filter.",
      level: "deep",
    },
    {
      q: "You need to filter a noisy sensor that feeds a control loop. How do you choose the filter?",
      a: "First I look at the noise: spikes and dropouts call for a median of three or five readings, while broadband noise calls for a low-pass such as an exponential moving average. Then I size the filter against the loop, because an EMA with α = dt/(τ + dt) delays slow signals by about τ and that delay eats phase margin. At 100 Hz, α = 0.2 gives τ = 40 ms, which is fine for a 1 Hz heading loop but too slow for a 20 Hz balance loop. If the lag is unacceptable I fix the noise at the source, with better wiring, a better sensor or oversampling, or move to a model-based estimator.",
      level: "deep",
    },
    {
      q: "Why does position from an IMU alone drift so fast?",
      a: "Position comes from integrating acceleration twice, so any constant error grows with the square of time. A bias of only 0.01 m/s², about a thousandth of g, becomes ½·a·t² = 18 m of position error after one minute. Tilt makes it worse, because a 1° attitude error leaks 0.17 m/s² of gravity into the horizontal axes. That is why robots use the IMU for orientation and short-term motion, and correct position with wheel odometry, GPS, lidar or cameras.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "An HC-SR04's echo pulse lasts 2.9 ms at 20 °C. How far away is the object?",
      choices: ["12 cm", "25 cm", "50 cm", "1.0 m"],
      answer: 2,
      explain:
        "d = t × 343 / 2 = 0.0029 × 343 / 2 ≈ 0.50 m. The pulse covers the round trip, so forgetting to divide by two gives the classic wrong answer of 1.0 m.",
    },
    {
      q: "A quadrature encoder's channel A has been leading channel B. Now B leads A. What happened?",
      choices: ["The shaft doubled its speed", "A glitch inserted one extra count", "The encoder lost power", "The shaft reversed direction"],
      answer: 3,
      explain:
        "The phase relationship between A and B encodes direction. A speed change alters the frequency of both channels but not which one leads, so a swap means the shaft now turns the other way.",
    },
    {
      q: "A 7 PPR motor encoder drives a 44 mm wheel through a 50:1 gearbox. How many counts per millimetre do you get with ×4 decoding?",
      choices: ["2.5", "10.1", "28", "44"],
      answer: 1,
      explain:
        "7 pulses × 4 edges × 50 = 1,400 counts per wheel turn, and the wheel's circumference is π × 44 = 138.2 mm, so 1,400 / 138.2 = 10.1 counts per mm. Counting only A's rising edges (×1) gives about 2.5 per mm.",
    },
    {
      q: "In a complementary filter with α = 0.98, what is the 0.02 weight on the accelerometer angle for?",
      choices: [
        "It slowly pulls the gyro-integrated angle toward gravity, cancelling drift",
        "It removes accelerometer noise by averaging about 50 samples before each update",
        "It converts the accelerometer's g reading into degrees of tilt",
        "It makes the filter respond faster to quick rotations than the gyro alone would",
      ],
      answer: 0,
      explain:
        "The integrated gyro angle is smooth but drifts with bias. Mixing in 2% of the accelerometer's gravity-based angle every step drags the estimate back toward the truth with a time constant of about 0.5 s at 100 Hz, while brief accelerometer noise barely moves it.",
    },
    {
      q: "You change an EMA filter's α from 0.5 to 0.1 at the same sample rate. What happens?",
      choices: ["More noise and less lag", "Less noise and less lag", "Nothing changes at a fixed sample rate", "Less noise and more lag"],
      answer: 3,
      explain:
        "A smaller α trusts each new sample less, so noise is averaged over more samples, but the output also follows real changes more slowly. At 100 Hz the time constant dt·(1 − α)/α grows from 10 ms to 90 ms.",
    },
    {
      q: "Why does an HC-SR04 often report no echo from a smooth wall 40° off square?",
      choices: [
        "Paint absorbs 40 kHz sound almost completely",
        "The wall reflects the sound away like a mirror",
        "40 kHz sound cannot travel that far and back",
        "The trigger pulse was too short to register",
      ],
      answer: 1,
      explain:
        "A painted wall is smooth compared with the 8.6 mm wavelength of 40 kHz sound, so it reflects specularly. At 40° the echo leaves 80° from the sensor's axis and misses the receiver; the module times out and many libraries return 0.",
    },
    {
      q: "At what height does a TCRT5000 reflective sensor work best?",
      choices: ["About 2-3 cm above the surface", "About 2-3 mm above the surface", "About 20 cm above the surface", "Height does not matter"],
      answer: 1,
      explain:
        "The TCRT5000's emitter and detector beams overlap best about 2.5 mm from the surface, and the useful range is roughly 0.2-15 mm. Mount it a few millimetres above the floor and record black and white readings at that height.",
    },
  ],
};

export default data;
