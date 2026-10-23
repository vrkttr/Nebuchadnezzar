import { getPlayerModifiers } from './skills.js';
import { getItem } from './items.js';
import { formatPerk, parsePerk, perkMultipliers } from './perks.js';

export const EQUIPMENT_SLOTS = ['weapon', 'head', 'shoulders', 'chest', 'hands', 'belt', 'legs', 'feet'];

export const BAG_SLOTS = ['bag1', 'bag2', 'bag3', 'bag4'];

export function createEquipment() {
  return Object.fromEntries([...EQUIPMENT_SLOTS, ...BAG_SLOTS].map((slot) => [slot, null]));
}

export function loadEquipment(rows) {
  const equipment = createEquipment();

  for (const row of rows) {
    const item = getItem(row.item_id);
    if (!item) continue;
    if (item.slot === row.slot && EQUIPMENT_SLOTS.includes(row.slot)) {
      equipment[row.slot] = row.item_id;
    } else if (item.type === 'bag' && BAG_SLOTS.includes(row.slot)) {
      equipment[row.slot] = row.item_id;
    }
  }

  return equipment;
}

export function loadEquipmentPerks(rows) {
  const perks = {};

  for (const row of rows) {
    const perk = row.slot === 'weapon' ? parsePerk(row.perk) : null;
    if (perk && getItem(row.item_id)?.type === 'weapon') perks[row.slot] = perk;
  }

  return perks;
}

export function serializeEquipment(equipment) {
  return { ...equipment };
}

export function serializeEquipmentPerks(perks = {}) {
  return { ...perks };
}

export function equipmentRows(equipment, perks = {}) {
  return [...EQUIPMENT_SLOTS, ...BAG_SLOTS].filter((slot) => equipment[slot]).map((slot) => [slot, equipment[slot], formatPerk(perks[slot])]);
}

export function computeEquipmentStats(equipment) {
  const stats = { armor: 0, equipDamageMin: 0, equipDamageMax: 0 };

  for (const slot of EQUIPMENT_SLOTS) {
    const item = equipment[slot] ? getItem(equipment[slot]) : null;
    if (!item?.stats) continue;

    stats.armor += item.stats.armor ?? 0;
    stats.equipDamageMin += item.stats.damageMin ?? 0;
    stats.equipDamageMax += item.stats.damageMax ?? 0;
  }

  return stats;
}

export function applyEquipmentStats(player) {
  Object.assign(player, computeEquipmentStats(player.equipment));
  const multipliers = perkMultipliers(player.equipmentPerks?.weapon ?? null);
  player.weaponDamageMult = multipliers.damage;
  player.weaponSpeedMult = multipliers.speed;
  const modifiers = getPlayerModifiers(player);
  player.armor = Math.round((player.armor + modifiers.armorBonus) * modifiers.armorMult);
}

export function getEquippedWeapon(equipment) {
  return equipment.weapon ? getItem(equipment.weapon) : null;
}
