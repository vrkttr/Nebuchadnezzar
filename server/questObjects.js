import { getZone } from './zoneLoader.js';
import { recordInspect, visibleQuestObjectRefs } from './quests.js';

const INSPECT_RANGE = 4;

export function serializeQuestObjects(player) {
  const zone = getZone(player.zoneId);
  if (!zone || zone.questObjects.length === 0) return [];

  const refs = visibleQuestObjectRefs(player);
  return zone.questObjects
    .filter((entry) => refs.has(entry.id))
    .map(({ id, x, z, rotationY, model, name }) => ({ id, x, y: 0, z, rotationY, model, name }));
}

export function inspectQuestObject(player, playerId, objectId, notify) {
  if (player.dead) return;

  const zone = getZone(player.zoneId);
  const entry = zone?.questObjects.find((candidate) => candidate.id === objectId);
  if (!entry || !visibleQuestObjectRefs(player).has(entry.id)) return;

  if (Math.hypot(player.x - entry.x, player.z - entry.z) > INSPECT_RANGE) {
    notify(playerId, { type: 'event', kind: 'inspect-failed', reason: 'too-far' });
    return;
  }

  const texts = recordInspect(player, entry.id);
  notify(playerId, { type: 'event', kind: 'quest-inspect', name: entry.name, text: texts.join('\n\n') });
}

