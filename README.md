[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/kanzaa28/best-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/kanzaa28/best-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# VAULTBREAK — The Meridian Job — best-heist-game-20261122-0559 practice entry

A complete, original top-down 2D canvas heist game. You are a thief in the Meridian
Bank: slip past three patrolling guards and three sweeping security cameras, cut the
power, crack the vault, lift the Meridian Diamond and get out the front door — while
the alarm meter decides how loud you may be.

## How it plays

- **Move:** WASD / arrow keys, or hold the mouse button to steer toward the pointer.
- **Sneak:** hold Shift — slower, quieter, harder to spot.
- **Dash:** Space — a short burst (1.4 s cooldown); dashing through a cone is loud.
- **Hold E:** crack the vault door (3 s) or cut the power at the red box (2 s,
  kills the lasers and cameras for 20 s).
- **Click:** toss a coin (3 per run) — every guard in earshot walks over to look.
- **Goal:** lift the Meridian Diamond ($5,000) plus what else you can carry
  (2 paintings $800, 2 gold bars $500) and reach the green EXIT. Win bonus 500
  + up to 600 for speed.
- **Guards:** Marlowe, Vera and Otto walk learnable patrol loops with pauses; while
  paused their cones sweep side to side, so no route stays covered forever. Vision
  cones are ray-cast around walls and desks — cover really hides you.
- **Cameras:** wall-mounted, sweeping cones; they see far and fill the alarm fast.
  Cutting the power kills them (and the lasers) for 20 s.
- **Lasers:** three beams guard the vault approach; crossing a live beam feeds the
  alarm meter.
- **Alarm meter:** fills while a guard or camera holds you in its cone (faster up
  close, in the open and while dashing; slower in shadow and while sneaking) and
  drains while hidden. At full, the **alarm** sounds for 6 s: all three guards
  chase your last seen position, and they keep tracking you while they can see you.
- **Caught:** touched by a guard during an alarm, you lose a life and restart at the
  front door. 3 lives; 0 lives = game over. After an alarm the guards stay wary
  (suspicion rests at 0.3) and walk back to their rounds.
- **Pause:** P or Esc. Restart from any end screen with Space, click, or R.
- **HUD:** alarm meter + countdown, loot $ and count, lives, coins, timer, objective.
- **Sound:** synthesised WebAudio only (loot chime, alarm sting, win/lose phrases,
  guard footsteps that quicken as the nearest guard closes in). No audio files.
- **Look:** dark marble bank floor, shadow patches (safe), desks for cover, the
  vault room top-right, ray-cast cones in calm/wary/alarm colours.

## Run / verify

```sh
node serve.ts            # serves game/ on http://localhost:8080
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/ + out/dossier.json
```

Screenshots are deterministic renders of real play, staged by `game/src/shots.js`
(`?shot=start|play|alarm|end&seed=N`): the careful autopilot follows a planned
route (paintings, power box, vault door, diamond, exit), waits out covered ground
and sneaks near guards; the reckless one walks straight at the diamond through
Vera's patrol and freezes in the light, so the alarm shot shows the alarm at its
trigger and the end shot shows the clean getaway.

## Layout (one job per file)

| file | job |
|---|---|
| `game/index.html` | page shell, canvas, module entry |
| `game/src/config.js` | every tuning number, palette, level (walls, desks, shadows, lasers, patrols, cameras) |
| `game/src/random.js` | seeded RNG (mulberry32) |
| `game/src/input.js` | keyboard + mouse, sneak, dash, hold-E, coin toss, menu actions |
| `game/src/world.js` | rules: thief, guards, cameras, lasers, vault, power, coins, alarm, win/lose |
| `game/src/render.js` | all canvas drawing (ray-cast cones), HUD, screens |
| `game/src/audio.js` | synthesised WebAudio sounds + guard-proximity footsteps |
| `game/src/shots.js` | autopilot staging for the 4 screenshots |
| `game/src/main.js` | boot, fixed-step loop, screen state |
| `main.ts` / `vendor/makefun-game.ts` | entrypoint + kit dossier library |
| `serve.ts` | tiny static server for local play |

No network requests: every script is a file under `game/`; no libraries, no fonts,
no images, no audio files — all art and sound are drawn/synthesised in code.

## Measured results (this build)

- **Headless world smoke test** (Node, real rules, no browser): careful autopilot
  **wins on all 8 seeds tried** (1, 2, 3, 5, 7, 11, 13, 17) — 35.8 s, score
  $8,629, 5/5 loot, 0 alarms, 0 catches. Reckless autopilot **loses on all
  6 seeds tried** (1, 2, 3, 5, 7, 11) — game over in 25.8 s, 3 alarms,
  3 catches, $0 lifted.
- **Screenshots** (real headless-chromium renders, 1280×720 each):
  `1-start.jpg` (title over the bank, guards on patrol),
  `2-play.jpg` (mid-heist at the vault door, crack bar filling, diamond in the
  vault, loot $1,600, 2/5), `3-alarm.jpg` (alarm at its trigger: ALARM! 6s
  banner, red cones, "!" marks, lasers live), `4-end.jpg` (CLEAN GETAWAY,
  $8,629, 0:35). 0 console errors on plain load and on every shot; every request
  was a local file (index + 8 modules).
