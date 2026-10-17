import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Return path",
      def: "The route current takes back to its source to complete the loop. Above about 100 kHz, on a board with an adjacent plane, it flows directly beneath the signal trace because that path has the least inductance.",
    },
    {
      term: "Loop area",
      def: "The area enclosed by a signal path and its return path. Radiated emission and magnetic pickup both scale with it, so good layout shrinks loops instead of adding filters.",
    },
    {
      term: "Decoupling capacitor",
      def: "A capacitor at a power pin that supplies fast current locally. Its real job is to shrink the high-frequency current loop from tens of centimetres to a few millimetres.",
    },
    {
      term: "Self-resonant frequency",
      def: "The frequency 1/(2π√(LC)) above which a capacitor behaves as an inductor. A 100 nF capacitor with 1 nH of loop inductance resonates near 16 MHz; with 10 nH, near 5 MHz.",
    },
    {
      term: "Power distribution network (PDN)",
      def: "Everything between the regulator and the die: regulator, bulk capacitors, ceramics, planes and vias. Its impedance must stay below Z_target = allowed ripple ÷ transient current at every frequency.",
    },
    {
      term: "Characteristic impedance (Z0)",
      def: "The ratio of voltage to current of a wave travelling down a transmission line, set by trace width, dielectric height and permittivity. Common targets are 50 Ω single-ended, 90 Ω differential for USB and 100 Ω for Ethernet and LVDS.",
    },
    {
      term: "Critical length",
      def: "The trace length beyond which a line must be treated as a transmission line, about one-sixth of the rise-time distance: roughly 28 mm per nanosecond of rise time on FR-4 outer layers.",
    },
    {
      term: "Crosstalk and the 3W rule",
      def: "Unwanted coupling between neighbouring traces through mutual capacitance and inductance. Keeping centre-to-centre spacing at three trace widths or more contains about 70 % of the field.",
    },
    {
      term: "Common-mode current",
      def: "Current that flows the same way on every conductor of a cable and returns through the surroundings. A few microamps on a half-metre cable can fail a radiated-emissions test.",
    },
    {
      term: "Stitching via",
      def: "A via placed beside a signal via that ties the two reference planes together, so the return current can change layers along a short path instead of a long detour.",
    },
    {
      term: "Ground bounce",
      def: "The voltage developed across the inductance and resistance of a shared ground path when large, fast currents flow through it. It shifts one part's local ground relative to another's.",
    },
  ],
  scenario: {
    title: "Robot resets whenever the motors start",
    context:
      "The first spin of the motor-driver board runs the ESP32 happily on the bench with the wheels off the ground. Put the robot on the floor and command both motors from standstill, and the ESP32 reboots about one start in three; the serial console prints Brownout detector was triggered. The pack is a partly discharged 2S Li-ion (7.0 V), connected through 20 cm of lead wire. Rev A of the board has only a 100 nF capacitor at the TB6612FNG VM pins and one thin ground trace shared by the driver, the regulator and the module.",
    symptoms: [
      "Resets only when both motors start from standstill under load; spinning freely never resets",
      "Serial log shows Brownout detector was triggered, followed by a normal boot",
      "A scope on 3V3 at the module shows a dip of about 700 mV lasting 40 µs, starting exactly when the motor PWM turns on",
      "Between the battery negative terminal and the module GND pin, a second probe shows spikes of about 0.9 V on the PWM edges",
    ],
    hints: [
      "Probe 3V3 at the module with the ground spring on the module's own GND pin and trigger on a falling edge at 3.0 V. When does it dip, and for how long?",
      "Draw the loop the motor current takes: battery, connector, VM pin, motor, PGND and back. Which pieces of copper does it share with the regulator and the ESP32?",
      "How much capacitance sits within 5 mm of the TB6612FNG VM pins, and how much inductance (about 1 nH per mm of lead) is between the battery and those pins?",
      "What input voltage does the AMS1117-3.3 need to stay in regulation, and what is VM doing during the dip?",
    ],
    rootCause:
      "Three faults stack up. First, there is no bulk capacitor at VM, so the 3 to 4 A inrush of two motors is pulled through 20 cm of lead (roughly 150 to 200 nH) and the pack's 0.5 Ω internal resistance, and VM collapses to about 4.4 V. Second, the motor return current shares a 0.4 mm ground trace with the regulator and the ESP32 module, so every PWM edge moves the module's ground by about 0.9 V relative to the regulator. Third, with VM at 4.4 V the AMS1117-3.3 is below the roughly 4.6 V it needs and drops out, so 3V3 follows VM down just as a Wi-Fi transmit burst of about 350 mA arrives, and the brown-out detector trips.",
    fix:
      "Place 100 µF low-ESR bulk plus 10 µF and 100 nF ceramics within 5 mm of the VM pins, and give the motor current its own return straight back to the battery connector on a solid ground plane, away from the logic area. Ramp the PWM duty over about 100 ms so the inrush is smaller, add 100 nF across each motor's terminals, and fit the 22 µF tantalum and 10 µF input capacitor the AMS1117 datasheet asks for. Re-measure 3V3 under the same start-up; it should stay within 3.2 to 3.4 V.",
    lesson:
      "Every current has a return path. Large, fast currents need their own local reservoir and their own way home, or they will borrow the logic's.",
  },
  interview: [
    {
      q: "What is a return path, and why does it matter on a PCB?",
      a: "Every signal is a loop: current goes out along the trace and has to come back to its source. At low frequency it takes the least-resistance path and spreads through the copper, but above roughly 100 kHz it takes the least-inductance path, which is directly under the trace on the adjacent plane. The area between the signal and its return is the loop area, and both radiated emissions and noise pickup scale with it. So good layout is mostly about keeping a continuous reference plane under every fast trace.",
      level: "screen",
    },
    {
      q: "Where do you place a decoupling capacitor, and why does the distance matter?",
      a: "As close to the power pin as the footprints allow, with the ground via right at the capacitor pad and the power trace passing the capacitor before it reaches the pin. The capacitor only works while it looks like a capacitor, and the loop inductance sets its self-resonance: 100 nF with 1 nH resonates near 16 MHz, but with 10 nH only near 5 MHz. Above that it is an inductor and the voltage spike is simply L times di/dt. I use a 0402 or 0603 part, one per power pin, and put the smallest value nearest the pin.",
      level: "screen",
    },
    {
      q: "A high-speed signal has to cross a split in the ground plane. What happens, and what do you do?",
      a: "The return current cannot cross the gap, so it detours around the end of the slot. That enlarges the loop, adds inductance, couples noise into everything near the detour and raises radiated emissions. The first fix is to avoid the split, by rerouting the signal or removing the cut. If it must cross, I put a stitching capacitor, typically 100 nF, within a few millimetres of the crossing so the fast return current can hop the gap, and I keep the trace on a layer whose reference is continuous.",
      level: "deep",
    },
    {
      q: "When does a trace have to be treated as a transmission line?",
      a: "When its one-way delay is more than roughly one-sixth of the signal's rise time. FR-4 outer layers delay a signal by about 6 ps per millimetre, so the critical length is about 28 mm per nanosecond of rise time. A 1 ns edge makes a trace over 28 mm a transmission line even if the clock is only 1 MHz, because the edge rate sets the bandwidth, not the clock. Past that length I control the impedance, usually 50 Ω, and terminate the line to stop reflections.",
      level: "screen",
    },
    {
      q: "A robot resets whenever its motors start. How do you debug it?",
      a: "I look at the rails first, with a scope triggered on a dip of the 3V3 rail and the probe ground spring on the module's own ground pin, then compare it with VM at the motor driver. If VM sags, the motor inrush is being pulled through the battery lead without local bulk capacitance, and I add 100 µF plus ceramics at the driver. I also check where the motor return current flows; if it shares a trace with the logic ground, I give it its own path back to the battery. Finally I check the regulator's dropout, soft-start the PWM and re-measure under the same start-up.",
      level: "deep",
    },
    {
      q: "How do you keep motor noise out of an ADC?",
      a: "Partition by placement: motor driver, bulk capacitor and battery connector in one corner so the motor current returns straight to the battery, and the ADC inputs far from that loop. I keep one solid ground plane rather than splitting it, so the return current under every analog trace stays continuous. Each analog input gets an RC filter, for example 1 kΩ and 100 nF, the traces stay away from switching edges, and I filter motors at the source with 100 nF across the terminals. In firmware I sample between PWM edges and average several readings.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Above roughly 100 kHz, where does the return current of a trace over a solid plane flow?",
      choices: [
        "Spread evenly across the whole plane, as it does at DC",
        "Directly beneath the trace, along the path of least inductance",
        "Along the shortest straight line to the power connector",
        "Through the dielectric only, with no current in the copper",
      ],
      answer: 1,
      explain:
        "At low frequency the current takes the path of least resistance and spreads out. At high frequency the loop inductance dominates, and the lowest-inductance path is the one that minimises loop area, which is directly under the trace. About 80 % of it flows within three dielectric heights either side.",
    },
    {
      q: "An MCU pulls 50 mA in 2 ns through 10 nH of loop inductance. The voltage spike is closest to",
      choices: ["0.025 V", "0.25 V", "2.5 V", "25 V"],
      answer: 1,
      explain:
        "V = L·di/dt = 10 nH × (50 mA / 2 ns) = 10 nH × 25 MA/s = 0.25 V. With 1 nH the same burst gives only 25 mV, which is why a capacitor with a short, low-inductance loop works and a distant one barely helps.",
    },
    {
      q: "A 100 nF ceramic capacitor with 10 nH of total loop inductance is self-resonant at about",
      choices: ["0.5 MHz", "5.0 MHz", "50 MHz", "500 MHz"],
      answer: 1,
      explain:
        "f = 1 / (2π√(LC)) = 1 / (2π√(10 nH × 100 nF)) ≈ 5 MHz. Above that frequency the part is an inductor, so a capacitor placed far from the pin does nothing for the fast edges. Cutting the loop to 1 nH moves the resonance to about 16 MHz.",
    },
    {
      q: "Using the one-sixth rule with about 6 ps/mm on an FR-4 outer layer, the critical length for a 1 ns edge is closest to",
      choices: ["2.8 mm", "28 mm", "280 mm", "2.8 m"],
      answer: 1,
      explain:
        "Critical length = rise time / (6 × 6 ps/mm) = 1000 ps / 36 ps/mm ≈ 28 mm. A 0.3 ns edge cuts that to about 8 mm and a slow 5 ns GPIO edge allows about 140 mm. The edge rate, not the clock frequency, is what matters.",
    },
    {
      q: "Which differential impedance does a USB 2.0 data pair target?",
      choices: ["50 Ω", "75 Ω", "90 Ω", "120 Ω"],
      answer: 2,
      explain:
        "USB 2.0 specifies 90 Ω differential, while Ethernet and LVDS use 100 Ω. A single-ended 50 Ω line is the common target for RF and fast clock traces. On a 4-layer board with 0.21 mm of prepreg, the pair's width and spacing are chosen to hit 90 Ω.",
    },
    {
      q: "The far-field radiation of a small loop scales with",
      choices: ["A · I · f", "A · I · f²", "√A · I · f", "A² · I · f"],
      answer: 1,
      explain:
        "E ≈ 2.6×10⁻¹⁴ · f² · A · I / r for a small loop. Halving the area halves the field, and doubling the frequency quadruples it. This is why layout (shrinking A) and slowing edges (lowering the effective f) are the two biggest EMI levers.",
    },
    {
      q: "Why is a slit in the ground plane under a fast trace harmful?",
      choices: [
        "It multiplies the plane's DC resistance and starves the load",
        "It forces the return current to detour, enlarging the loop area",
        "It lowers the prepreg's dielectric constant and speeds up the edge",
        "It makes the trace's characteristic impedance exactly zero",
      ],
      answer: 1,
      explain:
        "The fast return current wants to sit under the trace. A slit blocks that path, so the current detours around the end, which enlarges the loop, raises inductance and radiates. A stitching capacitor or stitching via near the crossing gives the current a short way across.",
    },
  ],
};
export default data;
