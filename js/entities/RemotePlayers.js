import * as THREE from 'three';
import { createPlayer } from './Player.js';
import { dampFactor, lerpAngle } from '../utils/Interpolation.js';

const REMOTE_PLAYER_COLOR = 0xd9534f;
const SMOOTHING = 12;

export function createRemotePlayers(scene) {
  const remotePlayers = new Map();

  function upsert(id, state) {
    let remote = remotePlayers.get(id);

    if (!remote) {
      const created = createPlayer(REMOTE_PLAYER_COLOR);
      scene.add(created.object);

      remote = {
        object: created.object,
        setPosition: created.setPosition,
        target: new THREE.Vector3(state.x, state.y, state.z),
        targetRotationY: state.rotationY ?? 0,
      };

      remote.setPosition(state.x, state.y, state.z);
      remote.object.rotation.y = remote.targetRotationY;

      remotePlayers.set(id, remote);
      return;
    }

    remote.target.set(state.x, state.y, state.z);
    remote.targetRotationY = state.rotationY ?? remote.targetRotationY;
  }

  function remove(id) {
    const remote = remotePlayers.get(id);
    if (!remote) return;
    scene.remove(remote.object);
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

  function update(delta) {
    const factor = dampFactor(SMOOTHING, delta);
    for (const remote of remotePlayers.values()) {
      remote.object.position.lerp(remote.target, factor);
      remote.object.rotation.y = lerpAngle(remote.object.rotation.y, remote.targetRotationY, factor);
    }
  }

  return { sync, remove, update };
}
