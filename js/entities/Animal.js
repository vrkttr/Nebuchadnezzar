import * as THREE from 'three';
import { getMaterial, getColorMaterial } from '../world/Textures.js';
import { dampFactor } from '../utils/Interpolation.js';

const PORTRAIT_LAYER = 1;
const ATTACK_DURATION = 0.38;
const HIT_DURATION = 0.25;
const FALL_SPEED = 2.8;
const MOVE_THRESHOLD = 0.3;
const MAX_SPEED = 12;
const SPEED_SMOOTHING = 10;
const POSE_SMOOTHING = 16;
const TAIL_SEGMENTS = 6;

const DOG_PROFILE = {
  kind: 'dog',
  legLength: 0.46,
  body: [0.34, 0.34, 0.82],
  head: [0.25, 0.25, 0.26],
  snout: [0.14, 0.12, 0.2],
  stride: 1.05,
};

const RAT_PROFILE = {
  kind: 'rat',
  legLength: 0.1,
  body: [0.2, 0.18, 0.4],
  head: [0.14, 0.14, 0.16],
  snout: [0.08, 0.08, 0.14],
  stride: 1.6,
};

const BEAST_PROFILE = {
  kind: 'dog',
  legLength: 0.4,
  body: [0.4, 0.4, 0.9],
  head: [0.28, 0.27, 0.3],
  snout: [0.16, 0.13, 0.22],
  stride: 1.05,
};

const BEAR_PROFILE = {
  kind: 'dog',
  legLength: 0.62,
  body: [0.8, 0.8, 1.45],
  head: [0.44, 0.4, 0.46],
  snout: [0.24, 0.2, 0.26],
  stride: 0.75,
};

export const ANIMALS = {
  wild_boar: { ...BEAST_PROFILE, legLength: 0.36, body: [0.5, 0.48, 0.95], scale: 1, fur: 0x4a3a2e, accent: 0x6e5a48, eyes: 0x1a1210, ears: 'pointed', teeth: true, mane: true, stride: 1.2 },
  wolf: { ...DOG_PROFILE, scale: 1.15, fur: 0x6a665e, accent: 0x9a948a, eyes: 0xe0b030, ears: 'pointed', teeth: true },
  alpha_wolf: { ...DOG_PROFILE, scale: 1.5, fur: 0x2c2a28, accent: 0x5a5650, eyes: 0xd03020, ears: 'pointed', teeth: true, mane: true },
  bear: { ...BEAR_PROFILE, scale: 1.2, fur: 0x4a3626, accent: 0x6a523c, eyes: 0x1a1210, ears: 'round', teeth: true },
  cave_bear: { ...BEAR_PROFILE, scale: 1.75, fur: 0x38383c, accent: 0x66666a, eyes: 0xd8b030, ears: 'round', teeth: true, mane: true },
  guard_dog: { ...DOG_PROFILE, scale: 1.05, fur: 0x6a5a40, accent: 0x2a2420, eyes: 0x1a1612, ears: 'pointed', teeth: true },
  chain_dog: { ...DOG_PROFILE, scale: 1.45, fur: 0x3a2a22, accent: 0x5a4a3c, eyes: 0xc03020, ears: 'pointed', teeth: true, mane: true },
  bat: { kind: 'bat', scale: 1, fur: 0x2a2624, accent: 0x4a3c38, eyes: 0xc03020, span: 0.55 },
  cave_spider: { kind: 'spider', scale: 1.3, fur: 0x2a2420, accent: 0x5a3228, eyes: 0xc03020 },
  stray_dog: { ...DOG_PROFILE, scale: 0.9, fur: 0x8c6c4a, accent: 0xd8cdb4, eyes: 0x1a1612, ears: 'floppy', patch: true },
  feral_dog: { ...DOG_PROFILE, scale: 1.1, fur: 0x3a322c, accent: 0x5a4a3a, eyes: 0xc03020, ears: 'pointed', teeth: true, mane: true },
  rat: { ...RAT_PROFILE, scale: 1, fur: 0x6a5a4a, accent: 0xc89a8a, eyes: 0x1a1210, ears: 'round' },
  giant_rat: { ...RAT_PROFILE, scale: 1.9, fur: 0x57493c, accent: 0xb8887a, eyes: 0x802018, ears: 'round', teeth: true },
  plague_rat: { ...RAT_PROFILE, scale: 1.5, fur: 0x5c6040, accent: 0x9a9a4a, eyes: 0xc8b020, ears: 'round', boils: true },
  rat_king: { ...RAT_PROFILE, scale: 3.4, fur: 0x4a3c34, accent: 0xa87a6a, eyes: 0xd03018, ears: 'round', teeth: true, crown: true, extraTails: 4 },
};

export function isAnimal(type) {
  return Object.hasOwn(ANIMALS, type);
}

const fur = (color) => getMaterial('cloth', { color });
const flesh = (color) => getMaterial('skin', { color });
const dark = (color) => getColorMaterial(color);

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function pivot(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function buildTail(parent, spec, x, y, z, spread) {
  const segments = [];
  let anchor = pivot(parent, x, y, z);
  anchor.rotation.y = spread;
  const radius = spec.kind === 'dog' ? 0.035 : 0.022;
  const length = spec.kind === 'dog' ? 0.32 : 0.1;
  const count = spec.kind === 'dog' ? 1 : TAIL_SEGMENTS;
  const material = spec.kind === 'dog' ? fur(spec.fur) : flesh(spec.accent);

  for (let i = 0; i < count; i += 1) {
    const segment = pivot(anchor, 0, 0, 0);
    const mesh = box(radius * 2 * (1 - i * 0.08), radius * 2 * (1 - i * 0.08), length, material, 0, 0, -length / 2);
    segment.add(mesh);
    segments.push(segment);
    anchor = pivot(segment, 0, 0, -length);
  }

  return segments;
}

function createBat(spec) {
  const furMaterial = fur(spec.fur);
  const wingMaterial = fur(spec.accent);
  const eyeMaterial = dark(spec.eyes);
  const object = new THREE.Group();
  object.scale.setScalar(spec.scale);
  object.userData.nameplateHeight = 1.9;
  object.userData.headHeight = 1.5;

  const pickProxy = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  pickProxy.position.y = 1.3;
  object.add(pickProxy);

  const frame = pivot(object, 0, 1.3, 0);
  frame.add(box(0.14, 0.12, 0.26, furMaterial, 0, 0, 0));
  frame.add(box(0.1, 0.1, 0.1, furMaterial, 0, 0.02, 0.17));
  for (const side of [-1, 1]) {
    frame.add(box(0.025, 0.07, 0.025, furMaterial, side * 0.035, 0.1, 0.19));
    frame.add(box(0.02, 0.02, 0.02, eyeMaterial, side * 0.035, 0.04, 0.225));
  }

  const wings = [];
  for (const side of [-1, 1]) {
    const shoulder = pivot(frame, side * 0.07, 0.02, 0);
    shoulder.add(box(spec.span, 0.012, 0.22, wingMaterial, side * spec.span / 2, 0, 0));
    const tip = pivot(shoulder, side * spec.span, 0, 0);
    tip.add(box(spec.span * 0.6, 0.01, 0.14, wingMaterial, side * spec.span * 0.3, 0, -0.03));
    wings.push({ shoulder, tip, side });
  }

  object.traverse((node) => node.layers.enable(PORTRAIT_LAYER));

  let clock = Math.random() * 10;
  let attackTime = -1;
  let hitTime = -1;
  let dead = false;
  let fall = 0;

  function update(delta) {
    if (!(delta > 0)) return;
    clock += delta;

    let lunge = 0;
    if (attackTime >= 0) {
      attackTime += delta;
      const progress = attackTime / ATTACK_DURATION;
      if (progress >= 1) attackTime = -1;
      else lunge = Math.sin(progress * Math.PI) * 0.35;
    }

    let kick = 0;
    if (hitTime >= 0) {
      hitTime += delta;
      const progress = hitTime / HIT_DURATION;
      if (progress >= 1) hitTime = -1;
      else kick = Math.sin(progress * Math.PI);
    }

    fall = Math.min(1, Math.max(0, fall + (dead ? 1 : -1) * delta * 2.2));
    const flap = dead ? 0 : Math.sin(clock * 22);
    for (const { shoulder, tip, side } of wings) {
      shoulder.rotation.z = side * (dead ? -1.2 : flap * 0.7);
      tip.rotation.z = side * (dead ? -0.8 : flap * 0.5);
    }

    frame.position.y = 1.3 + (dead ? -1.18 * fall : Math.sin(clock * 3.1) * 0.12);
    frame.position.z = lunge - kick * 0.1;
    frame.rotation.z = fall * 1.5;
    frame.rotation.x = dead ? 0 : -0.25 * Math.sin(clock * 5) - lunge * 0.8 + kick * 0.3;
  }

  return {
    object,
    update,
    playAttack() {
      if (!dead) attackTime = 0;
    },
    playHit() {
      if (!dead) hitTime = 0;
    },
    setLying() {},
    setDead(value) {
      dead = Boolean(value);
      if (dead) {
        attackTime = -1;
        hitTime = -1;
      }
    },
  };
}

function createSpider(spec) {
  const furMaterial = fur(spec.fur);
  const accentMaterial = fur(spec.accent);
  const eyeMaterial = dark(spec.eyes);
  const object = new THREE.Group();
  object.scale.setScalar(spec.scale);
  object.userData.nameplateHeight = 1.1 * spec.scale;
  object.userData.headHeight = 0.5 * spec.scale;

  const pickProxy = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
  pickProxy.position.y = 0.35;
  object.add(pickProxy);

  const frame = pivot(object, 0, 0.32, 0);
  frame.add(box(0.5, 0.3, 0.62, furMaterial, 0, 0.05, -0.38));
  frame.add(box(0.3, 0.14, 0.36, accentMaterial, 0, 0.18, -0.4));
  const head = pivot(frame, 0, 0.04, 0.0);
  head.add(box(0.3, 0.22, 0.28, furMaterial, 0, 0, 0.06));
  for (const side of [-1, 1]) {
    head.add(box(0.05, 0.05, 0.03, eyeMaterial, side * 0.08, 0.07, 0.21));
    head.add(box(0.04, 0.04, 0.04, eyeMaterial, side * 0.12, 0.03, 0.2));
    head.add(box(0.05, 0.05, 0.16, accentMaterial, side * 0.06, -0.08, 0.2));
  }

  const legs = [];
  for (let pair = 0; pair < 4; pair += 1) {
    for (const side of [-1, 1]) {
      const hip = pivot(frame, side * 0.2, 0.05, 0.12 - pair * 0.2);
      const reach = 0.55 + (pair === 0 || pair === 3 ? 0.08 : 0);
      const upper = pivot(hip, 0, 0, 0);
      upper.rotation.z = side * -0.9;
      upper.add(box(0.045, 0.045, 0.045, furMaterial, 0, 0, 0));
      const upperBone = box(reach * 0.55, 0.045, 0.045, furMaterial, side * reach * 0.275, 0, 0);
      upper.add(upperBone);
      const knee = pivot(upper, side * reach * 0.55, 0, 0);
      knee.rotation.z = side * 1.6;
      knee.add(box(reach * 0.6, 0.035, 0.035, accentMaterial, side * reach * 0.3, 0, 0));
      hip.rotation.y = side * (0.55 - pair * 0.33);
      legs.push({ hip, upper, knee, side, phase: pair % 2 === 0 ? 0 : Math.PI, base: hip.rotation.y });
    }
  }

  object.traverse((node) => node.layers.enable(PORTRAIT_LAYER));

  const lastPosition = new THREE.Vector3();
  let hasLastPosition = false;
  let speed = 0;
  let phase = 0;
  let clock = Math.random() * 10;
  let attackTime = -1;
  let hitTime = -1;
  let dead = false;
  let fall = 0;

  function update(delta) {
    if (!(delta > 0)) return;

    if (hasLastPosition) {
      const measured = Math.min(Math.hypot(object.position.x - lastPosition.x, object.position.z - lastPosition.z) / delta, MAX_SPEED);
      speed += (measured - speed) * dampFactor(SPEED_SMOOTHING, delta);
    }
    lastPosition.copy(object.position);
    hasLastPosition = true;

    clock += delta;
    const moving = speed > MOVE_THRESHOLD && !dead;
    phase += speed * 5 * delta;

    let lunge = 0;
    if (attackTime >= 0) {
      attackTime += delta;
      const progress = attackTime / ATTACK_DURATION;
      if (progress >= 1) attackTime = -1;
      else lunge = Math.sin(progress * Math.PI) * 0.35;
    }

    let kick = 0;
    if (hitTime >= 0) {
      hitTime += delta;
      const progress = hitTime / HIT_DURATION;
      if (progress >= 1) hitTime = -1;
      else kick = Math.sin(progress * Math.PI);
    }

    fall = Math.min(1, Math.max(0, fall + (dead ? 1 : -1) * delta * 2.8));
    const swing = moving ? 0.45 : 0.04;
    for (const leg of legs) {
      leg.hip.rotation.y = leg.base + Math.sin(phase + leg.phase + leg.side) * swing * (dead ? 0 : 1);
      leg.upper.rotation.z = leg.side * (-0.9 - fall * 1.2) + Math.sin(phase * 2 + leg.phase) * 0.18 * (moving ? 1 : 0);
      leg.knee.rotation.z = leg.side * (1.6 - fall * 1.0);
    }

    frame.position.z = lunge - kick * 0.12;
    frame.position.y = 0.32 + Math.abs(Math.sin(phase * 2)) * (moving ? 0.03 : 0) - fall * 0.12;
    frame.rotation.z = fall * 3.0;
    head.rotation.x = Math.sin(clock * 1.7) * 0.05 + lunge * 0.6 - kick * 0.2;
  }

  return {
    object,
    update,
    playAttack() {
      if (!dead) attackTime = 0;
    },
    playHit() {
      if (!dead) hitTime = 0;
    },
    setLying() {},
    setDead(value) {
      dead = Boolean(value);
      if (dead) {
        attackTime = -1;
        hitTime = -1;
      }
    },
  };
}

export function createAnimal(type) {
  const spec = ANIMALS[type];
  if (spec.kind === 'bat') return createBat(spec);
  if (spec.kind === 'spider') return createSpider(spec);
  const isDog = spec.kind === 'dog';
  const [bodyW, bodyH, bodyL] = spec.body;
  const [headW, headH, headL] = spec.head;
  const [snoutW, snoutH, snoutL] = spec.snout;
  const furMaterial = fur(spec.fur);
  const accentMaterial = isDog ? fur(spec.accent) : flesh(spec.accent);
  const eyeMaterial = dark(spec.eyes);
  const noseMaterial = dark(0x1a1412);

  const object = new THREE.Group();
  object.scale.setScalar(spec.scale);
  object.userData.nameplateHeight = (spec.legLength + bodyH + headH + 0.25) * spec.scale;
  object.userData.headHeight = (spec.legLength + bodyH * 0.5 + headH * 0.7) * spec.scale;

  const pickProxy = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW + 0.3, spec.legLength + bodyH + headH, bodyL + 0.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  pickProxy.position.y = (spec.legLength + bodyH + headH) / 2;
  object.add(pickProxy);

  const frame = pivot(object, 0, 0, 0);
  const hips = pivot(frame, 0, spec.legLength, 0);
  hips.add(box(bodyW, bodyH, bodyL, furMaterial, 0, bodyH / 2, 0));
  hips.add(box(bodyW * 0.8, bodyH * 0.45, bodyL * 0.7, accentMaterial, 0, bodyH * 0.1, 0.02));

  if (spec.mane) hips.add(box(0.06, 0.1, bodyL * 0.6, dark(0x1e1a16), 0, bodyH + 0.04, 0.1));
  if (spec.patch) hips.add(box(bodyW * 0.7, 0.04, 0.22, accentMaterial, 0, bodyH + 0.005, 0.12));

  if (spec.boils) {
    const boil = dark(0xa8a040);
    for (let i = 0; i < 5; i += 1) {
      hips.add(box(0.06, 0.06, 0.06, boil, ((i % 3) - 1) * 0.06, bodyH + 0.01, -0.12 + i * 0.07));
    }
  }

  const headPivot = pivot(hips, 0, bodyH * 0.65, bodyL / 2 - 0.02);
  const headGroup = pivot(headPivot, 0, 0.02, 0);
  headGroup.add(box(headW, headH, headL, furMaterial, 0, headH * 0.1, headL * 0.35));
  headGroup.add(box(snoutW, snoutH, snoutL, accentMaterial, 0, -headH * 0.12, headL * 0.35 + headL / 2 + snoutL / 2 - 0.02));
  headGroup.add(box(snoutW * 0.55, snoutH * 0.55, 0.04, noseMaterial, 0, -headH * 0.05, headL * 0.35 + headL / 2 + snoutL - 0.02));

  const eyeSize = isDog ? 0.035 : 0.025;
  for (const side of [-1, 1]) {
    headGroup.add(box(eyeSize, eyeSize, 0.02, eyeMaterial, side * headW * 0.32, headH * 0.22, headL * 0.35 + headL / 2 + 0.005));
  }

  const jaw = pivot(headGroup, 0, -headH * 0.32, headL * 0.5);
  jaw.add(box(snoutW * 0.85, snoutH * 0.4, snoutL * 0.9, accentMaterial, 0, 0, snoutL * 0.5));
  if (spec.teeth) {
    const tooth = dark(0xe8e2cc);
    for (const side of [-1, 1]) {
      jaw.add(box(0.02, 0.05, 0.02, tooth, side * snoutW * 0.3, 0.04, snoutL * 0.85));
    }
  }

  for (const side of [-1, 1]) {
    if (spec.ears === 'floppy') {
      const ear = box(0.07, 0.16, 0.1, furMaterial, side * (headW / 2 + 0.02), headH * 0.1, headL * 0.2);
      ear.rotation.z = side * -0.35;
      headGroup.add(ear);
    } else if (spec.ears === 'pointed') {
      const ear = box(0.07, 0.16, 0.07, furMaterial, side * (headW / 2 - 0.04), headH * 0.7, headL * 0.15);
      ear.rotation.z = side * -0.2;
      headGroup.add(ear);
    } else {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 8), accentMaterial);
      ear.rotation.z = Math.PI / 2;
      ear.rotation.y = side * 0.4;
      ear.position.set(side * (headW / 2 + 0.01), headH * 0.5, headL * 0.15);
      headGroup.add(ear);
    }
  }

  if (spec.crown) {
    const rust = getMaterial('rust_metal', { color: 0x7a5a36 });
    headGroup.add(box(headW * 1.02, 0.04, headL * 0.9, rust, 0, headH * 0.62, headL * 0.3));
    for (let i = -1; i <= 1; i += 1) {
      headGroup.add(box(0.03, 0.08, 0.03, rust, i * headW * 0.3, headH * 0.62 + 0.06, headL * 0.3));
    }
  }

  const tails = [];
  const tailBase = [0, bodyH * 0.55, -bodyL / 2];
  tails.push(buildTail(hips, spec, ...tailBase, 0));
  for (let i = 0; i < (spec.extraTails ?? 0); i += 1) {
    tails.push(buildTail(hips, spec, tailBase[0], tailBase[1], tailBase[2], (i - 1.5) * 0.45));
  }
  if (isDog) for (const segments of tails) segments[0].rotation.x = -2.1;

  const legs = [];
  const legWidth = isDog ? 0.09 : 0.045;
  const stance = [
    [1, 1, 0],
    [-1, 1, Math.PI],
    [1, -1, Math.PI],
    [-1, -1, 0],
  ];
  for (const [side, end, offset] of stance) {
    const hip = pivot(hips, side * (bodyW / 2 - legWidth * 0.5), 0.02, end * (bodyL / 2 - legWidth * 0.8));
    hip.add(box(legWidth, spec.legLength, legWidth, furMaterial, 0, -spec.legLength / 2 + 0.02, 0));
    hip.add(box(legWidth * 1.15, legWidth * 0.7, legWidth * 1.5, accentMaterial, 0, -spec.legLength + 0.03, legWidth * 0.3));
    legs.push({ hip, offset });
  }

  object.traverse((node) => node.layers.enable(PORTRAIT_LAYER));

  const lastPosition = new THREE.Vector3();
  let hasLastPosition = false;
  let speed = 0;
  let phase = 0;
  let clock = Math.random() * 10;
  let attackTime = -1;
  let hitTime = -1;
  let dead = false;
  let fall = 0;
  let lying = false;
  let lie = 0;
  const pose = { bob: 0, pitch: 0, swing: 0 };

  function update(delta) {
    if (!(delta > 0)) return;

    if (hasLastPosition) {
      const measured = Math.min(Math.hypot(object.position.x - lastPosition.x, object.position.z - lastPosition.z) / delta, MAX_SPEED);
      speed += (measured - speed) * dampFactor(SPEED_SMOOTHING, delta);
    }
    lastPosition.copy(object.position);
    hasLastPosition = true;

    clock += delta;
    const moving = speed > MOVE_THRESHOLD && !dead;
    phase += speed * spec.stride * delta * 3.2;

    const swingTarget = moving ? Math.min(1, 0.35 + speed / 5) * (isDog ? 0.85 : 0.9) : 0;
    const bobTarget = moving ? Math.abs(Math.sin(phase)) * (isDog ? 0.045 : 0.012) : 0;
    const pitchTarget = moving ? Math.min(0.12, speed * 0.02) : 0;
    const factor = dampFactor(POSE_SMOOTHING, delta);
    pose.swing += (swingTarget - pose.swing) * factor;
    pose.bob += (bobTarget - pose.bob) * factor;
    pose.pitch += (pitchTarget - pose.pitch) * factor;

    lie += ((lying && !dead && !moving ? 1 : 0) - lie) * dampFactor(6, delta);
    legs.forEach((leg, index) => {
      const rest = index < 2 ? -1.4 : 1.1;
      leg.hip.rotation.x = Math.sin(phase + leg.offset) * pose.swing * (1 - lie) + rest * lie;
    });

    let lunge = 0;
    let bite = 0;
    if (attackTime >= 0) {
      attackTime += delta;
      const progress = attackTime / ATTACK_DURATION;
      if (progress >= 1) attackTime = -1;
      else {
        lunge = Math.sin(Math.min(1, progress * 1.4) * Math.PI) * 0.4;
        bite = Math.sin(progress * Math.PI * 2) * 0.5 + 0.15;
      }
    }

    let kick = 0;
    if (hitTime >= 0) {
      hitTime += delta;
      const progress = hitTime / HIT_DURATION;
      if (progress >= 1) hitTime = -1;
      else kick = Math.sin(progress * Math.PI);
    }

    const fallTarget = dead ? 1 : 0;
    const fallStep = FALL_SPEED * delta;
    fall += Math.max(-fallStep, Math.min(fallStep, fallTarget - fall));
    const fallEase = fall * fall * (3 - 2 * fall);

    frame.position.z = lunge - kick * 0.12;
    frame.position.y = pose.bob + fallEase * (isDog ? 0.12 : 0.04) - lie * (spec.legLength - 0.08);
    frame.rotation.z = fallEase * (Math.PI / 2);
    hips.rotation.x = -pose.pitch + kick * 0.25;
    headPivot.rotation.x = lie * 0.3 + (dead ? 0.3 : 0.1) * fallEase + bite * 0.5 + (moving ? 0 : Math.sin(clock * 1.3) * 0.06) - kick * 0.3;
    jaw.rotation.x = bite * 0.8 * (dead ? 0 : 1);

    tails.forEach((segments, index) => {
      segments.forEach((segment, i) => {
        const wave = Math.sin(clock * (moving ? 6 : 2.2) + i * 0.8 + index) * (isDog ? 0.35 : 0.22);
        if (isDog) segment.rotation.y = moving ? wave * 0.5 : wave;
        else segment.rotation.y = wave;
      });
    });
  }

  return {
    object,
    update,
    playAttack() {
      if (!dead) attackTime = 0;
    },
    playHit() {
      if (!dead) hitTime = 0;
    },
    setLying(value) {
      lying = Boolean(value);
    },
    setDead(value) {
      dead = Boolean(value);
      if (dead) {
        attackTime = -1;
        hitTime = -1;
      }
    },
  };
}
