import { t } from '../i18n/I18n.js';
import { el } from '../utils/Dom.js';

const TABS = ['general', 'sound', 'graphics'];
const GROUPS = [
  ['lighting', ['shadows', 'lights', 'flicker', 'daynight']],
  ['sky', ['clouds', 'haze', 'puddles']],
  ['nature', ['wind', 'birds', 'insects', 'dust', 'debris']],
  ['fire', ['fire', 'smoke']],
];
const ALL_KEYS = GROUPS.flatMap(([, keys]) => keys);
const PRESETS = {
  high: ALL_KEYS,
  medium: ['shadows', 'lights', 'daynight', 'clouds', 'haze', 'wind', 'fire', 'smoke'],
  low: [],
};
const PRESET_ORDER = ['high', 'medium', 'low', 'custom'];
const TOUCH_MODES = ['auto', 'on', 'off'];
const VIEW_DISTANCES = [0, 1, 2, 3];

export function describeResult(result) {
  return { ok: Boolean(result.ok), text: result.ok ? '' : t(result.key ?? 'menu.error.server', result.params ?? undefined) };
}

export function createSettingsForm({ settings, language, languages, onSave, onLanguage, onMusic, onPasswordChange }) {
  let activeTab = 'general';
  let saveButton = null;

  const sliders = {};
  const toggles = {};
  const message = el('p', { class: 'nu-message', hidden: true });
  const passwordMessage = el('p', { class: 'nu-message', hidden: true });

  function slider(name, labelKey, value, hintKey) {
    const output = el('output', { text: `${value} %` });
    const input = el('input', { type: 'range', min: 0, max: 100, step: 1, value, class: 'menu-range' });
    input.addEventListener('input', () => {
      output.textContent = `${input.value} %`;
      if (name === 'music') onMusic?.(Number(input.value) / 100);
    });
    sliders[name] = input;
    return [
      el('label', { class: 'menu-field' }, el('span', { class: 'nu-label menu-field-value' }, t(labelKey), ' ', output), input),
      hintKey ? el('p', { class: 'menu-hint', text: t(hintKey) }) : null,
    ];
  }

  function switchRow(labelKey, hintKey, input) {
    return el(
      'label',
      { class: 'menu-switch' },
      el('span', { class: 'menu-switch-text' }, el('span', { class: 'nu-label', text: t(labelKey) }), hintKey ? el('span', { class: 'menu-hint', text: t(hintKey) }) : null),
      input
    );
  }

  const autoFullscreen = el('input', { type: 'checkbox', class: 'menu-toggle', checked: settings.autoFullscreen });
  const touchControls = el(
    'select',
    { class: 'nu-input' },
    TOUCH_MODES.map((mode) => el('option', { value: mode, selected: settings.touchControls === mode, text: t(`settings.touchControls.${mode}`) }))
  );
  const muted = el('input', { type: 'checkbox', class: 'menu-toggle', checked: settings.muted });
  const viewDistance = el(
    'select',
    { class: 'nu-input' },
    VIEW_DISTANCES.map((level) => el('option', { value: level, selected: settings.graphics.viewDistance === level, text: t(`settings.graphics.viewDistance.${level}`) }))
  );
  const preset = el(
    'select',
    { class: 'nu-input' },
    PRESET_ORDER.map((name) => el('option', { value: name, text: t(`settings.graphics.preset.${name}`) }))
  );

  for (const key of ALL_KEYS) {
    const input = el('input', { type: 'checkbox', class: 'menu-toggle', checked: settings.graphics[key] !== false });
    input.addEventListener('change', detectPreset);
    toggles[key] = input;
  }

  function detectPreset() {
    const active = ALL_KEYS.filter((key) => toggles[key].checked).sort().join(',');
    preset.value = PRESET_ORDER.find((name) => PRESETS[name] && [...PRESETS[name]].sort().join(',') === active) ?? 'custom';
  }

  preset.addEventListener('change', () => {
    const list = PRESETS[preset.value];
    if (!list) return;
    for (const key of ALL_KEYS) toggles[key].checked = list.includes(key);
  });

  const languageSelect = el(
    'select',
    { class: 'nu-input' },
    languages.map((entry) => el('option', { value: entry.code, selected: entry.code === language, text: entry.name }))
  );
  languageSelect.addEventListener('change', () => onLanguage?.(languageSelect.value));

  const passwordFields = {
    current: el('input', { class: 'nu-input', type: 'password', autocomplete: 'current-password', maxlength: 256 }),
    next: el('input', { class: 'nu-input', type: 'password', autocomplete: 'new-password', maxlength: 256 }),
    confirm: el('input', { class: 'nu-input', type: 'password', autocomplete: 'new-password', maxlength: 256 }),
  };
  const passwordButton = el('button', { class: 'nu-button', type: 'button', text: t('settings.password.submit') });
  passwordButton.addEventListener('click', async () => {
    passwordButton.disabled = true;
    const outcome = await onPasswordChange(passwordFields.current.value, passwordFields.next.value, passwordFields.confirm.value);
    passwordButton.disabled = false;
    showStatus(passwordMessage, outcome.ok ? t('settings.password.changed') : outcome.text, outcome.ok);
    if (outcome.ok) for (const field of Object.values(passwordFields)) field.value = '';
  });

  function showStatus(node, text, ok) {
    node.textContent = text;
    node.hidden = false;
    node.classList.toggle('is-ok', ok);
  }

  const general = el(
    'div',
    { class: 'menu-tabpanel', id: 'settings-panel-general' },
    el(
      'section',
      { class: 'menu-group' },
      el('h2', { class: 'menu-group-title', text: t('settings.language') }),
      el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t('settings.languageLabel') }), languageSelect)
    ),
    el(
      'section',
      { class: 'menu-group' },
      el('h2', { class: 'menu-group-title', text: t('settings.display') }),
      switchRow('settings.autoFullscreen', 'settings.autoFullscreenHint', autoFullscreen),
      el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t('settings.touchControls') }), touchControls),
      el('p', { class: 'menu-hint', text: t('settings.touchControlsHint') })
    ),
    onPasswordChange
      ? el(
          'section',
          { class: 'menu-group' },
          el('h2', { class: 'menu-group-title', text: t('settings.password') }),
          el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t('settings.password.current') }), passwordFields.current),
          el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t('settings.password.new') }), passwordFields.next),
          el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t('register.confirm') }), passwordFields.confirm),
          passwordMessage,
          el('div', { class: 'menu-actions' }, passwordButton)
        )
      : null
  );

  const sound = el(
    'div',
    { class: 'menu-tabpanel', id: 'settings-panel-sound', hidden: true },
    el(
      'section',
      { class: 'menu-group' },
      el('h2', { class: 'menu-group-title', text: t('settings.sound') }),
      slider('volume', 'settings.volume', settings.volume),
      slider('ambient', 'settings.ambient', settings.ambient),
      slider('music', 'settings.music', settings.music, 'settings.musicHint'),
      switchRow('settings.mute', null, muted)
    )
  );

  const graphics = el(
    'div',
    { class: 'menu-tabpanel', id: 'settings-panel-graphics', hidden: true },
    el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t('settings.graphics.preset') }), preset),
    el('p', { class: 'menu-hint', text: t('settings.graphics.hint') }),
    el(
      'label',
      { class: 'menu-field' },
      el('span', { class: 'nu-label', text: t('settings.graphics.viewDistance') }),
      viewDistance,
      el('span', { class: 'menu-hint', text: t('settings.graphics.viewDistance.hint') })
    ),
    GROUPS.map(([group, keys]) =>
      el(
        'section',
        { class: 'menu-group' },
        el('h2', { class: 'menu-group-title', text: t(`settings.graphics.group.${group}`) }),
        keys.map((key) => switchRow(`settings.graphics.${key}`, `settings.graphics.${key}.hint`, toggles[key]))
      )
    )
  );
  detectPreset();

  const panels = { general, sound, graphics };
  const tabButtons = TABS.map((name) =>
    el('button', { type: 'button', class: 'menu-tab', role: 'tab', 'aria-selected': name === activeTab ? 'true' : 'false', text: t(`settings.tab.${name}`) })
  );
  tabButtons.forEach((button, index) => button.addEventListener('click', () => showTab(TABS[index])));

  function showTab(name) {
    activeTab = name;
    tabButtons.forEach((button, index) => button.setAttribute('aria-selected', TABS[index] === name ? 'true' : 'false'));
    for (const [panelName, panel] of Object.entries(panels)) panel.hidden = panelName !== name;
  }

  function collect() {
    const graphicsValues = {};
    for (const key of ALL_KEYS) graphicsValues[key] = toggles[key].checked;
    graphicsValues.viewDistance = Number(viewDistance.value);

    return {
      volume: Number(sliders.volume.value),
      ambient: Number(sliders.ambient.value),
      music: Number(sliders.music.value),
      muted: muted.checked,
      autoFullscreen: autoFullscreen.checked,
      touchControls: touchControls.value,
      graphics: graphicsValues,
    };
  }

  saveButton = el('button', { class: 'nu-button', type: 'button', text: t('settings.save') });
  saveButton.addEventListener('click', async () => {
    saveButton.disabled = true;
    const outcome = await onSave(collect());
    saveButton.disabled = false;
    showStatus(message, outcome.ok ? t('settings.saved') : outcome.text, outcome.ok);
  });

  const element = el(
    'div',
    { class: 'menu-form menu-settings' },
    el('div', { class: 'menu-tabs', role: 'tablist' }, tabButtons),
    general,
    sound,
    graphics,
    message,
    el('div', { class: 'menu-actions menu-actions-sticky' }, saveButton)
  );

  return { element };
}
