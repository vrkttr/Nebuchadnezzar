const GOLD_PER_LEVEL_MIN = 2;
const GOLD_PER_LEVEL_MAX = 5;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function goldForKill(playerLevel, enemyLevel) {
  const difference = enemyLevel - playerLevel;
  const factor =
    difference >= 0 ? 1 + Math.min(difference, 3) * 0.1 : Math.max(0.2, 1 + difference * 0.2);
  const base = randomInt(enemyLevel * GOLD_PER_LEVEL_MIN, enemyLevel * GOLD_PER_LEVEL_MAX);

  return Math.max(1, Math.round(base * factor));
}
