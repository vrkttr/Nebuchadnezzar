import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';
import { createHall } from './Hall.js';
import { createChimney } from './Chimney.js';

const TOWER_HEIGHT = 46;
const TOWER_BASE = 13.6;
const TOWER_WAIST = 8.6;
const TOWER_WAIST_Y = 34;
const TOWER_SHAPE = 27.76;
const TOWER_RINGS = 9;

function towerRadius(y) {
  return TOWER_WAIST * Math.sqrt(1 + ((y - TOWER_WAIST_Y) / TOWER_SHAPE) ** 2);
}

function buildCoolingTower(random) {
  const batch = createBatch();
  const concrete = getMaterial('concrete_panel', { color: 0xb2ad9e });
  const dark = getColorMaterial(0x181816);
  const rim = getMaterial('concrete_panel', { color: 0x9a968a });
  const slab = getMaterial('slab', OVERLAY);
  const foliage = [0xffffff, 0xd6e0a0, 0xb8c98a].map((color) =>
    getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color, ...OVERLAY })
  );
  const leaf = getMaterial('leaves', { color: 0xb0c878 });

  batch.box(slab, 34, 0.05, 34, { y: 0.03, tile: 3 });

  const inletHeight = 3.4;
  const ring = 22;
  for (let i = 0; i < ring; i += 1) {
    const angle = (i / ring) * Math.PI * 2;
    batch.box(concrete, 1.5, inletHeight, 1.5, {
      x: Math.sin(angle) * (TOWER_BASE - 0.4),
      y: inletHeight / 2,
      z: Math.cos(angle) * (TOWER_BASE - 0.4),
      ry: angle,
      tile: 2,
    });
    batch.box(dark, 2.0, inletHeight - 0.4, 0.5, {
      x: Math.sin(angle + Math.PI / ring) * (TOWER_BASE - 0.1),
      y: inletHeight / 2,
      z: Math.cos(angle + Math.PI / ring) * (TOWER_BASE - 0.1),
      ry: angle + Math.PI / ring,
      tile: 1,
    });
  }
  batch.cylinder(rim, TOWER_BASE + 0.3, TOWER_BASE + 0.3, 0.5, 22, { y: inletHeight + 0.25, repeatX: 6, repeatY: 0.3 });

  const step = (TOWER_HEIGHT - inletHeight) / TOWER_RINGS;
  for (let i = 0; i < TOWER_RINGS; i += 1) {
    const y0 = inletHeight + i * step;
    const y1 = y0 + step;
    batch.cylinder(concrete, towerRadius(y1), towerRadius(y0), step, 22, { y: (y0 + y1) / 2, repeatX: 7, repeatY: step / 3 });
  }
  batch.cylinder(rim, towerRadius(TOWER_HEIGHT) + 0.25, towerRadius(TOWER_HEIGHT) + 0.2, 0.7, 22, { y: TOWER_HEIGHT + 0.3, repeatX: 6, repeatY: 0.3 });
  batch.cylinder(dark, towerRadius(TOWER_HEIGHT) - 0.4, towerRadius(TOWER_HEIGHT) - 0.4, 0.05, 22, { y: TOWER_HEIGHT + 0.5 });

  for (let i = 0; i < 9; i += 1) {
    const angle = random.range(0, Math.PI * 2);
    const growth = random.range(4, 13);
    batch.quad(random.pick(foliage), 3, growth, {
      x: Math.sin(angle) * (TOWER_BASE + 0.1),
      y: growth / 2 + inletHeight,
      z: Math.cos(angle) * (TOWER_BASE + 0.1),
      ry: angle,
      repeatX: 1.5,
      repeatY: growth / 2,
    });
  }
  for (let i = 0; i < 8; i += 1) {
    const angle = random.range(0, Math.PI * 2);
    const radius = TOWER_BASE + random.range(1.5, 4);
    batch.blob(leaf, random.range(0.6, 1.2), 0, { x: Math.sin(angle) * radius, y: 0.3, z: Math.cos(angle) * radius, sy: 0.7 });
  }
  return batch.build('Kuehlturm');
}

function buildCoalYard(random) {
  const batch = createBatch();
  const coal = [0x1c1b19, 0x252320, 0x2d2a26].map((color) => getColorMaterial(color));
  const steel = getMaterial('steel');
  const rust = getMaterial('rust_metal', { color: 0x8a7a68 });
  const concrete = getMaterial('concrete_panel', { color: 0x8c887a });
  const slab = getMaterial('slab', OVERLAY);
  const lamp = getColorMaterial(0xffd890, { unlit: true });
  const foliage = getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color: 0xd6e0a0, ...OVERLAY });

  batch.box(slab, 26, 0.05, 20, { y: 0.03, z: 0, tile: 3 });

  for (let i = 0; i < 9; i += 1) {
    const radius = random.range(2.6, 4.6);
    batch.blob(random.pick(coal), radius, 1, {
      x: random.range(-9, 9),
      y: radius * 0.2,
      z: random.range(-4, 4),
      sy: random.range(0.55, 0.85),
      ry: random.range(0, 3),
    });
  }
  batch.box(concrete, 20, 1.2, 0.5, { y: 0.6, z: 5.6, tile: 2 });
  batch.box(concrete, 0.5, 1.2, 11, { x: -10.2, y: 0.6, z: 0.2, tile: 2 });
  batch.box(concrete, 0.5, 1.2, 11, { x: 10.2, y: 0.6, z: 0.2, tile: 2 });

  const startZ = -3;
  const endZ = -24.5;
  const startY = 3.8;
  const endY = 19;
  const length = Math.hypot(startZ - endZ, endY - startY);
  const angle = Math.atan2(endY - startY, startZ - endZ);
  const midZ = (startZ + endZ) / 2;
  const midY = (startY + endY) / 2;
  batch.box(rust, 2.6, 0.5, length, { y: midY - 1.1, z: midZ, rx: angle, tile: 3 });
  batch.box(steel, 0.18, 1.5, length, { x: -1.3, y: midY - 0.2, z: midZ, rx: angle, tile: 3 });
  batch.box(steel, 0.18, 1.5, length, { x: 1.3, y: midY - 0.2, z: midZ, rx: angle, tile: 3 });
  batch.box(rust, 2.8, 0.25, length, { y: midY + 0.7, z: midZ, rx: angle, tile: 3 });
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5;
    const z = startZ + (endZ - startZ) * t;
    const y = startY + (endY - startY) * t - 1.3;
    batch.box(steel, 0.35, y, 0.35, { x: -1.2, y: y / 2, z, tile: 2 });
    batch.box(steel, 0.35, y, 0.35, { x: 1.2, y: y / 2, z, tile: 2 });
    batch.box(steel, 2.8, 0.2, 0.2, { y: y - 0.1, z, tile: 1 });
  }
  for (let i = 0; i < 5; i += 1) {
    const t = 0.15 + i * 0.17;
    batch.box(lamp, 0.5, 0.3, 0.12, { x: 1.38, y: startY + (endY - startY) * t - 0.1, z: startZ + (endZ - startZ) * t, rx: angle, tile: 1 });
  }
  batch.box(steel, 4.2, 0.4, 2.2, { y: endY + 0.4, z: endZ - 0.4, tile: 2 });

  batch.box(steel, 0.3, 8, 0.3, { x: 6.5, y: 4, z: 3.2, tile: 2 });
  batch.box(steel, 0.3, 8, 0.3, { x: -6.5, y: 4, z: 3.2, tile: 2 });
  batch.box(steel, 13.3, 0.35, 0.35, { y: 8, z: 3.2, tile: 2 });
  batch.box(steel, 0.25, 0.25, 6, { x: 0.8, y: 7.7, z: 0.2, tile: 1 });
  batch.quad(foliage, 2.4, 4, { x: -10.2, y: 2.6, z: 0.4, ry: Math.PI / 2, repeatX: 1.2, repeatY: 2 });
  return batch.build('Kohlehof');
}

export function createPowerPlant(params = {}) {
  const { seed = 21 } = params;
  const random = createRandom(seed);
  const group = new THREE.Group();
  group.name = 'Kraftwerk';

  const turbine = createHall({ length: 44, depth: 18, height: 14, seed: seed + 1, gate: 9, door: 0, tint: '#8e8b7a', ivyDensity: 0.4 });
  group.add(turbine);

  const boiler = createHall({ length: 22, depth: 18, height: 34, seed: seed + 2, tint: '#6e6a5c', ivyDensity: 0.35 });
  boiler.position.set(33, 0, 0);
  group.add(boiler);

  const chimney = createChimney({ seed: seed + 3, height: 62 });
  chimney.position.set(50, 0, -3);
  group.add(chimney);

  const tower = buildCoolingTower(random);
  tower.position.set(-43, 0, 4);
  group.add(tower);

  const yard = buildCoalYard(random);
  yard.position.set(33, 0, 34);
  group.add(yard);

  return group;
}
