// The lab log: virtual and real readings in one table with the runbook's columns, CSV in and out, and the checks
// that need no AI. Impedances are stored in milliohms.
import { cellPreset, shuntPreset } from "./dut";
import { partById, SOURCES } from "./parts";
import type { BenchState, Reading, Wiring } from "./types";

export interface LogRow {
  id: string;
  source: "virtual" | "real";
  date: string;
  time: string;
  dutId: string;
  chemistry: string;
  nominal: string;
  tempC: number | null;
  freqHz: number;
  zReal: number;
  zImag: number;
  clipCycle: number;
  reconnected: boolean;
  calibration: "measured" | "not-run" | "unknown";
  wiring: Wiring | "unknown";
  cellVoltage: number | null;
  notes: string;
  rawFile: string;
}

/** The runbook's twelve columns, then the beginner guide's additions, then the bench's own. */
export const CSV_COLUMNS = [
  "date",
  "time",
  "DUT-ID",
  "chemistry",
  "nominal",
  "temp °C",
  "freq",
  "Z_real",
  "Z_imag",
  "clip-cycle",
  "notes",
  "raw-file",
  "units",
  "calibration",
  "cell voltage",
  "reconnected",
  "wiring",
  "source",
] as const;

function describeDut(dutId: string): { chemistry: string; nominal: string } {
  const part = partById(dutId);
  const cell = cellPreset(part?.preset ?? "");
  if (cell) return { chemistry: cell.chemistry, nominal: `${cell.size} ${cell.ocv} V` };
  const shunt = shuntPreset(part?.preset ?? "");
  if (shunt) return { chemistry: "shunt", nominal: `${shunt.nominalMilliohm} mΩ` };
  return { chemistry: "", nominal: "" };
}

/**
 * A log row for a valid, settled reading, or null otherwise: a reading taken within a minute of a clip moving still
 * drifts, so it isn't logged (the runbook: wait a minute before reading). `previousConnection` is the connection count
 * of the previous logged reading of the same device, so the row knows whether the leads were reconnected in between.
 */
export function rowFromReading(r: Reading, bench: BenchState, when: { date: string; time: string }, previousConnection: number | null): LogRow | null {
  if (!r.valid || !r.settled || !r.z || !r.dutId) return null;
  const temp = r.tempC === null ? "na" : String(r.tempC);
  return {
    id: `virtual-${r.seq}`,
    source: "virtual",
    date: when.date,
    time: when.time,
    dutId: r.dutId,
    ...describeDut(r.dutId),
    tempC: r.tempC,
    freqHz: r.freqHz,
    zReal: r.z.re,
    zImag: r.z.im,
    clipCycle: r.connection,
    reconnected: previousConnection !== null && previousConnection !== r.connection,
    calibration: r.calibrated ? "measured" : "not-run",
    wiring: r.wiring ?? "unknown",
    cellVoltage: bench.cells[r.dutId]?.ocv ?? null,
    notes: "",
    rawFile: `${when.date}_${r.dutId}_${temp}C_${r.seq}.csv`,
  };
}

function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: readonly LogRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of rows) {
    const fields = [
      r.date,
      r.time,
      r.dutId,
      r.chemistry,
      r.nominal,
      r.tempC === null ? "" : String(r.tempC),
      String(r.freqHz),
      String(r.zReal),
      String(r.zImag),
      String(r.clipCycle),
      r.notes,
      r.rawFile,
      "mΩ",
      r.calibration,
      r.cellVoltage === null ? "" : String(r.cellVoltage),
      r.reconnected ? "yes" : "no",
      r.wiring,
      r.source,
    ];
    lines.push(fields.map(csvField).join(","));
  }
  return lines.join("\n") + "\n";
}

/** Splits CSV text into records, honouring quoted fields with commas, quotes and line breaks. */
export function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      record.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records.filter((r) => r.some((f) => f.trim() !== ""));
}

/**
 * Header names compared without case, spaces, symbols or the degree sign: "temp °C" and "tempC" match. Ω and µ are
 * kept, so a column whose unit can't be read is not mistaken for a plain one.
 */
function key(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9ωµμ]/g, "");
}

const HEADER_KEYS: Record<string, string> = {
  date: "date",
  time: "time",
  dutid: "dutId",
  chemistry: "chemistry",
  nominal: "nominal",
  tempc: "tempC",
  temp: "tempC",
  freq: "freqHz",
  freqhz: "freqHz",
  zreal: "zReal",
  zimag: "zImag",
  clipcycle: "clipCycle",
  notes: "notes",
  rawfile: "rawFile",
  units: "units",
  calibration: "calibration",
  cellvoltage: "cellVoltage",
  reconnected: "reconnected",
  wiring: "wiring",
  source: "source",
};

export interface ParseResult {
  rows: LogRow[];
  skipped: Array<{ line: number; reason: string }>;
}

function num(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

/** A unit written after a column name, as in "Z_real mΩ", "Z_real (Ω)" or "Z_real [µΩ]"; toMilliohm decides if it is known. */
const HEADER_UNIT = /[\s([{/_]+((?:milli|[a-zµμΜ])?(?:Ω|ohms?))[\s)\]}]*$/i;

/**
 * The multiplier from a sheet's unit to milliohms, or null for a unit the log doesn't know. An empty unit means
 * milliohms, the runbook's unit. The m is case-sensitive, because MΩ is megohms.
 */
function toMilliohm(unit: string): number | null {
  const u = unit.normalize("NFC").trim();
  if (u === "" || /^milliohms?$/i.test(u) || /^m(Ω|ohms?)$/.test(u.replace(/ohm/i, "ohm"))) return 1;
  if (/^(Ω|ohms?)$/i.test(u)) return 1000;
  return null;
}

/** Why an imported row can't be used, or null when it can. */
function rowProblem(v: Record<string, string>): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "")) return "The date isn't YYYY-MM-DD.";
  if (!v.dutId) return "The DUT-ID is empty.";
  const freq = num(v.freqHz);
  if (freq === null || freq <= 0) return "The frequency isn't a positive number.";
  if (num(v.zReal) === null || num(v.zImag) === null) return "Z_real and Z_imag must both be numbers.";
  return null;
}

/**
 * Reads a CSV with the runbook's columns (the extra columns are optional). Rows default to "real". A unit of Ω, in a
 * `units` column or after the Z_real header, converts the impedances to milliohms and notes the original unit; a unit
 * the log doesn't know skips the row. Without a `reconnected` column, a new clip-cycle for the same device marks a
 * reconnection. Bad rows are skipped with a reason.
 */
export function parseCsv(text: string, idPrefix = "real"): ParseResult {
  const [header, ...records] = parseCsvRecords(text);
  const result: ParseResult = { rows: [], skipped: [] };
  if (!header) return result;
  const named = header.map((h) => h.normalize("NFC"));
  const fields = named.map((h) => HEADER_KEYS[key(h.replace(HEADER_UNIT, ""))]);
  for (const name of ["date", "dutId", "freqHz", "zReal", "zImag"]) {
    if (!fields.includes(name)) return { rows: [], skipped: [{ line: 1, reason: `The header has no ${name} column.` }] };
  }
  const headerUnit = named[fields.indexOf("zReal")].match(HEADER_UNIT)?.[1] ?? "";
  const hasReconnected = fields.includes("reconnected");
  const lastCycle = new Map<string, number>();
  for (const [i, record] of records.entries()) {
    const line = i + 2;
    const v: Record<string, string> = {};
    fields.forEach((f, j) => {
      if (f) v[f] = (record[j] ?? "").trim();
    });
    const freq = num(v.freqHz);
    const re = num(v.zReal);
    const im = num(v.zImag);
    const problem = rowProblem(v);
    if (problem || freq === null || re === null || im === null) {
      result.skipped.push({ line, reason: problem ?? "Unreadable row." });
      continue;
    }
    const unit = v.units || headerUnit;
    const k = toMilliohm(unit);
    if (k === null) {
      result.skipped.push({ line, reason: `The unit "${unit}" isn't mΩ or Ω.` });
      continue;
    }
    const cycle = num(v.clipCycle);
    const previousCycle = lastCycle.get(v.dutId);
    if (cycle !== null) lastCycle.set(v.dutId, cycle);
    const calibration = v.calibration === "measured" || v.calibration === "not-run" ? v.calibration : "unknown";
    const wiring = v.wiring === "4-wire" || v.wiring === "2-wire" || v.wiring === "mixed" ? v.wiring : "unknown";
    result.rows.push({
      id: `${idPrefix}-${line}`,
      source: v.source === "virtual" ? "virtual" : "real",
      date: v.date,
      time: v.time ?? "",
      dutId: v.dutId,
      chemistry: v.chemistry ?? "",
      nominal: v.nominal ?? "",
      tempC: num(v.tempC),
      freqHz: freq,
      zReal: re * k,
      zImag: im * k,
      clipCycle: cycle ?? 0,
      reconnected: hasReconnected
        ? /^(yes|true|1)$/i.test(v.reconnected ?? "")
        : cycle !== null && previousCycle !== undefined && cycle !== previousCycle,
      calibration,
      wiring,
      cellVoltage: num(v.cellVoltage),
      notes: [v.notes ?? "", k === 1000 ? "imported from Ω" : ""].filter(Boolean).join("; "),
      rawFile: v.rawFile ?? "",
    });
  }
  return result;
}

export interface Stats {
  n: number;
  mean: number;
  min: number;
  max: number;
  /** Max minus min: the runbook's repeatability measure. */
  spread: number;
}

export function stats(values: readonly number[]): Stats | null {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { n: values.length, mean: values.reduce((a, b) => a + b, 0) / values.length, min, max, spread: max - min };
}

function atFrequency(rows: readonly LogRow[], dutId: string, freqHz: number): LogRow[] {
  return rows.filter((r) => r.dutId === dutId && Math.abs(r.freqHz - freqHz) <= freqHz * 0.005);
}

/** The beginner guide's two tests, kept apart: readings without moving the leads, and readings after reconnecting. */
export function repeatability(rows: readonly LogRow[], dutId: string, freqHz = 1000): { stationary: Stats | null; reconnection: Stats | null } {
  const at = atFrequency(rows, dutId, freqHz);
  return {
    stationary: stats(at.filter((r) => !r.reconnected).map((r) => r.zReal)),
    reconnection: stats(at.filter((r) => r.reconnected).map((r) => r.zReal)),
  };
}

export interface Target {
  nominalMilliohm: number;
  accuracy: string;
  /** Allowed error as a fraction of nominal; null where the runbook only asks for the right order of magnitude. */
  accuracyFraction: number | null;
  spreadMaxMilliohm: number;
  purpose: string;
}

/** The runbook's targets for the shunt ladder: development targets, not a specification (beginner guide). */
export const TARGETS: readonly Target[] = [
  { nominalMilliohm: 100, accuracy: "within ~2%", accuracyFraction: 0.02, spreadMaxMilliohm: 1, purpose: "Upper range, easy win" },
  { nominalMilliohm: 25, accuracy: "within ~2%", accuracyFraction: 0.02, spreadMaxMilliohm: 0.5, purpose: "Stands in for a healthy cell" },
  { nominalMilliohm: 10, accuracy: "within ~3%", accuracyFraction: 0.03, spreadMaxMilliohm: 0.5, purpose: "The headline repeatability milestone" },
  { nominalMilliohm: 2, accuracy: "within ~10%", accuracyFraction: 0.1, spreadMaxMilliohm: 0.3, purpose: "Where contact quality starts to dominate" },
  { nominalMilliohm: 1, accuracy: "order-of-magnitude sane", accuracyFraction: null, spreadMaxMilliohm: 0.3, purpose: "Big-pack territory, stretch goal" },
];

export interface GateRow {
  dutId: string;
  target: Target;
  stats: Stats;
  errorFraction: number;
  accuracyOk: boolean | null;
  spreadOk: boolean;
}

/** A shunt's nominal value in milliohms: from the bench's part, or else from a row's own nominal such as "10 mΩ". */
function shuntNominal(rows: readonly LogRow[], dutId: string): number | undefined {
  const preset = shuntPreset(partById(dutId)?.preset ?? "");
  if (preset) return preset.nominalMilliohm;
  for (const r of rows) {
    const m = r.dutId === dutId ? r.nominal.match(/^\s*(\d+(?:\.\d+)?)\s*(\S+)\s*$/) : null;
    const k = m ? toMilliohm(m[2]) : null;
    if (m && k !== null) return Number(m[1]) * k;
  }
  return undefined;
}

/** Each shunt with a target and 1 kHz readings: its reconnection set when there is one, otherwise every reading. */
export function gateTable(rows: readonly LogRow[]): GateRow[] {
  const out: GateRow[] = [];
  for (const dutId of [...new Set(rows.map((r) => r.dutId))]) {
    const nominal = shuntNominal(rows, dutId);
    const target = TARGETS.find((t) => t.nominalMilliohm === nominal);
    if (!target) continue;
    const { reconnection } = repeatability(rows, dutId);
    const s = reconnection ?? stats(atFrequency(rows, dutId, 1000).map((r) => r.zReal));
    if (!s) continue;
    const errorFraction = (s.mean - target.nominalMilliohm) / target.nominalMilliohm;
    out.push({
      dutId,
      target,
      stats: s,
      errorFraction,
      accuracyOk: target.accuracyFraction === null ? null : Math.abs(errorFraction) <= target.accuracyFraction,
      spreadOk: s.spread < target.spreadMaxMilliohm,
    });
  }
  return out;
}

export interface LogCheck {
  kind: "missing-temperature" | "missing-calibration" | "size-ladder" | "wide-spread" | "reads-high";
  message: string;
  source: string;
}

/** Alkaline sizes from smallest to largest electrode area. */
const LADDER = ["AAA", "AA", "D"] as const;

/** The checks that need no AI: missing data, the size ladder, and hints from the troubleshooting table. */
export function checkLog(rows: readonly LogRow[]): LogCheck[] {
  const checks: LogCheck[] = [];
  const noTemp = rows.filter((r) => r.tempC === null).length;
  if (noTemp > 0) checks.push({ kind: "missing-temperature", message: `${noTemp} reading${noTemp === 1 ? " has" : "s have"} no temperature. A reading without a temperature is not data.`, source: SOURCES.runbook });
  const noCal = rows.filter((r) => r.calibration !== "measured").length;
  if (noCal > 0) checks.push({ kind: "missing-calibration", message: `${noCal} reading${noCal === 1 ? " doesn't" : "s don't"} record a measured calibration state.`, source: SOURCES.guide });

  const alkaline1k = rows.filter((r) => r.chemistry === "alkaline" && Math.abs(r.freqHz - 1000) <= 5);
  const means = LADDER.map((size) => stats(alkaline1k.filter((r) => r.nominal.split(" ")[0] === size).map((r) => r.zReal))?.mean ?? null);
  if (means.every((m) => m !== null)) {
    const [aaa, aa, d] = means as number[];
    checks.push(
      aaa > aa && aa > d
        ? { kind: "size-ladder", message: "The size ladder holds: AAA > AA > D, falling with electrode area.", source: SOURCES.runbook }
        : { kind: "size-ladder", message: "The size ladder is out of order (expected AAA > AA > D). Compare cells in the same condition, since a fresher cell reads far lower; if they match, suspect contacts before chemistry.", source: SOURCES.runbook },
    );
  }

  for (const dutId of [...new Set(rows.map((r) => r.dutId))]) {
    const { reconnection } = repeatability(rows, dutId);
    const nominal = shuntNominal(rows, dutId);
    const limit = TARGETS.find((t) => t.nominalMilliohm === nominal)?.spreadMaxMilliohm ?? 1;
    if (reconnection && reconnection.n >= 3 && reconnection.spread >= limit) {
      checks.push({ kind: "wide-spread", message: `${dutId}: the reconnection spread is ${reconnection.spread.toFixed(2)} mΩ. Most likely the clip is biting the wrapper or oxide: clean the terminals, bite bare metal and squeeze harder.`, source: SOURCES.runbook });
    }
    const all = stats(atFrequency(rows, dutId, 1000).map((r) => r.zReal));
    if (nominal && all && all.mean >= 1.8 * nominal) {
      checks.push({ kind: "reads-high", message: `${dutId} reads ${(all.mean / nominal).toFixed(1)}× its nominal value. Check that each sense jaw is on the terminal, not the force wire.`, source: SOURCES.runbook });
    }
  }
  return checks;
}
