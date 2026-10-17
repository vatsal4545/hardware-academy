import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Ohm's law",
      def: "V = I · R: the current through a resistor is proportional to the voltage across it. 5 V across 1 kΩ gives 5 mA, and the power is P = V · I = I² · R = V² / R = 25 mW.",
    },
    {
      term: "KVL and KCL",
      def: "Kirchhoff's voltage law: the voltage rises and drops around any closed loop sum to zero. Kirchhoff's current law: the currents into a node sum to zero, because charge cannot pile up at a point.",
    },
    {
      term: "Voltage divider",
      def: "Two series resistors tapped in the middle: Vout = Vin · R2 / (R1 + R2). The output is a source with an output resistance of R1 ∥ R2, so anything you connect to it changes the voltage.",
    },
    {
      term: "Thevenin equivalent",
      def: "Any linear network seen from two terminals behaves like one ideal voltage source in series with one resistance. For a divider, Vth is the unloaded output and Rth is R1 ∥ R2.",
    },
    {
      term: "Time constant (τ)",
      def: "τ = R · C. A capacitor charging through R reaches 63.2% of the step after 1τ, 95% after 3τ and 99.3% after 5τ, so 5τ is the practical settling time.",
    },
    {
      term: "Reactance",
      def: "How a capacitor or inductor opposes AC. XC = 1 / (2πfC) falls with frequency (1.59 Ω for 100 nF at 1 MHz); XL = 2πfL rises with it (62.8 Ω for 10 µH at 1 MHz).",
    },
    {
      term: "Decibel (dB)",
      def: "A logarithmic ratio: 20 · log10(Vout / Vin) for voltages. +6 dB doubles a voltage, −6 dB halves it, −20 dB is a factor of 10, and −3 dB (×0.707) is the half-power point of a filter.",
    },
    {
      term: "Floating input",
      def: "A digital input connected to nothing. It has no defined voltage, so it picks up hum and noise and reads random levels. Give it a pull-up or pull-down (10 kΩ is typical).",
    },
    {
      term: "Ground reference",
      def: "The node defined as 0 V. Every voltage is a difference against some reference, and shared copper between grounds has resistance, so large currents lift one ground above another.",
    },
  ],
  scenario: {
    title: "ADC reads 2.9 V where the multimeter says 3.3 V",
    context:
      "A 12 V battery monitor on a robot board feeds a 12-bit ADC through a divider chosen to waste almost no current: R1 = 261 kΩ and R2 = 100 kΩ, both 1%. The node should sit at 3.32 V and the divider draws only 33 µA. On the bench a multimeter on the ADC pin reads 3.30 V, yet the firmware reports about 2.9 V, and the number shifts when another analog channel is added to the scan list.",
    symptoms: [
      "Multimeter on the ADC pin reads 3.30 V; the firmware prints about 2.9 V, roughly 12% low.",
      "The reading is correct when the same channel is sampled twice in a row, and wrong when it follows a channel at 0 V.",
      "The error scales with the voltage: it is a constant fraction, not a fixed offset.",
    ],
    hints: [
      "Why does the multimeter agree with the divider arithmetic while the ADC does not? Compare what each instrument draws from the node.",
      "Calculate the Thevenin resistance of 261 kΩ and 100 kΩ, then compare it with the source impedance the ADC datasheet asks for.",
      "A SAR ADC connects a sampling capacitor of roughly 13 pF to the pin for about 2 µs. How many time constants is that?",
    ],
    rootCause:
      "The divider is a 3.32 V source with a 72 kΩ output resistance. For about 2 µs per conversion the ADC connects a roughly 13 pF sampling capacitor, still holding the previous channel's voltage, to that node. With τ = 72 kΩ × 13 pF = 0.94 µs the pin only recovers 1 − e^(−2/0.94) = 88% of the way, so the reading is about 12% low. The multimeter's 10 MΩ input barely loads the node, which is why it reads correctly.",
    fix: "Add a 100 nF capacitor from the ADC pin to ground. It supplies the sampling charge, so each conversion disturbs the node by well under 1 mV, and the 7 ms RC it forms with the divider is irrelevant for a battery voltage. Alternatively lower the divider to 27 kΩ and 10 kΩ (Rth = 7.3 kΩ, about 20 time constants of settling) at the cost of 324 µA, or lengthen the ADC sample time in firmware.",
    lesson:
      "A divider is a source with an output resistance. Judge it against what it feeds, and give a sampled ADC input a capacitor to draw its charge from.",
  },
  interview: [
    {
      q: "Walk me through designing a voltage divider that scales a 12 V battery down to a 3.3 V ADC input.",
      a: "I start with the ratio: 3.3 / 12 = 0.275, so R1 / R2 = 2.64. I pick R2 = 10 kΩ so the divider draws well under a milliamp, which makes R1 = 26.4 kΩ, and I use the nearest standard value, 27 kΩ, for 3.24 V out at 324 µA. Then I check loading: the output resistance is R1 in parallel with R2, 7.3 kΩ, so the ADC or a filter capacitor must not disturb it by more than a percent or two. Finally I design for the worst case rather than the nominal one: a 12 V lead-acid battery reaches 14.4 V while charging, which would put 3.9 V on a 3.3 V pin, so I would move to 36 kΩ and 10 kΩ and add a 100 nF capacitor at the pin.",
      level: "screen",
    },
    {
      q: "State Kirchhoff's two laws and say when you use each.",
      a: "KCL says the currents entering a node sum to zero, because charge cannot pile up at a point. I use it to find a branch current, for example when a load taps off a divider. KVL says the voltage rises and drops around any closed loop sum to zero, because voltage is a potential difference. I use it to find an unknown voltage, such as how much of a 12 V supply is left after two series resistors. Together with Ohm's law they solve any resistor network, and I use them as sanity checks: if the drops around a loop do not add up to the source, my schematic or my measurement is wrong.",
      level: "screen",
    },
    {
      q: "How do you measure current with a multimeter, and what is the classic mistake?",
      a: "Current is measured in series: I break the circuit, move the red lead to the mA or A jack and put the meter in the path so the current flows through it. In that mode the meter is a near-zero resistance, a few ohms or less. The classic mistake is leaving the leads in the current jacks and then probing a voltage across a supply, which is almost a short circuit and blows the meter fuse. I move the lead back to the voltage jack right after each current measurement, and on small boards I often measure the voltage across a known shunt resistor instead.",
      level: "screen",
    },
    {
      q: "What happens to a digital input that is left floating, and how do you fix it?",
      a: "A floating CMOS input has no defined voltage, so it drifts wherever stray capacitance and leakage push it, and it picks up mains hum and nearby switching noise. Near the middle of the logic range both input transistors conduct, so it can draw extra current and read as random zeros and ones. The fix is to give it a defined state with a pull-up or pull-down resistor, typically 10 kΩ, or an internal pull of roughly 30 to 50 kΩ when the timing allows. Enable, reset, strap and unused gate inputs all deserve the same discipline, because a floating pin can work on the bench and fail in the field.",
      level: "screen",
    },
    {
      q: "Explain a Thevenin equivalent using a voltage divider, and why a divider cannot drive a low-impedance load.",
      a: "Any linear two-terminal network behaves like one ideal source in series with one resistor. For a divider the source is the unloaded output, Vin · R2 / (R1 + R2), and the series resistance is R1 in parallel with R2, so 27 kΩ and 10 kΩ give 3.24 V behind 7.3 kΩ. A load RL forms a second divider with that Thevenin resistance, so the output falls by the factor RL / (RL + Rth). A 10 kΩ load drags 3.24 V down to 1.88 V, while a 1 MΩ load costs only 0.7%. The rule of thumb is a load of at least 10 times Rth for about 10% error and 100 times for about 1%, which is why dividers feed high-impedance inputs and why I add a buffer or a capacitor in front of a sampled ADC.",
      level: "deep",
    },
    {
      q: "You apply a 0 to 3.3 V, 1 kHz square wave to a 10 kΩ and 100 nF RC low-pass. What does the output look like, and why?",
      a: "The time constant is 10 kΩ × 100 nF = 1 ms, so the cutoff is 1 / (2π · 1 ms) = 159 Hz and 1 kHz sits well above it. Each half period is 0.5 ms, only half a time constant, so the capacitor never gets near either rail. The output settles into a roughly triangular wave centred on 1.65 V that swings between about 1.25 V and 2.05 V, around 0.8 V peak to peak instead of 3.3 V. If I drop the frequency below roughly 50 Hz the output looks like the input again, and if I raise it to 10 kHz the ripple shrinks to about 80 mV.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "A 5 V rail drives a 1 kΩ resistor. How much power does the resistor dissipate?",
      choices: ["5 mW", "25 mW", "5 W", "25 W"],
      answer: 1,
      explain:
        "P = V² / R = 25 / 1000 = 25 mW (equivalently 5 V × 5 mA). Mixing up the units is the usual error: the current is milliamps, so the power is milliwatts, which any 0402 resistor (62.5 mW) handles.",
    },
    {
      q: "Two 10 kΩ resistors are connected in parallel. What is the total resistance?",
      choices: ["20 kΩ", "10 kΩ", "5 kΩ", "2.5 kΩ"],
      answer: 2,
      explain:
        "Parallel resistances combine as the product over the sum: (10 × 10) / (10 + 10) = 5 kΩ. The result is always smaller than the smallest branch because every extra path adds conductance.",
    },
    {
      q: "A divider is built from R1 = 27 kΩ (top) and R2 = 10 kΩ (bottom) on 12 V. What is the unloaded output voltage?",
      choices: ["3.24 V", "4.44 V", "8.76 V", "2.67 V"],
      answer: 0,
      explain:
        "Vout = 12 V × 10 / (27 + 10) = 3.24 V. The 8.76 V figure is the voltage across R1, which together with the 3.24 V across R2 adds up to 12 V, exactly as KVL requires.",
    },
    {
      q: "That divider has a Thevenin resistance of 7.3 kΩ. Which load keeps the loading error under about 1%?",
      choices: ["10 kΩ", "47 kΩ", "100 kΩ", "1 MΩ"],
      answer: 3,
      explain:
        "The output falls by RL / (RL + Rth). For 1% you need RL of at least 99 × 7.3 kΩ ≈ 720 kΩ, so only 1 MΩ qualifies; 100 kΩ costs about 6.8% and 10 kΩ about 42%.",
    },
    {
      q: "An RC circuit has R = 10 kΩ and C = 100 nF. A step is applied, and 5 ms later the capacitor voltage is about:",
      choices: ["63% of the step", "86% of the step", "95% of the step", "99% of the step"],
      answer: 3,
      explain:
        "τ = RC = 1 ms, so 5 ms is 5τ, where the capacitor has reached 1 − e^(−5) = 99.3% of the final value. That is why 5τ is treated as fully settled.",
    },
    {
      q: "What is the reactance of a 100 nF capacitor at 1 MHz?",
      choices: ["1.6 Ω", "160 Ω", "16 kΩ", "1.6 MΩ"],
      answer: 0,
      explain:
        "XC = 1 / (2π × 1 MHz × 100 nF) = 1.59 Ω. At 100 Hz the same capacitor is 15.9 kΩ, which is why a small capacitor shorts out high-frequency noise to ground but ignores slow signals.",
    },
    {
      q: "A filter's output is 6 dB below its input. The voltage ratio is:",
      choices: ["×0.707", "×0.5", "×0.25", "×0.1"],
      answer: 1,
      explain:
        "dB = 20 · log10(ratio), so −6 dB is a ratio of 10^(−6/20) = 0.5. The ×0.707 value is −3 dB, the half-power point, and ×0.1 is −20 dB.",
    },
    {
      q: "A reset input on a new board is left unconnected. What is the most likely outcome?",
      choices: [
        "It reads 0 V, so the chip stays reliably in reset",
        "It reads 3.3 V, so the chip always runs",
        "It floats and picks up noise, so the chip resets or runs unpredictably",
        "The chip's internal protection diodes hold it at mid-rail",
      ],
      answer: 2,
      explain:
        "A floating input has no defined voltage, so leakage and noise decide its state, and the behaviour changes with temperature, humidity and what your hand is touching. Give every enable, reset and mode pin a pull-up or pull-down.",
    },
  ],
};

export default data;
