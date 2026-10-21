import * as THREE from 'three';
import { scaleUv, createBatch } from './Batch.js';
import { createAssetLibrary } from './AssetLibrary.js';
import { createHall } from './builders/Hall.js';
import { INTERIOR_BUILDERS } from './builders/Interior.js';
import { addTree } from './builders/Vegetation.js';
import { createRandom } from './Random.js';
import { getMaterial, OVERLAY, OVERLAY_TOP } from './Textures.js';

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
  return getMaterial(props.material, props.color === undefined ? layer : { color: props.color, ...layer });
}

function swapUv(geometry, across, along) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, v * across, u * along);
  }
}

function buildSurface(object, props) {
  const tile = props.tile ?? 4;
  const geometry = new THREE.PlaneGeometry(object.width, object.height);
  geometry.rotateX(-Math.PI / 2);
  if (props.texturLaengs) swapUv(geometry, 1, object.width / tile);
  else scaleUv(geometry, object.width / tile, object.height / tile);
  const mesh = new THREE.Mesh(geometry, surfaceMaterial(props));
  mesh.position.set(object.x, props.y ?? 0.01, object.z);
  mesh.rotation.y = object.rotation;
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

function stratified(object, density, margin, random, callback) {
  const spacing = Math.sqrt(100 / density);
  const halfWidth = object.width / 2 - margin;
  const halfDepth = object.height / 2 - margin;
  for (let ix = -halfWidth; ix < halfWidth; ix += spacing) {
    for (let iz = -halfDepth; iz < halfDepth; iz += spacing) {
      const localX = Math.min(halfWidth, ix + random.range(0, spacing));
      const localZ = Math.min(halfDepth, iz + random.range(0, spacing));
      callback(toWorld(object, localX, localZ));
    }
  }
}

function expandForest(object, props, trees, bushes) {
  const random = createRandom(props.seed ?? 1);
  const margin = props.rand ?? 0.8;
  const minHeight = props.minHeight ?? 7;
  const maxHeight = props.maxHeight ?? 11;
  const conifers = props.nadelanteil ?? 0.45;

  stratified(object, props.dichte ?? 12, margin, random, ({ x, z }) => {
    trees.push({
      x,
      z,
      kind: random.next() < conifers ? 'conifer' : 'broadleaf',
      height: random.range(minHeight, maxHeight),
      seed: Math.floor(random.next() * 1e6),
    });
  });

  if (!props.unterholz) return;
  stratified(object, props.unterholz, margin, random, ({ x, z }) => {
    bushes.push({ x, z, size: random.range(1.4, 2.6), seed: Math.floor(random.next() * 1e6) });
  });
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
  for (const chunk of chunks.values()) {
    const batch = createBatch();
    for (const tree of chunk.trees) addTree(batch, tree);
    for (const bush of chunk.bushes) addUndergrowth(batch, bush);
    group.add(batch.build('Wald'));
  }
  return group;
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

export function buildZone(scene, world) {
  const zone = new THREE.Group();
  zone.name = world.name ?? 'Zone';
  const assets = createAssetLibrary();
  assets.register('halle', createHall);
  for (const [kind, factory] of Object.entries(INTERIOR_BUILDERS)) assets.register(kind, factory);

  const groundWidth = world.indoor ? world.width : GROUND_SIZE;
  const groundDepth = world.indoor ? world.height : GROUND_SIZE;
  const ground = new THREE.PlaneGeometry(groundWidth, groundDepth);
  ground.rotateX(-Math.PI / 2);
  scaleUv(ground, groundWidth / 4, groundDepth / 4);
  zone.add(new THREE.Mesh(ground, getMaterial(world.groundTexture ?? 'grass', { color: coerceValue(world.groundColor ?? '#c8c8b4') })));

  const trees = [];
  const bushes = [];
  const emitters = [];
  const wallGroups = new Map();

  for (const object of world.objects ?? []) {
    const props = coerceProps(object.props);

    if (object.kind === 'wand' && props.buendeln) {
      const key = [props.material ?? 'concrete_panel', props.color ?? '', props.hoehe ?? 3, props.y0 ?? 0, props.tile ?? 3].join('|');
      if (!wallGroups.has(key)) wallGroups.set(key, { props, walls: [] });
      wallGroups.get(key).walls.push(object);
    } else if (object.kind === 'flaeche') {
      zone.add(buildSurface(object, props));
    } else if (object.kind === 'fleck') {
      zone.add(buildPatch(object.width / 2, object.x, object.z, object.rotation, props));
    } else if (object.kind === 'flecken') {
      zone.add(buildPatchField(object, props));
    } else if (object.kind === 'wald') {
      expandForest(object, props, trees, bushes);
    } else if (object.kind === 'baum') {
      trees.push({ x: object.x, z: object.z, kind: props.kind ?? 'broadleaf', height: props.height ?? 7, seed: props.seed ?? 1 });
    } else if (object.kind === 'leitung') {
      zone.add(buildPowerLine(object, props));
    } else if (object.kind === 'grasbueschel') {
      const area = { x: object.x, z: object.z, width: object.width, depth: object.height };
      zone.add(assets.create(object.kind, { ...props, area }));
    } else {
      let instance;
      try {
        instance = assets.create(object.kind, { ...props, footprint: { width: object.width, depth: object.height } });
      } catch {
        console.warn(`Unbekannter Objekttyp in der Zonendefinition: ${object.kind}`);
        continue;
      }
      if (object.kind === 'fass' && props.burning) emitters.push({ x: object.x, z: object.z });
      instance.position.set(object.x, props.y ?? 0, object.z);
      instance.rotation.y = object.rotation;
      zone.add(instance);
    }
  }

  for (const { props, walls } of wallGroups.values()) zone.add(buildWallBatch(props, walls));

  zone.add(buildForests(trees, bushes));
  scene.add(zone);

  const teleporters = (world.teleporters ?? []).map(buildTeleporter);
  for (const proxy of teleporters) zone.add(proxy);

  return { zone, emitters, teleporters };
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
