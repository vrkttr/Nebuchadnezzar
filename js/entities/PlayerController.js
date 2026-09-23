import * as THREE from 'three';
import { isKeyDown } from '../input/Keyboard.js';

/**
 * Ermittelt pro Aufruf die aktuelle Bewegungsabsicht des Spielers
 * (WASD relativ zur Kamerarichtung, Space = Sprung-Wunsch).
 *
 * Bewegt die Spielerfigur NICHT mehr selbst — das übernimmt jetzt der
 * Server (serverautoritative Bewegung, Zero-Trust-Prinzip). Der Client
 * meldet nur seine Eingabeabsicht, die tatsächliche Position kommt
 * ausschließlich vom Server zurück.
 */
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
