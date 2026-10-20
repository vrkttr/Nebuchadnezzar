import { getItem } from './items.js';

export const INVENTORY_SIZE = 24;

export function createInventory() {
  return new Array(INVENTORY_SIZE).fill(null);
}

export function loadInventory(rows) {
  const inventory = createInventory();

  for (const row of rows) {
    if (row.slot < 0 || row.slot >= INVENTORY_SIZE) continue;
    inventory[row.slot] = { itemId: row.item_id, quantity: row.quantity };
  }

  return inventory;
}

export function addItem(inventory, itemId, quantity) {
  const item = getItem(itemId);
  if (!item || quantity <= 0) return quantity;

  let remaining = quantity;

  for (const slot of inventory) {
    if (remaining === 0) break;
    if (slot && slot.itemId === itemId && slot.quantity < item.stackSize) {
      const moved = Math.min(item.stackSize - slot.quantity, remaining);
      slot.quantity += moved;
      remaining -= moved;
    }
  }

  for (let index = 0; index < inventory.length && remaining > 0; index += 1) {
    if (inventory[index] === null) {
      const moved = Math.min(item.stackSize, remaining);
      inventory[index] = { itemId, quantity: moved };
      remaining -= moved;
    }
  }

  return remaining;
}

export function cloneInventory(inventory) {
  return inventory.map((slot) => (slot ? { ...slot } : null));
}

export function countItem(inventory, itemId) {
  let total = 0;

  for (const slot of inventory) {
    if (slot && slot.itemId === itemId) total += slot.quantity;
  }

  return total;
}

export function removeItem(inventory, itemId, quantity) {
  let remaining = quantity;

  for (let index = inventory.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const slot = inventory[index];
    if (!slot || slot.itemId !== itemId) continue;

    const taken = Math.min(slot.quantity, remaining);
    slot.quantity -= taken;
    remaining -= taken;

    if (slot.quantity === 0) inventory[index] = null;
  }

  return quantity - remaining;
}

export function sendInventory(notify, playerId, player) {
  notify(playerId, { type: 'inventory', slots: serializeInventory(player.inventory) });
}

export function serializeInventory(inventory) {
  return inventory.map((slot) => (slot ? { itemId: slot.itemId, quantity: slot.quantity } : null));
}

export function inventoryRows(inventory) {
  const rows = [];

  inventory.forEach((slot, index) => {
    if (slot) rows.push([index, slot.itemId, slot.quantity]);
  });

  return rows;
}
