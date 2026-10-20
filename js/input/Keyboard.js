const pressedKeys = new Set();

window.addEventListener('keydown', (event) => {
  pressedKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener('blur', () => {
  pressedKeys.clear();
});

export function isKeyDown(code) {
  return pressedKeys.has(code);
}

export function releaseAllKeys() {
  pressedKeys.clear();
}
