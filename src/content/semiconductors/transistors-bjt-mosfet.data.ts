import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Bipolar junction transistor (BJT)",
      def: "A thin base between an emitter and a collector. Forward-biasing the base-emitter junction (Vbe ≈ 0.7 V) lets a small base current control a collector current β times larger.",
    },
    {
      term: "Current gain β (hFE)",
      def: "The ratio Ic/Ib in the active region, typically 50-300; a 2N3904 specifies 100-300 at 10 mA. It varies widely between parts and with temperature, so good designs do not depend on its exact value.",
    },
    {
      term: "Threshold voltage (Vth, Vgs(th))",
      def: "The gate-source voltage at which an inversion channel forms. Datasheets define it at a tiny current, often 250 µA, so it marks where conduction starts, not where the MOSFET is fully on.",
    },
    {
      term: "Inversion channel",
      def: "A thin layer of electrons, a few nanometres deep, pulled to the surface of a p-type body by a positive gate. It connects source and drain in an NMOS.",
    },
    {
      term: "Triode (linear) region",
      def: "Vds < Vgs − Vth: the channel reaches the drain and acts as a gate-controlled resistor. A MOSFET used as a switch should sit here.",
    },
    {
      term: "Saturation region (MOSFET)",
      def: "Vds ≥ Vgs − Vth: the channel pinches off near the drain and I_D ≈ ½μCox(W/L)(Vgs − Vth)², nearly independent of Vds. Used for amplifiers; the opposite of BJT 'saturation'.",
    },
    {
      term: "Rds(on)",
      def: "Drain-source resistance when fully on, specified at stated Vgs values (for example 10 V, 4.5 V or 2.5 V). Conduction loss is I²·Rds(on), and it rises about 1.5× from 25 °C to 125 °C.",
    },
    {
      term: "Gate charge (Qg)",
      def: "The charge a driver must supply to switch a MOSFET fully on, typically a few nC to over 100 nC. Switching time ≈ Qg / gate current.",
    },
    {
      term: "Body diode",
      def: "The parasitic diode from source to drain in every vertical power MOSFET, formed because the p-body is tied to the source. It conducts whenever the drain is pulled below the source.",
    },
  ],
  scenario: {
    title: "The MOSFET is 'on' but too hot to touch",
    context:
      "A greenhouse controller uses an ESP32 to switch a 12 V, 2 A irrigation pump. The designer picked an IRF540N from the parts drawer (100 V, 33 A, 44 mΩ) and drove its gate straight from a 3.3 V GPIO. On paper the loss is 2² × 0.044 = 0.18 W, so no heatsink was fitted. Within two minutes of the pump starting, the TO-220 tab is too hot to touch.",
    symptoms: [
      "The tab reaches about 110 °C in a 25 °C room; the datasheet math predicted a barely warm part",
      "Vds measures 0.7 V with the gate high, instead of the expected 0.09 V",
      "The pump runs noticeably slower than when wired straight to 12 V",
      "The same board driven from a 5 V Arduino runs much cooler, and two boards built from the same reel behave differently",
    ],
    hints: [
      "At what gate voltage is the 44 mΩ figure specified?",
      "The datasheet gives Vgs(th) = 2-4 V. At what drain current is that threshold defined?",
      "Read the drain current at Vgs = 3.3 V off the datasheet's transfer characteristic.",
    ],
    rootCause:
      "The IRF540N is a standard-level MOSFET: its 44 mΩ is guaranteed only at Vgs = 10 V, and its 2-4 V threshold is defined at just 250 µA. At 3.3 V the channel is only weakly formed, so the part sits near the edge of saturation acting like a 0.35 Ω resistor and dissipates 0.7 V × 2 A = 1.4 W. A bare TO-220 has about 62 °C/W to air, so that is an 87 °C rise. Parts at the high end of the threshold spread barely turn on at all, which explains the board-to-board variation.",
    fix: "Use a logic-level MOSFET whose Rds(on) is specified at 2.5 V, such as the IRLML6344 (37 mΩ maximum at 2.5 V, about 0.15 W at 2 A), or keep the IRF540N and drive its gate to 10-12 V through a gate driver or a level-shifting transistor stage. Add a flyback diode across the pump and a 100 kΩ gate pull-down so the MOSFET stays off while the ESP32 boots.",
    lesson:
      "Vgs(th) is where a MOSFET starts to conduct, not where it is fully on. Always read Rds(on) at the gate voltage you actually have.",
  },
  interview: [
    {
      q: "How does an n-channel MOSFET turn on?",
      a: "An NMOS has n⁺ source and drain regions in a p-type body, with a gate electrode separated from the silicon by a thin oxide. With no gate voltage the path is two back-to-back p-n junctions, so no current flows. A positive gate voltage first pushes holes away from the surface and then pulls electrons in, and above the threshold voltage the surface inverts into a thin n-type channel connecting source and drain. Because the gate is insulated it draws essentially no DC current, so the MOSFET is controlled by voltage, not current.",
      level: "screen",
    },
    {
      q: "What are the operating regions of a MOSFET, and which do you use for a switch and for an amplifier?",
      a: "Below threshold the device is in cutoff, with only subthreshold leakage that falls about tenfold per 70-100 mV. With Vgs above threshold and Vds below the overdrive Vgs − Vth, it is in the triode or linear region and behaves like a resistor set by the gate. When Vds exceeds the overdrive, the channel pinches off at the drain and the current saturates at about ½μCox(W/L)(Vgs − Vth)². Switches should sit deep in the triode region with a low Rds(on), while amplifiers sit in saturation, where the gate voltage sets the current.",
      level: "screen",
    },
    {
      q: "You need to switch a 2 A motor from a 3.3 V microcontroller. How do you choose the MOSFET, and what can go wrong?",
      a: "I start with the gate drive I actually have, so I want a logic-level part with Rds(on) specified at 2.5 V and a Vgs(th) maximum well below that, such as 1-2 V. Then I size Vds at about twice the supply, so 30 V for a 12 V motor, and check the I²R loss: 2 A through 37 mΩ is 0.15 W, about 0.22 W hot, which a SOT-23 handles on a decent copper pad. I add a flyback diode across the motor, a small gate resistor and a 100 kΩ pull-down so the motor cannot twitch during reset. The classic mistake is a standard 10 V part driven at 3.3 V, which sits half on in the linear region and cooks; for fast PWM, gate charge and switching loss also start to matter, and a gate driver becomes worthwhile.",
      level: "deep",
    },
    {
      q: "Compare BJTs and MOSFETs. Why did MOSFETs win for digital logic, and where are BJTs still used?",
      a: "A BJT is current-controlled, with Ic = βIb, and it needs base current the whole time it is on, while a MOSFET's insulated gate draws essentially no static current. That matters enormously for logic: a CMOS gate holding a state burns almost nothing, and MOSFETs scale geometrically, so Dennard scaling let each generation shrink dimensions and voltages together. NMOS and PMOS devices also sit side by side in one process, which makes CMOS possible. BJTs remain in precision analog circuits such as bandgap references, in RF as SiGe heterojunction transistors, and combined with a MOS gate as the IGBTs in many high-power inverters.",
      level: "deep",
    },
    {
      q: "What is the body diode of a power MOSFET, and when does it matter?",
      a: "In a vertical power MOSFET the p-body is shorted to the source to stop the parasitic bipolar transistor from turning on, and that leaves a p-n diode from source to drain. It conducts whenever the drain is pulled below the source, for example during dead time in an H-bridge, where it carries the inductive freewheeling current. It has a forward drop around 0.7-1 V and real reverse recovery, which adds switching loss, so synchronous designs turn the channel on to bypass it. It also means a single MOSFET cannot block current in both directions, which is why reverse-polarity and load-switch circuits often use two back to back.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "An NPN transistor with β = 100 has a base current of 50 µA in the active region. What is the collector current?",
      choices: ["50 mA", "0.5 mA", "50 µA", "5 mA"],
      answer: 3,
      explain:
        "Ic = β × Ib = 100 × 50 µA = 5 mA. This holds only in the active region; in saturation Vce collapses to about 0.2 V and the collector current is set by the external circuit instead.",
    },
    {
      q: "An NMOS with Vth = 1.5 V has Vgs = 3 V and Vds = 0.5 V. Which region is it in?",
      choices: ["Cutoff (subthreshold)", "Triode (linear)", "Saturation (pinch-off)", "Breakdown"],
      answer: 1,
      explain:
        "The overdrive is Vgs − Vth = 1.5 V, and Vds = 0.5 V is below it, so the channel reaches the drain: triode. It would saturate once Vds reached 1.5 V.",
    },
    {
      q: "With I_D = ½·k·(Vgs − Vth)², k = 2 mA/V² and Vth = 1.5 V, what is the saturation current at Vgs = 3.5 V?",
      choices: ["12.25 mA", "8 mA", "4 mA", "2 mA"],
      answer: 2,
      explain:
        "The overdrive is 2 V, so I_D = ½ × 2 mA/V² × (2 V)² = 4 mA. The square law means doubling the overdrive quadruples the current, ignoring the small channel-length-modulation term.",
    },
    {
      q: "A datasheet lists Vgs(th) = 1.0-2.0 V at I_D = 250 µA. What does that tell you?",
      choices: [
        "The MOSFET is fully on for any Vgs above 2 V, so a 3.3 V logic output can drive it directly",
        "Conduction starts somewhere between 1 and 2 V; you still need Rds(on) at your actual Vgs",
        "The gate oxide will be damaged above 2 V, so the drive voltage must be clamped below that",
        "Rds(on) is guaranteed at Vgs = 2 V, so the datasheet on-resistance applies at that drive",
      ],
      answer: 1,
      explain:
        "Vgs(th) is defined at a tiny current, 250 µA here, so it only marks the start of conduction. Whether the part is a good switch depends on the Rds(on) rating at the gate voltage you can actually supply.",
    },
    {
      q: "A MOSFET with Rds(on) = 20 mΩ carries 5 A. What is its conduction loss?",
      choices: ["0.1 W", "0.5 W", "1 W", "2.5 W"],
      answer: 1,
      explain:
        "P = I² × Rds(on) = 25 × 0.02 = 0.5 W. Because loss goes as the square of current, doubling the current to 10 A would make it 2 W, and Rds(on) itself rises about 1.5× when hot.",
    },
    {
      q: "Why does every vertical power MOSFET contain a body diode?",
      choices: [
        "The p-body is shorted to the source, so the body-to-drift junction forms a diode from source to drain",
        "It is added deliberately as ESD protection for the gate, which would otherwise break down easily",
        "The gate oxide forms a diode with the drain, which conducts whenever the drain goes negative",
        "It exists only in P-channel parts, where the n-type body makes a junction to the drain",
      ],
      answer: 0,
      explain:
        "Tying the p-body to the source stops the parasitic NPN from turning on, but it leaves a p-n junction between source and drain. It conducts when the drain goes below the source, which H-bridges use for freewheeling.",
    },
    {
      q: "A MOSFET has a total gate charge of 20 nC and is driven by an MCU pin that can source about 20 mA. Roughly how long does a switching edge take?",
      choices: ["10 ns", "100 ns", "1 µs", "10 µs"],
      answer: 2,
      explain:
        "t ≈ Qg / I = 20 nC / 20 mA = 1 µs. During that time the MOSFET passes through its lossy linear region, so at tens of kHz the switching loss can rival conduction loss; a 2 A gate driver would cut the edge to about 10 ns.",
    },
  ],
};

export default data;
