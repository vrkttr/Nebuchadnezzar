import * as THREE from 'three';
import { createBatch, tiledBox } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';

export function createGarages(params = {}) {
  const { count = 6, unitWidth = 3.2, depth = 5.5, height = 2.7, seed = 3 } = params;
  const random = createRandom(seed);
  const group = new THREE.Group();
  group.name = 'Garages';

  const length = count * unitWidth;
  const concrete = getMaterial('concrete_panel', { color: 0xb4ae9c });
  const roof = getMaterial('roof');
  const bottom = getColorMaterial(0x222222);
  const body = new THREE.Mesh(tiledBox(length, height, depth, 3), [concrete, concrete, roof, bottom, concrete, concrete]);
  body.position.y = height / 2;
  group.add(body);

  const batch = createBatch();
  const doorMaterial = getMaterial('rust_metal', OVERLAY);
  const dark = getColorMaterial(0x14130f, OVERLAY);
  const steel = getMaterial('steel');
  const tarp = getMaterial('tarp');
  const wood = getMaterial('wood', OVERLAY);
  const sign = getMaterial('sign', OVERLAY);
  const leaf = getMaterial('leaves', { color: 0xc8d890 });
  const foliage = getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, ...OVERLAY });
  const lamp = getColorMaterial(0xffd890, { unlit: true });
  const z = depth / 2 + 0.04;

  batch.box(concrete, length, 0.3, 0.2, { y: height + 0.15, z: depth / 2 - 0.1, tile: 3 });

  for (let i = 0; i < count; i += 1) {
    const x = -length / 2 + unitWidth / 2 + i * unitWidth;
    const roll = random.next();

    if (roll < 0.25) {
      batch.quad(dark, 2.7, 2.1, { x, y: 1.05, z });
      batch.box(steel, 2.7, 0.06, 1.3, { x, y: 2.15, z: depth / 2 + 0.55, rx: 0.22, tile: 1 });
    } else if (roll < 0.45) {
      batch.quad(doorMaterial, 2.7, 2.1, { x, y: 1.05, z });
      batch.quad(wood, 2.5, 0.4, { x, y: 0.7, z: z + 0.02 });
      batch.quad(wood, 2.5, 0.4, { x, y: 1.5, z: z + 0.02 });
    } else {
      batch.quad(doorMaterial, 2.7, 2.1, { x, y: 1.05, z });
    }

    batch.box(steel, 0.08, 2.1, 0.08, { x: x - unitWidth / 2 + 0.25, y: 1.05, z: depth / 2 + 0.05, tile: 1 });
  }

  batch.quad(sign, 0.5, 0.5, { x: -length / 2 + 1.1, y: 1.5, z: z + 0.01 });
  batch.box(lamp, 0.3, 0.12, 0.14, { x: -length / 2 + unitWidth * 2.5, y: 2.45, z: depth / 2 + 0.1, tile: 1 });
  batch.quad(tarp, unitWidth * 1.6, depth * 0.5, { x: length / 2 - unitWidth * 1.2, y: height + 0.06, z: -depth * 0.1, rx: -Math.PI / 2 });

  for (let n = 0; n < 6; n += 1) {
    batch.blob(leaf, random.range(0.4, 0.8), 0, {
      x: random.range(-length / 2 + 1, length / 2 - 1),
      y: height + random.range(0.15, 0.4),
      z: random.range(-depth / 2 + 0.8, depth / 2 - 0.8),
      sy: 0.7,
    });
  }

  for (let n = 0; n < 3; n += 1) {
    const w = random.range(2.2, 3);
    const h = random.range(1, 2.4);
    batch.quad(foliage, w, h, {
      x: random.range(-length / 2 + 1.5, length / 2 - 1.5),
      y: h / 2,
      z: depth / 2 + 0.07,
      repeatX: w / 2,
      repeatY: h / 2,
    });
  }

  group.add(batch.build('GarageDetails'));
  return group;
}
