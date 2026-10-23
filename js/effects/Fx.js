import * as THREE from 'three';
import { spriteTexture } from './Particles.js';
import { WIND } from './Wind.js';
import { graphics } from './Graphics.js';

const POOL_SIZE = 4;
const SPAWN_RANGE = 70;
const CHIMNEY_RANGE = 100;
const VISIBLE_RANGE = 130;
const LIGHT_RANGE = 45;
const ASSIGN_INTERVAL = 0.15;

function hash(x, y, z) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function attached(node, scene) {
  let current = node;
  while (current.parent) current = current.parent;
  return current === scene;
}

export function createFx({ scene, sparks, smoke, env }) {
  const instances = [];
  const known = new WeakSet();
  const bulbGeometry = new THREE.BoxGeometry(0.5, 0.12, 0.22);
  const bulbOn = new THREE.MeshBasicMaterial({ color: 0xffe2a4 });
  const bulbOff = new THREE.MeshLambertMaterial({ color: 0x4a463c });
  const lampGlow = new THREE.SpriteMaterial({ map: spriteTexture('glow'), color: 0xffc878, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const flameMaterials = [0xffffff, 0xffc890, 0xffe0a8].map(
    (color) => new THREE.SpriteMaterial({ map: spriteTexture('flame'), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  );

  const pool = Array.from({ length: POOL_SIZE }, () => {
    const light = new THREE.PointLight(0xffffff, 0, 10, 1.6);
    scene.add(light);
    return { light, source: null };
  });

  let assignTimer = 0;

  function worldPosition(marker) {
    marker.updateWorldMatrix(true, false);
    return marker.getWorldPosition(new THREE.Vector3());
  }

  function createFire(marker) {
    const position = worldPosition(marker);
    const seed = hash(position.x, position.y, position.z);
    const sprites = [
      { sprite: new THREE.Sprite(flameMaterials[0]), w: 0.62, h: 1.0, dx: 0 },
      { sprite: new THREE.Sprite(flameMaterials[1]), w: 0.42, h: 0.7, dx: -0.12 },
      { sprite: new THREE.Sprite(flameMaterials[2]), w: 0.4, h: 0.66, dx: 0.12 },
    ];
    for (const entry of sprites) {
      entry.sprite.center.set(0.5, 0.05);
      entry.sprite.position.x = entry.dx;
      marker.add(entry.sprite);
    }
    const source = {
      position: position.clone().add(new THREE.Vector3(0, 0.5, 0)),
      color: new THREE.Color(0xff8a3a),
      distance: 11,
      intensity: () => {
        const t = env.time;
        return 16 * (0.25 + 0.75 * env.night) * (0.78 + 0.2 * Math.sin(t * 13 + seed * 40) + 0.08 * Math.sin(t * 31 + seed * 9));
      },
    };
    return { kind: 'fire', marker, position, seed, sprites, source, sparkTimer: Math.random(), smokeTimer: Math.random() };
  }

  function updateFire(instance, delta, distance) {
    const visible = distance < VISIBLE_RANGE && graphics.fire;
    for (const entry of instance.sprites) entry.sprite.visible = visible;
    if (!visible) return;
    const t = env.time;
    instance.sprites.forEach((entry, index) => {
      const a = Math.sin(t * (9 + index * 2.3) + instance.seed * 6 + index) * 0.5 + 0.5;
      const b = Math.sin(t * (14 + index * 3.1) + instance.seed * 3 + index * 1.7) * 0.5 + 0.5;
      entry.sprite.scale.set(entry.w * (0.82 + 0.28 * b), entry.h * (0.72 + 0.5 * a), 1);
      entry.sprite.position.x = entry.dx + (b - 0.5) * 0.06;
    });
    if (distance > SPAWN_RANGE) return;

    instance.sparkTimer += graphics.fire ? delta * 5 : 0;
    while (instance.sparkTimer >= 1) {
      instance.sparkTimer -= 1;
      sparks.spawn({
        x: instance.position.x + (Math.random() - 0.5) * 0.3,
        y: instance.position.y + 0.35,
        z: instance.position.z + (Math.random() - 0.5) * 0.3,
        vx: WIND.x * 0.5 + (Math.random() - 0.5) * 0.5,
        vy: 1.0 + Math.random() * 1.3,
        vz: WIND.z * 0.5 + (Math.random() - 0.5) * 0.5,
        lifetime: 0.9 + Math.random() * 0.9,
        from: 0.09,
        to: 0.02,
        alpha: 1,
        r: 1,
        g: 0.62 + Math.random() * 0.2,
        b: 0.2,
        fade: 0.05,
      });
    }

    instance.smokeTimer += graphics.smoke ? delta * 1.6 : 0;
    while (instance.smokeTimer >= 1) {
      instance.smokeTimer -= 1;
      const shade = 0.22 + 0.22 * (1 - env.night);
      smoke.spawn({
        x: instance.position.x + (Math.random() - 0.5) * 0.2,
        y: instance.position.y + 0.9,
        z: instance.position.z + (Math.random() - 0.5) * 0.2,
        vx: WIND.x * 0.6,
        vy: 0.8 + Math.random() * 0.5,
        vz: WIND.z * 0.6,
        lifetime: 3 + Math.random() * 1.5,
        from: 0.35,
        to: 1.7,
        alpha: 0.16,
        rotation: Math.random() * 6,
        rotationSpeed: (Math.random() - 0.5) * 0.4,
        r: shade,
        g: shade,
        b: shade,
        fade: 0.2,
      });
    }
  }

  function createChimney(marker) {
    const position = worldPosition(marker);
    return { kind: 'smoke', marker, position, timer: Math.random() };
  }

  function updateChimney(instance, delta, distance) {
    if (distance > CHIMNEY_RANGE || !graphics.smoke) return;
    instance.timer += delta * 1.4;
    while (instance.timer >= 1) {
      instance.timer -= 1;
      const shade = 0.3 + 0.3 * (1 - env.night);
      smoke.spawn({
        x: instance.position.x + (Math.random() - 0.5) * 0.25,
        y: instance.position.y,
        z: instance.position.z + (Math.random() - 0.5) * 0.25,
        vx: WIND.x * 0.7 + (Math.random() - 0.5) * 0.2,
        vy: 1.0 + Math.random() * 0.4,
        vz: WIND.z * 0.7 + (Math.random() - 0.5) * 0.2,
        lifetime: 7 + Math.random() * 2,
        from: 0.7,
        to: 3.8,
        alpha: 0.3,
        rotation: Math.random() * 6,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        r: shade,
        g: shade,
        b: shade * 1.02,
        fade: 0.12,
      });
    }
  }

  function createLamp(marker, options = {}) {
    const position = worldPosition(marker);
    const roll = hash(position.x, position.z, 3.1);
    const bulb = new THREE.Mesh(bulbGeometry, bulbOff);
    marker.add(bulb);
    const glow = new THREE.Sprite(lampGlow);
    glow.position.y = -0.2;
    glow.scale.setScalar(0.001);
    glow.visible = false;
    marker.add(glow);

    const instance = {
      kind: 'lamp',
      marker,
      position,
      bulb,
      glow,
      mode: options.steady ? 'steady' : roll < 0.12 ? 'dead' : roll < 0.42 ? 'flicker' : 'steady',
      threshold: options.steady ? 0.12 : 0.45 + (hash(position.z, position.x, 7.7) - 0.5) * 0.2,
      level: 0,
      effective: 0,
      stutterUntil: 0,
      nextStutter: 2 + Math.random() * 8,
    };
    instance.source = {
      position: position.clone().add(new THREE.Vector3(0, -0.3, 0)),
      color: new THREE.Color(0xffd9a0),
      distance: options.distance ?? 20,
      intensity: () => (options.power ?? 30) * instance.effective,
    };
    return instance;
  }

  function updateLamp(instance, delta, distance) {
    const wanted = instance.mode !== 'dead' && env.night > instance.threshold ? 1 : 0;
    instance.level += (wanted - instance.level) * Math.min(1, delta * 3);
    if (Math.abs(wanted - instance.level) < 0.01) instance.level = wanted;

    let factor = 1;
    if (instance.mode === 'flicker' && graphics.flicker && instance.level > 0.5) {
      const t = env.time;
      if (t >= instance.nextStutter) {
        instance.stutterUntil = t + 0.4 + Math.random() * 0.9;
        instance.nextStutter = t + 4 + Math.random() * 10;
      }
      if (t < instance.stutterUntil) factor = Math.sin(t * 47 + instance.position.x * 3) + Math.sin(t * 83) > 0.2 ? 1 : 0;
    }

    instance.effective = instance.level * factor;
    const lit = instance.effective > 0.5;
    instance.bulb.material = lit ? bulbOn : bulbOff;
    const showGlow = lit && distance < VISIBLE_RANGE;
    instance.glow.visible = showGlow;
    if (showGlow) instance.glow.scale.setScalar(2.6 * instance.effective);
  }

  function createFlicker(marker, options) {
    const light = options.light;
    const position = worldPosition(marker);
    if (hash(position.x, position.y, position.z) > 0.3) return null;
    return { kind: 'flicker', marker, position, light, base: light.intensity, stutterUntil: 0, nextStutter: 1 + Math.random() * 6 };
  }

  function updateFlicker(instance) {
    if (!graphics.flicker) {
      instance.light.intensity = instance.base;
      return;
    }
    const t = env.time;
    if (t >= instance.nextStutter) {
      instance.stutterUntil = t + 0.2 + Math.random() * 0.6;
      instance.nextStutter = t + 3 + Math.random() * 9;
    }
    instance.light.intensity = t < instance.stutterUntil ? instance.base * (Math.sin(t * 60) > 0 ? 1 : 0.15) : instance.base;
  }

  const FACTORIES = { fire: createFire, smoke: createChimney, lamp: createLamp, flicker: createFlicker };

  function scan() {
    scene.traverse((node) => {
      const fx = node.userData.fx;
      if (!fx || known.has(node)) return;
      known.add(node);
      const instance = FACTORIES[fx.kind]?.(node, fx);
      if (instance) instances.push(instance);
    });

    for (let i = instances.length - 1; i >= 0; i -= 1) {
      if (attached(instances[i].marker, scene)) continue;
      for (const slot of pool) if (slot.source === instances[i].source) slot.source = null;
      instances.splice(i, 1);
    }
  }

  function assign(camera) {
    const candidates = [];
    if (!graphics.lights) return;
    for (const instance of instances) {
      const source = instance.source;
      if (!source) continue;
      const distance = source.position.distanceTo(camera);
      if (distance > LIGHT_RANGE || source.intensity() < 0.5) continue;
      candidates.push({ source, distance });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const chosen = candidates.slice(0, POOL_SIZE).map((entry) => entry.source);

    for (const slot of pool) if (slot.source && !chosen.includes(slot.source)) slot.source = null;
    for (const source of chosen) {
      if (pool.some((slot) => slot.source === source)) continue;
      const free = pool.find((slot) => !slot.source);
      if (!free) break;
      free.source = source;
      free.light.intensity = 0;
      free.light.position.copy(source.position);
      free.light.color.copy(source.color);
      free.light.distance = source.distance;
    }
  }

  function update(delta, camera) {
    for (const slot of pool) slot.light.visible = !env.indoor;
    if (!graphics.lights) for (const slot of pool) slot.source = null;

    for (const instance of instances) {
      const distance = instance.position.distanceTo(camera);
      if (instance.kind === 'fire') updateFire(instance, delta, distance);
      else if (instance.kind === 'smoke') updateChimney(instance, delta, distance);
      else if (instance.kind === 'lamp') updateLamp(instance, delta, distance);
      else if (instance.kind === 'flicker') updateFlicker(instance);
    }

    assignTimer += delta;
    if (assignTimer >= ASSIGN_INTERVAL) {
      assignTimer = 0;
      assign(camera);
    }

    for (const slot of pool) {
      const target = slot.source ? slot.source.intensity() : 0;
      slot.light.intensity += (target - slot.light.intensity) * Math.min(1, delta * 10);
    }
  }

  function reset() {
    instances.length = 0;
    for (const slot of pool) {
      slot.source = null;
      slot.light.intensity = 0;
    }
  }

  return { scan, update, reset };
}
