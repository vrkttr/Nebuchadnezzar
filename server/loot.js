const GOLD_PER_LEVEL_MIN = 2;
const GOLD_PER_LEVEL_MAX = 5;

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
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function levelFactor(playerLevel, enemyLevel) {
  const difference = enemyLevel - playerLevel;
  return difference >= 0 ? 1 + Math.min(difference, 3) * 0.1 : Math.max(0.2, 1 + difference * 0.2);
}

export function goldForKill(playerLevel, enemyLevel) {
  const base = randomInt(enemyLevel * GOLD_PER_LEVEL_MIN, enemyLevel * GOLD_PER_LEVEL_MAX);

  return Math.max(1, Math.round(base * levelFactor(playerLevel, enemyLevel)));
}

export function rollLoot(tableId, playerLevel, enemyLevel) {
  const table = LOOT_TABLES[tableId];
  if (!table) return [];

  const factor = levelFactor(playerLevel, enemyLevel);
  const drops = [];

  for (const entry of table) {
    if (Math.random() < Math.min(1, entry.chance * factor)) {
      drops.push({ itemId: entry.itemId, quantity: randomInt(entry.min, entry.max) });
    }
  }

  return drops;
}
