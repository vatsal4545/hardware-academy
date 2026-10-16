import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Valence band",
      def: "The highest band that is completely full at 0 K. In silicon it holds the four bonding electrons of every atom, and a full band carries no net current.",
    },
    {
      term: "Conduction band",
      def: "The lowest band above the valence band, empty at 0 K. An electron promoted into it is free to move through the crystal and carry current.",
    },
    {
      term: "Band gap (Eg)",
      def: "The forbidden energy range between the valence and conduction bands: 1.12 eV for Si, 0.66 eV for Ge, 1.42 eV for GaAs, 3.26 eV for 4H-SiC, 3.4 eV for GaN and about 9 eV for SiO₂.",
    },
    {
      term: "Intrinsic carrier density (n_i)",
      def: "Free electrons (and an equal number of holes) per cm³ in pure material from heat alone: about 1 × 10¹⁰ cm⁻³ in silicon at 300 K, roughly doubling every 10 °C.",
    },
    {
      term: "Hole",
      def: "The empty state an excited electron leaves in the valence band. Neighbouring electrons shuffle into it, so it moves like a positive carrier with charge +q.",
    },
    {
      term: "Thermal energy (kT)",
      def: "Boltzmann's constant times absolute temperature: 25.9 meV at 300 K. Carrier density depends on exp(−Eg/2kT), so a small change in Eg/kT moves n_i by orders of magnitude.",
    },
    {
      term: "Diamond cubic lattice",
      def: "The crystal structure of Si, Ge and diamond: every atom bonds to four neighbours at 109.5°. Silicon's cube is 0.543 nm on a side, giving 5 × 10²² atoms per cm³.",
    },
    {
      term: "Wide-bandgap semiconductor",
      def: "A semiconductor with a gap well above silicon's, such as 4H-SiC (3.26 eV) or GaN (3.4 eV). It leaks far less when hot and withstands about ten times the electric field of silicon.",
    },
  ],
  scenario: {
    title: "Sensor board reads garbage above 125 °C",
    context:
      "An engine-bay pressure sensor module passed every bench test and went into AEC-Q100 Grade 1 qualification (−40 to +125 °C ambient). The bridge amplifier drives a 1 MΩ series resistor and a 10 nF capacitor, a 16 Hz anti-alias filter, and a BAV99 dual switching diode clamps the filtered node to the 3.3 V and ground rails to protect the ADC input. At 25 °C the reading is accurate to 0.1%. In the thermal chamber it starts drifting above 85 °C and is useless at 125 °C.",
    symptoms: [
      "Within 0.1% at 25 °C, about 2% high at 85 °C, and nearly 1 V (30% of full scale) off at 125 °C",
      "The error is smooth and repeatable, and it disappears completely when the chamber cools; nothing is damaged",
      "Swapping the pressure sensor for a precision resistor bridge does not change the drift",
      "A second board built with a 10 kΩ filter resistor for a different customer drifts far less",
    ],
    hints: [
      "Junction leakage roughly doubles every 10 °C. How many doublings are there between 25 °C and 125 °C?",
      "Which node in the signal chain has the highest impedance, and which p-n junctions are connected to it?",
      "Warm one small area of the board at a time with a hot-air pencil while watching the reading.",
    ],
    rootCause:
      "The two clamp diodes leak into the 1 MΩ node, and their leakage currents do not cancel. The mismatch is about 1 nA at 25 °C, a harmless 1 mV across 1 MΩ. Reverse leakage comes from thermally generated carriers, which follow exp(−Eg/2kT) and roughly double every 10 °C, so by 125 °C the mismatch is 2¹⁰ × 1 nA ≈ 1 µA, and 1 µA × 1 MΩ = 1 V of error. The sensor was never the problem.",
    fix: "Cut the node impedance 100×: 10 kΩ with 1 µF keeps the same 16 Hz corner, so 1 µA of leakage becomes 10 mV. Replace the BAV99 with a picoamp-class low-leakage clamp such as the BAV199, or rely on the ADC's own clamps behind the series resistor. Re-qualify at 125 °C with margin to 150 °C, and add 'worst-case leakage × node impedance at maximum temperature' to the design-review checklist.",
    lesson:
      "In silicon, leakage usually sets the temperature ceiling before gain does. Every junction on a high-impedance node is a current source that grows about 1000× between room temperature and 125 °C.",
  },
  interview: [
    {
      q: "Why is silicon a semiconductor while copper is a conductor and glass is an insulator?",
      a: "It comes down to how full the bands are and how big the gap is. In copper the highest occupied band is only partly full, so roughly 10²³ electrons per cm³ have empty states right next to them and conduct at any temperature. In glass the valence band is full and the gap is about 9 eV, hundreds of times the 26 meV of thermal energy at room temperature, so essentially no electrons get across. Silicon also has a full valence band, but its gap is only 1.12 eV, so about 10¹⁰ electrons per cm³ are thermally excited at 300 K, and doping can then set its conductivity over many orders of magnitude.",
      level: "screen",
    },
    {
      q: "What are the band gaps of Si, SiC and GaN, and why do EV and charger makers care?",
      a: "Silicon is 1.12 eV, 4H silicon carbide is 3.26 eV and gallium nitride is 3.4 eV. A wider gap means far fewer thermally generated carriers, so leakage stays low at 175-200 °C, and the critical electric field is roughly ten times silicon's. That lets a 1200 V device use a drift layer about ten times thinner and much more heavily doped, which cuts on-resistance and switching loss. That is why 800 V traction inverters use SiC MOSFETs and compact USB-C chargers use GaN transistors.",
      level: "screen",
    },
    {
      q: "Why does leakage rise so quickly with temperature, and how would you design an analog front end that must work at 150 °C?",
      a: "Reverse leakage comes from thermally generated carriers, and the intrinsic carrier density goes as T^1.5 × exp(−Eg/2kT), so in silicon it roughly doubles every 10 °C. From 25 °C to 150 °C that is more than three orders of magnitude, so a 1 nA leak at room temperature becomes several microamps. I would keep every node that touches a junction at low impedance, budget leakage times impedance at the maximum temperature, and choose low-leakage clamps and CMOS- or JFET-input amplifiers characterized at 150 °C. For harsher jobs, such as downhole tools at 200 °C, I would move to SOI or SiC parts, where the buried oxide or the wider gap keeps leakage down.",
      level: "deep",
    },
    {
      q: "Why did silicon beat germanium and gallium arsenide for mainstream integrated circuits?",
      a: "Germanium came first, but its 0.66 eV gap makes it leaky above about 70 °C and its oxide dissolves in water, so it cannot protect or insulate a surface. Silicon grows a stable, high-quality SiO₂ simply by heating it in oxygen, and that native oxide made the planar process and the MOSFET possible around 1959-1960. Silicon is also abundant, about 28% of the Earth's crust, strong enough to be grown into 300 mm wafers, and its 1.12 eV gap keeps leakage manageable to about 150 °C. GaAs has roughly six times the electron mobility, but it has no usable native oxide and comes on smaller, costlier wafers, so it stays in RF amplifiers, lasers and LEDs.",
      level: "deep",
    },
    {
      q: "What is the difference between a direct and an indirect band gap?",
      a: "In a direct-gap material such as GaAs or GaN, the bottom of the conduction band and the top of the valence band sit at the same crystal momentum, so an electron can fall across the gap and emit a photon on its own. In an indirect-gap material such as silicon, the electron must also trade momentum with a lattice vibration (a phonon), which makes light emission tens of thousands of times less likely. That is why LEDs and laser diodes use GaAs, InGaN and similar compounds. Silicon still absorbs light above its gap well enough to make good solar cells and camera sensors.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "What is the band gap of silicon at room temperature?",
      choices: ["0.66 eV", "1.12 eV", "3.26 eV", "About 9 eV"],
      answer: 1,
      explain:
        "Silicon's gap is 1.12 eV at 300 K. 0.66 eV is germanium, 3.26 eV is 4H-SiC and about 9 eV is SiO₂, the insulating oxide silicon grows on itself.",
    },
    {
      q: "Why can't the electrons in a completely full valence band carry a net current?",
      choices: [
        "They are bound too tightly to their atoms to move at all",
        "The band gap repels them from the metal contacts",
        "Their effective mass becomes infinite in a full band",
        "Every state is occupied, so for each electron moving one way another moves the opposite way",
      ],
      answer: 3,
      explain:
        "Current needs empty states for electrons to move into. In a full band every momentum state is taken and the contributions cancel exactly. Remove one electron to make a hole and the band can conduct, which is why holes count as carriers.",
    },
    {
      q: "Which of these materials has the widest band gap?",
      choices: ["GaAs", "Ge", "GaN", "Si"],
      answer: 2,
      explain:
        "GaN is 3.4 eV, slightly wider than 4H-SiC at 3.26 eV. GaAs is 1.42 eV, Si 1.12 eV and Ge 0.66 eV. A wide gap means low leakage when hot and a high breakdown field, which is why GaN and SiC dominate new power electronics.",
    },
    {
      q: "About how many free electrons per cm³ does pure silicon have at 300 K?",
      choices: ["10¹⁰", "10⁴", "10¹⁶", "10²²"],
      answer: 0,
      explain:
        "n_i ≈ 1 × 10¹⁰ cm⁻³. Silicon has 5 × 10²² atoms per cm³, so only about one atom in five trillion has given up an electron. 10²² to 10²³ is the free-electron density of a metal.",
    },
    {
      q: "Using the rule that n_i doubles every 10 °C, by how much does it rise between 25 °C and 85 °C?",
      choices: ["6×", "12×", "64×", "600×"],
      answer: 2,
      explain:
        "60 °C is six doublings: 2⁶ = 64. The same rule predicts about 1000× from 25 °C to 125 °C, which is why high-impedance analog nodes are the first thing to fail when a board gets hot.",
    },
    {
      q: "Why do 800 V EV traction inverters use SiC MOSFETs rather than silicon devices?",
      choices: [
        "SiC wafers are cheaper than silicon wafers",
        "SiC has a direct band gap, so it switches faster",
        "SiC's wide gap gives about 10× the critical field, so 1200 V parts have thin, low-resistance drift layers and stay low-leakage when hot",
        "Electrons move about six times faster in SiC than in silicon",
      ],
      answer: 2,
      explain:
        "The 3.26 eV gap raises the critical field to about 2.8 MV/cm versus 0.3 MV/cm in silicon, so the drift layer can be about ten times thinner and far more heavily doped, cutting conduction and switching loss. SiC wafers actually cost several times more than silicon, its gap is indirect, and its electron mobility is lower than silicon's.",
    },
  ],
};

export default data;
