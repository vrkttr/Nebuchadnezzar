import { ABILITIES, createActionLayout, createCooldownState, syncActionLayout } from './abilities.js';
import { createSkills, getPlayerModifiers } from './skills.js';
import { applyEquipmentStats, getEquippedWeapon } from './equipment.js';
import { countItem, removeItem, sendInventory } from './inventory.js';
import { addGold, goldForKill } from './loot.js';
import { applyLevelStats, grantXp, xpForKill } from './progression.js';
import { DEFAULT_ZONE_ID, getZone } from './zoneLoader.js';
import { hasLineOfSight } from './world.js';
import { HEARTH_SPAWN_ID } from './inn.js';

const PLAYER_ATTACK_RANGE = 3;
const PLAYER_ATTACK_INTERVAL = 1.5;
const PLAYER_RESPAWN_TIME = 4;
const REGEN_DELAY = 6;
const REGEN_PER_SECOND = 3;
const RESOURCE_REGEN_PER_SECOND = 2;
const ARMOR_BASE = 20;
const ARMOR_PER_LEVEL = 6;

const armorConstant = (attackerLevel) => ARMOR_BASE + ARMOR_PER_LEVEL * attackerLevel;

const ENEMY_RESPAWN_TIME = 60;
const GROUP_BONUS_PER_MEMBER = 0.2;
export const GROUP_SHARE_RANGE = 60;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const FACING_HALF_ANGLE = Math.PI / 3;
const ATTACK_TIMER_CAP = 10;
const FACING_WARNING_INTERVAL = 2;

export function isFacing(player, target) {
  const dx = target.x - player.x;
  const dz = target.z - player.z;
  if (Math.hypot(dx, dz) < 0.5) return true;

  let difference = Math.atan2(dx, dz) - player.rotationY;
  difference = Math.atan2(Math.sin(difference), Math.cos(difference));
  return Math.abs(difference) <= FACING_HALF_ANGLE;
}

const RANGED_BASE_DAMAGE_SHARE = 0.4;

function rollPlayerDamage(player, ranged = false) {
  const modifiers = getPlayerModifiers(player);

  if (ranged) {
    return Math.round(
      randomInt(
        Math.round(player.damageMin * RANGED_BASE_DAMAGE_SHARE) + player.equipDamageMin,
        Math.round(player.damageMax * RANGED_BASE_DAMAGE_SHARE) + player.equipDamageMax
      ) * modifiers.rangedDamageMult * (player.weaponDamageMult ?? 1)
    );
  }

  return Math.round(
    randomInt(player.damageMin + player.equipDamageMin, player.damageMax + player.equipDamageMax) *
      modifiers.meleeDamageMult *
      (player.weaponDamageMult ?? 1)
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
    equipmentPerks: character.equipmentPerks ?? {},
    skills: character.skills ?? createSkills(),
    weaponDamageMult: 1,
    weaponSpeedMult: 1,
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
    dots: [],
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
  player.dots = [];
  player.input.moveX = 0;
  player.input.moveZ = 0;
  player.input.jump = false;
  player.velocityY = 0;
}

function respawnPlayer(player) {
  const homeZone = player.homeZone && getZone(player.homeZone) ? player.homeZone : null;
  const targetZone = homeZone ?? DEFAULT_ZONE_ID;
  const spawnId = homeZone && getZone(targetZone).spawns[HEARTH_SPAWN_ID] ? HEARTH_SPAWN_ID : null;

  if (player.zoneId !== targetZone) {
    player.pendingZone = targetZone;
    player.pendingSpawn = spawnId;
  } else {
    const spawn = spawnId ? getZone(targetZone).spawns[spawnId] : getZone(targetZone).spawn;
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;
    player.rotationY = spawn.rotationY ?? player.rotationY;
  }
  player.velocityY = 0;
  player.isGrounded = true;
  player.health = player.healthMax;
  player.resource = player.resourceMax;
  player.cooldowns = createCooldownState();
  player.buffs = {};
  player.dots = [];
  player.dead = false;
  player.attackTimer = PLAYER_ATTACK_INTERVAL;
  player.combatTimer = REGEN_DELAY;
}

let resolveGroupMates = () => [];

export function setGroupResolver(resolver) {
  resolveGroupMates = resolver;
}

function awardKill(killer, killerId, enemy, notify, onKill) {
  const recipients = [{ id: killerId, state: killer }, ...resolveGroupMates(killerId, killer, enemy)];
  const share = (1 + GROUP_BONUS_PER_MEMBER * (recipients.length - 1)) / recipients.length;
  const lootOwner = recipients[Math.floor(Math.random() * recipients.length)];

  onKill(recipients, lootOwner, enemy);

  for (const { id, state } of recipients) {
    const xpAmount = Math.round(xpForKill(state.level, enemy.level) * share);
    const goldAmount = Math.max(1, Math.round(goldForKill(state.level, enemy.level, enemy.boss === true) * getPlayerModifiers(state).goldMult * share));

    notify(id, { type: 'event', kind: 'kill', enemyName: enemy.name, enemyType: enemy.type });

    const levelsGained = grantXp(state, xpAmount);
    if (xpAmount > 0) {
      notify(id, { type: 'event', kind: 'xp', amount: xpAmount, enemyName: enemy.name, enemyType: enemy.type });
    }

    addGold(state, goldAmount);
    notify(id, { type: 'event', kind: 'gold', amount: goldAmount });

    if (levelsGained > 0) {
      notify(id, { type: 'event', kind: 'levelup', level: state.level });
    }
  }
}

function damageEnemy(enemy, amount, attackerId, attacker, emit, notify, onKill, abilityId = null, weaponId = null) {
  enemy.health = Math.max(0, enemy.health - amount);
  attacker.combatTimer = 0;
  enemy.provoked = true;
  emit({ type: 'damage', targetType: 'enemy', targetId: enemy.id, amount, attackerId, abilityId, weaponId });

  if (enemy.health === 0) {
    killEnemy(enemy);
    awardKill(attacker, attackerId, enemy, notify, onKill);
  } else if (enemy.state !== 'chase') {
    enemy.state = 'chase';
    enemy.targetPlayerId = attackerId;
  }
}

function dotStatus(notify, playerId, player) {
  notify(playerId, { type: 'event', kind: 'status', effects: (player.dots ?? []).map((dot) => ({ kind: dot.kind, seconds: Math.ceil(dot.remaining) })) });
}

function damagePlayer(player, playerId, enemy, emit, notify) {
  const rawAmount = Math.round(randomInt(3 + enemy.level * 2, 6 + enemy.level * 3) * enemy.damageFactor);
  const reduction = player.buffs?.brace > 0 ? ABILITIES.brace.damageReduction : 0;
  const amount = Math.max(1, Math.round(((rawAmount * armorConstant(enemy.level)) / (armorConstant(enemy.level) + player.armor)) * (1 - reduction)));
  player.health = Math.max(0, player.health - amount);
  player.combatTimer = 0;
  emit({ type: 'damage', targetType: 'player', targetId: playerId, amount, attackerId: enemy.id, shot: enemy.meleeRange > 4 ? (enemy.dot?.kind === 'burn' ? 'fire' : 'bullet') : undefined });

  if (player.health === 0) {
    killPlayer(player);
    dotStatus(notify, playerId, player);
    return;
  }

  if (enemy.dot) {
    const tick = Math.max(1, Math.round(amount * enemy.dot.factor * 3));
    player.dots = (player.dots ?? []).filter((dot) => dot.kind !== enemy.dot.kind);
    player.dots.push({ kind: enemy.dot.kind, remaining: enemy.dot.duration, timer: 1, tick, attackerId: enemy.id });
    dotStatus(notify, playerId, player);
  }
}

function updateDots(player, playerId, delta, emit, notify) {
  if (!player.dots?.length) return;

  for (const dot of player.dots) {
    dot.remaining -= delta;
    dot.timer -= delta;
    if (dot.timer > 0) continue;
    dot.timer += 1;
    player.health = Math.max(0, player.health - dot.tick);
    player.combatTimer = 0;
    emit({ type: 'damage', targetType: 'player', targetId: playerId, amount: dot.tick, attackerId: dot.attackerId });
    if (player.health === 0) {
      killPlayer(player);
      dotStatus(notify, playerId, player);
      return;
    }
  }

  const before = player.dots.length;
  player.dots = player.dots.filter((dot) => dot.remaining > 0);
  if (player.dots.length !== before) dotStatus(notify, playerId, player);
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
    player.attackTimer = Math.min(player.attackTimer + delta, ATTACK_TIMER_CAP);
    player.facingWarning = Math.max(0, (player.facingWarning ?? 0) - delta);

    for (const abilityId of Object.keys(player.cooldowns)) {
      player.cooldowns[abilityId] = Math.max(0, player.cooldowns[abilityId] - delta);
    }

    updateDots(player, playerId, delta, emit, notify);
    if (player.dead) continue;

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
      const interval = (ranged ? ranged.interval : PLAYER_ATTACK_INTERVAL) / (player.weaponSpeedMult ?? 1);
      const range = ranged ? ranged.range : PLAYER_ATTACK_RANGE;

      if (player.attackTimer >= interval && horizontalDistance(player, enemy) <= range && !isFacing(player, enemy)) {
        if (player.facingWarning <= 0) {
          player.facingWarning = FACING_WARNING_INTERVAL;
          notify(playerId, { type: 'event', kind: 'ability-failed', reason: 'not-facing' });
        }
      } else if (player.attackTimer >= interval && horizontalDistance(player, enemy) <= range) {
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

function updateEnemyAttacks(players, enemies, delta, emit, notify) {
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

    if (enemy.meleeRange > 4 && !hasLineOfSight(enemy.zoneId, enemy.x, enemy.z, target.x, target.z)) {
      enemy.attackTimer = 0;
      continue;
    }

    enemy.attackTimer += delta;

    if (enemy.attackTimer >= enemy.attackInterval) {
      enemy.attackTimer = 0;
      damagePlayer(target, enemy.targetPlayerId, enemy, emit, notify);
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
    const amount = Math.round(player.healthMax * ability.healPercent * getPlayerModifiers(player).healMult);
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

  if (ability.kind === 'aoe') {
    if (weapon?.ranged) return fail('melee-only');

    const targets = [...enemies.values()]
      .filter((candidate) => !candidate.dead && horizontalDistance(player, candidate) <= ability.radius)
      .sort((a, b) => horizontalDistance(player, a) - horizontalDistance(player, b))
      .slice(0, ability.maxTargets);

    if (targets.length === 0) return fail('no-enemies');

    spend();
    targets.forEach((target, index) => {
      const amount = Math.round(rollPlayerDamage(player) * ability.damageMultiplier);
      damageEnemy(target, amount, playerId, player, emit, notify, onKill, index === 0 ? ability.id : null);
    });
    return;
  }

  const enemy = player.targetEnemyId ? enemies.get(player.targetEnemyId) : null;

  if (!enemy || enemy.dead) return fail('no-target');

  if (ability.kind === 'ranged') {
    if (!weapon?.ranged) return fail('needs-ranged');
    if (horizontalDistance(player, enemy) > weapon.ranged.range) return fail('out-of-range');
    if (!isFacing(player, enemy)) return fail('not-facing');
    if (!fireRanged(player, playerId, enemy, weapon, emit, notify, onKill, ability.damageMultiplier, ability.id)) return;
    spend();
    player.attackTimer = 0;
    return;
  }

  if (weapon?.ranged) return fail('melee-only');
  if (horizontalDistance(player, enemy) > ability.range) return fail('out-of-range');
  if (!isFacing(player, enemy)) return fail('not-facing');

  spend();

  const amount = Math.round(rollPlayerDamage(player) * ability.damageMultiplier);
  if (ability.stunSeconds) enemy.stunTimer = ability.stunSeconds;
  damageEnemy(enemy, amount, playerId, player, emit, notify, onKill, ability.id);
}

export function updateCombat(players, enemies, delta, emit, notify, onKill) {
  updatePlayers(players, enemies, delta, emit, notify, onKill);
  updateEnemyAttacks(players, enemies, delta, emit, notify);
}
