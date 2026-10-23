import { getZones } from './zoneLoader.js';
import { PLAYER_RADIUS, resolveCollisions } from './world.js';

export const TRAIN_ACCELERATION = 1.2;
export const LOCO_LENGTH = 6;
export const WAGON_LENGTH = 8;
export const WAGON_WIDTH = 3.2;
export const COUPLING_GAP = 1.5;
const BOARD_MAX_SPEED = 2.5;
const BOARD_MAX_HEIGHT = 1.2;
const RIDE_MAX_HEIGHT = 3;
const STOP_MATCH_DISTANCE = 2;
const SAMPLE_STEP = 0.5;

const trains = new Map();

function buildPath(points) {
  const closed = [...points];
  const first = closed[0];
  const last = closed[closed.length - 1];
  if (Math.hypot(first[0] - last[0], first[1] - last[1]) > 0.01) closed.push([first[0], first[1]]);
  const cumulative = [0];
  for (let index = 1; index < closed.length; index += 1) {
    cumulative.push(cumulative[index - 1] + Math.hypot(closed[index][0] - closed[index - 1][0], closed[index][1] - closed[index - 1][1]));
  }
  return { points: closed, cumulative, length: cumulative[cumulative.length - 1] };
}

function pointAt(path, distance) {
  const s = ((distance % path.length) + path.length) % path.length;
  let low = 0;
  let high = path.cumulative.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (path.cumulative[middle] <= s) low = middle;
    else high = middle;
  }
  const a = path.points[low];
  const b = path.points[low + 1];
  const segment = path.cumulative[low + 1] - path.cumulative[low];
  const t = segment > 0 ? (s - path.cumulative[low]) / segment : 0;
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz) || 1;
  return { x: a[0] + dx * t, z: a[1] + dz * t, yaw: Math.atan2(dx / length, dz / length) };
}

function findStopArcs(path, stops) {
  const arcs = [];
  for (const stop of stops) {
    let best = null;
    for (let s = 0; s < path.length; s += SAMPLE_STEP) {
      const point = pointAt(path, s);
      const distance = Math.hypot(point.x - stop.x, point.z - stop.z);
      if (distance <= STOP_MATCH_DISTANCE) {
        if (!best || distance < best.distance) best = { s, distance };
      } else if (best) {
        break;
      }
    }
    if (best) arcs.push({ id: stop.id, name: stop.name, s: best.s });
  }
  arcs.sort((a, b) => a.s - b.s);
  return arcs;
}

function travelProfile(distance, maxSpeed) {
  const rampDistance = (maxSpeed * maxSpeed) / TRAIN_ACCELERATION;
  if (distance >= rampDistance) {
    const ramp = maxSpeed / TRAIN_ACCELERATION;
    const cruise = (distance - rampDistance) / maxSpeed;
    return { ramp, cruise, peak: maxSpeed, duration: ramp * 2 + cruise };
  }
  const ramp = Math.sqrt(distance / TRAIN_ACCELERATION);
  return { ramp, cruise: 0, peak: TRAIN_ACCELERATION * ramp, duration: ramp * 2 };
}

function profileAt(profile, tau) {
  const a = TRAIN_ACCELERATION;
  if (tau <= profile.ramp) return { distance: 0.5 * a * tau * tau, speed: a * tau };
  const rampDistance = 0.5 * a * profile.ramp * profile.ramp;
  if (tau <= profile.ramp + profile.cruise) {
    return { distance: rampDistance + profile.peak * (tau - profile.ramp), speed: profile.peak };
  }
  const rest = profile.duration - tau;
  const total = rampDistance * 2 + profile.peak * profile.cruise;
  return { distance: total - 0.5 * a * rest * rest, speed: a * rest };
}

function buildTrain(zone) {
  const config = zone.train;
  const path = buildPath(config.points);
  const arcs = findStopArcs(path, zone.trainStops);
  if (arcs.length < 2) throw new Error(`Zone ${zone.id}: Die Zugstrecke braucht mindestens zwei erreichbare Haltestellen.`);

  const segments = [];
  let clock = 0;
  for (let index = 0; index < arcs.length; index += 1) {
    const from = arcs[index];
    const to = arcs[(index + 1) % arcs.length];
    const distance = index === arcs.length - 1 ? path.length - from.s + to.s : to.s - from.s;
    const profile = travelProfile(distance, config.speed);
    segments.push({
      stop: from,
      distance,
      profile,
      dwellStart: clock,
      moveStart: clock + config.dwell,
      end: clock + config.dwell + profile.duration,
    });
    clock += config.dwell + profile.duration;
  }

  const wagons = Math.max(1, config.wagons);
  const total = LOCO_LENGTH + wagons * WAGON_LENGTH + wagons * COUPLING_GAP;
  return { zoneId: zone.id, config, path, arcs, segments, cycle: clock, wagons, total, previous: null };
}

export function initTrains() {
  trains.clear();
  for (const zone of getZones()) {
    if (zone.train) trains.set(zone.id, buildTrain(zone));
  }
}

export function hasTrain(zoneId) {
  return trains.has(zoneId);
}

function stateAt(train, nowSeconds) {
  const time = ((nowSeconds % train.cycle) + train.cycle) % train.cycle;
  let segment = train.segments.find((candidate) => time < candidate.end) ?? train.segments[train.segments.length - 1];
  if (time < segment.moveStart) {
    const left = segment.moveStart - time;
    return {
      s: segment.stop.s,
      speed: 0,
      moving: false,
      stopId: segment.stop.id,
      stopName: segment.stop.name,
      honking: left <= train.config.honk,
    };
  }
  const { distance, speed } = profileAt(segment.profile, time - segment.moveStart);
  return { s: segment.stop.s + distance, speed, moving: true, stopId: null, stopName: null, honking: false };
}

function layout(train, centerS) {
  const frontCenter = centerS + train.total / 2 - LOCO_LENGTH / 2;
  const parts = [];
  const locoPoint = pointAt(train.path, frontCenter);
  parts.push({ kind: 'loco', length: LOCO_LENGTH, ...locoPoint });
  for (let index = 0; index < train.wagons; index += 1) {
    const offset = LOCO_LENGTH / 2 + COUPLING_GAP + WAGON_LENGTH / 2 + index * (WAGON_LENGTH + COUPLING_GAP);
    parts.push({ kind: 'wagon', length: WAGON_LENGTH, ...pointAt(train.path, frontCenter - offset) });
  }
  return parts;
}

function toLocal(part, x, z) {
  const dx = x - part.x;
  const dz = z - part.z;
  const cos = Math.cos(part.yaw);
  const sin = Math.sin(part.yaw);
  return { lx: dx * cos - dz * sin, lz: dx * sin + dz * cos };
}

function toWorld(part, lx, lz) {
  const cos = Math.cos(part.yaw);
  const sin = Math.sin(part.yaw);
  return { x: part.x + lx * cos + lz * sin, z: part.z - lx * sin + lz * cos };
}

function onDeck(part, lx, lz, margin) {
  return Math.abs(lx) <= WAGON_WIDTH / 2 + margin && Math.abs(lz) <= part.length / 2 + margin;
}

export function updateTrain(zoneId, zonePlayers, nowSeconds) {
  const train = trains.get(zoneId);
  if (!train) return null;

  const current = stateAt(train, nowSeconds);
  const parts = layout(train, current.s);
  const previous = train.previous ?? parts;

  for (const state of zonePlayers.values()) {
    if (state.dead) {
      state.trainRide = null;
      continue;
    }

    if (state.trainRide) {
      const oldPart = previous[state.trainRide.index];
      const newPart = parts[state.trainRide.index];
      const { lx, lz } = toLocal(oldPart, state.x, state.z);
      if (state.y <= RIDE_MAX_HEIGHT && onDeck(oldPart, lx, lz, 0.4)) {
        const world = toWorld(newPart, lx, lz);
        state.x = world.x;
        state.z = world.z;
        resolveCollisions(state, PLAYER_RADIUS);
        continue;
      }
      state.trainRide = null;
    }

    if (current.speed > BOARD_MAX_SPEED || state.y > BOARD_MAX_HEIGHT) continue;
    for (let index = 1; index < parts.length; index += 1) {
      const { lx, lz } = toLocal(parts[index], state.x, state.z);
      if (onDeck(parts[index], lx, lz, 0)) {
        state.trainRide = { index };
        break;
      }
    }
  }

  train.previous = parts;
  return { ...current, parts };
}

export function serializeTrainState(info) {
  return {
    type: 'train',
    s: Math.round(info.s * 100) / 100,
    speed: Math.round(info.speed * 100) / 100,
    honking: info.honking,
    stop: info.stopName,
  };
}

export function trainCycle(zoneId) {
  return trains.get(zoneId)?.cycle ?? 0;
}
