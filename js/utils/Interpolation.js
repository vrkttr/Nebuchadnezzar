export function dampFactor(smoothing, delta) {
  return 1 - Math.exp(-smoothing * delta);
}

export function lerpAngle(current, target, factor) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * factor;
}
