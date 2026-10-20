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

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = createSkyTexture();

  const hemisphere = new THREE.HemisphereLight(0xe2e8e6, 0x7b7660, 2.1);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff0d2, 1.7);
  sun.position.set(-18, 30, 14);
  scene.add(sun);

  return scene;
}
