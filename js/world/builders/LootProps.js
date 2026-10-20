import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { getMaterial, getColorMaterial } from '../Textures.js';

const PROXY_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });

function addProxy(group, width, height, depth) {
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), PROXY_MATERIAL);
  proxy.position.y = height / 2;
  group.add(proxy);
}

export function createChest({ open = false } = {}) {
  const batch = createBatch();
  const body = getMaterial('rust_metal', { color: 0x7d8a5c });
  const lidMetal = getMaterial('rust_metal', { color: 0x748254 });
  const steel = getMaterial('steel');
  const dark = getColorMaterial(0x1f2118);
  const gold = getColorMaterial(0xe3b23c, { unlit: true });
  const paper = getColorMaterial(0xcdbf98);

  const width = 0.95;
  const depth = 0.58;
  const height = 0.46;
  const lidHeight = 0.14;
  const hingeZ = -depth / 2;

  batch.box(body, width, height, depth, { y: height / 2, tile: 1 });
  batch.box(steel, 0.07, height + 0.02, depth + 0.02, { x: -width / 2 + 0.12, y: height / 2, tile: 1 });
  batch.box(steel, 0.07, height + 0.02, depth + 0.02, { x: width / 2 - 0.12, y: height / 2, tile: 1 });
  batch.box(steel, 0.12, 0.05, 0.05, { x: -width / 2 - 0.02, y: height * 0.62, z: 0, tile: 1 });
  batch.box(steel, 0.12, 0.05, 0.05, { x: width / 2 + 0.02, y: height * 0.62, z: 0, tile: 1 });

  if (open) {
    batch.box(dark, width - 0.1, 0.02, depth - 0.1, { y: height + 0.005, tile: 1 });
    for (let i = 0; i < 7; i += 1) {
      batch.cylinder(gold, 0.07, 0.07, 0.015, 8, {
        x: -0.26 + (i % 4) * 0.17 + (i > 3 ? 0.08 : 0),
        y: height + 0.02 + (i > 3 ? 0.015 : 0),
        z: i > 3 ? 0.05 : -0.06,
        rz: 0.08 * (i % 3),
      });
    }
    batch.box(paper, 0.2, 0.012, 0.15, { x: 0.28, y: height + 0.02, z: 0.14, ry: 0.4, tile: 1 });

    const angle = 1.85;
    const offsetZ = depth / 2;
    const lidY = height + (lidHeight / 2) * Math.cos(angle) + offsetZ * Math.sin(angle);
    const lidZ = hingeZ + offsetZ * Math.cos(angle) - (lidHeight / 2) * Math.sin(angle);
    batch.box(lidMetal, width + 0.02, lidHeight, depth + 0.02, { y: lidY, z: lidZ, rx: -angle, tile: 1 });
  } else {
    batch.box(lidMetal, width + 0.02, lidHeight, depth + 0.02, { y: height + lidHeight / 2, tile: 1 });
    batch.box(steel, 0.07, lidHeight + 0.02, depth + 0.04, { x: -width / 2 + 0.12, y: height + lidHeight / 2, tile: 1 });
    batch.box(steel, 0.07, lidHeight + 0.02, depth + 0.04, { x: width / 2 - 0.12, y: height + lidHeight / 2, tile: 1 });
    batch.box(steel, 0.16, 0.12, 0.05, { y: height - 0.02, z: depth / 2 + 0.03, tile: 1 });
    batch.box(dark, 0.07, 0.07, 0.03, { y: height - 0.02, z: depth / 2 + 0.065, tile: 1 });
  }

  const group = batch.build('Lootkiste');
  addProxy(group, width + 0.15, open ? 0.9 : 0.7, depth + 0.15);
  return group;
}

export function createCoinPouch() {
  const batch = createBatch();
  const cloth = getMaterial('cloth', { color: 0x9b7a4a });
  const clothDark = getMaterial('cloth', { color: 0x6e5532 });
  const rope = getColorMaterial(0x2b2118);
  const gold = getColorMaterial(0xe3b23c, { unlit: true });

  batch.blob(cloth, 0.24, 1, { y: 0.2, sy: 0.9 });
  batch.cylinder(cloth, 0.07, 0.16, 0.16, 8, { y: 0.4 });
  batch.cylinder(rope, 0.085, 0.085, 0.035, 8, { y: 0.47 });
  batch.cylinder(clothDark, 0.13, 0.07, 0.12, 8, { y: 0.55 });
  batch.box(rope, 0.1, 0.012, 0.012, { x: 0.12, y: 0.46, ry: 0.4, tile: 1 });

  const spill = [
    [0.26, 0.012, 0.12, 0.2],
    [0.34, 0.012, -0.04, 0.5],
    [0.2, 0.012, 0.28, 1.1],
  ];
  for (const [x, y, z, tilt] of spill) {
    batch.cylinder(gold, 0.05, 0.05, 0.014, 8, { x, y, z, rx: tilt * 0.2 });
  }
  batch.cylinder(gold, 0.05, 0.05, 0.014, 8, { x: 0.3, y: 0.027, z: 0.1 });

  const group = batch.build('Muenzbeutel');
  addProxy(group, 0.9, 0.8, 0.9);
  return group;
}
