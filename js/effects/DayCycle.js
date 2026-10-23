import * as THREE from 'three';

export const DAY_LENGTH_MS = 48 * 60 * 1000;

const NIGHT = { top: '#0b0f1a', mid: '#141c2b', bottom: '#232b3a', sun: '#8fa6d0', sunI: 0.3, hemiSky: '#7a8cb0', hemiGround: '#2e3040', hemiI: 0.62, night: 1, stars: 1, cloud: '#2a3142' };
const DAWN = { top: '#55607a', mid: '#b08f84', bottom: '#e3b48c', sun: '#ffb27a', sunI: 0.7, hemiSky: '#c8b4a8', hemiGround: '#6e6652', hemiI: 0.85, night: 0.2, stars: 0.1, cloud: '#e8b79a' };
const DAY = { top: '#7f93a0', mid: '#aebcbf', bottom: '#d4cdb6', sun: '#fff0d2', sunI: 1, hemiSky: '#e2e8e6', hemiGround: '#7b7660', hemiI: 1, night: 0, stars: 0, cloud: '#f2f2ee' };
const DUSK = { top: '#4d4b66', mid: '#b57a6a', bottom: '#e29a64', sun: '#ff9a5c', sunI: 0.65, hemiSky: '#c0a8a0', hemiGround: '#605848', hemiI: 0.8, night: 0.25, stars: 0.15, cloud: '#e0a080' };

const KEYS = [
  [0, NIGHT],
  [0.19, NIGHT],
  [0.25, DAWN],
  [0.32, DAY],
  [0.68, DAY],
  [0.75, DUSK],
  [0.82, NIGHT],
  [1, NIGHT],
];

const COLOR_FIELDS = ['top', 'mid', 'bottom', 'sun', 'hemiSky', 'hemiGround', 'cloud'];
const NUMBER_FIELDS = ['sunI', 'hemiI', 'night', 'stars'];

function makeState() {
  const state = { phase: 0, sinElevation: 0, sunDirection: new THREE.Vector3(), lightDirection: new THREE.Vector3() };
  for (const field of COLOR_FIELDS) state[field] = new THREE.Color();
  for (const field of NUMBER_FIELDS) state[field] = 0;
  return state;
}

const scratch = new THREE.Color();
const horizontal = new THREE.Vector2();

function direction(target, angle) {
  const elevation = Math.min(1.08, Math.max(0.28, Math.asin(Math.min(1, Math.max(0, Math.sin(angle))))));
  horizontal.set(Math.cos(angle), 0.4).normalize();
  return target.set(horizontal.x * Math.cos(elevation), Math.sin(elevation), horizontal.y * Math.cos(elevation));
}

const sunScratch = new THREE.Vector3();
const moonScratch = new THREE.Vector3();

export function readPhaseOverride() {
  try {
    const value = new URLSearchParams(window.location.search).get('zeit');
    if (value === null) return null;
    const phase = Number(value);
    return Number.isFinite(phase) ? ((phase % 1) + 1) % 1 : null;
  } catch {
    return null;
  }
}

export function computeDay(state, now, override = null) {
  const phase = override ?? (now % DAY_LENGTH_MS) / DAY_LENGTH_MS;
  state.phase = phase;

  let index = 0;
  while (index < KEYS.length - 2 && phase > KEYS[index + 1][0]) index += 1;
  const [startPhase, from] = KEYS[index];
  const [endPhase, to] = KEYS[index + 1];
  const f = THREE.MathUtils.smoothstep((phase - startPhase) / (endPhase - startPhase), 0, 1);

  for (const field of COLOR_FIELDS) state[field].set(from[field]).lerp(scratch.set(to[field]), f);
  for (const field of NUMBER_FIELDS) state[field] = from[field] + (to[field] - from[field]) * f;

  const angle = (phase - 0.25) * Math.PI * 2;
  state.sinElevation = Math.sin(angle);
  direction(sunScratch, angle);
  direction(moonScratch, angle + Math.PI);
  state.sunDirection.copy(sunScratch);
  const blend = THREE.MathUtils.smoothstep(state.sinElevation, -0.08, 0.12);
  state.lightDirection.copy(moonScratch).lerp(sunScratch, blend).normalize();
  return state;
}

export function createDayState() {
  return makeState();
}
