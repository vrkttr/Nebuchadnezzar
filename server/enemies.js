import { ENEMY_MELEE_RANGE } from './combat.js';
import { ENEMY_RADIUS, isBlocked, resolveCollisions } from './world.js';
import { getZone, getZones } from './zoneLoader.js';

const ENEMY_TYPES = {
  raider: { name: 'Plünderer', healthMax: 60, lootTable: 'raider' },
  scavenger: { name: 'Schrottsammler', healthMax: 70, lootTable: 'scavenger' },
  marauder: { name: 'Marodeur', healthMax: 140, lootTable: 'marauder' },
};

const SPAWNS_BY_ZONE = new Map();

for (const zone of getZones()) {
  SPAWNS_BY_ZONE.set(
    zone.id,
    zone.enemies.map((placement) => {
      const definition = ENEMY_TYPES[placement.type];
      if (!definition) throw new Error(`Zonendatei: Unbekannter Gegnertyp "${placement.type}".`);
      if (!Number.isInteger(placement.level) || placement.level < 1) throw new Error(`Zonendatei: Ungültiges Level für Gegner "${placement.type}".`);
      return {
        type: placement.type,
        name: definition.name,
        level: placement.level,
        x: placement.x,
        y: 0,
        z: placement.z,
        healthMax: Number(placement.healthMax) || definition.healthMax,
        lootTable: definition.lootTable,
      };
    })
  );
}

const AGGRO_RANGE = 8;
const LEASH_RANGE = 20;
const MOVE_SPEED = 3;
const HOME_TOLERANCE = 0.15;
const STUCK_PROGRESS_RATIO = 0.2;
const STUCK_LIMIT = 3;
const WANDER_RADIUS = 6;
const WANDER_SPEED = 1.2;
const WANDER_PAUSE_MIN = 3;
const WANDER_PAUSE_MAX = 8;
const WANDER_ARRIVE_DISTANCE = 0.2;
const WANDER_STUCK_LIMIT = 1.5;
const WANDER_PICK_ATTEMPTS = 8;

export function createEnemies(zoneId) {
  const enemies = new Map();

  SPAWNS_BY_ZONE.get(zoneId).forEach((spawn, index) => {
    const id = `${zoneId}-enemy-${index + 1}`;
    enemies.set(id, {
      id,
      zoneId,
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
      wanderTargetX: null,
      wanderTargetZ: null,
      wanderPause: WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN),
      wanderStuck: 0,
    });
  });

  return enemies;
}

export function serializeEnemies(enemies) {
  return Array.from(enemies.values()).map((enemy) => ({
    id: enemy.id,
    type: enemy.type,
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

function moveToward(enemy, targetX, targetZ, delta, speed = MOVE_SPEED) {
  const dx = targetX - enemy.x;
  const dz = targetZ - enemy.z;
  const distance = Math.hypot(dx, dz);

  if (distance === 0) return 0;

  const step = Math.min(distance, speed * delta);
  enemy.x += (dx / distance) * step;
  enemy.z += (dz / distance) * step;
  enemy.rotationY = Math.atan2(dx, dz);

  return distance - step;
}

function endWander(enemy) {
  enemy.wanderTargetX = null;
  enemy.wanderTargetZ = null;
  enemy.wanderStuck = 0;
  enemy.wanderPause =
    WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN);
}

function pickWanderTarget(enemy) {
  for (let attempt = 0; attempt < WANDER_PICK_ATTEMPTS; attempt += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * WANDER_RADIUS;
    const x = enemy.spawnX + Math.cos(angle) * radius;
    const z = enemy.spawnZ + Math.sin(angle) * radius;

    if (isBlocked(enemy.zoneId, x, z, ENEMY_RADIUS)) continue;

    enemy.wanderTargetX = x;
    enemy.wanderTargetZ = z;
    enemy.wanderStuck = 0;
    return true;
  }

  return false;
}

function updateWander(enemy, delta) {
  if (enemy.wanderTargetX === null) {
    enemy.wanderPause -= delta;
    if (enemy.wanderPause > 0) return;

    if (!pickWanderTarget(enemy)) enemy.wanderPause = WANDER_PAUSE_MIN;
    return;
  }

  const before = horizontalDistance(enemy.x, enemy.z, enemy.wanderTargetX, enemy.wanderTargetZ);
  moveToward(enemy, enemy.wanderTargetX, enemy.wanderTargetZ, delta, WANDER_SPEED);
  resolveCollisions(enemy, ENEMY_RADIUS);
  const after = horizontalDistance(enemy.x, enemy.z, enemy.wanderTargetX, enemy.wanderTargetZ);

  if (before - after < WANDER_SPEED * delta * STUCK_PROGRESS_RATIO) {
    enemy.wanderStuck += delta;
  } else {
    enemy.wanderStuck = 0;
  }

  if (after <= WANDER_ARRIVE_DISTANCE || enemy.wanderStuck >= WANDER_STUCK_LIMIT) {
    endWander(enemy);
  }
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
        endWander(enemy);
      } else {
        updateWander(enemy, delta);
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
