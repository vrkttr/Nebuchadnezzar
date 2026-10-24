import { t } from '../i18n/I18n.js';

const REFRESH_MS = 5000;

export function createAdminWindow(state, handlers = {}) {
  const windowEl = document.getElementById('admin-window');
  const body = document.getElementById('admin-body');
  const closeButton = document.getElementById('admin-close');
  const openButton = document.getElementById('admin-button');

  let overview = { players: [], zones: [] };
  let bans = [];
  let timer = null;
  const draft = { item: '', quantity: '1', zone: '', spawn: '', x: '', z: '', gold: '', level: '', text: '', name: '', banName: '', banHours: '', banReason: '' };

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
    handlers.onSend?.({ type: 'admin-overview' });
    handlers.onSend?.({ type: 'admin-bans' });
    stopTimer();
    timer = setInterval(() => handlers.onSend?.({ type: 'admin-overview' }), REFRESH_MS);
  }

  function toggle() {
    if (isOpen()) hide();
    else show();
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, onClick, className = 'window-button admin-button') {
    const node = el('button', className, label);
    node.addEventListener('click', onClick);
    return node;
  }

  function field(key, placeholder, type = 'text', width = null) {
    const input = el('input', 'admin-input');
    input.type = type;
    input.placeholder = placeholder;
    input.value = draft[key];
    if (width) {
      input.style.width = width;
      input.style.flex = '0 0 auto';
    }
    input.addEventListener('input', () => {
      draft[key] = input.value;
    });
    return input;
  }

  function send(message) {
    handlers.onSend?.(message);
  }

  function itemMatch(text) {
    const wanted = text.trim().toLowerCase();
    if (!wanted) return null;
    const items = Object.values(state.items ?? {});
    return items.find((item) => item.id.toLowerCase() === wanted) ?? items.find((item) => item.name.toLowerCase() === wanted) ?? null;
  }

  function section(title) {
    const wrapper = el('div', 'admin-section');
    wrapper.appendChild(el('div', 'admin-title', title));
    return wrapper;
  }

  function row(...children) {
    const node = el('div', 'admin-row');
    node.append(...children);
    return node;
  }

  function buildEditorLink() {
    const wrapper = section(t('admin.pl.title'));
    wrapper.appendChild(row(button(t('admin.pl.openEditor'), () => handlers.onEditor?.())));
    return wrapper;
  }

  function buildPlayers() {
    const wrapper = section(t('admin.players', { count: overview.players.length }));
    const list = el('div', 'admin-players');
    for (const player of overview.players) {
      const line = el('div', 'admin-player');
      line.appendChild(el('span', 'admin-player-name', `${player.name} (${player.level})`));
      line.appendChild(el('span', 'admin-player-zone', `${player.zone} ${player.x}/${player.z}`));
      if (player.name !== state.player?.name) {
        line.appendChild(button(t('admin.goTo'), () => send({ type: 'admin-tp-to', name: player.name }), 'window-button admin-mini'));
        line.appendChild(button(t('admin.summon'), () => send({ type: 'admin-summon', name: player.name }), 'window-button admin-mini'));
        line.appendChild(
          button(t('admin.banFill'), () => {
            draft.banName = player.name;
            render();
          }, 'window-button window-button-danger admin-mini')
        );
        line.appendChild(button(t('admin.kick'), () => send({ type: 'admin-kick', name: player.name }), 'window-button window-button-danger admin-mini'));
      }
      list.appendChild(line);
    }
    wrapper.appendChild(list);
    return wrapper;
  }

  function buildSpawn() {
    const wrapper = section(t('admin.spawn'));
    const list = el('datalist');
    list.id = 'admin-items';
    for (const item of Object.values(state.items ?? {})) {
      const option = el('option');
      option.value = item.id;
      option.label = item.name;
      list.appendChild(option);
    }
    const itemField = field('item', t('admin.itemPlaceholder'));
    itemField.setAttribute('list', 'admin-items');
    wrapper.append(
      list,
      row(
        itemField,
        field('quantity', t('admin.quantity'), 'number', '64px'),
        button(t('admin.spawnButton'), () => {
          const item = itemMatch(draft.item);
          if (item) send({ type: 'admin-spawn', itemId: item.id, quantity: Number.parseInt(draft.quantity, 10) || 1 });
        })
      )
    );
    return wrapper;
  }

  function buildTeleport() {
    const wrapper = section(t('admin.teleport'));
    const zoneSelect = el('select', 'admin-input');
    const spawnSelect = el('select', 'admin-input');

    for (const zone of overview.zones) {
      const option = el('option', null, zone.name);
      option.value = zone.id;
      zoneSelect.appendChild(option);
    }
    if (!draft.zone && overview.zones[0]) draft.zone = overview.zones[0].id;
    zoneSelect.value = draft.zone;

    function fillSpawns() {
      spawnSelect.replaceChildren();
      const defaultOption = el('option', null, t('admin.defaultSpawn'));
      defaultOption.value = '';
      spawnSelect.appendChild(defaultOption);
      const zone = overview.zones.find((candidate) => candidate.id === draft.zone);
      for (const spawn of zone?.spawns ?? []) {
        const option = el('option', null, spawn);
        option.value = spawn;
        spawnSelect.appendChild(option);
      }
      spawnSelect.value = draft.spawn;
    }

    zoneSelect.addEventListener('change', () => {
      draft.zone = zoneSelect.value;
      draft.spawn = '';
      fillSpawns();
    });
    spawnSelect.addEventListener('change', () => {
      draft.spawn = spawnSelect.value;
    });
    fillSpawns();

    wrapper.append(
      row(zoneSelect, spawnSelect, button(t('admin.go'), () => send({ type: 'admin-tp-zone', zone: draft.zone, spawn: draft.spawn }))),
      row(
        field('x', 'X', 'number', '80px'),
        field('z', 'Z', 'number', '80px'),
        button(t('admin.go'), () => {
          if (draft.x !== '' && draft.z !== '') send({ type: 'admin-tp-coords', x: Number(draft.x), z: Number(draft.z) });
        })
      )
    );
    return wrapper;
  }

  function buildBans() {
    const wrapper = section(t('admin.bans'));
    wrapper.append(
      row(field('banName', t('admin.banName'))),
      row(
        field('banHours', t('admin.banHours'), 'number', '110px'),
        field('banReason', t('admin.banReason')),
        button(
          t('admin.banButton'),
          () => {
            if (draft.banName.trim() === '') return;
            send({ type: 'admin-ban', name: draft.banName.trim(), hours: Number.parseInt(draft.banHours, 10) || 0, reason: draft.banReason });
            draft.banName = '';
            draft.banHours = '';
            draft.banReason = '';
            render();
          },
          'window-button window-button-danger admin-button'
        )
      )
    );

    const list = el('div', 'admin-players');
    for (const ban of bans) {
      const line = el('div', 'admin-player');
      line.appendChild(el('span', 'admin-player-name', ban.name));
      line.appendChild(el('span', 'admin-player-zone', `${ban.permanent ? t('admin.banPermanent') : ban.until}${ban.reason ? ` · ${ban.reason}` : ''}`));
      line.appendChild(button(t('admin.unban'), () => send({ type: 'admin-unban', name: ban.name }), 'window-button admin-mini'));
      list.appendChild(line);
    }
    if (bans.length === 0) list.appendChild(el('div', 'admin-player-zone', t('admin.noBans')));
    wrapper.appendChild(list);
    return wrapper;
  }

  function buildMisc() {
    const wrapper = section(t('admin.misc'));
    wrapper.append(
      row(
        field('gold', t('admin.goldPlaceholder'), 'number'),
        button(t('admin.giveGold'), () => {
          if (draft.gold !== '') send({ type: 'admin-gold', amount: Number.parseInt(draft.gold, 10) });
        })
      ),
      row(
        field('level', t('admin.levelPlaceholder'), 'number'),
        button(t('admin.setLevel'), () => {
          if (draft.level !== '') send({ type: 'admin-level', level: Number.parseInt(draft.level, 10) });
        }),
        button(t('admin.heal'), () => send({ type: 'admin-heal' }))
      ),
      row(
        field('text', t('admin.announcePlaceholder')),
        button(t('admin.announce'), () => {
          if (draft.text.trim()) {
            send({ type: 'admin-announce', text: draft.text });
            draft.text = '';
            render();
          }
        })
      )
    );
    return wrapper;
  }

  function render() {
    const focused = document.activeElement;
    const focusKey = focused && body.contains(focused) ? Array.from(body.querySelectorAll('input,select')).indexOf(focused) : -1;
    body.replaceChildren(buildEditorLink(), buildPlayers(), buildSpawn(), buildTeleport(), buildBans(), buildMisc());
    if (focusKey >= 0) body.querySelectorAll('input,select')[focusKey]?.focus();
  }

  function setOverview(message) {
    overview = { players: message.players ?? [], zones: message.zones ?? [] };
    if (isOpen()) {
      const typing = document.activeElement && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
      if (!typing) render();
      else {
        const players = body.querySelector('.admin-players');
        if (players) players.replaceWith(buildPlayers().querySelector('.admin-players'));
      }
    }
  }

  function setBans(message) {
    bans = Array.isArray(message.bans) ? message.bans : [];
    if (isOpen()) {
      const typing = document.activeElement && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
      if (!typing) render();
    }
  }

  function enable() {
    openButton.classList.remove('hidden');
  }

  openButton.addEventListener('click', toggle);
  closeButton.addEventListener('click', hide);
  windowEl.addEventListener('transitionend', () => {});

  const observer = new MutationObserver(() => {
    if (isOpen()) render();
  });
  observer.observe(windowEl, { attributes: true, attributeFilter: ['class'] });

  return { isOpen, hide, toggle, setOverview, setBans, enable };
}
