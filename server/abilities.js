export const ABILITIES = {
  power_strike: {
    id: 'power_strike',
    name: 'Kraftschlag',
    shortName: 'KS',
    icon: 'power_strike',
    description: 'Ein wuchtiger Schlag mit voller Kraft.',
    range: 3,
    cost: 20,
    cooldown: 6,
    damageMultiplier: 2,
  },
};

export const DEFAULT_ACTION_BAR = { 1: 'power_strike' };

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
        name: ability.name,
        shortName: ability.shortName,
        icon: ability.icon,
        description: ability.description,
        damageMultiplier: ability.damageMultiplier,
        cost: ability.cost,
        cooldown: ability.cooldown,
        range: ability.range,
      };
    });
}
