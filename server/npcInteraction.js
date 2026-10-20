import { NPC_INTERACT_RANGE, getNpc } from './npcs.js';
import { acceptQuest, completeQuest, questsForNpc } from './quests.js';
import { buyItem, sellItem, serializeVendor } from './vendor.js';

function resolveNpc(player, playerId, npcId, notify) {
  if (player.dead) return null;

  const npc = getNpc(npcId);

  if (!npc) {
    notify(playerId, { type: 'event', kind: 'npc-failed', reason: 'gone' });
    return null;
  }

  if (Math.hypot(player.x - npc.x, player.z - npc.z) > NPC_INTERACT_RANGE) {
    notify(playerId, { type: 'event', kind: 'npc-failed', reason: 'too-far' });
    return null;
  }

  return npc;
}

function sendNpcWindow(player, playerId, npc, notify) {
  notify(playerId, {
    type: 'npc-window',
    npcId: npc.id,
    name: npc.name,
    greeting: npc.greeting,
    vendor: Boolean(npc.vendor),
    quests: questsForNpc(player, npc.id),
  });
}

export function openNpc(player, playerId, npcId, notify) {
  const npc = resolveNpc(player, playerId, npcId, notify);
  if (npc) sendNpcWindow(player, playerId, npc, notify);
}

export function acceptNpcQuest(player, playerId, npcId, questId, notify) {
  const npc = resolveNpc(player, playerId, npcId, notify);
  if (!npc) return;

  acceptQuest(player, playerId, npc.id, questId, notify);
  sendNpcWindow(player, playerId, npc, notify);
}

export function completeNpcQuest(player, playerId, npcId, questId, notify) {
  const npc = resolveNpc(player, playerId, npcId, notify);
  if (!npc) return;

  completeQuest(player, playerId, npc.id, questId, notify);
  sendNpcWindow(player, playerId, npc, notify);
}

export function openVendor(player, playerId, npcId, notify) {
  const npc = resolveNpc(player, playerId, npcId, notify);
  if (!npc) return;

  if (!npc.vendor) {
    notify(playerId, { type: 'event', kind: 'vendor-failed', reason: 'invalid' });
    return;
  }

  notify(playerId, serializeVendor(npc));
}

export function buyFromVendor(player, playerId, npcId, itemId, quantity, notify) {
  const npc = resolveNpc(player, playerId, npcId, notify);
  if (!npc?.vendor) return;

  buyItem(player, playerId, npc, itemId, quantity, notify);
}

export function sellToVendor(player, playerId, npcId, slotIndex, itemId, notify) {
  const npc = resolveNpc(player, playerId, npcId, notify);
  if (!npc?.vendor) return;

  sellItem(player, playerId, slotIndex, itemId, notify);
}
