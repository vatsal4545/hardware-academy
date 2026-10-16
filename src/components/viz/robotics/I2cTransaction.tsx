"use client";

import { useState } from "react";
import { PlayPause, Segmented, Toggle, VizFrame } from "@/components/lesson";
import { Label, SvgCanvas, polyline, useViz, vizColors } from "@/components/viz/shared";

type Kind = "S" | "Sr" | "P" | "bit" | "ack" | "nack";
type Field = "start" | "addr" | "rw" | "ack" | "nack" | "reg" | "data" | "rdata" | "stop";

export interface I2cSymbol {
  kind: Kind;
  level: 0 | 1;
  field: Field;
  /** who drives SDA during this symbol; "nobody" means only the pull-up resistor */
  by: "master" | "slave" | "nobody";
  note: string;
}

const ADDR = 0x68;
const FIELD_COLOR: Record<Field, string> = {
  start: vizColors.muted,
  stop: vizColors.muted,
  addr: vizColors.violet,
  rw: vizColors.amber,
  ack: vizColors.green,
  nack: vizColors.red,
  reg: vizColors.cyan,
  data: vizColors.blue,
  rdata: vizColors.orange,
};

const hex = (v: number) => `0x${v.toString(16).toUpperCase().padStart(2, "0")}`;

function bits(value: number, count: number): Array<0 | 1> {
  return Array.from({ length: count }, (_, i) => ((value >> (count - 1 - i)) & 1) as 0 | 1);
}

function byteSyms(value: number, count: number, field: Field, by: "master" | "slave", describe: (i: number, b: 0 | 1) => string): I2cSymbol[] {
  return bits(value, count).map((b, i) => ({ kind: "bit", level: b, field, by, note: describe(i, b) }));
}

const START: I2cSymbol = {
  kind: "S",
  level: 0,
  field: "start",
  by: "master",
  note: "START: SDA falls while SCL is high. Only START and STOP change SDA while SCL is high, so every device on the bus now listens for its address.",
};
const STOP: I2cSymbol = {
  kind: "P",
  level: 1,
  field: "stop",
  by: "master",
  note: "STOP: SDA rises while SCL is high. The bus is free again.",
};
const ack = (what: string): I2cSymbol => ({
  kind: "ack",
  level: 0,
  field: "ack",
  by: "slave",
  note: `ACK: the MPU-6050 pulls SDA low during the 9th clock to say it ${what}.`,
});

/** The bit-level sequence of an MPU-6050 register write or read, optionally with nobody at the address. */
export function i2cSequence(kind: "write" | "read", missing: boolean): I2cSymbol[] {
  const address = (rw: 0 | 1) => [
    ...byteSyms(ADDR, 7, "addr", "master", (i, b) => `Address bit ${i + 1} of 7: ${b}. The master changes SDA only while SCL is low; every device samples it on SCL's rising edge.`),
    {
      kind: "bit" as const,
      level: rw,
      field: "rw" as const,
      by: "master" as const,
      note:
        rw === 0
          ? `R/W bit = 0, a write. 0x68 shifted left with this bit gives ${hex((ADDR << 1) | 0)} on the wire.`
          : `R/W bit = 1, a read. 0x68 shifted left with this bit gives ${hex((ADDR << 1) | 1)} on the wire.`,
    },
  ];
  const seq: I2cSymbol[] = [START, ...address(0)];
  if (missing) {
    seq.push({
      kind: "nack",
      level: 1,
      field: "nack",
      by: "nobody",
      note: "NACK: nobody pulled SDA low, so the pull-up holds it high. No device answered at 0x68; Arduino's Wire.endTransmission() returns 2.",
    });
    seq.push(STOP);
    return seq;
  }
  seq.push(ack("recognised its address"));
  if (kind === "write") {
    seq.push(...byteSyms(0x6b, 8, "reg", "master", (i, b) => `Register address bit ${i + 1} of 8: ${b}. The master selects register 0x6B, PWR_MGMT_1.`));
    seq.push(ack("received the register address"));
    seq.push(...byteSyms(0x00, 8, "data", "master", (i, b) => `Data bit ${i + 1} of 8: ${b}. Writing 0x00 to PWR_MGMT_1 clears the sleep bit and wakes the IMU.`));
    seq.push(ack("stored the data byte"));
    seq.push(STOP);
    return seq;
  }
  seq.push(...byteSyms(0x75, 8, "reg", "master", (i, b) => `Register address bit ${i + 1} of 8: ${b}. The master selects register 0x75, WHO_AM_I.`));
  seq.push(ack("received the register address"));
  seq.push({
    kind: "Sr",
    level: 0,
    field: "start",
    by: "master",
    note: "Repeated START: a new START without a STOP, so the master keeps the bus between choosing the register and reading it.",
  });
  seq.push(...address(1));
  seq.push(ack("will now send data"));
  seq.push(...byteSyms(ADDR, 8, "rdata", "slave", (i, b) => `Data bit ${i + 1} of 8 from the IMU: ${b}. Now the slave drives SDA; WHO_AM_I returns 0x68.`));
  seq.push({
    kind: "nack",
    level: 1,
    field: "nack",
    by: "master",
    note: "NACK from the master: 'that was the last byte I want.' The slave releases SDA so the master can send STOP.",
  });
  seq.push(STOP);
  return seq;
}

const X0 = 44;
const X1 = 700;
const SCL_HI = 64;
const SCL_LO = 98;
const SDA_HI = 140;
const SDA_LO = 174;
const RATE = 3;

export function I2cTransaction() {
  const clock = useViz(true);
  const [kind, setKind] = useState<"write" | "read">("write");
  const [speed, setSpeed] = useState<"100" | "400">("400");
  const [missing, setMissing] = useState(false);
  const [manual, setManual] = useState(0);

  const seq = i2cSequence(kind, missing);
  const n = seq.length;
  const total = n + 3; // a short pause at the end of each pass
  const raw = (Math.floor(clock.t * RATE) + manual) % total;
  const idx = Math.min(raw, n - 1);
  const cur = seq[idx];
  const w = (X1 - X0) / n;
  const xs = (i: number, f: number) => X0 + (i + f) * w;

  // Waveforms built slot by slot.
  const scl: Array<[number, number]> = [];
  const sda: Array<[number, number]> = [];
  const y = (lvl: number, hi: number, lo: number) => (lvl ? hi : lo);
  seq.forEach((s, i) => {
    if (s.kind === "S") {
      scl.push([xs(i, 0), SCL_HI], [xs(i, 0.75), SCL_HI], [xs(i, 0.75), SCL_LO], [xs(i, 1), SCL_LO]);
      sda.push([xs(i, 0), SDA_HI], [xs(i, 0.4), SDA_HI], [xs(i, 0.4), SDA_LO], [xs(i, 1), SDA_LO]);
    } else if (s.kind === "Sr") {
      scl.push([xs(i, 0), SCL_LO], [xs(i, 0.25), SCL_LO], [xs(i, 0.25), SCL_HI], [xs(i, 0.8), SCL_HI], [xs(i, 0.8), SCL_LO], [xs(i, 1), SCL_LO]);
      sda.push([xs(i, 0), SDA_LO], [xs(i, 0.1), SDA_LO], [xs(i, 0.1), SDA_HI], [xs(i, 0.55), SDA_HI], [xs(i, 0.55), SDA_LO], [xs(i, 1), SDA_LO]);
    } else if (s.kind === "P") {
      scl.push([xs(i, 0), SCL_LO], [xs(i, 0.25), SCL_LO], [xs(i, 0.25), SCL_HI], [xs(i, 1), SCL_HI]);
      sda.push([xs(i, 0), SDA_LO], [xs(i, 0.6), SDA_LO], [xs(i, 0.6), SDA_HI], [xs(i, 1), SDA_HI]);
    } else {
      scl.push([xs(i, 0), SCL_LO], [xs(i, 0.25), SCL_LO], [xs(i, 0.25), SCL_HI], [xs(i, 0.75), SCL_HI], [xs(i, 0.75), SCL_LO], [xs(i, 1), SCL_LO]);
      const prev = sda.length ? sda[sda.length - 1][1] : SDA_HI;
      const now = y(s.level, SDA_HI, SDA_LO);
      if (prev !== now) sda.push([xs(i, 0.04), prev], [xs(i, 0.04), now]);
      else sda.push([xs(i, 0), now]);
      sda.push([xs(i, 1), now]);
    }
  });

  // Field bands: merge consecutive symbols with the same field.
  const bands: Array<{ field: Field; from: number; to: number }> = [];
  seq.forEach((s, i) => {
    const last = bands[bands.length - 1];
    if (last && last.field === s.field && s.kind !== "S" && s.kind !== "Sr") last.to = i;
    else bands.push({ field: s.field, from: i, to: i });
  });
  const bandLabel = (f: Field, from: number) => {
    if (f === "addr") return `addr ${hex(ADDR)}`;
    if (f === "rw") return seq[from].level ? "R" : "W";
    if (f === "ack") return "A";
    if (f === "nack") return "N";
    if (f === "reg") return `reg ${kind === "write" ? "0x6B" : "0x75"}`;
    if (f === "data") return "data 0x00";
    if (f === "rdata") return "data 0x68";
    return seq[from].kind;
  };

  const bitUs = speed === "100" ? 10 : 2.5;
  const clocks = seq.filter((s) => s.kind === "bit" || s.kind === "ack" || s.kind === "nack").length;
  const totalUs = (clocks + 2) * bitUs;

  return (
    <VizFrame
      title="I2C transaction, bit by bit"
      description="The ESP32 talks to an MPU-6050 at 0x68. Watch START, the address, the ACKs, the register and the data byte, and who drives SDA at each moment."
      controls={
        <>
          <PlayPause
            playing={clock.playing}
            onToggle={clock.toggle}
            onStep={() => setManual((m) => m + 1)}
            onReset={() => {
              clock.reset();
              setManual(0);
            }}
          />
          <Segmented
            label="Transaction"
            options={[
              { value: "write", label: "Write register" },
              { value: "read", label: "Read register" },
            ]}
            value={kind}
            onChange={(v) => {
              setKind(v);
              clock.reset();
              setManual(0);
            }}
          />
          <Segmented
            label="Bus speed"
            options={[
              { value: "100", label: "100 kHz" },
              { value: "400", label: "400 kHz" },
            ]}
            value={speed}
            onChange={setSpeed}
          />
          <Toggle
            label="No device at 0x68"
            checked={missing}
            onChange={(v) => {
              setMissing(v);
              clock.reset();
              setManual(0);
            }}
          />
        </>
      }
      footer={
        <span>
          {clocks} clock pulses at {speed} kHz ({bitUs} µs per bit): about {Math.round(totalUs)} µs for this transaction.
          {kind === "read" && !missing ? " Reading all 14 bytes of accelerometer, temperature and gyro data in one burst takes about 0.4 ms at 400 kHz." : ""}
        </span>
      }
    >
      <SvgCanvas viewBox="0 0 720 250" title="SDA and SCL waveforms of an I2C transaction with the current bit highlighted">
        {bands.map((b, i) => (
          <g key={i}>
            <rect
              x={xs(b.from, 0) + 1}
              y={44}
              width={(b.to - b.from + 1) * w - 2}
              height={150}
              rx={3}
              fill={FIELD_COLOR[b.field]}
              opacity={0.1}
            />
            <Label x={(xs(b.from, 0) + xs(b.to, 1)) / 2} y={32} size={(b.to - b.from + 1) * w < 30 ? 9.5 : 11} color={vizColors.text}>
              {bandLabel(b.field, b.from)}
            </Label>
          </g>
        ))}
        <rect x={xs(idx, 0)} y={42} width={w} height={182} rx={3} fill={vizColors.text} opacity={0.14} />
        <Label x={X0 - 4} y={(SCL_HI + SCL_LO) / 2} size={11} anchor="end" mono color={vizColors.muted}>
          SCL
        </Label>
        <Label x={X0 - 4} y={(SDA_HI + SDA_LO) / 2} size={11} anchor="end" mono color={vizColors.muted}>
          SDA
        </Label>
        <path d={polyline(scl)} fill="none" stroke={vizColors.text} strokeWidth={1.8} />
        <path d={polyline(sda)} fill="none" stroke={vizColors.cyan} strokeWidth={2} />
        {seq.map((s, i) => (
          <Label
            key={i}
            x={xs(i, 0.5)}
            y={190}
            size={w < 20 ? 9.5 : 11}
            mono
            color={s.by === "slave" ? vizColors.amber : s.by === "nobody" ? vizColors.red : vizColors.muted}
            bold={i === idx}
          >
            {s.kind === "bit" ? String(s.level) : s.kind === "ack" ? "A" : s.kind === "nack" ? "N" : s.kind}
          </Label>
        ))}
        <Label x={X0} y={214} size={10.5} anchor="start" color={vizColors.muted}>
          grey = master drives SDA
        </Label>
        <Label x={X0 + 170} y={214} size={10.5} anchor="start" color={vizColors.amber}>
          amber = slave drives SDA
        </Label>
        {missing && (
          <Label x={X0 + 340} y={214} size={10.5} anchor="start" color={vizColors.red}>
            red = nobody, the pull-up holds it high
          </Label>
        )}
        <Label x={X1} y={214} size={10.5} anchor="end" color={vizColors.muted}>
          {`symbol ${idx + 1} of ${n}`}
        </Label>
        <Label
          x={X0}
          y={240}
          size={11.5}
          anchor="start"
          color={cur.by === "slave" ? vizColors.amber : cur.by === "nobody" ? vizColors.red : vizColors.text}
          bold
        >
          {cur.by === "slave" ? "IMU" : cur.by === "nobody" ? "pull-up" : "ESP32"}
        </Label>
        <Label x={X0 + 62} y={240} size={11} anchor="start" color={vizColors.muted}>
          {cur.kind === "bit" ? (cur.field === "rw" ? "R/W bit" : `bit = ${cur.level}`) : cur.kind}
        </Label>
      </SvgCanvas>
      <p className="mt-3 min-h-12 text-sm" aria-live="polite">
        {cur.note}
      </p>
    </VizFrame>
  );
}
