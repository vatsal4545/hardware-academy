import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "LDO (low-dropout regulator)",
      def: "A linear regulator whose pass transistor can run with only a small voltage across it. It burns the difference as heat, P = (Vin − Vout) · I, so 12 V to 3.3 V at 0.5 A dissipates 4.35 W at 27.5% efficiency.",
    },
    {
      term: "Dropout voltage",
      def: "The minimum Vin − Vout at which an LDO still regulates: about 1.1 to 1.3 V for an AMS1117 at 800 mA, 100 to 300 mV for modern PMOS LDOs. Below it, the output simply follows the input down.",
    },
    {
      term: "Buck converter",
      def: "A switching step-down regulator. A switch chops Vin, and an inductor and capacitor average it to Vout = D · Vin. Efficiency is typically 85 to 95%, paid for with ripple, EMI and a layout that needs care.",
    },
    {
      term: "Duty cycle (D)",
      def: "The fraction of each switching period that the high-side switch is on. In an ideal buck in continuous conduction, Vout = D · Vin, so 12 V to 3.3 V needs D = 27.5%.",
    },
    {
      term: "Boost and buck-boost",
      def: "A boost converter raises the voltage, Vout = Vin / (1 − D), and draws more input current than it delivers: 1.5 A from a 3.7 V cell for 5 V at 1 A. Buck-boost handles inputs that cross the output, as a Li-ion cell does around 3.3 V.",
    },
    {
      term: "Op-amp golden rules",
      def: "With negative feedback the output does whatever it takes to make the two inputs equal, and the inputs draw no current. Non-inverting gain is 1 + Rf / Rg and inverting gain is −Rf / Rin.",
    },
    {
      term: "Comparator",
      def: "An op-amp-like part used without feedback, so the output swings to a rail depending on which input is higher. Positive feedback adds hysteresis. Open-collector types such as the LM393 need a pull-up resistor.",
    },
    {
      term: "Crystal versus oscillator",
      def: "A crystal needs the MCU's inverting amplifier and two load capacitors, C = 2 · (CL − Cstray). An oscillator is a powered, self-contained module with a buffered output: more expensive and larger, but nothing to tune.",
    },
    {
      term: "TVS diode",
      def: "A transient-voltage-suppression diode that clamps surges and ESD. Choose a standoff voltage above the working voltage (an SMBJ12A stands off 12 V and clamps near 20 V) and place it at the connector with a short return path.",
    },
    {
      term: "Level shifting",
      def: "Translating logic levels between supply domains: a resistor divider for slow one-way signals, a BSS138 MOSFET stage for I²C, or a translator IC such as the 74LVC245 or TXB0108. A 5 V HC-SR04 echo line must be divided down for a 3.3 V ESP32.",
    },
  ],
  scenario: {
    title: "The robot reboots every two minutes and the regulator is too hot to touch",
    context:
      "A robot controller runs from a 3S Li-ion pack that sits near 12 V. An AMS1117-3.3 in a SOT-223 turns that into 3.3 V for an ESP32 with Wi-Fi, a few sensors and status LEDs, which together average about 200 mA. The board boots and drives normally for roughly two minutes, then resets; half a minute later it boots again and the cycle repeats. The regulator burns a finger, yet the pack voltage looks perfectly healthy on the meter.",
    symptoms: [
      "The board resets about two minutes after power-up, restarts roughly 30 seconds later, and repeats.",
      "The 3V3 rail collapses to 0 V at the moment of failure while the 12 V input stays steady.",
      "The SOT-223 is too hot to touch, and a thermal camera reads about 140 °C on its tab.",
      "The failure arrives later in a cold room and sooner inside the closed enclosure.",
    ],
    hints: [
      "How much power does the regulator turn into heat? Multiply the voltage it drops by the current it passes.",
      "A SOT-223 on a small copper pad has a thermal resistance of roughly 60 to 90 °C/W. What junction temperature does that power imply?",
      "LDOs stop when the junction reaches thermal shutdown, around 150 °C, then restart as they cool. What sets the two-minute delay?",
    ],
    rootCause:
      "The LDO drops 12 V − 3.3 V = 8.7 V at 200 mA, which is 1.74 W of heat. With about 60 °C/W of thermal resistance that is a 104 °C rise, so in a 40 °C enclosure the junction approaches 145 to 150 °C. The board and its copper take about two minutes to heat soak, then the regulator reaches thermal shutdown, the ESP32 browns out and resets, the part cools, and the cycle repeats.",
    fix: "Drop the voltage with a switcher instead of burning it. Add a buck pre-regulator from 12 V to 5 V at about 90% efficiency and let the LDO do only the last step from 5 V to 3.3 V, which dissipates 1.7 V × 0.2 A = 0.34 W. Or replace both with a single 12 V to 3.3 V buck and keep a small LDO just for a noise-sensitive analog rail. Total loss falls from 1.74 W to about 0.45 W.",
    lesson:
      "A linear regulator turns voltage difference into heat. Compute (Vin − Vout) × I at the worst-case input and load before you choose one.",
  },
  interview: [
    {
      q: "When would you choose an LDO over a buck converter, and when the reverse?",
      a: "I decide with numbers. An LDO loses (Vin − Vout) × I as heat and has an efficiency of Vout / Vin, so 12 V to 3.3 V at 500 mA wastes 4.35 W, while a buck at about 90% wastes under 0.2 W. An LDO wins when the dropout is small, the current is low, noise matters or space is tight: it needs one or two capacitors, has no switching ripple, and gives 60 dB or more of supply rejection. A buck wins whenever the voltage drop or the current is large, because efficiency, heat and battery life then dominate. A common answer is both: a buck brings the rail close to the target and a low-noise LDO cleans it up for ADCs and sensors.",
      level: "screen",
    },
    {
      q: "State the two golden rules of op-amps and use them to derive the gain of an inverting amplifier.",
      a: "With negative feedback the output moves until the two inputs are at the same voltage, and the inputs themselves draw no current. In an inverting amplifier the non-inverting input is grounded, so the inverting input sits at 0 V, a virtual ground. The input current is Vin / Rin and, because none of it enters the op-amp, all of it flows through Rf, which gives Vout = −Vin × Rf / Rin. For example Rf = 100 kΩ and Rin = 10 kΩ give a gain of −10. The same two rules give 1 + Rf / Rg for the non-inverting amplifier.",
      level: "screen",
    },
    {
      q: "What does a microcontroller need on a board to start up reliably?",
      a: "First, clean power: a 100 nF capacitor at every supply pin plus a bulk capacitor, and a filtered supply for the analog pins. Second, a defined reset and boot configuration, for example a 10 kΩ pull-up on the reset or EN pin, often with a capacitor and a button to ground, and the correct level on the boot-mode strap pins. Third, a clock: many MCUs run from an internal oscillator, but USB, CAN and accurate timing need a crystal with the right load capacitors. Finally, a way in: a programming and debug header such as SWD with SWDIO, SWCLK, reset, 3V3 and ground, or a USB-UART bridge with auto-reset.",
      level: "screen",
    },
    {
      q: "How do you connect a 5 V sensor output to a 3.3 V microcontroller input?",
      a: "It depends on direction and speed. For a slow one-way signal such as the HC-SR04 echo, a resistor divider like 1 kΩ over 2 kΩ turns 5 V into 3.3 V for two cheap parts. For a bidirectional bus such as I²C I use a MOSFET level shifter, a BSS138 per line with pull-ups on both sides, or a dedicated translator. For fast push-pull signals I use a buffer such as a 74LVC245 powered at 3.3 V. Before any of that I check whether the MCU pin is 5 V tolerant, and many are not, including the ESP32.",
      level: "screen",
    },
    {
      q: "A buck converter makes 3.3 V from 12 V. What is the duty cycle, and what sets the inductor value and the output ripple?",
      a: "In continuous conduction the ideal duty cycle is Vout / Vin = 3.3 / 12 = 27.5%. The inductor current ramps by (Vin − Vout) × D / (L × f) over the on-time, so L sets the ripple current, and I usually target 20 to 40% of the load current. For 0.5 A at 500 kHz that is about 0.15 A, so L = 8.7 V × 0.275 / (0.15 A × 500 kHz) = 32 µH and I would pick 33 µH. The output ripple voltage is roughly ΔI / (8 × f × Cout), which is 1.7 mV for 22 µF, plus ΔI × ESR. Finally I check that the saturation current exceeds the peak, Iload + ΔI / 2, with margin.",
      level: "deep",
    },
    {
      q: "Why does a buck converter layout matter so much, and which loops and nodes do you worry about?",
      a: "The switching edges carry amps in nanoseconds, so any loop inductance turns into voltage spikes and radiated noise. The most critical is the hot loop: input capacitor, high-side switch and low-side switch back to the input capacitor. I make it as small as possible with the capacitor right at the IC pins on the same layer. Next is the switch node, which swings the full input voltage with fast edges, so I keep its copper as small as the inductor pad allows and keep the feedback divider and other sensitive traces away from it. I give the converter an unbroken ground plane, take the feedback trace from the output capacitor, and follow the datasheet's reference layout.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "An LDO drops 12 V to 3.3 V while supplying 0.5 A. How much power does it dissipate?",
      choices: ["1.65 W", "6 W", "4.35 W", "0.2 W"],
      answer: 2,
      explain:
        "P = (Vin − Vout) × I = 8.7 V × 0.5 A = 4.35 W. The 1.65 W figure is the power delivered to the load, and 6 W is the input power: the LDO turns almost three quarters of it into heat.",
    },
    {
      q: "What is the efficiency of an ideal LDO with 12 V in and 3.3 V out, ignoring its ground-pin current?",
      choices: ["27.5%", "72.5%", "90%", "100%"],
      answer: 0,
      explain:
        "The input current equals the output current, so efficiency is simply Vout / Vin = 3.3 / 12 = 27.5%. That ratio is why an LDO is only sensible when Vin is close to Vout.",
    },
    {
      q: "A buck converter makes 3.3 V from a 12 V input. In continuous conduction, what duty cycle does it run?",
      choices: ["12%", "27.5%", "50%", "72.5%"],
      answer: 1,
      explain:
        "Vout = D × Vin, so D = 3.3 / 12 = 27.5%. The high-side switch is on for just over a quarter of each period and the low-side switch carries the current for the rest.",
    },
    {
      q: "In a buck converter, what happens to the inductor ripple current when you raise the inductance at the same frequency and duty cycle?",
      choices: [
        "It increases",
        "The output voltage changes",
        "The output capacitor is no longer needed",
        "It decreases",
      ],
      answer: 3,
      explain:
        "ΔI = (Vin − Vout) × D / (L × f), so ripple current falls as L rises. A bigger inductor costs more, takes more board area and usually has higher DCR, which is the trade-off behind the 20 to 40% ripple rule of thumb.",
    },
    {
      q: "A non-inverting op-amp stage uses Rf = 99 kΩ and Rg = 1 kΩ. What is its gain?",
      choices: ["99", "100", "−99", "−100"],
      answer: 1,
      explain:
        "Non-inverting gain is 1 + Rf / Rg = 1 + 99 = 100. With a 10 mΩ shunt carrying 3 A, that turns 30 mV into a convenient 3.0 V for an ADC. The negative values would be inverting gains.",
    },
    {
      q: "Why must a 5 V HC-SR04 echo pin not be wired straight to an ESP32 GPIO?",
      choices: [
        "The ESP32 inputs are not 5 V tolerant, so 5 V can damage the pin",
        "The HC-SR04 only works with a 3.3 V supply",
        "A divider is only needed to filter noise",
        "5 V is read as a logic low by the ESP32",
      ],
      answer: 0,
      explain:
        "ESP32 GPIOs are rated for 3.3 V, so a 5 V level exceeds the absolute maximum rating and can stress or destroy the input over time. A 1 kΩ and 2 kΩ divider on the echo line is the usual cheap fix.",
    },
    {
      q: "A boost converter turns a 3.7 V Li-ion cell into 5 V at 1 A with 90% efficiency. About how much current does it draw from the cell?",
      choices: ["0.9 A", "1.35 A", "1.5 A", "1.85 A"],
      answer: 2,
      explain:
        "Input power = 5 V × 1 A / 0.9 = 5.56 W, and 5.56 W / 3.7 V = 1.5 A. A boost converter always draws more current than it delivers, which is why battery life and cell current limits need checking.",
    },
  ],
};

export default data;
