import * as THREE from 'three';
import { createBatch, tiledBox } from '../Batch.js';
import { createRandom } from '../Random.js';
import { addDoor } from './Door.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';

const TILE = 3;
const WINDOW_SPACING = 4;

export function createHall(params = {}) {
  const {
    length = 24,
    depth = 11,
    height = 9,
    seed = 1,
    gate = null,
    door = null,
    tint = '#ffffff',
    ivyDensity = 0.5,
  } = params;

  const random = createRandom(seed);
  const group = new THREE.Group();
  group.name = 'Halle';

  const wall = getMaterial('rust_metal', { color: tint });
  const roof = getMaterial('roof');
  const bottom = getColorMaterial(0x222222);

  const body = new THREE.Mesh(tiledBox(length, height, depth, TILE), [wall, wall, roof, bottom, wall, wall]);
  body.position.y = height / 2;
  group.add(body);

  const batch = createBatch();
  const concrete = getMaterial('concrete_panel');
  const plinth = getMaterial('concrete_panel', { color: 0x9a968c });
  const steel = getMaterial('steel');
  const gateMetal = getMaterial('steel', { color: 0xc4c4b0, ...OVERLAY });
  const slab = getMaterial('slab');
  const sign = getMaterial('sign', OVERLAY);
  const doorMaterial = getMaterial('door', OVERLAY);
  const lit = getMaterial('window_lit', { unlit: true, ...OVERLAY });
  const boards = getMaterial('boards', { transparent: true, alphaTest: 0.2, ...OVERLAY });
  const glass = getColorMaterial(0x23282b);
  const lamp = getColorMaterial(0xffd890, { unlit: true });
  const foliage = [0xffffff, 0xd6e0a0, 0xb8c98a, 0xe6d596].map((color) =>
    getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color, ...OVERLAY })
  );
  const leaves = [0xc8d890, 0xb0c878, 0xbccc84].map((color) => getMaterial('leaves', { color }));

  batch.box(plinth, length + 0.12, 1, depth + 0.12, { y: 0.5, tile: TILE });

  const lip = 0.35;
  const thickness = 0.3;
  batch.box(concrete, length, lip, thickness, { y: height + lip / 2, z: depth / 2 - thickness / 2, tile: TILE });
  batch.box(concrete, length, lip, thickness, { y: height + lip / 2, z: -depth / 2 + thickness / 2, tile: TILE });
  batch.box(concrete, thickness, lip, depth - thickness * 2, { y: height + lip / 2, x: length / 2 - thickness / 2, tile: TILE });
  batch.box(concrete, thickness, lip, depth - thickness * 2, { y: height + lip / 2, x: -length / 2 + thickness / 2, tile: TILE });

  const hoods = Math.max(2, Math.floor(length / 9));
  for (let i = 0; i < hoods; i += 1) {
    const x = -length / 2 + ((i + 0.5) / hoods) * length;
    batch.box(steel, 2.2, 1.1, 1.6, { x, y: height + 0.55, z: random.range(-1.5, 1.5), tile: 1 });
    batch.cylinder(steel, 0.35, 0.35, 2.4, 8, { x: x + 1.7, y: height + 1.2, z: random.range(-2, 2) });
  }

  const front = depth / 2;
  const windowY = height - 2.4;
  const windows = Math.floor(length / WINDOW_SPACING);
  for (const side of [1, -1]) {
    const z = side * (front + 0.03);
    const ry = side > 0 ? 0 : Math.PI;
    for (let i = 0; i < windows; i += 1) {
      const x = -length / 2 + (i + 0.5) * (length / windows);
      if (side > 0 && gate !== null && Math.abs(x - gate) < 3.4) continue;
      const roll = random.next();
      batch.quad(glass, 2.2, 0.9, { x, y: windowY, z, ry });
      if (roll < (side > 0 ? 0.22 : 0.06)) batch.quad(lit, 2.2, 0.9, { x, y: windowY, z: z + side * 0.02, ry });
      else if (roll < 0.4) batch.quad(boards, 2.2, 0.9, { x, y: windowY, z: z + side * 0.04, ry });
    }
  }

  if (gate !== null) {
    const frontZ = front + 0.04;
    batch.quad(gateMetal, 5, 4.6, { x: gate, y: 2.3 + 0.2, z: frontZ, repeatX: 1.5, repeatY: 1.5 });
    batch.box(steel, 0.3, 5, 0.3, { x: gate - 2.7, y: 2.5, z: front + 0.12, tile: 1 });
    batch.box(steel, 0.3, 5, 0.3, { x: gate + 2.7, y: 2.5, z: front + 0.12, tile: 1 });
    batch.box(steel, 5.7, 0.4, 0.4, { x: gate, y: 5.1, z: front + 0.15, tile: 1 });
    batch.quad(sign, 0.7, 0.7, { x: gate + 3.4, y: 2.2, z: frontZ });
    batch.box(lamp, 0.4, 0.14, 0.16, { x: gate - 1.5, y: 5.45, z: front + 0.12, tile: 1 });
    batch.box(lamp, 0.4, 0.14, 0.16, { x: gate + 1.5, y: 5.45, z: front + 0.12, tile: 1 });
    batch.box(slab, 6.4, 0.04, 3.2, { x: gate, y: 0.05, z: front + 1.7, tile: 2 });
  }

  if (door !== null) {
    addDoor(batch, { x: door, y: 0.2, z: front, face: doorMaterial, frame: steel });
    batch.box(steel, 2.2, 0.2, 1.2, { x: door, y: 3.05, z: front + 0.6, tile: 1 });
    batch.box(lamp, 0.34, 0.12, 0.14, { x: door, y: 2.9, z: front + 0.1, tile: 1 });
  }

  for (const side of [1, -1]) {
    const z = side * (front + 0.07);
    const ry = side > 0 ? 0 : Math.PI;
    const patches = Math.floor((length / 3) * ivyDensity);
    for (let n = 0; n < patches; n += 1) {
      const x = random.range(-length / 2 + 1.5, length / 2 - 1.5);
      if (side > 0 && gate !== null && Math.abs(x - gate) < 3.6) continue;
      if (side > 0 && door !== null && Math.abs(x - door) < 1.6) continue;
      const top = random.range(2, height * 0.9);
      const width = random.range(2.2, 3.2);
      batch.quad(random.pick(foliage), width, top, { x, y: top / 2, z, ry, repeatX: width / 2, repeatY: top / 2 });
      if (random.next() < 0.5) {
        const second = top * random.range(0.5, 0.9);
        batch.quad(random.pick(foliage), width * 0.7, second, {
          x: x + random.range(-0.5, 0.5),
          y: second / 2,
          z: z + side * 0.05,
          ry,
          repeatX: width * 0.35,
          repeatY: second / 2,
        });
      }
    }
  }

  const tufts = Math.floor(length / 4);
  for (let i = 0; i < tufts; i += 1) {
    batch.blob(random.pick(leaves), random.range(0.5, 1.1), 0, {
      x: random.range(-length / 2 + 1, length / 2 - 1),
      y: height + random.range(0.1, 0.4),
      z: random.range(-depth / 2 + 1, depth / 2 - 1),
      sy: 0.7,
      ry: random.range(0, 3),
    });
  }

  group.add(batch.build('HalleDetails'));
  return group;
}
