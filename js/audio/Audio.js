const SOUND_BASE_PATH = 'assets/audio/';
const SOUND_EXTENSION = 'ogg';
const MASTER_VOLUME = 0.8;

const SOUND_DEFINITIONS = {
  hit: { volume: 0.6, variation: 0.08 },
  ability_power_strike: { volume: 0.8, variation: 0.05 },
  player_hurt: { volume: 0.7, variation: 0.06 },
  enemy_death: { volume: 0.7, variation: 0.06 },
  player_death: { volume: 0.8 },
  level_up: { volume: 0.7 },
  gold: { volume: 0.5, variation: 0.05 },
  error: { volume: 0.4 },
  target_select: { volume: 0.4 },
  ambient_wind: { volume: 0.25, loop: true },
};

const EVENT_SOUNDS = {
  kill: 'enemy_death',
  gold: 'gold',
  levelup: 'level_up',
  'ability-failed': 'error',
};

function createSilentAudio() {
  return { play() {}, playEvent() {}, playDamage() {}, startAmbient() {} };
}

export function createAudio() {
  const Howl = window.Howl;

  if (!Howl) {
    console.warn('[Audio] Howler nicht geladen, Audio deaktiviert');
    return createSilentAudio();
  }

  window.Howler.volume(MASTER_VOLUME);

  const sounds = new Map();

  for (const [name, definition] of Object.entries(SOUND_DEFINITIONS)) {
    sounds.set(
      name,
      new Howl({
        src: [`${SOUND_BASE_PATH}${name}.${SOUND_EXTENSION}`],
        volume: definition.volume,
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
    const ambient = sounds.get('ambient_wind');
    if (ambient && !ambient.playing()) {
      ambient.play();
    }
  }

  return { play, playEvent, playDamage, startAmbient };
}
