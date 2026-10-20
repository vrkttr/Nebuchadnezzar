import { ABILITIES, DEFAULT_ACTION_BAR, createCooldownState } from './abilities.js';
import { applyEquipmentStats } from './equipment.js';
import { addGold, goldForKill } from './loot.js';
import { applyLevelStats, grantXp, xpForKill } from './progression.js';
import { zone } from './zoneLoader.js';

const PLAYER_ATTACK_RANGE = 3;
const PLAYER_ATTACK_INTERVAL = 1.5;
const PLAYER_RESPAWN_TIME = 4;
const REGEN_DELAY = 6;
const REGEN_PER_SECOND = 3;
const RESOURCE_REGEN_PER_SECOND = 2;
const ARMOR_CONSTANT = 50;

export const ENEMY_MELEE_RANGE = 2;
const ENEMY_ATTACK_INTERVAL = 2;
const ENEMY_RESPAWN_TIME = 15;

const SPAWN_POINT = zone.spawn;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function rollPlayerDamage(player) {
  return randomInt(player.damageMin + player.equipDamageMin, player.damageMax + player.equipDamageMax);
}

export function createCombatState(character) {
  const state = {
    level: character.level,
    xp: character.xp,
    gold: character.gold,
    health: 0,
    healthMax: 0,
    resource: 0,
    resourceMax: 0,
    damageMin: 0,
    damageMax: 0,
    equipment: character.equipment,
    armor: 0,
    equipDamageMin: 0,
    equipDamageMax: 0,
    dead: false,
    respawnTimer: 0,
    targetEnemyId: null,
    autoAttack: false,
    attackTimer: PLAYER_ATTACK_INTERVAL,
    combatTimer: REGEN_DELAY,
    cooldowns: createCooldownState(),
    actionBar: { ...DEFAULT_ACTION_BAR },
  };

  applyLevelStats(state);
  applyEquipmentStats(state);
  state.health = state.healthMax;
  state.resource = state.resourceMax;

  return state;
}

function killEnemy(enemy) {
  enemy.dead = true;
  enemy.state = 'idle';
  enemy.targetPlayerId = null;
  enemy.attackTimer = 0;
  enemy.respawnTimer = ENEMY_RESPAWN_TIME;
}

function respawnEnemy(enemy) {
  enemy.x = enemy.spawnX;
  enemy.z = enemy.spawnZ;
  enemy.health = enemy.healthMax;
  enemy.dead = false;
  enemy.state = 'idle';
  enemy.targetPlayerId = null;
  enemy.attackTimer = 0;
}

function killPlayer(player) {
  player.dead = true;
  player.respawnTimer = PLAYER_RESPAWN_TIME;
  player.targetEnemyId = null;
  player.autoAttack = false;
  player.xp = 0;
  player.input.moveX = 0;
  player.input.moveZ = 0;
  player.input.jump = false;
  player.velocityY = 0;
}

function respawnPlayer(player) {
  player.x = SPAWN_POINT.x;
  player.y = SPAWN_POINT.y;
  player.z = SPAWN_POINT.z;
  player.velocityY = 0;
  player.isGrounded = true;
  player.health = player.healthMax;
  player.resource = player.resourceMax;
  player.cooldowns = createCooldownState();
  player.dead = false;
  player.attackTimer = PLAYER_ATTACK_INTERVAL;
  player.combatTimer = REGEN_DELAY;
}

function awardKill(player, playerId, enemy, notify, onKill) {
  const xpAmount = xpForKill(player.level, enemy.level);
  const goldAmount = goldForKill(player.level, enemy.level);

  onKill(playerId, player, enemy);

  notify(playerId, { type: 'event', kind: 'kill', enemyName: enemy.name });

  const levelsGained = grantXp(player, xpAmount);
  if (xpAmount > 0) {
    notify(playerId, { type: 'event', kind: 'xp', amount: xpAmount, enemyName: enemy.name });
  }

  addGold(player, goldAmount);
  notify(playerId, { type: 'event', kind: 'gold', amount: goldAmount });

  if (levelsGained > 0) {
    notify(playerId, { type: 'event', kind: 'levelup', level: player.level });
  }
}

function damageEnemy(enemy, amount, attackerId, attacker, emit, notify, onKill, abilityId = null) {
  enemy.health = Math.max(0, enemy.health - amount);
  attacker.combatTimer = 0;
  emit({ type: 'damage', targetType: 'enemy', targetId: enemy.id, amount, attackerId, abilityId });

  if (enemy.health === 0) {
    killEnemy(enemy);
    awardKill(attacker, attackerId, enemy, notify, onKill);
  } else if (enemy.state !== 'chase') {
    enemy.state = 'chase';
    enemy.targetPlayerId = attackerId;
  }
}

function damagePlayer(player, playerId, enemy, emit) {
  const rawAmount = randomInt(3 + enemy.level * 2, 6 + enemy.level * 3);
  const amount = Math.max(1, Math.round((rawAmount * ARMOR_CONSTANT) / (ARMOR_CONSTANT + player.armor)));
  player.health = Math.max(0, player.health - amount);
  player.combatTimer = 0;
  emit({ type: 'damage', targetType: 'player', targetId: playerId, amount, attackerId: enemy.id });

  if (player.health === 0) {
    killPlayer(player);
  }
}

function updatePlayers(players, enemies, delta, emit, notify, onKill) {
  for (const [playerId, player] of players) {
    if (player.dead) {
      player.respawnTimer -= delta;
      if (player.respawnTimer <= 0) respawnPlayer(player);
      continue;
    }

    player.combatTimer += delta;
    player.attackTimer = Math.min(player.attackTimer + delta, PLAYER_ATTACK_INTERVAL);

    for (const abilityId of Object.keys(player.cooldowns)) {
      player.cooldowns[abilityId] = Math.max(0, player.cooldowns[abilityId] - delta);
    }

    if (player.resource < player.resourceMax) {
      player.resource = Math.min(
        player.resourceMax,
        player.resource + RESOURCE_REGEN_PER_SECOND * delta
      );
    }

    const enemy = player.targetEnemyId ? enemies.get(player.targetEnemyId) : null;

    if (!enemy || enemy.dead) {
      player.targetEnemyId = null;
      player.autoAttack = false;
    } else if (
      player.autoAttack &&
      player.attackTimer >= PLAYER_ATTACK_INTERVAL &&
      horizontalDistance(player, enemy) <= PLAYER_ATTACK_RANGE
    ) {
      player.attackTimer = 0;
      damageEnemy(enemy, rollPlayerDamage(player), playerId, player, emit, notify, onKill);
    }

    if (player.combatTimer >= REGEN_DELAY && player.health < player.healthMax) {
      player.health = Math.min(player.healthMax, player.health + REGEN_PER_SECOND * delta);
    }
  }
}

function updateEnemyAttacks(players, enemies, delta, emit) {
  for (const enemy of enemies.values()) {
    if (enemy.dead) {
      enemy.respawnTimer -= delta;
      if (enemy.respawnTimer <= 0) respawnEnemy(enemy);
      continue;
    }

    if (enemy.state !== 'chase') {
      enemy.attackTimer = 0;
      continue;
    }

    const target = players.get(enemy.targetPlayerId);

    if (!target || target.dead || horizontalDistance(enemy, target) > ENEMY_MELEE_RANGE) {
      enemy.attackTimer = 0;
      continue;
    }

    enemy.attackTimer += delta;

    if (enemy.attackTimer >= ENEMY_ATTACK_INTERVAL) {
      enemy.attackTimer = 0;
      damagePlayer(target, enemy.targetPlayerId, enemy, emit);
    }
  }
}

export function useAbility(playerId, player, enemies, slot, emit, notify, onKill) {
  if (player.dead) return;

  const ability = ABILITIES[player.actionBar[slot]];
  if (!ability) return;

  const fail = (reason) => notify(playerId, { type: 'event', kind: 'ability-failed', reason });

  const enemy = player.targetEnemyId ? enemies.get(player.targetEnemyId) : null;

  if (!enemy || enemy.dead) return fail('no-target');
  if (player.cooldowns[ability.id] > 0) return fail('cooldown');
  if (player.resource < ability.cost) return fail('no-resource');
  if (horizontalDistance(player, enemy) > ability.range) return fail('out-of-range');

  player.resource -= ability.cost;
  player.cooldowns[ability.id] = ability.cooldown;

  const amount = Math.round(rollPlayerDamage(player) * ability.damageMultiplier);
  damageEnemy(enemy, amount, playerId, player, emit, notify, onKill, ability.id);
}

export function updateCombat(players, enemies, delta, emit, notify, onKill) {
  updatePlayers(players, enemies, delta, emit, notify, onKill);
  updateEnemyAttacks(players, enemies, delta, emit);
}
