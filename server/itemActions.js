import { getItem } from './items.js';
import { addItem, serializeInventory } from './inventory.js';
import { EQUIPMENT_SLOTS, applyEquipmentStats, serializeEquipment } from './equipment.js';

const CONSUMABLE_COOLDOWN_MS = 6000;

function fail(notify, playerId, reason) {
  notify(playerId, { type: 'event', kind: 'item-failed', reason });
}

function sync(notify, playerId, player) {
  player.dataVersion += 1;
  notify(playerId, { type: 'inventory', slots: serializeInventory(player.inventory) });
  notify(playerId, { type: 'equipment', slots: serializeEquipment(player.equipment) });
}

function equipItem(notify, playerId, player, slotIndex, item) {
  if (item.stackSize !== 1) return fail(notify, playerId, 'not-usable');
  if (player.level < item.level) return fail(notify, playerId, 'level');

  const previousItemId = player.equipment[item.slot];

  player.inventory[slotIndex] = previousItemId ? { itemId: previousItemId, quantity: 1 } : null;
  player.equipment[item.slot] = item.id;
  applyEquipmentStats(player);

  sync(notify, playerId, player);
  notify(playerId, { type: 'event', kind: 'equipped', itemId: item.id });
}

function consumeItem(notify, playerId, player, slotIndex, item) {
  if (Date.now() < player.consumableReadyAt) return fail(notify, playerId, 'cooldown');

  const stack = player.inventory[slotIndex];
  let healed = 0;

  if (item.use.heal) {
    const before = player.health;
    player.health = Math.min(player.healthMax, before + item.use.heal);
    healed = Math.round(player.health - before);

    if (healed <= 0) {
      player.health = before;
      return fail(notify, playerId, 'full-health');
    }
  }

  stack.quantity -= 1;
  if (stack.quantity <= 0) player.inventory[slotIndex] = null;

  player.consumableReadyAt = Date.now() + CONSUMABLE_COOLDOWN_MS;

  sync(notify, playerId, player);
  notify(playerId, { type: 'event', kind: 'item-used', itemId: item.id, heal: healed });
}

export function useInventoryItem(playerId, player, slotIndex, notify) {
  if (player.dead) return;

  const stack = player.inventory[slotIndex];
  const item = stack ? getItem(stack.itemId) : null;
  if (!item) return;

  if (item.slot) return equipItem(notify, playerId, player, slotIndex, item);
  if (item.use) return consumeItem(notify, playerId, player, slotIndex, item);

  fail(notify, playerId, 'not-usable');
}

export function destroyInventoryItem(playerId, player, slotIndex, itemId, notify) {
  if (player.dead) return;

  const stack = player.inventory[slotIndex];

  if (!stack || stack.itemId !== itemId) {
    notify(playerId, { type: 'inventory', slots: serializeInventory(player.inventory) });
    return;
  }

  player.inventory[slotIndex] = null;

  sync(notify, playerId, player);
  notify(playerId, { type: 'event', kind: 'item-destroyed', itemId: stack.itemId, quantity: stack.quantity });
}

export function unequipItem(playerId, player, equipmentSlot, notify) {
  if (player.dead || !EQUIPMENT_SLOTS.includes(equipmentSlot)) return;

  const itemId = player.equipment[equipmentSlot];
  if (!itemId) return;

  if (addItem(player.inventory, itemId, 1) > 0) {
    notify(playerId, { type: 'event', kind: 'inventory-full' });
    return;
  }

  player.equipment[equipmentSlot] = null;
  applyEquipmentStats(player);

  sync(notify, playerId, player);
  notify(playerId, { type: 'event', kind: 'unequipped', itemId });
}
