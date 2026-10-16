"use client";

import { Callout, CodeBlock, Exercise, Figure, Prose, Section } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, vizColors } from "@/components/viz/shared";
import { ChargingSessionFlow } from "@/components/viz/ev/ChargingSessionFlow";

const EV = "#fb923c";

interface Block {
  x: number;
  w: number;
  lines: string[];
  color?: string;
}

const POWER_PATH: Block[] = [
  { x: 10, w: 80, lines: ["Grid", "480 V", "3-phase AC"], color: vizColors.muted },
  { x: 102, w: 80, lines: ["Input", "breaker +", "contactor"] },
  { x: 194, w: 92, lines: ["AC → DC", "rectifier", "with PFC"] },
  { x: 298, w: 56, lines: ["DC link", "~800 V"] },
  { x: 366, w: 112, lines: ["Isolated DC-DC", "HF inverter,", "transformer,", "rectifier"] },
  { x: 490, w: 104, lines: ["Output", "contactors,", "precharge,", "insulation mon."] },
  { x: 606, w: 106, lines: ["Liquid-cooled", "cable and", "connector,", "pin sensors"], color: vizColors.cyan },
];

function DcChargerFigure() {
  const top = 54;
  const h = 84;
  return (
    <SvgCanvas viewBox="0 0 720 300" title="Block diagram of a DC fast charger from the grid connection to the vehicle connector">
      <rect x={0} y={0} width={720} height={300} rx={8} fill={vizColors.bg} />
      <Label x={14} y={22} anchor="start" size={14} bold>
        Inside a DC fast charger
      </Label>
      <Label x={706} y={22} anchor="end" size={11} color={EV}>
        power path →
      </Label>
      {/* stacked power modules behind the conversion stages */}
      {[12, 6].map((o) => (
        <rect key={o} x={188 + o} y={top - 8 + o} width={296} height={h + 14} rx={8} fill="none" stroke={EV} strokeOpacity={0.25} strokeDasharray="4 4" />
      ))}
      <rect x={188} y={top - 8} width={296} height={h + 14} rx={8} fill="none" stroke={EV} strokeOpacity={0.6} strokeDasharray="4 4" />
      <Label x={336} y={top + h + 22} size={10} color={EV}>
        one power module, tens of kW; cabinets stack several in parallel
      </Label>
      {POWER_PATH.map((b) => (
        <g key={b.lines[0]}>
          <rect x={b.x} y={top} width={b.w} height={h} rx={6} fill="#1a2235" stroke={b.color ?? EV} />
          {b.lines.map((l, k) => (
            <Label key={l} x={b.x + b.w / 2} y={top + 16 + k * 17} size={k === 0 ? 11 : 10} bold={k === 0} color={k === 0 ? vizColors.text : vizColors.muted}>
              {l}
            </Label>
          ))}
        </g>
      ))}
      {POWER_PATH.slice(0, -1).map((b, i) => (
        <Arrow key={b.lines[0]} x1={b.x + b.w - 3} y1={top + h / 2} x2={POWER_PATH[i + 1].x + 5} y2={top + h / 2} color={EV} width={2.5} head={7} />
      ))}
      {/* DC link capacitor symbol */}
      <line x1={318} x2={334} y1={top + 50} y2={top + 50} stroke={vizColors.text} strokeWidth={2} />
      <line x1={318} x2={334} y1={top + 56} y2={top + 56} stroke={vizColors.text} strokeWidth={2} />

      {/* control and cooling */}
      <rect x={194} y={196} width={340} height={56} rx={6} fill="#1f1530" stroke={vizColors.violet} />
      <Label x={364} y={212} size={11} bold color={vizColors.violet}>
        Charger controller
      </Label>
      <Label x={364} y={229} size={10} color={vizColors.muted}>
        ISO 15118 / DIN 70121 to the car over the pilot wire
      </Label>
      <Label x={364} y={243} size={10} color={vizColors.muted}>
        OCPP to the backend; sets module current, works contactors
      </Label>
      {[240, 422, 520].map((x) => (
        <line key={x} x1={x} x2={x} y1={196} y2={top + h} stroke={vizColors.violet} strokeDasharray="3 3" opacity={0.8} />
      ))}
      <path d={`M 534 224 L 640 224 L 640 ${top + h}`} fill="none" stroke={vizColors.violet} strokeDasharray="3 3" opacity={0.8} />
      <rect x={10} y={196} width={172} height={56} rx={6} fill="#141b2a" stroke={vizColors.grid} />
      <Label x={96} y={212} size={11} bold>
        Backend (CSMS)
      </Label>
      <Label x={96} y={229} size={10} color={vizColors.muted}>
        auth, billing, status,
      </Label>
      <Label x={96} y={243} size={10} color={vizColors.muted}>
        power limits via OCPP
      </Label>
      <line x1={182} x2={194} y1={224} y2={224} stroke={vizColors.violet} strokeDasharray="3 3" />
      <rect x={446} y={262} width={266} height={30} rx={6} fill="#0f2a2f" stroke={vizColors.cyan} />
      <Label x={579} y={277} size={10} color={vizColors.cyan}>
        cooling: module fans or chiller, cable coolant loop
      </Label>
      <line x1={690} x2={690} y1={262} y2={top + h} stroke={vizColors.cyan} strokeWidth={2} />
    </SvgCanvas>
  );
}

export default function Lesson() {
  return (
    <>
      <Section id="theory" title="Where the charger actually lives">
        <Prose>
          <p>
            Every EV battery charges on DC. The only question is where the grid&apos;s AC becomes DC: inside the car, in a small on-board charger, or
            in a large cabinet beside the parking space. That one choice explains the power levels, the connectors and most of the cost of a charging
            site.
          </p>

          <h3>AC charging: the charger is in the car</h3>
          <p>
            <strong>Level 1</strong> uses a 120 V outlet at 12 A, about <strong>1.4 kW</strong>, a few miles of range per hour.{" "}
            <strong>Level 2</strong> uses 208-240 V at up to 80 A, <strong>7-19 kW</strong>: 32 A at 240 V is 7.7 kW and 80 A is 19.2 kW. The wall
            box, properly the EVSE, is not a charger at all. It is a contactor, a ground-fault monitor that trips at 20 mA, and a signalling circuit.
            The car&apos;s <strong>on-board charger</strong> (OBC) does the AC-to-DC conversion, and its rating, commonly 7-11.5 kW, sets the
            ceiling because every kilowatt of converter rides around in the car. In Europe, Type 2 sockets add three-phase power: 400 V at 16 A is
            11 kW and at 32 A is 22 kW.
          </p>
          <p>
            The EVSE talks to the car over the <strong>control pilot</strong>, a 1 kHz, ±12 V square wave whose duty cycle advertises the most
            current the car may draw: <code>amps = duty × 0.6</code> between 10 % and 85 % duty, so 53.3 % means 32 A. The car answers by loading the
            pilot: 9 V means plugged in, 6 V means ready for power.
          </p>

          <h3>DC fast charging: the charger is the cabinet</h3>
          <p>
            A <strong>DC fast charger</strong> (50-350 kW) moves the converter off the car. Grid AC, usually 480 V three-phase in North America, is
            rectified with power-factor correction to a DC link of roughly 800 V. An <strong>isolated DC-DC stage</strong> (a high-frequency
            inverter, transformer and rectifier) then produces whatever voltage and current the car requests. The transformer isolates the battery
            from the grid, so the car&apos;s high-voltage system stays floating and an insulation monitor can catch a single fault. Cabinets stack
            identical power modules of tens of kilowatts each, so one design scales and a charger can keep working at reduced power when a module
            fails. At 95 % efficiency a 150 kW charger still turns about 8 kW into heat, so fans or chillers are part of the design.
          </p>
          <p>
            The cable is a thermal problem too. Above roughly 200-250 A a passively cooled cable gets too thick and heavy to handle, so high-power
            dispensers use <strong>liquid-cooled cables</strong> that carry 500 A or more through a thin, flexible conductor, with temperature
            sensors at the connector pins that cut the current if they get hot.
          </p>
        </Prose>

        <Figure caption="Inside a DC fast charger: grid AC is rectified with power-factor correction onto a DC link, an isolated high-frequency DC-DC stage sets the voltage and current the car asks for, and the controller talks to the car (ISO 15118) and the backend (OCPP).">
          <DcChargerFigure />
        </Figure>

        <Prose>
          <h3>Connectors</h3>
          <table>
            <thead>
              <tr>
                <th>Connector</th>
                <th>Where</th>
                <th>AC</th>
                <th>DC</th>
                <th>Car-charger signalling</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>J1772 (Type 1)</td>
                <td>North America</td>
                <td>Single-phase, up to 80 A</td>
                <td>No</td>
                <td>PWM pilot</td>
              </tr>
              <tr>
                <td>CCS1</td>
                <td>North America</td>
                <td>Through its J1772 half</td>
                <td>Two extra DC pins</td>
                <td>PWM pilot + powerline (DIN 70121, ISO 15118)</td>
              </tr>
              <tr>
                <td>NACS / SAE J3400</td>
                <td>North America</td>
                <td>Yes, same pins</td>
                <td>Yes, same pins</td>
                <td>PWM pilot + powerline</td>
              </tr>
              <tr>
                <td>CHAdeMO</td>
                <td>Japan; legacy elsewhere</td>
                <td>No</td>
                <td>Yes, bidirectional</td>
                <td>CAN bus</td>
              </tr>
              <tr>
                <td>Type 2 / CCS2</td>
                <td>Europe</td>
                <td>1- or 3-phase, up to 22 kW</td>
                <td>CCS2 adds two DC pins</td>
                <td>PWM pilot + powerline</td>
              </tr>
            </tbody>
          </table>
          <p>
            Tesla opened its connector as the North American Charging Standard in November 2022 and SAE standardized it as <strong>J3400</strong>;
            most automakers have since announced a move to it, with adapters bridging the CCS1 fleet. China uses its own GB/T connectors.
          </p>

          <h3>Protocols: ISO 15118 and OCPP</h3>
          <p>
            <strong>ISO 15118</strong> (and its predecessor DIN SPEC 70121) is the conversation between car and charger, carried as powerline
            communication over the pilot wire. The car states its limits, the charger states its own, and during charging the car requests current
            in a continuous loop that the charger follows. ISO 15118 also defines <strong>Plug &amp; Charge</strong>: the car stores a contract
            certificate and is authenticated and billed automatically, with no card or app; ISO 15118-20 adds bidirectional power.{" "}
            <strong>OCPP</strong> (Open Charge Point Protocol; 1.6 and 2.0.1 are the most widely deployed versions) is the conversation between
            charger and the operator&apos;s backend: JSON over a WebSocket for authorization, transactions, meter values, status, firmware and smart-charging profiles that cap a
            charger&apos;s power. Because OCPP is open, a site owner can change backend providers without replacing hardware.
          </p>

          <h3>Designing the site</h3>
          <p>
            Charger internals drive the site design. Power flows from the utility&apos;s medium-voltage line through a pad-mount{" "}
            <strong>transformer</strong> (for example 12.47 kV to 480Y/277 V), main <strong>switchgear</strong> and feeders to the power cabinets
            and dispensers. The NEC treats EV charging as a continuous load, sized at 125 %, but NEC 625.42 lets an automatic{" "}
            <strong>load management</strong> system set the design load instead of the nameplate sum. That is how eight 150 kW dispensers can share
            600 kW of cabinets: at any moment most sessions are tapering or idle, so the transformer and service are sized near 600 kW rather than
            1.2 MW, and the utility&apos;s demand charge on the monthly peak shrinks with them.
          </p>
          <p>
            Accessible stalls are designed in, not added later. In California, CBC sections 11B-228.3 and 11B-812 set how many accessible EV spaces
            a site needs and their geometry: a van-accessible space is 12 ft wide and a standard accessible space 9 ft wide, each with a 5 ft access
            aisle and 18 ft long. Operable parts, including the connector, must sit within accessible reach ranges and work with one hand, so cable
            weight, reach and cable management matter as much as amps; lighter liquid-cooled cables help.
          </p>

          <h3>V2G, V2H and interoperability</h3>
          <p>
            With a bidirectional charger the car becomes a battery for the home (<strong>V2H</strong>) or the grid (<strong>V2G</strong>). CHAdeMO
            did this first; ISO 15118-20 brings it to CCS and NACS, and AC versions need a bidirectional on-board charger. Exporting to the grid
            needs utility interconnection approval and certified equipment, such as UL 1741-SB inverters in the US. Interoperability is the
            industry&apos;s sore point: many failed sessions are communication failures (SLAC timeouts, certificate errors, a failed insulation
            check) rather than broken power hardware. The US NEVI program requires OCPP, ISO 15118 conformance, at least four 150 kW DC ports per
            station and 97 % uptime.
          </p>
        </Prose>

        <Callout kind="tip" title="Site rule of thumb">
          Size the transformer and service for the load-managed cap, not the nameplate sum, then leave conduit and pad space for the day the cap
          rises.
        </Callout>
        <Callout kind="interview">
          Expect: where the AC-to-DC conversion happens for AC versus DC charging, what OCPP and ISO 15118 each do, and how you would size a site for N
          dispensers with power sharing. Have the 125 % continuous-load rule and the load-management exception ready.
        </Callout>
      </Section>

      <Section id="viz" title="Interactive: one session, from plug to stop">
        <Prose>
          <p>
            Play the DC session, then raise the other stalls&apos; load until the site cap, not the dispenser, limits this car. Switch to AC to see
            the pilot duty cycle change with the power the load manager can give.
          </p>
        </Prose>
        <ChargingSessionFlow />
      </Section>

      <Section id="practice" title="In practice">
        <Exercise title="Size the service for a highway site">
          <p>
            A site has 8 dispensers rated 150 kW with 2:1 power sharing. The power cabinets are 95 % efficient at 0.99 power factor, and lighting,
            controls and HVAC add 15 kVA. Find the shared cabinet power, the transformer (standard sizes 500, 750, 1,000, 1,500 kVA) and the 480 V
            main breaker, treating the load as continuous.
          </p>
          <CodeBlock
            lang="text"
            code={[
              "nameplate        = 8 × 150 kW               = 1,200 kW",
              "shared (2:1)     = 1,200 ÷ 2                = 600 kW  (4 cars at 150 kW, or 8 at 75 kW)",
              "cabinet input    = 600 ÷ 0.95               = 631.6 kW",
              "apparent power   = 631.6 ÷ 0.99             = 638.0 kVA",
              "site total       = 638.0 + 15               = 653.0 kVA",
              "transformer      = next standard size       = 750 kVA  (87 % loaded at the cap)",
              "current at 480 V = 653,000 ÷ (√3 × 480)     = 785 A",
              "continuous 125 % = 785 × 1.25               = 982 A  → 1,000 A main breaker",
              "",
              "without sharing  = 1,200 ÷ 0.95 ÷ 0.99 + 15 = 1,291 kVA → 1,500 kVA transformer",
            ].join("\n")}
          />
          <p>
            <strong>Answer:</strong> 600 kW of shared cabinets, about 653 kVA of demand, a 750 kVA transformer and a 1,000 A main breaker at 480 V.
            Four cars at 150 kW at once is also the NEVI minimum, so the cap meets it exactly. At an assumed demand charge of $20 per kW of monthly
            peak, capping the charging input near 632 kW instead of about 1,263 kW avoids up to about $12,600 a month. In California, CBC Table
            11B-228.3.2.1 then calls for one van-accessible and one standard accessible EV space for a site with 5 to 25 chargers; confirm against the
            edition your jurisdiction has adopted.
          </p>
        </Exercise>
      </Section>
    </>
  );
}
