import { SUPPORTED_LANGUAGES, getLanguage, setLanguage, t } from '../i18n/I18n.js';
import { GAME_VERSION } from '../config.js';
import { enterFullscreen } from '../input/Keyboard.js';
import { createSettingsForm, describeResult } from '../ui/SettingsForm.js';
import { clear, el } from '../utils/Dom.js';
import { classFields, createCharacterForm } from './CharacterForm.js';
import { createMenuMusic } from './MenuMusic.js';
import { createMenuScene } from './MenuScene.js';
import { clearSession, readSession, writeSession } from './Session.js';

const MUSIC_VOLUME_KEY = 'menuMusicVolume';
const REQUEST_TIMEOUT_MS = 20000;
const LOADING_FADE_MS = 450;
const PUBLIC_SCREENS = ['login', 'register', 'credits'];

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function storedMusicVolume() {
  const value = Number.parseFloat(readStored(MUSIC_VOLUME_KEY));
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.4;
}

function link(href, text) {
  return el('a', { href, target: '_blank', rel: 'noopener', text });
}

export function createMenu({ connection, onEnterWorld }) {
  const loadingScreen = document.getElementById('loading-screen');
  const requests = new Map();
  let account = null;
  let screen = 'login';
  let opened = false;
  let entering = false;
  let disposed = false;
  let notice = null;

  const music = createMenuMusic(storedMusicVolume());
  const canvasHost = el('div', { class: 'menu-canvas-host' });
  const nav = el('ul', { class: 'nu-menu' });
  const title = el('h1', { class: 'nu-title' });
  const content = el('div', { class: 'menu-scroll' });
  const panel = el('section', { class: 'menu-panel nu-paper nu-taped' }, title, el('hr', { class: 'nu-divider' }), content);
  const musicButton = el('button', { type: 'button', class: 'menu-music' });
  const languageSelect = el(
    'select',
    { class: 'menu-language', 'aria-label': t('settings.languageLabel') },
    SUPPORTED_LANGUAGES.map((entry) => el('option', { value: entry.code, selected: entry.code === getLanguage(), text: entry.name }))
  );
  const logo = el('a', { class: 'menu-logo', href: '#' }, el('img', { src: `assets/logo/logo.svg?v=${GAME_VERSION}`, alt: t('app.title') }));
  const root = el(
    'div',
    { id: 'menu-root', class: 'menu-root', hidden: true },
    canvasHost,
    el('div', { class: 'menu-scrim nu-scrim' }),
    el('div', { class: 'menu-layout' }, el('div', { class: 'menu-nav' }, logo, nav), el('main', { class: 'menu-main' }, panel)),
    el('div', { class: 'menu-footer' }, languageSelect, musicButton),
    el('div', { class: 'menu-version', text: t('menu.version', { version: GAME_VERSION }) })
  );
  document.body.appendChild(root);
  const scene = createMenuScene(canvasHost);

  function updateMusicButton() {
    musicButton.textContent = music.isEnabled() ? t('menu.music.on') : t('menu.music.off');
  }

  musicButton.addEventListener('click', (event) => {
    event.stopPropagation();
    music.toggle();
    updateMusicButton();
  });
  updateMusicButton();

  languageSelect.addEventListener('change', () => {
    setLanguage(languageSelect.value);
    window.location.reload();
  });

  logo.addEventListener('click', (event) => {
    event.preventDefault();
    show(account ? 'home' : 'login');
  });

  function request(message, action = message.type.replace(/^auth-/, '')) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        requests.delete(action);
        resolve({ ok: false, key: 'menu.error.timeout' });
      }, REQUEST_TIMEOUT_MS);
      requests.set(action, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
      connection.send(message);
    });
  }

  function setNotice(text, ok = false) {
    if (!notice) return;
    notice.textContent = text;
    notice.hidden = !text;
    notice.classList.toggle('is-ok', ok);
  }

  function showLoading(visible) {
    if (visible) {
      loadingScreen.classList.remove('hidden', 'fading');
    } else {
      loadingScreen.classList.add('fading');
      setTimeout(() => {
        if (loadingScreen.classList.contains('fading')) loadingScreen.classList.add('hidden');
      }, LOADING_FADE_MS);
    }
  }

  function showConnectionLost(key) {
    if (document.getElementById('connection-lost')) return;
    const button = el('button', { class: 'window-button', text: t('connection.lost.ok') });
    button.addEventListener('click', () => window.location.reload());
    document.body.appendChild(
      el(
        'div',
        { id: 'connection-lost' },
        el('div', { class: 'window nu-taped' }, el('div', { class: 'connection-lost-title', text: t('connection.lost.title') }), el('p', { text: t(key) }), button)
      )
    );
    button.focus();
  }

  function navItems() {
    if (!account) {
      return [
        { label: 'menu.nav.login', screen: 'login' },
        { label: 'menu.nav.register', screen: 'register' },
        { label: 'menu.nav.credits', screen: 'credits' },
      ];
    }
    const items = [];
    if (account.character) {
      items.push({ label: 'menu.nav.play', action: enter });
      items.push({ label: 'menu.nav.character', screen: 'character' });
    } else {
      items.push({ label: 'menu.nav.createCharacter', screen: 'character' });
    }
    items.push({ label: 'menu.nav.settings', screen: 'settings' });
    items.push({ label: 'menu.nav.credits', screen: 'credits' });
    items.push({ label: 'menu.nav.logout', action: logout });
    return items;
  }

  function renderNav() {
    clear(nav);
    for (const item of navItems()) {
      const button = el('button', { type: 'button', class: `nu-menu-item${item.screen === screen ? ' is-active' : ''}`, text: t(item.label) });
      button.addEventListener('click', () => (item.action ? item.action() : show(item.screen)));
      nav.appendChild(el('li', {}, button));
    }
  }

  function field(labelKey, input) {
    return el('label', { class: 'menu-field' }, el('span', { class: 'nu-label', text: t(labelKey) }), input);
  }

  function buildLogin() {
    const username = el('input', { class: 'nu-input', type: 'text', maxlength: 32, required: true, autocomplete: 'username' });
    const password = el('input', { class: 'nu-input', type: 'password', maxlength: 256, required: true, autocomplete: 'current-password' });
    const submit = el('button', { class: 'nu-button', type: 'submit', text: t('login.submit') });
    const toRegister = el('button', { class: 'nu-button', type: 'button', text: t('login.toRegister') });
    toRegister.addEventListener('click', () => show('register'));
    const form = el('form', { class: 'menu-form' }, field('login.username', username), field('login.password', password), el('div', { class: 'menu-actions' }, submit, toRegister));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      setNotice('');
      const result = await request({ type: 'auth-login', username: username.value, password: password.value });
      submit.disabled = false;
      if (!result.ok) setNotice(describeResult(result).text);
    });
    return { title: t('login.title'), body: form, focus: () => username.focus() };
  }

  function buildRegister() {
    const username = el('input', { class: 'nu-input', type: 'text', maxlength: 32, required: true, autocomplete: 'username' });
    const password = el('input', { class: 'nu-input', type: 'password', maxlength: 256, required: true, autocomplete: 'new-password' });
    const confirm = el('input', { class: 'nu-input', type: 'password', maxlength: 256, required: true, autocomplete: 'new-password' });
    const submit = el('button', { class: 'nu-button', type: 'submit', text: t('register.submit') });
    const toLogin = el('button', { class: 'nu-button', type: 'button', text: t('register.toLogin') });
    toLogin.addEventListener('click', () => show('login'));
    const form = el(
      'form',
      { class: 'menu-form' },
      field('register.username', username),
      field('register.password', password),
      field('register.confirm', confirm),
      el('div', { class: 'menu-actions' }, submit, toLogin)
    );
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      setNotice('');
      const result = await request({ type: 'auth-register', username: username.value, password: password.value, confirm: confirm.value });
      submit.disabled = false;
      if (!result.ok) setNotice(describeResult(result).text);
    });
    return { title: t('register.title'), body: form, focus: () => username.focus() };
  }

  function characterSummary(character) {
    return el(
      'div',
      { class: 'menu-card' },
      el('div', { class: 'nu-label', text: t('character.yours') }),
      el('p', { class: 'menu-character', text: character.name }),
      character.classId
        ? el('p', { class: 'menu-hint', text: `${t(`class.${character.classId}.name`)} · ${t('home.level', { level: character.level })}` })
        : el('p', { class: 'menu-hint', text: t('class.chooseNow') })
    );
  }

  function buildHome() {
    const character = account.character;
    const children = [el('p', { class: 'menu-lead', text: t('home.welcome', { name: account.username }) })];
    const actions = el('div', { class: 'menu-actions' });

    if (character) {
      children.push(characterSummary(character));
      const play = el('button', { class: 'nu-button', type: 'button', text: t(character.classId ? 'menu.nav.play' : 'class.confirm') });
      play.addEventListener('click', () => (character.classId ? enter() : show('character')));
      actions.appendChild(play);
    } else {
      children.push(el('p', { class: 'menu-hint', text: t('home.noCharacter') }));
      const create = el('button', { class: 'nu-button', type: 'button', text: t('menu.nav.createCharacter') });
      create.addEventListener('click', () => show('character'));
      actions.appendChild(create);
    }

    children.push(actions);
    return { title: t('home.title'), body: el('div', { class: 'menu-form' }, children) };
  }

  function buildCharacter() {
    const character = account.character;

    if (!character) {
      const form = createCharacterForm({
        onPreview: (indices) => scene.previewAppearance(indices),
        onSubmit: async (data) => {
          const result = await request({ type: 'character-create', ...data });
          if (result.ok) show('character');
          return describeResult(result);
        },
      });
      return { title: t('character.title'), body: form.element, creator: true, focus: form.focus };
    }

    const children = [characterSummary(character)];

    if (character.classId) {
      children.push(
        el('p', { class: 'menu-hint', text: t(`class.${character.classId}.description`) }),
        el('p', { class: 'menu-class-bonus', text: t(`class.${character.classId}.bonus`) }),
        el('p', { class: 'menu-hint', text: t('character.locked') }),
        el('div', { class: 'menu-actions' }, (() => {
          const play = el('button', { class: 'nu-button', type: 'button', text: t('menu.nav.play') });
          play.addEventListener('click', enter);
          return play;
        })())
      );
    } else {
      let chosen = null;
      const submit = el('button', { class: 'nu-button', type: 'submit', text: t('class.confirm') });
      const form = el('form', { class: 'menu-form' }, classFields(null, (value) => { chosen = value; }), el('div', { class: 'menu-actions' }, submit));
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        submit.disabled = true;
        const result = await request({ type: 'class-set', classId: chosen });
        submit.disabled = false;
        if (!result.ok) setNotice(describeResult(result).text);
      });
      children.push(form);
    }

    return { title: t('character.title'), body: el('div', { class: 'menu-form' }, children) };
  }

  function buildSettings() {
    const form = createSettingsForm({
      settings: account.settings,
      language: getLanguage(),
      languages: SUPPORTED_LANGUAGES,
      onSave: async (settings) => describeResult(await request({ type: 'settings-save', settings })),
      onLanguage: (code) => {
        setLanguage(code);
        window.location.reload();
      },
      onMusic: (value) => music.setVolume(value),
      onPasswordChange: async (current, next, confirm) => describeResult(await request({ type: 'password-change', current, next, confirm })),
    });
    return { title: t('settings.title'), body: form.element, wide: true };
  }

  function buildCredits() {
    const licenseMit = t('credits.license.mit');
    const and = t('credits.and');
    const software = [
      ['https://threejs.org', 'three.js', `${licenseMit}, © three.js authors`],
      ['https://howlerjs.com', 'howler.js', `${licenseMit}, © 2013-2020 James Simpson ${and} GoldFire Studios, Inc.`],
      ['https://nodejs.org', 'Node.js', `${licenseMit}, © OpenJS Foundation ${and} Node.js contributors`],
      ['https://github.com/websockets/ws', 'ws', `${licenseMit}, © Einar Otto Stangvik ${and} contributors`],
      ['https://github.com/sidorares/node-mysql2', 'mysql2', `${licenseMit}, © Andrey Sidorov ${and} contributors`],
      ['https://github.com/dcodeIO/bcrypt.js', 'bcrypt.js', `${t('credits.license.bsd')}, © 2012 Nevins Bartolomeo, © 2012 Shane Girish, © 2014 Daniel Wirtz`],
      ['https://mariadb.org', 'MariaDB', 'GPL v2, © MariaDB Foundation'],
      ['https://www.mapeditor.org', 'Tiled', `(${t('credits.tiled.note')}), © Thorbjørn Lindeijer`],
    ];
    const fonts = [
      ['https://fonts.google.com/specimen/Allerta+Stencil', 'Allerta Stencil', 'SIL Open Font License 1.1, © 2010 Matt McInerney'],
      ['https://fonts.google.com/specimen/Special+Elite', 'Special Elite', 'Apache License 2.0, © Astigmatic'],
    ];
    const list = (entries) => el('ul', {}, entries.map(([href, name, license]) => el('li', {}, link(href, name), `, ${license}`)));

    return {
      title: t('credits.title'),
      wide: true,
      body: el(
        'div',
        { class: 'menu-credits' },
        el('p', { class: 'menu-lead', text: t('credits.lead') }),
        el('h2', { class: 'nu-title', text: t('credits.own.heading') }),
        el('p', { text: t('credits.own.text') }),
        el('h2', { class: 'nu-title', text: t('credits.fonts.heading') }),
        list(fonts),
        el('h2', { class: 'nu-title', text: t('credits.software.heading') }),
        list(software)
      ),
    };
  }

  const builders = { login: buildLogin, register: buildRegister, home: buildHome, character: buildCharacter, settings: buildSettings, credits: buildCredits };

  function render() {
    renderNav();
    const view = builders[screen]();
    title.textContent = view.title;
    panel.classList.toggle('is-wide', Boolean(view.wide));
    notice = el('p', { class: 'nu-message', hidden: true });
    clear(content);
    content.append(notice, view.body);
    content.scrollTop = 0;
    scene.setMode(view.creator ? 'creator' : 'home');
    root.classList.toggle('is-creator', Boolean(view.creator));
    view.focus?.();
  }

  function show(name) {
    if (!account && !PUBLIC_SCREENS.includes(name)) name = 'login';
    if (account && (name === 'login' || name === 'register')) name = 'home';
    screen = name;
    render();
  }

  function applyAccount() {
    scene.setCharacter(account.character?.appearance ?? null);
    music.setVolume(account.settings.music / 100);
    writeStored(MUSIC_VOLUME_KEY, String(account.settings.music / 100));
    show(screen);
  }

  async function logout() {
    clearSession();
    await request({ type: 'auth-logout' }, 'logout');
    account = null;
    scene.setCharacter(null);
    show('login');
  }

  async function enter() {
    if (entering) return;
    if (!account?.character?.classId) {
      show('character');
      return;
    }
    entering = true;
    if (account.settings?.autoFullscreen) enterFullscreen();
    showLoading(true);
    const result = await request({ type: 'enter-world' }, 'enter-world');
    if (disposed) return;
    entering = false;
    showLoading(false);
    if (result.key === 'class.error.missing') show('character');
    setNotice(describeResult(result).text);
  }

  function reveal() {
    if (opened) return;
    opened = true;
    root.hidden = false;
    scene.start();
    showLoading(false);
  }

  async function begin() {
    const token = readSession();
    if (token) {
      const result = await request({ type: 'auth-resume', token }, 'resume');
      if (!result.ok) clearSession();
    }
    reveal();
  }

  connection.setHandlers({
    onOpen: begin,
    onMessage(message) {
      if (message.type === 'account') {
        account = message;
        if (message.token) writeSession(message.token);
        applyAccount();
      } else if (message.type === 'settings') {
        if (account) account.settings = message.settings;
        music.setVolume(message.settings.music / 100);
        writeStored(MUSIC_VOLUME_KEY, String(message.settings.music / 100));
      } else if (message.type === 'menu-result') {
        const resolve = requests.get(message.action);
        if (resolve) {
          requests.delete(message.action);
          resolve(message);
        }
      } else if (message.type === 'init') {
        onEnterWorld(message);
      }
    },
    onClose(event) {
      if (disposed) return;
      showLoading(false);
      showConnectionLost(event?.code === 4002 ? 'connection.lost.replaced' : opened ? 'connection.lost.closed' : 'connection.lost.unreachable');
    },
  });

  title.textContent = t('login.title');
  render();
  if (connection.isOpen()) begin();

  return {
    dispose() {
      disposed = true;
      music.stop();
      scene.dispose();
      root.remove();
    },
  };
}
