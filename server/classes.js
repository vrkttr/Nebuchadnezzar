const DEFAULT_MODIFIERS = {
  healthMult: 1,
  armorBonus: 0,
  meleeDamageMult: 1,
  rangedDamageMult: 1,
  healMult: 1,
  moveSpeedMult: 1,
  aggroMult: 1,
  goldMult: 1,
};

export const CLASSES = {
  soldier: { rangedDamageMult: 1.15, armorBonus: 3 },
  butcher: { meleeDamageMult: 1.15, healthMult: 1.05 },
  builder: { healthMult: 1.15, armorBonus: 5 },
  medic: { healMult: 1.4 },
  scout: { moveSpeedMult: 1.1, aggroMult: 0.8, goldMult: 1.25 },
};

export function isValidClass(classId) {
  return typeof classId === 'string' && Object.hasOwn(CLASSES, classId);
}

export function getClassModifiers(classId) {
  return { ...DEFAULT_MODIFIERS, ...(isValidClass(classId) ? CLASSES[classId] : {}) };
}
