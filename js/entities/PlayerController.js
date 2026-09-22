import * as THREE from 'three';
import { isKeyDown } from '../input/Keyboard.js';

const MOVE_SPEED = 4; // Einheiten pro Sekunde
const JUMP_SPEED = 5.5;
const GRAVITY = 14;
const GROUND_Y = 0;

/**
 * WoW-artige Bewegungssteuerung:
 * - W/A/S/D bewegen relativ zur aktuellen Blickrichtung der Kamera
 * - Space springt (einfache Schwerkraft, kein Kollisionssystem)
 *
 * Kennt nichts von der Kamera-Rotationslogik selbst, sondern liest
 * lediglich deren aktuelle Blickrichtung aus — dadurch bleibt die
 * Bewegungssteuerung unabhängig vom Kamera-Controller.
 */
export function createPlayerController(player, camera) {
  let verticalVelocity = 0;
  let isGrounded = true;

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const moveDirection = new THREE.Vector3();

  function update(delta) {
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
      player.object.position.addScaledVector(moveDirection, MOVE_SPEED * delta);
      player.object.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
    }

    if (isKeyDown('Space') && isGrounded) {
      verticalVelocity = JUMP_SPEED;
      isGrounded = false;
    }

    verticalVelocity -= GRAVITY * delta;
    player.object.position.y += verticalVelocity * delta;

    if (player.object.position.y <= GROUND_Y) {
      player.object.position.y = GROUND_Y;
      verticalVelocity = 0;
      isGrounded = true;
    }
  }

  return { update };
}
