/** Decision-tree data for the DebugFlowchart visualization: symptoms, measurement steps and likely causes. */

export type Tool = "Visual" | "DMM" | "Scope" | "Logic analyzer" | "Thermal camera" | "Bench supply";

export const TOOL_COLOR: Record<Tool, string> = {
  Visual: "#34d399",
  DMM: "#fbbf24",
  Scope: "#22d3ee",
  "Logic analyzer": "#a78bfa",
  "Thermal camera": "#f87171",
  "Bench supply": "#fb923c",
};

export interface FlowOption {
  label: string;
  /** short text drawn on the arrow in the trail */
  tag: string;
  to: string;
}

export interface FlowStep {
  kind: "step";
  id: string;
  tool: Tool;
  /** short title for the trail */
  short: string;
  title: string;
  body: string;
  options: FlowOption[];
}

export interface FlowResult {
  kind: "result";
  id: string;
  short: string;
  cause: string;
  why: string;
  fix: string;
}

export type FlowNode = FlowStep | FlowResult;

export interface Symptom {
  id: string;
  label: string;
  start: string;
}

export const symptoms: Symptom[] = [
  { id: "limit", label: "The supply hits its current limit", start: "cl1" },
  { id: "rail", label: "A rail reads the wrong voltage", start: "rv1" },
  { id: "program", label: "It will not program or print anything", start: "pg1" },
  { id: "reset", label: "It resets under load or at random", start: "rs1" },
  { id: "periph", label: "A sensor or peripheral does not answer", start: "pp1" },
];

const list: FlowNode[] = [
  // ----- current limit -----
  {
    kind: "step",
    id: "cl1",
    tool: "DMM",
    short: "Rail resistance, power off",
    title: "Power off. Measure each rail to ground",
    body: "Disconnect the battery and probe 3V3, VM and the battery input against GND. A healthy rail reads at least a few hundred ohms, rising as capacitors charge. Which reading is wrong?",
    options: [
      { label: "One rail reads under about 5 Ω", tag: "under 5 Ω", to: "cl2" },
      { label: "Every rail reads normal", tag: "all normal", to: "cl4" },
    ],
  },
  {
    kind: "step",
    id: "cl2",
    tool: "Bench supply",
    short: "Inject current, look for heat",
    title: "Push a little current into the shorted rail",
    body: "Feed the shorted rail directly from the bench supply at about 1 V with a 0.5 A limit, so the regulator is out of the picture. Look with a thermal camera, a fingertip or a drop of isopropyl alcohol that evaporates first on the hot part. What warms up?",
    options: [
      { label: "A capacitor", tag: "capacitor", to: "e_cap" },
      { label: "An IC or module", tag: "IC", to: "e_ic" },
      { label: "Nothing obvious", tag: "nothing", to: "cl3" },
    ],
  },
  {
    kind: "step",
    id: "cl3",
    tool: "DMM",
    short: "Follow the voltage drop",
    title: "A dead short makes almost no heat: follow the voltage",
    body: "With 0.5 to 1 A injected, set the multimeter to millivolts and measure from the supply return to pads along the rail. The reading is lowest at the short and rises with distance. Where does it bottom out?",
    options: [{ label: "Under a part or a cluster of vias", tag: "bottoms out", to: "e_bridge" }],
  },
  {
    kind: "step",
    id: "cl4",
    tool: "Bench supply",
    short: "Ramp the voltage slowly",
    title: "Raise the voltage slowly with a 100 mA limit",
    body: "Start at 0 V and raise the supply while watching the current. Where does it jump?",
    options: [
      { label: "At about 0.6 V", tag: "0.6 V", to: "e_polar" },
      { label: "When the regulator starts, near 3 V", tag: "near 3 V", to: "e_ldo" },
      { label: "Only when the motors are enabled", tag: "motors only", to: "e_driver" },
    ],
  },
  {
    kind: "result",
    id: "e_cap",
    short: "Reversed or failed capacitor",
    cause: "A reversed or failed capacitor",
    why: "A tantalum placed 180 degrees rotated (the stripe is positive), or a cracked ceramic, is a low-resistance path across the rail, and it heats first when you inject current.",
    fix: "Compare the stripe with the footprint and the assembler's preview, remove the part and re-test the rail. For ceramics, look for flex cracks near board edges and mounting holes.",
  },
  {
    kind: "result",
    id: "e_ic",
    short: "Reversed or damaged IC",
    cause: "A reversed IC or internal damage",
    why: "An IC with pin 1 rotated, or one that has seen reverse voltage or ESD, conducts from supply to ground and is the hottest part when you inject from the rail.",
    fix: "Check pin 1 against the silkscreen and the 3D view, inspect for bridges under the package, lift or replace the part and measure the rail again.",
  },
  {
    kind: "result",
    id: "e_bridge",
    short: "Solder bridge or via short",
    cause: "A solder bridge or via short",
    why: "Hard shorts under QFNs, module pads or SOT-223 tabs dissipate almost nothing, so heat shows nothing. The voltage gradient points straight at them.",
    fix: "Inspect with a loupe or microscope, reflow with flux and drag away the bridge with wick, and look for stray solder balls and vias under a tab.",
  },
  {
    kind: "result",
    id: "e_polar",
    short: "A polarised part is reversed",
    cause: "A polarised part is reversed, or a junction is conducting",
    why: "A current jump near 0.6 to 0.7 V is a silicon junction turning on: a reversed tantalum, diode or LED, or a MOSFET body diode forward-biased the wrong way.",
    fix: "Inspect every polarised part against the assembler's preview, and use the thermal camera with current limited to find the one that warms up.",
  },
  {
    kind: "result",
    id: "e_ldo",
    short: "Regulator output is loaded",
    cause: "The regulator output is shorted or heavily loaded",
    why: "Once the LDO turns on, any short on its output pulls the full current limit. The AMS1117 pinout (GND, OUT, IN, with the tab as OUT) differs from many regulators, so a wrong footprint can also short OUT to ground.",
    fix: "Power 3V3 directly from the bench supply with the regulator input disconnected and look for heat. Check the footprint against the datasheet and the polarity of the 22 µF output tantalum.",
  },
  {
    kind: "result",
    id: "e_driver",
    short: "Motor driver or wiring fault",
    cause: "A motor driver or motor wiring fault",
    why: "A short across a motor output, a miswired connector, or an input state that shorts both halves of a bridge draws current only when the outputs are enabled.",
    fix: "Disconnect the motors and measure resistance across each output pair, check STBY and the input truth table, and verify the driver orientation and that every VM and PGND pin is soldered.",
  },

  // ----- wrong rail -----
  {
    kind: "step",
    id: "rv1",
    tool: "DMM",
    short: "Regulator input voltage",
    title: "Measure the regulator input",
    body: "The AMS1117-3.3 needs at least about 4.6 V at its input (3.3 V plus about 1.3 V of dropout). What do you read at the IN pin?",
    options: [
      { label: "At least 4.6 V", tag: "4.6 V or more", to: "rv2" },
      { label: "Below 4.6 V", tag: "below 4.6 V", to: "rv5" },
    ],
  },
  {
    kind: "step",
    id: "rv2",
    tool: "Thermal camera",
    short: "Output and regulator heat",
    title: "Input is fine. Is the output low or high, and is the regulator hot?",
    body: "Measure the 3V3 output and look at the regulator with a thermal camera or a fingertip for a second.",
    options: [
      { label: "Output low and the regulator is hot", tag: "low, hot", to: "e_overload" },
      { label: "Output low and the regulator is cool", tag: "low, cool", to: "e_variant" },
      { label: "Output high, above 3.4 V", tag: "high", to: "e_backfeed" },
    ],
  },
  {
    kind: "step",
    id: "rv5",
    tool: "DMM",
    short: "Battery versus after Q1",
    title: "Compare the battery connector with the voltage after Q1",
    body: "Measure at the battery connector, then at Q1's source with the board powered. How big is the difference?",
    options: [
      { label: "About 0.6 to 0.7 V lower", tag: "0.6 V lower", to: "e_fet2" },
      { label: "Several volts lower under load", tag: "sags", to: "e_sag" },
      { label: "Both points are low", tag: "both low", to: "e_batt" },
    ],
  },
  {
    kind: "result",
    id: "e_overload",
    short: "Output overloaded",
    cause: "The output is overloaded, so go find the short",
    why: "A hot regulator with a low output is feeding a short or a heavy load, and current limit or thermal shutdown is holding the rail down.",
    fix: "Switch to the current-limit tree: inject into the 3V3 rail with the regulator out of the circuit and locate the heat or the lowest voltage.",
  },
  {
    kind: "result",
    id: "e_variant",
    short: "Wrong variant or open output",
    cause: "The wrong regulator variant, a missing output capacitor or an open",
    why: "A cool regulator with a low output has an open output path, a cold joint on the tab, or is an adjustable part with no feedback divider.",
    fix: "Check the part marking (3.3 versus ADJ), reflow the tab and output pads, and confirm the 22 µF output capacitor is fitted.",
  },
  {
    kind: "result",
    id: "e_backfeed",
    short: "Rail back-fed",
    cause: "The rail is being driven from another source",
    why: "3V3 above 3.4 V means something else drives it: a USB-UART adapter's 5 V on the 3V3 header, a 5 V regulator variant, or a shorted pass transistor.",
    fix: "Unplug adapters, disconnect the battery and measure 3V3 alone, verify the regulator marking, and never power one rail from two sources.",
  },
  {
    kind: "result",
    id: "e_fet2",
    short: "P-FET not turned on",
    cause: "The reverse-polarity P-FET is not turning on",
    why: "A 0.6 to 0.7 V drop is the body diode conducting while the channel is off. The gate is not being pulled below the source: a missing gate resistor to ground, a wrong pin order, or a FET with too high a threshold.",
    fix: "Check Q1's pin order (gate, source, drain) against the datasheet, make sure the gate resistor goes to ground, and confirm the gate-to-source voltage exceeds the FET's rated threshold.",
  },
  {
    kind: "result",
    id: "e_sag",
    short: "Source cannot deliver the current",
    cause: "The source cannot deliver the current",
    why: "A drop of several volts under load means resistance upstream: a thin lead, a weak or discharged battery, or a current-limited bench supply.",
    fix: "Measure at the board connector under load, shorten or thicken the leads, and check the pack's charge and the supply's limit.",
  },
  {
    kind: "result",
    id: "e_batt",
    short: "Low or disconnected battery",
    cause: "A low battery, a wrong supply setting or a bad connector",
    why: "If both points are low, the source itself is low rather than the board dropping the voltage.",
    fix: "Measure the pack with nothing connected, then check the connector pinout and the supply setting.",
  },

  // ----- will not program -----
  {
    kind: "step",
    id: "pg1",
    tool: "Scope",
    short: "3V3 and EN at the module",
    title: "Is 3V3 stable and is EN high?",
    body: "On the ESP32 module, 3V3 (pin 2) should read 3.2 to 3.4 V and EN (pin 3) above about 2.4 V. Put a scope on both while pressing and releasing the EN button. What do you see?",
    options: [
      { label: "3V3 or EN is wrong or noisy", tag: "rail or EN bad", to: "e_rail" },
      { label: "Both are clean", tag: "both clean", to: "pg2" },
    ],
  },
  {
    kind: "step",
    id: "pg2",
    tool: "Scope",
    short: "TXD0 at reset",
    title: "Watch TXD0 while you reset the module",
    body: "Connect a scope or logic analyzer to GPIO1 (TXD0) and press EN. The ROM bootloader prints a short burst at 115200 baud on every reset. Do you see it?",
    options: [
      { label: "Yes, a burst at reset", tag: "burst", to: "pg3" },
      { label: "Nothing at all", tag: "silent", to: "e_strap" },
    ],
  },
  {
    kind: "step",
    id: "pg3",
    tool: "Logic analyzer",
    short: "TX and RX wiring",
    title: "The chip boots. Check the serial wiring",
    body: "Adapter TX must go to module RXD0 and adapter RX to TXD0, with a common ground and 3.3 V logic. How are your wires?",
    options: [
      { label: "TX goes to TX and RX to RX", tag: "straight through", to: "e_txrx" },
      { label: "Crossed correctly, still fails", tag: "crossed", to: "pg4" },
    ],
  },
  {
    kind: "step",
    id: "pg4",
    tool: "DMM",
    short: "BOOT and EN behaviour",
    title: "Does GPIO0 really go low, and does EN pulse?",
    body: "Probe GPIO0 while holding BOOT: it should read near 0 V. Probe EN while pressing the EN button: it should drop to 0 V and recover in about 10 ms. What do you measure?",
    options: [
      { label: "GPIO0 stays high, or EN does not move", tag: "stuck", to: "e_button" },
      { label: "Both behave", tag: "both fine", to: "e_progok" },
    ],
  },
  {
    kind: "result",
    id: "e_rail",
    short: "Fix the rail or EN first",
    cause: "The rail or EN has to be fixed first",
    why: "A module cannot boot from a drooping rail or a floating EN, so programming trouble is only a symptom.",
    fix: "Switch to the wrong-voltage tree. For EN, check the 10 kΩ pull-up, the 1 µF capacitor and that the EN button is not stuck.",
  },
  {
    kind: "result",
    id: "e_strap",
    short: "Strapping pin or module solder",
    cause: "A strapping pin is at the wrong level, or the module is not soldered",
    why: "At reset the ESP32 samples GPIO0, 2, 5, 12 and 15. GPIO12 high selects 1.8 V flash and stops a 3.3 V module from booting, and GPIO0 low enters the bootloader. An open ground pad on the module also gives a silent chip.",
    fix: "Probe GPIO0, 2, 12 and 15 during reset, remove any pull-up on GPIO12, and reflow the module's ground pad and pins.",
  },
  {
    kind: "result",
    id: "e_txrx",
    short: "TX and RX not crossed",
    cause: "TX and RX are not crossed",
    why: "The adapter's TX has to meet the module's RX. Straight-through wiring gives no data in either direction.",
    fix: "Swap the two wires and confirm a common ground and 3.3 V levels.",
  },
  {
    kind: "result",
    id: "e_button",
    short: "BOOT or EN circuit fault",
    cause: "A fault in the BOOT or EN circuit",
    why: "A missing pull-up, a wrong footprint on the tactile switch, or an EN capacitor that is shorted or open keeps the module from entering the bootloader or resetting cleanly.",
    fix: "Check the 10 kΩ pull-up and 1 µF capacitor on EN, the switch footprint pinout, and continuity from each button to its pin.",
  },
  {
    kind: "result",
    id: "e_progok",
    short: "Hardware is fine: firmware or supply",
    cause: "The programming path is good, so look at firmware or supply",
    why: "The hardware answers resets and straps. What remains is baud rate, a supply that droops when Wi-Fi starts, or a flash fault.",
    fix: "Lower the baud rate, try another cable, measure 3V3 during the first Wi-Fi transmit burst, and read the chip and flash IDs with esptool.",
  },

  // ----- resets -----
  {
    kind: "step",
    id: "rs1",
    tool: "Scope",
    short: "3V3 at the module",
    title: "Catch the dip: single shot, falling edge at 3.0 V",
    body: "Probe 3V3 at the module with the spring ground on the module's own GND pin. Trigger single shot on a falling edge at 3.0 V, then start the motors or the radio. Does the rail dip?",
    options: [
      { label: "Yes, in step with motor start or Wi-Fi", tag: "dips", to: "rs2" },
      { label: "No, the rail stays clean", tag: "clean", to: "rs4" },
    ],
  },
  {
    kind: "step",
    id: "rs2",
    tool: "Scope",
    short: "VM at the driver",
    title: "Is VM collapsing too?",
    body: "Put the second probe on VM at the TB6612FNG with the first still on 3V3, and compare their dips.",
    options: [
      { label: "VM sags by more than 1 V or spikes", tag: "VM sags", to: "e_bulk" },
      { label: "VM is clean but 3V3 dips", tag: "3V3 only", to: "e_ldo2" },
    ],
  },
  {
    kind: "step",
    id: "rs4",
    tool: "Scope",
    short: "EN at the reset instant",
    title: "Probe EN at the instant of the reset",
    body: "Trigger on EN, or on the reset message on the serial port. Does EN glitch low?",
    options: [
      { label: "EN glitches low", tag: "EN glitch", to: "e_en" },
      { label: "EN stays high", tag: "EN clean", to: "e_wdt" },
    ],
  },
  {
    kind: "result",
    id: "e_bulk",
    short: "Bulk capacitance and shared return",
    cause: "Too little bulk capacitance and a shared ground return",
    why: "Motor inrush pulled through the battery lead and a shared ground trace collapses VM and shifts the logic ground, and nothing local supplies the burst.",
    fix: "Add 100 µF plus 10 µF and 100 nF within 5 mm of VM, give the motor current its own return to the battery connector, soft-start the PWM and add 100 nF across the motor terminals.",
  },
  {
    kind: "result",
    id: "e_ldo2",
    short: "Regulator transient response",
    cause: "The regulator's transient response or output capacitor",
    why: "VM is fine but 3V3 dips on radio bursts: the LDO's output capacitor is missing or has the wrong ESR, or the bursts exceed its current limit.",
    fix: "Fit the 22 µF tantalum the AMS1117 needs plus 10 µF and 100 nF at the module, and confirm the source can deliver 500 mA peaks.",
  },
  {
    kind: "result",
    id: "e_en",
    short: "Noise coupled into EN",
    cause: "Noise coupled into the EN pin",
    why: "A long, high-impedance EN trace near the motor leads picks up spikes, and a glitch below about a quarter of the supply resets the chip.",
    fix: "Fit or enlarge the EN capacitor (100 nF to 1 µF), keep the trace short and keep it away from motor wiring.",
  },
  {
    kind: "result",
    id: "e_wdt",
    short: "Internal reset: read the reason",
    cause: "No hardware cause found: read the reset reason",
    why: "With clean rails and EN the reset is internal: a watchdog, a brown-out flag from a dip faster than your trigger, or a crash.",
    fix: "Print the reset reason at boot, capture with a faster single-shot trigger, and check stack usage and the brown-out setting.",
  },

  // ----- peripheral does not answer -----
  {
    kind: "step",
    id: "pp1",
    tool: "DMM",
    short: "Power at the device pins",
    title: "Measure the device's supply at its own pins",
    body: "Measure VCC and GND on the sensor's pins, not at the regulator. The classic HC-SR04 needs 5 V; the HC-SR04P also runs from 3.3 V. What do you read?",
    options: [
      { label: "Missing or wrong", tag: "no power", to: "e_pwr" },
      { label: "Correct", tag: "powered", to: "pp2" },
    ],
  },
  {
    kind: "step",
    id: "pp2",
    tool: "Logic analyzer",
    short: "Capture the bus",
    title: "Capture the signal lines",
    body: "Set the threshold to 1.65 V for 3.3 V logic and sample at least four times faster than the bus clock. Do you see edges and an address or trigger pulse?",
    options: [
      { label: "No edges at all", tag: "no edges", to: "e_open" },
      { label: "Edges, but no answer", tag: "no reply", to: "pp3" },
    ],
  },
  {
    kind: "step",
    id: "pp3",
    tool: "Scope",
    short: "Edge shape and levels",
    title: "Zoom in with a scope",
    body: "Check amplitude and rise time. I2C at 400 kHz needs rise times under 300 ns, so 2.2 to 4.7 kΩ pull-ups to 3.3 V. For an HC-SR04, ECHO must never exceed 3.3 V at the ESP32 pin. What do you see?",
    options: [
      { label: "Slow rounded edges or a low high level", tag: "bad edges", to: "e_pullup" },
      { label: "Clean edges, still no reply", tag: "clean", to: "e_addr" },
    ],
  },
  {
    kind: "result",
    id: "e_pwr",
    short: "Supply open or wrong",
    cause: "The supply is open, on the wrong rail, or missing 5 V",
    why: "A sensor that needs 5 V will not answer from 3.3 V, and an open trace or cold joint leaves it unpowered.",
    fix: "Check continuity from the regulator to the pin, confirm the sensor's supply range (use an HC-SR04P on 3.3 V) and check its ground.",
  },
  {
    kind: "result",
    id: "e_open",
    short: "Open, short or wrong pin",
    cause: "An open trace, a short or a wrong pin mapping",
    why: "No edges means the signal never leaves the MCU: the wrong GPIO in firmware, a pin used by the flash or a strapping pin, or an open trace.",
    fix: "Check the GPIO number in firmware against the schematic, probe at the MCU pin and then at the header, and avoid GPIO6 to 11.",
  },
  {
    kind: "result",
    id: "e_pullup",
    short: "Pull-ups or bus capacitance",
    cause: "Missing or weak pull-ups, or too much bus capacitance",
    why: "I2C is open-drain: without 2.2 to 4.7 kΩ pull-ups the line rises slowly or never, and long wires add capacitance.",
    fix: "Fit 2.2 to 4.7 kΩ pull-ups to 3.3 V, shorten the wires and lower the bus speed.",
  },
  {
    kind: "result",
    id: "e_addr",
    short: "Address, reset or level mismatch",
    cause: "A wrong address, a device held in reset, or a logic-level mismatch",
    why: "Clean edges with no acknowledge point to the wrong 7-bit address, an address strap tied the wrong way, a reset pin held low, or a 5 V device that needs a level shifter.",
    fix: "Run an I2C scan, check the address and reset pins, and confirm the device's logic levels.",
  },
];

export const nodes: Record<string, FlowNode> = Object.fromEntries(list.map((n) => [n.id, n]));
