"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { QuadratureEncoder } from "@/components/viz/robotics/QuadratureEncoder";
import { UltrasonicPing } from "@/components/viz/robotics/UltrasonicPing";

const EMA_CODE = `// Exponential moving average for a sensor read at a fixed rate.
// alpha = dt / (tau + dt). At 100 Hz (dt = 0.01 s) and tau = 0.04 s, alpha = 0.2.
class Ema {
 public:
  explicit Ema(float alpha) : alpha_(alpha) {}

  float update(float x) {
    if (!primed_) {            // start from the first real sample, not from 0
      y_ = x;
      primed_ = true;
    } else {
      y_ += alpha_ * (x - y_);
    }
    return y_;
  }

  float value() const { return y_; }

 private:
  float alpha_;
  float y_ = 0.0f;
  bool primed_ = false;
};

Ema rangeCm(0.2f);

// Called whenever a new HC-SR04 reading arrives (about every 50 ms).
void onUltrasonic(float cm) {
  if (cm < 2.0f || cm > 400.0f) {  // 0 means "timeout": unknown, not near and not far
    return;                        // keep the last estimate, count the miss elsewhere
  }
  rangeCm.update(cm);
}`;

const TICKS_CALC = `Encoder on the motor shaft     7 pulses per revolution (one channel)
Gearbox                        50 : 1
Wheel                          44 mm diameter -> circumference = pi x 44 = 138.2 mm

x1 decoding (A rising edges):  7 x 50          =   350 ticks per wheel turn
                               350 / 138.2     =  2.53 ticks per mm   (0.40 mm per tick)
x4 decoding (every edge):      7 x 4 x 50      = 1,400 counts per wheel turn
                               1,400 / 138.2   = 10.1 counts per mm   (0.10 mm per count)

Speed measurement at 0.2 m/s with a 100 Hz loop (2 mm of travel per cycle):
x1 -> about 5 ticks per cycle  -> one tick is a 20 % speed step
x4 -> about 20 counts per cycle -> one count is a 5 % speed step`;

function TimingDiagram() {
  const trig = vizColors.cyan;
  const burst = vizColors.amber;
  const echo = vizColors.green;
  const burstPts = Array.from({ length: 17 }, (_, i) => `${180 + i * 4.4},${i % 2 === 0 ? 144 : 116}`).join(" ");
  return (
    <SvgCanvas viewBox="0 0 760 300" title="HC-SR04 timing: a 10 microsecond trigger, an 8-cycle 40 kHz burst, and an echo pulse as long as the round trip">
      <Label x={20} y={60} size={12} anchor="start" mono>
        TRIG
      </Label>
      <Label x={20} y={130} size={12} anchor="start" mono>
        burst
      </Label>
      <Label x={20} y={200} size={12} anchor="start" mono>
        ECHO
      </Label>

      {/* trigger */}
      <polyline points="110,76 140,76 140,44 168,44 168,76 740,76" fill="none" stroke={trig} strokeWidth={2.5} strokeLinejoin="round" />
      <Label x={154} y={32} size={11} color={vizColors.text}>
        10 µs
      </Label>

      {/* 40 kHz burst */}
      <line x1={110} y1={130} x2={180} y2={130} stroke={vizColors.grid} strokeWidth={2} />
      <polyline points={burstPts} fill="none" stroke={burst} strokeWidth={1.8} />
      <line x1={250} y1={130} x2={740} y2={130} stroke={vizColors.grid} strokeWidth={2} />
      <Label x={215} y={104} size={11} color={vizColors.text}>
        8 cycles × 40 kHz = 200 µs
      </Label>

      {/* echo */}
      <polyline points="110,216 256,216 256,184 560,184 560,216 740,216" fill="none" stroke={echo} strokeWidth={2.5} strokeLinejoin="round" />
      <polyline points="560,184 700,184 700,216" fill="none" stroke={vizColors.muted} strokeWidth={2} strokeDasharray="6 5" />
      <Arrow x1={300} y1={168} x2={258} y2={168} color={vizColors.text} width={1.5} head={7} />
      <Arrow x1={516} y1={168} x2={558} y2={168} color={vizColors.text} width={1.5} head={7} />
      <Label x={408} y={168} size={11.5} color={vizColors.text} bold>
        t = round trip, 58 µs per cm
      </Label>
      <Label x={560} y={234} size={10.5} color={vizColors.muted}>
        echo arrives
      </Label>
      <Label x={700} y={234} size={10.5} color={vizColors.muted}>
        no echo: ~38 ms
      </Label>
      <Label x={740} y={60} size={10.5} anchor="end" color={vizColors.muted}>
        next TRIG no sooner than 60 ms later
      </Label>

      {/* formula */}
      <rect x={110} y={250} width={630} height={36} rx={6} fill={vizColors.grid} opacity={0.6} />
      <Label x={425} y={268} size={12.5} color={vizColors.text} mono>
        d = t × 343 m/s ÷ 2 → 1 m ↔ 5.83 ms, 10 cm ↔ 583 µs
      </Label>
      <Label x={20} y={268} size={10} anchor="start" color={vizColors.muted}>
        not to scale
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="How robot sensors work, and how they lie">
        <Prose>
          <p>
            Every sensor turns a physical quantity into a number through a model, and every model has conditions under
            which it fails. Knowing those conditions is most of the job: the code that reads a sensor is ten lines, the
            code that copes with its failures is the rest.
          </p>

          <h3>Ultrasonic ranging: the HC-SR04</h3>
          <p>
            The HC-SR04 measures time of flight. Hold TRIG high for 10 µs and the module sends a burst of eight 40 kHz
            cycles, then holds ECHO high until it hears the reflection. Distance is d = t · 343 / 2, with t in seconds
            and 343 m/s the speed of sound at 20 °C. The round trip costs about 58 µs per centimetre, so an object 1 m
            away gives a 5.8 ms pulse. The module is rated for 2-400 cm with a measuring angle of about 15°. If nothing
            comes back it gives up after about 38 ms, and you should wait at least 60 ms between pings so a late echo
            is not taken for the next one.
          </p>
          <p>It lies in four predictable ways:</p>
          <ul>
            <li>
              <strong>Angled smooth surfaces.</strong> At 40 kHz the wavelength is 8.6 mm, so painted walls, glass and
              boxes act as mirrors. A wall tilted more than about 15° from square sends the echo away and the sensor
              reports nothing at all.
            </li>
            <li>
              <strong>Soft surfaces.</strong> Fabric, foam and fur absorb sound, so echoes become weak and intermittent.
            </li>
            <li>
              <strong>Temperature.</strong> Sound travels at about 331.3 + 0.606·T m/s, so its speed changes 5.5%
              between 0 °C and 30 °C.
            </li>
            <li>
              <strong>Crosstalk.</strong> Two sensors pinging together hear each other. Fire them in turn.
            </li>
          </ul>
          <p>The module runs on 5 V and its ECHO output is 5 V, so a 3.3 V microcontroller needs a divider on that pin.</p>
        </Prose>

        <Figure caption="HC-SR04 timing: a 10 µs trigger, an 8-cycle 40 kHz burst, then an echo pulse whose width is the round-trip time.">
          <TimingDiagram />
        </Figure>

        <Prose>
          <h3>Infrared reflectance: the TCRT5000</h3>
          <p>
            A TCRT5000 puts a 950 nm infrared LED beside a phototransistor. A white floor reflects the light and turns
            the transistor on; black tape absorbs it. The sensor works best about 2.5 mm from the surface, and sunlight,
            which is rich in infrared, can swamp it. Read the analog output, record each sensor&apos;s black and white
            values, and set the threshold halfway between them rather than trusting a fixed number.
          </p>

          <h3>Quadrature encoders</h3>
          <p>
            An encoder turns rotation into pulses. A quadrature encoder has two channels, A and B, offset by a quarter
            cycle (90 electrical degrees). Whichever channel leads gives the direction, and counting both edges of both
            channels (×4 decoding) gives four counts per pulse. Datasheets quote pulses per revolution (PPR) of one
            channel; counts per revolution (CPR) includes the decoding. The course robot&apos;s N20 motors carry 7 PPR
            magnetic encoders on the motor shaft, so ×4 decoding gives 28 counts per motor turn and 1,400 per wheel turn
            behind the 50:1 gearbox. Count edges in hardware (the ESP32&apos;s pulse-counter unit) or in short
            interrupts; a polled loop misses edges at speed.
          </p>

          <h3>IMUs: accelerometer, gyroscope, magnetometer</h3>
          <ul>
            <li>
              The <strong>accelerometer</strong> measures specific force, gravity included, over ±2-16 g. At rest it
              gives tilt from the direction of gravity, but vibration and acceleration corrupt it.
            </li>
            <li>
              The <strong>gyroscope</strong> measures angular rate, typically ±250-2000 °/s. It is smooth, but its
              zero-rate offset (up to ±20 °/s uncalibrated on an MPU-6050) integrates into drift: an uncorrected 0.5 °/s
              bias is 30° of heading error per minute. Average it for two seconds at rest and subtract it.
            </li>
            <li>
              The <strong>magnetometer</strong> senses Earth&apos;s 25-65 µT field for heading, but motors, steel and
              wiring distort it, so it needs hard- and soft-iron calibration.
            </li>
          </ul>
          <p>
            The <strong>complementary filter</strong> fuses gyro and accelerometer for tilt: angle = α·(angle +
            rate·dt) + (1 − α)·accelAngle. With α ≈ 0.98 at 100 Hz, the crossover time constant α·dt/(1 − α) is about
            0.5 s: the gyro tracks fast motion and the accelerometer removes slow drift. It cannot fix yaw, because
            gravity carries no heading information.
          </p>

          <h3>Lidar and cameras</h3>
          <p>
            Lidar times light instead of sound: 6.7 ns per metre of range. A spinning 2D unit such as the RPLIDAR A1
            gives 360° scans out to 12 m at about 5.5 Hz; single-point sensors such as the VL53L1X reach about 4 m over
            I2C. Both struggle with glass, mirrors and black surfaces. Cameras give the richest data at the highest
            compute cost; they need lens calibration (focal length and distortion from about 20 checkerboard images)
            and suffer from motion blur and lighting changes.
          </p>

          <h3>Sampling, noise and filtering</h3>
          <p>
            Sample at least twice as fast as the fastest change you care about (Nyquist), and in practice 5-10 times
            faster. Averaging N independent samples cuts noise by √N, so 16 samples give a 4× improvement. The
            workhorse filter is the <strong>exponential moving average</strong>, y += α·(x − y): one multiply, with α =
            dt/(τ + dt) setting the time constant τ. Its price is lag: with τ = 40 ms it delays a slow signal by about 40
            ms, and lag inside a control loop costs stability. For spikes and dropouts, such as an ultrasonic timeout, a
            median of three readings beats any average.
          </p>

          <h3>Calibration and fusion</h3>
          <p>
            Calibration maps raw readings to truth: offsets (gyro bias at rest), scale (drive exactly 1 m and count
            ticks to find the effective wheel diameter) and ranges (black and white values per line sensor). Fusion then
            combines sensors whose errors differ. Encoders are precise over short distances but slip; a gyro holds
            heading through a slip but drifts; an occasional absolute fix, such as a wall, a line or a lidar scan,
            resets both. The Kalman filter is the formal, optimal version of that idea; the complementary filter is its
            simplest cousin.
          </p>
        </Prose>

        <Callout kind="warning" title="A timeout is not a distance">
          pulseIn() returns 0 when no echo arrives. Treating that 0 as &quot;very close&quot; causes phantom stops;
          treating it as &quot;far away&quot; drives the robot into angled walls. Store it as unknown and slow down.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: ping a wall, spin an encoder">
        <UltrasonicPing />
        <Prose>
          <p>
            Tilt the wall to 10° and the reading barely changes; at 20° the echo is gone. Then drop the temperature to
            0 °C at 380 cm: the firmware&apos;s fixed 343 m/s overestimates the range by about 13 cm.
          </p>
        </Prose>
        <QuadratureEncoder />
        <Prose>
          <p>
            Pause, then press Step to walk through one edge at a time and watch the AB state move around the ring.
            Reverse the speed and the order of edges, not their shape, changes.
          </p>
        </Prose>
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Filter a noisy range reading">
          <p>
            Write an exponential moving average for the HC-SR04 that starts from the first valid sample and ignores
            timeouts. Pick α for a 40 ms time constant at 100 Hz.
          </p>
          <p>
            <strong>Answer.</strong> α = dt/(τ + dt) = 0.01/0.05 = 0.2. Invalid readings are rejected before they reach
            the filter, so a single timeout cannot drag the estimate toward 0.
          </p>
          <CodeBlock lang="cpp" title="ema.h" code={EMA_CODE} />
        </Exercise>
        <Exercise title="Ticks per millimetre for the course robot">
          <p>
            The N20 encoder gives 7 pulses per motor revolution, the gearbox is 50:1 and the wheel is 44 mm across. How
            many ticks per millimetre do you get, and what does that mean for measuring speed at 100 Hz?
          </p>
          <CodeBlock lang="text" title="worked answer" code={TICKS_CALC} />
          <p>
            <strong>Answer.</strong> About 2.5 ticks per mm counting only A&apos;s rising edges, or 10.1 counts per mm
            with ×4 decoding. At low speed a 100 Hz loop sees only a handful of ticks per cycle, so use ×4 decoding, or
            measure the time between edges instead of counting them.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
