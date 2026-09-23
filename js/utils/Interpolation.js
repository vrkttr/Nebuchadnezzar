/**
 * Framerate-unabhängiger Dämpfungsfaktor für Lerp-Übergänge.
 * smoothing: höherer Wert = schnelleres Einlaufen auf das Ziel.
 */
export function dampFactor(smoothing, delta) {
  return 1 - Math.exp(-smoothing * delta);
}

/**
 * Interpoliert einen Winkel (in Radiant) auf dem kürzesten Weg,
 * damit z.B. ein Übergang von 179° auf -179° nicht einmal
 * komplett herumdreht.
 */
export function lerpAngle(current, target, factor) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * factor;
}
