const DRAG_THRESHOLD = 6;

export function createAbilityDrag(handlers = {}) {
  let suppressClick = false;

  window.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.stopPropagation();
      event.preventDefault();
    },
    true
  );

  function attach(element, getPayload) {
    element.style.touchAction = 'none';

    element.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;

      const payload = getPayload();
      if (!payload) return;

      const startX = event.clientX;
      const startY = event.clientY;
      const pointerId = event.pointerId;
      let ghost = null;

      function finish(upEvent) {
        element.removeEventListener('pointermove', move);
        element.removeEventListener('pointerup', up);
        element.removeEventListener('pointercancel', cancel);
        if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);

        if (!ghost) return;

        ghost.remove();
        document.body.classList.remove('dragging-ability');
        suppressClick = true;
        setTimeout(() => {
          suppressClick = false;
        }, 0);

        if (!upEvent) return;

        const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('.action-slot');
        const slot = target ? Number(target.dataset.slot) : null;

        if (slot) {
          if (slot !== payload.fromSlot) handlers.onDrop?.(slot, payload.abilityId, payload.fromSlot);
        } else if (payload.fromSlot) {
          handlers.onRemove?.(payload.fromSlot);
        }
      }

      function move(moveEvent) {
        if (moveEvent.pointerId !== pointerId) return;

        if (!ghost) {
          if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < DRAG_THRESHOLD) return;

          ghost = document.createElement('div');
          ghost.className = 'ability-ghost';
          const icon = payload.icon?.cloneNode(true);
          if (icon) ghost.appendChild(icon);
          else ghost.textContent = payload.label ?? '';
          document.body.appendChild(ghost);
          document.body.classList.add('dragging-ability');
          element.setPointerCapture?.(pointerId);
          handlers.onStart?.();
        }

        ghost.style.left = `${moveEvent.clientX}px`;
        ghost.style.top = `${moveEvent.clientY}px`;
      }

      function up(upEvent) {
        finish(upEvent);
      }

      function cancel() {
        finish(null);
      }

      element.addEventListener('pointermove', move);
      element.addEventListener('pointerup', up);
      element.addEventListener('pointercancel', cancel);
    });
  }

  return { attach };
}
