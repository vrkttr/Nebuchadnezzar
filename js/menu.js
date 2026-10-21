import * as THREE from 'three';
import { createHumanoid } from './entities/Humanoid.js';
import { buildPlayerAppearance } from './entities/AppearanceOptions.js';
import { createPlattenbau } from './world/builders/Plattenbau.js';
import { createWaterTower } from './world/builders/Tower.js';
import { createTree, createForest, createBush } from './world/builders/Vegetation.js';
import { createCar, createPole, createContainer, createFence, createBarrel } from './world/builders/Props.js';
import { getMaterial, getTexture } from './world/Textures.js';
import { createRandom } from './world/Random.js';

const params = new URLSearchParams(location.search);
const STILL = params.has('still');
const VALLEY = -16;
const FOG = 0xcdb593;
const PIXEL_RATIO_LIMIT = 1.5;

document.body.style.margin = '0';
document.body.style.background = '#14120d';
document.body.style.overflow = 'hidden';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: STILL });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_LIMIT));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.Fog(FOG, 55, 620);

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const g = canvas.getContext('2d');
  const gradient = g.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#31475a');
  gradient.addColorStop(0.3, '#62787e');
  gradient.addColorStop(0.5, '#bba98a');
  gradient.addColorStop(0.62, '#e9b56c');
  gradient.addColorStop(0.7, '#dc9a58');
  gradient.addColorStop(1, '#8a6a46');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 2048, 1024);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext('2d');
  const glow = g.createRadialGradient(256, 256, 0, 256, 256, 256);
  glow.addColorStop(0, 'rgba(255,246,214,1)');
  glow.addColorStop(0.06, 'rgba(255,228,164,0.95)');
  glow.addColorStop(0.2, 'rgba(255,192,112,0.5)');
  glow.addColorStop(0.55, 'rgba(240,150,80,0.16)');
  glow.addColorStop(1, 'rgba(240,150,80,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cloudTexture(seed) {
  const random = createRandom(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  for (let i = 0; i < 46; i += 1) {
    const y = random.range(30, 226);
    const w = random.range(160, 520);
    const h = random.range(8, 30);
    const x = random.range(0, 2048);
    const dark = i % 3 !== 0;
    g.fillStyle = dark ? `rgba(40,52,62,${random.range(0.1, 0.3)})` : `rgba(255,205,140,${random.range(0.14, 0.34)})`;
    for (const shift of [-2048, 0, 2048]) {
      g.beginPath();
      g.ellipse(x + shift, y, w, h, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

const sky = new THREE.Mesh(new THREE.PlaneGeometry(2600, 1300), new THREE.MeshBasicMaterial({ map: skyTexture(), fog: false, depthWrite: false }));
sky.position.set(0, 330, -1100);
sky.renderOrder = -10;
scene.add(sky);

const sunGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(1100, 1100),
  new THREE.MeshBasicMaterial({ map: glowTexture(), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })
);
sunGlow.position.set(230, 75, -1090);
sunGlow.renderOrder = -9;
scene.add(sunGlow);

const cloudLayers = [];
for (const [seed, y, scale, speed, opacity] of [
  [3, 340, 1, 0.004, 0.9],
  [8, 250, 1.4, 0.0065, 0.7],
]) {
  const texture = cloudTexture(seed);
  const layer = new THREE.Mesh(
    new THREE.PlaneGeometry(2600 * scale, 330 * scale),
    new THREE.MeshBasicMaterial({ map: texture, fog: false, depthWrite: false, transparent: true, opacity })
  );
  layer.position.set(0, y, -1080);
  layer.renderOrder = -8;
  scene.add(layer);
  cloudLayers.push({ texture, speed });
}

scene.add(new THREE.HemisphereLight(0xd8c8a6, 0x8a7a52, 2.0));
const sun = new THREE.DirectionalLight(0xffc27a, 2.6);
sun.position.set(30, 14, -90);
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0x8fa1ad, 0.55);
fill.position.set(-20, 30, 40);
scene.add(fill);
const front = new THREE.DirectionalLight(0xffe6c0, 1.1);
front.position.set(-8, 6, 24);
scene.add(front);

const valleyGeometry = new THREE.PlaneGeometry(3000, 3000, 100, 100);
valleyGeometry.rotateX(-Math.PI / 2);
const valleyUv = valleyGeometry.attributes.uv;
for (let i = 0; i < valleyUv.count; i += 1) valleyUv.setXY(i, valleyUv.getX(i) * 260, valleyUv.getY(i) * 260);
const patches = createRandom(77);
const palette = [0xc2cf80, 0xdcd28c, 0xa0b86a, 0xcbb878, 0xb2c276].map((value) => new THREE.Color(value));
const valleyColors = [];
for (let i = 0; i < valleyUv.count; i += 1) {
  const color = palette[Math.floor(patches.range(0, palette.length))];
  valleyColors.push(color.r, color.g, color.b);
}
valleyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(valleyColors, 3));
const valley = new THREE.Mesh(valleyGeometry, new THREE.MeshLambertMaterial({ map: getTexture('grass'), vertexColors: true, emissive: 0x2a2c14 }));
valley.position.y = VALLEY;
scene.add(valley);

function slabBox(material, w, h, d, x, y, z) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const uvs = geometry.attributes.uv;
  for (let i = 0; i < uvs.count; i += 1) uvs.setXY(i, (uvs.getX(i) * w) / 3, (uvs.getY(i) * h) / 3);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

const concrete = getMaterial('slab', { color: 0xb8b6a8 });
const rock = getMaterial('concrete_panel', { color: 0x8b8578 });
slabBox(rock, 34, 16, 14, 2, -8.02, 5.5);
slabBox(concrete, 34.2, 0.3, 14.2, 2, -0.1, 5.5);

const random = createRandom(21);

function place(object, x, z, ry = 0, y = VALLEY) {
  object.position.set(x, y, z);
  object.rotation.y = ry;
  scene.add(object);
  return object;
}

const blocks = [
  [-150, -170, 0.15, 12, 5],
  [-60, -230, 0.05, 10, 4],
  [20, -210, -0.2, 14, 5],
  [90, -190, 0.3, 9, 4],
  [150, -260, 0.1, 16, 5],
  [-230, -300, -0.1, 12, 4],
  [-110, -330, 0.2, 10, 5],
  [60, -340, 0.0, 12, 6],
  [200, -360, -0.25, 14, 4],
  [-300, -210, 0.35, 10, 4],
  [280, -220, 0.1, 12, 5],
  [-30, -430, 0.05, 16, 6],
  [150, -460, -0.15, 12, 5],
  [-200, -480, 0.1, 14, 6],
  [330, -420, 0.2, 10, 4],
];
blocks.forEach(([x0, z0, ry, cells, floors], index) => {
  const building = createPlattenbau({ cells, floors, depth: 11, seed: index + 3, ivyDensity: 0.8, inhabited: index % 3 === 0 ? [2, 5] : [] });
  place(building.object, x0 * 0.62, z0 * 0.5, ry + (index % 2 === 0 ? 0 : 0.3));
});

place(createWaterTower({ seed: 9 }), 60, -150, 0.4);
place(createWaterTower({ seed: 4 }), -170, -210, 0.2);

const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(15, 520), getMaterial('asphalt', { color: 0xa8a496 }));
roadMesh.geometry.rotateX(-Math.PI / 2);
const roadUv = roadMesh.geometry.attributes.uv;
for (let i = 0; i < roadUv.count; i += 1) roadUv.setXY(i, roadUv.getX(i) * 4, roadUv.getY(i) * 90);
roadMesh.position.set(22, VALLEY + 0.06, -300);
roadMesh.rotation.y = 0.1;
scene.add(roadMesh);

place(createCar({ seed: 2 }), 24, -62, 0.3);
place(createCar({ seed: 5 }), 28, -96, -0.15);
place(createCar({ seed: 8 }), 20, -140, 0.1);
place(createContainer({ tint: 0xb86a4a }), -26, -58, 0.3);
place(createContainer({ tint: 0x5a7a62, stacked: true }), -34, -66, 0.1);
place(createBarrel(), 10, -52, 0);

for (let i = 0; i < 14; i += 1) {
  const x = random.range(-90, 90);
  const z = random.range(-170, -80);
  if (Math.abs(x - 22) < 12) continue;
  place(
    createForest({
      trees: Array.from({ length: 8 }, (_, k) => ({
        x: random.range(-9, 9),
        z: random.range(-9, 9),
        seed: i * 20 + k,
        height: random.range(7, 12),
        kind: k % 3 ? 'broadleaf' : 'conifer',
      })),
    }),
    x,
    z,
    0
  );
}

for (let i = 0; i < 160; i += 1) {
  const x = random.range(-420, 420);
  const z = random.range(-430, -140);
  if (Math.abs(x - 24) < 14) continue;
  place(createTree({ seed: i + 1, height: random.range(8, 16), kind: i % 3 === 0 ? 'conifer' : 'broadleaf' }), x, z, random.range(0, 6));
}

const poleXs = [];
for (let i = 0; i < 12; i += 1) poleXs.push(-60 + i * 22);
poleXs.forEach((x, index) => place(createPole({ height: 9.5 }), x, -70 - (index % 2) * 4, 0));
const wireMaterial = new THREE.LineBasicMaterial({ color: 0x1c1b17 });
function wire(a, b, sag) {
  const points = [];
  for (let s = 0; s <= 20; s += 1) {
    const t = s / 20;
    points.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * sag, a.z + (b.z - a.z) * t));
  }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), wireMaterial));
}
for (let i = 0; i < poleXs.length - 1; i += 1) {
  for (const dy of [0, -0.7]) {
    wire(
      new THREE.Vector3(poleXs[i], VALLEY + 9.1 + dy, -70 - (i % 2) * 4),
      new THREE.Vector3(poleXs[i + 1], VALLEY + 9.1 + dy, -70 - ((i + 1) % 2) * 4),
      1.1
    );
  }
}

place(createPole({ height: 9.5 }), -4.0, 0.2, 0.2, 0);
wire(new THREE.Vector3(-4.4, 9.1, 0.6), new THREE.Vector3(-60, VALLEY + 9.1, -70), 2.4);
wire(new THREE.Vector3(-4.4, 8.4, 0.6), new THREE.Vector3(-60, VALLEY + 8.4, -70), 2.4);

for (const [fx, fz, fry] of [
  [-17, -0.8, 0],
  [12, -0.8, 0],
]) {
  place(createFence({ length: 12, height: 1.6, seed: Math.abs(fx) + 1 }), fx, fz, fry, 0);
}
place(createBush({ seed: 9, size: 1.2 }), 13, 2.5, 0, 0);

const humanoid = createHumanoid('player', { appearance: buildPlayerAppearance([1, 2, 1, 1, 0]) });
humanoid.object.position.set(1.7, 0, -0.1);
humanoid.object.rotation.y = Math.PI + 0.25;
scene.add(humanoid.object);

const birds = [];
const birdMaterial = new THREE.MeshBasicMaterial({ color: 0x23201a, side: THREE.DoubleSide, fog: false });
for (let i = 0; i < 7; i += 1) {
  const shape = new THREE.Shape();
  shape.moveTo(-1, 0);
  shape.lineTo(0, 0.35);
  shape.lineTo(1, 0);
  shape.lineTo(0, 0.12);
  const bird = new THREE.Mesh(new THREE.ShapeGeometry(shape), birdMaterial);
  const baseY = 38 + random.range(-6, 18);
  bird.userData = { speed: random.range(2.2, 3.4), baseY, phase: random.range(0, 6) };
  bird.position.set(random.range(-120, 120), baseY, -170 - random.range(0, 50));
  bird.scale.setScalar(random.range(1.6, 2.4));
  scene.add(bird);
  birds.push(bird);
}

const MOTES = 90;
const moteGeometry = new THREE.BufferGeometry();
const motePositions = new Float32Array(MOTES * 3);
for (let i = 0; i < MOTES; i += 1) {
  motePositions[i * 3] = random.range(-14, 16);
  motePositions[i * 3 + 1] = random.range(0, 9);
  motePositions[i * 3 + 2] = random.range(-14, 6);
}
moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
const motes = new THREE.Points(
  moteGeometry,
  new THREE.PointsMaterial({ color: 0xffe2a8, size: 0.07, transparent: true, opacity: 0.7, fog: false, depthWrite: false })
);
scene.add(motes);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
const BASE = new THREE.Vector3(-1.0, 2.0, 5.8);
const TARGET = new THREE.Vector3(2.6, -6.8, -60);
const look = new THREE.Vector3();

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
let elapsed = 0;

function frame(delta) {
  elapsed += delta;
  const sway = STILL ? 0 : 1;
  camera.position.set(
    BASE.x + Math.sin(elapsed * 0.11) * 0.45 * sway,
    BASE.y + Math.sin(elapsed * 0.17) * 0.05 * sway,
    BASE.z + Math.cos(elapsed * 0.09) * 0.25 * sway
  );
  look.set(TARGET.x + Math.sin(elapsed * 0.07) * 1.2 * sway, TARGET.y, TARGET.z);
  camera.lookAt(look);

  humanoid.update(delta);
  for (const layer of cloudLayers) layer.texture.offset.x = (layer.texture.offset.x + layer.speed * delta * 0.1) % 1;
  sunGlow.material.opacity = 0.92 + Math.sin(elapsed * 0.6) * 0.06;

  for (const bird of birds) {
    const data = bird.userData;
    bird.position.x += data.speed * delta * 3;
    if (bird.position.x > 160) bird.position.x = -160;
    bird.position.y = data.baseY + Math.sin(elapsed * 0.8 + data.phase) * 1.2;
    bird.scale.y = 0.7 + Math.abs(Math.sin(elapsed * 5 + data.phase)) * 0.7;
  }

  const attribute = moteGeometry.attributes.position;
  for (let i = 0; i < MOTES; i += 1) {
    let x = attribute.getX(i) + delta * 0.25;
    let y = attribute.getY(i) + Math.sin(elapsed * 0.5 + i) * delta * 0.1;
    if (x > 16) x = -14;
    if (y > 9) y = 0;
    attribute.setXY(i, x, y);
  }
  attribute.needsUpdate = true;

  renderer.render(scene, camera);
}

if (STILL) {
  window.renderDone = false;
  setTimeout(() => {
    frame(0.016);
    frame(0.016);
    window.renderDone = true;
  }, 2500);
} else {
  const loop = () => {
    requestAnimationFrame(loop);
    frame(Math.min(clock.getDelta(), 0.1));
  };
  loop();
}
