import * as THREE from 'three';
import { createBatch } from '../Batch.js';
import { getMaterial, getColorMaterial } from '../Textures.js';

const PROXY_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });

export function createMailbox() {
  const batch = createBatch();
  const post = getMaterial('wood', { color: 0x6b5a45 });
  const body = getMaterial('rust_metal', { color: 0x7389a6 });
  const steel = getMaterial('steel');
  const dark = getColorMaterial(0x1c1d1a);
  const flag = getColorMaterial(0xb83a1e);
  const paper = getColorMaterial(0xcdbf98);

  batch.box(post, 0.12, 1.0, 0.12, { y: 0.5, tile: 1 });
  batch.box(post, 0.5, 0.08, 0.1, { y: 0.1, tile: 1, ry: 0.6 });
  batch.box(body, 0.46, 0.34, 0.62, { y: 1.15, tile: 1 });
  batch.cylinder(body, 0.23, 0.23, 0.62, 10, { y: 1.32, rz: Math.PI / 2, ry: Math.PI / 2 });
  batch.box(steel, 0.5, 0.04, 0.66, { y: 0.97, tile: 1 });
  batch.box(dark, 0.3, 0.04, 0.02, { y: 1.22, z: 0.32, tile: 1 });
  batch.box(dark, 0.3, 0.1, 0.02, { y: 1.1, z: 0.315, tile: 1 });
  batch.box(flag, 0.04, 0.2, 0.1, { x: 0.27, y: 1.35, z: -0.05, tile: 1 });
  batch.box(steel, 0.03, 0.03, 0.03, { x: 0.25, y: 1.25, z: -0.05, tile: 1 });
  batch.box(paper, 0.2, 0.012, 0.15, { x: 0.0, y: 1.0, z: 0.34, ry: 0.3, tile: 1 });

  const group = batch.build('Briefkasten');
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.7, 0.9), PROXY_MATERIAL);
  proxy.position.y = 0.85;
  group.add(proxy);
  return group;
}
