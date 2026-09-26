import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x6b5c46);
  scene.fog = new THREE.Fog(0x6b5c46, 20, 70);

  const ambientLight = new THREE.AmbientLight(0xcfc0a0, 0.65);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffb066, 1.1);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  return scene;
}
