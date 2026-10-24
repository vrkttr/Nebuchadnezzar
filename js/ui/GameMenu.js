import { SUPPORTED_LANGUAGES, getLanguage, setLanguage, t } from '../i18n/I18n.js';
import { el } from '../utils/Dom.js';
import { canQuitGame, quitGame } from '../utils/Host.js';
import { createSettingsForm, describeResult } from './SettingsForm.js';

export function createGameMenu({ request, onMainMenu, onLogout, onPreview }) {
  const menuWindow = document.getElementById('game-menu-window');
  const menuBody = document.getElementById('game-menu-body');
  const settingsWindow = document.getElementById('settings-window');
  const settingsBody = document.getElementById('settings-body');
  let settings = null;
  let previewing = false;

  function isOpen() {
    return !menuWindow.classList.contains('hidden') || !settingsWindow.classList.contains('hidden');
  }

  function revertPreview() {
    if (!previewing || !settings) return;
    previewing = false;
    onPreview?.(settings);
  }

  function hide() {
    revertPreview();
    menuWindow.classList.add('hidden');
    settingsWindow.classList.add('hidden');
  }

  function entry(labelKey, handler) {
    const button = el('button', { type: 'button', class: 'window-button game-menu-button', text: t(labelKey) });
    button.addEventListener('click', handler);
    return button;
  }

  function showSettings() {
    if (!settings) return;
    menuWindow.classList.add('hidden');
    const form = createSettingsForm({
      settings,
      language: getLanguage(),
      languages: SUPPORTED_LANGUAGES,
      onSave: async (values) => describeResult(await request({ type: 'settings-save', settings: values })),
      onChange: (values) => {
        previewing = true;
        onPreview?.(values);
      },
      onLanguage: (code) => {
        setLanguage(code);
        onMainMenu();
      },
      onPasswordChange: async (current, next, confirm) => describeResult(await request({ type: 'password-change', current, next, confirm })),
    });
    settingsBody.replaceChildren(form.element);
    settingsWindow.classList.remove('hidden');
  }

  function showMenu() {
    revertPreview();
    settingsWindow.classList.add('hidden');
    const entries = [
      entry('gamemenu.settings', showSettings),
      entry('gamemenu.mainMenu', onMainMenu),
      entry('gamemenu.logout', onLogout),
    ];
    if (canQuitGame()) entries.push(entry('gamemenu.quit', quitGame));
    entries.push(entry('gamemenu.resume', hide));
    menuBody.replaceChildren(...entries);
    menuWindow.classList.remove('hidden');
  }

  function toggle() {
    if (isOpen()) hide();
    else showMenu();
  }

  document.getElementById('game-menu-close').addEventListener('click', hide);
  document.getElementById('settings-close').addEventListener('click', hide);

  return {
    isOpen,
    hide,
    toggle,
    setSettings(next) {
      settings = next;
      previewing = false;
    },
  };
}
