import * as THREE from 'three';
import { createHumanoid } from './Humanoid.js';
import { createAnimal } from './Animal.js';
import { resolveAppearance } from './Appearances.js';
import { getColorMaterial } from '../world/Textures.js';

const LOOKS = ['streuner', 'haendler', 'pumpenwart', 'funkerin', 'kanalwaerter'];
const TOPS = [0x5a5240, 0x4a5a3a, 0x6a4a3a, 0x3a4a5a, 0x7a6a4a, 0x5a3a3a, 0x4a4a4a, 0x6a6a52];
const PANTS = [0x3a382e, 0x3a4a5a, 0x4a4234, 0x2e2e2e, 0x4a4a32];
const SKINS = [0xd1ab8c, 0xcaa488, 0xb88a68, 0x9a6e4e, 0xe0bc9c];
const HAIRS = [0x2a2018, 0x4a3a2a, 0x6a5a40, 0x8a7a5a, 0x1a1a1a, 0x7a6a62];
const CITIZEN_SPACING = 34;
const DOG_SPACING = 92;
const CHICKEN_SPACING = 80;
const BIRD_SPACING = 140;
const ACTIVE_RADIUS = 110;
const BIRD_RADIUS = 170;

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

function buildChicken(random) {
  const object = new THREE.Group();
  const color = [0xe8e0cc, 0xb8864a, 0x7a5a3a, 0xd8c8a0][Math.floor(random() * 4)];
  const body = getColorMaterial(color);
  const beak = getColorMaterial(0xd89a30);
  const red = getColorMaterial(0xa83a2a);
  const legs = getColorMaterial(0xc8a050);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.3), body);
  torso.position.set(0, 0.26, 0);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.12), body);
  tail.position.set(0, 0.36, -0.2);
  tail.rotation.x = 0.5;
  const neck = new THREE.Group();
  neck.position.set(0, 0.34, 0.14);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), body);
  head.position.set(0, 0.08, 0.03);
  const bill = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.06), beak);
  bill.position.set(0, 0.07, 0.1);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.06), red);
  comb.position.set(0, 0.15, 0.03);
  neck.add(head, bill, comb);
  object.add(torso, tail, neck);

  for (const x of [-0.05, 0.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), legs);
    leg.position.set(x, 0.08, 0);
    object.add(leg);
  }

  return {
    object,
    animate(time, speed) {
      neck.rotation.x = speed > 0.2 ? Math.sin(time * 12) * 0.12 : 0.55 + Math.max(0, Math.sin(time * 5)) * 0.4;
      torso.position.y = 0.26 + (speed > 0.2 ? Math.abs(Math.sin(time * 12)) * 0.02 : 0);
    },
  };
}

function buildBird(random) {
  const object = new THREE.Group();
  const color = [0x3a3a3a, 0x5a5a5a, 0x2a2a30, 0x7a7a72][Math.floor(random() * 4)];
  const material = getColorMaterial(color, { side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.34), material);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), material);
  head.position.set(0, 0.03, 0.2);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.2), material);
  tail.position.set(0, 0, -0.26);
  const left = new THREE.Group();
  const right = new THREE.Group();
  const wingGeometry = new THREE.BoxGeometry(0.5, 0.02, 0.2);
  const leftWing = new THREE.Mesh(wingGeometry, material);
  leftWing.position.x = -0.25;
  const rightWing = new THREE.Mesh(wingGeometry, material);
  rightWing.position.x = 0.25;
  left.add(leftWing);
  right.add(rightWing);
  object.add(body, head, tail, left, right);
  object.scale.setScalar(1.4);

  return {
    object,
    animate(time) {
      const flap = Math.sin(time * 14) * 0.7;
      left.rotation.z = flap;
      right.rotation.z = -flap;
    },
  };
}

function humanAppearance(random) {
  const base = resolveAppearance(LOOKS[Math.floor(random() * LOOKS.length)]);
  const pick = (list) => list[Math.floor(random() * list.length)];
  return {
    ...base,
    top: pick(TOPS),
    pants: pick(PANTS),
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairColor: pick(HAIRS),
    scale: (base.scale ?? 1) * (0.94 + random() * 0.12),
    backpack: random() < 0.4 ? base.backpack : undefined,
    scarf: random() < 0.3 ? pick(TOPS) : undefined,
  };
}

export function createAmbient(scene) {
  const paths = new Map();
  const entities = [];
  const dummy = new THREE.Vector3();

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

  function addPath(object) {
    if (paths.has(object.id) || !object.points || object.points.length < 2) return;
    const path = buildPath(object.points);
    const width = object.props?.breite ?? 5;
    const record = { id: object.id, path, width, entities: [] };
    paths.set(object.id, record);

    const random = seeded(hash(object.id));
    const make = (kind, count, extra = {}) => {
      for (let n = 0; n < count; n += 1) {
        const entity = {
          kind,
          record,
          s0: random() * path.total * 2,
          speed: 0.9 + random() * 0.7,
          lateral: (random() * 2 - 1) * Math.max(0.5, width / 2 - 0.7),
          ph: random() * 6.28,
          ph2: random() * 6.28,
          seed: random(),
          object: null,
          animate: null,
          lastX: 0,
          lastZ: 0,
          sample: { x: 0, z: 0, tx: 0, tz: 1 },
          ...extra,
        };
        record.entities.push(entity);
        entities.push(entity);
      }
    };

    const count = (spacing) => Math.max(1, Math.round(path.total / spacing));
    make('citizen', count(CITIZEN_SPACING));
    make('dog', Math.max(0, Math.round(path.total / DOG_SPACING)), { speed: 1.6 + random() * 0.6 });
    make('chicken', Math.max(1, Math.round(path.total / CHICKEN_SPACING)) * 3, { speed: 0.5, lateral: (random() < 0.5 ? -1 : 1) * (width / 2 + 0.2 + random() * 0.8) });
    make('bird', Math.max(1, Math.round(path.total / BIRD_SPACING)), { speed: 3.5 + random() * 2 });
  }

  function removePath(id) {
    const record = paths.get(id);
    if (!record) return;
    for (const entity of record.entities) {
      if (entity.object) scene.remove(entity.object);
      const index = entities.indexOf(entity);
      if (index >= 0) entities.splice(index, 1);
    }
    paths.delete(id);
  }

  function clear() {
    for (const id of Array.from(paths.keys())) removePath(id);
  }

  function spawn(entity) {
    const random = seeded(entity.seed);
    if (entity.kind === 'citizen') {
      const humanoid = createHumanoid('streuner', { appearance: humanAppearance(random) });
      entity.object = humanoid.object;
      entity.animate = humanoid.update;
    } else if (entity.kind === 'dog') {
      const animal = createAnimal(random() < 0.5 ? 'stray_dog' : 'feral_dog');
      entity.object = animal.object;
      entity.animate = animal.update;
    } else if (entity.kind === 'chicken') {
      const chicken = buildChicken(random);
      entity.object = chicken.object;
      entity.chicken = chicken;
    } else {
      const bird = buildBird(random);
      entity.object = bird.object;
      entity.chicken = bird;
    }
    entity.object.userData.ambient = true;
    scene.add(entity.object);
  }

  function place(entity, time) {
    const { path } = entity.record;
    const out = entity.sample;

    if (entity.kind === 'citizen' || entity.kind === 'dog') {
      const span = path.total * 2;
      const u = (entity.s0 + entity.speed * time) % span;
      const forward = u < path.total;
      sample(path, forward ? u : span - u, out);
      const direction = forward ? 1 : -1;
      const wobble = entity.kind === 'dog' ? Math.sin(time * 0.9 + entity.ph) * 1.2 : 0;
      const nx = -out.tz * direction;
      const nz = out.tx * direction;
      const lateral = entity.lateral + wobble;
      entity.object.position.set(out.x + nx * lateral, 0, out.z + nz * lateral);
      entity.object.rotation.y = Math.atan2(out.tx * direction, out.tz * direction);
    } else if (entity.kind === 'chicken') {
      const anchorS = (entity.s0 % path.total + path.total) % path.total;
      sample(path, anchorS, out);
      const nx = -out.tz;
      const nz = out.tx;
      const wx = Math.sin(time * 0.31 + entity.ph) * 1.8 + Math.sin(time * 0.77 + entity.ph2) * 0.6;
      const wz = Math.cos(time * 0.27 + entity.ph2) * 1.8;
      const x = out.x + nx * entity.lateral + wx;
      const z = out.z + nz * entity.lateral + wz;
      const dx = x - entity.lastX;
      const dz = z - entity.lastZ;
      entity.object.position.set(x, 0, z);
      if (Math.hypot(dx, dz) > 1e-4) entity.object.rotation.y = Math.atan2(dx, dz);
      entity.moving = Math.hypot(dx, dz);
      entity.lastX = x;
      entity.lastZ = z;
    } else {
      const anchorS = (entity.s0 % path.total + path.total) % path.total;
      sample(path, anchorS, out);
      const radius = 14 + entity.seed * 10;
      const w = entity.speed / radius;
      const angle = entity.ph + w * time;
      const x = out.x + Math.cos(angle) * radius;
      const z = out.z + Math.sin(angle) * radius;
      entity.object.position.set(x, 9 + entity.seed * 6 + Math.sin(time * 0.6 + entity.ph2) * 1.5, z);
      entity.object.rotation.y = Math.atan2(-Math.sin(angle), Math.cos(angle));
    }
  }

  function update(delta, playerPosition) {
    if (entities.length === 0) return;
    const time = performance.now() / 1000;

    for (const entity of entities) {
      if (!entity.object && !spawnIfNear(entity, playerPosition, time)) continue;
      place(entity, time);

      const limit = entity.kind === 'bird' ? BIRD_RADIUS : ACTIVE_RADIUS;
      dummy.copy(entity.object.position);
      if (Math.hypot(dummy.x - playerPosition.x, dummy.z - playerPosition.z) > limit + 25) {
        scene.remove(entity.object);
        entity.object = null;
        entity.animate = null;
        entity.chicken = null;
        continue;
      }

      if (entity.animate) entity.animate(delta);
      else if (entity.chicken) entity.chicken.animate(time + entity.ph, entity.kind === 'chicken' ? (entity.moving ?? 0) / Math.max(delta, 1e-3) : 1);
    }
  }

  function spawnIfNear(entity, playerPosition, time) {
    const saved = entity.object;
    entity.object = { position: new THREE.Vector3(), rotation: { y: 0 } };
    place(entity, time);
    const x = entity.object.position.x;
    const z = entity.object.position.z;
    entity.object = saved;
    const limit = entity.kind === 'bird' ? BIRD_RADIUS : ACTIVE_RADIUS;
    if (Math.hypot(x - playerPosition.x, z - playerPosition.z) > limit) return false;
    spawn(entity);
    entity.lastX = x;
    entity.lastZ = z;
    return true;
  }

  return { addPath, removePath, clear, update };
}
