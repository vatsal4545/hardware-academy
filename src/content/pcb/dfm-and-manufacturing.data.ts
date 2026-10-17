import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "DRC (design rule check)",
      def: "A CAD check that tests the layout against numeric rules you set: clearance, track width, drill size, annular ring, courtyards. It knows geometry and the numbers you gave it, not the factory's process.",
    },
    {
      term: "DFM (design for manufacturability)",
      def: "The practice and the checks that ask whether a factory can build the design repeatably, cheaply and at high yield. It covers effects DRC cannot see: acid traps, mask slivers, thermal balance, paste volume and panelisation.",
    },
    {
      term: "Gerber (RS-274X)",
      def: "The standard 2-D vector format for PCB artwork, one file per copper, solder mask, silkscreen, paste and outline layer. Extended Gerber carries its aperture definitions inside the file.",
    },
    {
      term: "Excellon drill file",
      def: "The text format that lists drill sizes and hole coordinates, usually split into plated and non-plated holes. It is the companion to the Gerber set.",
    },
    {
      term: "IPC-2581",
      def: "A single XML file holding layers, drills, stack-up, netlist and bill of materials, intended to replace a zip of Gerbers and drill files.",
    },
    {
      term: "Centroid (pick-and-place) file",
      def: "A table giving each part's reference designator, X, Y, rotation and board side. The assembler's machine uses it to place components, and rotation conventions differ between CAD tools and assembly houses.",
    },
    {
      term: "Annular ring",
      def: "The ring of copper left around a drilled hole, (pad diameter minus drill diameter) / 2. Fabs usually ask for 0.15 mm or more because drill wander can break a thinner ring.",
    },
    {
      term: "Solder mask web (sliver)",
      def: "The strip of mask left between two neighbouring pad openings. Below about 0.1 mm it can peel off in processing, and solder bridges become likely.",
    },
    {
      term: "Acid trap",
      def: "An acute-angle copper corner where etchant pools and over-etches, or where residue is trapped. Keep junction angles at 90° or more, or use 45° chamfers.",
    },
    {
      term: "Tombstoning",
      def: "A small chip standing on one end after reflow because the solder on one pad melted first and its surface tension lifted the part off the other pad.",
    },
    {
      term: "Reflow profile",
      def: "The temperature-versus-time curve a board sees in the oven: preheat, soak, a peak above the solder's liquidus, controlled cooling. For SAC305: liquidus 217 °C, peak about 245 °C, 45 to 90 s above liquidus.",
    },
    {
      term: "Thermal relief",
      def: "Narrow spokes that join a pad to a copper pour so the pad heats like its neighbours during soldering instead of dumping its heat into the plane.",
    },
    {
      term: "Fiducial",
      def: "A bare copper dot with an open mask area that the pick-and-place camera uses to find the board's true position. Three on each board or panel is typical.",
    },
    {
      term: "AOI (automated optical inspection)",
      def: "Cameras compare each solder joint and component against a reference image to find missing, shifted, rotated, tombstoned or starved parts after reflow.",
    },
  ],
  scenario: {
    title: "Half the 0402s tombstone",
    context:
      "A 40-board run comes back from a low-cost assembler with 12 to 15 of the 60 0402 capacitors and LEDs on every board standing on one end after reflow. The failures are not random: each tombstoned part has one pad tied to a large ground pour with a solid connection and the other pad on a 0.2 mm trace. Parts with matching copper on both pads are fine, and so are the 0603 and larger parts. The assembler's profile log shows a preheat ramp of 3.5 °C/s.",
    symptoms: [
      "12 to 15 of 60 0402 parts per board stand on one end; 0603 and larger parts are fine",
      "Every failed part has one pad on the ground pour and the other on a thin 0.2 mm trace",
      "The end that is lifted off the board is always the one on the ground pour",
      "The reflow log shows a preheat ramp of 3.5 °C/s with almost no soak",
    ],
    hints: [
      "Which end of a tombstoned part is still soldered? Look at what that pad is connected to.",
      "Compare the copper attached to the two pads of a good part and of a failed part. Which pad heats faster?",
      "Which pad reaches 217 °C first when the board is heated at 3.5 °C/s, and what does molten solder do to a part that is only half held?",
    ],
    rootCause:
      "Unequal thermal mass. The pad on the 0.2 mm trace heats fast, so its paste melts first, and the surface tension of that molten solder pulls its end of the part down and the far end up. The pour-connected pad is still sinking heat into a large copper area and is below 217 °C. A 3.5 °C/s ramp with no soak makes the temperature difference between the two pads larger. Unequal pad geometry and paste volume add to it.",
    fix:
      "Connect pour-side pads through thermal-relief spokes (four spokes of about 0.25 mm with 0.25 mm gaps) so the pad heats like its neighbour, and balance trace widths and pad shapes. Ask the assembler for a ramp of 2 °C/s or less and a 60 to 90 s soak at 150 to 180 °C to equalise temperatures. If needed, reduce the 0402 stencil apertures by about 10 % and check placement offset. Verify on a first article before releasing the batch.",
    lesson:
      "DFM is thermal as well as geometric: both ends of a part must heat together, or the solder's own surface tension will stand your parts on end.",
  },
  interview: [
    {
      q: "What is the difference between DRC and DFM?",
      a: "DRC checks the layout against rules you or the fab set in the CAD tool: clearance, track width, drill size, annular ring and courtyards. It is geometry against numbers. DFM asks whether a factory can build the board reliably and cheaply, so it also considers process effects such as acid traps, mask slivers, thermal balance of pads, paste volume, fiducials and panelisation. A board can pass DRC and still tombstone or come back with opens. I put the fab's capability sheet into the DRC rules first, then run the fab's own DFM check before paying.",
      level: "screen",
    },
    {
      q: "What files do you send to a fab and to an assembler?",
      a: "The fab needs Gerber RS-274X files for each copper layer, solder mask, silkscreen, paste and the board outline, plus an Excellon drill file; some fabs accept a single IPC-2581 or ODB++ package instead. For assembly I add a bill of materials with manufacturer or supplier part numbers, a centroid file listing each reference designator's X, Y, rotation and side, and an assembly drawing with polarity marks. I open the Gerbers in a viewer before uploading, and I check the assembler's placement preview for rotation errors on polarised parts.",
      level: "screen",
    },
    {
      q: "Walk me through a reflow profile for SAC305 and what goes wrong at each end.",
      a: "Preheat brings the board up at no more than about 3 °C/s to 150 °C so the parts are not shocked. The soak from 150 to about 200 °C over 60 to 120 seconds activates the flux and evens out temperature between large and small parts. Then the board ramps through the 217 °C liquidus of SAC305 to a peak around 245 °C and spends 45 to 90 seconds above liquidus, long enough to wet but short enough to protect parts and limit intermetallic growth. Too cool or too short gives dull cold joints and poor wetting, while too hot or too long damages components and the laminate. Cooling at no more than 4 to 6 °C/s gives a fine-grained joint.",
      level: "deep",
    },
    {
      q: "What is tombstoning and how do you prevent it?",
      a: "Tombstoning is when a small chip, usually 0402 or smaller, stands on one end after reflow. It happens when the solder on one pad melts before the other, so surface tension pulls that end down and lifts the far end. The usual causes are unequal thermal mass between the pads, such as one pad on a pour, unequal pad size or paste volume, and a fast ramp. I prevent it with symmetric pads, thermal relief on any pad tied to a pour, balanced stencil apertures and a slower ramp with a soak.",
      level: "screen",
    },
    {
      q: "How do you decide the trace/space and drill sizes for a new board?",
      a: "I start from the fab's capability page and pick the cheapest tier that fits, because tighter rules cost money and yield. My defaults are 0.2 mm track and space and a 0.3 mm drill with a 0.6 mm via pad, and I drop to the fab's minimum only locally, for example escaping a fine-pitch QFN. I leave 20 to 30 % margin over the minimum so normal process variation does not turn into scrap. Then I enter those numbers as design rules in the CAD tool so DRC enforces them while I route, and I confirm with the fab's DFM check before ordering.",
      level: "deep",
    },
    {
      q: "What would DFM at compile time mean for AI-generated hardware designs?",
      a: "It means treating manufacturability as a compiler pass instead of a review at the end. An AI system proposes geometry or a layout, and an automated checker applies the fab's rules, such as minimum wall thickness, drill sizes, clearances and bend radii. The violations go back to the generator as errors, and the loop runs until the design compiles with zero violations. For a PCB the same idea is a CI job that runs DRC with the fab's rules on every commit and fails the build on any violation. It moves the discovery of a 0.1 mm sliver from after the order to before a human ever sees the draft.",
      level: "deep",
    },
  ],
  quiz: [
    {
      q: "Which file format carries one layer of PCB artwork, such as a copper layer, to the fab?",
      choices: ["Excellon", "Gerber RS-274X", "STEP", "BOM CSV"],
      answer: 1,
      explain:
        "Gerber (RS-274X) is the 2-D vector format used for each layer: copper, solder mask, silkscreen, paste and outline. Excellon carries the drills, STEP is a 3-D mechanical model and the BOM is for the assembler. IPC-2581 can bundle all of them into one file.",
    },
    {
      q: "Lead-free SAC305 solder has a liquidus of about",
      choices: ["183 °C", "217 °C", "245 °C", "260 °C"],
      answer: 1,
      explain:
        "SAC305 (96.5 % tin, 3 % silver, 0.5 % copper) is fully liquid at about 217 to 220 °C. Leaded Sn63/Pb37 melts at 183 °C. The reflow peak of about 245 °C sits 25 to 30 °C above liquidus to guarantee wetting, and 260 °C is a typical maximum rating for components.",
    },
    {
      q: "After reflow, an 0402 capacitor stands on one end. The most likely cause is",
      choices: [
        "Too much flux in the paste",
        "Unequal heating of its two pads from unequal thermal mass",
        "Silkscreen printed over the pads",
        "A solder mask that is slightly too thick",
      ],
      answer: 1,
      explain:
        "If one pad is tied to a pour and the other is on a thin trace, the thin side melts first. Its surface tension pulls that end down and the other end up, which is the Manhattan or tombstone effect. Thermal relief spokes, symmetric pads and a slower ramp with a soak all reduce it.",
    },
    {
      q: "An acid trap is",
      choices: [
        "A via with no drill",
        "An acute-angle copper corner where etchant can pool",
        "A pad with too little annular ring",
        "A thermal relief with only two spokes",
      ],
      answer: 1,
      explain:
        "Where two traces meet at an acute angle, etchant lingers in the narrow wedge and over-etches, or traps residue that later corrodes the copper. Use angles of 90° or more, or 45° chamfers. Some fabs' CAM software flags or repairs them, but you should not rely on it.",
    },
    {
      q: "The centroid file contains",
      choices: [
        "Net names and trace widths",
        "Reference designator, X, Y, rotation and board side",
        "Drill sizes and hole counts",
        "Supplier part numbers and prices",
      ],
      answer: 1,
      explain:
        "The pick-and-place machine needs to know where each reference designator goes, at what angle and on which side. Part numbers live in the BOM and drills in the Excellon file. Rotation conventions differ between CAD tools and assemblers, so always check the preview for diodes, tantalum capacitors and ICs.",
    },
    {
      q: "Which reflow stage mainly activates the flux and evens out temperature between big and small parts?",
      choices: ["The peak", "The soak at roughly 150 to 200 °C", "The cooling slope", "A preheat ramp of 5 °C/s"],
      answer: 1,
      explain:
        "During the soak, which lasts 60 to 120 s, the flux cleans the oxide from pads and leads while heavy parts and large pours catch up with light ones. Skipping it, or racing through it, is a classic cause of tombstoning and voids. A preheat ramp over 3 °C/s risks thermal shock instead.",
    },
    {
      q: "Your CAD DRC is clean. Why still run the fab's DFM check?",
      choices: [
        "DRC cannot read Gerber files",
        "DRC only knows the rules you gave it, while the fab also checks process limits against its own capability",
        "DFM checks are required by law before manufacture",
        "DRC results are only valid for two-layer boards",
      ],
      answer: 1,
      explain:
        "DRC is only as good as the numbers you entered. The fab's CAM software compares the artwork with its real process limits: mask webs, acid traps, drill-to-copper tolerances, copper-to-edge distance and more. Running both catches errors before you pay for boards.",
    },
  ],
};
export default data;
