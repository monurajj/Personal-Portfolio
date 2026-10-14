"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, Grid, Preload } from "@react-three/drei";
import { DroneModel, DRONE_COLORS } from "@/components/three/DroneModel";
import { clamp, damp } from "@/lib/utils";
import { GATE_COUNT, GATE_POINTS, HIT_PENALTY, HIT_POINTS, simInput, simState, timeBonus } from "./sim";

const BG = "#f2f2f0";
const GROUND = "#e6e6e3";
const ACCENT = DRONE_COLORS.accent;
const INK = "#121212";

/* ------------------------------- the courses ------------------------------ */

const START = new THREE.Vector3(0, 1.4, 0);
const ARENA = 70;
const MIN_ALT = 0.42;
const MAX_ALT = 32;

type Vec3 = [number, number, number];
type Block = { p: Vec3; s: Vec3; c: string };

type Course = {
  level: number;
  gates: Vec3[];
  /** Each gate faces the leg that arrives at it. */
  yaw: number[];
  radius: number;
  passRadius: number;
  blocks: Block[];
  curve: THREE.CatmullRomCurve3;
  dots: THREE.Vector3[];
};

/** Level 1 is hand-placed; later levels are generated from a seed, so they are the same for everyone. */
const LEVEL_ONE: Vec3[] = [
  [0, 2.6, -14],
  [8, 3.6, -26],
  [20, 4.8, -34],
  [32, 3.2, -22],
  [36, 5.4, -6],
  [26, 4.2, 8],
  [10, 3.4, 16],
  [-6, 2.4, 6],
];

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateGates(level: number, rnd: () => number): Vec3[] {
  const count = Math.min(16, GATE_COUNT + 2 * (level - 1));
  const maxTurn = Math.min(1.1, 0.45 + 0.08 * level);
  const maxHeight = Math.min(9, 2 + level * 1.1);
  const out: Vec3[] = [];
  let x = 0;
  let z = 0;
  let heading = 0; // 0 faces −z, like the drone
  for (let i = 0; i < count; i++) {
    heading += (rnd() * 2 - 1) * maxTurn;
    // Drifting toward the fence: bend the heading back toward the centre.
    if (Math.hypot(x, z) > 42) {
      const fx = -Math.sin(heading) * 0.35 + (-x / Math.hypot(x, z)) * 0.65;
      const fz = -Math.cos(heading) * 0.35 + (-z / Math.hypot(x, z)) * 0.65;
      heading = Math.atan2(-fx, -fz);
    }
    const step = 12 + rnd() * 5;
    x += -Math.sin(heading) * step;
    z += -Math.cos(heading) * step;
    out.push([Math.round(x * 10) / 10, Math.round((2.2 + rnd() * maxHeight) * 10) / 10, Math.round(z * 10) / 10]);
  }
  return out;
}

function generateBlocks(level: number, gates: Vec3[], rnd: () => number): Block[] {
  const want = Math.min(120, 64 + 10 * (level - 1));
  const out: Block[] = [];
  const tooClose = (x: number, z: number) =>
    Math.hypot(x - START.x, z - START.z) < 8 || gates.some(([gx, , gz]) => Math.hypot(x - gx, z - gz) < 6);
  let guard = 0;
  while (out.length < want && guard++ < 4000) {
    const x = (rnd() * 2 - 1) * 64;
    const z = (rnd() * 2 - 1) * 64;
    if (tooClose(x, z)) continue;
    const w = 1.5 + rnd() * 4;
    const d = 1.5 + rnd() * 4;
    const h = 1 + rnd() * rnd() * (11 + level);
    const r = rnd();
    const c = r < 0.1 ? "#1c1f26" : r < 0.18 ? ACCENT : r < 0.6 ? "#ffffff" : "#ebebe8";
    out.push({ p: [x, h / 2, z], s: [w, h, d], c });
  }
  return out;
}

const courses = new Map<number, Course>();

function getCourse(level: number): Course {
  const cached = courses.get(level);
  if (cached) return cached;
  const rnd = createRng(1337 + level * 7919);
  const gates = level <= 1 ? LEVEL_ONE : generateGates(level, rnd);
  const radius = Math.max(1.3, 1.9 - 0.12 * (level - 1));
  const yaw = gates.map(([x, , z], i) => {
    const [px, , pz] = i === 0 ? [START.x, 0, START.z] : gates[i - 1];
    return Math.atan2(x - px, z - pz);
  });
  const curve = new THREE.CatmullRomCurve3(
    [START.clone(), ...gates.map(([x, y, z]) => new THREE.Vector3(x, y, z))],
    false,
    "centripetal",
    0.6,
  );
  const course: Course = {
    level,
    gates,
    yaw,
    radius,
    passRadius: radius * 0.82,
    blocks: generateBlocks(level, gates, createRng(4242 + level * 101)),
    curve,
    dots: curve.getSpacedPoints(12 * gates.length),
  };
  courses.set(level, course);
  return course;
}

/** The part of the course between two control points, as its own curve (for the "next leg" highlight). */
function courseLeg(course: Course, from: number, to: number) {
  const stops = course.gates.length + 1;
  const t0 = from / (stops - 1);
  const t1 = to / (stops - 1);
  const pts: THREE.Vector3[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) pts.push(course.curve.getPoint(t0 + ((t1 - t0) * i) / n));
  return new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.5);
}

/* --------------------------------- flight --------------------------------- */

/** Collision radius of the drone, roughly the prop guards at the sim scale. */
const HULL = 0.72;
/** Tighter radius against the thin gate rings, so a slightly off-centre pass still fits. */
const RING_HULL = 0.5;
const RING_TUBE = 0.07;
const POLE_RADIUS = 0.035;
const PARTICLES = 14;

const ACCEL = 15;
const DRAG = 1.5;
const MAX_SPEED = 17;
const LIFT_ACCEL = 11;
const LIFT_DRAG = 3.2;
const MAX_LIFT = 6.5;
const YAW_RATE = 2.1;

type Flight = {
  course: Course;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  fwd: THREE.Vector3;
  right: THREE.Vector3;
  tmp: THREE.Vector3;
  camTarget: THREE.Vector3;
  gate: number;
  score: number;
  bonus: number;
  time: number;
  started: boolean;
  finished: boolean;
  resetSeen: number;
  /** Camera shake energy, 0..1, decays after an impact. */
  shake: number;
  hitCooldown: number;
  hits: number;
  /** Debris particles: velocity triples and remaining life (0 = idle). */
  pvel: Float32Array;
  plife: Float32Array;
};

function Drone({ course, onGate }: { course: Course; onGate: (i: number) => void }) {
  const rig = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const burst = useRef<THREE.Group>(null);
  const spin = useRef(1);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  const f = useRef<Flight | null>(null);

  useFrame(({ camera }, rawDt) => {
    const g = rig.current;
    const b = body.current;
    if (!g || !b) return;
    const dt = Math.min(rawDt, 1 / 30);

    if (!f.current) {
      f.current = {
        course,
        pos: START.clone(),
        vel: new THREE.Vector3(),
        yaw: 0,
        fwd: new THREE.Vector3(),
        right: new THREE.Vector3(),
        tmp: new THREE.Vector3(),
        camTarget: new THREE.Vector3(),
        gate: 0,
        score: 0,
        bonus: 0,
        time: 0,
        started: false,
        finished: false,
        resetSeen: simInput.reset,
        shake: 0,
        hitCooldown: 0,
        hits: 0,
        pvel: new Float32Array(PARTICLES * 3),
        plife: new Float32Array(PARTICLES),
      };
      // Place the drone and camera at once, so a paused first frame (help modal) already looks right.
      g.position.copy(START);
      camera.position.set(START.x, START.y + 2.8, START.z + 7);
      camera.lookAt(START.x, START.y + 0.4, START.z);
    }
    const s = f.current;

    // --- Reset: asked for by the UI, or because the level (course) changed.
    if (simInput.reset !== s.resetSeen || s.course !== course) {
      s.resetSeen = simInput.reset;
      s.course = course;
      s.pos.copy(START);
      s.vel.set(0, 0, 0);
      s.yaw = 0;
      s.gate = 0;
      s.score = 0;
      s.bonus = 0;
      s.time = 0;
      s.started = false;
      s.finished = false;
      s.shake = 0;
      s.hits = 0;
      simState.hits = 0;
      camera.position.set(START.x, START.y + 2.8, START.z + 7);
      onGate(0);
    }

    // Paused (help or pilot modal open): keep drawing the last frame, advance nothing.
    if (simInput.paused) return;

    const { fwd, strafe, lift, yaw } = simInput;
    const anyInput = fwd !== 0 || strafe !== 0 || lift !== 0 || yaw !== 0;
    if (anyInput && !s.started) s.started = true;
    if (s.started && !s.finished) s.time += dt;

    // --- Heading. yaw = 0 faces −z.
    s.yaw -= yaw * YAW_RATE * dt;
    s.fwd.set(-Math.sin(s.yaw), 0, -Math.cos(s.yaw));
    s.right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw));

    // --- Horizontal: thrust along the body axes, drag, speed cap.
    s.tmp.copy(s.fwd).multiplyScalar(fwd).addScaledVector(s.right, strafe);
    if (s.tmp.lengthSq() > 1) s.tmp.normalize();
    s.vel.addScaledVector(s.tmp, ACCEL * dt);
    const hDrag = Math.exp(-DRAG * dt);
    s.vel.x *= hDrag;
    s.vel.z *= hDrag;
    const hSpeed = Math.hypot(s.vel.x, s.vel.z);
    if (hSpeed > MAX_SPEED) {
      s.vel.x *= MAX_SPEED / hSpeed;
      s.vel.z *= MAX_SPEED / hSpeed;
    }

    // --- Vertical.
    s.vel.y += lift * LIFT_ACCEL * dt;
    s.vel.y *= Math.exp(-LIFT_DRAG * dt);
    s.vel.y = clamp(s.vel.y, -MAX_LIFT, MAX_LIFT);

    // --- Integrate. The ground and ceiling are soft limits; everything else is a real contact.
    s.pos.addScaledVector(s.vel, dt);
    if (s.pos.y < MIN_ALT) {
      s.pos.y = MIN_ALT;
      if (s.vel.y < 0) s.vel.y = 0;
    } else if (s.pos.y > MAX_ALT) {
      s.pos.y = MAX_ALT;
      if (s.vel.y > 0) s.vel.y = 0;
    }

    s.hitCooldown = Math.max(0, s.hitCooldown - dt);

    /**
     * Resolve one contact: push out along the unit normal by `push`, bounce, and on a
     * hard enough impact fire the effects. `reach` is the hull radius used, so the
     * contact point sits that far back along the normal.
     */
    const collide = (nx: number, ny: number, nz: number, push: number, reach: number) => {
      s.pos.x += nx * push;
      s.pos.y += ny * push;
      s.pos.z += nz * push;
      const vn = s.vel.x * nx + s.vel.y * ny + s.vel.z * nz;
      if (vn >= 0) return;
      // Reflect the normal component with some restitution, scrub the rest.
      s.vel.x -= nx * vn * 1.45;
      s.vel.y -= ny * vn * 1.45;
      s.vel.z -= nz * vn * 1.45;
      s.vel.multiplyScalar(0.82);
      const impact = -vn;
      if (impact <= 1.2 || s.hitCooldown > 0) return;
      s.hitCooldown = 0.25;
      s.hits += 1;
      // Every collision costs time on the clock and points (only while a run is live).
      if (s.started && !s.finished) {
        s.time += HIT_PENALTY;
        s.score -= HIT_POINTS;
      }
      s.shake = Math.min(1, s.shake + impact / 9);
      spin.current = 0.25;
      // Jolt the body.
      b.rotation.x += (Math.random() - 0.5) * 0.6 * Math.min(1, impact / 6);
      b.rotation.z += (Math.random() - 0.5) * 0.6 * Math.min(1, impact / 6);
      // Debris burst at the contact point, thrown back along the normal.
      const g2 = burst.current;
      if (g2) {
        const cx = s.pos.x - nx * reach;
        const cy = s.pos.y - ny * reach;
        const cz = s.pos.z - nz * reach;
        for (let i = 0; i < PARTICLES; i++) {
          const m = g2.children[i];
          if (!m) continue;
          m.position.set(cx, cy, cz);
          const k = 1.5 + Math.random() * 3 + impact * 0.25;
          s.pvel[i * 3] = nx * k + (Math.random() - 0.5) * 4;
          s.pvel[i * 3 + 1] = ny * k + Math.random() * 3;
          s.pvel[i * 3 + 2] = nz * k + (Math.random() - 0.5) * 4;
          s.plife[i] = 0.7 + Math.random() * 0.5;
        }
      }
      simState.hits = s.hits;
      simState.hitAt = performance.now();
    };

    // --- Arena wall: a circular fence; hitting it is a crash like anything else.
    const rad = Math.hypot(s.pos.x, s.pos.z);
    if (rad > ARENA - HULL) {
      collide(-s.pos.x / rad, 0, -s.pos.z / rad, rad - (ARENA - HULL), HULL);
    }

    // --- Gate rings (sphere-vs-torus) and their poles (sphere-vs-vertical segment).
    const { gates, yaw: gateYaw, radius: GATE_RADIUS } = course;
    for (let i = 0; i < gates.length; i++) {
      const [gx, gy, gz] = gates[i];
      const px = s.pos.x - gx;
      const py = s.pos.y - gy;
      const pz = s.pos.z - gz;
      // Pole: from the ground up to the bottom of the ring.
      if (s.pos.y < gy - GATE_RADIUS) {
        const hd = Math.hypot(px, pz) || 1e-6;
        const reach = HULL * 0.8 + POLE_RADIUS;
        if (hd < reach) collide(px / hd, 0, pz / hd, reach - hd, reach);
        continue;
      }
      if (px * px + py * py + pz * pz > (GATE_RADIUS + 1.5) ** 2) continue;
      // Into the ring's frame: the torus lies in local XY, rotated about Y by its yaw.
      const c = Math.cos(gateYaw[i]);
      const sn = Math.sin(gateYaw[i]);
      const lx = px * c - pz * sn;
      const ly = py;
      const lz = px * sn + pz * c;
      const rr = Math.hypot(lx, ly) || 1e-6;
      const qx = rr - GATE_RADIUS; // radial distance from the ring's centreline
      const d = Math.hypot(qx, lz); // distance to the ring's centreline
      const reach = RING_HULL + RING_TUBE;
      if (d >= reach) continue;
      const ux = lx / rr;
      const uy = ly / rr;
      let nlx: number;
      let nly: number;
      let nlz: number;
      if (d < 1e-4) {
        nlx = ux;
        nly = uy;
        nlz = 0;
      } else {
        nlx = (qx / d) * ux;
        nly = (qx / d) * uy;
        nlz = lz / d;
      }
      // Back to world.
      collide(nlx * c + nlz * sn, nly, -nlx * sn + nlz * c, reach - d, reach);
    }

    // --- Blocks are solid: sphere-vs-box, push out along the contact normal and bounce.
    for (const blk of course.blocks) {
      const hx = blk.s[0] / 2;
      const hy = blk.s[1] / 2;
      const hz = blk.s[2] / 2;
      const px = s.pos.x - blk.p[0];
      const py = s.pos.y - blk.p[1];
      const pz = s.pos.z - blk.p[2];
      if (Math.abs(px) > hx + HULL || Math.abs(py) > hy + HULL || Math.abs(pz) > hz + HULL) continue;
      let nx = px - clamp(px, -hx, hx);
      let ny = py - clamp(py, -hy, hy);
      let nz = pz - clamp(pz, -hz, hz);
      let dist = Math.hypot(nx, ny, nz);
      if (dist >= HULL) continue;
      if (dist < 1e-4) {
        // Centre is inside the box (fast frame): leave through the nearest face.
        const ox = hx - Math.abs(px);
        const oy = hy - Math.abs(py);
        const oz = hz - Math.abs(pz);
        if (ox <= oy && ox <= oz) {
          nx = Math.sign(px) || 1;
          ny = nz = 0;
          dist = -ox;
        } else if (oy <= oz) {
          ny = Math.sign(py) || 1;
          nx = nz = 0;
          dist = -oy;
        } else {
          nz = Math.sign(pz) || 1;
          nx = ny = 0;
          dist = -oz;
        }
      } else {
        nx /= dist;
        ny /= dist;
        nz /= dist;
      }
      collide(nx, ny, nz, HULL - dist, HULL);
    }

    // --- Debris particles.
    const g2 = burst.current;
    if (g2) {
      for (let i = 0; i < PARTICLES; i++) {
        const m = g2.children[i];
        if (!m) continue;
        const life = s.plife[i];
        if (life <= 0) {
          m.visible = false;
          continue;
        }
        s.plife[i] = life - dt * 1.6;
        s.pvel[i * 3 + 1] -= 9.8 * dt;
        m.position.x += s.pvel[i * 3] * dt;
        m.position.y = Math.max(0.03, m.position.y + s.pvel[i * 3 + 1] * dt);
        m.position.z += s.pvel[i * 3 + 2] * dt;
        m.rotation.x += dt * 6;
        m.rotation.y += dt * 4;
        m.scale.setScalar(0.05 + 0.1 * Math.min(1, life));
        m.visible = true;
      }
    }

    // --- Gates, in order: each one scores; the last one ends the level with a time bonus.
    if (!s.finished && s.gate < gates.length) {
      const [gx, gy, gz] = gates[s.gate];
      if (s.pos.distanceTo(s.tmp.set(gx, gy, gz)) < course.passRadius) {
        s.gate += 1;
        s.score += GATE_POINTS;
        simState.gateAt = performance.now();
        onGate(s.gate);
        if (s.gate === gates.length) {
          s.finished = true;
          s.bonus = timeBonus(s.time);
          s.score += s.bonus;
        }
      }
    }

    // --- Pose. The model's nose is +x, so turn it to face −z, then tilt into the motion.
    g.position.copy(s.pos);
    g.rotation.y = s.yaw;
    const vF = s.vel.dot(s.fwd);
    const vR = s.vel.dot(s.right);
    const pitch = -clamp(vF * 0.034, -0.5, 0.5);
    const roll = clamp(vR * 0.034, -0.5, 0.5) + yaw * 0.12;
    b.rotation.z = damp(b.rotation.z, pitch, 6, dt);
    b.rotation.x = damp(b.rotation.x, roll, 6, dt);
    spin.current = damp(spin.current, 1 + Math.max(0, lift) * 0.8 + hSpeed * 0.03, 6, dt);

    // --- Chase camera.
    s.camTarget.copy(s.pos).addScaledVector(s.fwd, -7).add(s.tmp.set(0, 2.6, 0));
    camera.position.x = damp(camera.position.x, s.camTarget.x, 3.2, dt);
    camera.position.y = damp(camera.position.y, s.camTarget.y, 3.2, dt);
    camera.position.z = damp(camera.position.z, s.camTarget.z, 3.2, dt);
    // Impact shake: a quick jitter that dies out.
    s.shake = damp(s.shake, 0, 7, dt);
    if (s.shake > 0.005) {
      camera.position.x += (Math.random() - 0.5) * s.shake * 0.35;
      camera.position.y += (Math.random() - 0.5) * s.shake * 0.25;
      camera.position.z += (Math.random() - 0.5) * s.shake * 0.35;
    }
    camera.lookAt(s.pos.x, s.pos.y + 0.4, s.pos.z);

    // --- Shadow light tracks the drone so the shadow map stays sharp.
    if (light.current) {
      light.current.position.set(s.pos.x - 6, s.pos.y + 14, s.pos.z + 5);
      lightTarget.position.copy(s.pos);
      lightTarget.updateMatrixWorld();
    }

    simState.speed = hSpeed;
    simState.alt = s.pos.y - MIN_ALT;
    simState.time = s.time;
    simState.started = s.started;
    simState.finished = s.finished;
    simState.gate = s.gate;
    simState.gates = gates.length;
    simState.level = course.level;
    simState.score = s.score;
    simState.bonus = s.bonus;
  });

  return (
    <>
      <directionalLight
        ref={light}
        castShadow
        intensity={2.4}
        position={[-6, 14, 5]}
        target={lightTarget}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <primitive object={lightTarget} />
      <group ref={rig}>
        <group rotation={[0, Math.PI / 2, 0]} scale={0.55}>
          <DroneModel bodyRef={body} spinRef={spin} castShadow />
        </group>
      </group>
      {/* Debris thrown on impact (reused, hidden while idle). */}
      <group ref={burst}>
        {Array.from({ length: PARTICLES }, (_, i) => (
          <mesh key={i} visible={false}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={i % 3 === 0 ? ACCENT : "#2a2d35"} roughness={0.6} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/* ---------------------------------- world --------------------------------- */

function Gates({ course, cleared }: { course: Course; cleared: number }) {
  const R = course.radius;
  return (
    <group>
      {course.gates.map(([x, y, z], i) => {
        const done = i < cleared;
        const next = i === cleared;
        return (
          <group key={i} position={[x, y, z]} rotation={[0, course.yaw[i], 0]}>
            <mesh castShadow>
              <torusGeometry args={[R, RING_TUBE, 12, 72]} />
              <meshStandardMaterial
                color={done ? "#bdbdb9" : next ? ACCENT : INK}
                emissive={next ? ACCENT : "#000000"}
                emissiveIntensity={next ? 0.6 : 0}
                metalness={0.3}
                roughness={0.5}
              />
            </mesh>
            {/* pole to the ground */}
            <mesh position={[0, -y / 2 - R / 2, 0]}>
              <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS, Math.max(0.1, y - R), 8]} />
              <meshStandardMaterial color={done ? "#cfcfcb" : "#8a8a86"} />
            </mesh>
            {/* footprint */}
            <mesh position={[0, -y + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.6, 0.72, 48]} />
              <meshBasicMaterial color={done ? "#cfcfcb" : next ? ACCENT : "#9a9a96"} transparent opacity={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Low-opacity flight path: the whole course faintly, the leg to the next gate a little stronger. */
function GuidePath({ course, cleared }: { course: Course; cleared: number }) {
  const full = useMemo(() => new THREE.TubeGeometry(course.curve, 40 * course.gates.length, 0.06, 8, false), [course]);
  const leg = useMemo(
    () => (cleared < course.gates.length ? new THREE.TubeGeometry(courseLeg(course, cleared, cleared + 1), 48, 0.09, 8, false) : null),
    [course, cleared],
  );
  return (
    <group>
      <mesh geometry={full} renderOrder={1}>
        <meshBasicMaterial color={ACCENT} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {leg && (
        <mesh geometry={leg} renderOrder={2}>
          <meshBasicMaterial color={ACCENT} transparent opacity={0.32} depthWrite={false} />
        </mesh>
      )}
      {/* dotted footprint on the ground so the route reads from above too */}
      {course.dots.map((p, i) => (
        <mesh key={i} position={[p.x, 0.015, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12, 12]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Blocks({ course }: { course: Course }) {
  return (
    <group>
      {course.blocks.map((b, i) => (
        <mesh key={i} position={b.p} castShadow receiveShadow>
          <boxGeometry args={b.s} />
          <meshStandardMaterial color={b.c} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={GROUND} roughness={1} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[400, 400]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#d2d2ce"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#b9b9b5"
        fadeDistance={110}
        fadeStrength={1.2}
        infiniteGrid
      />
      {/* arena edge: a line on the ground and a faint fence so the wall is visible before you hit it */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ARENA - 0.15, ARENA, 128]} />
        <meshBasicMaterial color={INK} transparent opacity={0.25} />
      </mesh>
      <mesh position={[0, MAX_ALT / 2 + 1, 0]}>
        <cylinderGeometry args={[ARENA, ARENA, MAX_ALT + 2, 160, 1, true]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* a few vertical ticks on the fence, every 15° */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * ARENA, 2, Math.sin(a) * ARENA]}>
            <boxGeometry args={[0.08, 4, 0.08]} />
            <meshBasicMaterial color={ACCENT} transparent opacity={0.35} />
          </mesh>
        );
      })}
    </>
  );
}

/* ---------------------------------- scene --------------------------------- */

export function FlyScene({ level, onGate }: { level: number; onGate: (i: number) => void }) {
  const course = useMemo(() => getCourse(Math.max(1, Math.floor(level))), [level]);
  const clearedRef = useRef(0);
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 4.2, 7], fov: 52, near: 0.1, far: 220 }}
      gl={{ antialias: true, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => gl.setClearColor(BG, 1)}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 35, 130]} />
      <hemisphereLight args={["#ffffff", "#c9c9c4", 1.0]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[0, 20, 0]} intensity={60} distance={80} decay={2} color="#ffffff" />

      <Ground />
      <Blocks course={course} />
      <CourseWithState course={course} clearedRef={clearedRef} />
      <Drone
        course={course}
        onGate={(i) => {
          clearedRef.current = i;
          onGate(i);
        }}
      />

      <AdaptiveDpr pixelated />
      <Preload all />
    </Canvas>
  );
}

/** Gates and the guide path re-render only when the cleared count changes (a few times per run). */
function CourseWithState({ course, clearedRef }: { course: Course; clearedRef: RefObject<number> }) {
  const [cleared, setCleared] = useState(0);
  useFrame(() => {
    if (clearedRef.current !== cleared) setCleared(clearedRef.current);
  });
  return (
    <>
      <Gates course={course} cleared={cleared} />
      <GuidePath course={course} cleared={cleared} />
    </>
  );
}
