// ============================================================
//  gameLoop.js  –  Main loop, state machine, scoring, audio
// ============================================================

import { scrollRoad, updateCamera, renderScene, triggerCameraShake } from './scene.js';
import { updatePlayerCar, updateExhaust, resetPlayer, playerX }      from './car.js';
import { updateObstacles, checkCollisions, clearObstacles }           from './obstacles.js';
import { processInput, enableControls, disableControls }              from './controls.js';

// ---- Game States ----
export const STATE = { MENU: 0, COUNTDOWN: 1, PLAYING: 2, DEAD: 3, GAMEOVER: 4 };
export let gameState = STATE.MENU;

// ---- Scoring ----
export let score       = 0;
export let distance    = 0;
export let bestScore   = parseInt(localStorage.getItem('neonRacerBest') || '0');
let   scoreMultiplier  = 1;
let   dodgeStreak      = 0;

// ---- Speed ----
let   baseSpeed        = 0.28;
let   currentSpeed     = 0;
let   targetSpeed      = 0;

// ---- Audio ----
let audioCtx, engineOscillator, engineGain, crashBuffer;
let audioReady = false;

// ---- DOM refs ----
let hudScore, hudDist, hudSpeed, speedBar, comboEl, diffBadge;
let frameId;

export function initGameLoop() {
  hudScore  = document.getElementById('score-val');
  hudDist   = document.getElementById('dist-val');
  hudSpeed  = document.getElementById('speed-val');
  speedBar  = document.getElementById('speed-bar');
  comboEl   = document.getElementById('combo');
  diffBadge = document.getElementById('difficulty-badge');

  initAudio();
  requestAnimationFrame(loop);
}

// ========== STATE MACHINE ==========

export function startCountdown() {
  gameState = STATE.COUNTDOWN;
  let count = 3;
  const cd    = document.getElementById('countdown');
  const cdVal = document.getElementById('countdown-val');
  cd.style.opacity = '1';

  const tick = () => {
    cdVal.textContent = count > 0 ? count : 'GO!';
    cdVal.style.animation = 'none';
    void cdVal.offsetWidth;
    cdVal.style.animation = 'scorePop 0.4s ease-out both';
    if (count === 0) {
      setTimeout(() => {
        cd.style.opacity = '0';
        startPlaying();
      }, 600);
    } else {
      count--;
      setTimeout(tick, 800);
    }
  };
  tick();
}

function startPlaying() {
  gameState      = STATE.PLAYING;
  score          = 0;
  distance       = 0;
  dodgeStreak    = 0;
  scoreMultiplier = 1;
  currentSpeed   = 0;
  targetSpeed    = baseSpeed;
  clearObstacles();
  resetPlayer();
  enableControls();
  startEngine();
}

export function triggerGameOver() {
  if (gameState !== STATE.PLAYING) return;
  gameState = STATE.DEAD;
  disableControls();
  stopEngine();
  playCrash();
  triggerCameraShake(0.8);

  // Flash red
  const flash = document.getElementById('crash-flash');
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 180);

  // DOM particles burst
  spawnParticles();

  // Save best
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('neonRacerBest', bestScore);
  }

  setTimeout(() => {
    gameState = STATE.GAMEOVER;
    document.dispatchEvent(new CustomEvent('game:over', {
      detail: { score, distance: Math.floor(distance), best: bestScore }
    }));
  }, 1200);
}

export function restartGame() {
  clearObstacles();
  resetPlayer();
  score = 0; distance = 0;
  startCountdown();
}

// ========== MAIN LOOP ==========

function loop(timestamp) {
  frameId = requestAnimationFrame(loop);

  if (gameState === STATE.PLAYING) {
    // Accelerate to target speed
    currentSpeed = THREE.MathUtils.lerp(currentSpeed, targetSpeed, 0.04);

    // Ramp up speed over time
    targetSpeed = baseSpeed + Math.min(distance / 5000, 0.22);

    processInput();
    updatePlayerCar();
    updateExhaust();
    scrollRoad(currentSpeed);
    updateObstacles(currentSpeed, score);
    updateCamera(playerX);

    // Scoring
    distance       += currentSpeed * 2;
    score          += Math.floor(currentSpeed * scoreMultiplier * 3);

    updateHUD();

    // Collision check
    if (checkCollisions()) triggerGameOver();
  } else if (gameState === STATE.MENU || gameState === STATE.GAMEOVER) {
    // Idle – keep road scrolling slowly for atmosphere
    scrollRoad(0.06);
    updateCamera(0);
  } else if (gameState === STATE.COUNTDOWN) {
    scrollRoad(0.06);
    updateCamera(0);
  }

  // Update engine pitch
  if (audioReady && engineOscillator) {
    const pitch = 80 + (currentSpeed / 0.5) * 180;
    engineOscillator.frequency.setTargetAtTime(pitch, audioCtx.currentTime, 0.1);
  }

  renderScene();
}

// ========== HUD UPDATE ==========

function updateHUD() {
  if (hudScore) hudScore.textContent   = score.toLocaleString();
  if (hudDist)  hudDist.textContent    = Math.floor(distance) + 'm';
  if (hudSpeed) hudSpeed.textContent   = Math.floor(currentSpeed * 400) + '';

  const speedPct = Math.min((currentSpeed / 0.5) * 100, 100);
  if (speedBar) speedBar.style.width   = speedPct + '%';

  // Difficulty label
  const lvl = Math.min(Math.floor(distance / 1500) + 1, 10);
  if (diffBadge) diffBadge.textContent = `LVL ${lvl}`;

  // Combo
  if (comboEl) {
    if (scoreMultiplier > 1) {
      comboEl.textContent = `× ${scoreMultiplier.toFixed(1)} COMBO`;
      comboEl.classList.add('visible');
    } else {
      comboEl.classList.remove('visible');
    }
  }
}

// ========== AUDIO ==========

// We need THREE here just for MathUtils
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

function initAudio() {
  // AudioContext must be created after user gesture
  document.addEventListener('pointerdown', () => {
    if (audioReady) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioReady = true;
    } catch(e) { console.warn('Audio unavailable'); }
  }, { once: true });
}

function startEngine() {
  if (!audioReady || !audioCtx) return;
  try {
    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
    engineGain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.5);

    // Layered oscillators for richer engine sound
    engineOscillator = audioCtx.createOscillator();
    engineOscillator.type = 'sawtooth';
    engineOscillator.frequency.value = 80;

    const distortion = audioCtx.createWaveShaper();
    distortion.curve = makeDistortionCurve(100);

    const filter = audioCtx.createBiquadFilter();
    filter.type      = 'lowpass';
    filter.frequency.value = 600;

    engineOscillator.connect(distortion);
    distortion.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOscillator.start();
  } catch(e) {}
}

function stopEngine() {
  if (!engineGain) return;
  try {
    engineGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
    setTimeout(() => {
      if (engineOscillator) { engineOscillator.stop(); engineOscillator = null; }
    }, 500);
  } catch(e) {}
}

function playCrash() {
  if (!audioReady || !audioCtx) return;
  try {
    const dur      = 0.8;
    const bufSize  = audioCtx.sampleRate * dur;
    const buffer   = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data     = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 0.5);
    }
    const src   = audioCtx.createBufferSource();
    const gain  = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    src.buffer = buffer;
    gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
  } catch(e) {}
}

function makeDistortionCurve(amount) {
  const n    = 256;
  const curve = new Float32Array(n);
  const deg  = Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

// ========== DOM PARTICLES ==========
function spawnParticles() {
  const container = document.getElementById('particles');
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    const size = 6 + Math.random() * 12;
    const colors = ['#ff006e','#00f5ff','#ffea00','#ff3355'];
    el.style.cssText = `
      width:${size}px;height:${size}px;
      left:${cx}px;top:${cy}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      --tx:${(Math.random()-0.5)*400}px;
      --ty:${(Math.random()-0.5)*400}px;
      --dur:${0.5+Math.random()*0.8}s;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}
