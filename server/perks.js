export const PERK_KINDS = ['damage', 'speed'];
export const PERK_ICON_ITEM_TYPES = ['weapon'];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function parsePerk(value) {
  if (typeof value !== 'string') return null;

  const match = /^(damage|speed):(\d{1,2})$/.exec(value);
  return match ? { kind: match[1], value: Number(match[2]) } : null;
}

export function formatPerk(perk) {
  return perk ? `${perk.kind}:${perk.value}` : null;
}

export function rollPerk(level) {
  const kind = PERK_KINDS[randomInt(0, PERK_KINDS.length - 1)];
  return { kind, value: randomInt(3 + Math.floor(level * 0.1), 8 + Math.floor(level * 0.3)) };
}

export function forgeCost(item, hasPerk) {
  const base = Math.max(25, Math.round(item.value * 0.8));
  return hasPerk ? base * 2 : base;
}

export function perkMultipliers(perk) {
  const factor = perk ? 1 + perk.value / 100 : 1;
  return {
    damage: perk?.kind === 'damage' ? factor : 1,
    speed: perk?.kind === 'speed' ? factor : 1,
  };
}
