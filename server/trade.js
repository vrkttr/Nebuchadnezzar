import { randomUUID } from 'node:crypto';
import { getItem } from './items.js';
import { addItem, cloneInventory, sendInventory } from './inventory.js';
import { MAX_GOLD } from './loot.js';

export const TRADE_SLOTS = 6;
export const TRADE_RANGE = 11;

export function createTrades(options = {}) {
  return { trades: new Map(), persist: options.persist ?? null };
}

function system(text, key, params) {
  return { type: 'chat', channel: 'system', text, key, params };
}

function createSide(playerId) {
  return { playerId, items: new Array(TRADE_SLOTS).fill(null), gold: 0, accepted: false };
}

function sameSide(trade, playerId) {
  if (trade.a.playerId === playerId) return { mine: trade.a, theirs: trade.b };
  if (trade.b.playerId === playerId) return { mine: trade.b, theirs: trade.a };
  return null;
}

function perkKey(perk) {
  return perk ? JSON.stringify(perk) : '';
}

function serializeSide(side, includeSlots) {
  return {
    gold: side.gold,
    accepted: side.accepted,
    items: side.items.map((entry) =>
      entry
        ? {
            itemId: entry.itemId,
            quantity: entry.quantity,
            perk: entry.perk ?? null,
            ...(includeSlots ? { slot: entry.slot } : {}),
          }
        : null
    ),
  };
}

function sendState(trades, players, trade, notify) {
  for (const playerId of [trade.a.playerId, trade.b.playerId]) {
    const sides = sameSide(trade, playerId);
    const partner = players.get(sides.theirs.playerId);
    notify(playerId, {
      type: 'trade',
      tradeId: trade.id,
      partner: { id: sides.theirs.playerId, name: partner?.characterName ?? '???', level: partner?.level ?? 1 },
      mine: serializeSide(sides.mine, true),
      theirs: serializeSide(sides.theirs, false),
    });
  }
}

function resetAccepted(trade) {
  trade.a.accepted = false;
  trade.b.accepted = false;
}

function validateSide(player, side) {
  let changed = false;

  side.items.forEach((entry, index) => {
    if (!entry) return;
    const stack = player.inventory[entry.slot];
    const valid =
      stack &&
      stack.itemId === entry.itemId &&
      stack.quantity >= entry.quantity &&
      perkKey(stack.perk) === perkKey(entry.perk);
    if (!valid) {
      side.items[index] = null;
      changed = true;
    }
  });

  if (side.gold > player.gold) {
    side.gold = player.gold;
    changed = true;
  }

  return changed;
}

function closeTrade(trades, players, trade, notify, reasons) {
  trades.trades.delete(trade.id);

  for (const playerId of [trade.a.playerId, trade.b.playerId]) {
    const player = players.get(playerId);
    if (player && player.tradeId === trade.id) player.tradeId = null;
    notify(playerId, { type: 'trade-close', tradeId: trade.id });
    const reason = reasons[playerId];
    if (reason) notify(playerId, reason);
  }
}

export function cancelPlayerTrade(trades, players, playerId, notify, cause = 'cancelled') {
  const player = players.get(playerId);
  const trade = player?.tradeId ? trades.trades.get(player.tradeId) : null;
  if (!trade) {
    if (player) player.tradeId = null;
    return;
  }

  const sides = sameSide(trade, playerId);
  const partnerId = sides.theirs.playerId;
  const name = player.characterName;
  const reasons = {};

  if (cause === 'cancelled') {
    reasons[playerId] = system('Du hast den Handel abgebrochen.', 'trade.cancelledSelf');
    reasons[partnerId] = system(`${name} hat den Handel abgebrochen.`, 'trade.cancelledOther', { name });
  } else if (cause === 'disconnected') {
    reasons[partnerId] = system(`${name} hat den Handel abgebrochen.`, 'trade.cancelledOther', { name });
  } else if (cause === 'range') {
    reasons[playerId] = system('Der Handel wurde abgebrochen, ihr seid zu weit voneinander entfernt.', 'trade.range');
    reasons[partnerId] = reasons[playerId];
  } else {
    reasons[playerId] = system('Der Handel wurde abgebrochen.', 'trade.cancelled');
    reasons[partnerId] = reasons[playerId];
  }

  closeTrade(trades, players, trade, notify, reasons);
}

function canTrade(player, now) {
  return player && !player.dead && !(player.loadingUntil > now);
}

export function requestTrade(trades, players, playerId, targetId, notify, now = Date.now()) {
  const player = players.get(playerId);
  const target = players.get(targetId);
  if (!player || !target || playerId === targetId) return;

  if (player.tradeId) {
    notify(playerId, system('Du handelst bereits.', 'trade.selfBusy'));
    return;
  }

  if (!canTrade(player, now)) {
    notify(playerId, system('Du kannst gerade nicht handeln.', 'trade.selfUnavailable'));
    return;
  }

  if (!player.groupId || player.groupId !== target.groupId) {
    notify(playerId, system('Handeln ist nur innerhalb einer Gruppe möglich.', 'trade.groupOnly'));
    return;
  }

  if (target.zoneId !== player.zoneId || Math.hypot(target.x - player.x, target.z - player.z) > TRADE_RANGE) {
    notify(playerId, system(`${target.characterName} ist zu weit entfernt.`, 'trade.tooFar', { name: target.characterName }));
    return;
  }

  if (!canTrade(target, now)) {
    notify(playerId, system(`${target.characterName} kann gerade nicht handeln.`, 'trade.targetUnavailable', { name: target.characterName }));
    return;
  }

  if (target.tradeId) {
    notify(playerId, system(`${target.characterName} handelt bereits.`, 'trade.targetBusy', { name: target.characterName }));
    return;
  }

  const trade = { id: randomUUID(), a: createSide(playerId), b: createSide(targetId) };
  trades.trades.set(trade.id, trade);
  player.tradeId = trade.id;
  target.tradeId = trade.id;
  sendState(trades, players, trade, notify);
}

function activeTrade(trades, players, playerId) {
  const player = players.get(playerId);
  const trade = player?.tradeId ? trades.trades.get(player.tradeId) : null;
  if (!player || !trade || player.dead) return null;
  return { player, trade, sides: sameSide(trade, playerId) };
}

export function offerItem(trades, players, playerId, tradeSlot, invSlot, quantity, notify) {
  const context = activeTrade(trades, players, playerId);
  if (!context) return;
  const { player, trade, sides } = context;

  if (!Number.isInteger(tradeSlot) || tradeSlot < 0 || tradeSlot >= TRADE_SLOTS) return;
  if (!Number.isInteger(invSlot) || invSlot < 0 || invSlot >= player.inventory.length) return;

  const stack = player.inventory[invSlot];
  const item = stack ? getItem(stack.itemId) : null;
  if (!stack || !item) return;

  if (item.unique) {
    notify(playerId, system('Dieser Gegenstand kann nicht gehandelt werden.', 'trade.untradable'));
    return;
  }

  const amount = Number.isInteger(quantity) ? quantity : stack.quantity;
  if (amount < 1 || amount > stack.quantity) return;

  sides.mine.items.forEach((entry, index) => {
    if (entry && entry.slot === invSlot) sides.mine.items[index] = null;
  });

  sides.mine.items[tradeSlot] = { slot: invSlot, itemId: stack.itemId, quantity: amount, perk: stack.perk ?? null };
  resetAccepted(trade);
  sendState(trades, players, trade, notify);
}

export function clearOffer(trades, players, playerId, tradeSlot, notify) {
  const context = activeTrade(trades, players, playerId);
  if (!context) return;
  const { trade, sides } = context;

  if (!Number.isInteger(tradeSlot) || tradeSlot < 0 || tradeSlot >= TRADE_SLOTS || !sides.mine.items[tradeSlot]) return;

  sides.mine.items[tradeSlot] = null;
  resetAccepted(trade);
  sendState(trades, players, trade, notify);
}

export function setGold(trades, players, playerId, amount, notify) {
  const context = activeTrade(trades, players, playerId);
  if (!context) return;
  const { player, trade, sides } = context;

  if (!Number.isInteger(amount) || amount < 0) return;

  const clamped = Math.min(amount, player.gold);
  if (clamped === sides.mine.gold && clamped === amount) return;

  sides.mine.gold = clamped;
  resetAccepted(trade);
  sendState(trades, players, trade, notify);
}

function failFull(trades, players, trade, fullPlayerId, notify) {
  const full = players.get(fullPlayerId);
  const other = fullPlayerId === trade.a.playerId ? trade.b.playerId : trade.a.playerId;
  notify(fullPlayerId, system('Dein Rucksack hat nicht genug Platz.', 'trade.fullSelf'));
  notify(other, system(`${full?.characterName ?? '???'} hat nicht genug Platz im Rucksack.`, 'trade.fullOther', { name: full?.characterName ?? '???' }));
  resetAccepted(trade);
  sendState(trades, players, trade, notify);
}

function completeTrade(trades, players, trade, notify) {
  const first = players.get(trade.a.playerId);
  const second = players.get(trade.b.playerId);
  if (!first || !second) return;

  const firstChanged = validateSide(first, trade.a);
  const secondChanged = validateSide(second, trade.b);
  if (firstChanged || secondChanged) {
    resetAccepted(trade);
    sendState(trades, players, trade, notify);
    return;
  }

  const pairs = [
    { from: first, side: trade.a, to: second, fromId: trade.a.playerId, toId: trade.b.playerId },
    { from: second, side: trade.b, to: first, fromId: trade.b.playerId, toId: trade.a.playerId },
  ];

  const trial = new Map([
    [trade.a.playerId, cloneInventory(first.inventory)],
    [trade.b.playerId, cloneInventory(second.inventory)],
  ]);

  for (const { side, fromId } of pairs) {
    const inventory = trial.get(fromId);
    for (const entry of side.items) {
      if (!entry) continue;
      const stack = inventory[entry.slot];
      stack.quantity -= entry.quantity;
      if (stack.quantity <= 0) inventory[entry.slot] = null;
    }
  }

  for (const { side, toId } of pairs) {
    const inventory = trial.get(toId);
    for (const entry of side.items) {
      if (!entry) continue;
      if (addItem(inventory, entry.itemId, entry.quantity, entry.perk) > 0) {
        failFull(trades, players, trade, toId, notify);
        return;
      }
    }
  }

  const firstGold = first.gold - trade.a.gold + trade.b.gold;
  const secondGold = second.gold - trade.b.gold + trade.a.gold;
  if (firstGold > MAX_GOLD || secondGold > MAX_GOLD) {
    notify(trade.a.playerId, system('Der Handel würde das Goldlimit überschreiten.', 'trade.goldLimit'));
    notify(trade.b.playerId, system('Der Handel würde das Goldlimit überschreiten.', 'trade.goldLimit'));
    resetAccepted(trade);
    sendState(trades, players, trade, notify);
    return;
  }

  for (const [playerId, inventory] of trial) {
    const player = players.get(playerId);
    for (let index = 0; index < player.inventory.length; index += 1) player.inventory[index] = inventory[index];
  }

  first.gold = firstGold;
  second.gold = secondGold;
  first.dataVersion += 1;
  second.dataVersion += 1;

  sendInventory(notify, trade.a.playerId, first);
  sendInventory(notify, trade.b.playerId, second);

  const done = system('Handel abgeschlossen.', 'trade.completed');
  closeTrade(trades, players, trade, notify, { [trade.a.playerId]: done, [trade.b.playerId]: done });

  if (trades.persist) {
    Promise.resolve(trades.persist(first, second)).catch((error) => console.error('Fehler beim Speichern des Handels:', error));
  }
}

export function acceptTrade(trades, players, playerId, notify) {
  const context = activeTrade(trades, players, playerId);
  if (!context) return;
  const { trade, sides } = context;

  if (sides.mine.accepted) return;
  sides.mine.accepted = true;

  if (sides.theirs.accepted) {
    completeTrade(trades, players, trade, notify);
    return;
  }

  sendState(trades, players, trade, notify);
}

export function isTradeLocked(trades, players, playerId, slot) {
  const player = players.get(playerId);
  const trade = player?.tradeId ? trades.trades.get(player.tradeId) : null;
  if (!trade) return false;
  const sides = sameSide(trade, playerId);
  return sides.mine.items.some((entry) => entry && entry.slot === slot);
}

export function updateTrades(trades, players, notify, now = Date.now()) {
  for (const trade of Array.from(trades.trades.values())) {
    const first = players.get(trade.a.playerId);
    const second = players.get(trade.b.playerId);

    if (!first || !second) {
      closeTrade(trades, players, trade, notify, {});
      continue;
    }

    if (first.dead || second.dead || first.zoneId !== second.zoneId || first.loadingUntil > now || second.loadingUntil > now) {
      closeTrade(trades, players, trade, notify, {
        [trade.a.playerId]: system('Der Handel wurde abgebrochen.', 'trade.cancelled'),
        [trade.b.playerId]: system('Der Handel wurde abgebrochen.', 'trade.cancelled'),
      });
      continue;
    }

    if (Math.hypot(first.x - second.x, first.z - second.z) > TRADE_RANGE + 1) {
      const reason = system('Der Handel wurde abgebrochen, ihr seid zu weit voneinander entfernt.', 'trade.range');
      closeTrade(trades, players, trade, notify, { [trade.a.playerId]: reason, [trade.b.playerId]: reason });
      continue;
    }

    const firstChanged = validateSide(first, trade.a);
    const secondChanged = validateSide(second, trade.b);
    if (firstChanged || secondChanged) {
      resetAccepted(trade);
      sendState(trades, players, trade, notify);
    }
  }
}

export function handleTrade(trades, players, playerId, message, notify) {
  if (message.type === 'trade-request') {
    if (typeof message.playerId === 'string') requestTrade(trades, players, playerId, message.playerId, notify);
  } else if (message.type === 'trade-offer') {
    const quantity = message.quantity === undefined ? undefined : Number.parseInt(message.quantity, 10);
    offerItem(trades, players, playerId, Number.parseInt(message.tradeSlot, 10), Number.parseInt(message.slot, 10), quantity, notify);
  } else if (message.type === 'trade-clear') {
    clearOffer(trades, players, playerId, Number.parseInt(message.tradeSlot, 10), notify);
  } else if (message.type === 'trade-gold') {
    setGold(trades, players, playerId, Number.parseInt(message.amount, 10), notify);
  } else if (message.type === 'trade-accept') {
    acceptTrade(trades, players, playerId, notify);
  } else if (message.type === 'trade-cancel') {
    cancelPlayerTrade(trades, players, playerId, notify, 'cancelled');
  }
}
