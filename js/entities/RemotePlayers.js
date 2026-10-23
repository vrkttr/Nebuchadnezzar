import * as THREE from 'three';
import { createPlayer } from './Characters.js';
import { dampFactor, lerpAngle } from '../utils/Interpolation.js';
import { createOcclusion } from '../utils/Occlusion.js';

const SMOOTHING = 12;
const NAMEPLATE_HEIGHT = 2.2;
const NAMEPLATE_RANGE = 45;

export function createRemotePlayers(scene, camera, nameplateContainer) {
  const remotePlayers = new Map();
  const projected = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  const occlusion = createOcclusion();
  let relationResolver = null;

  function setNameplateText(el, name, guildName) {
    const key = `${name}|${guildName ?? ''}`;
    if (el.dataset.key === key) return;
    el.dataset.key = key;
    el.replaceChildren();

    const label = document.createElement('span');
    label.textContent = name;
    el.appendChild(label);

    if (guildName) {
      const guild = document.createElement('span');
      guild.className = 'nameplate-guild';
      guild.textContent = `<${guildName}>`;
      el.appendChild(guild);
    }
  }

  function createNameplateElement(name, guildName) {
    const el = document.createElement('div');
    el.className = 'nameplate';
    setNameplateText(el, name, guildName);
    nameplateContainer.appendChild(el);
    return el;
  }

  function upsert(id, state) {
    let remote = remotePlayers.get(id);
    const name = state.characterName ?? '???';

    if (!remote) {
      const created = createPlayer('remote', state.appearance);
      created.object.userData.isPlayer = true;
      created.object.userData.playerId = id;
      scene.add(created.object);

      remote = {
        object: created.object,
        setPosition: created.setPosition,
        animate: created.update,
        playAttack: created.playAttack,
        playHit: created.playHit,
        setDead: created.setDead,
        setCrouch: created.setCrouch,
        setGroundVelocity: created.setGroundVelocity,
        setGroundHeight: created.setGroundHeight,
        setEquipment: created.setEquipment,
        setAppearance: created.setAppearance,
        target: new THREE.Vector3(state.x, state.y, state.z),
        targetRotationY: state.rotationY ?? 0,
        nameplateEl: createNameplateElement(name, state.guildName),
        data: state,
        id,
      };

      remote.setPosition(state.x, state.y, state.z);
      remote.object.rotation.y = remote.targetRotationY;
      remote.setEquipment(state.equipment);
      remote.setDead(state.dead);
      remote.setCrouch(state.crouching);

      remotePlayers.set(id, remote);
      return;
    }

    remote.data = state;
    remote.target.set(state.x, state.y, state.z);
    remote.targetRotationY = state.rotationY ?? remote.targetRotationY;
    remote.setEquipment(state.equipment);
    remote.setAppearance(state.appearance);
    remote.setDead(state.dead);
    remote.setCrouch(state.crouching);

    setNameplateText(remote.nameplateEl, name, state.guildName);
  }

  function remove(id) {
    const remote = remotePlayers.get(id);
    if (!remote) return;
    scene.remove(remote.object);
    nameplateContainer.removeChild(remote.nameplateEl);
    remotePlayers.delete(id);
  }

  function clear() {
    for (const id of Array.from(remotePlayers.keys())) remove(id);
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
    anchor.set(remote.object.position.x, remote.object.position.y + NAMEPLATE_HEIGHT, remote.object.position.z);
    const hidden = anchor.distanceTo(camera.position) > NAMEPLATE_RANGE || occlusion.isBlocked(camera.position, anchor);
    projected.copy(anchor).project(camera);

    if (hidden || projected.z > 1) {
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
      const relation = relationResolver && remote.data ? relationResolver(remote.id, remote.data) : null;
      remote.nameplateEl.classList.toggle('nameplate-party', relation === 'party');
      remote.nameplateEl.classList.toggle('nameplate-guildmate', relation === 'guild');
    }
  }

  function playAttack(id, style) {
    remotePlayers.get(id)?.playAttack(style);
  }

  function playHit(id) {
    remotePlayers.get(id)?.playHit();
  }

  function getObject(id) {
    return remotePlayers.get(id)?.object ?? null;
  }

  function getNameplate(id) {
    return remotePlayers.get(id)?.nameplateEl ?? null;
  }

  function setRelationResolver(resolver) {
    relationResolver = resolver;
  }

  function getObjects() {
    return Array.from(remotePlayers.values(), (remote) => remote.object);
  }

  function getData(id) {
    return remotePlayers.get(id)?.data ?? null;
  }

  function getMarkers() {
    return Array.from(remotePlayers, ([id, remote]) => ({
      key: `player-${id}`,
      x: remote.object.position.x,
      z: remote.object.position.z,
    }));
  }

  function setEnvironment(velocityX, velocityZ, heightAt, deckHeight) {
    for (const remote of remotePlayers.values()) {
      const ground = heightAt(remote.object.position.x, remote.object.position.z);
      if (remote.data.onTrain) {
        remote.setGroundVelocity(velocityX, velocityZ);
        remote.setGroundHeight(Math.max(ground, deckHeight));
      } else {
        remote.setGroundVelocity(0, 0);
        remote.setGroundHeight(ground);
      }
    }
  }

  return { setEnvironment, sync, clear, remove, playAttack, playHit, getObject, getNameplate, setRelationResolver, getObjects, getData, getMarkers, setBlockers: occlusion.setBlockers, update };
}
