// ============================================================
//  controls.js  –  Keyboard and touch/swipe input
// ============================================================

import { moveLeft, moveRight } from './car.js';

const keys = {};
let   controlsEnabled = false;
let   lastLeft  = false;
let   lastRight = false;

// Touch / swipe
let touchStartX = 0;
let touchStartY = 0;

export function initControls() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend',   onTouchEnd,   { passive: true });
}

export function enableControls()  { controlsEnabled = true;  }
export function disableControls() { controlsEnabled = false; }

function onKeyDown(e) {
  keys[e.code] = true;
  // Prevent page scroll
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) {
    e.preventDefault();
  }
}
function onKeyUp(e) {
  keys[e.code] = false;
}

// Called every frame from gameLoop
export function processInput() {
  if (!controlsEnabled) return;

  const wantsLeft  = keys['ArrowLeft']  || keys['KeyA'];
  const wantsRight = keys['ArrowRight'] || keys['KeyD'];

  // Edge-trigger: fire once per key press
  if (wantsLeft && !lastLeft)   moveLeft();
  if (wantsRight && !lastRight) moveRight();

  lastLeft  = wantsLeft;
  lastRight = wantsRight;
}

// Touch swipe
function onTouchStart(e) {
  if (!controlsEnabled) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}
function onTouchEnd(e) {
  if (!controlsEnabled) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
    if (dx < 0) moveLeft();
    else        moveRight();
  }
}

export function isKeyPressed(code) { return !!keys[code]; }
