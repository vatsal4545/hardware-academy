import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Half-bridge (inverter leg)",
      def: "Two switches in series across the DC link with the phase output between them. A three-phase inverter has three legs, six switches, and both switches of a leg must never be on together.",
    },
    {
      term: "Shoot-through",
      def: "Both switches of one leg conducting at once, shorting the DC link through them. It destroys the devices within microseconds unless desaturation protection turns them off.",
    },
    {
      term: "Sine-triangle PWM",
      def: "Compare a sinusoidal reference with a triangular carrier; the leg is high while the reference is above the carrier, so its average over each carrier period follows the sine.",
    },
    {
      term: "Modulation index",
      def: "m = peak phase fundamental / (Vdc/2). Sine-triangle PWM is linear up to m = 1 (200 V peak from 400 V); space-vector PWM extends that to 1.155.",
    },
    {
      term: "Space-vector PWM (SVPWM)",
      def: "Builds each switching period from the two active switch states next to the wanted voltage vector plus the zero states. Equivalent to adding a common-mode offset to the references; 15.5% more voltage than sine PWM.",
    },
    {
      term: "Dead time",
      def: "A gap of about 0.1-2 µs with both switches of a leg off between transitions, to prevent shoot-through. It causes an average voltage error of td × fsw × Vdc whose sign follows the current.",
    },
    {
      term: "Clarke transform",
      def: "Projects the three phase currents a, b, c onto two stationary, orthogonal axes α and β.",
    },
    {
      term: "Park transform",
      def: "Rotates α-β by the rotor's electrical angle into the d-q frame, where steady sinusoidal currents become DC values: Id along the magnet flux and Iq, which makes torque.",
    },
    {
      term: "Desaturation detection",
      def: "Gate-driver protection that watches a switch's on-state voltage. If it climbs far above its normal 1-3 V while the switch is on, the device is in short circuit and the driver turns it off softly within about 2 µs.",
    },
    {
      term: "Resolver",
      def: "A brushless rotary transformer on the motor shaft whose two output windings give sin θ and cos θ of the rotor angle. The standard position sensor in traction motors because it shrugs off heat, oil and vibration.",
    },
  ],
  scenario: {
    title: "Inverter trips on overcurrent, but only at launch",
    context:
      "A prototype rear-drive EV passes its highway testing, but on full-throttle launches from standstill the inverter trips with a phase-overcurrent fault about one launch in three, and the car coasts to a stop. The controller measures phases A and B with open-loop Hall-effect sensors and computes C as −(A + B). A third sensor on phase C feeds only a fast hardware comparator set to 650 A. The inverter's current limit is 620 A peak, and the 400 V pack can deliver at most 150 kW.",
    symptoms: [
      "Trips happen only in the first second of a hard launch, below about 10 km/h, and never at highway speed, even at the full 150 kW.",
      "Logged Id and Iq track their references cleanly right up to the trip.",
      "At crawl speed the car shudders once per electrical revolution.",
      "With the motor at standstill and zero torque commanded, the A and B readings sit at zero while the phase-C sensor reads about 40 A, so the three readings no longer sum to zero.",
    ],
    hints: [
      "The control loop and the hardware comparator use different sensors. Which currents does each one actually see?",
      "A DC offset on one phase current looks like what in the rotating d-q frame, and at what frequency?",
      "At launch, what sets the phase current: the 620 A inverter limit or the 150 kW pack limit? Which one sets it at 120 km/h?",
    ],
    rootCause:
      "Phase A's open-loop Hall sensor had a +40 A zero offset: an overcurrent event in an earlier bench test left remanent magnetism in its ferrite core, and the firmware only calibrated sensor zeros at the end of the production line. In the d-q frame a DC offset on one phase shows up as a ripple at the electrical frequency. At launch that frequency is only a few hertz, far inside the current loop's bandwidth, so the PI controllers 'correct' the apparent ripple by driving a real 40 A DC bias into the motor: phase A runs 40 A low and phase C 40 A high. Near standstill the motor draws little power, so the 620 A inverter limit, not the pack, sets the current: with 620 A commanded, phase C really carried about 660 A, above the 650 A comparator on the third sensor. At 120 km/h the pack's 150 kW limit, not the 620 A inverter limit, sets the current: with the phase voltage near its 230 V peak ceiling on a 400 V bus and a power factor around 0.9, that is about 480 A peak (150 kW / (1.5 × 230 V × 0.9)), so even with the full 40 A bias phase C peaks near 520 A, well under the trip level.",
    fix:
      "Replace the sensor and recalibrate every sensor zero at each wake-up, with PWM off and the motor at standstill, rejecting the result if any offset exceeds a few amps. Use the third sensor for a plausibility check: if iA + iB + iC differs from zero by more than about 10 A, flag a sensor fault and derate. Track offsets online by averaging the currents over whole electrical cycles at low speed, and specify sensors with low magnetic offset after overload, such as closed-loop or coreless types.",
    lesson:
      "Field-oriented control trusts its current sensors completely. A small offset becomes a real DC current in the motor, and wherever the current already sits at its limit, as it does at launch, that is enough to trip the protection, so sensor calibration and plausibility checks are part of the protection design, not an afterthought.",
  },
  interview: [
    {
      q: "How does a three-phase inverter make a sine wave from a DC bus?",
      a: "Each phase has a half-bridge, two switches in series across the DC link, so the phase output can only be tied to the positive or the negative rail. PWM switches it between them thousands of times a second, typically 8-20 kHz, and varies the fraction of time spent high so the average over each switching period follows a sine. In sine-triangle PWM the controller compares a sinusoidal reference with a triangular carrier, and the leg is high whenever the reference is above the carrier. The motor's inductance filters the pulses, so the current is a smooth sine with a small ripple at the switching frequency.",
      level: "screen",
    },
    {
      q: "What is dead time, and what does it cost?",
      a: "Dead time is a short gap, about 0.1-0.5 µs for SiC and 1-2 µs for IGBTs, when both switches of a leg are off, so one switch is fully off before the other turns on and the DC link is never shorted. During the gap the load current keeps flowing through a diode, so the output voltage is set by the current direction instead of the command. The average error is td × fsw × Vdc: 1 µs at 10 kHz on a 400 V bus is 1%, or 4 V. Because the error flips sign with the current, it distorts the current near every zero crossing and matters most at low speed, where the commanded voltage is small, so controllers compensate for it.",
      level: "screen",
    },
    {
      q: "Walk me through field-oriented control from the current sensors to the gate signals.",
      a: "Two or three phase currents are sampled in the middle of the PWM period, and the Clarke transform turns them into two stationary components, α and β. The Park transform rotates those by the rotor's electrical angle, from a resolver or an observer, into the d-q frame, where steady sinusoids become DC values: Id along the magnet flux and Iq at 90° to it, which makes torque. Two PI controllers drive Id and Iq to their references, with Iq from the torque request and Id from zero, an MTPA table or field weakening, and their outputs are d-q voltage commands. The inverse Park transform rotates those voltages back to α-β, space-vector PWM turns the vector into three duty cycles using the measured DC-link voltage, and the gate drivers switch the six devices. The loop runs at the PWM rate, 10-20 kHz, with a current bandwidth around 1 kHz.",
      level: "deep",
    },
    {
      q: "Why does SiC allow a higher switching frequency, and what new problems does it create?",
      a: "SiC MOSFETs are majority-carrier devices with no IGBT tail current and very little reverse-recovery charge, so their energy per switching event is several times lower. That lets them run at 20 kHz or more with less loss than a silicon IGBT at 10 kHz, giving a quieter, smoother current or simply higher efficiency at the same frequency. The cost is edge speed: 20-50 V/ns stresses the motor's winding insulation, drives common-mode current through the bearings and makes EMI harder to contain. Gate drivers need common-mode transient immunity above 100 kV/µs, a tight low-inductance layout and fast short-circuit protection, because a SiC die survives a short for only about 2-3 µs against roughly 10 µs for an IGBT.",
      level: "deep",
    },
    {
      q: "What protections does a traction inverter need?",
      a: "Hardware overcurrent comparators on the phase currents shut the gates within microseconds, without waiting for software. Desaturation detection in each gate driver catches shoot-through and short circuits by watching the switch's on-state voltage, then turns it off softly to limit overshoot. DC-link overvoltage protection covers regen when the contactors open, and module thermistors plus a junction-temperature model derate current before the devices overheat. For PM motors the drive also needs a safe state at high speed, usually an active short circuit with all three low-side switches on, so back-EMF cannot pump uncontrolled current into the bus.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "With sine-triangle PWM at m = 1 on a 400 V bus, the peak of the phase-to-neutral fundamental is",
      choices: ["100 V", "231 V", "200 V", "400 V"],
      answer: 2,
      explain: "Each leg swings between the rails, so a phase can swing ±Vdc/2 = ±200 V around the motor's neutral. At m = 1 the sine reference just touches the carrier peaks, giving a 200 V peak fundamental, or 245 V RMS line to line.",
    },
    {
      q: "In its linear range, how much more fundamental voltage does space-vector PWM get from the same bus than sine-triangle PWM?",
      choices: ["About 5%", "About 15.5%", "About 41%", "Twice as much"],
      answer: 1,
      explain: "SVPWM, or sine PWM with a common-mode offset added to all three references, reaches a phase peak of Vdc/√3 instead of Vdc/2: 231 V instead of 200 V on a 400 V bus, a ratio of 1.155. The motor's floating neutral never sees the offset.",
    },
    {
      q: "What is dead time for?",
      choices: [
        "To make sure one switch of a leg is fully off before the other turns on",
        "To let the motor windings cool between pulses, so the copper stays within its rating",
        "To synchronize the PWM carrier with the resolver's excitation signal",
        "To lower the effective switching frequency so the inverter runs cooler",
      ],
      answer: 0,
      explain: "If both switches of a leg conduct at once, the DC link is shorted through them (shoot-through). A gap of 0.1-2 µs with both off prevents it; the price is a small voltage error whose sign follows the current.",
    },
    {
      q: "At 10 kHz switching, 1 µs of dead time takes about what fraction of each switching period?",
      choices: ["0.1%", "10%", "20%", "1%"],
      answer: 3,
      explain: "The period is 1 / 10 kHz = 100 µs, and 1 µs of it is 1%. On a 400 V bus that is a 4 V average error per leg: small at high speed, but large next to the few volts a motor needs near standstill.",
    },
    {
      q: "Which signal does the Park transform need that the Clarke transform does not?",
      choices: [
        "The measured DC-link voltage",
        "The rotor's electrical angle",
        "The stator winding temperature",
        "The PWM carrier frequency",
      ],
      answer: 1,
      explain: "Clarke is a fixed projection of a, b, c onto α and β. Park rotates α-β by the rotor electrical angle θ so the currents appear as DC values Id and Iq, which is why FOC needs a resolver, an encoder or an angle observer.",
    },
    {
      q: "In FOC of a surface PM motor below base speed, the usual d-axis current reference is",
      choices: ["Equal to Iq", "The maximum phase current", "Zero", "Equal to the phase current amplitude"],
      answer: 2,
      explain: "In a surface PM motor only Iq makes torque, so Id = 0 gives the most torque per amp. Negative Id is used above base speed for field weakening, and interior-PM motors run some negative Id even at low speed to add reluctance torque (MTPA).",
    },
    {
      q: "What does desaturation detection in a gate driver catch?",
      choices: [
        "A resolver that has lost its signal, so the rotor angle used by FOC is no longer valid",
        "A DC-link capacitor that has lost capacitance, so the bus voltage ripple rises above its design limit",
        "An open motor phase, detected because the phase current never reaches its command",
        "A switch whose on-state voltage rises far above normal, meaning a short circuit or shoot-through",
      ],
      answer: 3,
      explain: "A conducting switch normally drops 1-3 V. In a short circuit the current rises until the device leaves saturation and its voltage climbs; the driver sees that within a microsecond or two and turns the switch off softly before the die is destroyed.",
    },
  ],
};

export default data;
