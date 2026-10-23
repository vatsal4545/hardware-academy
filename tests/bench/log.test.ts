import { describe, it, expect } from "vitest";
import { CSV_COLUMNS, TARGETS, checkLog, gateTable, parseCsv, repeatability, rowFromReading, stats, toCsv, type LogRow } from "@/lib/bench/log";
import { last, readyBench, run } from "./helpers";

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
  });

  it("skips bad rows with a reason and keeps the good ones", () => {
    const csv = "date,DUT-ID,freq,Z_real,Z_imag\n20/10/2026,D-01,1000,1,0\n2026-10-20,,1000,1,0\n2026-10-20,D-01,0,1,0\n2026-10-20,D-01,1000,abc,0\n2026-10-20,D-01,1000,1,0\n";
    const { rows, skipped } = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(skipped.map((s) => s.line)).toEqual([2, 3, 4, 5]);
    expect(skipped[0].reason).toMatch(/YYYY-MM-DD/);
  });

  it("rejects a file without the required columns", () => {
    const { rows, skipped } = parseCsv("date,DUT-ID,freq\n2026-10-20,D-01,1000\n");
    expect(rows).toEqual([]);
    expect(skipped[0].reason).toMatch(/zReal/);
  });
});

describe("statistics and checks", () => {
  it("computes mean, min, max and spread", () => {
    const s = stats([10.1, 10.3, 10.2])!;
    expect(s).toMatchObject({ n: 3, min: 10.1, max: 10.3 });
    expect(s.mean).toBeCloseTo(10.2, 12);
    expect(s.spread).toBeCloseTo(0.2, 12);
    expect(stats([])).toBeNull();
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
  });

  it("points at the clip when the reconnection spread is wide, and at sense placement when a shunt reads high", () => {
    const wide = checkLog([row({ zReal: 500, reconnected: true }), row({ zReal: 520, reconnected: true }), row({ zReal: 480, reconnected: true })]);
    expect(wide.find((c) => c.kind === "wide-spread")!.message).toMatch(/wrapper or oxide/);
    const high = checkLog([row({ dutId: "shunt-10m", nominal: "10 mΩ", zReal: 26 })]);
    expect(high.find((c) => c.kind === "reads-high")!.message).toMatch(/2\.6×/);
  });
});
