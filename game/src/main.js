// Boot, fixed-step loop and screen state for VAULTBREAK. The title screen shows
// the hall behind it; Space / click starts the run; P or Esc pauses; R restarts.
// ?shot=start|play|alarm|end&seed=N stages a deterministic screenshot scene instead
// of the title screen (see shots.js), so the screenshots are real renders of play.

import { STEP } from './config.js';
import { createInput } from './input.js';
import { createWorld, EVENT_ALARM, EVENT_CAUGHT, EVENT_LOOT, EVENT_OVER, EVENT_WIN } from './world.js';
import { drawWorld, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';
import {
  playAlarm, playCaught, playFootstep, playLoot, playOver, playWin, unlockAudio,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const world = createWorld(seed);
const input = createInput(canvas);

let screen = SCREEN_TITLE;
let best = 0;
let paused = false;
let accumulator = 0;
let lastTime = performance.now();
let stepCounter = 0;
let lastFootstep = 0;

/** Feed one fixed step to the world and react to what happened in it. */
function stepOnce() {
  const state = world.state;
  const held = input.state;
  let coinTarget = null;
  if (held.coinTarget && held.coinTarget.fresh) {
    const rect = canvas.getBoundingClientRect();
    coinTarget = {
      x: (held.coinTarget.x - rect.left) * (1280 / rect.width),
      y: (held.coinTarget.y - rect.top) * (720 / rect.height),
    };
  }
  const events = world.step(STEP, held.move, held.sneak, held.dash, held.interact, coinTarget);
  input.consume();
  stepCounter += 1;

  if (events & EVENT_LOOT) playLoot();
  if (events & EVENT_ALARM) playAlarm();
  if (events & EVENT_CAUGHT) playCaught();
  if (events & EVENT_WIN) {
    best = Math.max(best, state.score);
    playWin();
    screen = SCREEN_WIN;
  }
  if (events & EVENT_OVER) {
    best = Math.max(best, state.score);
    playOver();
    screen = SCREEN_OVER;
  }

  // Footsteps: the nearest guard's thuds quicken as it closes in.
  if (state.nearestGuard < 260 && stepCounter - lastFootstep > Math.max(12, state.nearestGuard / 4)) {
    playFootstep();
    lastFootstep = stepCounter;
  }
}

function frame(now) {
  const delta = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  const held = input.state;

  if (held.pausePressed) {
    paused = !paused;
    input.consume();
  }
  if (held.restartPressed) {
    world.reset();
    screen = shotName ? screen : SCREEN_TITLE;
    paused = false;
    input.consume();
  }

  if (screen === SCREEN_TITLE) {
    if (held.dash || held.mouse.down) {
      unlockAudio();
      screen = SCREEN_PLAY;
    }
    // The hall idles behind the title: guards walk their rounds.
    world.step(STEP, { x: 0, y: 0 }, false, false, false, null);
    input.consume();
  } else if (screen === SCREEN_PLAY && !paused) {
    accumulator += delta;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      stepOnce();
    }
  } else {
    // Win / over / paused: a fresh run starts on Space, click or R.
    if (held.dash || held.mouse.down || held.restartPressed) {
      unlockAudio();
      world.reset();
      screen = SCREEN_PLAY;
      paused = false;
    }
    input.consume();
  }

  drawWorld(ctx, world.state, screen, best);
  requestAnimationFrame(frame);
}

if (shotName) {
  // A staged screenshot: run the scene, draw one frame, stop. No input needed.
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = staged.best;
  drawWorld(ctx, world.state, screen, best);
  document.title = `VAULTBREAK shot ${shotName}`;
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
