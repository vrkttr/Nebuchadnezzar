import { getZone, getZones } from './zoneLoader.js';
import { addGold, hasChestTable, rollChest } from './loot.js';
import { spawnChestContainer } from './lootContainers.js';

const CHEST_RANGE = 4;

for (const zone of getZones()) {
  for (const chest of zone.chests) {
    if (!hasChestTable(chest.lootTable)) {
      throw new Error(`Zonendatei ${zone.id}: Lootkiste "${chest.id}" verweist auf die unbekannte Loot-Tabelle "${chest.lootTable}".`);
    }
  }
}

export function chestKey(zoneId, chestId) {
  return `${zoneId}:${chestId}`;
}

export function serializeChests(zoneId, openedChests) {
  const zone = getZone(zoneId);
  if (!zone) return [];

  return zone.chests
    .filter((chest) => !openedChests.has(chestKey(zoneId, chest.id)))
    .map(({ id, x, z, rotationY, name }) => ({ id, x, y: 0, z, rotationY, name }));
}

export function openChest(containers, playerId, player, chestId, notify, persistOpened) {
  if (player.dead) return;

  const zone = getZone(player.zoneId);
  const chest = zone?.chests.find((candidate) => candidate.id === chestId);
  if (!chest) return;

  const key = chestKey(zone.id, chest.id);
  if (player.openedChests.has(key)) return;

  if (Math.hypot(player.x - chest.x, player.z - chest.z) > CHEST_RANGE) {
    notify(playerId, { type: 'event', kind: 'loot-failed', reason: 'too-far' });
    return;
  }

  player.openedChests.add(key);
  persistOpened(zone.id, chest.id);

  const { gold, drops } = rollChest(chest.lootTable, player.level);
  addGold(player, gold);
  player.dataVersion += 1;

  notify(playerId, { type: 'event', kind: 'gold', amount: gold });
  notify(playerId, { type: 'chest-remove', id: chest.id });
  spawnChestContainer(containers, playerId, chest.name, { x: chest.x, y: 0, z: chest.z, rotationY: chest.rotationY }, drops, notify);
}
