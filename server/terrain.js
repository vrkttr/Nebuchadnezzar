import { getZone } from './zoneLoader.js';

export function groundHeight(zoneId, x, z) {
  const zone = getZone(zoneId);
  const heights = zone?.heights;
  if (!heights) return 0;
  const ix = Math.floor(x + zone.halfWidth);
  const iz = Math.floor(z + zone.halfHeight);
  if (ix < 0 || iz < 0 || ix >= zone.width || iz >= zone.height) return 0;
  return heights.cells[iz * zone.width + ix] * heights.unit;
}
