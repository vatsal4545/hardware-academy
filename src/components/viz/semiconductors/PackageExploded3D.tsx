"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Instance, Instances, OrbitControls } from "@react-three/drei";
import { QuadraticBezierCurve3, Vector3 } from "three";
import { vizColors } from "@/components/viz/shared";
import { packageColors, type PackageKind } from "./PackageExplodedLayers";

/** World units added between neighbouring layers at full explode. */
const GAP = 0.75;

export interface PackageExploded3DProps {
  kind?: PackageKind;
  /** 0 = assembled, 1 = fully exploded */
  explode?: number;
  autoRotate?: boolean;
}

/** n × n grid of (x, z) points centred on the origin. */
function grid(n: number, pitch: number): Array<[number, number]> {
  const off = ((n - 1) * pitch) / 2;
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push([i * pitch - off, j * pitch - off]);
  return out;
}

/** Place a point given as (along an edge, distance from centre) on one of the four sides of a square. */
function onSide(side: number, along: number, dist: number): [number, number] {
  if (side === 0) return [along, dist];
  if (side === 1) return [dist, -along];
  if (side === 2) return [-along, -dist];
  return [-dist, along];
}

function FlipChipBga({ explode }: { explode: number }) {
  const lift = (k: number) => k * GAP * explode;
  const balls = useMemo(() => grid(10, 0.38), []);
  const bumps = useMemo(() => grid(12, 0.13), []);
  return (
    <group>
      {/* 0: solder balls */}
      <group position={[0, 0.13 + lift(0), 0]}>
        <Instances limit={balls.length}>
          <sphereGeometry args={[0.13, 18, 12]} />
          <meshStandardMaterial color={packageColors.balls} metalness={0.35} roughness={0.4} />
          {balls.map(([x, z]) => (
            <Instance key={`${x}:${z}`} position={[x, 0, z]} />
          ))}
        </Instances>
      </group>
      {/* 1: substrate */}
      <mesh position={[0, 0.37 + lift(1), 0]}>
        <boxGeometry args={[4, 0.3, 4]} />
        <meshStandardMaterial color={packageColors.substrate} roughness={0.75} />
      </mesh>
      {/* 2: bumps in underfill */}
      <group position={[0, 0.565 + lift(2), 0]}>
        <Instances limit={bumps.length}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color={packageColors.bump} metalness={0.35} roughness={0.4} />
          {bumps.map(([x, z]) => (
            <Instance key={`${x}:${z}`} position={[x, 0, z]} />
          ))}
        </Instances>
        <mesh>
          <boxGeometry args={[1.95, 0.09, 1.95]} />
          <meshStandardMaterial color={packageColors.underfill} transparent opacity={0.35} depthWrite={false} />
        </mesh>
      </group>
      {/* 3: die, face down */}
      <mesh position={[0, 0.7 + lift(3), 0]}>
        <boxGeometry args={[1.8, 0.18, 1.8]} />
        <meshStandardMaterial color={packageColors.die} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* 4: thermal interface material */}
      <mesh position={[0, 0.81 + lift(4), 0]}>
        <boxGeometry args={[1.8, 0.04, 1.8]} />
        <meshStandardMaterial color={packageColors.tim} roughness={0.6} />
      </mesh>
      {/* 5: lid with its skirt */}
      <group position={[0, lift(5), 0]}>
        <mesh position={[0, 0.89, 0]}>
          <boxGeometry args={[3.4, 0.12, 3.4]} />
          <meshStandardMaterial color={packageColors.lid} metalness={0.35} roughness={0.4} />
        </mesh>
        {[0, 1, 2, 3].map((side) => {
          const [x, z] = onSide(side, 0, 1.64);
          const alongX = side % 2 === 0;
          return (
            <mesh key={side} position={[x, 0.675, z]}>
              <boxGeometry args={alongX ? [3.4, 0.31, 0.12] : [0.12, 0.31, 3.16]} />
              <meshStandardMaterial color={packageColors.lid} metalness={0.35} roughness={0.4} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

const LEADS_PER_SIDE = 8;
const LEAD_PITCH = 0.34;
const LEAD_W = 0.17;

function Qfn({ explode }: { explode: number }) {
  const lift = (k: number) => k * GAP * explode;
  const slots = useMemo(() => Array.from({ length: LEADS_PER_SIDE }, (_, i) => i - (LEADS_PER_SIDE - 1) / 2), []);
  const wires = useMemo(
    () =>
      [0, 1, 2, 3].flatMap((side) =>
        slots.map((s) => {
          const [x0, z0] = onSide(side, s * 0.15, 0.62);
          const [x1, z1] = onSide(side, s * LEAD_PITCH, 1.38);
          const [xm, zm] = onSide(side, s * 0.25, 1.0);
          return new QuadraticBezierCurve3(new Vector3(x0, 0.38, z0), new Vector3(xm, 0.78, zm), new Vector3(x1, 0.15, z1));
        }),
      ),
    [slots],
  );
  const panes = useMemo(() => grid(3, 0.7), []);
  return (
    <group>
      {/* 0: solder: window-pane print on the pad plus one deposit per lead */}
      <group position={[0, 0.025 + lift(0), 0]}>
        {panes.map(([x, z]) => (
          <mesh key={`${x}:${z}`} position={[x, 0, z]}>
            <boxGeometry args={[0.6, 0.05, 0.6]} />
            <meshStandardMaterial color={packageColors.solder} metalness={0.35} roughness={0.4} />
          </mesh>
        ))}
        {[0, 1, 2, 3].flatMap((side) =>
          slots.map((s) => {
            const [x, z] = onSide(side, s * LEAD_PITCH, 1.55);
            return (
              <mesh key={`${side}:${s}`} position={[x, 0, z]}>
                <boxGeometry args={side % 2 === 0 ? [LEAD_W, 0.05, 0.45] : [0.45, 0.05, LEAD_W]} />
                <meshStandardMaterial color={packageColors.solder} metalness={0.35} roughness={0.4} />
              </mesh>
            );
          }),
        )}
      </group>
      {/* 1: lead frame: exposed pad and perimeter leads */}
      <group position={[0, 0.1 + lift(1), 0]}>
        <mesh>
          <boxGeometry args={[2.2, 0.1, 2.2]} />
          <meshStandardMaterial color={packageColors.leadframe} metalness={0.35} roughness={0.4} />
        </mesh>
        {[0, 1, 2, 3].flatMap((side) =>
          slots.map((s) => {
            const [x, z] = onSide(side, s * LEAD_PITCH, 1.55);
            return (
              <mesh key={`${side}:${s}`} position={[x, 0, z]}>
                <boxGeometry args={side % 2 === 0 ? [LEAD_W, 0.1, 0.5] : [0.5, 0.1, LEAD_W]} />
                <meshStandardMaterial color={packageColors.leadframe} metalness={0.35} roughness={0.4} />
              </mesh>
            );
          }),
        )}
      </group>
      {/* 2: die attach */}
      <mesh position={[0, 0.165 + lift(2), 0]}>
        <boxGeometry args={[1.5, 0.03, 1.5]} />
        <meshStandardMaterial color={packageColors.attach} roughness={0.6} />
      </mesh>
      {/* 3: die, face up */}
      <mesh position={[0, 0.28 + lift(3), 0]}>
        <boxGeometry args={[1.4, 0.2, 1.4]} />
        <meshStandardMaterial color={packageColors.die} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* 4: bond wires */}
      <group position={[0, lift(4), 0]}>
        {wires.map((curve, i) => (
          <mesh key={i}>
            <tubeGeometry args={[curve, 16, 0.014, 6, false]} />
            <meshStandardMaterial color={packageColors.wire} metalness={0.35} roughness={0.4} />
          </mesh>
        ))}
      </group>
      {/* 5: mold compound */}
      <mesh position={[0, 0.425 + lift(5) + 0.9 * explode, 0]}>
        <boxGeometry args={[3.6, 0.75, 3.6]} />
        <meshStandardMaterial color={packageColors.mold} transparent opacity={0.45} roughness={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** React Three Fiber scene: an exploded flip-chip BGA or QFN built from boxes, spheres and tubes. */
export function PackageExploded3D({ kind = "bga", explode = 0.6, autoRotate = true }: PackageExploded3DProps) {
  return (
    <Canvas
      camera={{ position: [6, 5, 7.2], fov: 35 }}
      dpr={[1, 2]}
      frameloop={autoRotate ? "always" : "demand"}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[vizColors.bg]} />
      <hemisphereLight args={["#e5e7eb", "#1f2937", 0.6]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 8, 5]} intensity={1.5} />
      <directionalLight position={[-6, 3, -4]} intensity={0.45} />
      {/* PCB under the package */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[5.2, 0.1, 5.2]} />
        <meshStandardMaterial color={packageColors.pcb} roughness={0.85} />
      </mesh>
      {kind === "bga" ? <FlipChipBga explode={explode} /> : <Qfn explode={explode} />}
      <OrbitControls
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={0.9}
        enablePan={false}
        enableZoom={false}
        target={[0, 0.45 + 2.1 * explode, 0]}
      />
    </Canvas>
  );
}
