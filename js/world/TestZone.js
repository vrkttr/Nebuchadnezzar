import * as THREE from 'three';
import { createNpc } from '../entities/Npc.js';

/*
 * Large procedural post-apocalyptic practice/training map.
 *
 * Design goals:
 * - broad, explorable valley with irregular terrain and natural boundaries
 * - overgrown, decayed industrial/military training grounds
 * - many readable combat spaces, sightlines, cover pockets and traversal routes
 * - no external texture files: all materials/textures are generated at runtime
 * - gameplay hooks are returned in `mapData` for enemies, loot, targets and POIs
 *
 * The environment is inspired by the general visual language of ARC Raiders'
 * Practice Range: secluded valley, reclaimed infrastructure, training structures,
 * overgrowth and a mixture of open and tightly framed combat spaces.
 */

const MAP_SIZE = 360;
const HALF = MAP_SIZE / 2;
const TERRAIN_SEGMENTS = 180;
const SEED = 18473;

export function createTestZone(scene) {
  const zoneGroup = new THREE.Group();
  zoneGroup.name = 'TestZone';

  const textures = createProceduralTextures();
  const materials = createMaterials(textures);
  const terrain = createTerrain(materials);

  zoneGroup.add(terrain);
  zoneGroup.add(createValleyBoundary(materials));
  zoneGroup.add(createRoadNetwork(materials));
  zoneGroup.add(createTrainingCompound(materials));
  zoneGroup.add(createAbandonedIndustrialYard(materials));
  zoneGroup.add(createCollapsedResidentialBlock(materials));
  zoneGroup.add(createWatchtowerNetwork(materials));
  zoneGroup.add(createDamagedBridge(materials));
  zoneGroup.add(createParkourCourse(materials));
  zoneGroup.add(createTargetRange(materials));
  zoneGroup.add(createVegetation(materials));
  zoneGroup.add(createRubbleFields(materials));
  zoneGroup.add(createWreckFields(materials));
  zoneGroup.add(createUtilityInfrastructure(materials));
  zoneGroup.add(createLootAndCoverMarkers(materials));

  const npc = createNpc(
    'Streuner',
    'Bleib in Deckung, Fremder. Draussen im Oedland ueberlebt nicht jeder die Nacht.',
    0x5a5240
  );
  npc.position.set(-9, terrainHeight(-9, -16) + 0.02, -16);
  zoneGroup.add(npc);

  scene.add(zoneGroup);

  const spawnPoint = new THREE.Vector3(0, terrainHeight(0, 28) + 0.05, 28);

  const mapData = {
    size: MAP_SIZE,
    seed: SEED,
    bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
    pointsOfInterest: [
      { id: 'spawn', type: 'spawn', position: [0, terrainHeight(0, 28), 28] },
      { id: 'training_compound', type: 'training', position: [0, 0, 0] },
      { id: 'industrial_yard', type: 'industrial', position: [84, 0, -56] },
      { id: 'residential_ruins', type: 'residential', position: [-82, 0, -62] },
      { id: 'old_bridge', type: 'bridge', position: [58, 0, 66] },
      { id: 'parkour', type: 'traversal', position: [-74, 0, 58] },
      { id: 'target_range', type: 'shooting_range', position: [78, 0, 54] },
      { id: 'north_hill', type: 'elevated', position: [0, 0, -126] }
    ],
    enemySpawnPoints: createSpawnPoints(),
    lootSpawnPoints: createLootPoints(),
    targetPoints: createTargetPoints(),
    coverPoints: createCoverPoints()
  };

  return { zoneGroup, spawnPoint, npcs: [npc], mapData };
}

/* -------------------------------------------------------------------------- */
/* Procedural textures                                                         */
/* -------------------------------------------------------------------------- */

function createProceduralTextures() {
  const ground = createNoiseTexture(512, 512, {
    base: '#575a4b',
    dark: '#373a31',
    light: '#777663',
    speckles: 9000,
    lines: 35
  });
  ground.wrapS = ground.wrapT = THREE.RepeatWrapping;
  ground.repeat.set(18, 18);

  const asphalt = createNoiseTexture(512, 512, {
    base: '#3f403c',
    dark: '#252724',
    light: '#5c5c54',
    speckles: 12000,
    lines: 18
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(8, 8);

  const concrete = createNoiseTexture(256, 256, {
    base: '#77786f',
    dark: '#50524c',
    light: '#9a9b8f',
    speckles: 3500,
    lines: 12
  });
  concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping;
  concrete.repeat.set(3, 3);

  const rust = createRustTexture(256, 256);
  rust.wrapS = rust.wrapT = THREE.RepeatWrapping;
  rust.repeat.set(2, 2);

  const moss = createNoiseTexture(256, 256, {
    base: '#40523a',
    dark: '#263227',
    light: '#667555',
    speckles: 4500,
    lines: 8
  });
  moss.wrapS = moss.wrapT = THREE.RepeatWrapping;
  moss.repeat.set(2, 2);

  return { ground, asphalt, concrete, rust, moss };
}

function createNoiseTexture(width, height, options) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.base;
  ctx.fillRect(0, 0, width, height);

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const base = hexToRgb(options.base);
  const dark = hexToRgb(options.dark);
  const light = hexToRgb(options.light);

  for (let i = 0; i < data.length; i += 4) {
    const n = Math.random();
    const strength = n < 0.48 ? Math.random() * 0.35 : Math.random() * 0.18;
    const target = n < 0.48 ? dark : light;
    data[i] = lerp(base.r, target.r, strength);
    data[i + 1] = lerp(base.g, target.g, strength);
    data[i + 2] = lerp(base.b, target.b, strength);
    data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  ctx.globalAlpha = 0.13;
  for (let i = 0; i < options.speckles; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2.5 + 0.2;
    ctx.fillStyle = Math.random() > 0.5 ? options.dark : options.light;
    ctx.fillRect(x, y, size, size);
  }

  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = options.dark;
  for (let i = 0; i < options.lines; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createRustTexture(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5e5a4d';
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = Math.random() * 3 + 0.3;
    ctx.fillStyle = Math.random() > 0.4 ? '#693e2d' : '#85664a';
    ctx.globalAlpha = Math.random() * 0.45 + 0.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#312f2a';
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 40, height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createMaterials(textures) {
  return {
    ground: new THREE.MeshStandardMaterial({ map: textures.ground, roughness: 1 }),
    asphalt: new THREE.MeshStandardMaterial({ map: textures.asphalt, roughness: 0.96 }),
    concrete: new THREE.MeshStandardMaterial({ map: textures.concrete, roughness: 0.9 }),
    rust: new THREE.MeshStandardMaterial({ map: textures.rust, roughness: 0.92, metalness: 0.12 }),
    moss: new THREE.MeshStandardMaterial({ map: textures.moss, roughness: 1 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: 0x292b27, roughness: 0.8, metalness: 0.5 }),
    blackMetal: new THREE.MeshStandardMaterial({ color: 0x151713, roughness: 0.75, metalness: 0.65 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x4c3e2d, roughness: 1 }),
    deadWood: new THREE.MeshStandardMaterial({ color: 0x29271f, roughness: 1 }),
    vegetation: new THREE.MeshStandardMaterial({ color: 0x3f5639, roughness: 1 }),
    vegetationLight: new THREE.MeshStandardMaterial({ color: 0x667453, roughness: 1 }),
    fadedYellow: new THREE.MeshStandardMaterial({ color: 0x9b8d4e, roughness: 0.85 }),
    fadedRed: new THREE.MeshStandardMaterial({ color: 0x70463a, roughness: 0.9 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x52605d, roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.58 }),
    plastic: new THREE.MeshStandardMaterial({ color: 0x4f5149, roughness: 0.9 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x514a39, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x344947, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.72 })
  };
}

/* -------------------------------------------------------------------------- */
/* Terrain                                                                      */
/* -------------------------------------------------------------------------- */

function createTerrain(materials) {
  const geometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getY(i);
    position.setZ(i, terrainHeight(x, z));
  }
  geometry.computeVertexNormals();

  const terrain = new THREE.Mesh(geometry, materials.ground);
  terrain.rotation.x = -Math.PI / 2;
  terrain.name = 'Terrain';
  terrain.receiveShadow = true;
  return terrain;
}

function terrainHeight(x, z) {
  const n = fractalNoise(x * 0.012, z * 0.012);
  const broad = fractalNoise(x * 0.004 + 13, z * 0.004 - 7);
  let h = n * 8 + broad * 18;

  const valley = Math.max(0, 1 - Math.sqrt((x * x) / (HALF * HALF) + (z * z) / (HALF * HALF)));
  h *= 0.65 + valley * 0.5;

  // Lower central basin and a few deliberately readable ridges.
  h -= 9 * Math.exp(-((x * x) / 5000 + (z * z) / 7200));
  h += 7 * Math.exp(-(((x - 110) ** 2) / 5200 + ((z + 75) ** 2) / 6000));
  h += 6 * Math.exp(-(((x + 115) ** 2) / 6200 + ((z + 105) ** 2) / 5000));
  h -= 3 * Math.exp(-(((x + 20) ** 2) / 7000 + ((z - 105) ** 2) / 5000));

  return h;
}

function fractalNoise(x, y) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;
  for (let i = 0; i < 5; i++) {
    value += smoothNoise(x * frequency, y * frequency) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / total;
}

function smoothNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const sx = smoothstep(xf);
  const sy = smoothstep(yf);
  const n00 = hashNoise(x0, y0);
  const n10 = hashNoise(x0 + 1, y0);
  const n01 = hashNoise(x0, y0 + 1);
  const n11 = hashNoise(x0 + 1, y0 + 1);
  return lerp(lerp(n00, n10, sx), lerp(n01, n11, sx), sy);
}

function hashNoise(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7 + SEED * 0.17) * 43758.5453123;
  return (s - Math.floor(s)) * 2 - 1;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/* -------------------------------------------------------------------------- */
/* Natural boundary                                                             */
/* -------------------------------------------------------------------------- */

function createValleyBoundary(materials) {
  const group = new THREE.Group();
  group.name = 'ValleyBoundary';

  const rng = mulberry32(SEED + 90);
  const count = 220;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rng() * 0.05;
    const radius = 155 + rng() * 35;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const h = 12 + rng() * 28;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.5 + rng() * 3.8, 1),
      materials.dirt
    );
    rock.scale.set(1.2 + rng(), h / 5, 1.2 + rng());
    rock.position.set(x, terrainHeight(x, z) + h * 0.25, z);
    rock.rotation.set(rng() * 0.5, rng() * Math.PI, rng() * 0.5);
    group.add(rock);
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* Roads                                                                        */
/* -------------------------------------------------------------------------- */

function createRoadNetwork(materials) {
  const group = new THREE.Group();
  group.name = 'RoadNetwork';

  const roads = [
    { points: [[-145, 70], [-105, 53], [-55, 39], [0, 28], [56, 18], [112, 5], [145, -14]], width: 8 },
    { points: [[-86, -145], [-75, -103], [-63, -60], [-28, -16], [0, 28], [37, 70], [76, 132]], width: 7 },
    { points: [[-142, -82], [-96, -65], [-50, -45], [-10, -22], [35, -15], [88, -20], [144, -2]], width: 10 }
  ];

  for (const road of roads) {
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const length = Math.sqrt(dx * dx + dz * dz);
      const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(road.width, 0.16, length), materials.asphalt);
      roadMesh.position.set((a[0] + b[0]) / 2, averageRoadHeight(a, b) + 0.05, (a[1] + b[1]) / 2);
      roadMesh.rotation.y = Math.atan2(dx, dz);
      roadMesh.name = 'RoadSegment';
      group.add(roadMesh);
    }
  }

  // Broken lane markings and patches make the network read as old infrastructure.
  const rng = mulberry32(SEED + 300);
  for (let i = 0; i < 95; i++) {
    const x = -130 + rng() * 260;
    const z = -120 + rng() * 220;
    const y = terrainHeight(x, z) + 0.15;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(1.2 + rng() * 3, 0.025, 0.35), materials.fadedYellow);
    patch.position.set(x, y, z);
    patch.rotation.y = rng() * Math.PI;
    group.add(patch);
  }

  return group;
}

function averageRoadHeight(a, b) {
  return (terrainHeight(a[0], a[1]) + terrainHeight(b[0], b[1])) * 0.5;
}

/* -------------------------------------------------------------------------- */
/* Training compound                                                            */
/* -------------------------------------------------------------------------- */

function createTrainingCompound(materials) {
  const group = new THREE.Group();
  group.name = 'TrainingCompound';
  group.position.set(0, 0, 0);

  addConcreteSlab(group, materials, 0, 0, 54, 38, 0);
  addConcreteBarrierLine(group, materials, -25, -11, 50, 0);
  addConcreteBarrierLine(group, materials, 25, 10, 50, Math.PI / 2);

  // Main ruined training hall.
  addRuinedBuilding(group, materials, -11, 2, 18, 11, 5.5, 0.04);
  addRuinedBuilding(group, materials, 13, -2, 15, 9, 4.5, -0.03);

  // Firing lane / target shelter.
  for (let i = -2; i <= 2; i++) {
    addTargetFrame(group, materials, i * 5, -17, 3.5, 2.8);
  }

  // Containers and cover create multiple routes through the compound.
  addContainer(group, materials, -23, 0, -3, 11, 2.7, 2.6, 0.02);
  addContainer(group, materials, 23, 0, -4, 11, 2.7, 2.6, -0.04);
  addContainer(group, materials, -4, 0, 14, 7, 2.7, 2.6, Math.PI / 2);
  addContainer(group, materials, 8, 0, 14, 7, 2.7, 2.6, Math.PI / 2);

  // Small elevated shooting platform.
  addTower(group, materials, 0, 0, 13, 5.5, 5, 0.6);

  return group;
}

function addRuinedBuilding(group, materials, x, z, width, depth, height, rotation) {
  const building = new THREE.Group();
  building.position.set(x, terrainHeight(x, z), z);
  building.rotation.y = rotation;

  const wall = (sx, sy, sz, px, py, pz, mat = materials.concrete) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    building.add(m);
  };

  wall(width, 0.45, depth, 0, height, 0);
  wall(0.5, height, depth, -width / 2, height / 2, 0);
  wall(0.5, height * 0.72, depth, width / 2, height * 0.36, 0);
  wall(width * 0.45, height, 0.5, -width * 0.27, height / 2, -depth / 2);
  wall(width * 0.22, height * 0.55, 0.5, width * 0.33, height * 0.28, depth / 2);

  for (let i = 0; i < 4; i++) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.38, height * 0.9, 0.38), materials.rust);
    pillar.position.set(-width / 2 + 1.1 + i * (width - 2.2) / 3, height * 0.45, 0);
    building.add(pillar);
  }

  group.add(building);
}

function addConcreteSlab(group, materials, x, z, width, depth, rotation) {
  const y = terrainHeight(x, z) + 0.08;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, depth), materials.concrete);
  slab.position.set(x, y, z);
  slab.rotation.y = rotation;
  slab.name = 'ConcreteSlab';
  group.add(slab);
}

function addConcreteBarrierLine(group, materials, x, z, length, rotation) {
  for (let i = -5; i <= 5; i++) {
    const px = x + Math.cos(rotation) * i * 4.4;
    const pz = z + Math.sin(rotation) * i * 4.4;
    const h = 1 + (i % 3 === 0 ? 0.5 : 0);
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.8, h, 0.55), materials.concrete);
    barrier.position.set(px, terrainHeight(px, pz) + h / 2, pz);
    barrier.rotation.y = rotation;
    group.add(barrier);
  }
}

/* -------------------------------------------------------------------------- */
/* Industrial yard                                                             */
/* -------------------------------------------------------------------------- */

function createAbandonedIndustrialYard(materials) {
  const group = new THREE.Group();
  group.name = 'AbandonedIndustrialYard';

  const x0 = 84;
  const z0 = -56;
  addConcreteSlab(group, materials, x0, z0, 56, 40, 0.03);

  addWarehouse(group, materials, x0 - 7, z0 - 5, 30, 18, 9);
  addWarehouse(group, materials, x0 + 20, z0 + 9, 15, 12, 6);

  for (let i = 0; i < 9; i++) {
    addContainer(group, materials, x0 - 23 + (i % 3) * 9, z0 + 14 + Math.floor(i / 3) * 3, 8, 2.6, 2.6, (i % 2) * 0.04);
  }

  addFuelTank(group, materials, x0 + 17, z0 - 16, 3.8, 13);
  addFuelTank(group, materials, x0 + 25, z0 - 14, 3.1, 10);

  for (let i = 0; i < 8; i++) {
    const px = x0 - 17 + (i % 4) * 11;
    const pz = z0 - 13 + Math.floor(i / 4) * 6;
    addPipeJunk(group, materials, px, pz, 4 + (i % 3));
  }

  return group;
}

function addWarehouse(group, materials, x, z, width, depth, height) {
  const g = new THREE.Group();
  g.position.set(x, terrainHeight(x, z), z);

  const wallMat = materials.rust;
  const front = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.35), wallMat);
  front.position.z = -depth / 2;
  g.add(front);
  const back = front.clone();
  back.position.z = depth / 2;
  g.add(back);

  const side = new THREE.Mesh(new THREE.BoxGeometry(0.35, height, depth), wallMat);
  side.position.x = -width / 2;
  g.add(side);
  const side2 = side.clone();
  side2.position.x = width / 2;
  g.add(side2);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(width + 0.8, 0.35, depth + 0.8), materials.concrete);
  roof.position.y = height;
  g.add(roof);

  for (let i = 0; i < 4; i++) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.22, height, 0.22), materials.darkMetal);
    brace.position.set(-width / 2 + (i + 1) * width / 5, height / 2, -depth / 2 - 0.2);
    g.add(brace);
  }

  // Broken upper panels.
  for (let i = 0; i < 5; i++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 0.9), i % 2 ? materials.glass : materials.rust);
    panel.position.set(-width / 2 + 3 + i * 5, height * 0.73, -depth / 2 - 0.25);
    panel.rotation.z = (i % 3 - 1) * 0.12;
    g.add(panel);
  }

  group.add(g);
}

function addFuelTank(group, materials, x, z, radius, length) {
  const g = new THREE.Group();
  g.position.set(x, terrainHeight(x, z) + radius, z);
  g.rotation.z = Math.PI / 2;

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 20), materials.rust);
  g.add(tank);

  for (const y of [-length * 0.3, length * 0.3]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.08, 0.12, 8, 20), materials.darkMetal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    g.add(ring);
  }

  group.add(g);
}

function addPipeJunk(group, materials, x, z, length) {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, length, 10), materials.darkMetal);
  pipe.position.set(x, terrainHeight(x, z) + 0.25, z);
  pipe.rotation.z = Math.PI / 2;
  pipe.rotation.y = Math.random() * Math.PI;
  group.add(pipe);
}

/* -------------------------------------------------------------------------- */
/* Residential ruins                                                           */
/* -------------------------------------------------------------------------- */

function createCollapsedResidentialBlock(materials) {
  const group = new THREE.Group();
  group.name = 'CollapsedResidentialBlock';
  const baseX = -82;
  const baseZ = -62;

  const buildings = [
    [-16, -8, 13, 10, 6, 0.05],
    [1, -7, 12, 9, 7, -0.04],
    [15, 8, 14, 12, 5, 0.02],
    [-5, 11, 10, 10, 8, 0.07]
  ];

  for (const [dx, dz, w, d, h, r] of buildings) {
    addRuinedBuilding(group, materials, baseX + dx, baseZ + dz, w, d, h, r);
  }

  // Overturned furniture / concrete fragments.
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.41;
    const radius = 5 + (i % 5) * 2.4;
    const x = baseX + Math.cos(angle) * radius;
    const z = baseZ + Math.sin(angle) * radius;
    const debris = new THREE.Mesh(new THREE.BoxGeometry(0.8 + (i % 3), 0.4 + (i % 4) * 0.25, 0.5 + (i % 2)), materials.concrete);
    debris.position.set(x, terrainHeight(x, z) + 0.3, z);
    debris.rotation.set(i * 0.17, i * 0.31, i * 0.21);
    group.add(debris);
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* Towers                                                                       */
/* -------------------------------------------------------------------------- */

function createWatchtowerNetwork(materials) {
  const group = new THREE.Group();
  group.name = 'WatchtowerNetwork';
  addTower(group, materials, -124, 0, -9, 8, 8, 0.7);
  addTower(group, materials, 116, 0, -94, 10, 10, 0.5);
  addTower(group, materials, 112, 0, 92, 7, 7, 0.55);
  addTower(group, materials, -112, 0, 102, 9, 9, 0.6);
  return group;
}

function addTower(group, materials, x, _y, z, height, platformSize, railingHeight) {
  const tower = new THREE.Group();
  tower.position.set(x, terrainHeight(x, z), z);
  tower.name = 'Watchtower';

  const legMaterial = materials.darkMetal;
  const legOffset = platformSize * 0.34;
  for (const [lx, lz] of [[-legOffset, -legOffset], [legOffset, -legOffset], [-legOffset, legOffset], [legOffset, legOffset]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, height, 8), legMaterial);
    leg.position.set(lx, height / 2, lz);
    leg.rotation.z = (lx + lz) * 0.006;
    tower.add(leg);
  }

  const platform = new THREE.Mesh(new THREE.BoxGeometry(platformSize, 0.22, platformSize), materials.rust);
  platform.position.y = height;
  tower.add(platform);

  for (let i = 0; i < 4; i++) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(platformSize, railingHeight, 0.1), materials.darkMetal);
    rail.position.set(0, height + railingHeight / 2, (i < 2 ? -1 : 1) * (platformSize / 2 - 0.05));
    if (i >= 2) rail.rotation.y = Math.PI / 2;
    tower.add(rail);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(platformSize * 0.72, 2.3, 4), materials.rust);
  roof.position.y = height + 3;
  roof.rotation.y = Math.PI / 4;
  tower.add(roof);

  group.add(tower);
}

/* -------------------------------------------------------------------------- */
/* Bridge                                                                       */
/* -------------------------------------------------------------------------- */

function createDamagedBridge(materials) {
  const group = new THREE.Group();
  group.name = 'DamagedBridge';
  const x = 58;
  const z = 66;
  const y = terrainHeight(x, z) + 3;

  const deck = new THREE.Mesh(new THREE.BoxGeometry(11, 0.55, 48), materials.concrete);
  deck.position.set(x, y, z);
  deck.rotation.y = -0.15;
  group.add(deck);

  for (let i = -2; i <= 2; i++) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 8, 1.3), materials.concrete);
    pillar.position.set(x + i * 4.1, y - 4, z + (i % 2) * 4);
    pillar.rotation.z = (i % 2) * 0.08;
    group.add(pillar);
  }

  // Missing center section.
  const hole = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.8, 10), materials.dirt);
  hole.position.set(x, y - 0.35, z);
  group.add(hole);

  for (let i = 0; i < 15; i++) {
    const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.8), materials.concrete);
    rubble.position.set(x + (Math.random() - 0.5) * 12, terrainHeight(x, z) + Math.random() * 2, z + (Math.random() - 0.5) * 30);
    rubble.rotation.set(Math.random(), Math.random(), Math.random());
    group.add(rubble);
  }

  return group;
}

/* -------------------------------------------------------------------------- */
/* Parkour / traversal course                                                   */
/* -------------------------------------------------------------------------- */

function createParkourCourse(materials) {
  const group = new THREE.Group();
  group.name = 'ParkourCourse';
  const x0 = -74;
  const z0 = 58;

  for (let i = 0; i < 12; i++) {
    const x = x0 + i * 5.3;
    const z = z0 + Math.sin(i * 0.8) * 4;
    const h = 0.5 + (i % 4) * 0.65;
    const block = new THREE.Mesh(new THREE.BoxGeometry(3.5, h, 3), i % 3 === 0 ? materials.rust : materials.concrete);
    block.position.set(x, terrainHeight(x, z) + h / 2, z);
    block.rotation.y = i * 0.08;
    group.add(block);
  }

  for (let i = 0; i < 6; i++) {
    const x = x0 + 65 + i * 3.5;
    const z = z0 - 8 + Math.cos(i) * 2;
    addHurdle(group, materials, x, z, 1.2 + i * 0.15);
  }

  for (let i = 0; i < 4; i++) {
    const x = x0 + 88;
    const z = z0 - 12 + i * 6;
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5, 10), materials.darkMetal);
    pipe.position.set(x, terrainHeight(x, z) + 1.5, z);
    pipe.rotation.z = Math.PI / 2;
    group.add(pipe);
  }

  return group;
}

function addHurdle(group, materials, x, z, height) {
  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, height, 0.25), materials.wood);
  const leg2 = leg1.clone();
  leg1.position.set(x - 1.2, terrainHeight(x, z) + height / 2, z);
  leg2.position.set(x + 1.2, terrainHeight(x, z) + height / 2, z);
  group.add(leg1, leg2);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.22), materials.wood);
  bar.position.set(x, terrainHeight(x, z) + height, z);
  group.add(bar);
}

/* -------------------------------------------------------------------------- */
/* Target range                                                                */
/* -------------------------------------------------------------------------- */

function createTargetRange(materials) {
  const group = new THREE.Group();
  group.name = 'TargetRange';
  const x0 = 78;
  const z0 = 54;

  addConcreteSlab(group, materials, x0, z0, 46, 22, -0.05);
  for (let i = 0; i < 7; i++) {
    const x = x0 - 18 + i * 6;
    const z = z0 - 7;
    addTargetFrame(group, materials, x, z, 2.8 + (i % 2), 3.4);
  }

  // Old training turret shell / elevated observation hut.
  addTower(group, materials, x0 + 16, 0, z0 + 6, 5, 4, 0.55);
  addContainer(group, materials, x0 - 14, 0, z0 + 7, 9, 2.6, 2.6, 0.02);

  return group;
}

function addTargetFrame(group, materials, x, z, width, height) {
  const baseY = terrainHeight(x, z);
  const post = materials.darkMetal;
  for (const px of [-width / 2, width / 2]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, height, 0.18), post);
    p.position.set(x + px, baseY + height / 2, z);
    group.add(p);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.18, 0.18), post);
  top.position.set(x, baseY + height, z);
  group.add(top);

  const target = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20), materials.fadedRed);
  target.rotation.x = Math.PI / 2;
  target.position.set(x, baseY + height * 0.55, z + 0.12);
  target.name = 'TrainingTarget';
  group.add(target);
}

/* -------------------------------------------------------------------------- */
/* Vegetation                                                                   */
/* -------------------------------------------------------------------------- */

function createVegetation(materials) {
  const group = new THREE.Group();
  group.name = 'Overgrowth';
  const rng = mulberry32(SEED + 1000);

  // Keep central training spaces readable, concentrate foliage around edges and ruins.
  for (let i = 0; i < 420; i++) {
    const x = -145 + rng() * 290;
    const z = -140 + rng() * 280;
    if (Math.abs(x) < 40 && Math.abs(z) < 45) continue;
    if (distance2D(x, z, 84, -56) < 34) continue;

    const y = terrainHeight(x, z);
    const type = i % 5;
    if (type < 2) {
      group.add(createShrub(x, y, z, 0.6 + rng() * 1.5, materials, rng));
    } else if (type < 4) {
      group.add(createGrassClump(x, y, z, 0.5 + rng() * 1.2, materials, rng));
    } else {
      group.add(createDeadTree(x, y, z, 2.5 + rng() * 6, materials, rng));
    }
  }

  return group;
}

function createShrub(x, y, z, scale, materials, rng) {
  const shrub = new THREE.Group();
  const count = 5 + Math.floor(rng() * 5);
  for (let i = 0; i < count; i++) {
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 + rng() * 0.45, 1), i % 3 ? materials.vegetation : materials.vegetationLight);
    leaf.position.set((rng() - 0.5) * 1.5, 0.5 + rng() * 1.2, (rng() - 0.5) * 1.5);
    leaf.scale.y = 0.7 + rng() * 0.8;
    shrub.add(leaf);
  }
  shrub.position.set(x, y, z);
  shrub.scale.setScalar(scale);
  return shrub;
}

function createGrassClump(x, y, z, scale, materials, rng) {
  const grass = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05 + rng() * 0.06, 0.7 + rng() * 0.8, 4), i % 2 ? materials.vegetation : materials.vegetationLight);
    blade.position.set((rng() - 0.5) * 1.4, 0.4, (rng() - 0.5) * 1.4);
    blade.rotation.z = (rng() - 0.5) * 0.35;
    grass.add(blade);
  }
  grass.position.set(x, y, z);
  grass.scale.setScalar(scale);
  return grass;
}

function createDeadTree(x, y, z, height, materials, rng) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.35, height, 7), materials.deadWood);
  trunk.position.y = height / 2;
  tree.add(trunk);

  const branches = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < branches; i++) {
    const length = 1.2 + rng() * 2.8;
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, length, 5), materials.deadWood);
    branch.position.set((rng() - 0.5) * 0.8, height * (0.55 + rng() * 0.35), (rng() - 0.5) * 0.8);
    branch.rotation.z = (rng() - 0.5) * 1.3;
    branch.rotation.x = (rng() - 0.5) * 1.1;
    tree.add(branch);
  }

  tree.position.set(x, y, z);
  return tree;
}

/* -------------------------------------------------------------------------- */
/* Rubble and wrecks                                                            */
/* -------------------------------------------------------------------------- */

function createRubbleFields(materials) {
  const group = new THREE.Group();
  group.name = 'RubbleFields';
  const rng = mulberry32(SEED + 2100);

  const centers = [
    [-44, -12, 30],
    [36, -37, 26],
    [-52, -82, 24],
    [112, 12, 25],
    [-108, 34, 20],
    [42, 108, 24]
  ];

  for (const [cx, cz, count] of centers) {
    for (let i = 0; i < count; i++) {
      const angle = rng() * Math.PI * 2;
      const radius = rng() * 15;
      const x = cx + Math.cos(angle) * radius;
      const z = cz + Math.sin(angle) * radius;
      const size = 0.3 + rng() * 1.7;
      const piece = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), i % 3 ? materials.concrete : materials.rust);
      piece.position.set(x, terrainHeight(x, z) + size * 0.55, z);
      piece.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      group.add(piece);
    }
  }

  return group;
}

function createWreckFields(materials) {
  const group = new THREE.Group();
  group.name = 'WreckFields';
  const wrecks = [
    [42, -105, 0.3],
    [18, 86, -0.4],
    [-112, -24, 0.8],
    [101, 30, -0.6],
    [-35, 118, 0.2]
  ];

  for (let i = 0; i < wrecks.length; i++) {
    const [x, z, rot] = wrecks[i];
    group.add(createCarWreck(materials, x, z, rot, i % 2));
  }

  return group;
}

function createCarWreck(materials, x, z, rotation, truck) {
  const wreck = new THREE.Group();
  wreck.name = 'VehicleWreck';
  const y = terrainHeight(x, z);
  const bodyLength = truck ? 4.4 : 3.2;
  const bodyHeight = truck ? 1.2 : 0.85;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLength, bodyHeight, 1.8), materials.rust);
  body.position.y = bodyHeight * 0.65;
  body.rotation.z = 0.05;
  wreck.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.42, 1.1, 1.65), materials.darkMetal);
  cabin.position.set(-bodyLength * 0.05, 1.35, 0);
  cabin.rotation.z = -0.08;
  wreck.add(cabin);

  const wheelMat = materials.blackMetal;
  for (const wx of [-bodyLength * 0.3, bodyLength * 0.3]) {
    for (const wz of [-0.95, 0.95]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.45, wz);
      wreck.add(wheel);
    }
  }

  const glass = new THREE.Mesh(new THREE.BoxGeometry(bodyLength * 0.3, 0.6, 0.04), materials.glass);
  glass.position.set(-bodyLength * 0.08, 1.35, 0.83);
  glass.rotation.z = -0.08;
  wreck.add(glass);

  wreck.position.set(x, y, z);
  wreck.rotation.y = rotation;
  wreck.rotation.z = (truck ? -0.07 : 0.1);
  return wreck;
}

/* -------------------------------------------------------------------------- */
/* Utility infrastructure                                                       */
/* -------------------------------------------------------------------------- */

function createUtilityInfrastructure(materials) {
  const group = new THREE.Group();
  group.name = 'UtilityInfrastructure';

  const poles = [
    [-135, -35], [-115, -48], [-92, -58], [50, -128], [73, -122], [96, -112], [124, -98],
    [138, 40], [119, 55], [100, 71], [-125, 76], [-105, 92], [-80, 109]
  ];

  for (let i = 0; i < poles.length; i++) {
    const [x, z] = poles[i];
    addUtilityPole(group, materials, x, z, 7 + (i % 3));
  }

  // Broken fence around part of the old compound.
  for (let i = 0; i < 34; i++) {
    const x = -32 + i * 2.1;
    const z = -29 + Math.sin(i * 0.55) * 0.7;
    addFencePanel(group, materials, x, z, i % 3 === 0);
  }

  return group;
}

function addUtilityPole(group, materials, x, z, height) {
  const pole = new THREE.Group();
  pole.position.set(x, terrainHeight(x, z), z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, height, 7), materials.deadWood);
  trunk.position.y = height / 2;
  pole.add(trunk);

  const cross = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 0.14), materials.darkMetal);
  cross.position.y = height - 0.6;
  pole.add(cross);

  for (let i = -1; i <= 1; i++) {
    const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 6), materials.plastic);
    insulator.position.set(i * 1.1, height - 0.35, 0);
    pole.add(insulator);
  }

  group.add(pole);
}

function addFencePanel(group, materials, x, z, broken) {
  const y = terrainHeight(x, z);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), materials.darkMetal);
  post.position.set(x, y + 1.15, z);
  group.add(post);

  if (!broken) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2, 1.7, 0.07), materials.rust);
    panel.position.set(x + 1, y + 0.9, z);
    panel.rotation.z = 0.04;
    group.add(panel);
  }
}

/* -------------------------------------------------------------------------- */
/* Gameplay-readable cover / loot markers                                      */
/* -------------------------------------------------------------------------- */

function createLootAndCoverMarkers(materials) {
  const group = new THREE.Group();
  group.name = 'GameplayProps';
  const rng = mulberry32(SEED + 4100);

  const positions = [
    [-20, 22], [20, 19], [-34, -20], [34, -18], [61, -44], [103, -65],
    [-75, -50], [-93, -73], [68, 72], [91, 48], [-67, 76], [-102, 58],
    [9, 62], [48, 102], [-43, 103], [117, -5]
  ];

  for (let i = 0; i < positions.length; i++) {
    const [x, z] = positions[i];
    const y = terrainHeight(x, z);
    addLootCache(group, materials, x, z, i % 3);
    if (i % 2 === 0) addCoverStack(group, materials, x + 2.2, z - 1.5, 2 + Math.floor(rng() * 3));
  }

  return group;
}

function addLootCache(group, materials, x, z, type) {
  const y = terrainHeight(x, z);
  const cache = new THREE.Group();
  cache.name = `LootCache_${type}`;
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 1.05), type === 1 ? materials.rust : materials.plastic);
  box.position.y = 0.4;
  cache.add(box);

  const band = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.12, 1.1), materials.fadedYellow);
  band.position.y = 0.42;
  cache.add(band);

  cache.position.set(x, y, z);
  group.add(cache);
}

function addCoverStack(group, materials, x, z, count) {
  const y = terrainHeight(x, z);
  for (let i = 0; i < count; i++) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.2), i % 2 ? materials.concrete : materials.rust);
    block.position.set(x + (i % 2) * 0.4, y + 0.4 + Math.floor(i / 2) * 0.78, z);
    block.rotation.y = (i % 3 - 1) * 0.06;
    group.add(block);
  }
}

/* -------------------------------------------------------------------------- */
/* Gameplay data                                                                */
/* -------------------------------------------------------------------------- */

function createSpawnPoints() {
  return [
    [-126, -18], [-108, 46], [-92, -104], [-50, -126], [48, -126], [112, -102],
    [132, -20], [126, 65], [96, 118], [12, 132], [-58, 126], [-128, 96],
    [-42, -66], [42, -72], [-70, 38], [76, 38], [102, -46], [-102, -52]
  ].map(([x, z], index) => ({ id: `enemy_spawn_${index}`, position: [x, terrainHeight(x, z), z], radius: 7 }));
}

function createLootPoints() {
  return [
    [-23, 16], [21, 15], [-27, -16], [27, -16], [72, -42], [97, -68], [69, 70],
    [94, 46], [-71, 75], [-100, 57], [-78, -52], [-92, -73], [8, 63], [48, 102],
    [-45, 102], [118, -4], [15, -84], [-16, 92], [115, 86], [-119, -22]
  ].map(([x, z], index) => ({ id: `loot_${index}`, position: [x, terrainHeight(x, z), z], respawn: true }));
}

function createTargetPoints() {
  const points = [];
  for (let i = 0; i < 7; i++) {
    const x = 60 + i * 6;
    const z = 47;
    points.push({ id: `target_${i}`, position: [x, terrainHeight(x, z) + 1.5, z], type: i % 2 ? 'human' : 'mechanical' });
  }
  points.push({ id: 'turret_training_target', position: [94, terrainHeight(94, 60) + 5, 60], type: 'turret' });
  return points;
}

function createCoverPoints() {
  return [
    [-20, 10], [20, 10], [-20, -10], [20, -10], [-34, -20], [34, -18],
    [-62, 53], [-47, 59], [60, -44], [72, -38], [101, -65], [82, 68],
    [-84, -54], [-100, -73], [112, 39], [-108, 59]
  ].map(([x, z], index) => ({ id: `cover_${index}`, position: [x, terrainHeight(x, z), z], usable: true }));
}

/* -------------------------------------------------------------------------- */
/* Containers                                                                   */
/* -------------------------------------------------------------------------- */

function addContainer(group, materials, x, yOffset, z, length, height, width, rotation) {
  const y = terrainHeight(x, z) + yOffset;
  const container = new THREE.Group();
  container.position.set(x, y, z);
  container.rotation.y = rotation;

  const body = new THREE.Mesh(new THREE.BoxGeometry(length, height, width), materials.rust);
  body.position.y = height / 2;
  container.add(body);

  const ribs = Math.max(3, Math.floor(length / 2));
  for (let i = 0; i < ribs; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, height + 0.06, width + 0.06), materials.darkMetal);
    rib.position.set(-length / 2 + 0.8 + i * ((length - 1.6) / (ribs - 1)), height / 2, 0);
    container.add(rib);
  }

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, height - 0.2, width - 0.25), materials.darkMetal);
  door.position.set(length / 2 + 0.05, height / 2, 0);
  container.add(door);

  container.name = 'ShippingContainer';
  group.add(container);
}

/* -------------------------------------------------------------------------- */
/* RNG                                                                          */
/* -------------------------------------------------------------------------- */

function mulberry32(seed) {
  return function rng() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function distance2D(x1, z1, x2, z2) {
  return Math.sqrt((x1 - x2) ** 2 + (z1 - z2) ** 2);
}
