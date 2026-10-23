import * as THREE from 'three';

function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#7f93a0');
  gradient.addColorStop(0.55, '#aebcbf');
  gradient.addColorStop(1, '#d4cdb6');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const HEMISPHERE_INTENSITY = 1.8;
const SUN_INTENSITY = 2.5;
const SUN_OFFSET = new THREE.Vector3(-18, 30, 14);
const SHADOW_RANGE = 48;
const SHADOW_MAP_SIZE = 2048;

export function createScene() {
  const scene = new THREE.Scene();
  const sky = createSkyTexture();
  scene.background = sky;

  const hemisphere = new THREE.HemisphereLight(0xe2e8e6, 0x7b7660, HEMISPHERE_INTENSITY);
  hemisphere.layers.enable(1);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff0d2, 1.7);
  sun.position.copy(SUN_OFFSET);
  sun.layers.enable(1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.camera.left = -SHADOW_RANGE;
  sun.shadow.camera.right = SHADOW_RANGE;
  sun.shadow.camera.top = SHADOW_RANGE;
  sun.shadow.camera.bottom = -SHADOW_RANGE;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.06;
  scene.add(sun);
  scene.add(sun.target);

  scene.userData.environment = { sky, hemisphere, sun };

  return scene;
}

export function applyLighting(scene, world) {
  const { sky, hemisphere, sun } = scene.userData.environment;
  const lighting = world.indoor || world.chunked ? world.lighting ?? {} : {};

  scene.background = world.indoor ? new THREE.Color(lighting.background ?? '#070706') : sky;
  hemisphere.intensity = HEMISPHERE_INTENSITY * (lighting.ambient ?? 1);
  sun.intensity = SUN_INTENSITY * (lighting.sun ?? 1);
  sun.castShadow = !world.indoor;

  const [fogColor, fogNear, fogFar] = String(lighting.fog ?? '').split(':');
  scene.fog = (world.indoor || world.chunked) && fogColor && Number(fogFar) > 0 ? new THREE.Fog(fogColor, Number(fogNear), Number(fogFar)) : null;
}

const SHADOW_STEP = 4;
const flagged = new WeakSet();

export function followSun(scene, x, z) {
  const { sun } = scene.userData.environment;
  const snappedX = Math.round(x / SHADOW_STEP) * SHADOW_STEP;
  const snappedZ = Math.round(z / SHADOW_STEP) * SHADOW_STEP;
  sun.target.position.set(snappedX, 0, snappedZ);
  sun.position.set(snappedX + SUN_OFFSET.x, SUN_OFFSET.y, snappedZ + SUN_OFFSET.z);
  sun.target.updateMatrixWorld();
}

export function flagShadows(scene) {
  scene.traverse((node) => {
    if (!node.isMesh || flagged.has(node)) return;
    flagged.add(node);
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    if (!material || material.isMeshBasicMaterial || material.transparent) return;
    node.receiveShadow = true;
    node.castShadow = !material.polygonOffset && node.geometry?.type !== 'PlaneGeometry';
  });
}
