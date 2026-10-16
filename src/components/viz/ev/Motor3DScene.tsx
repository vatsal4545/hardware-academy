"use client";

import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MOTOR, MOTOR_COLORS, partOffsets } from "./Motor3DParts";

const HALF_PI = Math.PI / 2;
const { stator, winding, rotor, magnet, shaft, bearing, housing, cap } = MOTOR;
const SLICE_STEP = stator.length / stator.laminations;
const SLICE_DEPTH = SLICE_STEP * 0.8; // the gaps between slices read as a laminated stack
const SLOT_PITCH = (Math.PI * 2) / stator.slots;

/** One stator lamination: an annulus with open, radial slots between the teeth. Teeth are centred on k·pitch. */
function laminationShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, stator.rOut, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  const halfTooth = SLOT_PITCH / 4;
  for (let k = 0; k < stator.slots; k++) {
    const c = k * SLOT_PITCH;
    const a0 = c - halfTooth;
    const a1 = c + halfTooth;
    const b1 = c + SLOT_PITCH - halfTooth;
    if (k === 0) hole.moveTo(stator.rIn * Math.cos(a0), stator.rIn * Math.sin(a0));
    hole.lineTo(stator.rIn * Math.cos(a1), stator.rIn * Math.sin(a1));
    hole.lineTo(stator.rSlot * Math.cos(a1), stator.rSlot * Math.sin(a1));
    hole.lineTo(stator.rSlot * Math.cos(b1), stator.rSlot * Math.sin(b1));
    hole.lineTo(stator.rIn * Math.cos(b1), stator.rIn * Math.sin(b1));
  }
  hole.closePath();
  shape.holes.push(hole);
  return shape;
}

function useLaminationGeometry(): THREE.ExtrudeGeometry {
  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(laminationShape(), { depth: SLICE_DEPTH, bevelEnabled: false, curveSegments: 48 });
    g.translate(0, 0, -SLICE_DEPTH / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function useMaterials() {
  const materials = useMemo(
    () => ({
      housing: new THREE.MeshStandardMaterial({
        color: MOTOR_COLORS.housing,
        metalness: 0.3,
        roughness: 0.5,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      cap: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.cap, metalness: 0.35, roughness: 0.5 }),
      lamination: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.lamination, metalness: 0.4, roughness: 0.4 }),
      copper: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.copper, metalness: 0.45, roughness: 0.32 }),
      rotor: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.rotor, metalness: 0.35, roughness: 0.45 }),
      magnetN: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.magnetN, metalness: 0.2, roughness: 0.4 }),
      magnetS: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.magnetS, metalness: 0.2, roughness: 0.4 }),
      shaft: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.shaft, metalness: 0.5, roughness: 0.25 }),
      bearing: new THREE.MeshStandardMaterial({ color: MOTOR_COLORS.bearing, metalness: 0.4, roughness: 0.35 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  return materials;
}

const LABEL_PX = 64;
const LABEL_FONT = "500 38px system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Draws a label into a canvas texture: no DOM overlay, no extra React root, no font download. */
function useLabelTexture(text: string) {
  const label = useMemo(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let width = 16 + text.length * 20;
    if (ctx) {
      ctx.font = LABEL_FONT;
      width = Math.ceil(ctx.measureText(text).width) + 32;
    }
    canvas.width = width;
    canvas.height = LABEL_PX;
    if (ctx) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.beginPath();
      // roundRect is missing in browsers older than about 2023; a square box is fine there
      if (typeof ctx.roundRect === "function") ctx.roundRect(0, 0, width, LABEL_PX, 12);
      else ctx.rect(0, 0, width, LABEL_PX);
      ctx.fill();
      ctx.font = LABEL_FONT;
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 16, LABEL_PX / 2 + 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, aspect: width / LABEL_PX };
  }, [text]);
  useEffect(() => () => label.texture.dispose(), [label]);
  return label;
}

function PartLabel({ position, children }: { position: [number, number, number]; children: string }) {
  const { texture, aspect } = useLabelTexture(children);
  const height = 0.36;
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}>
      <spriteMaterial map={texture} depthTest={false} depthWrite={false} transparent />
    </sprite>
  );
}

function MotorModel({ explode }: { explode: number }) {
  const lamination = useLaminationGeometry();
  const m = useMaterials();
  const o = partOffsets(explode);
  const showLabels = explode > 0.3;
  const barRadius = (stator.rIn + stator.rSlot) / 2 + 0.02;

  // Built with the shaft along local z, then turned so the shaft runs left-right in the world.
  return (
    <group rotation={[0, HALF_PI, 0]}>
      {/* stator: lamination stack */}
      {Array.from({ length: stator.laminations }, (_, k) => (
        <mesh
          key={k}
          geometry={lamination}
          material={m.lamination}
          position={[0, 0, -stator.length / 2 + SLICE_STEP * (k + 0.5)]}
        />
      ))}
      {/* windings: one rectangular (hairpin) bar per slot plus the end turns */}
      {Array.from({ length: stator.slots }, (_, k) => {
        const a = (k + 0.5) * SLOT_PITCH;
        return (
          <mesh key={k} material={m.copper} position={[barRadius * Math.cos(a), barRadius * Math.sin(a), 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.17, 0.08, stator.length + 0.24]} />
          </mesh>
        );
      })}
      {[-1, 1].map((side) => (
        <mesh key={side} material={m.copper} position={[0, 0, side * winding.endTurnX]}>
          <torusGeometry args={[winding.endTurnR, winding.tube, 12, 64]} />
        </mesh>
      ))}

      {/* housing with cooling fins */}
      <group position={[0, o.housingY, 0]}>
        <mesh material={m.housing} rotation={[HALF_PI, 0, 0]}>
          <cylinderGeometry args={[housing.r, housing.r, housing.length, 64, 1, true]} />
        </mesh>
        {Array.from({ length: housing.fins }, (_, k) => (
          <mesh key={k} material={m.cap} position={[0, 0, -1 + (2 * k) / (housing.fins - 1)]}>
            <torusGeometry args={[housing.r + 0.02, 0.035, 8, 64]} />
          </mesh>
        ))}
      </group>

      {/* end caps */}
      {[o.frontCapX, o.rearCapX].map((z) => (
        <mesh key={z > 0 ? "rear" : "front"} material={m.cap} position={[0, 0, z]} rotation={[HALF_PI, 0, 0]}>
          <cylinderGeometry args={[cap.r, cap.r, cap.thickness, 64]} />
        </mesh>
      ))}

      {/* rotor, buried magnets, shaft and bearings slide out together */}
      <group position={[0, 0, o.rotorX]}>
        <mesh material={m.rotor} rotation={[HALF_PI, 0, 0]}>
          <cylinderGeometry args={[rotor.r, rotor.r, rotor.length, 48]} />
        </mesh>
        {Array.from({ length: magnet.count }, (_, k) => {
          const a = (k / magnet.count) * Math.PI * 2;
          return (
            <mesh
              key={k}
              material={k % 2 === 0 ? m.magnetN : m.magnetS}
              position={[o.magnetR * Math.cos(a), o.magnetR * Math.sin(a), 0]}
              rotation={[0, 0, a]}
            >
              <boxGeometry args={[magnet.thick, magnet.width, magnet.length]} />
            </mesh>
          );
        })}
        <mesh material={m.shaft} rotation={[HALF_PI, 0, 0]}>
          <cylinderGeometry args={[shaft.r, shaft.r, shaft.length, 24]} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} material={m.bearing} position={[0, 0, side * bearing.x]}>
            <torusGeometry args={[bearing.r, bearing.tube, 12, 32]} />
          </mesh>
        ))}
      </group>

      {showLabels && (
        <>
          <PartLabel position={[0, o.housingY + housing.r + 0.35, 0]}>Housing</PartLabel>
          <PartLabel position={[0, -stator.rOut - 0.35, 0]}>Stator: laminations + hairpins</PartLabel>
          <PartLabel position={[0, o.magnetR + 0.45, o.rotorX]}>Rotor + NdFeB magnets</PartLabel>
          <PartLabel position={[0, -0.55, o.rotorX + shaft.length / 2 + 0.2]}>Shaft + bearings</PartLabel>
          <PartLabel position={[0, -cap.r - 0.35, o.frontCapX]}>Front cap</PartLabel>
          <PartLabel position={[0, cap.r + 0.35, o.rearCapX]}>Rear cap</PartLabel>
        </>
      )}
    </group>
  );
}

/** React Three Fiber scene of an exploded interior-PM traction motor. Loaded only in the browser, only with WebGL. */
export function Motor3DScene({ explode, autoRotate }: { explode: number; autoRotate: boolean }) {
  return (
    <Canvas
      camera={{ position: [4.7, 4.0, 9.8], fov: 38 }}
      dpr={[1, 2]}
      frameloop={autoRotate ? "always" : "demand"}
      aria-label="3D exploded view of a traction motor"
    >
      <color attach="background" args={["#0b0f17"]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[6, 8, 6]} intensity={2.4} />
      <directionalLight position={[-6, 3, -5]} intensity={0.9} />
      <MotorModel explode={explode} />
      <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={0.7} enablePan={false} enableZoom={false} target={[0.9, 0.9, 0]} />
    </Canvas>
  );
}
