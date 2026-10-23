import * as THREE from 'three';
import { getColorMaterial } from '../world/Textures.js';
import { dampFactor } from '../utils/Interpolation.js';

const LOCO_LENGTH = 6;
const WAGON_LENGTH = 8;
const WAGON_WIDTH = 3.2;
const COUPLING_GAP = 1.5;
const DECK_HEIGHT = 0.5;
const RAIL_OFFSET = 0.72;
const SLEEPER_SPACING = 0.9;
const PLATFORM_OFFSET = 3.1;
const PLATFORM_LENGTH = 16;
const SYNC_SMOOTHING = 8;
const SNAP_DISTANCE = 6;

function buildPath(points) {
  const closed = points.map((point) => [point[0], point[1]]);
  const first = closed[0];
  const last = closed[closed.length - 1];
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.01) closed.push([first[0], first[1]]);
  const cumulative = [0];
  for (let index = 1; index < closed.length; index += 1) {
    cumulative.push(cumulative[index - 1] + Math.hypot(closed[index][0] - closed[index - 1][0], closed[index][1] - closed[index - 1][1]));
  }
  return { points: closed, cumulative, length: cumulative[cumulative.length - 1] };
}

function pointAt(path, distance) {
  const s = ((distance % path.length) + path.length) % path.length;
  let low = 0;
  let high = path.cumulative.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (path.cumulative[middle] <= s) low = middle;
    else high = middle;
  }
  const a = path.points[low];
  const b = path.points[low + 1];
  const segment = path.cumulative[low + 1] - path.cumulative[low];
  const t = segment > 0 ? (s - path.cumulative[low]) / segment : 0;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz) || 1;
  return { x: a[0] + dx * t, z: a[1] + dz * t, yaw: Math.atan2(dx / length, dz / length) };
}

function box(width, height, depth, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function wheel(parent, radius, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.12, 12), material);
  mesh.rotation.z = Math.PI / 2;
  mesh.position.set(x, y, z);
  parent.add(mesh);
}

function buildLoco() {
  const group = new THREE.Group();
  const frame = getColorMaterial(0x34332f);
  const hood = getColorMaterial(0x8a4c2c);
  const cab = getColorMaterial(0x59664a);
  const roof = getColorMaterial(0x45423a);
  const glass = getColorMaterial(0x1c242a);
  const stripe = getColorMaterial(0xb89a2a);
  const lamp = getColorMaterial(0xf0d890, { unlit: true });
  const iron = getColorMaterial(0x26241f);
  const lift = 0.2;

  group.add(box(2.8, 0.45, LOCO_LENGTH, frame, 0, 0.5, 0));
  group.add(box(2.6, 1.7, 2.7, hood, 0, 1.55 + lift, 1.6));
  group.add(box(2.8, 2.3, 2.7, cab, 0, 1.85 + lift, -1.5));
  group.add(box(3.0, 0.14, 3.0, roof, 0, 3.07 + lift, -1.5));
  group.add(box(2.82, 0.12, 6.02, stripe, 0, 0.8, 0));
  for (const side of [-1, 1]) {
    group.add(box(0.04, 0.9, 1.4, glass, side * 1.41, 2.2 + lift, -1.5));
    for (const z of [-2.1, -0.7, 0.7, 2.1]) wheel(group, 0.38, side * 1.0, 0.38, z, iron);
  }
  group.add(box(2.0, 0.8, 0.04, glass, 0, 2.25 + lift, -2.86));
  group.add(box(2.0, 0.8, 0.04, glass, 0, 2.25 + lift, -0.16));
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 8), roof);
  pipe.position.set(0.5, 2.9 + lift, 2.2);
  group.add(pipe);
  for (const side of [-1, 1]) {
    group.add(box(0.3, 0.3, 0.06, lamp, side * 0.8, 1.4 + lift, 2.97));
    group.add(box(0.3, 0.3, 0.06, lamp, side * 0.8, 1.4 + lift, -2.97));
    group.add(box(0.3, 0.3, 0.3, frame, side * 1.0, 0.65, 3.1));
    group.add(box(0.3, 0.3, 0.3, frame, side * 1.0, 0.65, -3.1));
  }
  return group;
}

function buildWagon(index) {
  const group = new THREE.Group();
  const deck = getColorMaterial(index % 2 === 0 ? 0x6a5a40 : 0x5e5038);
  const beam = getColorMaterial(0x3c3a34);
  const rust = getColorMaterial(0x6a3c24);
  const iron = getColorMaterial(0x26241f);
  const top = DECK_HEIGHT;

  group.add(box(WAGON_WIDTH, 0.1, WAGON_LENGTH, deck, 0, top - 0.05, 0));
  group.add(box(WAGON_WIDTH - 0.5, 0.2, WAGON_LENGTH - 0.6, iron, 0, top - 0.2, 0));
  for (const side of [-1, 1]) {
    group.add(box(0.14, 0.3, WAGON_LENGTH + 0.1, beam, side * (WAGON_WIDTH / 2), top - 0.07, 0));
  }
  for (const end of [-1, 1]) {
    group.add(box(WAGON_WIDTH, 0.3, 0.16, beam, 0, top - 0.07, end * (WAGON_LENGTH / 2)));
    group.add(box(0.3, 0.26, 0.4, rust, -0.9, top - 0.05, end * (WAGON_LENGTH / 2 + 0.1)));
    group.add(box(0.3, 0.26, 0.4, rust, 0.9, top - 0.05, end * (WAGON_LENGTH / 2 + 0.1)));
    const bogieZ = end * 2.6;
    group.add(box(2.2, 0.16, 1.7, iron, 0, 0.3, bogieZ));
    for (const side of [-1, 1]) {
      for (const offset of [-0.55, 0.55]) wheel(group, 0.26, side * 0.78, 0.26, bogieZ + offset, iron);
    }
  }
  for (let slat = 1; slat < 8; slat += 1) {
    group.add(box(WAGON_WIDTH - 0.2, 0.012, 0.03, beam, 0, top + 0.006, -WAGON_LENGTH / 2 + slat));
  }
  return group;
}

function signTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = '#b89a2a';
  context.fillRect(0, 0, 512, 128);
  context.strokeStyle = '#2a261c';
  context.lineWidth = 8;
  context.strokeRect(6, 6, 500, 116);
  context.fillStyle = '#1e1b14';
  context.font = 'bold 64px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 68, 470);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTrain({ scene, label, onHorn, heightAt = () => 0 }) {
  let root = null;
  let path = null;
  let parts = [];
  let signMaterials = [];
  let current = null;
  let target = null;
  let honking = false;
  let wagonCount = 0;

  function clear() {
    if (root) {
      scene.remove(root);
      root.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });
    }
    for (const material of signMaterials) {
      material.map?.dispose();
      material.dispose();
    }
    signMaterials = [];
    root = null;
    path = null;
    parts = [];
    current = null;
    target = null;
    honking = false;
  }

  function buildRails() {
    const seen = new Set();
    const segments = [];
    for (let index = 0; index < path.points.length - 1; index += 1) {
      const a = path.points[index];
      const b = path.points[index + 1];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.01) continue;
      const key = [a, b].map((point) => `${Math.round(point[0] * 10)},${Math.round(point[1] * 10)}`).sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      segments.push({ a, b, length, yaw: Math.atan2((b[0] - a[0]) / length, (b[1] - a[1]) / length) });
    }

    let sleeperCount = 0;
    for (const segment of segments) sleeperCount += Math.max(1, Math.floor(segment.length / SLEEPER_SPACING));

    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.06, 0.26), getColorMaterial(0x4a3a2a), sleeperCount);
    const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.08, 1), getColorMaterial(0x5a4638), segments.length * 2);
    const ballast = new THREE.InstancedMesh(new THREE.BoxGeometry(3.0, 0.04, 1), getColorMaterial(0x6a665a), segments.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const scale = new THREE.Vector3(1, 1, 1);
    const position = new THREE.Vector3();

    let sleeperIndex = 0;
    segments.forEach((segment, index) => {
      quaternion.setFromAxisAngle(up, segment.yaw);
      const dx = (segment.b[0] - segment.a[0]) / segment.length;
      const dz = (segment.b[1] - segment.a[1]) / segment.length;
      const centerX = (segment.a[0] + segment.b[0]) / 2;
      const centerZ = (segment.a[1] + segment.b[1]) / 2;

      position.set(centerX, 0.02, centerZ);
      scale.set(1, 1, segment.length + 0.05);
      matrix.compose(position, quaternion, scale);
      ballast.setMatrixAt(index, matrix);

      for (const side of [-1, 1]) {
        position.set(centerX + dz * side * RAIL_OFFSET, 0.04, centerZ - dx * side * RAIL_OFFSET);
        scale.set(1, 1, segment.length + 0.05);
        matrix.compose(position, quaternion, scale);
        rails.setMatrixAt(index * 2 + (side < 0 ? 0 : 1), matrix);
      }

      const count = Math.max(1, Math.floor(segment.length / SLEEPER_SPACING));
      scale.set(1, 1, 1);
      for (let step = 0; step < count; step += 1) {
        const along = ((step + 0.5) / count) * segment.length;
        position.set(segment.a[0] + dx * along, 0.03, segment.a[1] + dz * along);
        matrix.compose(position, quaternion, scale);
        sleepers.setMatrixAt(sleeperIndex, matrix);
        sleeperIndex += 1;
      }
    });

    for (const mesh of [ballast, rails, sleepers]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      root.add(mesh);
    }
  }

  function buildStop(stop) {
    let best = null;
    for (let index = 0; index < path.points.length - 1; index += 1) {
      const a = path.points[index];
      const b = path.points[index + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const lengthSquared = dx * dx + dz * dz;
      if (lengthSquared < 1e-6) continue;
      const t = Math.max(0, Math.min(1, ((stop.x - a[0]) * dx + (stop.z - a[1]) * dz) / lengthSquared));
      const distance = Math.hypot(a[0] + dx * t - stop.x, a[1] + dz * t - stop.z);
      if (!best || distance < best.distance - 0.01) best = { distance, x: a[0] + dx * t, z: a[1] + dz * t, yaw: Math.atan2(dx, dz) };
    }
    if (!best) return;

    const group = new THREE.Group();
    group.position.set(best.x, 0, best.z);
    group.rotation.y = best.yaw;
    const cos = Math.cos(best.yaw);
    const sin = Math.sin(best.yaw);
    const probe = (offset) => heightAt(best.x + offset * cos, best.z - offset * sin);
    const side = probe(PLATFORM_OFFSET) >= probe(-PLATFORM_OFFSET) ? 1 : -1;
    const top = Math.max(probe(PLATFORM_OFFSET), probe(-PLATFORM_OFFSET));
    const post = side * (PLATFORM_OFFSET + 1.3);
    group.add(box(0.2, 0.02, PLATFORM_LENGTH, getColorMaterial(0xb89a2a), side * 2.2, top + 0.005, 0));
    group.add(box(0.12, 2.6, 0.12, getColorMaterial(0x4a4a46), post, top + 1.3, 0));

    const material = new THREE.MeshBasicMaterial({ map: signTexture(label(stop.id, stop.name)) });
    signMaterials.push(material);
    const front = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), material);
    front.position.set(post - side * 0.07, top + 2.4, 0);
    front.rotation.y = side * -Math.PI / 2;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), material);
    back.position.set(post + side * 0.07, top + 2.4, 0);
    back.rotation.y = side * Math.PI / 2;
    group.add(front, back);
    root.add(group);
  }

  function setRoute(definition) {
    clear();
    if (!definition || !definition.points || definition.points.length < 2) return;
    path = buildPath(definition.points);
    wagonCount = definition.wagons ?? 3;
    root = new THREE.Group();
    scene.add(root);
    buildRails();
    for (const stop of definition.stops ?? []) buildStop(stop);

    const loco = buildLoco();
    root.add(loco);
    parts = [{ object: loco, length: LOCO_LENGTH }];
    for (let index = 0; index < wagonCount; index += 1) {
      const wagon = buildWagon(index);
      root.add(wagon);
      parts.push({ object: wagon, length: WAGON_LENGTH });
    }
    for (const part of parts) part.object.visible = false;
  }

  function receive(message) {
    if (!path) return;
    target = { s: message.s, speed: message.speed, time: performance.now() / 1000 };
    if (message.honking && !honking) {
      const front = frontPosition();
      if (front) onHorn(front.x, front.z);
    }
    honking = message.honking;
  }

  function wrapDifference(value) {
    const half = path.length / 2;
    return ((((value + half) % path.length) + path.length) % path.length) - half;
  }

  function totalLength() {
    return LOCO_LENGTH + wagonCount * (WAGON_LENGTH + COUPLING_GAP);
  }

  function frontPosition() {
    if (!path || !(current ?? target)) return null;
    const centerS = current ?? target.s;
    return pointAt(path, centerS + totalLength() / 2 - LOCO_LENGTH / 2);
  }

  function update(delta) {
    if (!path || !target) return;
    const now = performance.now() / 1000;
    const expected = target.s + target.speed * (now - target.time);

    if (current === null || Math.abs(wrapDifference(expected - current)) > SNAP_DISTANCE) {
      current = expected;
    } else {
      current += target.speed * delta + wrapDifference(expected - current) * dampFactor(SYNC_SMOOTHING, delta);
    }
    current = ((current % path.length) + path.length) % path.length;

    const frontCenter = current + totalLength() / 2 - LOCO_LENGTH / 2;
    parts.forEach((part, index) => {
      const offset = index === 0 ? 0 : LOCO_LENGTH / 2 + COUPLING_GAP + WAGON_LENGTH / 2 + (index - 1) * (WAGON_LENGTH + COUPLING_GAP);
      const point = pointAt(path, frontCenter - offset);
      part.object.position.set(point.x, 0, point.z);
      part.object.rotation.y = point.yaw;
      part.object.visible = true;
    });
  }

  function rideVelocity() {
    if (!target || parts.length < 2) return { x: 0, z: 0 };
    const yaw = parts[1].object.rotation.y;
    return { x: Math.sin(yaw) * target.speed, z: Math.cos(yaw) * target.speed };
  }

  return { setRoute, clear, receive, update, rideVelocity, deckHeight: DECK_HEIGHT };
}
