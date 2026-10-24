const MUSIC_PATH = 'assets/audio/menu_theme.ogg';
const ENABLED_KEY = 'menuMusic';
const FADE_MS = 700;

function readEnabled() {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'off';
  } catch {
    return true;
  }
}

function writeEnabled(value) {
  try {
    localStorage.setItem(ENABLED_KEY, value ? 'on' : 'off');
  } catch {
    return;
  }
}

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

export function createMenuMusic(initialVolume = 0.4) {
  const audio = new Audio(MUSIC_PATH);
  audio.loop = true;
  audio.preload = 'auto';
  let volume = clamp(initialVolume);
  let enabled = readEnabled();
  let stopped = false;
  let fadeTimer = null;
  const listeners = new Set();

  audio.volume = volume;

  function removeGestureListeners() {
    window.removeEventListener('pointerdown', start, true);
    window.removeEventListener('keydown', start, true);
  }

  function start() {
    if (stopped || !enabled || !audio.paused) return;
    audio.play().then(removeGestureListeners).catch(() => {});
  }

  window.addEventListener('pointerdown', start, true);
  window.addEventListener('keydown', start, true);
  start();

  return {
    isEnabled: () => enabled,
    onChange(listener) {
      listeners.add(listener);
    },
    setVolume(value) {
      volume = clamp(value);
      audio.volume = volume;
    },
    toggle() {
      enabled = !enabled;
      writeEnabled(enabled);
      if (enabled) {
        start();
      } else {
        audio.pause();
      }
      for (const listener of listeners) listener(enabled);
      return enabled;
    },
    stop() {
      stopped = true;
      removeGestureListeners();
      clearInterval(fadeTimer);
      const steps = 14;
      let step = 0;
      const from = audio.volume;
      fadeTimer = setInterval(() => {
        step += 1;
        audio.volume = Math.max(0, from * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fadeTimer);
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        }
      }, FADE_MS / steps);
    },
  };
}
