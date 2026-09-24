import * as THREE from 'three';

const RIGHT_MOUSE_BUTTON = 2;

export function createThirdPersonCamera(camera, domElement) {
  let yaw = Math.PI;
  let pitch = 0.35;
  let distance = 6;

  const MIN_DISTANCE = 2;
  const MAX_DISTANCE = 14;
  const MIN_PITCH = 0.1;
  const MAX_PITCH = 1.3;

  let isDragging = false;

  domElement.addEventListener('contextmenu', (event) => event.preventDefault());

  domElement.addEventListener('mousedown', (event) => {
    if (event.button !== RIGHT_MOUSE_BUTTON) return;
    isDragging = true;
    domElement.requestPointerLock();
  });

  window.addEventListener('mouseup', (event) => {
    if (event.button !== RIGHT_MOUSE_BUTTON) return;
    isDragging = false;
    if (document.pointerLockElement === domElement) {
      document.exitPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== domElement) {
      isDragging = false;
    }
  });

  window.addEventListener('mousemove', (event) => {
    if (!isDragging || document.pointerLockElement !== domElement) return;

    const ROTATE_SPEED = 0.005;
    yaw -= event.movementX * ROTATE_SPEED;
    pitch += event.movementY * ROTATE_SPEED;
    pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));
  });

  domElement.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const ZOOM_SPEED = 0.003;
      distance += event.deltaY * ZOOM_SPEED;
      distance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, distance));
    },
    { passive: false }
  );

  const offset = new THREE.Vector3();

  function update(target) {
    offset.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    ).multiplyScalar(distance);

    camera.position.copy(target).add(offset);
    camera.lookAt(target.x, target.y + 1.2, target.z);
  }

  return { update };
}
