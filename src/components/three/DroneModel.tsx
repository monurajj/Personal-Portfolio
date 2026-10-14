"use client";

import { useLayoutEffect, useRef, type Ref, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";

/* -------------------------------------------------------------------------- */
/*  Procedural quadcopter — built from primitives, no external assets.         */
/*  Shared by the hero backdrop and the flight simulator.                      */
/* -------------------------------------------------------------------------- */

export const DRONE_COLORS = {
  accent: "#3b55e6",
  graphite: "#1c1f26",
  steel: "#343946",
  blade: "#4a505c",
} as const;

/** Blade tip to blade tip, in drone-local units. */
export const DRONE_SPAN = 3.1;

const { accent: ACCENT, graphite: GRAPHITE, steel: STEEL, blade: BLADE } = DRONE_COLORS;

const ARMS: Array<[number, number]> = [
  [1.05, -0.78],
  [1.05, 0.78],
  [-1.05, -0.78],
  [-1.05, 0.78],
];

type RotorProps = {
  position: [number, number, number];
  dir: 1 | -1;
  reduced: boolean;
  /** Rotor speed multiplier, read every frame (1 = idle hover). */
  spinRef?: RefObject<number>;
};

function Rotor({ position, dir, reduced, spinRef }: RotorProps) {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (blades.current && !reduced) blades.current.rotation.y += dir * dt * 42 * (spinRef?.current ?? 1);
  });
  return (
    <group position={position}>
      {/* motor */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.085, 0.1, 0.17, 28]} />
        <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.06, 16]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={1.2} />
      </mesh>
      {/* blades */}
      <group ref={blades} position={[0, 0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.98, 0.01, 0.075]} />
          <meshStandardMaterial color={BLADE} metalness={0.4} roughness={0.5} transparent opacity={0.85} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.98, 0.01, 0.075]} />
          <meshStandardMaterial color={BLADE} metalness={0.4} roughness={0.5} transparent opacity={0.85} />
        </mesh>
      </group>
      {/* motion-blur disc */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 48]} />
        <meshBasicMaterial color={GRAPHITE} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* prop guard */}
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.53, 0.007, 8, 96]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

type Props = {
  reduced?: boolean;
  /** The body group — rotate this for attitude (pitch/roll/yaw). */
  bodyRef?: Ref<THREE.Group>;
  rotation?: [number, number, number];
  spinRef?: RefObject<number>;
  /** Mark every mesh as a shadow caster (for lit scenes with a ground). */
  castShadow?: boolean;
};

/** The drone's front (camera gimbal) points along local +x. */
export function DroneModel({ reduced = false, bodyRef, rotation = [0, 0, 0], spinRef, castShadow = false }: Props) {
  const root = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!castShadow || !root.current) return;
    root.current.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }, [castShadow]);

  return (
    <group ref={root}>
      <group ref={bodyRef} rotation={rotation}>
        {/* chassis */}
        <RoundedBox args={[1.05, 0.26, 0.64]} radius={0.07} smoothness={4}>
          <meshStandardMaterial color={GRAPHITE} metalness={0.75} roughness={0.35} />
        </RoundedBox>
        <RoundedBox args={[0.62, 0.12, 0.42]} radius={0.04} smoothness={3} position={[0, 0.18, 0]}>
          <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
        </RoundedBox>
        {/* status strip */}
        <mesh position={[0.2, 0.25, 0]}>
          <boxGeometry args={[0.22, 0.012, 0.012]} />
          <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={2.5} />
        </mesh>
        {/* arms */}
        {ARMS.map(([x, z], i) => {
          const len = Math.hypot(x, z);
          return (
            <mesh key={i} position={[x / 2, 0.02, z / 2]} rotation={[0, -Math.atan2(z, x), 0]}>
              <boxGeometry args={[len, 0.05, 0.08]} />
              <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.3} />
            </mesh>
          );
        })}
        {/* rotors */}
        {ARMS.map(([x, z], i) => (
          <Rotor key={i} position={[x, 0.02, z]} dir={i % 2 ? 1 : -1} reduced={reduced} spinRef={spinRef} />
        ))}
        {/* gimbal + lens */}
        <mesh position={[0.48, -0.2, 0]}>
          <sphereGeometry args={[0.11, 24, 24]} />
          <meshStandardMaterial color={GRAPHITE} metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0.58, -0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.03, 20]} />
          <meshStandardMaterial color="#0b0e14" emissive={ACCENT} emissiveIntensity={0.8} />
        </mesh>
        {/* landing skids */}
        {[-0.26, 0.26].map((z) => (
          <group key={z} position={[0, -0.33, z]}>
            <mesh>
              <boxGeometry args={[0.72, 0.025, 0.025]} />
              <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.35} />
            </mesh>
            {[-0.25, 0.25].map((x) => (
              <mesh key={x} position={[x, 0.1, 0]}>
                <boxGeometry args={[0.025, 0.2, 0.025]} />
                <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.35} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}
