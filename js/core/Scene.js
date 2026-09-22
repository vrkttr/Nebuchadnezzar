import * as THREE from 'three';

/**
 * Baut die reine Szenen-Infrastruktur auf: Hintergrund und Licht.
 *
 * Enthält bewusst keinen Zoneninhalt (Boden, Objekte, Vegetation etc.) —
 * dieser wird von den jeweiligen Zonen-Modulen unter js/world/ befüllt.
 * Dadurch bleibt Scene.js unabhängig davon, welche Zone gerade geladen ist.
 */
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  return scene;
}
