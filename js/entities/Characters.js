import { createHumanoid } from './Humanoid.js';
import { buildPlayerAppearance } from './AppearanceOptions.js';
import { APPEARANCES } from './Appearances.js';
import { createAnimal, isAnimal } from './Animal.js';

function variantFromId(id) {
  const digits = String(id).match(/\d+/);
  return digits ? Number(digits[0]) : 0;
}

export function createPlayer(appearanceName = 'player', indices = null) {
  const humanoid = createHumanoid(appearanceName, {
    appearance: indices ? buildPlayerAppearance(indices, APPEARANCES[appearanceName]) : undefined,
  });
  let appearanceKey = indices ? indices.join(',') : '';
  humanoid.object.name = 'Player';

  return {
    object: humanoid.object,
    setPosition(x, y, z) {
      humanoid.object.position.set(x, y, z);
    },
    update: humanoid.update,
    playAttack: humanoid.playAttack,
    playHit: humanoid.playHit,
    setDead: humanoid.setDead,
    setEquipment: humanoid.setEquipment,
    setAppearance(next) {
      const key = Array.isArray(next) ? next.join(',') : '';
      if (!Array.isArray(next) || key === appearanceKey) return;
      appearanceKey = key;
      humanoid.setAppearance(buildPlayerAppearance(next, APPEARANCES[appearanceName]));
    },
  };
}

export function createNpc(data) {
  const humanoid = createHumanoid(data.id);
  humanoid.object.name = data.name;
  humanoid.object.userData.isNpc = true;

  return { object: humanoid.object, update: humanoid.update };
}

export function createEnemy(id, type = 'raider') {
  const humanoid = isAnimal(type) ? createAnimal(type) : createHumanoid(type, { variant: variantFromId(id) });
  humanoid.object.name = `Enemy_${id}`;
  humanoid.object.userData.isEnemy = true;
  humanoid.object.userData.enemyId = id;

  return {
    object: humanoid.object,
    update: humanoid.update,
    playAttack: humanoid.playAttack,
    playHit: humanoid.playHit,
    setDead: humanoid.setDead,
  };
}
