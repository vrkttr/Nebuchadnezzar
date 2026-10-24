import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';

const BAND_COLORS = [0xb8b2a0, 0xa83a2a];

export function createChimney(params = {}) {
  const { seed = 11, height = 46 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const concrete = getMaterial('concrete_panel', { color: 0xa9a496 });
  const steel = getMaterial('steel');
  const slab = getMaterial('slab', OVERLAY);
  const sign = getMaterial('sign', OVERLAY);
  const lamp = getColorMaterial(0xff6a40, { unlit: true });
  const foliage = [0xffffff, 0xd6e0a0, 0xb8c98a].map((color) =>
    getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color, ...OVERLAY })
  );
  const leaf = getMaterial('leaves', { color: 0xb0c878 });

  const bottomRadius = 2.7;
  const topRadius = 1.8;
  const radiusAt = (y) => bottomRadius + (topRadius - bottomRadius) * (y / height);

  batch.box(slab, 8.5, 0.05, 8.5, { y: 0.03, tile: 2 });
  batch.box(concrete, 6.2, 1.2, 6.2, { y: 0.6, tile: 3 });

  const segments = 6;
  const segmentHeight = (height - 1.2) / segments;
  for (let i = 0; i < segments; i += 1) {
    const y0 = 1.2 + i * segmentHeight;
    const y1 = y0 + segmentHeight;
    const material = i >= segments - 2 && i % 2 === 0 ? getColorMaterial(BAND_COLORS[1]) : concrete;
    batch.cylinder(material, radiusAt(y1 - 1.2) + 0.02, radiusAt(y0 - 1.2) + 0.02, segmentHeight, 14, { y: (y0 + y1) / 2, repeatX: 4, repeatY: segmentHeight / 3 });
  }

  for (const y of [height * 0.35, height * 0.65, height - 0.4]) {
    batch.cylinder(steel, radiusAt(y) + 0.14, radiusAt(y) + 0.14, 0.22, 14, { y, repeatX: 4, repeatY: 0.2 });
  }
  batch.cylinder(steel, topRadius + 0.3, topRadius + 0.1, 0.7, 14, { y: height + 0.2, repeatX: 4, repeatY: 0.3 });

  const ladderZ = bottomRadius + 0.1;
  const ladderTop = height - 2;
  batch.box(steel, 0.06, ladderTop, 0.06, { x: -0.25, y: ladderTop / 2 + 1.2, z: ladderZ, tile: 1 });
  batch.box(steel, 0.06, ladderTop, 0.06, { x: 0.25, y: ladderTop / 2 + 1.2, z: ladderZ, tile: 1 });
  for (let y = 1.8; y < ladderTop; y += 0.45) batch.box(steel, 0.5, 0.04, 0.04, { x: 0, y, z: ladderZ, tile: 1 });

  batch.box(lamp, 0.3, 0.2, 0.3, { x: 0, y: height + 0.8, z: 0, tile: 1 });
  batch.quad(sign, 0.8, 0.8, { x: -1.8, y: 2.2, z: 3.12 });

  for (let i = 0; i < 6; i += 1) {
    const angle = random.range(0, Math.PI * 2);
    const growth = random.range(5, 14);
    const radius = radiusAt(0) + 0.05;
    batch.quad(random.pick(foliage), 2.4, growth, {
      x: Math.sin(angle) * radius,
      y: growth / 2 + 1.2,
      z: Math.cos(angle) * radius,
      ry: angle,
      repeatX: 1.2,
      repeatY: growth / 2,
    });
  }
  for (let i = 0; i < 5; i += 1) {
    const angle = random.range(0, Math.PI * 2);
    batch.blob(leaf, random.range(0.6, 1.1), 0, { x: Math.sin(angle) * 3.6, y: 0.3, z: Math.cos(angle) * 3.6, sy: 0.7 });
  }

  return batch.build('Schornstein');
}
