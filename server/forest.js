const TRUNK_RADIUS = 0.3;
const WIDE_CLIP = [-1e6, -1e6, 1e6, 1e6];

function createRandom(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min, max) {
    return min + next() * (max - min);
  }

  return { next, range };
}

function cellSeed(seed, i, j, salt) {
  return (Math.imul(seed | 0, 73856093) ^ Math.imul(i, 19349663) ^ Math.imul(j, 83492791) ^ salt) >>> 0;
}

function toWorld(object, localX, localZ) {
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  return { x: object.x + localX * cos + localZ * sin, z: object.z - localX * sin + localZ * cos };
}

function stratified(object, density, margin, random, callback, clip, seed, salt) {
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
      callback(toWorld(object, localX, localZ), cell);
    }
  }
}

export function treeColliders(zone) {
  const result = [];

  for (const visual of zone.visuals) {
    if (visual.kind === 'baum') {
      result.push({ x: visual.x, z: visual.z, radius: TRUNK_RADIUS });
    } else if (visual.kind === 'wald') {
      const props = visual.props ?? {};
      const seed = props.seed ?? 1;
      const random = createRandom(seed);
      const margin = props.rand ?? 0.8;
      const minHeight = props.minHeight ?? 7;
      const maxHeight = props.maxHeight ?? 11;
      const conifers = props.nadelanteil ?? 0.45;

      stratified(visual, props.dichte ?? 12, margin, random, ({ x, z }, cell) => {
        cell.next();
        cell.range(minHeight, maxHeight);
        cell.next();
        result.push({ x, z, radius: TRUNK_RADIUS });
      }, zone.chunked ? WIDE_CLIP : null, seed, 0);
    }
  }

  return result;
}
