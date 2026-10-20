import { NPCS } from './npcs.js';
import { zone } from './zoneLoader.js';

export const PLAYER_RADIUS = 0.4;
export const ENEMY_RADIUS = 0.5;

const NPC_RADIUS = 0.5;
const MAX_ITERATIONS = 4;

function box(x, z, halfX, halfZ, rotation = 0) {
  return { type: 'box', x, z, halfX, halfZ, cos: Math.cos(rotation), sin: Math.sin(rotation) };
}

function circle(x, z, radius) {
  return { type: 'circle', x, z, radius };
}

const COLLIDERS = [
  ...zone.colliders.map((collider) =>
    collider.shape === 'circle'
      ? circle(collider.x, collider.z, collider.radius)
      : box(collider.x, collider.z, collider.halfX, collider.halfZ, collider.rotation)
  ),
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
  const limitX = zone.halfWidth - radius;
  const limitZ = zone.halfHeight - radius;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let moved = false;

    for (const collider of COLLIDERS) {
      const pushed =
        collider.type === 'circle'
          ? pushOutOfCircle(entity, radius, collider)
          : pushOutOfBox(entity, radius, collider);

      if (pushed) moved = true;
    }

    entity.x = clamp(entity.x, -limitX, limitX);
    entity.z = clamp(entity.z, -limitZ, limitZ);

    if (!moved) break;
  }
}

export function isBlocked(x, z, radius) {
  const probe = { x, z };
  resolveCollisions(probe, radius);
  return Math.hypot(probe.x - x, probe.z - z) > 1e-3;
}
