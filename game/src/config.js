// Every tuning number, colour and the whole level layout for VAULTBREAK, in one
// place. The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size. One level, one job: slip
// into the Meridian Bank, crack the vault, lift the Meridian Diamond and get out
// through the front door — past three patrolling guards, three sweeping security
// cameras and a laser grid, while the alarm meter decides how loud you may be.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  sneakSpeed: 98,
  dashSpeed: 560,
  dashTime: 0.16,
  dashCooldown: 1.4,
  invulnerableAfterCaught: 2.5,
};

export const LIVES = 3;
export const COINS = 3;
/** The diamond is the job: the exit only counts once it is lifted. */
export const WIN_LOOT = 'diamond';

/** A wall is an axis-aligned rectangle: { x, y, w, h }. Walls block both movement
 *  and sight; the border walls frame the bank. The vault room (top right) is walled
 *  off except for its door gap at the bottom. */
export const WALLS = [
  { x: 0, y: 0, w: 1280, h: 24 },
  { x: 0, y: 696, w: 1280, h: 24 },
  { x: 0, y: 0, w: 24, h: 720 },
  { x: 1256, y: 0, w: 24, h: 720 },
  // Vault room: top-right enclosure, door gap at its bottom wall (x 1000..1060).
  { x: 880, y: 24, w: 376, h: 26 },
  { x: 880, y: 50, w: 26, h: 250 },
  { x: 880, y: 300, w: 120, h: 26 },
  { x: 1060, y: 300, w: 196, h: 26 },
  // Hall dividers that make cover and sight-lines.
  { x: 300, y: 170, w: 26, h: 180 },
  { x: 420, y: 470, w: 300, h: 26 },
  { x: 560, y: 120, w: 26, h: 170 },
  { x: 760, y: 420, w: 26, h: 180 },
  { x: 980, y: 470, w: 26, h: 150 },
];

/** Desks are low cover: they block movement and sight, and read as cover at a glance. */
export const DESKS = [
  { x: 180, y: 240, w: 90, h: 40 },
  { x: 380, y: 300, w: 90, h: 40 },
  { x: 620, y: 200, w: 90, h: 40 },
  { x: 620, y: 560, w: 90, h: 40 },
  { x: 980, y: 560, w: 90, h: 40 },
  { x: 1120, y: 420, w: 90, h: 40 },
];

/** Shadow patches: standing in one makes you harder to spot (alarm fills slower). */
export const SHADOWS = [
  { x: 60, y: 420, w: 220, h: 200 },
  { x: 340, y: 560, w: 200, h: 110 },
  { x: 640, y: 60, w: 200, h: 110 },
  { x: 900, y: 360, w: 160, h: 100 },
];

/** Marble floor bands, purely visual. */
export const FLOOR_BANDS = [
  { x: 24, y: 24, w: 1232, h: 60 },
  { x: 24, y: 360, w: 832, h: 60 },
];

/** The vault door: hold E beside it to crack it open (one way in). */
export const VAULT_DOOR = { x: 1000, y: 300, w: 60, h: 26, crackSeconds: 3 };
/** The power box: hold E beside it to kill the lasers and cameras for a while. */
export const POWER_BOX = { x: 920, y: 330, w: 34, h: 34, holdSeconds: 2, offSeconds: 20 };
/** The laser grid: three beams across the vault approach, live while powered. */
export const LASERS = [
  { x1: 900, y1: 380, x2: 1180, y2: 380 },
  { x1: 900, y1: 430, x2: 1180, y2: 430 },
  { x1: 900, y1: 480, x2: 1180, y2: 480 },
];

/** Loot on the floor. value is dollars; the diamond is the job itself. */
export const LOOT = [
  { id: 'painting-blue', kind: 'painting', name: 'Blue Madonna', value: 800, x: 120, y: 120 },
  { id: 'painting-gold', kind: 'painting', name: 'Gilded Sun', value: 800, x: 700, y: 90 },
  { id: 'gold-hall', kind: 'gold', name: 'Gold bar', value: 500, x: 500, y: 620 },
  { id: 'gold-vault', kind: 'gold', name: 'Gold bar', value: 500, x: 1150, y: 120 },
  { id: 'diamond', kind: 'diamond', name: 'Meridian Diamond', value: 5000, x: 1070, y: 130 },
];

/** Entry / exit: the front door, bottom left. */
export const ENTRY = { x: 80, y: 640 };
export const EXIT = { x: 60, y: 620, w: 70, h: 76 };

/** Guards: patrol loops with a pause at each waypoint; while paused their cones
 *  sweep side to side, so no route stays covered forever. */
export const GUARDS = [
  {
    name: 'Marlowe', colour: '#e8b04b', x: 400, y: 200,
    waypoints: [
      { x: 400, y: 200, pause: 1.6 }, { x: 700, y: 200, pause: 1.6 },
      { x: 700, y: 420, pause: 1.6 }, { x: 400, y: 420, pause: 1.6 },
    ],
  },
  {
    name: 'Vera', colour: '#7fb3e8', x: 1000, y: 560,
    waypoints: [
      { x: 1000, y: 560, pause: 1.2 }, { x: 1180, y: 560, pause: 1.2 },
      { x: 1180, y: 360, pause: 1.2 }, { x: 1000, y: 360, pause: 1.2 },
    ],
  },
  {
    name: 'Otto', colour: '#a58ae8', x: 200, y: 500,
    waypoints: [
      { x: 200, y: 500, pause: 2.0 }, { x: 200, y: 120, pause: 2.0 },
      { x: 480, y: 120, pause: 2.0 }, { x: 480, y: 500, pause: 2.0 },
    ],
  },
];

/** Security cameras: wall-mounted, sweeping cones. They cannot move, but they see
 *  far and raise the alarm fast. Cutting the power kills them for a while. */
export const CAMERAS = [
  { id: 'cam-a', x: 880, y: 60, baseAngle: Math.PI / 2, sweep: 0.9, range: 300 },
  { id: 'cam-b', x: 1256, y: 330, baseAngle: Math.PI, sweep: 0.7, range: 300 },
  { id: 'cam-c', x: 560, y: 696, baseAngle: -Math.PI / 2, sweep: 0.8, range: 280 },
];

export const GUARD = {
  radius: 15,
  patrolSpeed: 78,
  chaseSpeed: 205,
  viewDistance: 300,
  viewHalfAngle: 0.46,
  /** Suspicion per second while the thief is in the cone, at the reference range. */
  spotRate: 0.55,
  stareThreshold: 0.34,
  /** Seconds of full suspicion before the alarm trips. */
  alarmDelay: 0.9,
  /** Seconds a chase lasts once the alarm sounds. */
  alarmSeconds: 6,
  /** Suspicion resting level after an alarm, while guards walk back wary. */
  waryRest: 0.3,
};

export const CAMERA = {
  viewDistance: 300,
  viewHalfAngle: 0.34,
  spotRate: 0.75,
};

/** The alarm meter: 0..1. Fills while seen, drains while hidden. */
export const ALARM = {
  drainPerSecond: 0.12,
  laserRate: 0.5,
};

export const PALETTE = {
  floor: '#1c1a26',
  floorBand: '#211e2e',
  wall: '#3a3450',
  wallTop: '#4a4364',
  desk: '#5a4632',
  deskTop: '#6e573d',
  shadow: 'rgba(8, 8, 16, 0.55)',
  exit: '#2fae5f',
  exitGlow: '#37d67a',
  vaultFloor: '#241f33',
  vaultDoor: '#8a7a3a',
  laser: '#ff3b4e',
  gold: '#f2c14e',
  diamond: '#8fe8ff',
  painting: '#c98a4b',
  player: '#e8e4d8',
  playerSneak: '#b9c4a8',
  coneCalm: 'rgba(232, 176, 75, 0.20)',
  coneWary: 'rgba(232, 150, 60, 0.30)',
  coneAlarm: 'rgba(255, 59, 78, 0.34)',
  coneCamera: 'rgba(127, 179, 232, 0.22)',
  hud: '#e8e4d8',
  hudDim: '#9a94a8',
};
