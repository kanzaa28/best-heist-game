// Keyboard + mouse input: WASD / arrows to move, Shift to sneak, Space to dash,
// E (hold) to crack the vault or cut the power, click to toss a coin that pulls a
// guard's attention, P / Esc to pause, R to restart, Space / click to restart from
// an end screen. Mouse steering (hold the button, the thief walks to the pointer)
// works alongside the keys.

/** Read the live input state into one small object the world steps with. */
export function createInput(canvas) {
  const keys = new Set();
  const state = {
    move: { x: 0, y: 0 },
    sneak: false,
    dash: false,
    interact: false,
    coinTarget: null,
    pausePressed: false,
    restartPressed: false,
    mouse: { x: 0, y: 0, down: false },
  };

  function refreshMove() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x === 0 && y === 0 && state.mouse.down) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = 1280 / rect.width;
      const scaleY = 720 / rect.height;
      const tx = (state.mouse.x - rect.left) * scaleX;
      const ty = (state.mouse.y - rect.top) * scaleY;
      const dx = tx - 640;
      const dy = ty - 360;
      const length = Math.hypot(dx, dy);
      if (length > 40) {
        x = dx / length;
        y = dy / length;
      }
    }
    const length = Math.hypot(x, y);
    state.move.x = length > 0 ? x / length : 0;
    state.move.y = length > 0 ? y / length : 0;
    state.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
    state.interact = keys.has('KeyE');
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space') state.dash = true;
    if (event.code === 'KeyP' || event.code === 'Escape') state.pausePressed = true;
    if (event.code === 'KeyR') state.restartPressed = true;
    refreshMove();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    refreshMove();
  });
  canvas.addEventListener('mousemove', (event) => {
    state.mouse.x = event.clientX;
    state.mouse.y = event.clientY;
    refreshMove();
  });
  canvas.addEventListener('mousedown', (event) => {
    state.mouse.x = event.clientX;
    state.mouse.y = event.clientY;
    state.mouse.down = true;
    // A click (not a hold) tosses a coin at the pointer; a hold steers instead.
    state.coinTarget = { x: event.clientX, y: event.clientY, fresh: true };
    refreshMove();
  });
  window.addEventListener('mouseup', () => {
    state.mouse.down = false;
    refreshMove();
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    state,
    /** Clear one-shot flags after the world has read them. */
    consume() {
      state.dash = false;
      state.pausePressed = false;
      state.restartPressed = false;
      if (state.coinTarget) state.coinTarget.fresh = false;
    },
  };
}
