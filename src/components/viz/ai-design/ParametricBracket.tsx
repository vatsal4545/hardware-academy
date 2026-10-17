"use client";

import { useState } from "react";
import { Segmented, Slider, VizFrame } from "@/components/lesson";
import { SvgCanvas, vizColors } from "@/components/viz/shared";
import { BracketScene, SURFACE } from "./BracketScene";
import {
  AL_DENSITY,
  DEFAULT_PARAMS,
  bracketVolume,
  buildBracket,
  dfmChecks,
  makeView,
  rebuild,
  type BracketParams,
  type DfmCheck,
  type FeatureOrder,
  type FeatureStatus,
} from "./bracketModel";
import { ActionButton, cx } from "./ui";

const VB_W = 440;
const VIEW = makeView(100, VB_W, 400, 14);
const OFF = { faces: false, edges: false, vertices: false, xray: false };

const STATE_MARK: Record<FeatureStatus["state"], { mark: string; cls: string; word: string }> = {
  ok: { mark: "✓", cls: "text-green-400", word: "built" },
  failed: { mark: "✗", cls: "text-red-400", word: "failed" },
  skipped: { mark: "–", cls: "text-muted", word: "skipped" },
};
const CHECK_MARK: Record<DfmCheck["status"], { mark: string; cls: string; word: string }> = {
  pass: { mark: "✓", cls: "text-green-400", word: "pass" },
  fail: { mark: "✗", cls: "text-red-400", word: "fail" },
  na: { mark: "–", cls: "text-muted", word: "not evaluated" },
};

/** Sliders and a feature-order switch drive a replayed feature tree; the drawing, the build log and the DFM checks regenerate live. */
export function ParametricBracket() {
  const [length, setLength] = useState(DEFAULT_PARAMS.length);
  const [holeD, setHoleD] = useState(DEFAULT_PARAMS.holeD);
  const [fillet, setFillet] = useState(DEFAULT_PARAMS.fillet);
  const [order, setOrder] = useState<FeatureOrder>("fillet-first");

  const params: BracketParams = { length, holeD, fillet };
  const built = rebuild(params, order);
  const model = buildBracket(params, built.applied);
  const checks = dfmChecks(params, built);
  const volume = bracketVolume(params, built.applied);
  const failure = built.failure;
  const failedAt = built.statuses.findIndex((x) => x.state === "failed") + 1;
  const bannerText = failure ? `Rebuild failed: feature ${failedAt} of ${built.statuses.length}` : "";
  const bannerWidth = 22 + bannerText.length * 7.6;

  const reproduce = () => {
    setOrder("holes-first");
    setHoleD(12);
    setFillet(12);
    setLength(70);
  };
  const reset = () => {
    setOrder("fillet-first");
    setHoleD(DEFAULT_PARAMS.holeD);
    setFillet(DEFAULT_PARAMS.fillet);
    setLength(DEFAULT_PARAMS.length);
  };

  return (
    <VizFrame
      title="Parametric bracket: change a number, regenerate the part"
      description="Drag the sliders and the kernel replays the feature tree. Switch the feature order and enlarge the hole to see why order is part of the design."
      controls={
        <>
          <Slider label="Base length" value={length} min={50} max={100} step={1} unit="mm" onChange={setLength} />
          <Slider label="Hole diameter (both holes)" value={holeD} min={4} max={14} step={0.5} unit="mm" onChange={setHoleD} />
          <Slider label="Inside fillet radius" value={fillet} min={0} max={16} step={0.5} unit="mm" onChange={setFillet} />
          <Segmented
            label="Feature order"
            value={order}
            onChange={setOrder}
            options={[
              { value: "fillet-first", label: "Fillet first" },
              { value: "holes-first", label: "Holes first" },
            ]}
          />
        </>
      }
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton variant="secondary" onClick={reproduce}>
            Reproduce the failure
          </ActionButton>
          <ActionButton variant="ghost" onClick={reset}>
            Reset
          </ActionButton>
          <span>Reproduce sets holes first, a Ø12 hole and an R12 fillet. Then flip the order to Fillet first and compare where the error lands.</span>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem]">
        <SvgCanvas viewBox={`0 0 ${VB_W} 400`} className="mx-auto max-w-[520px] self-start" title={`Isometric bracket, base length ${length} mm, hole diameter ${holeD} mm, fillet radius ${fillet} mm${failure ? ", rebuild failed" : ""}`}>
          <rect width={VB_W} height="400" fill={SURFACE} />
          <BracketScene model={model} view={VIEW} highlight={OFF} dims labels={false} />
          {failure && (
            <g>
              <rect x={VB_W - 12 - bannerWidth} y="12" width={bannerWidth} height="26" rx="6" fill="#7f1d1d" fillOpacity="0.88" stroke={vizColors.red} />
              <text x={VB_W - 2 - bannerWidth} y="29" fontSize="12.5" fill="#fecaca" fontFamily="var(--font-mono)">
                {bannerText}
              </text>
            </g>
          )}
        </SvgCanvas>

        <div className="space-y-4 text-sm">
          <p
            role="status"
            className={cx("rounded-md border px-3 py-2 font-medium", failure ? "border-red-400/50 bg-red-400/10 text-red-200" : "border-green-400/40 bg-green-400/10 text-green-200")}
          >
            {failure ? `Rebuild failed at feature ${failedAt} of ${built.statuses.length}: ${failure.label}` : `Rebuild OK: all ${built.statuses.length} features built`}
          </p>
          <div>
            <p className="mb-1 font-semibold">Feature tree</p>
            <ol className="space-y-1.5">
              {built.statuses.map((s, i) => {
                const m = STATE_MARK[s.state];
                return (
                  <li key={s.id} className="leading-snug">
                    <span className={cx("mr-1.5 font-mono", m.cls)} aria-label={m.word}>
                      {m.mark}
                    </span>
                    <span className={cx(s.state === "skipped" && "text-muted line-through")}>
                      {i + 1}. {s.label}
                    </span>
                    {s.message && <p className={cx("mt-0.5 pl-5 text-xs", s.state === "failed" ? "text-red-300" : "text-muted")}>{s.message}</p>}
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <p className="mb-1 font-semibold">DFM checks</p>
            <ul className="space-y-1.5">
              {checks.map((c) => {
                const m = CHECK_MARK[c.status];
                return (
                  <li key={c.id} className="leading-snug">
                    <span className={cx("mr-1.5 font-mono", m.cls)} aria-label={m.word}>
                      {m.mark}
                    </span>
                    {c.label}: <span className="font-mono">{c.measured}</span>
                    <span className="block pl-5 text-xs text-muted">rule: {c.rule}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="text-muted">
            {failure ? "Part shown is the last good state. " : ""}Volume {Math.round(volume).toLocaleString("en-US")} mm³, about{" "}
            <span className="font-mono text-text">{(volume * AL_DENSITY).toFixed(1)} g</span> in 6061 aluminium.
          </p>
        </div>
      </div>
    </VizFrame>
  );
}
