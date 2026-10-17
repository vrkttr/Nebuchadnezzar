function toPercent(value, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

const MAX_CHAT_LINES = 50;

const FAILURE_TEXT = {
  'no-target': 'Kein Ziel ausgewählt.',
  'out-of-range': 'Ziel ist zu weit entfernt.',
  cooldown: 'Fähigkeit ist noch nicht bereit.',
  'no-resource': 'Nicht genug Energie.',
};

const ITEM_FAILURE_TEXT = {
  level: 'Dein Level ist zu niedrig.',
  'full-health': 'Du hast bereits volle Gesundheit.',
  cooldown: 'Noch nicht bereit.',
  'not-usable': 'Dieser Gegenstand kann nicht benutzt werden.',
};

const LOOT_FAILURE_TEXT = {
  gone: 'Diese Beute ist nicht mehr verfügbar.',
  'not-yours': 'Diese Beute gehört dir nicht.',
  'too-far': 'Du bist zu weit entfernt.',
};

export function createHud(state, handlers = {}) {
  const playerName = document.getElementById('player-name');
  const playerLevel = document.getElementById('player-level');
  const playerHealthFill = document.getElementById('player-health-fill');
  const playerHealthText = document.getElementById('player-health-text');
  const playerResourceFill = document.getElementById('player-resource-fill');
  const playerResourceText = document.getElementById('player-resource-text');
  const xpFill = document.getElementById('xp-fill');
  const goldAmount = document.getElementById('gold-amount');
  const zoneName = document.getElementById('zone-name');
  const chatMessages = document.getElementById('chat-messages');
  const slotElements = Array.from(document.querySelectorAll('#action-bar .action-slot'));
  const abilitySlots = [];

  const targetFrame = document.getElementById('target-frame');
  const targetName = document.getElementById('target-name');
  const targetLevel = document.getElementById('target-level');
  const targetHealthFill = document.getElementById('target-health-fill');

  function setAbilities(list) {
    abilitySlots.length = 0;

    for (const ability of list) {
      const element = slotElements[ability.slot - 1];
      if (!element) continue;

      const nameEl = document.createElement('span');
      nameEl.className = 'slot-name';

      if (ability.icon && handlers.ui) {
        nameEl.appendChild(handlers.ui.createIcon(ability.icon, 'slot-icon'));
      } else {
        nameEl.textContent = ability.shortName;
      }

      const cooldownEl = document.createElement('div');
      cooldownEl.className = 'slot-cooldown';

      const cooldownTextEl = document.createElement('span');
      cooldownTextEl.className = 'slot-cooldown-text';
      cooldownEl.appendChild(cooldownTextEl);

      element.appendChild(nameEl);
      element.appendChild(cooldownEl);
      element.addEventListener('click', () => handlers.onAbility?.(ability.slot));

      if (handlers.ui) {
        element.addEventListener('mouseenter', (event) => handlers.ui.tooltip.showAbility(ability, event));
        element.addEventListener('mousemove', (event) => handlers.ui.tooltip.move(event));
        element.addEventListener('mouseleave', () => handlers.ui.tooltip.hide());
      }

      abilitySlots.push({ ability, element, cooldownEl, cooldownTextEl });
    }
  }

  function addMessage(text) {
    const line = document.createElement('div');
    line.className = 'chat-line chat-line-system';
    line.textContent = text;
    chatMessages.appendChild(line);

    while (chatMessages.childElementCount > MAX_CHAT_LINES) {
      chatMessages.removeChild(chatMessages.firstChild);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addEvent(event) {
    if (event.kind === 'xp') {
      addMessage(`+${event.amount} Erfahrung (${event.enemyName})`);
    } else if (event.kind === 'gold') {
      addMessage(`+${event.amount} Gold`);
    } else if (event.kind === 'item') {
      const item = state.items[event.itemId];
      const suffix = event.quantity > 1 ? ` x${event.quantity}` : '';
      addMessage(`Erhalten: ${item?.name ?? event.itemId}${suffix}`);
    } else if (event.kind === 'equipped') {
      addMessage(`${state.items[event.itemId]?.name ?? event.itemId} angelegt`);
    } else if (event.kind === 'unequipped') {
      addMessage(`${state.items[event.itemId]?.name ?? event.itemId} abgelegt`);
    } else if (event.kind === 'item-used') {
      addMessage(`${state.items[event.itemId]?.name ?? event.itemId} benutzt: +${event.heal} Gesundheit`);
    } else if (event.kind === 'item-destroyed') {
      const suffix = event.quantity > 1 ? ` x${event.quantity}` : '';
      addMessage(`Zerstört: ${state.items[event.itemId]?.name ?? event.itemId}${suffix}`);
    } else if (event.kind === 'item-failed') {
      addMessage(ITEM_FAILURE_TEXT[event.reason] ?? 'Aktion nicht möglich.');
    } else if (event.kind === 'inventory-full') {
      addMessage('Dein Inventar ist voll.');
    } else if (event.kind === 'loot-failed') {
      addMessage(LOOT_FAILURE_TEXT[event.reason] ?? 'Beute konnte nicht aufgenommen werden.');
    } else if (event.kind === 'levelup') {
      addMessage(`Level-Aufstieg! Du bist jetzt Level ${event.level}.`);
    } else if (event.kind === 'ability-failed') {
      addMessage(FAILURE_TEXT[event.reason] ?? 'Fähigkeit konnte nicht eingesetzt werden.');
    }
  }

  function updateAbilitySlots() {
    for (const slot of abilitySlots) {
      const remaining = state.player.cooldowns?.[slot.ability.id] ?? 0;
      const ratio = slot.ability.cooldown > 0 ? Math.min(1, remaining / slot.ability.cooldown) : 0;

      slot.cooldownEl.style.height = `${ratio * 100}%`;
      slot.cooldownTextEl.textContent = remaining > 0 ? Math.ceil(remaining) : '';
      slot.element.classList.toggle('slot-unaffordable', state.player.resource < slot.ability.cost);
    }
  }

  function update() {
    playerName.textContent = state.player.name || '—';
    playerLevel.textContent = state.player.level;

    playerHealthFill.style.width = `${toPercent(state.player.health, state.player.healthMax)}%`;
    playerHealthText.textContent = `${Math.round(state.player.health)} / ${state.player.healthMax}`;

    playerResourceFill.style.width = `${toPercent(state.player.resource, state.player.resourceMax)}%`;
    playerResourceText.textContent = `${Math.round(state.player.resource)} / ${state.player.resourceMax}`;

    xpFill.style.width = `${toPercent(state.player.xp, state.player.xpToNextLevel)}%`;

    goldAmount.textContent = state.player.gold.toLocaleString('de-DE');

    zoneName.textContent = state.zoneName;

    updateAbilitySlots();

    if (state.target) {
      targetFrame.classList.remove('hidden');
      targetName.textContent = state.target.name;
      targetLevel.textContent = state.target.level;
      targetHealthFill.style.width = `${toPercent(state.target.health, state.target.healthMax)}%`;
    } else {
      targetFrame.classList.add('hidden');
    }
  }

  return { update, setAbilities, addEvent };
}
