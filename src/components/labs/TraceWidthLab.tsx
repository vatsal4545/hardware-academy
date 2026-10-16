"use client";

import { useId, useState, type FormEvent } from "react";
import { Segmented } from "@/components/lesson";
import { Button } from "@/components/ui/Button";
import { useProgress } from "@/lib/progress";
import { traceWidth, type TraceWidthInput, type TraceWidthResult } from "@/lib/sim/traceWidth";

const LAB_ID = "trace-width";
/** IPC-2221 charts stop at 35 A and 400 mil; beyond that the curve fit is an extrapolation. */
const MAX_CURRENT = 35;
const MAX_WIDTH_MIL = 400;

type Copper = "0.5" | "1" | "2" | "3";
type Layer = TraceWidthInput["layer"];

const COPPER: { value: Copper; label: string }[] = [
  { value: "0.5", label: "0.5 oz" },
  { value: "1", label: "1 oz" },
  { value: "2", label: "2 oz" },
  { value: "3", label: "3 oz" },
];
const LAYERS: { value: Layer; label: string }[] = [
  { value: "external", label: "External" },
  { value: "internal", label: "Internal" },
];

const REFERENCE_CURRENTS = [0.5, 1, 2, 3, 5, 10];
const REFERENCE_RISE = 10;
const REFERENCE_COLUMNS: Array<{ label: string; copperOz: number; layer: Layer }> = [
  { label: "External, 1 oz", copperOz: 1, layer: "external" },
  { label: "External, 2 oz", copperOz: 2, layer: "external" },
  { label: "Internal, 1 oz", copperOz: 1, layer: "internal" },
];

interface Calculation {
  input: TraceWidthInput;
  result: TraceWidthResult;
  /** the same trace on the other layer type, for comparison */
  other: TraceWidthResult;
}

function widthText(r: TraceWidthResult): string {
  return `${r.widthMil.toFixed(1)} mil (${r.widthMm.toFixed(3)} mm)`;
}

export function TraceWidthLab() {
  const [current, setCurrent] = useState("2");
  const [rise, setRise] = useState("10");
  const [copper, setCopper] = useState<Copper>("1");
  const [layer, setLayer] = useState<Layer>("external");
  const [calc, setCalc] = useState<Calculation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { state: progress, markLab } = useProgress();
  const done = Boolean(progress.labs[LAB_ID]);
  const currentId = useId();
  const riseId = useId();
  const resultId = useId();
  const referenceId = useId();

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentA = Number(current);
    const tempRiseC = Number(rise);
    if (!Number.isFinite(currentA) || currentA <= 0 || !Number.isFinite(tempRiseC) || tempRiseC <= 0) {
      setError("Enter a current above 0 A and a temperature rise above 0 °C.");
      return;
    }
    const input: TraceWidthInput = { currentA, tempRiseC, copperOz: Number(copper), layer };
    const otherLayer: Layer = layer === "external" ? "internal" : "external";
    setCalc({ input, result: traceWidth(input), other: traceWidth({ ...input, layer: otherLayer }) });
    setError(null);
    if (!done) markLab(LAB_ID);
  };

  const inputClass =
    "mt-1 block w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">Inputs</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor={currentId} className="block text-sm text-muted">
              Current (A)
              <input
                id={currentId}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className={inputClass}
              />
            </label>
            <label htmlFor={riseId} className="block text-sm text-muted">
              Temperature rise (°C)
              <input
                id={riseId}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={rise}
                onChange={(e) => setRise(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
          <Segmented label="Copper weight" options={COPPER} value={copper} onChange={setCopper} />
          <Segmented label="Layer" options={LAYERS} value={layer} onChange={setLayer} />
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <Button type="submit">Calculate</Button>
          <p className="text-xs text-muted">
            IPC-2221: A = (I / (k · ΔT<sup>0.44</sup>))<sup>1/0.725</sup> mil², with k = 0.048 outside and 0.024 inside the
            board; width = A / (1.378 mil per oz × copper weight).
          </p>
        </form>

        <section aria-labelledby={resultId} className="rounded-xl border border-border bg-surface p-5">
          <h2 id={resultId} className="font-semibold">
            Result
          </h2>
          {calc ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-muted">
                {calc.input.currentA} A, {calc.input.tempRiseC} °C rise, {calc.input.copperOz} oz copper,{" "}
                {calc.input.layer} layer
              </p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">
                      Cross-section
                    </th>
                    <td className="py-2 text-right font-mono tabular-nums">{calc.result.areaMil2.toFixed(1)} mil²</td>
                  </tr>
                  <tr className="border-b border-border">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">
                      Minimum width
                    </th>
                    <td className="py-2 text-right font-mono text-base font-semibold tabular-nums text-green-300">
                      {calc.result.widthMil.toFixed(1)} mil
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">
                      Minimum width (metric)
                    </th>
                    <td className="py-2 text-right font-mono tabular-nums">{calc.result.widthMm.toFixed(3)} mm</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-muted">
                      Same trace on an {calc.input.layer === "external" ? "internal" : "external"} layer
                    </th>
                    <td className="py-2 text-right font-mono tabular-nums">{widthText(calc.other)}</td>
                  </tr>
                </tbody>
              </table>
              {(calc.input.currentA > MAX_CURRENT || calc.result.widthMil > MAX_WIDTH_MIL) && (
                <p role="note" className="text-sm text-amber-300">
                  Outside the IPC-2221 chart range ({MAX_CURRENT} A, {MAX_WIDTH_MIL} mil): treat this as a rough estimate and
                  consider IPC-2152, planes or a busbar.
                </p>
              )}
              <p className="text-xs text-muted">
                Round up to your fab&apos;s next width step, and widen further where the trace runs hot next to other parts.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Enter the current and allowed temperature rise, then press Calculate.</p>
          )}
          {done && <p className="mt-3 text-xs text-green-300">Lab complete.</p>}
        </section>
      </div>

      <section aria-labelledby={referenceId} className="rounded-xl border border-border bg-surface p-5">
        <h2 id={referenceId} className="font-semibold">
          Reference: minimum widths for a {REFERENCE_RISE} °C rise
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Current
                </th>
                {REFERENCE_COLUMNS.map((c) => (
                  <th key={c.label} scope="col" className="py-2 pr-3 font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REFERENCE_CURRENTS.map((a) => (
                <tr key={a} className="border-b border-border last:border-0">
                  <th scope="row" className="py-2 pr-3 text-left font-mono font-normal">
                    {a} A
                  </th>
                  {REFERENCE_COLUMNS.map((c) => (
                    <td key={c.label} className="py-2 pr-3 font-mono tabular-nums">
                      {widthText(traceWidth({ currentA: a, tempRiseC: REFERENCE_RISE, copperOz: c.copperOz, layer: c.layer }))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Internal layers need roughly 2.6 times the width of an external trace for the same current, because the heat has
          to leave through the laminate.
        </p>
      </section>
    </div>
  );
}
