import * as THREE from 'three';
import { scaleUv } from './Batch.js';
import { createAssetLibrary } from './AssetLibrary.js';
import { createRandom } from './Random.js';
import { getMaterial, OVERLAY, OVERLAY_TOP } from './Textures.js';

const SPAWN = { x: 0, y: 0, z: 0 };

const TREES = [
  { x: -15.5, z: 12.8, kind: 'broadleaf', height: 7 },
  { x: 22.5, z: -9.5, kind: 'broadleaf', height: 6.5 },
  { x: 22, z: 13.4, kind: 'conifer', height: 8 },
  { x: -10, z: -27, kind: 'broadleaf', height: 7.5 },
  { x: 8, z: -28, kind: 'conifer', height: 9 },
  { x: 22, z: -26, kind: 'broadleaf', height: 7 },
  { x: -24, z: -18, kind: 'broadleaf', height: 8 },
  { x: -33, z: -5, kind: 'conifer', height: 9 },
  { x: -33, z: 8, kind: 'broadleaf', height: 7 },
  { x: -31, z: -12, kind: 'conifer', height: 8 },
  { x: 33, z: -10, kind: 'broadleaf', height: 7.5 },
  { x: 34, z: 3, kind: 'conifer', height: 9 },
  { x: 33, z: 14, kind: 'broadleaf', height: 7 },
  { x: -12, z: 17.5, kind: 'broadleaf', height: 6.5 },
  { x: 11, z: 17.8, kind: 'conifer', height: 7.5 },
  { x: 24, z: 17, kind: 'broadleaf', height: 7 },
  { x: 18, z: 31, kind: 'conifer', height: 8.5 },
  { x: -24, z: 30, kind: 'broadleaf', height: 7 },
  { x: 4, z: 32, kind: 'broadleaf', height: 7.5 },
  { x: 28, z: 29, kind: 'conifer', height: 8 },
  { x: -19, z: 17, kind: 'dead', height: 5 },
];

const BUSHES = [
  [-17.2, 11], [-14, 14], [-16.2, 14.2], [20.5, -10.5], [23, -11], [21, 14.4], [24, 14],
  [-11, 16.5], [-13.2, 16.8], [10, 16.6], [12.6, 17], [-26, 13.6], [-27.4, 14.3], [30.5, 14.5],
  [-17.4, -13], [-18, -20], [17, -12.4], [18.2, -12.9], [-8, -26], [10, -26.5], [-22, 25.5], [14, 25.8],
  [-4.5, 31.8], [8, 30.3], [26, 28.5], [-30, 22], [32, 20],
];

function flatPlane(material, width, depth, x, z, tile, y = 0.01) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  scaleUv(geometry, width / tile, depth / tile);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

function roadPlane(material, length, width, z, tile) {
  const geometry = new THREE.PlaneGeometry(width, length);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(Math.PI / 2);
  scaleUv(geometry, width / tile, length / tile);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0.012, z);
  return mesh;
}

function patch(material, radius, x, z, tile, y, rotation) {
  const geometry = new THREE.CircleGeometry(radius, 8);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(rotation);
  scaleUv(geometry, (radius * 2) / tile, (radius * 2) / tile);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

function cable(from, to, sag) {
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mid.y -= sag;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(12));
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x1c1a16 }));
}

export function createStartwelt(scene) {
  const zoneGroup = new THREE.Group();
  zoneGroup.name = 'Startwelt';
  const assets = createAssetLibrary();
  const random = createRandom(2026);

  function place(kind, params, x, z, rotation = 0, y = 0) {
    const object = assets.create(kind, params);
    object.position.set(x, y, z);
    object.rotation.y = rotation;
    zoneGroup.add(object);
    return object;
  }

  const grassGround = getMaterial('grass', { color: 0xc8c8b4 });
  zoneGroup.add(flatPlane(grassGround, 400, 400, 0, 0, 4, 0));

  zoneGroup.add(flatPlane(getMaterial('slab', OVERLAY), 42.9, 26.5, 3, 1.8, 4, 0.01));
  zoneGroup.add(flatPlane(getMaterial('dirt', OVERLAY_TOP), 1.9, 24, 0.6, 1.5, 3, 0.02));
  zoneGroup.add(flatPlane(getMaterial('asphalt', OVERLAY), 7, 6, 0, 17.5, 4, 0.012));
  zoneGroup.add(roadPlane(getMaterial('road', OVERLAY), 260, 6, 23, 4));
  zoneGroup.add(flatPlane(getMaterial('slab', OVERLAY), 260, 1.5, 0, 19.25, 4, 0.011));
  zoneGroup.add(flatPlane(getMaterial('slab', OVERLAY), 260, 1.5, 0, 26.75, 4, 0.011));
  zoneGroup.add(patch(getMaterial('dirt', OVERLAY), 7, -12, 31, 3, 0.012, 0.4));

  const grassPatch = getMaterial('grass', { color: 0xc4c4a4, ...OVERLAY_TOP });
  const patchSpots = [
    [-16, 13], [-12, 9.5], [-17, 4], [-14, -9], [-5, 13.4], [6, 13.8], [14, 13], [21, 10], [22, -7],
    [20, -11], [-9, -11], [12, -10.8], [3.5, 14], [-3, 14.5], [8, -2], [-17.4, -8], [18, 4.8], [-1, -11],
  ];
  for (const [x, z] of patchSpots) {
    zoneGroup.add(patch(grassPatch, random.range(1, 2.2), x, z, 4, 0.02, random.range(0, 3)));
  }
  for (let i = 0; i < 24; i += 1) {
    const x = random.range(-16, 22);
    const z = random.range(-10, 14);
    if (Math.abs(x - 0.6) < 1.6) continue;
    zoneGroup.add(patch(grassPatch, random.range(0.4, 0.8), x, z, 4, 0.02, random.range(0, 3)));
  }

  place('plattenbau', { cells: 11, floors: 4, depth: 11, inhabited: [3, 7], entrance: 5, seed: 11, ivyDensity: 0.55 }, 0, -17);
  place('plattenbau', { cells: 8, floors: 4, depth: 11, inhabited: [2, 5], entrance: 4, seed: 23, ivyDensity: 0.6 }, -24, 0, Math.PI / 2);
  place('garagen', { count: 6, seed: 5 }, 27.25, 3.6, -Math.PI / 2);
  place('wasserturm', { seed: 7 }, 16, -4);
  place('marktstand', {}, 21, 4, -Math.PI / 2);

  place('fass', { seed: 3, burning: true }, -5.8, -9.7);
  place('kiste', { seed: 4, stack: 2 }, -6.9, -9.9, 0.3);
  place('kiste', { seed: 5, stack: 1 }, -7.9, -9.6, -0.2);
  place('bank', {}, 6, -8.6);
  place('bank', {}, 10, -8.6);
  place('hochbeet', { seed: 1, length: 2.4 }, 7, -5);
  place('hochbeet', { seed: 2, length: 2.4 }, 7, -3.6);
  place('hochbeet', { seed: 3, length: 2.4 }, 10.5, -5);
  place('waescheleine', { seed: 4, span: 5 }, -8, -4);
  for (let i = 0; i < 3; i += 1) place('muelltonne', { open: i === 1 }, -14.5 + i * 1.2, -10.7);
  place('spielplatz', {}, -11, 6);
  place('laterne', { lit: true }, -9, 10);
  place('laterne', {}, 9, 10, Math.PI);
  place('fass', { seed: 8 }, 19, 0.6);
  place('fass', { seed: 9, lying: true }, 19.4, 8.4, 0.5);
  place('kiste', { seed: 6, stack: 2 }, 22.8, 7.6, 0.2);

  const fenceWest = place('zaun', { length: 36.5, seed: 1 }, -21.75, 15);
  const fenceEast = place('zaun', { length: 36.5, seed: 2 }, 21.75, 15);
  place('torfluegel', { width: 3 }, -3.5, 15, 1.2);
  place('torfluegel', { width: 3 }, 3.5, 15, Math.PI - 1.2);
  place('barrikade', { seed: 1, width: 3.4 }, -7.5, 18.4, 0.25);
  place('barrikade', { seed: 2, width: 3 }, 8.2, 18.6, -0.2);
  fenceWest.name = 'FenceWest';
  fenceEast.name = 'FenceEast';

  place('auto', { seed: 1, tint: 0xd9a58a, wrecked: true }, 12, 22.4, 0.15);
  place('auto', { seed: 2, tint: 0xa9b890, tarped: true }, -18, 24.5, -0.1);
  place('auto', { seed: 3, tint: 0xc9c9c0, wrecked: true }, -2, 30.5, 1.1);
  place('auto', { seed: 4, tint: 0xb0b8c4, wrecked: true }, -7.6, 29.8, 0.5);

  place('zelt', {}, -14, 33.8);
  place('fass', { seed: 11, burning: true }, -11, 31.4);
  place('kiste', { seed: 7, stack: 1 }, -9.4, 33.2, 0.4);
  place('kiste', { seed: 8, stack: 2 }, -16.6, 31.4, -0.3);

  const poleXs = [-30, -14, 12, 28];
  const poleTops = [];
  for (const x of poleXs) {
    place('mast', { height: 7.5 }, x, 20.6);
    poleTops.push(x);
  }
  for (let i = 0; i < poleTops.length - 1; i += 1) {
    for (const dy of [7.1, 6.4]) {
      for (const dz of [-0.6, 0.6]) {
        zoneGroup.add(cable(new THREE.Vector3(poleTops[i], dy, 20.6 + dz), new THREE.Vector3(poleTops[i + 1], dy, 20.6 + dz), 0.9));
      }
    }
  }

  place('wald', { trees: TREES.map((tree, index) => ({ ...tree, seed: 100 + index })) }, 0, 0);

  const outer = [];
  const outerRandom = createRandom(77);
  for (let i = 0; i < 260; i += 1) {
    const side = i % 4;
    const along = outerRandom.range(-80, 80);
    const depth = outerRandom.range(37, 85);
    const x = side === 0 ? along : side === 1 ? along : side === 2 ? -depth : depth;
    const z = side === 0 ? -depth : side === 1 ? depth : along;
    const kind = outerRandom.next() < 0.45 ? 'conifer' : 'broadleaf';
    outer.push({ x, z, kind, height: outerRandom.range(7, 11), seed: 300 + i });
  }
  place('wald', { trees: outer }, 0, 0);

  BUSHES.forEach(([x, z], index) => {
    place('busch', { seed: 200 + index, size: 1.2 + (index % 3) * 0.4 }, x, z);
  });

  const tufts = [
    { x: 3, z: 1.8, width: 42, depth: 25, count: 34 },
    { x: 0, z: 19.3, width: 80, depth: 1.5, count: 22 },
    { x: 0, z: 26.8, width: 80, depth: 1.5, count: 22 },
    { x: -12, z: 31, width: 12, depth: 8, count: 16 },
  ];
  tufts.forEach((area, index) => {
    place('grasbueschel', { seed: 400 + index, count: area.count, area, scale: 0.6 }, 0, 0);
  });

  scene.add(zoneGroup);

  return { zoneGroup, spawnPoint: new THREE.Vector3(SPAWN.x, SPAWN.y, SPAWN.z) };
}
