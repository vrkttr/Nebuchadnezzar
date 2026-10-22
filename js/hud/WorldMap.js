import * as THREE from 'three';
import { t } from '../i18n/I18n.js';

const STORAGE_KEY = 'sektorsieben.markers';
const MAX_MARKERS = 12;
const MAX_MAP_SIZE = 600;
const TILES = 3;
const MAX_ZOOM = 4;
const CHUNKED_MAX_ZOOM = 12;
const CHUNKED_BASE_SIZE = 4096;
const ZOOM_STEP = 1.25;
const DRAG_THRESHOLD = 4;
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
  const zoomInButton = document.getElementById('map-zoom-in');
  const zoomOutButton = document.getElementById('map-zoom-out');
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
  let zoom = 1;
  let maxZoom = MAX_ZOOM;
  let centerX = 0;
  let centerZ = 0;
  let drag = null;

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function save() {
    if (zoneId === null) return;
    store[zoneId] = markers;
    writeStore(store);
  }

  function halfView() {
    return extent / (2 * zoom);
  }

  function clampView() {
    const limit = extent / 2 - halfView();
    centerX = Math.max(-limit, Math.min(limit, centerX));
    centerZ = Math.max(-limit, Math.min(limit, centerZ));
  }

  function toCanvas(x, z) {
    const half = halfView();
    return [((x - (centerX - half)) / (2 * half)) * cssSize, ((z - (centerZ - half)) / (2 * half)) * cssSize];
  }

  function toWorld(px, py) {
    const half = halfView();
    return [centerX - half + (px / cssSize) * 2 * half, centerZ - half + (py / cssSize) * 2 * half];
  }

  function setZoom(next, anchorX, anchorY) {
    const clamped = Math.max(1, Math.min(maxZoom, next));
    if (clamped === zoom) return;

    const [worldX, worldZ] = toWorld(anchorX, anchorY);
    zoom = clamped;
    const half = halfView();
    centerX = worldX - (anchorX / cssSize - 0.5) * 2 * half;
    centerZ = worldZ - (anchorY / cssSize - 0.5) * 2 * half;
    clampView();
    draw();
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
    const half = halfView();
    const scale = base.width / extent;
    context.drawImage(
      base,
      (centerX - half + extent / 2) * scale,
      (centerZ - half + extent / 2) * scale,
      2 * half * scale,
      2 * half * scale,
      0,
      0,
      cssSize,
      cssSize
    );

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

  function drawOverview(world) {
    const overview = document.createElement('canvas');
    overview.width = CHUNKED_BASE_SIZE;
    overview.height = CHUNKED_BASE_SIZE;
    const overviewContext = overview.getContext('2d');
    const scale = CHUNKED_BASE_SIZE / extent;
    overviewContext.fillStyle = '#0f0e0a';
    overviewContext.fillRect(0, 0, CHUNKED_BASE_SIZE, CHUNKED_BASE_SIZE);
    overviewContext.fillStyle = '#4a5030';
    overviewContext.fillRect((extent / 2 - world.width / 2) * scale, (extent / 2 - world.height / 2) * scale, world.width * scale, world.height * scale);

    for (const shape of world.overview ?? []) {
      overviewContext.save();
      overviewContext.translate((shape.x + extent / 2) * scale, (shape.z + extent / 2) * scale);
      overviewContext.rotate(-shape.rotation);
      overviewContext.fillStyle = shape.color;
      overviewContext.fillRect((-shape.width / 2) * scale, (-shape.height / 2) * scale, shape.width * scale, shape.height * scale);
      overviewContext.restore();
    }

    overviewContext.textAlign = 'center';
    overviewContext.textBaseline = 'middle';
    overviewContext.lineJoin = 'round';
    overviewContext.lineWidth = 5;
    overviewContext.strokeStyle = '#0f0e0a';
    overviewContext.fillStyle = '#f1ead0';
    overviewContext.font = "bold 26px 'Allerta Stencil', sans-serif";
    for (const shape of world.overview ?? []) {
      if (!shape.label) continue;
      const text = t(`map.${world.id}.${shape.label}`);
      const x = (shape.x + extent / 2) * scale;
      const y = (shape.z + extent / 2) * scale;
      overviewContext.strokeText(text, x, y);
      overviewContext.fillText(text, x, y);
    }

    return overview;
  }

  function captureZone(world, hiddenObjects) {
    zoneId = world.id;
    extent = Math.max(world.width, world.height);
    cssSize = Math.max(200, Math.min(MAX_MAP_SIZE, Math.floor(Math.min(window.innerWidth, window.innerHeight) - (window.innerHeight < 560 ? 120 : 160))));
    windowEl.style.width = `${cssSize + 24}px`;
    markers = Array.isArray(store[zoneId]) ? store[zoneId].slice(0, MAX_MARKERS) : [];

    zoom = 1;
    centerX = 0;
    centerZ = 0;

    maxZoom = world.chunked ? CHUNKED_MAX_ZOOM : MAX_ZOOM;

    if (world.chunked) {
      base = drawOverview(world);
      canvas.width = Math.round(cssSize * pixelRatio);
      canvas.height = Math.round(cssSize * pixelRatio);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      titleEl.textContent = world.name;
      return;
    }

    const tilePixels = Math.round(cssSize * pixelRatio);
    base = document.createElement('canvas');
    base.width = tilePixels * TILES;
    base.height = base.width;
    const baseContext = base.getContext('2d');
    baseContext.fillStyle = '#0f0e0a';
    baseContext.fillRect(0, 0, base.width, base.height);

    const tileContext = document.createElement('canvas').getContext('2d');
    tileContext.canvas.width = tilePixels;
    tileContext.canvas.height = tilePixels;

    const tileExtent = extent / TILES;
    const half = tileExtent / 2;
    const camera = new THREE.OrthographicCamera(-half, half, half, -half, 1, 200);
    camera.up.set(0, 0, -1);

    const { hemisphere } = scene.userData.environment;
    const savedHemisphere = hemisphere.intensity;
    hemisphere.intensity = Math.max(hemisphere.intensity, 2.1);

    const previous = hiddenObjects.map((object) => object.visible);
    hiddenObjects.forEach((object) => {
      object.visible = false;
    });

    for (let row = 0; row < TILES; row += 1) {
      for (let column = 0; column < TILES; column += 1) {
        const tileX = -extent / 2 + (column + 0.5) * tileExtent;
        const tileZ = -extent / 2 + (row + 0.5) * tileExtent;
        camera.position.set(tileX, CAMERA_HEIGHT, tileZ);
        camera.lookAt(tileX, 0, tileZ);
        camera.updateMatrixWorld();
        viewCapture.capture(scene, camera, tileContext, cssSize);
        baseContext.drawImage(tileContext.canvas, column * tilePixels, row * tilePixels);
      }
    }

    hiddenObjects.forEach((object, index) => {
      object.visible = previous[index];
    });
    hemisphere.intensity = savedHemisphere;

    canvas.width = tilePixels;
    canvas.height = tilePixels;
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

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const [x, y] = pointerPosition(event);
      setZoom(event.deltaY < 0 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP, x, y);
    },
    { passive: false }
  );

  canvas.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    const [x, y] = pointerPosition(event);
    drag = { startX: x, startY: y, lastX: x, lastY: y, moved: false };
  });

  window.addEventListener('mousemove', (event) => {
    if (!drag) return;
    const [x, y] = pointerPosition(event);
    if (!drag.moved && Math.hypot(x - drag.startX, y - drag.startY) < DRAG_THRESHOLD) return;

    drag.moved = true;
    const half = halfView();
    centerX -= ((x - drag.lastX) / cssSize) * 2 * half;
    centerZ -= ((y - drag.lastY) / cssSize) * 2 * half;
    drag.lastX = x;
    drag.lastY = y;
    clampView();
    draw();
  });

  window.addEventListener('mouseup', () => {
    if (!drag) return;
    const moved = drag.moved;
    const [startX, startY] = [drag.startX, drag.startY];
    drag = null;
    if (!moved) placeOrRemove(startX, startY);
  });

  function placeOrRemove(px, py) {
    if (!base) return;

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
  }

  zoomInButton.addEventListener('click', () => setZoom(zoom * ZOOM_STEP, cssSize / 2, cssSize / 2));
  zoomOutButton.addEventListener('click', () => setZoom(zoom / ZOOM_STEP, cssSize / 2, cssSize / 2));

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
