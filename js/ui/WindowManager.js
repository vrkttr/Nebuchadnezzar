const STORAGE_KEY = 'nebu.windows';
const Z_BASE = 20;
const Z_LIMIT = 39;

function readPositions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (error) {
    return {};
  }

  return {};
}

function writePositions(positions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (error) {
    return;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function createWindowManager() {
  const positions = readPositions();
  const windows = new Map();
  let topZ = Z_BASE;

  function isVisible(element) {
    return !element.classList.contains('hidden');
  }

  function placeAt(element, x, y) {
    const maxX = window.innerWidth - element.offsetWidth;
    const maxY = window.innerHeight - element.offsetHeight;

    element.style.left = `${clamp(x, 0, maxX)}px`;
    element.style.top = `${clamp(y, 0, maxY)}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    element.style.transform = 'none';
  }

  function bringToFront(element) {
    if (topZ >= Z_LIMIT) {
      const ordered = Array.from(windows.keys()).sort(
        (a, b) => Number(a.style.zIndex || Z_BASE) - Number(b.style.zIndex || Z_BASE)
      );
      topZ = Z_BASE;
      for (const other of ordered) other.style.zIndex = String(topZ++);
    }

    topZ += 1;
    element.style.zIndex = String(topZ);
  }

  function applyStored(element, id) {
    const stored = positions[id];
    if (!stored || !Number.isFinite(stored.x) || !Number.isFinite(stored.y)) return;

    placeAt(element, stored.x, stored.y);
  }

  function savePosition(element, id) {
    const rect = element.getBoundingClientRect();
    positions[id] = { x: Math.round(rect.left), y: Math.round(rect.top) };
    writePositions(positions);
  }

  function register(element, id) {
    const header = element.querySelector('.window-header');
    if (!header) return;

    windows.set(element, id);

    function onShow() {
      applyStored(element, id);
      if (element.style.left) {
        const rect = element.getBoundingClientRect();
        placeAt(element, rect.left, rect.top);
      }
      bringToFront(element);
    }

    new MutationObserver(() => {
      if (isVisible(element)) onShow();
    }).observe(element, { attributes: true, attributeFilter: ['class'] });

    element.addEventListener('pointerdown', () => bringToFront(element));

    header.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || event.target.closest('button')) return;

      event.preventDefault();

      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      placeAt(element, rect.left, rect.top);
      header.classList.add('is-dragging');
      header.setPointerCapture(event.pointerId);

      function onMove(moveEvent) {
        placeAt(element, moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
      }

      function onEnd() {
        header.classList.remove('is-dragging');
        header.removeEventListener('pointermove', onMove);
        header.removeEventListener('pointerup', onEnd);
        header.removeEventListener('pointercancel', onEnd);
        savePosition(element, id);
      }

      header.addEventListener('pointermove', onMove);
      header.addEventListener('pointerup', onEnd);
      header.addEventListener('pointercancel', onEnd);
    });

    applyStored(element, id);
  }

  window.addEventListener('resize', () => {
    for (const element of windows.keys()) {
      if (!element.style.left || !isVisible(element)) continue;

      const rect = element.getBoundingClientRect();
      placeAt(element, rect.left, rect.top);
    }
  });

  return { register };
}
