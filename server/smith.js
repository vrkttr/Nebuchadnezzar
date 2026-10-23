import { getItem } from './items.js';
import { serializeInventory } from './inventory.js';
import { applyEquipmentStats, serializeEquipment, serializeEquipmentPerks } from './equipment.js';
import { addGold } from './loot.js';
import { forgeCost, rollPerk } from './perks.js';

function fail(notify, playerId, reason) {
  notify(playerId, { type: 'event', kind: 'smith-failed', reason });
}

function collectEntries(player) {
  const entries = [];
  const equipped = player.equipment.weapon;

  if (equipped) {
    const item = getItem(equipped);
    const perk = player.equipmentPerks?.weapon ?? null;
    if (item?.type === 'weapon') entries.push({ source: 'equipment', index: 0, itemId: equipped, perk, cost: forgeCost(item, Boolean(perk)) });
  }

  player.inventory.forEach((stack, index) => {
    const item = stack ? getItem(stack.itemId) : null;
    if (item?.type === 'weapon') entries.push({ source: 'inventory', index, itemId: stack.itemId, perk: stack.perk ?? null, cost: forgeCost(item, Boolean(stack.perk)) });
  });

  return entries;
}

export function serializeSmith(player, npc) {
  return { type: 'smith-window', npcId: npc.id, gold: player.gold, entries: collectEntries(player) };
}

export function forgeWeapon(player, playerId, npc, source, index, itemId, notify) {
  if (!Number.isInteger(index) || (source !== 'inventory' && source !== 'equipment')) return fail(notify, playerId, 'invalid');

  let currentItemId;
  let currentPerk;

  if (source === 'equipment') {
    currentItemId = player.equipment.weapon;
    currentPerk = player.equipmentPerks?.weapon ?? null;
  } else {
    const stack = player.inventory[index];
    currentItemId = stack?.itemId;
    currentPerk = stack?.perk ?? null;
  }

  const item = currentItemId ? getItem(currentItemId) : null;
  if (!item || item.type !== 'weapon' || currentItemId !== itemId) return fail(notify, playerId, 'invalid');

  const cost = forgeCost(item, Boolean(currentPerk));
  if (player.gold < cost) return fail(notify, playerId, 'no-gold');

  const perk = rollPerk(item.level);
  addGold(player, -cost);

  if (source === 'equipment') {
    player.equipmentPerks ??= {};
    player.equipmentPerks.weapon = perk;
    applyEquipmentStats(player);
  } else {
    player.inventory[index].perk = perk;
  }

  player.dataVersion += 1;
  notify(playerId, { type: 'inventory', slots: serializeInventory(player.inventory) });
  notify(playerId, { type: 'equipment', slots: serializeEquipment(player.equipment), perks: serializeEquipmentPerks(player.equipmentPerks) });
  notify(playerId, { type: 'event', kind: 'forged', itemId, perk, cost, replaced: Boolean(currentPerk) });
  notify(playerId, serializeSmith(player, npc));
}
