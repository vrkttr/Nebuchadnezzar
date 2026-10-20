export function createMenuWindow(audio, creditsUrl) {
  const windowEl = document.getElementById('menu-window');
  const volumeInput = document.getElementById('menu-volume');
  const volumeValue = document.getElementById('menu-volume-value');
  const ambientInput = document.getElementById('menu-ambient');
  const ambientValue = document.getElementById('menu-ambient-value');
  const mutedInput = document.getElementById('menu-muted');
  const creditsLink = document.getElementById('menu-credits');
  const closeButton = document.getElementById('menu-close');
  const openButton = document.querySelector('#minimap-buttons button[title="Menü"]');

  function percent(value) {
    return Math.round(value * 100);
  }

  function syncControls() {
    const settings = audio.getSettings();

    volumeInput.value = percent(settings.volume);
    volumeValue.textContent = `${percent(settings.volume)} %`;
    ambientInput.value = percent(settings.ambient);
    ambientValue.textContent = `${percent(settings.ambient)} %`;
    mutedInput.checked = settings.muted;
  }

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function toggle() {
    if (isOpen()) {
      hide();
      return;
    }

    syncControls();
    windowEl.classList.remove('hidden');
  }

  volumeInput.addEventListener('input', () => {
    audio.setVolume(Number(volumeInput.value) / 100);
    syncControls();
  });

  ambientInput.addEventListener('input', () => {
    audio.setAmbientVolume(Number(ambientInput.value) / 100);
    syncControls();
  });

  mutedInput.addEventListener('change', () => {
    audio.setMuted(mutedInput.checked);
    syncControls();
  });

  creditsLink.href = creditsUrl;
  closeButton.addEventListener('click', hide);
  openButton?.addEventListener('click', toggle);

  return { toggle, hide, isOpen };
}
