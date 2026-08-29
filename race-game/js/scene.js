// ============================================================
//  scene.js  –  Three.js scene, camera, renderer, lighting,
//               road environment, skybox, and ambient world
// ============================================================

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export const LANE_WIDTH    = 3.2;
export const LANE_COUNT    = 3;
export const ROAD_WIDTH    = LANE_WIDTH * LANE_COUNT;
export const ROAD_SEGMENT  = 40;          // length of one road tile
export const NUM_SEGMENTS  = 6;           // tiles in the pool
export const ROAD_HALF     = ROAD_WIDTH / 2;

export let scene, camera, renderer;
export let roadTiles = [];
export let edgeLines  = [];
export let laneDividers = [];
export let environmentObjects = [];

// Neon city palette
const SKY_TOP    = new THREE.Color(0x010510);
const SKY_BOTTOM = new THREE.Color(0x020d1f);

export function initScene(canvas) {
  // ---- Renderer ----
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.toneMapping       = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputEncoding    = THREE.sRGBEncoding;

  // ---- Scene ----
  scene = new THREE.Scene();
  scene.background = SKY_TOP;
  scene.fog        = new THREE.FogExp2(0x010814, 0.028);

  // ---- Camera ----
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.set(0, 5.5, 12);
  camera.lookAt(0, 0, -10);

  // ---- Lighting ----
  buildLighting();

  // ---- Road ----
  buildRoad();

  // ---- Environment ----
  buildEnvironment();

  // ---- Resize handler ----
  window.addEventListener('resize', onResize);
}

function buildLighting() {
  // Ambient (low – neon city night)
  const ambient = new THREE.AmbientLight(0x111833, 0.6);
  scene.add(ambient);

  // Main directional (moon-ish)
  const moon = new THREE.DirectionalLight(0x223355, 1.4);
  moon.position.set(5, 20, 10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near   = 0.1;
  moon.shadow.camera.far    = 150;
  moon.shadow.camera.left   = -30;
  moon.shadow.camera.right  = 30;
  moon.shadow.camera.top    = 30;
  moon.shadow.camera.bottom = -30;
  moon.shadow.bias = -0.001;
  scene.add(moon);

  // Neon road strip lights (left + right edges)
  const roadGlowL = new THREE.PointLight(0x00f5ff, 2.5, 20);
  roadGlowL.position.set(-ROAD_HALF, 0.3, 0);
  scene.add(roadGlowL);

  const roadGlowR = new THREE.PointLight(0xff006e, 2.5, 20);
  roadGlowR.position.set(ROAD_HALF, 0.3, 0);
  scene.add(roadGlowR);

  // Head-up fill
  const fill = new THREE.DirectionalLight(0x004477, 0.5);
  fill.position.set(0, 10, -20);
  scene.add(fill);

  // Hemisphere
  const hemi = new THREE.HemisphereLight(0x112244, 0x0a0a12, 0.4);
  scene.add(hemi);
}

function buildRoad() {
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x111820,
    roughness: 0.9,
    metalness: 0.05,
  });

  // Edge stripe material
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x00f5ff,
    emissive: new THREE.Color(0x00f5ff),
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });

  // Centre divider material
  const divMat = new THREE.MeshStandardMaterial({
    color: 0xffea00,
    emissive: new THREE.Color(0xffea00),
    emissiveIntensity: 0.8,
    roughness: 0.4,
  });

  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const group = new THREE.Group();
    const z     = -i * ROAD_SEGMENT;

    // Road surface
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT),
      asphaltMat
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, z - ROAD_SEGMENT / 2);
    road.receiveShadow = true;
    group.add(road);

    // Left neon edge
    const le = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, ROAD_SEGMENT),
      edgeMat
    );
    le.position.set(-ROAD_HALF - 0.06, 0.04, z - ROAD_SEGMENT / 2);
    group.add(le);

    // Right neon edge
    const re = le.clone();
    re.position.set(ROAD_HALF + 0.06, 0.04, z - ROAD_SEGMENT / 2);
    re.material = new THREE.MeshStandardMaterial({
      color: 0xff006e, emissive: new THREE.Color(0xff006e), emissiveIntensity: 1.2, roughness: 0.4
    });
    group.add(re);

    // Lane dividers (dashed via boxes)
    for (let d = 0; d < LANE_COUNT - 1; d++) {
      const lx = -ROAD_HALF + LANE_WIDTH * (d + 1);
      const dashCount = Math.floor(ROAD_SEGMENT / 4);
      for (let k = 0; k < dashCount; k++) {
        const dash = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.05, 1.6),
          divMat
        );
        dash.position.set(lx, 0.025, z - k * 4 - 2);
        group.add(dash);
      }
    }

    // Shoulder / curb (left and right)
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.95 });
    [-1, 1].forEach(side => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.15, ROAD_SEGMENT),
        curbMat
      );
      curb.position.set(side * (ROAD_HALF + 1), -0.05, z - ROAD_SEGMENT / 2);
      curb.receiveShadow = true;
      group.add(curb);
    });

    scene.add(group);
    roadTiles.push(group);
  }
}

function buildEnvironment() {
  // Side buildings (neon-lit city silhouette)
  buildBuildings();

  // Ground plane (extends past road)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x050b12, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 600), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.01, -150);
  ground.receiveShadow = true;
  scene.add(ground);

  // Distant mountain silhouette
  buildMountains();

  // Stars
  buildStars();
}

function buildBuildings() {
  const buildingColors = [0x00f5ff, 0xff006e, 0xffea00, 0x39ff14, 0x7b2fff];
  const buildingGeo = [
    new THREE.BoxGeometry(4, 1, 4),
    new THREE.BoxGeometry(3, 1, 3),
    new THREE.BoxGeometry(6, 1, 5),
  ];

  for (let side of [-1, 1]) {
    const startX = side * (ROAD_HALF + 4);
    for (let i = 0; i < 30; i++) {
      const h    = 6 + Math.random() * 20;
      const w    = 3 + Math.random() * 5;
      const d    = 3 + Math.random() * 4;
      const z    = -i * 15 - Math.random() * 5;
      const col  = buildingColors[Math.floor(Math.random() * buildingColors.length)];

      const mat = new THREE.MeshStandardMaterial({
        color:             0x0d1117,
        roughness:         0.9,
        emissive:          new THREE.Color(col),
        emissiveIntensity: 0.04 + Math.random() * 0.06,
      });

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(startX + side * (w / 2 + Math.random() * 3), h / 2, z);
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      environmentObjects.push(mesh);

      // Neon trim on top
      const trimMat = new THREE.MeshStandardMaterial({
        color:             col,
        emissive:          new THREE.Color(col),
        emissiveIntensity: 2,
      });
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.15, d + 0.2), trimMat);
      trim.position.set(mesh.position.x, h + 0.07, z);
      scene.add(trim);
      environmentObjects.push(trim);

      // Window lights (random pattern)
      if (Math.random() > 0.4) {
        const winMat = new THREE.MeshStandardMaterial({
          color:             col,
          emissive:          new THREE.Color(col),
          emissiveIntensity: 0.5 + Math.random(),
        });
        const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, h * 0.6, 0.1), winMat);
        win.position.set(mesh.position.x, h * 0.5, z + side * (d / 2 + 0.05));
        scene.add(win);
        environmentObjects.push(win);
      }
    }
  }
}

function buildMountains() {
  const mtMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const geo  = new THREE.ConeGeometry(8 + Math.random() * 12, 20 + Math.random() * 30, 5);
    const mesh = new THREE.Mesh(geo, mtMat);
    const side = Math.random() > 0.5 ? 1 : -1;
    mesh.position.set(side * (35 + Math.random() * 25), 0, -80 - Math.random() * 80);
    scene.add(mesh);
  }
}

function buildStars() {
  const positions = [];
  for (let i = 0; i < 2000; i++) {
    positions.push(
      (Math.random() - 0.5) * 400,
      20 + Math.random() * 80,
      (Math.random() - 0.5) * 400
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat  = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
  scene.add(new THREE.Points(geo, mat));
}

// ---- Road scrolling ----
export function scrollRoad(speed) {
  roadTiles.forEach(tile => {
    tile.position.z += speed;
    // Recycle tile when it passes the camera
    if (tile.position.z > ROAD_SEGMENT) {
      tile.position.z -= NUM_SEGMENTS * ROAD_SEGMENT;
    }
  });
}

// ---- Camera shake ----
let shakeIntensity = 0;
export function triggerCameraShake(intensity = 0.3) {
  shakeIntensity = intensity;
}
export function updateCamera(playerX) {
  const target = new THREE.Vector3(playerX * 0.3, 5.5, 12);
  camera.position.lerp(target, 0.08);

  if (shakeIntensity > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.5;
    shakeIntensity    *= 0.85;
  }
  camera.lookAt(playerX * 0.1, 0.5, -10);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function renderScene() {
  renderer.render(scene, camera);
}
