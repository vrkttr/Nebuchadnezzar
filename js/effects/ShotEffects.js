import * as THREE from 'three';

const TRACER_LIFETIME = 0.09;
const FLASH_LIFETIME = 0.06;
const MUZZLE_HEIGHT = 1.12;
const MUZZLE_FORWARD = 0.85;
const TARGET_HEIGHT = 1.0;

export function createShotEffects(scene) {
  const tracerGeometry = new THREE.BoxGeometry(0.025, 0.025, 1);
  const tracerMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
  const flashGeometry = new THREE.IcosahedronGeometry(0.13, 0);
  const flashMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2c8 });
  const effects = [];

  function spawn(from, to) {
    const start = new THREE.Vector3(from.x, from.y + MUZZLE_HEIGHT, from.z);
    const end = new THREE.Vector3(to.x, to.y + TARGET_HEIGHT, to.z);
    const direction = end.clone().sub(start);
    const length = direction.length();
    if (length < 0.01) return;
    direction.divideScalar(length);

    start.addScaledVector(direction, Math.min(MUZZLE_FORWARD, length));
    const tracerLength = Math.max(0.01, length - MUZZLE_FORWARD);

    const tracer = new THREE.Mesh(tracerGeometry, tracerMaterial);
    tracer.position.copy(start).addScaledVector(direction, tracerLength / 2);
    tracer.lookAt(end);
    tracer.scale.z = tracerLength;
    scene.add(tracer);
    effects.push({ object: tracer, age: 0, lifetime: TRACER_LIFETIME });

    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(start);
    flash.scale.setScalar(0.7 + Math.random() * 0.6);
    scene.add(flash);
    effects.push({ object: flash, age: 0, lifetime: FLASH_LIFETIME });
  }

  function update(delta) {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.age += delta;
      if (effect.age >= effect.lifetime) {
        scene.remove(effect.object);
        effects.splice(index, 1);
      }
    }
  }

  return { spawn, update };
}
