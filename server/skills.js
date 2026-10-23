import { getClassModifiers } from './classes.js';
import { addGold } from './loot.js';

export const SKILL_MAX_LEVEL = 50;
export const RESET_COST_PER_LEVEL = 10;

export const SKILLS = {
  health: { id: 'health', max: 25, perPoint: 0.01 },
  armor: { id: 'armor', max: 25, perPoint: 0.01 },
  melee: { id: 'melee', max: 25, perPoint: 0.01 },
  ranged: { id: 'ranged', max: 25, perPoint: 0.01 },
  heal: { id: 'heal', max: 25, perPoint: 0.01 },
  speed: { id: 'speed', max: 10, perPoint: 0.01 },
  stealth: { id: 'stealth', max: 10, perPoint: 0.01 },
  gold: { id: 'gold', max: 25, perPoint: 0.01 },
};

export function createSkills() {
  const ranks = {};
  for (const id of Object.keys(SKILLS)) ranks[id] = 0;
  return ranks;
}

export function totalSkillPoints(level) {
  return Math.max(0, Math.min(level, SKILL_MAX_LEVEL) - 1);
}

export function spentSkillPoints(ranks) {
  return Object.values(ranks).reduce((sum, value) => sum + value, 0);
}

export function parseSkills(text, level) {
  const ranks = createSkills();
  let parsed = null;

  try {
    parsed = typeof text === 'string' && text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') return ranks;

  for (const [id, skill] of Object.entries(SKILLS)) {
    const value = parsed[id];
    if (Number.isInteger(value) && value > 0) ranks[id] = Math.min(value, skill.max);
  }

  return spentSkillPoints(ranks) > totalSkillPoints(level) ? createSkills() : ranks;
}

export function getPlayerModifiers(player) {
  const base = getClassModifiers(player.classId);
  const ranks = player.skills ?? {};
  const bonus = (id) => (ranks[id] ?? 0) * SKILLS[id].perPoint;

  return {
    ...base,
    healthMult: base.healthMult * (1 + bonus('health')),
    armorMult: 1 + bonus('armor'),
    meleeDamageMult: base.meleeDamageMult * (1 + bonus('melee')),
    rangedDamageMult: base.rangedDamageMult * (1 + bonus('ranged')),
    healMult: base.healMult * (1 + bonus('heal')),
    moveSpeedMult: base.moveSpeedMult * (1 + bonus('speed')),
    aggroMult: base.aggroMult * (1 - bonus('stealth')),
    goldMult: base.goldMult * (1 + bonus('gold')),
  };
}

export function resetCost(level) {
  return Math.max(0, level - 1) * RESET_COST_PER_LEVEL;
}

export function serializeSkills(player) {
  const ranks = player.skills ?? createSkills();
  const total = totalSkillPoints(player.level);
  const spent = spentSkillPoints(ranks);

  return {
    type: 'skills',
    total,
    free: Math.max(0, total - spent),
    resetCost: resetCost(player.level),
    entries: Object.values(SKILLS).map((skill) => ({ id: skill.id, rank: ranks[skill.id] ?? 0, max: skill.max, perPoint: Math.round(skill.perPoint * 100) })),
  };
}

export function spendSkillPoint(player, skillId) {
  const skill = typeof skillId === 'string' && Object.hasOwn(SKILLS, skillId) ? SKILLS[skillId] : null;
  if (!skill) return false;

  player.skills ??= createSkills();
  if (player.skills[skill.id] >= skill.max) return false;
  if (spentSkillPoints(player.skills) >= totalSkillPoints(player.level)) return false;

  player.skills[skill.id] += 1;
  return true;
}

export function resetSkills(player) {
  const cost = resetCost(player.level);
  if (spentSkillPoints(player.skills ?? {}) === 0) return false;
  if (player.gold < cost) return false;

  addGold(player, -cost);
  player.skills = createSkills();
  return true;
}
