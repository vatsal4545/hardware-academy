import type { LessonData } from "@/lib/curriculum";

const data: LessonData = {
  keyTerms: [
    {
      term: "Rotating magnetic field",
      def: "The field made by three windings 120° apart carrying currents 120° apart in time. Its magnitude is constant, 1.5 times one phase's peak, and it turns at the electrical frequency.",
    },
    {
      term: "Synchronous speed",
      def: "n_s = 120·f/p in rpm, with f the electrical frequency and p the number of poles: 1,500 rpm for 4 poles at 50 Hz, 12,000 rpm for 4 poles at 400 Hz.",
    },
    {
      term: "Slip",
      def: "s = (n_s − n)/n_s, how far an induction rotor lags the field; typically 1-5% at rated load. The rotor currents run at the slip frequency s·f.",
    },
    {
      term: "Back-EMF",
      def: "The voltage a spinning rotor induces in the stator windings, proportional to speed. In a PM motor it limits top speed unless the drive weakens the field.",
    },
    {
      term: "Field weakening",
      def: "Negative d-axis current that opposes the magnet flux so a PM motor can run above base speed at roughly constant power. It also pushes the magnets toward demagnetization.",
    },
    {
      term: "Demagnetization",
      def: "Permanent loss of magnet flux when heat and reverse field push NdFeB past the knee of its B-H curve. NdFeB coercivity falls about 0.5-0.6% per °C.",
    },
    {
      term: "Reluctance torque",
      def: "Torque from the rotor's steel path trying to align with the field. It needs a salient rotor (Ld ≠ Lq) and is the only torque a synchronous reluctance motor makes.",
    },
    {
      term: "Torque constant (Kt)",
      def: "Torque per amp of q-axis current in a PM motor, T = Kt·Iq, with Kt = 1.5 × pole pairs × magnet flux linkage (amplitude-invariant dq currents).",
    },
    {
      term: "Hairpin winding",
      def: "A stator winding of rectangular copper bars bent like hairpins, inserted axially and welded. Slot fill reaches about 70%, against roughly 45% for round wire.",
    },
  ],
  scenario: {
    title: "Track day leaves a PM motor 8% weaker",
    context:
      "A customer takes a rear-drive performance EV with an interior-PM motor to a track day: six back-to-back hot laps on a 32 °C afternoon. The drive unit never logged a fault. Back on the road the car feels flat. At the service visit, a timed run shows 0-100 km/h has slipped from 4.4 s to 4.8 s, and the inverter's torque estimate no longer matches the measured axle torque.",
    symptoms: [
      "At the same q-axis current, measured torque is about 8% below the delivery value, and it does not recover after a night of cooling.",
      "A coast-down test with the inverter off shows lower back-EMF: open-circuit line voltage at 6,000 rpm has dropped from 250 V to 230 V.",
      "The stator winding thermistors peaked at 140 °C, well inside the 180 °C insulation rating, so no derate was ever triggered.",
      "The loss is the same at every speed, not only near top speed.",
    ],
    hints: [
      "Which part of a PM motor is never measured directly, only estimated?",
      "NdFeB coercivity falls about 0.6% per °C. What does the drive apply to the magnets on a long straight at 16,000 rpm?",
      "Why would a thermal problem leave a permanent change after everything has cooled down?",
    ],
    rootCause:
      "Partial, irreversible demagnetization of the rotor magnets. On every straight the motor ran deep in field weakening, where a large negative d-axis current applies a reverse field to the magnets, while high-frequency eddy-current and iron losses heated the rotor. Its magnets, a grade rated for 150 °C, reached about 165 °C, where their coercivity had fallen far enough that the reverse field pushed them past the knee of the demagnetization curve. The derating logic only watched the stator thermistors, which stayed cool enough, so nothing pulled the current back. Magnet flux linkage fell 8%, and with it back-EMF, Kt and torque per amp.",
    fix:
      "Replace the rotor or the drive unit; the magnets cannot be re-magnetized in the car. Then fix the protection: derate torque and cap negative Id from an estimated magnet temperature, using a rotor thermal model cross-checked against back-EMF (flux falls measurably as magnets heat), not just from winding temperature. Add a track mode that pre-cools the oil and caps sustained power, raise oil flow through the hollow rotor shaft, and specify a higher-coercivity magnet grade (grain-boundary-diffused dysprosium or terbium, rated near 180 °C) for the performance variant.",
    lesson:
      "In a PM motor the magnets, not the windings, set the hardest thermal limit, and field weakening adds reverse field exactly when they are hottest. Protect them with a rotor-temperature estimate and derating, because demagnetization is permanent.",
  },
  interview: [
    {
      q: "How do three phase currents create a rotating magnetic field?",
      a: "Three windings sit 120° apart around the stator, and the inverter drives them with currents 120° apart in time. Each winding makes a field that only pulses along its own axis, but when you add the three vectors the pulsing parts cancel and the sum has a constant length, 1.5 times one phase's peak, pointing in a direction that turns at the electrical frequency. With more poles the pattern repeats around the stator, so it turns mechanically at 120·f/p rpm. Swapping any two phases reverses the rotation, which is all reverse gear is in an EV.",
      level: "screen",
    },
    {
      q: "What is slip, and why does an induction motor need it?",
      a: "Slip is the fraction by which the rotor turns slower than the field, s = (n_s − n)/n_s. An induction rotor has no magnets; its bars only carry current while the field sweeps past them, so at exactly synchronous speed there would be no induced current and no torque. At rated load slip is typically 1-5%, and in that range torque rises roughly in proportion to slip. The rotor currents run at the slip frequency s·f, and the rotor copper loss equals slip times the air-gap power, which is why induction rotors run hot and are hard to cool.",
      level: "screen",
    },
    {
      q: "Why did Tesla move to permanent-magnet reluctance motors, and why do its dual-motor cars still keep an induction motor?",
      a: "The 2008 Roadster and the original Model S and X used induction motors: no rare earths, rugged, and no back-EMF or drag when unpowered. But an induction motor needs magnetizing current and has rotor copper loss, so it is less efficient at the light loads where cars spend most of their time. The Model 3 (2017) introduced an interior-PM synchronous reluctance motor, where magnets buried in the rotor's flux barriers add magnet torque to reluctance torque, which raises efficiency across the drive cycle. In a dual-motor Model 3 the front motor stays induction, because when it is not needed it can be switched off completely and spins with no magnet losses. The PM motor does the efficient everyday work, and the induction motor adds peak power at almost no cost when idle.",
      level: "deep",
    },
    {
      q: "What is field weakening, and what risks does it create in a PM motor?",
      a: "Back-EMF in a PM motor rises in proportion to speed, and above base speed it would exceed the voltage the inverter can make from the DC bus, so current and torque would collapse. Field weakening injects negative d-axis current whose flux opposes the magnets, lowering the net flux linkage so the motor can keep accelerating at roughly constant power. The first risk is to the magnets: that reverse field adds to the demagnetizing stress, and hot NdFeB has less coercivity, so it can be pushed past the knee and lose flux permanently. The second is a fault at high speed: if the inverter stops switching, the full back-EMF can exceed the bus voltage and drive uncontrolled current through the diodes into the pack, so drives use an active short circuit, all three low-side switches on, as the safe state.",
      level: "deep",
    },
    {
      q: "Why are hairpin windings popular in EV motors?",
      a: "Hairpins are rectangular copper bars bent into a U, pushed axially into the slots and laser-welded at the other end. Rectangular conductors pack far better than round wire, about 70% slot fill against roughly 45%, so DC resistance and copper loss fall and heat flows more easily into the lamination stack. They also suit automated insertion and welding, which is faster and more repeatable than winding round wire. The catch is AC loss: at high frequency, current crowds into part of a thick bar through skin and proximity effects, so designers use more, thinner layers, typically four to eight per slot.",
      level: "screen",
    },
  ],
  quiz: [
    {
      q: "A 4-pole motor is fed at 400 Hz. What is its synchronous speed?",
      choices: ["6,000 rpm", "12,000 rpm", "24,000 rpm", "48,000 rpm"],
      answer: 1,
      explain: "n_s = 120·f/p = 120 × 400 / 4 = 12,000 rpm. The field makes 400 electrical turns per second, and a 4-pole machine needs two electrical turns per mechanical turn: 200 rev/s, or 12,000 rpm.",
    },
    {
      q: "Balanced currents with peak Im flow in three windings 120° apart. The resultant field vector",
      choices: [
        "Pulses between 0 and 3·Im along one fixed axis, at twice the line frequency",
        "Has constant length 3·Im and stands still, since the three currents sum to zero",
        "Has constant length 1.5·Im and rotates at the electrical frequency",
        "Rotates at the slip frequency, which is what the rotor sees",
      ],
      answer: 2,
      explain: "Adding the three phase vectors cancels the pulsating parts. The sum has a constant length of 1.5·Im and turns at ω = 2πf, which is what lets an AC motor make smooth torque.",
    },
    {
      q: "Why must an induction rotor turn slower than the stator field?",
      choices: [
        "Because current is only induced in the rotor bars when the field moves relative to them",
        "To keep the rotor magnets cool, since a rotor at synchronous speed would overheat them",
        "To reduce iron loss in the stator, which rises with the rotor's speed",
        "Because the inverter cannot reach synchronous frequency at full load",
      ],
      answer: 0,
      explain: "With no relative motion the flux through the rotor bars does not change, so no current is induced and there is no torque. A few percent of slip provides the relative motion, and the rotor currents then run at the slip frequency s·f.",
    },
    {
      q: "Field weakening in a PM motor means",
      choices: [
        "Lowering the DC bus voltage at high speed so the back-EMF stays below it",
        "Reducing the q-axis current to save energy once the car is cruising",
        "Heating the magnets on purpose so their remanence drops and the back-EMF falls",
        "Injecting negative d-axis current to oppose the magnet flux above base speed",
      ],
      answer: 3,
      explain: "Back-EMF grows with speed until it meets the inverter's voltage limit. Negative Id makes stator flux that opposes the magnets, lowering the net flux linkage so speed can keep rising at roughly constant power.",
    },
    {
      q: "A surface PM motor has 4 pole pairs and a magnet flux linkage of 0.05 Wb. With T = 1.5 × pole pairs × ψ × Iq, what torque does Iq = 400 A make?",
      choices: ["30 N·m", "60 N·m", "120 N·m", "240 N·m"],
      answer: 2,
      explain: "Kt = 1.5 × 4 × 0.05 = 0.3 N·m/A, so T = 0.3 × 400 = 120 N·m. Id does not appear: in a surface PM motor only q-axis current makes torque, while d-axis current only strengthens or weakens the flux.",
    },
    {
      q: "What combination puts NdFeB magnets at the highest risk of irreversible demagnetization?",
      choices: [
        "High temperature and a strong reverse field",
        "Low temperature and positive d-axis current",
        "Running at exactly synchronous speed",
        "High DC bus voltage at standstill",
      ],
      answer: 0,
      explain: "NdFeB coercivity drops about 0.5-0.6% per °C. Hot magnets plus the reverse field of deep field weakening or a short-circuit fault can push the working point past the knee of the B-H curve, and the lost flux does not come back.",
    },
    {
      q: "What is the main advantage of hairpin windings?",
      choices: [
        "They need no slot insulation, because the rectangular bars touch only the lamination steel",
        "They eliminate AC losses at high frequency, since the thick bars have no skin effect",
        "They let the motor run without liquid cooling, because the welded ends radiate the heat",
        "Slot fill near 70% versus about 45% for round wire, so lower copper loss and better heat transfer",
      ],
      answer: 3,
      explain: "Rectangular bars pack tightly and can be inserted and welded by machine. The trade-off is higher AC loss from skin and proximity effects at high frequency, which designers manage with more, thinner layers.",
    },
  ],
};

export default data;
