import { createChest, createCoinPouch } from '../world/builders/LootProps.js';

const GLINT_SPEED = 3;
const POUCH_SCALE = 1.4;

export function createLootMarkers(scene) {
  const markers = new Map();
  let elapsed = 0;

  function add(data) {
    if (markers.has(data.id)) return;

    const isChest = data.kind === 'chest';
    const object = isChest ? createChest({ open: true }) : createCoinPouch();
    object.position.set(data.x, data.y, data.z);
    object.rotation.y = data.rotationY ?? 0;
    if (!isChest) object.scale.setScalar(POUCH_SCALE);
    object.userData.isLoot = true;
    object.userData.lootId = data.id;

    scene.add(object);
    markers.set(data.id, { object, pulses: !isChest });
  }

  function remove(id) {
    const marker = markers.get(id);
    if (!marker) return;

    scene.remove(marker.object);
    markers.delete(id);
  }

  function clear() {
    for (const id of Array.from(markers.keys())) remove(id);
  }

  function getObjects() {
    return Array.from(markers.values(), (marker) => marker.object);
  }

  function getPosition(id) {
    return markers.get(id)?.object.position ?? null;
  }

  function update(delta) {
    elapsed += delta;
    const pulse = 1 + Math.sin(elapsed * GLINT_SPEED) * 0.04;

    for (const marker of markers.values()) {
      if (marker.pulses) marker.object.scale.setScalar(POUCH_SCALE * pulse);
    }
  }

  return { add, remove, clear, getObjects, getPosition, update };
}
