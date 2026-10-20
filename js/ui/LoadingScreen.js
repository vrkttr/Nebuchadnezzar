import * as THREE from 'three';

const MIN_VISIBLE_MS = 800;
const FADE_MS = 450;

export function createLoadingScreen() {
  const root = document.getElementById('loading-screen');
  const zoneLabel = document.getElementById('loading-zone');
  const fill = document.getElementById('loading-fill');
  const status = document.getElementById('loading-status');

  const manager = THREE.DefaultLoadingManager;
  const idleWaiters = [];
  let busy = false;
  let progress = 0;
  let shownAt = performance.now();
  let assetRange = [0.4, 0.85];

  manager.onStart = () => {
    busy = true;
  };

  manager.onProgress = (url, loaded, total) => {
    const [from, to] = assetRange;
    setProgress(from + (to - from) * (total > 0 ? loaded / total : 1));
  };

  manager.onLoad = () => {
    busy = false;
    idleWaiters.splice(0).forEach((resolve) => resolve());
  };

  function setProgress(value, text) {
    progress = Math.max(progress, Math.min(1, value));
    fill.style.width = `${Math.round(progress * 100)}%`;
    if (text) status.textContent = text;
  }

  function show(zoneName) {
    progress = 0;
    shownAt = performance.now();
    zoneLabel.textContent = zoneName ?? '';
    fill.style.width = '0%';
    root.classList.remove('hidden', 'fading');
  }

  function assetsIdle() {
    if (!busy) return Promise.resolve();
    return new Promise((resolve) => idleWaiters.push(resolve));
  }

  async function hide() {
    const remaining = MIN_VISIBLE_MS - (performance.now() - shownAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));

    root.classList.add('fading');
    await new Promise((resolve) => setTimeout(resolve, FADE_MS));
    root.classList.add('hidden');
  }

  return { show, hide, setProgress, assetsIdle };
}
