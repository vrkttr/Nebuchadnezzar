import bcrypt from 'bcryptjs';
import { APPEARANCE_LIMITS } from './appearance.js';
import { inventorySize } from './bags.js';
import { CLASSES, isValidClass } from './classes.js';
import { BAG_SLOTS, EQUIPMENT_SLOTS } from './equipment.js';
import { getItem } from './items.js';
import { getQuest, QUESTS } from './quests.js';
import { SKILLS, totalSkillPoints } from './skills.js';
import { getZone, getZones } from './zoneLoader.js';
import { GRAPHICS_KEYS, normalizeGraphics } from './accounts.js';

const SEARCH_LIMIT = 50;
const MAIL_LIMIT = 200;
const MAX_LEVEL = 100;
const MAX_INT = 2000000000;
const MAX_COORD = 100000;
const USERNAME_MAX = 32;
const NAME_MAX = 32;
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;
const BCRYPT_COST = 10;
const BAN_REASON_MAX = 200;
const MAIL_SUBJECT_MAX = 60;
const MAIL_BODY_MAX = 4000;
const ACTION_BAR_MAX = 2000;
const PERMANENT_BAN = '9999-12-31 23:59:59';
const TOUCH_MODES = ['auto', 'on', 'off'];
const QUEST_STATUSES = ['active', 'completed'];
const PERK_PATTERN = /^(damage|speed):(\d{1,2})$/;
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

class EditError extends Error {
  constructor(key, params = {}) {
    super(key);
    this.key = key;
    this.params = params;
  }
}

function fail(key, params) {
  throw new EditError(key, params);
}

function intIn(value, min, max, field) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (!Number.isInteger(number) || number < min || number > max) fail('admin.pl.fail.range', { field, min, max });
  return number;
}

function floatIn(value, field) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || Math.abs(number) > MAX_COORD) fail('admin.pl.fail.range', { field, min: -MAX_COORD, max: MAX_COORD });
  return number;
}

function flag(value) {
  return value === true || value === 1 ? 1 : 0;
}

function cleanText(value, max, field, { allowEmpty = true, multiline = false } = {}) {
  if (value === null || value === undefined) value = '';
  if (typeof value !== 'string') fail('admin.pl.fail.text', { field });
  const pattern = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/;
  if (pattern.test(value)) fail('admin.pl.fail.text', { field });
  const trimmed = multiline ? value : value.trim();
  if (trimmed.length > max) fail('admin.pl.fail.length', { field, max });
  if (!allowEmpty && trimmed === '') fail('admin.pl.fail.empty', { field });
  return trimmed;
}

function parseDateTime(value, field) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') fail('admin.pl.fail.date', { field });
  const text = value.trim();
  if (text === '') return null;
  if (text.toLowerCase() === 'permanent') return PERMANENT_BAN;
  const match = DATETIME_PATTERN.exec(text);
  if (!match) fail('admin.pl.fail.date', { field });
  const [, year, month, day, hour, minute, second = '00'] = match;
  const probe = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)));
  if (probe.getUTCFullYear() !== Number(year) || probe.getUTCMonth() !== Number(month) - 1 || probe.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) {
    fail('admin.pl.fail.date', { field });
  }
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatDateTime(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 19).replace('T', ' ');
  const pad = (number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

function buildMeta() {
  return {
    zones: getZones().map((zone) => ({ id: zone.id, name: zone.name ?? zone.id })),
    classes: Object.keys(CLASSES),
    equipmentSlots: EQUIPMENT_SLOTS,
    bagSlots: BAG_SLOTS,
    skills: Object.entries(SKILLS).map(([id, skill]) => ({ id, max: skill.max })),
    quests: Object.values(QUESTS).map((quest) => ({ id: quest.id, objectives: quest.objectives.map((objective) => objective.count) })),
    questStatuses: QUEST_STATUSES,
    graphicsKeys: GRAPHICS_KEYS,
    touchModes: TOUCH_MODES,
    appearanceLimits: APPEARANCE_LIMITS,
    limits: { maxLevel: MAX_LEVEL, maxInt: MAX_INT, maxCoord: MAX_COORD },
  };
}

function escapeLike(text) {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function onlineCharacterIds(players) {
  const ids = new Set();
  for (const state of players.values()) ids.add(state.characterId);
  return ids;
}

async function search(ctx, id, message) {
  const query = typeof message.query === 'string' ? message.query.trim().slice(0, 64) : '';
  const pattern = `%${escapeLike(query)}%`;
  const [rows] =
    query === ''
      ? await ctx.db.query(
          'SELECT u.id AS user_id, u.username, c.id AS character_id, c.name, c.level FROM users u LEFT JOIN characters c ON c.user_id = u.id ORDER BY u.id DESC LIMIT ?',
          [SEARCH_LIMIT]
        )
      : await ctx.db.query(
          'SELECT u.id AS user_id, u.username, c.id AS character_id, c.name, c.level FROM users u LEFT JOIN characters c ON c.user_id = u.id WHERE u.username LIKE ? OR c.name LIKE ? OR u.id = ? ORDER BY u.id LIMIT ?',
          [pattern, pattern, Number.parseInt(query, 10) || 0, SEARCH_LIMIT]
        );
  const online = onlineCharacterIds(ctx.players);
  ctx.notify(id, {
    type: 'admin-pl-list',
    results: rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      characterId: row.character_id ?? null,
      name: row.name ?? null,
      level: row.level ?? null,
      online: row.character_id !== null && online.has(row.character_id),
    })),
  });
}

async function loadRecord(ctx, userId) {
  const [users] = await ctx.db.query(
    "SELECT id, username, audio_volume, audio_ambient, audio_music, audio_muted, auto_fullscreen, touch_controls, graphics, DATE_FORMAT(banned_until, '%Y-%m-%d %H:%i:%s') AS banned_until, ban_reason, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM users WHERE id = ?",
    [userId]
  );
  if (users.length === 0) return null;
  const user = users[0];

  const [characters] = await ctx.db.query(
    "SELECT c.id, c.name, c.class_id, c.level, c.xp, c.gold, c.pos_x, c.pos_y, c.pos_z, c.rotation_y, c.zone, c.home_zone, c.hearth_ready_at, c.appear_skin, c.appear_hair_style, c.appear_hair_color, c.appear_top, c.appear_pants, c.starter_kit, c.intro_seen, c.guild_id, c.action_bar, c.skills, g.name AS guild_name, DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM characters c LEFT JOIN guilds g ON g.id = c.guild_id WHERE c.user_id = ?",
    [userId]
  );
  const row = characters[0] ?? null;

  const record = {
    userId: user.id,
    user: {
      username: user.username,
      createdAt: user.created_at,
      audio_volume: user.audio_volume,
      audio_ambient: user.audio_ambient,
      audio_music: user.audio_music,
      audio_muted: Boolean(user.audio_muted),
      auto_fullscreen: Boolean(user.auto_fullscreen),
      touch_controls: TOUCH_MODES.includes(user.touch_controls) ? user.touch_controls : 'auto',
      graphics: normalizeGraphics(user.graphics),
      banned_until: user.banned_until && user.banned_until.startsWith('9999') ? 'permanent' : user.banned_until ?? '',
      ban_reason: user.ban_reason ?? '',
    },
    character: null,
    inventory: [],
    equipment: [],
    quests: [],
    chests: [],
    friends: [],
    mails: [],
    online: false,
  };

  if (!row) return record;

  let skills = {};
  try {
    const parsed = row.skills ? JSON.parse(row.skills) : {};
    if (parsed && typeof parsed === 'object') skills = parsed;
  } catch {
    skills = {};
  }

  record.online = onlineCharacterIds(ctx.players).has(row.id);
  record.character = {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    class_id: row.class_id ?? '',
    level: row.level,
    xp: row.xp,
    gold: row.gold,
    pos_x: row.pos_x,
    pos_y: row.pos_y,
    pos_z: row.pos_z,
    rotation_y: row.rotation_y,
    zone: row.zone,
    home_zone: row.home_zone ?? '',
    hearth_ready_at: Number(row.hearth_ready_at) || 0,
    appearance: [row.appear_skin, row.appear_hair_style, row.appear_hair_color, row.appear_top, row.appear_pants],
    starter_kit: Boolean(row.starter_kit),
    intro_seen: Boolean(row.intro_seen),
    guild_id: row.guild_id ?? '',
    guild_name: row.guild_name ?? '',
    skills,
    action_bar: row.action_bar ?? '',
  };

  const [inventory] = await ctx.db.query('SELECT slot, item_id, quantity, perk FROM inventory_items WHERE character_id = ? ORDER BY slot', [row.id]);
  const [equipment] = await ctx.db.query('SELECT slot, item_id, perk FROM equipment_items WHERE character_id = ?', [row.id]);
  const [quests] = await ctx.db.query('SELECT quest_id, status, progress FROM character_quests WHERE character_id = ? ORDER BY quest_id', [row.id]);
  const [chests] = await ctx.db.query('SELECT zone, chest_id FROM character_chests WHERE character_id = ? ORDER BY zone, chest_id', [row.id]);
  const [friends] = await ctx.db.query('SELECT c.name FROM character_friends f JOIN characters c ON c.id = f.friend_id WHERE f.character_id = ? ORDER BY c.name', [row.id]);
  const [mails] = await ctx.db.query('SELECT id, sender_name, subject, body, is_read FROM mails WHERE recipient_id = ? ORDER BY id DESC LIMIT ?', [row.id, MAIL_LIMIT]);

  record.inventory = inventory.map((entry) => ({ slot: entry.slot, item_id: entry.item_id, quantity: entry.quantity, perk: entry.perk ?? '' }));
  record.equipment = equipment.map((entry) => ({ slot: entry.slot, item_id: entry.item_id, perk: entry.perk ?? '' }));
  record.quests = quests.map((entry) => {
    let progress = [];
    try {
      const parsed = JSON.parse(entry.progress);
      if (Array.isArray(parsed)) progress = parsed;
    } catch {
      progress = [];
    }
    return { quest_id: entry.quest_id, status: entry.status, progress };
  });
  record.chests = chests.map((entry) => ({ zone: entry.zone, chest_id: entry.chest_id }));
  record.friends = friends.map((entry) => entry.name);
  record.mails = mails.map((entry) => ({ id: entry.id, sender_name: entry.sender_name, subject: entry.subject, body: entry.body, is_read: Boolean(entry.is_read) }));

  return record;
}

async function sendRecord(ctx, id, userId) {
  const record = await loadRecord(ctx, userId);
  if (!record) return ctx.notify(id, { type: 'admin-pl-result', ok: false, key: 'admin.pl.fail.unknownUser', params: {} });
  ctx.notify(id, { type: 'admin-pl-data', record, meta: buildMeta() });
}

function parsePerk(value, item, field) {
  if (value === null || value === undefined || value === '') return null;
  if (item?.type !== 'weapon') fail('admin.pl.fail.perkItem', { field });
  if (typeof value !== 'string' || !PERK_PATTERN.test(value)) fail('admin.pl.fail.perk', { field });
  return value;
}

function validateUser(input, current) {
  if (!input || typeof input !== 'object') fail('admin.pl.fail.data');
  const username = cleanText(input.username, USERNAME_MAX, 'username', { allowEmpty: false });
  const graphicsInput = input.graphics && typeof input.graphics === 'object' ? input.graphics : {};
  const graphics = {};
  for (const key of GRAPHICS_KEYS) graphics[key] = graphicsInput[key] === true;
  graphics.viewDistance = intIn(graphicsInput.viewDistance ?? 2, 0, 3, 'viewDistance');
  if (!TOUCH_MODES.includes(input.touch_controls)) fail('admin.pl.fail.data');

  return {
    username,
    audio_volume: intIn(input.audio_volume, 0, 100, 'audio_volume'),
    audio_ambient: intIn(input.audio_ambient, 0, 100, 'audio_ambient'),
    audio_music: intIn(input.audio_music, 0, 100, 'audio_music'),
    audio_muted: flag(input.audio_muted),
    auto_fullscreen: flag(input.auto_fullscreen),
    touch_controls: input.touch_controls,
    graphics: JSON.stringify(graphics),
    banned_until: parseDateTime(input.banned_until, 'banned_until'),
    ban_reason: cleanText(input.ban_reason, BAN_REASON_MAX, 'ban_reason') || null,
    changedName: username !== current.username,
  };
}

async function validateCharacter(ctx, record, input) {
  const name = cleanText(input.name, NAME_MAX, 'name', { allowEmpty: false });
  if (!/^[A-Za-z]+$/.test(name)) fail('admin.pl.fail.nameLetters');
  const oldName = record.character.name;
  if (name.toLowerCase() !== oldName.toLowerCase() && (ctx.isAdminName(name) || ctx.isAdminName(oldName))) fail('admin.pl.fail.adminName');

  let classId = null;
  if (input.class_id !== '' && input.class_id !== null && input.class_id !== undefined) {
    if (!isValidClass(input.class_id)) fail('admin.pl.fail.class');
    classId = input.class_id;
  }

  const zone = typeof input.zone === 'string' ? input.zone : '';
  if (!getZone(zone)) fail('admin.pl.fail.zone', { field: 'zone' });
  const homeZone = input.home_zone === '' || input.home_zone === null || input.home_zone === undefined ? null : input.home_zone;
  if (homeZone !== null && !getZone(homeZone)) fail('admin.pl.fail.zone', { field: 'home_zone' });

  const level = intIn(input.level, 1, MAX_LEVEL, 'level');
  const appearanceInput = Array.isArray(input.appearance) ? input.appearance : [];
  const appearance = APPEARANCE_LIMITS.map((limit, index) => intIn(appearanceInput[index] ?? 0, 0, limit - 1, `appearance.${index}`));

  let guildId = null;
  if (input.guild_id !== '' && input.guild_id !== null && input.guild_id !== undefined) {
    guildId = intIn(input.guild_id, 1, MAX_INT, 'guild_id');
    const [guilds] = await ctx.db.query('SELECT id FROM guilds WHERE id = ?', [guildId]);
    if (guilds.length === 0) fail('admin.pl.fail.guild');
  }

  const skillsInput = input.skills && typeof input.skills === 'object' ? input.skills : {};
  const skills = {};
  let spent = 0;
  for (const [skillId, skill] of Object.entries(SKILLS)) {
    const rank = intIn(skillsInput[skillId] ?? 0, 0, skill.max, `skill.${skillId}`);
    if (rank > 0) skills[skillId] = rank;
    spent += rank;
  }
  if (spent > totalSkillPoints(level)) fail('admin.pl.fail.skillPoints', { spent, max: totalSkillPoints(level) });

  const actionBar = cleanText(input.action_bar, ACTION_BAR_MAX, 'action_bar', { multiline: true });
  if (actionBar !== '') {
    try {
      JSON.parse(actionBar);
    } catch {
      fail('admin.pl.fail.json', { field: 'action_bar' });
    }
  }

  return {
    name,
    class_id: classId,
    level,
    xp: intIn(input.xp, 0, MAX_INT, 'xp'),
    gold: intIn(input.gold, 0, MAX_INT, 'gold'),
    pos_x: floatIn(input.pos_x, 'pos_x'),
    pos_y: floatIn(input.pos_y, 'pos_y'),
    pos_z: floatIn(input.pos_z, 'pos_z'),
    rotation_y: floatIn(input.rotation_y, 'rotation_y'),
    zone,
    home_zone: homeZone,
    hearth_ready_at: intIn(input.hearth_ready_at ?? 0, 0, Number.MAX_SAFE_INTEGER, 'hearth_ready_at'),
    appearance,
    starter_kit: flag(input.starter_kit),
    intro_seen: flag(input.intro_seen),
    guild_id: guildId,
    skills: Object.keys(skills).length > 0 ? JSON.stringify(skills) : null,
    action_bar: actionBar === '' ? null : actionBar,
  };
}

function validateEquipment(list) {
  if (!Array.isArray(list)) fail('admin.pl.fail.data');
  const seen = new Set();
  const rows = [];
  const equipment = {};

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') fail('admin.pl.fail.data');
    const slot = entry.slot;
    const item = typeof entry.item_id === 'string' ? getItem(entry.item_id) : null;
    if (!item) fail('admin.pl.fail.item', { item: String(entry.item_id ?? '') });
    if (seen.has(slot)) fail('admin.pl.fail.duplicateSlot', { slot: String(slot) });
    seen.add(slot);
    const isGear = EQUIPMENT_SLOTS.includes(slot) && item.slot === slot;
    const isBag = BAG_SLOTS.includes(slot) && item.type === 'bag';
    if (!isGear && !isBag) fail('admin.pl.fail.equipSlot', { item: item.id, slot: String(slot) });
    rows.push([slot, item.id, parsePerk(entry.perk, item, `equipment.${slot}`)]);
    equipment[slot] = item.id;
  }

  return { rows, equipment };
}

function validateInventory(list, equipment) {
  if (!Array.isArray(list)) fail('admin.pl.fail.data');
  const size = inventorySize(equipment);
  const seen = new Set();
  const rows = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') fail('admin.pl.fail.data');
    const item = typeof entry.item_id === 'string' ? getItem(entry.item_id) : null;
    if (!item) fail('admin.pl.fail.item', { item: String(entry.item_id ?? '') });
    const slot = intIn(entry.slot, 0, size - 1, 'inventory.slot');
    if (seen.has(slot)) fail('admin.pl.fail.duplicateSlot', { slot });
    seen.add(slot);
    const quantity = intIn(entry.quantity, 1, item.stackSize ?? 1, `inventory.${item.id}`);
    rows.push([slot, item.id, quantity, parsePerk(entry.perk, item, `inventory.${slot}`)]);
  }

  return rows;
}

function validateQuests(list) {
  if (!Array.isArray(list)) fail('admin.pl.fail.data');
  const seen = new Set();
  const rows = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') fail('admin.pl.fail.data');
    const quest = typeof entry.quest_id === 'string' ? getQuest(entry.quest_id) : null;
    if (!quest) fail('admin.pl.fail.quest', { quest: String(entry.quest_id ?? '') });
    if (seen.has(quest.id)) fail('admin.pl.fail.duplicateQuest', { quest: quest.id });
    seen.add(quest.id);
    if (!QUEST_STATUSES.includes(entry.status)) fail('admin.pl.fail.questStatus', { quest: quest.id });
    const stored = Array.isArray(entry.progress) ? entry.progress : [];
    const progress = quest.objectives.map((objective, index) => intIn(stored[index] ?? 0, 0, objective.count, `quest.${quest.id}`));
    rows.push([quest.id, entry.status, JSON.stringify(progress)]);
  }

  return rows;
}

function validateChests(list) {
  if (!Array.isArray(list)) fail('admin.pl.fail.data');
  const seen = new Set();
  const rows = [];

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') fail('admin.pl.fail.data');
    const zone = typeof entry.zone === 'string' ? entry.zone : '';
    if (!getZone(zone)) fail('admin.pl.fail.zone', { field: 'chest.zone' });
    const chestId = cleanText(entry.chest_id, 32, 'chest_id', { allowEmpty: false });
    const key = `${zone}|${chestId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push([zone, chestId]);
  }

  return rows;
}

async function validateFriends(ctx, list, ownId) {
  if (!Array.isArray(list)) fail('admin.pl.fail.data');
  const names = Array.from(new Set(list.map((name) => cleanText(name, NAME_MAX, 'friend', { allowEmpty: false }))));
  if (names.length === 0) return [];
  const [rows] = await ctx.db.query('SELECT id, name FROM characters WHERE name IN (?)', [names]);
  const found = new Map(rows.map((row) => [row.name.toLowerCase(), row.id]));
  const ids = [];
  for (const name of names) {
    const friendId = found.get(name.toLowerCase());
    if (!friendId) fail('admin.pl.fail.friend', { name });
    if (friendId === ownId) fail('admin.pl.fail.friendSelf');
    ids.push(friendId);
  }
  return ids;
}

function validateMails(list) {
  if (!Array.isArray(list)) fail('admin.pl.fail.data');
  return list.map((entry) => {
    if (!entry || typeof entry !== 'object') fail('admin.pl.fail.data');
    return {
      id: intIn(entry.id, 1, MAX_INT, 'mail.id'),
      subject: cleanText(entry.subject, MAIL_SUBJECT_MAX, 'mail.subject', { allowEmpty: false }),
      body: cleanText(entry.body, MAIL_BODY_MAX, 'mail.body', { multiline: true }),
      is_read: flag(entry.is_read),
    };
  });
}

function validatePassword(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length < PASSWORD_MIN) fail('admin.pl.fail.passwordShort', { min: PASSWORD_MIN });
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) fail('admin.pl.fail.passwordLong', { max: PASSWORD_MAX_BYTES });
  return value;
}

async function save(ctx, id, state, message) {
  const userId = Number.parseInt(message.userId, 10);
  const data = message.data;
  if (!Number.isInteger(userId) || userId < 1 || !data || typeof data !== 'object') fail('admin.pl.fail.data');

  const record = await loadRecord(ctx, userId);
  if (!record) fail('admin.pl.fail.unknownUser');

  const user = validateUser(data.user, record.user);
  const password = validatePassword(data.newPassword);
  const revokeSessions = data.revokeSessions === true || password !== null;

  let character = null;
  let equipment = null;
  let inventory = null;
  let quests = null;
  let chests = null;
  let friends = null;
  let mails = null;

  if (record.character) {
    character = await validateCharacter(ctx, record, data.character ?? {});
    equipment = validateEquipment(data.equipment);
    inventory = validateInventory(data.inventory, equipment.equipment);
    quests = validateQuests(data.quests);
    chests = validateChests(data.chests);
    friends = await validateFriends(ctx, data.friends, record.character.id);
    mails = validateMails(data.mails);
  }

  const passwordHash = password === null ? null : await bcrypt.hash(password, BCRYPT_COST);
  const characterId = record.character?.id ?? null;
  const adminName = state.characterName;

  const write = async () => {
    const connection = await ctx.db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        'UPDATE users SET username = ?, audio_volume = ?, audio_ambient = ?, audio_music = ?, audio_muted = ?, auto_fullscreen = ?, touch_controls = ?, graphics = ?, banned_until = ?, ban_reason = ? WHERE id = ?',
        [user.username, user.audio_volume, user.audio_ambient, user.audio_music, user.audio_muted, user.auto_fullscreen, user.touch_controls, user.graphics, user.banned_until, user.ban_reason, userId]
      );

      if (passwordHash !== null) await connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
      if (revokeSessions) await connection.query('DELETE FROM sessions WHERE user_id = ?', [userId]);

      if (character) {
        await connection.query(
          'UPDATE characters SET name = ?, class_id = ?, level = ?, xp = ?, gold = ?, pos_x = ?, pos_y = ?, pos_z = ?, rotation_y = ?, zone = ?, home_zone = ?, hearth_ready_at = ?, appear_skin = ?, appear_hair_style = ?, appear_hair_color = ?, appear_top = ?, appear_pants = ?, starter_kit = ?, intro_seen = ?, guild_id = ?, skills = ?, action_bar = ? WHERE id = ?',
          [
            character.name,
            character.class_id,
            character.level,
            character.xp,
            character.gold,
            character.pos_x,
            character.pos_y,
            character.pos_z,
            character.rotation_y,
            character.zone,
            character.home_zone,
            character.hearth_ready_at,
            ...character.appearance,
            character.starter_kit,
            character.intro_seen,
            character.guild_id,
            character.skills,
            character.action_bar,
            characterId,
          ]
        );

        const previousGuild = record.character.guild_id === '' ? null : record.character.guild_id;
        if (previousGuild !== null && previousGuild !== character.guild_id) {
          await connection.query(
            'UPDATE guilds g SET g.leader_id = (SELECT MIN(c.id) FROM characters c WHERE c.guild_id = g.id) WHERE g.id = ? AND g.leader_id = ?',
            [previousGuild, characterId]
          );
        }

        await connection.query('DELETE FROM inventory_items WHERE character_id = ?', [characterId]);
        if (inventory.length > 0) {
          await connection.query('INSERT INTO inventory_items (character_id, slot, item_id, quantity, perk) VALUES ?', [inventory.map((row) => [characterId, ...row])]);
        }

        await connection.query('DELETE FROM equipment_items WHERE character_id = ?', [characterId]);
        if (equipment.rows.length > 0) {
          await connection.query('INSERT INTO equipment_items (character_id, slot, item_id, perk) VALUES ?', [equipment.rows.map((row) => [characterId, ...row])]);
        }

        await connection.query('DELETE FROM character_quests WHERE character_id = ?', [characterId]);
        if (quests.length > 0) {
          await connection.query('INSERT INTO character_quests (character_id, quest_id, status, progress) VALUES ?', [quests.map((row) => [characterId, ...row])]);
        }

        await connection.query('DELETE FROM character_chests WHERE character_id = ?', [characterId]);
        if (chests.length > 0) {
          await connection.query('INSERT INTO character_chests (character_id, zone, chest_id) VALUES ?', [chests.map((row) => [characterId, ...row])]);
        }

        await connection.query('DELETE FROM character_friends WHERE character_id = ?', [characterId]);
        if (friends.length > 0) {
          await connection.query('INSERT INTO character_friends (character_id, friend_id) VALUES ?', [friends.map((friendId) => [characterId, friendId])]);
        }

        const keptIds = mails.map((mail) => mail.id);
        const shown = record.mails.map((mail) => mail.id);
        const removed = shown.filter((mailId) => !keptIds.includes(mailId));
        if (removed.length > 0) await connection.query('DELETE FROM mails WHERE recipient_id = ? AND id IN (?)', [characterId, removed]);
        for (const mail of mails) {
          if (!shown.includes(mail.id)) continue;
          await connection.query('UPDATE mails SET subject = ?, body = ?, is_read = ? WHERE id = ? AND recipient_id = ?', [mail.subject, mail.body, mail.is_read, mail.id, characterId]);
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  try {
    if (characterId !== null) {
      const wasOnline = onlineCharacterIds(ctx.players).has(characterId);
      if (wasOnline) {
        for (const [playerId, other] of ctx.players) {
          if (other.characterId === characterId) ctx.notify(playerId, { type: 'kicked' });
        }
      }
      await ctx.withCharacterLocked(characterId, write);
    } else {
      await write();
    }
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      if (/username/i.test(error.message)) fail('admin.pl.fail.usernameTaken');
      if (/name/i.test(error.message)) fail('admin.pl.fail.nameTaken');
    }
    throw error;
  }

  console.log(`[Admin] ${adminName} hat Account ${userId} (${record.user.username}) bearbeitet.`);
}

export async function handleAdminPlayer(ctx, id, state, message) {
  try {
    switch (message.type) {
      case 'admin-pl-search':
        return await search(ctx, id, message);

      case 'admin-pl-load': {
        const userId = Number.parseInt(message.userId, 10);
        if (!Number.isInteger(userId) || userId < 1) return;
        return await sendRecord(ctx, id, userId);
      }

      case 'admin-pl-save': {
        await save(ctx, id, state, message);
        ctx.notify(id, { type: 'admin-pl-result', ok: true, key: 'admin.pl.saved', params: {} });
        return await sendRecord(ctx, id, Number.parseInt(message.userId, 10));
      }
    }
  } catch (error) {
    if (error instanceof EditError) return ctx.notify(id, { type: 'admin-pl-result', ok: false, key: error.key, params: error.params });
    console.error('Fehler im Spielereditor:', error);
    ctx.notify(id, { type: 'admin-pl-result', ok: false, key: 'admin.pl.fail.server', params: {} });
  }
}
