import * as THREE from 'three';
import { t } from '../i18n/I18n.js';

const CAPTURE_SIZE = 200;
const UPDATE_INTERVAL = 0.1;
const CAMERA_HEIGHT = 80;
const MIN_RADIUS = 15;
const MAX_RADIUS = 60;
const DEFAULT_RADIUS = 30;
const ZOOM_STEP = 5;
const MARKER_RADIUS = 3.5;

const MARKER_COLORS = {
  enemies: '#d9432b',
  npcs: '#e8b84a',
  players: '#9ec4e0',
};

export function createMinimap({ scene, camera, viewCapture, renderer, player, sources }) {
  const container = document.getElementById('minimap-circle');
  const canvas = document.createElement('canvas');
  const pixelRatio = renderer.getPixelRatio();
  canvas.width = Math.round(CAPTURE_SIZE * pixelRatio);
  canvas.height = Math.round(CAPTURE_SIZE * pixelRatio);
  canvas.id = 'minimap-canvas';
  container.appendChild(canvas);
  const context = canvas.getContext('2d');

  const mapCamera = new THREE.OrthographicCamera(-DEFAULT_RADIUS, DEFAULT_RADIUS, DEFAULT_RADIUS, -DEFAULT_RADIUS, 1, 200);
  const forward = new THREE.Vector3();
  let radius = DEFAULT_RADIUS;
  let timer = UPDATE_INTERVAL;

  function applyRadius() {
    mapCamera.left = -radius;
    mapCamera.right = radius;
    mapCamera.top = radius;
    mapCamera.bottom = -radius;
    mapCamera.updateProjectionMatrix();
  }

  container.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, radius + Math.sign(event.deltaY) * ZOOM_STEP));
      applyRadius();
      timer = UPDATE_INTERVAL;
    },
    { passive: false }
  );

  function drawMarkers(forwardX, forwardZ, center, scale) {
    const px = player.object.position.x;
    const pz = player.object.position.z;

    for (const [group, color] of Object.entries(MARKER_COLORS)) {
      context.fillStyle = color;
      context.strokeStyle = '#0f0e0a';
      context.lineWidth = 1.5 * pixelRatio;

      for (const marker of sources[group]()) {
        const dx = marker.x - px;
        const dz = marker.z - pz;
        const ahead = dx * forwardX + dz * forwardZ;
        const right = -dx * forwardZ + dz * forwardX;
        const x = center + right * scale;
        const y = center - ahead * scale;

        if (Math.hypot(x - center, y - center) > center - MARKER_RADIUS * pixelRatio) continue;

        context.beginPath();
        context.arc(x, y, MARKER_RADIUS * pixelRatio, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }
  }

  function drawCardinals(forwardX, forwardZ, center) {
    const directions = [
      ['N', 0, -1, '#e0553a'],
      ['E', 1, 0, '#e8dcb0'],
      ['S', 0, 1, '#e8dcb0'],
      ['W', -1, 0, '#e8dcb0'],
    ];
    const distance = center - 13 * pixelRatio;

    context.font = `${12 * pixelRatio}px 'Allerta Stencil', sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    for (const [label, dx, dz, color] of directions) {
      const ahead = dx * forwardX + dz * forwardZ;
      const right = -dx * forwardZ + dz * forwardX;
      const x = center + right * distance;
      const y = center - ahead * distance;

      context.beginPath();
      context.arc(x, y, 9 * pixelRatio, 0, Math.PI * 2);
      context.fillStyle = 'rgba(15, 14, 10, 0.65)';
      context.fill();
      context.fillStyle = color;
      context.fillText(t(`compass.${label}`), x, y + pixelRatio);
    }
  }

  function drawArrow(forwardX, forwardZ, center) {
    const facingX = Math.sin(player.object.rotation.y);
    const facingZ = Math.cos(player.object.rotation.y);
    const angle = Math.atan2(-facingX * forwardZ + facingZ * forwardX, facingX * forwardX + facingZ * forwardZ);

    context.save();
    context.translate(center, center);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, -7 * pixelRatio);
    context.lineTo(5 * pixelRatio, 6 * pixelRatio);
    context.lineTo(0, 3 * pixelRatio);
    context.lineTo(-5 * pixelRatio, 6 * pixelRatio);
    context.closePath();
    context.fillStyle = '#d19a3a';
    context.strokeStyle = '#0f0e0a';
    context.lineWidth = 1.5 * pixelRatio;
    context.fill();
    context.stroke();
    context.restore();
  }

  function update(delta) {
    timer += delta;
    if (timer < UPDATE_INTERVAL) return;
    timer = 0;

    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();

    const position = player.object.position;
    mapCamera.up.set(forward.x, 0, forward.z);
    mapCamera.position.set(position.x, CAMERA_HEIGHT, position.z);
    mapCamera.lookAt(position.x, 0, position.z);
    mapCamera.updateMatrixWorld();

    viewCapture.capture(scene, mapCamera, context, CAPTURE_SIZE);

    const center = canvas.width / 2;
    const scale = center / radius;
    drawMarkers(forward.x, forward.z, center, scale);
    drawArrow(forward.x, forward.z, center);
    drawCardinals(forward.x, forward.z, center);
  }

  applyRadius();

  return { update };
}
