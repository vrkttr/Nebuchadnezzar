import * as THREE from 'three';
import { createEnemy } from './Characters.js';
import { dampFactor, lerpAngle } from '../utils/Interpolation.js';

const NAMEPLATE_HEIGHT = 2.2;
const SMOOTHING = 12;
const CORPSE_DURATION = 4;

export function createEnemies(scene, camera, nameplateContainer) {
  const enemies = new Map();
  const projected = new THREE.Vector3();

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

    projected.set(
      enemy.object.position.x,
      enemy.object.position.y + NAMEPLATE_HEIGHT,
      enemy.object.position.z
    );
    projected.project(camera);

    if (projected.z > 1) {
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
      .map((enemy) => ({ x: enemy.object.position.x, z: enemy.object.position.z }));
  }

  function playAttack(id) {
    enemies.get(id)?.playAttack();
  }

  function playHit(id) {
    enemies.get(id)?.playHit();
  }

  return { sync, applyStates, getObjects, findDataByObject, select, clearSelection, playAttack, getObject, getMarkers, playHit, update };
}
