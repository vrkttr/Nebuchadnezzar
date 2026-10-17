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
