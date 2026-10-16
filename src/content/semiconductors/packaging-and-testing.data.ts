import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Wafer sort (probe)",
      def: "Electrical test of every die on the wafer through a probe card before dicing; failing dies are recorded in a wafer map and never packaged.",
    },
    {
      term: "Wire bond",
      def: "A 15-50 µm gold or copper wire welded from a die pad to the lead frame or substrate. Cheap and flexible, but limited to the die edge and adds about 1 nH per millimetre.",
    },
    {
      term: "Flip chip",
      def: "Die mounted face-down on solder bumps or copper pillars spread over its whole area: thousands of short connections, with heat leaving through the back of the die.",
    },
    {
      term: "BGA",
      def: "Ball grid array: an area array of solder balls under the package, typically at 0.4-1.27 mm pitch, giving hundreds to thousands of connections.",
    },
    {
      term: "Interposer (2.5D)",
      def: "A silicon or organic layer with fine wiring and through-silicon vias on which several dies sit side by side, such as TSMC CoWoS carrying a GPU and HBM stacks.",
    },
    {
      term: "HBM",
      def: "High-bandwidth memory: 8-16 DRAM dies stacked with TSVs, exposing a 1024-bit interface per stack (about 0.8-1.2 TB/s) right next to the processor.",
    },
    {
      term: "θJA",
      def: "Junction-to-ambient thermal resistance in °C/W, so Tj = Ta + P·θJA. Datasheet values are measured on a JEDEC test board and change with your PCB.",
    },
    {
      term: "Electromigration",
      def: "Metal atoms pushed along by electron current, opening voids in lines and bumps. Black's equation: lifetime ∝ J⁻² and falls exponentially with temperature.",
    },
    {
      term: "Burn-in",
      def: "Running parts hot (for example 125 °C) at raised voltage for hours so weak, infant-mortality parts fail in the factory instead of in the field.",
    },
  ],
  scenario: {
    title: "QFN pins open after reflow at a new contract manufacturer",
    context:
      "A motor-controller board uses a 5 × 5 mm, 32-pin QFN gate driver with a 3.5 × 3.5 mm exposed thermal pad and nine thermal vias. The design moves to a new contract manufacturer with a freshly cut stencil. On the first 2,000 boards, 4% fail end-of-line test with driver faults, and two field units come back after a week of thermal cycling.",
    symptoms: [
      "Failing boards show one or two QFN perimeter pins open; pressing on the package makes the fault disappear.",
      "X-ray shows 35-50% voiding in the thermal-pad joint and the package sitting visibly tilted, with some edge joints barely wetted.",
      "Boards that pass run the driver about 20 °C hotter than boards from the previous manufacturer.",
    ],
    hints: [
      "Compare the new stencil with the old one, especially the aperture over the thermal pad.",
      "If a thick layer of molten solder sits under the centre pad, what happens to the package height above the perimeter pads?",
      "Open thermal vias in the pad pull solder down and let flux gases escape up through the joint.",
    ],
    rootCause:
      "The new manufacturer cut a single full-size aperture over the thermal pad in a 150 µm stencil, printing nearly 100% paste coverage. During reflow the big centre deposit floated the package and outgassed through the open thermal vias. The perimeter leads lifted off their paste (opens), and the centre joint was left full of voids, which raised thermal resistance and explains the hotter running parts.",
    fix: "Redesign the stencil: split the thermal-pad aperture into a 3 × 3 window pane covering about 50-60% of the pad, use a 125 µm foil, and tent or plug the thermal vias. Add an X-ray check with a voiding limit of about 25% to first-article inspection, and requalify with thermal cycling before shipping.",
    lesson:
      "For a QFN, the paste volume on the thermal pad controls both the perimeter joints and the heat path; the stencil is part of the package design.",
  },
  interview: [
    {
      q: "Compare wire bonding and flip chip.",
      a: "Wire bonding connects pads on the edge of the die to the package with 15-50 µm gold or copper wires. It is cheap, mature and tolerant of die changes, but I/O is limited to the perimeter and each millimetre of wire adds about 1 nH of inductance. Flip chip turns the die face down onto an area array of bumps or copper pillars, so a big die can have thousands of short, low-inductance connections, and heat leaves through the back of the die into a lid. Most microcontrollers and analog parts are wire-bonded; CPUs, GPUs and high-speed networking chips are flip chip.",
      level: "screen",
    },
    {
      q: "A regulator dissipates 1.5 W in a package with θJA = 40 °C/W at 50 °C ambient. Is it OK?",
      a: "The junction temperature is Ta + P·θJA = 50 + 1.5 × 40 = 110 °C. That is under a typical 125 °C limit, but with only 15 °C of margin, and θJA was measured on a JEDEC board that may have more copper than mine. I would check the copper area and thermal vias under the exposed pad, look for a package with lower θJA, or cut the dissipation, for example by replacing an LDO with a buck converter.",
      level: "screen",
    },
    {
      q: "What are chiplets and why is the industry moving to them?",
      a: "A chiplet design splits one large chip into several smaller dies connected inside one package, such as AMD's EPYC with up to 12 CPU dies around one I/O die. Small dies yield far better because yield falls exponentially with area. Each function can use its best process, like CPU cores on 5 nm and I/O on 6 nm, and the total can exceed the 858 mm² reticle limit of a single die. The costs are die-to-die interface power and latency, harder packaging, and the need to test dies well enough that only known good dies get assembled.",
      level: "screen",
    },
    {
      q: "Why do solder joints fail under thermal cycling, and how do packages manage it?",
      a: "Silicon expands about 2.6 ppm/°C and an FR-4 board about 14-17 ppm/°C, so every temperature swing shears the joints that connect them. Each cycle adds a little plastic strain and a crack grows until the joint opens; the Coffin-Manson relation says life drops steeply as the temperature swing grows. Underfill locks the die to the substrate so flip-chip bumps share the strain, and larger balls, corner glue or compliant substrates help BGAs. Qualification runs something like 1,000 cycles from −55 °C to 125 °C and then cross-sections joints to look for crack growth.",
      level: "deep",
    },
    {
      q: "What is HBM, and why does an AI accelerator need advanced packaging?",
      a: "HBM stacks 8 to 12 or more DRAM dies with through-silicon vias and exposes a 1024-bit interface per stack, giving roughly 0.8-1.2 TB/s per stack. A bus that wide needs thousands of wires at tens of micrometres pitch, which only a silicon interposer or bridge can carry, not a normal organic substrate or PCB. So a GPU like NVIDIA's H100 sits beside its HBM stacks on a TSMC CoWoS interposer. In 2023 and 2024 that packaging capacity, not wafer capacity, was the bottleneck on AI accelerator supply.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Which package has no protruding leads and a large exposed thermal pad underneath?",
      choices: ["DIP", "SOIC", "QFN", "TO-220"],
      answer: 2,
      explain:
        "A quad flat no-lead package has pads under its edges and an exposed die pad soldered to the PCB. That gives low inductance and good heat flow, but the joints are hidden and need X-ray inspection.",
    },
    {
      q: "θJA = 40 °C/W, P = 1.5 W and Ta = 50 °C. What is the junction temperature?",
      choices: ["60 °C", "90 °C", "110 °C", "140 °C"],
      answer: 2,
      explain:
        "Tj = Ta + P·θJA = 50 + 1.5 × 40 = 110 °C. It is under a 125 °C limit with only 15 °C of margin, so check the board's real copper area before relying on it.",
    },
    {
      q: "What is the main job of underfill in a flip-chip package?",
      choices: [
        "Insulating the die electrically",
        "Spreading thermal-expansion strain so the bumps do not crack",
        "Gluing the lid to the substrate",
        "Lowering the dielectric constant of the bumps",
      ],
      answer: 1,
      explain:
        "Underfill epoxy locks die and substrate together so the expansion mismatch is carried by the whole area instead of concentrating in the tiny bumps. Without it, flip-chip bumps can crack within a few hundred cycles.",
    },
    {
      q: "Why do manufacturers burn in parts?",
      choices: [
        "To measure θJA",
        "To program firmware into the chip",
        "To make early, infant-mortality failures happen before parts ship",
        "To anneal the dopants",
      ],
      answer: 2,
      explain:
        "The bathtub curve starts with a falling early-failure rate. Running parts hot at raised voltage for hours ages them past that region, so weak parts fail in the factory rather than in a customer's car.",
    },
    {
      q: "What limits a single monolithic die to about 858 mm²?",
      choices: [
        "The 300 mm wafer diameter",
        "The scanner's 26 × 33 mm exposure field (the reticle limit)",
        "The largest available BGA package",
        "The number of probe-card needles",
      ],
      answer: 1,
      explain:
        "A scanner exposes one 26 × 33 mm field at a time, so a bigger die would need stitching. Designs that want more silicon split into chiplets, as NVIDIA's B200 does with two reticle-sized dies.",
    },
    {
      q: "Electromigration lifetime gets shorter when...",
      choices: [
        "current density and temperature increase",
        "the wire gets thicker",
        "the die is thinned",
        "the clock frequency drops",
      ],
      answer: 0,
      explain:
        "Black's equation gives MTTF ∝ J⁻ⁿ·exp(Ea/kT) with n ≈ 2, so doubling current density cuts life by about 4× and running hotter cuts it exponentially. That is why power rails and bumps have current-density rules.",
    },
  ],
};

export default data;
