import * as THREE from 'three';
import { createEnemy } from './Characters.js';
import { dampFactor, lerpAngle } from '../utils/Interpolation.js';
import { createOcclusion } from '../utils/Occlusion.js';

const NAMEPLATE_HEIGHT = 2.2;
const SMOOTHING = 12;
const CORPSE_DURATION = 4;
const NAMEPLATE_RANGE = 35;

export function createEnemies(scene, camera, nameplateContainer, player) {
  const enemies = new Map();
  const projected = new THREE.Vector3();
  const occlusion = createOcclusion();
  const plateAnchor = new THREE.Vector3();

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.75, 32),
    new THREE.MeshBasicMaterial({ color: 0xd9432b, side: THREE.DoubleSide })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.visible = false;
  scene.add(selectionRing);

  let selectedId = null;

  function labelFor(data) {
    return `${data.name} (Lv ${data.level})`;
  }

  function applyVisibility(enemy) {
    const dead = Boolean(enemy.data.dead);

    if (dead !== enemy.wasDead) {
      enemy.setDead(dead);
      enemy.corpseTime = 0;
      if (!dead) enemy.object.position.copy(enemy.target);
      enemy.wasDead = dead;
    }

    enemy.object.visible = !dead || enemy.corpseTime < CORPSE_DURATION;
    enemy.nameplateEl.style.display = dead ? 'none' : 'block';
  }

  function add(data) {
    const { object, update: animate, playAttack, playHit, setDead } = createEnemy(data.id, data.type);
    object.position.set(data.x, data.y, data.z);
    object.rotation.y = data.rotationY ?? 0;
    scene.add(object);

    const nameplateEl = document.createElement('div');
    nameplateEl.className = 'nameplate nameplate-enemy';
    nameplateEl.textContent = labelFor(data);
    nameplateContainer.appendChild(nameplateEl);

    const enemy = {
      data,
      object,
      animate,
      playAttack,
      playHit,
      setDead,
      wasDead: false,
      corpseTime: 0,
      nameplateEl,
      target: new THREE.Vector3(data.x, data.y, data.z),
      targetRotationY: data.rotationY ?? 0,
    };

    enemies.set(data.id, enemy);
    applyVisibility(enemy);
  }

  function remove(id) {
    const enemy = enemies.get(id);
    if (!enemy) return;
    scene.remove(enemy.object);
    nameplateContainer.removeChild(enemy.nameplateEl);
    enemies.delete(id);
    if (selectedId === id) clearSelection();
  }

  function sync(list) {
    const seenIds = new Set();

    for (const data of list) {
      seenIds.add(data.id);
      const existing = enemies.get(data.id);

      if (existing) {
        Object.assign(existing.data, data);
        existing.target.set(data.x, data.y, data.z);
        existing.targetRotationY = data.rotationY ?? existing.targetRotationY;
        existing.nameplateEl.textContent = labelFor(existing.data);
        applyVisibility(existing);
      } else {
        add(data);
      }
    }

    for (const id of Array.from(enemies.keys())) {
      if (!seenIds.has(id)) remove(id);
    }
  }

  function applyStates(list) {
    for (const data of list) {
      const existing = enemies.get(data.id);
      if (!existing) continue;

      Object.assign(existing.data, data);
      existing.target.set(data.x, data.y, data.z);
      existing.targetRotationY = data.rotationY ?? existing.targetRotationY;
      applyVisibility(existing);
    }
  }

  function clear() {
    for (const id of Array.from(enemies.keys())) remove(id);
    clearSelection();
  }

  function getObjects() {
    return Array.from(enemies.values())
      .filter((enemy) => !enemy.data.dead)
      .map((enemy) => enemy.object);
  }

  function findDataByObject(object) {
    let current = object;
    while (current && !current.userData.isEnemy) {
      current = current.parent;
    }
    if (!current) return null;
    return enemies.get(current.userData.enemyId)?.data ?? null;
  }

  function select(id) {
    if (!enemies.has(id)) return;
    selectedId = id;
  }

  function clearSelection() {
    selectedId = null;
    selectionRing.visible = false;
  }

  function updateNameplate(enemy) {
    if (enemy.data.dead) return;

    plateAnchor.set(
      enemy.object.position.x,
      enemy.object.position.y + (enemy.object.userData.nameplateHeight ?? NAMEPLATE_HEIGHT),
      enemy.object.position.z
    );
    const hidden =
      plateAnchor.distanceTo(camera.position) > NAMEPLATE_RANGE || occlusion.isBlocked(camera.position, plateAnchor);
    projected.copy(plateAnchor).project(camera);

    if (hidden || projected.z > 1) {
      enemy.nameplateEl.style.display = 'none';
      return;
    }

    enemy.nameplateEl.style.display = 'block';
    enemy.nameplateEl.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
    enemy.nameplateEl.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
  }

  function update(delta) {
    const factor = dampFactor(SMOOTHING, delta);

    for (const enemy of enemies.values()) {
      enemy.object.position.lerp(enemy.target, factor);
      enemy.object.rotation.y = lerpAngle(enemy.object.rotation.y, enemy.targetRotationY, factor);
      if (enemy.data.dead) {
        enemy.corpseTime += delta;
        if (enemy.corpseTime >= CORPSE_DURATION) enemy.object.visible = false;
      }

      if (enemy.object.visible) enemy.animate(delta);
      updateNameplate(enemy);
    }

    const selected = selectedId ? enemies.get(selectedId) : null;

    if (selected && !selected.data.dead) {
      selectionRing.visible = true;
      selectionRing.position.set(
        selected.object.position.x,
        selected.object.position.y + 0.03,
        selected.object.position.z
      );
    } else {
      selectionRing.visible = false;
    }
  }

  function getObject(id) {
    return enemies.get(id)?.object ?? null;
  }

  function getMarkers() {
    return Array.from(enemies.values())
      .filter((enemy) => !enemy.data.dead)
      .map((enemy) => ({ key: `enemy-${enemy.data.id}`, x: enemy.object.position.x, z: enemy.object.position.z }));
  }

  function getType(id) {
    return enemies.get(id)?.data.type;
  }

  function playAttack(id) {
    enemies.get(id)?.playAttack();
  }

  function playHit(id) {
    enemies.get(id)?.playHit();
  }

  const toEnemy = new THREE.Vector3();
  const cameraForward = new THREE.Vector3();

  function getTargetCandidates(maxRange) {
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();

    const origin = camera.position;
    const front = [];
    const back = [];

    for (const enemy of enemies.values()) {
      if (enemy.data.dead || !enemy.object.visible) continue;

      toEnemy.set(
        enemy.object.position.x - origin.x,
        0,
        enemy.object.position.z - origin.z
      );
      const distance = Math.hypot(enemy.object.position.x - player.x, enemy.object.position.z - player.z);
      if (distance > maxRange) continue;

      plateAnchor.set(enemy.object.position.x, enemy.object.position.y + 1, enemy.object.position.z);
      if (occlusion.isBlocked(origin, plateAnchor)) continue;

      toEnemy.normalize();
      (toEnemy.dot(cameraForward) > 0 ? front : back).push({ id: enemy.data.id, distance });
    }

    front.sort((a, b) => a.distance - b.distance);
    back.sort((a, b) => a.distance - b.distance);
    return [...front, ...back].map((entry) => entry.id);
  }

  return { getData: (id) => enemies.get(id)?.data ?? null, getTargetCandidates, setBlockers: occlusion.setBlockers, has: (id) => enemies.has(id), add, remove, sync, clear, applyStates, getObjects, findDataByObject, select, clearSelection, playAttack, getObject, getMarkers, getType, playHit, update };
}
