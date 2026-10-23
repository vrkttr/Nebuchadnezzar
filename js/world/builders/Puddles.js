import * as THREE from 'three';
import { createRandom } from '../Random.js';

function createPuddleTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const body = context.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
  body.addColorStop(0, 'rgba(255,255,255,1)');
  body.addColorStop(0.7, 'rgba(235,240,245,0.95)');
  body.addColorStop(0.92, 'rgba(180,190,200,0.5)');
  body.addColorStop(1, 'rgba(160,170,180,0)');
  context.fillStyle = body;
  context.beginPath();
  context.ellipse(size / 2, size / 2, size * 0.48, size * 0.4, 0, 0, Math.PI * 2);
  context.fill();
  context.globalCompositeOperation = 'source-atop';
  const streak = context.createLinearGradient(0, size * 0.25, 0, size * 0.55);
  streak.addColorStop(0, 'rgba(255,255,255,0.7)');
  streak.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = streak;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const puddleMaterial = new THREE.MeshBasicMaterial({
  map: createPuddleTexture(),
  color: 0x6f7a80,
  transparent: true,
  opacity: 0.72,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -6,
  polygonOffsetUnits: -6,
});

let exclusions = [];

export function setPuddleExclusions(list) {
  exclusions = (list ?? []).map((entry) => ({ x: entry.x, z: entry.z, radius: (entry.width ?? 6) / 2 + 9 }));
}

function blocked(x, z) {
  return exclusions.some((entry) => Math.hypot(entry.x - x, entry.z - z) < entry.radius);
}

const SPACING = 22;

export function buildPuddles(points, width, y) {
  const random = createRandom(Math.floor(Math.abs(points[0][0] * 31 + points[0][1] * 17 + points.length * 7)) + 11);
  const positions = [];
  const uvs = [];
  const indices = [];
  const usable = width / 2 - 1.6;
  if (usable < 0.6) return null;

  let carried = random.range(0, SPACING * 0.6);
  for (let i = 0; i < points.length - 1; i += 1) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const length = Math.hypot(bx - ax, bz - az);
    if (length < 0.01) continue;
    const dx = (bx - ax) / length;
    const dz = (bz - az) / length;
    let along = carried;
    while (along < length) {
      const lateral = random.range(-usable, usable);
      const radiusX = random.range(0.55, 1.5);
      const radiusZ = radiusX * random.range(0.55, 0.9);
      const x = ax + dx * along - dz * lateral;
      const z = az + dz * along + dx * lateral;
      if (!blocked(x, z) && random.next() < 0.7) {
        const angle = Math.atan2(dz, dx) + random.range(-0.3, 0.3);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const base = positions.length / 3;
        for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const lx = u * radiusX;
          const lz = v * radiusZ;
          positions.push(x + lx * cos - lz * sin, y, z + lx * sin + lz * cos);
          uvs.push((u + 1) / 2, (v + 1) / 2);
        }
        indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      }
      along += SPACING * random.range(0.6, 1.4);
    }
    carried = along - length;
  }

  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, puddleMaterial);
  mesh.renderOrder = 7000;
  mesh.name = 'Pfuetzen';
  return mesh;
}
