"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { RoundedArrow } from "@/components/viz/ev/EvAShapes";
import { DqFrame } from "@/components/viz/ev/DqFrame";
import { ThreePhaseInverterPwm } from "@/components/viz/ev/ThreePhaseInverterPwm";

const BOX = "#1a2235";

function Box({ x, y, w, h, lines, stroke = vizColors.muted }: { x: number; y: number; w: number; h: number; lines: string[]; stroke?: string }) {
  const top = y + h / 2 - ((lines.length - 1) * 15) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={BOX} stroke={stroke} strokeWidth={1.5} />
      {lines.map((l, i) => (
        <Label key={l} x={x + w / 2} y={top + i * 15} size={i === 0 ? 12 : 10.5} bold={i === 0} color={i === 0 ? vizColors.text : vizColors.muted}>
          {l}
        </Label>
      ))}
    </g>
  );
}

function FocBlockDiagram() {
  const sig = vizColors.text;
  const fb = vizColors.cyan;
  return (
    <SvgCanvas
      viewBox="0 0 780 300"
      title="Field-oriented control block diagram: torque request, current references, PI controllers, inverse Park, SVPWM, inverter, motor, current sensors, Clarke, Park and resolver feedback"
    >
      <rect x={0} y={0} width={780} height={300} fill={vizColors.bg} rx={10} />

      {/* forward path */}
      <Box x={10} y={80} w={100} h={40} lines={["Torque request", "from the VCU"]} />
      <RoundedArrow x1={110} y1={100} x2={124} y2={100} color={sig} width={1.5} />
      <Box x={126} y={46} w={122} h={108} lines={["Current refs", "Iq* = T*/Kt", "Id* = 0, MTPA", "or field weakening"]} stroke={vizColors.violet} />
      <Label x={244} y={62} anchor="end" size={10} color={vizColors.violet}>
        Id*
      </Label>
      <Label x={244} y={138} anchor="end" size={10} color={vizColors.violet}>
        Iq*
      </Label>
      <RoundedArrow x1={248} y1={70} x2={265} y2={70} color={sig} width={1.5} />
      <RoundedArrow x1={248} y1={130} x2={265} y2={130} color={sig} width={1.5} />
      {[70, 130].map((y) => (
        <g key={y}>
          <circle cx={276} cy={y} r={10} fill={BOX} stroke={sig} strokeWidth={1.5} />
          <Label x={276} y={y} size={11} bold>
            Σ
          </Label>
        </g>
      ))}
      <RoundedArrow x1={286} y1={70} x2={296} y2={70} color={sig} width={1.5} />
      <RoundedArrow x1={286} y1={130} x2={296} y2={130} color={sig} width={1.5} />
      <Box x={296} y={54} w={50} h={32} lines={["PI"]} stroke={vizColors.green} />
      <Box x={296} y={114} w={50} h={32} lines={["PI"]} stroke={vizColors.green} />
      <RoundedArrow x1={346} y1={70} x2={380} y2={70} color={sig} width={1.5} />
      <RoundedArrow x1={346} y1={130} x2={380} y2={130} color={sig} width={1.5} />
      <Label x={363} y={60} size={10} color={vizColors.muted}>
        Vd*
      </Label>
      <Label x={363} y={120} size={10} color={vizColors.muted}>
        Vq*
      </Label>
      <Box x={380} y={48} w={90} h={104} lines={["Inverse Park", "dq → αβ"]} stroke={vizColors.violet} />
      <RoundedArrow x1={470} y1={100} x2={504} y2={100} color={sig} width={1.5} />
      <Label x={487} y={90} size={10} color={vizColors.muted}>
        Vα, Vβ
      </Label>
      <Box x={504} y={72} w={80} h={56} lines={["SVPWM", "3 duty cycles"]} stroke={vizColors.orange} />
      <RoundedArrow x1={584} y1={100} x2={618} y2={100} color={sig} width={1.5} />
      <Box x={618} y={62} w={84} h={76} lines={["Inverter", "gate drivers", "6 switches"]} stroke={vizColors.orange} />
      {[92, 100, 108].map((y) => (
        <line key={y} x1={702} y1={y} x2={719} y2={y} stroke={vizColors.amber} strokeWidth={2} />
      ))}
      <circle cx={742} cy={100} r={24} fill={BOX} stroke={vizColors.copper} strokeWidth={2} />
      <Label x={742} y={100} size={13} bold>
        M
      </Label>

      {/* DC-link voltage into the modulator */}
      <RoundedArrow x1={544} y1={168} x2={544} y2={130} color={vizColors.orange} width={1.5} />
      <Label x={538} y={156} anchor="end" size={10} color={vizColors.orange}>
        Vdc
      </Label>

      {/* resolver and angle */}
      <line x1={742} y1={124} x2={742} y2={176} stroke={vizColors.muted} strokeWidth={1.5} />
      <Box x={716} y={176} w={60} h={32} lines={["Resolver"]} />
      <polyline points="716,192 430,192" fill="none" stroke={vizColors.amber} strokeWidth={1.5} strokeDasharray="5 4" />
      <RoundedArrow x1={430} y1={192} x2={430} y2={154} color={vizColors.amber} width={1.5} dashed />
      <RoundedArrow x1={430} y1={192} x2={430} y2={234} color={vizColors.amber} width={1.5} dashed />
      <Label x={600} y={205} size={11} color={vizColors.amber}>
        θ, rotor electrical angle
      </Label>

      {/* current feedback */}
      <polyline points="708,108 708,256 642,256" fill="none" stroke={fb} strokeWidth={1.5} />
      <RoundedArrow x1={650} y1={256} x2={642} y2={256} color={fb} width={1.5} />
      <Label x={714} y={232} anchor="start" size={10} color={fb}>
        ia, ib
      </Label>
      <Box x={540} y={236} w={100} h={40} lines={["Clarke", "abc → αβ"]} stroke={fb} />
      <RoundedArrow x1={540} y1={256} x2={482} y2={256} color={fb} width={1.5} />
      <Label x={511} y={246} size={10} color={fb}>
        iα, iβ
      </Label>
      <Box x={380} y={236} w={100} h={40} lines={["Park", "αβ → dq"]} stroke={fb} />
      {/* Iq back to the lower summing point */}
      <polyline points="380,248 276,248 276,143" fill="none" stroke={fb} strokeWidth={1.5} />
      <RoundedArrow x1={276} y1={150} x2={276} y2={141} color={fb} width={1.5} />
      <Label x={284} y={214} anchor="start" size={10} color={fb}>
        Iq
      </Label>
      {/* Id back to the upper summing point, hopping over the Iq* line */}
      <path d="M 380 264 L 258 264 L 258 136 A 6 6 0 0 1 258 124 L 258 90 L 268 78" fill="none" stroke={fb} strokeWidth={1.5} />
      <Label x={250} y={214} anchor="end" size={10} color={fb}>
        Id
      </Label>
      <Label x={268} y={92} anchor="end" size={9} color={vizColors.muted}>
        −
      </Label>
      <Label x={288} y={150} anchor="start" size={9} color={vizColors.muted}>
        −
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From six switches to precise torque">
        <Prose>
          <h3>Six switches, three legs</h3>
          <p>
            A traction inverter is three half-bridges across the DC link. Each leg has a high-side and a low-side switch,
            IGBTs or SiC MOSFETs, each with an antiparallel diode, and its midpoint drives one motor phase. A leg can only
            tie its phase to DC+ or DC−, so three legs give eight switch states: six that put voltage across the motor and two
            that tie all three phases to the same rail. Both switches of one leg must never conduct together; that
            shoot-through shorts the DC link through two devices in microseconds.
          </p>

          <h3>PWM: sine waves from on and off</h3>
          <p>
            Switch a leg fast enough and the motor&apos;s inductance smooths the pulses into a near-sinusoidal current.
            Sine-triangle PWM compares each phase&apos;s sinusoidal reference with a triangular carrier at the switching
            frequency, typically 8-20 kHz: the leg is high while the reference is above the carrier, so its average over
            each carrier period follows the sine. The modulation index m scales the reference. At m = 1 on a 400 V bus the
            phase fundamental peaks at Vdc/2 = 200 V, or 245 V RMS line to line. Push m past 1 and the reference outruns
            the carrier, pulses drop out and the output distorts.
          </p>

          <h3>Space-vector PWM</h3>
          <p>
            Space-vector PWM treats the eight switch states as vectors: six active ones 60° apart and two zero vectors. Each
            switching period it dwells on the two active vectors either side of the wanted voltage for the right fractions of
            time and fills the rest with zero vectors. That is equivalent to adding the same common-mode offset to all three
            references, which the motor&apos;s floating neutral never sees, and it stretches the linear range by 15.5%: a
            phase peak of Vdc/√3 = 231 V instead of 200 V from 400 V. Nearly every traction inverter uses it.
          </p>

          <h3>Dead time, DC link and gate drivers</h3>
          <p>
            Real switches need tens to hundreds of nanoseconds to turn off, so the controller inserts a dead time, about
            0.1-0.5 µs for SiC and 1-2 µs for IGBTs, with both switches of a leg off. The motor current keeps flowing
            through a diode during the gap, so the output follows the current direction, not the command. The average error
            is td × fsw × Vdc: 1 µs at 10 kHz is 1% of each period, 4 V on a 400 V bus. That is nothing at speed but large
            next to the few volts needed near standstill, and it distorts every current zero crossing, so controllers
            compensate for it.
          </p>
          <p>
            A film DC-link capacitor of a few hundred µF to about 1 mF supplies the pulsed current the switches draw; its
            ripple-current rating, often 100-200 A RMS, sizes it more than its capacitance does. Laminated busbars keep the
            loop inductance to a few nanohenries so turn-off overshoot stays small. Each switch has an isolated gate driver,
            around +15/−8 V for IGBTs or +18/−3 V for SiC, with desaturation detection and a Miller clamp.
          </p>

          <h3>Field-oriented control</h3>
          <p>
            Torque depends on where the stator current points relative to the rotor flux, and field-oriented control (FOC)
            regulates exactly that:
          </p>
          <ol>
            <li>Sample two or three phase currents in the middle of the PWM period.</li>
            <li>Clarke: project a, b, c onto two stationary axes, α and β.</li>
            <li>
              Park: rotate α-β by the rotor&apos;s electrical angle θ into the d-q frame that spins with the rotor. Steady
              sinusoids become two DC values: Id along the magnet flux and Iq at 90°, which makes torque.
            </li>
            <li>
              Two PI controllers drive Id and Iq to their references. Iq* comes from the torque request (T = Kt·Iq in a
              surface PM motor); Id* is zero, slightly negative for maximum torque per amp in an interior-PM motor, or
              strongly negative for field weakening.
            </li>
            <li>
              Inverse Park turns the controllers&apos; voltage outputs back into α-β, and SVPWM turns that vector into three
              duty cycles, scaled by the measured DC-link voltage.
            </li>
          </ol>
          <p>
            The loop runs once or twice per PWM period with a current bandwidth around 1 kHz. Because the PI controllers
            act on DC quantities, they hold zero steady-state error at any speed, which a controller chasing a 400 Hz sine
            cannot do.
          </p>

          <h3>Knowing the rotor angle</h3>
          <p>
            Park needs θ to within a degree or two electrical. Most traction motors carry a resolver, a brushless rotary
            transformer that outputs sin θ and cos θ and survives heat, oil and vibration. An encoder, optical or
            magnetic, is the alternative: it reports the angle digitally with fine resolution and is the norm in industrial
            servo drives, but optical discs tolerate oil and heat poorly, so traction motors mostly use resolvers or, in some
            newer drive units, inductive position sensors. Sensorless observers estimate θ
            from back-EMF above a few percent of rated speed and use high-frequency injection near standstill, where there
            is no back-EMF to measure.
          </p>

          <h3>Switching frequency and SiC</h3>
          <p>
            Every transition costs switching energy, so switching loss rises in proportion to frequency, while a higher
            frequency means less current ripple and less audible whine. Silicon IGBTs usually stop at 8-10 kHz, inside the
            audible band, because their tail current makes each turn-off expensive. SiC MOSFETs have no tail and almost no
            reverse recovery, so they can run 16-20 kHz or more at lower total loss; Tesla&apos;s Model 3 inverter made them
            mainstream. The catch is edge speed of 20-50 V/ns, which stresses winding insulation, drives bearing currents and
            makes EMI harder.
          </p>

          <h3>Protection</h3>
          <p>
            An inverter must protect itself faster than software can: hardware overcurrent comparators on the phase
            currents, desaturation detection that turns a shorted switch off within about 2 µs (SiC survives a short for
            only 2-3 µs, an IGBT about 10 µs), DC-link overvoltage protection for regen with open contactors, and
            temperature derating from module thermistors and junction-temperature models. For a PM motor the safe state at
            speed is an active short circuit, all three low-side switches on, so back-EMF cannot pump current into the pack.
          </p>
        </Prose>

        <Figure caption="Field-oriented control. Measured currents are transformed into the rotor's d-q frame, regulated as DC values by two PI controllers, and turned back into three PWM duty cycles. The rotor angle θ feeds both Park transforms.">
          <FocBlockDiagram />
        </Figure>

        <Callout kind="tip" title="Why the d-q frame">
          In the d-q frame a 300 A, 400 Hz phase current is just the number 300. PI controllers are excellent at holding
          constants and poor at chasing fast sinusoids.
        </Callout>
        <Callout kind="interview">
          When asked to draw FOC, keep the order: sense, Clarke, Park, PI, inverse Park, SVPWM, gates, with θ from the
          resolver feeding both Park blocks.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: from carrier to current">
        <ThreePhaseInverterPwm />
        <Callout kind="info" title="Try this">
          Set dead time to 0 and note the fundamental at m = 0.8 (160 V), then raise dead time to 4 µs: it drops by almost
          20 V. Push m to 1.15 with Sine PWM and pulses drop out; switch to SVPWM and the output is linear again.
        </Callout>
        <DqFrame />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Why 10 kHz whines, and what 1 µs of dead time costs">
          <p>
            A 400 V IGBT inverter switches at 10 kHz with 1 µs of dead time. Near standstill the motor needs only about 5 V
            per phase (its resistive drop plus a little back-EMF); at 12,000 rpm it needs about 200 V.
          </p>
          <ol>
            <li>Why can passengers hear this inverter, and what changes at 20 kHz?</li>
            <li>What fraction of each switching period does the dead time take, and how large is the average voltage error?</li>
            <li>How big is that error compared with what the motor needs at standstill and at 12,000 rpm?</li>
            <li>What happens to the error at 20 kHz with the same 1 µs, and with a SiC dead time of 0.25 µs?</li>
          </ol>
          <CodeBlock
            lang="text"
            code={[
              "1) Human hearing: about 20 Hz to 20 kHz (many adults stop near 15-17 kHz).",
              "   PWM ripple current at 10 kHz (sidebands at 10 kHz ± 2·f1) shakes the stator",
              "   laminations through magnetostriction and magnetic forces -> an audible whine.",
              "   At 20 kHz the main components move to 20 kHz and above: inaudible for most people.",
              "",
              "2) Ts = 1 / 10 kHz = 100 µs",
              "   td / Ts = 1 µs / 100 µs = 1%",
              "   error = 1% × 400 V = 4 V per leg, sign set by the current direction",
              "",
              "3) standstill:  4 V / 5 V   ≈ 80% of the needed voltage -> distorted current, torque ripple",
              "   12,000 rpm:   4 V / 200 V = 2%                        -> negligible",
              "",
              "4) 20 kHz, 1 µs:     td / Ts = 1 / 50    = 2%   -> 8 V",
              "   20 kHz, 0.25 µs:  td / Ts = 0.25 / 50 = 0.5% -> 2 V",
            ].join("\n")}
          />
          <p>
            <strong>Answer:</strong> 10 kHz sits well inside the audible band, so the switching ripple is heard as a whine;
            moving to about 20 kHz pushes it out of most people&apos;s hearing, which IGBT switching losses make expensive
            and SiC makes affordable. The 1 µs dead time takes 1% of each 100 µs period, a 4 V average error per leg. That
            is 2% of the voltage at 12,000 rpm but about 80% of what the motor needs at standstill, which is why low-speed
            current distortion and dead-time compensation matter. Doubling the frequency doubles the error to 8 V unless the
            dead time shrinks too, which SiC allows: 0.25 µs at 20 kHz costs only 2 V.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
