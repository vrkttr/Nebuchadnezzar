import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZONE_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'zones');
const COLLISION_LAYER = 'Kollision';
const OVERVIEW_LAYER = 'Karte';
const LOGIC_CLASSES = new Set(['spawn', 'npc', 'gegner', 'teleporter', 'lootkiste', 'questobjekt']);
const SPANNING_KINDS = new Set(['flaeche', 'leitung', 'wald', 'flecken']);
export const CHUNK_SIZE = 64;
const CHUNK_LIMIT = 4096;

export const DEFAULT_ZONE_ID = 'startwelt';

function readProperties(list) {
  return Object.fromEntries((list ?? []).map((property) => [property.name, property.value]));
}

function collectObjects(layers, result = []) {
  for (const layer of layers ?? []) {
    if (layer.type === 'group') collectObjects(layer.layers, result);
    else if (layer.type === 'objectgroup') {
      for (const object of layer.objects ?? []) result.push({ layer: layer.name, object });
    }
  }
  return result;
}

function loadZone(id, file) {
  let map;
  try {
    map = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Zonendatei ${file} konnte nicht gelesen werden: ${error.message}`);
  }

  const unit = map.tilewidth;
  if (!unit || unit !== map.tileheight) throw new Error('Zonendatei: Kacheln müssen quadratisch sein (1 Kachel = 1 m).');

  const width = map.width;
  const height = map.height;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const mapProperties = readProperties(map.properties);

  const zone = {
    id,
    name: mapProperties.name ?? id,
    indoor: Boolean(mapProperties.innen),
    lighting: {
      ambient: Number(mapProperties.licht ?? 1),
      sun: Number(mapProperties.sonne ?? 1),
      background: mapProperties.hintergrund ?? null,
      fog: mapProperties.nebel ?? null,
    },
    width,
    height,
    halfWidth,
    halfHeight,
    groundTexture: mapProperties.groundTexture ?? 'grass',
    groundColor: mapProperties.groundColor ?? '#ffffff',
    chunked: Boolean(mapProperties.chunked),
    fog: mapProperties.nebel ?? null,
    overview: [],
    chunks: new Map(),
    spawn: null,
    spawns: {},
    teleporters: [],
    chests: [],
    questObjects: [],
    colliders: [],
    waters: [],
    npcs: [],
    enemies: [],
    visuals: [],
  };

  for (const { layer, object } of collectObjects(map.layers)) {
    const kind = String(object.class ?? object.type ?? '').toLowerCase();
    const props = readProperties(object.properties);
    const rotation = ((object.rotation ?? 0) * Math.PI) / 180;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const toWorld = (px, py) => ({ x: px / unit - halfWidth, z: py / unit - halfHeight });
    const rotated = (px, py) => toWorld(object.x + px * cos - py * sin, object.y + px * sin + py * cos);

    let shape = 'rect';
    let center;
    let points = null;
    const objectWidth = (object.width ?? 0) / unit;
    const objectHeight = (object.height ?? 0) / unit;

    if (object.point) {
      shape = 'point';
      center = toWorld(object.x, object.y);
    } else if (object.polyline || object.polygon) {
      shape = object.polyline ? 'polyline' : 'polygon';
      points = (object.polyline ?? object.polygon).map((point) => {
        const world = rotated(point.x, point.y);
        return [world.x, world.z];
      });
      center = toWorld(object.x, object.y);
    } else {
      if (object.ellipse) shape = 'ellipse';
      center = rotated((object.width ?? 0) / 2, (object.height ?? 0) / 2);
    }

    const rotationY = -rotation;

    if (layer === OVERVIEW_LAYER) {
      if (shape !== 'rect') throw new Error(`Zonendatei ${id}: Kartenobjekt ${object.id} muss ein Rechteck sein.`);
      zone.overview.push({ x: center.x, z: center.z, width: objectWidth, height: objectHeight, rotation: rotationY, color: String(props.color ?? '#6b6558'), label: props.label ? String(props.label) : null });
      continue;
    }

    if (layer === COLLISION_LAYER) {
      if (shape === 'rect') {
        zone.colliders.push({ shape: 'box', x: center.x, z: center.z, halfX: objectWidth / 2, halfZ: objectHeight / 2, rotation: rotationY, cameraHeight: Number(props.kamera) || 0 });
      } else if (shape === 'ellipse') {
        zone.colliders.push({ shape: 'circle', x: center.x, z: center.z, radius: objectWidth / 2 });
      } else {
        throw new Error(`Zonendatei: Kollisionsobjekt ${object.id} muss ein Rechteck oder eine Ellipse sein.`);
      }
      continue;
    }

    if (!kind) continue;

    if (LOGIC_CLASSES.has(kind)) {
      if (kind === 'spawn') {
        const spawn = { x: center.x, y: 0, z: center.z, rotationY };
        if (props.id) zone.spawns[props.id] = spawn;
        if (!props.id || !zone.spawn) zone.spawn = spawn;
      } else if (kind === 'teleporter') {
        zone.teleporters.push({
          id: String(props.id),
          x: center.x,
          z: center.z,
          width: objectWidth,
          depth: objectHeight,
          height: Number(props.hoehe) || 2.5,
          rotation: rotationY,
          zone: String(props.zone),
          spawn: String(props.spawn),
          label: props.label ?? 'Tür',
        });
      } else if (kind === 'lootkiste') {
        if (!props.id) throw new Error(`Zonendatei ${id}: Lootkiste ${object.id} braucht die Eigenschaft "id".`);
        if (zone.chests.some((chest) => chest.id === String(props.id))) throw new Error(`Zonendatei ${id}: Lootkiste "${props.id}" ist doppelt vergeben.`);
        zone.chests.push({
          id: String(props.id),
          x: center.x,
          z: center.z,
          rotationY,
          lootTable: String(props.loot ?? 'chest_common'),
          name: props.name ?? 'Versteckte Kiste',
        });
      } else if (kind === 'questobjekt') {
        if (!props.id) throw new Error(`Zonendatei ${id}: Questobjekt ${object.id} braucht die Eigenschaft "id".`);
        if (zone.questObjects.some((entry) => entry.id === String(props.id))) throw new Error(`Zonendatei ${id}: Questobjekt "${props.id}" ist doppelt vergeben.`);
        zone.questObjects.push({
          id: String(props.id),
          x: center.x,
          z: center.z,
          rotationY,
          model: String(props.modell ?? 'dokument'),
          name: String(props.name ?? 'Fundstück'),
        });
      } else if (kind === 'npc') {
        zone.npcs.push({ npcId: props.npcId, x: center.x, z: center.z, rotationY, props });
      } else {
        zone.enemies.push({ type: props.type, level: Number(props.level), healthMax: props.healthMax, x: center.x, z: center.z, props });
      }
      continue;
    }

    if (kind === 'wasser' && shape === 'rect' && !props.rinne) {
      zone.waters.push({ x0: center.x - objectWidth / 2, x1: center.x + objectWidth / 2, z0: center.z - objectHeight / 2, z1: center.z + objectHeight / 2, depth: Number(props.tiefe) || 0.3 });
    }

    zone.visuals.push({
      kind,
      x: center.x,
      z: center.z,
      rotation: rotationY,
      width: objectWidth,
      height: objectHeight,
      shape,
      points,
      props,
    });
  }

  if (!zone.spawn) throw new Error('Zonendatei: Es fehlt ein Objekt der Klasse "spawn".');
  if (zone.chunked) buildChunks(zone);
  return zone;
}

function chunkIndex(value, half) {
  return Math.floor((value + half) / CHUNK_SIZE);
}

function chunkKey(cx, cz) {
  return cx * CHUNK_LIMIT + cz;
}

function visualBounds(visual) {
  if (visual.points?.length) {
    const xs = visual.points.map((point) => point[0]);
    const zs = visual.points.map((point) => point[1]);
    return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  }

  const cos = Math.abs(Math.cos(visual.rotation));
  const sin = Math.abs(Math.sin(visual.rotation));
  const halfX = (cos * visual.width + sin * visual.height) / 2;
  const halfZ = (sin * visual.width + cos * visual.height) / 2;
  return [visual.x - halfX, visual.z - halfZ, visual.x + halfX, visual.z + halfZ];
}

function chunkAt(zone, cx, cz) {
  const key = chunkKey(cx, cz);
  let chunk = zone.chunks.get(key);
  if (!chunk) {
    chunk = { cx, cz, objects: [], blockers: [] };
    zone.chunks.set(key, chunk);
  }
  return chunk;
}

function forEachChunk(zone, bounds, callback) {
  const minX = Math.max(0, chunkIndex(bounds[0], zone.halfWidth));
  const maxX = Math.min(Math.ceil(zone.width / CHUNK_SIZE) - 1, chunkIndex(bounds[2], zone.halfWidth));
  const minZ = Math.max(0, chunkIndex(bounds[1], zone.halfHeight));
  const maxZ = Math.min(Math.ceil(zone.height / CHUNK_SIZE) - 1, chunkIndex(bounds[3], zone.halfHeight));

  for (let cx = minX; cx <= maxX; cx += 1) {
    for (let cz = minZ; cz <= maxZ; cz += 1) callback(chunkAt(zone, cx, cz));
  }
}

function buildChunks(zone) {
  if (zone.width / CHUNK_SIZE > CHUNK_LIMIT || zone.height / CHUNK_SIZE > CHUNK_LIMIT) throw new Error(`Zonendatei ${zone.id}: Zone ist zu groß für das Chunk-Raster.`);

  zone.visuals.forEach((visual, index) => {
    visual.id = index;
    if (SPANNING_KINDS.has(visual.kind)) {
      forEachChunk(zone, visualBounds(visual), (chunk) => chunk.objects.push(visual));
    } else {
      forEachChunk(zone, [visual.x, visual.z, visual.x, visual.z], (chunk) => chunk.objects.push(visual));
    }
  });

  let blockerId = 0;
  for (const collider of zone.colliders) {
    if (!(collider.cameraHeight > 0)) continue;
    const blocker = collider.shape === 'circle' ? null : { id: blockerId, x: collider.x, z: collider.z, halfX: collider.halfX, halfZ: collider.halfZ, rotation: collider.rotation, height: collider.cameraHeight };
    blockerId += 1;
    if (!blocker) continue;
    const cos = Math.abs(Math.cos(blocker.rotation));
    const sin = Math.abs(Math.sin(blocker.rotation));
    const halfX = cos * blocker.halfX + sin * blocker.halfZ;
    const halfZ = sin * blocker.halfX + cos * blocker.halfZ;
    forEachChunk(zone, [blocker.x - halfX, blocker.z - halfZ, blocker.x + halfX, blocker.z + halfZ], (chunk) => chunk.blockers.push(blocker));
  }
}

const ZONES = new Map();

for (const file of readdirSync(ZONE_DIRECTORY).filter((name) => name.endsWith('.tmj')).sort()) {
  const id = basename(file, '.tmj');
  ZONES.set(id, loadZone(id, join(ZONE_DIRECTORY, file)));
}

if (!ZONES.has(DEFAULT_ZONE_ID)) throw new Error(`Zonendatei: Die Standardzone "${DEFAULT_ZONE_ID}" fehlt.`);

for (const zone of ZONES.values()) {
  for (const teleporter of zone.teleporters) {
    const target = ZONES.get(teleporter.zone);
    if (!target) throw new Error(`Zonendatei ${zone.id}: Teleporter "${teleporter.id}" verweist auf die unbekannte Zone "${teleporter.zone}".`);
    if (!target.spawns[teleporter.spawn]) throw new Error(`Zonendatei ${zone.id}: Teleporter "${teleporter.id}" verweist auf den unbekannten Spawnpunkt "${teleporter.spawn}".`);
  }
}

export function waterDepthAt(zone, x, z) {
  let depth = 0;
  for (const water of zone.waters) {
    if (x >= water.x0 && x <= water.x1 && z >= water.z0 && z <= water.z1) depth = Math.max(depth, water.depth);
  }
  return depth;
}

export function getZone(zoneId) {
  return ZONES.get(zoneId) ?? null;
}

export function getZones() {
  return Array.from(ZONES.values());
}

export function serializeChunk(zone, cx, cz) {
  const chunk = zone.chunks.get(chunkKey(cx, cz));
  return {
    cx,
    cz,
    objects: chunk ? chunk.objects.map(({ id: objectId, kind, x, z, rotation, width, height, shape, points, props }) => ({ id: objectId, kind, x, z, rotation, width, height, shape, points, props })) : [],
    blockers: chunk ? chunk.blockers : [],
  };
}

export function serializeZone(zone) {
  if (zone.chunked) {
    return {
      id: zone.id,
      name: zone.name,
      indoor: zone.indoor,
      lighting: { ...zone.lighting, fog: zone.fog },
      width: zone.width,
      height: zone.height,
      groundTexture: zone.groundTexture,
      groundColor: zone.groundColor,
      spawn: zone.spawn,
      chunked: true,
      chunkSize: CHUNK_SIZE,
      objects: [],
      overview: zone.overview,
      teleporters: zone.teleporters.map(({ id, x, z, width, depth, height, rotation, label }) => ({ id, x, z, width, depth, height, rotation, label })),
      cameraBlockers: [],
    };
  }

  return {
    id: zone.id,
    name: zone.name,
    indoor: zone.indoor,
    lighting: zone.lighting,
    width: zone.width,
    height: zone.height,
    groundTexture: zone.groundTexture,
    groundColor: zone.groundColor,
    spawn: zone.spawn,
    objects: zone.visuals,
    teleporters: zone.teleporters.map(({ id, x, z, width, depth, height, rotation, label }) => ({ id, x, z, width, depth, height, rotation, label })),
    cameraBlockers: zone.colliders
      .filter((collider) => collider.cameraHeight > 0)
      .map(({ x, z, halfX, halfZ, rotation, cameraHeight }) => ({ x, z, halfX, halfZ, rotation, height: cameraHeight })),
  };
}
