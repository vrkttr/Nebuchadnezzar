import * as THREE from 'three';
import { scaleUv } from '../Batch.js';
import { getMaterial } from '../Textures.js';

const WATER_TEXTURE = 'assets/textures/water.png';
const WATER_LEVEL = 0.12;
const MOSS_LIFT = 0.04;
const FACINGS = { s: 0, e: Math.PI / 2, n: Math.PI, w: -Math.PI / 2 };

const loader = new THREE.TextureLoader();
const flows = new Map();
let waters = [];

function flowTexture(flow) {
  const key = flow.join(',');
  if (flows.has(key)) return flows.get(key).texture;

  const texture = loader.load(WATER_TEXTURE);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  flows.set(key, { texture, flow });
  return texture;
}

export function resetSewer() {
  for (const { texture } of flows.values()) texture.dispose();
  flows.clear();
  waters = [];
}

export function updateSewer(delta) {
  for (const { texture, flow } of flows.values()) {
    texture.offset.x += flow[0] * delta;
    texture.offset.y += flow[1] * delta;
  }
}

export function isInWater(x, z) {
  for (const water of waters) {
    if (water.walkable && x >= water.x0 && x <= water.x1 && z >= water.z0 && z <= water.z1) return true;
  }
  return false;
}

export function buildWater(object, props) {
  const tile = props.tile ?? 4;
  const flow = Array.isArray(props.fluss) ? props.fluss : [0.012, 0.007];
  const geometry = new THREE.PlaneGeometry(object.width, object.height, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  scaleUv(geometry, object.width / tile, object.height / tile);

  const material = new THREE.MeshLambertMaterial({
    map: flowTexture(flow),
    color: props.color ?? 0xb8c4a8,
    transparent: true,
    opacity: props.deckkraft ?? 0.86,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(object.x, props.y ?? WATER_LEVEL, object.z);
  mesh.name = 'Wasser';

  waters.push({
    x0: object.x - object.width / 2,
    x1: object.x + object.width / 2,
    z0: object.z - object.height / 2,
    z1: object.z + object.height / 2,
    walkable: !props.rinne,
  });
  return mesh;
}

function tintFor(x, z) {
  const hash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  const k = hash - Math.floor(hash);
  return [0.72 + 0.28 * k, 0.86 + 0.14 * (1 - k), 0.6 + 0.3 * k];
}

export function createMossBatch() {
  const positions = [];
  const uvs = [];
  const colors = [];
  const indices = [];

  function add(object, props) {
    const width = props.breite ?? 1.6;
    const height = props.hoehe ?? 1.2;
    const floor = props.ausrichtung === 'boden';
    const angle = floor ? props.drehung ?? 0 : FACINGS[props.ausrichtung] ?? 0;
    const rx = Math.cos(angle);
    const rz = -Math.sin(angle);
    const base = positions.length / 3;
    const tint = tintFor(object.x, object.z);

    const corners = [];
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      if (floor) {
        const fx = Math.sin(angle);
        const fz = Math.cos(angle);
        corners.push([object.x + rx * a * width / 2 + fx * b * height / 2, (props.y ?? MOSS_LIFT), object.z + rz * a * width / 2 + fz * b * height / 2]);
      } else {
        corners.push([object.x + rx * a * width / 2, (props.y ?? 0) + height / 2 + b * height / 2, object.z + rz * a * width / 2]);
      }
    }
    for (const [index, corner] of corners.entries()) {
      positions.push(...corner);
      colors.push(...tint);
      uvs.push(index === 1 || index === 2 ? width / 2 : 0, index >= 2 ? height / 2 : 0);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  function build() {
    const group = new THREE.Group();
    group.name = 'Moos';
    if (positions.length === 0) return group;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = getMaterial('moss', {
      vertexColors: true,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    group.add(new THREE.Mesh(geometry, material));
    return group;
  }

  return { add, build };
}
