import * as THREE from 'three';
import { isKeyDown } from '../input/Keyboard.js';

export function createPlayerController(camera) {
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();

  function getInputState() {
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, camera.up).normalize();

    moveDirection.set(0, 0, 0);
    if (isKeyDown('KeyW')) moveDirection.add(forward);
    if (isKeyDown('KeyS')) moveDirection.sub(forward);
    if (isKeyDown('KeyD')) moveDirection.add(right);
    if (isKeyDown('KeyA')) moveDirection.sub(right);

    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();
    }

    return {
      moveX: moveDirection.x,
      moveZ: moveDirection.z,
      jump: isKeyDown('Space'),
    };
  }

  return { getInputState };
}
