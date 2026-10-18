import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Czochralski (CZ) growth",
      def: "Pulling a single-crystal silicon ingot from a melt at about 1,420 °C on a rotating seed; it produces the 300 mm ingots that are sliced into 775 µm wafers.",
    },
    {
      term: "Photolithography",
      def: "Printing a reticle pattern into light-sensitive resist with a scanner. Resolution ≈ k1·λ/NA, so 193 nm immersion (NA 1.35) prints about 38 nm half-pitch in one exposure.",
    },
    {
      term: "EUV lithography",
      def: "Extreme-ultraviolet lithography at 13.5 nm, using light from laser-hit tin droplets and mirrors in vacuum. ASML is the only supplier; a scanner costs about $200 million.",
    },
    {
      term: "Plasma (dry) etch",
      def: "Ions and reactive radicals from a low-pressure plasma remove material straight down (anisotropically), giving the vertical sidewalls that wet etching cannot.",
    },
    {
      term: "Ion implantation",
      def: "Firing dopant ions (B, P, As) into the wafer at keV-MeV energies with a precise dose, then annealing to repair the lattice and activate the dopant.",
    },
    {
      term: "CMP",
      def: "Chemical mechanical planarization: a rotating pad and abrasive slurry polish the wafer flat to nanometres so the next lithography layer stays inside its ~100 nm depth of focus.",
    },
    {
      term: "Damascene copper",
      def: "Etch trenches and vias into the dielectric, line them with a TaN/Ta barrier, electroplate copper, then polish the excess off with CMP. Used for every modern copper wiring layer.",
    },
    {
      term: "FEOL / BEOL",
      def: "Front end of line builds the transistors in the silicon; back end of line builds the 10-15+ copper wiring layers above them, all below about 400 °C.",
    },
    {
      term: "Defect density (D0)",
      def: "Killer defects per cm². With the Poisson model Y = exp(−A·D0), a 1 cm² die at D0 = 0.1 /cm² yields about 90%.",
    },
  ],
  scenario: {
    title: "Yield drops after a CMP pad change",
    context:
      "A 300 mm fab runs a 28 nm process at a steady 92% sort yield on a 1 cm² automotive microcontroller. On Monday the copper CMP tool that polishes metal 2 gets its scheduled pad replacement. By Thursday, sort yield on lots that went through that tool has fallen to 81%, and the yield engineer on call is asked to find out why before more wafers are scrapped.",
    symptoms: [
      "Sort yield on affected lots falls from 92% to 81%, while lots polished on the sister CMP tool stay at 92%.",
      "Wafer maps show failing dies in long arcs and lines that cross die boundaries instead of random single dies.",
      "Electrical failures are metal-2 shorts and opens, and inline brightfield inspection after M2 CMP shows defect counts up 4×, classified as scratches.",
    ],
    hints: [
      "Arc-shaped signatures that follow the polishing motion point to a mechanical source, not lithography or deposition.",
      "What changed on that tool the day the excursion started, and what is the first stretch of a new pad's life normally used for?",
      "Check the pad break-in and conditioning log and the slurry point-of-use filter installed with the new consumables.",
    ],
    rootCause:
      "The new pad went into production after a shortened break-in. The diamond conditioner had not yet opened up the pad surface, so agglomerated slurry particles caught on the glazed pad and dragged micro-scratches across the copper. Scratches bridged neighbouring M2 lines (shorts) or tore copper out of narrow lines (opens). Defect density rose from about 0.08 to 0.21 per cm², which at 1 cm² per die is exactly the drop from 92% to 81% predicted by Y = exp(−A·D0).",
    fix: "Take the tool down, rerun the full pad break-in and conditioning recipe, replace the slurry filter, and requalify on monitor wafers with post-CMP inspection before release. Put extra inspection on the affected lots, add an SPC limit on post-CMP scratch counts, and add an interlock that blocks production until the break-in is logged.",
    lesson:
      "Yield excursions almost always follow a change. Match the wafer-map signature to a tool, use inline inspection to find the layer, and use the yield model to check that the defect density you found explains the yield you lost.",
  },
  interview: [
    {
      q: "Walk me through the steps used to pattern one layer.",
      a: "First you deposit or grow the film you want to pattern, then spin on photoresist and bake it. The scanner exposes the resist through a reticle, and in a positive resist the developer dissolves the exposed areas. A plasma etch transfers that opening into the film, then the resist is stripped and the wafer is cleaned and inspected. That loop, with implants, depositions and CMP in between, repeats for every mask layer, which is 60 or more times on a leading-edge chip.",
      level: "screen",
    },
    {
      q: "What is the difference between DUV immersion and EUV lithography?",
      a: "DUV immersion uses 193 nm light from an ArF excimer laser, with water between the lens and the wafer to reach a numerical aperture of 1.35, which prints about 38-40 nm half-pitch in one exposure. Anything tighter needs multiple patterning, which adds masks, steps and overlay error. EUV uses 13.5 nm light made by hitting tin droplets with a CO2 laser, and because almost everything absorbs it, the optics are multilayer mirrors in vacuum. One EUV exposure can replace three or four DUV exposures on critical layers, which is why 7 nm-class nodes and below adopted it despite each scanner costing about $200 million.",
      level: "screen",
    },
    {
      q: "What do FEOL and BEOL mean, and why does the split matter?",
      a: "FEOL, front end of line, builds the transistors in the silicon: isolation, wells, gate stack, source and drain. BEOL, back end of line, builds the copper wiring and low-k dielectric layers on top, often 10 to 15 or more levels. The split is mostly about thermal budget: once copper and low-k films are on the wafer, everything must stay below about 400 °C, so all high-temperature anneals must be finished in the FEOL. The two halves also use different tools and different engineering teams.",
      level: "screen",
    },
    {
      q: "Yield on a large die is poor. How would you estimate it and what could you change?",
      a: "I would start with the Poisson model, Y = exp(−A·D0): a 1 cm² die at 0.1 defects per cm² yields about 90%, but a 6 cm² die at the same defect density yields only about 55%. To improve it, I can lower D0 by tracing defect sources with inline inspection and wafer-map signatures. I can make defects non-fatal with redundancy, such as spare SRAM rows and columns repaired by fuses. Or I can split the design into chiplets, test each small die, and assemble only known good dies, which is exactly why AMD moved its server CPUs to chiplets.",
      level: "deep",
    },
    {
      q: "Why does an advanced process need CMP, and what can go wrong with it?",
      a: "A lithography exposure only stays in focus over roughly 100 nm of height for immersion DUV, and less for EUV, so the wafer must be flat before every critical layer. CMP flattens oxide after trench isolation and removes the tungsten and copper overburden in damascene steps, leaving inlaid lines. Its failure modes are dishing of wide copper lines, erosion of dense arrays, scratches from slurry agglomerates or a badly conditioned pad, and leftover slurry particles. Designers help by following dummy-fill rules that keep metal density in a window, roughly 20% to 80%, so the polish removes material evenly.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Why is a 300 mm wafer about 775 µm thick when transistors use only the top few micrometres?",
      choices: [
        "Thicker wafers dice more cleanly, because the saw needs at least 700 µm of silicon to cut a straight kerf",
        "The bulk is a mechanical carrier that survives handling and hundreds of process steps without breaking or warping",
        "Transistors need several hundred micrometres of silicon beneath them, or the depletion region would reach the back",
        "It raises the wafer's electrical conductivity, so the substrate can act as a low-resistance ground plane",
      ],
      answer: 1,
      explain:
        "The bulk is a mechanical carrier. A 300 mm disc much thinner would flex and break in robots and furnaces. At the end of the flow it is ground down to 50-200 µm before dicing and packaging.",
    },
    {
      q: "A 193 nm immersion scanner has NA = 1.35 and the process reaches k1 = 0.28. What is the smallest half-pitch in a single exposure?",
      choices: ["About 4 nm", "About 40 nm", "About 140 nm", "About 400 nm"],
      answer: 1,
      explain:
        "R = k1·λ/NA = 0.28 × 193 nm / 1.35 ≈ 40 nm. Tighter pitches need multiple patterning (two to four exposures per layer) or EUV.",
    },
    {
      q: "Which step makes the wafer flat before the next lithography layer?",
      choices: [
        "Plasma-enhanced chemical vapour deposition (PECVD)",
        "Chemical mechanical planarization (CMP)",
        "Thermal oxidation",
        "Wet etching",
      ],
      answer: 1,
      explain:
        "CMP presses the wafer onto a rotating pad with an abrasive slurry and removes topography to within nanometres, keeping the next exposure inside the scanner's shallow depth of focus.",
    },
    {
      q: "Why is copper wiring made with the damascene process instead of being plasma-etched like aluminium?",
      choices: [
        "Copper is too expensive to etch away, because the metal sputtered into the plasma cannot be recovered and reused",
        "Copper has no volatile etch products at practical temperatures, so it is inlaid into trenches and polished back",
        "Copper is an insulator until it is annealed, so the lines must be shaped before the anneal makes them conduct",
        "Damascene layouts are easier to draw, because the trenches and the vias come from a single mask",
      ],
      answer: 1,
      explain:
        "Copper chlorides are not volatile at normal plasma-etch temperatures, so fabs etch trenches in the dielectric, electroplate copper into them and remove the excess with CMP. IBM introduced copper interconnect this way in 1997.",
    },
    {
      q: "Using the Poisson model, what is the yield of a 2 cm² die at D0 = 0.1 defects per cm²?",
      choices: ["98%", "90%", "82%", "60%"],
      answer: 2,
      explain:
        "Y = exp(−A·D0) = exp(−0.2) ≈ 0.82. Doubling the area from 1 to 2 cm² takes yield from 90% to 82%, and the loss keeps compounding as dies grow.",
    },
    {
      q: "Why are back-end-of-line steps kept below about 400 °C?",
      choices: [
        "Photoresist melts above 400 °C, so no pattern could be printed over the metal",
        "Copper and low-k dielectrics degrade, and copper diffuses, at higher temperatures",
        "Wafers bow permanently above 400 °C, and the scanner can no longer focus on them",
        "Ion implanters cannot run hotter than 400 °C, and the metal layers need implants",
      ],
      answer: 1,
      explain:
        "Once copper wiring and fragile low-k films exist, high temperatures cause copper diffusion, stress voiding and dielectric damage. All high-temperature steps such as oxidation and implant anneals happen in the FEOL, before the metal goes on.",
    },
    {
      q: "Roughly how long does a leading-edge wafer take to travel through the fab?",
      choices: ["3 days", "3 weeks", "3 months", "3 years"],
      answer: 2,
      explain:
        "About 1,000 steps, each with queue time at its tool, add up to roughly 12-14 weeks. That cycle time is one reason chip supply cannot react quickly to a demand spike.",
    },
  ],
};

export default data;
