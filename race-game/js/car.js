// ============================================================
//  car.js  –  Player car: geometry, materials, lights, exhaust
// ============================================================

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene, LANE_WIDTH, LANE_COUNT } from './scene.js';

export const PLAYER_Y       = 0.42;
const PLAYER_SPEED     = 0.14;   // lateral movement per frame
export const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH]; // lane centre X coords

export let playerCar;
export let playerLane   = 1;        // 0 = left, 1 = center, 2 = right
export let playerX      = 0;
let targetX        = 0;
let tiltAngle      = 0;
let exhaust1, exhaust2;
let exhaustParticles = [];

// Build procedural car mesh
export function createPlayerCar() {
  const group = new THREE.Group();

  // ---- Body ----
  const bodyMat = new THREE.MeshStandardMaterial({
    color:     0x00d4ff,
    metalness: 0.85,
    roughness: 0.15,
    envMapIntensity: 1.2,
  });

  // Main body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 3.4), bodyMat);
  body.position.y = 0.22;
  body.castShadow = true;
  group.add(body);

  // Cabin / roof
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x0a2030, metalness: 0.6, roughness: 0.3
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.38, 1.8), roofMat);
  roof.position.set(0, 0.67, -0.15);
  roof.castShadow = true;
  group.add(roof);

  // Front bumper
  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x001a2e, metalness: 0.7, roughness: 0.3
  });
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.22, 0.18), bumperMat);
  frontBumper.position.set(0, 0.18, -1.79);
  group.add(frontBumper);

  // Rear spoiler
  const spoilerMat = new THREE.MeshStandardMaterial({
    color:     0x00f5ff,
    emissive:  new THREE.Color(0x00f5ff),
    emissiveIntensity: 0.6,
    metalness: 0.9, roughness: 0.1,
  });
  const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.4), spoilerMat);
  spoilerWing.position.set(0, 0.75, 1.5);
  group.add(spoilerWing);
  const spoilerStandL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), spoilerMat);
  spoilerStandL.position.set(-0.7, 0.57, 1.5);
  group.add(spoilerStandL);
  const spoilerStandR = spoilerStandL.clone();
  spoilerStandR.position.x = 0.7;
  group.add(spoilerStandR);

  // Neon underflow
  const neonUnder = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.04, 3.2),
    new THREE.MeshStandardMaterial({
      color: 0x00f5ff, emissive: new THREE.Color(0x00f5ff), emissiveIntensity: 1.5
    })
  );
  neonUnder.position.y = 0.02;
  group.add(neonUnder);

  // ---- Wheels ----
  buildWheels(group);

  // ---- Headlights ----
  buildHeadlights(group);

  // ---- Tail lights ----
  buildTailLights(group);

  // ---- Exhaust ----
  buildExhaust(group);

  // Position
  group.position.set(LANE_X[1], PLAYER_Y, 5);
  group.castShadow = true;
  scene.add(group);
  playerCar = group;
}

function buildWheels(group) {
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.3, roughness: 0.8 });
  const rimMat   = new THREE.MeshStandardMaterial({ color: 0x00f5ff, emissive: new THREE.Color(0x00f5ff), emissiveIntensity: 0.4, metalness: 0.9, roughness: 0.2 });

  const positions = [
    [-0.88, 0, -1.1], [0.88, 0, -1.1],
    [-0.88, 0,  1.1], [0.88, 0,  1.1],
  ];
  positions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 16), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y + 0.34, z);
    wheel.castShadow = true;
    group.add(wheel);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y + 0.34, z);
    group.add(rim);
  });
}

function buildHeadlights(group) {
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: new THREE.Color(0xd0f0ff), emissiveIntensity: 3
  });
  [-0.5, 0.5].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.06), hlMat);
    hl.position.set(x, 0.32, -1.73);
    group.add(hl);

    const spot = new THREE.SpotLight(0xd0f0ff, 3, 30, Math.PI / 8, 0.4, 1.5);
    spot.position.set(x, 0.32, -1.75);
    spot.target.position.set(x * 0.5, 0, -25);
    spot.castShadow = false;
    group.add(spot);
    group.add(spot.target);
  });
}

function buildTailLights(group) {
  const tlMat = new THREE.MeshStandardMaterial({
    color: 0xff006e, emissive: new THREE.Color(0xff006e), emissiveIntensity: 2.5
  });
  [-0.55, 0.55].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.06), tlMat);
    tl.position.set(x, 0.32, 1.73);
    group.add(tl);
  });
}

function buildExhaust(group) {
  const exMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
  [-0.35, 0.35].forEach((x, i) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), exMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(x, 0.15, 1.85);
    group.add(pipe);
    if (i === 0) exhaust1 = pipe;
    else         exhaust2 = pipe;
  });
}

// ---- Update player position ----
export function updatePlayerCar(keysDown, dt) {
  if (!playerCar) return;

  // Lane target
  targetX = LANE_X[playerLane];

  // Smooth lerp
  playerX = THREE.MathUtils.lerp(playerX, targetX, 0.12);
  playerCar.position.x = playerX;

  // Tilt when changing lanes
  const diff = targetX - playerX;
  tiltAngle  = THREE.MathUtils.lerp(tiltAngle, diff * 0.08, 0.1);
  playerCar.rotation.z = -tiltAngle;

  // Slight y-bounce (road feel)
  playerCar.position.y = PLAYER_Y + Math.sin(Date.now() * 0.008) * 0.015;

  // Exhaust smoke
  spawnExhaustParticle();
}

export function moveLeft() {
  if (playerLane > 0) playerLane--;
}
export function moveRight() {
  if (playerLane < LANE_COUNT - 1) playerLane++;
}

// Exhaust particles (simple sphere puffs)
let exhaustTimer = 0;
function spawnExhaustParticle() {
  exhaustTimer++;
  if (exhaustTimer % 3 !== 0) return;

  const mat = new THREE.MeshBasicMaterial({
    color: 0x334455,
    transparent: true,
    opacity: 0.5,
  });

  [exhaust1, exhaust2].forEach(pipe => {
    if (!pipe) return;
    const world = new THREE.Vector3();
    pipe.getWorldPosition(world);

    const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 4, 4), mat.clone());
    p.position.copy(world);
    p.userData.vel = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      0.02 + Math.random() * 0.03,
      0.15 + Math.random() * 0.1
    );
    p.userData.life = 1;
    scene.add(p);
    exhaustParticles.push(p);
  });
}

export function updateExhaust() {
  for (let i = exhaustParticles.length - 1; i >= 0; i--) {
    const p = exhaustParticles[i];
    p.position.add(p.userData.vel);
    p.userData.life -= 0.04;
    p.material.opacity = p.userData.life * 0.4;
    p.scale.setScalar(1 + (1 - p.userData.life) * 1.5);
    if (p.userData.life <= 0) {
      scene.remove(p);
      exhaustParticles.splice(i, 1);
    }
  }
}

export function getPlayerBoundingBox() {
  if (!playerCar) return null;
  const box = new THREE.Box3().setFromObject(playerCar);
  // Shrink slightly for fairness
  box.expandByScalar(-0.25);
  return box;
}

export function resetPlayer() {
  playerLane = 1;
  playerX    = 0;
  targetX    = 0;
  if (playerCar) {
    playerCar.position.set(0, PLAYER_Y, 5);
    playerCar.rotation.set(0, 0, 0);
  }
}
