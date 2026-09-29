import { SettingsStore, safeStorage } from './settings/store.js';
import { Game } from './game/game.js';
import { App } from './ui/app.js';

/* Entry point of the shipped game. Everything else is imported from here, so the build is one bundle. */

async function main() {
  const boot = document.getElementById('boot');
  const fill = document.getElementById('boot-fill');
  const line = document.getElementById('boot-line');
  const store = new SettingsStore(safeStorage());
  const game = new Game({ canvas: document.getElementById('gl'), hudCanvas: document.getElementById('hud'), store });
  let paused = false, frames = 0;
  window.__fh = {
    game, store, get frames() { return frames; }, get nodes() { return game.nodes; }, get cam() { return game.renderer && game.renderer.camera; },
    stats() { return game.nodes ? { ...game.getStats(), settled: game.nodes.settled, frames } : { frames }; },
    pause() { paused = true; }, resume() { paused = false; },
  };
  try {
    await game.init((f, text) => { fill.style.width = `${Math.round(f * 100)}%`; line.textContent = text; });
  } catch (e) {
    console.error(e);
    line.textContent = `Fly High could not start: ${e.message}. It needs WebGL 2.`;
    fill.style.background = '#d8341a';
    return;
  }
  const app = new App(game, document.getElementById('ui'));
  window.__fh.app = app;
  app.showMenu();
  boot.classList.add('done');
  setTimeout(() => boot.remove(), 700);
  let failed = false;
  const loop = (t) => {
    requestAnimationFrame(loop);
    if (paused) return;
    try { game.frame(t); frames++; } catch (e) { if (!failed) { failed = true; console.error(e); game.hud.toast('Internal error: ' + e.message, 8000, 'bad'); } }
  };
  requestAnimationFrame(loop);
}

main();
