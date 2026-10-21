import * as THREE from 'three';
import { isKeyDown } from '../input/Keyboard.js';

export function createPlayerController(camera) {
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();
  const buttons = { left: false, right: false };

  window.addEventListener('mousedown', (event) => {
    if (event.target.tagName !== 'CANVAS') return;
    if (event.button === 0) buttons.left = true;
    if (event.button === 2) buttons.right = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) buttons.left = false;
    if (event.button === 2) buttons.right = false;
  });
  window.addEventListener('blur', () => {
    buttons.left = false;
    buttons.right = false;
  });

  function getInputState() {
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, camera.up).normalize();

    moveDirection.set(0, 0, 0);
    if (isKeyDown('KeyW') || (buttons.left && buttons.right)) moveDirection.add(forward);
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
      run: isKeyDown('ShiftLeft') || isKeyDown('ShiftRight'),
      crouch: isKeyDown('ControlLeft') || isKeyDown('ControlRight'),
    };
  }

  return { getInputState };
}
