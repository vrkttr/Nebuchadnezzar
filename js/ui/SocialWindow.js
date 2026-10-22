import { t, tOr } from '../i18n/I18n.js';

const REFRESH_MS = 5000;

export function createSocialWindow({ onRequest, onAddFriend, onRemoveFriend, onInvite }) {
  const windowEl = document.getElementById('social-window');
  const body = document.getElementById('social-body');
  const tabs = document.getElementById('social-tabs');
  const closeButton = document.getElementById('social-close');
  const openButton = document.getElementById('social-button');

  let data = { online: [], onlineTotal: 0, friends: [], groupId: null };
  let tab = 'online';
  let timer = null;
  let draft = '';

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function hide() {
    windowEl.classList.add('hidden');
    stopTimer();
  }

  function show() {
    windowEl.classList.remove('hidden');
    onRequest();
    render();
    stopTimer();
    timer = setInterval(onRequest, REFRESH_MS);
  }

  function toggle() {
    if (isOpen()) hide();
    else show();
  }

  function zoneLabel(zoneId) {
    return zoneId ? tOr([`zone.${zoneId}.name`], zoneId) : '';
  }

  function cell(className, text) {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    return node;
  }

  function actionButton(label, onClick, disabled = false) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'social-action';
    node.textContent = label;
    node.disabled = disabled;
    node.addEventListener('click', onClick);
    return node;
  }

  function onlineRow(entry) {
    const row = document.createElement('div');
    row.className = 'social-row';
    const info = document.createElement('div');
    info.className = 'social-info';
    info.appendChild(cell('social-name', entry.name));
    const meta = [t('social.level', { level: entry.level }), zoneLabel(entry.zoneId)];
    if (entry.guildName) meta.push(`<${entry.guildName}>`);
    info.appendChild(cell('social-meta', meta.filter(Boolean).join(' · ')));
    row.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'social-actions';
    if (entry.friend) actions.appendChild(cell('social-tag', t('social.isFriend')));
    else actions.appendChild(actionButton(t('social.addFriend'), () => onAddFriend(entry.name)));
    actions.appendChild(actionButton(entry.inGroup ? t('social.inGroup') : t('social.invite'), () => onInvite(entry.id), entry.inGroup));
    row.appendChild(actions);
    return row;
  }

  function friendRow(entry) {
    const row = document.createElement('div');
    row.className = entry.online ? 'social-row' : 'social-row offline';
    const info = document.createElement('div');
    info.className = 'social-info';
    info.appendChild(cell('social-name', entry.name));
    info.appendChild(
      cell(
        'social-meta',
        entry.online ? [t('social.level', { level: entry.level }), zoneLabel(entry.zoneId)].filter(Boolean).join(' · ') : t('social.offline')
      )
    );
    row.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'social-actions';
    if (entry.online) actions.appendChild(actionButton(t('social.invite'), () => onInvite(entry.id)));
    actions.appendChild(actionButton(t('social.remove'), () => onRemoveFriend(entry.name)));
    row.appendChild(actions);
    return row;
  }

  function empty(text) {
    const node = document.createElement('div');
    node.className = 'social-empty';
    node.textContent = text;
    return node;
  }

  function addForm() {
    const form = document.createElement('form');
    form.className = 'social-add';
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.autocomplete = 'off';
    input.placeholder = t('social.namePlaceholder');
    input.value = draft;
    input.addEventListener('input', () => {
      draft = input.value;
    });
    input.addEventListener('keydown', (event) => {
      if (event.code !== 'Escape') event.stopPropagation();
    });
    input.addEventListener('keyup', (event) => event.stopPropagation());
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'social-action';
    submit.textContent = t('social.add');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (name.length < 3) return;
      draft = '';
      input.value = '';
      onAddFriend(name);
    });
    form.append(input, submit);
    return form;
  }

  function render() {
    for (const button of tabs.querySelectorAll('button')) {
      button.classList.toggle('active', button.dataset.tab === tab);
    }

    const focused = document.activeElement;
    const keepFocus = focused && focused.matches?.('.social-add input') ? focused.selectionStart : null;

    if (tab === 'online') {
      const rows = data.online.map(onlineRow);
      const header = cell('social-count', t('social.onlineCount', { count: data.onlineTotal + 1 }));
      body.replaceChildren(header, ...(rows.length > 0 ? rows : [empty(t('social.noOthers'))]));
    } else {
      const rows = data.friends.map(friendRow);
      body.replaceChildren(addForm(), ...(rows.length > 0 ? rows : [empty(t('social.noFriends'))]));
      if (keepFocus !== null) {
        const input = body.querySelector('.social-add input');
        input?.focus();
        input?.setSelectionRange(keepFocus, keepFocus);
      }
    }
  }

  function setData(payload) {
    data = payload;
    if (isOpen()) render();
  }

  for (const button of tabs.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      tab = button.dataset.tab;
      render();
    });
  }

  closeButton.addEventListener('click', hide);
  openButton.addEventListener('click', toggle);

  return { setData, isOpen, hide, toggle };
}
