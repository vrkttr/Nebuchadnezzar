import { getZones } from './zoneLoader.js';
import { hasLineOfSight, isBlocked, resolveCollisions } from './world.js';

const CITIZEN_SPACING = 34;
const DOG_SPACING = 184;
const CHICKEN_SPACING = 160;
const VIEW = { citizen: [110, 135], dog: [110, 135], chicken: [80, 105] };
const SIM_RADIUS = 150;
const SEND_EVERY = 2;
const POINT_SPACING = 7;
const ARRIVE_DISTANCE = 0.35;
const STUCK_LIMIT = 1.4;
const PICK_ATTEMPTS = 10;

const RADIUS = { citizen: 0.45, dog: 0.4, chicken: 0.22 };
const POSE = { walk: 0, idle: 1, sit: 2, lie: 3 };

const BENCH_APPROACH = 0.95;
const BENCH_SEAT_BACK = 0.04;

function hash(value) {
  let h = 2166136261;
  const text = String(value);
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function seeded(seed) {
  let state = Math.floor(seed * 4294967296) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildPath(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { points, lengths, total: lengths[lengths.length - 1] };
}

function sample(path, s) {
  const { points, lengths, total } = path;
  const clamped = Math.max(0, Math.min(total - 1e-4, s));
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < clamped) i += 1;
  const a = points[i - 1];
  const b = points[i];
  const l = lengths[i] - lengths[i - 1] || 1;
  const t = (clamped - lengths[i - 1]) / l;
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l };
}

function buildPlaces(zone) {
  const benches = [];
  const doors = zone.entrances.map((entrance) => ({
    id: entrance.id,
    x: entrance.x,
    z: entrance.z,
    facingX: Math.sin(entrance.rotation),
    facingZ: Math.cos(entrance.rotation),
  }));

  for (const visual of zone.visuals) {
    if (visual.kind !== 'bank') continue;
    const facingX = Math.sin(visual.rotation);
    const facingZ = Math.cos(visual.rotation);
    benches.push({
      id: `${Math.round(visual.x * 10)}_${Math.round(visual.z * 10)}`,
      seatX: visual.x - facingX * BENCH_SEAT_BACK,
      seatZ: visual.z - facingZ * BENCH_SEAT_BACK,
      approachX: visual.x + facingX * BENCH_APPROACH,
      approachZ: visual.z + facingZ * BENCH_APPROACH,
      facingX,
      facingZ,
      rotation: visual.rotation,
      taken: null,
    });
  }

  const points = [];
  zone.visuals.forEach((visual) => {
    if (visual.kind !== 'weg' || !visual.points || visual.points.length < 2) return;
    const path = buildPath(visual.points);
    const width = visual.props?.breite ?? 5;
    for (let s = POINT_SPACING / 2; s < path.total; s += POINT_SPACING) {
      const at = sample(path, s);
      points.push({ x: at.x, z: at.z, nx: -at.tz, nz: at.tx, spread: Math.max(0.5, width / 2 - 0.8) });
    }
  });

  return { benches, doors, points };
}

function findFreeSpot(zoneId, x, z, radius, random) {
  if (!isBlocked(zoneId, x, z, radius)) return { x, z };
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const angle = random() * Math.PI * 2;
    const distance = 0.8 + random() * 3.2;
    const candidateX = x + Math.cos(angle) * distance;
    const candidateZ = z + Math.sin(angle) * distance;
    if (!isBlocked(zoneId, candidateX, candidateZ, radius)) return { x: candidateX, z: candidateZ };
  }
  return null;
}

function buildZoneAmbient(zone) {
  const entities = new Map();
  if (!zone.chunked) return { entities, places: null };

  const places = buildPlaces(zone);
  let counter = 0;

  zone.visuals.forEach((visual, index) => {
    if (visual.kind !== 'weg' || !visual.points || visual.points.length < 2) return;
    const path = buildPath(visual.points);
    if (path.total < 1) return;
    const width = visual.props?.breite ?? 5;
    const random = seeded(hash(`${zone.id}-weg-${index}`));

    const make = (kind, count, extra = {}) => {
      for (let n = 0; n < count; n += 1) {
        const at = sample(path, random() * path.total);
        const side = random() < 0.5 ? -1 : 1;
        const lateral = kind === 'chicken' ? side * (width / 2 + 0.2 + random() * 0.8) : (random() * 2 - 1) * Math.max(0.5, width / 2 - 0.7);
        const spot = findFreeSpot(zone.id, at.x - at.tz * lateral, at.z + at.tx * lateral, RADIUS[kind], random);
        if (!spot) continue;

        counter += 1;
        const id = `a${counter}`;
        const entity = {
          id,
          zoneId: zone.id,
          kind,
          seed: Math.round(random() * 1e6),
          x: spot.x,
          z: spot.z,
          homeX: spot.x,
          homeZ: spot.z,
          rotationY: random() * Math.PI * 2,
          state: 'idle',
          timer: random() * 8,
          speed: 1,
          targetX: 0,
          targetZ: 0,
          targetKind: null,
          targetRef: null,
          stuck: 0,
          bench: null,
          door: null,
          hidden: false,
          random: seeded(random()),
          ...extra,
        };
        entities.set(id, entity);
      }
    };

    make('citizen', Math.max(1, Math.round(path.total / CITIZEN_SPACING)));
    make('dog', Math.max(0, Math.round(path.total / DOG_SPACING)));
    make('chicken', Math.max(1, Math.round(path.total / CHICKEN_SPACING)) * 3);
  });

  return { entities, places };
}

const BY_ZONE = new Map(getZones().map((zone) => [zone.id, buildZoneAmbient(zone)]));

export function getAmbient(zoneId) {
  return BY_ZONE.get(zoneId)?.entities ?? new Map();
}

function between(random, min, max) {
  return min + random() * (max - min);
}

function startIdle(entity, min, max) {
  entity.state = 'idle';
  entity.timer = between(entity.random, min, max);
  entity.targetKind = null;
  entity.stuck = 0;
  if (entity.random() < 0.35) entity.rotationY = entity.random() * Math.PI * 2;
}

function startWalk(entity, x, z, kind, ref, speed) {
  entity.state = 'walk';
  entity.targetX = x;
  entity.targetZ = z;
  entity.targetKind = kind;
  entity.targetRef = ref;
  entity.speed = speed;
  entity.stuck = 0;
}

function clearPath(entity, x, z) {
  const radius = RADIUS[entity.kind];
  const dx = z - entity.z;
  const dz = entity.x - x;
  const length = Math.hypot(dx, dz) || 1;
  const offsetX = (dx / length) * radius * 0.8;
  const offsetZ = (dz / length) * radius * 0.8;
  return (
    hasLineOfSight(entity.zoneId, entity.x, entity.z, x, z) &&
    hasLineOfSight(entity.zoneId, entity.x + offsetX, entity.z + offsetZ, x + offsetX, z + offsetZ) &&
    hasLineOfSight(entity.zoneId, entity.x - offsetX, entity.z - offsetZ, x - offsetX, z - offsetZ)
  );
}

function walkSpeed(entity) {
  if (entity.kind === 'citizen') return between(entity.random, 1.0, 1.5);
  if (entity.kind === 'dog') return between(entity.random, 1.5, 2.3);
  return between(entity.random, 0.6, 0.95);
}

function pickWanderPoint(entity, places) {
  const random = entity.random;
  const radius = RADIUS[entity.kind];

  if (entity.kind === 'chicken') {
    for (let attempt = 0; attempt < PICK_ATTEMPTS; attempt += 1) {
      const angle = random() * Math.PI * 2;
      const distance = 1 + random() * 3.5;
      const x = entity.homeX + Math.cos(angle) * distance;
      const z = entity.homeZ + Math.sin(angle) * distance;
      if (isBlocked(entity.zoneId, x, z, radius)) continue;
      if (!clearPath(entity, x, z)) continue;
      return { x, z };
    }
    return null;
  }

  const minDistance = 6;
  const maxDistance = entity.kind === 'dog' ? 30 : 48;
  const anchorX = entity.kind === 'dog' ? entity.homeX : entity.x;
  const anchorZ = entity.kind === 'dog' ? entity.homeZ : entity.z;

  for (let attempt = 0; attempt < PICK_ATTEMPTS; attempt += 1) {
    const point = places.points[Math.floor(random() * places.points.length)];
    if (!point) return null;
    const lateral = (random() * 2 - 1) * point.spread;
    const x = point.x + point.nx * lateral;
    const z = point.z + point.nz * lateral;
    if (Math.hypot(x - anchorX, z - anchorZ) > maxDistance) continue;
    const away = Math.hypot(x - entity.x, z - entity.z);
    if (away < minDistance) continue;
    if (isBlocked(entity.zoneId, x, z, radius)) continue;
    if (!clearPath(entity, x, z)) continue;
    return { x, z };
  }
  return null;
}

function pickNearest(entity, list, maxDistance, filter) {
  const candidates = [];
  for (const item of list) {
    if (filter && !filter(item)) continue;
    const approachX = item.approachX ?? item.x;
    const approachZ = item.approachZ ?? item.z;
    const distance = Math.hypot(approachX - entity.x, approachZ - entity.z);
    if (distance < 3 || distance > maxDistance) continue;
    candidates.push({ item, distance, approachX, approachZ });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  for (const candidate of candidates.slice(0, 5)) {
    if (!clearPath(entity, candidate.approachX, candidate.approachZ)) continue;
    return candidate;
  }
  return null;
}

function chooseNext(entity, places) {
  const random = entity.random;
  const roll = random();

  if (entity.kind === 'citizen') {
    if (roll < 0.2) {
      const found = pickNearest(entity, places.benches, 70, (bench) => bench.taken === null);
      if (found) {
        found.item.taken = entity.id;
        entity.bench = found.item;
        startWalk(entity, found.approachX, found.approachZ, 'bench', found.item, walkSpeed(entity));
        return;
      }
    } else if (roll < 0.36) {
      const found = pickNearest(entity, places.doors, 80);
      if (found) {
        entity.door = found.item;
        startWalk(entity, found.item.x, found.item.z, 'door', found.item, walkSpeed(entity));
        return;
      }
    } else if (roll < 0.46) {
      startIdle(entity, 6, 16);
      return;
    }
  }

  if (entity.kind === 'dog' && roll < 0.35) {
    entity.state = 'lie';
    entity.timer = between(random, 15, 45);
    return;
  }

  const point = pickWanderPoint(entity, places);
  if (!point) {
    startIdle(entity, 1.5, 4);
    return;
  }
  startWalk(entity, point.x, point.z, 'point', null, walkSpeed(entity));
}

function arrive(entity) {
  if (entity.targetKind === 'bench') {
    const bench = entity.targetRef;
    entity.state = 'sit';
    entity.x = bench.seatX;
    entity.z = bench.seatZ;
    entity.rotationY = bench.rotation;
    entity.timer = between(entity.random, 25, 75);
    entity.targetKind = null;
    return;
  }

  if (entity.targetKind === 'door') {
    entity.hidden = true;
    entity.state = 'idle';
    entity.timer = between(entity.random, 20, 60);
    entity.targetKind = null;
    return;
  }

  if (entity.kind === 'chicken') startIdle(entity, 2, 8);
  else if (entity.kind === 'dog') startIdle(entity, 2, 7);
  else startIdle(entity, 3, 14);
}

function leaveSeat(entity) {
  const bench = entity.bench;
  if (bench) {
    entity.x = bench.approachX;
    entity.z = bench.approachZ;
    bench.taken = null;
  }
  entity.bench = null;
  resolveCollisions(entity, RADIUS[entity.kind]);
  startIdle(entity, 0.5, 1.5);
}

function leaveBuilding(entity) {
  const door = entity.door;
  entity.hidden = false;
  entity.door = null;
  if (door) {
    entity.x = door.x;
    entity.z = door.z;
    entity.rotationY = Math.atan2(door.facingX, door.facingZ);
  }
  resolveCollisions(entity, RADIUS[entity.kind]);
  startIdle(entity, 0.3, 1);
}

function step(entity, places, delta) {
  if (entity.hidden) {
    entity.timer -= delta;
    if (entity.timer <= 0) leaveBuilding(entity);
    return;
  }

  if (entity.state === 'idle' || entity.state === 'lie') {
    entity.timer -= delta;
    if (entity.timer <= 0) chooseNext(entity, places);
    return;
  }

  if (entity.state === 'sit') {
    entity.timer -= delta;
    if (entity.timer <= 0) leaveSeat(entity);
    return;
  }

  const dx = entity.targetX - entity.x;
  const dz = entity.targetZ - entity.z;
  const distance = Math.hypot(dx, dz);

  if (distance <= ARRIVE_DISTANCE) {
    arrive(entity);
    return;
  }

  const move = Math.min(distance, entity.speed * delta);
  const beforeX = entity.x;
  const beforeZ = entity.z;
  entity.x += (dx / distance) * move;
  entity.z += (dz / distance) * move;
  entity.rotationY = Math.atan2(dx, dz);
  resolveCollisions(entity, RADIUS[entity.kind]);

  const moved = Math.hypot(entity.x - beforeX, entity.z - beforeZ);
  if (moved < move * 0.4) entity.stuck += delta;
  else entity.stuck = Math.max(0, entity.stuck - delta);

  if (entity.stuck >= STUCK_LIMIT) {
    if (entity.targetKind === 'bench' && entity.bench) {
      entity.bench.taken = null;
      entity.bench = null;
    }
    entity.door = null;
    startIdle(entity, 1, 3);
  }
}

export function updateAmbient(zoneId, zonePlayers, delta) {
  const zone = BY_ZONE.get(zoneId);
  if (!zone || zone.entities.size === 0 || zonePlayers.size === 0) return;

  for (const entity of zone.entities.values()) {
    let near = false;
    for (const player of zonePlayers.values()) {
      if (Math.hypot(entity.x - player.x, entity.z - player.z) <= SIM_RADIUS) {
        near = true;
        break;
      }
    }
    if (near) step(entity, zone.places, delta);
  }
}

function serializeAdd(entity) {
  return {
    id: entity.id,
    kind: entity.kind,
    seed: entity.seed,
    x: round(entity.x, 2),
    z: round(entity.z, 2),
    r: round(entity.rotationY, 2),
    s: POSE[entity.state],
  };
}

export function collectAmbient(zoneId, state, tick) {
  const entities = BY_ZONE.get(zoneId)?.entities;
  if (!entities || entities.size === 0) return null;

  if (!state.knownAmbient) state.knownAmbient = new Set();
  const known = state.knownAmbient;
  const adds = [];
  const removes = [];
  const states = [];
  const sendStates = tick % SEND_EVERY === 0;

  for (const entity of entities.values()) {
    const [enter, leave] = VIEW[entity.kind];
    const distance = Math.hypot(entity.x - state.x, entity.z - state.z);
    if (known.has(entity.id)) {
      if (entity.hidden || distance > leave) {
        known.delete(entity.id);
        removes.push(entity.id);
      } else if (sendStates) {
        states.push([entity.id, round(entity.x, 2), round(entity.z, 2), round(entity.rotationY, 2), POSE[entity.state]]);
      }
    } else if (!entity.hidden && distance <= enter) {
      known.add(entity.id);
      adds.push(serializeAdd(entity));
    }
  }

  if (adds.length === 0 && removes.length === 0 && states.length === 0) return null;
  const message = { type: 'ambient' };
  if (adds.length > 0) message.adds = adds;
  if (removes.length > 0) message.removes = removes;
  if (states.length > 0) message.states = states;
  return message;
}
