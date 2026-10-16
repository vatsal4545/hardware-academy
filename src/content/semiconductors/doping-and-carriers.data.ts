import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Intrinsic semiconductor",
      def: "Pure material whose carriers come only from thermal excitation, so n = p = n_i (about 1 × 10¹⁰ cm⁻³ in silicon at 300 K).",
    },
    {
      term: "Extrinsic semiconductor",
      def: "Material whose carrier densities are set by deliberately added dopants, typically 10¹⁵ to 10²⁰ atoms per cm³ in silicon devices.",
    },
    {
      term: "Donor",
      def: "A group V impurity (P, As, Sb) whose fifth electron is bound by only about 45 meV, so it is freed at room temperature, leaving a fixed positive ion. Makes n-type material.",
    },
    {
      term: "Acceptor",
      def: "A group III impurity (boron in silicon) that captures an electron from a neighbouring bond, creating a mobile hole and a fixed negative ion. Makes p-type material.",
    },
    {
      term: "Majority and minority carriers",
      def: "The more numerous carrier type (electrons in n-type) and the less numerous one (holes in n-type), linked by the mass-action law n·p = n_i².",
    },
    {
      term: "Mobility (μ)",
      def: "Drift velocity per unit field, v = μE. In lightly doped silicon about 1400 cm²/V·s for electrons and 450 for holes; it falls with heavier doping and higher temperature.",
    },
    {
      term: "Sheet resistance (R_s)",
      def: "Resistivity divided by layer thickness, in ohms per square (Ω/□). A resistor drawn in the layer has R = R_s × L/W, the number of squares.",
    },
    {
      term: "Ion implantation and activation",
      def: "Doping by firing accelerated dopant ions into the wafer, with the dose counted to about 1%. A 1000-1100 °C anneal is then needed to put the atoms on lattice sites so they become active.",
    },
  ],
  scenario: {
    title: "Two 'identical' wafers, three times the resistance",
    context:
      "A mixed-signal chip uses an implanted n-type resistor layer: phosphorus at 5 × 10¹³ cm⁻² and 150 keV, followed by a 1050 °C spike anneal, with a target sheet resistance of 500 Ω/□ ± 5%. A 25-wafer lot comes back from the line with 23 wafers on target and two that are wildly off. Production wants to know whether to scrap the two wafers and whether the implanter is drifting.",
    symptoms: [
      "Four-point probe: 23 wafers read 492-508 Ω/□, while wafers 14 and 15 read about 1.5 kΩ/□, three times the target",
      "The implanter log shows identical dose, energy and beam current for all 25 wafers",
      "SIMS on wafer 14 shows the same phosphorus depth profile, atom for atom, as a good wafer",
      "Resistors on wafers 14 and 15 are 3× too high and have a different temperature coefficient from the rest",
    ],
    hints: [
      "SIMS counts phosphorus atoms. What does a four-point probe count?",
      "What has to happen to an implanted atom before it donates an electron?",
      "Pull the equipment history for every step these two wafers went through after the implant, slot by slot.",
    ],
    rootCause:
      "Wafers 14 and 15 were in the slots the rapid-thermal-anneal tool skipped after a lamp fault aborted the recipe mid-lot, and the lot was released with the step marked complete. Their phosphorus atoms were all present, as SIMS showed, but most still sat between lattice sites in implant damage and donated no electrons. The only heat they later saw was a 700 °C deposition step, which activated roughly a third of the dose and left defects that also lower mobility, so the sheet resistance came out about three times too high.",
    fix: "Send the two wafers through the 1050 °C spike anneal and re-measure; they recovered to 502 Ω/□ and were not scrapped. Add an interlock so the manufacturing execution system will not release a lot from anneal unless every slot has a logged temperature trace, and move a four-point-probe check with a ±5% limit to right after anneal instead of waiting for end-of-line electrical test.",
    lesson:
      "Dopant atoms only become carriers once they sit on lattice sites. When the chemistry (SIMS) and the electrical measurement (four-point probe) disagree, look at activation before blaming the implanter.",
  },
  interview: [
    {
      q: "What is the difference between n-type and p-type silicon?",
      a: "N-type silicon is doped with a group V element such as phosphorus or arsenic, whose fifth valence electron is freed at room temperature, so electrons are the majority carriers. P-type silicon is doped with a group III element, almost always boron, which leaves a bond short of an electron and creates a mobile hole, so holes are the majority. In both cases the dopant ion left behind is fixed in the lattice, positive for donors and negative for acceptors. Typical doping runs from about 10¹⁵ cm⁻³ in wafers up to 10²⁰ cm⁻³ in source and drain contacts.",
      level: "screen",
    },
    {
      q: "Silicon is doped with 10¹⁷ phosphorus atoms per cm³. How many holes are there, and why?",
      a: "In equilibrium the product n times p equals n_i squared, about 10²⁰ cm⁻⁶ for silicon at 300 K. With n ≈ 10¹⁷ cm⁻³, p = 10²⁰ / 10¹⁷ = 10³ holes per cm³. The extra electrons recombine with most of the thermally generated holes, so the minority density falls as the majority density rises. Those few minority carriers still matter, because they carry leakage current and they are exactly what diodes and bipolar transistors inject.",
      level: "screen",
    },
    {
      q: "Explain drift and diffusion current and give a device where each one dominates.",
      a: "Drift is carrier motion driven by an electric field, with average velocity μE, and it dominates where majority carriers see an applied voltage, such as a resistor or the channel of a MOSFET in its linear region. Diffusion is motion down a concentration gradient, J = qD·dn/dx, and it dominates where minority carriers are injected into a region with almost no field, such as the base of a bipolar transistor. The two are linked by the Einstein relation D = μkT/q, so electrons, with about three times the mobility of holes, also diffuse about three times faster. In a p-n junction at equilibrium the drift and diffusion currents of each carrier cancel exactly, and that balance is what sets the built-in potential.",
      level: "deep",
    },
    {
      q: "Why are NMOS transistors faster than PMOS transistors of the same size, and what do designers do about it?",
      a: "An NMOS channel carries electrons and a PMOS channel carries holes, and in bulk silicon electron mobility is about 1400 against 450 cm²/V·s, roughly three times higher; in real inversion layers the ratio is closer to two or three. For the same width a PMOS delivers well under half the current, so it charges its load more slowly. Designers make PMOS devices two to three times wider to balance rise and fall times, and they prefer NAND gates, where the PMOS devices sit in parallel, over NOR gates, where they sit in series. Since Intel's 90 nm process in 2003, fabs have also strained the channel, using SiGe in the PMOS source and drain, to raise hole mobility.",
      level: "deep",
    },
    {
      q: "What is sheet resistance, and how do you measure it?",
      a: "Sheet resistance is resistivity divided by layer thickness, quoted in ohms per square, because every square of a uniform thin layer has the same edge-to-edge resistance whatever its size. A resistor drawn in that layer is R_s times its length-to-width ratio, so a 10-square strip of a 280 Ω/□ layer is 2.8 kΩ. It is measured with a four-point probe: current is forced through the two outer needles and voltage is sensed across the two inner ones, which removes contact resistance from the reading. For a thin layer on a large wafer, R_s = 4.53 × V/I.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "Which dopant makes silicon n-type?",
      choices: ["Boron", "Phosphorus", "Aluminium", "Gallium"],
      answer: 1,
      explain:
        "Phosphorus is in group V with five valence electrons; the fifth is freed at room temperature, so each atom donates an electron. Boron, aluminium and gallium are group III acceptors that make p-type material.",
    },
    {
      q: "Silicon is doped n-type with N_D = 10¹⁶ cm⁻³. What is the hole density at 300 K?",
      choices: ["10¹⁶ cm⁻³", "10¹⁰ cm⁻³", "10⁴ cm⁻³", "Exactly zero"],
      answer: 2,
      explain:
        "n·p = n_i² = 10²⁰ cm⁻⁶, so p = 10²⁰ / 10¹⁶ = 10⁴ cm⁻³. The holes are not gone; they are outnumbered a trillion to one, and they still carry leakage current.",
    },
    {
      q: "Using μn = 1400 cm²/V·s, what is the resistivity of n-type silicon doped to 10¹⁶ cm⁻³?",
      choices: ["0.45 Ω·cm", "0.045 Ω·cm", "4.5 Ω·cm", "45 Ω·cm"],
      answer: 0,
      explain:
        "σ = q·n·μn = 1.6 × 10⁻¹⁹ × 10¹⁶ × 1400 ≈ 2.24 S/cm, so ρ = 1/σ ≈ 0.45 Ω·cm. Real wafers read closer to 0.5 Ω·cm because mobility at this doping is about 1200, not 1400.",
    },
    {
      q: "In boron-doped silicon, which statement is true?",
      choices: [
        "Electrons are the majority carriers",
        "Holes are the majority carriers, and the boron ions are fixed negative charges",
        "The boron ions drift toward the negative terminal and carry the current",
        "n·p is larger than n_i² because of the added boron",
      ],
      answer: 1,
      explain:
        "Each boron atom accepts an electron from a neighbouring bond, becoming a fixed negative ion and leaving a mobile hole. The ions are locked in the lattice and only electrons and holes move. The mass-action law n·p = n_i² still holds.",
    },
    {
      q: "What does the activation anneal after ion implantation do?",
      choices: [
        "It drives the dopants deeper until they reach the target junction depth",
        "It grows an oxide over the implanted layer to protect it",
        "It strips the photoresist mask used during the implant",
        "It moves implanted atoms onto lattice sites and repairs implant damage so they become electrically active",
      ],
      answer: 3,
      explain:
        "Implanted ions mostly stop between lattice sites among knocked-out silicon atoms and donate no carriers. A 1000-1100 °C anneal lasting seconds or less repairs the crystal and puts the dopants on substitutional sites. Anneals are kept that short precisely to limit unwanted diffusion.",
    },
    {
      q: "Electron mobility in silicon is 1400 cm²/V·s. What is the electron diffusion constant at 300 K?",
      choices: ["1.4 cm²/s", "12 cm²/s", "36 cm²/s", "1400 cm²/s"],
      answer: 2,
      explain:
        "The Einstein relation gives D = μkT/q = 1400 × 0.0259 V ≈ 36 cm²/s. Holes, with μp ≈ 450 cm²/V·s, have Dp ≈ 12 cm²/s, which is why minority-electron devices such as NPN transistors are faster than PNP ones.",
    },
    {
      q: "A resistor is drawn 100 µm long and 10 µm wide in a layer with R_s = 50 Ω/□. What is its resistance?",
      choices: ["5 Ω", "50 Ω", "5 kΩ", "500 Ω"],
      answer: 3,
      explain:
        "L/W = 100/10 = 10 squares, and each square is 50 Ω, so R = 500 Ω. The absolute size does not matter, only the number of squares, which is why layout engineers count squares.",
    },
  ],
};

export default data;
