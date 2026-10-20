import * as THREE from 'three';
import { createPlayer } from './Characters.js';
import { dampFactor, lerpAngle } from '../utils/Interpolation.js';

const SMOOTHING = 12;
const NAMEPLATE_HEIGHT = 2.2;

export function createRemotePlayers(scene, camera, nameplateContainer) {
  const remotePlayers = new Map();
  const projected = new THREE.Vector3();

  function createNameplateElement(name) {
    const el = document.createElement('div');
    el.className = 'nameplate';
    el.textContent = name;
    nameplateContainer.appendChild(el);
    return el;
  }

  function upsert(id, state) {
    let remote = remotePlayers.get(id);
    const name = state.characterName ?? '???';

    if (!remote) {
      const created = createPlayer('remote', state.appearance);
      scene.add(created.object);

      remote = {
        object: created.object,
        setPosition: created.setPosition,
        animate: created.update,
        playAttack: created.playAttack,
        playHit: created.playHit,
        setDead: created.setDead,
        setEquipment: created.setEquipment,
        setAppearance: created.setAppearance,
        target: new THREE.Vector3(state.x, state.y, state.z),
        targetRotationY: state.rotationY ?? 0,
        nameplateEl: createNameplateElement(name),
      };

      remote.setPosition(state.x, state.y, state.z);
      remote.object.rotation.y = remote.targetRotationY;
      remote.setEquipment(state.equipment);
      remote.setDead(state.dead);

      remotePlayers.set(id, remote);
      return;
    }

    remote.target.set(state.x, state.y, state.z);
    remote.targetRotationY = state.rotationY ?? remote.targetRotationY;
    remote.setEquipment(state.equipment);
    remote.setAppearance(state.appearance);
    remote.setDead(state.dead);

    if (remote.nameplateEl.textContent !== name) {
      remote.nameplateEl.textContent = name;
    }
  }

  function remove(id) {
    const remote = remotePlayers.get(id);
    if (!remote) return;
    scene.remove(remote.object);
    nameplateContainer.removeChild(remote.nameplateEl);
    remotePlayers.delete(id);
  }

  function sync(playersState, ownId) {
    const seenIds = new Set();

    for (const [id, state] of Object.entries(playersState)) {
      if (id === ownId) continue;
      seenIds.add(id);
      upsert(id, state);
    }

    for (const id of remotePlayers.keys()) {
      if (!seenIds.has(id)) remove(id);
    }
  }

  function updateNameplatePosition(remote) {
    projected.set(remote.object.position.x, remote.object.position.y + NAMEPLATE_HEIGHT, remote.object.position.z);
    projected.project(camera);

    if (projected.z > 1) {
      remote.nameplateEl.style.display = 'none';
      return;
    }

    remote.nameplateEl.style.display = 'block';
    const screenX = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    remote.nameplateEl.style.left = `${screenX}px`;
    remote.nameplateEl.style.top = `${screenY}px`;
  }

  function update(delta) {
    const factor = dampFactor(SMOOTHING, delta);
    for (const remote of remotePlayers.values()) {
      remote.object.position.lerp(remote.target, factor);
      remote.object.rotation.y = lerpAngle(remote.object.rotation.y, remote.targetRotationY, factor);
      remote.animate(delta);
      updateNameplatePosition(remote);
    }
  }

  function playAttack(id) {
    remotePlayers.get(id)?.playAttack();
  }

  function playHit(id) {
    remotePlayers.get(id)?.playHit();
  }

  function getObject(id) {
    return remotePlayers.get(id)?.object ?? null;
  }

  function getMarkers() {
    return Array.from(remotePlayers, ([id, remote]) => ({
      key: `player-${id}`,
      x: remote.object.position.x,
      z: remote.object.position.z,
    }));
  }

  return { sync, remove, playAttack, playHit, getObject, getMarkers, update };
}
