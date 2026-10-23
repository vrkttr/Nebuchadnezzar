const STICK_RADIUS_RATIO = 56 / 132;
const DESIGN_WIDTH = 1100;
const TABLET_MIN_SHORT_SIDE = 600;
const DEFAULT_VIEWPORT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
const DEAD_ZONE = 0.12;
const RUN_THRESHOLD = 0.85;
const LOOK_SLOP = 6;
const PINCH_SPEED = 0.03;

export const touchInput = {
  active: false,
  moveX: 0,
  moveY: 0,
  run: false,
  jump: false,
  crouch: false,
};

function detectTouchDevice() {
  return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches;
}

function updateViewport() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;

  let content = DEFAULT_VIEWPORT;
  let scale = 1;
  let landscapeWidth = 0;

  if (touchInput.active) {
    const landscape = window.innerWidth >= window.innerHeight;
    const long = Math.max(window.screen.width, window.screen.height);
    const short = Math.min(window.screen.width, window.screen.height);
    const deviceWidth = landscape ? long : short;
    const deviceHeight = landscape ? short : long;

    if (deviceHeight >= TABLET_MIN_SHORT_SIDE && deviceWidth < DESIGN_WIDTH) {
      content = `width=${DESIGN_WIDTH}, user-scalable=no, viewport-fit=cover`;
      scale = deviceWidth / DESIGN_WIDTH;
      landscapeWidth = deviceWidth;
    }
  }

  if (meta.content !== content) meta.content = content;
  const effective = scale < 1 ? Math.max(1, window.innerWidth / (landscapeWidth || window.innerWidth)) : 1;
  document.documentElement.style.setProperty('--touch-scale', String(effective));
}

function reapplyViewport() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta && touchInput.active) {
    const wanted = meta.content;
    meta.content = DEFAULT_VIEWPORT;
    requestAnimationFrame(() => {
      meta.content = wanted;
      updateViewport();
    });
  }
  updateViewport();
  for (const delay of [150, 500, 1200]) setTimeout(updateViewport, delay);
}

function createButton(className, label, title) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `touch-button ${className}`;
  button.textContent = label;
  button.title = title;
  button.setAttribute('aria-label', title);
  return button;
}

export function createTouchControls({ canvas, labels, onRotate, onZoom, onCycleTarget, onToggle }) {
  const root = document.createElement('div');
  root.id = 'touch-controls';

  const stick = document.createElement('div');
  stick.className = 'touch-stick';
  const knob = document.createElement('div');
  knob.className = 'touch-stick-knob';
  stick.appendChild(knob);

  const jumpButton = createButton('touch-jump', labels.jump, labels.jumpTitle);
  const crouchButton = createButton('touch-crouch', labels.crouch, labels.crouchTitle);
  const targetButton = createButton('touch-target', labels.target, labels.targetTitle);

  root.append(stick, jumpButton, crouchButton, targetButton);
  document.body.appendChild(root);

  let stickPointer = null;
  let stickCenter = { x: 0, y: 0 };
  let stickRadius = 56;
  const lookPointers = new Map();
  let pinchDistance = 0;

  function resetStick() {
    stickPointer = null;
    touchInput.moveX = 0;
    touchInput.moveY = 0;
    touchInput.run = false;
    knob.style.transform = 'translate(-50%, -50%)';
  }

  function updateStick(event) {
    let dx = event.clientX - stickCenter.x;
    let dy = event.clientY - stickCenter.y;
    const distance = Math.hypot(dx, dy);
    if (distance > stickRadius) {
      dx = (dx / distance) * stickRadius;
      dy = (dy / distance) * stickRadius;
    }

    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const strength = Math.min(1, distance / stickRadius);
    if (strength < DEAD_ZONE) {
      touchInput.moveX = 0;
      touchInput.moveY = 0;
      touchInput.run = false;
      return;
    }

    const length = Math.hypot(dx, dy) || 1;
    touchInput.moveX = dx / length;
    touchInput.moveY = -dy / length;
    touchInput.run = strength >= RUN_THRESHOLD;
  }

  stick.addEventListener('pointerdown', (event) => {
    if (stickPointer !== null) return;
    event.preventDefault();
    stickPointer = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    const rect = stick.getBoundingClientRect();
    stickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    stickRadius = rect.width * STICK_RADIUS_RATIO;
    updateStick(event);
  });

  stick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== stickPointer) return;
    updateStick(event);
  });

  const endStick = (event) => {
    if (event.pointerId !== stickPointer) return;
    resetStick();
  };
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);
  stick.addEventListener('lostpointercapture', endStick);

  function holdButton(button, key) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      touchInput[key] = true;
      button.classList.add('is-down');
    });
    const release = () => {
      touchInput[key] = false;
      button.classList.remove('is-down');
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  }

  holdButton(jumpButton, 'jump');

  crouchButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    touchInput.crouch = !touchInput.crouch;
    crouchButton.classList.toggle('is-down', touchInput.crouch);
  });

  targetButton.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    onCycleTarget();
  });

  function pointerDistance() {
    const [first, second] = [...lookPointers.values()];
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', (event) => {
    if (!touchInput.active || event.pointerType !== 'touch') return;
    lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false });
    if (lookPointers.size === 2) pinchDistance = pointerDistance();
  });

  canvas.addEventListener('pointermove', (event) => {
    const pointer = lookPointers.get(event.pointerId);
    if (!pointer) return;

    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;
    pointer.x = event.clientX;
    pointer.y = event.clientY;

    if (!pointer.moved && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) < LOOK_SLOP) return;
    pointer.moved = true;

    if (lookPointers.size === 1) {
      onRotate(dx, dy);
    } else if (lookPointers.size === 2) {
      const next = pointerDistance();
      onZoom((pinchDistance - next) * PINCH_SPEED);
      pinchDistance = next;
    }
  });

  const endLook = (event) => {
    if (!lookPointers.delete(event.pointerId)) return;
    if (lookPointers.size === 2) pinchDistance = pointerDistance();
  };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);

  function apply(enabled) {
    touchInput.active = enabled;
    document.documentElement.classList.toggle('touch-ui', enabled);
    updateViewport();
    if (!enabled) {
      resetStick();
      touchInput.jump = false;
      touchInput.crouch = false;
      crouchButton.classList.remove('is-down');
      lookPointers.clear();
    }
    onToggle?.(enabled);
  }

  function setMode(mode) {
    if (mode === 'on') apply(true);
    else if (mode === 'off') apply(false);
    else apply(detectTouchDevice());
  }

  window.addEventListener('resize', updateViewport);
  document.addEventListener('fullscreenchange', reapplyViewport);
  document.addEventListener('webkitfullscreenchange', reapplyViewport);
  window.addEventListener('orientationchange', updateViewport);

  window.addEventListener('blur', () => {
    resetStick();
    touchInput.jump = false;
  });

  setMode('auto');

  return { setMode, isActive: () => touchInput.active };
}
