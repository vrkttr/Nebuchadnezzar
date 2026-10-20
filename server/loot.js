export const MAX_GOLD = 2000000000;

import { getItem } from './items.js';

const GOLD_PER_LEVEL_MIN = 2;
const GOLD_PER_LEVEL_MAX = 5;
const QUALITY_RANK = { uncommon: 1, rare: 2, epic: 3 };

const LOOT_TABLES = {
  raider: [
    { itemId: 'scrap_metal', chance: 0.7, min: 1, max: 3 },
    { itemId: 'rag_bundle', chance: 0.5, min: 1, max: 2 },
    { itemId: 'canned_food', chance: 0.25, min: 1, max: 1 },
    { itemId: 'rusty_pipe', chance: 0.08, min: 1, max: 1 },
    { itemId: 'scrap_helmet', chance: 0.06, min: 1, max: 1 },
    { itemId: 'padded_vest', chance: 0.05, min: 1, max: 1 },
    { itemId: 'patched_trousers', chance: 0.05, min: 1, max: 1 },
  ],

  scavenger: [
    { itemId: 'scrap_metal', chance: 0.8, min: 1, max: 4 },
    { itemId: 'rag_bundle', chance: 0.6, min: 1, max: 3 },
    { itemId: 'canned_food', chance: 0.3, min: 1, max: 2 },
    { itemId: 'patched_trousers', chance: 0.08, min: 1, max: 1 },
  ],
  marauder: [
    { itemId: 'scrap_metal', chance: 0.7, min: 2, max: 4 },
    { itemId: 'canned_food', chance: 0.3, min: 1, max: 2 },
    { itemId: 'padded_vest', chance: 0.12, min: 1, max: 1 },
    { itemId: 'riot_helmet', chance: 0.1, min: 1, max: 1 },
    { itemId: 'machete', chance: 0.05, min: 1, max: 1 },
  ],
};

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
