import * as THREE from 'three';

const ALTITUDE = 260;
const FLIGHT_RADIUS = 750;
const SPEED = 13;
const FIRST_DELAY = [25, 60];
const PAUSE = [150, 330];

function range([min, max]) {
  return min + Math.random() * (max - min);
}

function buildPlane() {
  const group = new THREE.Group();
  const hull = new THREE.MeshBasicMaterial({ color: 0x3c4046, fog: false });
  const wing = new THREE.MeshBasicMaterial({ color: 0x30343a, fog: false });
  const trail = new THREE.MeshBasicMaterial({
    color: 0xe6e8ea,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    fog: false,
  });

  const add = (geometry, material, x, y, z) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };

  add(new THREE.BoxGeometry(3.4, 3.4, 38), hull, 0, 0, 0);
  add(new THREE.BoxGeometry(2.4, 2.4, 6), hull, 0, 0, 21);
  add(new THREE.BoxGeometry(34, 0.6, 7), wing, 0, -0.6, 2);
  add(new THREE.BoxGeometry(12, 0.5, 3.5), wing, 0, 0.6, -17);
  add(new THREE.BoxGeometry(0.6, 6, 4), wing, 0, 3.4, -17);
  add(new THREE.BoxGeometry(2, 2, 6), hull, 9, -2.2, 3);
  add(new THREE.BoxGeometry(2, 2, 6), hull, -9, -2.2, 3);
  add(new THREE.BoxGeometry(1.6, 1.6, 420), trail, 9, -2.2, -216);
  add(new THREE.BoxGeometry(1.6, 1.6, 420), trail, -9, -2.2, -216);

  return group;
}

export function createPlane(scene) {
  const plane = buildPlane();
  plane.visible = false;
  scene.add(plane);

  let enabled = false;
  let flying = false;
  let timer = range(FIRST_DELAY);
  const direction = new THREE.Vector3();
  const end = new THREE.Vector3();

  function launch() {
    const angle = Math.random() * Math.PI * 2;
    const offset = (Math.random() - 0.5) * 500;
    direction.set(Math.cos(angle), 0, Math.sin(angle));
    const side = new THREE.Vector3(-direction.z, 0, direction.x);

    plane.position.copy(direction).multiplyScalar(-FLIGHT_RADIUS).addScaledVector(side, offset);
    plane.position.y = ALTITUDE + (Math.random() - 0.5) * 40;
    end.copy(direction).multiplyScalar(FLIGHT_RADIUS).addScaledVector(side, offset);
    plane.rotation.y = Math.atan2(direction.x, direction.z);
    plane.visible = true;
    flying = true;
  }

  function stop() {
    flying = false;
    plane.visible = false;
    timer = range(PAUSE);
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stop();
  }

  function update(delta) {
    if (!enabled) return;

    if (!flying) {
      timer -= delta;
      if (timer <= 0) launch();
      return;
    }

    plane.position.addScaledVector(direction, SPEED * delta);
    if (plane.position.clone().sub(end).dot(direction) >= 0) stop();
  }

  return { setEnabled, update };
}
