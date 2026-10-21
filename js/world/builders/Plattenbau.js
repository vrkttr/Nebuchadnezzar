import * as THREE from 'three';
import { createBatch, tiledBox } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';

const CELL = 3;
const FLOOR = 3;
const WINDOW_Y = 1.7;
const WINDOW_W = 1.4;
const WINDOW_H = 1.5;
const WALL_OFFSET = 0.03;

export function createPlattenbau(params = {}) {
  const {
    cells = 10,
    floors = 4,
    depth = 11,
    inhabited = [3, 6],
    entrance = null,
    seed = 1,
    ivyDensity = 0.55,
  } = params;

  const random = createRandom(seed);
  const length = cells * CELL;
  const height = floors * FLOOR;
  const group = new THREE.Group();
  group.name = 'Plattenbau';

  const concrete = getMaterial('concrete_panel');
  const facade = getMaterial('facade');
  const roof = getMaterial('roof');
  const bottom = getColorMaterial(0x222222);

  const body = new THREE.Mesh(tiledBox(length, height, depth, CELL), [
    concrete,
    concrete,
    roof,
    bottom,
    facade,
    facade,
  ]);
  body.position.y = height / 2;
  group.add(body);

  const batch = createBatch();
  const lit = getMaterial('window_lit', { unlit: true, ...OVERLAY });
  const boards = getMaterial('boards', { transparent: true, alphaTest: 0.2, ...OVERLAY });
  const tarp = getMaterial('tarp', OVERLAY);
  const wood = getMaterial('wood', OVERLAY);
  const plaster = getMaterial('concrete_panel', { color: 0xc9bb9a, ...OVERLAY });
  const steel = getMaterial('steel');
  const slab = getMaterial('slab');
  const door = getMaterial('door', OVERLAY);
  const sign = getMaterial('sign', OVERLAY);
  const laundry = getMaterial('laundry', OVERLAY);
  const lamp = getColorMaterial(0xffd890, { unlit: true });
  const plinth = getMaterial('concrete_panel', { color: 0x9a968c });
  const foliageTints = [0xffffff, 0xd6e0a0, 0xb8c98a, 0xe6d596];
  const foliage = foliageTints.map((color) =>
    getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color, ...OVERLAY })
  );
  const leaves = [0xc8d890, 0xb0c878, 0xbccc84].map((color) => getMaterial('leaves', { color }));

  const cellX = (index) => -length / 2 + CELL / 2 + index * CELL;
  const isInhabited = (index) => index >= inhabited[0] && index <= inhabited[1];

  batch.box(plinth, length + 0.12, 0.5, depth + 0.12, { y: 0.25, tile: CELL });

  const parapet = 0.45;
  const thickness = 0.25;
  batch.box(concrete, length, parapet, thickness, { y: height + parapet / 2, z: depth / 2 - thickness / 2, tile: CELL });
  batch.box(concrete, length, parapet, thickness, { y: height + parapet / 2, z: -depth / 2 + thickness / 2, tile: CELL });
  batch.box(concrete, thickness, parapet, depth - thickness * 2, { y: height + parapet / 2, x: length / 2 - thickness / 2, tile: CELL });
  batch.box(concrete, thickness, parapet, depth - thickness * 2, { y: height + parapet / 2, x: -length / 2 + thickness / 2, tile: CELL });

  const stairBox = Math.floor(cells / 2);
  batch.box(concrete, 3, 2.4, 3, { x: cellX(stairBox), y: height + 1.2, z: -1, tile: CELL });

  function windowsFor(side, front) {
    const z = side * (depth / 2 + WALL_OFFSET);
    const ry = side > 0 ? 0 : Math.PI;

    for (let i = 0; i < cells; i += 1) {
      for (let f = 0; f < floors; f += 1) {
        if (front && entrance === i && f === 0) continue;

        const roll = random.next();
        const x = cellX(i);
        const y = f * FLOOR + WINDOW_Y;
        let material = null;

        if (front && isInhabited(i)) {
          const upper = f >= floors - 1 ? 0.7 : 1;
          if (roll < 0.36 * upper) material = lit;
          else if (roll < 0.44) material = tarp;
        } else if (front) {
          if (roll < 0.28) material = boards;
          else if (roll < 0.34) material = tarp;
        } else if (roll < 0.05) {
          material = lit;
        } else if (roll < 0.3) {
          material = boards;
        }

        if (!material) continue;
        const offset = material === boards ? 0.06 : material === tarp ? 0.045 : 0.03;
        batch.quad(material, WINDOW_W, WINDOW_H, { x, y, z: z + side * (offset - WALL_OFFSET), ry });
      }
    }
  }

  windowsFor(1, true);
  windowsFor(-1, false);

  for (let i = inhabited[0]; i <= inhabited[1]; i += 1) {
    if (i % 2 !== 0) continue;
    for (let f = 1; f < floors; f += 1) {
      if (random.next() < 0.28) continue;
      const x = cellX(i);
      const y = f * FLOOR + 0.9;
      batch.box(slab, 2.4, 0.14, 1.1, { x, y, z: depth / 2 + 0.55, tile: 2 });
      batch.box(steel, 2.4, 0.8, 0.05, { x, y: y + 0.47, z: depth / 2 + 1.07, tile: 1 });
      batch.box(steel, 0.05, 0.8, 1.1, { x: x - 1.18, y: y + 0.47, z: depth / 2 + 0.55, tile: 1 });
      batch.box(steel, 0.05, 0.8, 1.1, { x: x + 1.18, y: y + 0.47, z: depth / 2 + 0.55, tile: 1 });

      if (random.next() < 0.5) {
        batch.quad(laundry, 0.8, 0.55, { x: x + random.range(-0.6, 0.6), y: y + 0.55, z: depth / 2 + 1.11 });
      }
      if (random.next() < 0.22) {
        batch.quad(tarp, 2.4, 1.2, { x, y: y + 1.25, z: depth / 2 + 1.1, rx: -0.35 });
      }
    }
  }

  for (let n = 0; n < 7; n += 1) {
    const i = inhabited.length === 2 ? random.int(inhabited[0], inhabited[1]) : random.int(0, cells - 1);
    if (entrance === i) continue;
    const f = random.int(0, floors - 2);
    const patch = random.next() < 0.5 ? wood : plaster;
    batch.quad(patch, random.range(1.2, 1.8), random.range(0.9, 1.4), {
      x: cellX(i) + random.range(-0.2, 0.2),
      y: f * FLOOR + random.range(0.6, 0.9),
      z: depth / 2 + 0.05,
      repeatX: 1,
      repeatY: 1,
    });
  }

  if (entrance !== null) {
    const x = cellX(entrance);
    batch.quad(door, 1.8, 2.5, { x, y: 1.25, z: depth / 2 + 0.045 });
    batch.box(concrete, 3.2, 0.2, 1.9, { x, y: 2.9, z: depth / 2 + 0.95, tile: CELL });
    batch.box(steel, 0.1, 2.8, 0.1, { x: x - 1.45, y: 1.4, z: depth / 2 + 1.75, tile: 1 });
    batch.box(steel, 0.1, 2.8, 0.1, { x: x + 1.45, y: 1.4, z: depth / 2 + 1.75, tile: 1 });
    batch.box(lamp, 0.34, 0.12, 0.14, { x, y: 2.72, z: depth / 2 + 0.1, tile: 1 });
    batch.quad(sign, 0.5, 0.5, { x: x + 1.5, y: 1.6, z: depth / 2 + 0.045 });
    batch.box(steel, 1.2, 0.55, 0.14, { x: x - 1.7, y: 1.3, z: depth / 2 + 0.08, tile: 1 });
    batch.box(slab, 3.4, 0.03, 2.4, { x, y: 0.04, z: depth / 2 + 1.25, tile: 2 });
  }

  function ivyOn(side) {
    const z = side * (depth / 2 + 0.07);
    const ry = side > 0 ? 0 : Math.PI;

    for (let i = 0; i < cells; i += 1) {
      const zone = side > 0 && isInhabited(i);
      if (side > 0 && entrance !== null && Math.abs(i - entrance) <= 1) continue;
      const chance = zone ? 0.1 : ivyDensity * (side > 0 ? 1 : 1.2);
      if (random.next() > chance) continue;

      const top = zone ? random.range(1.2, 3) : random.range(FLOOR * 1.5, height);
      const width = random.range(2.2, 3);
      const x = cellX(i) + random.range(-0.4, 0.4);
      const material = random.pick(foliage);
      batch.quad(material, width, top, { x, y: top / 2, z, ry, repeatX: width / 2, repeatY: top / 2 });

      if (!zone && random.next() < 0.7) {
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

      if (!zone && top > height * 0.8 && random.next() < 0.6) {
        const hang = random.range(1.5, 3.5);
        batch.quad(random.pick(foliage), 2.4, hang, {
          x,
          y: height - hang / 2 + 0.2,
          z: z + side * 0.09,
          ry,
          repeatX: 1.2,
          repeatY: hang / 2,
        });
      }
    }
  }

  ivyOn(1);
  ivyOn(-1);

  for (let i = 0; i < cells; i += 1) {
    if (isInhabited(i)) continue;
    const count = random.int(1, 3);
    for (let n = 0; n < count; n += 1) {
      batch.blob(random.pick(leaves), random.range(0.5, 1.1), 0, {
        x: cellX(i) + random.range(-1.3, 1.3),
        y: height + random.range(0.1, 0.4),
        z: random.range(-depth / 2 + 1, depth / 2 - 1),
        sy: 0.7,
        ry: random.range(0, 3),
      });
    }
  }

  for (let i = inhabited[0]; i <= inhabited[1]; i += 2) {
    const x = cellX(i) + 0.8;
    batch.cylinder(steel, 0.03, 0.03, 3.4, 5, { x, y: height + 1.7, z: 1.5 });
    batch.box(steel, 1.1, 0.04, 0.04, { x, y: height + 3, z: 1.5, tile: 1 });
    batch.box(steel, 0.8, 0.04, 0.04, { x, y: height + 2.5, z: 1.5, tile: 1 });
  }

  group.add(batch.build('PlattenbauDetails'));

  return {
    object: group,
    footprint: { halfLength: length / 2, halfDepth: depth / 2, height },
  };
}
