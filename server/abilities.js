import { ITEMS } from './items.js';

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
  whirlwind: {
    id: 'whirlwind',
    kind: 'aoe',
    slot: 7,
    unlockLevel: 10,
    name: 'Rundumschlag',
    shortName: 'RS',
    icon: 'whirlwind',
    description: 'Ein weiter Hieb im Kreis, der alle Gegner in der Nähe trifft. Benötigt eine Nahkampfwaffe, kein Ziel nötig.',
    range: 0,
    radius: 5,
    maxTargets: 8,
    cost: 30,
    cooldown: 12,
    damageMultiplier: 0.9,
  },
};

export const ACTION_BAR_SLOTS = 12;

const ITEM_PREFIX = 'item:';

export function itemRefId(ref) {
  return typeof ref === 'string' && ref.startsWith(ITEM_PREFIX) ? ref.slice(ITEM_PREFIX.length) : null;
}

function isValidBarEntry(ref) {
  if (typeof ref !== 'string') return false;
  const itemId = itemRefId(ref);
  if (itemId !== null) return Boolean(ITEMS[itemId]?.use);
  return Boolean(ABILITIES[ref]);
}

export function createActionLayout(saved) {
  const layout = { bar: {}, seen: [] };

  if (saved && typeof saved === 'object') {
    for (const [slot, abilityId] of Object.entries(saved.bar ?? {})) {
      const index = Number(slot);
      if (Number.isInteger(index) && index >= 1 && index <= ACTION_BAR_SLOTS && isValidBarEntry(abilityId)) {
        layout.bar[index] = abilityId;
      }
    }

    if (Array.isArray(saved.seen)) {
      layout.seen = saved.seen.filter((abilityId) => ABILITIES[abilityId]);
    }
  }

  return layout;
}

function removeFromBar(layout, abilityId) {
  for (const [slot, id] of Object.entries(layout.bar)) {
    if (id === abilityId) delete layout.bar[slot];
  }
}

export function syncActionLayout(layout, level) {
  let changed = false;

  for (const [slot, abilityId] of Object.entries(layout.bar)) {
    if (itemRefId(abilityId) !== null) continue;
    if (!ABILITIES[abilityId] || level < ABILITIES[abilityId].unlockLevel) {
      delete layout.bar[slot];
      changed = true;
    }
  }

  for (const ability of Object.values(ABILITIES)) {
    if (level < ability.unlockLevel || layout.seen.includes(ability.id)) continue;

    layout.seen.push(ability.id);
    changed = true;

    let slot = ability.slot;
    if (layout.bar[slot]) {
      slot = 1;
      while (slot <= ACTION_BAR_SLOTS && layout.bar[slot]) slot += 1;
    }

    if (slot <= ACTION_BAR_SLOTS) layout.bar[slot] = ability.id;
  }

  return changed;
}

export function setActionSlot(layout, level, slot, abilityId, fromSlot = null) {
  if (!Number.isInteger(slot) || slot < 1 || slot > ACTION_BAR_SLOTS) return false;

  if (abilityId === null) {
    if (!layout.bar[slot]) return false;
    delete layout.bar[slot];
    return true;
  }

  const itemId = itemRefId(abilityId);
  if (itemId !== null) {
    const item = ITEMS[itemId];
    if (!item?.use || level < item.level) return false;
    if (layout.bar[slot] === abilityId) return false;

    const displaced = layout.bar[slot];
    layout.bar[slot] = abilityId;

    if (Number.isInteger(fromSlot) && fromSlot !== slot && fromSlot >= 1 && fromSlot <= ACTION_BAR_SLOTS && layout.bar[fromSlot] === abilityId) {
      if (displaced) layout.bar[fromSlot] = displaced;
      else delete layout.bar[fromSlot];
    }

    return true;
  }

  const ability = ABILITIES[abilityId];
  if (!ability || level < ability.unlockLevel) return false;
  if (layout.bar[slot] === abilityId) return false;

  const displaced = layout.bar[slot];
  const previousSlot = Object.keys(layout.bar).find((key) => layout.bar[key] === abilityId);

  removeFromBar(layout, abilityId);
  layout.bar[slot] = abilityId;

  if (displaced && previousSlot !== undefined) layout.bar[previousSlot] = displaced;

  return true;
}

export function createCooldownState() {
  const cooldowns = {};
  for (const id of Object.keys(ABILITIES)) {
    cooldowns[id] = 0;
  }
  return cooldowns;
}

export function serializeAbilities(level, actionBar) {
  const slotById = {};
  for (const [slot, abilityId] of Object.entries(actionBar)) {
    if (ABILITIES[abilityId]) slotById[abilityId] = Number(slot);
  }

  return Object.values(ABILITIES).map((ability) => ({
    slot: slotById[ability.id] ?? null,
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
    radius: ability.radius,
    unlockLevel: ability.unlockLevel,
    unlocked: level >= ability.unlockLevel,
  }));
}

export function serializeActionItems(actionBar) {
  const entries = [];

  for (const [slot, ref] of Object.entries(actionBar)) {
    const itemId = itemRefId(ref);
    if (itemId !== null && ITEMS[itemId]) entries.push({ slot: Number(slot), itemId });
  }

  return entries;
}
