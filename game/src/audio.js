// Synthesised WebAudio sounds only — no audio files. A loot chime, an alarm sting,
// a win phrase and a lose phrase, plus guard footstep thuds that quicken as the
// nearest guard closes in. Everything is lazy: the context is created on the first
// user gesture, and every call is safe when audio is unavailable.

let context = null;
let master = null;

function ensureContext() {
  if (context) return true;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.12;
    master.connect(context.destination);
    return true;
  } catch {
    return false;
  }
}

function tone(frequency, seconds, type, when, slideTo) {
  if (!ensureContext() || context.state === 'suspended') return;
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, context.currentTime + when);
    if (slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(slideTo, context.currentTime + when + seconds);
    }
    gain.gain.setValueAtTime(0.9, context.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + when + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(context.currentTime + when);
    oscillator.stop(context.currentTime + when + seconds + 0.02);
  } catch {
    // Sound is decoration; a failure never stops the game.
  }
}

export function unlockAudio() {
  ensureContext();
  if (context && context.state === 'suspended') context.resume().catch(() => {});
}

export function playLoot() {
  tone(880, 0.12, 'sine', 0);
  tone(1318, 0.18, 'sine', 0.09);
}

export function playAlarm() {
  tone(220, 0.25, 'square', 0, 440);
  tone(220, 0.25, 'square', 0.28, 440);
}

export function playCaught() {
  tone(330, 0.3, 'sawtooth', 0, 110);
}

export function playWin() {
  [523, 659, 784, 1046].forEach((frequency, i) => tone(frequency, 0.22, 'sine', i * 0.11));
}

export function playOver() {
  [392, 330, 262, 196].forEach((frequency, i) => tone(frequency, 0.25, 'triangle', i * 0.14));
}

/** A soft thud for a guard footstep; the caller paces it by distance. */
export function playFootstep() {
  tone(70, 0.09, 'sine', 0);
}
