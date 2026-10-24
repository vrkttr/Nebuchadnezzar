export const VIEW_DISTANCES = [
  { near: 30, far: 90, cameraFar: 1000, shadowMap: 1024, shadowRange: 32 },
  { near: 55, far: 170, cameraFar: 1000, shadowMap: 1024, shadowRange: 40 },
  { near: 90, far: 320, cameraFar: 1000, shadowMap: 2048, shadowRange: 48 },
  { near: 170, far: 620, cameraFar: 1000, shadowMap: 2048, shadowRange: 56 },
];

export const DEFAULTS = {
  shadows: true,
  lights: true,
  flicker: true,
  daynight: true,
  clouds: true,
  haze: true,
  puddles: true,
  wind: true,
  birds: true,
  insects: true,
  dust: true,
  debris: true,
  fire: true,
  smoke: true,
  viewDistance: 2,
};

export const graphics = { ...DEFAULTS };

export function applyGraphics(data) {
  if (!data || typeof data !== 'object') return;
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof DEFAULTS[key] === 'boolean' && typeof data[key] === 'boolean') graphics[key] = data[key];
    if (typeof DEFAULTS[key] === 'number' && Number.isInteger(data[key])) graphics[key] = Math.max(0, Math.min(VIEW_DISTANCES.length - 1, data[key]));
  }
}
