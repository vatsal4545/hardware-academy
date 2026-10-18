"use client";

/**
 * The components-in-action tour: a top view of the motor-driver board on the left, a stepper of eight stations on the
 * right, one shared set of inputs behind both (so a slider moved at station 2 is still moved at station 8), charge dots
 * that run along the station's copper at a speed proportional to the current, a probe mode in which any part on the
 * board can be inspected for its role and its live numbers, and a virtual multimeter whose two probes go on any of the
 * board's test pads.
 */

import { useEffect, useRef, useState } from "react";
import { PlayPause, Stepper, Toggle, VizFrame } from "@/components/lesson";
import { Button } from "@/components/ui/Button";
import { useViz } from "@/components/viz/shared";
import { BOARD_DEFAULTS, boardModel, type BoardInputs, type TestPointId } from "@/lib/sim/board";
import { allParts, FLOW_DOT_SPACING_PX, PART_ROLES, STATIONS, stationIndex } from "./BoardInAction.board";
import { meterReading, nextProbes, NO_PROBES, testPointName, type Probes } from "./BoardInAction.meter";
import { StationPanel } from "./BoardInAction.panels";
import { BoardTopView, flowPathsFor } from "./BoardInAction.view";
import { dotSpeedCap, dotSpeeds, Stat, useFlowPhases } from "./OhmsLawCircuit.helpers";

/** On-screen dot speed at a station's reference current, px per second. */
export const BOARD_PX_PER_S_AT_REF = 160;
/** The cap keeps one 60 Hz frame under half a dot spacing, so dots never look as if they run backwards. */
export const BOARD_SPEED_CAP = dotSpeedCap(FLOW_DOT_SPACING_PX);
const MAX_FLOWS = 3;

export function BoardInAction() {
  const viz = useViz(true);
  const [inputs, setInputs] = useState<BoardInputs>(BOARD_DEFAULTS);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [meterOn, setMeterOn] = useState(false);
  const [probes, setProbes] = useState<Probes>(NO_PROBES);
  const cardRef = useRef<HTMLDivElement>(null);

  const model = boardModel(inputs);
  const station = STATIONS[index];
  const paths = flowPathsFor(station, inputs.forward);
  const currents = station.flows.map((f) => f.current(model, inputs));
  const speeds = dotSpeeds(currents, station.flows[0].referenceA, BOARD_PX_PER_S_AT_REF, BOARD_SPEED_CAP);
  // a fixed number of phase accumulators, so the hook's state never resizes when the station changes
  const rates = Array.from({ length: MAX_FLOWS }, (_, k) => (k < paths.length ? speeds[k] / paths[k].length : 0));
  const phases = useFlowPhases(rates, viz.playing);

  const patch = (p: Partial<BoardInputs>) => setInputs((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    if (selected) cardRef.current?.focus();
  }, [selected]);

  const probed = selected ? allParts.find((p) => p.ref === selected) : undefined;
  const role = selected ? PART_ROLES[selected] : undefined;
  const roleStation = role?.station ? stationIndex(role.station) : -1;

  // the meter: a pad click only ever moves a probe, a part click only ever opens the card, so the two never fight
  const placeProbe = (id: TestPointId) => {
    setMeterOn(true);
    setProbes((p) => nextProbes(p, id));
  };
  const clearProbes = () => setProbes(NO_PROBES);
  const switchMeter = (on: boolean) => {
    setMeterOn(on);
    if (!on) setProbes(NO_PROBES);
  };
  const reading = probes.black && probes.red ? meterReading(probes.black, probes.red, model, inputs) : null;
  const meterHint = !probes.black
    ? "Put the black probe (COM) on a test point: click it, or Tab to it and press Enter. GND is the usual place."
    : `Black probe on ${testPointName(probes.black)}. Now touch the red probe to a second test point; a later click moves the red probe.`;

  return (
    <VizFrame
      title="The board in action: eight stations, one current path"
      description="Follow the current from the battery connector to the motor. Each station lights the parts it is about, runs the charge along the real copper, and recomputes its law as you move the sliders. Click or tab to any part to inspect it, or switch the multimeter on and put its two probes on the board's test pads."
      controls={
        <>
          <PlayPause playing={viz.playing} onToggle={viz.toggle} />
          <p className="text-xs text-muted sm:col-span-2">
            Dots are conventional current and move at a speed proportional to the amps. Red copper is the top layer, blue the bottom; amber halos mark the copper
            and parts the station is about.
          </p>
        </>
      }
      footer="Model assumptions: Q1 at 50 mΩ with the pack on its gate; the AMS1117 at 60 °C/W and 5 mA of ground current; about 1 nH per millimetre of decoupling trace plus 0.5 nH in the capacitor; a 4 Ω, 1 mH winding at 20 kHz PWM; a typical SAR ADC input of about 10 pF. The ESP32 pin threshold of 0.75 × VDD is from the ESP32 datasheet. The multimeter reads DC: the motor terminals show the PWM average, and EN is read after it has settled. All numbers are the model's, not measurements; use them to see how each law behaves, then measure your own board."
    >
      <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted">Ringed pads are test points for the meter.</p>
              <div className="w-40 shrink-0">
                <Toggle label="Multimeter" checked={meterOn} onChange={switchMeter} />
              </div>
            </div>
            <BoardTopView
              station={station}
              phases={phases}
              flowPaths={paths}
              selected={selected}
              onSelect={setSelected}
              forward={inputs.forward}
              probes={probes}
              onProbe={placeProbe}
              onClearProbes={clearProbes}
              meterOn={meterOn}
            />
            <p className="mt-2 text-xs text-muted">
              Keyboard: Tab to a part or a test point, Enter or Space to inspect it or place a probe, Escape to close the card or lift the probes.
            </p>

            {meterOn && (
              <div
                data-meter
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === "Escape") clearProbes();
                }}
                className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/5 p-3 outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h4 className="font-semibold">
                    Multimeter <span className="font-normal text-muted">DC volts</span>
                  </h4>
                  <Button size="sm" variant="ghost" onClick={clearProbes} disabled={!probes.black && !probes.red}>
                    Clear probes
                  </Button>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-live="polite">
                  <Stat label="Black probe (COM)" value={testPointName(probes.black) ?? "—"} />
                  <Stat label="Red probe" value={testPointName(probes.red) ?? "—"} />
                  <Stat label="Reading  V(red) − V(black)" value={reading?.display ?? "—"} tone={reading && reading.volts < 0 ? "warn" : "neutral"} />
                </dl>
                <p className="mt-2 text-sm text-text/90">{reading ? reading.law : meterHint}</p>
              </div>
            )}
          </div>
          <Stepper
            steps={STATIONS.map((s) => ({
              title: s.title,
              body: <StationPanel station={s} model={model} inputs={inputs} onChange={patch} />,
            }))}
            index={index}
            onChange={setIndex}
          />
        </div>

        {probed && role && (
          <div
            ref={cardRef}
            data-probe-card
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected(null);
            }}
            className="mt-4 rounded-lg border border-cyan-400/40 bg-cyan-400/5 p-4 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h4 className="font-semibold">
                {probed.ref} <span className="font-normal text-muted">{probed.label}</span>
              </h4>
              <div className="flex gap-2">
                {roleStation >= 0 && (
                  <Button size="sm" variant="secondary" onClick={() => setIndex(roleStation)}>
                    {`Go to station ${roleStation + 1}`}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
            <p className="mt-1 text-sm text-text/90">{role.role}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {role.readings(model, inputs).map((r) => (
                <Stat key={r.label} label={r.label} value={r.value} />
              ))}
            </dl>
          </div>
        )}
      </div>
    </VizFrame>
  );
}
