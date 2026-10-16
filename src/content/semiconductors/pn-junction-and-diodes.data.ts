import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Depletion region",
      def: "The zone around a p-n junction emptied of mobile carriers, leaving fixed dopant ions. Typically 0.1-1 µm wide at zero bias, it widens as sqrt(V_bi − V) under reverse bias.",
    },
    {
      term: "Built-in potential (V_bi)",
      def: "The potential step across a junction at equilibrium, (kT/q)·ln(N_A·N_D/n_i²): about 0.6-0.7 V for moderately doped silicon. A voltmeter cannot measure it directly.",
    },
    {
      term: "Shockley diode equation",
      def: "I = I_s(exp(V/nV_T) − 1), with V_T = kT/q ≈ 26 mV at 300 K and ideality n between 1 and 2. Current changes tenfold for every 60 mV when n = 1.",
    },
    {
      term: "Saturation current (I_s)",
      def: "The small current a junction approaches in reverse bias, about 10⁻¹⁴ A for a small silicon diode and up to microamps for a Schottky. It roughly doubles every 10 °C.",
    },
    {
      term: "Reverse recovery time (trr)",
      def: "The time needed to remove stored minority charge before a diode blocks after conducting: about 2 µs for a 1N4007, 75 ns for a UF4007 and practically zero for a Schottky.",
    },
    {
      term: "Schottky diode",
      def: "A metal-semiconductor junction that conducts with majority carriers only: a 0.2-0.4 V forward drop at modest current and no stored charge, at the cost of higher leakage.",
    },
    {
      term: "Zener and avalanche breakdown",
      def: "Controlled reverse conduction by tunneling (below about 5 V) or impact ionization (above about 6-7 V). Zener diodes use it for voltage references and clamps.",
    },
    {
      term: "Junction capacitance",
      def: "C_j = εA/W, the capacitance of the depletion region. It falls as reverse bias widens W, which varactor diodes use to tune oscillators.",
    },
  ],
  scenario: {
    title: "Reverse-polarity diode runs hot at 1 A",
    context:
      "A 12 V robot controller takes power from a lead-acid battery through a 1N4007 in series with the positive lead, so a reversed battery cannot destroy the board. The board draws about 1 A on average. During a 40 °C enclosure soak for a customer, the thermal camera picks out one part far hotter than everything else, and after 500 hours the laminate under it has started to brown.",
    symptoms: [
      "The 1N4007 body reads 110 °C on the thermal camera in a 40 °C enclosure; every other part is below 60 °C",
      "A meter across the diode reads 0.95 V at 1.0 A",
      "Whole-board efficiency is about 8% below what the buck regulator's datasheet predicts",
      "The diode was chosen because its 1000 V rating looked 'safe'",
    ],
    hints: [
      "How do you calculate the power in a diode? It is not I²R.",
      "Does a 1000 V rating help on a 12 V input, and what does it cost in forward drop?",
      "Which devices drop less than a silicon PN junction, or have no junction drop at all?",
    ],
    rootCause:
      "A silicon PN rectifier drops about 0.9-1.0 V at 1 A regardless of its voltage rating, so it dissipates P = Vf × I ≈ 0.95 W, 8% of the 12 W input. With roughly 75 °C/W from junction to air on small pads, that is a 70 °C rise on top of the 40 °C enclosure. The 1N4007 is a 1000 V, 50 Hz mains rectifier: its voltage rating is irrelevant on a 12 V input and it has the highest forward drop and slowest recovery of any reasonable choice.",
    fix: "Option 1: a Schottky such as the SS34 (40 V, 3 A) drops about 0.4 V at 1 A, cutting the loss to 0.4 W. Option 2, better: a P-channel MOSFET 'ideal diode' in the positive lead, drain to the battery and source to the load, gate pulled to ground through 10 kΩ with a 12 V Zener from gate to source; with Rds(on) = 20 mΩ the loss is 1² × 0.02 = 20 mW, and a reversed battery leaves the MOSFET off. For automotive inputs, an ideal-diode controller such as the LM74700-Q1 driving an N-channel MOSFET adds fast reverse-current blocking.",
    lesson:
      "A diode's forward drop is power: P = Vf × I. Above a few hundred milliamps, protect against reverse polarity with a Schottky or a MOSFET ideal diode, and never pick a diode by its voltage rating alone.",
  },
  interview: [
    {
      q: "Why does a silicon diode 'drop 0.7 V'?",
      a: "The diode current is exponential, I = I_s(exp(V/nV_T) − 1), with V_T = 26 mV and I_s around 10⁻¹⁴ A for a small silicon junction. Solving for the voltage that gives milliamp currents lands between about 0.6 and 0.75 V, so on a linear plot the curve looks like it switches on near 0.7 V. It is not a threshold: the current changes tenfold for every 60 mV, and at 0.4 V tens of nanoamps already flow. The drop also falls about 2 mV per °C and grows with current through series resistance, which is why a 1N4007 shows about 1 V at 1 A.",
      level: "screen",
    },
    {
      q: "What is the difference between a Schottky diode and a PN diode, and when would you choose each?",
      a: "A Schottky is a metal-semiconductor junction that conducts with majority carriers only, so it has a lower forward drop, 0.2-0.4 V at modest current, and essentially no reverse-recovery charge. The price is much higher leakage that rises steeply with temperature, and lower voltage ratings, typically up to 100-200 V for silicon parts. I pick a Schottky for low-voltage rectification, switching-converter catch diodes and reverse-polarity protection where efficiency matters. I pick a PN diode where leakage must be low, the voltage is high, or cost matters more than the drop, such as a mains bridge rectifier.",
      level: "screen",
    },
    {
      q: "Walk me through what happens inside a p-n junction when it switches from forward conduction to reverse bias.",
      a: "In forward conduction the junction has injected minority carriers, holes into the n side and electrons into the p side, stored as charge within a few diffusion lengths of the junction. When the voltage reverses, that stored charge must leave before the depletion region can widen and block, so a large reverse current flows for a while; this is reverse recovery, specified as trr and Qrr. A 1N4007 takes about 2 µs, which is fine at 50 Hz but turns into heat and ringing in a 100 kHz converter, where an ultrafast UF4007 at 75 ns or a Schottky with no stored charge is the right part. Once the charge is gone, the depletion region widens as the square root of the voltage, the junction capacitance falls, and only thermal leakage flows.",
      level: "deep",
    },
    {
      q: "How does a Zener diode work, and why are 5-6 V Zeners the most stable with temperature?",
      a: "A Zener is a diode designed to break down at a defined reverse voltage and survive it, as long as a resistor limits the current. Below about 5 V the junction is so heavily doped and the depletion region so thin, around 10 nm, that electrons tunnel straight across, and tunneling breakdown has a negative temperature coefficient. Above about 6-7 V the mechanism is avalanche multiplication, where the field accelerates carriers until they knock new electron-hole pairs loose, and that has a positive coefficient. Around 5.1-6.2 V the two effects cancel, so those parts drift least; for real precision I would still use a bandgap reference such as the TL431.",
      level: "deep",
    },
    {
      q: "How do you pick the series resistor for an LED, and why does it need one?",
      a: "An LED is a diode, so its current rises exponentially with voltage, and a few tens of millivolts can multiply it several times; driven straight from a supply it will overheat. The resistor sets the current: R = (V_supply − V_f) / I, so 5 V, a 2 V red LED and 10 mA give 300 Ω, and I would fit the standard 330 Ω for about 9 mA. I also check the resistor's power, here about 27 mW, and the LED's absolute maximum current. If the headroom is small, such as a 3 V blue LED on a 3.3 V rail, I use a constant-current driver, because the spread in V_f would swing the current wildly.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "What is the thermal voltage kT/q at 300 K?",
      choices: ["0.7 V", "26 mV", "60 mV", "1.12 V"],
      answer: 1,
      explain:
        "V_T = kT/q = 8.617 × 10⁻⁵ × 300 ≈ 25.9 mV, and it sets the steepness of the diode curve. 60 mV is the change per decade of current (2.3 × V_T), and 0.7 V is a typical forward drop.",
    },
    {
      q: "For an ideal diode (n = 1), how much must the forward voltage rise to increase the current tenfold?",
      choices: ["0.1 V", "26 mV", "0.7 V", "60 mV"],
      answer: 3,
      explain:
        "exp(ΔV/V_T) = 10 gives ΔV = V_T × ln 10 = 26 mV × 2.3 ≈ 60 mV. That is why the forward drop changes only slightly over several decades of current.",
    },
    {
      q: "A junction with V_bi = 0.7 V is reverse-biased by 6.3 V. Compared with zero bias, its depletion region is about:",
      choices: ["The same width", "1.5× wider", "3.2× wider", "10× wider"],
      answer: 2,
      explain:
        "W ∝ sqrt(V_bi − V): sqrt(0.7 + 6.3) / sqrt(0.7) = sqrt(10) ≈ 3.2. A wider depletion region also means about 3.2× lower junction capacitance, which is how varactors tune.",
    },
    {
      q: "Which of these has the lowest forward drop at 10 mA?",
      choices: ["1N4007 rectifier", "Red LED", "BAT54 Schottky", "BZX84C5V1 Zener in forward bias"],
      answer: 2,
      explain:
        "A Schottky's metal-semiconductor barrier gives 0.2-0.4 V at modest current; the BAT54 is at most 0.4 V at 10 mA. Silicon PN junctions, including a Zener in forward bias, drop about 0.7 V, and a red LED about 1.8-2 V.",
    },
    {
      q: "Why does a blue LED need about 3 V while a red one needs about 2 V?",
      choices: [
        "Blue LEDs have more internal series resistance",
        "Each photon carries about the band-gap energy, and blue (about 2.7 eV) needs a wider-gap material than red (about 1.8 eV)",
        "Blue light is dimmer, so it needs more voltage to be visible",
        "Blue LEDs are made of silicon, which has a higher threshold",
      ],
      answer: 1,
      explain:
        "λ(nm) ≈ 1240 / E(eV): 2.7 eV gives about 460 nm (blue) and 1.8 eV about 690 nm (red). The forward voltage must be at least the gap in volts, plus some resistive drop. Silicon's indirect gap makes it useless for LEDs.",
    },
    {
      q: "On a diode datasheet, what does trr describe?",
      choices: [
        "The time needed to sweep out stored charge before the diode blocks after conducting",
        "The time for the junction to reach thermal equilibrium",
        "The rise time of the forward current at turn-on",
        "The thermal resistance from junction to case",
      ],
      answer: 0,
      explain:
        "Reverse recovery time: a forward-biased PN diode stores minority charge that must be removed before it can block, so reverse current flows briefly. It is about 2 µs for a 1N4007, 75 ns for a UF4007 and essentially zero for a Schottky.",
    },
    {
      q: "A red LED (Vf = 2 V) should run from 5 V at about 10 mA. Which standard resistor do you fit?",
      choices: ["100 Ω", "220 Ω", "330 Ω", "1 kΩ"],
      answer: 2,
      explain:
        "R = (5 − 2) / 0.01 = 300 Ω; the nearest standard value at or above it is 330 Ω, giving 9.1 mA. 220 Ω would push 13.6 mA and 1 kΩ only 3 mA.",
    },
  ],
};

export default data;
