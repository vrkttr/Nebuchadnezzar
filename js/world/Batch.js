import * as THREE from 'three';

const matrix = new THREE.Matrix4();
const normalMatrix = new THREE.Matrix3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scaleVector = new THREE.Vector3();
const positionVector = new THREE.Vector3();
const vertex = new THREE.Vector3();

export function tileBoxUv(geometry, width, height, depth, tile) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i) + width / 2;
    const y = position.getY(i) + height / 2;
    const z = position.getZ(i) + depth / 2;
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);

    if (Math.abs(nx) > 0.5) {
      uv.setXY(i, (nx > 0 ? depth - z : z) / tile, y / tile);
    } else if (Math.abs(nz) > 0.5) {
      uv.setXY(i, (nz > 0 ? x : width - x) / tile, y / tile);
    } else {
      uv.setXY(i, x / tile, z / tile);
    }
  }

  uv.needsUpdate = true;
  return geometry;
}

export function scaleUv(geometry, sx, sy) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  return geometry;
}

export function tiledBox(width, height, depth, tile = 2) {
  return tileBoxUv(new THREE.BoxGeometry(width, height, depth), width, height, depth, tile);
}

export function createBatch() {
  const buckets = new Map();

  function bucketFor(material) {
    if (!buckets.has(material)) {
      buckets.set(material, { positions: [], normals: [], uvs: [], indices: [], material });
    }
    return buckets.get(material);
  }

  function add(material, geometry, options = {}) {
    const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = options;

    euler.set(rx, ry, rz, 'YXZ');
    quaternion.setFromEuler(euler);
    positionVector.set(x, y, z);
    scaleVector.set(sx, sy, sz);
    matrix.compose(positionVector, quaternion, scaleVector);
    normalMatrix.getNormalMatrix(matrix);

    const bucket = bucketFor(material);
    const offset = bucket.positions.length / 3;
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    const uv = geometry.attributes.uv;

    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(matrix);
      bucket.positions.push(vertex.x, vertex.y, vertex.z);
      vertex.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
      bucket.normals.push(vertex.x, vertex.y, vertex.z);
      bucket.uvs.push(uv.getX(i), uv.getY(i));
    }

    const index = geometry.index;
    if (index) {
      for (let i = 0; i < index.count; i += 1) bucket.indices.push(index.getX(i) + offset);
    } else {
      for (let i = 0; i < position.count; i += 1) bucket.indices.push(i + offset);
    }
  }

  function box(material, width, height, depth, options = {}) {
    const { tile = 2, ...placement } = options;
    add(material, tiledBox(width, height, depth, tile), placement);
  }

  function cylinder(material, radiusTop, radiusBottom, height, segments, options = {}) {
    const { repeatX = 1, repeatY = 1, ...placement } = options;
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1);
    add(material, scaleUv(geometry, repeatX, repeatY), placement);
  }

  function cone(material, radius, height, segments, options = {}) {
    add(material, new THREE.ConeGeometry(radius, height, segments, 1), options);
  }

  function quad(material, width, height, options = {}) {
    const { repeatX = 1, repeatY = 1, ...placement } = options;
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * repeatX, uv.getY(i) * repeatY);
    add(material, geometry, placement);
  }

  function blob(material, radius, detail, options = {}) {
    add(material, new THREE.IcosahedronGeometry(radius, detail), options);
  }

  function build(name) {
    const group = new THREE.Group();
    if (name) group.name = name;

    for (const bucket of buckets.values()) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(bucket.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(bucket.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(bucket.uvs, 2));
      geometry.setIndex(bucket.indices);
      geometry.computeBoundingSphere();
      group.add(new THREE.Mesh(geometry, bucket.material));
    }

    return group;
  }

  return { add, box, cylinder, cone, quad, blob, build };
}
