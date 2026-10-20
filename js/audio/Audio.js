const SOUND_BASE_PATH = 'assets/audio/';
const SOUND_EXTENSION = 'ogg';
const SETTINGS_KEY = 'nebu.audio';
const DEFAULT_SETTINGS = { volume: 0.8, ambient: 1, muted: false };
const AMBIENT_SOUND = 'ambient_wind';

const SOUND_DEFINITIONS = {
  hit: { volume: 0.6, variation: 0.08 },
  ability_power_strike: { volume: 0.8, variation: 0.05 },
  player_hurt: { volume: 0.7, variation: 0.06 },
  enemy_death: { volume: 0.7, variation: 0.06 },
  player_death: { volume: 0.8 },
  level_up: { volume: 0.7 },
  gold: { volume: 0.5, variation: 0.05 },
  loot_open: { volume: 0.5, variation: 0.05 },
  item_pickup: { volume: 0.5, variation: 0.06 },
  quest_accept: { volume: 0.5 },
  quest_complete: { volume: 0.6 },
  error: { volume: 0.4 },
  target_select: { volume: 0.4 },
  ambient_wind: { volume: 0.25, loop: true },
};

const EVENT_SOUNDS = {
  kill: 'enemy_death',
  gold: 'gold',
  levelup: 'level_up',
  item: 'item_pickup',
  equipped: 'item_pickup',
  unequipped: 'item_pickup',
  'item-used': 'item_pickup',
  'item-failed': 'error',
  'ability-failed': 'error',
  'inventory-full': 'error',
  'loot-failed': 'error',
  'quest-accepted': 'quest_accept',
  'quest-ready': 'quest_accept',
  'quest-completed': 'quest_complete',
  purchased: 'gold',
  sold: 'gold',
  'quest-failed': 'error',
  'npc-failed': 'error',
  'vendor-failed': 'error',
};

function clampUnit(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function loadSettings() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SETTINGS_KEY));

    return {
      volume: clampUnit(stored?.volume, DEFAULT_SETTINGS.volume),
      ambient: clampUnit(stored?.ambient, DEFAULT_SETTINGS.ambient),
      muted: Boolean(stored?.muted),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

function createSilentAudio() {
  const settings = loadSettings();

  return {
    play() {},
    playEvent() {},
    playDamage() {},
    startAmbient() {},
    getSettings: () => ({ ...settings }),
    setVolume(value) {
      settings.volume = clampUnit(value, settings.volume);
      saveSettings(settings);
    },
    setAmbientVolume(value) {
      settings.ambient = clampUnit(value, settings.ambient);
      saveSettings(settings);
    },
    setMuted(value) {
      settings.muted = Boolean(value);
      saveSettings(settings);
    },
  };
}

export function createAudio() {
  const Howl = window.Howl;

  if (!Howl) {
    console.warn('[Audio] Howler nicht geladen, Audio deaktiviert');
    return createSilentAudio();
  }

  const settings = loadSettings();

  window.Howler.volume(settings.volume);
  window.Howler.mute(settings.muted);

  const sounds = new Map();

  for (const [name, definition] of Object.entries(SOUND_DEFINITIONS)) {
    sounds.set(
      name,
      new Howl({
        src: [`${SOUND_BASE_PATH}${name}.${SOUND_EXTENSION}`],
        volume: name === AMBIENT_SOUND ? definition.volume * settings.ambient : definition.volume,
        loop: Boolean(definition.loop),
        preload: true,
      })
    );
  }

  function play(name) {
    const sound = sounds.get(name);
    if (!sound) return;

    const id = sound.play();
    const variation = SOUND_DEFINITIONS[name].variation;

    if (variation) {
      sound.rate(1 + (Math.random() * 2 - 1) * variation, id);
    }
  }

  function playEvent(event) {
    const name = EVENT_SOUNDS[event.kind];
    if (name) play(name);
  }

  function playDamage(message, ownPlayerId) {
    if (!ownPlayerId) return;

    if (message.targetType === 'enemy' && message.attackerId === ownPlayerId) {
      play(message.abilityId ? `ability_${message.abilityId}` : 'hit');
    } else if (message.targetType === 'player' && message.targetId === ownPlayerId) {
      play('player_hurt');
    }
  }

  function startAmbient() {
    const ambient = sounds.get(AMBIENT_SOUND);
    if (ambient && !ambient.playing()) {
      ambient.play();
    }
  }

  function setVolume(value) {
    settings.volume = clampUnit(value, settings.volume);
    window.Howler.volume(settings.volume);
    saveSettings(settings);
  }

  function setAmbientVolume(value) {
    settings.ambient = clampUnit(value, settings.ambient);
    sounds.get(AMBIENT_SOUND).volume(SOUND_DEFINITIONS[AMBIENT_SOUND].volume * settings.ambient);
    saveSettings(settings);
  }

  function setMuted(value) {
    settings.muted = Boolean(value);
    window.Howler.mute(settings.muted);
    saveSettings(settings);
  }

  return {
    play,
    playEvent,
    playDamage,
    startAmbient,
    getSettings: () => ({ ...settings }),
    setVolume,
    setAmbientVolume,
    setMuted,
  };
}
