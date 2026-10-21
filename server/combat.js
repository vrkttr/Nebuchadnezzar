import { ABILITIES, createActionLayout, createCooldownState, syncActionLayout } from './abilities.js';
import { getClassModifiers } from './classes.js';
import { applyEquipmentStats, getEquippedWeapon } from './equipment.js';
import { countItem, removeItem, sendInventory } from './inventory.js';
import { addGold, goldForKill } from './loot.js';
import { applyLevelStats, grantXp, xpForKill } from './progression.js';
import { DEFAULT_ZONE_ID, getZone } from './zoneLoader.js';
import { hasLineOfSight } from './world.js';

const PLAYER_ATTACK_RANGE = 3;
const PLAYER_ATTACK_INTERVAL = 1.5;
const PLAYER_RESPAWN_TIME = 4;
const REGEN_DELAY = 6;
const REGEN_PER_SECOND = 3;
const RESOURCE_REGEN_PER_SECOND = 2;
const ARMOR_CONSTANT = 50;

const ENEMY_RESPAWN_TIME = 15;


function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const RANGED_BASE_DAMAGE_SHARE = 0.4;

function rollPlayerDamage(player, ranged = false) {
  const modifiers = getClassModifiers(player.classId);

  if (ranged) {
    return Math.round(
      randomInt(
        Math.round(player.damageMin * RANGED_BASE_DAMAGE_SHARE) + player.equipDamageMin,
        Math.round(player.damageMax * RANGED_BASE_DAMAGE_SHARE) + player.equipDamageMax
      ) * modifiers.rangedDamageMult
    );
  }

  return Math.round(
    randomInt(player.damageMin + player.equipDamageMin, player.damageMax + player.equipDamageMax) *
      modifiers.meleeDamageMult
  );
}

export function createCombatState(character) {
  const actionLayout = createActionLayout(character.actionLayout);
  syncActionLayout(actionLayout, character.level);

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
    classId: character.classId ?? null,
    dead: false,
    respawnTimer: 0,
    targetEnemyId: null,
    autoAttack: false,
    attackTimer: PLAYER_ATTACK_INTERVAL,
    combatTimer: REGEN_DELAY,
    cooldowns: createCooldownState(),
    actionLayout,
    actionBar: actionLayout.bar,
    buffs: {},
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
  enemy.stunTimer = 0;
}

function killPlayer(player) {
  player.dead = true;
  player.respawnTimer = PLAYER_RESPAWN_TIME;
  player.targetEnemyId = null;
  player.autoAttack = false;
  player.xp = 0;
  player.buffs = {};
  player.input.moveX = 0;
  player.input.moveZ = 0;
  player.input.jump = false;
  player.velocityY = 0;
}

function respawnPlayer(player) {
  if (player.zoneId !== DEFAULT_ZONE_ID) {
    player.pendingZone = DEFAULT_ZONE_ID;
  } else {
    const spawn = getZone(player.zoneId).spawn;
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;
  }
  player.velocityY = 0;
  player.isGrounded = true;
  player.health = player.healthMax;
  player.resource = player.resourceMax;
  player.cooldowns = createCooldownState();
  player.buffs = {};
  player.dead = false;
  player.attackTimer = PLAYER_ATTACK_INTERVAL;
  player.combatTimer = REGEN_DELAY;
}

function awardKill(player, playerId, enemy, notify, onKill) {
  const xpAmount = xpForKill(player.level, enemy.level);
  const goldAmount = Math.max(1, Math.round(goldForKill(player.level, enemy.level) * getClassModifiers(player.classId).goldMult));

  onKill(playerId, player, enemy);

  notify(playerId, { type: 'event', kind: 'kill', enemyName: enemy.name, enemyType: enemy.type });

  const levelsGained = grantXp(player, xpAmount);
  if (xpAmount > 0) {
    notify(playerId, { type: 'event', kind: 'xp', amount: xpAmount, enemyName: enemy.name, enemyType: enemy.type });
  }

  addGold(player, goldAmount);
  notify(playerId, { type: 'event', kind: 'gold', amount: goldAmount });

  if (levelsGained > 0) {
    notify(playerId, { type: 'event', kind: 'levelup', level: player.level });
  }
}

function damageEnemy(enemy, amount, attackerId, attacker, emit, notify, onKill, abilityId = null, weaponId = null) {
  enemy.health = Math.max(0, enemy.health - amount);
  attacker.combatTimer = 0;
  emit({ type: 'damage', targetType: 'enemy', targetId: enemy.id, amount, attackerId, abilityId, weaponId });

  if (enemy.health === 0) {
    killEnemy(enemy);
    awardKill(attacker, attackerId, enemy, notify, onKill);
  } else if (enemy.state !== 'chase') {
    enemy.state = 'chase';
    enemy.targetPlayerId = attackerId;
  }
}

function damagePlayer(player, playerId, enemy, emit) {
  const rawAmount = Math.round(randomInt(3 + enemy.level * 2, 6 + enemy.level * 3) * enemy.damageFactor);
  const reduction = player.buffs?.brace > 0 ? ABILITIES.brace.damageReduction : 0;
  const amount = Math.max(1, Math.round(((rawAmount * ARMOR_CONSTANT) / (ARMOR_CONSTANT + player.armor)) * (1 - reduction)));
  player.health = Math.max(0, player.health - amount);
  player.combatTimer = 0;
  emit({ type: 'damage', targetType: 'player', targetId: playerId, amount, attackerId: enemy.id });

  if (player.health === 0) {
    killPlayer(player);
  }
}

function fireRanged(player, playerId, enemy, weapon, emit, notify, onKill, multiplier = 1, abilityId = null) {
  if (countItem(player.inventory, weapon.ranged.ammo) < 1) {
    notify(playerId, { type: 'event', kind: 'ability-failed', reason: 'no-ammo', weaponId: weapon.id });
    return false;
  }

  if (!hasLineOfSight(player.zoneId, player.x, player.z, enemy.x, enemy.z)) {
    notify(playerId, { type: 'event', kind: 'ability-failed', reason: 'no-line' });
    return false;
  }

  removeItem(player.inventory, weapon.ranged.ammo, 1);
  player.dataVersion += 1;
  sendInventory(notify, playerId, player);
  damageEnemy(enemy, Math.round(rollPlayerDamage(player, true) * multiplier), playerId, player, emit, notify, onKill, abilityId, weapon.id);
  return true;
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

    for (const buffId of Object.keys(player.buffs)) {
      player.buffs[buffId] -= delta;
      if (player.buffs[buffId] <= 0) delete player.buffs[buffId];
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
    } else if (player.autoAttack) {
      const weapon = getEquippedWeapon(player.equipment);
      const ranged = weapon?.ranged ?? null;
      const interval = ranged ? ranged.interval : PLAYER_ATTACK_INTERVAL;
      const range = ranged ? ranged.range : PLAYER_ATTACK_RANGE;

      if (player.attackTimer >= interval && horizontalDistance(player, enemy) <= range) {
        if (!ranged) {
          player.attackTimer = 0;
          damageEnemy(enemy, rollPlayerDamage(player), playerId, player, emit, notify, onKill);
        } else if (fireRanged(player, playerId, enemy, weapon, emit, notify, onKill)) {
          player.attackTimer = 0;
        } else {
          player.autoAttack = false;
        }
      }
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

    if (enemy.stunTimer > 0) {
      enemy.stunTimer = Math.max(0, enemy.stunTimer - delta);
      enemy.attackTimer = 0;
      continue;
    }

    if (enemy.state !== 'chase') {
      enemy.attackTimer = 0;
      continue;
    }

    const target = players.get(enemy.targetPlayerId);

    if (!target || target.dead || horizontalDistance(enemy, target) > enemy.meleeRange) {
      enemy.attackTimer = 0;
      continue;
    }

    enemy.attackTimer += delta;

    if (enemy.attackTimer >= enemy.attackInterval) {
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

  if (player.cooldowns[ability.id] > 0) return fail('cooldown');
  if (player.resource < ability.cost) return fail('no-resource');

  const spend = () => {
    player.resource -= ability.cost;
    player.cooldowns[ability.id] = ability.cooldown;
  };

  if (ability.kind === 'heal') {
    if (player.health >= player.healthMax) return fail('full-health');
    spend();
    const amount = Math.round(player.healthMax * ability.healPercent * getClassModifiers(player.classId).healMult);
    player.health = Math.min(player.healthMax, player.health + amount);
    notify(playerId, { type: 'event', kind: 'heal', amount, abilityId: ability.id });
    return;
  }

  if (ability.kind === 'resource') {
    spend();
    player.resource = Math.min(player.resourceMax, player.resource + ability.restore);
    notify(playerId, { type: 'event', kind: 'restore', amount: ability.restore, abilityId: ability.id });
    return;
  }

  if (ability.kind === 'buff') {
    spend();
    player.buffs[ability.id] = ability.duration;
    notify(playerId, { type: 'event', kind: 'buff', abilityId: ability.id, seconds: ability.duration });
    return;
  }

  const weapon = getEquippedWeapon(player.equipment);
  const enemy = player.targetEnemyId ? enemies.get(player.targetEnemyId) : null;

  if (!enemy || enemy.dead) return fail('no-target');

  if (ability.kind === 'ranged') {
    if (!weapon?.ranged) return fail('needs-ranged');
    if (horizontalDistance(player, enemy) > weapon.ranged.range) return fail('out-of-range');
    if (!fireRanged(player, playerId, enemy, weapon, emit, notify, onKill, ability.damageMultiplier, ability.id)) return;
    spend();
    player.attackTimer = 0;
    return;
  }

  if (weapon?.ranged) return fail('melee-only');
  if (horizontalDistance(player, enemy) > ability.range) return fail('out-of-range');

  spend();

  const amount = Math.round(rollPlayerDamage(player) * ability.damageMultiplier);
  if (ability.stunSeconds) enemy.stunTimer = ability.stunSeconds;
  damageEnemy(enemy, amount, playerId, player, emit, notify, onKill, ability.id);
}

export function updateCombat(players, enemies, delta, emit, notify, onKill) {
  updatePlayers(players, enemies, delta, emit, notify, onKill);
  updateEnemyAttacks(players, enemies, delta, emit);
}
