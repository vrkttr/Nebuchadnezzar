import * as THREE from 'three';

/**
 * Erstellt die Spielerfigur als einfachen Low-Poly-Platzhalter
 * (Kapsel-Körper + Kopf). Wird später durch ein echtes,
 * animiertes Modell ersetzt.
 *
 * Gibt ein Objekt mit dem Mesh sowie Hilfsmethoden zurück, damit
 * spätere Schritte (Bewegung, Kamera-Anbindung) darauf aufbauen
 * können, ohne dieses Modul erneut anfassen zu müssen.
 */
export function createPlayer() {
  const player = new THREE.Group();
  player.name = 'Player';

  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3d6ea5 });

  const bodyGeometry = new THREE.CapsuleGeometry(0.35, 0.9, 4, 8);
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.85;
  player.add(body);

  const headGeometry = new THREE.SphereGeometry(0.25, 12, 12);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xd8a878 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.55;
  player.add(head);

  return {
    object: player,
    setPosition(x, y, z) {
      player.position.set(x, y, z);
    },
  };
}
