export const APPEARANCES = {
  player: {
    skin: 0xd9b394,
    hair: 0x3a2c22,
    hairStyle: 'short',
    top: 0x4f6272,
    pants: 0x3c3a34,
    shoes: 0x2a2620,
    sleeves: 'long',
    backpack: 'small',
    backpackColor: 0x5a4a34,
  },
  remote: {
    skin: 0xc79b7c,
    hair: 0x2a2018,
    hairStyle: 'short',
    top: 0x7a4a3a,
    pants: 0x3c3a34,
    shoes: 0x2a2620,
    sleeves: 'long',
    backpack: 'small',
    backpackColor: 0x4a4a34,
  },
  streuner: {
    skin: 0xcaa488,
    hair: 0x5a5448,
    hairStyle: 'hood',
    hairColor: 0x5a5240,
    top: 0x5a5240,
    pants: 0x3a382e,
    shoes: 0x2a2620,
    sleeves: 'long',
    scarf: 0x8a6a3a,
    backpack: 'small',
    backpackColor: 0x44402e,
  },
  haendler: {
    skin: 0xd1ab8c,
    hair: 0x6a6258,
    hairStyle: 'cap',
    hairColor: 0x4a5a3a,
    top: 0x4a5a3a,
    pants: 0x4a4234,
    shoes: 0x2a2620,
    sleeves: 'short',
    backpack: 'big',
    backpackColor: 0x6a5436,
    scale: 1,
  },
  raider: {
    skin: 0xbf9478,
    hair: 0x1c1814,
    hairStyle: 'bandana',
    hairColor: 0x7a2a20,
    top: 0x6a2a20,
    pants: 0x2e2c28,
    shoes: 0x1e1a16,
    sleeves: 'long',
    mask: 0x1c1a18,
    equipment: { weapon: 'rusty_pipe' },
  },
};

const RAIDER_TOPS = [0x6a2a20, 0x5a3a24, 0x4a2a3a];

export function resolveAppearance(name, variant = 0) {
  const base = APPEARANCES[name] ?? APPEARANCES.player;

  if (name === 'raider') {
    return { ...base, top: RAIDER_TOPS[Math.abs(variant) % RAIDER_TOPS.length] };
  }

  return base;
}
