import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZONE_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'zones');
const COLLISION_LAYER = 'Kollision';
const LOGIC_CLASSES = new Set(['spawn', 'npc', 'gegner', 'teleporter', 'lootkiste']);

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
    spawn: null,
    spawns: {},
    teleporters: [],
    chests: [],
    colliders: [],
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
      } else if (kind === 'npc') {
        zone.npcs.push({ npcId: props.npcId, x: center.x, z: center.z, rotationY, props });
      } else {
        zone.enemies.push({ type: props.type, level: Number(props.level), healthMax: props.healthMax, x: center.x, z: center.z, props });
      }
      continue;
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
  return zone;
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

export function getZone(zoneId) {
  return ZONES.get(zoneId) ?? null;
}

export function getZones() {
  return Array.from(ZONES.values());
}

export function serializeZone(zone) {
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
