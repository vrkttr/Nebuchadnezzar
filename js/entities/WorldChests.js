import { createChest } from '../world/builders/LootProps.js';

export function createWorldChests(scene) {
  const chests = new Map();

  function add(data) {
    if (chests.has(data.id)) return;

    const object = createChest({ open: false });
    object.position.set(data.x, data.y ?? 0, data.z);
    object.rotation.y = data.rotationY ?? 0;
    object.userData.isChest = true;
    object.userData.chestId = data.id;

    scene.add(object);
    chests.set(data.id, object);
  }

  function remove(id) {
    const object = chests.get(id);
    if (!object) return;

    scene.remove(object);
    chests.delete(id);
  }

  function clear() {
    for (const id of Array.from(chests.keys())) remove(id);
  }

  function sync(list) {
    clear();
    for (const data of list) add(data);
  }

  function getObjects() {
    return Array.from(chests.values());
  }

  return { add, remove, clear, sync, getObjects };
}
