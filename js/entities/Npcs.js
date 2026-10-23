import * as THREE from 'three';
import { createNpc } from './Characters.js';
import { createOcclusion } from '../utils/Occlusion.js';

const PLATE_HEIGHT = 2.2;
const PLATE_RANGE = 45;
const MARKER_SYMBOLS = { available: '!', ready: '?' };

export function createNpcs(scene, camera, nameplateContainer) {
  const npcs = new Map();
  const projected = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const occlusion = createOcclusion();

  function sync(list) {
    for (const data of list) {
      if (npcs.has(data.id)) continue;

      const { object, update: animate } = createNpc(data);
      object.position.set(data.x, data.y, data.z);
      object.rotation.y = data.rotationY ?? 0;
      object.userData.npcId = data.id;
      scene.add(object);

      const plate = document.createElement('div');
      plate.className = 'nameplate nameplate-npc';

      const marker = document.createElement('span');
      marker.className = 'npc-marker';

      const label = document.createElement('span');
      label.textContent = data.name;

      plate.appendChild(marker);
      plate.appendChild(label);
      nameplateContainer.appendChild(plate);

      npcs.set(data.id, { data, object, plate, marker, animate });
    }
  }

  function clear() {
    for (const npc of npcs.values()) {
      scene.remove(npc.object);
      npc.plate.remove();
    }
    npcs.clear();
  }

  function setMarkers(markers) {
    for (const [id, npc] of npcs) {
      const symbol = MARKER_SYMBOLS[markers[id]] ?? '';
      npc.marker.textContent = symbol;
      npc.marker.style.display = symbol ? 'inline' : 'none';
    }
  }

  function getObjects() {
    return Array.from(npcs.values(), (npc) => npc.object);
  }

  function getPosition(id) {
    return npcs.get(id)?.object.position ?? null;
  }

  function getObject(id) {
    return npcs.get(id)?.object ?? null;
  }

  function getPlate(id) {
    return npcs.get(id)?.plate ?? null;
  }

  function update(delta) {
    for (const npc of npcs.values()) {
      npc.animate(delta);
      anchor.set(npc.object.position.x, npc.object.position.y + PLATE_HEIGHT, npc.object.position.z);
      const hidden = anchor.distanceTo(camera.position) > PLATE_RANGE || occlusion.isBlocked(camera.position, anchor);
      projected.copy(anchor).project(camera);

      if (hidden || projected.z > 1) {
        npc.plate.style.display = 'none';
        continue;
      }

      npc.plate.style.display = 'block';
      npc.plate.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
      npc.plate.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
  }

  function getMarkers() {
    return Array.from(npcs, ([id, npc]) => ({ npcId: id, x: npc.object.position.x, z: npc.object.position.z }));
  }

  return { sync, clear, setMarkers, getObjects, getPosition, getObject, getPlate, getMarkers, setBlockers: occlusion.setBlockers, update };
}
