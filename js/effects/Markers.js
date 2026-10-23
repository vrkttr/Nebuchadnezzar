import * as THREE from 'three';

export function fxMarker(kind, options = {}, position = {}) {
  const node = new THREE.Object3D();
  node.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  node.userData.fx = { kind, ...options };
  return node;
}
