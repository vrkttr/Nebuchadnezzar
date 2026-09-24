const pressedKeys = new Set();

window.addEventListener('keydown', (event) => {
  pressedKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

export function isKeyDown(code) {
  return pressedKeys.has(code);
}
