import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Tolerance and tempco",
      def: "Tolerance is the allowed error from the marked value (±1% for E96, ±5% for E24). Tempco is drift per degree: ±100 ppm/°C on a thick-film resistor moves a 10 kΩ part by 60 Ω over a 60 °C swing.",
    },
    {
      term: "Package code (0402, 0603, 0805, 1206)",
      def: "Imperial size in hundredths of an inch: 0402 is 1.0 × 0.5 mm, 0603 is 1.6 × 0.8 mm, 0805 is 2.0 × 1.25 mm, 1206 is 3.2 × 1.6 mm. Rated power grows with size, from 1/16 W (0402) to 1/4 W (1206).",
    },
    {
      term: "C0G, X7R and Y5V",
      def: "Ceramic dielectric codes. C0G (NP0) holds ±30 ppm/°C with no bias effect. X7R is ±15% from −55 to +125 °C but loses capacitance under DC bias. Y5V swings +22/−82% and is unsuitable for timing, filtering or decoupling.",
    },
    {
      term: "DC-bias derating",
      def: "Class II ceramic capacitance falls as DC voltage rises. A small-case, high-value X7R part can lose 40% at half its rated voltage and over 60% at the rated voltage, so the label is only its value at 0 V.",
    },
    {
      term: "ESR",
      def: "Equivalent series resistance: the small real resistance in series with a capacitor, from milliohms (ceramic, polymer) to ohms (small electrolytic). It turns ripple current into heat and can decide LDO stability.",
    },
    {
      term: "ESL and self-resonance",
      def: "Equivalent series inductance, about 0.5 to 1 nH for an 0402 plus the mounting. A capacitor resonates at f = 1 / (2π√(LC)), roughly 16 MHz for 100 nF with 1 nH, and behaves like an inductor above that frequency.",
    },
    {
      term: "Decoupling capacitor",
      def: "A local capacitor that supplies an IC's fast current transients so the rail does not sag: 100 nF X7R at every supply pin, within a few millimetres, plus a 4.7 to 10 µF bulk capacitor per rail.",
    },
    {
      term: "Saturation current (Isat)",
      def: "The current at which an inductor's core saturates and its inductance falls, usually quoted at a 20 to 30% drop. Past it the current ramps almost without limit, which can destroy a buck converter's switch.",
    },
    {
      term: "DCR",
      def: "DC resistance of an inductor's winding. It sets the copper loss I² · DCR and, with the heating (RMS) current rating, how much continuous current the part can carry.",
    },
    {
      term: "Ferrite bead",
      def: "A lossy, inductor-like part that looks resistive at high frequency (typically 600 Ω at 100 MHz), so it absorbs noise as heat instead of reflecting it. Its impedance drops with DC bias current.",
    },
  ],
  scenario: {
    title: "The blink timer runs 30% faster on fresh cells",
    context:
      "A battery-powered asset tag paces its transmissions with an RC relaxation oscillator: a Schmitt-trigger inverter, a resistor and a 100 nF capacitor, nominally a 10 ms timebase. The bill of materials said '100 nF, 6.3 V', and purchasing picked the cheapest match, a Y5V 0402. The designer could only reach 100 Hz on the bench by raising R from the calculated 100 kΩ up to about 220 kΩ, then froze the design. In the field the tags run roughly 30% faster with fresh cells and slow down as the batteries sag, and the spread between tags is wider than the resistor tolerance can explain.",
    symptoms: [
      "Frequency differs by more than 30% between a fresh 4.2 V cell and a nearly flat 3.0 V cell, even though the Schmitt thresholds scale with the supply.",
      "An LCR meter at 1 kHz with no DC bias reads the capacitor at 98 nF, in spec, yet in circuit it behaves like roughly 45 nF.",
      "R had to be raised from the calculated 100 kΩ to about 220 kΩ to hit 100 Hz, which is the clue that C is not 100 nF in circuit: the period is proportional to R × C, so a capacitor of about 45 nF needs about 2.2 times the resistance.",
      "Cooling a board in a freezer shifts the frequency again.",
    ],
    hints: [
      "An LCR meter applies about 1 V of AC and no DC. What DC voltage does the capacitor see inside the oscillator, and does a ceramic capacitor care?",
      "Read the dielectric code on the part number. What do Y5V and X7R promise about capacitance versus temperature and versus DC bias?",
      "Find the DC-bias curve for a 6.3 V, 100 nF Y5V 0402 and read the capacitance at 3.3 V and at 4.2 V.",
    ],
    rootCause:
      "A Y5V ceramic loses capacitance as DC bias rises, roughly half of its 100 nF at 3.3 V on a 6.3 V part and more at 4.2 V, and it loses more again at temperature extremes (Y5V allows +22/−82% over −30 to +85 °C). The oscillator period is proportional to R × C, so the frequency follows the supply and the temperature instead of staying fixed. Trimming R on the bench hid the problem at one voltage and one temperature.",
    fix: "Use a C0G (NP0) capacitor, whose value does not move with bias and drifts only ±30 ppm/°C; a 100 nF C0G in 0805 costs a few cents more. Recalculate R for the true value (back to 100 kΩ), or move the timebase to the MCU's crystal-driven timer. If a Class II part is unavoidable, choose X7R rated at least 3 times the working voltage and read the manufacturer's DC-bias curve instead of trusting the label.",
    lesson:
      "A ceramic capacitor's label is its value at zero volts and room temperature. Buy C0G where the value matters, and for decoupling accept the derating and over-size it.",
  },
  interview: [
    {
      q: "How do you choose decoupling capacitors for a microcontroller?",
      a: "I put one 100 nF X7R capacitor in an 0402 or 0603 on every supply pin, as close to the pin as the footprint allows, with the ground via right at the capacitor pad. Then I add a bulk capacitor of 4.7 to 10 µF per rail, nearer the regulator, to cover slower load steps. I pick a voltage rating of 2 to 3 times the rail because X7R loses capacitance under bias, so a 10 µF, 6.3 V part on 3.3 V may only be 6 µF. For an analog supply such as VDDA I add 1 µF behind a ferrite bead or a small resistor to keep digital noise out.",
      level: "screen",
    },
    {
      q: "What is the difference between C0G, X7R and Y5V ceramic capacitors?",
      a: "They are dielectric classes. C0G, also called NP0, is Class I: ±30 ppm/°C, no change with DC bias and almost no aging, but limited to roughly 100 nF in an 0805. X7R is Class II: ±15% from −55 to +125 °C and far more capacitance per volume, but it loses 40% or more under DC bias and shows some aging and microphonic effects. Y5V swings +22/−82% over temperature and loses even more under bias, so I avoid it for anything that matters. In practice I use C0G for timing and RF, X7R for decoupling and bulk, and Y5V almost never.",
      level: "screen",
    },
    {
      q: "A 10 µF, 6.3 V X5R capacitor sits on a 5 V rail. What is wrong with that?",
      a: "Two things. First, 5 V is 79% of the rating, which leaves no margin for ripple, spikes or aging, and ceramics can crack or degrade when run near their limit. Second, DC-bias derating: at 5 V a 10 µF, 6.3 V part in an 0603 can deliver less than half of its marked capacitance, so the rail has far less bulk capacitance than the schematic claims. I would move to a 16 V or 25 V part, maybe a larger case, and read the manufacturer's bias curve for the real capacitance at 5 V.",
      level: "screen",
    },
    {
      q: "What does ESR do, and when does it matter?",
      a: "ESR is the equivalent series resistance of a capacitor, the small resistance in series with its ideal capacitance. It turns ripple current into heat, P = I² · ESR, so it sets the ripple rating of an electrolytic, and together with the capacitance it sets the output ripple of a switching regulator. For some older LDOs, the AMS1117 among them, it matters in the other direction, because the control loop expects some ESR in the output capacitor and a very low-ESR ceramic can make it oscillate. As a rule, ceramics are tens of milliohms, polymers a few tens of milliohms, and aluminium electrolytics a few hundred milliohms to ohms.",
      level: "screen",
    },
    {
      q: "What happens when an inductor saturates, and how do you pick one for a buck converter?",
      a: "Above its saturation current the core can hold no more flux, so the inductance collapses, usually defined as a 20 to 30% drop, and the current ramps almost unchecked until something else limits it. In a buck converter that sends a current spike through the switch, which can trip the current limit or destroy the FET. I choose L from the ripple target, ΔI = (Vin − Vout) · D / (L · f), usually 20 to 40% of the load current. Then I pick a part whose saturation current is above the converter's current limit with margin and whose RMS rating covers the load, and I check that DCR keeps the I² · R loss and heating acceptable.",
      level: "deep",
    },
    {
      q: "Why do designers put several capacitor values in parallel, and what is self-resonance?",
      a: "Every real capacitor is a series RLC: the capacitance, its ESR, and an equivalent series inductance of about 0.5 to 1 nH for an 0402 plus a nanohenry or so from the pads and vias. At the self-resonant frequency, f = 1 / (2π√(LC)), the reactances cancel and the impedance is just the ESR, and above it the part behaves like an inductor. 100 nF with 1 nH resonates near 16 MHz and 10 µF with 2 nH near 1.1 MHz, so each value covers a different band. Mixed values can create anti-resonance peaks between them, so I use a few well-chosen values placed close to the pins instead of a pile of different ones.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "How large is an imperial 0402 chip resistor?",
      choices: ["0.5 × 0.25 mm", "1.0 × 0.5 mm", "1.6 × 0.8 mm", "2.0 × 1.25 mm"],
      answer: 1,
      explain:
        "The code is in hundredths of an inch: 0.04 × 0.02 in is 1.0 × 0.5 mm. 0603 is 1.6 × 0.8 mm and 0805 is 2.0 × 1.25 mm. Beware that a metric 0402 is the much smaller 0.4 × 0.2 mm part (imperial 01005).",
    },
    {
      q: "Which dielectric is the right choice for the timing capacitor of an RC oscillator?",
      choices: ["Y5V", "X7R", "C0G (NP0)", "Aluminium electrolytic"],
      answer: 2,
      explain:
        "C0G keeps its value within ±30 ppm/°C and does not change with DC bias, so the frequency stays put. X7R and especially Y5V lose capacitance with bias and temperature, and an electrolytic has wide tolerance and leakage.",
    },
    {
      q: "A 10 µF, 10 V X7R capacitor sits on a 3.3 V rail. About how much capacitance does it really provide?",
      choices: ["10 µF", "About 7.5 µF", "About 2 µF", "About 0.5 µF"],
      answer: 1,
      explain:
        "At about a third of the rated voltage, a high-value X7R in a small case typically loses 20 to 35%, leaving 6 to 8 µF. The loss grows quickly as you approach the rating, so check the manufacturer's DC-bias curve and over-size the voltage rating.",
    },
    {
      q: "Where does the polarity stripe sit on a tantalum chip capacitor and on an SMD aluminium electrolytic?",
      choices: [
        "Tantalum: stripe marks plus. Aluminium: stripe marks minus.",
        "Both stripes mark the plus terminal.",
        "Both stripes mark the minus terminal.",
        "Tantalum: stripe marks minus. Aluminium: stripe marks plus.",
      ],
      answer: 0,
      explain:
        "The conventions are opposite: the bar on a tantalum marks the positive terminal, while the dark band on an aluminium electrolytic marks the negative one. Reverse a tantalum and it can fail short and burn, so check the datasheet and the footprint's pin 1.",
    },
    {
      q: "An electrolytic capacitor is rated 2000 h at 105 °C. By the 10-degree rule, its expected life at 55 °C is about:",
      choices: ["4,000 h", "16,000 h", "64,000 h", "2,000,000 h"],
      answer: 2,
      explain:
        "Life roughly doubles for every 10 °C of cooling. From 105 °C to 55 °C is five steps, so 2000 h × 2^5 = 64,000 h, about 7 years. Heat from ripple current counts too, so the real capacitor core runs hotter than ambient.",
    },
    {
      q: "A 100 nF capacitor with 1 nH of total series inductance is self-resonant at about:",
      choices: ["1.6 MHz", "16 MHz", "160 MHz", "1.6 GHz"],
      answer: 1,
      explain:
        "f = 1 / (2π√(LC)) = 1 / (2π√(1 nH × 100 nF)) = 15.9 MHz. Above that frequency the part looks like an inductor, which is why decoupling needs a short, low-inductance path to the plane.",
    },
    {
      q: "What happens when a buck converter's inductor current exceeds the inductor's saturation current?",
      choices: [
        "The inductance rises and the ripple falls",
        "Nothing, because saturation current is only a heating limit",
        "The inductance collapses and the current spikes",
        "The winding resistance drops to zero",
      ],
      answer: 2,
      explain:
        "Saturation means the core cannot store more flux, so the inductance falls steeply and the current ramps up much faster than the design assumed. Heating is a separate limit, the RMS current rating.",
    },
  ],
};

export default data;
