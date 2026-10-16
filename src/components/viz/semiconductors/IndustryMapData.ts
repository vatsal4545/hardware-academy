/** Node and trace data for IndustryMap: who does what in the semiconductor value chain. */
import { vizColors } from "@/components/viz/shared";

export type IndustryNodeId = "eda" | "ip" | "fabless" | "idm" | "equipment" | "foundry" | "osat" | "systems";

export interface IndustryNode {
  id: IndustryNodeId;
  label: string;
  sub: string;
  x: number;
  y: number;
  color: string;
  what: string;
  companies: string[];
  facts: string[];
  roles: string[];
  interview: string[];
}

export const industryNodes: IndustryNode[] = [
  {
    id: "eda",
    label: "EDA",
    sub: "design software",
    x: 80,
    y: 60,
    color: vizColors.violet,
    what: "Software for designing and verifying chips: simulation, synthesis, place-and-route, timing sign-off and physical verification.",
    companies: ["Synopsys", "Cadence", "Siemens EDA"],
    facts: [
      "Synopsys and Cadence hold most of the EDA market; Siemens bought Mentor Graphics in 2017.",
      "Synopsys bought Ansys for about $35 billion in 2025 to add multiphysics simulation.",
    ],
    roles: ["EDA applications engineer", "Software engineer (C++ algorithms)", "CAD and flow engineer at a chip company"],
    interview: ["Setup and hold timing", "Synthesis and place-and-route basics", "Tcl and Python scripting", "A flow you have automated"],
  },
  {
    id: "ip",
    label: "IP",
    sub: "licensed blocks",
    x: 250,
    y: 60,
    color: vizColors.violet,
    what: "Pre-designed, pre-verified blocks licensed into chips: CPU cores, GPUs, interface PHYs and memory compilers.",
    companies: ["Arm", "Synopsys IP", "Cadence IP", "Imagination", "SiFive (RISC-V)"],
    facts: [
      "More than 250 billion Arm-based chips have shipped.",
      "Arm charges a licence fee up front and a royalty on every chip shipped.",
    ],
    roles: ["CPU and GPU design or verification", "PHY analog and mixed-signal design", "Technical support for licensees"],
    interview: ["Pipelines and caches", "Bus protocols such as AXI", "SystemVerilog and UVM verification"],
  },
  {
    id: "fabless",
    label: "Fabless",
    sub: "designs, no fab",
    x: 420,
    y: 60,
    color: vizColors.violet,
    what: "Designs chips and owns the customer, then pays a foundry and an OSAT to build them.",
    companies: ["NVIDIA", "Qualcomm", "AMD", "Apple", "Broadcom", "MediaTek"],
    facts: [
      "AMD went fabless in 2009 when it spun its fabs out as GlobalFoundries.",
      "A leading-edge SoC takes two to three years and hundreds of engineers from spec to tape-out.",
    ],
    roles: [
      "Digital design (RTL)",
      "Design verification",
      "Physical design and timing",
      "Analog and mixed-signal design",
      "Applications and field applications engineering",
    ],
    interview: ["Write a FIFO or state machine in Verilog", "Clock-domain crossing", "Setup and hold timing", "Debug a customer's board"],
  },
  {
    id: "idm",
    label: "IDM",
    sub: "designs + owns fabs",
    x: 590,
    y: 60,
    color: vizColors.green,
    what: "Designs, fabricates and usually tests its own chips. Common in analog, power and memory, where the process is the product.",
    companies: ["Intel", "Texas Instruments", "Infineon", "STMicroelectronics", "NXP", "Micron", "Samsung"],
    facts: [
      "TI builds analog chips on 300 mm wafers in its own fabs in Texas and Utah.",
      "Infineon, STMicroelectronics and onsemi are among the largest suppliers of SiC and IGBT power devices for EVs.",
    ],
    roles: [
      "Process, device and yield engineers",
      "Applications and FAE for power and analog",
      "Product, test and reliability engineers",
      "Analog and power design",
    ],
    interview: ["Datasheet reading: Rds(on), θJA, SOA", "Buck converters and inverters", "HTOL and temperature cycling", "A failure-analysis flow"],
  },
  {
    id: "equipment",
    label: "Equipment",
    sub: "fab tools",
    x: 80,
    y: 180,
    color: vizColors.blue,
    what: "Builds the tools that make chips: lithography scanners, deposition, etch, implant, CMP, inspection and metrology.",
    companies: ["ASML", "Applied Materials", "Lam Research", "Tokyo Electron", "KLA"],
    facts: [
      "ASML is the only EUV supplier; a scanner costs about $200 million, a High-NA one about $380 million.",
      "Tools make up most of the $20 billion-plus cost of a leading-edge fab.",
    ],
    roles: [
      "Field service engineer at the customer's fab",
      "Process applications engineer",
      "Mechanical, optical and controls engineering",
      "Tool software and automation",
    ],
    interview: ["Vacuum, plasma and optics basics", "Control loops and sensors", "Troubleshooting a drifting tool", "Working on-site under pressure"],
  },
  {
    id: "foundry",
    label: "Foundry",
    sub: "makes wafers",
    x: 420,
    y: 180,
    color: vizColors.cyan,
    what: "Manufactures wafers for many customers' designs on its own process technology.",
    companies: ["TSMC", "Samsung Foundry", "Intel Foundry", "GlobalFoundries", "UMC", "SMIC"],
    facts: [
      "TSMC holds about two-thirds of foundry revenue and nearly all leading-edge logic.",
      "Samsung shipped the first gate-all-around 3 nm process in 2022.",
      "GlobalFoundries stopped 7 nm development in 2018 to focus on specialty nodes.",
    ],
    roles: ["Process engineer (litho, etch, CMP, films)", "Process integration engineer", "Yield engineer", "Customer engineer"],
    interview: ["Unit processes and the patterning loop", "SPC charts and design of experiments", "Yield models and wafer maps", "An excursion you fixed"],
  },
  {
    id: "osat",
    label: "OSAT",
    sub: "assembly + test",
    x: 420,
    y: 300,
    color: vizColors.orange,
    what: "Outsourced assembly and test: bumping, dicing, die attach, wire bond or flip chip, molding and final test.",
    companies: ["ASE", "Amkor", "JCET", "Powertech"],
    facts: [
      "ASE is the largest OSAT; Amkor is building an advanced-packaging plant in Arizona.",
      "TSMC and Intel package their most advanced 2.5D and 3D parts in-house, such as CoWoS.",
    ],
    roles: ["Packaging engineer", "Test engineer (ATE programs)", "Failure-analysis engineer", "Quality engineer"],
    interview: ["Wire bond vs flip chip", "θJA and the thermal path", "Solder-joint reliability", "Test coverage and DPPM"],
  },
  {
    id: "systems",
    label: "Systems",
    sub: "phones, cars, servers",
    x: 590,
    y: 300,
    color: vizColors.amber,
    what: "Puts packaged chips on boards inside products, and sends field failures back to the chip supplier.",
    companies: ["Apple", "Tesla", "Google", "Bosch", "Cisco"],
    facts: [
      "Apple, Tesla and Google also design their own chips, blurring the line with fabless.",
      "Automotive customers target defect rates of single-digit parts per million or better, and expect an 8D report for every failure.",
    ],
    roles: ["Board hardware engineer", "Component engineer", "Supplier quality engineer", "Validation engineer"],
    interview: ["Choosing a part from a datasheet", "Board bring-up and debug", "Reading a supplier's 8D report"],
  },
];

export const industryEdges: Array<{ from: IndustryNodeId; to: IndustryNodeId; label: string }> = [
  { from: "eda", to: "ip", label: "tools" },
  { from: "ip", to: "fabless", label: "cores" },
  { from: "fabless", to: "foundry", label: "GDSII" },
  { from: "equipment", to: "foundry", label: "scanners, etch, inspection" },
  { from: "foundry", to: "osat", label: "wafers" },
  { from: "osat", to: "systems", label: "chips" },
  { from: "idm", to: "systems", label: "own chips" },
];

/** The "trace a chip" path, with what happens at each stop. */
export const tracePath: Array<{ id: IndustryNodeId; caption: string }> = [
  {
    id: "eda",
    caption:
      "Design: architects write the spec and the RTL, then simulate and verify it in Synopsys or Cadence tools for one to two years.",
  },
  {
    id: "ip",
    caption: "Licensing: the team drops in Arm CPU cores, USB and PCIe PHYs and SRAM compilers instead of designing them.",
  },
  {
    id: "fabless",
    caption: "Tape-out: physical design and timing sign-off finish, and the GDSII layout goes to the foundry.",
  },
  {
    id: "foundry",
    caption:
      "Fab: TSMC makes the masks and runs wafers for about three months on ASML, Applied, Lam, TEL and KLA tools; wafer sort marks the good dies.",
  },
  {
    id: "osat",
    caption: "Package and test: ASE or Amkor bumps, dices, packages and final-tests every chip in a few weeks.",
  },
  {
    id: "systems",
    caption: "Product: chips are soldered onto boards in phones, servers and EVs; field failures flow back for analysis.",
  },
];
