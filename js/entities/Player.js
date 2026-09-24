import * as THREE from 'three';

export function createPlayer(color = 0x3d6ea5) {
  const player = new THREE.Group();
  player.name = 'Player';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color });

  const bodyGeometry = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.85;
  player.add(body);

  const headGeometry = new THREE.SphereGeometry(0.25, 12, 12);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xd8a878 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.55;
  player.add(head);

  return {
    object: player,
    setPosition(x, y, z) {
      player.position.set(x, y, z);
    },
  };
}
