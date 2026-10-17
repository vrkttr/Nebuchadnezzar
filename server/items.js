export const ITEMS = {
  scrap_metal: {
    id: 'scrap_metal',
    name: 'Schrottmetall',
    shortName: 'SM',
    type: 'material',
    quality: 'common',
    level: 1,
    stackSize: 20,
    description: 'Verrostete Metallteile.',
  },
  rag_bundle: {
    id: 'rag_bundle',
    name: 'Stoffreste',
    shortName: 'SR',
    type: 'material',
    quality: 'common',
    level: 1,
    stackSize: 20,
    description: 'Zerrissene Stoffstücke.',
  },
  canned_food: {
    id: 'canned_food',
    name: 'Konservendose',
    shortName: 'KD',
    type: 'consumable',
    quality: 'common',
    level: 1,
    stackSize: 10,
    description: 'Verschlossen und noch genießbar.',
  },
  rusty_pipe: {
    id: 'rusty_pipe',
    name: 'Rostiges Rohr',
    shortName: 'RR',
    type: 'weapon',
    quality: 'uncommon',
    level: 1,
    stackSize: 1,
    description: 'Schwer und stumpf.',
  },
};

export function getItem(itemId) {
  return ITEMS[itemId] ?? null;
}

export function serializeItems() {
  return Object.values(ITEMS);
}
