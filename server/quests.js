import { getItem } from './items.js';
import { addItem, cloneInventory, countItem, removeItem, sendInventory } from './inventory.js';
import { addGold } from './loot.js';
import { getNpc } from './npcs.js';
import { grantXp } from './progression.js';

export const MAX_ACTIVE_QUESTS = 10;

export const QUESTS = {
  clear_raiders: {
    id: 'clear_raiders',
    name: 'Plünderer vertreiben',
    level: 1,
    giverNpc: 'streuner',
    turnInNpc: 'streuner',
    requires: null,
    offerText:
      'Plünderer treiben sich östlich des Autowracks herum und fallen über jeden her, der sich nähert. Räum ein paar von ihnen aus dem Weg, dann reden wir weiter.',
    progressText: 'Noch nicht genug? Die Plünderer lungern östlich des Autowracks herum.',
    completeText:
      'Gut gemacht. Das verschafft uns etwas Luft. Hier, nimm das. Und halt dich an den Schrotthändler, der zahlt für alles, was glänzt.',
    objectives: [{ type: 'kill', enemyType: 'raider', count: 3, label: 'Plünderer getötet' }],
    rewards: { xp: 60, gold: 20, items: [{ itemId: 'canned_food', quantity: 2 }] },
  },
  scrap_for_trader: {
    id: 'scrap_for_trader',
    name: 'Material für den Händler',
    level: 1,
    giverNpc: 'streuner',
    turnInNpc: 'haendler',
    requires: 'clear_raiders',
    offerText:
      'Der Schrotthändler baut gerade etwas Brauchbares zusammen und braucht Material. Bring ihm Schrottmetall und Stoffreste. Beides findest du bei den Plünderern.',
    progressText: 'Der Händler wartet auf Schrottmetall und Stoffreste.',
    completeText: 'Genau das, was ich brauchte. Hier, das habe ich dafür zusammengeschraubt.',
    objectives: [
      { type: 'collect', itemId: 'scrap_metal', count: 6 },
      { type: 'collect', itemId: 'rag_bundle', count: 4 },
    ],
    rewards: { xp: 80, gold: 35, items: [{ itemId: 'scrap_helmet', quantity: 1 }] },
  },
};

export function getQuest(questId) {
  return typeof questId === 'string' && Object.hasOwn(QUESTS, questId) ? QUESTS[questId] : null;
}

export function createQuestState() {
  return {};
}

export function loadQuests(rows) {
  const quests = {};

  for (const row of rows) {
    const quest = getQuest(row.quest_id);
    if (!quest || (row.status !== 'active' && row.status !== 'completed')) continue;

    let stored = [];
    try {
      const parsed = JSON.parse(row.progress);
      if (Array.isArray(parsed)) stored = parsed;
    } catch {
      stored = [];
    }

    const progress = quest.objectives.map((objective, index) => {
      const value = Number.parseInt(stored[index], 10);
      return Number.isInteger(value) ? Math.max(0, Math.min(objective.count, value)) : 0;
    });

    quests[quest.id] = { status: row.status, progress };
  }

  return quests;
}

export function questRows(quests) {
  return Object.entries(quests).map(([questId, entry]) => [
    questId,
    entry.status,
    JSON.stringify(entry.progress),
  ]);
}

function objectiveLabel(objective) {
  if (objective.label) return objective.label;
  return getItem(objective.itemId)?.name ?? objective.itemId;
}

function objectiveCurrent(player, entry, objective, index) {
  if (objective.type === 'kill') return Math.min(objective.count, entry.progress[index] ?? 0);
  return Math.min(objective.count, countItem(player.inventory, objective.itemId));
}

function serializeObjectives(player, quest, entry) {
  return quest.objectives.map((objective, index) => ({
    label: objectiveLabel(objective),
    current: entry ? objectiveCurrent(player, entry, objective, index) : 0,
    target: objective.count,
  }));
}

function isReady(player, quest, entry) {
  return quest.objectives.every(
    (objective, index) => objectiveCurrent(player, entry, objective, index) >= objective.count
  );
}

function activeCount(player) {
  return Object.values(player.quests).filter((entry) => entry.status === 'active').length;
}

function isAvailable(player, quest) {
  if (player.quests[quest.id]) return false;
  if (player.level < quest.level) return false;
  if (quest.requires && player.quests[quest.requires]?.status !== 'completed') return false;

  return true;
}

function serializeRewards(quest) {
  return {
    xp: quest.rewards.xp ?? 0,
    gold: quest.rewards.gold ?? 0,
    items: (quest.rewards.items ?? []).map((item) => ({ ...item })),
  };
}

export function questsForNpc(player, npcId) {
  const list = [];

  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status === 'completed') continue;

    const involved = quest.giverNpc === npcId || quest.turnInNpc === npcId;
    let state = null;

    if (entry) {
      if (!involved) continue;
      state = quest.turnInNpc === npcId && isReady(player, quest, entry) ? 'ready' : 'active';
    } else if (quest.giverNpc === npcId && isAvailable(player, quest)) {
      state = 'available';
    }

    if (!state) continue;

    const text =
      state === 'available' ? quest.offerText : state === 'ready' ? quest.completeText : quest.progressText;

    list.push({
      id: quest.id,
      name: quest.name,
      state,
      text,
      objectives: serializeObjectives(player, quest, entry),
      rewards: serializeRewards(quest),
      turnInName: getNpc(quest.turnInNpc)?.name ?? '',
    });
  }

  return list;
}

function computeMarkers(player) {
  const markers = {};

  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];

    if (entry?.status === 'active' && isReady(player, quest, entry)) {
      markers[quest.turnInNpc] = 'ready';
    } else if (!entry && isAvailable(player, quest) && markers[quest.giverNpc] !== 'ready') {
      markers[quest.giverNpc] = 'available';
    }
  }

  return markers;
}

export function serializeQuestLog(player) {
  const quests = [];

  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status !== 'active') continue;

    quests.push({
      id: quest.id,
      name: quest.name,
      ready: isReady(player, quest, entry),
      turnInName: getNpc(quest.turnInNpc)?.name ?? '',
      objectives: serializeObjectives(player, quest, entry),
    });
  }

  return { quests, markers: computeMarkers(player) };
}

export function diffQuestLog(previous, current) {
  if (!previous) return [];

  const events = [];

  for (const quest of current.quests) {
    const before = previous.quests.find((candidate) => candidate.id === quest.id);
    if (!before) continue;

    quest.objectives.forEach((objective, index) => {
      if (objective.current > (before.objectives[index]?.current ?? 0)) {
        events.push({
          type: 'event',
          kind: 'quest-progress',
          questId: quest.id,
          label: objective.label,
          current: objective.current,
          target: objective.target,
        });
      }
    });

    if (quest.ready && !before.ready) {
      events.push({ type: 'event', kind: 'quest-ready', questId: quest.id, name: quest.name });
    }
  }

  return events;
}

export function recordKill(player, enemy) {
  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status !== 'active') continue;

    quest.objectives.forEach((objective, index) => {
      if (
        objective.type === 'kill' &&
        objective.enemyType === enemy.type &&
        entry.progress[index] < objective.count
      ) {
        entry.progress[index] += 1;
        player.dataVersion += 1;
      }
    });
  }
}

function fail(notify, playerId, reason) {
  notify(playerId, { type: 'event', kind: 'quest-failed', reason });
  return false;
}

export function acceptQuest(player, playerId, npcId, questId, notify) {
  const quest = getQuest(questId);
  if (!quest || quest.giverNpc !== npcId) return fail(notify, playerId, 'invalid');
  if (!isAvailable(player, quest)) return fail(notify, playerId, 'unavailable');
  if (activeCount(player) >= MAX_ACTIVE_QUESTS) return fail(notify, playerId, 'log-full');

  player.quests[quest.id] = { status: 'active', progress: quest.objectives.map(() => 0) };
  player.dataVersion += 1;

  notify(playerId, { type: 'event', kind: 'quest-accepted', questId: quest.id, name: quest.name });

  return true;
}

export function completeQuest(player, playerId, npcId, questId, notify) {
  const quest = getQuest(questId);
  const entry = quest ? player.quests[quest.id] : null;

  if (!quest || quest.turnInNpc !== npcId || entry?.status !== 'active') {
    return fail(notify, playerId, 'invalid');
  }

  if (!isReady(player, quest, entry)) return fail(notify, playerId, 'not-ready');

  const trial = cloneInventory(player.inventory);

  for (const objective of quest.objectives) {
    if (objective.type === 'collect') removeItem(trial, objective.itemId, objective.count);
  }

  for (const reward of quest.rewards.items ?? []) {
    if (addItem(trial, reward.itemId, reward.quantity) > 0) {
      return fail(notify, playerId, 'inventory-full');
    }
  }

  for (const objective of quest.objectives) {
    if (objective.type === 'collect') removeItem(player.inventory, objective.itemId, objective.count);
  }

  for (const reward of quest.rewards.items ?? []) {
    addItem(player.inventory, reward.itemId, reward.quantity);
    notify(playerId, { type: 'event', kind: 'item', itemId: reward.itemId, quantity: reward.quantity });
  }

  const goldAmount = quest.rewards.gold ?? 0;
  const xpAmount = quest.rewards.xp ?? 0;

  addGold(player, goldAmount);
  if (goldAmount > 0) notify(playerId, { type: 'event', kind: 'gold', amount: goldAmount });

  const levelsGained = grantXp(player, xpAmount);
  if (xpAmount > 0) {
    notify(playerId, { type: 'event', kind: 'xp', amount: xpAmount, enemyName: quest.name });
  }

  if (levelsGained > 0) {
    notify(playerId, { type: 'event', kind: 'levelup', level: player.level });
  }

  entry.status = 'completed';
  player.dataVersion += 1;

  sendInventory(notify, playerId, player);
  notify(playerId, { type: 'event', kind: 'quest-completed', questId: quest.id, name: quest.name });

  return true;
}
