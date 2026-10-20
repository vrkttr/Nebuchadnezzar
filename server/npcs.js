import { getZones } from './zoneLoader.js';

export const NPC_INTERACT_RANGE = 4;

const NPC_DEFINITIONS = {
  streuner: {
    id: 'streuner',
    name: 'Streuner',
    color: 0x5a5240,
    greeting: 'Bleib in Deckung, Fremder. Draußen im Ödland überlebt nicht jeder die Nacht.',
  },
  haendler: {
    id: 'haendler',
    name: 'Schrotthändler',
    color: 0x4a5a3a,
    greeting: 'Metall, Stoff, Konserven – ich nehme alles, was noch einen Wert hat.',
    vendor: {
      stock: [
        { itemId: 'canned_food', price: 8 },
        { itemId: 'ammo_9mm', price: 1 },
        { itemId: 'ammo_762', price: 2 },
        { itemId: 'patched_trousers', price: 25 },
        { itemId: 'scrap_helmet', price: 30 },
        { itemId: 'rusty_pipe', price: 40 },
        { itemId: 'padded_vest', price: 60 },
      ],
    },
  },
};

const NPCS_BY_ZONE = new Map();

for (const zone of getZones()) {
  const placed = {};
  for (const placement of zone.npcs) {
    const definition = NPC_DEFINITIONS[placement.npcId];
    if (!definition) throw new Error(`Zonendatei: Unbekannte npcId "${placement.npcId}".`);
    placed[definition.id] = { ...definition, x: placement.x, y: 0, z: placement.z, rotationY: placement.rotationY };
  }
  NPCS_BY_ZONE.set(zone.id, placed);
}

export function getNpcsOfZone(zoneId) {
  return Object.values(NPCS_BY_ZONE.get(zoneId) ?? {});
}

export function getNpc(npcId, zoneId) {
  const placed = NPCS_BY_ZONE.get(zoneId);
  return placed && typeof npcId === 'string' && Object.hasOwn(placed, npcId) ? placed[npcId] : null;
}

export function getNpcDefinition(npcId) {
  return typeof npcId === 'string' && Object.hasOwn(NPC_DEFINITIONS, npcId) ? NPC_DEFINITIONS[npcId] : null;
}

export function serializeNpcs(zoneId) {
  return getNpcsOfZone(zoneId).map((npc) => ({
    id: npc.id,
    name: npc.name,
    x: npc.x,
    y: npc.y,
    z: npc.z,
    rotationY: npc.rotationY,
    color: npc.color,
  }));
}
