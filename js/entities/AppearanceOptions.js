import { APPEARANCES } from './Appearances.js';

export const APPEARANCE_OPTIONS = {
  skin: [0xd9b394, 0xefd2b8, 0xc79b7c, 0xa87c5c, 0x7a5640, 0x4f3626],
  hairStyle: ['short', 'bald', 'long', 'bandana', 'cap'],
  hairColor: [0x3a2c22, 0x16120e, 0x6a4a2c, 0xb89a5a, 0x7a3a1e, 0x8a8a84],
  top: [0x4f6272, 0x5a6a3c, 0x7a4a3a, 0x7a6a4a, 0x5a5a58, 0x4a3a2c],
  pants: [0x3c3a34, 0x2e2c28, 0x4a4234, 0x3a4452],
};

export const APPEARANCE_KEYS = ['skin', 'hairStyle', 'hairColor', 'top', 'pants'];

const HEADWEAR_COLORS = { bandana: 0x7a2a20, cap: 0x4a4234 };

function pick(list, index) {
  const number = Number(index);
  return list[Number.isInteger(number) && number >= 0 && number < list.length ? number : 0];
}

export function buildPlayerAppearance(indices, base = APPEARANCES.player) {
  const values = Array.isArray(indices) ? indices : [];
  const hairStyle = pick(APPEARANCE_OPTIONS.hairStyle, values[1]);

  return {
    ...base,
    skin: pick(APPEARANCE_OPTIONS.skin, values[0]),
    hairStyle,
    hair: pick(APPEARANCE_OPTIONS.hairColor, values[2]),
    hairColor: HEADWEAR_COLORS[hairStyle],
    top: pick(APPEARANCE_OPTIONS.top, values[3]),
    pants: pick(APPEARANCE_OPTIONS.pants, values[4]),
  };
}
