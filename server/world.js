import { treeColliders } from './forest.js';
import { getNpcsOfZone } from './npcs.js';
import { getZone, getZones } from './zoneLoader.js';

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

const GRID_CELL = 16;
const GRID_MARGIN = 2;
const GRID_OFFSET = 2048;
const GRID_STRIDE = 4096;
const NO_COLLIDERS = [];
const GRIDS_BY_ZONE = new Map();

function cellOf(value) {
  return Math.floor(value / GRID_CELL) + GRID_OFFSET;
}

function cellKey(ix, iz) {
  return ix * GRID_STRIDE + iz;
}

function colliderBounds(collider) {
  if (collider.type === 'circle') {
    return [collider.x - collider.radius, collider.z - collider.radius, collider.x + collider.radius, collider.z + collider.radius];
  }

  const cos = Math.abs(collider.cos);
  const sin = Math.abs(collider.sin);
  const halfX = cos * collider.halfX + sin * collider.halfZ;
  const halfZ = sin * collider.halfX + cos * collider.halfZ;
  return [collider.x - halfX, collider.z - halfZ, collider.x + halfX, collider.z + halfZ];
}

function buildGrid(colliders) {
  const grid = new Map();

  for (const collider of colliders) {
    const [minX, minZ, maxX, maxZ] = colliderBounds(collider);
    for (let ix = cellOf(minX - GRID_MARGIN); ix <= cellOf(maxX + GRID_MARGIN); ix += 1) {
      for (let iz = cellOf(minZ - GRID_MARGIN); iz <= cellOf(maxZ + GRID_MARGIN); iz += 1) {
        const key = cellKey(ix, iz);
        const list = grid.get(key);
        if (list) list.push(collider);
        else grid.set(key, [collider]);
      }
    }
  }

  return grid;
}

for (const zone of getZones()) {
  GRIDS_BY_ZONE.set(
    zone.id,
    buildGrid([
      ...zone.colliders.map((collider) =>
        collider.shape === 'circle'
          ? circle(collider.x, collider.z, collider.radius)
          : box(collider.x, collider.z, collider.halfX, collider.halfZ, collider.rotation)
      ),
      ...treeColliders(zone).map((tree) => circle(tree.x, tree.z, tree.radius)),
      ...getNpcsOfZone(zone.id).map((npc) => circle(npc.x, npc.z, NPC_RADIUS)),
    ])
  );
}

function collidersAt(zoneId, x, z) {
  return GRIDS_BY_ZONE.get(zoneId)?.get(cellKey(cellOf(x), cellOf(z))) ?? NO_COLLIDERS;
}

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
  const zone = getZone(entity.zoneId);
  const limitX = zone.halfWidth - radius;
  const limitZ = zone.halfHeight - radius;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    let moved = false;

    for (const collider of collidersAt(entity.zoneId, entity.x, entity.z)) {
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

export function isBlocked(zoneId, x, z, radius) {
  const probe = { zoneId, x, z };
  resolveCollisions(probe, radius);
  return Math.hypot(probe.x - x, probe.z - z) > 1e-3;
}

function segmentHitsCircle(ax, az, bx, bz, circleCollider) {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared < 1e-9) return false;
  const t = clamp(((circleCollider.x - ax) * dx + (circleCollider.z - az) * dz) / lengthSquared, 0, 1);
  return Math.hypot(ax + dx * t - circleCollider.x, az + dz * t - circleCollider.z) < circleCollider.radius;
}

function segmentHitsBox(ax, az, bx, bz, boxCollider) {
  const toLocalX = (x, z) => (x - boxCollider.x) * boxCollider.cos - (z - boxCollider.z) * boxCollider.sin;
  const toLocalZ = (x, z) => (x - boxCollider.x) * boxCollider.sin + (z - boxCollider.z) * boxCollider.cos;
  const startX = toLocalX(ax, az);
  const startZ = toLocalZ(ax, az);
  const deltaX = toLocalX(bx, bz) - startX;
  const deltaZ = toLocalZ(bx, bz) - startZ;

  let near = 0;
  let far = 1;

  for (const [start, delta, half] of [
    [startX, deltaX, boxCollider.halfX],
    [startZ, deltaZ, boxCollider.halfZ],
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (Math.abs(start) > half) return false;
      continue;
    }
    let t1 = (-half - start) / delta;
    let t2 = (half - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1);
    far = Math.min(far, t2);
    if (near > far) return false;
  }

  return true;
}

export function hasLineOfSight(zoneId, ax, az, bx, bz) {
  const length = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(length / (GRID_CELL / 2)));
  const checked = new Set();

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    for (const collider of collidersAt(zoneId, ax + (bx - ax) * t, az + (bz - az) * t)) {
      if (checked.has(collider)) continue;
      checked.add(collider);
      const hit = collider.type === 'circle' ? segmentHitsCircle(ax, az, bx, bz, collider) : segmentHitsBox(ax, az, bx, bz, collider);
      if (hit) return false;
    }
  }

  return true;
}
