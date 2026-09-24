import * as THREE from 'three';

export function createTestZone(scene) {
  const zoneGroup = new THREE.Group();
  zoneGroup.name = 'TestZone';

  zoneGroup.add(createGround());
  zoneGroup.add(...createRocks());
  zoneGroup.add(...createTrees());
  zoneGroup.add(createBuilding());

  scene.add(zoneGroup);

  const spawnPoint = new THREE.Vector3(0, 0, 0);

  return { zoneGroup, spawnPoint };
}

function createGround() {
  const geometry = new THREE.PlaneGeometry(50, 50);
  const material = new THREE.MeshStandardMaterial({ color: 0x3a5f3a });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.name = 'Ground';
  return ground;
}

function createRocks() {
  const rockPositions = [
    [6, 0.4, 3],
    [7.5, 0.3, 4.5],
    [-8, 0.5, -5],
  ];

  const material = new THREE.MeshStandardMaterial({ color: 0x6b6b6b });

  return rockPositions.map(([x, y, z], index) => {
    const geometry = new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.3);
    const rock = new THREE.Mesh(geometry, material);
    rock.position.set(x, y, z);
    rock.name = `Rock_${index}`;
    return rock;
  });
}

function createTrees() {
  const treePositions = [
    [-4, 0, 4],
    [-5.5, 0, 2.5],
    [5, 0, -6],
    [3.5, 0, -7.5],
  ];

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3423 });
  const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });

  return treePositions.map(([x, , z], index) => {
    const tree = new THREE.Group();
    tree.name = `Tree_${index}`;

    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.2, 6);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.6;
    tree.add(trunk);

    const leavesGeometry = new THREE.ConeGeometry(0.9, 1.8, 8);
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 1.8;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    return tree;
  });
}

function createBuilding() {
  const building = new THREE.Group();
  building.name = 'Building';

  const wallsGeometry = new THREE.BoxGeometry(3, 2.2, 3);
  const wallsMaterial = new THREE.MeshStandardMaterial({ color: 0x8a7863 });
  const walls = new THREE.Mesh(wallsGeometry, wallsMaterial);
  walls.position.y = 1.1;
  building.add(walls);

  const roofGeometry = new THREE.ConeGeometry(2.3, 1.3, 4);
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x6e3b2e });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.y = 2.85;
  roof.rotation.y = Math.PI / 4;
  building.add(roof);

  building.position.set(-3, 0, -4);
  return building;
}
