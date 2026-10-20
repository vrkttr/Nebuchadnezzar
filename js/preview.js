import * as THREE from 'three';
import { createHumanoid } from './entities/Humanoid.js';
import { buildPlayerAppearance } from './entities/AppearanceOptions.js';

const ROTATION_SPEED = 0.5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x26231c);
scene.add(new THREE.HemisphereLight(0xe2e8e6, 0x7b7660, 2.1));
const sun = new THREE.DirectionalLight(0xfff0d2, 1.7);
sun.position.set(-3, 6, 5);
scene.add(sun);

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 1.15, 4.6);
camera.lookAt(0, 0.9, 0);

const humanoid = createHumanoid('player');
scene.add(humanoid.object);

function readHash() {
  return window.location.hash
    .replace('#', '')
    .split(',')
    .map((value) => Number(value));
}

function applyHash() {
  humanoid.setAppearance(buildPlayerAppearance(readHash()));
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('hashchange', applyHash);
window.addEventListener('resize', resize);
applyHash();
resize();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  humanoid.object.rotation.y += ROTATION_SPEED * delta;
  humanoid.update(delta);
  renderer.render(scene, camera);
}

animate();
