import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY } from '../Textures.js';
import { fxMarker } from '../../effects/Markers.js';

const BARREL_TINTS = [0xffffff, 0xb86a4a, 0x6f8aa0, 0x8a9a62];

export function createBarrel(params = {}) {
  const { seed = 1, lying = false, burning = false } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const metal = getMaterial('rust_metal', { color: random.pick(BARREL_TINTS) });
  const steel = getMaterial('steel');

  if (lying) {
    batch.cylinder(metal, 0.4, 0.4, 0.9, 10, { y: 0.4, rz: Math.PI / 2, repeatX: 2, repeatY: 0.6 });
  } else {
    batch.cylinder(metal, 0.4, 0.4, 0.9, 10, { y: 0.45, repeatX: 2, repeatY: 0.6 });
    batch.cylinder(steel, 0.42, 0.42, 0.06, 10, { y: 0.2 });
    batch.cylinder(steel, 0.42, 0.42, 0.06, 10, { y: 0.7 });
    if (burning) {
      batch.cylinder(getColorMaterial(0xff9a3c, { unlit: true }), 0.34, 0.34, 0.04, 10, { y: 0.92 });
    }
  }

  const barrel = batch.build('Barrel');
  if (burning && !lying) barrel.add(fxMarker('fire', {}, { y: 0.95 }));
  return barrel;
}

export function createCrate(params = {}) {
  const { seed = 1, stack = 1 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const wood = getMaterial('wood');

  for (let i = 0; i < stack; i += 1) {
    batch.box(wood, 0.9, 0.7, 0.9, { y: 0.35 + i * 0.7, ry: random.range(-0.2, 0.2), tile: 1 });
  }

  return batch.build('Crate');
}

export function createBin(params = {}) {
  const batch = createBatch();
  const plastic = getMaterial('plastic');
  const dark = getColorMaterial(0x2c3a2e);
  batch.box(plastic, 1.0, 1.1, 0.7, { y: 0.55, tile: 1 });
  batch.box(dark, 1.04, 0.08, 0.74, { y: 1.14, tile: 1, rx: params.open ? -0.5 : 0 });
  batch.cylinder(dark, 0.1, 0.1, 0.06, 8, { x: -0.35, y: 0.1, z: 0.38, rx: Math.PI / 2 });
  batch.cylinder(dark, 0.1, 0.1, 0.06, 8, { x: 0.35, y: 0.1, z: 0.38, rx: Math.PI / 2 });
  return batch.build('Bin');
}

export function createBench() {
  const batch = createBatch();
  const wood = getMaterial('wood');
  const steel = getMaterial('steel');
  batch.box(wood, 1.8, 0.07, 0.22, { y: 0.45, z: 0.15, tile: 1 });
  batch.box(wood, 1.8, 0.07, 0.22, { y: 0.45, z: -0.12, tile: 1 });
  batch.box(wood, 1.8, 0.1, 0.07, { y: 0.8, z: -0.28, rx: -0.15, tile: 1 });
  batch.box(wood, 1.8, 0.1, 0.07, { y: 0.95, z: -0.3, rx: -0.15, tile: 1 });
  for (const x of [-0.75, 0.75]) {
    batch.box(steel, 0.08, 0.45, 0.5, { x, y: 0.22, tile: 1 });
    batch.box(steel, 0.08, 0.6, 0.08, { x, y: 0.7, z: -0.27, rx: -0.15, tile: 1 });
  }
  return batch.build('Bench');
}

export function createPlayground() {
  const batch = createBatch();
  const metal = getMaterial('rust_metal', { color: 0xc08a60 });
  const steel = getMaterial('steel');
  const wood = getMaterial('wood');
  const slab = getMaterial('slab', OVERLAY);

  batch.box(slab, 6, 0.03, 4.5, { y: 0.03, tile: 2 });

  for (const x of [-1.2, 1.2]) {
    batch.cylinder(metal, 0.06, 0.06, 2.4, 6, { x, y: 1.2, z: -1, rz: x > 0 ? 0.22 : -0.22 });
    batch.cylinder(metal, 0.06, 0.06, 2.4, 6, { x, y: 1.2, z: 1, rz: x > 0 ? 0.22 : -0.22 });
  }
  batch.cylinder(metal, 0.06, 0.06, 2.8, 6, { x: 0, y: 2.25, z: -1, rz: Math.PI / 2 });
  batch.cylinder(metal, 0.06, 0.06, 2.8, 6, { x: 0, y: 2.25, z: 1, rz: Math.PI / 2 });
  batch.box(wood, 0.5, 0.05, 0.3, { x: 0.3, y: 0.55, z: -1, tile: 1 });
  batch.cylinder(steel, 0.01, 0.01, 1.7, 3, { x: 0.05, y: 1.4, z: -1 });
  batch.cylinder(steel, 0.01, 0.01, 1.7, 3, { x: 0.55, y: 1.4, z: -1 });

  batch.box(metal, 0.9, 0.05, 2.4, { x: 2.6, y: 0.9, z: 0, rx: 0.0, rz: 0.55, tile: 1 });
  batch.box(steel, 0.05, 1.8, 0.05, { x: 2.2, y: 1.2, z: -1.05, tile: 1 });
  batch.box(steel, 0.05, 1.8, 0.05, { x: 2.2, y: 1.2, z: 1.05, tile: 1 });

  batch.cylinder(metal, 0.7, 0.7, 0.2, 8, { x: -2.2, y: 0.6, z: 1.4, repeatX: 2 });
  batch.cylinder(steel, 0.05, 0.05, 0.6, 6, { x: -2.2, y: 0.3, z: 1.4 });
  return batch.build('Playground');
}

export function createRaisedBed(params = {}) {
  const { seed = 1, length = 2.4 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const wood = getMaterial('wood');
  const dirt = getMaterial('dirt');
  const leaf = [0xc8d890, 0xd4de98, 0xb0c878].map((color) => getMaterial('leaves', { color }));
  const width = 0.9;

  batch.box(wood, length, 0.4, 0.06, { y: 0.2, z: width / 2, tile: 1 });
  batch.box(wood, length, 0.4, 0.06, { y: 0.2, z: -width / 2, tile: 1 });
  batch.box(wood, 0.06, 0.4, width, { y: 0.2, x: length / 2, tile: 1 });
  batch.box(wood, 0.06, 0.4, width, { y: 0.2, x: -length / 2, tile: 1 });
  batch.box(dirt, length - 0.1, 0.34, width - 0.1, { y: 0.2, tile: 1 });

  const plants = Math.floor(length / 0.5);
  for (let i = 0; i < plants; i += 1) {
    batch.blob(random.pick(leaf), random.range(0.18, 0.3), 0, {
      x: -length / 2 + 0.3 + i * 0.5,
      y: 0.5,
      z: random.range(-0.2, 0.2),
      sy: 1.1,
    });
  }

  return batch.build('RaisedBed');
}

export function createClothesline(params = {}) {
  const { seed = 1, span = 5 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const steel = getMaterial('steel');
  const rope = getColorMaterial(0x4a4638);
  const laundry = getMaterial('laundry', { side: THREE.DoubleSide });
  const accents = [0xffffff, 0x7a9ab0, 0xc8b050, 0xb85a4a].map((color) =>
    getMaterial('laundry', { side: THREE.DoubleSide, color })
  );

  for (const x of [-span / 2, span / 2]) {
    batch.cylinder(steel, 0.05, 0.06, 2.4, 6, { x, y: 1.2 });
  }
  batch.box(rope, span, 0.015, 0.015, { y: 2.2, tile: 1 });

  for (let x = -span / 2 + 0.5; x < span / 2 - 0.4; x += random.range(0.6, 0.9)) {
    batch.quad(random.pick([laundry, ...accents]), random.range(0.4, 0.7), random.range(0.5, 0.9), {
      x,
      y: 2.2 - 0.35,
      z: 0,
      ry: random.range(-0.2, 0.2),
    });
  }

  return batch.build('Clothesline');
}

export function createLamp(params = {}) {
  const { lit = false } = params;
  const batch = createBatch();
  const steel = getMaterial('steel');
  batch.cylinder(steel, 0.07, 0.1, 5.2, 6, { y: 2.6 });
  batch.box(steel, 0.9, 0.08, 0.08, { x: 0.4, y: 5.2, tile: 1 });
  if (!lit) batch.box(getColorMaterial(0x39352d), 0.5, 0.12, 0.22, { x: 0.8, y: 5.12, tile: 1 });
  const lamp = batch.build('Lamp');
  if (lit) lamp.add(fxMarker('lamp', {}, { x: 0.8, y: 5.12 }));
  return lamp;
}

export function createFence(params = {}) {
  const { length = 6, height = 2, gapAt = null, seed = 1 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const steel = getMaterial('steel');
  const mesh = getMaterial('fence', {
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
  });
  const segments = Math.max(1, Math.round(length / 2.5));
  const step = length / segments;

  for (let i = 0; i <= segments; i += 1) {
    batch.box(steel, 0.1, height, 0.1, { x: -length / 2 + i * step, y: height / 2, tile: 1 });
  }
  batch.box(steel, length, 0.06, 0.06, { y: height - 0.03, tile: 1 });
  batch.box(steel, length, 0.05, 0.05, { y: 0.12, tile: 1 });

  for (let i = 0; i < segments; i += 1) {
    const x = -length / 2 + step / 2 + i * step;
    if (gapAt !== null && random.next() < gapAt) continue;
    const sag = random.range(-0.08, 0.08);
    batch.quad(mesh, step, height - 0.2, {
      x,
      y: height / 2,
      rx: sag,
      repeatX: step / 0.6,
      repeatY: (height - 0.2) / 0.6,
    });
  }

  return batch.build('Fence');
}

export function createGateLeaf(params = {}) {
  const { width = 3 } = params;
  const batch = createBatch();
  const steel = getMaterial('steel');
  const rust = getMaterial('rust_metal');
  const mesh = getMaterial('fence', { transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  batch.box(steel, width, 0.1, 0.1, { x: width / 2, y: 0.15, tile: 1 });
  batch.box(steel, width, 0.1, 0.1, { x: width / 2, y: 1.95, tile: 1 });
  batch.box(steel, 0.1, 1.9, 0.1, { x: 0.05, y: 1.05, tile: 1 });
  batch.box(steel, 0.1, 1.9, 0.1, { x: width - 0.05, y: 1.05, tile: 1 });
  batch.quad(mesh, width, 1.8, { x: width / 2, y: 1.05, repeatX: width / 0.6, repeatY: 3 });
  batch.box(rust, width, 0.5, 0.04, { x: width / 2, y: 0.5, tile: 1 });
  return batch.build('GateLeaf');
}

export function createCar(params = {}) {
  const { seed = 1, tint = 0xffffff, tarped = false, wrecked = false } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const paint = getMaterial('rust_metal', { color: tint });
  const glass = getColorMaterial(0x232b30, OVERLAY);
  const tire = getColorMaterial(0x161512);
  const tarp = getMaterial('tarp');
  const steel = getMaterial('steel');

  batch.box(paint, 4.3, 0.75, 1.75, { y: 0.7, tile: 1.5 });
  batch.box(paint, 2.3, 0.62, 1.6, { x: -0.2, y: 1.37, tile: 1.5 });
  batch.box(paint, 0.9, 0.2, 1.75, { x: 1.7, y: 1.1, rz: -0.12, tile: 1.5 });

  const lean = wrecked ? 0.18 : 0;
  batch.quad(glass, 1.55, 0.46, { x: -0.2, y: 1.38, z: 0.805, ry: 0 });
  batch.quad(glass, 1.55, 0.46, { x: -0.2, y: 1.38, z: -0.805, ry: Math.PI });
  batch.quad(glass, 1.4, 0.46, { x: 0.96, y: 1.37, z: 0, ry: Math.PI / 2, rx: 0.0 });
  batch.quad(glass, 1.4, 0.46, { x: -1.36, y: 1.37, z: 0, ry: -Math.PI / 2 });

  for (const x of [-1.4, 1.4]) {
    for (const z of [-0.85, 0.85]) {
      batch.cylinder(tire, 0.36, 0.36, 0.26, 10, { x, y: lean ? 0.28 : 0.36, z, rx: Math.PI / 2 });
    }
  }

  batch.box(steel, 0.1, 0.12, 1.6, { x: 2.18, y: 0.4, tile: 1 });
  batch.box(steel, 0.1, 0.12, 1.6, { x: -2.18, y: 0.4, tile: 1 });

  if (tarped) {
    batch.box(tarp, 2.6, 0.08, 1.9, { x: -0.2, y: 1.72, rz: random.range(-0.04, 0.04), tile: 1.5 });
    batch.box(tarp, 0.08, 0.5, 1.9, { x: -1.5, y: 1.52, tile: 1.5 });
  }

  const group = batch.build('Car');
  group.rotation.z = lean * 0.1;
  return group;
}

export function createStall() {
  const batch = createBatch();
  const wood = getMaterial('wood');
  const steel = getMaterial('steel');
  const tarp = getMaterial('tarp', { side: THREE.DoubleSide });
  const rust = getMaterial('rust_metal');
  const sign = getMaterial('sign');
  const lamp = getColorMaterial(0xffd890, { unlit: true });

  for (const x of [-2, 2]) {
    for (const z of [-1.2, 1.2]) {
      batch.cylinder(steel, 0.06, 0.07, z < 0 ? 2.9 : 2.4, 6, { x, y: z < 0 ? 1.45 : 1.2, z });
    }
  }

  batch.box(tarp, 4.6, 0.05, 3.1, { y: 2.78, rx: 0.16, tile: 2 });
  batch.box(wood, 3.6, 0.9, 0.7, { y: 0.45, z: 0.9, tile: 1 });
  batch.box(wood, 3.8, 0.06, 0.9, { y: 0.93, z: 0.9, tile: 1 });
  batch.box(rust, 1.2, 0.8, 0.7, { x: -1.2, y: 0.4, z: -0.6, tile: 1 });
  batch.box(wood, 2.2, 1.1, 0.5, { x: 0.8, y: 0.55, z: -1.1, tile: 1 });
  batch.box(wood, 3.8, 1.2, 0.1, { y: 1.8, z: -1.2, tile: 1 });
  batch.quad(sign, 0.5, 0.5, { x: 1.5, y: 2.2, z: -0.85 });
  batch.box(lamp, 0.26, 0.12, 0.12, { x: 0, y: 2.55, z: 0.9, tile: 1 });

  for (let i = 0; i < 4; i += 1) {
    batch.box(wood, 0.35, 0.28, 0.28, { x: -1.3 + i * 0.55, y: 1.1, z: 0.9, ry: i * 0.3, tile: 1 });
  }

  return batch.build('Stall');
}

export function createBarricade(params = {}) {
  const { seed = 1, width = 4 } = params;
  const random = createRandom(seed);
  const batch = createBatch();
  const wood = getMaterial('wood');
  const rust = getMaterial('rust_metal');
  const tire = getColorMaterial(0x1b1a17);

  const count = Math.round(width / 0.9);
  for (let i = 0; i < count; i += 1) {
    const x = -width / 2 + 0.45 + i * (width / count);
    batch.box(wood, 0.9, 1.2, 0.08, { x, y: 0.62, ry: random.range(-0.15, 0.15), rz: random.range(-0.08, 0.08), tile: 1 });
    batch.box(wood, 0.1, 1.4, 0.1, { x: x + 0.3, y: 0.7, z: 0.35, rx: 0.5, tile: 1 });
  }
  batch.box(rust, width * 0.6, 0.9, 0.04, { x: random.range(-0.4, 0.4), y: 0.5, z: 0.1, ry: 0.1, tile: 1 });
  for (let i = 0; i < 3; i += 1) {
    batch.add(tire, new THREE.TorusGeometry(0.32, 0.14, 6, 10), {
      x: -width / 2 + 0.5 + i * 0.7,
      y: 0.16,
      z: 0.6,
      rx: Math.PI / 2,
    });
  }

  return batch.build('Barricade');
}

export function createTent() {
  const batch = createBatch();
  const tarp = getMaterial('tarp', { side: THREE.DoubleSide, color: 0xc8b890 });
  const wood = getMaterial('wood');
  const slope = 0.85;
  batch.box(tarp, 2.5, 0.04, 2.5, { x: -0.85, y: 0.98, rz: slope, tile: 1.5 });
  batch.box(tarp, 2.5, 0.04, 2.5, { x: 0.85, y: 0.98, rz: -slope, tile: 1.5 });
  batch.cylinder(wood, 0.05, 0.05, 2.7, 6, { y: 1.95, rx: Math.PI / 2 });
  batch.cylinder(wood, 0.05, 0.05, 1.95, 6, { y: 0.98, z: 1.3 });
  batch.cylinder(wood, 0.05, 0.05, 1.95, 6, { y: 0.98, z: -1.3 });
  return batch.build('Tent');
}

export function createPole(params = {}) {
  const { height = 7.5 } = params;
  const batch = createBatch();
  const wood = getMaterial('bark', { color: 0xb0a090 });
  const steel = getMaterial('steel');
  batch.cylinder(wood, 0.12, 0.17, height, 6, { y: height / 2 });
  batch.box(steel, 2, 0.1, 0.1, { y: height - 0.4, tile: 1 });
  batch.box(steel, 1.4, 0.08, 0.08, { y: height - 1.1, tile: 1 });
  return batch.build('Pole');
}

export function createContainer(params = {}) {
  const { tint = 0xb86a4a, stacked = false } = params;
  const batch = createBatch();
  const metal = getMaterial('rust_metal', { color: tint });
  const steel = getMaterial('steel');
  const levels = stacked ? 2 : 1;
  for (let i = 0; i < levels; i += 1) {
    batch.box(metal, 6, 2.5, 2.4, { y: 1.25 + i * 2.5, tile: 2 });
    batch.box(steel, 0.12, 2.5, 2.5, { x: 3, y: 1.25 + i * 2.5, tile: 1 });
    batch.box(steel, 0.12, 2.5, 2.5, { x: -3, y: 1.25 + i * 2.5, tile: 1 });
  }
  return batch.build('Container');
}
