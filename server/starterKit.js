import { addItem } from './inventory.js';

const STARTER_WEAPONS = ['usp_s', 'ak47'];
const STARTER_AMMO = [
  { itemId: 'ammo_9mm', quantity: 45 },
  { itemId: 'ammo_762', quantity: 60 },
];

export function grantStarterKit(inventory, equipment) {
  for (const itemId of STARTER_WEAPONS) {
    if (!equipment.weapon && itemId === STARTER_WEAPONS[0]) equipment.weapon = itemId;
    else addItem(inventory, itemId, 1);
  }

  for (const { itemId, quantity } of STARTER_AMMO) addItem(inventory, itemId, quantity);
}
