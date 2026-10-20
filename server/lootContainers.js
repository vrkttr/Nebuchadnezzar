import { addItem, serializeInventory } from './inventory.js';
import { rollLoot } from './loot.js';

const LOOT_RANGE = 5;
const LOOT_LIFETIME = 120;

let nextLootId = 1;

function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function serializeContainer(container) {
  return {
    id: container.id,
    name: container.name,
    entries: container.entries.map((entry) => ({
      id: entry.id,
      itemId: entry.itemId,
      quantity: entry.quantity,
    })),
  };
}

function fail(notify, playerId, reason) {
  notify(playerId, { type: 'event', kind: 'loot-failed', reason });
  return null;
}

function resolveContainer(containers, playerId, player, lootId, notify) {
  const container = containers.get(lootId);

  if (!container) return fail(notify, playerId, 'gone');
  if (container.ownerId !== playerId) return fail(notify, playerId, 'not-yours');
  if (player.dead) return null;
  if (horizontalDistance(player, container) > LOOT_RANGE) return fail(notify, playerId, 'too-far');

  return container;
}

function takeEntry(container, entry, playerId, player, notify) {
  const remaining = addItem(player.inventory, entry.itemId, entry.quantity);
  const added = entry.quantity - remaining;

  if (added <= 0) return 0;

  player.dataVersion += 1;
  entry.quantity = remaining;
  notify(playerId, { type: 'event', kind: 'item', itemId: entry.itemId, quantity: added });

  if (remaining === 0) {
    container.entries = container.entries.filter((candidate) => candidate !== entry);
  }

  return added;
}

function finishInteraction(containers, container, playerId, player, notify) {
  notify(playerId, { type: 'inventory', slots: serializeInventory(player.inventory) });

  if (container.entries.length === 0) {
    containers.delete(container.id);
    notify(playerId, { type: 'loot-remove', id: container.id });
  } else {
    notify(playerId, { type: 'loot-window', ...serializeContainer(container) });
  }
}

export function createLootContainers() {
  return new Map();
}

export function spawnLootForKill(containers, ownerId, owner, enemy, notify) {
  const drops = rollLoot(enemy.lootTable, owner.level, enemy.level);
  if (drops.length === 0) return;

  const id = `loot-${nextLootId}`;
  nextLootId += 1;

  const container = {
    id,
    ownerId,
    name: enemy.name,
    x: enemy.x,
    y: enemy.y,
    z: enemy.z,
    lifetime: LOOT_LIFETIME,
    entries: drops.map((drop, index) => ({ id: index + 1, ...drop })),
  };

  containers.set(id, container);
  notify(ownerId, { type: 'loot-spawn', id, name: container.name, x: container.x, y: container.y, z: container.z });
}

export function openLoot(containers, playerId, player, lootId, notify) {
  const container = resolveContainer(containers, playerId, player, lootId, notify);
  if (!container) return;

  notify(playerId, { type: 'loot-window', ...serializeContainer(container) });
}

export function takeLootEntry(containers, playerId, player, lootId, entryId, notify) {
  const container = resolveContainer(containers, playerId, player, lootId, notify);
  if (!container) return;

  const entry = container.entries.find((candidate) => candidate.id === entryId);
  if (!entry) return;

  if (takeEntry(container, entry, playerId, player, notify) === 0) {
    notify(playerId, { type: 'event', kind: 'inventory-full' });
    return;
  }

  finishInteraction(containers, container, playerId, player, notify);
}

export function takeAllLoot(containers, playerId, player, lootId, notify) {
  const container = resolveContainer(containers, playerId, player, lootId, notify);
  if (!container) return;

  let tookAny = false;

  for (const entry of [...container.entries]) {
    if (takeEntry(container, entry, playerId, player, notify) > 0) tookAny = true;
  }

  if (container.entries.length > 0) {
    notify(playerId, { type: 'event', kind: 'inventory-full' });
  }

  if (tookAny) {
    finishInteraction(containers, container, playerId, player, notify);
  }
}

export function updateLootContainers(containers, delta, notify) {
  for (const container of containers.values()) {
    container.lifetime -= delta;

    if (container.lifetime <= 0) {
      containers.delete(container.id);
      notify(container.ownerId, { type: 'loot-remove', id: container.id });
    }
  }
}

export function removeLootOfPlayer(containers, playerId) {
  for (const container of containers.values()) {
    if (container.ownerId === playerId) {
      containers.delete(container.id);
    }
  }
}
