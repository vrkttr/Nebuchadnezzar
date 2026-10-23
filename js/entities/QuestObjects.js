import * as THREE from 'three';
import { getColorMaterial } from '../world/Textures.js';

const PROXY_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });
const RING_COLOR = 0xe0a030;
const PULSE_SPEED = 2.4;

function box(parent, material, width, height, depth, x, y, z, rotationY = 0, rotationZ = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.rotation.z = rotationZ;
  parent.add(mesh);
  return mesh;
}

function stain(parent, color, radius, x, z) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 10), getColorMaterial(color, { side: THREE.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.015, z);
  parent.add(mesh);
}

function buildBody(group) {
  const jacket = getColorMaterial(0x4a4a3a);
  const pants = getColorMaterial(0x3a382e);
  const skin = getColorMaterial(0xb8a890);
  const boots = getColorMaterial(0x2a2418);
  stain(group, 0x4a2a22, 0.7, 0.1, 0.1);
  stain(group, 0x3e2420, 0.4, -0.5, -0.3);
  box(group, jacket, 0.5, 0.2, 0.3, 0, 0.12, 0.25, 0.15);
  box(group, pants, 0.4, 0.17, 0.28, -0.05, 0.1, -0.2, 0.1);
  box(group, pants, 0.4, 0.17, 0.28, 0.12, 0.1, -0.5, -0.2);
  box(group, boots, 0.18, 0.12, 0.28, 0.15, 0.08, -0.82, -0.2);
  box(group, boots, 0.18, 0.12, 0.28, -0.12, 0.08, -0.55, 0.1);
  box(group, skin, 0.2, 0.2, 0.2, 0.05, 0.12, 0.62, 0.3);
  box(group, jacket, 0.4, 0.12, 0.14, -0.38, 0.08, 0.3, 0.7);
  box(group, jacket, 0.4, 0.12, 0.14, 0.42, 0.08, 0.1, -0.5);
  return { width: 2.2, depth: 1.8 };
}

function buildDocuments(group) {
  const paper = getColorMaterial(0xcdbf98);
  const folder = getColorMaterial(0x7a6a42);
  box(group, folder, 0.32, 0.025, 0.42, 0, 0.015, 0, 0.3);
  box(group, paper, 0.28, 0.01, 0.36, 0.1, 0.035, 0.04, 0.5);
  box(group, paper, 0.28, 0.01, 0.36, -0.2, 0.012, 0.18, -0.4);
  box(group, paper, 0.24, 0.01, 0.3, 0.25, 0.012, -0.2, 0.9);
  return { width: 0.9, depth: 0.9 };
}

function buildTraces(group) {
  stain(group, 0x4a2a22, 0.45, 0, 0);
  stain(group, 0x3e2420, 0.25, 0.55, 0.3);
  stain(group, 0x3e2420, 0.15, 0.95, 0.55);
  box(group, getColorMaterial(0x3a2a22), 0.12, 0.01, 1.4, -0.4, 0.015, 0.9, 0.35);
  return { width: 1.8, depth: 1.8 };
}

function buildRadio(group) {
  const casing = getColorMaterial(0x5a5a48);
  const dial = getColorMaterial(0xc8a050);
  const dark = getColorMaterial(0x1f2118);
  box(group, casing, 0.42, 0.26, 0.2, 0, 0.13, 0);
  box(group, dark, 0.2, 0.12, 0.02, -0.07, 0.15, 0.11);
  box(group, dial, 0.06, 0.06, 0.03, 0.12, 0.15, 0.11);
  box(group, dark, 0.015, 0.5, 0.015, 0.17, 0.5, -0.05);
  return { width: 0.8, depth: 0.8 };
}

const BUILDERS = { leiche: buildBody, dokument: buildDocuments, spur: buildTraces, funkgeraet: buildRadio };

export function createQuestObjects(scene) {
  const objects = new Map();
  let elapsed = 0;

  function add(data) {
    if (objects.has(data.id)) return;

    const group = new THREE.Group();
    const size = (BUILDERS[data.model] ?? buildDocuments)(group);

    const proxy = new THREE.Mesh(new THREE.BoxGeometry(Math.max(size.width, 1.2), 1, Math.max(size.depth, 1.2)), PROXY_MATERIAL);
    proxy.position.y = 0.5;
    group.add(proxy);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 24),
      new THREE.MeshBasicMaterial({ color: RING_COLOR, side: THREE.DoubleSide, transparent: true, opacity: 0.7, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);

    group.position.set(data.x, data.y ?? 0, data.z);
    group.rotation.y = data.rotationY ?? 0;
    group.userData.isQuestObject = true;
    group.userData.questObjectId = data.id;
    group.userData.questObjectName = data.name;

    scene.add(group);
    objects.set(data.id, { group, ring });
  }

  function remove(id) {
    const entry = objects.get(id);
    if (!entry) return;
    scene.remove(entry.group);
    objects.delete(id);
  }

  function clear() {
    for (const id of Array.from(objects.keys())) remove(id);
  }

  function sync(list) {
    const wanted = new Set(list.map((data) => data.id));
    for (const id of Array.from(objects.keys())) if (!wanted.has(id)) remove(id);
    for (const data of list) add(data);
  }

  function getObjects() {
    return Array.from(objects.values(), (entry) => entry.group);
  }

  function update(delta) {
    elapsed += delta;
    const scale = 1 + Math.sin(elapsed * PULSE_SPEED) * 0.08;
    for (const entry of objects.values()) entry.ring.scale.setScalar(scale);
  }

  return { add, remove, clear, sync, getObjects, update };
}
