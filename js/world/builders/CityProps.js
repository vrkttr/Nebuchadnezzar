import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial } from '../Textures.js';

export function createFountain(params = {}) {
  const { seed = 1, radius = 6 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const concrete = getMaterial('concrete_panel', { color: 0xa8a496 });
  const dark = getMaterial('concrete_panel', { color: 0x6f6c62 });
  const rust = getMaterial('rust_metal');
  const moss = getMaterial('leaves', { color: 0x6f7f4a });
  const water = getColorMaterial(0x4f5a48);

  batch.cylinder(concrete, radius, radius + 0.3, 0.9, 16, { y: 0.45, repeatX: 6, repeatY: 0.5 });
  batch.cylinder(dark, radius - 0.5, radius - 0.5, 0.06, 16, { y: 0.88 });
  batch.cylinder(water, radius - 0.55, radius - 0.55, 0.04, 16, { y: 0.7 });
  batch.cylinder(concrete, 1.4, 1.7, 1.2, 10, { y: 1.1, repeatX: 3, repeatY: 0.5 });
  batch.cylinder(concrete, 0.7, 0.9, 2.4, 8, { y: 2.9, repeatX: 2, repeatY: 1 });
  batch.cylinder(concrete, 2.2, 1.6, 0.35, 10, { y: 4.3, repeatX: 3, repeatY: 0.3 });
  batch.cylinder(rust, 0.16, 0.16, 1.4, 6, { y: 5.1 });
  batch.cylinder(rust, 0.7, 0.2, 0.2, 8, { y: 5.9 });

  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + random.range(-0.2, 0.2);
    const distance = radius - 0.7 + random.range(-0.3, 0.3);
    batch.blob(moss, random.range(0.3, 0.6), 0, { x: Math.cos(angle) * distance, y: 0.9, z: Math.sin(angle) * distance, sy: 0.6 });
  }

  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    batch.box(dark, 0.5, 0.35, 0.5, { x: Math.cos(angle) * (radius + 0.9), y: 0.18, z: Math.sin(angle) * (radius + 0.9), ry: -angle, tile: 1 });
  }

  return batch.build('Brunnen');
}

export function createBanner(params = {}) {
  const { height = 7, color = '#8a3a30', seed = 1 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const steel = getMaterial('steel');
  const cloth = getMaterial('cloth', { color, side: THREE.DoubleSide });
  const length = random.range(1.6, 2.2);

  batch.cylinder(steel, 0.07, 0.1, height, 6, { y: height / 2 });
  batch.box(steel, 0.05, 0.05, 1.2, { y: height - 0.2, z: 0.6, tile: 1 });
  batch.box(cloth, 0.04, length, 1.0, { y: height - 0.3 - length / 2, z: 0.62, rx: random.range(-0.04, 0.04), tile: 2 });
  batch.box(getColorMaterial(0xc8b070), 0.06, 0.22, 0.7, { y: height - 0.5, z: 0.62, tile: 1 });

  return batch.build('Fahne');
}
