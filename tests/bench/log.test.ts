import { describe, it, expect } from "vitest";
import { CSV_COLUMNS, TARGETS, checkLog, gateTable, parseCsv, repeatability, rowFromReading, stats, toCsv, type LogRow } from "@/lib/bench/log";
import { justClipped, last, readyBench, run } from "./helpers";

const when = { date: "2026-10-22", time: "14:05:00" };

function row(partial: Partial<LogRow>): LogRow {
  return {
    id: "r",
    source: "real",
    date: "2026-10-22",
    time: "10:00:00",
    dutId: "cell-d-duracell",
    chemistry: "alkaline",
    nominal: "D 1.25 V",
    tempC: 23.5,
    freqHz: 1000,
    zReal: 500,
    zImag: -1,
    clipCycle: 1,
    reconnected: false,
    calibration: "measured",
    wiring: "4-wire",
    cellVoltage: 1.25,
    notes: "",
    rawFile: "",
    ...partial,
  };
}

describe("log rows from readings", () => {
  it("turns a valid reading into a row with the runbook's file name", () => {
    const s = run(readyBench(), { type: "measureOcv", cellId: "cell-d-duracell" }, { type: "readTemperature", cellId: "cell-d-duracell" }, { type: "measure", freqHz: 1000 });
    const r = last(s);
    const logRow = rowFromReading(r, s, when, null)!;
    expect(logRow.source).toBe("virtual");
    expect(logRow.chemistry).toBe("alkaline");
    expect(logRow.nominal).toBe("D 1.25 V");
    expect(logRow.zReal).toBe(r.z!.re);
    expect(logRow.calibration).toBe("measured");
    expect(logRow.wiring).toBe("4-wire");
    expect(logRow.cellVoltage).toBe(s.cells["cell-d-duracell"].ocv);
    expect(logRow.reconnected).toBe(false);
    expect(logRow.rawFile).toBe(`2026-10-22_cell-d-duracell_${r.tempC}C_${r.seq}.csv`);
  });

  it("marks a row reconnected when the connection count changed since the previous logged reading", () => {
    const s = run(readyBench(), { type: "measure", freqHz: 1000 });
    expect(rowFromReading(last(s), s, when, last(s).connection - 4)!.reconnected).toBe(true);
    expect(rowFromReading(last(s), s, when, last(s).connection)!.reconnected).toBe(false);
  });

  it("logs only settled readings: not a valid one inside the minute, nor an invalid one after it", () => {
    const early = run(justClipped(), { type: "measure", freqHz: 1000 });
    expect(last(early).valid).toBe(true);
    expect(rowFromReading(last(early), early, when, null)).toBeNull();
    const openSense = run(readyBench(), { type: "disconnect", channel: "S+" }, { type: "wait", seconds: 60 }, { type: "measure", freqHz: 1000 });
    expect(last(openSense).valid).toBe(false);
    expect(last(openSense).settled).toBe(true);
    expect(rowFromReading(last(openSense), openSense, when, null)).toBeNull();
  });

  it("does not log invalid readings", () => {
    const s = run(readyBench(), { type: "disconnect", channel: "S+" }, { type: "measure", freqHz: 1000 });
    expect(rowFromReading(last(s), s, when, null)).toBeNull();
  });
});

describe("CSV", () => {
  it("round-trips rows, including notes with commas and quotes", () => {
    const rows = [row({ id: "real-2", notes: 'clip on "+", re-seated' }), row({ id: "real-3", tempC: null, cellVoltage: null, reconnected: true })];
    const parsed = parseCsv(toCsv(rows));
    expect(parsed.skipped).toEqual([]);
    expect(parsed.rows).toEqual(rows);
  });

  it("writes the runbook's columns first", () => {
    expect(toCsv([]).split("\n")[0]).toBe(CSV_COLUMNS.join(","));
    expect(CSV_COLUMNS.slice(0, 12)).toEqual(["date", "time", "DUT-ID", "chemistry", "nominal", "temp °C", "freq", "Z_real", "Z_imag", "clip-cycle", "notes", "raw-file"]);
  });

  it("imports the runbook's twelve-column spreadsheet as real rows", () => {
    const csv = "date,time,DUT-ID,chemistry,nominal,temp °C,freq,Z_real,Z_imag,clip-cycle,notes,raw-file\n2026-10-20,09:30:00,D-01,alkaline,D 1.5 V,22.1,1000,112.4,-0.8,3,,2026-10-20_D-01_22.1C_1.csv\n";
    const { rows, skipped } = parseCsv(csv);
    expect(skipped).toEqual([]);
    expect(rows[0]).toMatchObject({ source: "real", dutId: "D-01", tempC: 22.1, freqHz: 1000, zReal: 112.4, zImag: -0.8, clipCycle: 3, calibration: "unknown", wiring: "unknown", reconnected: false });
  });

  it("converts impedances shown in ohms to milliohms and notes it", () => {
    const { rows } = parseCsv("date,DUT-ID,freq,Z_real,Z_imag,units\n2026-10-20,D-01,1000,0.1124,-0.0008,Ω\n");
    expect(rows[0].zReal).toBeCloseTo(112.4, 9);
    expect(rows[0].zImag).toBeCloseTo(-0.8, 9);
    expect(rows[0].notes).toBe("imported from Ω");
    // 0.0102 × 1000 is 10.200000000000001 in floating point: the import rounds that noise away.
    expect(parseCsv("date,DUT-ID,freq,Z_real,Z_imag,units\n2026-10-20,S-10m,1000,0.0102,-0.0041,Ω\n").rows[0]).toMatchObject({ zReal: 10.2, zImag: -4.1 });
  });

  it("reads Z_imag's unit from its own header, while a row's units value applies to both", () => {
    const own = parseCsv("date,DUT-ID,freq,Z_real (mΩ),Z_imag (Ω)\n2026-10-20,D-01,1000,112.4,-0.0008\n");
    expect(own.rows[0]).toMatchObject({ zReal: 112.4, zImag: -0.8 });
    const row = parseCsv("date,DUT-ID,freq,Z_real (mΩ),Z_imag (Ω),units\n2026-10-20,D-01,1000,0.1124,-0.0008,Ω\n");
    expect(row.rows[0]).toMatchObject({ zReal: 112.4, zImag: -0.8 });
  });

  it("reads a unit column as units", () => {
    const { rows } = parseCsv("date,DUT-ID,freq,Z_real,Z_imag,unit\n2026-10-20,D-01,1000,0.1124,-0.0008,Ω\n");
    expect(rows[0]).toMatchObject({ zReal: 112.4, zImag: -0.8, notes: "imported from Ω" });
  });

  it("reads a header unit after -, : or | too, and fails closed after any other mark", () => {
    const sheet = (header: string, value: string) => parseCsv(`date,DUT-ID,freq,${header},Z_imag\n2026-10-20,D-01,1000,${value},-0.8\n`);
    expect(sheet("Z_real-mΩ", "112.4").rows[0].zReal).toBe(112.4);
    expect(sheet("Z_real:Ω", "0.1124").rows[0].zReal).toBe(112.4);
    expect(sheet("Z_real|Ω", "0.1124").rows[0].zReal).toBe(112.4);
    expect(sheet("Z_real+Ω", "0.1124").skipped[0].reason).toMatch(/Z_real/);
  });

  it("reads calibration, wiring and source in any case", () => {
    const { rows } = parseCsv("date,DUT-ID,freq,Z_real,Z_imag,calibration,wiring,source\n2026-10-20,D-01,1000,112.4,-0.8,Measured,4-Wire,Virtual\n");
    expect(rows[0]).toMatchObject({ calibration: "measured", wiring: "4-wire", source: "virtual" });
  });

  it("reads units from a units column or the header, and skips a unit it doesn't know", () => {
    const csv = "date,DUT-ID,freq,Z_real,Z_imag,units\n2026-10-20,D-01,1000,0.1124,-0.0008,ohms\n2026-10-20,D-01,1000,112.4,-0.8,mOhm\n2026-10-20,D-01,1000,0.1124,-0.0008,\u2126\n2026-10-20,D-01,1000,0.1,0,MΩ\n2026-10-20,D-01,1000,0.1,0,kΩ\n";
    const { rows, skipped } = parseCsv(csv);
    expect(rows.map((r) => Math.round(r.zReal * 10) / 10)).toEqual([112.4, 112.4, 112.4]);
    expect(skipped.map((s) => s.line)).toEqual([5, 6]);
    expect(skipped[0].reason).toMatch(/MΩ/);
    expect(parseCsv("date,DUT-ID,freq,Z_real (Ω),Z_imag (Ω)\n2026-10-20,D-01,1000,0.1124,-0.0008\n").rows[0].zReal).toBeCloseTo(112.4, 9);
    expect(parseCsv("date,DUT-ID,freq,Z_real mΩ,Z_imag mΩ\n2026-10-20,D-01,1000,112.4,-0.8\n").rows[0].zReal).toBe(112.4);
    expect(parseCsv("date,DUT-ID,freq,Z_real [Ω],Z_imag [Ω]\n2026-10-20,D-01,1000,0.1124,-0.0008\n").rows[0].zReal).toBeCloseTo(112.4, 9);
    expect(parseCsv("date,DUT-ID,freq,Z_real (µΩ),Z_imag (µΩ)\n2026-10-20,D-01,1000,112400,-800\n").skipped[0].reason).toMatch(/µΩ/);
    expect(parseCsv("date,DUT-ID,freq,Z_real (Ω)*,Z_imag\n2026-10-20,D-01,1000,0.1124,-0.0008\n").skipped[0].reason).toMatch(/Z_real/);
  });

  it("marks a reconnection when the clip-cycle changes and the sheet has no reconnected column", () => {
    const csv = "date,DUT-ID,freq,Z_real,Z_imag,clip-cycle\n2026-10-20,S-10m,1000,10.1,0,1\n2026-10-20,S-10m,1000,10.2,0,1\n2026-10-20,S-10m,1000,10.0,0,2\n2026-10-20,D-01,1000,112,0,2\n";
    expect(parseCsv(csv).rows.map((r) => r.reconnected)).toEqual([false, false, true, false]);
    const blank = "date,DUT-ID,freq,Z_real,Z_imag,clip-cycle\n2026-10-20,S-10m,1000,10.1,0,1\n2026-10-20,S-10m,1000,10.2,0,\n2026-10-20,S-10m,1000,10.0,0,1\n";
    expect(parseCsv(blank).rows.map((r) => r.reconnected)).toEqual([false, false, false]);
    const column = "date,DUT-ID,freq,Z_real,Z_imag,reconnected\n2026-10-20,S-10m,1000,10.1,0,Yes\n2026-10-20,S-10m,1000,10.2,0,TRUE\n2026-10-20,S-10m,1000,10.0,0,no\n2026-10-20,S-10m,1000,10.1,0,1\n2026-10-20,S-10m,1000,10.1,0,0\n";
    expect(parseCsv(column).rows.map((r) => r.reconnected)).toEqual([true, true, false, true, false]);
  });

  it("skips bad rows with a reason and keeps the good ones", () => {
    const csv = "date,DUT-ID,freq,Z_real,Z_imag\n20/10/2026,D-01,1000,1,0\n2026-10-20,,1000,1,0\n2026-10-20,D-01,0,1,0\n2026-10-20,D-01,1000,abc,0\n2026-10-20,D-01,1000,1,0\n";
    const { rows, skipped } = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(skipped.map((s) => s.line)).toEqual([2, 3, 4, 5]);
    expect(skipped[0].reason).toMatch(/YYYY-MM-DD/);
  });

  it("rejects a file without the required columns, naming each missing one as its header is written", () => {
    const { rows, skipped } = parseCsv("date,DUT-ID,freq\n2026-10-20,D-01,1000\n");
    expect(rows).toEqual([]);
    expect(skipped[0].reason).toBe("The header is missing the Z_real and Z_imag columns.");
    expect(parseCsv("date,DUT-ID,freq,Z_real\n2026-10-20,D-01,1000,1\n").skipped[0].reason).toBe("The header is missing the Z_imag column.");
    expect(parseCsv("time,notes\n10:00,x\n").skipped[0].reason).toBe("The header is missing the date, DUT-ID, freq, Z_real and Z_imag columns.");
  });
});

describe("statistics and checks", () => {
  it("computes mean, min, max and spread", () => {
    const s = stats([10.1, 10.3, 10.2])!;
    expect(s).toMatchObject({ n: 3, min: 10.1, max: 10.3 });
    expect(s.mean).toBeCloseTo(10.2, 12);
    expect(s.spread).toBeCloseTo(0.2, 12);
    expect(stats([])).toBeNull();
    // Too many values to spread into Math.min as arguments.
    expect(stats(Array.from({ length: 200_000 }, (_, i) => i))).toMatchObject({ n: 200_000, min: 0, max: 199_999 });
  });

  it("keeps the stationary and reconnection sets apart", () => {
    const rows = [row({ zReal: 500 }), row({ zReal: 500.1 }), row({ zReal: 503, reconnected: true }), row({ zReal: 497, reconnected: true })];
    const r = repeatability(rows, "cell-d-duracell");
    expect(r.stationary!.spread).toBeCloseTo(0.1, 9);
    expect(r.reconnection!.spread).toBeCloseTo(6, 9);
  });

  it("scores the shunt ladder against the runbook's targets", () => {
    const rows = [10.02, 10.1, 9.98].map((z) => row({ dutId: "shunt-10m", chemistry: "shunt", nominal: "10 mΩ", zReal: z, reconnected: true }));
    const [g] = gateTable(rows);
    expect(g.target).toBe(TARGETS.find((t) => t.nominalMilliohm === 10));
    expect(g.spreadOk).toBe(true);
    expect(g.accuracyOk).toBe(true);
    const wide = gateTable([...rows, row({ dutId: "shunt-10m", zReal: 10.9, reconnected: true })])[0];
    expect(wide.spreadOk).toBe(false);
  });

  it("scores an imported shunt by its own nominal when its DUT-ID isn't a bench part", () => {
    const rows = [10.02, 10.1, 9.98].map((z) => row({ dutId: "S-10m", chemistry: "shunt", nominal: "10 mΩ", zReal: z, reconnected: true }));
    expect(gateTable(rows)[0].target.nominalMilliohm).toBe(10);
    expect(checkLog([row({ dutId: "S-10m", chemistry: "shunt", nominal: "10 mΩ", zReal: 26 })]).map((c) => c.kind)).toContain("reads-high");
    const reclipped = [10, 10.3, 10.6].map((z) => row({ dutId: "S-10m", chemistry: "shunt", nominal: "10 mΩ", zReal: z, reconnected: true }));
    expect(checkLog(reclipped).map((c) => c.kind)).toContain("wide-spread");
  });

  it("flags missing temperatures and calibration states", () => {
    const kinds = checkLog([row({ tempC: null }), row({ calibration: "unknown" })]).map((c) => c.kind);
    expect(kinds).toContain("missing-temperature");
    expect(kinds).toContain("missing-calibration");
  });

  it("checks the size ladder AAA > AA > D", () => {
    const ladder = (aaa: number, aa: number, d: number) =>
      checkLog([row({ nominal: "AAA 1.2 V", zReal: aaa }), row({ nominal: "AA 1.25 V", zReal: aa }), row({ nominal: "D 1.25 V", zReal: d })]).find((c) => c.kind === "size-ladder")!.message;
    expect(ladder(2000, 1000, 500)).toMatch(/holds/);
    expect(ladder(500, 1000, 2000)).toMatch(/out of order/);
    expect(ladder(500, 1000, 2000)).toMatch(/same condition/);
  });

  it("points at the clip when the reconnection spread is wide, and at sense placement when a shunt reads high", () => {
    const wide = checkLog([row({ zReal: 500, reconnected: true }), row({ zReal: 520, reconnected: true }), row({ zReal: 480, reconnected: true })]);
    expect(wide.find((c) => c.kind === "wide-spread")!.message).toMatch(/wrapper or oxide/);
    const high = checkLog([row({ dutId: "shunt-10m", nominal: "10 mΩ", zReal: 26 })]);
    expect(high.find((c) => c.kind === "reads-high")!.message).toMatch(/2\.6×/);
  });
});
