import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "ERC (electrical rules check)",
      def: "A schematic-level check for electrical inconsistencies: unconnected pins, two outputs driving one net, power inputs with no source, missing power flags. It does not know whether the circuit works.",
    },
    {
      term: "DRC (design rules check)",
      def: "A board-level check of copper clearances, track widths, drill sizes, annular rings, copper-to-edge distance and zone connectivity against rules you set. It knows nothing about the enclosure.",
    },
    {
      term: "Update PCB from Schematic (F8)",
      def: "The KiCad action that pushes the netlist, footprints and net names from the schematic into the board. Run it again after every schematic change to keep the two in step.",
    },
    {
      term: "Footprint",
      def: "The land pattern of a part on the board: pads, silkscreen outline and courtyard. It must match the real part's datasheet, and a wrong footprint is the most expensive mistake in a first spin.",
    },
    {
      term: "Net class",
      def: "A named group of nets that share design rules such as track width, clearance and via size. In KiCad 9 nets are assigned to classes by name patterns, so VM and the motor outputs can be 1.5 mm while signals stay at 0.2 mm.",
    },
    {
      term: "Stack-up",
      def: "The ordered list of copper and dielectric layers with their thicknesses. A typical four-layer 1.6 mm board has 35 µm outer copper, 0.21 mm prepreg, a 1.065 mm core and 15 µm inner copper.",
    },
    {
      term: "Rule area (keep-out)",
      def: "A drawn region that forbids copper, vias, tracks or footprints. It is used under an antenna, around standoff heads and wherever the enclosure needs clearance.",
    },
    {
      term: "Zone (copper pour)",
      def: "A filled copper area tied to a net, usually GND. Thermal-relief spokes connect its pads, stitching vias tie layers together, and it must be refilled after edits.",
    },
    {
      term: "Ratsnest",
      def: "The thin straight lines drawn between pads that share a net but are not yet routed. Short, untangled lines mean a good placement.",
    },
    {
      term: "Position (centroid) file",
      def: "The CSV that tells the assembler each part's reference, X, Y, rotation and side. Its origin must match the drill and place origin set in the board.",
    },
    {
      term: "PWR_FLAG",
      def: "A schematic symbol that marks a net as driven by a power source, which silences ERC's power-input-not-driven error on rails fed by connectors or regulators that KiCad cannot see as outputs.",
    },
    {
      term: "Jobset",
      def: "A KiCad 9 feature that stores a recipe of fabrication outputs (Gerbers, drills, position file, BOM) so they can be regenerated identically with one command.",
    },
  ],
  scenario: {
    title: "DRC passes but the board does not fit the chassis",
    context:
      "The motor-driver board passes KiCad DRC with zero errors and the fab's DFM check, and five boards arrive. In the 3D-printed chassis two of the four M3 holes miss their standoffs by 1.5 mm, the JST motor connectors hit the rear wall, and the 5.4 mm tall bulk capacitor collides with the battery tray lid. The chassis designer had emailed a DXF with the pocket outline and the standoff positions weeks earlier.",
    symptoms: [
      "Zero DRC errors and zero DFM warnings on the order page",
      "Two of the four M3 holes sit 1.5 mm away from the chassis standoffs",
      "J2 and J3 touch the rear wall when the board is lowered in",
      "The 100 µF capacitor, 5.4 mm tall, hits the battery tray lid",
    ],
    hints: [
      "What does KiCad's DRC know about the chassis?",
      "Where did the outline and the hole positions come from: the chassis drawing, or round numbers typed into the board?",
      "How could the chassis geometry be present in the PCB project while you place parts, and how could you check heights before ordering?",
    ],
    rootCause:
      "DRC checks electrical and manufacturing rules against the board file alone, and nothing in the PCB project described the chassis. The outline and holes were typed in as round numbers, 3.5 mm from each corner, instead of being taken from the chassis DXF. Connector positions were never compared with the wall and component heights were never compared with the tray lid. Passing DRC says the board can be made, not that it fits.",
    fix:
      "Import the chassis DXF into KiCad (File, Import, Graphics) on a user drawing layer, using the chassis datum as the board's drill and place origin, and take the outline and hole positions from it. Add rule-area keep-outs for the standoff heads, the wall and the tray lid, and place the connectors with that layer visible. Export the board as STEP and check it against the chassis model, or at least review heights in the 3D viewer, and print a 1:1 paper plot and lay it in the chassis before ordering.",
    lesson:
      "DRC proves a board can be manufactured, not that it fits: bring the mechanical constraints into the PCB project and check fit before you order.",
  },
  interview: [
    {
      q: "Walk me through your process from schematic to Gerbers in KiCad.",
      a: "I start with the schematic: place symbols, connect or label the nets, add power flags, annotate and run ERC until it is clean. Then I assign footprints, check each against the datasheet's land pattern and push everything to the board with Update PCB from Schematic. In the board editor I set the stack-up and design rules from the fab's capability sheet, draw the outline, place parts by zone, route power first and then signals, fill the ground zones and run DRC to zero errors. Finally I plot Gerbers and drills, export the position file and BOM, check them in a viewer and submit them to the fab's DFM check.",
      level: "screen",
    },
    {
      q: "What do ERC and DRC check, and what do they not check?",
      a: "ERC runs on the schematic and checks electrical consistency: unconnected pins, outputs driving each other, power inputs with no source and missing flags. DRC runs on the board and checks copper clearances, track widths, drill sizes, annular rings, copper-to-edge distance and zone connectivity against the rules you set. Neither knows whether the circuit works, whether a footprint matches the real part, or whether the board fits its enclosure. Those need a design review, a datasheet check and a mechanical check.",
      level: "screen",
    },
    {
      q: "How do you set up design rules in KiCad for a specific fab?",
      a: "I read the fab's capability sheet and enter its numbers in Board Setup, Design Rules, Constraints: minimum clearance, track width, annular width, via and drill sizes and copper to edge. I choose my defaults with margin above those minimums, then define net classes, for example 0.2 mm default, 0.5 mm power and 1.5 mm motor, assigned by net-name patterns. For limits the dialog cannot express I add custom rules in the project's .kicad_dru file, such as a minimum hole size or edge clearance. I also enter the fab's stack-up so thickness and impedance are right, and I rerun DRC after every change.",
      level: "deep",
    },
    {
      q: "How did you size the motor traces and place the bulk capacitor on the driver board?",
      a: "For 3 A on a 1 oz outer layer with a 10 °C rise, IPC-2221 gives about 1.4 mm, so VM and the motor outputs use a 1.5 mm net class; the TB6612FNG's pads are narrower, so the traces neck down only at the pads. The 100 µF bulk capacitor goes within 5 mm of the VM pins with a 10 µF and a 100 nF beside it, so the inrush and the PWM edges are supplied locally. The motor return current gets a short, direct path back to the battery connector over a solid ground plane. I check it against the loop-area idea: short, wide and close to the plane.",
      level: "deep",
    },
    {
      q: "Which files go to the fab and to the assembler for a KiCad project?",
      a: "The fab gets Gerbers for every copper, mask, silkscreen, paste and outline layer plus the Excellon drill files, normally in one zip. The assembler additionally gets the BOM with supplier part numbers and the position file with reference, X, Y, rotation and side. KiCad exports these from File, Fabrication Outputs, and KiCad 9 can save the whole set as a jobset so it is repeatable. Before ordering I open the Gerbers in a viewer and check the assembler's placement preview for rotation and polarity.",
      level: "screen",
    },
    {
      q: "A board passes DRC but does not fit its enclosure. What do you change in your process?",
      a: "DRC only checks the board file, so I bring the mechanical constraints into it. I import the chassis DXF onto a user layer, take the outline and hole positions from it, and add keep-out areas for standoff heads, walls and tall neighbours. I place the connectors with that layer visible, review heights in the 3D viewer and export STEP to check against the enclosure model. For a first article I also print the outline at 1:1 and test-fit it before ordering.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "ERC is run on the",
      choices: ["Schematic", "PCB layout", "Gerber files", "3D model"],
      answer: 0,
      explain:
        "ERC, the electrical rules check, works on the schematic: unconnected pins, conflicting outputs, undriven power inputs. DRC is its counterpart on the board. Running ERC first stops wiring mistakes from being copied into the layout.",
    },
    {
      q: "Which KiCad action pushes schematic changes into the board?",
      choices: [
        "Tools, Annotate Schematic",
        "Tools, Update PCB from Schematic",
        "Inspect, Design Rules Checker",
        "File, Fabrication Outputs, Gerbers",
      ],
      answer: 1,
      explain:
        "Update PCB from Schematic (F8) brings the netlist, new footprints and net renames into the board editor. Annotate assigns reference designators, the Design Rules Checker only reports problems in the board, and the Fabrication Outputs menu writes the Gerbers.",
    },
    {
      q: "On which layer is the board outline drawn for the fab?",
      choices: ["F.Silkscreen", "Edge.Cuts", "F.Courtyard", "B.Paste"],
      answer: 1,
      explain:
        "Edge.Cuts holds a closed outline that the fab routes. Silkscreen is printed legend, courtyards are placement clearance and B.Paste is the stencil layer for the back side. User drawing layers are for your own notes, such as an imported chassis DXF.",
    },
    {
      q: "By IPC-2221, the trace width for 3 A on a 1 oz external layer at a 10 °C rise is about",
      choices: ["0.2 mm", "0.5 mm", "1.4 mm", "5 mm"],
      answer: 2,
      explain:
        "The IPC-2221 formula gives about 54 mil, or 1.4 mm, for 3 A at a 10 °C rise on an outer layer. Allowing a 20 °C rise narrows it to about 0.9 mm, and an inner layer needs much more copper, which is why high-current paths run on outer layers or planes.",
    },
    {
      q: "What does the ESP32-WROOM-32 antenna area need on the board?",
      choices: [
        "A solid ground pour under it on every layer, stitched to L2",
        "No copper on any layer beneath it, antenna end at the board edge",
        "A grounded metal shield can soldered over the whole module",
        "A ring of stitching vias around its whole perimeter",
      ],
      answer: 1,
      explain:
        "A ground plane under the antenna detunes it and kills range. Place the module with its antenna at the edge, draw a keep-out rule area over the antenna region on every layer, and keep other metal away from it.",
    },
    {
      q: "Why check the assembler's placement preview before confirming an order?",
      choices: [
        "To confirm the solder mask colour and the silkscreen font",
        "To catch rotation and polarity errors on diodes and tantalums",
        "To reduce the layer count and the board price before ordering",
        "To verify that the Gerber files use the right file format",
      ],
      answer: 1,
      explain:
        "CAD tools and assembly houses may define a part's zero rotation differently, so the position file can place a polarised part 180 degrees off. The preview shows pin 1 and polarity marks on the actual parts, and a few minutes there prevents burnt tantalums.",
    },
    {
      q: "Which file carries drill sizes and hole positions?",
      choices: ["Excellon drill file", "BOM CSV file", "Position (.pos) file", "STEP model file"],
      answer: 0,
      explain:
        "The Excellon file lists each tool size and the coordinates of every drilled hole, plated and non-plated. The BOM lists parts, the position file lists where parts go, and STEP is a 3-D mechanical model.",
    },
  ],
};
export default data;
