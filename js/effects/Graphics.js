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
};

export const graphics = { ...DEFAULTS };

export function applyGraphics(data) {
  if (!data || typeof data !== 'object') return;
  for (const key of Object.keys(DEFAULTS)) {
    if (typeof data[key] === 'boolean') graphics[key] = data[key];
  }
}
