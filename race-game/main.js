// ============================================================
//  main.js  –  Entry point: init everything, manage screens,
//              wire UI buttons, handle custom events
// ============================================================

import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

import { initScene }                         from './js/scene.js';
import { createPlayerCar }                   from './js/car.js';
import { initObstacles }                     from './js/obstacles.js';
import { initControls }                      from './js/controls.js';
import { initGameLoop, startCountdown,
         restartGame, STATE, gameState }      from './js/gameLoop.js';

// ---- DOM ----
const canvas        = document.getElementById('game-canvas');
const menuScreen    = document.getElementById('screen-menu');
const gameoverScreen = document.getElementById('screen-gameover');
const btnStart      = document.getElementById('btn-start');
const btnRestart    = document.getElementById('btn-restart');
const btnMenu       = document.getElementById('btn-menu');
const cursorEl      = document.getElementById('cursor');

// ---- Cursor ----
window.addEventListener('mousemove', e => {
  cursorEl.style.left = e.clientX + 'px';   
  cursorEl.style.top  = e.clientY + 'px';
});
// ---- Init ----
initScene(canvas);
createPlayerCar();
initObstacles();
initControls();
initGameLoop();

// Show menu
showScreen('menu');

// ---- Button wiring ----
btnStart.addEventListener('click', () => {
  showScreen('none');
  startCountdown();
});

btnRestart.addEventListener('click', () => {
  showScreen('none');
  restartGame();
});

btnMenu.addEventListener('click', () => {
  showScreen('menu');
});

// ---- Game Over event ----
document.addEventListener('game:over', (e) => {
  const { score, distance, best } = e.detail;
  document.getElementById('go-score').textContent   = score.toLocaleString();
  document.getElementById('go-dist').textContent    = distance.toLocaleString() + 'm';
  document.getElementById('go-best').textContent    = best.toLocaleString();
  document.getElementById('go-speed').textContent   = Math.floor(distance / 10) + ' km/h peak';
  setTimeout(() => showScreen('gameover'), 200);
});

// ---- Keyboard: Space to start ----
window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (document.getElementById('screen-menu').style.display !== 'none') {
      btnStart.click();
    }
  }
});

// ---- Screen helper ----
function showScreen(name) {
  menuScreen.style.display     = name === 'menu'     ? 'flex' : 'none';
  gameoverScreen.style.display = name === 'gameover' ? 'flex' : 'none';
}
