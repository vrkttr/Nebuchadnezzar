import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { APPEARANCE_LIMITS, loadAppearance } from './appearance.js';
import { isValidClass } from './classes.js';
import { createCounter } from './rateLimit.js';

const USERNAME_MAX = 32;
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;
const NAME_MAX = 32;
const SESSION_DAYS = 30;
const BCRYPT_COST = 10;
const TEN_MINUTES = 10 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const APPEARANCE_KEYS = ['skin', 'hair_style', 'hair_color', 'top', 'pants'];

export const GRAPHICS_KEYS = ['shadows', 'lights', 'flicker', 'daynight', 'clouds', 'haze', 'puddles', 'wind', 'birds', 'insects', 'dust', 'debris', 'fire', 'smoke'];
const TOUCH_MODES = ['auto', 'on', 'off'];
const DUMMY_HASH = bcrypt.hashSync('sektor-sieben-dummy', BCRYPT_COST);

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function clientIp(request) {
  if (process.env.TRUST_PROXY === '1') {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  }
  return request.socket.remoteAddress ?? 'unknown';
}

function text(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function clampInt(value, min, max, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

export function normalizeGraphics(raw) {
  let parsed = {};
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (value && typeof value === 'object') parsed = value;
  } catch {
    parsed = {};
  }
  const graphics = {};
  for (const key of GRAPHICS_KEYS) graphics[key] = typeof parsed[key] === 'boolean' ? parsed[key] : true;
  graphics.viewDistance = clampInt(parsed.viewDistance, 0, 3, 2);
  return graphics;
}

export function readSettings(row) {
  return {
    volume: Number(row.audio_volume ?? 80),
    ambient: Number(row.audio_ambient ?? 100),
    music: Number(row.audio_music ?? 40),
    muted: Boolean(row.audio_muted),
    autoFullscreen: row.auto_fullscreen === undefined ? true : Boolean(row.auto_fullscreen),
    touchControls: TOUCH_MODES.includes(row.touch_controls) ? row.touch_controls : 'auto',
    graphics: normalizeGraphics(row.graphics),
  };
}

function parseSettings(message) {
  const source = message && typeof message === 'object' ? message : {};
  const graphicsSource = source.graphics && typeof source.graphics === 'object' ? source.graphics : {};
  const graphics = {};
  for (const key of GRAPHICS_KEYS) graphics[key] = graphicsSource[key] === true;
  graphics.viewDistance = clampInt(graphicsSource.viewDistance, 0, 3, 2);

  return {
    volume: clampInt(source.volume, 0, 100, 80),
    ambient: clampInt(source.ambient, 0, 100, 100),
    music: clampInt(source.music, 0, 100, 40),
    muted: source.muted === true,
    autoFullscreen: source.autoFullscreen === true,
    touchControls: TOUCH_MODES.includes(source.touchControls) ? source.touchControls : 'auto',
    graphics,
  };
}

function parseAppearance(source) {
  const input = source && typeof source === 'object' ? source : {};
  return APPEARANCE_KEYS.map((key, index) => {
    const value = Number(input[key]);
    return Number.isInteger(value) && value >= 0 && value < APPEARANCE_LIMITS[index] ? value : 0;
  });
}

const PERMANENT_BAN = '9999-12-31 23:59:59';
const MAX_BAN_HOURS = 24 * 365 * 5;
const MAX_BAN_REASON = 200;
const BAN_LIST_LIMIT = 100;

function formatUntil(date) {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function createAccounts({ db, enterWorld }) {
  const loginIpFailures = createCounter(20, TEN_MINUTES);
  const loginUserFailures = createCounter(8, TEN_MINUTES);
  const registerIp = createCounter(5, HOUR);
  const resumeIpFailures = createCounter(30, TEN_MINUTES);
  const passwordFailures = createCounter(5, TEN_MINUTES);
  const characterCreates = createCounter(20, HOUR);

  function send(socket, message) {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }

  function result(socket, action, ok, key = null, params = null) {
    send(socket, { type: 'menu-result', action, ok, ...(key ? { key } : {}), ...(params ? { params } : {}) });
  }

  function fail(socket, action, key, params = null) {
    result(socket, action, false, key, params);
  }

  async function accountPayload(userId) {
    const [userRows] = await db.query(
      'SELECT username, audio_volume, audio_ambient, audio_music, audio_muted, auto_fullscreen, touch_controls, graphics FROM users WHERE id = ?',
      [userId]
    );
    const [characterRows] = await db.query(
      'SELECT name, class_id, level, appear_skin, appear_hair_style, appear_hair_color, appear_top, appear_pants FROM characters WHERE user_id = ?',
      [userId]
    );
    const user = userRows[0];
    const row = characterRows[0];

    return {
      type: 'account',
      username: user.username,
      character: row
        ? { name: row.name, classId: isValidClass(row.class_id) ? row.class_id : null, level: row.level, appearance: loadAppearance(row) }
        : null,
      settings: readSettings(user),
    };
  }

  async function sendAccount(socket, extra = {}) {
    send(socket, { ...(await accountPayload(socket.userId)), ...extra });
  }

  async function activeBan(userId) {
    const [rows] = await db.query('SELECT UNIX_TIMESTAMP(banned_until) AS until, ban_reason FROM users WHERE id = ? AND banned_until IS NOT NULL AND banned_until > NOW()', [userId]);
    if (rows.length === 0) return null;
    const until = Number(rows[0].until);
    const permanent = !Number.isFinite(until) || until >= 253402300000;
    return { permanent, until: permanent ? null : formatUntil(new Date(until * 1000)), reason: rows[0].ban_reason || '-' };
  }

  function failBanned(socket, action, ban) {
    if (ban.permanent) return fail(socket, action, 'auth.error.bannedPermanent', { reason: ban.reason });
    return fail(socket, action, 'auth.error.bannedUntil', { until: ban.until, reason: ban.reason });
  }

  async function startSession(socket, user) {
    const token = randomBytes(32).toString('hex');
    await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))', [
      hashToken(token),
      user.id,
      SESSION_DAYS,
    ]);
    socket.userId = user.id;
    socket.tokenHash = hashToken(token);
    await sendAccount(socket, { token });
  }

  function requireUser(socket, action) {
    if (socket.userId) return true;
    fail(socket, action, 'menu.error.login');
    return false;
  }

  function requireIdle(socket, action) {
    if (!socket.userId && !socket.inWorld) return true;
    fail(socket, action, 'menu.error.alreadyLoggedIn');
    return false;
  }

  async function login(socket, message) {
    if (!requireIdle(socket, 'login')) return;
    const username = text(message.username, 128).trim();
    const password = text(message.password, 256);
    if (username === '' || password === '') return fail(socket, 'login', 'login.error.missing');

    const userKey = username.toLowerCase();
    if (loginIpFailures.blocked(socket.ip) || loginUserFailures.blocked(userKey)) return fail(socket, 'login', 'auth.error.tooMany');

    const [rows] = await db.query('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
    const user = rows[0];
    const matches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !matches) {
      loginIpFailures.add(socket.ip);
      loginUserFailures.add(userKey);
      return fail(socket, 'login', 'login.error.invalid');
    }

    loginUserFailures.clear(userKey);
    const ban = await activeBan(user.id);
    if (ban) return failBanned(socket, 'login', ban);
    await startSession(socket, user);
    result(socket, 'login', true);
  }

  async function register(socket, message) {
    if (!requireIdle(socket, 'register')) return;
    const username = text(message.username, 128).trim();
    const password = text(message.password, 256);
    const confirm = text(message.confirm, 256);

    if (username === '' || password === '') return fail(socket, 'register', 'register.error.missing');
    if (username.length > USERNAME_MAX) return fail(socket, 'register', 'register.error.usernameLength', { max: USERNAME_MAX });
    if (/[\u0000-\u001f\u007f]/.test(username)) return fail(socket, 'register', 'register.error.usernameChars');
    if (password.length < PASSWORD_MIN) return fail(socket, 'register', 'register.error.passwordLength', { min: PASSWORD_MIN });
    if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) return fail(socket, 'register', 'register.error.passwordTooLong', { max: PASSWORD_MAX_BYTES });
    if (password !== confirm) return fail(socket, 'register', 'register.error.mismatch');
    if (registerIp.blocked(socket.ip)) return fail(socket, 'register', 'auth.error.tooMany');

    registerIp.add(socket.ip);

    const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) return fail(socket, 'register', 'register.error.taken');

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    let insertId;
    try {
      [{ insertId }] = await db.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, passwordHash]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return fail(socket, 'register', 'register.error.taken');
      throw error;
    }

    await startSession(socket, { id: insertId });
    result(socket, 'register', true);
  }

  async function resume(socket, message) {
    if (!requireIdle(socket, 'resume')) return;
    const token = text(message.token, 128);
    if (!/^[0-9a-f]{64}$/.test(token) || resumeIpFailures.blocked(socket.ip)) {
      resumeIpFailures.add(socket.ip);
      return fail(socket, 'resume', 'auth.error.session');
    }

    const tokenHash = hashToken(token);
    const [rows] = await db.query('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > NOW()', [tokenHash]);
    if (rows.length === 0) {
      resumeIpFailures.add(socket.ip);
      return fail(socket, 'resume', 'auth.error.session');
    }

    const ban = await activeBan(rows[0].user_id);
    if (ban) {
      await db.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
      return failBanned(socket, 'resume', ban);
    }

    socket.userId = rows[0].user_id;
    socket.tokenHash = tokenHash;
    await sendAccount(socket);
    result(socket, 'resume', true);
  }

  async function logout(socket) {
    if (socket.tokenHash) await db.query('DELETE FROM sessions WHERE token_hash = ?', [socket.tokenHash]);
    socket.userId = null;
    socket.tokenHash = null;
    result(socket, 'logout', true);
    if (socket.inWorld) socket.close(1000, 'logout');
  }

  async function createCharacter(socket, message) {
    if (!requireUser(socket, 'character-create')) return;
    const name = text(message.name, 128).trim();
    if (name === '') return fail(socket, 'character-create', 'character.error.missing');
    if (name.length > NAME_MAX) return fail(socket, 'character-create', 'character.error.length', { max: NAME_MAX });
    if (!/^[A-Za-z]+$/.test(name)) return fail(socket, 'character-create', 'character.error.letters');
    if (!isValidClass(message.classId)) return fail(socket, 'character-create', 'class.error.missing');

    const limitKey = String(socket.userId);
    if (characterCreates.blocked(limitKey)) return fail(socket, 'character-create', 'auth.error.tooMany');
    characterCreates.add(limitKey);

    const [own] = await db.query('SELECT id FROM characters WHERE user_id = ?', [socket.userId]);
    if (own.length > 0) return fail(socket, 'character-create', 'character.error.exists');

    const [taken] = await db.query('SELECT id FROM characters WHERE name = ?', [name]);
    if (taken.length > 0) return fail(socket, 'character-create', 'character.error.taken');

    const appearance = parseAppearance(message.appearance);
    try {
      await db.query(
        'INSERT INTO characters (user_id, name, class_id, appear_skin, appear_hair_style, appear_hair_color, appear_top, appear_pants) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [socket.userId, name, message.classId, ...appearance]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return fail(socket, 'character-create', 'character.error.taken');
      throw error;
    }

    await sendAccount(socket);
    result(socket, 'character-create', true);
  }

  async function setClass(socket, message) {
    if (!requireUser(socket, 'class-set')) return;
    if (!isValidClass(message.classId)) return fail(socket, 'class-set', 'class.error.missing');

    const [outcome] = await db.query('UPDATE characters SET class_id = ? WHERE user_id = ? AND class_id IS NULL', [message.classId, socket.userId]);
    if (!outcome.affectedRows) return fail(socket, 'class-set', 'class.error.locked');

    await sendAccount(socket);
    result(socket, 'class-set', true);
  }

  async function saveSettings(socket, message) {
    if (!requireUser(socket, 'settings-save')) return;
    const settings = parseSettings(message.settings);

    await db.query(
      'UPDATE users SET audio_volume = ?, audio_ambient = ?, audio_music = ?, audio_muted = ?, auto_fullscreen = ?, touch_controls = ?, graphics = ? WHERE id = ?',
      [
        settings.volume,
        settings.ambient,
        settings.music,
        settings.muted ? 1 : 0,
        settings.autoFullscreen ? 1 : 0,
        settings.touchControls,
        JSON.stringify(settings.graphics),
        socket.userId,
      ]
    );

    send(socket, { type: 'settings', settings });
    result(socket, 'settings-save', true);
  }

  async function changePassword(socket, message) {
    if (!requireUser(socket, 'password-change')) return;
    const current = text(message.current, 256);
    const next = text(message.next, 256);
    const confirm = text(message.confirm, 256);

    if (current === '' || next === '') return fail(socket, 'password-change', 'register.error.missing');
    if (next.length < PASSWORD_MIN) return fail(socket, 'password-change', 'register.error.passwordLength', { min: PASSWORD_MIN });
    if (Buffer.byteLength(next) > PASSWORD_MAX_BYTES) return fail(socket, 'password-change', 'register.error.passwordTooLong', { max: PASSWORD_MAX_BYTES });
    if (next !== confirm) return fail(socket, 'password-change', 'register.error.mismatch');

    const limitKey = String(socket.userId);
    if (passwordFailures.blocked(limitKey)) return fail(socket, 'password-change', 'auth.error.tooMany');

    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [socket.userId]);
    if (rows.length === 0 || !(await bcrypt.compare(current, rows[0].password_hash))) {
      passwordFailures.add(limitKey);
      return fail(socket, 'password-change', 'password.error.wrongCurrent');
    }

    passwordFailures.clear(limitKey);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(next, BCRYPT_COST), socket.userId]);
    await db.query('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', [socket.userId, socket.tokenHash ?? '']);
    result(socket, 'password-change', true);
  }

  async function enter(socket) {
    if (!requireUser(socket, 'enter-world') || socket.inWorld) return;

    const ban = await activeBan(socket.userId);
    if (ban) return failBanned(socket, 'enter-world', ban);

    const [rows] = await db.query('SELECT id, class_id FROM characters WHERE user_id = ?', [socket.userId]);
    if (rows.length === 0) return fail(socket, 'enter-world', 'character.error.none');
    if (!isValidClass(rows[0].class_id)) return fail(socket, 'enter-world', 'class.error.missing');

    socket.inWorld = true;
    let entered = false;
    try {
      entered = await enterWorld(socket, rows[0].id);
    } finally {
      if (!entered) socket.inWorld = false;
    }
    if (!entered) fail(socket, 'enter-world', 'menu.error.enterFailed');
  }

  const handlers = {
    'auth-login': login,
    'auth-register': register,
    'auth-resume': resume,
    'auth-logout': logout,
    'character-create': createCharacter,
    'class-set': setClass,
    'settings-save': saveSettings,
    'password-change': changePassword,
    'enter-world': enter,
  };

  return {
    attach(socket, request) {
      socket.ip = clientIp(request);
      socket.userId = null;
      socket.tokenHash = null;
      socket.inWorld = false;
      socket.menuBusy = false;
    },
    consumes(type) {
      return typeof type === 'string' && Object.hasOwn(handlers, type);
    },
    async handle(socket, message) {
      const action = message.type.replace(/^auth-/, '');
      if (socket.menuBusy) return fail(socket, action, 'menu.error.busy');
      socket.menuBusy = true;
      try {
        await handlers[message.type](socket, message);
      } catch (error) {
        console.error(`Fehler bei ${message.type}:`, error);
        fail(socket, action, 'menu.error.server');
      } finally {
        socket.menuBusy = false;
      }
    },
    async ban(characterName, hours, reason) {
      const [rows] = await db.query('SELECT user_id, name FROM characters WHERE name = ?', [characterName]);
      if (rows.length === 0) return null;

      const duration = Number.isFinite(hours) && hours > 0 ? Math.min(Math.floor(hours), MAX_BAN_HOURS) : 0;
      const cleanReason = text(reason, MAX_BAN_REASON).trim() || null;
      if (duration > 0) {
        await db.query('UPDATE users SET banned_until = DATE_ADD(NOW(), INTERVAL ? HOUR), ban_reason = ? WHERE id = ?', [duration, cleanReason, rows[0].user_id]);
      } else {
        await db.query('UPDATE users SET banned_until = ?, ban_reason = ? WHERE id = ?', [PERMANENT_BAN, cleanReason, rows[0].user_id]);
      }
      await db.query('DELETE FROM sessions WHERE user_id = ?', [rows[0].user_id]);
      const ban = await activeBan(rows[0].user_id);
      return { name: rows[0].name, userId: rows[0].user_id, until: ban?.until ?? null };
    },
    async unban(characterName) {
      const [rows] = await db.query('SELECT user_id, name FROM characters WHERE name = ?', [characterName]);
      if (rows.length === 0) return null;
      await db.query('UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE id = ?', [rows[0].user_id]);
      return { name: rows[0].name };
    },
    async listBans() {
      const [rows] = await db.query(
        'SELECT c.name AS name, UNIX_TIMESTAMP(u.banned_until) AS until, u.ban_reason AS reason FROM users u JOIN characters c ON c.user_id = u.id WHERE u.banned_until IS NOT NULL AND u.banned_until > NOW() ORDER BY u.banned_until DESC LIMIT ?',
        [BAN_LIST_LIMIT]
      );
      return rows.map((row) => {
        const until = Number(row.until);
        const permanent = !Number.isFinite(until) || until >= 253402300000;
        return { name: row.name, permanent, until: permanent ? null : formatUntil(new Date(until * 1000)), reason: row.reason ?? '' };
      });
    },
    async cleanup() {
      await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
    },
  };
}
