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

const HEMISPHERE_INTENSITY = 2.1;
const SUN_INTENSITY = 1.7;

export function createScene() {
  const scene = new THREE.Scene();
  const sky = createSkyTexture();
  scene.background = sky;

  const hemisphere = new THREE.HemisphereLight(0xe2e8e6, 0x7b7660, 2.1);
  hemisphere.layers.enable(1);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff0d2, 1.7);
  sun.position.set(-18, 30, 14);
  sun.layers.enable(1);
  scene.add(sun);

  scene.userData.environment = { sky, hemisphere, sun };

  return scene;
}

export function applyLighting(scene, world) {
  const { sky, hemisphere, sun } = scene.userData.environment;
  const lighting = world.indoor ? world.lighting ?? {} : {};

  scene.background = world.indoor ? new THREE.Color(lighting.background ?? '#070706') : sky;
  hemisphere.intensity = HEMISPHERE_INTENSITY * (lighting.ambient ?? 1);
  sun.intensity = SUN_INTENSITY * (lighting.sun ?? 1);
}
