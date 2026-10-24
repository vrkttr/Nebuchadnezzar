import { t } from '../i18n/I18n.js';

const TABS = ['account', 'character', 'inventory', 'equipment', 'skills', 'quests', 'chests', 'friends', 'mails'];
const CHARACTER_TABS = new Set(TABS.filter((tab) => tab !== 'account'));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createAdminPlayerEditor(state, handlers = {}) {
  const windowEl = document.getElementById('admin-editor-window');
  const body = document.getElementById('admin-editor-body');
  const closeButton = document.getElementById('admin-editor-close');

  let results = [];
  let meta = null;
  let source = null;
  let work = null;
  let activeTab = 'account';
  let dirty = false;
  let pending = false;
  let message = null;
  const draft = { query: '', newPassword: '', revokeSessions: false };

  function isOpen() {
    return !windowEl.classList.contains('hidden');
  }

  function send(payload) {
    handlers.onSend?.(payload);
  }

  function show() {
    windowEl.classList.remove('hidden');
    if (results.length === 0) send({ type: 'admin-pl-search', query: draft.query });
    render();
  }

  function hide() {
    windowEl.classList.add('hidden');
  }

  function markDirty() {
    if (dirty) return;
    dirty = true;
    const flag = body.querySelector('.admin-pl-dirty');
    if (flag) flag.hidden = false;
  }

  function label(key) {
    return t(`admin.pl.f.${key}`);
  }

  function input(object, key, type = 'text', options = {}) {
    const control = el('input', 'admin-input');
    if (type === 'bool') {
      control.type = 'checkbox';
      control.className = 'admin-check';
      control.checked = Boolean(object[key]);
      control.addEventListener('change', () => {
        object[key] = control.checked;
        markDirty();
      });
      return control;
    }
    control.type = type === 'password' ? 'password' : type === 'text' || type === 'datetime' ? 'text' : 'number';
    if (type === 'int') control.step = '1';
    if (type === 'float') control.step = 'any';
    if (options.list) control.setAttribute('list', options.list);
    if (options.placeholder) control.placeholder = options.placeholder;
    if (options.readonly) control.readOnly = true;
    control.value = object[key] ?? '';
    control.addEventListener('input', () => {
      object[key] = control.value;
      markDirty();
    });
    return control;
  }

  function select(object, key, values, allowEmpty = false) {
    const control = el('select', 'admin-input');
    if (allowEmpty) {
      const empty = el('option', null, '—');
      empty.value = '';
      control.appendChild(empty);
    }
    for (const entry of values) {
      const option = el('option', null, entry.label ?? entry);
      option.value = entry.value ?? entry;
      control.appendChild(option);
    }
    control.value = object[key] ?? '';
    control.addEventListener('change', () => {
      object[key] = control.value;
      markDirty();
    });
    return control;
  }

  function line(text, control, hint) {
    const wrapper = el('label', 'admin-pl-line');
    wrapper.appendChild(el('span', 'admin-pl-label', text));
    wrapper.appendChild(control);
    if (hint) wrapper.appendChild(el('span', 'admin-pl-hint', hint));
    return wrapper;
  }

  function fieldLines(object, keys, types = {}) {
    return keys.map((key) => line(label(key), input(object, key, types[key] ?? 'int')));
  }

  function itemList() {
    let list = document.getElementById('admin-pl-items');
    if (!list) {
      list = el('datalist');
      list.id = 'admin-pl-items';
      for (const item of Object.values(state.items ?? {})) {
        const option = el('option');
        option.value = item.id;
        option.label = item.name;
        list.appendChild(option);
      }
      document.body.appendChild(list);
    }
  }

  function listEditor(rows, columns, create, options = {}) {
    const wrapper = el('div', 'admin-pl-list');
    const header = el('div', 'admin-pl-listrow admin-pl-listhead');
    for (const column of columns) header.appendChild(el('span', column.wide ? 'admin-pl-wide' : 'admin-pl-cell', label(column.key)));
    header.appendChild(el('span', 'admin-pl-tiny'));
    wrapper.appendChild(header);

    rows.forEach((row, index) => {
      const entry = el('div', 'admin-pl-listrow');
      for (const column of columns) {
        const holder = el('span', column.wide ? 'admin-pl-wide' : 'admin-pl-cell');
        holder.appendChild(column.build(row));
        entry.appendChild(holder);
      }
      const remove = el('button', 'window-button window-button-danger admin-mini', '×');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        rows.splice(index, 1);
        markDirty();
        render();
      });
      const tiny = el('span', 'admin-pl-tiny');
      tiny.appendChild(remove);
      entry.appendChild(tiny);
      wrapper.appendChild(entry);
    });

    if (!options.noAdd) {
      const add = el('button', 'window-button admin-button', t('admin.pl.add'));
      add.type = 'button';
      add.addEventListener('click', () => {
        rows.push(create());
        markDirty();
        render();
      });
      wrapper.appendChild(add);
    }

    if (rows.length === 0) wrapper.insertBefore(el('div', 'admin-pl-hint', t('admin.pl.empty')), header.nextSibling);
    return wrapper;
  }

  function buildAccount() {
    const user = work.user;
    const wrapper = el('div', 'admin-pl-form');
    wrapper.append(
      line(label('userId'), input({ value: source.userId }, 'value', 'text', { readonly: true })),
      line(label('createdAt'), input(user, 'createdAt', 'text', { readonly: true })),
      line(label('username'), input(user, 'username', 'text')),
      line(label('newPassword'), input(draft, 'newPassword', 'password', { placeholder: t('admin.pl.passwordHint') })),
      line(label('revokeSessions'), input(draft, 'revokeSessions', 'bool'), t('admin.pl.revokeHint')),
      ...fieldLines(user, ['audio_volume', 'audio_ambient', 'audio_music']),
      line(label('audio_muted'), input(user, 'audio_muted', 'bool')),
      line(label('auto_fullscreen'), input(user, 'auto_fullscreen', 'bool')),
      line(label('touch_controls'), select(user, 'touch_controls', meta.touchModes)),
      line(label('banned_until'), input(user, 'banned_until', 'datetime', { placeholder: t('admin.pl.banHint') })),
      line(label('ban_reason'), input(user, 'ban_reason', 'text'))
    );
    wrapper.appendChild(el('div', 'admin-title', label('graphics')));
    for (const key of meta.graphicsKeys) wrapper.appendChild(line(t(`settings.graphics.${key}`), input(user.graphics, key, 'bool')));
    wrapper.appendChild(line(label('viewDistance'), input(user.graphics, 'viewDistance', 'int')));
    return wrapper;
  }

  function buildCharacter() {
    const character = work.character;
    const zones = meta.zones.map((zone) => ({ value: zone.id, label: `${zone.name} (${zone.id})` }));
    const wrapper = el('div', 'admin-pl-form');
    wrapper.append(
      line(label('characterId'), input(character, 'id', 'text', { readonly: true })),
      line(label('createdAt'), input(character, 'createdAt', 'text', { readonly: true })),
      line(label('name'), input(character, 'name', 'text')),
      line(label('class_id'), select(character, 'class_id', meta.classes, true)),
      ...fieldLines(character, ['level', 'xp', 'gold']),
      line(label('zone'), select(character, 'zone', zones)),
      ...fieldLines(character, ['pos_x', 'pos_y', 'pos_z', 'rotation_y'], { pos_x: 'float', pos_y: 'float', pos_z: 'float', rotation_y: 'float' }),
      line(label('home_zone'), select(character, 'home_zone', zones, true)),
      line(label('hearth_ready_at'), input(character, 'hearth_ready_at', 'int')),
      line(label('starter_kit'), input(character, 'starter_kit', 'bool')),
      line(label('intro_seen'), input(character, 'intro_seen', 'bool')),
      line(label('guild_id'), input(character, 'guild_id', 'int'), character.guild_name ? character.guild_name : t('admin.pl.noGuild'))
    );
    wrapper.appendChild(el('div', 'admin-title', label('appearance')));
    meta.appearanceLimits.forEach((limit, index) => {
      wrapper.appendChild(line(`${label('appearance')} ${index + 1} (0–${limit - 1})`, input(character.appearance, index, 'int')));
    });
    wrapper.appendChild(el('div', 'admin-title', label('action_bar')));
    const area = el('textarea', 'admin-input admin-pl-area');
    area.value = character.action_bar ?? '';
    area.addEventListener('input', () => {
      character.action_bar = area.value;
      markDirty();
    });
    wrapper.appendChild(area);
    return wrapper;
  }

  function buildInventory() {
    itemList();
    return listEditor(
      work.inventory,
      [
        { key: 'slot', build: (row) => input(row, 'slot', 'int') },
        { key: 'item_id', wide: true, build: (row) => input(row, 'item_id', 'text', { list: 'admin-pl-items' }) },
        { key: 'quantity', build: (row) => input(row, 'quantity', 'int') },
        { key: 'perk', build: (row) => input(row, 'perk', 'text', { placeholder: 'damage:5' }) },
      ],
      () => {
        const used = new Set(work.inventory.map((row) => Number(row.slot)));
        let slot = 0;
        while (used.has(slot)) slot += 1;
        return { slot, item_id: '', quantity: 1, perk: '' };
      }
    );
  }

  function buildEquipment() {
    itemList();
    const slots = [...meta.equipmentSlots, ...meta.bagSlots];
    return listEditor(
      work.equipment,
      [
        { key: 'slot', build: (row) => select(row, 'slot', slots) },
        { key: 'item_id', wide: true, build: (row) => input(row, 'item_id', 'text', { list: 'admin-pl-items' }) },
        { key: 'perk', build: (row) => input(row, 'perk', 'text', { placeholder: 'damage:5' }) },
      ],
      () => ({ slot: slots.find((slot) => !work.equipment.some((row) => row.slot === slot)) ?? slots[0], item_id: '', perk: '' })
    );
  }

  function buildSkills() {
    const wrapper = el('div', 'admin-pl-form');
    for (const skill of meta.skills) {
      wrapper.appendChild(line(`${t(`skill.${skill.id}.name`)} (0–${skill.max})`, input(work.character.skills, skill.id, 'int')));
    }
    return wrapper;
  }

  function buildQuests() {
    const list = el('datalist');
    list.id = 'admin-pl-quests';
    for (const quest of meta.quests) {
      const option = el('option');
      option.value = quest.id;
      list.appendChild(option);
    }
    const wrapper = listEditor(
      work.quests,
      [
        { key: 'quest_id', wide: true, build: (row) => input(row, 'quest_id', 'text', { list: 'admin-pl-quests' }) },
        { key: 'status', build: (row) => select(row, 'status', meta.questStatuses) },
        {
          key: 'progress',
          build: (row) => {
            const holder = { value: (row.progress ?? []).join(',') };
            const control = input(holder, 'value', 'text', { placeholder: '0,0' });
            control.addEventListener('input', () => {
              row.progress = holder.value
                .split(',')
                .map((part) => Number.parseInt(part.trim(), 10))
                .map((value) => (Number.isInteger(value) ? value : 0));
            });
            return control;
          },
        },
      ],
      () => ({ quest_id: '', status: 'active', progress: [] })
    );
    wrapper.appendChild(list);
    return wrapper;
  }

  function buildChests() {
    const zones = meta.zones.map((zone) => ({ value: zone.id, label: zone.id }));
    return listEditor(
      work.chests,
      [
        { key: 'zone', build: (row) => select(row, 'zone', zones) },
        { key: 'chest_id', wide: true, build: (row) => input(row, 'chest_id', 'text') },
      ],
      () => ({ zone: meta.zones[0]?.id ?? '', chest_id: '' })
    );
  }

  function buildFriends() {
    return listEditor(work.friends, [{ key: 'name', wide: true, build: (row) => input(row, 'name', 'text') }], () => ({ name: '' }));
  }

  function buildMails() {
    return listEditor(
      work.mails,
      [
        { key: 'sender_name', build: (row) => input(row, 'sender_name', 'text', { readonly: true }) },
        { key: 'subject', wide: true, build: (row) => input(row, 'subject', 'text') },
        {
          key: 'body',
          wide: true,
          build: (row) => {
            const area = el('textarea', 'admin-input admin-pl-area');
            area.value = row.body ?? '';
            area.addEventListener('input', () => {
              row.body = area.value;
              markDirty();
            });
            return area;
          },
        },
        { key: 'is_read', build: (row) => input(row, 'is_read', 'bool') },
      ],
      () => null,
      { noAdd: true }
    );
  }

  const BUILDERS = {
    account: buildAccount,
    character: buildCharacter,
    inventory: buildInventory,
    equipment: buildEquipment,
    skills: buildSkills,
    quests: buildQuests,
    chests: buildChests,
    friends: buildFriends,
    mails: buildMails,
  };

  function buildSearch() {
    const wrapper = el('div', 'admin-section');
    const searchInput = el('input', 'admin-input');
    searchInput.placeholder = t('admin.pl.searchPlaceholder');
    searchInput.value = draft.query;
    searchInput.addEventListener('input', () => {
      draft.query = searchInput.value;
    });
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') send({ type: 'admin-pl-search', query: draft.query });
    });
    const searchButton = el('button', 'window-button admin-button', t('admin.pl.search'));
    searchButton.type = 'button';
    searchButton.addEventListener('click', () => send({ type: 'admin-pl-search', query: draft.query }));
    const row = el('div', 'admin-row');
    row.append(searchInput, searchButton);
    wrapper.appendChild(row);

    const list = el('div', 'admin-players admin-pl-results');
    for (const result of results) {
      const entry = el('div', 'admin-player');
      const text = `#${result.userId} ${result.username}${result.name ? ` — ${result.name} (${result.level})` : ` — ${t('admin.pl.noCharacter')}`}`;
      entry.appendChild(el('span', 'admin-player-name', text));
      if (result.online) entry.appendChild(el('span', 'admin-player-zone', t('admin.pl.online')));
      const open = el('button', 'window-button admin-mini', t('admin.pl.open'));
      open.type = 'button';
      open.addEventListener('click', () => {
        message = null;
        send({ type: 'admin-pl-load', userId: result.userId });
      });
      entry.appendChild(open);
      list.appendChild(entry);
    }
    if (results.length === 0) list.appendChild(el('div', 'admin-player-zone', t('admin.pl.noResults')));
    wrapper.appendChild(list);
    return wrapper;
  }

  function collect() {
    const data = {
      user: clone(work.user),
      newPassword: draft.newPassword,
      revokeSessions: draft.revokeSessions,
    };
    delete data.user.createdAt;
    if (!work.character) return data;

    const character = clone(work.character);
    delete character.id;
    delete character.createdAt;
    delete character.guild_name;
    data.character = character;
    data.inventory = clone(work.inventory);
    data.equipment = clone(work.equipment);
    data.quests = clone(work.quests);
    data.chests = clone(work.chests);
    data.friends = work.friends.map((row) => String(row.name ?? '').trim()).filter((name) => name !== '');
    data.mails = clone(work.mails);
    return data;
  }

  function save() {
    if (pending || !work) return;
    pending = true;
    message = { ok: true, text: t('admin.pl.saving') };
    send({ type: 'admin-pl-save', userId: source.userId, data: collect() });
    render();
  }

  function buildEditor() {
    const wrapper = el('div', 'admin-section');
    const head = el('div', 'admin-title', `#${source.userId} ${work.user.username}${work.character ? ` — ${work.character.name}` : ''}`);
    wrapper.appendChild(head);

    const tabs = el('div', 'admin-pl-tabs');
    for (const tab of TABS) {
      if (CHARACTER_TABS.has(tab) && !work.character) continue;
      const button = el('button', `window-button admin-mini${tab === activeTab ? ' admin-pl-tab-active' : ''}`, t(`admin.pl.tab.${tab}`));
      button.type = 'button';
      button.addEventListener('click', () => {
        activeTab = tab;
        render();
      });
      tabs.appendChild(button);
    }
    wrapper.appendChild(tabs);

    const panel = el('div', 'admin-pl-panel');
    panel.appendChild((BUILDERS[activeTab] ?? buildAccount)());
    wrapper.appendChild(panel);

    if (source.online) wrapper.appendChild(el('div', 'admin-pl-warning', t('admin.pl.onlineWarning')));

    const bar = el('div', 'admin-row');
    const saveButton = el('button', 'window-button admin-button', t('admin.pl.save'));
    saveButton.type = 'button';
    saveButton.disabled = pending;
    saveButton.addEventListener('click', save);
    const reloadButton = el('button', 'window-button admin-button', t('admin.pl.reload'));
    reloadButton.type = 'button';
    reloadButton.addEventListener('click', () => {
      message = null;
      send({ type: 'admin-pl-load', userId: source.userId });
    });
    const flag = el('span', 'admin-pl-dirty', t('admin.pl.unsaved'));
    flag.hidden = !dirty;
    bar.append(saveButton, reloadButton, flag);
    wrapper.appendChild(bar);
    return wrapper;
  }

  function render() {
    if (!isOpen()) return;
    const scroll = body.scrollTop;
    const nodes = [buildSearch()];
    if (work && meta) nodes.push(buildEditor());
    if (message) nodes.push(el('div', message.ok ? 'admin-pl-ok' : 'admin-pl-error', message.text));
    body.replaceChildren(...nodes);
    body.scrollTop = scroll;
  }

  function setList(payload) {
    results = Array.isArray(payload.results) ? payload.results : [];
    if (isOpen()) {
      const typing = document.activeElement && body.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
      if (!typing || document.activeElement.closest('.admin-pl-results')) render();
      else {
        const list = body.querySelector('.admin-pl-results');
        if (list) list.replaceWith(buildSearch().querySelector('.admin-pl-results'));
      }
    }
  }

  function setData(payload) {
    meta = payload.meta;
    source = payload.record;
    work = clone(payload.record);
    work.friends = work.friends.map((name) => ({ name }));
    if (work.character) {
      const skills = {};
      for (const skill of meta.skills) skills[skill.id] = work.character.skills?.[skill.id] ?? 0;
      work.character.skills = skills;
      work.character.appearance = [...work.character.appearance];
    }
    if (!work.character && CHARACTER_TABS.has(activeTab)) activeTab = 'account';
    draft.newPassword = '';
    draft.revokeSessions = false;
    dirty = false;
    pending = false;
    render();
  }

  function setResult(payload) {
    pending = false;
    const text = t(payload.key, payload.params ?? {});
    message = { ok: Boolean(payload.ok), text };
    if (payload.ok) dirty = false;
    render();
  }

  closeButton.addEventListener('click', hide);

  return { isOpen, show, hide, setList, setData, setResult };
}
