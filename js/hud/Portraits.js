import * as THREE from 'three';

const PORTRAIT_SIZE = 96;
const UPDATE_INTERVAL = 0.1;
const PORTRAIT_LAYER = 1;
const HEAD_HEIGHT_FACTOR = 1.72;
const CAMERA_DISTANCE = 1.1;
const BACKGROUND_COLOR = 0x26231c;

export function createPortraits({ scene, renderer, viewCapture, player, enemies, remotePlayers, gameState }) {
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  camera.layers.set(PORTRAIT_LAYER);

  const targets = [
    {
      canvas: createCanvas('#player-frame .portrait'),
      frame: document.getElementById('player-frame'),
      resolve: () => player.object,
    },
    {
      canvas: createCanvas('#target-frame .portrait'),
      frame: document.getElementById('target-frame'),
      resolve: () => {
        if (gameState.target) return enemies.getObject(gameState.target.id);
        if (gameState.playerTarget) return remotePlayers.getObject(gameState.playerTarget);
        return null;
      },
    },
  ];

  const savedColor = new THREE.Color();
  let timer = UPDATE_INTERVAL;

  function createCanvas(selector) {
    const host = document.querySelector(selector);
    const canvas = document.createElement('canvas');
    const pixelRatio = renderer.getPixelRatio();
    canvas.width = Math.round(PORTRAIT_SIZE * pixelRatio);
    canvas.height = Math.round(PORTRAIT_SIZE * pixelRatio);
    host.appendChild(canvas);
    return canvas;
  }

  function frameCamera(object) {
    const headY = object.position.y + (object.userData.headHeight ?? object.scale.y * HEAD_HEIGHT_FACTOR);
    const dirX = Math.sin(object.rotation.y);
    const dirZ = Math.cos(object.rotation.y);

    camera.position.set(
      object.position.x + dirX * CAMERA_DISTANCE,
      headY + 0.04,
      object.position.z + dirZ * CAMERA_DISTANCE
    );
    camera.lookAt(object.position.x, headY - 0.03, object.position.z);
    camera.updateMatrixWorld();
  }

  function update(delta) {
    timer += delta;
    if (timer < UPDATE_INTERVAL) return;
    timer = 0;

    const background = scene.background;
    const savedAlpha = renderer.getClearAlpha();
    renderer.getClearColor(savedColor);
    scene.background = null;
    renderer.setClearColor(BACKGROUND_COLOR, 1);

    for (const target of targets) {
      if (target.frame.classList.contains('hidden')) continue;

      const object = target.resolve();
      if (!object || !object.visible) continue;

      frameCamera(object);
      viewCapture.capture(scene, camera, target.canvas.getContext('2d'), PORTRAIT_SIZE);
    }

    scene.background = background;
    renderer.setClearColor(savedColor, savedAlpha);
  }

  return { update };
}
