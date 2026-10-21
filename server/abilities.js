export const ABILITIES = {
  power_strike: {
    id: 'power_strike',
    kind: 'melee',
    slot: 1,
    unlockLevel: 1,
    name: 'Kraftschlag',
    shortName: 'KS',
    icon: 'power_strike',
    description: 'Ein wuchtiger Schlag mit voller Kraft.',
    range: 3,
    cost: 20,
    cooldown: 6,
    damageMultiplier: 2,
  },
  bandage_up: {
    id: 'bandage_up',
    kind: 'heal',
    slot: 2,
    unlockLevel: 2,
    name: 'Verbinden',
    shortName: 'VB',
    icon: 'bandage_up',
    description: 'Versorgt die eigenen Wunden und stellt Lebenspunkte wieder her.',
    range: 0,
    cost: 15,
    cooldown: 15,
    healPercent: 0.3,
  },
  aimed_shot: {
    id: 'aimed_shot',
    kind: 'ranged',
    slot: 3,
    unlockLevel: 3,
    name: 'Gezielter Schuss',
    shortName: 'GS',
    icon: 'aimed_shot',
    description: 'Ein sorgfältig gezielter Schuss. Benötigt eine Fernkampfwaffe und Munition.',
    range: 0,
    cost: 25,
    cooldown: 8,
    damageMultiplier: 2.2,
  },
  kick: {
    id: 'kick',
    kind: 'melee',
    slot: 4,
    unlockLevel: 4,
    name: 'Tritt',
    shortName: 'TR',
    icon: 'kick',
    description: 'Ein harter Tritt, der das Ziel kurz außer Gefecht setzt.',
    range: 3,
    cost: 15,
    cooldown: 20,
    damageMultiplier: 0.5,
    stunSeconds: 3,
  },
  second_wind: {
    id: 'second_wind',
    kind: 'resource',
    slot: 5,
    unlockLevel: 6,
    name: 'Zweiter Atem',
    shortName: 'ZA',
    icon: 'second_wind',
    description: 'Ein tiefer Atemzug bringt neue Energie.',
    range: 0,
    cost: 0,
    cooldown: 60,
    restore: 50,
  },
  brace: {
    id: 'brace',
    kind: 'buff',
    slot: 6,
    unlockLevel: 8,
    name: 'Durchhalten',
    shortName: 'DH',
    icon: 'brace',
    description: 'Spannt alle Muskeln an und verringert für kurze Zeit den erlittenen Schaden.',
    range: 0,
    cost: 25,
    cooldown: 30,
    damageReduction: 0.4,
    duration: 8,
  },
};

export function buildActionBar(level) {
  const bar = {};
  for (const ability of Object.values(ABILITIES)) {
    if (level >= ability.unlockLevel) bar[ability.slot] = ability.id;
  }
  return bar;
}

export function createCooldownState() {
  const cooldowns = {};
  for (const id of Object.keys(ABILITIES)) {
    cooldowns[id] = 0;
  }
  return cooldowns;
}

export function serializeAbilities(actionBar) {
  return Object.entries(actionBar)
    .filter(([, abilityId]) => ABILITIES[abilityId])
    .map(([slot, abilityId]) => {
      const ability = ABILITIES[abilityId];
      return {
        slot: Number(slot),
        id: ability.id,
        kind: ability.kind,
        name: ability.name,
        shortName: ability.shortName,
        icon: ability.icon,
        description: ability.description,
        damageMultiplier: ability.damageMultiplier,
        healPercent: ability.healPercent,
        restore: ability.restore,
        damageReduction: ability.damageReduction,
        duration: ability.duration,
        stunSeconds: ability.stunSeconds,
        cost: ability.cost,
        cooldown: ability.cooldown,
        range: ability.range,
      };
    });
}
