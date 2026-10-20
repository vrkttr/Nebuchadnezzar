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
  const pivot = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const CAMERA_MARGIN = 0.35;
  const MIN_CAMERA_DISTANCE = 0.6;
  const MIN_CAMERA_HEIGHT = 0.3;
  const RECOVER_SPEED = 6;
  let blockers = [];
  let currentDistance = distance;
  let lastTime = performance.now();

  function setBlockers(list) {
    blockers = list.map((blocker) => ({
      ...blocker,
      cos: Math.cos(blocker.rotation),
      sin: Math.sin(blocker.rotation),
      halfX: blocker.halfX + CAMERA_MARGIN,
      halfZ: blocker.halfZ + CAMERA_MARGIN,
    }));
  }

  function firstHit(from, to) {
    let nearest = 1;

    for (const blocker of blocks()) {
      const fx = from.x - blocker.x;
      const fz = from.z - blocker.z;
      const tx = to.x - blocker.x;
      const tz = to.z - blocker.z;
      const start = [fx * blocker.cos - fz * blocker.sin, fx * blocker.sin + fz * blocker.cos];
      const end = [tx * blocker.cos - tz * blocker.sin, tx * blocker.sin + tz * blocker.cos];
      const half = [blocker.halfX, blocker.halfZ];
      let enter = 0;
      let leave = 1;
      let hit = true;

      for (let axis = 0; axis < 2; axis += 1) {
        const delta = end[axis] - start[axis];

        if (Math.abs(delta) < 1e-9) {
          if (Math.abs(start[axis]) > half[axis]) hit = false;
          continue;
        }

        let near = (-half[axis] - start[axis]) / delta;
        let far = (half[axis] - start[axis]) / delta;
        if (near > far) [near, far] = [far, near];
        enter = Math.max(enter, near);
        leave = Math.min(leave, far);
      }

      if (!hit || enter > leave || enter <= 0) continue;
      if (from.y + (to.y - from.y) * enter > blocker.height + 0.3) continue;
      nearest = Math.min(nearest, enter);
    }

    return nearest;
  }

  function blocks() {
    return blockers;
  }

  function update(target) {
    offset.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    ).multiplyScalar(distance);

    pivot.set(target.x, target.y + 1.2, target.z);
    desired.copy(pivot).add(offset);

    const now = performance.now();
    const elapsed = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    const allowed = Math.max(MIN_CAMERA_DISTANCE, firstHit(pivot, desired) * distance - CAMERA_MARGIN);
    const limit = Math.min(distance, allowed);
    currentDistance = limit < currentDistance ? limit : Math.min(limit, currentDistance + RECOVER_SPEED * elapsed);

    camera.position.copy(pivot).addScaledVector(offset, currentDistance / distance);
    camera.position.y = Math.max(camera.position.y, MIN_CAMERA_HEIGHT);
    camera.lookAt(pivot);
  }

  return { update, setBlockers };
}
