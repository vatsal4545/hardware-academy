// The mistake catalogue (spec section 6.4): what each mistake does, how to fix it, and where the rule comes from.
import { partById, SOURCES } from "./parts";
import { SERIAL_BAUD, SETTLE_SECONDS, RCAL_MILLIOHM, settled, softwareLink } from "./instrument";
import { shuntPreset } from "./dut";
import { CHANNELS, type BenchState, type FaultId } from "./types";

export type Severity = "danger" | "warning" | "info";

export interface Fault {
  id: FaultId;
  severity: Severity;
  message: string;
  fix: string;
  source: string;
}

export const FAULTS: Record<FaultId, Omit<Fault, "id">> = {
  "shell-short": { severity: "danger", message: "A BNC shell touched the cell. The bench treats each shell as board ground, as the bring-up runbook says (simulated), so that shorts the cell.", fix: "Reset, then use the centre (red) jack of each adapter only. On your real adapters, check the wiring for continuity first.", source: SOURCES.bringup },
  "offset-stack": { severity: "danger", message: "The boards were powered while stacked one pin off, the classic way to kill an eval board. On this bench the measurement board is dead (simulated).", fix: "Reset with a new board, and check the header alignment twice before power.", source: SOURCES.bringup },
  "power-order": { severity: "danger", message: "The cell was connected before the boards were powered, which risks a short.", fix: "Reset. Power the boards first, then connect the cell.", source: SOURCES.guide },
  "power-down-connected": { severity: "danger", message: "The boards were powered down or cycled with the cell still connected.", fix: "Reset. Disconnect the cell before powering down or cycling the boards.", source: SOURCES.guide },
  "over-range": { severity: "danger", message: "This source is above the 0–5 V project envelope, so the bench refused it.", fix: "Reset and use a single cell. The eval board's real limit is in the CN0510 guide.", source: SOURCES.runbook },
  "wrapper-bite": { severity: "warning", message: "A clip is biting the wrapper or oxide, not bare metal. Readings will jump between reconnections.", fix: "Clean the terminal, bite bare metal and squeeze harder.", source: SOURCES.runbook },
  "sense-on-force": { severity: "warning", message: "A sense jaw sits on the force wire instead of the terminal, so the reading includes the clip and lead (about 2–3× too high on a 10 mΩ standard).", fix: "Move the sense contact onto the device terminal itself.", source: SOURCES.runbook },
  "no-calibration": { severity: "warning", message: "The onboard reference hasn't been measured, so every reading carries a constant offset.", fix: "Run the reference measurement before measuring.", source: SOURCES.guide },
  "switching-supply-near": { severity: "warning", message: "A switching supply sits near the leads, which adds noise at low frequencies.", fix: "Move chargers and supplies away; keep the leads short and twisted.", source: SOURCES.runbook },
  "wrong-baud": { severity: "warning", message: `The serial terminal isn't at ${SERIAL_BAUD} baud, so no output arrives.`, fix: `Set ${SERIAL_BAUD} baud, 8 data bits, no parity, 1 stop bit, no flow control.`, source: SOURCES.bringup },
  "isolator-debug": { severity: "warning", message: "Loading firmware through the ADuM3160 isolator failed. On this bench it always does (simulated); on a real bench it can, because the isolator is full-speed USB only.", fix: "Bypass the isolator for flashing.", source: SOURCES.bringup },
  "rcal-wrong": { severity: "warning", message: `RcalVal isn't ${RCAL_MILLIOHM.toFixed(1)}. The BATImpedance example's onboard reference is ${RCAL_MILLIOHM} mΩ, entered in milliohms, so every result is scaled wrongly.`, fix: `Set RcalVal back to ${RCAL_MILLIOHM.toFixed(1)}. Never ${RCAL_MILLIOHM / 1000}, and never your external resistor's value.`, source: SOURCES.guide },
  "continuity-live": { severity: "warning", message: "Continuity mode was used on a connected cell or a powered board.", fix: "Use continuity only on disconnected leads.", source: SOURCES.guide },
  "two-terminal-wiring": { severity: "warning", message: "A sense jaw shares a force pad on a four-terminal shunt, which can add connection resistance to the reading.", fix: "Follow the datasheet's terminal map: force on I+ and I−, sense on V+ and V−.", source: SOURCES.guide },
  "not-settled": { severity: "info", message: `A clip moved less than ${SETTLE_SECONDS} s ago, so readings may still drift while the junctions settle.`, fix: "Wait a minute before reading.", source: SOURCES.runbook },
  "loose-shunt": { severity: "info", message: "A loose shunt gives no valid reading: CN0510's current sink needs a DC bias, which a loose resistor should not be assumed to provide.", fix: "Shunts need a verified, powered low-voltage test setup, which comes in Mission 5.", source: SOURCES.guide },
};

const ORDER: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };

function fault(id: FaultId): Fault {
  return { id, ...FAULTS[id] };
}

/** Everything wrong on the bench right now: recorded fault events plus live conditions, most severe first. */
export function activeFaults(s: BenchState): Fault[] {
  const ids = new Set<FaultId>(s.faults.map((f) => f.id));
  const connected = CHANNELS.filter((ch) => s.channels[ch]);
  const part = partById(s.dutId ?? "");

  if (connected.some((ch) => s.channels[ch]?.bite === "wrapper")) ids.add("wrapper-bite");
  if (s.channels["S+"]?.onForceWire || s.channels["S-"]?.onForceWire) ids.add("sense-on-force");
  if (connected.length > 0 && !settled(s)) ids.add("not-settled");
  if (connected.length > 0 && softwareLink(s).ok && !s.software.referenceMeasured) ids.add("no-calibration");
  if (s.supplyNearLeads) ids.add("switching-supply-near");
  if (s.software.app === "serial" && s.software.baud !== SERIAL_BAUD) ids.add("wrong-baud");
  if (s.software.rcalVal !== RCAL_MILLIOHM) ids.add("rcal-wrong");
  if (part?.kind === "shunt" && connected.length > 0) {
    ids.add("loose-shunt");
    const fourTerminal = shuntPreset(part.preset ?? "")?.terminals === 4;
    const senseOnForcePad = (["S+", "S-"] as const).some((ch) => s.channels[ch]?.terminal.startsWith("I"));
    if (fourTerminal && senseOnForcePad) ids.add("two-terminal-wiring");
  }

  return [...ids].map(fault).sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}
