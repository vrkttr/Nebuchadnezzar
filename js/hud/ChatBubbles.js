import * as THREE from 'three';

const BUBBLE_HEIGHT = 2.2;
const MIN_LIFETIME = 4;
const MAX_LIFETIME = 9;
const FADE_TIME = 0.5;
const MAX_DISTANCE = 40;

export function createChatBubbles(camera, container) {
  const bubbles = new Map();
  const projected = new THREE.Vector3();

  function show(object, text, plate = null) {
    if (!object) return;

    bubbles.get(object)?.element.remove();

    const element = document.createElement('div');
    element.className = 'chat-bubble';
    element.textContent = text;
    container.appendChild(element);

    bubbles.set(object, {
      element,
      plate,
      age: 0,
      lifetime: Math.min(MAX_LIFETIME, MIN_LIFETIME + text.length * 0.05),
    });
  }

  function update(delta) {
    for (const [object, bubble] of bubbles) {
      bubble.age += delta;

      if (bubble.age >= bubble.lifetime || !object.parent) {
        bubble.element.remove();
        bubbles.delete(object);
        continue;
      }

      projected.set(object.position.x, object.position.y + BUBBLE_HEIGHT, object.position.z);
      const distance = camera.position.distanceTo(projected);
      projected.project(camera);

      if (projected.z > 1 || distance > MAX_DISTANCE) {
        bubble.element.style.display = 'none';
        continue;
      }

      const remaining = bubble.lifetime - bubble.age;
      bubble.element.style.display = 'block';
      const plateHeight = bubble.plate?.offsetHeight ?? 0;
      bubble.element.style.transform = `translate(-50%, calc(-100% - ${plateHeight + 8}px))`;
      bubble.element.style.opacity = String(Math.min(1, remaining / FADE_TIME));
      bubble.element.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
      bubble.element.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
  }

  function clear() {
    for (const bubble of bubbles.values()) bubble.element.remove();
    bubbles.clear();
  }

  return { show, update, clear };
}
