const SOUND_BASE_PATH = 'assets/audio/';
const SOUND_EXTENSION = 'ogg';
const DEFAULT_SETTINGS = { volume: 0.8, ambient: 1, muted: false };
const AMBIENT_LOOPS = { ambient_wind: 0.2, ambient_birds: 0.09 };
const MAX_HEARING_DISTANCE = 32;
const FIRE_SOUND = 'fire_loop';
const FIRE_VOLUME = 0.3;
const NPC_HEARING_DISTANCE = 16;
const READY_TIMEOUT = 8000;
const INDOOR_AMBIENT = 0.2;
const FAR_SOUND_INTERVAL = [28, 70];
const NPC_IDLE_INTERVAL = [7, 18];

const SOUND_DEFINITIONS = {
  hit: { volume: 0.37, variation: 0.08 },
  hit_blunt: { volume: 0.43, variation: 0.08 },
  hit_blade: { volume: 0.43, variation: 0.08 },
  hit_fist: { volume: 0.37, variation: 0.08 },
  swing_blunt: { volume: 0.31, variation: 0.1 },
  swing_blade: { volume: 0.31, variation: 0.1 },
  swing_fist: { volume: 0.25, variation: 0.1 },
  ability_power_strike: { volume: 0.5, variation: 0.05 },
  player_hurt: { volume: 0.43, variation: 0.06 },
  enemy_death: { volume: 0.43, variation: 0.06 },
  enemy_attack: { volume: 0.37, variation: 0.08 },
  enemy_grunt_raider: { volume: 0.37, variation: 0.1 },
  enemy_grunt_scavenger: { volume: 0.37, variation: 0.1 },
  enemy_grunt_marauder: { volume: 0.43, variation: 0.1 },
  player_death: { volume: 0.5 },
  level_up: { volume: 0.43 },
  gold: { volume: 0.31, variation: 0.05 },
  loot_open: { volume: 0.31, variation: 0.05 },
  item_pickup: { volume: 0.31, variation: 0.06 },
  equip: { volume: 0.31, variation: 0.05 },
  bag_move: { volume: 0.28, variation: 0.08 },
  quest_accept: { volume: 0.31 },
  quest_complete: { volume: 0.37 },
  error: { volume: 0.25 },
  target_select: { volume: 0.25 },
  ui_click: { volume: 0.22, variation: 0.04 },
  ui_open: { volume: 0.22, variation: 0.04 },
  gunshot_usp: { volume: 0.34, variation: 0.05 },
  gunshot_ak: { volume: 0.46, variation: 0.05 },
  gun_dry: { volume: 0.28, variation: 0.04 },
  hit_bullet: { volume: 0.3, variation: 0.08 },
  step_1: { volume: 0.26, variation: 0.1 },
  step_2: { volume: 0.26, variation: 0.1 },
  step_3: { volume: 0.26, variation: 0.1 },
  step_4: { volume: 0.26, variation: 0.1 },
  step_5: { volume: 0.26, variation: 0.1 },
  step_6: { volume: 0.26, variation: 0.1 },
  land: { volume: 0.22, variation: 0.06 },
  jump: { volume: 0.16, variation: 0.06 },
  npc_streuner_idle: { volume: 0.34, variation: 0.05 },
  npc_streuner_cough: { volume: 0.31, variation: 0.05 },
  npc_streuner_greet: { volume: 0.43, variation: 0.03 },
  npc_haendler_idle: { volume: 0.31, variation: 0.05 },
  npc_haendler_greet: { volume: 0.43, variation: 0.03 },
  distant_creak: { volume: 0.14, variation: 0.1 },
  distant_clang: { volume: 0.12, variation: 0.1 },
  ambient_wind: { volume: AMBIENT_LOOPS.ambient_wind, loop: true },
  ambient_birds: { volume: AMBIENT_LOOPS.ambient_birds, loop: true },
  fire_loop: { volume: 0, loop: true },
};

const SOUND_GROUPS = {
  step: ['step_1', 'step_2', 'step_3', 'step_4', 'step_5', 'step_6'],
  far: ['distant_creak', 'distant_clang'],
  npc_streuner_idle: ['npc_streuner_idle', 'npc_streuner_cough'],
  npc_haendler_idle: ['npc_haendler_idle'],
};

const EVENT_SOUNDS = {
  kill: 'enemy_death',
  gold: 'gold',
  levelup: 'level_up',
  item: 'item_pickup',
  equipped: 'equip',
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

const WEAPON_FAMILY = { machete: 'blade', rusty_pipe: 'blunt' };
const WEAPON_SHOT = { usp_s: 'gunshot_usp', ak47: 'gunshot_ak' };

function clampUnit(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function randomBetween([min, max]) {
  return min + Math.random() * (max - min);
}

function createSilentAudio() {
  const noop = () => {};
  return {
    play: noop,
    playAt: noop,
    playEvent: noop,
    playDamage: noop,
    playGroup: noop,
    startAmbient: noop,
    bindUi: noop,
    setListener: noop,
    setEmitters: noop,
    setNpcSources: noop,
    update: noop,
    applySettings: noop,
    weaponFamily: () => 'fist',
    shotSound: () => null,
    setIndoor: noop,
    ready: () => Promise.resolve(),
  };
}

export function createAudio() {
  const Howl = window.Howl;

  if (!Howl) {
    console.warn('[Audio] Howler nicht geladen, Audio deaktiviert');
    return createSilentAudio();
  }

  const settings = { ...DEFAULT_SETTINGS };
  window.Howler.volume(settings.volume);
  window.Howler.mute(settings.muted);

  const sounds = new Map();
  let pendingLoads = Object.keys(SOUND_DEFINITIONS).length;
  const readyWaiters = [];
  let indoor = false;

  function finishLoad() {
    pendingLoads -= 1;
    if (pendingLoads <= 0) readyWaiters.splice(0).forEach((resolve) => resolve());
  }

  for (const [name, definition] of Object.entries(SOUND_DEFINITIONS)) {
    sounds.set(
      name,
      new Howl({
        src: [`${SOUND_BASE_PATH}${name}.${SOUND_EXTENSION}`],
        volume: definition.volume,
        loop: Boolean(definition.loop),
        preload: true,
        onload: finishLoad,
        onloaderror: finishLoad,
      })
    );
  }

  function ready(timeout = READY_TIMEOUT) {
    if (pendingLoads <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      readyWaiters.push(resolve);
      setTimeout(resolve, timeout);
    });
  }

  function setIndoor(value) {
    indoor = Boolean(value);
    applyAmbientVolume();
  }

  const listener = { x: 0, z: 0, forwardX: 0, forwardZ: -1 };
  let emitters = [];
  let npcSources = [];
  const npcTimers = new Map();
  let farTimer = randomBetween(FAR_SOUND_INTERVAL);
  let fireId = null;

  const lastGroupIndex = new Map();

  function resolve(name) {
    const group = SOUND_GROUPS[name];
    if (!group) return name;

    let index = Math.floor(Math.random() * group.length);
    if (group.length > 1 && index === lastGroupIndex.get(name)) index = (index + 1) % group.length;
    lastGroupIndex.set(name, index);
    return group[index];
  }

  function play(name, options = {}) {
    const resolved = resolve(name);
    const sound = sounds.get(resolved);
    if (!sound) return;

    const definition = SOUND_DEFINITIONS[resolved];
    const id = sound.play();
    const variation = definition.variation;

    if (variation) sound.rate(1 + (Math.random() * 2 - 1) * variation, id);
    if (options.volume !== undefined) sound.volume(definition.volume * options.volume, id);
    if (options.pan !== undefined) sound.stereo(options.pan, id);
  }

  function spatial(x, z) {
    const dx = x - listener.x;
    const dz = z - listener.z;
    const distance = Math.hypot(dx, dz);
    if (distance > MAX_HEARING_DISTANCE) return null;

    const falloff = (1 - distance / MAX_HEARING_DISTANCE) ** 1.6;
    const right = distance > 0.01 ? (-dx * listener.forwardZ + dz * listener.forwardX) / distance : 0;
    return { volume: falloff, pan: Math.max(-0.9, Math.min(0.9, right * 0.8)) };
  }

  function playAt(name, x, z, volume = 1) {
    const placement = spatial(x, z);
    if (placement) play(name, { volume: placement.volume * volume, pan: placement.pan });
  }

  function shotSound(weaponId) {
    return WEAPON_SHOT[weaponId] ?? null;
  }

  function playEvent(event) {
    if (event.kind === 'ability-failed' && event.reason === 'no-ammo') {
      play('gun_dry');
      return;
    }
    const name = EVENT_SOUNDS[event.kind];
    if (name) play(name);
  }

  function weaponFamily(weaponId) {
    return WEAPON_FAMILY[weaponId] ?? 'fist';
  }

  function playDamage(message, ownPlayerId) {
    if (!ownPlayerId) return;

    if (message.targetType === 'enemy' && message.attackerId === ownPlayerId) {
      if (message.abilityId) play(`ability_${message.abilityId}`);
    } else if (message.targetType === 'player' && message.targetId === ownPlayerId) {
      play('player_hurt');
    }
  }

  function startAmbient() {
    for (const name of Object.keys(AMBIENT_LOOPS)) {
      const sound = sounds.get(name);
      if (sound && !sound.playing()) sound.play();
    }
    applyAmbientVolume();
  }

  function applyAmbientVolume() {
    for (const [name, base] of Object.entries(AMBIENT_LOOPS)) sounds.get(name).volume(base * settings.ambient * (indoor ? INDOOR_AMBIENT : 1));
  }

  function applySettings(next) {
    settings.volume = clampUnit(next?.volume, settings.volume);
    settings.ambient = clampUnit(next?.ambient, settings.ambient);
    settings.muted = Boolean(next?.muted);
    window.Howler.volume(settings.volume);
    window.Howler.mute(settings.muted);
    applyAmbientVolume();
  }

  function setListener(x, z, forwardX, forwardZ) {
    listener.x = x;
    listener.z = z;
    listener.forwardX = forwardX;
    listener.forwardZ = forwardZ;
  }

  function setEmitters(list) {
    emitters = list;
  }

  function setNpcSources(list) {
    npcSources = list;
  }

  function updateFire() {
    const fire = sounds.get(FIRE_SOUND);
    let best = null;

    for (const emitter of emitters) {
      const placement = spatial(emitter.x, emitter.z);
      if (placement && (!best || placement.volume > best.volume)) best = placement;
    }

    if (!best) {
      if (fireId !== null) {
        fire.pause(fireId);
        fireId = null;
      }
      return;
    }

    if (fireId === null) fireId = fire.play();
    fire.volume(FIRE_VOLUME * best.volume * settings.ambient, fireId);
    fire.stereo(best.pan, fireId);
  }

  function updateNpcs(delta) {
    for (const npc of npcSources) {
      const sound = `npc_${npc.npcId}_idle`;
      if (!SOUND_GROUPS[sound]) continue;
      if (Math.hypot(npc.x - listener.x, npc.z - listener.z) > NPC_HEARING_DISTANCE) continue;

      const remaining = (npcTimers.get(npc.npcId) ?? randomBetween([2, 6])) - delta;
      if (remaining <= 0) {
        playAt(sound, npc.x, npc.z);
        npcTimers.set(npc.npcId, randomBetween(NPC_IDLE_INTERVAL));
      } else {
        npcTimers.set(npc.npcId, remaining);
      }
    }
  }

  function update(delta) {
    updateFire();
    updateNpcs(delta);

    farTimer -= delta;
    if (farTimer <= 0) {
      play('far', { volume: settings.ambient });
      farTimer = randomBetween(FAR_SOUND_INTERVAL);
    }
  }

  function bindUi(root) {
    root.addEventListener('click', (event) => {
      if (event.target.closest?.('.window button, #minimap-buttons button, #bag-bar .bag-slot, .item-menu-button')) {
        play('ui_click');
      }
    });

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        const element = record.target;
        const wasHidden = (record.oldValue ?? '').split(/\s+/).includes('hidden');
        if (wasHidden && !element.classList.contains('hidden') && element.classList.contains('window')) play('ui_open');
      }
    });

    for (const element of root.querySelectorAll('.window')) {
      observer.observe(element, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }
  }

  return {
    play,
    playAt,
    playEvent,
    playDamage,
    playGroup: play,
    startAmbient,
    bindUi,
    setListener,
    setEmitters,
    setNpcSources,
    update,
    applySettings,
    weaponFamily,
    shotSound,
    setIndoor,
    ready,
  };
}
