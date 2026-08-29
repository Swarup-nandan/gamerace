// ============================================================
//  obstacles.js  –  Enemy cars: object pool, spawning, movement,
//                   collision detection
// ============================================================

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { scene, LANE_WIDTH, LANE_COUNT } from './scene.js';
import { getPlayerBoundingBox }          from './car.js';

const SPAWN_Z    = -70;
const DESPAWN_Z  =  20;
const POOL_SIZE  =  12;
const LANE_X     = [-LANE_WIDTH, 0, LANE_WIDTH];

// Enemy colour palette (neon variants)
const ENEMY_COLORS = [
  { body: 0xff3355, neon: 0xff0044 },
  { body: 0xffaa00, neon: 0xff8800 },
  { body: 0xaa00ff, neon: 0x8800cc },
  { body: 0x00ff88, neon: 0x00cc66 },
  { body: 0xffffff, neon: 0xaaccff },
];

let pool      = [];     // all enemy meshes
let active    = [];     // currently on-road enemies
let spawnTimer = 0;

export function initObstacles() {
  for (let i = 0; i < POOL_SIZE; i++) {
    const car = buildEnemyCar();
    car.visible = false;
    scene.add(car);
    pool.push(car);
  }
}

function buildEnemyCar() {
  const group  = new THREE.Group();
  const scheme = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];

  const bodyMat = new THREE.MeshStandardMaterial({
    color:     scheme.body,
    metalness: 0.75,
    roughness: 0.2,
  });

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.44, 3.2), bodyMat);
  body.position.y = 0.22;
  body.castShadow = true;
  group.add(body);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.35, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.4 })
  );
  roof.position.set(0, 0.63, 0);
  roof.castShadow = true;
  group.add(roof);

  // Neon underflow
  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.04, 3.0),
    new THREE.MeshStandardMaterial({
      color: scheme.neon, emissive: new THREE.Color(scheme.neon), emissiveIntensity: 1.8
    })
  );
  neon.position.y = 0.02;
  group.add(neon);

  // Spoiler
  const spoilerMat = new THREE.MeshStandardMaterial({
    color: scheme.neon, emissive: new THREE.Color(scheme.neon), emissiveIntensity: 0.7,
    metalness: 0.9, roughness: 0.1,
  });
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.35), spoilerMat);
  spoiler.position.set(0, 0.72, -1.4);
  group.add(spoiler);

  // Tail lights
  const tlMat = new THREE.MeshStandardMaterial({
    color: 0xff4400, emissive: new THREE.Color(0xff2200), emissiveIntensity: 2.5
  });
  [-0.55, 0.55].forEach(x => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.05), tlMat);
    tl.position.set(x, 0.3, 1.63);
    group.add(tl);
  });

  // Headlights (face forward toward player)
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, emissive: new THREE.Color(0xffffd0), emissiveIntensity: 3
  });
  [-0.5, 0.5].forEach(x => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.05), hlMat);
    hl.position.set(x, 0.3, -1.63);
    group.add(hl);
  });

  // Wheels
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3, roughness: 0.8 });
  [[-0.85, -1.0], [0.85, -1.0], [-0.85, 1.0], [0.85, 1.0]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 12), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.33, z);
    w.castShadow = true;
    group.add(w);
  });

  // Store colour scheme for reuse
  group.userData.scheme = scheme;
  group.userData.lane   = 1;
  group.userData.speed  = 0;
  return group;
}

// Spawn interval decreases as score increases
function getSpawnInterval(score) {
  return Math.max(40, 110 - Math.floor(score / 500) * 8);
}

// Enemy relative speed (how much faster/slower than player)
function getEnemySpeed(score) {
  const base = 0.06 + Math.floor(score / 1000) * 0.015;
  return base + Math.random() * 0.04;
}

export function updateObstacles(roadSpeed, score) {
  spawnTimer++;

  if (spawnTimer >= getSpawnInterval(score)) {
    spawnTimer = 0;
    spawnEnemy(score);
  }

  // Move + despawn
  for (let i = active.length - 1; i >= 0; i--) {
    const e = active[i];
    e.position.z += roadSpeed + e.userData.speed;

    // Subtle weave
    if (e.userData.weave) {
      e.position.x += Math.sin(Date.now() * 0.002 + e.userData.weaveOffset) * 0.005;
    }

    if (e.position.z > DESPAWN_Z) {
      e.visible = false;
      active.splice(i, 1);
      pool.push(e);
    }
  }
}

function spawnEnemy(score) {
  if (pool.length === 0) return;

  const car  = pool.pop();
  const lane = Math.floor(Math.random() * LANE_COUNT);
  const spd  = getEnemySpeed(score);

  // Randomise colour scheme
  const scheme     = ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)];
  car.userData.scheme     = scheme;
  car.userData.lane       = lane;
  car.userData.speed      = spd;
  car.userData.weave      = Math.random() > 0.7;
  car.userData.weaveOffset = Math.random() * Math.PI * 2;

  car.position.set(LANE_X[lane], 0.42, SPAWN_Z);
  car.rotation.y = Math.PI; // facing toward player
  car.visible    = true;

  active.push(car);
}

export function checkCollisions() {
  const playerBox = getPlayerBoundingBox();
  if (!playerBox) return false;

  for (const e of active) {
    if (!e.visible) continue;
    // Only check when close
    if (Math.abs(e.position.z - 5) > 6) continue;

    const eBox = new THREE.Box3().setFromObject(e);
    eBox.expandByScalar(-0.15);
    if (playerBox.intersectsBox(eBox)) return true;
  }
  return false;
}

export function clearObstacles() {
  for (const e of active) {
    e.visible = false;
    pool.push(e);
  }
  active.length = 0;
  spawnTimer    = 0;
}

export function getActiveCount() { return active.length; }
