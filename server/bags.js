import { getItem } from './items.js';
import { BAG_SLOTS } from './equipment.js';
import { INVENTORY_SIZE, addItem, createInventory } from './inventory.js';

export function bagSize(itemId) {
  const item = itemId ? getItem(itemId) : null;
  return item?.type === 'bag' ? item.bagSlots ?? 0 : 0;
}

export function bagCapacity(equipment) {
  return BAG_SLOTS.reduce((sum, slot) => sum + bagSize(equipment[slot]), 0);
}

export function inventorySize(equipment) {
  return INVENTORY_SIZE + bagCapacity(equipment);
}

function ranges(equipment) {
  const result = {};
  let start = INVENTORY_SIZE;

  for (const slot of BAG_SLOTS) {
    const size = bagSize(equipment[slot]);
    if (size > 0) {
      result[slot] = { start, size, itemId: equipment[slot] };
      start += size;
    }
  }

  return result;
}

export function relayoutInventory(inventory, oldEquipment, newEquipment) {
  const before = ranges(oldEquipment);
  const after = ranges(newEquipment);
  const next = createInventory(inventorySize(newEquipment));

  for (let index = 0; index < INVENTORY_SIZE; index += 1) next[index] = inventory[index] ?? null;

  const displaced = [];

  for (const [slot, range] of Object.entries(before)) {
    const target = after[slot];
    const keeps = target && target.itemId === range.itemId;

    for (let offset = 0; offset < range.size; offset += 1) {
      const stack = inventory[range.start + offset] ?? null;
      if (!stack) continue;
      if (keeps) next[target.start + offset] = stack;
      else displaced.push(stack);
    }
  }

  for (const stack of displaced) {
    const free = next.indexOf(null);
    if (free === -1) return null;
    next[free] = stack;
  }

  return next;
}

export function placeItem(inventory, itemId, perk = null) {
  return addItem(inventory, itemId, 1, perk) === 0;
}
