// The screenshot scenes behind ?shot=start|play|alarm|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same seed
// always gives the same frame. The careful pilot follows a planned route — paintings,
// the power box, the vault door, the diamond, the exit — waits out covered ground
// and sneaks near guards; the reckless one walks straight at the diamond and freezes
// in the light, so the alarm shot catches the alarm at its trigger.

import { STEP } from './config.js';
import {
  EVENT_ALARM, EVENT_OVER, EVENT_WIN, cameraCanSee, guardCanSee,
} from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 23;
const ALARM_LIMIT_SECONDS = 180;
const END_LIMIT_SECONDS = 600;

/** The careful pilot's route: waypoints through the bank. `hold` means stay put
 *  with E held until the job at that spot is done (power cut, vault cracked). */
const ROUTE = [
  { x: 120, y: 560 },
  { x: 120, y: 120 },
  { x: 300, y: 90 },
  { x: 700, y: 90 },
  { x: 850, y: 360 },
  { x: 937, y: 410, hold: 'power' },
  { x: 1030, y: 370, hold: 'vault' },
  { x: 1070, y: 130 },
  { x: 1150, y: 120 },
  { x: 1030, y: 370 },
  { x: 860, y: 650 },
  { x: 700, y: 650 },
  { x: 500, y: 620 },
  { x: 95, y: 658 },
];

/** True when any guard's cone — or a live camera's — covers the point right now. */
function pointCovered(state, x, y) {
  for (const guard of state.guards) {
    if (guardCanSee(guard, x, y)) return true;
  }
  if (state.time <= state.powerOffUntil) return false;
  for (const camera of state.cameras) {
    if (cameraCanSee(camera, x, y)) return true;
  }
  return false;
}

/** The nearest loot still on the floor, or null when the floor is clean. */
function nearestLoot(state) {
  let loot = null;
  let bestDistance = Infinity;
  for (const item of state.loot) {
    if (!item.active) continue;
    if (item.kind === 'diamond' && !state.vaultOpen) continue;
    const distance = Math.hypot(item.x - state.player.x, item.y - state.player.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      loot = item;
    }
  }
  return loot;
}

/**
 * Steer the thief. Returns { move, sneak, dash, interact }. The careful pilot
 * follows ROUTE, holds E at the power box and the vault door, waits where a cone
 * covers the next waypoint, and sneaks near guards; the reckless pilot walks
 * straight at the diamond and freezes the moment a guard's cone finds it.
 */
function autopilot(state, careful, routeIndex) {
  const player = state.player;
  if (!careful) {
    if (state.seeingGuard !== null && player.invulnerable === 0) {
      return { move: { x: 0, y: 0 }, sneak: false, dash: false, interact: false };
    }
    const diamond = state.loot.find((item) => item.id === 'diamond');
    let target;
    if (diamond && diamond.active) {
      // Outside the shut vault, the only way in is the door gap — walk there
      // first (straight through Vera's patrol), then at the diamond itself.
      const outsideVault = player.x < 880 || player.y > 326;
      target = !state.vaultOpen && outsideVault
        ? { x: 1030, y: 370 }
        : { x: 1070, y: 130 };
    } else {
      target = { x: 95, y: 658 };
    }
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    return { move: { x: dx / length, y: dy / length }, sneak: false, dash: false, interact: false };
  }

  const target = ROUTE[routeIndex];
  if (target === undefined) return { move: { x: 0, y: 0 }, sneak: false, dash: false, interact: false };

  // At a hold waypoint: stay put with E held until the job there is done.
  const distanceToTarget = Math.hypot(target.x - player.x, target.y - player.y);
  if (target.hold === 'power' && distanceToTarget < 30) {
    if (state.time <= state.powerOffUntil) return { move: { x: 0, y: 0 }, sneak: true, dash: false, interact: false };
    return { move: { x: 0, y: 0 }, sneak: true, dash: false, interact: true };
  }
  if (target.hold === 'vault' && distanceToTarget < 30) {
    if (state.vaultOpen) return { move: { x: 0, y: 0 }, sneak: true, dash: false, interact: false };
    return { move: { x: 0, y: 0 }, sneak: true, dash: false, interact: true };
  }

  // Half-spotted and still seen: back away from the guard that sees you.
  if (state.seeingGuard !== null && state.seeingGuard.suspicion > 0.5) {
    const guard = state.seeingGuard;
    const dx = player.x - guard.x;
    const dy = player.y - guard.y;
    const length = Math.hypot(dx, dy) || 1;
    return { move: { x: dx / length, y: dy / length }, sneak: true, dash: false, interact: false };
  }
  // Standing in a cone is no place to wait: fall back toward the previous waypoint,
  // which the route chose as safe ground, until no cone covers you.
  if (pointCovered(state, player.x, player.y)) {
    const previous = ROUTE[routeIndex - 1] ?? { x: 80, y: 640 };
    const dx = previous.x - player.x;
    const dy = previous.y - player.y;
    const length = Math.hypot(dx, dy) || 1;
    return { move: { x: dx / length, y: dy / length }, sneak: true, dash: false, interact: false };
  }
  // Alarm meter high but unseen: hold still in the dark until it drains.
  if (state.alarm > 0.55) {
    return { move: { x: 0, y: 0 }, sneak: true, dash: false, interact: false };
  }
  // The next waypoint is covered: wait here rather than walk into a cone.
  if (pointCovered(state, target.x, target.y)) {
    return { move: { x: 0, y: 0 }, sneak: true, dash: false, interact: false };
  }

  let dx = target.x - player.x;
  let dy = target.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;
  // Probe the step ahead: if it walks into a cone, sidestep around it or wait.
  const probeX = player.x + dx * 70;
  const probeY = player.y + dy * 70;
  if (pointCovered(state, probeX, probeY)) {
    for (const turn of [0.9, -0.9, 1.8, -1.8]) {
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const sx = dx * cos - dy * sin;
      const sy = dx * sin + dy * cos;
      if (sx * dx + sy * dy < 0.3) continue;
      if (!pointCovered(state, player.x + sx * 70, player.y + sy * 70)) {
        return { move: { x: sx, y: sy }, sneak: true, dash: false, interact: false };
      }
    }
    return { move: { x: 0, y: 0 }, sneak: true, dash: false, interact: false };
  }
  const sneak = state.nearestGuard < 280;
  return { move: { x: dx, y: dy }, sneak, dash: false, interact: false };
}

/** Advance the route index when the pilot reaches its waypoint (or the hold is done). */
function routeAdvanced(state, routeIndex) {
  const target = ROUTE[routeIndex];
  if (target === undefined) return routeIndex;
  const distance = Math.hypot(target.x - state.player.x, target.y - state.player.y);
  if (target.hold === 'power' && distance < 30 && state.time <= state.powerOffUntil) {
    return routeIndex + 1;
  }
  if (target.hold === 'vault' && distance < 30 && state.vaultOpen) return routeIndex + 1;
  if (distance < 26) return routeIndex + 1;
  return routeIndex;
}

/**
 * Set `world` to the named scene (start, play, alarm or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'alarm' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, false, false, null);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'alarm') {
    // Reckless until the alarm sounds, and stop right there: the frame at the
    // trigger shows the alarm banner, the red cones and the chasing guards.
    let events = 0;
    for (let index = 0; index < ALARM_LIMIT_SECONDS / STEP; index += 1) {
      const { move, sneak, dash, interact } = autopilot(world.state, false, 0);
      events = world.step(STEP, move, sneak, dash, interact, null);
      if (events & EVENT_ALARM) break;
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    const over = world.state.lives === 0;
    const won = (events & EVENT_WIN) !== 0;
    return {
      screen: won ? SCREEN_WIN : over ? SCREEN_OVER : SCREEN_PLAY,
      best: world.state.score,
    };
  }

  if (name === 'end') {
    // The careful pilot all the way to the exit with the diamond.
    let events = 0;
    let routeIndex = 0;
    let lives = world.state.lives;
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      routeIndex = routeAdvanced(world.state, routeIndex);
      const { move, sneak, dash, interact } = autopilot(world.state, true, routeIndex);
      events = world.step(STEP, move, sneak, dash, interact, null);
      if (world.state.lives < lives) {
        lives = world.state.lives;
        routeIndex = 0;
      }
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    const over = world.state.lives === 0;
    const won = (events & EVENT_WIN) !== 0;
    return {
      screen: won ? SCREEN_WIN : over ? SCREEN_OVER : SCREEN_PLAY,
      best: world.state.score,
    };
  }

  // Play: the careful pilot, partway through the job.
  let routeIndex = 0;
  let lives = world.state.lives;
  for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
    routeIndex = routeAdvanced(world.state, routeIndex);
    const { move, sneak, dash, interact } = autopilot(world.state, true, routeIndex);
    const events = world.step(STEP, move, sneak, dash, interact, null);
    if (world.state.lives < lives) {
      lives = world.state.lives;
      routeIndex = 0;
    }
    if (events & (EVENT_OVER | EVENT_WIN)) break;
  }
  const over = world.state.lives === 0;
  return {
    screen: over ? SCREEN_OVER : SCREEN_PLAY,
    best: world.state.score,
  };
}

/** The careful pilot's route, for the smoke test: win by following it to the exit. */
export { ROUTE, autopilot };
