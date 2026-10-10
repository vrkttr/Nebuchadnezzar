const BASE_HEALTH = 100;
const HEALTH_PER_LEVEL = 15;
const BASE_RESOURCE = 100;
const RESOURCE_PER_LEVEL = 5;
const BASE_DAMAGE_MIN = 8;
const BASE_DAMAGE_MAX = 12;
const DAMAGE_PER_LEVEL = 2;
const XP_PER_ENEMY_LEVEL = 25;

const configuredMaxLevel = Number.parseInt(process.env.MAX_LEVEL ?? '', 10);

export const MAX_LEVEL =
  Number.isFinite(configuredMaxLevel) && configuredMaxLevel > 0 ? configuredMaxLevel : Infinity;

export function xpToNextLevel(level) {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function applyLevelStats(player) {
  const bonusLevels = player.level - 1;
  player.healthMax = BASE_HEALTH + bonusLevels * HEALTH_PER_LEVEL;
  player.resourceMax = BASE_RESOURCE + bonusLevels * RESOURCE_PER_LEVEL;
  player.damageMin = BASE_DAMAGE_MIN + bonusLevels * DAMAGE_PER_LEVEL;
  player.damageMax = BASE_DAMAGE_MAX + bonusLevels * DAMAGE_PER_LEVEL;
}

export function xpForKill(playerLevel, enemyLevel) {
  const difference = enemyLevel - playerLevel;
  const factor =
    difference >= 0 ? 1 + Math.min(difference, 3) * 0.1 : Math.max(0, 1 + difference * 0.2);

  return Math.round(enemyLevel * XP_PER_ENEMY_LEVEL * factor);
}

export function grantXp(player, amount) {
  if (amount <= 0 || player.level >= MAX_LEVEL) return 0;

  player.xp += amount;
  let levelsGained = 0;

  while (player.level < MAX_LEVEL && player.xp >= xpToNextLevel(player.level)) {
    player.xp -= xpToNextLevel(player.level);
    player.level += 1;
    levelsGained += 1;
  }

  if (player.level >= MAX_LEVEL) {
    player.xp = 0;
  }

  if (levelsGained > 0) {
    applyLevelStats(player);
    player.health = player.healthMax;
    player.resource = player.resourceMax;
  }

  return levelsGained;
}
