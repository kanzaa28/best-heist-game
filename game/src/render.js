// All canvas drawing for VAULTBREAK: the bank floor, ray-cast vision cones for
// guards and cameras, the laser grid, loot, the thief, the HUD (alarm meter, loot,
// lives, coins, timer) and the title / win / game-over screens. It only reads the
// world state — it never changes it.

import {
  CAMERAS, DESKS, EXIT, FIELD, FLOOR_BANDS, GUARD, LASERS, LOOT, PALETTE,
  POWER_BOX, SHADOWS, VAULT_DOOR, WALLS,
} from './config.js';
import { inShadow } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

/** Distance along the ray (ox,oy)+t*(dx,dy) to the nearest solid, or Infinity. */
function rayDistance(ox, oy, dx, dy) {
  let best = Infinity;
  for (const rect of [...WALLS, ...DESKS]) {
    const minX = rect.x;
    const maxX = rect.x + rect.w;
    const minY = rect.y;
    const maxY = rect.y + rect.h;
    let tmin = 0;
    let tmax = Infinity;
    if (dx === 0) {
      if (ox < minX || ox > maxX) continue;
    } else {
      let t1 = (minX - ox) / dx;
      let t2 = (maxX - ox) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (dy === 0) {
      if (oy < minY || oy > maxY) continue;
    } else {
      let t1 = (minY - oy) / dy;
      let t2 = (maxY - oy) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (tmin > 0.01 && tmin < best) best = tmin;
  }
  return best;
}

/** Fill the watcher's vision cone, ray-cast around walls and desks. */
function drawCone(ctx, x, y, angle, halfAngle, range, colour) {
  const rays = 26;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i += 1) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const hit = rayDistance(x, y, dx, dy);
    const length = Math.min(range, hit === Infinity ? range : hit);
    ctx.lineTo(x + dx * length, y + dy * length);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLoot(ctx, item, time) {
  const bob = Math.sin(time * 2 + item.x) * 2;
  if (item.kind === 'diamond') {
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.fillStyle = PALETTE.diamond;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(12, -4);
    ctx.lineTo(8, 12);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-12, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (item.kind === 'gold') {
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, item.x - 12, item.y - 7 + bob, 24, 14, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(item.x - 12, item.y + 2 + bob, 24, 5);
    return;
  }
  // Painting: a framed canvas on the wall line.
  ctx.fillStyle = '#7a5c2e';
  ctx.fillRect(item.x - 16, item.y - 12 + bob, 32, 24);
  ctx.fillStyle = PALETTE.painting;
  ctx.fillRect(item.x - 12, item.y - 8 + bob, 24, 16);
  ctx.fillStyle = '#e8d8b0';
  ctx.fillRect(item.x - 4, item.y - 4 + bob, 8, 8);
}

/** Draw the whole frame for the given screen over the world state. */
export function drawWorld(ctx, state, screen, best) {
  const { width, height } = FIELD;
  const time = state.time;

  // --- floor ---------------------------------------------------------------
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = PALETTE.floorBand;
  for (const band of FLOOR_BANDS) ctx.fillRect(band.x, band.y, band.w, band.h);
  // Vault room floor, a shade darker.
  ctx.fillStyle = PALETTE.vaultFloor;
  ctx.fillRect(906, 50, 350, 250);
  // Marble tile lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 24; x < width; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, 696); ctx.stroke();
  }
  for (let y = 24; y < height; y += 80) {
    ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(1256, y); ctx.stroke();
  }

  // --- shadows, exit, vault door, power box --------------------------------
  ctx.fillStyle = PALETTE.shadow;
  for (const s of SHADOWS) {
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(180,190,220,0.25)';
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }
  const exitPulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.fillStyle = PALETTE.exit;
  ctx.globalAlpha = 0.25 + 0.2 * exitPulse;
  ctx.fillRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE.exitGlow;
  ctx.lineWidth = 3;
  ctx.strokeRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h);
  ctx.fillStyle = PALETTE.exitGlow;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 5);

  // Vault door: shut steel with a dial, or open dark gap once cracked.
  if (state.vaultOpen) {
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(VAULT_DOOR.x, VAULT_DOOR.y, VAULT_DOOR.w, VAULT_DOOR.h);
  } else {
    ctx.fillStyle = PALETTE.vaultDoor;
    ctx.fillRect(VAULT_DOOR.x, VAULT_DOOR.y, VAULT_DOOR.w, VAULT_DOOR.h);
    ctx.fillStyle = '#3a3220';
    ctx.beginPath();
    ctx.arc(VAULT_DOOR.x + VAULT_DOOR.w / 2, VAULT_DOOR.y + VAULT_DOOR.h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
    if (state.crackProgress > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(VAULT_DOOR.x, VAULT_DOOR.y - 10, VAULT_DOOR.w, 5);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(VAULT_DOOR.x, VAULT_DOOR.y - 10,
        VAULT_DOOR.w * (state.crackProgress / 3), 5);
    }
  }

  // Power box on the wall by the vault approach.
  ctx.fillStyle = state.time > state.powerOffUntil ? '#3f7a4a' : '#7a3f3f';
  ctx.fillRect(POWER_BOX.x, POWER_BOX.y, POWER_BOX.w, POWER_BOX.h);
  ctx.strokeStyle = '#d8d4c8';
  ctx.lineWidth = 2;
  ctx.strokeRect(POWER_BOX.x, POWER_BOX.y, POWER_BOX.w, POWER_BOX.h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('⚡', POWER_BOX.x + POWER_BOX.w / 2, POWER_BOX.y + POWER_BOX.h / 2 + 6);
  if (state.powerProgress > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(POWER_BOX.x, POWER_BOX.y - 10, POWER_BOX.w, 5);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(POWER_BOX.x, POWER_BOX.y - 10, POWER_BOX.w * (state.powerProgress / 2), 5);
  }

  // --- desks and walls ------------------------------------------------------
  for (const desk of DESKS) {
    ctx.fillStyle = PALETTE.desk;
    ctx.fillRect(desk.x, desk.y, desk.w, desk.h);
    ctx.fillStyle = PALETTE.deskTop;
    ctx.fillRect(desk.x + 4, desk.y + 4, desk.w - 8, desk.h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(desk.x + 10, desk.y + 8, 26, 12);
  }
  for (const wall of WALLS) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = PALETTE.wallTop;
    if (wall.h <= 26) ctx.fillRect(wall.x, wall.y, wall.w, 4);
    else ctx.fillRect(wall.x, wall.y, 4, wall.h);
  }

  // --- lasers ---------------------------------------------------------------
  const powered = state.time > state.powerOffUntil;
  for (const beam of LASERS) {
    ctx.strokeStyle = powered ? PALETTE.laser : 'rgba(120,120,130,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash(powered ? [10, 6] : []);
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (powered) {
      const flicker = 0.5 + 0.5 * Math.sin(time * 8 + beam.y1);
      ctx.fillStyle = `rgba(255,59,78,${0.25 + 0.35 * flicker})`;
      ctx.beginPath();
      ctx.arc(beam.x1, beam.y1, 4, 0, Math.PI * 2);
      ctx.arc(beam.x2, beam.y2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- loot -----------------------------------------------------------------
  for (const item of state.loot) {
    if (item.active) drawLoot(ctx, item, time);
  }
  if (state.coin) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(state.coin.x, state.coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // --- camera cones, then cameras ------------------------------------------
  for (const camera of state.cameras) {
    if (powered) {
      drawCone(ctx, camera.x, camera.y, camera.angle, 0.34, camera.range,
        state.seeingCamera === camera ? PALETTE.coneAlarm : PALETTE.coneCamera);
    }
  }
  for (const camera of state.cameras) {
    ctx.fillStyle = powered ? '#2c4a66' : '#3a3a44';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = powered ? '#9ec8f0' : '#666';
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5,
      4, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- guard cones, then guards --------------------------------------------
  for (const guard of state.guards) {
    const colour = state.alarmTime > 0 || guard.suspicion >= 1
      ? PALETTE.coneAlarm
      : guard.suspicion >= GUARD.stareThreshold ? PALETTE.coneWary : PALETTE.coneCalm;
    drawCone(ctx, guard.x, guard.y, guard.angle, GUARD.viewHalfAngle,
      GUARD.viewDistance, colour);
  }
  for (const guard of state.guards) {
    ctx.fillStyle = guard.colour;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1a26';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle) * 6, guard.y + Math.sin(guard.angle) * 6,
      6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guard.name[0], guard.x, guard.y - guard.radius - 6);
    if (state.alarmTime > 0) {
      ctx.fillStyle = '#ff3b4e';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('!', guard.x, guard.y - guard.radius - 20);
    } else if (guard.suspicion >= GUARD.stareThreshold) {
      ctx.fillStyle = '#ffd24a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('?', guard.x, guard.y - guard.radius - 20);
    }
    if (guard.suspicion > 0.05 && guard.suspicion < 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(guard.x - 16, guard.y + guard.radius + 6, 32, 5);
      ctx.fillStyle = guard.suspicion >= GUARD.stareThreshold ? '#ffd24a' : '#e8b04b';
      ctx.fillRect(guard.x - 16, guard.y + guard.radius + 6, 32 * guard.suspicion, 5);
    }
  }

  // --- the thief ------------------------------------------------------------
  const player = state.player;
  const blink = player.invulnerable > 0 && Math.floor(time * 10) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1a26';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Mask + facing tick.
    ctx.fillStyle = '#1c1a26';
    ctx.beginPath();
    ctx.arc(player.x + player.dirX * 6, player.y + player.dirY * 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e4d8';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('YOU', player.x, player.y - player.radius - 6);
    if (player.dashTime > 0) {
      ctx.strokeStyle = 'rgba(232,228,216,0.6)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawHud(ctx, state, best);

  if (screen === SCREEN_TITLE) drawTitle(ctx, state);
  if (screen === SCREEN_WIN) drawEnd(ctx, state, true, best);
  if (screen === SCREEN_OVER) drawEnd(ctx, state, false, best);
}

/** The top bar: alarm meter, loot, lives, coins, timer, objective. */
function drawHud(ctx, state, best) {
  ctx.fillStyle = 'rgba(10, 8, 18, 0.72)';
  ctx.fillRect(0, 0, FIELD.width, 44);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText('VAULTBREAK', 16, 29);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('The Meridian Job', 150, 29);

  // Alarm meter.
  const alarmX = 330;
  ctx.fillStyle = state.alarmTime > 0 ? '#ff3b4e' : PALETTE.hudDim;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(state.alarmTime > 0
    ? `ALARM! ${Math.ceil(state.alarmTime)}s` : 'ALARM', alarmX, 29);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(alarmX + 92, 16, 150, 14);
  ctx.fillStyle = state.alarm > 0.66 || state.alarmTime > 0 ? '#ff3b4e'
    : state.alarm > 0.33 ? '#ffd24a' : '#37d67a';
  const alarmFill = state.alarmTime > 0 ? 1 : state.alarm;
  ctx.fillRect(alarmX + 92, 16, 150 * alarmFill, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(alarmX + 92, 16, 150, 14);

  // Loot, lives, coins, timer.
  const lifted = LOOT.filter((l) => !state.loot.find((i) => i.id === l.id)?.active).length;
  ctx.fillStyle = PALETTE.hud;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`LOOT $${state.score.toLocaleString('en-US')}  ${lifted}/${LOOT.length}`,
    620, 29);
  ctx.fillStyle = '#ff6b7a';
  ctx.fillText('♥'.repeat(Math.max(0, state.lives)), 880, 29);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`◉ ${state.coins}`, 960, 29);
  ctx.fillStyle = PALETTE.hud;
  ctx.fillText(`${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`,
    1040, 29);

  // Objective, centred along the bottom where it always fits.
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  const objective = state.vaultOpen
    ? 'Lift the diamond, then reach the EXIT'
    : 'Hold E at the vault door to crack it';
  ctx.fillText(objective, FIELD.width / 2, FIELD.height - 12);
  ctx.textAlign = 'left';

  // Best score, small, bottom right.
  if (best > 0) {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`BEST $${best.toLocaleString('en-US')}`, FIELD.width - 12, FIELD.height - 10);
    ctx.textAlign = 'left';
  }
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(8, 6, 16, 0.78)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('VAULTBREAK', FIELD.width / 2, 200);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '22px sans-serif';
  ctx.fillText('The Meridian Job — one night, one vault, one diamond', FIELD.width / 2, 244);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  const lines = [
    'WASD / arrows — move      Shift — sneak      Space — dash',
    'Hold E — crack the vault / cut the power      Click — toss a coin to distract a guard',
    'Guards and cameras fill the ALARM meter when they see you. Lasers too.',
    'Lift the Meridian Diamond, then slip out the EXIT. Three lives. No second night.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 310 + i * 30));
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(state.time > 0 ? 'Press Space or click to play' : 'Press Space or click to play',
    FIELD.width / 2, 480);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, state, won, best) {
  ctx.fillStyle = won ? 'rgba(8, 20, 12, 0.8)' : 'rgba(20, 6, 10, 0.8)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? PALETTE.exitGlow : '#ff6b7a';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(won ? 'CLEAN GETAWAY' : 'CAUGHT!', FIELD.width / 2, 260);
  ctx.fillStyle = PALETTE.hud;
  ctx.font = '22px sans-serif';
  ctx.fillText(won
    ? `The Meridian Diamond is yours — $${state.score.toLocaleString('en-US')} in one night.`
    : `The crew left you behind — $${state.score.toLocaleString('en-US')} lifted, ${state.lives} lives left.`,
  FIELD.width / 2, 310);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '17px sans-serif';
  ctx.fillText(`Time ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}   •   Best $${Math.max(best, state.score).toLocaleString('en-US')}`,
    FIELD.width / 2, 350);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press Space, click, or R to run it again', FIELD.width / 2, 420);
  ctx.textAlign = 'left';
}
