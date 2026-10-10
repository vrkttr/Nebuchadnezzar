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
      nameEl.textContent = ability.shortName;

      const cooldownEl = document.createElement('div');
      cooldownEl.className = 'slot-cooldown';

      const cooldownTextEl = document.createElement('span');
      cooldownTextEl.className = 'slot-cooldown-text';
      cooldownEl.appendChild(cooldownTextEl);

      element.title = `${ability.name} – ${ability.cost} Energie, ${ability.cooldown} s Abklingzeit`;
      element.appendChild(nameEl);
      element.appendChild(cooldownEl);
      element.addEventListener('click', () => handlers.onAbility?.(ability.slot));

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
