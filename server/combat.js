const PLAYER_ATTACK_RANGE = 3;
const PLAYER_ATTACK_INTERVAL = 1.5;
const PLAYER_DAMAGE_MIN = 8;
const PLAYER_DAMAGE_MAX = 12;
const PLAYER_RESPAWN_TIME = 4;
const PLAYER_HEALTH_MAX = 100;
const REGEN_DELAY = 6;
const REGEN_PER_SECOND = 3;

export const ENEMY_MELEE_RANGE = 2;
const ENEMY_ATTACK_INTERVAL = 2;
const ENEMY_RESPAWN_TIME = 15;

const SPAWN_POINT = { x: 0, y: 0, z: 0 };

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function createCombatState() {
  return {
    health: PLAYER_HEALTH_MAX,
    healthMax: PLAYER_HEALTH_MAX,
    dead: false,
    respawnTimer: 0,
    targetEnemyId: null,
    autoAttack: false,
    attackTimer: PLAYER_ATTACK_INTERVAL,
    combatTimer: REGEN_DELAY,
  };
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
  player.dead = false;
  player.attackTimer = PLAYER_ATTACK_INTERVAL;
  player.combatTimer = REGEN_DELAY;
}

function damageEnemy(enemy, amount, attackerId, attacker, emit) {
  enemy.health = Math.max(0, enemy.health - amount);
  attacker.combatTimer = 0;
  emit({ type: 'damage', targetType: 'enemy', targetId: enemy.id, amount });

  if (enemy.health === 0) {
    killEnemy(enemy);
  } else if (enemy.state !== 'chase') {
    enemy.state = 'chase';
    enemy.targetPlayerId = attackerId;
  }
}

function damagePlayer(player, playerId, enemy, emit) {
  const amount = randomInt(3 + enemy.level * 2, 6 + enemy.level * 3);
  player.health = Math.max(0, player.health - amount);
  player.combatTimer = 0;
  emit({ type: 'damage', targetType: 'player', targetId: playerId, amount });

  if (player.health === 0) {
    killPlayer(player);
  }
}

function updatePlayers(players, enemies, delta, emit) {
  for (const [playerId, player] of players) {
    if (player.dead) {
      player.respawnTimer -= delta;
      if (player.respawnTimer <= 0) respawnPlayer(player);
      continue;
    }

    player.combatTimer += delta;
    player.attackTimer = Math.min(player.attackTimer + delta, PLAYER_ATTACK_INTERVAL);

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
      damageEnemy(enemy, randomInt(PLAYER_DAMAGE_MIN, PLAYER_DAMAGE_MAX), playerId, player, emit);
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

export function updateCombat(players, enemies, delta, emit) {
  updatePlayers(players, enemies, delta, emit);
  updateEnemyAttacks(players, enemies, delta, emit);
}
