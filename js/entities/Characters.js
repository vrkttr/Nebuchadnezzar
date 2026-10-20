import { createHumanoid } from './Humanoid.js';

function variantFromId(id) {
  const digits = String(id).match(/\d+/);
  return digits ? Number(digits[0]) : 0;
}

export function createPlayer(appearance = 'player') {
  const humanoid = createHumanoid(appearance);
  humanoid.object.name = 'Player';

  return {
    object: humanoid.object,
    setPosition(x, y, z) {
      humanoid.object.position.set(x, y, z);
    },
    update: humanoid.update,
    playAttack: humanoid.playAttack,
    setEquipment: humanoid.setEquipment,
  };
}

export function createNpc(data) {
  const humanoid = createHumanoid(data.id);
  humanoid.object.name = data.name;
  humanoid.object.userData.isNpc = true;

  return { object: humanoid.object, update: humanoid.update };
}

export function createEnemy(id, type = 'raider') {
  const humanoid = createHumanoid(type, { variant: variantFromId(id) });
  humanoid.object.name = `Enemy_${id}`;
  humanoid.object.userData.isEnemy = true;
  humanoid.object.userData.enemyId = id;

  return { object: humanoid.object, update: humanoid.update, playAttack: humanoid.playAttack };
}
