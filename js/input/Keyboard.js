const pressedKeys = new Set();

window.addEventListener('keydown', (event) => {
  pressedKeys.add(event.code);
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code);
});

/**
 * Gibt zurück, ob eine bestimmte Taste (per KeyboardEvent.code,
 * z.B. 'KeyW', 'Space') aktuell gedrückt gehalten wird.
 */
export function isKeyDown(code) {
  return pressedKeys.has(code);
}
