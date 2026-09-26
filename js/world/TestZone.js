import * as THREE from 'three';
import { createNpc } from '../entities/Npc.js';

export function createTestZone(scene) {
  const zoneGroup = new THREE.Group();
  zoneGroup.name = 'ArcPracticeRange';

  const colliders = [];
  const lootContainers = [];

  // --- 1. ATMOSPHÄRE & LICHT (ARC Raiders Golden Hour Vibe) ---
  scene.fog = new THREE.FogExp2(0xc89663, 0.008);

  const ambientLight = new THREE.AmbientLight(0xffdfb3, 0.6);
  zoneGroup.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffa24c, 1.8);
  sunLight.position.set(80, 50, -60);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 300;
  const d = 120;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  zoneGroup.add(sunLight);

  // --- 2. PROZEDURALE TEXTUREN GENERATOREN ---
  const groundTexture = createProceduralGroundTexture();
  const rustTexture = createProceduralRustTexture();
  const concreteTexture = createProceduralConcreteTexture();

  // --- 3. GROUND (Riesiges Terrain 300x300) ---
  const groundGeo = new THREE.PlaneGeometry(300, 300);
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTexture,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'Ground';
  zoneGroup.add(ground);

  // --- 4. SZENERIE & STRUKTUREN ---
  
  // A. Schießstand / Targets (Training Range Feature)
  createShootingRange(zoneGroup, colliders);

  // B. Container-Dorf / Rust-Hub
  createContainerHub(zoneGroup, rustTexture, colliders, lootContainers);

  // C. Trümmerfeld & Fahrzeug-Wracks
  createRubbleAndWrecks(zoneGroup, concreteTexture, rustTexture, colliders);

  // D. Beobachtungstürme & Radaranlage
  createWatchtowersAndRadar(zoneGroup, rustTexture, colliders);

  // E. Überwucherte Vegetation (Bäume, Gestrüpp, Totholz)
  createOvergrownVegetation(zoneGroup);

  // F. Barrikaden & Deckung
  createBarricades(zoneGroup, rustTexture, colliders);

  // --- 5. NPCS ---
  const npcs = [];
  const instructorNpc = createNpc(
    'Raider-Veteran Echo',
    'Willkommen auf dem Übungsplatz. Teste deine Waffen an den Zielen und durchsuche die Container nach Loot.',
    0x3d4839
  );
  instructorNpc.position.set(0, 0, 15);
  zoneGroup.add(instructorNpc);
  npcs.push(instructorNpc);

  const merchantNpc = createNpc(
    'Schrott händler Vance',
    'Brauchst du Munition oder Bauteile? Ich kaufe alles, was nicht niet- und nagelfest ist.',
    0x6b533e
  );
  merchantNpc.position.set(-18, 0, -22);
  zoneGroup.add(merchantNpc);
  npcs.push(merchantNpc);

  scene.add(zoneGroup);

  const spawnPoint = new THREE.Vector3(0, 0, 25);

  return {
    zoneGroup,
    spawnPoint,
    npcs,
    lootContainers,
    colliders,
  };
}

// ==========================================
// PROZEDURALE TEXTUR-GENERATOREN (Canvas)
// ==========================================

function createProceduralGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Grundton (Erde / Dürres Gras)
  ctx.fillStyle = '#514535';
  ctx.fillRect(0, 0, 512, 512);

  // Rauschen / Erd-Details
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 3 + 1;
    ctx.fillStyle = Math.random() > 0.5 ? '#3d3224' : '#685a47';
    ctx.fillRect(x, y, size, size);
  }

  // Überwuchertes trockenes Gras / Flecken
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const rad = Math.random() * 20 + 5;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.4 ? 'rgba(74, 82, 48, 0.15)' : 'rgba(40, 35, 25, 0.2)';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(25, 25);
  return texture;
}

function createProceduralRustTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4a4e51';
  ctx.fillRect(0, 0, 256, 256);

  // Rostflecken
  for (let i = 0; i < 1500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 4 + 1;
    ctx.fillStyle = Math.random() > 0.3 ? '#8b401f' : '#b25329';
    ctx.fillRect(x, y, r, r);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createProceduralConcreteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#7a7873';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? '#575551' : '#999690';
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ==========================================
// ELEMENT-BAUBLÖCKE
// ==========================================

function createShootingRange(group, colliders) {
  const rangeGroup = new THREE.Group();
  rangeGroup.position.set(0, 0, -40);

  const matTarget = new THREE.MeshStandardMaterial({ color: 0xd6c298 });
  const matRed = new THREE.MeshStandardMaterial({ color: 0xa82e2e });

  // Ziel-Dummies in verschiedenen Distanzen
  const distances = [-10, -20, -35, -50];
  distances.forEach((dist, i) => {
    [-12, -4, 4, 12].forEach((xOffset) => {
      const target = new THREE.Group();
      
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.8);
      const pole = new THREE.Mesh(poleGeo, matTarget);
      pole.position.y = 0.9;
      target.add(pole);

      const boardGeo = new THREE.BoxGeometry(0.8, 1.2, 0.05);
      const board = new THREE.Mesh(boardGeo, matTarget);
      board.position.y = 1.6;
      target.add(board);

      const bullseyeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16);
      const bullseye = new THREE.Mesh(bullseyeGeo, matRed);
      bullseye.rotation.x = Math.PI / 2;
      bullseye.position.set(0, 1.7, 0.01);
      target.add(bullseye);

      target.position.set(xOffset + (Math.random() - 0.5) * 2, 0, dist);
      target.traverse((child) => { if (child.isMesh) child.castShadow = true; });
      rangeGroup.add(target);
    });
  });

  group.add(rangeGroup);
}

function createContainerHub(group, rustTex, colliders, lootContainers) {
  const hub = new THREE.Group();
  hub.position.set(-30, 0, -10);

  const containerMat = new THREE.MeshStandardMaterial({
    map: rustTex,
    roughness: 0.6,
    metalness: 0.4,
  });

  const layout = [
    { pos: [0, 1.5, 0], rot: 0, color: 0x2b4c6f },
    { pos: [3.2, 1.5, 1], rot: 0.1, color: 0x8c3a2b },
    { pos: [-0.5, 4.5, 0.3], rot: -0.15, color: 0x3d5c3a }, // Gestapelt
    { pos: [-8, 1.5, 6], rot: 1.2, color: 0x6e5d3b },
    { pos: [10, 1.5, -5], rot: -0.8, color: 0x2b4c6f },
  ];

  layout.forEach((data, index) => {
    const geo = new THREE.BoxGeometry(3, 3, 7);
    const mat = containerMat.clone();
    mat.color.setHex(data.color);

    const container = new THREE.Mesh(geo, mat);
    container.position.set(...data.pos);
    container.rotation.y = data.rot;
    container.castShadow = true;
    container.receiveShadow = true;
    container.name = `ShippingContainer_${index}`;

    hub.add(container);

    const box = new THREE.Box3().setFromObject(container);
    colliders.push(box);
  });

  // Loot Crate im Hub
  const lootGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
  const lootMat = new THREE.MeshStandardMaterial({ color: 0xcaa438, metalness: 0.8 });
  const lootCrate = new THREE.Mesh(lootGeo, lootMat);
  lootCrate.position.set(1.5, 0.4, 2);
  lootCrate.castShadow = true;
  lootCrate.name = 'LootCrate_Hub';
  hub.add(lootCrate);
  lootContainers.push(lootCrate);

  group.add(hub);
}

function createRubbleAndWrecks(group, concreteTex, rustTex, colliders) {
  // Trümmerteile
  const concreteMat = new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.9 });
  
  for (let i = 0; i < 35; i++) {
    const size = Math.random() * 2 + 0.8;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mesh = new THREE.Mesh(geo, concreteMat);

    const x = (Math.random() - 0.5) * 220;
    const z = (Math.random() - 0.5) * 220;

    // Abstand zum Spawnbereich halten
    if (Math.hypot(x, z) < 15) continue;

    mesh.position.set(x, size * 0.4, z);
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    colliders.push(new THREE.Box3().setFromObject(mesh));
  }

  // Ausgebrannte Buggy-/Panzer-Wracks
  for (let i = 0; i < 5; i++) {
    const wreck = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ map: rustTex, color: 0x3a332c });
    
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 1.2, 2.2), bodyMat);
    base.position.y = 0.8;
    wreck.add(base);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.8), bodyMat);
    cabin.position.set(-0.5, 1.8, 0);
    wreck.add(cabin);

    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    if (Math.hypot(x, z) < 20) continue;

    wreck.position.set(x, 0, z);
    wreck.rotation.y = Math.random() * Math.PI;
    wreck.traverse((c) => { if (c.isMesh) c.castShadow = true; });

    group.add(wreck);
    colliders.push(new THREE.Box3().setFromObject(wreck));
  }
}

function createWatchtowersAndRadar(group, rustTex, colliders) {
  // Radarturm im Hintergrund
  const radarGroup = new THREE.Group();
  radarGroup.position.set(60, 0, -70);

  const towerMat = new THREE.MeshStandardMaterial({ map: rustTex, color: 0x555555 });
  const legGeo = new THREE.CylinderGeometry(0.3, 0.4, 18);

  [-3, 3].forEach((x) => {
    [-3, 3].forEach((z) => {
      const leg = new THREE.Mesh(legGeo, towerMat);
      leg.position.set(x, 9, z);
      radarGroup.add(leg);
    });
  });

  // Schüssel
  const dishGeo = new THREE.SphereGeometry(5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0x888888, side: THREE.DoubleSide });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0, 18, 0);
  dish.rotation.x = Math.PI / 3;
  radarGroup.add(dish);

  radarGroup.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  group.add(radarGroup);
  colliders.push(new THREE.Box3().setFromObject(radarGroup));
}

function createOvergrownVegetation(group) {
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2e2419, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x47522b, roughness: 0.8 });

  // Vertrocknete/Überwucherte Bäume
  for (let i = 0; i < 40; i++) {
    const tree = new THREE.Group();
    
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 5, 7);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.5;
    tree.add(trunk);

    // Karge Krone
    const folGeo = new THREE.DodecahedronGeometry(2, 1);
    const foliage = new THREE.Mesh(folGeo, foliageMat);
    foliage.position.y = 5.5;
    tree.add(foliage);

    const x = (Math.random() - 0.5) * 260;
    const z = (Math.random() - 0.5) * 260;
    if (Math.hypot(x, z) < 15) continue;

    tree.position.set(x, 0, z);
    tree.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    group.add(tree);
  }
}

function createBarricades(group, rustTex, colliders) {
  const barMat = new THREE.MeshStandardMaterial({ map: rustTex, color: 0x5a5043 });

  for (let i = 0; i < 15; i++) {
    const bar = new THREE.Group();
    
    // Tschechische Igel / Barrikaden
    const beamGeo = new THREE.BoxGeometry(0.2, 2.4, 0.2);
    for (let r = 0; r < 3; r++) {
      const beam = new THREE.Mesh(beamGeo, barMat);
      beam.rotation.set(r * 0.8, r * 0.5, r * 1.1);
      beam.position.y = 1;
      bar.add(beam);
    }

    const x = (Math.random() - 0.5) * 160;
    const z = (Math.random() - 0.5) * 160;
    if (Math.hypot(x, z) < 10) continue;

    bar.position.set(x, 0, z);
    bar.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    group.add(bar);
    colliders.push(new THREE.Box3().setFromObject(bar));
  }
}