export const NPC_INTERACT_RANGE = 4;

export const NPCS = {
  streuner: {
    id: 'streuner',
    name: 'Streuner',
    x: -4.6,
    y: 0,
    z: -9.2,
    rotationY: 0.3,
    color: 0x5a5240,
    greeting: 'Bleib in Deckung, Fremder. Draußen im Ödland überlebt nicht jeder die Nacht.',
  },
  haendler: {
    id: 'haendler',
    name: 'Schrotthändler',
    x: 21.2,
    y: 0,
    z: 4,
    rotationY: -1.57,
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
