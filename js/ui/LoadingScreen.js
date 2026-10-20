import * as THREE from 'three';

const MIN_VISIBLE_MS = 800;
const FADE_MS = 450;
const TIP_INTERVAL_MS = 7000;
const TIP_SWAP_MS = 300;
const LOCALE_URL = 'assets/locales/de.json';

export function createLoadingScreen() {
  const root = document.getElementById('loading-screen');
  const zoneLabel = document.getElementById('loading-zone');
  const fill = document.getElementById('loading-fill');
  const status = document.getElementById('loading-status');
  const tipLabel = document.getElementById('loading-tip-label');
  const tipText = document.getElementById('loading-tip-text');

  const manager = THREE.DefaultLoadingManager;
  const idleWaiters = [];
  let busy = false;
  let progress = 0;
  let shownAt = performance.now();
  let assetRange = [0.4, 0.85];
  let tips = [];
  let tipIndex = -1;
  let tipTimer = null;

  const localeReady = fetch(LOCALE_URL)
    .then((response) => (response.ok ? response.json() : null))
    .then((locale) => {
      tips = locale?.loading?.tips ?? [];
      if (locale?.loading?.tipLabel) tipLabel.textContent = locale.loading.tipLabel;
    })
    .catch(() => {});

  function nextTip() {
    if (tips.length === 0) {
      tipLabel.hidden = true;
      tipText.textContent = '';
      return;
    }

    let index = Math.floor(Math.random() * tips.length);
    if (tips.length > 1 && index === tipIndex) index = (index + 1) % tips.length;
    tipIndex = index;
    tipLabel.hidden = false;
    tipText.textContent = tips[index];
  }

  function rotateTip() {
    tipText.classList.add('swapping');
    setTimeout(() => {
      nextTip();
      tipText.classList.remove('swapping');
    }, TIP_SWAP_MS);
  }

  function stopTips() {
    clearInterval(tipTimer);
    tipTimer = null;
  }

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

  function show(zoneName, indoor = false) {
    progress = 0;
    shownAt = performance.now();
    zoneLabel.textContent = zoneName ?? '';
    fill.style.width = '0%';
    root.classList.toggle('indoor', indoor);
    root.classList.toggle('outdoor', !indoor);
    root.classList.remove('hidden', 'fading');

    stopTips();
    tipText.classList.remove('swapping');
    nextTip();
    localeReady.then(() => {
      if (root.classList.contains('hidden')) return;
      if (tips.length > 0 && !tipText.textContent) nextTip();
    });
    tipTimer = setInterval(rotateTip, TIP_INTERVAL_MS);
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
    stopTips();
  }

  return { show, hide, setProgress, assetsIdle };
}
