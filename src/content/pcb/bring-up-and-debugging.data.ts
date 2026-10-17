import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Bring-up",
      def: "The staged process of powering and testing a new board: inspect, check rails with the power off, power up with a current limit, then enable clocks, programming and each peripheral in turn so every fault is found while it is still a single fault.",
    },
    {
      term: "Current limit (constant-current mode)",
      def: "A bench supply setting that caps the current. When a short pulls more than the limit, the supply holds the current and lets the voltage collapse, which is both the protection and the symptom to read.",
    },
    {
      term: "Burden voltage",
      def: "The voltage a meter's current range drops in series with the circuit. It can starve a low-voltage rail, which is why current ranges are used sparingly and fused.",
    },
    {
      term: "Probe ground inductance",
      def: "The inductance of a scope probe's ground path: about 150 nH for a 15 cm clip lead against about 10 nH for a spring tip. With the probe's roughly 10 pF it forms a resonance that rings on fast edges.",
    },
    {
      term: "Bandwidth and rise time",
      def: "A scope's rise time is about 0.35 divided by its bandwidth, so a 100 MHz scope cannot show an edge faster than about 3.5 ns. Pick a bandwidth of at least five times the highest clock you care about.",
    },
    {
      term: "Logic analyzer",
      def: "An instrument that records many digital channels and decodes protocols such as I2C, SPI and UART. It shows which bits were sent, not whether the edges were clean.",
    },
    {
      term: "Emissivity",
      def: "How well a surface radiates infrared compared with an ideal black body. Bare copper and shiny solder are about 0.1 and read cold on a thermal camera; mould compound and solder mask are about 0.9 and read true.",
    },
    {
      term: "Cold joint",
      def: "A dull, grainy solder joint formed without enough heat or time above liquidus. It may conduct at first and fail intermittently with vibration or temperature.",
    },
    {
      term: "Drag soldering",
      def: "Removing a solder bridge between fine-pitch pins by dragging a flux-loaded, solder-wetted tip or wick across the leads so the surface tension pulls solder away.",
    },
    {
      term: "Bisecting a fault",
      def: "Splitting a system in half and testing the midpoint to decide which half contains the fault, then repeating. It finds a fault in a handful of measurements instead of dozens.",
    },
    {
      term: "First article",
      def: "The first assembled board from a new design or a new assembler. It is inspected and brought up in full before the rest of the batch is released.",
    },
  ],
  scenario: {
    title: "New board draws 800 mA at idle",
    context:
      "The first assembled motor-driver board arrives. The expected idle current is 60 to 80 mA. The bench supply is set to 7.4 V with its limit left at 0.8 A from an earlier job; the display shows 0.80 A and the voltage has collapsed to about 1.9 V, constant-current mode. The 3V3 rail reads 0.6 V instead of 3.3 V, and there is a faint smell near the regulator.",
    symptoms: [
      "The supply is pinned at its 0.8 A limit and the output voltage has collapsed to about 1.9 V",
      "The 3V3 rail reads 0.6 V; with power off, 3V3 to GND measures about 0.5 Ω",
      "The AMS1117 is warm but not hot, and a faint smell comes from beside it",
      "Replacing the regulator with a known-good one changes nothing",
    ],
    hints: [
      "What does a supply voltage that collapses at constant current say about the load? Where is the resistance, and how much power does it dissipate?",
      "Disconnect the battery and inject about 1 V at 0.5 A straight into the 3V3 rail, so the regulator is out of the picture. What does the thermal camera show?",
      "Which parts on the 3V3 net are polarised, and does each one match the assembler's placement preview?",
    ],
    rootCause:
      "C5, the 22 µF tantalum on the AMS1117 output, was soldered 180 degrees rotated. The assembler's pick-and-place library used a different zero orientation for that tantalum case than the KiCad footprint, and nobody compared the placement preview with the board. A tantalum has almost no tolerance for reverse voltage, so it conducts heavily and pulls the 3V3 rail toward ground. With 0.5 A injected into the rail the thermal camera showed C5 at 85 °C against 28 °C elsewhere.",
    fix:
      "Remove C5 and fit a new one with the stripe, which marks the positive end, on the 3V3 side. Check the regulator for thermal damage, then check every tantalum, diode and LED on the board against the datasheet and the assembler's preview. Correct the rotation offset for that footprint in the position file or in the assembler's preview before the next order. From now on set the supply limit just above the expected current, 100 to 150 mA here, so a fault like this stops at a fraction of the heat.",
    lesson:
      "Limit the current before you power up, inject current at the rail instead of at the battery, and let a thermal camera show where the short is instead of guessing.",
  },
  interview: [
    {
      q: "A new board arrives from the assembler. What do you do before you apply power?",
      a: "I inspect it under magnification for polarity, pin 1 orientation, solder bridges and missing parts, comparing every polarised part with the assembler's placement preview. Then, with power off, I measure the resistance from each supply rail to ground and from rail to rail; a reading near zero means a short and I stop there. Only after that do I connect a bench supply set to the right voltage with the current limit just above the expected idle current, with motors and loads unplugged. I raise the voltage from zero and watch the current as I go.",
      level: "screen",
    },
    {
      q: "How do you measure a fast edge accurately with an oscilloscope?",
      a: "I need enough bandwidth, since a scope's rise time is about 0.35 divided by its bandwidth and it will round off any edge near that speed. I use a 10x probe with a short spring ground tip touching a ground pad beside the signal pad instead of the long clip lead. A 15 cm clip adds about 150 nH, which with the probe's 10 pF rings near 130 MHz and picks up magnetic noise through its large loop. I also check the probe's compensation first, and I never clip the ground to a node that is not at ground.",
      level: "screen",
    },
    {
      q: "The board draws far more current than expected at first power-up. How do you find the cause?",
      a: "I stop at once, because the current limit has done its job. Power off, I check the resistance of each rail to ground to see which rail is shorted. Then I inject current straight into that rail, about 1 V at 0.5 A, so the regulator is out of the picture, and look with a thermal camera for the part that warms up. A reversed capacitor, a reversed IC or a damaged part will glow, but a dead short makes almost no heat, so for those I measure millivolts along the rail and follow the voltage down to the short. I confirm by removing the suspect and re-measuring.",
      level: "deep",
    },
    {
      q: "When do you reach for a logic analyzer instead of a scope?",
      a: "When the question is what bits were sent, not what the signal looked like. A logic analyzer captures eight or sixteen digital channels at once and decodes I2C, SPI and UART, so I can see an address byte, a missing acknowledge or a wrong clock polarity over thousands of transactions. It will not show ringing, slow edges or low levels, so when a bus misbehaves I use the analyzer to see the traffic and then the scope to check the electrical quality of one line. I sample at least four times faster than the bus clock and set the threshold for the logic level.",
      level: "screen",
    },
    {
      q: "Describe your systematic method for debugging an intermittent fault.",
      a: "I make the fault repeatable first, for example by triggering a single-shot scope capture on the rail dip. Then I bisect: measure a node in the middle of the system, decide which half holds the fault, and repeat. I change one variable at a time and write down every reading, the board serial and the setup, because intermittent faults hide in what I forgot I changed. If I have a known-good board I compare the same node on both, and I only declare it fixed after the original condition fails to reproduce several times.",
      level: "deep",
    },
    {
      q: "How do you tell the polarity of a tantalum capacitor from an aluminium electrolytic?",
      a: "On a moulded SMD tantalum the stripe or bevelled end marks the positive terminal. On an aluminium electrolytic can the stripe or dark band marks the negative terminal, which is the opposite convention. On a diode the band marks the cathode. I do not rely on memory for a new part: I check the datasheet marking drawing and the footprint's silkscreen, because a tantalum fitted backwards can fail short and burn.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "What is the first measurement to make on a freshly assembled board?",
      choices: [
        "The 3V3 rail voltage with power applied",
        "Resistance from each supply rail to ground with power off",
        "The crystal frequency on a scope",
        "The motor driver output waveform",
      ],
      answer: 1,
      explain:
        "With power off, a rail that reads a few ohms to ground is a short, and finding it now costs nothing. Applying power first risks heating or destroying parts. Inspection under magnification comes before even this, and a current-limited power-up comes after.",
    },
    {
      q: "On a moulded SMD tantalum capacitor, the stripe marks",
      choices: ["The negative terminal", "The positive terminal", "The case ground", "The end that should face the regulator"],
      answer: 1,
      explain:
        "The stripe on a moulded tantalum marks the positive terminal, the reverse of an aluminium electrolytic's stripe, which marks the negative terminal. Tantalums tolerate almost no reverse voltage, so a rotated one can conduct heavily and burn.",
    },
    {
      q: "Which probe ground connection gives the least ringing on a 1 ns edge?",
      choices: [
        "A 15 cm alligator clip lead to a distant ground point",
        "A 1.5 cm spring ground tip touching a ground pad beside the signal",
        "No ground connection at all",
        "A ground wire twisted around the probe cable",
      ],
      answer: 1,
      explain:
        "A short ground path has roughly 10 nH of inductance and a tiny loop, so with the probe's 10 pF it resonates above 500 MHz. A 15 cm clip has about 150 nH and rings near 130 MHz, and its big loop also picks up noise. With no ground the probe cannot work.",
    },
    {
      q: "A scope has 100 MHz of bandwidth. The fastest edge it can show without major rounding is about",
      choices: ["0.35 ns", "3.5 ns", "35 ns", "350 ns"],
      answer: 1,
      explain:
        "Rise time is about 0.35 divided by bandwidth, so 0.35 / 100 MHz = 3.5 ns. Edges much faster than that are displayed with the scope's own rise time added in quadrature, so a 1 ns edge would look about 3.6 ns long.",
    },
    {
      q: "Which instrument would you use to see whether an I2C sensor is receiving the address byte?",
      choices: ["A multimeter in DC volts", "A logic analyzer with an I2C decoder", "A thermal camera", "A current probe"],
      answer: 1,
      explain:
        "A logic analyzer captures the clock and data lines and decodes the address and acknowledge bits. A scope can show the same signals but without decoding. A multimeter averages away the fast signals, and neither a thermal camera nor a current probe shows protocol content.",
    },
    {
      q: "A supply set to 7.4 V with a 150 mA limit shows 150 mA at 1.2 V on first power-up. The most likely explanation is",
      choices: [
        "The board is working normally",
        "The supply is faulty",
        "A short or a very heavy load on one of the rails",
        "The oscilloscope probe is loading the board",
      ],
      answer: 2,
      explain:
        "Constant current with a collapsed voltage means the load looks like a very low resistance. Here 1.2 V / 0.15 A is about 8 Ω overall, far less than a working board. Power off, then check each rail's resistance to ground and inject current at the suspect rail.",
    },
    {
      q: "A thermal camera shows a shiny solder joint cooler than the plastic part beside it, though both are at the same temperature. Why?",
      choices: [
        "The solder conducts heat away from the camera",
        "Shiny metal has low emissivity, so it radiates less infrared and reads cold",
        "The camera is out of focus",
        "Solder is cooler than plastic by nature",
      ],
      answer: 1,
      explain:
        "Bare copper and shiny solder have an emissivity around 0.1, while plastic, mould compound and solder mask are around 0.9. The camera converts radiated infrared to temperature assuming a high emissivity, so shiny metal reads far too low. Look at part bodies and mask instead.",
    },
  ],
};
export default data;
