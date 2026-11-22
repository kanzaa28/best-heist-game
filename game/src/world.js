// The rules of VAULTBREAK: the thief, three patrolling guards, three sweeping
// cameras, a laser grid, a crackable vault, a power box, tossed coins, the alarm
// meter, and the win/lose conditions. No drawing here — render.js draws the state.
// The world steps in fixed STEP slices; every number it uses lives in config.js.

import {
  ALARM, CAMERA, CAMERAS, COINS, DESKS, ENTRY, EXIT, FIELD, GUARD, GUARDS,
  LASERS, LIVES, LOOT, PLAYER, POWER_BOX, SHADOWS, VAULT_DOOR, WALLS,
} from './config.js';

export const EVENT_ALARM = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_LOOT = 16;

/** All solid rectangles: walls and desks block movement and sight alike. */
const SOLIDS = [...WALLS, ...DESKS];

/** True when the segment (x1,y1)-(x2,y2) touches the rectangle. */
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const minX = rect.x;
  const maxX = rect.x + rect.w;
  const minY = rect.y;
  const maxY = rect.y + rect.h;
  if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY) return true;
  if (x2 >= minX && x2 <= maxX && y2 >= minY && y2 <= maxY) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < minY || y1 > maxY) return false;
  } else {
    let t1 = (minY - y1) / dy;
    let t2 = (maxY - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** True when nothing solid stands between the watcher and the point. */
export function hasLineOfSight(x1, y1, x2, y2) {
  for (const rect of SOLIDS) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

/** True when the guard's cone covers the point right now. */
export function guardCanSee(guard, x, y) {
  const dx = x - guard.x;
  const dy = y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.viewDistance) return false;
  let angle = Math.atan2(dy, dx) - guard.angle;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  if (Math.abs(angle) > GUARD.viewHalfAngle) return false;
  return hasLineOfSight(guard.x, guard.y, x, y);
}

/** True when the camera's sweeping cone covers the point right now. */
export function cameraCanSee(camera, x, y) {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const distance = Math.hypot(dx, dy);
  if (distance > CAMERA.viewDistance) return false;
  let angle = Math.atan2(dy, dx) - camera.angle;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  if (Math.abs(angle) > CAMERA.viewHalfAngle) return false;
  return hasLineOfSight(camera.x, camera.y, x, y);
}

/** True when the point lies inside a shadow patch (harder to spot there). */
export function inShadow(x, y) {
  return SHADOWS.some((s) => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
}

function clampToField(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/** Move a circle against the solid rectangles, sliding along them: the X axis is
 *  resolved first, then Y, so a body pushed into a wall corner slides around it
 *  instead of sticking to the corner. */
function moveCircle(body, dx, dy) {
  let nextX = body.x + dx;
  for (const rect of SOLIDS) {
    if (nextX + body.radius > rect.x && nextX - body.radius < rect.x + rect.w
      && body.y + body.radius > rect.y && body.y - body.radius < rect.y + rect.h) {
      nextX = dx > 0 ? rect.x - body.radius : rect.x + rect.w + body.radius;
    }
  }
  body.x = clampToField(nextX, body.radius, FIELD.width - body.radius);
  let nextY = body.y + dy;
  for (const rect of SOLIDS) {
    if (body.x + body.radius > rect.x && body.x - body.radius < rect.x + rect.w
      && nextY + body.radius > rect.y && nextY - body.radius < rect.y + rect.h) {
      nextY = dy > 0 ? rect.y - body.radius : rect.y + rect.h + body.radius;
    }
  }
  body.y = clampToField(nextY, body.radius, FIELD.height - body.radius);
}

/** Distance from a point to a segment, for the laser beams. */
function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** A fresh world: guards on their first waypoint, loot on the floor, vault shut. */
export function createWorld(seed) {
  const state = {
    seed,
    time: 0,
    lives: LIVES,
    score: 0,
    coins: COINS,
    alarm: 0,
    alarmTime: 0,
    vaultOpen: false,
    crackProgress: 0,
    powerProgress: 0,
    powerOffUntil: -1,
    coin: null,
    seeingGuard: null,
    seeingCamera: null,
    nearestGuard: Infinity,
    won: false,
    over: false,
    player: {
      x: ENTRY.x, y: ENTRY.y, radius: PLAYER.radius,
      dirX: 0, dirY: -1, dashTime: 0, dashCooldown: 0, invulnerable: 0, sneaking: false,
    },
    guards: GUARDS.map((g) => ({
      name: g.name,
      colour: g.colour,
      x: g.waypoints[0].x, y: g.waypoints[0].y,
      radius: GUARD.radius,
      waypoints: g.waypoints,
      wpIndex: 1,
      pauseTime: g.waypoints[0].pause,
      angle: 0,
      suspicion: 0,
      mode: 'patrol',
      lastSeenX: 0, lastSeenY: 0,
      investigateX: 0, investigateY: 0, investigateTime: 0,
      searchTime: 0,
    })),
    cameras: CAMERAS.map((c) => ({
      id: c.id, x: c.x, y: c.y,
      baseAngle: c.baseAngle, sweep: c.sweep, range: c.range,
      angle: c.baseAngle, phase: 0,
    })),
    loot: LOOT.map((l) => ({ ...l, active: true })),
  };
  return {
    state,
    reset() {
      const fresh = createWorld(seed);
      for (const key of Object.keys(fresh.state)) state[key] = fresh.state[key];
    },
    /**
     * Step the rules by dt seconds. move is a unit vector (or 0,0); sneak, dash and
     * interact come from the keys; coinTarget is a field point to toss a coin at, or
     * null. Returns a bitmask of EVENT_* flags for this step.
     */
    step(dt, move, sneak, dash, interact, coinTarget) {
      if (state.over || state.won) return 0;
      let events = 0;
      const player = state.player;
      state.time += dt;
      const powered = state.time > state.powerOffUntil;

      // --- the thief -------------------------------------------------------
      if (dash && player.dashCooldown <= 0 && player.dashTime <= 0
        && (move.x !== 0 || move.y !== 0)) {
        player.dashTime = PLAYER.dashTime;
        player.dashCooldown = PLAYER.dashCooldown;
      }
      player.dashCooldown = Math.max(0, player.dashCooldown - dt);
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      const speed = player.dashTime > 0
        ? PLAYER.dashSpeed
        : sneak ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
      if (player.dashTime > 0) player.dashTime -= dt;
      player.sneaking = sneak;
      if (move.x !== 0 || move.y !== 0) {
        player.dirX = move.x;
        player.dirY = move.y;
        moveCircle(player, move.x * speed * dt, move.y * speed * dt);
      }

      // --- coins: a toss pulls every guard in earshot to the landing spot ---
      if (coinTarget && state.coins > 0) {
        state.coins -= 1;
        const cx = clampToField(coinTarget.x, 30, FIELD.width - 30);
        const cy = clampToField(coinTarget.y, 30, FIELD.height - 30);
        state.coin = { x: cx, y: cy, time: 0 };
        for (const guard of state.guards) {
          if (guard.mode === 'chase') continue;
          const distance = Math.hypot(guard.x - cx, guard.y - cy);
          if (distance < 420) {
            guard.mode = 'investigate';
            guard.investigateX = cx;
            guard.investigateY = cy;
            guard.investigateTime = 4;
          }
        }
      }
      if (state.coin) state.coin.time += dt;

      // --- vault cracking and the power box (hold E beside them) -----------
      const vaultCx = VAULT_DOOR.x + VAULT_DOOR.w / 2;
      const vaultCy = VAULT_DOOR.y + VAULT_DOOR.h / 2;
      const nearVault = Math.hypot(player.x - vaultCx, player.y - vaultCy) < 70;
      if (!state.vaultOpen && nearVault && interact) {
        state.crackProgress += dt;
        if (state.crackProgress >= VAULT_DOOR.crackSeconds) state.vaultOpen = true;
      } else if (!nearVault) {
        state.crackProgress = Math.max(0, state.crackProgress - dt * 2);
      }
      const powerCx = POWER_BOX.x + POWER_BOX.w / 2;
      const powerCy = POWER_BOX.y + POWER_BOX.h / 2;
      const nearPower = Math.hypot(player.x - powerCx, player.y - powerCy) < 70;
      if (powered && nearPower && interact) {
        state.powerProgress += dt;
        if (state.powerProgress >= POWER_BOX.holdSeconds) {
          state.powerOffUntil = state.time + POWER_BOX.offSeconds;
          state.powerProgress = 0;
        }
      } else if (!nearPower) {
        state.powerProgress = Math.max(0, state.powerProgress - dt * 2);
      }

      // --- loot ------------------------------------------------------------
      for (const item of state.loot) {
        if (!item.active) continue;
        if (item.kind === 'diamond' && !state.vaultOpen) continue;
        if (Math.hypot(player.x - item.x, player.y - item.y) < 30) {
          item.active = false;
          state.score += item.value;
          events |= EVENT_LOOT;
        }
      }

      // --- cameras sweep, and watch ----------------------------------------
      state.seeingCamera = null;
      for (const camera of state.cameras) {
        camera.phase += dt * 0.55;
        camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
        if (powered && cameraCanSee(camera, player.x, player.y)) {
          state.seeingCamera = camera;
          state.alarm += CAMERA.spotRate * dt * (sneak ? 0.55 : 1)
            * (inShadow(player.x, player.y) ? 0.6 : 1);
        }
      }

      // --- lasers: crossing a live beam feeds the alarm meter --------------
      if (powered) {
        for (const beam of LASERS) {
          if (distanceToSegment(player.x, player.y, beam.x1, beam.y1, beam.x2, beam.y2) < 12) {
            state.alarm += ALARM.laserRate * dt;
            break;
          }
        }
      }

      // --- guards: patrol, stare, chase, investigate -----------------------
      state.seeingGuard = null;
      state.nearestGuard = Infinity;
      let tripAlarm = false;
      for (const guard of state.guards) {
        const distance = Math.hypot(guard.x - player.x, guard.y - player.y);
        state.nearestGuard = Math.min(state.nearestGuard, distance);
        // A guard always tracks what its cone holds — during an alarm that is
        // what the chase follows. Suspicion only builds while no alarm is running.
        const sees = player.invulnerable <= 0 && guardCanSee(guard, player.x, player.y);
        if (sees) {
          state.seeingGuard = guard;
          guard.lastSeenX = player.x;
          guard.lastSeenY = player.y;
        }
        if (sees && state.alarmTime <= 0) {
          const closeness = 1 + (1 - Math.min(1, distance / GUARD.viewDistance));
          let rate = GUARD.spotRate * closeness;
          if (sneak) rate *= 0.55;
          if (inShadow(player.x, player.y)) rate *= 0.6;
          if (player.dashTime > 0) rate *= 1.6;
          guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
          state.alarm = Math.min(1, state.alarm + rate * dt * 0.7);
          if (guard.suspicion >= 1) tripAlarm = true;
        } else {
          guard.suspicion = Math.max(
            guard.mode === 'patrol' && state.alarmTime <= 0 ? 0 : GUARD.waryRest,
            guard.suspicion - 0.25 * dt,
          );
        }

        if (state.alarmTime > 0) {
          // Chase the last seen position; a touch during the alarm is a catch.
          guard.mode = 'chase';
          const dx = guard.lastSeenX - guard.x;
          const dy = guard.lastSeenY - guard.y;
          const length = Math.hypot(dx, dy);
          if (length > 8) {
            guard.angle = Math.atan2(dy, dx);
            moveCircle(guard, (dx / length) * GUARD.chaseSpeed * dt,
              (dy / length) * GUARD.chaseSpeed * dt);
          }
          if (distance < guard.radius + player.radius + 4 && player.invulnerable <= 0) {
            state.lives -= 1;
            events |= EVENT_CAUGHT;
            state.alarmTime = 0;
            state.alarm = 0.4;
            for (const other of state.guards) {
              other.suspicion = GUARD.waryRest;
              other.mode = 'patrol';
            }
            player.x = ENTRY.x;
            player.y = ENTRY.y;
            player.invulnerable = PLAYER.invulnerableAfterCaught;
            if (state.lives <= 0) {
              state.over = true;
              events |= EVENT_OVER;
            }
            break;
          }
          continue;
        }

        if (guard.mode === 'investigate') {
          const dx = guard.investigateX - guard.x;
          const dy = guard.investigateY - guard.y;
          const length = Math.hypot(dx, dy);
          if (length > 10) {
            guard.angle = Math.atan2(dy, dx);
            moveCircle(guard, (dx / length) * GUARD.patrolSpeed * dt,
              (dy / length) * GUARD.patrolSpeed * dt);
          } else {
            guard.investigateTime -= dt;
            guard.angle += Math.sin(state.time * 2) * 0.02;
            if (guard.investigateTime <= 0) guard.mode = 'patrol';
          }
          continue;
        }

        if (guard.suspicion >= GUARD.stareThreshold && sees) {
          // Half-spotted: stop and stare at the thief.
          guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
          continue;
        }

        // Patrol: walk to the next waypoint, pause, sweep the cone.
        const target = guard.waypoints[guard.wpIndex];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const length = Math.hypot(dx, dy);
        if (guard.pauseTime > 0) {
          guard.pauseTime -= dt;
          const base = Math.atan2(dy, dx);
          guard.angle = base + Math.sin(state.time * 1.4 + guard.x) * 0.6;
          if (guard.pauseTime <= 0) {
            guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
          }
        } else if (length > 6) {
          guard.angle = Math.atan2(dy, dx);
          moveCircle(guard, (dx / length) * GUARD.patrolSpeed * dt,
            (dy / length) * GUARD.patrolSpeed * dt);
        } else {
          guard.pauseTime = target.pause;
        }
      }

      // --- the alarm meter --------------------------------------------------
      if (state.alarmTime > 0) {
        state.alarmTime -= dt;
        if (state.alarmTime <= 0) {
          state.alarmTime = 0;
          for (const guard of state.guards) {
            if (guard.mode === 'chase') guard.mode = 'patrol';
          }
        }
      } else {
        state.alarm = Math.max(0, state.alarm - ALARM.drainPerSecond * dt);
        if (state.alarm >= 1 || tripAlarm) {
          state.alarmTime = GUARD.alarmSeconds;
          state.alarm = 0.5;
          events |= EVENT_ALARM;
          for (const guard of state.guards) {
            guard.lastSeenX = player.x;
            guard.lastSeenY = player.y;
          }
        }
      }

      // --- the exit: the job is done only with the diamond -----------------
      const hasDiamond = !state.loot.find((item) => item.id === 'diamond')?.active;
      if (hasDiamond && player.x >= EXIT.x && player.x <= EXIT.x + EXIT.w
        && player.y >= EXIT.y && player.y <= EXIT.y + EXIT.h) {
        state.won = true;
        state.score += 500 + Math.max(0, 600 - Math.floor(state.time * 2));
        events |= EVENT_WIN;
      }
      return events;
    },
  };
}

/** The nearest guard's distance, for the HUD footsteps meter. */
export function nearestGuardDistance(state) {
  return state.nearestGuard;
}
