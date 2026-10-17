"use client";

import { Section, Prose, Callout, Figure, Exercise } from "@/components/lesson";
import { Label, SvgCanvas, polyline, vizColors } from "@/components/viz/shared";
import { DebugFlowchart } from "@/components/viz/pcb/DebugFlowchart";

/** Points along the ground lead's cubic curve, used to shade the loop it encloses. */
function leadLoop(): string {
  const p0 = [195, 116];
  const p1 = [160, 54];
  const p2 = [70, 52];
  const p3 = [43, 148];
  const pts: string[] = ["43,150", "183,150", "195,116"];
  for (let k = 1; k <= 12; k++) {
    const t = k / 12;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Step edge as a scope would draw it: a clean RC rise, or the same rise with ringing from a long ground lead. */
function edge(ringing: boolean): string {
  const pts: Array<[number, number]> = [];
  for (let t = -60; t <= 230; t += 2) {
    let v = 0;
    if (t >= 0) {
      v = 1 - Math.exp(-t / 6);
      if (ringing) v += 0.42 * Math.exp(-t / 55) * Math.sin((2 * Math.PI * t) / 21) * (1 - Math.exp(-t / 5));
    }
    pts.push([80 + t, 272 - 44 * (Math.round(v * 1000) / 1000)]);
  }
  return polyline(pts);
}

function Panel({ bad }: { bad: boolean }) {
  return (
    <g transform={`translate(${bad ? 0 : 360} 0)`}>
      <Label x={170} y={20} size={14} bold color={bad ? vizColors.red : vizColors.green}>
        {bad ? "Bad: 15 cm clip lead" : "Good: spring ground tip"}
      </Label>

      {/* board with pads */}
      <rect x={20} y={150} width={300} height={36} rx={3} fill={vizColors.mask} opacity={0.65} stroke={vizColors.grid} />
      <rect x={170} y={150} width={26} height={12} fill={vizColors.copper} />
      <Label x={183} y={176} size={10} color={vizColors.text}>
        signal
      </Label>
      <rect x={bad ? 30 : 204} y={150} width={26} height={12} fill={vizColors.copper} />
      <Label x={bad ? 43 : 217} y={176} size={10} color={vizColors.text}>
        GND
      </Label>

      {bad && (
        <>
          <polygon points={leadLoop()} fill={vizColors.amber} opacity={0.2} />
          <path d="M195 116 C 160 54, 70 52, 43 148" fill="none" stroke={vizColors.orange} strokeWidth={2.5} />
          <rect x={36} y={140} width={14} height={12} rx={2} fill={vizColors.orange} />
          <Label x={118} y={104} size={12} bold color={vizColors.amber}>
            loop about 30 cm²
          </Label>
          <Label x={118} y={120} size={11} color={vizColors.muted}>
            picks up motor noise
          </Label>
        </>
      )}
      {!bad && (
        <>
          <polygon points="183,150 190,134 217,150" fill={vizColors.amber} opacity={0.35} />
          <polyline points="190,134 196,140 200,132 206,142 210,136 217,150" fill="none" stroke={vizColors.orange} strokeWidth={2} strokeLinejoin="round" />
          <Label x={262} y={118} size={12} bold color={vizColors.green}>
            loop under 1 cm²
          </Label>
        </>
      )}

      {/* probe */}
      <g transform="translate(183 150) rotate(20)">
        <polygon points="-1.5,0 1.5,0 5,-26 -5,-26" fill="#9ca3af" />
        <rect x={-7} y={-110} width={14} height={84} rx={3} fill="#4b5563" />
        <rect x={-9} y={-42} width={18} height={9} fill="#9ca3af" />
      </g>

      {/* scope trace */}
      <rect x={20} y={198} width={300} height={90} rx={4} fill={vizColors.bg} stroke={vizColors.grid} />
      <Label x={312} y={210} anchor="end" size={10} color={vizColors.muted}>
        scope view of the same pad
      </Label>
      <line x1={20} x2={320} y1={228} y2={228} stroke={vizColors.grid} strokeDasharray="3 4" />
      <path d={edge(bad)} fill="none" stroke={bad ? vizColors.red : vizColors.green} strokeWidth={2} clipPath="inset(0)" />
      <Label x={170} y={300} size={11} color={vizColors.muted}>
        {bad ? "150 nH with 10 pF rings near 130 MHz" : "about 10 nH with 10 pF resonates above 500 MHz"}
      </Label>
    </g>
  );
}

function ProbeGroundFigure() {
  return (
    <SvgCanvas viewBox="0 0 720 316" title="A scope probe with a long ground clip lead compared with a short spring ground tip, and the ringing each produces">
      <rect x="0" y="0" width="720" height="316" rx="8" fill={vizColors.bg} />
      <Panel bad />
      <Panel bad={false} />
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Bring the board up in the order that protects it">
        <Prose>
          <p>
            A board that powers on has not passed anything. Bring-up is a staged plan in which each stage gives you evidence before the next one risks
            the hardware, and in which every surprise gets written down. The goal is to find faults while each is still a single fault.
          </p>

          <h3>The bring-up order</h3>
          <ol>
            <li>
              <strong>Inspect.</strong> Under a loupe or microscope check polarity, pin 1, bridges and missing parts. The stripe on a moulded tantalum
              marks the positive end, the opposite of an aluminium electrolytic, and on a diode it marks the cathode.
            </li>
            <li>
              <strong>Power off, measure.</strong> Resistance from every rail to ground (hundreds of ohms to kilohms is normal, near zero is a short),
              rail to rail, and continuity of ground.
            </li>
            <li>
              <strong>Current-limited power-up.</strong> Set the bench supply to the battery voltage with the limit just above the expected idle: 100
              to 150 mA for the motor board, motors unplugged. Raise the voltage from zero and watch the current.
            </li>
            <li>
              <strong>Rails.</strong> Check each rail against its tolerance (3.3 V within 3 % is 3.20 to 3.40 V), then look at ripple on a scope.
            </li>
            <li>
              <strong>Clocks and reset.</strong> Crystal running, reset line high.
            </li>
            <li>
              <strong>Programming.</strong> Read the chip ID with esptool before writing anything.
            </li>
            <li>
              <strong>Peripheral by peripheral.</strong> LED, buttons, UART, then the motor driver with a motor off the ground at 20 % PWM, then
              encoders and sensors. Add one thing at a time.
            </li>
          </ol>

          <h3>What the supply tells you</h3>
          <p>
            A bench supply is the cheapest diagnostic you own. In constant-current mode with the voltage collapsed, the ratio of the two is the apparent
            load resistance: 1.9 V at 0.8 A is 2.4 Ω, which is no working board. A healthy idle shows the full voltage and a small, steady current that
            matches your estimate. If the current creeps up over several seconds, something is heating and its resistance is falling. Remember the
            power, too: 1 V at 0.5 A injected into a shorted rail is only 0.5 W, enough to warm a part for a thermal camera but far too little to
            damage the board.
          </p>

          <h3>Instruments and what each is for</h3>
          <p>
            A multimeter (10 MΩ input) is for DC voltage, resistance with the power off, continuity and the diode test, where a good silicon junction
            reads 0.5 to 0.7 V forward and open in reverse. Its current ranges add burden voltage in series, so fuse them and use them sparingly.
          </p>
          <p>
            An oscilloscope shows shape. Pick a bandwidth of at least five times the highest clock; its rise time is 0.35 divided by its bandwidth, so
            a 100 MHz scope cannot show an edge faster than 3.5 ns. A 10× passive probe is 10 MΩ with about 10 pF, and its ground lead is the part
            most people get wrong. Set the 20 MHz bandwidth limit when you want ripple rather than noise, AC-couple a 3.3 V rail to read millivolts,
            and trigger single-shot on a falling edge just below the rail to catch a dip.
          </p>
        </Prose>

        <Figure caption="The same step edge seen through a 15 cm clip lead (about 150 nH, ringing near 130 MHz) and through a 1.5 cm spring tip (about 10 nH). The long lead also encloses a large loop that picks up magnetic noise.">
          <ProbeGroundFigure />
        </Figure>

        <Prose>
          <p>
            A logic analyzer records many digital channels at 24 to 500 MS/s and decodes I2C, SPI and UART. It tells you what bits were sent, not whether
            the edges were clean, so sample at least four times the bus clock and set the threshold for your logic level. A thermal camera turns a
            short into a picture: power the board from a current-limited supply and look for the hot part, remembering that bare copper and shiny
            solder have low emissivity (about 0.1) and read cold, while mould compound and solder mask (about 0.9) read true. Without a camera, a drop
            of isopropyl alcohol evaporates first on the hottest part, and freeze spray on the culprit makes the supply current change. A current
            probe or a shunt shows pulsed currents without breaking the circuit.
          </p>

          <h3>The usual suspects</h3>
          <p>
            Most first-article faults are boring: solder bridges on fine-pitch pins, opens from cold joints or tombstoned parts, rotated or flipped
            parts (diodes, tantalums and ICs), wrong values or footprints, brown-outs when a motor or the radio starts, and ESD damage that shows up as
            a leaky pin days later. A brown-out is a rail that dips below the MCU&apos;s threshold for a few microseconds, and only a single-shot
            trigger will catch it. Handle boards on a grounded mat, because ESD damage often appears days later as a leaky pin or an input that sticks.
            Probing artefacts account for the rest, which is why the ground lead matters.
          </p>

          <h3>A systematic method</h3>
          <p>
            Observe, hypothesise, change one thing, record. Split the system in half and ask which half the fault lives in. Compare a bad board with a
            known-good one at the same node. Never change two variables at once. Keep a bring-up log with the board serial and revision, firmware
            hash, supply settings, every reading with its units, scope screenshots with the probe point marked, and what you changed. Next week&apos;s
            you will need it.
          </p>

          <h3>Rework basics</h3>
          <p>
            Use a temperature-controlled iron (about 350 °C for lead-free) with fresh flux, spend no more than three to four seconds on a pad so it
            does not lift, and let it cool. Bridges come off by drag soldering with flux or wick. Small SMD parts lift by heating both ends. QFNs and
            SOICs need hot air at 350 to 380 °C with the board preheated. Clean flux residue with isopropyl alcohol and inspect again.
          </p>
        </Prose>

        <Callout kind="warning" title="Never clip the scope ground to a node that is not ground">
          The ground clip is tied to mains earth through the scope. Clipped to a switching node, a motor output or an isolated supply, it shorts that
          node to earth. Probe those with the ground spring on a true ground pad, or use a differential probe.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: debug the board, then hunt a short">
        <Prose>
          <p>
            First walk the decision tree for a symptom and see which instrument each step uses. Then take the find-the-short bench: power the board from the
            battery input and from the 3V3 rail, and notice which method gives the culprit away.
          </p>
        </Prose>
        <DebugFlowchart />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Write the bring-up checklist for the motor-driver board">
          <p>
            The board has a P-FET reverse-polarity input from a 7.4 V pack, an AMS1117-3.3, an ESP32-WROOM-32 and a TB6612FNG. Write a numbered checklist
            with, for every step, the instrument and its setting, the reading you expect and what you do if it is wrong. Expected idle current with
            Wi-Fi off is the AMS1117&apos;s 5 mA plus the module&apos;s 40 to 60 mA plus the LED: call it 60 to 80 mA.
          </p>
          <details className="mt-3 rounded-md border border-border bg-bg/40 p-3">
            <summary className="cursor-pointer font-semibold text-green-300">Worked answer</summary>
            <ol className="mt-2">
              <li>
                <strong>Inspect</strong> with a loupe: pin 1 of U1, U2 and U3, the stripe of C5 (the 22 µF tantalum) on the 3V3 side, Q1 oriented as
                drawn, no bridges on the TB6612FNG&apos;s 0.65 mm pins. Compare with the assembler&apos;s placement preview. Fix before any power.
              </li>
              <li>
                <strong>Resistance, power off.</strong> 3V3 to GND should read hundreds of ohms and rise as the capacitors charge; VM to GND should
                read kilohms. Under 5 Ω is a short: stop and use the thermal and millivolt methods.
              </li>
              <li>
                <strong>Power up</strong> from the bench supply: 7.4 V, limit 150 mA, motors unplugged, raising from 0 V. Expect 60 to 80 mA. If the
                current pins at the limit, power off.
              </li>
              <li>
                <strong>Q1 drop.</strong> Measure across Q1 with the board running: a few millivolts (50 mΩ at 70 mA is 3.5 mV). Near 0.6 V means the FET
                is not turning on.
              </li>
              <li>
                <strong>3V3.</strong> Meter: 3.20 to 3.40 V. Scope with 20 MHz bandwidth limit and spring ground: under 50 mV peak to peak.
              </li>
              <li>
                <strong>EN and IO0.</strong> Both near 3.3 V; pressing BOOT takes IO0 to 0 V and pressing EN pulses EN low for about 10 ms.
              </li>
              <li>
                <strong>Programming.</strong> Adapter TX to RXD0, RX to TXD0, common ground, hold BOOT, tap EN and read the chip ID with esptool. If it
                fails, check the strapping pins and the wiring.
              </li>
              <li>
                <strong>LED and buttons</strong> from a blink sketch, then <strong>motor driver logic:</strong> STBY high, 20 % PWM, motor lifted off the
                ground. Free-running current of a small gearmotor is 100 to 300 mA; VM should dip under 0.3 V at start and 3V3 should not move.
              </li>
              <li>
                <strong>Encoders and sensors.</strong> Turn each wheel by hand and watch ENC A and B with a logic analyzer; scan I2C; ping the HC-SR04
                with ECHO checked at 3.3 V; read the line sensors on the ADC.
              </li>
              <li>
                <strong>Log</strong> every reading with the board serial and photographs, and raise the supply limit step by step only after each stage
                passes.
              </li>
            </ol>
          </details>
        </Exercise>
      </Section>
    </>
  );
}
