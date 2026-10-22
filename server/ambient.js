import { getZones } from './zoneLoader.js';

const CITIZEN_SPACING = 34;
const DOG_SPACING = 92;
const CHICKEN_SPACING = 80;
const VIEW = { citizen: [110, 135], dog: [110, 135], chicken: [80, 105] };
const SEND_EVERY = 2;

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

function buildPath(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  return { points, lengths, total: lengths[lengths.length - 1] };
}

function sample(path, s, out) {
  const { points, lengths, total } = path;
  const clamped = Math.max(0, Math.min(total - 1e-4, s));
  let i = 1;
  while (i < lengths.length - 1 && lengths[i] < clamped) i += 1;
  const a = points[i - 1];
  const b = points[i];
  const l = lengths[i] - lengths[i - 1] || 1;
  const t = (clamped - lengths[i - 1]) / l;
  out.x = a[0] + (b[0] - a[0]) * t;
  out.z = a[1] + (b[1] - a[1]) * t;
  out.tx = (b[0] - a[0]) / l;
  out.tz = (b[1] - a[1]) / l;
  return out;
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function buildZoneAmbient(zone) {
  const entities = new Map();
  if (!zone.chunked) return entities;

  let counter = 0;
  zone.visuals.forEach((visual, index) => {
    if (visual.kind !== 'weg' || !visual.points || visual.points.length < 2) return;
    const path = buildPath(visual.points);
    if (path.total < 1) return;
    const width = visual.props?.breite ?? 5;
    const random = seeded(hash(`${zone.id}-weg-${index}`));

    const make = (kind, count, extra = {}) => {
      for (let n = 0; n < count; n += 1) {
        counter += 1;
        const id = `a${counter}`;
        entities.set(id, {
          id,
          kind,
          path,
          s0: random() * path.total * 2,
          speed: 0.9 + random() * 0.7,
          lateral: (random() * 2 - 1) * Math.max(0.5, width / 2 - 0.7),
          ph: random() * 6.28,
          ph2: random() * 6.28,
          seed: Math.round(random() * 1e6),
          x: 0,
          z: 0,
          rotationY: 0,
          out: { x: 0, z: 0, tx: 0, tz: 1 },
          ...extra,
        });
      }
    };

    make('citizen', Math.max(1, Math.round(path.total / CITIZEN_SPACING)));
    make('dog', Math.max(0, Math.round(path.total / DOG_SPACING)), { speed: 1.6 + random() * 0.6 });
    make('chicken', Math.max(1, Math.round(path.total / CHICKEN_SPACING)) * 3, { speed: 0.5, lateral: (random() < 0.5 ? -1 : 1) * (width / 2 + 0.2 + random() * 0.8) });
  });

  return entities;
}

function place(entity, time) {
  const { path, out } = entity;

  if (entity.kind === 'chicken') {
    const anchorS = ((entity.s0 % path.total) + path.total) % path.total;
    sample(path, anchorS, out);
    const nx = -out.tz;
    const nz = out.tx;
    const wx = Math.sin(time * 0.31 + entity.ph) * 1.8 + Math.sin(time * 0.77 + entity.ph2) * 0.6;
    const wz = Math.cos(time * 0.27 + entity.ph2) * 1.8;
    const x = out.x + nx * entity.lateral + wx;
    const z = out.z + nz * entity.lateral + wz;
    const dx = x - entity.x;
    const dz = z - entity.z;
    if (Math.hypot(dx, dz) > 1e-4) entity.rotationY = Math.atan2(dx, dz);
    entity.x = x;
    entity.z = z;
    return;
  }

  const span = path.total * 2;
  const u = (entity.s0 + entity.speed * time) % span;
  const forward = u < path.total;
  sample(path, forward ? u : span - u, out);
  const direction = forward ? 1 : -1;
  const wobble = entity.kind === 'dog' ? Math.sin(time * 0.9 + entity.ph) * 1.2 : 0;
  const nx = -out.tz * direction;
  const nz = out.tx * direction;
  const lateral = entity.lateral + wobble;
  entity.x = out.x + nx * lateral;
  entity.z = out.z + nz * lateral;
  entity.rotationY = Math.atan2(out.tx * direction, out.tz * direction);
}

const AMBIENT_BY_ZONE = new Map(getZones().map((zone) => [zone.id, buildZoneAmbient(zone)]));

export function getAmbient(zoneId) {
  return AMBIENT_BY_ZONE.get(zoneId) ?? new Map();
}

export function updateAmbient(zoneId, hasPlayers) {
  const entities = AMBIENT_BY_ZONE.get(zoneId);
  if (!entities || entities.size === 0 || !hasPlayers) return;
  const time = Date.now() / 1000;
  for (const entity of entities.values()) place(entity, time);
}

function serializeAdd(entity) {
  return { id: entity.id, kind: entity.kind, seed: entity.seed, x: round(entity.x, 2), z: round(entity.z, 2), r: round(entity.rotationY, 2) };
}

export function collectAmbient(zoneId, state, tick) {
  const entities = AMBIENT_BY_ZONE.get(zoneId);
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
      if (distance > leave) {
        known.delete(entity.id);
        removes.push(entity.id);
      } else if (sendStates) {
        states.push([entity.id, round(entity.x, 2), round(entity.z, 2), round(entity.rotationY, 2)]);
      }
    } else if (distance <= enter) {
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
