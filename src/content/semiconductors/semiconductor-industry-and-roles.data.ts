import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Fabless",
      def: "A company that designs and sells chips but pays a foundry to make them, such as NVIDIA, Qualcomm, AMD and Apple.",
    },
    {
      term: "Foundry",
      def: "A manufacturer that fabricates other companies' designs. TSMC holds about two-thirds of foundry revenue and nearly all leading-edge capacity.",
    },
    {
      term: "IDM",
      def: "Integrated device manufacturer: designs, fabricates and usually tests its own chips, such as Intel, Texas Instruments, Infineon and STMicroelectronics.",
    },
    {
      term: "OSAT",
      def: "Outsourced semiconductor assembly and test companies, such as ASE and Amkor, that package and test dies after fabrication.",
    },
    {
      term: "EDA",
      def: "Electronic design automation: the software used to design and verify chips, dominated by Synopsys, Cadence and Siemens EDA.",
    },
    {
      term: "Tape-out",
      def: "Sending the finished layout database (GDSII or OASIS) to the foundry to make masks. An advanced-node mask set costs millions of dollars, so a respin costs money and months.",
    },
    {
      term: "Failure analysis (FA)",
      def: "The structured path from a failed part to a physical root cause: verify, test, X-ray and acoustic imaging, electrical fault isolation, then decapsulation and cross-sections.",
    },
    {
      term: "8D report",
      def: "An eight-discipline problem-solving report shared with customers: team, problem, containment, root cause, corrective action, verification, prevention and closure.",
    },
  ],
  scenario: {
    title: "Interview case: “Our part fails in the field at high temperature. What do you do?”",
    context:
      "Final-round interview for an applications-engineer role at a power-semiconductor company. The hiring manager says: an automotive customer reports 120 ppm field failures of our 40 V gate-driver IC, all in vehicles in hot climates, and the returned parts pass test at room temperature. Walk me through what you would do.",
    symptoms: [
      "Field returns cluster in Arizona and the Gulf states, and failures appear only when under-hood temperature exceeds about 105 °C.",
      "Returned parts pass the full final test at 25 °C but show 3× the datasheet leakage on one pin when retested at 125 °C.",
      "Every failing part comes from two date codes assembled at one OSAT site.",
    ],
    hints: [
      "Structure first: what data would you ask for before you touch a single part?",
      "Reproduce the failure at the field condition (hot), then use non-destructive analysis before anything destructive.",
      "A date-code cluster from one assembly site points at the package and assembly, not the die design.",
    ],
    rootCause:
      "Acoustic microscopy (C-SAM) on the returns showed mold-compound delamination along the lead frame on those two date codes. Moisture and ionic contamination entered the gap, and at high temperature they formed a leakage path between a high-voltage pin and a sensitive input. It looked like a die fault but was an assembly problem: the OSAT had changed the mold-compound cure profile without requalification.",
    fix: "Contain first: quarantine the two date codes and screen all inventory with a hot leakage test. Correct the cause by restoring the qualified cure profile and adding C-SAM sampling at the OSAT. Verify with humidity (HAST), temperature-cycling and high-temperature reverse-bias tests on new lots, then close an 8D report with the customer.",
    lesson:
      "Answer failure questions with a flow: gather data and contain, verify under field conditions, non-destructive analysis, electrical fault isolation, destructive physical analysis, root cause, corrective action, then verify and prevent recurrence.",
  },
  interview: [
    {
      q: "Explain the difference between fabless, foundry and IDM.",
      a: "A fabless company, such as NVIDIA or Qualcomm, designs chips and owns the customer but pays a foundry to make them. A foundry, such as TSMC, manufactures wafers for many customers and does not sell its own chip designs. An IDM, such as Texas Instruments or Infineon, does both: it designs, fabricates and usually tests its own products. The lines are blurring: Intel now runs Intel Foundry for outside customers, and TSMC does advanced packaging that used to be OSAT work.",
      level: "screen",
    },
    {
      q: "What does an applications engineer do?",
      a: "An applications engineer is the bridge between a chip and the customers designing it into products. Day to day that means writing reference designs and application notes, answering design questions, reviewing customer schematics and layouts, and debugging boards in the lab when something does not work. They also carry customer requirements and failure reports back to the product and design teams. It suits someone who likes hands-on hardware debug as much as explaining things clearly.",
      level: "screen",
    },
    {
      q: "Why are ASML and TSMC so strategically important?",
      a: "ASML is the only company that makes EUV lithography scanners, which every chip at 7 nm-class and below depends on, and each costs around $200 million. TSMC manufactures most of the world's leading-edge logic, including chips for Apple, NVIDIA, AMD and Qualcomm. That concentration means export controls on ASML tools, or any disruption in Taiwan, touches almost every advanced product. It is also why the CHIPS Act paid to build leading-edge fabs in the United States.",
      level: "screen",
    },
    {
      q: "Our part fails in the field at high temperature. What do you do?",
      a: "First I would gather data and contain: failure rate in ppm, lot and date codes, the application and mission profile, and the failure signature, and I would hold suspect inventory. Then I would verify the failure on returned parts at the field condition, for example a hot test at 125 °C, next to known good parts. Next come non-destructive steps such as X-ray and acoustic microscopy, then electrical fault isolation with curve tracing and thermal or emission imaging, and only then decapsulation and cross-sections to find the physical defect. Finally I would document root cause, corrective action and verification tests in an 8D report, and check whether other products share the same risk.",
      level: "deep",
    },
    {
      q: "How has Moore's law changed, and what drives progress now?",
      a: "Gordon Moore observed in 1965 that component counts were doubling every year, and in 1975 revised it to about every two years, which held for decades: the Intel 4004 had 2,300 transistors in 1971 and Apple's M1 had 16 billion in 2020. Dennard scaling, which kept power density constant as transistors shrank, ended around 2005, so clock speeds stalled near 3-5 GHz. Progress now comes from new transistor structures like FinFET and gate-all-around, EUV lithography, specialised accelerators, and advanced packaging with chiplets and HBM. Node names such as 3 nm are now labels rather than any physical dimension.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Which company is the only supplier of EUV lithography scanners?",
      choices: ["Applied Materials", "ASML", "Tokyo Electron", "KLA"],
      answer: 1,
      explain:
        "ASML in the Netherlands builds every EUV scanner. Applied Materials and Lam lead deposition and etch, Tokyo Electron leads coater/developer tracks, and KLA leads inspection and metrology.",
    },
    {
      q: "NVIDIA designs GPUs and has TSMC manufacture them. That makes NVIDIA a...",
      choices: [
        "pure-play foundry",
        "integrated device manufacturer (IDM)",
        "fabless chip company",
        "OSAT (outsourced assembly and test) provider",
      ],
      answer: 2,
      explain:
        "Fabless companies own the design and the customer relationship but no fabs. TSMC, which makes the wafers, is the foundry.",
    },
    {
      q: "What do OSAT companies such as ASE and Amkor do?",
      choices: ["Sell EDA software", "Grow and slice silicon ingots", "Package and test chips", "License CPU cores"],
      answer: 2,
      explain:
        "Outsourced semiconductor assembly and test companies take finished wafers, dice them, package the dies and run final test, often in Taiwan, Malaysia, Korea or China.",
    },
    {
      q: "The 2022 US CHIPS and Science Act set aside about how much for chip manufacturing, R&D and workforce?",
      choices: ["$5 billion", "$52.7 billion", "$500 billion", "$2 trillion"],
      answer: 1,
      explain:
        "About $52.7 billion, including $39 billion in manufacturing incentives, plus a separate 25% investment tax credit for building fabs.",
    },
    {
      q: "Told that a part fails in the field at high temperature, what should you do first?",
      choices: [
        "Decapsulate a returned part immediately and look for the defect",
        "Assume the customer's board is at fault until they prove otherwise",
        "Gather data and contain: failure rate, lots, conditions and mission profile",
        "Start a chip redesign so the fix is ready before the cause is known",
      ],
      answer: 2,
      explain:
        "Destructive analysis destroys evidence, so start with data, containment and reproduction under field conditions. X-ray, acoustic microscopy and decapsulation come later, in that order.",
    },
    {
      q: "Which role spends the most time with customers debugging their boards?",
      choices: [
        "Process integration engineer in the fab",
        "Device engineer characterizing test structures",
        "Applications or field applications engineer",
        "Yield engineer analysing wafer-map defect data",
      ],
      answer: 2,
      explain:
        "Applications engineers and FAEs support design-ins: reference designs, schematic and layout reviews, lab debug. Process, device and yield engineers work on how the silicon itself is made.",
    },
  ],
};

export default data;
