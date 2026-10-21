import { t, tOr, has } from './I18n.js';

function pick(keys, fallback) {
  return tOr(keys, fallback);
}

function itemName(itemId, fallback) {
  return pick([`item.${itemId}.name`], fallback ?? itemId);
}

function localizeItem(item) {
  item.name = itemName(item.id, item.name);
  if (item.description !== undefined) item.description = pick([`item.${item.id}.description`], item.description);
}

function localizeAbility(ability) {
  ability.name = pick([`ability.${ability.id}.name`], ability.name);
  ability.shortName = pick([`ability.${ability.id}.shortName`], ability.shortName);
  if (ability.description !== undefined) ability.description = pick([`ability.${ability.id}.description`], ability.description);
}

function localizeNpc(npc) {
  const id = npc.id ?? npc.npcId;
  npc.name = pick([`npc.${id}.name`], npc.name);
  if (npc.greeting !== undefined) npc.greeting = pick([`npc.${id}.greeting`], npc.greeting);
}

function localizeEnemy(enemy) {
  enemy.name = pick([`enemy.${enemy.type}`], enemy.name);
}

function localizeChest(chest) {
  chest.name = pick([`chest.${chest.id}`, 'chest.default'], chest.name);
}

function localizeWorld(world) {
  world.name = pick([`zone.${world.id}.name`], world.name);
  for (const teleporter of world.teleporters ?? []) {
    teleporter.label = pick([`teleporter.${teleporter.id}`], teleporter.label ?? t('teleporter.default'));
  }
}

function localizeObjectives(questId, objectives) {
  objectives.forEach((objective, index) => {
    const fallback = objective.itemId ? itemName(objective.itemId, objective.label) : objective.label;
    objective.label = pick([`quest.${questId}.objective.${index}`], fallback);
  });
}

function localizeQuest(quest) {
  quest.name = pick([`quest.${quest.id}.name`], quest.name);
  if (quest.text !== undefined) {
    const kind = { available: 'offer', ready: 'complete', active: 'progress' }[quest.state];
    quest.text = pick([`quest.${quest.id}.${kind}`], quest.text);
  }
  if (quest.turnInNpc) quest.turnInName = pick([`npc.${quest.turnInNpc}.name`], quest.turnInName);
  localizeObjectives(quest.id, quest.objectives ?? []);
}

function localizeEvent(event) {
  if (event.enemyType) event.enemyName = pick([`enemy.${event.enemyType}`], event.enemyName);
  if (event.questId && event.kind === 'xp') event.enemyName = pick([`quest.${event.questId}.name`], event.enemyName);
  if (event.questId && event.kind !== 'xp' && event.name !== undefined) {
    event.name = pick([`quest.${event.questId}.name`], event.name);
  }
  if (event.kind === 'quest-progress') {
    event.label = pick([`quest.${event.questId}.objective.${event.index}`], event.itemId ? itemName(event.itemId, event.label) : event.label);
  }
}

export function localizeMessage(message) {
  switch (message.type) {
    case 'init':
      (message.items ?? []).forEach(localizeItem);
      (message.abilities ?? []).forEach(localizeAbility);
      (message.npcs ?? []).forEach(localizeNpc);
      (message.enemies ?? []).forEach(localizeEnemy);
      (message.chests ?? []).forEach(localizeChest);
      if (message.world) localizeWorld(message.world);
      break;
    case 'abilities':
      (message.abilities ?? []).forEach(localizeAbility);
      break;
    case 'zone':
      (message.npcs ?? []).forEach(localizeNpc);
      (message.enemies ?? []).forEach(localizeEnemy);
      (message.chests ?? []).forEach(localizeChest);
      if (message.world) localizeWorld(message.world);
      break;
    case 'npc-window':
      localizeNpc(message);
      (message.quests ?? []).forEach(localizeQuest);
      break;
    case 'vendor-window':
      localizeNpc(message);
      break;
    case 'quests':
      (message.quests ?? []).forEach(localizeQuest);
      break;
    case 'loot-spawn':
    case 'loot-window':
      message.name = message.source === 'chest' ? t('chest.default') : pick([`enemy.${message.source}`], message.name);
      break;
    case 'chat':
      if (message.channel === 'system' && message.key && has(message.key)) message.text = t(message.key);
      break;
    case 'event':
      localizeEvent(message);
      break;
    default:
  }
  return message;
}
