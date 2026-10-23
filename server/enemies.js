import { getPlayerModifiers } from './skills.js';
import { ENEMY_RADIUS, hasLineOfSight, isBlocked, resolveCollisions } from './world.js';
import { groundHeight } from './terrain.js';
import { getZone, getZones } from './zoneLoader.js';

const CROUCH_AGGRO_FACTOR = 0.5;
const HUMAN = { moveSpeed: 3, aggroRange: 8, attackInterval: 2, damageFactor: 1, meleeRange: 2 };
const DOG = { moveSpeed: 4.6, aggroRange: 11, attackInterval: 1.4, damageFactor: 0.8, meleeRange: 1.8 };
const RAT = { moveSpeed: 3.8, aggroRange: 7, attackInterval: 1.2, damageFactor: 0.65, meleeRange: 1.5 };
const BEAST = { moveSpeed: 5, aggroRange: 10, attackInterval: 1.4, damageFactor: 0.9, meleeRange: 1.8 };
const PACK_RANGE = 14;

const ENEMY_TYPES = {
  stray_dog: { ...DOG, name: 'Streunender Hund', healthBase: 15, healthPerLevel: 8, damageFactor: 0.7, lootTable: 'dog' },
  feral_dog: { ...DOG, name: 'Wilder Hund', healthBase: 25, healthPerLevel: 12, moveSpeed: 5, aggroRange: 13, lootTable: 'dog' },
  raider: { ...HUMAN, name: 'Plünderer', healthBase: 35, healthPerLevel: 10, lootTable: 'raider' },
  scavenger: { ...HUMAN, name: 'Schrottsammler', healthBase: 45, healthPerLevel: 10, damageFactor: 0.9, lootTable: 'scavenger' },
  marauder: { ...HUMAN, name: 'Marodeur', healthBase: 80, healthPerLevel: 20, lootTable: 'marauder' },
  deserter: { ...HUMAN, name: 'Deserteur', healthBase: 70, healthPerLevel: 16, aggroRange: 10, damageFactor: 1.1, lootTable: 'deserter' },
  brute: { ...HUMAN, name: 'Schläger', healthBase: 120, healthPerLevel: 25, moveSpeed: 2.6, attackInterval: 2.5, damageFactor: 1.5, lootTable: 'brute' },
  wild_boar: { ...BEAST, name: 'Wildschwein', healthBase: 60, healthPerLevel: 14, moveSpeed: 5.2, aggroRange: 9, attackInterval: 1.8, damageFactor: 1.1, meleeRange: 1.7, lootTable: 'boar' },
  wolf: { ...BEAST, name: 'Wolf', healthBase: 45, healthPerLevel: 11, moveSpeed: 5.4, aggroRange: 14, attackInterval: 1.2, damageFactor: 0.8, pack: 'wolf', lootTable: 'wolf' },
  alpha_wolf: { ...BEAST, name: 'Leitwolf', healthBase: 90, healthPerLevel: 16, moveSpeed: 5.6, aggroRange: 16, attackInterval: 1.3, damageFactor: 1, meleeRange: 2, pack: 'wolf', lootTable: 'wolf' },
  bear: { ...BEAST, name: 'Bär', healthBase: 150, healthPerLevel: 30, moveSpeed: 3.2, aggroRange: 8, attackInterval: 2.4, damageFactor: 1.7, meleeRange: 2.3, lootTable: 'bear' },
  trapper: { ...HUMAN, name: 'Fallensteller', healthBase: 60, healthPerLevel: 14, aggroRange: 9, damageFactor: 0.9, dot: { kind: 'bleed', duration: 6, factor: 0.12 }, lootTable: 'trapper' },
  highwayman: { ...HUMAN, name: 'Wegelagerer', healthBase: 70, healthPerLevel: 15, aggroRange: 12, attackInterval: 2.6, damageFactor: 1.4, meleeRange: 9, lootTable: 'highwayman' },
  lumberjack: { ...HUMAN, name: 'Holzfäller', healthBase: 140, healthPerLevel: 28, moveSpeed: 2.4, attackInterval: 2.8, damageFactor: 1.9, meleeRange: 2.3, lootTable: 'lumberjack' },
  rust_gang: { ...HUMAN, name: 'Rostbande', healthBase: 55, healthPerLevel: 12, aggroRange: 9, pack: 'rust', lootTable: 'scavenger' },
  guard_dog: { ...DOG, name: 'Wachhund', healthBase: 40, healthPerLevel: 10, moveSpeed: 5, aggroRange: 12, damageFactor: 0.85, pack: 'guards', lootTable: 'dog' },
  chain_dog: { ...DOG, name: 'Kettenhund', healthBase: 90, healthPerLevel: 18, moveSpeed: 4.8, aggroRange: 13, damageFactor: 1.1, meleeRange: 2, pack: 'guards', lootTable: 'dog' },
  arsonist: { ...HUMAN, name: 'Brandstifter', healthBase: 65, healthPerLevel: 14, aggroRange: 11, attackInterval: 3, damageFactor: 0.8, meleeRange: 10, dot: { kind: 'burn', duration: 5, factor: 0.14 }, lootTable: 'arsonist' },
  bandit_boss: { ...HUMAN, name: 'Räuberhauptmann', healthBase: 400, healthPerLevel: 45, attackInterval: 1.8, damageFactor: 1.3, meleeRange: 2.2, aggroRange: 10, lootTable: 'boss' },
  bat: { ...BEAST, name: 'Fledermaus', healthBase: 20, healthPerLevel: 3, moveSpeed: 5.5, aggroRange: 10, attackInterval: 1, damageFactor: 0.35, meleeRange: 1.4, pack: 'bats', lootTable: 'bat' },
  cave_spider: { ...BEAST, name: 'Höhlenspinne', healthBase: 110, healthPerLevel: 16, moveSpeed: 4.4, aggroRange: 9, attackInterval: 1.6, damageFactor: 0.9, dot: { kind: 'poison', duration: 8, factor: 0.1 }, lootTable: 'spider' },
  lost_one: { ...HUMAN, name: 'Verirrter', healthBase: 100, healthPerLevel: 16, aggroRange: 7, damageFactor: 1, pack: 'lost', lootTable: 'lost' },
  smuggler: { ...HUMAN, name: 'Schmuggler', healthBase: 110, healthPerLevel: 18, aggroRange: 14, attackInterval: 2.4, damageFactor: 1.3, meleeRange: 14, lootTable: 'smuggler' },
  cave_bear: { ...BEAST, name: 'Höhlenbär', healthBase: 4200, healthPerLevel: 0, moveSpeed: 3.4, aggroRange: 9, attackInterval: 2.2, damageFactor: 1.2, meleeRange: 2.6, lootTable: 'cave_bear' },
  rat: { ...RAT, name: 'Kanalratte', healthBase: 25, healthPerLevel: 4, lootTable: 'rat' },
  giant_rat: { ...RAT, name: 'Riesenratte', healthBase: 50, healthPerLevel: 10, moveSpeed: 3.5, damageFactor: 0.85, meleeRange: 1.8, lootTable: 'rat' },
  plague_rat: { ...RAT, name: 'Seuchenratte', healthBase: 55, healthPerLevel: 12, damageFactor: 1, aggroRange: 9, lootTable: 'rat' },
  rat_king: { ...RAT, name: 'Rattenkönig', healthBase: 200, healthPerLevel: 25, moveSpeed: 2.8, attackInterval: 2, damageFactor: 1.5, meleeRange: 2.4, aggroRange: 10, lootTable: 'rat_king' },
  sewer_dweller: { ...HUMAN, name: 'Kanalbewohner', healthBase: 90, healthPerLevel: 14, damageFactor: 1.1, lootTable: 'sewer_dweller' },
  caretaker: { ...HUMAN, name: 'Der Hausmeister', healthBase: 3000, healthPerLevel: 0, moveSpeed: 2.4, attackInterval: 3, damageFactor: 0.7, aggroRange: 6, lootTable: 'boss' },
  block_warden: { ...HUMAN, name: 'Die Blockwartin', healthBase: 2400, healthPerLevel: 0, moveSpeed: 3.2, attackInterval: 2, damageFactor: 0.55, aggroRange: 7, lootTable: 'boss' },
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
        healthMax: Number(placement.healthMax) || definition.healthBase + definition.healthPerLevel * placement.level,
        lootTable: definition.lootTable,
        moveSpeed: definition.moveSpeed,
        aggroRange: definition.aggroRange,
        attackInterval: definition.attackInterval,
        damageFactor: definition.damageFactor,
        meleeRange: definition.meleeRange,
        pack: definition.pack ?? null,
        dot: definition.dot ?? null,
      };
    })
  );
}

const LEASH_RANGE = 20;
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
      moveSpeed: spawn.moveSpeed,
      aggroRange: spawn.aggroRange,
      attackInterval: spawn.attackInterval,
      damageFactor: spawn.damageFactor,
      meleeRange: spawn.meleeRange,
      pack: spawn.pack,
      dot: spawn.dot,
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
      stunTimer: 0,
      stuckTimer: 0,
      wanderTargetX: null,
      wanderTargetZ: null,
      wanderPause: WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN),
      wanderStuck: 0,
    });
  });

  return enemies;
}

export function serializeEnemy(enemy) {
  return {
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
  };
}

export function serializeEnemyState(enemy) {
  return {
    id: enemy.id,
    x: enemy.x,
    y: enemy.y,
    z: enemy.z,
    rotationY: enemy.rotationY,
    health: enemy.health,
    healthMax: enemy.healthMax,
    dead: enemy.dead,
  };
}

export function serializeEnemies(enemies) {
  return Array.from(enemies.values(), serializeEnemy);
}

export function serializeEnemyStates(enemies) {
  return Array.from(enemies.values(), serializeEnemyState);
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
    const reach = range * (player.input?.crouch ? CROUCH_AGGRO_FACTOR : 1) * getPlayerModifiers(player).aggroMult;
    if (distance <= reach && distance <= nearestDistance) {
      nearestDistance = distance;
      nearestId = id;
    }
  }

  return nearestId;
}

function trackProgress(enemy, distanceBefore, distanceAfter, delta) {
  if (distanceBefore - distanceAfter < enemy.moveSpeed * delta * STUCK_PROGRESS_RATIO) {
    enemy.stuckTimer += delta;
  } else {
    enemy.stuckTimer = 0;
  }
}

function moveToward(enemy, targetX, targetZ, delta, speed = enemy.moveSpeed) {
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

const SIMULATION_RANGE = 260;

function hasPlayerNearby(enemy, players) {
  for (const player of players.values()) {
    if (Math.abs(player.x - enemy.x) <= SIMULATION_RANGE && Math.abs(player.z - enemy.z) <= SIMULATION_RANGE) return true;
  }
  return false;
}

export function updateEnemies(enemies, players, delta) {
  for (const enemy of enemies.values()) {
    if (enemy.dead) continue;
    enemy.y = groundHeight(enemy.zoneId, enemy.x, enemy.z);
    if (enemy.stunTimer > 0) continue;
    if (enemy.state === 'idle' && !hasPlayerNearby(enemy, players)) continue;

    if (enemy.state === 'idle') {
      enemy.provoked = false;
      const targetId = findNearestPlayerInRange(enemy, players, enemy.aggroRange);
      if (targetId) {
        enemy.state = 'chase';
        enemy.targetPlayerId = targetId;
        enemy.stuckTimer = 0;
        endWander(enemy);
        if (enemy.pack) {
          for (const mate of enemies.values()) {
            if (mate === enemy || mate.dead || mate.state !== 'idle' || mate.pack !== enemy.pack) continue;
            if (horizontalDistance(mate.x, mate.z, enemy.x, enemy.z) > PACK_RANGE) continue;
            mate.state = 'chase';
            mate.targetPlayerId = targetId;
            mate.stuckTimer = 0;
            endWander(mate);
          }
        }
      } else {
        updateWander(enemy, delta);
      }
    } else if (enemy.state === 'chase') {
      const target = players.get(enemy.targetPlayerId);
      const distanceFromSpawn = horizontalDistance(enemy.x, enemy.z, enemy.spawnX, enemy.spawnZ);

      if (!target || target.dead || (!enemy.provoked && distanceFromSpawn > LEASH_RANGE)) {
        enemy.state = 'return';
        enemy.targetPlayerId = null;
        enemy.stuckTimer = 0;
        continue;
      }

      const distanceToTarget = horizontalDistance(enemy.x, enemy.z, target.x, target.z);

      const lineBlocked = enemy.meleeRange > 4 && !hasLineOfSight(enemy.zoneId, enemy.x, enemy.z, target.x, target.z);

      if (distanceToTarget > enemy.meleeRange || lineBlocked) {
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
