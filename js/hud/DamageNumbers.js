import * as THREE from 'three';

const LIFETIME = 1.1;
const RISE_SPEED = 0.9;
const BASE_HEIGHT = 2.1;
const JITTER_PX = 24;

export function createDamageNumbers(camera, container) {
  const numbers = [];
  const projected = new THREE.Vector3();

  function spawn(position, amount, kind) {
    const element = document.createElement('div');
    element.className = `damage-number damage-${kind}`;
    element.textContent = String(amount);
    container.appendChild(element);

    numbers.push({
      element,
      origin: position.clone(),
      age: 0,
      offsetX: (Math.random() - 0.5) * JITTER_PX * 2,
    });
  }

  function update(delta) {
    for (let index = numbers.length - 1; index >= 0; index -= 1) {
      const number = numbers[index];
      number.age += delta;

      if (number.age >= LIFETIME) {
        number.element.remove();
        numbers.splice(index, 1);
        continue;
      }

      projected.set(
        number.origin.x,
        number.origin.y + BASE_HEIGHT + number.age * RISE_SPEED,
        number.origin.z
      );
      projected.project(camera);

      if (projected.z > 1) {
        number.element.style.display = 'none';
        continue;
      }

      const progress = number.age / LIFETIME;
      number.element.style.display = 'block';
      number.element.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth + number.offsetX}px`;
      number.element.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
      number.element.style.opacity = String(progress < 0.6 ? 1 : 1 - (progress - 0.6) / 0.4);
    }
  }

  return { spawn, update };
}
