"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Float, Lightformer, Preload } from "@react-three/drei";
import { anchorStore, pointerStore, scrollStore } from "@/lib/stores";
import { useFinePointer } from "@/lib/hooks";
import { clamp, damp } from "@/lib/utils";
import { DroneModel, DRONE_COLORS, DRONE_SPAN } from "./DroneModel";

const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const ACCENT = DRONE_COLORS.accent;

/* -------------------------------------------------------------------------- */
/*  Hero drone: parks above the "o" of "hello", then chases the cursor         */
/* -------------------------------------------------------------------------- */

function Drone({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const { viewport, camera, size } = useThree();
  const isNarrow = viewport.width < 7;
  const finePointer = useFinePointer();
  const materials = useRef<THREE.Material[]>([]);

  // Scratch objects for screen → world projection onto the z = 0 plane (mutated per frame).
  const scratchRef = useRef<{
    ray: THREE.Raycaster;
    plane: THREE.Plane;
    ndc: THREE.Vector2;
    hit: THREE.Vector3;
    anchor: THREE.Vector3;
    cursor: THREE.Vector3;
    prev: THREE.Vector3;
    vel: THREE.Vector3;
  } | null>(null);

  useFrame((state, dt) => {
    const g = group.current;
    const b = body.current;
    if (!g || !b) return;
    if (!scratchRef.current) {
      scratchRef.current = {
        ray: new THREE.Raycaster(),
        plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
        ndc: new THREE.Vector2(),
        hit: new THREE.Vector3(),
        anchor: new THREE.Vector3(0, 2.75, 0),
        cursor: new THREE.Vector3(0, 2.75, 0),
        prev: new THREE.Vector3(),
        vel: new THREE.Vector3(),
      };
    }
    const scratch = scratchRef.current;
    /** Client px → world position on the drone's plane. Returns false if the ray misses. */
    const toWorld = (cx: number, cy: number, out: THREE.Vector3) => {
      scratch.ndc.set((cx / size.width) * 2 - 1, -(cy / size.height) * 2 + 1);
      scratch.ray.setFromCamera(scratch.ndc, camera);
      return scratch.ray.ray.intersectPlane(scratch.plane, out) !== null;
    };
    const t = state.clock.elapsedTime;
    const sy = scrollStore.y / scrollStore.vh;
    const h = clamp(sy, 0, 1);

    // World units per CSS pixel on the z = 0 plane.
    const unitPerPx = viewport.width / size.width;

    // --- Rest pose: parked just above the "o" of "hello", sized relative to it.
    let restScale = isNarrow ? 0.3 : 0.42;
    if (anchorStore.ready && toWorld(anchorStore.x, anchorStore.top - scrollStore.y, scratch.hit)) {
      restScale = clamp((anchorStore.width * 1.25 * unitPerPx) / DRONE_SPAN, 0.1, 0.42);
      // Lift so the skids clear the top of the letter.
      scratch.anchor.set(scratch.hit.x, scratch.hit.y + restScale * 0.5 + 0.12, 0);
    }

    // --- Flight: once scrolling starts, shrink and chase the cursor.
    const flight = smoothstep(0.02, 0.3, sy);
    const shrink = 1 - 0.55 * smoothstep(0, 0.7, sy);
    const ts = restScale * shrink;

    let tx: number;
    let ty: number;
    if (finePointer) {
      if (toWorld(pointerStore.cx, pointerStore.cy, scratch.hit)) {
        // Hover a little above the pointer so the custom cursor stays readable.
        scratch.cursor.set(scratch.hit.x, scratch.hit.y + ts * 0.9 + 0.1, 0);
      }
      tx = scratch.anchor.x + (scratch.cursor.x - scratch.anchor.x) * flight;
      ty = scratch.anchor.y + (scratch.cursor.y - scratch.anchor.y) * flight;
    } else {
      // No cursor to chase (touch): climb off the top as the hero scrolls away.
      tx = scratch.anchor.x;
      ty = scratch.anchor.y + h * 3.4;
    }

    const lambda = 2.4 + (1 - flight) * 2;
    scratch.prev.copy(g.position);
    g.position.x = damp(g.position.x, tx, lambda, dt);
    g.position.y = damp(g.position.y, ty, lambda, dt);
    g.scale.setScalar(damp(g.scale.x, ts, 4, dt));

    // Velocity (world units/s), smoothed — drives the bank/pitch while flying.
    if (dt > 0) {
      scratch.vel.x = damp(scratch.vel.x, (g.position.x - scratch.prev.x) / dt, 8, dt);
      scratch.vel.y = damp(scratch.vel.y, (g.position.y - scratch.prev.y) / dt, 8, dt);
    }
    const vx = clamp(scratch.vel.x, -3, 3);
    const vy = clamp(scratch.vel.y, -3, 3);

    // Attitude: at rest, lean toward the pointer like a real quad; in flight, bank into the motion.
    const px = pointerStore.active ? pointerStore.x : 0;
    const py = pointerStore.active ? pointerStore.y : 0;
    const yawIdle = reduced ? 0 : Math.sin(t * 0.35) * 0.12;
    const roll = -px * 0.28 * (1 - flight) - vx * 0.22;
    const pitch = py * 0.22 * (1 - flight) + (finePointer ? -vy * 0.14 - Math.abs(vx) * 0.08 : -h * 0.6);
    const yaw = px * 0.35 + yawIdle - 0.35 + vx * 0.12;
    b.rotation.z = damp(b.rotation.z, clamp(roll, -0.6, 0.6), 4, dt);
    b.rotation.x = damp(b.rotation.x, clamp(pitch, -0.6, 0.6), 4, dt);
    b.rotation.y = damp(b.rotation.y, yaw, 2.5, dt);

    // Fade only when it has nothing to chase (touch devices flying off the top).
    const fade = finePointer ? 0 : clamp((sy - 0.2) / 0.9, 0, 1);

    if (materials.current.length === 0) {
      g.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (m) {
          m.transparent = true;
          m.userData.baseOpacity = m.opacity;
          materials.current.push(m);
        }
      });
    }
    const target = (1 - fade * 0.95) * (isNarrow ? 0.85 : 1);
    for (const m of materials.current) {
      m.opacity = damp(m.opacity, (m.userData.baseOpacity as number) * target, 5, dt);
    }
  });

  return (
    <group ref={group} scale={0.001}>
      <Float speed={reduced ? 0 : 1.6} rotationIntensity={0.08} floatIntensity={0.5}>
        <DroneModel reduced={reduced} bodyRef={body} rotation={[0.1, -0.35, 0]} />
      </Float>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Fine dust field with scroll parallax                                        */
/* -------------------------------------------------------------------------- */

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aSeed;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec3 p = position;
    float phase = aSeed * 6.28318;
    p.x += cos(uTime * 0.2 + phase) * 0.2;
    p.y += sin(uTime * 0.3 + phase) * 0.25;
    p.y = mod(p.y + uScroll * (0.8 + aSeed * 1.4) + 13.0, 26.0) - 13.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = -mv.z;
    gl_PointSize = aSize * uPixelRatio * (22.0 / max(depth, 0.1));
    vAlpha = smoothstep(28.0, 5.0, depth) * (0.25 + 0.75 * aSeed);
    vSeed = aSeed;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.1, d);
    vec3 c = mix(uColorA, uColorB, step(0.85, vSeed));
    gl_FragColor = vec4(c, a * vAlpha * 0.35);
  }
`;

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Dust({ count, reduced }: { count: number; reduced: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const { positions, sizes, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const rnd = createRng(4242);
    for (let i = 0; i < count; i++) {
      const r = 4 + rnd() * 12;
      const theta = rnd() * Math.PI * 2;
      const phi = Math.acos(2 * rnd() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 4;
      sizes[i] = 0.5 + rnd() * 1.4;
      seeds[i] = rnd();
    }
    return { positions, sizes, seeds };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color("#3a3d45") },
      uColorB: { value: new THREE.Color(ACCENT) },
    }),
    [],
  );

  useFrame((state, dt) => {
    const u = material.current?.uniforms;
    if (u) {
      if (!reduced) u.uTime.value += dt;
      u.uScroll.value = scrollStore.y / scrollStore.vh;
      u.uPixelRatio.value = state.gl.getPixelRatio();
    }
    if (ref.current && !reduced) ref.current.rotation.y = state.clock.elapsedTime * 0.01;
  });

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */

export function Scene({ reduced }: { reduced: boolean }) {
  const count = typeof window !== "undefined" && window.innerWidth < 768 ? 220 : 480;

  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 4.2, 7], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      frameloop={reduced ? "demand" : "always"}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(0x000000, 0);
        camera.lookAt(0, 0.9, 0);
      }}
      // R3F sets pointer-events: auto on its container; this layer must never block clicks.
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <hemisphereLight args={["#ffffff", "#9a9a95", 1.1]} />
      <directionalLight position={[-3, 6, 4]} intensity={2.6} />
      <pointLight position={[1, 3, 6]} intensity={24} color="#ffffff" />
      <pointLight position={[5, 2, -3]} intensity={18} color={ACCENT} />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, -5]} scale={[10, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.5} position={[-6, 1, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 2, 1]} color="#dfe6ff" />
        <Lightformer form="ring" intensity={2} position={[5, 2, 3]} scale={3} color={ACCENT} />
      </Environment>

      <Drone reduced={reduced} />
      <Dust count={count} reduced={reduced} />

      <AdaptiveDpr pixelated />
      <Preload all />
    </Canvas>
  );
}
