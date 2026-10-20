import * as THREE from 'three';
import { t } from '../i18n/I18n.js';

const STORAGE_KEY = 'sektorsieben.markers';
const MAX_MARKERS = 12;
const MAX_MAP_SIZE = 600;
const CAMERA_HEIGHT = 80;
const REMOVE_RADIUS = 13;
const REDRAW_INTERVAL = 0.1;
const MARKER_COLOR = '#f2c23a';

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return {};
  }
  return {};
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    return;
  }
}

export function formatCoordinates(x, z) {
  const east = Math.round(x) || 0;
  const north = Math.round(-z) || 0;
  return t('hud.coords', { x: east, y: north });
}

export function createWorldMap({ scene, renderer, viewCapture, player, sources }) {
  const windowEl = document.getElementById('map-window');
  const titleEl = document.getElementById('map-title');
  const viewEl = document.getElementById('map-view');
  const canvas = document.getElementById('map-canvas');
  const cursorEl = document.getElementById('map-cursor');
  const clearButton = document.getElementById('map-clear');
  const closeButton = document.getElementById('map-close');
  const context = canvas.getContext('2d');
  const pixelRatio = renderer.getPixelRatio();

  const store = readStore();
  let zoneId = null;
  let extent = 100;
  let cssSize = 0;
  let base = null;
  let markers = [];
  let timer = REDRAW_INTERVAL;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function save() {
    if (zoneId === null) return;
    store[zoneId] = markers;
    writeStore(store);
  }

  function toCanvas(x, z) {
    return [(x / extent + 0.5) * cssSize, (z / extent + 0.5) * cssSize];
  }

  function toWorld(px, py) {
    return [(px / cssSize - 0.5) * extent, (py / cssSize - 0.5) * extent];
  }

  function drawMarker(x, y, label) {
    context.beginPath();
    context.arc(x, y, 9, 0, Math.PI * 2);
    context.fillStyle = MARKER_COLOR;
    context.strokeStyle = '#0f0e0a';
    context.lineWidth = 2;
    context.fill();
    context.stroke();
    context.fillStyle = '#0f0e0a';
    context.font = "bold 11px 'Allerta Stencil', sans-serif";
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(label), x, y + 1);
  }

  function drawPlayer() {
    const [x, y] = toCanvas(player.object.position.x, player.object.position.z);
    const angle = Math.atan2(Math.sin(player.object.rotation.y), -Math.cos(player.object.rotation.y));

    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, -9);
    context.lineTo(7, 8);
    context.lineTo(0, 4);
    context.lineTo(-7, 8);
    context.closePath();
    context.fillStyle = '#d19a3a';
    context.strokeStyle = '#0f0e0a';
    context.lineWidth = 2;
    context.fill();
    context.stroke();
    context.restore();
  }

  function draw() {
    if (!base) return;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, cssSize, cssSize);
    context.drawImage(base, 0, 0, cssSize, cssSize);

    context.fillStyle = '#e8b84a';
    context.strokeStyle = '#0f0e0a';
    context.lineWidth = 1.5;
    for (const npc of sources.npcs()) {
      const [x, y] = toCanvas(npc.x, npc.z);
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }

    markers.forEach((marker, index) => {
      const [x, y] = toCanvas(marker.x, marker.z);
      drawMarker(x, y, index + 1);
    });

    drawPlayer();
  }

  function captureZone(world, hiddenObjects) {
    zoneId = world.id;
    extent = Math.max(world.width, world.height);
    cssSize = Math.max(200, Math.min(MAX_MAP_SIZE, Math.floor(Math.min(window.innerWidth, window.innerHeight) - 160)));
    markers = Array.isArray(store[zoneId]) ? store[zoneId].slice(0, MAX_MARKERS) : [];

    base = document.createElement('canvas');
    base.width = Math.round(cssSize * pixelRatio);
    base.height = base.width;
    const baseContext = base.getContext('2d');
    baseContext.fillStyle = '#0f0e0a';
    baseContext.fillRect(0, 0, base.width, base.height);

    const half = extent / 2;
    const camera = new THREE.OrthographicCamera(-half, half, half, -half, 1, 200);
    camera.up.set(0, 0, -1);
    camera.position.set(0, CAMERA_HEIGHT, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const previous = hiddenObjects.map((object) => object.visible);
    hiddenObjects.forEach((object) => {
      object.visible = false;
    });
    viewCapture.capture(scene, camera, baseContext, cssSize);
    hiddenObjects.forEach((object, index) => {
      object.visible = previous[index];
    });

    canvas.width = base.width;
    canvas.height = base.height;
    canvas.style.width = `${cssSize}px`;
    canvas.style.height = `${cssSize}px`;
    titleEl.textContent = world.name;
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top];
  }

  canvas.addEventListener('mousemove', (event) => {
    const [x, z] = toWorld(...pointerPosition(event));
    cursorEl.textContent = formatCoordinates(x, z);
  });

  canvas.addEventListener('mouseleave', () => {
    cursorEl.textContent = '';
  });

  canvas.addEventListener('click', (event) => {
    if (!base) return;
    const [px, py] = pointerPosition(event);

    const hit = markers.findIndex((marker) => {
      const [x, y] = toCanvas(marker.x, marker.z);
      return Math.hypot(x - px, y - py) <= REMOVE_RADIUS;
    });

    if (hit >= 0) {
      markers.splice(hit, 1);
    } else if (markers.length < MAX_MARKERS) {
      const [x, z] = toWorld(px, py);
      markers.push({ x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 });
    }

    save();
    draw();
  });

  clearButton.addEventListener('click', () => {
    markers = [];
    save();
    draw();
  });

  function show() {
    if (!base) return;
    windowEl.classList.remove('hidden');
    draw();
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function toggle() {
    if (isOpen()) hide();
    else show();
  }

  function update(delta) {
    if (!isOpen()) return;
    timer += delta;
    if (timer < REDRAW_INTERVAL) return;
    timer = 0;
    draw();
  }

  closeButton.addEventListener('click', hide);
  viewEl.addEventListener('contextmenu', (event) => event.preventDefault());

  return { captureZone, show, hide, toggle, isOpen, update, getMarkers: () => markers };
}
