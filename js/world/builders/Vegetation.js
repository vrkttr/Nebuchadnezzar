import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, OVERLAY } from '../Textures.js';

const LEAF_TINTS = [0xc8d890, 0xb0c878, 0xd8d08a, 0xa8b870, 0xbccc84];
const CONIFER_TINTS = [0x90a878, 0x82986c];

export function addTree(batch, spec) {
  const { x = 0, z = 0, seed = 1, kind = 'broadleaf', height = 6 } = spec;
  const random = createRandom(seed);
  const bark = getMaterial('bark');

  if (kind === 'dead') {
    batch.cylinder(bark, 0.12, 0.26, height, 6, { x, y: height / 2, z });
    for (let i = 0; i < 4; i += 1) {
      const length = random.range(1.2, 2.2);
      const angle = random.range(0, Math.PI * 2);
      const tilt = random.range(0.7, 1.1);
      const y = height * random.range(0.55, 0.9);
      batch.cylinder(bark, 0.03, 0.08, length, 5, {
        x: x + Math.cos(angle) * Math.sin(tilt) * length * 0.5,
        y: y + Math.cos(tilt) * length * 0.5,
        z: z + Math.sin(angle) * Math.sin(tilt) * length * 0.5,
        ry: -angle,
        rz: -tilt,
      });
    }
    return;
  }

  if (kind === 'conifer') {
    batch.cylinder(bark, 0.14, 0.24, height * 0.4, 6, { x, y: height * 0.2, z });
    const leaf = getMaterial('leaves', { color: random.pick(CONIFER_TINTS) });
    const layers = 4;
    for (let i = 0; i < layers; i += 1) {
      const t = i / layers;
      batch.cone(leaf, (1 - t) * height * 0.28 + 0.4, height * 0.34, 7, {
        x,
        y: height * (0.3 + t * 0.55) + height * 0.12,
        z,
        ry: random.range(0, 3),
      });
    }
    return;
  }

  const trunkHeight = height * 0.55;
  batch.cylinder(bark, 0.14, 0.26, trunkHeight, 6, { x, y: trunkHeight / 2, z });
  const leaf = getMaterial('leaves', { color: random.pick(LEAF_TINTS) });
  const leafAlt = getMaterial('leaves', { color: random.pick(LEAF_TINTS) });
  const crown = height * 0.3;
  const blobs = random.int(3, 5);
  for (let i = 0; i < blobs; i += 1) {
    const angle = (i / blobs) * Math.PI * 2 + random.range(-0.4, 0.4);
    const spread = i === 0 ? 0 : random.range(0.7, 1.4);
    batch.blob(i % 2 ? leaf : leafAlt, crown * random.range(0.8, 1.15), 0, {
      x: x + Math.cos(angle) * spread,
      y: trunkHeight + crown * random.range(0.2, 0.9),
      z: z + Math.sin(angle) * spread,
      ry: random.range(0, 3),
      sy: 0.85,
    });
  }
}

export function createTree(params = {}) {
  const batch = createBatch();
  addTree(batch, { ...params, x: 0, z: 0 });
  return batch.build('Tree');
}

export function createForest(params = {}) {
  const { trees = [] } = params;
  const batch = createBatch();
  for (const tree of trees) addTree(batch, tree);
  return batch.build('Forest');
}

export function createBush(params = {}) {
  const { seed = 1, size = 1 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const leaf = getMaterial('leaves', { color: random.pick(LEAF_TINTS) });
  const count = random.int(2, 4);

  for (let i = 0; i < count; i += 1) {
    batch.blob(leaf, size * random.range(0.35, 0.6), 0, {
      x: random.range(-0.4, 0.4) * size,
      y: size * random.range(0.25, 0.4),
      z: random.range(-0.4, 0.4) * size,
      sy: 0.8,
      ry: random.range(0, 3),
    });
  }

  return batch.build('Bush');
}

export function createGrassTufts(params = {}) {
  const { seed = 1, count = 20, area = { x: 0, z: 0, width: 4, depth: 4 }, scale = 1 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const materials = [0xffffff, 0xe6df9a, 0xbfd08a].map((color) =>
    getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color, ...OVERLAY })
  );

  for (let i = 0; i < count; i += 1) {
    const x = area.x + random.range(-area.width / 2, area.width / 2);
    const z = area.z + random.range(-area.depth / 2, area.depth / 2);
    const size = random.range(0.5, 1) * scale;
    const material = random.pick(materials);
    const rotation = random.range(0, Math.PI);
    batch.quad(material, size, size * 0.8, { x, y: size * 0.4, z, ry: rotation, repeatX: 0.5, repeatY: 0.5 });
    batch.quad(material, size, size * 0.8, { x, y: size * 0.4, z, ry: rotation + Math.PI / 2, repeatX: 0.5, repeatY: 0.5 });
  }

  return batch.build('GrassTufts');
}
