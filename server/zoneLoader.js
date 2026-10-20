import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ZONE_FILE = process.env.ZONE_FILE ?? join(dirname(fileURLToPath(import.meta.url)), 'zones', 'startwelt.tmj');
const COLLISION_LAYER = 'Kollision';
const LOGIC_CLASSES = new Set(['spawn', 'npc', 'gegner']);

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

function loadZone(file) {
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
    name: mapProperties.name ?? 'zone',
    width,
    height,
    halfWidth,
    halfHeight,
    groundTexture: mapProperties.groundTexture ?? 'grass',
    groundColor: mapProperties.groundColor ?? '#ffffff',
    spawn: null,
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
        zone.colliders.push({ shape: 'box', x: center.x, z: center.z, halfX: objectWidth / 2, halfZ: objectHeight / 2, rotation: rotationY });
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
        zone.spawn = { x: center.x, y: 0, z: center.z };
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

export const zone = loadZone(ZONE_FILE);

export function serializeZone() {
  return {
    name: zone.name,
    width: zone.width,
    height: zone.height,
    groundTexture: zone.groundTexture,
    groundColor: zone.groundColor,
    spawn: zone.spawn,
    objects: zone.visuals,
  };
}
