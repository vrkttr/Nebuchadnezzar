import * as THREE from 'three';

const FLOCKS = 2;
const BIRDS_PER_FLOCK = 6;
const REANCHOR_DISTANCE = 230;

const bodyGeometry = new THREE.BoxGeometry(0.1, 0.09, 0.38);
const tailGeometry = new THREE.BoxGeometry(0.16, 0.02, 0.16);
const wingGeometry = new THREE.PlaneGeometry(0.62, 0.2);
wingGeometry.translate(0.31, 0, 0);
const material = new THREE.MeshBasicMaterial({ color: 0x15130f, side: THREE.DoubleSide, fog: false });

function createBird() {
  const bird = new THREE.Group();
  bird.add(new THREE.Mesh(bodyGeometry, material));
  const tail = new THREE.Mesh(tailGeometry, material);
  tail.position.z = -0.24;
  bird.add(tail);

  const left = new THREE.Group();
  left.add(new THREE.Mesh(wingGeometry, material));
  left.position.x = 0.04;
  const right = new THREE.Group();
  const rightWing = new THREE.Mesh(wingGeometry, material);
  rightWing.scale.x = -1;
  right.add(rightWing);
  right.position.x = -0.04;
  bird.add(left, right);
  bird.userData.wings = [left, right];
  return bird;
}

export function createBirds(scene) {
  const group = new THREE.Group();
  group.name = 'Voegel';
  scene.add(group);

  const flocks = Array.from({ length: FLOCKS }, (_, index) => ({
    anchor: new THREE.Vector3(),
    anchored: false,
    radius: 26 + index * 14,
    height: 24 + index * 9,
    speed: (index % 2 ? -1 : 1) * (0.2 + index * 0.05),
    birds: Array.from({ length: BIRDS_PER_FLOCK }, (__, n) => {
      const bird = createBird();
      group.add(bird);
      return { bird, phase: Math.random() * 6.28, radiusOffset: (Math.random() - 0.5) * 8, heightOffset: (Math.random() - 0.5) * 4, flapRate: 7 + Math.random() * 3, order: n };
    }),
  }));

  let time = 0;

  function reanchor(flock, player) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 80;
    flock.anchor.set(player.x + Math.cos(angle) * distance, 0, player.z + Math.sin(angle) * distance);
    flock.anchored = true;
  }

  function update(delta, player, enabled) {
    group.visible = enabled;
    if (!enabled) return;
    time += delta;

    for (const flock of flocks) {
      if (!flock.anchored || Math.hypot(player.x - flock.anchor.x, player.z - flock.anchor.z) > REANCHOR_DISTANCE) reanchor(flock, player);
      for (const entry of flock.birds) {
        const angle = time * flock.speed + entry.phase * 0.18 + entry.order * 0.5;
        const radius = flock.radius + entry.radiusOffset;
        const x = flock.anchor.x + Math.cos(angle) * radius;
        const z = flock.anchor.z + Math.sin(angle) * radius;
        const y = flock.height + entry.heightOffset + Math.sin(time * 0.6 + entry.phase) * 1.8;
        const direction = Math.sign(flock.speed);
        const vx = -Math.sin(angle) * direction;
        const vz = Math.cos(angle) * direction;
        entry.bird.position.set(x, y, z);
        entry.bird.rotation.set(0, Math.atan2(vx, vz), -0.3 * direction, 'YXZ');

        const flapping = Math.sin(time * 0.45 + entry.phase * 2) > -0.25 ? 1 : 0.08;
        const flap = (0.12 + Math.sin(time * entry.flapRate + entry.phase) * 0.75) * flapping;
        entry.bird.userData.wings[0].rotation.z = flap;
        entry.bird.userData.wings[1].rotation.z = -flap;
      }
    }
  }

  return { update };
}
