import { getItem } from './items.js';
import { addItem, cloneInventory, sendInventory } from './inventory.js';
import { addGold } from './loot.js';

function fail(notify, playerId, reason) {
  notify(playerId, { type: 'event', kind: 'vendor-failed', reason });
}

export function serializeVendor(npc) {
  return {
    type: 'vendor-window',
    npcId: npc.id,
    name: npc.name,
    stock: npc.vendor.stock.map((entry) => ({ itemId: entry.itemId, price: entry.price })),
  };
}

export function buyItem(player, playerId, npc, itemId, quantity, notify) {
  const entry = npc.vendor.stock.find((candidate) => candidate.itemId === itemId);
  const item = entry ? getItem(entry.itemId) : null;

  if (!entry || !item || !Number.isInteger(quantity) || quantity < 1 || quantity > item.stackSize) {
    return fail(notify, playerId, 'invalid');
  }

  const cost = entry.price * quantity;
  if (player.gold < cost) return fail(notify, playerId, 'no-gold');

  const trial = cloneInventory(player.inventory);
  if (addItem(trial, item.id, quantity) > 0) return fail(notify, playerId, 'inventory-full');

  addItem(player.inventory, item.id, quantity);
  addGold(player, -cost);
  player.dataVersion += 1;

  sendInventory(notify, playerId, player);
  notify(playerId, { type: 'event', kind: 'purchased', itemId: item.id, quantity, cost });
}

export function sellItem(player, playerId, slotIndex, itemId, notify) {
  const stack = player.inventory[slotIndex];

  if (!stack || stack.itemId !== itemId) {
    sendInventory(notify, playerId, player);
    return;
  }

  const item = getItem(stack.itemId);
  if (!item || !(item.value > 0)) return fail(notify, playerId, 'not-sellable');

  const gold = item.value * stack.quantity;

  player.inventory[slotIndex] = null;
  addGold(player, gold);
  player.dataVersion += 1;

  sendInventory(notify, playerId, player);
  notify(playerId, { type: 'event', kind: 'sold', itemId: item.id, quantity: stack.quantity, gold });
}
