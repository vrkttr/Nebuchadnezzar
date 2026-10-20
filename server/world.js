import { NPCS } from './npcs.js';

export const PLAYER_RADIUS = 0.4;
export const ENEMY_RADIUS = 0.5;

const WORLD_HALF_SIZE = 36;
const NPC_RADIUS = 0.5;
const MAX_ITERATIONS = 4;

function box(x, z, halfX, halfZ, rotation = 0) {
  return { type: 'box', x, z, halfX, halfZ, cos: Math.cos(rotation), sin: Math.sin(rotation) };
}

function circle(x, z, radius) {
  return { type: 'circle', x, z, radius };
}

const TREE_RADIUS = 0.4;

const TREES = [
  [-15.5, 12.8], [22.5, -9.5], [22, 13.4], [-10, -27], [8, -28], [22, -26], [-24, -18], [-33, -5],
  [-33, 8], [-31, -12], [33, -10], [34, 3], [33, 14], [-12, 17.5], [11, 17.8], [24, 17], [18, 31],
  [-24, 30], [4, 32], [28, 29], [-19, 17],
];

const COLLIDERS = [
  box(0, -17, 16.6, 5.6),
  box(-24, 0, 5.6, 12.1),
  circle(-1.45, -9.75, 0.15),
  circle(1.45, -9.75, 0.15),
  circle(-16.75, -2.95, 0.15),
  circle(-16.75, -0.05, 0.15),
  box(27.25, 3.6, 2.8, 9.7),
  circle(13.9, -6.1, 0.45),
  circle(18.1, -6.1, 0.45),
  circle(13.9, -1.9, 0.45),
  circle(18.1, -1.9, 0.45),
  box(20.1, 4, 0.45, 1.9),
  box(22.2, 4, 0.15, 1.9),
  circle(-5.8, -9.7, 0.45),
  box(-6.9, -9.9, 0.55, 0.55, 0.3),
  box(-7.9, -9.6, 0.5, 0.5, -0.2),
  box(6, -8.6, 0.95, 0.35),
  box(10, -8.6, 0.95, 0.35),
  box(7, -5, 1.2, 0.45),
  box(7, -3.6, 1.2, 0.45),
  box(10.5, -5, 1.2, 0.45),
  circle(-10.5, -4, 0.12),
  circle(-5.5, -4, 0.12),
  box(-14.5, -10.7, 0.5, 0.35),
  box(-13.3, -10.7, 0.5, 0.35),
  box(-12.1, -10.7, 0.5, 0.35),
  circle(-12.2, 5, 0.3),
  circle(-12.2, 7, 0.3),
  circle(-9.8, 5, 0.3),
  circle(-9.8, 7, 0.3),
  box(-8.4, 6, 0.5, 1.2),
  circle(-13.2, 7.4, 0.7),
  circle(-9, 10, 0.15),
  circle(9, 10, 0.15),
  circle(19, 0.6, 0.45),
  box(19.4, 8.4, 0.45, 0.4, 0.5),
  box(22.8, 7.6, 0.5, 0.5, 0.2),
  box(-21.75, 15, 18.3, 0.2),
  box(21.75, 15, 18.3, 0.2),
  box(-2.96, 13.6, 1.5, 0.12, 1.2),
  box(2.96, 13.6, 1.5, 0.12, Math.PI - 1.2),
  box(-7.5, 18.4, 1.7, 0.6, 0.25),
  box(8.2, 18.6, 1.5, 0.6, -0.2),
  box(12, 22.4, 2.2, 0.95, 0.15),
  box(-18, 24.5, 2.2, 0.95, -0.1),
  box(-2, 30.5, 2.2, 0.95, 1.1),
  box(-7.6, 29.8, 2.2, 0.95, 0.5),
  box(-14, 33.8, 1.7, 1.4),
  circle(-11, 31.4, 0.45),
  box(-9.4, 33.2, 0.5, 0.5, 0.4),
  box(-16.6, 31.4, 0.5, 0.5, -0.3),
  circle(-30, 20.6, 0.2),
  circle(-14, 20.6, 0.2),
  circle(12, 20.6, 0.2),
  circle(28, 20.6, 0.2),
  ...TREES.map(([x, z]) => circle(x, z, TREE_RADIUS)),
  ...Object.values(NPCS).map((npc) => circle(npc.x, npc.z, NPC_RADIUS)),
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pushOutOfCircle(entity, radius, collider) {
  const dx = entity.x - collider.x;
  const dz = entity.z - collider.z;
  const distance = Math.hypot(dx, dz);
  const minDistance = radius + collider.radius;

  if (distance >= minDistance) return false;

  if (distance < 1e-6) {
    entity.x += minDistance;
  } else {
    const push = (minDistance - distance) / distance;
    entity.x += dx * push;
    entity.z += dz * push;
  }

  return true;
}

function pushOutOfBox(entity, radius, collider) {
  const dx = entity.x - collider.x;
  const dz = entity.z - collider.z;
  const localX = dx * collider.cos - dz * collider.sin;
  const localZ = dx * collider.sin + dz * collider.cos;

  const nearestX = clamp(localX, -collider.halfX, collider.halfX);
  const nearestZ = clamp(localZ, -collider.halfZ, collider.halfZ);
  const offsetX = localX - nearestX;
  const offsetZ = localZ - nearestZ;
  const squaredDistance = offsetX * offsetX + offsetZ * offsetZ;

  if (squaredDistance >= radius * radius) return false;

  let pushX;
  let pushZ;

  if (squaredDistance > 1e-12) {
    const distance = Math.sqrt(squaredDistance);
    const scale = (radius - distance) / distance;
    pushX = offsetX * scale;
    pushZ = offsetZ * scale;
  } else {
    const penetrationX = collider.halfX - Math.abs(localX);
    const penetrationZ = collider.halfZ - Math.abs(localZ);

    if (penetrationX < penetrationZ) {
      pushX = (localX < 0 ? -1 : 1) * (penetrationX + radius);
      pushZ = 0;
    } else {
      pushX = 0;
      pushZ = (localZ < 0 ? -1 : 1) * (penetrationZ + radius);
    }
  }

  entity.x += pushX * collider.cos + pushZ * collider.sin;
  entity.z += -pushX * collider.sin + pushZ * collider.cos;

  return true;
}

export function resolveCollisions(entity, radius) {
  const limit = WORLD_HALF_SIZE - radius;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let moved = false;

    for (const collider of COLLIDERS) {
      const pushed =
        collider.type === 'circle'
          ? pushOutOfCircle(entity, radius, collider)
          : pushOutOfBox(entity, radius, collider);

      if (pushed) moved = true;
    }

    entity.x = clamp(entity.x, -limit, limit);
    entity.z = clamp(entity.z, -limit, limit);

    if (!moved) break;
  }
}

export function isBlocked(x, z, radius) {
  const probe = { x, z };
  resolveCollisions(probe, radius);
  return Math.hypot(probe.x - x, probe.z - z) > 1e-3;
}
