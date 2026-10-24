import { getItem } from './items.js';
import { addItem, cloneInventory, sendInventory } from './inventory.js';
import { addGold } from './loot.js';
import { applyLevelStats, xpToNextLevel } from './progression.js';
import { getZone, getZones } from './zoneLoader.js';

const ADMIN_NAMES = new Set(
  (process.env.ADMIN_CHARACTERS ?? 'PROPELLA')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
);
const MAX_SPAWN_QUANTITY = 999;
const MAX_ANNOUNCE_LENGTH = 200;
const MAX_ADMIN_LEVEL = 100;

export function adminNames() {
  return Array.from(ADMIN_NAMES);
}

export function isAdminName(name) {
  return typeof name === 'string' && ADMIN_NAMES.has(name.toLowerCase());
}

function say(notify, playerId, key, params = {}) {
  notify(playerId, { type: 'chat', channel: 'system', key, params, text: key });
}

function findByName(players, name) {
  if (typeof name !== 'string') return null;
  const wanted = name.trim().toLowerCase();
  for (const [id, state] of players) {
    if (state.characterName.toLowerCase() === wanted) return { id, state };
  }
  return null;
}

function serializeZones() {
  return getZones().map((zone) => ({ id: zone.id, name: zone.name ?? zone.id, spawns: Object.keys(zone.spawns ?? {}) }));
}

function sendOverview(ctx, playerId) {
  const list = [];
  for (const [id, state] of ctx.players) {
    list.push({ id, name: state.characterName, level: state.level, zone: state.zoneId, x: Math.round(state.x), z: Math.round(state.z) });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  ctx.notify(playerId, { type: 'admin-overview', players: list, zones: serializeZones() });
}

function toInt(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isInteger(number)) return null;
  return Math.max(min, Math.min(max, number));
}

function teleport(ctx, id, state, zoneId, spawnId, position) {
  if (state.zoneId === zoneId && position) {
    state.x = position.x;
    state.y = position.y;
    state.z = position.z;
    state.velocityY = 0;
    state.isGrounded = false;
    state.trainRide = null;
    state.input.moveX = 0;
    state.input.moveZ = 0;
    state.dataVersion += 1;
    return true;
  }

  const zone = getZone(zoneId);
  if (!zone || (spawnId && !zone.spawns?.[spawnId])) return false;
  ctx.changeZone(id, state, zoneId, spawnId ?? null, position ?? null);
  return true;
}

export function handleAdmin(ctx, id, state, message) {
  if (!state?.isAdmin || typeof message.type !== 'string') return;

  const { players, notify } = ctx;

  switch (message.type) {
    case 'admin-overview':
      sendOverview(ctx, id);
      return;

    case 'admin-spawn': {
      const item = typeof message.itemId === 'string' ? getItem(message.itemId) : null;
      const quantity = toInt(message.quantity ?? 1, 1, MAX_SPAWN_QUANTITY);
      if (!item || quantity === null) return say(notify, id, 'admin.fail.item');

      const trial = cloneInventory(state.inventory);
      if (addItem(trial, item.id, quantity) > 0) return say(notify, id, 'admin.fail.inventoryFull');

      addItem(state.inventory, item.id, quantity);
      sendInventory(notify, id, state);
      return say(notify, id, 'admin.ok.spawn', { item: item.id, quantity });
    }

    case 'admin-gold': {
      const amount = toInt(message.amount, -1000000000, 1000000000);
      if (amount === null) return;
      addGold(state, amount);
      return say(notify, id, 'admin.ok.gold', { amount, gold: state.gold });
    }

    case 'admin-level': {
      const level = toInt(message.level, 1, MAX_ADMIN_LEVEL);
      if (level === null) return;
      state.level = level;
      state.xp = 0;
      applyLevelStats(state);
      state.health = state.healthMax;
      state.resource = state.resourceMax;
      return say(notify, id, 'admin.ok.level', { level, xp: xpToNextLevel(level) });
    }

    case 'admin-heal': {
      state.dead = false;
      state.health = state.healthMax;
      state.resource = state.resourceMax;
      return say(notify, id, 'admin.ok.heal');
    }

    case 'admin-announce': {
      const text = typeof message.text === 'string' ? message.text.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_ANNOUNCE_LENGTH) : '';
      if (!text) return;
      for (const playerId of players.keys()) notify(playerId, { type: 'chat', channel: 'system', key: 'admin.announceLine', params: { text }, text });
      return;
    }

    case 'admin-kick': {
      const target = findByName(players, message.name);
      if (!target) return say(notify, id, 'admin.fail.player', { name: String(message.name ?? '') });
      if (target.id === id) return say(notify, id, 'admin.fail.self');
      notify(target.id, { type: 'kicked' });
      ctx.kick(target.id);
      return say(notify, id, 'admin.ok.kick', { name: target.state.characterName });
    }

    case 'admin-tp-to': {
      const target = findByName(players, message.name);
      if (!target) return say(notify, id, 'admin.fail.player', { name: String(message.name ?? '') });
      teleport(ctx, id, state, target.state.zoneId, null, { x: target.state.x + 1.5, y: target.state.y, z: target.state.z, rotationY: state.rotationY });
      return say(notify, id, 'admin.ok.tpTo', { name: target.state.characterName });
    }

    case 'admin-summon': {
      const target = findByName(players, message.name);
      if (!target) return say(notify, id, 'admin.fail.player', { name: String(message.name ?? '') });
      if (target.id === id) return say(notify, id, 'admin.fail.self');
      teleport(ctx, target.id, target.state, state.zoneId, null, { x: state.x + 1.5, y: state.y, z: state.z, rotationY: target.state.rotationY });
      return say(notify, id, 'admin.ok.summon', { name: target.state.characterName });
    }

    case 'admin-tp-zone': {
      const zone = typeof message.zone === 'string' ? getZone(message.zone) : null;
      if (!zone) return say(notify, id, 'admin.fail.zone');
      const spawnId = typeof message.spawn === 'string' && message.spawn ? message.spawn : null;
      if (!teleport(ctx, id, state, zone.id, spawnId, null)) return say(notify, id, 'admin.fail.zone');
      return say(notify, id, 'admin.ok.tpZone', { zone: zone.id });
    }

    case 'admin-tp-coords': {
      const x = Number(message.x);
      const z = Number(message.z);
      if (!Number.isFinite(x) || !Number.isFinite(z)) return;
      teleport(ctx, id, state, state.zoneId, null, { x, y: ctx.groundHeight(state.zoneId, x, z) + 0.2, z, rotationY: state.rotationY });
      return say(notify, id, 'admin.ok.tpCoords', { x: Math.round(x), z: Math.round(z) });
    }
  }
}
