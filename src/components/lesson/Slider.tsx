"use client";

import { useId } from "react";

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}

export function Slider({ label, value, min, max, step = 1, unit, onChange, format }: SliderProps) {
  const id = useId();
  const shown = format ? format(value) : `${Number.isInteger(step) ? value : Number(value.toFixed(3))}${unit ? ` ${unit}` : ""}`;
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-text">{shown}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-cyan-400"
      />
    </label>
  );
}
