import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';

const LEG_SPAN = 2.1;
const LEG_HEIGHT = 9;

export function createWaterTower(params = {}) {
  const { seed = 7 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const steel = getMaterial('steel');
  const rust = getMaterial('rust_metal');
  const roof = getMaterial('roof');
  const slab = getMaterial('slab', OVERLAY);
  const sign = getMaterial('sign', OVERLAY);
  const foliage = [0xffffff, 0xd6e0a0].map((color) =>
    getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color, ...OVERLAY })
  );
  const leaf = getMaterial('leaves', { color: 0xb0c878 });
  const warm = getColorMaterial(0xffd890, { unlit: true });

  batch.box(slab, 7.5, 0.04, 7.5, { y: 0.03, tile: 2 });

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      batch.box(steel, 0.32, LEG_HEIGHT, 0.32, { x: sx * LEG_SPAN, y: LEG_HEIGHT / 2, z: sz * LEG_SPAN, tile: 2 });
      batch.box(steel, 0.8, 0.3, 0.8, { x: sx * LEG_SPAN, y: 0.15, z: sz * LEG_SPAN, tile: 1 });
    }
  }

  for (const y of [3, 6, LEG_HEIGHT - 0.2]) {
    batch.box(steel, LEG_SPAN * 2, 0.16, 0.16, { x: 0, y, z: LEG_SPAN, tile: 1 });
    batch.box(steel, LEG_SPAN * 2, 0.16, 0.16, { x: 0, y, z: -LEG_SPAN, tile: 1 });
    batch.box(steel, 0.16, 0.16, LEG_SPAN * 2, { x: LEG_SPAN, y, z: 0, tile: 1 });
    batch.box(steel, 0.16, 0.16, LEG_SPAN * 2, { x: -LEG_SPAN, y, z: 0, tile: 1 });
  }

  const braceLength = Math.hypot(LEG_SPAN * 2, 3);
  const braceAngle = Math.atan2(3, LEG_SPAN * 2);
  for (const level of [0, 3]) {
    for (const [side, ry] of [[1, 0], [-1, 0], [1, Math.PI / 2], [-1, Math.PI / 2]]) {
      const offset = side * LEG_SPAN;
      const positionFor = ry === 0 ? { z: offset } : { x: offset };
      batch.box(steel, braceLength, 0.1, 0.1, { y: level + 1.5, ry, rz: braceAngle, tile: 1, ...positionFor });
      batch.box(steel, braceLength, 0.1, 0.1, { y: level + 1.5, ry, rz: -braceAngle, tile: 1, ...positionFor });
    }
  }

  const tankY = LEG_HEIGHT + 1.9;
  batch.box(steel, LEG_SPAN * 2 + 1.2, 0.3, LEG_SPAN * 2 + 1.2, { y: LEG_HEIGHT + 0.1, tile: 2 });
  batch.cylinder(rust, 2.7, 2.7, 3.6, 14, { y: tankY, repeatX: 4, repeatY: 1.4 });
  batch.cylinder(steel, 2.85, 2.85, 0.18, 14, { y: tankY - 1.2, repeatX: 4, repeatY: 0.2 });
  batch.cylinder(steel, 2.85, 2.85, 0.18, 14, { y: tankY + 1.0, repeatX: 4, repeatY: 0.2 });
  batch.cone(roof, 2.95, 1.3, 14, { y: tankY + 1.8 + 0.65 });
  batch.cylinder(steel, 0.12, 0.12, 0.7, 6, { y: tankY + 3.1 });

  const ladderX = -0.3;
  const ladderZ = LEG_SPAN + 0.28;
  batch.box(steel, 0.06, LEG_HEIGHT + 3, 0.06, { x: ladderX - 0.25, y: (LEG_HEIGHT + 3) / 2 + 0.2, z: ladderZ, tile: 1 });
  batch.box(steel, 0.06, LEG_HEIGHT + 3, 0.06, { x: ladderX + 0.25, y: (LEG_HEIGHT + 3) / 2 + 0.2, z: ladderZ, tile: 1 });
  for (let y = 0.6; y < LEG_HEIGHT + 3; y += 0.38) {
    batch.box(steel, 0.5, 0.04, 0.04, { x: ladderX, y, z: ladderZ, tile: 1 });
  }

  batch.quad(sign, 0.6, 0.6, { x: -LEG_SPAN, y: 1.7, z: LEG_SPAN + 0.17 });
  batch.quad(sign, 0.6, 0.6, { x: -LEG_SPAN + 0.18, y: 1.7, z: LEG_SPAN, ry: Math.PI / 2 });

  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1]]) {
    const height = random.range(4, 7);
    const x = sx * LEG_SPAN;
    const z = sz * LEG_SPAN;
    batch.quad(foliage[0], 1.2, height, { x, y: height / 2, z: z + 0.2, repeatX: 0.6, repeatY: height / 2 });
    batch.quad(foliage[1], 1.2, height, { x: x + 0.2, y: height / 2, z, ry: Math.PI / 2, repeatX: 0.6, repeatY: height / 2 });
    batch.blob(leaf, random.range(0.5, 0.8), 0, { x, y: 0.3, z, sy: 0.7 });
  }

  batch.box(warm, 0.3, 0.14, 0.14, { x: ladderX, y: LEG_HEIGHT + 3.3, z: ladderZ, tile: 1 });

  return batch.build('WaterTower');
}
