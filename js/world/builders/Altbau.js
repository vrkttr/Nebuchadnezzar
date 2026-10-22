import * as THREE from 'three';
import { createBatch, tiledBox } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';

const CELL = 3;
const FLOOR = 3;
const SQRT2 = Math.SQRT2;

export function createAltbau(params = {}) {
  const {
    cells = 4,
    tiefe = 9,
    floors = 4,
    dach = 'walm',
    farbe = '#c9bb9a',
    seed = 1,
    ivyDensity = 0.4,
    erker = true,
    lit = 0.2,
    tuer = true,
  } = params;

  const random = createRandom(seed);
  const length = cells * CELL;
  const depth = tiefe;
  const height = floors * FLOOR;
  const group = new THREE.Group();
  group.name = 'Altbau';

  const facade = getMaterial('facade', { color: farbe });
  const roof = getMaterial('roof', { color: 0xb09484 });
  const bottom = getColorMaterial(0x222222);
  const body = new THREE.Mesh(tiledBox(length, height, depth, CELL), [facade, facade, roof, bottom, facade, facade]);
  body.position.y = height / 2;
  group.add(body);

  const batch = createBatch();
  const trim = getMaterial('concrete_panel', { color: 0xb8b2a2 });
  const brick = getMaterial('brick', { color: 0xa08470 });
  const roofMaterial = getMaterial('roof', { color: random.pick([0x9a6a56, 0x7a6a62, 0x6a6a6e, 0x8a5a48]) });
  const litMaterial = getMaterial('window_lit', { unlit: true, ...OVERLAY });
  const boards = getMaterial('boards', { transparent: true, alphaTest: 0.2, ...OVERLAY });
  const tarp = getMaterial('tarp', OVERLAY);
  const doorMaterial = getMaterial('door', OVERLAY);
  const steel = getMaterial('steel');
  const slab = getMaterial('slab');
  const foliage = [0xffffff, 0xd6e0a0, 0xb8c98a].map((color) => getMaterial('foliage', { alphaTest: 0.5, side: THREE.DoubleSide, color, ...OVERLAY }));
  const leaves = getMaterial('leaves', { color: 0xb0c878 });

  const cellX = (index) => -length / 2 + CELL / 2 + index * CELL;

  batch.box(brick, length + 0.16, 0.9, depth + 0.16, { y: 0.45, tile: CELL });
  batch.box(trim, length + 0.5, 0.35, depth + 0.5, { y: height + 0.1, tile: CELL });
  for (let f = 1; f < floors; f += 1) {
    batch.box(trim, length + 0.12, 0.14, depth + 0.12, { y: f * FLOOR, tile: CELL });
  }

  if (dach === 'walm') {
    const rise = random.range(2.2, 3.6);
    batch.cone(roofMaterial, 1, rise, 4, { y: height + 0.28 + rise / 2, ry: Math.PI / 4, sx: (length + 0.9) / SQRT2, sy: 1, sz: (depth + 0.9) / SQRT2 });
    if (random.next() < 0.6) batch.box(brick, 0.7, 2.2, 0.7, { x: random.range(-length / 3, length / 3), y: height + 1.4, z: random.range(-1, 1), tile: 1 });
  } else if (dach === 'flach') {
    const parapet = 0.5;
    batch.box(trim, length, parapet, 0.25, { y: height + 0.3 + parapet / 2, z: depth / 2 - 0.125, tile: CELL });
    batch.box(trim, length, parapet, 0.25, { y: height + 0.3 + parapet / 2, z: -depth / 2 + 0.125, tile: CELL });
    batch.box(trim, 0.25, parapet, depth - 0.5, { y: height + 0.3 + parapet / 2, x: length / 2 - 0.125, tile: CELL });
    batch.box(trim, 0.25, parapet, depth - 0.5, { y: height + 0.3 + parapet / 2, x: -length / 2 + 0.125, tile: CELL });
    batch.box(trim, 3, 2.4, 3, { x: cellX(Math.floor(cells / 2)), y: height + 1.5, z: -1, tile: CELL });
    for (let n = 0; n < cells; n += 1) {
      if (random.next() < 0.7) batch.blob(leaves, random.range(0.5, 1.0), 0, { x: cellX(n) + random.range(-1, 1), y: height + 0.6, z: random.range(-depth / 2 + 1, depth / 2 - 1), sy: 0.7 });
    }
  } else {
    const rise = random.range(1.2, 1.8);
    batch.cone(roofMaterial, 1, rise, 4, { y: height + 0.28 + rise / 2, ry: Math.PI / 4, sx: (length + 0.9) / SQRT2, sy: 1, sz: (depth + 0.9) / SQRT2 });
  }

  const doorCell = tuer ? random.int(0, cells - 1) : -1;
  const bayCell = erker && cells >= 3 ? (doorCell + 1 + random.int(0, Math.max(0, cells - 3))) % cells : -1;

  for (let side of [1, -1]) {
    const z = side * (depth / 2 + 0.03);
    const ry = side > 0 ? 0 : Math.PI;
    for (let i = 0; i < cells; i += 1) {
      for (let f = 0; f < floors; f += 1) {
        if (side > 0 && i === doorCell && f === 0) continue;
        const roll = random.next();
        let material = null;
        if (roll < lit) material = litMaterial;
        else if (roll < lit + 0.07) material = boards;
        else if (roll < lit + 0.1) material = tarp;
        if (!material) continue;
        batch.quad(material, 1.4, 1.5, { x: cellX(i), y: f * FLOOR + 1.7, z: z + side * (material === boards ? 0.03 : 0.015), ry });
      }
    }
  }

  if (doorCell >= 0) {
    const x = cellX(doorCell);
    batch.quad(doorMaterial, 1.8, 2.5, { x, y: 1.25, z: depth / 2 + 0.05 });
    batch.box(trim, 2.4, 0.2, 1.1, { x, y: 2.8, z: depth / 2 + 0.55, tile: CELL });
    batch.box(slab, 2.6, 0.05, 1.4, { x, y: 0.05, z: depth / 2 + 0.7, tile: 2 });
  }

  if (bayCell >= 0) {
    const x = cellX(bayCell);
    for (let f = 1; f < floors; f += 1) {
      batch.box(facade, 2.4, FLOOR - 0.2, 0.9, { x, y: f * FLOOR + FLOOR / 2, z: depth / 2 + 0.45, tile: CELL });
      batch.quad(litMaterial, 1.4, 1.4, { x, y: f * FLOOR + 1.7, z: depth / 2 + 0.92 });
    }
    batch.box(trim, 2.6, 0.2, 1.0, { x, y: floors * FLOOR - 0.1, z: depth / 2 + 0.5, tile: CELL });
  }

  for (let side of [1, -1]) {
    for (let i = 0; i < cells; i += 1) {
      if (random.next() > ivyDensity) continue;
      const top = random.range(FLOOR * 1.2, height);
      const width = random.range(2.2, 3);
      const material = random.pick(foliage);
      batch.quad(material, width, top, { x: cellX(i) + random.range(-0.4, 0.4), y: top / 2, z: side * (depth / 2 + 0.07), ry: side > 0 ? 0 : Math.PI, repeatX: width / 2, repeatY: top / 2 });
    }
  }

  if (dach !== 'flach' && random.next() < 0.5) {
    batch.cylinder(steel, 0.03, 0.03, 3, 5, { x: random.range(-length / 3, length / 3), y: height + 3.2, z: 0 });
  }

  group.add(batch.build('AltbauDetails'));
  return group;
}
