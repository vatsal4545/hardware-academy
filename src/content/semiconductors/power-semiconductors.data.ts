import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Blocking voltage",
      def: "The highest voltage a switch holds off when it is off (V(BR)DSS or VCES). 650-750 V parts serve 400 V EV buses; 1,200 V parts serve 800 V buses.",
    },
    {
      term: "Rds(on)",
      def: "A MOSFET's on-state resistance; conduction loss = I_rms²·Rds(on). It rises with temperature: about 1.4× from 25 to 150 °C for SiC and about 2× for silicon.",
    },
    {
      term: "Switching loss",
      def: "Energy lost while voltage and current overlap during each turn-on and turn-off, so P_sw = (Eon + Eoff)·f.",
    },
    {
      term: "IGBT",
      def: "Insulated-gate bipolar transistor: a MOS gate driving bipolar conduction. Low on-voltage at high voltage and current, but a tail current at turn-off limits it to roughly 2-20 kHz.",
    },
    {
      term: "Drift region",
      def: "The thick, lightly doped layer that supports the blocking voltage. Its resistance dominates high-voltage devices.",
    },
    {
      term: "Wide band gap (WBG)",
      def: "Semiconductors with band gaps well above silicon's 1.12 eV, mainly SiC (3.26 eV) and GaN (3.4 eV), with roughly 10× silicon's critical electric field.",
    },
    {
      term: "GaN HEMT",
      def: "High-electron-mobility transistor using the 2D electron gas at an AlGaN/GaN interface. Lateral, usually 650 V or below, with tiny gate charge and no reverse recovery.",
    },
    {
      term: "dv/dt",
      def: "How fast the voltage changes at a switching edge. SiC reaches 20-50 V/ns, which pushes common-mode current i = C·dv/dt through every stray capacitance.",
    },
  ],
  scenario: {
    title: "SiC inverter fails EMI after a drop-in device swap",
    context:
      "A team moves a 400 V, 150 kW traction inverter from silicon IGBTs to SiC MOSFETs, keeping the existing power board, busbar and gate-driver design. The new inverter cuts losses roughly in half on the dynamometer, but the first CISPR 25 emissions pre-scan fails badly and the motor-position sensor misbehaves at high load.",
    symptoms: [
      "Phase-node edges measure about 50 V/ns, versus about 5 V/ns with the IGBTs, with 150 V of overshoot ringing at about 60 MHz.",
      "Conducted and radiated emissions exceed the CISPR 25 limit by 15-20 dB between 30 and 100 MHz, with peaks at the ringing frequency.",
      "Resolver faults and CAN error frames appear only above about 200 A of phase current.",
    ],
    hints: [
      "Ringing frequency is f = 1/(2π√(LC)). Which loop inductance and which device capacitance give 60 MHz?",
      "Common-mode current is i = C·dv/dt. How much current does 50 V/ns push through 100 pF of winding-to-frame capacitance?",
      "The gate resistors and the power-loop layout were carried over unchanged from the IGBT design.",
    ],
    rootCause:
      "The SiC MOSFETs switch about 10× faster than the IGBTs, but the board kept the IGBT layout with about 20 nH of commutation-loop inductance and gate resistors sized for slow devices. Each 50 V/ns edge rings that inductance against the roughly 350 pF device output capacitance at about 60 MHz, and drives about 5 A spikes of common-mode current (100 pF × 50 V/ns) through the motor windings and chassis, which couple into the resolver and CAN wiring.",
    fix: "Raise the turn-on gate resistance to slow the edges to about 20-25 V/ns, accepting a small rise in switching loss. Use a Kelvin-source gate connection, cut loop inductance below 5 nH with a laminated busbar and DC-link capacitors right at the module, add small RC snubbers across each leg, and add a common-mode choke and Y-capacitors at the DC input. The retest passes with about 6 dB of margin and keeps most of the efficiency gain.",
    lesson:
      "Fast switching is not free. With SiC and GaN, layout inductance, gate drive and EMI filtering are part of the device choice, and dv/dt is a design parameter you tune.",
  },
  interview: [
    {
      q: "When would you choose an IGBT over a MOSFET?",
      a: "IGBTs make sense at high voltage and high current with modest switching frequency, such as 1,200 or 1,700 V industrial drives switching at 2-10 kHz. Their bipolar conduction gives an almost flat on-voltage of about 1.5-2 V even at hundreds of amps, and silicon IGBTs are cheap and rugged. MOSFETs, especially SiC, win when you need higher frequency or better light-load efficiency, because they have no knee voltage and no tail current. In a 400 V EV inverter both work, which is why the choice there often comes down to cost.",
      level: "screen",
    },
    {
      q: "Compute the losses: 100 A, 10 kHz, Rds(on) = 10 mΩ, Esw = 1 mJ.",
      a: "Conduction loss is I²·R = 100² × 0.010 = 100 W. Switching loss is Esw·f = 1 mJ × 10,000 per second = 10 W, so 110 W in total. If the die runs at 150 °C, Rds(on) can be about 40% higher, which makes conduction 140 W. That is why I always read Rds(on) and Esw at the real junction temperature, not the 25 °C headline value.",
      level: "screen",
    },
    {
      q: "Why did Tesla move to SiC in the Model 3?",
      a: "The Model 3, launched in 2017, was the first high-volume car with SiC MOSFETs in its main traction inverter, using 24 SiC modules from STMicroelectronics. SiC has no knee voltage, so at the light loads where a car spends most of its time it loses far less than an IGBT, which is commonly credited with several percent more range and less cooling. It also tolerates higher junction temperatures. The trade-offs were a more expensive device and more care with gate drive and EMI.",
      level: "screen",
    },
    {
      q: "Why do wide-bandgap materials allow thinner drift regions, and what does that buy you?",
      a: "The critical electric field rises steeply with band gap: about 0.3 MV/cm for silicon and about 2.5-3 MV/cm for 4H-SiC. The drift region needs a width of roughly 2V/Ec to block a voltage, so SiC needs about a tenth of the thickness, and it can be doped about 100× more heavily. Drift resistance goes as W/(qμN), so the ideal specific on-resistance at 1,200 V is several hundred times lower than silicon's. That is why a 1,200 V SiC device can be a fast, unipolar MOSFET, while silicon needs an IGBT with conductivity modulation and a tail current.",
      level: "deep",
    },
    {
      q: "You moved a 1 MHz charger to GaN and see ringing and false turn-on. What is going on?",
      a: "GaN switches in a few nanoseconds, so a few nanohenries in the power loop or gate loop cause big overshoot and ringing. GaN's threshold is low, around 1-1.7 V, so Miller current from a fast dv/dt through Cgd can lift the gate of the off device and cause shoot-through. I would shrink the power loop with tight bypass capacitors, use a Kelvin-source gate return and separate turn-on and turn-off resistors, and hold the off-state gate firmly at or below zero. Then I would remeasure with a high-bandwidth probe and a short ground spring, because a long ground lead creates ringing that is not really there.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Which loss grows in proportion to switching frequency?",
      choices: ["Conduction loss", "Switching loss", "Gate leakage", "Both conduction and switching equally"],
      answer: 1,
      explain:
        "Each turn-on and turn-off costs a roughly fixed energy, so P_sw = (Eon + Eoff)·f. Conduction loss depends on current and Rds(on), not on how often you switch.",
    },
    {
      q: "For the same blocking voltage, a SiC drift region can be about how much thinner than silicon's?",
      choices: ["About the same", "About 2× thinner", "About 10× thinner", "About 1,000× thinner"],
      answer: 2,
      explain:
        "SiC's critical field is about 10× silicon's (≈3 vs 0.3 MV/cm), so the drift layer can be about 10× thinner and about 100× more heavily doped, cutting ideal drift resistance by several hundred times.",
    },
    {
      q: "What causes an IGBT's tail current?",
      choices: [
        "Gate leakage through the oxide that keeps the channel partly on after turn-off",
        "Stored minority carriers in the drift region that must recombine after turn-off",
        "Reverse recovery of the gate driver's bootstrap diode feeding charge back into the gate",
        "Package inductance that keeps the collector current circulating after the switch opens",
      ],
      answer: 1,
      explain:
        "Conductivity modulation floods the drift region with holes to get a low on-voltage. At turn-off those carriers take around a microsecond to recombine, so current tails off while the voltage is already high, adding to Eoff.",
    },
    {
      q: "Where are GaN power transistors most common today?",
      choices: [
        "Multi-megawatt grid converters at 6.5 kV",
        "Compact USB-C chargers for phones and laptops",
        "Starter motors and alternators in cars",
        "The core logic gates of microcontrollers",
      ],
      answer: 1,
      explain:
        "650 V GaN HEMTs switch at hundreds of kHz to MHz with low loss, which shrinks the transformer and capacitors enough to fit a 65-140 W charger in a pocket. Their lateral structure makes very high voltages harder.",
    },
    {
      q: "A SiC MOSFET has Rds(on) = 10 mΩ at 25 °C and 1.4× that at 150 °C. At 100 A RMS and 150 °C, conduction loss is:",
      choices: ["100 W", "140 W", "196 W", "14 W"],
      answer: 1,
      explain:
        "P = I²·R = 10,000 A² × 0.014 Ω = 140 W. Sizing the heat sink with the 25 °C value would underestimate the loss by 40%.",
    },
    {
      q: "Why can a 50 V/ns switching edge cause EMI problems?",
      choices: [
        "It lowers conduction loss, which concentrates the heating into the switching instants",
        "It pushes current through stray capacitances (i = C·dv/dt) and rings the loop inductance",
        "It reduces the blocking voltage, so the drain overshoots and avalanches on every edge",
        "It raises Rds(on) by heating the channel, so the switch dissipates more at every edge",
      ],
      answer: 1,
      explain:
        "100 pF of stray capacitance at 50 V/ns carries 5 A spikes. Those common-mode currents and the ringing they excite radiate and couple into signal wiring unless gate drive, layout and filtering control them.",
    },
  ],
};

export default data;
