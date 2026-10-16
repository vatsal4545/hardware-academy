"use client";

import { useState } from "react";
import { PlayPause, Segmented, Slider, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, useAnimationFrame, usePrefersReducedMotion, vizColors } from "@/components/viz/shared";
import { SITES, grantedPower, type ChargeMode, type Grant } from "@/components/viz/ev/ChargingSessionFlow.model";

type Channel = "pilot" | "ev" | "ocpp";

interface Ctx {
  /** power the car draws, kW */
  kw: number;
  /** AC: current the EVSE offers on the pilot */
  amps: number;
  duty: number | null;
  /** AC: current the car draws */
  draw: number;
}

interface Step {
  name: string;
  seconds: number;
  channels: Channel[];
  text: (c: Ctx) => string;
  messages: (c: Ctx) => string[];
}

const kwText = (kw: number) => (kw >= 20 ? kw.toFixed(0) : kw.toFixed(1));

const DC_STEPS: Step[] = [
  {
    name: "Plug in",
    seconds: 2.5,
    channels: ["pilot"],
    text: () =>
      "The driver plugs in a CCS1 or NACS (SAE J3400) connector. A resistor on the proximity pin tells the car a plug is latched, and the car's pilot resistor pulls the control pilot from 12 V to 9 V (state B). The charger answers with a 5 % duty cycle, which means: use digital communication.",
    messages: () => ["Pilot: state A (12 V) → state B (9 V)", "Pilot PWM at 5 % duty = high-level communication", "OCPP StatusNotification: Preparing"],
  },
  {
    name: "Handshake",
    seconds: 3,
    channels: ["ev"],
    text: () =>
      "The car's and the charger's powerline modems find each other with SLAC over the pilot wire (HomePlug Green PHY), agree a protocol version (DIN SPEC 70121 or ISO 15118-2/-20) and open a session.",
    messages: () => ["SLAC: CM_SLAC_PARM, attenuation sounding, CM_SLAC_MATCH", "SupportedAppProtocolReq / Res", "SessionSetupReq / Res"],
  },
  {
    name: "Authorize",
    seconds: 3,
    channels: ["ev", "ocpp"],
    text: () =>
      "With Plug & Charge the car presents its contract certificate inside the ISO 15118 session and the charger has it verified, so no card or app is needed. Otherwise the driver taps an RFID card or uses an app, and the charger asks the backend.",
    messages: () => [
      "ServiceDiscovery, PaymentServiceSelection",
      "PaymentDetailsReq: contract certificate (Plug & Charge)",
      "AuthorizationReq / Res",
      "OCPP Authorize → Accepted",
    ],
  },
  {
    name: "Negotiate",
    seconds: 3.5,
    channels: ["ev", "ocpp"],
    text: (c) =>
      `The car reports its maximum voltage, current and power; the charger replies with its limits after load management, ${kwText(c.kw)} kW for this session. The car closes S2 (pilot state C), the charger tests the insulation of the DC lines (cable check) and pre-charges its output to the battery's voltage, so the car's contactors close without an inrush.`,
    messages: () => [
      "ChargeParameterDiscoveryReq / Res",
      "CableCheckReq / Res (insulation test)",
      "PreChargeReq / Res (match battery voltage)",
      "OCPP StartTransaction / TransactionEvent (Started)",
    ],
  },
  {
    name: "Charging",
    seconds: 5,
    channels: ["ev", "ocpp"],
    text: (c) =>
      `PowerDelivery starts the energy transfer. The car sends CurrentDemand requests in a continuous loop and the charger regulates its output to match: the car's BMS decides the current, not the charger. Up to ${kwText(c.kw)} kW flows, and meter values go to the backend for billing.`,
    messages: () => ["PowerDeliveryReq (Start)", "CurrentDemandReq / Res loop: target current, present voltage", "OCPP MeterValues: energy, power, SoC"],
  },
  {
    name: "Taper",
    seconds: 4,
    channels: ["ev", "ocpp"],
    text: () =>
      "As the cells near their voltage limit, the BMS asks for less current and the charger follows. The site's load manager can also lower this dispenser's limit at any time, for example when another car plugs in, by sending a charging profile.",
    messages: () => ["CurrentDemandReq: lower target current", "OCPP SetChargingProfile (site limit)", "OCPP MeterValues"],
  },
  {
    name: "Stop",
    seconds: 3,
    channels: ["ev", "ocpp", "pilot"],
    text: () =>
      "The car (full, or the driver pressed stop) or the charger ends the session. Current ramps to zero, the car opens its contactors and checks they did not weld, and the session closes. The backend gets the final meter reading for billing.",
    messages: () => ["PowerDeliveryReq (Stop)", "WeldingDetectionReq / Res", "SessionStopReq / Res", "OCPP StopTransaction / TransactionEvent (Ended)"],
  },
];

const AC_STEPS: Step[] = [
  {
    name: "Plug in",
    seconds: 2.5,
    channels: ["pilot"],
    text: () =>
      "The driver plugs in a J1772 (or Type 2, or NACS) connector. The car's 2.74 kΩ pilot resistor pulls the control pilot from 12 V to 9 V (state B): a car is present but not yet asking for power.",
    messages: () => ["Pilot: state A (12 V) → state B (9 V)", "Proximity: latch closed", "OCPP StatusNotification: Preparing"],
  },
  {
    name: "Handshake",
    seconds: 3,
    channels: ["pilot"],
    text: (c) =>
      c.duty === null
        ? "The EVSE would start a 1 kHz, ±12 V square wave whose duty cycle advertises the most current the car may draw. The site has less than the 6 A J1772 minimum to offer right now, so the session waits (OCPP status SuspendedEVSE)."
        : `The EVSE starts a 1 kHz, ±12 V square wave on the pilot (some EVSEs wait until the driver is authorized). Its duty cycle advertises the most current the car may draw: ${c.duty.toFixed(1)} % duty means ${c.amps.toFixed(1)} A.`,
    messages: (c) => [
      c.duty === null ? "Pilot: no valid duty below 6 A, session suspended" : `Pilot PWM 1 kHz at ${c.duty.toFixed(1)} % → ${c.amps.toFixed(1)} A`,
      "amps = duty × 0.6 (10-85 %), (duty − 64) × 2.5 (85-96 %)",
    ],
  },
  {
    name: "Authorize",
    seconds: 3,
    channels: ["ocpp"],
    text: () => "The driver taps an RFID card or uses an app (or the site is free to use). The EVSE checks with the backend before it will close its relay.",
    messages: () => ["OCPP Authorize (idTag) → Accepted"],
  },
  {
    name: "Negotiate",
    seconds: 3.5,
    channels: ["pilot", "ocpp"],
    text: () =>
      "Basic AC charging has no digital negotiation. The car's on-board charger reads the duty cycle, takes the lower of that and its own rating, and closes switch S2, which adds a 1.3 kΩ resistor in parallel and drops the pilot to 6 V (state C): supply power, please.",
    messages: (c) => [
      `Car reads the pilot: ${c.amps.toFixed(1)} A on offer`,
      `On-board charger will draw ${c.draw.toFixed(1)} A, the lesser of the offer and its own rating`,
      "S2 closes: state B (9 V) → state C (6 V)",
      "OCPP StartTransaction / TransactionEvent (Started)",
    ],
  },
  {
    name: "Charging",
    seconds: 5,
    channels: ["ocpp"],
    text: (c) =>
      `The EVSE closes its relay and AC flows to the car. The on-board charger rectifies it, corrects the power factor and runs an isolated DC-DC stage into the pack, here at up to ${kwText(c.kw)} kW. The EVSE itself only switches, meters and protects, including a 20 mA ground-fault trip.`,
    messages: (c) => ["Relay closed", `On-board charger: AC → DC at ${kwText(c.kw)} kW`, "OCPP MeterValues"],
  },
  {
    name: "Taper",
    seconds: 4,
    channels: ["pilot", "ocpp"],
    text: () =>
      "Near full, the BMS lowers the on-board charger's current. The site's load manager can also lower the pilot duty cycle at any time, and the car must follow within a few seconds.",
    messages: () => ["OCPP SetChargingProfile → new limit", "Pilot duty lowered → car draws less current"],
  },
  {
    name: "Stop",
    seconds: 3,
    channels: ["pilot", "ocpp"],
    text: () =>
      "When the car is full or the driver unlocks it, the car opens S2 (back to state B), the EVSE opens its relay and reports the final meter reading, and unplugging returns the pilot to 12 V (state A).",
    messages: () => ["S2 opens: state C → state B", "Relay opens", "OCPP StopTransaction / TransactionEvent (Ended)"],
  },
];

const STEPS: Record<ChargeMode, Step[]> = { ac: AC_STEPS, dc: DC_STEPS };
const TOTAL = DC_STEPS.reduce((s, x) => s + x.seconds, 0);

/** Which step the loop is in, and how far through it (0..1). */
function locate(phase: number, steps: Step[]): { index: number; progress: number } {
  let t = phase;
  for (let i = 0; i < steps.length; i++) {
    if (t < steps[i].seconds) return { index: i, progress: t / steps[i].seconds };
    t -= steps[i].seconds;
  }
  return { index: steps.length - 1, progress: 1 };
}

function stepStart(index: number, steps: Step[]): number {
  return steps.slice(0, index).reduce((s, x) => s + x.seconds, 0);
}

/** Fraction of the granted power flowing at this point of the session. */
function powerFraction(index: number, progress: number, mode: ChargeMode): number {
  const taperEnd = mode === "dc" ? 0.25 : 0.5;
  if (index === 4) return progress < 0.25 ? progress / 0.25 : 1;
  if (index === 5) return 1 - (1 - taperEnd) * progress;
  if (index === 6) return progress < 0.3 ? taperEnd * (1 - progress / 0.3) : 0;
  return 0;
}

const pingPong = (p: number) => {
  const q = (p * 2) % 2;
  return q < 1 ? q : 2 - q;
};

const limitWords: Record<ChargeMode, Record<Grant["limitedBy"], string>> = {
  dc: { vehicle: "the car's own request", port: "the dispenser rating", site: "the site's load-management cap" },
  ac: { vehicle: "the car's on-board charger", port: "the EVSE's 80 A rating", site: "the site's load-management cap" },
};

const EV = "#fb923c";

/** Control-pilot voltage per step: state B = car present, state C = car ready for power. */
const PILOT_STATES: Record<ChargeMode, string[]> = {
  dc: ["12 V → 9 V (B)", "9 V (B), 5 % PWM", "9 V (B), 5 % PWM", "9 V → 6 V (C)", "6 V (C), 5 % PWM", "6 V (C), 5 % PWM", "6 V → 9 V (B)"],
  ac: ["12 V → 9 V (B)", "9 V (B), PWM on", "9 V (B), PWM", "9 V → 6 V (C)", "6 V (C), PWM", "6 V (C), PWM", "6 V → 9 V (B)"],
};

export function ChargingSessionFlow() {
  const reduced = usePrefersReducedMotion();
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [phase, setPhase] = useState(0);
  const [mode, setMode] = useState<ChargeMode>("dc");
  const [request, setRequest] = useState(SITES.dc.defaultRequest);
  const [others, setOthers] = useState(SITES.dc.defaultOthers);
  const playing = userPlaying ?? !reduced;

  useAnimationFrame((dt) => setPhase((p) => (p + dt) % TOTAL), playing);

  const site = SITES[mode];
  const steps = STEPS[mode];
  const grant = grantedPower(site, request, others);
  const { index, progress } = locate(phase, steps);
  const step = steps[index];
  const ctx: Ctx = { kw: grant.kw, amps: grant.pilotAmps ?? 0, duty: grant.pilotDuty ?? null, draw: grant.drawAmps ?? 0 };
  const headroomKw = Math.max(0, site.capKw - others);
  const nowKw = grant.suspended ? 0 : grant.kw * powerFraction(index, progress, mode);
  const total = others + nowKw;
  const flowing = nowKw > 0.01;
  const active = new Set(step.channels);
  const packet = pingPong(progress * 2);

  const barX = 110;
  const barW = 560;
  const barMax = site.capKw * 1.2;
  const bx = (kw: number) => barX + (Math.min(kw, barMax) / barMax) * barW;

  const pilotState = PILOT_STATES[mode][index];

  return (
    <VizFrame
      title="A charging session, step by step"
      description="Follow one session from plug-in to stop. The power you get is the lowest of three limits: what the car asks for, what the dispenser can deliver and what the site's load manager has left."
      controls={
        <>
          <Segmented
            label="Charging"
            options={[
              { value: "ac", label: "AC Level 2" },
              { value: "dc", label: "DC fast" },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setRequest(SITES[m].defaultRequest);
              setOthers(SITES[m].defaultOthers);
              setPhase(0);
            }}
          />
          <PlayPause
            playing={playing}
            onToggle={() => setUserPlaying(!playing)}
            onReset={() => setPhase(0)}
            onStep={() => {
              // land 40 % into the next step, where its state is representative
              const next = (index + 1) % steps.length;
              setPhase(stepStart(next, steps) + 0.4 * steps[next].seconds);
            }}
          />
          <Slider
            label={mode === "dc" ? "Car can accept" : "On-board charger draws"}
            value={request}
            min={site.requestMin}
            max={site.requestMax}
            step={site.requestStep}
            onChange={setRequest}
            format={(v) => `${kwText(v)} kW`}
          />
          <Slider
            label="Other stalls' load"
            value={others}
            min={0}
            max={site.capKw}
            step={mode === "dc" ? 10 : 1}
            onChange={setOthers}
            format={(v) => `${v} kW`}
          />
        </>
      }
      footer={<span>{site.label}.</span>}
    >
      <SvgCanvas viewBox="0 0 720 330" title={`${mode === "dc" ? "DC fast" : "AC Level 2"} charging session, step ${index + 1}: ${step.name}`}>
        <rect x={0} y={0} width={720} height={330} rx={8} fill={vizColors.bg} />

        {/* step bar */}
        {steps.map((s, i) => {
          const x = 14 + i * 99.6;
          const state = i === index ? "now" : i < index ? "past" : "next";
          return (
            <g key={s.name}>
              <rect
                x={x}
                y={12}
                width={92}
                height={28}
                rx={6}
                fill={state === "now" ? "rgba(251,146,60,0.2)" : state === "past" ? "#1a2235" : vizColors.bg}
                stroke={state === "now" ? EV : vizColors.grid}
              />
              <Label x={x + 46} y={26} size={11} color={state === "now" ? vizColors.text : vizColors.muted} bold={state === "now"}>
                {`${i + 1}. ${s.name}`}
              </Label>
              {state === "now" && <rect x={x} y={43} width={92 * progress} height={3} rx={1.5} fill={EV} />}
            </g>
          );
        })}

        {/* car */}
        <path
          d="M 30 196 L 30 166 Q 34 152 60 148 L 98 124 Q 110 116 128 116 L 188 116 Q 204 116 216 128 L 236 148 Q 250 152 250 166 L 250 196 Z"
          fill="#1a2235"
          stroke={vizColors.muted}
        />
        <circle cx={76} cy={198} r={16} fill="#111827" stroke={vizColors.muted} />
        <circle cx={204} cy={198} r={16} fill="#111827" stroke={vizColors.muted} />
        <rect x={50} y={168} width={140} height={18} rx={3} fill="#0f2a1f" stroke={vizColors.green} />
        <Label x={120} y={177} size={10} color={vizColors.green}>
          battery + BMS
        </Label>
        <rect
          x={150}
          y={140}
          width={50}
          height={20}
          rx={3}
          fill={mode === "ac" ? "#2a1f0f" : "#111827"}
          stroke={mode === "ac" ? vizColors.amber : vizColors.grid}
          strokeDasharray={mode === "ac" ? undefined : "3 3"}
        />
        <Label x={175} y={150} size={10} color={mode === "ac" ? vizColors.amber : vizColors.muted}>
          OBC
        </Label>
        <Label x={175} y={130} size={9} color={vizColors.muted}>
          {mode === "ac" ? "AC → DC here" : "bypassed (DC)"}
        </Label>
        <rect x={248} y={150} width={10} height={14} rx={2} fill={vizColors.silk} />
        {mode === "ac" ? (
          <path d="M 248 155 L 200 155 M 175 160 L 175 168" stroke={flowing ? EV : vizColors.grid} strokeWidth={2.5} fill="none" />
        ) : (
          <path d="M 248 160 L 220 160 L 220 177 L 190 177" stroke={flowing ? EV : vizColors.grid} strokeWidth={2.5} fill="none" />
        )}

        {/* cable with animated power flow */}
        <path d="M 258 160 C 300 160, 316 214, 356 206 S 392 186, 400 186" fill="none" stroke="#374151" strokeWidth={9} strokeLinecap="round" />
        {flowing && (
          <path
            d="M 258 160 C 300 160, 316 214, 356 206 S 392 186, 400 186"
            fill="none"
            stroke={EV}
            strokeWidth={2 + 5 * Math.min(1, nowKw / site.portMaxKw)}
            strokeDasharray="10 8"
            strokeDashoffset={(phase * 40) % 18}
            strokeLinecap="round"
          />
        )}

        {/* car <-> charger communication */}
        <line
          x1={262}
          x2={398}
          y1={132}
          y2={132}
          stroke={active.has("pilot") ? vizColors.amber : active.has("ev") ? vizColors.cyan : vizColors.grid}
          strokeWidth={active.has("pilot") || active.has("ev") ? 2 : 1}
          strokeDasharray="4 3"
        />
        <Label x={330} y={120} size={10} color={vizColors.muted}>
          {mode === "dc" ? "pilot: PWM + powerline" : "pilot: 1 kHz PWM"}
        </Label>
        <Label x={330} y={144} size={9} mono color={active.has("pilot") ? vizColors.amber : vizColors.muted}>
          {`pilot ${pilotState}`}
        </Label>
        {active.has("ev") && <circle cx={266 + packet * 128} cy={132} r={5} fill={vizColors.cyan} />}

        {/* dispenser / EVSE */}
        <rect x={400} y={96} width={62} height={132} rx={6} fill="#1a2235" stroke={EV} />
        <rect x={410} y={106} width={42} height={22} rx={3} fill="#0f2a2f" />
        <Label x={431} y={117} size={9} mono color={vizColors.cyan}>
          {flowing ? `${kwText(nowKw)} kW` : grant.suspended ? "wait" : "--"}
        </Label>
        <Label x={431} y={146} size={10}>
          {mode === "dc" ? "Dispenser" : "EVSE"}
        </Label>
        <Label x={431} y={160} size={9} color={vizColors.muted}>
          {mode === "dc" ? `${site.portMaxKw} kW max` : "relay, GFCI"}
        </Label>

        {/* power cabinet or panel */}
        <rect x={486} y={150} width={84} height={78} rx={6} fill="#141b2a" stroke={vizColors.grid} />
        <Label x={528} y={166} size={10} bold>
          {mode === "dc" ? "Power cabinet" : "Panel"}
        </Label>
        <Label x={528} y={184} size={9} color={vizColors.muted}>
          {mode === "dc" ? "rectifier + PFC" : "breakers +"}
        </Label>
        <Label x={528} y={198} size={9} color={vizColors.muted}>
          {mode === "dc" ? "isolated DC-DC" : "load manager"}
        </Label>
        <Label x={528} y={212} size={9} color={vizColors.muted}>
          {mode === "dc" ? "shared by 8 stalls" : "shared by 12 ports"}
        </Label>
        <line x1={462} y1={200} x2={486} y2={200} stroke={flowing ? EV : vizColors.grid} strokeWidth={3} />

        {/* utility */}
        <rect x={596} y={166} width={100} height={62} rx={6} fill="#141b2a" stroke={vizColors.grid} />
        <Label x={646} y={182} size={10} bold>
          Utility
        </Label>
        <Label x={646} y={198} size={9} color={vizColors.muted}>
          {mode === "dc" ? "750 kVA transformer" : "208/240 V service"}
        </Label>
        <Label x={646} y={212} size={9} color={vizColors.muted}>
          {mode === "dc" ? "480 V, 3-phase" : "load-managed"}
        </Label>
        <line x1={570} y1={200} x2={596} y2={200} stroke={flowing ? EV : vizColors.grid} strokeWidth={3} />

        {/* backend */}
        <rect x={586} y={60} width={120} height={40} rx={20} fill="#1f1530" stroke={vizColors.violet} />
        <Label x={646} y={74} size={10} color={vizColors.violet} bold>
          CSMS backend
        </Label>
        <Label x={646} y={88} size={9} color={vizColors.muted}>
          OCPP over WebSocket
        </Label>
        <line
          x1={462}
          y1={104}
          x2={586}
          y2={80}
          stroke={active.has("ocpp") ? vizColors.violet : vizColors.grid}
          strokeWidth={active.has("ocpp") ? 2 : 1}
          strokeDasharray="4 3"
        />
        {active.has("ocpp") && <circle cx={466 + packet * 116} cy={103 - packet * 22.4} r={5} fill={vizColors.violet} />}

        {/* site load */}
        <Label x={14} y={268} anchor="start" size={11} bold>
          Site load
        </Label>
        <rect x={barX} y={256} width={barW} height={24} rx={4} fill="#111827" stroke={vizColors.grid} />
        <rect x={barX} y={256} width={bx(others) - barX} height={24} rx={4} fill="#4b5563" />
        {flowing && <rect x={bx(others)} y={256} width={bx(total) - bx(others)} height={24} fill={EV} />}
        <line x1={bx(site.capKw)} x2={bx(site.capKw)} y1={250} y2={286} stroke={vizColors.red} strokeWidth={2} strokeDasharray="4 3" />
        <Label x={bx(site.capKw)} y={296} size={10} color={vizColors.red}>
          {`cap ${site.capKw} kW`}
        </Label>
        <Label x={barX} y={314} anchor="start" size={11} mono color={vizColors.muted}>
          {`other stalls ${others} kW + this car ${kwText(nowKw)} kW = ${kwText(total)} kW of ${site.capKw} kW`}
        </Label>
      </SvgCanvas>

      <p className="mt-3 text-sm">
        {grant.suspended ? (
          <span className="text-red-300">
            {mode === "ac"
              ? `No headroom: the site has ${kwText(headroomKw)} kW left, ${(grant.pilotAmps ?? 0).toFixed(1)} A at 240 V, below the 6 A pilot minimum, so this session waits (OCPP status SuspendedEVSE).`
              : `No headroom: the site has ${kwText(headroomKw)} kW left, so this session waits (OCPP status SuspendedEVSE).`}
          </span>
        ) : mode === "ac" ? (
          <span className="text-text/90">
            {`Port rating ${site.portMaxKw} kW, site headroom ${kwText(headroomKw)} kW → EVSE offers ${(grant.pilotAmps ?? 0).toFixed(1)} A (${(
              grant.pilotDuty ?? 0
            ).toFixed(1)} % duty); car draws ${(grant.drawAmps ?? 0).toFixed(1)} A (${kwText(grant.kw)} kW at 240 V), set by ${limitWords.ac[grant.limitedBy]}.`}
          </span>
        ) : (
          <span className="text-text/90">
            {`Car asks for ${kwText(request)} kW → dispenser rating ${site.portMaxKw} kW → site headroom ${kwText(headroomKw)} kW → granted ${kwText(
              grant.kw,
            )} kW, set by ${limitWords.dc[grant.limitedBy]}.`}
          </span>
        )}
      </p>
      <div className="mt-3 rounded-lg border border-border bg-bg p-4">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">{`Step ${index + 1} of ${steps.length}`}</p>
        <h4 className="mt-1 font-semibold">{step.name}</h4>
        <p className="mt-1 text-sm text-text/90">{step.text(ctx)}</p>
        <ul className="mt-2 space-y-1 font-mono text-xs text-cyan-300">
          {step.messages(ctx).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    </VizFrame>
  );
}
