import { zone } from './zoneLoader.js';

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
        { itemId: 'patched_trousers', price: 25 },
        { itemId: 'scrap_helmet', price: 30 },
        { itemId: 'rusty_pipe', price: 40 },
        { itemId: 'padded_vest', price: 60 },
      ],
    },
  },
};

export const NPCS = {};

for (const placement of zone.npcs) {
  const definition = NPC_DEFINITIONS[placement.npcId];
  if (!definition) throw new Error(`Zonendatei: Unbekannte npcId "${placement.npcId}".`);
  NPCS[definition.id] = { ...definition, x: placement.x, y: 0, z: placement.z, rotationY: placement.rotationY };
}

export function getNpc(npcId) {
  return typeof npcId === 'string' && Object.hasOwn(NPCS, npcId) ? NPCS[npcId] : null;
}

export function serializeNpcs() {
  return Object.values(NPCS).map((npc) => ({
    id: npc.id,
    name: npc.name,
    x: npc.x,
    y: npc.y,
    z: npc.z,
    rotationY: npc.rotationY,
    color: npc.color,
  }));
}
