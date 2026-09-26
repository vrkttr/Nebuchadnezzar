function toPercent(value, max) {
  if (!max) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function createHud(state) {
  const playerName = document.getElementById('player-name');
  const playerLevel = document.getElementById('player-level');
  const playerHealthFill = document.getElementById('player-health-fill');
  const playerHealthText = document.getElementById('player-health-text');
  const playerResourceFill = document.getElementById('player-resource-fill');
  const playerResourceText = document.getElementById('player-resource-text');
  const xpFill = document.getElementById('xp-fill');
  const zoneName = document.getElementById('zone-name');

  const targetFrame = document.getElementById('target-frame');
  const targetName = document.getElementById('target-name');
  const targetLevel = document.getElementById('target-level');
  const targetHealthFill = document.getElementById('target-health-fill');

  function update() {
    playerName.textContent = state.player.name || '—';
    playerLevel.textContent = state.player.level;

    playerHealthFill.style.width = `${toPercent(state.player.health, state.player.healthMax)}%`;
    playerHealthText.textContent = `${Math.round(state.player.health)} / ${state.player.healthMax}`;

    playerResourceFill.style.width = `${toPercent(state.player.resource, state.player.resourceMax)}%`;
    playerResourceText.textContent = `${Math.round(state.player.resource)} / ${state.player.resourceMax}`;

    xpFill.style.width = `${toPercent(state.player.xp, state.player.xpToNextLevel)}%`;

    zoneName.textContent = state.zoneName;

    if (state.target) {
      targetFrame.classList.remove('hidden');
      targetName.textContent = state.target.name;
      targetLevel.textContent = state.target.level;
      targetHealthFill.style.width = `${toPercent(state.target.health, state.target.healthMax)}%`;
    } else {
      targetFrame.classList.add('hidden');
    }
  }

  return { update };
}
