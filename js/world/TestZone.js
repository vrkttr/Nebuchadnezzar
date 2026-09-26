import * as THREE from 'three';
import { createNpc } from '../entities/Npc.js';

export function createTestZone(scene) {
  const zoneGroup = new THREE.Group();
  zoneGroup.name = 'ArcRaidersDenseZone';

  const colliders = [];
  const lootContainers = [];

  // --- 1. ATMOSPHÄRE & LICHT (Golden Hour Warmth) ---
  scene.fog = new THREE.FogExp2(0xb89572, 0.008);

  const ambientLight = new THREE.AmbientLight(0xffebd2, 0.55);
  zoneGroup.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xff9d42, 2.0);
  sunLight.position.set(70, 80, -50);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 4096; // Hohe Schattenauflösung für feine Gitter/Fachwerke
  sunLight.shadow.mapSize.height = 4096;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 300;
  const d = 100;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  zoneGroup.add(sunLight);

  // --- 2. MATERIALIEN & PROZEDURALE TEXTUREN ---
  const materials = createProceduralMaterials();

  // --- 3. TERRAIN & STRASSENNETZ ---
  const groundGeo = new THREE.PlaneGeometry(250, 250);
  const ground = new THREE.Mesh(groundGeo, materials.terrain);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'Ground';
  zoneGroup.add(ground);

  createDetailedRoadSystem(zoneGroup, materials, colliders);

  // --- 4. KOMPLEXE GEBÄUDE UND KOMPLEXE (Detailierte Module) ---
  createDetailedApartmentComplex(zoneGroup, materials, colliders, -32, 0, -10);
  createDetailedApartmentComplex(zoneGroup, materials, colliders, 35, 0, -25);
  createIndustrialHall(zoneGroup, materials, colliders, -40, 0, -60);

  // --- 5. DETALLIERTE GANTRY-BRÜCKE & TRUSS-STRUKTUREN ---
  const bridge = createDetailedGantryBridge(materials);
  bridge.position.set(0, 8.5, -15);
  zoneGroup.add(bridge);
  colliders.push(new THREE.Box3().setFromObject(bridge));

  // --- 6. ROHRSYSTEME UND FLANSCHE ---
  createOverheadPipeNetwork(zoneGroup, materials, colliders);

  // --- 7. STRASSENINFRASTRUKTUR & REQUISITEN ---
  createDetailedTrafficLightsAndLamps(zoneGroup, materials, colliders);
  createGuardsAndFences(zoneGroup, materials, colliders);

  // --- 8. VEGETATION (Pinien & Gestrüpp) ---
  createDensePineForest(zoneGroup, materials);

  // --- 9. WRACKE, SCHUTT & LOOT ---
  createWrecksAndLoot(zoneGroup, materials, colliders, lootContainers);

  // --- 10. NPCS ---
  const npcs = [];
  const npc1 = createNpc(
    'Raider-Späher',
    'Pass auf die Such-Drohnen auf. Nutze die Gitterstege und Rohrleitungen für eine höhere Schussposition!',
    0x3d4839
  );
  npc1.position.set(-3, 0, 16);
  zoneGroup.add(npc1);
  npcs.push(npc1);

  scene.add(zoneGroup);

  const spawnPoint = new THREE.Vector3(0, 0, 22);

  return {
    zoneGroup,
    spawnPoint,
    npcs,
    lootContainers,
    colliders,
  };
}

// ==========================================
// PROZEDURALE MATERIALIEN
// ==========================================

function createProceduralMaterials() {
  // Asphalt
  const asphaltCanvas = document.createElement('canvas');
  asphaltCanvas.width = 512;
  asphaltCanvas.height = 512;
  const ctxA = asphaltCanvas.getContext('2d');
  ctxA.fillStyle = '#363431';
  ctxA.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 25000; i++) {
    ctxA.fillStyle = Math.random() > 0.5 ? '#242321' : '#4a4743';
    ctxA.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  ctxA.strokeStyle = '#c2bca8';
  ctxA.lineWidth = 10;
  ctxA.setLineDash([45, 35]);
  ctxA.beginPath();
  ctxA.moveTo(256, 0);
  ctxA.lineTo(256, 512);
  ctxA.stroke();

  const asphaltTex = new THREE.CanvasTexture(asphaltCanvas);
  asphaltTex.wrapS = THREE.RepeatWrapping;
  asphaltTex.wrapT = THREE.RepeatWrapping;

  // Beton
  const concreteCanvas = document.createElement('canvas');
  concreteCanvas.width = 512;
  concreteCanvas.height = 512;
  const ctxC = concreteCanvas.getContext('2d');
  ctxC.fillStyle = '#78756d';
  ctxC.fillRect(0, 0, 512, 512);
  ctxC.fillStyle = '#52504a';
  for (let i = 0; i < 20000; i++) {
    ctxC.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  ctxC.strokeStyle = '#3d3b37';
  ctxC.lineWidth = 3;
  for (let y = 0; y <= 512; y += 64) {
    ctxC.beginPath();
    ctxC.moveTo(0, y);
    ctxC.lineTo(512, y);
    ctxC.stroke();
  }

  const concreteTex = new THREE.CanvasTexture(concreteCanvas);
  concreteTex.wrapS = THREE.RepeatWrapping;
  concreteTex.wrapT = THREE.RepeatWrapping;

  return {
    asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.85 }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteTex, roughness: 0.75 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.4, metalness: 0.8 }),
    rustMetal: new THREE.MeshStandardMaterial({ color: 0x5a3d2c, roughness: 0.8, metalness: 0.5 }),
    grate: new THREE.MeshStandardMaterial({ color: 0x22252a, roughness: 0.9, metalness: 0.8 }),
    pipeMetal: new THREE.MeshStandardMaterial({ color: 0x61676e, roughness: 0.35, metalness: 0.7 }),
    terrain: new THREE.MeshStandardMaterial({ color: 0x4a3f31, roughness: 0.9 }),
    pineNeedle: new THREE.MeshStandardMaterial({ color: 0x283823, roughness: 0.9 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x33251a, roughness: 0.9 }),
  };
}

// ==========================================
// MODULARE BAUTEILE (HOCHDETAILLIERT)
// ==========================================

function createDetailedGantryBridge(mats) {
  const bridgeGroup = new THREE.Group();
  const length = 38;
  const width = 4;

  // 1. Gitterrost (aus einzelnen Lamellen)
  const slatCount = 50;
  const slatStep = length / slatCount;
  for (let i = 0; i < slatCount; i++) {
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(slatStep * 0.8, 0.06, width - 0.2),
      mats.grate
    );
    slat.position.set(-length / 2 + i * slatStep + slatStep / 2, 0, 0);
    slat.castShadow = true;
    slat.receiveShadow = true;
    bridgeGroup.add(slat);
  }

  // 2. Unterer Fachwerkträger (Truss System)
  const trussDepth = 1.4;
  for (let side = -1; side <= 1; side += 2) {
    const zPos = side * (width / 2 - 0.15);

    const mainBeamTop = new THREE.Mesh(new THREE.BoxGeometry(length, 0.18, 0.18), mats.steel);
    mainBeamTop.position.set(0, 0, zPos);
    bridgeGroup.add(mainBeamTop);

    const mainBeamBot = new THREE.Mesh(new THREE.BoxGeometry(length, 0.18, 0.18), mats.steel);
    mainBeamBot.position.set(0, -trussDepth, zPos);
    bridgeGroup.add(mainBeamBot);

    // Diagonalstreben
    const diagCount = 18;
    const step = length / diagCount;
    for (let i = 0; i < diagCount; i++) {
      const x = -length / 2 + i * step + step / 2;
      const diag1 = new THREE.Mesh(new THREE.BoxGeometry(step * 1.1, 0.08, 0.08), mats.steel);
      diag1.position.set(x, -trussDepth / 2, zPos);
      diag1.rotation.z = Math.PI / 4;
      bridgeGroup.add(diag1);

      const diag2 = new THREE.Mesh(new THREE.BoxGeometry(step * 1.1, 0.08, 0.08), mats.steel);
      diag2.position.set(x, -trussDepth / 2, zPos);
      diag2.rotation.z = -Math.PI / 4;
      bridgeGroup.add(diag2);
    }
  }

  // 3. Geländer & Schutzplanken
  for (let side = -1; side <= 1; side += 2) {
    const zPos = side * (width / 2);
    for (let x = -length / 2; x <= length / 2; x += 2.2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), mats.steel);
      post.position.set(x, 0.6, zPos);
      post.castShadow = true;
      bridgeGroup.add(post);
    }

    const railTop = new THREE.Mesh(new THREE.BoxGeometry(length, 0.08, 0.08), mats.rustMetal);
    railTop.position.set(0, 1.15, zPos);
    bridgeGroup.add(railTop);

    const railMid = new THREE.Mesh(new THREE.BoxGeometry(length, 0.06, 0.06), mats.steel);
    railMid.position.set(0, 0.6, zPos);
    bridgeGroup.add(railMid);
  }

  return bridgeGroup;
}

function createDetailedApartmentComplex(group, mats, colliders, posX, posY, posZ) {
  const building = new THREE.Group();
  building.position.set(posX, posY, posZ);

  const mainWidth = 18;
  const mainHeight = 20;
  const mainDepth = 26;

  // Grundstruktur Beton
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(mainWidth, mainHeight, mainDepth),
    mats.concrete
  );
  core.position.y = mainHeight / 2;
  core.castShadow = true;
  core.receiveShadow = true;
  building.add(core);

  // Vorspringende Wandrippen & Verzierungen (Gegen flachen Quader-Look)
  for (let z = -mainDepth / 2 + 2; z <= mainDepth / 2 - 2; z += 4) {
    const ribLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, mainHeight, 0.8),
      mats.concrete
    );
    ribLeft.position.set(-mainWidth / 2 - 0.2, mainHeight / 2, z);
    ribLeft.castShadow = true;
    building.add(ribLeft);

    const ribRight = ribLeft.clone();
    ribRight.position.x = mainWidth / 2 + 0.2;
    building.add(ribRight);
  }

  // Auskragende Balkone mit Stahlstützen
  for (let floor = 4; floor < mainHeight; floor += 4) {
    const balcony = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.3, mainDepth - 4),
      mats.concrete
    );
    balcony.position.set(mainWidth / 2 + 2, floor, 0);
    balcony.castShadow = true;
    building.add(balcony);

    // Balkongeländer
    const bRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 1, mainDepth - 4),
      mats.steel
    );
    bRail.position.set(mainWidth / 2 + 3.9, floor + 0.5, 0);
    building.add(bRail);
  }

  group.add(building);
  colliders.push(new THREE.Box3().setFromObject(building));
}

function createIndustrialHall(group, mats, colliders, posX, posY, posZ) {
  const hall = new THREE.Group();
  hall.position.set(posX, posY, posZ);

  // Stahlträger-Skelett außen
  for (let x = -15; x <= 15; x += 6) {
    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 12, 0.6), mats.steel);
    pillarLeft.position.set(x, 6, -12);
    pillarLeft.castShadow = true;
    hall.add(pillarLeft);

    const pillarRight = pillarLeft.clone();
    pillarRight.position.z = 12;
    hall.add(pillarRight);

    // Dachbinder (Träger oben)
    const roofTruss = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 24), mats.steel);
    roofTruss.position.set(x, 12, 0);
    hall.add(roofTruss);
  }

  // Wände aus profilierten Blechsegmenten
  const wallMat = mats.rustMetal;
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(30, 11.5, 0.2), wallMat);
  wallLeft.position.set(0, 5.75, -11.9);
  hall.add(wallLeft);

  const wallRight = wallLeft.clone();
  wallRight.position.z = 11.9;
  hall.add(wallRight);

  group.add(hall);
  colliders.push(new THREE.Box3().setFromObject(hall));
}

function createOverheadPipeNetwork(group, mats, colliders) {
  const pipeGroup = new THREE.Group();

  // Dicke doppelte Hauptrohre quer über die Straße
  for (let i = 0; i < 2; i++) {
    const pipeY = 11 + i * 2.2;
    const pipeGeo = new THREE.CylinderGeometry(0.9, 0.9, 64, 20);
    const pipe = new THREE.Mesh(pipeGeo, mats.pipeMetal);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, pipeY, -15);
    pipe.castShadow = true;
    pipeGroup.add(pipe);

    // Flansche (Verbindungsringe alle paar Meter für Realismus)
    for (let x = -30; x <= 30; x += 8) {
      const flangeGeo = new THREE.CylinderGeometry(1.15, 1.15, 0.3, 20);
      const flange = new THREE.Mesh(flangeGeo, mats.steel);
      flange.rotation.z = Math.PI / 2;
      flange.position.set(x, pipeY, -15);
      flange.castShadow = true;
      pipeGroup.add(flange);
    }
  }

  // Massiver Pfeiler/Verankerung am Straßenrand
  const pSupport = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 2), mats.concrete);
  pSupport.position.set(-26, 7, -15);
  pSupport.castShadow = true;
  pipeGroup.add(pSupport);

  const pSupport2 = pSupport.clone();
  pSupport2.position.x = 26;
  pipeGroup.add(pSupport2);

  group.add(pipeGroup);
  colliders.push(new THREE.Box3().setFromObject(pipeGroup));
}

function createDetailedRoadSystem(group, mats, colliders) {
  // Hauptfahrbahn
  const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(16, 200), mats.asphalt);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.02, 0);
  mainRoad.receiveShadow = true;
  group.add(mainRoad);

  // Bürgersteige / Bordsteinkanten aus strukturiertem Beton
  for (let side = -1; side <= 1; side += 2) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(3, 0.25, 200), mats.concrete);
    curb.position.set(side * 9.5, 0.125, 0);
    curb.receiveShadow = true;
    curb.castShadow = true;
    group.add(curb);
    colliders.push(new THREE.Box3().setFromObject(curb));
  }
}

function createDetailedTrafficLightsAndLamps(group, mats, colliders) {
  // Hohe Straßenlaternen mit doppeltem Ausleger
  [-45, -15, 15, 45].forEach((zPos) => {
    const lamp = new THREE.Group();
    lamp.position.set(-9.5, 0, zPos);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 12), mats.steel);
    pole.position.y = 3.75;
    lamp.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.1), mats.steel);
    arm.position.set(1, 7.2, 0);
    lamp.add(arm);

    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.3), mats.steel);
    fixture.position.set(2, 7.1, 0);
    lamp.add(fixture);

    lamp.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    group.add(lamp);
    colliders.push(new THREE.Box3().setFromObject(lamp));
  });
}

function createGuardsAndFences(group, mats, colliders) {
  // Leitplanken entlang gefährlicher Abschnitte
  for (let z = -60; z <= 20; z += 4) {
    const guard = new THREE.Group();
    guard.position.set(8.2, 0, z);

    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mats.steel);
    post.position.y = 0.45;
    guard.add(post);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 4.1), mats.steel);
    rail.position.set(-0.08, 0.6, 2);
    guard.add(rail);

    guard.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    group.add(guard);
    colliders.push(new THREE.Box3().setFromObject(guard));
  }
}

function createDensePineForest(group, mats) {
  // Hohe Schirm-Pinien (Typisch für die mediterrane ARC Raiders Ästhetik)
  for (let i = 0; i < 45; i++) {
    const x = (Math.random() - 0.5) * 200;
    const z = (Math.random() - 0.5) * 200;

    // Straße & Gebäude aussparen
    if (Math.abs(x) < 14) continue;

    const pine = new THREE.Group();
    const trunkHeight = 9 + Math.random() * 4;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.45, trunkHeight, 10),
      mats.bark
    );
    trunk.position.y = trunkHeight / 2;
    pine.add(trunk);

    // Typisch ausladende Pinienkrone oben
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(4.5 + Math.random(), 3.5, 9),
      mats.pineNeedle
    );
    crown.position.y = trunkHeight + 1.2;
    pine.add(crown);

    pine.position.set(x, 0, z);
    pine.traverse((c) => { if (c.isMesh) c.castShadow = true; });
    group.add(pine);
  }
}

function createWrecksAndLoot(group, mats, colliders, lootContainers) {
  // Zerstörtes gepanzertes Fahrzeug
  const wreck = new THREE.Group();
  wreck.position.set(-4, 0, -32);
  wreck.rotation.y = 0.4;

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 6.5), mats.rustMetal);
  body.position.y = 1.1;
  wreck.add(body);

  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1, 0.8, 12), mats.steel);
  turret.position.set(0, 2.1, -0.5);
  wreck.add(turret);

  wreck.traverse((c) => { if (c.isMesh) c.castShadow = true; });
  group.add(wreck);
  colliders.push(new THREE.Box3().setFromObject(wreck));

  // Versteckte Loot-Kiste
  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x2e4a32, metalness: 0.7 })
  );
  crate.position.set(-11, 0.4, -14);
  crate.castShadow = true;
  crate.name = 'LootCrate_Secret';
  group.add(crate);
  lootContainers.push(crate);
}