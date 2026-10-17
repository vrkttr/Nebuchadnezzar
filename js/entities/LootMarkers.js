import * as THREE from 'three';

const BASE_HEIGHT = 0.35;
const BOB_AMPLITUDE = 0.08;
const BOB_SPEED = 2.2;
const SPIN_SPEED = 1;

export function createLootMarkers(scene) {
  const markers = new Map();
  const geometry = new THREE.BoxGeometry(0.5, 0.36, 0.4);
  const material = new THREE.MeshBasicMaterial({ color: 0xd98f2b });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x241a08 });
  const edgeGeometry = new THREE.EdgesGeometry(geometry);

  let elapsed = 0;

  function add(data) {
    if (markers.has(data.id)) return;

    const object = new THREE.Group();
    object.add(new THREE.Mesh(geometry, material));
    object.add(new THREE.LineSegments(edgeGeometry, edgeMaterial));
    object.position.set(data.x, data.y + BASE_HEIGHT, data.z);
    object.userData.isLoot = true;
    object.userData.lootId = data.id;

    scene.add(object);
    markers.set(data.id, { object, baseY: data.y + BASE_HEIGHT });
  }

  function remove(id) {
    const marker = markers.get(id);
    if (!marker) return;

    scene.remove(marker.object);
    markers.delete(id);
  }

  function getObjects() {
    return Array.from(markers.values(), (marker) => marker.object);
  }

  function getPosition(id) {
    return markers.get(id)?.object.position ?? null;
  }

  function update(delta) {
    elapsed += delta;

    for (const marker of markers.values()) {
      marker.object.position.y = marker.baseY + Math.sin(elapsed * BOB_SPEED) * BOB_AMPLITUDE;
      marker.object.rotation.y += SPIN_SPEED * delta;
    }
  }

  return { add, remove, getObjects, getPosition, update };
}
