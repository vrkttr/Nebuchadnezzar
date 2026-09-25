import * as THREE from 'three';

export function createNpc(name, dialogue, color = 0x8a6d3b) {
  const npc = new THREE.Group();
  npc.name = name;

  const bodyMaterial = new THREE.MeshStandardMaterial({ color });
  const bodyGeometry = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.85;
  npc.add(body);

  const headGeometry = new THREE.SphereGeometry(0.25, 12, 12);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xd8a878 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.55;
  npc.add(head);

  npc.userData.isNpc = true;
  npc.userData.dialogue = dialogue;

  return npc;
}
