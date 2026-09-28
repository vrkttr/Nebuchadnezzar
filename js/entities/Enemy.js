import * as THREE from 'three';

export function createEnemy(id) {
  const enemy = new THREE.Group();
  enemy.name = `Enemy_${id}`;

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x6a2a20 });
  const bodyGeometry = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.85;
  enemy.add(body);

  const headMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a34 });
  const headGeometry = new THREE.SphereGeometry(0.25, 12, 12);
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.55;
  enemy.add(head);

  const visorMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
  const visorGeometry = new THREE.BoxGeometry(0.42, 0.1, 0.3);
  const visor = new THREE.Mesh(visorGeometry, visorMaterial);
  visor.position.set(0, 1.58, 0.12);
  enemy.add(visor);

  enemy.userData.isEnemy = true;
  enemy.userData.enemyId = id;

  return enemy;
}
