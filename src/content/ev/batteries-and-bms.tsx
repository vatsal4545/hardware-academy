"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { BatteryPackExplorer } from "@/components/viz/ev/BatteryPackExplorer";
import { ChargingCurve } from "@/components/viz/ev/ChargingCurve";

const STEEL = "#3b4252";
const EV = "#fb923c";

function CellModulePackFigure() {
  const moduleGroups = Array.from({ length: 6 }, (_, g) => g);
  const packModules = Array.from({ length: 16 }, (_, i) => i);
  return (
    <SvgCanvas viewBox="0 0 720 250" title="A cylindrical cell, a module of six parallel groups in series, and a pack of sixteen modules">
      <rect x={0} y={0} width={720} height={250} rx={8} fill={vizColors.bg} />

      {/* cell */}
      <Label x={95} y={22} size={14} bold>
        Cell
      </Label>
      <rect x={88} y={40} width={14} height={9} rx={2} fill="#9ca3af" />
      <rect x={75} y={47} width={40} height={122} rx={7} fill={STEEL} stroke={vizColors.muted} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={81 + i * 5}
          y={68}
          width={4}
          height={82}
          fill={[vizColors.copper, "#4b5563", vizColors.silk, vizColors.blue, "#d1d5db", vizColors.blue][i]}
          opacity={0.9}
        />
      ))}
      <Label x={124} y={58} anchor="start" size={11} color={vizColors.positive}>
        +
      </Label>
      <Label x={124} y={162} anchor="start" size={11} color={vizColors.negative}>
        −
      </Label>
      <Label x={95} y={190} size={11} mono>
        2170: 3.6 V, 4.8 Ah
      </Label>
      <Label x={95} y={206} size={11} mono color={vizColors.muted}>
        17.3 Wh, 68 g
      </Label>

      <Arrow x1={170} y1={108} x2={226} y2={108} color={vizColors.muted} />
      <Label x={198} y={124} size={10} color={vizColors.muted}>
        46 parallel
      </Label>
      <Label x={198} y={138} size={10} color={vizColors.muted}>
        6 in series
      </Label>

      {/* module */}
      <Label x={345} y={22} size={14} bold>
        Module
      </Label>
      {moduleGroups.map((g) => {
        const x = 243 + g * 35;
        return (
          <g key={g}>
            <rect x={x} y={48} width={30} height={120} rx={4} fill="#141b2a" stroke={vizColors.grid} />
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} cx={x + 9 + (i % 2) * 12} cy={60 + Math.floor(i / 2) * 24} r={5} fill={STEEL} stroke="#6b7280" strokeWidth={0.8} />
            ))}
          </g>
        );
      })}
      {[0, 2, 4].map((g) => (
        <rect key={`t${g}`} x={243 + g * 35 + 10} y={40} width={45} height={5} rx={2} fill={vizColors.copper} />
      ))}
      {[1, 3].map((g) => (
        <rect key={`b${g}`} x={243 + g * 35 + 10} y={171} width={45} height={5} rx={2} fill={vizColors.copper} />
      ))}
      <Label x={345} y={190} size={11} mono>
        6s46p: 21.6 V, 220.8 Ah
      </Label>
      <Label x={345} y={206} size={11} mono color={vizColors.muted}>
        276 cells, 4.8 kWh
      </Label>

      <Arrow x1={458} y1={108} x2={514} y2={108} color={vizColors.muted} />
      <Label x={486} y={124} size={10} color={vizColors.muted}>
        16 modules
      </Label>
      <Label x={486} y={138} size={10} color={vizColors.muted}>
        in series
      </Label>

      {/* pack */}
      <Label x={612} y={22} size={14} bold>
        Pack
      </Label>
      <rect x={524} y={38} width={178} height={138} rx={8} fill="#111827" stroke={EV} />
      {packModules.map((i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        return <rect key={i} x={532 + col * 20.8} y={48 + row * 46} width={17} height={38} rx={2} fill="#1a2235" stroke={EV} strokeOpacity={0.6} />;
      })}
      <rect x={532} y={146} width={76} height={20} rx={3} fill="#1f1530" stroke={vizColors.violet} />
      <Label x={570} y={156} size={10} color={vizColors.violet}>
        BMS
      </Label>
      <rect x={616} y={146} width={78} height={20} rx={3} fill="#1a2235" stroke={vizColors.grid} />
      <Label x={655} y={156} size={10}>
        contactors
      </Label>
      <Label x={612} y={190} size={11} mono>
        96s46p: 345.6 V, 220.8 Ah
      </Label>
      <Label x={612} y={206} size={11} mono color={vizColors.muted}>
        4,416 cells, 76.3 kWh
      </Label>

      <Label x={360} y={234} size={12} color={vizColors.amber}>
        Series adds volts, parallel adds amp-hours, energy = volts × amp-hours
      </Label>
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="From one cell to a 400 V pack">
        <Prose>
          <p>
            Every EV battery is a large number of small electrochemical cells. During discharge, lithium ions leave the graphite anode, cross a liquid
            electrolyte through a porous separator and slot into the metal-oxide cathode, while electrons take the long way round through the inverter
            and motor. A nickel-rich lithium-ion cell swings from about <strong>3.0 V empty to 4.2 V full</strong>, with 3.6-3.7 V as its nominal
            value. Those limits are hard walls: above 4.2 V the cathode and electrolyte degrade quickly, and deep discharge below the minimum costs
            capacity for good. A pack&apos;s usable range ends when its weakest cell group touches either wall.
          </p>

          <h3>Chemistry and format</h3>
          <table>
            <thead>
              <tr>
                <th>Cathode</th>
                <th>Nominal</th>
                <th>Cell energy</th>
                <th>Strengths</th>
                <th>Trade-offs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>NCA (nickel cobalt aluminium)</td>
                <td>3.6 V</td>
                <td>about 250 Wh/kg</td>
                <td>High energy; Tesla&apos;s Panasonic cylindrical cells</td>
                <td>Less thermally stable; uses cobalt</td>
              </tr>
              <tr>
                <td>NMC (nickel manganese cobalt)</td>
                <td>3.6-3.7 V</td>
                <td>about 250 Wh/kg</td>
                <td>High energy; made by LG, CATL, Samsung SDI, SK On</td>
                <td>Same safety and cobalt concerns as NCA</td>
              </tr>
              <tr>
                <td>LFP (lithium iron phosphate)</td>
                <td>3.2 V</td>
                <td>roughly 160-200 Wh/kg</td>
                <td>Long cycle life, very stable, no nickel or cobalt, cheaper</td>
                <td>Heavier for the range; flat voltage curve makes SoC hard to estimate</td>
              </tr>
            </tbody>
          </table>
          <p>
            Cylindrical cells are named by size. The <strong>18650</strong> (18 mm × 65 mm) powered the 2008 Roadster and the Model S; the{" "}
            <strong>2170</strong> (21 × 70 mm) arrived with the Model 3; the <strong>4680</strong> (46 × 80 mm), announced at Tesla&apos;s Battery Day
            in September 2020, has about 5.5 times the volume of a 2170 and a tabless electrode that shortens the path for current and heat. Bigger
            cells mean fewer cans, welds and sense wires per kWh but a longer path for heat to leave the core. Prismatic and pouch cells, common for LFP
            and NMC, pack without the gaps between cylinders but rely on the module or pack to hold them under pressure.
          </p>

          <h3>Series, parallel, modules, pack</h3>
          <p>
            Cells wired in parallel form a <strong>group</strong> that shares one voltage and adds capacity; groups wired in series add voltage. The
            notation 96s46p means 96 groups of 46 cells, with <code>V = s × V_cell</code>, <code>Ah = p × Ah_cell</code> and energy{" "}
            <code>V × Ah</code>. The original Model S 85 pack holds 7,104 18650 cells in 16 modules; each module is 6 groups of 74 cells, so the pack
            is 96s74p, about 346 V nominal and 403 V full. Every group carries the same current, so the pack is empty when its lowest group reaches
            3.0 V and full when its highest reaches 4.2 V. One weak group costs the whole pack range.
          </p>
        </Prose>

        <Figure caption="Cell, module, pack: the practice pack groups 46 cells in parallel, six groups per module and 16 modules in series (96s46p).">
          <CellModulePackFigure />
        </Figure>

        <Prose>
          <h3>What the BMS does</h3>
          <ul>
            <li>
              <strong>Measures</strong> every group&apos;s voltage to a few millivolts, temperatures at many points, and pack current through a shunt
              or Hall sensor.
            </li>
            <li>
              <strong>Estimates state of charge</strong> by coulomb counting (integrating current) and corrects the drift with open-circuit-voltage
              readings after the pack rests; production BMSs usually blend the two in a Kalman filter.
            </li>
            <li>
              <strong>Tracks state of health</strong>: capacity fade and resistance growth over the pack&apos;s life.
            </li>
            <li>
              <strong>Balances</strong> the groups. Passive balancing switches a resistor across the highest groups and burns their excess as heat,
              typically at tens to a couple of hundred milliamps.
            </li>
            <li>
              <strong>Drives the contactors</strong>: a precharge relay and resistor charge the inverter&apos;s DC-link capacitors first, then the main
              positive and negative contactors close without an inrush that could weld them.
            </li>
            <li>
              <strong>Monitors isolation</strong> between the high-voltage bus and the chassis. FMVSS 305 and UN ECE R100 ask for at least 100 Ω per
              volt on a DC bus, about 40 kΩ for a 400 V pack.
            </li>
            <li>
              <strong>Sets limits</strong>: allowed charge and discharge power versus temperature, state of charge and health, sent continuously to the
              inverter and charger, and it opens the contactors on any fault.
            </li>
          </ul>

          <h3>Heat, cooling and thermal runaway</h3>
          <p>
            Cells are happiest around 15-35 °C. Tesla&apos;s cylindrical packs pump a water-glycol mix through flat, wavy <strong>cooling ribbons</strong>{" "}
            that snake between rows of cells and touch each can; prismatic and pouch packs usually sit on cold plates. The same loop heats the pack in
            winter. Abuse, an internal short or a crash can start <strong>thermal runaway</strong>: the protective film on the anode breaks down from
            roughly 80-120 °C, the separator shrinks and melts at around 130-170 °C and shorts the electrodes, and nickel-rich cathodes release oxygen
            at higher temperatures still, feeding a fire that spreads to neighbouring cells. Packs fight propagation with per-cell fuses (Tesla bonds
            each cell with a thin wire that opens like a fuse), spacing and mica barriers, vent paths that steer hot gas away from the cabin, and BMS
            alarms. LFP releases far less oxygen and heat, one reason it is chosen for standard-range and stationary packs.
          </p>

          <h3>Charging: C-rate, CC-CV and taper</h3>
          <p>
            <strong>C-rate</strong> is current relative to capacity: 1C would fill or empty the pack in about an hour, so for a 76 kWh pack 1C is
            about 76 kW and a 250 kW charge is about 3.3C. Lithium-ion cells charge <strong>CC-CV</strong>: constant current until a cell reaches its
            ceiling of about 4.2 V, then constant voltage while the current decays to a cutoff such as C/20. Fast-charging curves taper long before the
            constant-voltage phase because the BMS lowers current as the graphite anode fills. Its potential approaches that of lithium metal, and
            pushing harder would <strong>plate lithium</strong> on its surface instead of inserting it, a permanent capacity loss that can grow
            dendrites. Cold makes plating far more likely, so a cold pack may accept only a fraction of its warm power. That is why cars{" "}
            <strong>precondition</strong>, heating the pack on the way to a fast charger, and why 10-80 % is the sweet spot of a road trip.
          </p>

          <h3>Structural packs</h3>
          <p>
            Modules add mass and cost, so newer packs drop them. Cell-to-pack designs such as CATL&apos;s CTP and BYD&apos;s Blade fill the enclosure
            with cells directly. Structural packs go further: Tesla&apos;s 4680 pack for the Model Y bonds the cells into a pack whose lid is the
            cabin floor, so the battery becomes part of the body. The gains are mass, cost and stiffness; the price is repairability, because one bad
            cell can no longer be swapped with its module.
          </p>
        </Prose>

        <Callout kind="tip" title="Pack math in your head">
          Energy ≈ cells × cell watt-hours. A 2170 at 3.6 V and 4.8 Ah holds 17.3 Wh, so 4,416 of them hold about 76 kWh however you wire them; the
          arrangement only trades voltage against current.
        </Callout>
        <Callout kind="interview">
          Expect to compute s, p, volts, amp-hours and kWh on a whiteboard, explain why fast charging tapers, and list what a BMS does. Strong answers tie
          each BMS function to the failure it prevents.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: build a pack, then charge it">
        <Prose>
          <p>
            Start from the practice pack, then load the Model S layout and the 800 V rearrangement. Zoom to the module to see how parallel cells and
            alternating bus bars form series groups.
          </p>
        </Prose>
        <BatteryPackExplorer />
        <Prose>
          <p>
            Now charge the practice pack. At 25 °C the BMS map limits the current from the start; precondition to 40 °C and the charger becomes the
            limit until about 20 %. Drop the temperature to 0 °C and watch the 10-80 % time triple.
          </p>
        </Prose>
        <ChargingCurve />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Size the practice pack">
          <p>
            A pack uses 2170 cells rated 4.8 Ah and 3.6 V nominal (3.0-4.2 V), wired 96s46p. Each cell weighs 68 g. Find the cell count, the
            nominal, full and empty pack voltage, the capacity and energy, the mass of the cells alone, and the C-rate of a 250 kW charge.
          </p>
          <CodeBlock
            lang="text"
            code={[
              "cells     = 96 × 46               = 4,416",
              "nominal   = 96 × 3.6 V            = 345.6 V",
              "full      = 96 × 4.2 V            = 403.2 V",
              "empty     = 96 × 3.0 V            = 288.0 V",
              "capacity  = 46 × 4.8 Ah           = 220.8 Ah",
              "energy    = 345.6 V × 220.8 Ah    = 76,308 Wh ≈ 76.3 kWh",
              "mass      = 4,416 × 68 g          ≈ 300 kg of cells (before modules, cooling, enclosure)",
              "C-rate    = 250 kW ÷ 76.3 kWh     ≈ 3.3C",
              "",
              "sensitivity: one more cell per group adds 96 × 17.28 Wh = 1.66 kWh, so 96s48p is 79.6 kWh",
            ].join("\n")}
          />
          <p>
            <strong>Answer:</strong> 4,416 cells; 345.6 V nominal (288-403 V); 220.8 Ah; about 76.3 kWh; about 300 kg of cells; a 250 kW charge is
            about 3.3C. If a spec sheet quotes a different energy for the same layout, check its cell capacity and nominal voltage before you doubt
            your arithmetic.
          </p>
        </Exercise>
        <Exercise title="How long must the balancer run?">
          <p>
            One group in a 96s pack has an internal micro-short that leaks 25 mA. A pack-wide balancer bleeds every other group down to it at 100 mA,
            with cells around 3.7 V. How long must each healthy group bleed per day, and how much energy does the pack waste?
          </p>
          <CodeBlock
            lang="text"
            code={[
              "leak per day   = 0.025 A × 24 h          = 0.6 Ah",
              "bleed time     = 0.6 Ah ÷ 0.1 A          = 6 h per day, every healthy group",
              "energy wasted  = 95 × 0.6 Ah × 3.7 V     ≈ 211 Wh per day",
              "per year       = 211 Wh × 365            ≈ 77 kWh, about one full pack",
            ].join("\n")}
          />
          <p>
            <strong>Answer:</strong> about 6 hours of bleeding a day and about 211 Wh a day, roughly a whole pack&apos;s energy every year burned as
            heat to hide one leaking cell. The scenario below is this failure seen from the fleet dashboard.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
