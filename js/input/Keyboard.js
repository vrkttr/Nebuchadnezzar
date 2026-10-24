const pressedKeys = new Set();

const ALLOWED_CTRL_KEYS = new Set(['KeyR', 'F5', 'F12']);
const ALLOWED_CTRL_SHIFT_KEYS = new Set(['KeyR', 'KeyI', 'KeyJ', 'KeyC']);
const BLOCKED_FUNCTION_KEYS = new Set(['F1', 'F3', 'F6', 'F7']);
const LOCKED_KEYS = ['KeyW', 'KeyT', 'KeyN', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];

let leaving = false;
let autoFullscreen = null;

function isTextField(target) {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }

  enterFullscreen();
}

export function enterFullscreen() {
  if (document.fullscreenElement) return;

  document.documentElement
    .requestFullscreen()
    .then(() => navigator.keyboard?.lock?.(LOCKED_KEYS))
    .catch(() => {});
}

function onAutoFullscreenGesture(event) {
  if (event.code === 'Escape' || event.code === 'F11') return;
  disarmAutoFullscreen();
  enterFullscreen();
}

function disarmAutoFullscreen() {
  window.removeEventListener('mousedown', onAutoFullscreenGesture, true);
  window.removeEventListener('keydown', onAutoFullscreenGesture, true);
  window.removeEventListener('touchend', onAutoFullscreenGesture, true);
}

export function setAutoFullscreen(enabled) {
  const value = enabled === true;
  if (value === autoFullscreen) return;
  autoFullscreen = value;

  if (!value) {
    disarmAutoFullscreen();
    return;
  }

  if (document.fullscreenElement) return;
  window.addEventListener('mousedown', onAutoFullscreenGesture, true);
  window.addEventListener('keydown', onAutoFullscreenGesture, true);
  window.addEventListener('touchend', onAutoFullscreenGesture, true);
}

function shouldBlock(event) {
  if (BLOCKED_FUNCTION_KEYS.has(event.code)) return true;
  if (event.altKey && !event.ctrlKey) return true;
  if (!event.ctrlKey && !event.metaKey) return false;

  if (isTextField(event.target) && ['KeyA', 'KeyC', 'KeyV', 'KeyX', 'KeyZ', 'KeyY'].includes(event.code)) return false;
  if (event.shiftKey) return !ALLOWED_CTRL_SHIFT_KEYS.has(event.code);
  return !ALLOWED_CTRL_KEYS.has(event.code) && !/^Control|^Meta|^Shift/.test(event.code);
}

window.addEventListener(
  'keydown',
  (event) => {
    if (event.code === 'F11') {
      event.preventDefault();
      if (!event.repeat) toggleFullscreen();
      return;
    }

    if (shouldBlock(event)) event.preventDefault();
  },
  true
);

window.addEventListener('keydown', (event) => {
  if (isTextField(event.target) && event.code !== 'Escape') return;
  pressedKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener('blur', () => {
  pressedKeys.clear();
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) navigator.keyboard?.unlock?.();
});

window.addEventListener('beforeunload', (event) => {
  if (leaving) return;
  event.preventDefault();
  event.returnValue = '';
});

export function allowLeave() {
  leaving = true;
}

export function setLeaveGuard(enabled) {
  leaving = !enabled;
}

export function isKeyDown(code) {
  return pressedKeys.has(code);
}

export function releaseAllKeys() {
  pressedKeys.clear();
}
