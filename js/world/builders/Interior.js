import * as THREE from 'three';
import { createBatch, tiledBox, scaleUv } from '../Batch.js';
import { createRandom } from '../Random.js';
import { getMaterial, getColorMaterial, OVERLAY_TOP } from '../Textures.js';

const PLASTER = '#c9bb9a';

function finish(batch, name) {
  const group = new THREE.Group();
  group.name = name;
  group.add(batch.build(name));
  return group;
}

export function createWall({ footprint, hoehe = 3, y0 = 0, material = 'concrete_panel', color = PLASTER, tile = 3 }) {
  const surface = getMaterial(material, { color });
  const top = getMaterial(material, { color: 0x77736a });
  const mesh = new THREE.Mesh(tiledBox(footprint.width, hoehe, footprint.depth, tile), [surface, surface, top, top, surface, surface]);
  mesh.position.y = y0 + hoehe / 2;
  const group = new THREE.Group();
  group.name = 'Wand';
  group.add(mesh);
  return group;
}

export function createCeiling({ footprint, hoehe = 3, material = 'concrete_panel', color = '#8a8880' }) {
  const geometry = new THREE.PlaneGeometry(footprint.width, footprint.depth);
  geometry.rotateX(Math.PI / 2);
  scaleUv(geometry, footprint.width / 3, footprint.depth / 3);
  const mesh = new THREE.Mesh(geometry, getMaterial(material, { color }));
  mesh.position.y = hoehe;
  mesh.name = 'Decke';
  return mesh;
}

export function createDoor({ offen = false, breite = 1.2, hoehe = 2.5, farbe = '#8a7a62', schloss = false }) {
  const batch = createBatch();
  const frame = getMaterial('wood', { color: 0x6a5a46 });
  const leaf = getMaterial('door', { color: farbe });
  const steel = getMaterial('steel');
  const half = breite / 2;

  batch.box(frame, 0.12, hoehe + 0.1, 0.34, { x: -half - 0.06, y: (hoehe + 0.1) / 2, tile: 1 });
  batch.box(frame, 0.12, hoehe + 0.1, 0.34, { x: half + 0.06, y: (hoehe + 0.1) / 2, tile: 1 });
  batch.box(frame, breite + 0.24, 0.12, 0.34, { y: hoehe + 0.05, tile: 1 });

  const hinge = -half + 0.02;
  const angle = offen ? 1.35 : 0;
  const leafWidth = breite - 0.04;
  const sinA = Math.sin(angle);
  const cosA = Math.cos(angle);
  const cx = hinge + (leafWidth / 2) * cosA;
  const cz = -(leafWidth / 2) * sinA + 0.08;
  batch.box(leaf, leafWidth, hoehe - 0.04, 0.07, { x: cx, y: (hoehe - 0.04) / 2, z: cz, ry: angle, tile: 1 });
  batch.box(steel, 0.05, 0.05, 0.14, { x: hinge + (leafWidth - 0.14) * cosA, y: 1.05, z: -(leafWidth - 0.14) * sinA + 0.08, ry: angle, tile: 1 });
  if (schloss) batch.box(steel, 0.12, 0.2, 0.05, { x: half - 0.2, y: 1.2, z: 0.12, tile: 1 });

  return finish(batch, 'Tuer');
}

export function createWindow({ breite = 1.6, hoehe = 1.2, hoch = 1.0, zugenagelt = false }) {
  const batch = createBatch();
  const frame = getMaterial('wood', { color: 0x5a4a38 });
  const daylight = getColorMaterial(0xc8d2cc, { unlit: true });
  const boards = getMaterial('boards', { transparent: true, alphaTest: 0.2 });
  const z = 0.02;

  batch.quad(daylight, breite, hoehe, { y: hoch + hoehe / 2, z });
  batch.box(frame, breite + 0.2, 0.1, 0.12, { y: hoch - 0.02, z: 0.05, tile: 1 });
  batch.box(frame, breite + 0.2, 0.1, 0.12, { y: hoch + hoehe + 0.02, z: 0.05, tile: 1 });
  batch.box(frame, 0.1, hoehe, 0.12, { x: -breite / 2 - 0.05, y: hoch + hoehe / 2, z: 0.05, tile: 1 });
  batch.box(frame, 0.1, hoehe, 0.12, { x: breite / 2 + 0.05, y: hoch + hoehe / 2, z: 0.05, tile: 1 });
  batch.box(frame, 0.06, hoehe, 0.08, { y: hoch + hoehe / 2, z: 0.04, tile: 1 });
  batch.box(frame, breite + 0.3, 0.06, 0.22, { y: hoch - 0.08, z: 0.1, tile: 1 });
  if (zugenagelt) {
    batch.quad(boards, breite + 0.1, hoehe * 0.8, { y: hoch + hoehe / 2, z: 0.1, repeatX: 1.5, repeatY: 1 });
  }

  return finish(batch, 'Fenster');
}

export function createCeilingLamp({ licht = false, intensitaet = 16, distanz = 10, farbe = '#ffd9a0', laenge = 1.2, hoehe = 3 }) {
  const batch = createBatch();
  const housing = getMaterial('steel', { color: 0xb8b8a8 });
  const glow = getColorMaterial(0xfff0cc, { unlit: true });

  batch.box(housing, laenge + 0.08, 0.05, 0.22, { y: hoehe - 0.05, tile: 1 });
  batch.box(glow, laenge, 0.03, 0.16, { y: hoehe - 0.085, tile: 1 });

  const group = finish(batch, 'Lampe');

  if (licht) {
    const light = new THREE.PointLight(farbe, intensitaet, distanz, 1.6);
    light.position.y = hoehe - 0.5;
    group.add(light);
  }

  return group;
}

export function createBed({ farbe = '#6a6a52' }) {
  const batch = createBatch();
  const steel = getMaterial('rust_metal', { color: 0x70685c });
  const mattress = getMaterial('cloth', { color: farbe });
  const pillow = getMaterial('cloth', { color: 0xc8c0a8 });
  const blanket = getMaterial('tarp', { color: 0x7a7a60 });

  for (const x of [-0.45, 0.45]) {
    for (const z of [-0.95, 0.95]) batch.box(steel, 0.06, 0.4, 0.06, { x, y: 0.2, z, tile: 1 });
  }
  batch.box(steel, 1.0, 0.06, 2.0, { y: 0.4, tile: 1 });
  batch.box(mattress, 0.9, 0.14, 1.9, { y: 0.5, tile: 1 });
  batch.box(pillow, 0.5, 0.1, 0.34, { y: 0.62, z: -0.7, tile: 1 });
  batch.box(blanket, 0.88, 0.07, 1.1, { y: 0.6, z: 0.35, tile: 1 });
  batch.box(steel, 1.0, 0.7, 0.05, { y: 0.65, z: -1.0, tile: 1 });

  return finish(batch, 'Bett');
}

export function createTable({ breite = 1.4, tiefe = 0.9 }) {
  const batch = createBatch();
  const wood = getMaterial('wood', { color: 0x8a7458 });
  const cloth = getMaterial('cloth', { color: 0x8a7a5a });
  const can = getColorMaterial(0x8a3a2a);

  batch.box(wood, breite, 0.06, tiefe, { y: 0.75, tile: 1 });
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) batch.box(wood, 0.07, 0.72, 0.07, { x: x * (breite / 2 - 0.08), y: 0.36, z: z * (tiefe / 2 - 0.08), tile: 1 });
  }
  batch.box(cloth, 0.5, 0.01, 0.35, { y: 0.785, x: 0.2, tile: 1 });
  batch.cylinder(can, 0.05, 0.05, 0.11, 8, { x: -0.35, y: 0.84, z: 0.1 });

  return finish(batch, 'Tisch');
}

export function createChair({ farbe = '#7a6448' }) {
  const batch = createBatch();
  const wood = getMaterial('wood', { color: farbe });

  batch.box(wood, 0.4, 0.05, 0.4, { y: 0.45, tile: 1 });
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) batch.box(wood, 0.04, 0.44, 0.04, { x: x * 0.17, y: 0.22, z: z * 0.17, tile: 1 });
  }
  batch.box(wood, 0.4, 0.4, 0.04, { y: 0.7, z: -0.18, rx: -0.08, tile: 1 });

  return finish(batch, 'Stuhl');
}

export function createShelf({ breite = 1.6, ebenen = 4 }) {
  const random = createRandom(Math.round(breite * 100));
  const batch = createBatch();
  const frame = getMaterial('rust_metal', { color: 0x6a6a60 });
  const board = getMaterial('wood', { color: 0x7a6a52 });
  const colors = [0x8a3a2a, 0x5a6a3a, 0x7a6a4a, 0x4a5a6a, 0xa08a4a];
  const height = 1.9;

  for (const x of [-1, 1]) batch.box(frame, 0.05, height, 0.34, { x: x * (breite / 2 - 0.03), y: height / 2, tile: 1 });
  for (let i = 0; i < ebenen; i += 1) {
    const y = 0.2 + (i * (height - 0.3)) / (ebenen - 1);
    batch.box(board, breite - 0.06, 0.04, 0.36, { y, tile: 1 });
    if (i < ebenen - 1) {
      let x = -breite / 2 + 0.2;
      while (x < breite / 2 - 0.2) {
        const w = random.range(0.08, 0.2);
        const h = random.range(0.1, 0.28);
        batch.box(getColorMaterial(random.pick(colors)), w, h, 0.18, { x, y: y + 0.02 + h / 2, z: random.range(-0.05, 0.05), tile: 1 });
        x += w + random.range(0.04, 0.22);
      }
    }
  }

  return finish(batch, 'Regal');
}

export function createSofa({ breite = 2.0, farbe = '#5c4a38' }) {
  const batch = createBatch();
  const fabric = getMaterial('cloth', { color: farbe });
  const dark = getMaterial('cloth', { color: 0x3a3028 });
  const wood = getMaterial('wood', { color: 0x4a3a2a });

  batch.box(fabric, breite, 0.32, 0.85, { y: 0.34, tile: 1 });
  batch.box(fabric, breite, 0.55, 0.2, { y: 0.72, z: -0.33, tile: 1 });
  for (const x of [-1, 1]) batch.box(fabric, 0.2, 0.28, 0.85, { x: x * (breite / 2 - 0.1), y: 0.62, tile: 1 });
  batch.box(dark, breite - 0.5, 0.1, 0.55, { y: 0.55, z: 0.1, tile: 1 });
  for (const x of [-1, 1]) for (const z of [-1, 1]) batch.box(wood, 0.06, 0.1, 0.06, { x: x * (breite / 2 - 0.1), y: 0.05, z: z * 0.35, tile: 1 });

  return finish(batch, 'Sofa');
}

export function createStove() {
  const batch = createBatch();
  const enamel = getMaterial('plastic', { color: 0xd8d4c4 });
  const black = getColorMaterial(0x1c1a18);
  const steel = getMaterial('steel');

  batch.box(enamel, 0.7, 0.88, 0.62, { y: 0.44, tile: 1 });
  batch.box(black, 0.62, 0.02, 0.54, { y: 0.89, tile: 1 });
  for (const x of [-0.16, 0.16]) for (const z of [-0.14, 0.14]) batch.cylinder(black, 0.09, 0.09, 0.03, 10, { x, y: 0.91, z });
  batch.box(black, 0.5, 0.35, 0.02, { y: 0.4, z: 0.315, tile: 1 });
  for (const x of [-0.24, -0.08, 0.08, 0.24]) batch.cylinder(steel, 0.025, 0.025, 0.04, 8, { x, y: 0.82, z: 0.32, rx: Math.PI / 2 });
  batch.box(steel, 0.12, 1.1, 0.12, { y: 1.45, z: -0.25, tile: 1 });

  return finish(batch, 'Herd');
}

export function createFridge() {
  const batch = createBatch();
  const body = getMaterial('plastic', { color: 0xcfcab4 });
  const steel = getMaterial('steel');

  batch.box(body, 0.66, 1.65, 0.66, { y: 0.825, tile: 1 });
  batch.box(getColorMaterial(0x1a1a18), 0.64, 0.015, 0.02, { y: 1.1, z: 0.335, tile: 1 });
  batch.box(steel, 0.03, 0.4, 0.04, { x: 0.25, y: 1.35, z: 0.35, tile: 1 });
  batch.box(steel, 0.03, 0.3, 0.04, { x: 0.25, y: 0.8, z: 0.35, tile: 1 });

  return finish(batch, 'Kuehlschrank');
}

export function createTelevision() {
  const batch = createBatch();
  const wood = getMaterial('wood', { color: 0x5a4a38 });
  const casing = getMaterial('plastic', { color: 0x8a8678 });
  const glass = getColorMaterial(0x2a3430);
  const screenGlow = getColorMaterial(0x4a5a58, { unlit: true });
  const black = getColorMaterial(0x1c1a18);

  batch.box(wood, 1.1, 0.5, 0.5, { y: 0.25, tile: 1 });
  batch.box(casing, 0.72, 0.6, 0.55, { y: 0.8, tile: 1 });
  batch.box(glass, 0.56, 0.44, 0.02, { y: 0.82, z: 0.28, tile: 1 });
  batch.box(screenGlow, 0.5, 0.38, 0.01, { y: 0.82, z: 0.292, tile: 1 });
  batch.box(black, 0.04, 0.04, 0.02, { x: 0.27, y: 0.58, z: 0.28, tile: 1 });
  batch.cylinder(black, 0.01, 0.01, 0.6, 5, { x: -0.1, y: 1.4, z: 0, rz: 0.5 });
  batch.cylinder(black, 0.01, 0.01, 0.6, 5, { x: 0.1, y: 1.4, z: 0, rz: -0.5 });

  return finish(batch, 'Fernseher');
}

export function createWorkbench({ breite = 2.4 }) {
  const batch = createBatch();
  const wood = getMaterial('boards', { color: 0x9a8668 });
  const steel = getMaterial('rust_metal', { color: 0x6a6a60 });
  const tool = getColorMaterial(0x8a3a2a);
  const grey = getColorMaterial(0x4a4a46);

  batch.box(wood, breite, 0.08, 0.75, { y: 0.9, tile: 1 });
  for (const x of [-1, 1]) for (const z of [-1, 1]) batch.box(steel, 0.07, 0.88, 0.07, { x: x * (breite / 2 - 0.06), y: 0.44, z: z * 0.3, tile: 1 });
  batch.box(steel, breite - 0.2, 0.05, 0.6, { y: 0.3, tile: 1 });
  batch.box(grey, 0.2, 0.2, 0.2, { x: -breite / 2 + 0.3, y: 1.04, z: 0.1, tile: 1 });
  batch.box(tool, 0.35, 0.06, 0.12, { x: 0.2, y: 0.97, z: -0.1, ry: 0.3, tile: 1 });
  batch.box(grey, 0.5, 0.04, 0.1, { x: 0.6, y: 0.96, z: 0.15, ry: -0.2, tile: 1 });
  batch.box(steel, breite, 0.7, 0.04, { y: 1.35, z: -0.36, tile: 1 });
  batch.box(grey, 0.03, 0.25, 0.04, { x: -0.4, y: 1.4, z: -0.32, tile: 1 });
  batch.box(grey, 0.03, 0.3, 0.04, { x: 0.1, y: 1.4, z: -0.32, tile: 1 });

  return finish(batch, 'Werkbank');
}

export function createMailboxes({ anzahl = 8 }) {
  const batch = createBatch();
  const metal = getMaterial('steel', { color: 0x9a9a88 });
  const dark = getColorMaterial(0x24241f);
  const columns = Math.ceil(anzahl / 2);
  const width = columns * 0.3;

  batch.box(metal, width + 0.06, 0.72, 0.1, { y: 1.3, tile: 1 });
  for (let i = 0; i < anzahl; i += 1) {
    const x = -width / 2 + 0.15 + (i % columns) * 0.3;
    const y = 1.46 - Math.floor(i / columns) * 0.32;
    batch.box(getMaterial('steel', { color: i % 3 === 0 ? 0xa89a6a : 0xb4b4a0 }), 0.26, 0.28, 0.03, { x, y, z: 0.06, tile: 1 });
    batch.box(dark, 0.14, 0.015, 0.01, { x, y: y + 0.07, z: 0.08, tile: 1 });
  }

  return finish(batch, 'Briefkaesten');
}

export function createStairs({ stufen = 9 }) {
  const batch = createBatch();
  const concrete = getMaterial('concrete_panel', { color: 0x9a968c });
  const rail = getMaterial('rust_metal', { color: 0x5a564a });
  const step = 0.19;
  const run = 0.42;

  for (let i = 0; i < stufen; i += 1) {
    batch.box(concrete, 2.4, step * (i + 1), run, { y: (step * (i + 1)) / 2, z: -(i + 0.5) * run, tile: 1 });
  }
  const length = stufen * run;
  for (const x of [-1.25, 1.25]) {
    batch.box(rail, 0.05, 0.06, length, { x, y: 0.95 + (stufen * step) / 2, z: -length / 2, rx: Math.atan2(stufen * step, length), tile: 1 });
    for (let i = 0; i < stufen; i += 3) batch.box(rail, 0.04, 0.9, 0.04, { x, y: step * (i + 1) + 0.45, z: -(i + 0.5) * run, tile: 1 });
  }

  return finish(batch, 'Treppe');
}

export function createRubble({ seed = 1 }) {
  const random = createRandom(seed);
  const batch = createBatch();
  const concrete = getMaterial('concrete_panel', { color: 0x8a867c });
  const rebar = getMaterial('rust_metal', { color: 0x7a4a30 });

  for (let i = 0; i < 14; i += 1) {
    const size = random.range(0.25, 0.8);
    batch.box(concrete, size, size * random.range(0.5, 1), size * random.range(0.6, 1.2), {
      x: random.range(-1.1, 1.1),
      y: size * 0.3 + random.range(0, 0.6),
      z: random.range(-0.5, 0.5),
      ry: random.range(0, 3),
      rx: random.range(-0.3, 0.3),
      tile: 1,
    });
  }
  for (let i = 0; i < 4; i += 1) {
    batch.cylinder(rebar, 0.015, 0.015, random.range(0.8, 1.4), 5, {
      x: random.range(-0.9, 0.9),
      y: random.range(0.9, 1.3),
      z: random.range(-0.3, 0.3),
      rz: random.range(-0.6, 0.6),
      rx: random.range(-0.4, 0.4),
    });
  }

  return finish(batch, 'Schutt');
}

export function createBarrier({ breite = 3.2 }) {
  const batch = createBatch();
  const post = getMaterial('rust_metal', { color: 0x6a6a60 });
  const yellow = getColorMaterial(0xd8b030);
  const black = getColorMaterial(0x1c1a18);

  for (const x of [-1, 1]) batch.box(post, 0.06, 1.1, 0.06, { x: x * breite / 2, y: 0.55, tile: 1 });
  const stripes = Math.round(breite / 0.25);
  for (let i = 0; i < stripes; i += 1) {
    batch.box(i % 2 === 0 ? yellow : black, breite / stripes, 0.12, 0.015, { x: -breite / 2 + (i + 0.5) * (breite / stripes), y: 0.95, tile: 1 });
  }

  return finish(batch, 'Absperrung');
}

export function createManhole() {
  const batch = createBatch();
  const rim = getMaterial('rust_metal', { color: 0x4a443a, ...OVERLAY_TOP });
  const lid = getMaterial('rust_metal', { color: 0x9a7a52, ...OVERLAY_TOP });
  const bar = getMaterial('steel', { color: 0xb4a58a, ...OVERLAY_TOP });
  const dark = getColorMaterial(0x0e0d0b, OVERLAY_TOP);

  batch.cylinder(rim, 0.72, 0.72, 0.06, 16, { y: 0.03, repeatX: 2, repeatY: 0.5 });
  batch.cylinder(dark, 0.64, 0.64, 0.07, 16, { y: 0.035 });
  batch.cylinder(lid, 0.58, 0.58, 0.08, 16, { y: 0.04, repeatX: 2, repeatY: 0.5 });
  for (let i = -2; i <= 2; i += 1) {
    batch.box(bar, 1.0, 0.03, 0.05, { y: 0.085, z: i * 0.18, tile: 1 });
    batch.box(bar, 0.05, 0.03, 1.0, { y: 0.087, x: i * 0.18, tile: 1 });
  }
  for (const x of [-0.2, 0.2]) batch.box(dark, 0.14, 0.03, 0.04, { y: 0.09, x, tile: 1 });

  return finish(batch, 'Kanaldeckel');
}

export function createPipe({ footprint, hoehe = 2, seed = 1 }) {
  const batch = createBatch();
  const random = createRandom(seed);
  const metal = getMaterial('rust_metal', { color: random.pick([0x6a5a48, 0x58564c, 0x6a4a3a]) });
  const steel = getMaterial('steel', { color: 0x4a483e });
  const alongX = footprint.width >= footprint.depth;
  const length = Math.max(footprint.width, footprint.depth);
  const rotation = alongX ? { rz: Math.PI / 2 } : { rx: Math.PI / 2 };

  batch.cylinder(metal, 0.14, 0.14, length, 10, { y: hoehe, repeatX: 2, repeatY: length / 2, ...rotation });
  for (let offset = -length / 2 + 1; offset <= length / 2 - 0.5; offset += 2.5) {
    batch.cylinder(steel, 0.18, 0.18, 0.07, 10, { y: hoehe, [alongX ? 'x' : 'z']: offset, ...rotation });
  }
  if (random.next() < 0.4) {
    const at = random.range(-length / 3, length / 3);
    batch.cylinder(steel, 0.04, 0.04, 0.22, 6, { y: hoehe + 0.2, [alongX ? 'x' : 'z']: at });
    batch.cylinder(steel, 0.12, 0.12, 0.025, 10, { y: hoehe + 0.32, [alongX ? 'x' : 'z']: at });
  }

  return finish(batch, 'Rohr');
}

export function createLadder({ hoehe = 3, licht = false }) {
  const batch = createBatch();
  const metal = getMaterial('rust_metal', { color: 0x6a5a48 });
  const glow = getColorMaterial(0xdfe8e0, { unlit: true });
  const concrete = getMaterial('concrete_panel', { color: 0x6a665c });
  const pool = getColorMaterial(0xdfe8d0, { unlit: true, transparent: true, opacity: 0.28, depthWrite: false, ...OVERLAY_TOP });
  const marker = getColorMaterial(0xd8b030, { unlit: true, ...OVERLAY_TOP });
  const wallZ = 0.52;

  for (const x of [-0.22, 0.22]) batch.box(metal, 0.05, hoehe, 0.05, { x, y: hoehe / 2, z: wallZ - 0.1, tile: 1 });
  for (let y = 0.3; y < hoehe; y += 0.3) batch.box(metal, 0.44, 0.03, 0.03, { y, z: wallZ - 0.1, tile: 1 });
  for (const y of [0.6, 1.8]) for (const x of [-0.22, 0.22]) batch.box(metal, 0.04, 0.04, 0.1, { x, y, z: wallZ - 0.05, tile: 1 });
  batch.box(concrete, 1.3, 0.12, 1.3, { y: hoehe - 0.06, z: wallZ - 0.5, tile: 1 });
  batch.quad(glow, 0.9, 0.9, { y: hoehe - 0.125, z: wallZ - 0.5, rx: Math.PI / 2 });
  batch.quad(pool, 1.8, 1.8, { y: 0.05, z: wallZ - 0.9, rx: -Math.PI / 2 });
  batch.box(marker, 1.1, 0.05, 0.08, { y: 0.05, z: wallZ - 1.9, tile: 1 });

  const group = finish(batch, 'Leiter');

  if (licht) {
    const light = new THREE.PointLight(0xcfe0e8, 14, 12, 1.6);
    light.position.set(0, hoehe - 0.6, wallZ - 0.5);
    group.add(light);
  }

  return group;
}

export const INTERIOR_BUILDERS = {
  wand: createWall,
  decke: createCeiling,
  tuer: createDoor,
  fenster: createWindow,
  deckenlampe: createCeilingLamp,
  bett: createBed,
  tisch: createTable,
  stuhl: createChair,
  regal: createShelf,
  sofa: createSofa,
  herd: createStove,
  kuehlschrank: createFridge,
  fernseher: createTelevision,
  werkbank: createWorkbench,
  briefkaesten: createMailboxes,
  treppe: createStairs,
  schutt: createRubble,
  absperrung: createBarrier,
  kanaldeckel: createManhole,
  rohr: createPipe,
  leiter: createLadder,
};
