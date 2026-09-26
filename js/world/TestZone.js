import * as THREE from 'three';
import { createNpc } from '../entities/Npc.js';

export function createTestZone(scene) {
  const zoneGroup = new THREE.Group();
  zoneGroup.name = 'TestZone';

  zoneGroup.add(createGround());
  zoneGroup.add(...createRubble());
  zoneGroup.add(createRuinedBuilding());
  zoneGroup.add(createCarWreck());
  zoneGroup.add(...createBarrels());
  zoneGroup.add(...createDeadTrees());
  zoneGroup.add(...createBarricade());
  zoneGroup.add(createWatchtower());

  const npc = createNpc(
    'Streuner',
    'Bleib in Deckung, Fremder. Draussen im Oedland ueberlebt nicht jeder die Nacht.',
    0x5a5240
  );
  npc.position.set(-1.5, 0, -2.5);
  zoneGroup.add(npc);

  scene.add(zoneGroup);

  const spawnPoint = new THREE.Vector3(0, 0, 0);

  return { zoneGroup, spawnPoint, npcs: [npc] };
}

function createGround() {
  const geometry = new THREE.PlaneGeometry(60, 60);
  const material = new THREE.MeshStandardMaterial({ color: 0x5a4f3c });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.name = 'Ground';
  return ground;
}

function createRubble() {
  const positions = [
    [6, 0.3, 3],
    [7.5, 0.25, 4.5],
    [-8, 0.35, -5],
    [4.5, 0.3, 6.5],
    [-6.5, 0.25, 3.5],
    [8.5, 0.3, -2],
  ];

  const material = new THREE.MeshStandardMaterial({ color: 0x6b6558 });

  return positions.map(([x, y, z], index) => {
    const geometry = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.4);
    const chunk = new THREE.Mesh(geometry, material);
    chunk.position.set(x, y, z);
    chunk.rotation.set(Math.random(), Math.random(), Math.random());
    chunk.name = `Rubble_${index}`;
    return chunk;
  });
}

function createRuinedBuilding() {
  const building = new THREE.Group();
  building.name = 'RuinedBuilding';

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x847a68 });

  const walls = [
    { size: [4, 2.4, 0.3], position: [0, 1.2, -2] },
    { size: [0.3, 1.1, 4], position: [-2, 0.55, 0] },
    { size: [0.3, 1.8, 4], position: [2, 0.9, 0] },
    { size: [1.6, 0.6, 0.3], position: [-1.2, 0.3, 2] },
  ];

  for (const wall of walls) {
    const geometry = new THREE.BoxGeometry(...wall.size);
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    mesh.position.set(...wall.position);
    building.add(mesh);
  }

  building.position.set(-3, 0, -4);
  return building;
}

function createCarWreck() {
  const wreck = new THREE.Group();
  wreck.name = 'CarWreck';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x7a3b28 });
  const bodyGeometry = new THREE.BoxGeometry(2.2, 0.7, 1.1);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  wreck.add(body);

  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1712 });
  const wheelPositions = [
    [0.8, 0.25, 0.6],
    [0.8, 0.25, -0.6],
    [-0.8, 0.25, 0.6],
    [-0.8, 0.25, -0.6],
  ];

  for (const [x, y, z] of wheelPositions) {
    const wheelGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.25, 12);
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wreck.add(wheel);
  }

  wreck.position.set(6, 0, -6);
  wreck.rotation.y = 0.4;
  wreck.rotation.z = 0.08;
  return wreck;
}

function createBarrels() {
  const positions = [
    [-3.5, 0, 4.5],
    [-4.2, 0, 3.8],
    [3, 0, -3.5],
  ];

  const material = new THREE.MeshStandardMaterial({ color: 0xb5651d });

  return positions.map(([x, , z], index) => {
    const geometry = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 12);
    const barrel = new THREE.Mesh(geometry, material);
    barrel.name = `Barrel_${index}`;

    if (index === 2) {
      barrel.rotation.z = Math.PI / 2;
      barrel.position.set(x, 0.4, z);
    } else {
      barrel.position.set(x, 0.45, z);
    }

    return barrel;
  });
}

function createDeadTrees() {
  const positions = [
    [-5, 0, -6],
    [5.5, 0, 5],
  ];

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3226 });

  return positions.map(([x, , z], index) => {
    const tree = new THREE.Group();
    tree.name = `DeadTree_${index}`;

    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.22, 2.2, 6);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.1;
    tree.add(trunk);

    const branchAngles = [0.6, -0.7, 1.4];
    for (const angle of branchAngles) {
      const branchGeometry = new THREE.CylinderGeometry(0.05, 0.08, 1, 5);
      const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
      branch.position.set(0, 1.9, 0);
      branch.rotation.z = angle;
      branch.position.x += Math.sin(angle) * 0.4;
      branch.position.y += Math.cos(angle) * 0.4;
      tree.add(branch);
    }

    tree.position.set(x, 0, z);
    return tree;
  });
}

function createBarricade() {
  const positions = [
    [-1, 0, 4.5, 0.1],
    [0, 0, 4.6, -0.05],
    [1, 0, 4.4, 0.15],
  ];

  const material = new THREE.MeshStandardMaterial({ color: 0x55524a });

  return positions.map(([x, , z, tilt], index) => {
    const geometry = new THREE.BoxGeometry(1, 1.4, 0.08);
    const panel = new THREE.Mesh(geometry, material);
    panel.position.set(x, 0.7, z);
    panel.rotation.z = tilt;
    panel.name = `Barricade_${index}`;
    return panel;
  });
}

function createWatchtower() {
  const tower = new THREE.Group();
  tower.name = 'Watchtower';

  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x3f3c34 });
  const legPositions = [
    [0.9, 0, 0.9],
    [0.9, 0, -0.9],
    [-0.9, 0, 0.9],
    [-0.9, 0, -0.9],
  ];

  for (const [x, , z] of legPositions) {
    const legGeometry = new THREE.CylinderGeometry(0.08, 0.1, 4, 6);
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(x, 2, z);
    tower.add(leg);
  }

  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x55524a });
  const platformGeometry = new THREE.BoxGeometry(2.2, 0.15, 2.2);
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.y = 4;
  tower.add(platform);

  const railGeometry = new THREE.BoxGeometry(2.2, 0.6, 0.08);
  const railFront = new THREE.Mesh(railGeometry, platformMaterial);
  railFront.position.set(0, 4.4, 1.06);
  tower.add(railFront);

  const railBack = railFront.clone();
  railBack.position.z = -1.06;
  tower.add(railBack);

  tower.position.set(9, 0, 8);
  return tower;
}
