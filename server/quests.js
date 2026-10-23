import { getItem } from './items.js';
import { addItem, cloneInventory, countItem, removeItem, sendInventory } from './inventory.js';
import { addGold } from './loot.js';
import { getNpcDefinition } from './npcs.js';
import { grantXp } from './progression.js';
import { MORDFALL_QUESTS } from './questsMordfall.js';
import { BARON_QUESTS } from './questsBaron.js';
import { JAGD_QUESTS } from './questsJagd.js';

export const MAX_ACTIVE_QUESTS = 10;

const BASE_QUESTS = {
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
  stray_name: {
    id: 'stray_name',
    name: 'Ein Name auf der Liste',
    level: 2,
    giverNpc: 'streuner',
    turnInNpc: 'streuner',
    requires: 'clear_raiders',
    offerText:
      'Ich führe Buch über die, die nicht zurückgekommen sind. Marta steht seit vier Tagen drauf. Sie wollte zum Lagerhaus im Südwesten, dem mit dem aufgebrochenen Rolltor. Sieh nach. Und bring nichts mit, was ich nicht sehen will.',
    progressText: 'Das Lagerhaus im Südwesten. Das Rolltor steht offen, du kannst es nicht verfehlen.',
    completeText:
      'Nur ein Ring? Mehr war da nicht? ... Dann ist es so. Nimm das hier, für den Weg. Und lass mich einen Moment allein.',
    objectives: [{ type: 'reach', zone: 'startwelt', x: -30, z: 45, radius: 4.5, count: 1, label: 'Lagerhaus im Südwesten aufsuchen' }],
    rewards: { xp: 70, gold: 25, items: [{ itemId: 'bandage', quantity: 2 }, { itemId: 'painkillers', quantity: 1 }] },
  },
  trader_goods: {
    id: 'trader_goods',
    name: 'Ware ohne Papiere',
    level: 3,
    giverNpc: 'haendler',
    turnInNpc: 'haendler',
    requires: 'scrap_for_trader',
    offerText:
      'Ich brauche Konserven und Hundefell. Das Fell kommt auf Mäntel, die Konserven auf Tische, und wo beides herkommt, interessiert keinen. Auch mich nicht. Bring es einfach.',
    progressText: 'Fünf Konserven, vier Felle. Ich zähle nicht nach, wie du dazu kommst.',
    completeText: 'Sauber. Fragen kosten bei mir extra, deshalb stelle ich keine. Hier, die Jacke lag noch da.',
    objectives: [
      { type: 'collect', itemId: 'canned_food', count: 5 },
      { type: 'collect', itemId: 'dog_fur', count: 4 },
    ],
    rewards: { xp: 90, gold: 50, items: [{ itemId: 'leather_jacket', quantity: 1 }] },
  },
  trader_debt: {
    id: 'trader_debt',
    name: 'Schulden verjähren nicht',
    level: 4,
    giverNpc: 'haendler',
    turnInNpc: 'haendler',
    requires: 'trader_goods',
    offerText:
      'Ein paar Marodeure im Südwesten schulden mir seit dem Frühjahr Munition. Ich schicke keine Mahnung. Sie müssen es nicht lebend zurückzahlen.',
    progressText: 'Die Marodeure treiben sich im Südwesten herum. Es sind kräftige Kerle, geh nicht unvorbereitet hin.',
    completeText: 'Dann sind wir quitt. Mit denen, meine ich. Mit dir sowieso. Das ist deine Abfindung.',
    objectives: [{ type: 'kill', enemyType: 'marauder', count: 3, label: 'Marodeure getötet' }],
    rewards: { xp: 140, gold: 80, items: [{ itemId: 'revolver', quantity: 1 }, { itemId: 'ammo_357', quantity: 12 }] },
  },
  pump_parts: {
    id: 'pump_parts',
    name: 'Trockenlauf',
    level: 2,
    giverNpc: 'pumpenwart',
    turnInNpc: 'pumpenwart',
    requires: null,
    offerText:
      'Die Pumpe saugt Luft. Dichtung hinüber, Gestänge verbogen. Ich brauche Schrottmetall und Panzerband, mehr nicht. Ohne Wasser brauchen wir uns um alles andere keine Gedanken zu machen.',
    progressText: 'Schrott und Panzerband. Das Gestänge richte ich selbst, wenn du mir das Material bringst.',
    completeText: 'Das hält. Vorerst. Hier, etwas für die Mühe. Trink was, bevor du wieder losziehst.',
    objectives: [
      { type: 'collect', itemId: 'scrap_metal', count: 5 },
      { type: 'collect', itemId: 'duct_tape', count: 2 },
    ],
    rewards: { xp: 70, gold: 30, items: [{ itemId: 'canned_food', quantity: 2 }, { itemId: 'bandage', quantity: 1 }] },
  },
  pump_valve: {
    id: 'pump_valve',
    name: 'Das fehlende Ventil',
    level: 2,
    giverNpc: 'pumpenwart',
    turnInNpc: 'pumpenwart',
    requires: 'pump_parts',
    offerText:
      'Das Absperrventil hat jemand ausgebaut. So etwas macht einer, der Tauschware sucht. Ich habe ihn gesehen, wie er nach Süden verschwand, mit dem Ding unter der Plane eines Wracks. Es war ein Wrack mit grüner Plane, südlich der Stromleitung, nicht weit vom Plünderer-Zelt. Schau dir die Stelle an und gib mir Bescheid, ob es noch da ist.',
    progressText: 'Das Wrack mit der grünen Plane. Südlich der Stromleitung, unweit vom Plünderer-Zelt.',
    completeText: 'Da lag es also. Wie dreist. Ich hole es später selbst, wenn die Luft rein ist. Hier, du hast dir das verdient.',
    objectives: [{ type: 'reach', zone: 'startwelt', x: -18, z: 24.5, radius: 4.5, count: 1, label: 'Wrack mit der grünen Plane untersuchen' }],
    rewards: { xp: 90, gold: 40, items: [{ itemId: 'hard_hat', quantity: 1 }] },
  },
  pump_dogs: {
    id: 'pump_dogs',
    name: 'Rudel am Brunnen',
    level: 3,
    giverNpc: 'pumpenwart',
    turnInNpc: 'pumpenwart',
    requires: 'pump_valve',
    offerText:
      'Seit ein paar Nächten schleicht ein Rudel um den Wasserturm. Sie riechen die Feuchtigkeit und werden dreister. Ich will nicht, dass morgen jemand mit zerfetzter Wade am Brunnen liegt. Erledige sie.',
    progressText: 'Streunende und wilde Hunde. Sie lauern am Rand der Siedlung.',
    completeText: 'Endlich Ruhe. Das war nicht schön, aber nötig. Nimm das, ich habe es noch aus besseren Zeiten.',
    objectives: [
      { type: 'kill', enemyType: 'stray_dog', count: 3, label: 'Streunende Hunde getötet' },
      { type: 'kill', enemyType: 'feral_dog', count: 2, label: 'Wilde Hunde getötet' },
    ],
    rewards: { xp: 110, gold: 45, items: [{ itemId: 'medkit', quantity: 1 }] },
  },
  radio_power: {
    id: 'radio_power',
    name: 'Strom für die Stimme',
    level: 3,
    giverNpc: 'funkerin',
    turnInNpc: 'funkerin',
    requires: null,
    offerText:
      'Mein Funkgerät läuft auf Batterien, und die sind alle. Eine einzige frische, dazu Panzerband für die Kontakte und etwas Schrott für das Gehäuse. Gutes Gerät ist wertvoller als gute Freunde. Das Gerät verrät dich nicht.',
    progressText: 'Eine Batterie, zwei Rollen Panzerband, drei Stück Schrott. Dann kann ich weitermachen.',
    completeText: 'Hör dir das an. Rauschen. Wundervolles, ehrliches Rauschen. Hier, für deine Mühe.',
    objectives: [
      { type: 'collect', itemId: 'battery', count: 1 },
      { type: 'collect', itemId: 'duct_tape', count: 2 },
      { type: 'collect', itemId: 'scrap_metal', count: 3 },
    ],
    rewards: { xp: 90, gold: 35, items: [{ itemId: 'ammo_9mm', quantity: 24 }, { itemId: 'bandage', quantity: 2 }] },
  },
  radio_mast: {
    id: 'radio_mast',
    name: 'Der zweite Mast',
    level: 3,
    giverNpc: 'funkerin',
    turnInNpc: 'funkerin',
    requires: 'radio_power',
    offerText:
      'Mein Empfang ist schlecht. Ich vermute, die Antennenleitung ist durchgescheuert. Sie hängt an der Stromtrasse im Süden, am zweiten Mast von Westen aus gezählt. Sieh nach, ob dort etwas hängt oder liegt, das da nicht hingehört, und berichte mir.',
    progressText: 'Die Stromtrasse im Süden. Der zweite Mast von Westen aus gezählt.',
    completeText: 'Durchgescheuert, wie ich dachte. Jemand hat das Kabel gekappt, mit Absicht. Interessant. Und unangenehm.',
    objectives: [{ type: 'reach', zone: 'startwelt', x: -14, z: 20.6, radius: 4.5, count: 1, label: 'Zweiten Mast der Stromtrasse untersuchen' }],
    rewards: { xp: 100, gold: 40, items: [{ itemId: 'duct_tape', quantity: 2 }] },
  },
  radio_containers: {
    id: 'radio_containers',
    name: 'Zwischen den Containern',
    level: 4,
    giverNpc: 'funkerin',
    turnInNpc: 'funkerin',
    requires: 'radio_mast',
    offerText:
      'Ich brauche ein neues Antennenkabel. Im Containerlager im Nordosten liegt welches, in der Gasse zwischen dem grünen und dem ockerfarbenen Container. Dort treiben sich Plünderer herum, räum ein wenig auf, dann sieh dir die Stelle an.',
    progressText: 'Nordöstlich, das Containerlager. Zwischen dem grünen und dem ockerfarbenen Container.',
    completeText: 'Das Kabel ist ab. Ich muss es nur noch finden. Gute Arbeit. Das hier habe ich übrig.',
    objectives: [
      { type: 'kill', enemyType: 'raider', count: 2, label: 'Plünderer getötet' },
      { type: 'reach', zone: 'startwelt', x: 43.5, z: -19.4, radius: 4.5, count: 1, label: 'Gasse zwischen grünem und ockerfarbenem Container aufsuchen' },
    ],
    rewards: { xp: 130, gold: 60, items: [{ itemId: 'motorcycle_helmet', quantity: 1 }] },
  },
  sewer_passage: {
    id: 'sewer_passage',
    name: 'Der Weg unter der Erde',
    level: 5,
    giverNpc: 'kanalwaerter',
    turnInNpc: 'barbier',
    requires: 'radio_containers',
    offerText:
      'Du hast dich hier bewiesen. Der Deckel hinter mir führt in einen Schacht, der weit unter Sektor 7 hindurchläuft. Ich war nie ganz unten, und wer von unten zurückkam, redet nicht gern darüber. Geh durch die Pumpenhalle, räum den Rattenkönig aus dem Weg und such den Ausgang am anderen Ende. Am Ende soll es eine Stadt geben, heißt es. Ich weiß nicht, was stimmt. Nimm Licht mit, und lass dich nicht von den Wasserstellen überraschen.',
    progressText: 'Pumpenhalle, Rattenkönig, Ausgang. Der Weg liegt unter dem Deckel.',
    completeText:
      'Aus der Kanalisation? Und noch alle Finger dran? Setz dich, bevor du mir vom Stuhl kippst. Eine Rasur geht aufs Haus, so viel Mut belohne ich. Willkommen in Babylos.',
    objectives: [
      { type: 'reach', zone: 'kanalisation', x: 0, z: -5, radius: 9, count: 1, label: 'Pumpenhalle in der Kanalisation erreichen' },
      { type: 'kill', enemyType: 'rat_king', count: 1, label: 'Rattenkönig getötet' },
      { type: 'reach', zone: 'kanalisation', x: 0, z: -116, radius: 7, count: 1, label: 'Ausgang am Ende der Kanalisation erreichen' },
    ],
    rewards: { xp: 900, gold: 150, items: [{ itemId: 'medkit', quantity: 2 }] },
  },
};

export const QUESTS = { ...BASE_QUESTS, ...MORDFALL_QUESTS, ...BARON_QUESTS, ...JAGD_QUESTS };

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
  if (objective.type !== 'collect') return Math.min(objective.count, entry.progress[index] ?? 0);
  return Math.min(objective.count, countItem(player.inventory, objective.itemId));
}

function serializeObjectives(player, quest, entry) {
  return quest.objectives.map((objective, index) => ({
    label: objectiveLabel(objective),
    itemId: objective.itemId,
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
  if (quest.requiresAny && !quest.requiresAny.some((questId) => player.quests[questId]?.status === 'completed')) return false;
  if (quest.alsoRequires?.some((questId) => player.quests[questId]?.status !== 'completed')) return false;
  if (quest.excludes?.some((questId) => player.quests[questId])) return false;

  return true;
}

function serializeRewards(quest) {
  return {
    xp: quest.rewards.xp ?? 0,
    gold: quest.rewards.gold ?? 0,
    items: (quest.rewards.items ?? []).map((item) => ({ ...item })),
  };
}

function serializeLogRewards(quest) {
  const rewards = serializeRewards(quest);
  return { ...rewards, items: rewards.items.map((item) => ({ ...item, name: getItem(item.itemId)?.name ?? item.itemId })) };
}

function talkObjective(quest, npcId) {
  return quest.objectives.find((objective) => objective.type === 'talk' && objective.npcId === npcId) ?? null;
}

export function questsForNpc(player, npcId) {
  const list = [];

  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status === 'completed') continue;

    const talk = entry ? talkObjective(quest, npcId) : null;
    const involved = quest.giverNpc === npcId || quest.turnInNpc === npcId || Boolean(talk);
    let state = null;

    if (entry) {
      if (!involved) continue;
      state = quest.turnInNpc === npcId && isReady(player, quest, entry) ? 'ready' : 'active';
    } else if (quest.giverNpc === npcId && isAvailable(player, quest)) {
      state = 'available';
    }

    if (!state) continue;

    const text =
      state === 'available' ? quest.offerText : state === 'ready' ? quest.completeText : talk && quest.turnInNpc !== npcId ? talk.text : quest.progressText;

    list.push({
      id: quest.id,
      name: quest.name,
      state,
      text,
      textIndex: state === 'active' && talk && quest.turnInNpc !== npcId ? quest.objectives.indexOf(talk) : null,
      objectives: serializeObjectives(player, quest, entry),
      rewards: serializeRewards(quest),
      turnInNpc: quest.turnInNpc,
      turnInName: getNpcDefinition(quest.turnInNpc)?.name ?? '',
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
      turnInNpc: quest.turnInNpc,
      turnInName: getNpcDefinition(quest.turnInNpc)?.name ?? '',
      giverName: getNpcDefinition(quest.giverNpc)?.name ?? '',
      level: quest.level,
      description: quest.offerText ?? '',
      progressText: quest.progressText ?? '',
      rewards: serializeLogRewards(quest),
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
          index,
          label: objective.label,
          itemId: objective.itemId,
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

export function recordPosition(player) {
  if (player.dead) return;

  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status !== 'active') continue;

    quest.objectives.forEach((objective, index) => {
      if (
        objective.type === 'reach' &&
        entry.progress[index] < objective.count &&
        objective.zone === player.zoneId &&
        Math.hypot(player.x - objective.x, player.z - objective.z) <= objective.radius
      ) {
        entry.progress[index] = objective.count;
        player.dataVersion += 1;
      }
    });
  }
}

export function recordTalk(player, npcId) {
  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status !== 'active') continue;

    quest.objectives.forEach((objective, index) => {
      if (objective.type === 'talk' && objective.npcId === npcId && entry.progress[index] < objective.count) {
        entry.progress[index] = objective.count;
        player.dataVersion += 1;
      }
    });
  }
}

function pendingInspect(player, quest, entry, ref) {
  return quest.objectives.findIndex(
    (objective, index) => objective.type === 'inspect' && objective.ref === ref && entry.progress[index] < objective.count
  );
}

export function visibleQuestObjectRefs(player) {
  const refs = new Set();

  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status !== 'active') continue;

    quest.objectives.forEach((objective, index) => {
      if (objective.type === 'inspect' && entry.progress[index] < objective.count) refs.add(objective.ref);
    });
  }

  return refs;
}

export function recordInspect(player, ref) {
  const texts = [];

  for (const quest of Object.values(QUESTS)) {
    const entry = player.quests[quest.id];
    if (entry?.status !== 'active') continue;

    const index = pendingInspect(player, quest, entry, ref);
    if (index < 0) continue;

    entry.progress[index] = quest.objectives[index].count;
    player.dataVersion += 1;
    if (quest.objectives[index].text) texts.push({ questId: quest.id, index, text: quest.objectives[index].text });
  }

  return texts;
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
    notify(playerId, { type: 'event', kind: 'xp', amount: xpAmount, enemyName: quest.name, questId: quest.id });
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

export function abandonQuest(player, playerId, questId, notify) {
  const quest = getQuest(questId);
  if (!quest || player.quests[quest.id]?.status !== 'active') return fail(notify, playerId, 'invalid');

  delete player.quests[quest.id];
  player.dataVersion += 1;

  notify(playerId, { type: 'event', kind: 'quest-abandoned', questId: quest.id, name: quest.name });

  return true;
}
