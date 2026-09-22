import * as THREE from 'three';

/**
 * Erstellt und konfiguriert den WebGL-Renderer.
 * Kümmert sich außerdem um die Anpassung bei Fenstergrößenänderung.
 */
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return renderer;
}
