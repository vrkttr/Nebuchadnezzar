import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { getMaterial, getColorMaterial } from '../Textures.js';
import { t } from '../../i18n/I18n.js';

const WALL = 0.4;
const DOOR_WIDTH = 2.4;
const DOOR_HEIGHT = 2.7;
const signMaterials = new Map();

const THEMES = {
  barbier: { wall: '#b9a98a', trim: 0x4a3a2c, board: '#2f4a52', ink: '#f0e6c8' },
  waffen: { wall: '#9a9588', trim: 0x3a3a38, board: '#4a2a22', ink: '#e8d9b0' },
  ruestung: { wall: '#8d9096', trim: 0x34383c, board: '#2a3340', ink: '#e0e4e8' },
  apotheke: { wall: '#c4c0aa', trim: 0x3e4a38, board: '#2f5a3a', ink: '#f0f0dc' },
  allgemein: { wall: '#b3a487', trim: 0x4d3b2a, board: '#5a4426', ink: '#f2e4bd' },
  gilde: { wall: '#a39e90', trim: 0x2e2e32, board: '#3a2a4a', ink: '#ecdcb0' },
  markt: { wall: '#b5a78c', trim: 0x4d3b2a, board: '#6a5430', ink: '#f2e4bd' },
  taverne: { wall: '#a8957a', trim: 0x3d2d20, board: '#5a2a22', ink: '#f2dcb0' },
};

function signMaterial(text, theme) {
  const key = `${text}|${theme.board}|${theme.ink}`;
  if (signMaterials.has(key)) return signMaterials.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = theme.board;
  context.fillRect(0, 0, 512, 128);
  context.strokeStyle = theme.ink;
  context.lineWidth = 5;
  context.strokeRect(8, 8, 496, 112);
  context.fillStyle = theme.ink;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  let size = 64;
  context.font = `bold ${size}px Georgia, serif`;
  while (context.measureText(text).width > 460 && size > 20) {
    size -= 4;
    context.font = `bold ${size}px Georgia, serif`;
  }
  context.fillText(text, 256, 68);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshLambertMaterial({ map: texture });
  signMaterials.set(key, material);
  return material;
}

function buildExterior(batch, kind, width, depth, height, theme) {
  const wood = getMaterial('wood');
  const steel = getMaterial('steel');
  const rust = getMaterial('rust_metal');
  const plaster = getMaterial('concrete_panel', { color: theme.wall });
  const trim = getColorMaterial(theme.trim);
  const frontZ = depth / 2;
  const bracketX = width / 2 - 0.1;

  batch.box(trim, 0.16, 0.16, 1.4, { x: bracketX, y: height - 0.9, z: frontZ + 0.7, tile: 1 });
  batch.box(trim, 0.08, 1.2, 0.08, { x: bracketX, y: height - 1.6, z: frontZ + 1.4, tile: 1 });

  const flagX = bracketX;
  const flagZ = frontZ + 1.4;
  const flagY = height - 1.9;

  if (kind === 'barbier') {
    const red = getColorMaterial(0xa83a32);
    const white = getColorMaterial(0xe0d8c4);
    for (let i = 0; i < 6; i += 1) {
      batch.cylinder(i % 2 === 0 ? red : white, 0.14, 0.14, 0.2, 8, { x: flagX, y: flagY - 0.5 + i * 0.2, z: flagZ + 0.2 });
    }
    batch.cylinder(steel, 0.16, 0.16, 0.06, 8, { x: flagX, y: flagY - 0.55, z: flagZ + 0.2 });
    batch.cylinder(steel, 0.16, 0.16, 0.06, 8, { x: flagX, y: flagY + 0.67, z: flagZ + 0.2 });
    batch.box(trim, 0.06, 0.06, 0.4, { x: flagX, y: flagY + 0.8, z: flagZ + 0.1, tile: 1 });
  } else if (kind === 'waffen') {
    batch.box(steel, 0.08, 1.1, 0.04, { x: flagX, y: flagY, z: flagZ + 0.2, rz: 0.7, tile: 1 });
    batch.box(steel, 0.08, 1.1, 0.04, { x: flagX, y: flagY, z: flagZ + 0.2, rz: -0.7, tile: 1 });
    batch.box(rust, 0.4, 0.07, 0.06, { x: flagX - 0.28, y: flagY + 0.3, z: flagZ + 0.2, rz: 0.7, tile: 1 });
    batch.box(rust, 0.4, 0.07, 0.06, { x: flagX + 0.28, y: flagY + 0.3, z: flagZ + 0.2, rz: -0.7, tile: 1 });
  } else if (kind === 'ruestung') {
    const shield = getColorMaterial(0x6a7076);
    batch.box(shield, 0.8, 0.9, 0.06, { x: flagX, y: flagY, z: flagZ + 0.2, tile: 1 });
    batch.cone(shield, 0.4, 0.5, 4, { x: flagX, y: flagY - 0.65, z: flagZ + 0.2, rx: Math.PI, ry: Math.PI / 4, sx: 1, sz: 0.15 });
    batch.box(getColorMaterial(0x9a3a2e), 0.14, 0.9, 0.08, { x: flagX, y: flagY, z: flagZ + 0.22, tile: 1 });
    batch.box(getColorMaterial(0x9a3a2e), 0.7, 0.14, 0.08, { x: flagX, y: flagY + 0.1, z: flagZ + 0.22, tile: 1 });
  } else if (kind === 'apotheke') {
    const green = getColorMaterial(0x3f8a4a, { unlit: true });
    batch.box(green, 0.24, 0.8, 0.08, { x: flagX, y: flagY, z: flagZ + 0.2, tile: 1 });
    batch.box(green, 0.8, 0.24, 0.08, { x: flagX, y: flagY, z: flagZ + 0.2, tile: 1 });
  } else if (kind === 'gilde') {
    const banner = getColorMaterial(0x7a3a4a, { side: THREE.DoubleSide });
    batch.box(banner, 0.8, 1.5, 0.04, { x: flagX, y: flagY - 0.2, z: flagZ + 0.2, tile: 1 });
    batch.box(getColorMaterial(0xc8a850), 0.3, 0.3, 0.06, { x: flagX, y: flagY, z: flagZ + 0.24, ry: 0, rz: Math.PI / 4, tile: 1 });
  } else if (kind === 'taverne') {
    const glass = getColorMaterial(0xc8a050);
    batch.cylinder(glass, 0.2, 0.17, 0.4, 8, { x: flagX, y: flagY - 0.1, z: flagZ + 0.25 });
    batch.box(trim, 0.06, 0.06, 0.4, { x: flagX, y: flagY + 0.28, z: flagZ + 0.1, tile: 1 });
    batch.box(getColorMaterial(0xe8e0c8), 0.34, 0.1, 0.34, { x: flagX, y: flagY + 0.12, z: flagZ + 0.25, tile: 1 });
  } else {
    batch.box(wood, 0.9, 0.7, 0.08, { x: flagX, y: flagY, z: flagZ + 0.2, tile: 1 });
    batch.cylinder(rust, 0.2, 0.2, 0.1, 8, { x: flagX, y: flagY, z: flagZ + 0.27, rx: Math.PI / 2 });
  }

  batch.box(plaster, 0.5, height, 0.5, { x: -width / 2, y: height / 2, z: frontZ, tile: 2 });
  batch.box(plaster, 0.5, height, 0.5, { x: width / 2, y: height / 2, z: frontZ, tile: 2 });
}

function buildInterior(batch, kind, width, depth) {
  const wood = getMaterial('wood');
  const boards = getMaterial('boards');
  const steel = getMaterial('steel');
  const rust = getMaterial('rust_metal');
  const plastic = getMaterial('plastic');
  const cloth = getMaterial('cloth');
  const inner = width / 2 - WALL - 0.1;
  const back = -depth / 2 + WALL + 0.1;
  const counterZ = back + depth * 0.4;

  if (kind !== 'barbier') {
    batch.box(wood, width - 4.4, 1.0, 0.8, { x: 0, y: 0.5, z: counterZ, tile: 1 });
    batch.box(boards, width - 4.2, 0.07, 1.0, { x: 0, y: 1.03, z: counterZ, tile: 1 });
  }

  const shelves = (x, z, side) => {
    for (let i = 0; i < 3; i += 1) {
      batch.box(wood, 0.35, 0.05, depth * 0.5, { x: side * inner, y: 0.8 + i * 0.7, z, tile: 1 });
    }
    batch.box(wood, 0.06, 2.4, depth * 0.5, { x: side * (inner + 0.18), y: 1.2, z, tile: 1 });
  };

  if (kind === 'barbier') {
    const mirror = getColorMaterial(0x9eb2b8, { unlit: true });
    for (const x of [-width * 0.22, width * 0.22]) {
      batch.box(plastic, 0.9, 0.2, 0.9, { x, y: 0.1, z: back + 3.2, tile: 1 });
      batch.cylinder(steel, 0.1, 0.1, 0.5, 8, { x, y: 0.45, z: back + 3.2 });
      batch.box(getColorMaterial(0x7a3a32), 0.8, 0.2, 0.8, { x, y: 0.8, z: back + 3.2, tile: 1 });
      batch.box(getColorMaterial(0x7a3a32), 0.8, 0.9, 0.16, { x, y: 1.3, z: back + 3.62, rx: -0.15, tile: 1 });
      batch.box(wood, 1.3, 1.4, 0.06, { x, y: 1.6, z: back + 0.1, tile: 1 });
      batch.box(mirror, 1.1, 1.2, 0.04, { x, y: 1.6, z: back + 0.15, tile: 1 });
    }
    batch.box(getMaterial('boards'), 1.4, 0.8, 0.5, { x: -inner + 0.5, y: 0.4, z: back + 1.2, tile: 1 });
  } else if (kind === 'waffen') {
    for (let i = 0; i < 5; i += 1) {
      const x = -width * 0.3 + i * (width * 0.15);
      batch.box(steel, 0.07, 1.3, 0.04, { x, y: 1.7, z: back + 0.05, rz: i % 2 === 0 ? 0.08 : -0.08, tile: 1 });
      batch.box(rust, 0.3, 0.06, 0.05, { x, y: 1.25, z: back + 0.05, tile: 1 });
    }
    batch.box(wood, 0.5, 0.6, 1.8, { x: inner - 0.4, y: 0.3, z: back + 3, tile: 1 });
    batch.box(steel, 0.12, 0.9, 0.12, { x: -inner + 0.5, y: 0.45, z: back + 2, tile: 1 });
    batch.box(rust, 0.7, 0.1, 0.7, { x: -inner + 0.5, y: 0.05, z: back + 2, tile: 1 });
    shelves(0, back + depth * 0.25, -1);
  } else if (kind === 'ruestung') {
    for (let i = 0; i < 3; i += 1) {
      const x = -width * 0.25 + i * (width * 0.25);
      batch.cylinder(steel, 0.06, 0.06, 1.6, 6, { x, y: 0.8, z: back + 2.4 });
      batch.box(getMaterial('steel', { color: 0xb0b4ba }), 0.6, 0.7, 0.3, { x, y: 1.35, z: back + 2.4, tile: 1 });
      batch.blob(steel, 0.17, 1, { x, y: 1.9, z: back + 2.4 });
    }
    shelves(0, back + depth * 0.25, 1);
    shelves(0, back + depth * 0.25, -1);
  } else if (kind === 'apotheke') {
    for (let i = 0; i < 4; i += 1) {
      for (const side of [-1, 1]) {
        batch.cylinder(getColorMaterial(i % 2 ? 0x4a8a5a : 0xa0703a), 0.1, 0.1, 0.3, 6, { x: side * inner + (side > 0 ? -0.1 : 0.1), y: 1.05 + (i % 3) * 0.7, z: back + 1 + i * 0.9 });
      }
    }
    shelves(0, back + depth * 0.25, 1);
    shelves(0, back + depth * 0.25, -1);
    batch.box(wood, 1.4, 0.8, 0.7, { x: width * 0.3, y: 0.4, z: back + depth - 2.4, tile: 1 });
  } else if (kind === 'gilde') {
    batch.box(wood, 3, 0.9, 1.3, { x: 0, y: 0.45, z: back + 3, tile: 1 });
    for (const x of [-2.5, 2.5]) {
      batch.box(wood, 1.2, 1.2, 1.2, { x, y: 0.6, z: back + 3.4, tile: 1 });
      batch.box(cloth, 1.0, 0.1, 1.0, { x, y: 1.25, z: back + 3.4, tile: 1 });
    }
    batch.box(getColorMaterial(0x7a3a4a, { side: THREE.DoubleSide }), 3, 2.2, 0.04, { x: 0, y: 2, z: back + 0.1, tile: 1 });
  } else if (kind === 'taverne') {
    shelves(0, back + depth * 0.25, -1);
    for (const [x, z] of [[-width * 0.28, back + depth * 0.62], [width * 0.28, back + depth * 0.62], [-width * 0.28, back + depth * 0.84], [width * 0.28, back + depth * 0.84]]) {
      batch.cylinder(wood, 0.55, 0.55, 0.08, 10, { x, y: 0.78, z });
      batch.cylinder(steel, 0.07, 0.07, 0.75, 6, { x, y: 0.38, z });
      for (const [sx, sz] of [[-0.85, 0], [0.85, 0], [0, -0.85], [0, 0.85]]) {
        batch.cylinder(boards, 0.22, 0.22, 0.45, 8, { x: x + sx, y: 0.22, z: z + sz });
      }
    }
    batch.box(wood, 0.9, 1.1, 0.9, { x: inner - 0.6, y: 0.55, z: back + 1.0, tile: 1 });
    batch.cylinder(rust, 0.45, 0.45, 0.9, 10, { x: inner - 0.6, y: 1.55, z: back + 1.0 });
    batch.box(getColorMaterial(0xa04a32), 1.6, 0.9, 0.12, { x: -width * 0.28, y: 1.7, z: back + 0.12, tile: 1 });
  } else {
    shelves(0, back + depth * 0.25, 1);
    shelves(0, back + depth * 0.25, -1);
    for (let i = 0; i < 4; i += 1) {
      batch.box(wood, 0.6, 0.5, 0.6, { x: -width * 0.4 + i * 0.8, y: 0.25, z: back + depth - 2.4, ry: i * 0.2, tile: 1 });
    }
  }

  batch.box(getColorMaterial(0xffe2a0, { unlit: true }), 0.5, 0.1, 0.5, { x: 0, y: 3.15, z: 0, tile: 1 });
  batch.box(getColorMaterial(0xffe2a0, { unlit: true }), 0.5, 0.1, 0.5, { x: 0, y: 3.15, z: -depth * 0.3, tile: 1 });
}

export function createLaden(params = {}) {
  const { typ = 'allgemein', schild = '', hoehe = 3.6, breite = 14, tiefe = 12 } = params;
  const width = breite;
  const depth = tiefe;
  const theme = THEMES[typ] ?? THEMES.allgemein;
  const batch = createBatch();
  const plaster = getMaterial('concrete_panel', { color: theme.wall });
  const trim = getColorMaterial(theme.trim);
  const floor = getMaterial('boards', { color: 0x9a8a72 });
  const roofMaterial = getMaterial('roof', { color: 0x7a746a });
  const glass = getMaterial('window_lit', { unlit: true });
  const sideWidth = (width - DOOR_WIDTH) / 2;

  batch.box(floor, width, 0.12, depth, { y: 0.06, tile: 2 });
  batch.box(plaster, width, hoehe, WALL, { y: hoehe / 2, z: -depth / 2 + WALL / 2, tile: 3 });
  batch.box(plaster, WALL, hoehe, depth, { x: -width / 2 + WALL / 2, y: hoehe / 2, tile: 3 });
  batch.box(plaster, WALL, hoehe, depth, { x: width / 2 - WALL / 2, y: hoehe / 2, tile: 3 });
  batch.box(plaster, sideWidth, hoehe, WALL, { x: -(DOOR_WIDTH / 2 + sideWidth / 2), y: hoehe / 2, z: depth / 2 - WALL / 2, tile: 3 });
  batch.box(plaster, sideWidth, hoehe, WALL, { x: DOOR_WIDTH / 2 + sideWidth / 2, y: hoehe / 2, z: depth / 2 - WALL / 2, tile: 3 });
  batch.box(plaster, DOOR_WIDTH, hoehe - DOOR_HEIGHT, WALL, { y: DOOR_HEIGHT + (hoehe - DOOR_HEIGHT) / 2, z: depth / 2 - WALL / 2, tile: 3 });
  batch.box(trim, DOOR_WIDTH + 0.4, 0.16, WALL + 0.2, { y: DOOR_HEIGHT + 0.02, z: depth / 2 - WALL / 2, tile: 1 });
  batch.box(trim, 0.2, DOOR_HEIGHT, WALL + 0.2, { x: -DOOR_WIDTH / 2 - 0.1, y: DOOR_HEIGHT / 2, z: depth / 2 - WALL / 2, tile: 1 });
  batch.box(trim, 0.2, DOOR_HEIGHT, WALL + 0.2, { x: DOOR_WIDTH / 2 + 0.1, y: DOOR_HEIGHT / 2, z: depth / 2 - WALL / 2, tile: 1 });
  batch.box(getMaterial('slab', { color: 0x8a867c }), DOOR_WIDTH + 1.2, 0.14, 1.4, { y: 0.07, z: depth / 2 + 0.5, tile: 1 });

  const windowCount = Math.max(1, Math.floor((depth - 3) / 4));
  for (let i = 0; i < windowCount; i += 1) {
    const z = -depth / 2 + ((i + 1) * depth) / (windowCount + 1);
    for (const side of [-1, 1]) {
      batch.quad(glass, 1.6, 1.2, { x: side * (width / 2 + 0.01), y: 1.9, z, ry: side * Math.PI / 2 });
      batch.box(trim, 0.1, 1.4, 1.8, { x: side * (width / 2 + 0.02), y: 1.9, z, tile: 1 });
    }
  }
  for (const side of [-1, 1]) {
    const x = side * (DOOR_WIDTH / 2 + sideWidth / 2);
    batch.box(trim, sideWidth * 0.62, 1.4, 0.1, { x, y: 1.8, z: depth / 2 + 0.02, tile: 1 });
    batch.quad(glass, sideWidth * 0.55, 1.25, { x, y: 1.8, z: depth / 2 + 0.09 });
  }

  buildExterior(batch, typ, width, depth, hoehe, theme);
  buildInterior(batch, typ, width, depth);

  const group = new THREE.Group();
  group.name = `Laden_${typ}`;
  group.add(batch.build('Huelle'));

  const text = schild ? t(schild) : '';
  if (text) {
    const board = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(DOOR_WIDTH + 2.4, width - 1), 0.9), signMaterial(text, theme));
    board.position.set(0, DOOR_HEIGHT + 0.7, depth / 2 + 0.2);
    board.name = 'Schild';
    group.add(board);
    const back = board.clone();
    back.material = new THREE.MeshLambertMaterial({ color: theme.trim });
    back.position.z -= 0.04;
    back.rotation.y = Math.PI;
    group.add(back);
  }

  const roof = createBatch();
  roof.box(roofMaterial, width + 0.8, 0.3, depth + 0.8, { y: hoehe + 0.15, tile: 3 });
  roof.box(trim, width + 0.8, 0.5, 0.2, { y: hoehe + 0.55, z: depth / 2 + 0.3, tile: 1 });
  roof.box(trim, width + 0.8, 0.5, 0.2, { y: hoehe + 0.55, z: -depth / 2 - 0.3, tile: 1 });
  roof.box(trim, 0.2, 0.5, depth + 0.8, { x: width / 2 + 0.3, y: hoehe + 0.55, tile: 1 });
  roof.box(trim, 0.2, 0.5, depth + 0.8, { x: -width / 2 - 0.3, y: hoehe + 0.55, tile: 1 });
  const roofGroup = roof.build('Dach');
  group.add(roofGroup);

  return group;
}
