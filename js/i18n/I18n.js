export const SUPPORTED_LANGUAGES = [
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'English' },
];
const SUPPORTED = SUPPORTED_LANGUAGES.map((entry) => entry.code);
const DEFAULT_LANGUAGE = 'de';
const COOKIE_NAME = 'lang';
const LOCALE_TAGS = { de: 'de-DE', en: 'en-US' };

const VERSION = new URL(import.meta.url).searchParams.get('v') ?? '';

const store = (globalThis.__sektorI18n ??= { language: DEFAULT_LANGUAGE, messages: {} });

function readCookie() {
  try {
    const entry = document.cookie.split('; ').find((part) => part.startsWith(`${COOKIE_NAME}=`));
    return entry ? decodeURIComponent(entry.slice(COOKIE_NAME.length + 1)) : null;
  } catch {
    return null;
  }
}

export function detectLanguage() {
  const stored = readCookie();
  if (stored && SUPPORTED.includes(stored)) return stored;

  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = String(tag ?? '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  }

  return DEFAULT_LANGUAGE;
}

async function loadMessages(code) {
  const query = VERSION ? `?v=${VERSION}` : '';

  try {
    const response = await fetch(`assets/locales/${code}.json${query}`);
    return response.ok ? await response.json() : {};
  } catch {
    return {};
  }
}

export async function initI18n() {
  store.language = detectLanguage();
  const language = store.language;
  const [fallback, selected] = await Promise.all([
    loadMessages(DEFAULT_LANGUAGE),
    language === DEFAULT_LANGUAGE ? Promise.resolve({}) : loadMessages(language),
  ]);
  store.messages = { ...fallback, ...selected };
  document.documentElement.lang = language;
  document.title = t('app.title');
  return language;
}

export function setLanguage(code) {
  if (!SUPPORTED.includes(code)) return;
  try {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    return;
  }
}

export function getLanguage() {
  return store.language;
}

export function has(key) {
  return Object.hasOwn(store.messages, key);
}

export function t(key, params) {
  const value = store.messages[key];
  let text = typeof value === 'string' ? value : key;

  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(replacement));
    }
  }

  return text;
}

export function tOr(keys, fallback) {
  for (const key of keys) {
    if (has(key)) return t(key);
  }
  return fallback;
}

export function tList(key) {
  const value = store.messages[key];
  return Array.isArray(value) ? value : [];
}

export function formatNumber(value, options) {
  return new Intl.NumberFormat(LOCALE_TAGS[store.language] ?? LOCALE_TAGS[DEFAULT_LANGUAGE], options).format(value);
}

export function applyDom(root = document) {
  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const attribute of ['title', 'placeholder', 'alt', 'aria-label']) {
    for (const element of root.querySelectorAll(`[data-i18n-${attribute}]`)) {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    }
  }
}
