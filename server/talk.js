import { getNpcsOfZone } from './npcs.js';
import { getAmbient } from './ambient.js';

export const SPEECH_RANGE = 26;

const POOL_SIZES = { wirr: 14, lore: 14, flugzeug: 12 };
const PLANE_NPC = { zone: 'startwelt', npcId: 'streuner' };
const COOLDOWN = {
  planeNpc: [20, 50],
  npc: [35, 90],
  citizen: [50, 130],
  dog: [100, 260],
};
const FIRST_DELAY_SHARE = 0.5;
const CHECK_INTERVAL = 0.4;

const timers = new Map();
const lastKeys = new Map();
const accumulators = new Map();

function between([min, max]) {
  return min + Math.random() * (max - min);
}

function pickKey(speakerKey, pool) {
  const size = POOL_SIZES[pool];
  let index = 1 + Math.floor(Math.random() * size);
  const last = lastKeys.get(speakerKey);
  if (last === `${pool}.${index}`) index = (index % size) + 1;
  lastKeys.set(speakerKey, `${pool}.${index}`);
  return `speech.${pool}.${index}`;
}

function describe(zoneId, speaker) {
  if (speaker.source === 'npc') {
    if (zoneId === PLANE_NPC.zone && speaker.id === PLANE_NPC.npcId) return { cooldown: COOLDOWN.planeNpc, pool: () => 'flugzeug' };
    return { cooldown: COOLDOWN.npc, pool: () => (Math.random() < 0.5 ? 'wirr' : 'lore') };
  }
  if (speaker.kind === 'citizen') return { cooldown: COOLDOWN.citizen, pool: () => (Math.random() < 0.5 ? 'wirr' : 'lore') };
  if (speaker.kind === 'dog') return { cooldown: COOLDOWN.dog, pool: () => null };
  return null;
}

function collectSpeakers(zoneId) {
  const speakers = getNpcsOfZone(zoneId).map((npc) => ({ source: 'npc', id: npc.id, x: npc.x, z: npc.z }));
  for (const entity of getAmbient(zoneId).values()) {
    if (entity.hidden || (entity.kind !== 'citizen' && entity.kind !== 'dog')) continue;
    speakers.push({ source: 'ambient', id: entity.id, kind: entity.kind, x: entity.x, z: entity.z });
  }
  return speakers;
}

export function updateSpeech(zoneId, zonePlayers, delta, notify) {
  if (zonePlayers.size === 0) return;

  const accumulated = (accumulators.get(zoneId) ?? 0) + delta;
  if (accumulated < CHECK_INTERVAL) {
    accumulators.set(zoneId, accumulated);
    return;
  }
  accumulators.set(zoneId, 0);

  for (const speaker of collectSpeakers(zoneId)) {
    const rules = describe(zoneId, speaker);
    if (!rules) continue;

    const listeners = [];
    for (const [playerId, player] of zonePlayers) {
      if (Math.hypot(player.x - speaker.x, player.z - speaker.z) <= SPEECH_RANGE) listeners.push(playerId);
    }
    if (listeners.length === 0) continue;

    const key = `${zoneId}:${speaker.source}:${speaker.id}`;
    if (!timers.has(key)) timers.set(key, between(rules.cooldown) * FIRST_DELAY_SHARE * Math.random());
    const remaining = timers.get(key) - accumulated;
    if (remaining > 0) {
      timers.set(key, remaining);
      continue;
    }
    timers.set(key, between(rules.cooldown));

    const pool = rules.pool();
    const text = pool ? pickKey(key, pool) : 'speech.wuff';
    const payload = { type: 'speech', source: speaker.source, id: speaker.id, key: text };
    for (const playerId of listeners) notify(playerId, payload);
  }
}
