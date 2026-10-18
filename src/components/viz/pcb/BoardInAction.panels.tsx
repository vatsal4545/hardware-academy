"use client";

/**
 * The eight station panels of the components-in-action tour. Each one shows the station's controls, a small schematic
 * of just that corner of the board, and the law's numbers recomputed from the shared model. Labels on the readouts are
 * the ones the tests read. Values that can land exactly half way at three significant digits (1.155 A, 57.75 mV) are
 * shown with fixed decimals instead of formatSI, so the display never depends on the last bit of a float.
 */

import type { ReactNode } from "react";
import { Segmented, Slider, Toggle } from "@/components/lesson";
import { Arrow, Label, SvgCanvas, makeScale, polyline, vizColors } from "@/components/viz/shared";
import { BOARD, type BoardInputs, type BoardModel, type LedColor } from "@/lib/sim/board";
import type { ControlId, Station } from "./BoardInAction.board";
import { formatSI, r2, r3, Stat } from "./OhmsLawCircuit.helpers";
import { RightHandRule } from "./RightHandRule";
import { BatterySymbol, CapacitorSymbol, GroundSymbol, JunctionDot, ResistorSymbol, SwitchSymbol } from "./SchematicExplorer.symbols";

export interface StationPanelProps {
  station: Station;
  model: BoardModel;
  inputs: BoardInputs;
  onChange: (patch: Partial<BoardInputs>) => void;
}

const WIRE = "#7b8494";
const LED_COLORS: Record<LedColor, string> = { red: "#f87171", green: "#4ade80", blue: "#60a5fa" };
const mV = (v: number) => `${(v * 1e3).toFixed(2)} mV`;
const amps3 = (a: number) => `${a.toFixed(3)} A`;

/* ---------- controls ---------- */

function Control({ id, inputs, onChange }: { id: ControlId; inputs: BoardInputs; onChange: (patch: Partial<BoardInputs>) => void }) {
  switch (id) {
    case "iMotorL":
      return <Slider label="Left motor current" value={inputs.iMotorL} min={0} max={1.5} step={0.05} unit="A" onChange={(v) => onChange({ iMotorL: v })} />;
    case "iMotorR":
      return <Slider label="Right motor current" value={inputs.iMotorR} min={0} max={1.5} step={0.05} unit="A" onChange={(v) => onChange({ iMotorR: v })} />;
    case "iLogic":
      return (
        <Slider
          label="Logic current (ESP32, sensors, driver logic)"
          value={Math.round(inputs.iLogic * 1000)}
          min={50}
          max={400}
          step={10}
          unit="mA"
          onChange={(v) => onChange({ iLogic: v / 1000 })}
        />
      );
    case "vPack":
      return <Slider label="Pack voltage" value={inputs.vPack} min={6} max={8.4} step={0.1} unit="V" onChange={(v) => onChange({ vPack: v })} />;
    case "ledColor":
      return (
        <Segmented<LedColor>
          label="LED colour (forward voltage)"
          options={[
            { value: "red", label: "Red, 2.0 V" },
            { value: "green", label: "Green, 2.2 V" },
            { value: "blue", label: "Blue, 3.0 V" },
          ]}
          value={inputs.ledColor}
          onChange={(v) => onChange({ ledColor: v })}
        />
      );
    case "ledR":
      return (
        <Segmented<string>
          label="R3, the series resistor"
          options={[
            { value: "220", label: "220 Ω" },
            { value: "470", label: "470 Ω" },
            { value: "1000", label: "1 kΩ" },
            { value: "2200", label: "2.2 kΩ" },
          ]}
          value={String(inputs.ledR)}
          onChange={(v) => onChange({ ledR: Number(v) })}
        />
      );
    case "enC":
      return (
        <Segmented<string>
          label="C8 on the EN pin"
          options={[
            { value: "1e-7", label: "100 nF" },
            { value: "0.000001", label: "1 µF" },
            { value: "0.00001", label: "10 µF" },
          ]}
          value={String(inputs.enC)}
          onChange={(v) => onChange({ enC: Number(v) })}
        />
      );
    case "decouplingMm":
      return <Slider label="Capacitor distance from the pin" value={inputs.decouplingMm} min={1} max={30} step={1} unit="mm" onChange={(v) => onChange({ decouplingMm: v })} />;
    case "duty":
      return <Slider label="PWM duty (sets speed and ripple)" value={Math.round(inputs.duty * 100)} min={0} max={100} step={5} unit="%" onChange={(v) => onChange({ duty: v / 100 })} />;
    case "forward":
      return (
        <Segmented<string>
          label="Left motor direction (AIN1, AIN2)"
          options={[
            { value: "fwd", label: "Forward" },
            { value: "rev", label: "Reverse" },
          ]}
          value={inputs.forward ? "fwd" : "rev"}
          onChange={(v) => onChange({ forward: v === "fwd" })}
        />
      );
    case "dividerCap":
      return <Toggle label="C9, 100 nF at the ADC pin" checked={inputs.dividerCap} onChange={(v) => onChange({ dividerCap: v })} />;
  }
}

/* ---------- small drawing helpers ---------- */

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <SvgCanvas viewBox="0 0 320 200" className="mx-auto max-w-[420px]" title={title}>
      <rect x={0} y={0} width={320} height={200} rx={8} fill={vizColors.bg} />
      {children}
    </SvgCanvas>
  );
}

function Wires({ d }: { d: string[] }) {
  return (
    <g fill="none" stroke={WIRE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </g>
  );
}

/** Heat arrows rising from a part; opacity follows the power. */
function Heat({ x, y, power, fullAt }: { x: number; y: number; power: number; fullAt: number }) {
  const op = r3(Math.min(1, Math.max(0, power / fullAt)));
  return (
    <g opacity={op}>
      {[-12, 0, 12].map((dx) => (
        <Arrow key={dx} x1={x + dx} y1={y} x2={x + dx} y2={y - 22} color={vizColors.red} width={2} head={7} />
      ))}
    </g>
  );
}

/** A P-channel MOSFET drawn as a box with source, drain, gate and its body diode. */
function PFet({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 26} y={y - 18} width={52} height={36} rx={5} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
      <Label x={x} y={y - 4} size={11} bold>Q1 P-FET</Label>
      <Label x={x} y={y + 9} size={9} mono color={vizColors.muted}>50 mΩ on</Label>
      <line x1={x} y1={y + 18} x2={x} y2={y + 34} stroke={WIRE} strokeWidth={2} />
      <Label x={x + 12} y={y + 30} anchor="start" size={9} color={vizColors.muted}>gate</Label>
      {/* body diode: conducts drain to source, blocks a reversed pack */}
      <polygon points={`${x + 40},${y - 8} ${x + 40},${y + 8} ${x + 52},${y}`} fill="none" stroke={vizColors.muted} strokeWidth={1.5} />
      <line x1={x + 52} y1={y - 8} x2={x + 52} y2={y + 8} stroke={vizColors.muted} strokeWidth={1.5} />
    </g>
  );
}

/** LED symbol: a diode triangle with two light rays, glowing with its current. */
function Led({ x, y, color, glow }: { x: number; y: number; color: string; glow: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={16} fill={color} opacity={r3(0.05 + 0.4 * glow)} />
      <polygon points={`${x - 9},${y - 10} ${x + 9},${y - 10} ${x},${y + 6}`} fill={color} fillOpacity={r3(0.3 + 0.7 * glow)} stroke={color} strokeWidth={2} />
      <line x1={x - 9} y1={y + 6} x2={x + 9} y2={y + 6} stroke={color} strokeWidth={2.5} />
      <Arrow x1={x + 8} y1={y - 14} x2={x + 20} y2={y - 26} color={color} width={1.5} head={6} />
      <Arrow x1={x + 14} y1={y - 8} x2={x + 26} y2={y - 20} color={color} width={1.5} head={6} />
    </g>
  );
}

/* ---------- the eight panels: each returns its drawing and its readouts ---------- */

interface PanelParts {
  drawing: ReactNode;
  stats: ReactNode;
}

function fetPanel(m: BoardModel, i: BoardInputs): PanelParts {
  const s = m.fet;
  return {
    drawing: (
      <Panel title={`The pack feeds the board through Q1: ${amps3(s.iPack)} drops ${mV(s.vFet)} across its 50 milliohm channel`}>
        <Wires d={["M 40 84 V 60 H 112", "M 164 60 H 290", "M 138 94 V 112", "M 290 60 V 150 H 40 V 116", "M 138 148 V 160"]} />
        <BatterySymbol cx={40} cy={100} />
        <Label x={40} y={172} size={11} mono>{`${i.vPack.toFixed(1)} V pack`}</Label>
        <JunctionDot x={40} y={150} />
        <PFet x={138} y={60} />
        <ResistorSymbol cx={138} cy={130} length={36} width={14} vertical />
        <Label x={156} y={124} anchor="start" size={10} mono>R1 100 kΩ</Label>
        <Label x={156} y={138} anchor="start" size={9} color={vizColors.muted}>pulls the gate low</Label>
        <GroundSymbol x={138} y={160} />
        <Heat x={138} y={36} power={s.pFet} fullAt={0.5} />
        <Arrow x1={60} y1={60} x2={100} y2={60} color={vizColors.amber} width={2} />
        <Label x={80} y={44} size={11} mono bold color={vizColors.amber}>{amps3(s.iPack)}</Label>
        <Arrow x1={200} y1={60} x2={250} y2={60} color={vizColors.amber} width={2} />
        <Label x={226} y={44} size={11} mono bold color={vizColors.cyan}>{`VM = ${(i.vPack - s.vFet).toFixed(3)} V`}</Label>
        <Label x={300} y={100} anchor="end" size={11} mono color={vizColors.red}>{`− ${mV(s.vFet)}`}</Label>
        <Label x={300} y={116} anchor="end" size={10} color={vizColors.muted}>lost across Q1</Label>
        <Label x={160} y={190} size={11} color={vizColors.muted}>Ohm: the FET is a small resistor, so V = I · R and P = I² · R</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="Pack current" value={amps3(s.iPack)} hint="motors + regulator input" />
        <Stat label="Drop across Q1  V = I · R" value={mV(s.vFet)} />
        <Stat label="Heat in Q1  P = I² · R" value={`${(s.pFet * 1e3).toFixed(1)} mW`} tone={s.pFet > 0.4 ? "warn" : "neutral"} hint="SOT-23, keep under about 0.5 W" />
        <Stat label="Drop along 13 mm of VM trace" value={mV(s.vTrace)} hint={`1.5 mm wide, 1 oz: ${formatSI(s.rTrace, "Ω")}`} />
      </>
    ),
  };
}

function kclPanel(m: BoardModel): PanelParts {
  const s = m.kcl;
  return {
    drawing: (
      <Panel title={`At the VM node ${amps3(s.iPack)} arrives from the pack and leaves as ${amps3(s.iMotors)} to the motors and ${amps3(s.iLdoIn)} to the regulator`}>
        <Wires d={["M 20 100 H 150", "M 150 100 H 210 V 50 H 300", "M 150 100 H 210 V 150 H 300", "M 90 100 V 122", "M 90 158 V 170"]} />
        <JunctionDot x={150} y={100} r={5} color={vizColors.amber} />
        <JunctionDot x={90} y={100} />
        <CapacitorSymbol cx={90} cy={140} vertical size={26} gap={8} polarized />
        <GroundSymbol x={90} y={170} />
        <Label x={108} y={134} anchor="start" size={10} mono>C1 100 µF</Label>
        <Label x={108} y={148} anchor="start" size={9} color={vizColors.muted}>+ C2, C3</Label>
        <Arrow x1={40} y1={100} x2={80} y2={100} color={vizColors.amber} width={2.5} />
        <Label x={60} y={84} size={11} mono bold color={vizColors.amber}>{`in ${amps3(s.iPack)}`}</Label>
        <Arrow x1={230} y1={50} x2={280} y2={50} color={vizColors.orange} width={2.5} />
        <Label x={255} y={34} size={11} mono bold color={vizColors.orange}>{`motors ${amps3(s.iMotors)}`}</Label>
        <Label x={300} y={66} anchor="end" size={9} color={vizColors.muted}>U2 TB6612FNG</Label>
        <Arrow x1={230} y1={150} x2={280} y2={150} color={vizColors.cyan} width={2.5} />
        <Label x={255} y={134} size={11} mono bold color={vizColors.cyan}>{`regulator ${amps3(s.iLdoIn)}`}</Label>
        <Label x={300} y={166} anchor="end" size={9} color={vizColors.muted}>U3 AMS1117</Label>
        <Label x={160} y={190} size={11} color={vizColors.muted}>Kirchhoff: charge cannot pile up at a point, so in = out</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="Into the node (pack)" value={amps3(s.iPack)} />
        <Stat label="Out to both motors" value={amps3(s.iMotors)} />
        <Stat label="Out to the regulator" value={amps3(s.iLdoIn)} hint="logic current plus 5 mA ground current" />
        <Stat label="Sum check  KCL" value={`${amps3(s.iPack)} = ${amps3(s.iMotors)} + ${amps3(s.iLdoIn)}`} tone="ok" />
        <Stat label="Bulk capacitor droop at start" value={formatSI(s.droopV, "V")} hint="1.5 A for 10 µs from 100 µF: ΔV = I·Δt / C" />
      </>
    ),
  };
}

function ldoPanel(m: BoardModel, i: BoardInputs): PanelParts {
  const s = m.ldo;
  const tone = s.verdict === "shutdown" ? "bad" : s.verdict === "hot" ? "warn" : "ok";
  const verdict = s.verdict === "shutdown" ? "Thermal shutdown" : s.verdict === "hot" ? "Hot: add copper" : "Fine";
  return {
    drawing: (
      <Panel title={`The AMS1117 drops ${i.vPack.toFixed(1)} volts to 3.3 volts at ${formatSI(i.iLogic, "A")} and makes ${formatSI(s.pLdo, "W")} of heat`}>
        <Wires d={["M 20 80 H 110", "M 210 80 H 300", "M 160 110 V 150", "M 60 80 V 100", "M 60 136 V 150", "M 260 80 V 100", "M 260 136 V 150", "M 60 150 H 260"]} />
        <rect x={110} y={56} width={100} height={54} rx={6} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={160} y={76} size={11} bold>U3 AMS1117-3.3</Label>
        <Label x={160} y={94} size={9} mono color={vizColors.muted}>IN  →  OUT</Label>
        <CapacitorSymbol cx={60} cy={118} vertical size={24} gap={8} />
        <Label x={76} y={112} anchor="start" size={10} mono>C2 10 µF</Label>
        <CapacitorSymbol cx={260} cy={118} vertical size={24} gap={8} polarized />
        <Label x={244} y={112} anchor="end" size={10} mono>C5 22 µF</Label>
        <GroundSymbol x={160} y={150} />
        <Heat x={160} y={48} power={s.pLdo} fullAt={1.5} />
        <Arrow x1={28} y1={80} x2={56} y2={80} color={vizColors.amber} width={2} />
        <Label x={40} y={64} size={11} mono bold color={vizColors.amber}>{`VM ${i.vPack.toFixed(1)} V`}</Label>
        <Arrow x1={226} y1={80} x2={252} y2={80} color={vizColors.cyan} width={2} />
        <Label x={286} y={64} anchor="end" size={11} mono bold color={vizColors.cyan}>3.3 V</Label>
        <Label x={160} y={30} size={12} mono bold color={vizColors.red}>{`heat = (${i.vPack.toFixed(1)} − 3.3) V × ${formatSI(i.iLogic, "A")} = ${formatSI(s.pLdo, "W")}`}</Label>
        <Label x={160} y={176} size={11} color={vizColors.muted}>{`junction about ${s.tj.toFixed(0)} °C at 60 °C/W; shutdown at 150 °C`}</Label>
        <Label x={160} y={190} size={10} color={vizColors.muted}>the same 3.3 V from a 5 V buck would waste only a tenth</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="Heat  P = (Vin − Vout) · I" value={formatSI(s.pLdo, "W")} hint="including the 5 mA ground current" />
        <Stat label="Junction temperature" value={`${s.tj.toFixed(0)} °C`} tone={tone} hint="25 °C ambient, 60 °C/W" />
        <Stat label="Verdict" value={verdict} tone={tone} />
        <Stat label="Same job with a 5 V buck" value={formatSI(s.pBuck, "W")} hint="at 90% efficiency" />
      </>
    ),
  };
}

function ledPanel(m: BoardModel, i: BoardInputs): PanelParts {
  const s = m.led;
  const color = LED_COLORS[i.ledColor];
  const glow = r3(Math.min(1, s.iLed / 0.005));
  const tone = s.verdict === "ok" ? "ok" : s.verdict === "dim" ? "warn" : "bad";
  const verdict = s.verdict === "ok" ? "Lit, comfortably" : s.verdict === "dim" ? "Dim: raise Vcc or lower R" : "Too much for a GPIO pin";
  return {
    drawing: (
      <Panel title={`The LED loop: the pin supplies 3.3 volts, R3 drops ${s.kvl.dropR.toFixed(2)} volts and the LED drops ${s.vf.toFixed(1)} volts, so ${formatSI(s.iLed, "A")} flows`}>
        <Wires d={["M 40 60 H 110", "M 170 60 H 240 V 100", "M 240 140 V 170 H 40 V 60"]} />
        <circle cx={40} cy={60} r={6} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />
        <Label x={40} y={40} size={11} mono bold color={vizColors.cyan}>IO13 high: +3.30 V</Label>
        <ResistorSymbol cx={140} cy={60} length={60} width={22} />
        <Label x={140} y={36} size={11} mono>{`R3 ${formatSI(i.ledR, "Ω")}`}</Label>
        <Label x={140} y={84} size={11} mono color={vizColors.orange}>{`− ${s.kvl.dropR.toFixed(2)} V`}</Label>
        <Led x={240} y={120} color={color} glow={glow} />
        <Label x={266} y={120} anchor="start" size={11} mono color={vizColors.orange}>{`− ${s.vf.toFixed(1)} V`}</Label>
        <Label x={266} y={136} anchor="start" size={9} color={vizColors.muted}>{`D1 ${i.ledColor}`}</Label>
        <GroundSymbol x={140} y={170} />
        <Arrow x1={60} y1={60} x2={96} y2={60} color={vizColors.amber} width={2} />
        <Label x={78} y={46} size={10} mono color={vizColors.amber}>{formatSI(s.iLed, "A")}</Label>
        <Label x={130} y={118} size={12} mono bold color={vizColors.green}>{`+3.30 − ${s.kvl.dropR.toFixed(2)} − ${s.vf.toFixed(2)} = 0`}</Label>
        <Label x={130} y={136} size={10} color={vizColors.muted}>around the loop, rises equal drops</Label>
        <Label x={160} y={190} size={11} color={vizColors.muted}>the resistor takes whatever voltage the LED leaves over</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="Loop  +3.3 − I·R − Vf" value={`+3.30 − ${s.kvl.dropR.toFixed(2)} − ${s.kvl.dropLed.toFixed(2)} = 0 V`} tone="ok" />
        <Stat label="LED current" value={formatSI(s.iLed, "A")} hint="(3.3 − Vf) / R" />
        <Stat label="Resistor power" value={formatSI(s.pR, "W")} hint="I² · R, of 100 mW for an 0603" />
        <Stat label="Verdict" value={verdict} tone={tone} hint={s.verdict === "too much" ? "about 20 mA is the most a GPIO pin should source" : undefined} />
      </>
    ),
  };
}

function dividerPanel(m: BoardModel, i: BoardInputs): PanelParts {
  const s = m.divider;
  const ok = s.verdict === "ok";
  return {
    drawing: (
      <Panel title={`Battery divider: ${i.vPack.toFixed(1)} volts across 100 and 47 kilohms gives ${s.vOut.toFixed(3)} volts at the ADC pin, behind a Thevenin resistance of 32 kilohms`}>
        <Wires d={["M 60 24 V 44", "M 60 104 V 116", "M 60 176 V 186", "M 60 110 H 150", "M 110 110 V 126", "M 110 160 V 186 H 60"]} />
        <circle cx={60} cy={19} r={5} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={74} y={19} anchor="start" size={11} mono bold>{`VM ${i.vPack.toFixed(1)} V`}</Label>
        <ResistorSymbol cx={60} cy={74} length={60} width={24} vertical />
        <Label x={46} y={74} anchor="end" size={10} mono>R4 100 k</Label>
        <ResistorSymbol cx={60} cy={146} length={60} width={24} vertical />
        <Label x={46} y={146} anchor="end" size={10} mono>R5 47 k</Label>
        <JunctionDot x={60} y={110} />
        <JunctionDot x={110} y={110} />
        <GroundSymbol x={60} y={186} />
        <g opacity={i.dividerCap ? 1 : 0.3}>
          <CapacitorSymbol cx={110} cy={143} vertical size={24} gap={8} />
          <Label x={124} y={136} anchor="start" size={10} mono>{i.dividerCap ? "C9 100 nF" : "C9 missing"}</Label>
        </g>
        <circle cx={155} cy={110} r={5} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />
        <Label x={128} y={96} size={11} mono bold color={vizColors.cyan}>{`${s.vOut.toFixed(3)} V`}</Label>
        <Label x={168} y={110} anchor="start" size={10} color={vizColors.muted}>to IO35 (ADC)</Label>
        {/* Thevenin twin */}
        <Label x={250} y={24} size={11} color={vizColors.muted}>as the ADC sees it</Label>
        <Wires d={["M 220 90 V 60 H 236", "M 268 60 H 300", "M 220 120 V 150 H 300"]} />
        <circle cx={220} cy={105} r={15} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={220} y={105} size={10} bold>Vth</Label>
        <ResistorSymbol cx={252} cy={60} length={32} width={14} />
        <Label x={252} y={42} size={10} mono>{`Rth ${formatSI(s.rth, "Ω")}`}</Label>
        <Label x={220} y={134} size={10} mono>{`${s.vOut.toFixed(2)} V`}</Label>
        <GroundSymbol x={260} y={150} />
        <circle cx={300} cy={60} r={5} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />
        <Label x={300} y={78} size={9} color={ok ? vizColors.green : vizColors.red}>{ok ? "ok" : "too stiff"}</Label>
        <Label x={160} y={192} size={10} color={vizColors.muted}>rule: under 10 kΩ, or a capacitor at the pin for the sample charge</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="ADC pin voltage" value={`${s.vOut.toFixed(3)} V`} hint="Vpack × 47 / 147" />
        <Stat label="Thevenin resistance  R1 ∥ R2" value={formatSI(s.rth, "Ω")} tone={ok ? "neutral" : "warn"} hint="what the pin sees behind that voltage" />
        <Stat label="Divider current" value={formatSI(s.iDiv, "A")} hint="drawn from the pack all the time" />
        <Stat label="ADC reading (12-bit)" value={`${s.counts} counts`} hint="ideal, 3.3 V full scale" />
        <Stat
          label="Verdict"
          value={ok ? "Capacitor supplies the sample" : "Reads low: 32 kΩ is too stiff for the ADC"}
          tone={ok ? "ok" : "bad"}
          hint={ok ? `C9 recharges with τ = ${formatSI(s.rechargeMs * 1e-3, "s")}` : `a 10 pF sample needs ${s.settleUs.toFixed(1)} µs to settle through 32 kΩ`}
        />
      </>
    ),
  };
}

function enPanel(m: BoardModel, i: BoardInputs): PanelParts {
  const s = m.en;
  const L = 180;
  const R = 306;
  const T = 44;
  const B = 150;
  const x = makeScale([0, 5], [L, R]);
  const y = makeScale([0, BOARD.ldoVout], [B, T]);
  const n = s.samples.length - 1;
  const curve = polyline(s.samples.map((v, k): [number, number] => [x((5 * k) / n), y(v)]));
  const xBoot = r2(x(BOARD.ln4));
  const yThr = r2(y(s.threshold));
  return {
    drawing: (
      <Panel title={`EN charges through 10 kilohms into ${formatSI(i.enC, "F")}: time constant ${formatSI(s.tau, "s")}, the 0.75 VDD threshold at ${formatSI(s.tBoot, "s")}`}>
        <Wires d={["M 50 24 V 44", "M 50 104 V 112", "M 50 112 H 120", "M 50 112 V 128", "M 50 164 V 178", "M 120 112 V 128", "M 120 164 V 178 H 50"]} />
        <circle cx={50} cy={19} r={5} fill={vizColors.bg} stroke={vizColors.text} strokeWidth={2} />
        <Label x={64} y={19} anchor="start" size={11} mono bold>3V3</Label>
        <ResistorSymbol cx={50} cy={74} length={60} width={24} vertical />
        <Label x={36} y={74} anchor="end" size={10} mono>R2 10 k</Label>
        <JunctionDot x={50} y={112} />
        <Label x={86} y={100} size={10} mono bold color={vizColors.cyan}>EN</Label>
        <CapacitorSymbol cx={50} cy={146} vertical size={24} gap={8} />
        <Label x={66} y={146} anchor="start" size={10} mono>{`C8 ${formatSI(i.enC, "F")}`}</Label>
        <SwitchSymbol x1={120} y1={128} x2={120} y2={164} closed={false} />
        <Label x={136} y={146} anchor="start" size={10} mono>SW2</Label>
        <GroundSymbol x={50} y={178} />
        {/* the charging curve, in units of tau so its shape never changes */}
        <line x1={L} y1={B} x2={R} y2={B} stroke={vizColors.muted} strokeWidth={1.2} />
        <line x1={L} y1={T} x2={L} y2={B} stroke={vizColors.muted} strokeWidth={1.2} />
        {[1, 2, 3, 4, 5].map((k) => (
          <g key={k}>
            <line x1={x(k)} y1={T} x2={x(k)} y2={B} stroke={vizColors.grid} strokeWidth={1} strokeDasharray="3 4" />
            <Label x={x(k)} y={B + 10} size={8} mono color={vizColors.muted}>{`${k}τ`}</Label>
          </g>
        ))}
        <line x1={L} y1={yThr} x2={R} y2={yThr} stroke={vizColors.amber} strokeWidth={1} strokeDasharray="4 3" />
        <Label x={R} y={yThr - 8} anchor="end" size={9} mono color={vizColors.amber}>0.75 × VDD</Label>
        <path d={curve} data-curve="en" fill="none" stroke={vizColors.cyan} strokeWidth={2.4} />
        <circle cx={xBoot} cy={yThr} r={4.5} fill={vizColors.green} stroke={vizColors.bg} strokeWidth={2} />
        <Label x={xBoot} y={B + 22} size={9} mono color={vizColors.green}>{`boot at ${formatSI(s.tBoot, "s")}`}</Label>
        <Label x={L - 4} y={T} anchor="end" size={8} mono color={vizColors.muted}>3.3</Label>
        <Label x={L - 4} y={B} anchor="end" size={8} mono color={vizColors.muted}>0</Label>
        <Label x={243} y={32} size={10} color={vizColors.muted}>{`τ = R · C = ${formatSI(s.tau, "s")}`}</Label>
        <Label x={160} y={192} size={10} color={vizColors.muted}>63% at 1τ, 75% at 1.39τ, 99% at 5τ; SW2 empties C8 to reset</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="Time constant  τ = R · C" value={formatSI(s.tau, "s")} />
        <Stat label="EN crosses 0.75 × VDD at" value={formatSI(s.tBoot, "s")} hint="t = τ · ln 4 = 1.39 τ" />
        <Stat label="5τ (fully charged)" value={formatSI(5 * s.tau, "s")} hint="99.3% of the way" />
      </>
    ),
  };
}

function decouplingPanel(m: BoardModel, i: BoardInputs): PanelParts {
  const s = m.decoupling;
  const run = 30 + 6 * i.decouplingMm; // px of trace between pin and capacitor
  const xc = 70 + run;
  const tone = s.verdict === "ok" ? "ok" : s.verdict === "marginal" ? "warn" : "bad";
  const verdict = s.verdict === "ok" ? "Inside 5% of the rail" : s.verdict === "marginal" ? "Marginal: move the capacitor closer" : "Logic will glitch";
  return {
    drawing: (
      <Panel title={`A decoupling capacitor ${i.decouplingMm} millimetres from the pin closes a loop of ${formatSI(s.loopH, "H")}; a 50 milliamp step in 2 nanoseconds dips the pin by ${formatSI(s.vDip, "V")}`}>
        <rect x={70} y={70} width={run} height={60} fill={vizColors.amber} opacity={0.12} />
        <Wires d={[`M 70 70 H ${xc}`, `M ${xc} 70 V 88`, `M ${xc} 112 V 130 H 70`]} />
        <rect x={16} y={56} width={54} height={88} rx={6} fill={vizColors.bg} stroke={vizColors.cyan} strokeWidth={2} />
        <Label x={43} y={92} size={10} bold color={vizColors.cyan}>ESP32</Label>
        <Label x={43} y={106} size={9} color={vizColors.muted}>3V3 pin</Label>
        <Label x={43} y={122} size={9} color={vizColors.muted}>GND pin</Label>
        <CapacitorSymbol cx={xc} cy={100} vertical size={22} gap={7} />
        <Label x={xc + 14} y={94} anchor="start" size={10} mono>C7 100 nF</Label>
        <Label x={76} y={56} anchor="start" size={10} mono color={vizColors.amber}>{`${i.decouplingMm} mm each way ≈ ${formatSI(s.loopH, "H")}`}</Label>
        <Label x={70 + run / 2} y={100} size={9} color={vizColors.muted}>loop area</Label>
        <Arrow x1={60} y1={160} x2={60} y2={178} color={vizColors.red} width={2} head={7} />
        <Label x={72} y={168} anchor="start" size={10} mono color={vizColors.red}>50 mA step in 2 ns</Label>
        <Label x={160} y={192} size={10} color={vizColors.muted}>{`V = L · di/dt = ${formatSI(s.loopH, "H")} × 25 MA/s = ${formatSI(s.vDip, "V")}`}</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="Loop inductance" value={formatSI(s.loopH, "H")} hint="about 1 nH per mm, plus 0.5 nH in the capacitor" />
        <Stat label="Rail dip  V = L · di/dt" value={formatSI(s.vDip, "V")} tone={tone} hint="the pin sees this, not the regulator" />
        <Stat label="Verdict" value={verdict} tone={tone} hint="budget: 10% of 3.3 V is 330 mV" />
      </>
    ),
  };
}

function windingPanel(m: BoardModel, i: BoardInputs): PanelParts {
  const s = m.winding;
  return {
    drawing: (
      <Panel title={`The left motor winding carries ${formatSI(s.iAvg, "A")} ${s.direction}: a right hand with its fingers along the current has its thumb along the field, so reversing the bridge reverses the field`}>
        <g transform="translate(10 0)">
          <RightHandRule variant="coil" forward={i.forward} strength={Math.min(1, s.iAvg / 1.5)} />
        </g>
        <Label x={160} y={194} size={10} color={vizColors.muted}>{`AIN1/AIN2 = ${i.forward ? "H/L" : "L/H"}: current ${s.direction}, ${formatSI(s.iAvg, "A")}, field ${i.forward ? "to the right" : "to the left"}`}</Label>
      </Panel>
    ),
    stats: (
      <>
        <Stat label="Average motor voltage  D · VM" value={`${s.vAvg.toFixed(2)} V`} hint="duty sets the speed; the load sets the current" />
        <Stat label="Current through the winding" value={formatSI(s.iAvg, "A")} hint="torque = Kt · I" />
        <Stat label="Field 5 mm from the trace" value={formatSI(s.bTraceUt * 1e-6, "T")} hint={`µ0 I / 2πr; Earth's field is about 50 µT (${s.earthRatio.toFixed(1)}×)`} />
        <Stat label="PWM ripple  ΔI" value={formatSI(s.rippleA, "A")} hint="VM · D(1 − D) / (L · f) with 1 mH at 20 kHz" />
        <Stat label="Flyback without a path" value={formatSI(s.flybackV, "V")} tone="bad" hint="L · di/dt for 1 A stopped in 100 ns" />
        <Stat label="Clamped by the body diode" value={`${s.clampV.toFixed(2)} V`} tone="ok" hint="VM + 0.7 V: the current keeps flowing" />
      </>
    ),
  };
}

function panelFor(station: Station, model: BoardModel, inputs: BoardInputs): PanelParts {
  switch (station.id) {
    case "fet":
      return fetPanel(model, inputs);
    case "kcl":
      return kclPanel(model);
    case "ldo":
      return ldoPanel(model, inputs);
    case "led":
      return ledPanel(model, inputs);
    case "divider":
      return dividerPanel(model, inputs);
    case "en":
      return enPanel(model, inputs);
    case "decoupling":
      return decouplingPanel(model, inputs);
    case "winding":
      return windingPanel(model, inputs);
  }
}

export function StationPanel({ station, model, inputs, onChange }: StationPanelProps) {
  const { drawing, stats } = panelFor(station, model, inputs);
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-amber-300">{station.law}</p>
      <div className="grid gap-x-6 gap-y-3 rounded-lg border border-border bg-surface-2/40 px-4 py-3 sm:grid-cols-2">
        {station.controls.map((id) => (
          <Control key={id} id={id} inputs={inputs} onChange={onChange} />
        ))}
      </div>
      {drawing}
      <dl className="grid grid-cols-2 gap-2" aria-live="polite">
        {stats}
      </dl>
    </div>
  );
}
