export const MAX_GOLD = 2000000000;

import { getItem } from './items.js';

const GOLD_PER_LEVEL_MIN = 2;
const GOLD_PER_LEVEL_MAX = 5;
const QUALITY_RANK = { uncommon: 1, rare: 2, epic: 3 };

const LOOT_TABLES = {
  raider: [
    { itemId: 'bandage', chance: 0.15, min: 1, max: 2 },
    { itemId: 'kitchen_knife', chance: 0.04, min: 1, max: 1 },
    { itemId: 'baseball_bat', chance: 0.04, min: 1, max: 1 },
    { itemId: 'work_overall', chance: 0.05, min: 1, max: 1 },
    { itemId: 'scrap_metal', chance: 0.7, min: 1, max: 3 },
    { itemId: 'rag_bundle', chance: 0.5, min: 1, max: 2 },
    { itemId: 'canned_food', chance: 0.25, min: 1, max: 1 },
    { itemId: 'ammo_9mm', chance: 0.3, min: 3, max: 10 },
    { itemId: 'ammo_762', chance: 0.1, min: 3, max: 8 },
    { itemId: 'rusty_pipe', chance: 0.08, min: 1, max: 1 },
    { itemId: 'scrap_helmet', chance: 0.06, min: 1, max: 1 },
    { itemId: 'padded_vest', chance: 0.05, min: 1, max: 1 },
    { itemId: 'patched_trousers', chance: 0.05, min: 1, max: 1 },
  ],

  scavenger: [
    { itemId: 'bandage', chance: 0.12, min: 1, max: 2 },
    { itemId: 'duct_tape', chance: 0.15, min: 1, max: 2 },
    { itemId: 'battery', chance: 0.08, min: 1, max: 1 },
    { itemId: 'work_pants', chance: 0.06, min: 1, max: 1 },
    { itemId: 'hard_hat', chance: 0.05, min: 1, max: 1 },
    { itemId: 'scrap_metal', chance: 0.8, min: 1, max: 4 },
    { itemId: 'rag_bundle', chance: 0.6, min: 1, max: 3 },
    { itemId: 'canned_food', chance: 0.3, min: 1, max: 2 },
    { itemId: 'ammo_9mm', chance: 0.2, min: 2, max: 6 },
    { itemId: 'patched_trousers', chance: 0.08, min: 1, max: 1 },
  ],
  dog: [
    { itemId: 'dog_fur', chance: 0.5, min: 1, max: 2 },
    { itemId: 'rag_bundle', chance: 0.35, min: 1, max: 2 },
    { itemId: 'canned_food', chance: 0.12, min: 1, max: 1 },
  ],
  rat: [
    { itemId: 'rat_tail', chance: 0.6, min: 1, max: 2 },
    { itemId: 'duct_tape', chance: 0.08, min: 1, max: 1 },
    { itemId: 'battery', chance: 0.06, min: 1, max: 1 },
    { itemId: 'rag_bundle', chance: 0.4, min: 1, max: 3 },
    { itemId: 'scrap_metal', chance: 0.4, min: 1, max: 3 },
    { itemId: 'canned_food', chance: 0.15, min: 1, max: 1 },
    { itemId: 'ammo_9mm', chance: 0.1, min: 2, max: 6 },
  ],
  deserter: [
    { itemId: 'revolver', chance: 0.08, min: 1, max: 1 },
    { itemId: 'ammo_357', chance: 0.3, min: 4, max: 10 },
    { itemId: 'cargo_pants', chance: 0.1, min: 1, max: 1 },
    { itemId: 'medkit', chance: 0.12, min: 1, max: 1 },
    { itemId: 'kevlar_vest', chance: 0.03, min: 1, max: 1 },
    { itemId: 'ammo_9mm', chance: 0.5, min: 5, max: 12 },
    { itemId: 'ammo_762', chance: 0.3, min: 4, max: 10 },
    { itemId: 'canned_food', chance: 0.3, min: 1, max: 2 },
    { itemId: 'riot_helmet', chance: 0.1, min: 1, max: 1 },
    { itemId: 'padded_vest', chance: 0.1, min: 1, max: 1 },
  ],
  brute: [
    { itemId: 'baseball_bat', chance: 0.15, min: 1, max: 1 },
    { itemId: 'sledgehammer', chance: 0.05, min: 1, max: 1 },
    { itemId: 'fire_axe', chance: 0.08, min: 1, max: 1 },
    { itemId: 'painkillers', chance: 0.15, min: 1, max: 2 },
    { itemId: 'scrap_metal', chance: 0.8, min: 2, max: 5 },
    { itemId: 'rusty_pipe', chance: 0.15, min: 1, max: 1 },
    { itemId: 'machete', chance: 0.08, min: 1, max: 1 },
    { itemId: 'padded_vest', chance: 0.12, min: 1, max: 1 },
  ],
  sewer_dweller: [
    { itemId: 'ammo_shell', chance: 0.4, min: 3, max: 8 },
    { itemId: 'shotgun', chance: 0.05, min: 1, max: 1 },
    { itemId: 'gas_mask', chance: 0.06, min: 1, max: 1 },
    { itemId: 'military_pants', chance: 0.05, min: 1, max: 1 },
    { itemId: 'bandage', chance: 0.3, min: 1, max: 3 },
    { itemId: 'battery', chance: 0.2, min: 1, max: 2 },
    { itemId: 'duct_tape', chance: 0.2, min: 1, max: 2 },
    { itemId: 'motorcycle_helmet', chance: 0.08, min: 1, max: 1 },
    { itemId: 'scrap_metal', chance: 0.7, min: 2, max: 5 },
    { itemId: 'canned_food', chance: 0.4, min: 1, max: 3 },
    { itemId: 'ammo_9mm', chance: 0.35, min: 4, max: 10 },
    { itemId: 'ammo_762', chance: 0.25, min: 4, max: 10 },
    { itemId: 'riot_helmet', chance: 0.1, min: 1, max: 1 },
    { itemId: 'machete', chance: 0.08, min: 1, max: 1 },
  ],
  rat_king: [
    { itemId: 'spiked_bat', chance: 0.35, min: 1, max: 1 },
    { itemId: 'shotgun', chance: 0.3, min: 1, max: 1 },
    { itemId: 'hunting_rifle', chance: 0.2, min: 1, max: 1 },
    { itemId: 'kevlar_vest', chance: 0.3, min: 1, max: 1 },
    { itemId: 'gas_mask', chance: 0.3, min: 1, max: 1 },
    { itemId: 'medkit', chance: 0.6, min: 1, max: 2 },
    { itemId: 'scrap_metal', chance: 1, min: 4, max: 8 },
    { itemId: 'canned_food', chance: 0.8, min: 2, max: 4 },
    { itemId: 'ammo_762', chance: 0.6, min: 8, max: 16 },
    { itemId: 'riot_helmet', chance: 0.4, min: 1, max: 1 },
    { itemId: 'padded_vest', chance: 0.4, min: 1, max: 1 },
    { itemId: 'machete', chance: 0.3, min: 1, max: 1 },
  ],
  boss: [
    { itemId: 'shotgun', chance: 0.4, min: 1, max: 1 },
    { itemId: 'hunting_rifle', chance: 0.3, min: 1, max: 1 },
    { itemId: 'spiked_bat', chance: 0.3, min: 1, max: 1 },
    { itemId: 'kevlar_vest', chance: 0.4, min: 1, max: 1 },
    { itemId: 'military_pants', chance: 0.4, min: 1, max: 1 },
    { itemId: 'medkit', chance: 0.8, min: 2, max: 3 },
    { itemId: 'ammo_762', chance: 1, min: 20, max: 40 },
    { itemId: 'ammo_9mm', chance: 1, min: 20, max: 40 },
    { itemId: 'riot_helmet', chance: 0.7, min: 1, max: 1 },
    { itemId: 'padded_vest', chance: 0.7, min: 1, max: 1 },
    { itemId: 'machete', chance: 0.5, min: 1, max: 1 },
    { itemId: 'ak47', chance: 0.25, min: 1, max: 1 },
  ],
  marauder: [
    { itemId: 'painkillers', chance: 0.12, min: 1, max: 2 },
    { itemId: 'baseball_bat', chance: 0.06, min: 1, max: 1 },
    { itemId: 'fire_axe', chance: 0.04, min: 1, max: 1 },
    { itemId: 'leather_jacket', chance: 0.08, min: 1, max: 1 },
    { itemId: 'revolver', chance: 0.03, min: 1, max: 1 },
    { itemId: 'ammo_357', chance: 0.2, min: 3, max: 8 },
    { itemId: 'scrap_metal', chance: 0.7, min: 2, max: 4 },
    { itemId: 'canned_food', chance: 0.3, min: 1, max: 2 },
    { itemId: 'ammo_762', chance: 0.4, min: 5, max: 14 },
    { itemId: 'ammo_9mm', chance: 0.3, min: 4, max: 10 },
    { itemId: 'padded_vest', chance: 0.12, min: 1, max: 1 },
    { itemId: 'riot_helmet', chance: 0.1, min: 1, max: 1 },
    { itemId: 'machete', chance: 0.05, min: 1, max: 1 },
  ],
};

const CHEST_TABLES = {
  chest_common: {
    gold: [4, 9],
    guaranteed: 1,
    entries: [
      { itemId: 'bandage', chance: 0.35, min: 1, max: 3 },
      { itemId: 'painkillers', chance: 0.2, min: 1, max: 2 },
      { itemId: 'ammo_357', chance: 0.2, min: 4, max: 10 },
      { itemId: 'work_overall', chance: 0.1, min: 1, max: 1 },
      { itemId: 'baseball_bat', chance: 0.06, min: 1, max: 1 },
      { itemId: 'kitchen_knife', chance: 0.08, min: 1, max: 1 },
      { itemId: 'scrap_metal', chance: 0.7, min: 2, max: 5 },
      { itemId: 'rag_bundle', chance: 0.5, min: 2, max: 4 },
      { itemId: 'canned_food', chance: 0.6, min: 1, max: 3 },
      { itemId: 'ammo_9mm', chance: 0.55, min: 8, max: 18 },
      { itemId: 'ammo_762', chance: 0.35, min: 6, max: 14 },
      { itemId: 'scrap_helmet', chance: 0.14, min: 1, max: 1 },
      { itemId: 'patched_trousers', chance: 0.14, min: 1, max: 1 },
      { itemId: 'padded_vest', chance: 0.1, min: 1, max: 1 },
      { itemId: 'riot_helmet', chance: 0.06, min: 1, max: 1 },
      { itemId: 'machete', chance: 0.03, min: 1, max: 1 },
    ],
  },
  chest_sewer: {
    gold: [6, 12],
    guaranteed: 2,
    entries: [
      { itemId: 'ammo_shell', chance: 0.4, min: 4, max: 10 },
      { itemId: 'ammo_357', chance: 0.4, min: 6, max: 14 },
      { itemId: 'medkit', chance: 0.3, min: 1, max: 1 },
      { itemId: 'bandage', chance: 0.5, min: 2, max: 4 },
      { itemId: 'leather_jacket', chance: 0.12, min: 1, max: 1 },
      { itemId: 'cargo_pants', chance: 0.12, min: 1, max: 1 },
      { itemId: 'fire_axe', chance: 0.06, min: 1, max: 1 },
      { itemId: 'revolver', chance: 0.06, min: 1, max: 1 },
      { itemId: 'shotgun', chance: 0.04, min: 1, max: 1 },
      { itemId: 'kevlar_vest', chance: 0.04, min: 1, max: 1 },
      { itemId: 'canned_food', chance: 0.6, min: 2, max: 4 },
      { itemId: 'scrap_metal', chance: 0.6, min: 3, max: 6 },
      { itemId: 'ammo_9mm', chance: 0.6, min: 10, max: 22 },
      { itemId: 'ammo_762', chance: 0.5, min: 8, max: 18 },
      { itemId: 'riot_helmet', chance: 0.15, min: 1, max: 1 },
      { itemId: 'padded_vest', chance: 0.15, min: 1, max: 1 },
      { itemId: 'machete', chance: 0.1, min: 1, max: 1 },
      { itemId: 'ak47', chance: 0.03, min: 1, max: 1 },
    ],
  },
  chest_flat: {
    gold: [3, 7],
    guaranteed: 1,
    entries: [
      { itemId: 'bandage', chance: 0.35, min: 1, max: 2 },
      { itemId: 'painkillers', chance: 0.15, min: 1, max: 1 },
      { itemId: 'work_pants', chance: 0.12, min: 1, max: 1 },
      { itemId: 'hard_hat', chance: 0.1, min: 1, max: 1 },
      { itemId: 'canned_food', chance: 0.75, min: 1, max: 3 },
      { itemId: 'rag_bundle', chance: 0.6, min: 2, max: 4 },
      { itemId: 'ammo_9mm', chance: 0.5, min: 6, max: 14 },
      { itemId: 'scrap_metal', chance: 0.4, min: 1, max: 3 },
      { itemId: 'patched_trousers', chance: 0.12, min: 1, max: 1 },
      { itemId: 'rusty_pipe', chance: 0.08, min: 1, max: 1 },
    ],
  },
};

export function hasChestTable(tableId) {
  return Object.hasOwn(CHEST_TABLES, tableId);
}

export function rollChest(tableId, playerLevel) {
  const table = CHEST_TABLES[tableId];
  if (!table) return { gold: 0, drops: [] };

  const level = Math.max(1, playerLevel);
  const gold = randomInt(table.gold[0] * level, table.gold[1] * level);
  const roll = () =>
    table.entries
      .filter((entry) => Math.random() < entry.chance)
      .map((entry) => ({ itemId: entry.itemId, quantity: randomInt(entry.min, entry.max) }));

  let drops = roll();
  for (let attempt = 0; attempt < 5 && drops.length < table.guaranteed; attempt += 1) drops = roll();
  if (drops.length < table.guaranteed) {
    const fallback = table.entries[0];
    drops = [{ itemId: fallback.itemId, quantity: randomInt(fallback.min, fallback.max) }];
  }

  return { gold, drops };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function levelFactor(playerLevel, enemyLevel) {
  const difference = enemyLevel - playerLevel;
  return difference >= 0 ? 1 + Math.min(difference, 3) * 0.1 : Math.max(0.2, 1 + difference * 0.2);
}

function qualityScale(itemId, playerLevel, enemyLevel) {
  const quality = getItem(itemId)?.quality ?? 'common';
  if (quality === 'common') return 1;

  const difference = enemyLevel - playerLevel;
  const rank = QUALITY_RANK[quality] ?? 1;

  if (difference >= 0) return 1 + Math.min(difference, 3) * 0.35 * rank;
  return Math.max(0.1, 1 + difference * 0.4);
}

export function goldForKill(playerLevel, enemyLevel) {
  const base = randomInt(enemyLevel * GOLD_PER_LEVEL_MIN, enemyLevel * GOLD_PER_LEVEL_MAX);

  return Math.max(1, Math.round(base * levelFactor(playerLevel, enemyLevel)));
}

export function addGold(player, amount) {
  player.gold = Math.max(0, Math.min(MAX_GOLD, player.gold + amount));
}

export function rollLoot(tableId, playerLevel, enemyLevel) {
  const table = LOOT_TABLES[tableId];
  if (!table) return [];

  const factor = levelFactor(playerLevel, enemyLevel);
  const drops = [];

  for (const entry of table) {
    const chance = entry.chance * factor * qualityScale(entry.itemId, playerLevel, enemyLevel);

    if (Math.random() < Math.min(1, chance)) {
      drops.push({ itemId: entry.itemId, quantity: randomInt(entry.min, entry.max) });
    }
  }

  return drops;
}
