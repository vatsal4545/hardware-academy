"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { IndustryMap } from "@/components/viz/semiconductors/IndustryMap";

const BOX_W = 108;
const BOX_Y = 118;
const BOX_H = 56;

const stages = [
  { x: 6, title: "Design", who: "RTL → layout", time: "1-3 years", color: vizColors.violet },
  { x: 136, title: "Fabrication", who: "≈1,000 steps", time: "≈3 months", color: vizColors.cyan },
  { x: 266, title: "Wafer sort", who: "probe every die", time: "hours per lot", color: vizColors.cyan },
  { x: 396, title: "Package + test", who: "assemble, final test", time: "2-6 weeks", color: vizColors.orange },
  { x: 526, title: "System", who: "board, product", time: "years in use", color: vizColors.amber },
];

const handoffs = ["GDSII", "wafers", "good dies", "chips"];

function Bracket({ x1, x2, y, text, color }: { x1: number; x2: number; y: number; text: string; color: string }) {
  return (
    <g>
      <path d={`M${x1} ${y + 8} V${y} H${x2} V${y + 8}`} fill="none" stroke={color} strokeWidth={1.5} />
      <Label x={(x1 + x2) / 2} y={y - 9} size={11} color={color}>
        {text}
      </Label>
    </g>
  );
}

function ValueChainFigure() {
  return (
    <SvgCanvas
      viewBox="0 0 640 300"
      title="Value chain: design, fabrication, wafer sort, assembly and test, system, with the companies that supply each step"
    >
      <rect x={0} y={0} width={640} height={300} fill={vizColors.bg} />

      <Bracket x1={6} x2={504} y={26} text="IDM (Intel, TI, Infineon, ST): all of these steps in-house" color={vizColors.green} />
      <Bracket x1={6} x2={114} y={70} text="Fabless" color={vizColors.violet} />
      <Bracket x1={136} x2={374} y={70} text="Foundry (TSMC, Samsung)" color={vizColors.cyan} />
      <Bracket x1={396} x2={504} y={70} text="OSAT" color={vizColors.orange} />
      <Bracket x1={526} x2={634} y={70} text="OEM" color={vizColors.amber} />

      {stages.map((s) => (
        <g key={s.title}>
          <Label x={s.x + BOX_W / 2} y={BOX_Y - 12} size={10} color={vizColors.muted}>
            {s.time}
          </Label>
          <rect x={s.x} y={BOX_Y} width={BOX_W} height={BOX_H} rx={8} fill={s.color} fillOpacity={0.14} stroke={s.color} />
          <Label x={s.x + BOX_W / 2} y={BOX_Y + 20} size={12} bold color={vizColors.text}>
            {s.title}
          </Label>
          <Label x={s.x + BOX_W / 2} y={BOX_Y + 38} size={10} color={vizColors.muted}>
            {s.who}
          </Label>
        </g>
      ))}
      {handoffs.map((h, k) => {
        const x1 = stages[k].x + BOX_W + 2;
        const x2 = stages[k + 1].x - 2;
        return (
          <g key={h}>
            <Arrow x1={x1} y1={BOX_Y + BOX_H / 2} x2={x2} y2={BOX_Y + BOX_H / 2} color={vizColors.text} width={1.5} head={7} />
            <Label x={(x1 + x2) / 2} y={BOX_Y + BOX_H + 14} size={10} color={vizColors.amber}>
              {h}
            </Label>
          </g>
        );
      })}

      {/* Suppliers feeding the chain from below */}
      {[
        { x: 4, w: 146, cx: 60, title: "EDA + IP", who: "Synopsys, Cadence, Arm" },
        { x: 158, w: 248, cx: 190, title: "Equipment + materials", who: "ASML, AMAT, Lam, TEL, KLA · wafers, resists" },
        { x: 414, w: 146, cx: 450, title: "Test equipment", who: "Advantest, Teradyne" },
      ].map((f) => (
        <g key={f.title}>
          <rect x={f.x} y={232} width={f.w} height={48} rx={8} fill={vizColors.grid} stroke={vizColors.muted} strokeOpacity={0.5} />
          <Label x={f.x + f.w / 2} y={249} size={11} bold color={vizColors.text}>
            {f.title}
          </Label>
          <Label x={f.x + f.w / 2} y={266} size={10} color={vizColors.muted}>
            {f.who}
          </Label>
          <Arrow x1={f.cx} y1={230} x2={f.cx} y2={BOX_Y + BOX_H + 3} color={vizColors.muted} width={1.5} head={7} dashed />
        </g>
      ))}
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Who does what, and where you fit">
        <Prose>
          <p>
            A chip passes through several specialist industries before it reaches a phone or a car. Knowing who does
            what tells you where the jobs are, what each company buys and sells, and what its interviews will ask.
          </p>

          <h3>The value chain</h3>
          <ul>
            <li>
              <strong>EDA.</strong> Synopsys, Cadence and Siemens EDA (formerly Mentor Graphics) sell the software used
              to simulate, synthesize, place, route and verify chips. Synopsys bought Ansys for about $35 billion in
              2025.
            </li>
            <li>
              <strong>IP.</strong> Arm licenses CPU cores and its instruction set, and more than 250 billion Arm-based
              chips have shipped. Synopsys and Cadence also sell interface IP such as USB, PCIe and DDR; RISC-V offers
              an open alternative.
            </li>
            <li>
              <strong>Fabless.</strong> NVIDIA, Qualcomm, AMD, Apple, Broadcom and MediaTek design chips and own the
              customer but have no fabs. AMD went fabless in 2009 when it spun its fabs out as GlobalFoundries.
            </li>
            <li>
              <strong>Foundry.</strong> TSMC holds about two-thirds of foundry revenue and nearly all leading-edge
              logic. Samsung shipped the first gate-all-around 3 nm process in 2022, Intel Foundry now builds for outside
              customers, and GlobalFoundries focuses on mature and specialty nodes.
            </li>
            <li>
              <strong>IDM.</strong> Intel, Texas Instruments, Infineon, STMicroelectronics, NXP and Micron design and
              manufacture their own products. Analog and power companies stay IDMs because their process is their
              product.
            </li>
            <li>
              <strong>Equipment.</strong> ASML (lithography, the only EUV maker), Applied Materials (deposition, etch,
              implant, CMP), Lam Research (etch and deposition), Tokyo Electron (coater/developer tracks, etch) and KLA
              (inspection and metrology). Shin-Etsu and SUMCO supply most wafers.
            </li>
            <li>
              <strong>OSAT.</strong> ASE, Amkor and JCET package and test chips; TSMC and Intel also do advanced
              packaging in-house.
            </li>
          </ul>
        </Prose>

        <Figure caption="What moves between stages (GDSII, wafers, good dies, packaged chips), how long each stage takes, and which business model covers it. An IDM keeps design, fabrication and often assembly under one roof.">
          <ValueChainFigure />
        </Figure>

        <Prose>
          <h3>Moore’s law, briefly</h3>
          <p>
            In 1965 Gordon Moore noted that components per chip were doubling every year; in 1975 he revised it to every
            two years. The trend held for five decades: Intel’s 4004 of 1971 had 2,300 transistors on a 10 µm process,
            Apple’s M1 in 2020 had 16 billion, and NVIDIA’s B200 in 2024 has 208 billion across two dies. Dennard
            scaling, which kept power density constant as transistors shrank, broke down around 2005, so clock speeds
            stalled near 3-5 GHz. Gains moved to more cores, accelerators, new transistor shapes (FinFET, first shipped
            by Intel in 2012; gate-all-around from 2022) and advanced packaging. Node names such as “3 nm” are now
            labels: nothing on the chip is 3 nm wide.
          </p>

          <h3>Policy: the CHIPS Act and export controls</h3>
          <p>
            Leading-edge production is concentrated in Taiwan and South Korea, so governments now treat chips as
            strategic. The US CHIPS and Science Act of August 2022 provides $52.7 billion, including $39 billion of
            manufacturing incentives, plus a 25% investment tax credit for new fabs (raised to 35% in 2025); it funded
            projects by TSMC, Intel, Samsung and Micron. Since October 2022, US export controls restrict advanced AI
            chips and chipmaking tools to China, and the Netherlands and Japan restrict EUV and advanced DUV tools;
            ASML has never shipped an EUV scanner to China. New fabs and packaging plants in Arizona, Texas, Ohio and
            New York will need engineers and technicians for years.
          </p>

          <h3>The roles and what interviews ask</h3>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>What you do</th>
                <th>What interviews probe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Process engineer</td>
                <td>Own one unit process (etch, litho, CMP) in a fab: recipes, SPC, excursions</td>
                <td>Process physics, control charts, design of experiments, a yield story</td>
              </tr>
              <tr>
                <td>Device engineer</td>
                <td>Design and characterize transistors; build models for designers</td>
                <td>MOSFET physics, I-V curves, leakage, reliability (BTI, HCI, TDDB)</td>
              </tr>
              <tr>
                <td>Design engineer</td>
                <td>Digital RTL and timing, or analog blocks such as regulators and ADCs</td>
                <td>Verilog, setup and hold, CMOS circuits, op-amps and feedback</td>
              </tr>
              <tr>
                <td>Verification engineer</td>
                <td>Prove the design works before tape-out with testbenches and coverage</td>
                <td>SystemVerilog, UVM, assertions, debugging a failing test</td>
              </tr>
              <tr>
                <td>Applications / field applications</td>
                <td>Help customers design the chip in: reference designs, board debug, app notes</td>
                <td>Datasheets, board-level debug, power conversion, a customer role-play</td>
              </tr>
              <tr>
                <td>Product / test engineer</td>
                <td>Write ATE test programs, characterize parts over temperature, cut test time</td>
                <td>Test coverage, DPPM, guardbands, bin analysis, Python</td>
              </tr>
              <tr>
                <td>Yield engineer</td>
                <td>Find and kill defect sources with wafer maps, inspection data and statistics</td>
                <td>Yield models, wafer-map signatures, Pareto charts, SQL and Python</td>
              </tr>
            </tbody>
          </table>

          <h3>What a two-week learner can credibly target</h3>
          <p>
            Two weeks will not make you a device physicist or an analog designer; those roles expect a degree in the
            field and years of depth. It is enough to interview credibly where your other strengths count:
            applications and FAE roles at power and microcontroller companies (TI, Infineon, ST, NXP, Microchip,
            onsemi, Wolfspeed), especially where EV and charging experience matters; product and test engineering,
            where Python and automation carry over to ATE and data work; yield and data roles that need SQL and
            statistics; and EV powertrain or charger hardware roles that select SiC and GaN parts. Lead with what you
            have built, and connect it to their products.
          </p>
        </Prose>

        <Callout kind="interview" title="Interview angle">
          For any failure question, say the flow out loud before diving in: gather data and contain, reproduce under
          field conditions, non-destructive analysis, fault isolation, physical analysis, root cause, corrective action,
          verify.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: explore the map and trace a chip">
        <IndustryMap />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Write a two-sentence pitch for an applications-engineer role">
          <p>
            You are coming from EV charging and software, applying for a SiC applications-engineer role at a power
            semiconductor company. Write two sentences: the first proves you have done relevant work, with a number;
            the second says what you will do for their customers with their products. Then compare with the worked
            answer and the checklist.
          </p>
          <CodeBlock
            lang="text"
            code={[
              "Template",
              "  1) I have <built/shipped X> where I <did the hardware or debug part>, <number>.",
              "  2) I want to bring that to <their product line>, helping <their customers>",
              "     <do something faster or better> because I have <shared context>.",
              "",
              "Worked answer",
              "  1) For the last four years I have built EV charging sites end to end, specifying",
              "     the power hardware for 150 kW DC chargers, commissioning them and writing the",
              "     software that monitors their faults across more than 40 stalls.",
              "  2) I want to bring that to your SiC applications team, helping charger and",
              "     inverter makers design your MOSFETs in and debug their first boards, because I",
              "     have been the customer who needed exactly that support.",
              "",
              "Checklist (the worked answer passes all four)",
              "  [x] a specific system and a number (150 kW, 40 stalls, four years)",
              "  [x] names their product (SiC MOSFETs) and their customer (charger makers)",
              "  [x] says what you will do (design-in support, board debug), not what you want",
              "  [x] makes no claim you could not defend in a follow-up question",
            ].join("\n")}
          />
          <p>
            Expect the follow-up “tell me about a time you debugged a power-hardware problem,” and have one story ready
            with a measurement, a root cause and a fix.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
