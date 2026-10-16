"use client";

import dynamic from "next/dynamic";
import { Component, useState, useSyncExternalStore, type ReactNode } from "react";
import { Segmented, Slider, Toggle, VizFrame } from "@/components/lesson";
import { usePrefersReducedMotion } from "@/components/viz/shared";
import { PackageExplodedSvg } from "./PackageExplodedSvg";
import { packageKindOptions, packageLayers, type PackageKind } from "./PackageExplodedLayers";

/** The three.js scene is code-split, never server-rendered, and only mounted when WebGL exists.
 *  While its chunk loads, `loading` renders nothing and the SVG drawn underneath stays visible. */
const PackageExploded3D = dynamic(() => import("./PackageExploded3D").then((m) => m.PackageExploded3D), {
  ssr: false,
  loading: () => null,
});

const noopSubscribe = () => () => {};
const hasWebGL = () => typeof window !== "undefined" && "WebGLRenderingContext" in window;

/** If the GPU context cannot be created, drop the 3-D layer and leave the SVG fallback showing. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Exploded flip-chip BGA or QFN: React Three Fiber when WebGL is available, an SVG side view otherwise. */
export function PackageExploded() {
  const reduced = usePrefersReducedMotion();
  const webgl = useSyncExternalStore(noopSubscribe, hasWebGL, () => false);
  const [kind, setKind] = useState<PackageKind>("bga");
  const [explode, setExplode] = useState(0.6);
  const [user3D, setUser3D] = useState<boolean | null>(null);
  const [userRotate, setUserRotate] = useState<boolean | null>(null);

  // Reduced motion: start on the static SVG with rotation off; the viewer can still opt in.
  const view3D = webgl && (user3D ?? !reduced);
  const autoRotate = userRotate ?? !reduced;
  const layers = packageLayers[kind];

  return (
    <VizFrame
      title="Exploded package: flip-chip BGA vs QFN"
      description={
        view3D
          ? "Drag to orbit the model and pull the layers apart with the slider."
          : "Side view of the same layers. Pull them apart with the slider."
      }
      controls={
        <>
          <Segmented label="Package" options={packageKindOptions} value={kind} onChange={setKind} />
          <Slider
            label="Explode"
            value={explode}
            min={0}
            max={1}
            step={0.01}
            onChange={setExplode}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          {webgl && <Toggle label="3D view" checked={view3D} onChange={setUser3D} />}
          {view3D && <Toggle label="Auto-rotate" checked={autoRotate} onChange={setUserRotate} />}
        </>
      }
      footer={
        kind === "bga"
          ? "Flip chip: heat goes up through the die back, TIM and lid into a heat sink; signals go down through bumps, substrate and balls."
          : "QFN: heat goes down through the die attach and exposed pad into the PCB copper, so the thermal-pad solder joint is the main heat path."
      }
    >
      <div className="relative overflow-hidden rounded-lg">
        <PackageExplodedSvg kind={kind} explode={explode} />
        {view3D && (
          <div className="absolute inset-0" aria-hidden="true">
            <SceneBoundary>
              <PackageExploded3D kind={kind} explode={explode} autoRotate={autoRotate} />
            </SceneBoundary>
          </div>
        )}
      </div>
      <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {[...layers].reverse().map((layer) => (
          <li key={layer.id} className="flex gap-2">
            <span
              aria-hidden="true"
              className="mt-1 h-3 w-3 shrink-0 rounded-sm border border-border"
              style={{ backgroundColor: layer.color }}
            />
            <span>
              <span className="font-semibold">{layer.name}.</span>{" "}
              <span className="text-muted">{layer.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </VizFrame>
  );
}
