import * as THREE from 'three';
import { scaleUv, createBatch } from './Batch.js';
import { createAssetLibrary } from './AssetLibrary.js';
import { createHall } from './builders/Hall.js';
import { INTERIOR_BUILDERS } from './builders/Interior.js';
import { addTree } from './builders/Vegetation.js';
import { createRandom } from './Random.js';
import { buildWater, createMossBatch, resetSewer } from './builders/Sewer.js';
import { getMaterial, OVERLAY, OVERLAY_TOP } from './Textures.js';
import { buildPuddles } from './builders/Puddles.js';

const LAYERS = { overlay: OVERLAY, top: OVERLAY_TOP, none: {} };
const BUSH_TINTS = [0xc8d890, 0xb0c878, 0xd8d08a, 0xa8b870, 0xbccc84];
const CHUNK_SIZE = 32;
const GROUND_SIZE = 400;

function coerceValue(value) {
  if (typeof value !== 'string') return value;
  if (/^#[0-9a-f]{6}$/i.test(value)) return parseInt(value.slice(1), 16);
  if (/^-?\d+(\.\d+)?(,\s*-?\d+(\.\d+)?)+$/.test(value)) return value.split(',').map(Number);
  return value;
}

function coerceProps(props = {}) {
  return Object.fromEntries(Object.entries(props).map(([key, value]) => [key, coerceValue(value)]));
}

function surfaceMaterial(props) {
  const layer = LAYERS[props.ebene ?? 'overlay'];
  const ordered = props.reihenfolge === undefined ? {} : { depthWrite: false };
  return getMaterial(props.material, props.color === undefined ? { ...layer, ...ordered } : { color: props.color, ...layer, ...ordered });
}

function swapUv(geometry, across, along) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, v * across, u * along);
  }
}

const SURFACE_SEGMENT = 16;

function buildSurface(object, props) {
  const tile = props.tile ?? 4;
  const geometry = new THREE.PlaneGeometry(object.width, object.height, Math.max(1, Math.ceil(object.width / SURFACE_SEGMENT)), Math.max(1, Math.ceil(object.height / SURFACE_SEGMENT)));
  geometry.rotateX(-Math.PI / 2);
  if (props.texturLaengs) swapUv(geometry, 1, object.width / tile);
  else scaleUv(geometry, object.width / tile, object.height / tile);
  const mesh = new THREE.Mesh(geometry, surfaceMaterial(props));
  mesh.position.set(object.x, props.y ?? 0.01, object.z);
  mesh.rotation.y = object.rotation;
  if (props.reihenfolge !== undefined) mesh.renderOrder = props.reihenfolge;
  return mesh;
}

function buildPatch(radius, x, z, rotation, props) {
  const tile = props.tile ?? 4;
  const geometry = new THREE.CircleGeometry(radius, 8);
  geometry.rotateX(-Math.PI / 2);
  scaleUv(geometry, (radius * 2) / tile, (radius * 2) / tile);
  const mesh = new THREE.Mesh(geometry, surfaceMaterial(props));
  mesh.position.set(x, props.y ?? 0.02, z);
  mesh.rotation.y = rotation;
  return mesh;
}

function toWorld(object, localX, localZ) {
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  return { x: object.x + localX * cos + localZ * sin, z: object.z - localX * sin + localZ * cos };
}

function buildRoad(object, props) {
  const points = object.points;
  const width = props.breite ?? 6;
  const tile = props.tile ?? 4;
  const across = props.texturLaengs ? 1 : width / tile;
  const count = points.length;
  const positions = new Float32Array(count * 6);
  const uvs = new Float32Array(count * 4);
  const indices = [];
  let along = 0;

  for (let i = 0; i < count; i += 1) {
    const [x, z] = points[i];
    const [ax, az] = points[Math.max(0, i - 1)];
    const [bx, bz] = points[Math.min(count - 1, i + 1)];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    const nx = -(bz - az) / length;
    const nz = (bx - ax) / length;
    if (i > 0) along += Math.hypot(x - points[i - 1][0], z - points[i - 1][1]);
    const half = width / 2;
    positions.set([x + nx * half, 0, z + nz * half, x - nx * half, 0, z - nz * half], i * 6);
    uvs.set([0, along / tile, across, along / tile], i * 4);
    if (i < count - 1) indices.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.attributes.normal;
  for (let i = 0; i < normals.count; i += 1) normals.setXYZ(i, 0, 1, 0);

  const group = new THREE.Group();
  const material = surfaceMaterial(props);
  const strip = new THREE.Mesh(geometry, material);
  strip.position.y = props.y ?? 0.012;
  if (props.reihenfolge !== undefined) strip.renderOrder = props.reihenfolge;
  group.add(strip);

  for (const [x, z] of [points[0], points[count - 1]]) {
    const cap = new THREE.CircleGeometry(width / 2, 14);
    cap.rotateX(-Math.PI / 2);
    scaleUv(cap, width / tile, width / tile);
    const mesh = new THREE.Mesh(cap, material);
    mesh.position.set(x, props.y ?? 0.012, z);
    if (props.reihenfolge !== undefined) mesh.renderOrder = props.reihenfolge;
    group.add(mesh);
  }

  if (props.pfuetzen !== false) {
    const puddles = buildPuddles(points, width, (props.y ?? 0.012) + 0.014);
    if (puddles) group.add(puddles);
  }
  return group;
}

function buildPatchField(object, props) {
  const random = createRandom(props.seed ?? 1);
  const group = new THREE.Group();
  const minRadius = props.minRadius ?? 0.4;
  const maxRadius = props.maxRadius ?? 0.8;
  for (let i = 0; i < (props.count ?? 10); i += 1) {
    const position = toWorld(object, random.range(-object.width / 2, object.width / 2), random.range(-object.height / 2, object.height / 2));
    group.add(buildPatch(random.range(minRadius, maxRadius), position.x, position.z, random.range(0, 3), props));
  }
  return group;
}

function cellSeed(seed, i, j, salt) {
  return (Math.imul(seed | 0, 73856093) ^ Math.imul(i, 19349663) ^ Math.imul(j, 83492791) ^ salt) >>> 0;
}

function stratified(object, density, margin, random, callback, clip = null, seed = 1, salt = 0) {
  const spacing = Math.sqrt(100 / density);
  const halfWidth = object.width / 2 - margin;
  const halfDepth = object.height / 2 - margin;

  if (!clip) {
    for (let ix = -halfWidth; ix < halfWidth; ix += spacing) {
      for (let iz = -halfDepth; iz < halfDepth; iz += spacing) {
        const localX = Math.min(halfWidth, ix + random.range(0, spacing));
        const localZ = Math.min(halfDepth, iz + random.range(0, spacing));
        callback(toWorld(object, localX, localZ), random);
      }
    }
    return;
  }

  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  let minLocalX = Infinity;
  let maxLocalX = -Infinity;
  let minLocalZ = Infinity;
  let maxLocalZ = -Infinity;
  for (const [cx, cz] of [[clip[0], clip[1]], [clip[2], clip[1]], [clip[0], clip[3]], [clip[2], clip[3]]]) {
    const dx = cx - object.x;
    const dz = cz - object.z;
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;
    minLocalX = Math.min(minLocalX, lx);
    maxLocalX = Math.max(maxLocalX, lx);
    minLocalZ = Math.min(minLocalZ, lz);
    maxLocalZ = Math.max(maxLocalZ, lz);
  }

  const firstX = Math.max(0, Math.floor((minLocalX + halfWidth) / spacing) - 1);
  const lastX = Math.floor((maxLocalX + halfWidth) / spacing) + 1;
  const firstZ = Math.max(0, Math.floor((minLocalZ + halfDepth) / spacing) - 1);
  const lastZ = Math.floor((maxLocalZ + halfDepth) / spacing) + 1;

  for (let i = firstX; i <= lastX; i += 1) {
    const ix = -halfWidth + i * spacing;
    if (ix >= halfWidth) break;
    for (let j = firstZ; j <= lastZ; j += 1) {
      const iz = -halfDepth + j * spacing;
      if (iz >= halfDepth) break;
      const cell = createRandom(cellSeed(seed, i, j, salt));
      const localX = Math.min(halfWidth, ix + cell.range(0, spacing));
      const localZ = Math.min(halfDepth, iz + cell.range(0, spacing));
      const position = toWorld(object, localX, localZ);
      if (position.x < clip[0] || position.x >= clip[2] || position.z < clip[1] || position.z >= clip[3]) continue;
      callback(position, cell);
    }
  }
}

function parseCut(props) {
  if (!props.schneise) return null;
  const points = String(props.schneise).split(';').map((pair) => pair.split(',').map(Number));
  return { points, half: (props.schneiseBreite ?? 4) / 2 };
}

function inCut(cut, x, z) {
  if (!cut) return false;
  for (let i = 0; i < cut.points.length - 1; i += 1) {
    const [ax, az] = cut.points[i];
    const [bx, bz] = cut.points[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const lengthSquared = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lengthSquared));
    if (Math.hypot(x - (ax + dx * t), z - (az + dz * t)) < cut.half) return true;
  }
  return false;
}

function expandForest(object, props, trees, bushes, clip = null) {
  const cut = parseCut(props);
  const seed = props.seed ?? 1;
  const random = createRandom(seed);
  const margin = props.rand ?? 0.8;
  const minHeight = props.minHeight ?? 7;
  const maxHeight = props.maxHeight ?? 11;
  const conifers = props.nadelanteil ?? 0.45;

  stratified(object, props.dichte ?? 12, margin, random, ({ x, z }, cell) => {
    if (inCut(cut, x, z)) return;
    trees.push({
      x,
      z,
      kind: cell.next() < conifers ? 'conifer' : 'broadleaf',
      height: cell.range(minHeight, maxHeight),
      seed: Math.floor(cell.next() * 1e6),
    });
  }, clip, seed, 0);

  if (!props.unterholz) return;
  stratified(object, props.unterholz, margin, random, ({ x, z }, cell) => {
    if (inCut(cut, x, z)) return;
    bushes.push({ x, z, size: cell.range(1.4, 2.6), seed: Math.floor(cell.next() * 1e6) });
  }, clip, seed, 0x9e3779b9);
}

function addUndergrowth(batch, bush) {
  const random = createRandom(bush.seed);
  const leaf = getMaterial('leaves', { color: random.pick(BUSH_TINTS) });
  const count = random.int(2, 4);
  for (let i = 0; i < count; i += 1) {
    batch.blob(leaf, bush.size * random.range(0.35, 0.6), 0, {
      x: bush.x + random.range(-0.4, 0.4) * bush.size,
      y: bush.size * random.range(0.25, 0.4),
      z: bush.z + random.range(-0.4, 0.4) * bush.size,
      sy: 0.8,
      ry: random.range(0, 3),
    });
  }
}

function buildForests(trees, bushes) {
  const chunks = new Map();
  const chunkFor = (x, z) => {
    const key = `${Math.floor(x / CHUNK_SIZE)}|${Math.floor(z / CHUNK_SIZE)}`;
    if (!chunks.has(key)) chunks.set(key, { trees: [], bushes: [] });
    return chunks.get(key);
  };
  for (const tree of trees) chunkFor(tree.x, tree.z).trees.push(tree);
  for (const bush of bushes) chunkFor(bush.x, bush.z).bushes.push(bush);

  const group = new THREE.Group();
  group.name = 'Waelder';
  const undergrowth = new THREE.Group();
  undergrowth.name = 'Unterholz';
  for (const chunk of chunks.values()) {
    const treeBatch = createBatch();
    for (const tree of chunk.trees) addTree(treeBatch, tree);
    group.add(treeBatch.build('Wald'));
    if (chunk.bushes.length === 0) continue;
    const bushBatch = createBatch();
    for (const bush of chunk.bushes) addUndergrowth(bushBatch, bush);
    undergrowth.add(bushBatch.build('Unterholz'));
  }
  return { trees: group, undergrowth };
}

function buildPowerLine(object, props) {
  const group = new THREE.Group();
  const heights = [].concat(props.hoehen ?? [7.1, 6.4]);
  const spread = props.abstand ?? 1.2;
  const sag = props.durchhang ?? 0.9;
  const material = new THREE.LineBasicMaterial({ color: 0x1c1a16 });

  for (let i = 0; i < object.points.length - 1; i += 1) {
    const [ax, az] = object.points[i];
    const [bx, bz] = object.points[i + 1];
    const length = Math.hypot(bx - ax, bz - az) || 1;
    const nx = -(bz - az) / length;
    const nz = (bx - ax) / length;

    for (const height of heights) {
      for (const side of [-1, 1]) {
        const offset = (side * spread) / 2;
        const from = new THREE.Vector3(ax + nx * offset, height, az + nz * offset);
        const to = new THREE.Vector3(bx + nx * offset, height, bz + nz * offset);
        const middle = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
        middle.y -= sag;
        const curve = new THREE.QuadraticBezierCurve3(from, middle, to);
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(12)), material));
      }
    }
  }
  return group;
}

export function createBuildContext() {
  const assets = createAssetLibrary();
  assets.register('halle', createHall);
  for (const [kind, factory] of Object.entries(INTERIOR_BUILDERS)) assets.register(kind, factory);
  return { assets, trees: [], bushes: [], emitters: [], drips: [], moss: createMossBatch(), wallGroups: new Map() };
}

export function addObject(target, context, object, clip = null) {
  const { assets, trees, bushes, emitters, drips, moss, wallGroups } = context;
  const props = coerceProps(object.props);

  if (object.kind === 'wand' && props.buendeln) {
    const key = [props.material ?? 'concrete_panel', props.color ?? '', props.hoehe ?? 3, props.y0 ?? 0, props.tile ?? 3].join('|');
    if (!wallGroups.has(key)) wallGroups.set(key, { props, walls: [] });
    wallGroups.get(key).walls.push(object);
  } else if (object.kind === 'flaeche') {
    target.add(buildSurface(object, props));
  } else if (object.kind === 'strasse') {
    target.add(buildRoad(object, props));
  } else if (object.kind === 'wasser') {
    target.add(buildWater(object, props));
  } else if (object.kind === 'moos') {
    moss.add(object, props);
  } else if (object.kind === 'tropfen') {
    drips.push({ x: object.x, z: object.z, y: props.y ?? 0.1, hoehe: props.hoehe ?? 3, intervall: props.intervall ?? 2, laut: props.laut ?? 1 });
  } else if (object.kind === 'fleck') {
    target.add(buildPatch(object.width / 2, object.x, object.z, object.rotation, props));
  } else if (object.kind === 'flecken') {
    target.add(buildPatchField(object, props));
  } else if (object.kind === 'wald') {
    expandForest(object, props, trees, bushes, clip);
  } else if (object.kind === 'baum') {
    trees.push({ x: object.x, z: object.z, kind: props.kind ?? 'broadleaf', height: props.height ?? 7, seed: props.seed ?? 1 });
  } else if (object.kind === 'leitung') {
    target.add(buildPowerLine(object, props));
  } else if (object.kind === 'grasbueschel') {
    const area = { x: object.x, z: object.z, width: object.width, depth: object.height };
    target.add(assets.create(object.kind, { ...props, area }));
  } else {
    let instance;
    try {
      instance = assets.create(object.kind, { ...props, footprint: { width: object.width, depth: object.height } });
    } catch {
      console.warn(`Unbekannter Objekttyp in der Zonendefinition: ${object.kind}`);
      return;
    }
    if (object.kind === 'fass' && props.burning) emitters.push({ x: object.x, z: object.z });
    instance.position.set(object.x, props.y ?? 0, object.z);
    instance.rotation.y = object.rotation;
    target.add(instance);
  }
}

export function finishObjects(target, context, detailTarget = target) {
  for (const { props, walls } of context.wallGroups.values()) target.add(buildWallBatch(props, walls));
  const forests = buildForests(context.trees, context.bushes);
  target.add(forests.trees);
  detailTarget.add(forests.undergrowth);
  target.add(context.moss.build());
}

export function buildZone(scene, world) {
  const zone = new THREE.Group();
  zone.name = world.name ?? 'Zone';
  resetSewer();
  const context = createBuildContext();

  const groundWidth = world.indoor || world.chunked ? world.width : GROUND_SIZE;
  const groundDepth = world.indoor || world.chunked ? world.height : GROUND_SIZE;
  const ground = new THREE.PlaneGeometry(groundWidth, groundDepth, Math.max(1, Math.ceil(groundWidth / 32)), Math.max(1, Math.ceil(groundDepth / 32)));
  ground.rotateX(-Math.PI / 2);
  scaleUv(ground, groundWidth / 4, groundDepth / 4);
  zone.add(new THREE.Mesh(ground, getMaterial(world.groundTexture ?? 'grass', { color: coerceValue(world.groundColor ?? '#c8c8b4') })));

  for (const object of world.objects ?? []) addObject(zone, context, object);
  finishObjects(zone, context);
  scene.add(zone);

  const teleporters = (world.teleporters ?? []).map(buildTeleporter);
  for (const proxy of teleporters) zone.add(proxy);

  return { zone, emitters: context.emitters, drips: context.drips, teleporters };
}

function buildWallBatch(props, walls) {
  const height = props.hoehe ?? 3;
  const y0 = props.y0 ?? 0;
  const material = getMaterial(props.material ?? 'concrete_panel', { color: props.color ?? 0xc9bb9a });
  const batch = createBatch();
  for (const wall of walls) {
    batch.box(material, wall.width, height, wall.height, { x: wall.x, y: y0 + height / 2, z: wall.z, ry: wall.rotation, tile: props.tile ?? 3 });
  }
  return batch.build('Waende');
}

const PROXY_MATERIAL = new THREE.MeshBasicMaterial({ visible: false });

function buildTeleporter(teleporter) {
  const geometry = new THREE.BoxGeometry(Math.max(teleporter.width, 1.6), teleporter.height, Math.max(teleporter.depth, 0.8));
  const proxy = new THREE.Mesh(geometry, PROXY_MATERIAL);
  proxy.position.set(teleporter.x, teleporter.height / 2, teleporter.z);
  proxy.rotation.y = teleporter.rotation ?? 0;
  proxy.name = `Teleporter_${teleporter.id}`;
  proxy.userData.isTeleporter = true;
  proxy.userData.teleporterId = teleporter.id;
  proxy.userData.label = teleporter.label;
  return proxy;
}

export function disposeZone(scene, built) {
  scene.remove(built.zone);
  built.zone.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
  });
}
