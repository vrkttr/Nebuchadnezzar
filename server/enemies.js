import { ENEMY_MELEE_RANGE } from './combat.js';
import { ENEMY_RADIUS, resolveCollisions } from './world.js';

const SPAWNS = [
  { type: 'raider', name: 'Plünderer', level: 1, x: 10, y: 0, z: -9, healthMax: 60, lootTable: 'raider' },
  { type: 'raider', name: 'Plünderer', level: 1, x: 12, y: 0, z: -7, healthMax: 60, lootTable: 'raider' },
  { type: 'raider', name: 'Plünderer', level: 2, x: 8, y: 0, z: -11, healthMax: 80, lootTable: 'raider' },
];

const AGGRO_RANGE = 8;
const LEASH_RANGE = 20;
const MOVE_SPEED = 3;
const HOME_TOLERANCE = 0.15;
const STUCK_PROGRESS_RATIO = 0.2;
const STUCK_LIMIT = 3;

export function createEnemies() {
  const enemies = new Map();

  SPAWNS.forEach((spawn, index) => {
    const id = `enemy-${index + 1}`;
    enemies.set(id, {
      id,
      type: spawn.type,
      name: spawn.name,
      level: spawn.level,
      lootTable: spawn.lootTable,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      spawnX: spawn.x,
      spawnZ: spawn.z,
      rotationY: 0,
      health: spawn.healthMax,
      healthMax: spawn.healthMax,
      state: 'idle',
      targetPlayerId: null,
      dead: false,
      respawnTimer: 0,
      attackTimer: 0,
      stuckTimer: 0,
    });
  });

  return enemies;
}

export function serializeEnemies(enemies) {
  return Array.from(enemies.values()).map((enemy) => ({
    id: enemy.id,
    name: enemy.name,
    level: enemy.level,
    x: enemy.x,
    y: enemy.y,
    z: enemy.z,
    rotationY: enemy.rotationY,
    health: enemy.health,
    healthMax: enemy.healthMax,
    dead: enemy.dead,
  }));
}

export function serializeEnemyStates(enemies) {
  return Array.from(enemies.values()).map((enemy) => ({
    id: enemy.id,
    x: enemy.x,
    y: enemy.y,
    z: enemy.z,
    rotationY: enemy.rotationY,
    health: enemy.health,
    healthMax: enemy.healthMax,
    dead: enemy.dead,
  }));
}

function horizontalDistance(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

function findNearestPlayerInRange(enemy, players, range) {
  let nearestId = null;
  let nearestDistance = range;

  for (const [id, player] of players) {
    if (player.dead) continue;

    const distance = horizontalDistance(enemy.x, enemy.z, player.x, player.z);
    if (distance <= nearestDistance) {
      nearestDistance = distance;
      nearestId = id;
    }
  }

  return nearestId;
}

function trackProgress(enemy, distanceBefore, distanceAfter, delta) {
  if (distanceBefore - distanceAfter < MOVE_SPEED * delta * STUCK_PROGRESS_RATIO) {
    enemy.stuckTimer += delta;
  } else {
    enemy.stuckTimer = 0;
  }
}

function moveToward(enemy, targetX, targetZ, delta) {
  const dx = targetX - enemy.x;
  const dz = targetZ - enemy.z;
  const distance = Math.hypot(dx, dz);

  if (distance === 0) return 0;

  const step = Math.min(distance, MOVE_SPEED * delta);
  enemy.x += (dx / distance) * step;
  enemy.z += (dz / distance) * step;
  enemy.rotationY = Math.atan2(dx, dz);

  return distance - step;
}

export function updateEnemies(enemies, players, delta) {
  for (const enemy of enemies.values()) {
    if (enemy.dead) continue;

    if (enemy.state === 'idle') {
      const targetId = findNearestPlayerInRange(enemy, players, AGGRO_RANGE);
      if (targetId) {
        enemy.state = 'chase';
        enemy.targetPlayerId = targetId;
        enemy.stuckTimer = 0;
      }
    } else if (enemy.state === 'chase') {
      const target = players.get(enemy.targetPlayerId);
      const distanceFromSpawn = horizontalDistance(enemy.x, enemy.z, enemy.spawnX, enemy.spawnZ);

      if (!target || target.dead || distanceFromSpawn > LEASH_RANGE) {
        enemy.state = 'return';
        enemy.targetPlayerId = null;
        enemy.stuckTimer = 0;
        continue;
      }

      const distanceToTarget = horizontalDistance(enemy.x, enemy.z, target.x, target.z);

      if (distanceToTarget > ENEMY_MELEE_RANGE) {
        moveToward(enemy, target.x, target.z, delta);
        resolveCollisions(enemy, ENEMY_RADIUS);
        trackProgress(
          enemy,
          distanceToTarget,
          horizontalDistance(enemy.x, enemy.z, target.x, target.z),
          delta
        );

        if (enemy.stuckTimer >= STUCK_LIMIT) {
          enemy.state = 'return';
          enemy.targetPlayerId = null;
          enemy.stuckTimer = 0;
        }
      } else {
        enemy.stuckTimer = 0;
        enemy.rotationY = Math.atan2(target.x - enemy.x, target.z - enemy.z);
      }
    } else if (enemy.state === 'return') {
      const distanceBefore = horizontalDistance(enemy.x, enemy.z, enemy.spawnX, enemy.spawnZ);
      const remaining = moveToward(enemy, enemy.spawnX, enemy.spawnZ, delta);
      resolveCollisions(enemy, ENEMY_RADIUS);
      trackProgress(
        enemy,
        distanceBefore,
        horizontalDistance(enemy.x, enemy.z, enemy.spawnX, enemy.spawnZ),
        delta
      );

      if (remaining <= HOME_TOLERANCE || enemy.stuckTimer >= STUCK_LIMIT) {
        enemy.x = enemy.spawnX;
        enemy.z = enemy.spawnZ;
        enemy.state = 'idle';
        enemy.health = enemy.healthMax;
        enemy.stuckTimer = 0;
      }
    }
  }
}
