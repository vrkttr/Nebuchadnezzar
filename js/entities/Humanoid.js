import * as THREE from 'three';
import { getMaterial } from '../world/Textures.js';
import { dampFactor } from '../utils/Interpolation.js';
import { resolveAppearance } from './Appearances.js';

const HIP_HEIGHT = 0.94;
const DEFAULT_SCALE = 0.95;
const ATTACK_DURATION = 0.45;
const AIRBORNE_HEIGHT = 0.08;
const MOVE_THRESHOLD = 0.3;
const RUN_THRESHOLD = 2.4;
const POSE_SMOOTHING = 16;
const SPEED_SMOOTHING = 10;
const MAX_SPEED = 12;
const EQUIPMENT_SLOTS = ['weapon', 'head', 'chest', 'legs'];

const cloth = (color) => getMaterial('cloth', { color });
const skin = (color) => getMaterial('skin', { color });
const metal = (color) => getMaterial('rust_metal', { color });

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function hanging(width, height, depth, material, x = 0, z = 0) {
  return box(width, height, depth, material, x, -height / 2, z);
}

function pivot(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function buildHair(appearance) {
  const group = new THREE.Group();
  const hairColor = appearance.hairColor ?? appearance.hair;
  const hair = cloth(appearance.hair);
  const style = appearance.hairStyle;

  if (style === 'short') {
    group.add(box(0.27, 0.06, 0.28, hair, 0, 0.265, 0));
    group.add(box(0.27, 0.2, 0.05, hair, 0, 0.18, -0.115));
  } else if (style === 'bandana') {
    group.add(box(0.27, 0.07, 0.28, cloth(hairColor), 0, 0.21, 0));
    group.add(box(0.27, 0.07, 0.28, hair, 0, 0.265, 0));
    group.add(box(0.07, 0.1, 0.06, cloth(hairColor), 0.04, 0.17, -0.16));
  } else if (style === 'hood') {
    const hood = cloth(hairColor);
    group.add(box(0.32, 0.08, 0.32, hood, 0, 0.3, -0.01));
    group.add(box(0.04, 0.3, 0.3, hood, 0.155, 0.15, -0.02));
    group.add(box(0.04, 0.3, 0.3, hood, -0.155, 0.15, -0.02));
    group.add(box(0.32, 0.3, 0.05, hood, 0, 0.15, -0.16));
  } else if (style === 'cap') {
    const cap = cloth(hairColor);
    group.add(box(0.28, 0.08, 0.29, cap, 0, 0.29, 0));
    group.add(box(0.28, 0.02, 0.1, cap, 0, 0.25, 0.17));
    group.add(box(0.27, 0.12, 0.05, hair, 0, 0.17, -0.115));
  }

  return group;
}

function buildBackpack(size, color) {
  const group = new THREE.Group();
  const material = cloth(color);

  if (size === 'big') {
    group.add(box(0.44, 0.52, 0.22, material, 0, 0.36, -0.24));
    group.add(box(0.36, 0.2, 0.06, cloth(0x4a4030), 0, 0.2, -0.38));
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.46, 8), cloth(0x6a6a54));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.7, -0.24);
    group.add(roll);
  } else {
    group.add(box(0.34, 0.4, 0.15, material, 0, 0.38, -0.2));
    group.add(box(0.26, 0.14, 0.05, cloth(0x3c3626), 0, 0.28, -0.3));
  }

  return group;
}

const EQUIPMENT_VISUALS = {
  rusty_pipe(group) {
    const material = metal(0x8a6a50);
    group.add(box(0.04, 0.75, 0.04, material, 0, -0.175, 0));
    group.add(box(0.04, 0.04, 0.12, material, 0, 0.2, 0.05));
    group.add(box(0.04, 0.1, 0.04, material, 0, 0.16, 0.1));
  },
  scrap_helmet(group) {
    const material = metal(0x70665a);
    group.add(box(0.3, 0.13, 0.3, material, 0, 0.27, 0));
    group.add(box(0.33, 0.03, 0.33, material, 0, 0.21, 0));
    group.add(box(0.1, 0.04, 0.03, metal(0x4a443c), 0, 0.2, 0.165));
  },
  padded_vest(group) {
    const body = cloth(0x5a5a3c);
    const dark = cloth(0x44442c);
    group.add(box(0.51, 0.42, 0.3, body, 0, 0.4, 0));
    group.add(box(0.13, 0.1, 0.04, dark, 0.12, 0.3, 0.16));
    group.add(box(0.13, 0.1, 0.04, dark, -0.12, 0.3, 0.16));
    group.add(box(0.1, 0.06, 0.31, dark, 0.14, 0.62, 0));
    group.add(box(0.1, 0.06, 0.31, dark, -0.14, 0.62, 0));
  },
  patched_trousers(group) {
    const patch = cloth(0x7a6a4a);
    group.add(box(0.15, 0.11, 0.03, patch, 0, 0, 0.12));
  },
};

const PANTS_OVERRIDE = { patched_trousers: 0x5c5242 };

export function createHumanoid(name, options = {}) {
  const appearance = resolveAppearance(name, options.variant ?? 0);
  const object = new THREE.Group();
  object.scale.setScalar(appearance.scale ?? DEFAULT_SCALE);

  const pickProxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1.8, 0.5),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  pickProxy.position.y = 0.9;
  object.add(pickProxy);

  const hips = pivot(object, 0, HIP_HEIGHT, 0);
  const torso = pivot(hips, 0, 0, 0);
  const headPivot = pivot(torso, 0, 0.66, 0);

  const pantsMeshes = [];
  const pants = (mesh) => {
    pantsMeshes.push(mesh);
    return mesh;
  };

  hips.add(pants(box(0.44, 0.16, 0.25, cloth(appearance.pants), 0, 0.02, 0)));
  torso.add(box(0.46, 0.58, 0.26, cloth(appearance.top), 0, 0.37, 0));
  torso.add(box(0.2, 0.04, 0.27, cloth(0x3a342a), 0, 0.1, 0));

  const skinMaterial = skin(appearance.skin);
  const faceMaterial = getMaterial('face', { color: appearance.skin });
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.27, 0.26), [
    skinMaterial,
    skinMaterial,
    skinMaterial,
    skinMaterial,
    faceMaterial,
    skinMaterial,
  ]);
  head.position.y = 0.145;
  headPivot.add(head);

  const hair = buildHair(appearance);
  headPivot.add(hair);

  if (appearance.mask) {
    headPivot.add(box(0.26, 0.1, 0.03, cloth(appearance.mask), 0, 0.07, 0.135));
  }

  if (appearance.scarf) {
    headPivot.add(box(0.3, 0.08, 0.3, cloth(appearance.scarf), 0, 0.01, 0));
  }

  if (appearance.backpack) {
    torso.add(buildBackpack(appearance.backpack, appearance.backpackColor ?? 0x5a4a34));
  }

  function buildArm(side) {
    const shoulder = pivot(torso, side * 0.3, 0.58, 0);
    const sleeve = cloth(appearance.top);
    shoulder.add(hanging(0.13, 0.3, 0.14, sleeve));
    const elbow = pivot(shoulder, 0, -0.3, 0);
    const forearmMaterial = appearance.sleeves === 'short' ? skinMaterial : sleeve;
    elbow.add(hanging(0.12, 0.28, 0.13, forearmMaterial));
    const hand = pivot(elbow, 0, -0.28, 0);
    hand.add(box(0.1, 0.1, 0.1, skinMaterial, 0, -0.04, 0));
    return { shoulder, elbow, hand };
  }

  function buildLeg(side) {
    const hip = pivot(hips, side * 0.12, 0, 0);
    hip.add(pants(hanging(0.2, 0.44, 0.22, cloth(appearance.pants))));
    const knee = pivot(hip, 0, -0.44, 0);
    knee.add(pants(hanging(0.18, 0.44, 0.2, cloth(appearance.pants))));
    knee.add(box(0.18, 0.1, 0.3, cloth(appearance.shoes), 0, -0.39, 0.05));
    return { hip, knee };
  }

  const armLeft = buildArm(1);
  const armRight = buildArm(-1);
  const legLeft = buildLeg(1);
  const legRight = buildLeg(-1);

  const weaponAnchor = pivot(armRight.hand, 0, -0.04, 0);
  weaponAnchor.rotation.x = -0.35;

  const mountPoints = {
    weapon: weaponAnchor,
    head: headPivot,
    chest: torso,
  };
  const equipped = { weapon: null, head: null, chest: null, legs: null };
  const removers = {};

  function clearSlot(slot) {
    removers[slot]?.();
    removers[slot] = null;
    equipped[slot] = null;
  }

  function applyPants(itemId) {
    const color = PANTS_OVERRIDE[itemId] ?? appearance.pants;
    for (const mesh of pantsMeshes) mesh.material = cloth(color);
  }

  function fillSlot(slot, itemId) {
    const build = EQUIPMENT_VISUALS[itemId];
    if (!build) return;

    if (slot === 'legs') {
      const mounts = [pivot(legLeft.hip, 0, -0.44, 0), pivot(legRight.hip, 0, -0.44, 0)];
      for (const mount of mounts) build(mount);
      applyPants(itemId);
      removers[slot] = () => {
        for (const mount of mounts) mount.parent.remove(mount);
        applyPants(null);
      };
    } else {
      const root = new THREE.Group();
      build(root);
      mountPoints[slot].add(root);
      removers[slot] = () => root.parent.remove(root);
    }

    equipped[slot] = itemId;
  }

  function setEquipment(equipment = {}) {
    for (const slot of EQUIPMENT_SLOTS) {
      const itemId = equipment[slot] ?? null;
      if (itemId === equipped[slot]) continue;

      clearSlot(slot);
      if (itemId) fillSlot(slot, itemId);
    }

    hair.visible = !equipped.head;
  }

  const current = {
    hipLeft: 0,
    kneeLeft: 0,
    hipRight: 0,
    kneeRight: 0,
    shoulderLeft: 0,
    elbowLeft: -0.1,
    shoulderRight: 0,
    elbowRight: -0.1,
    torsoX: 0,
    torsoY: 0,
    bob: 0,
  };
  const target = { ...current };
  const lastPosition = new THREE.Vector3();
  let hasLastPosition = false;
  let speed = 0;
  let phase = 0;
  let idleTime = Math.random() * 10;
  let attackTime = -1;

  function computeTarget(airborne, moving, running) {
    if (airborne) {
      Object.assign(target, {
        hipLeft: -0.6,
        kneeLeft: 0.9,
        hipRight: 0.2,
        kneeRight: 0.4,
        shoulderLeft: -0.9,
        elbowLeft: -0.4,
        shoulderRight: -0.9,
        elbowRight: -0.4,
        torsoX: 0.05,
        torsoY: 0,
        bob: 0,
      });
    } else if (moving) {
      const sine = Math.sin(phase);
      const cosine = Math.cos(phase);
      const legAmplitude = running ? 0.95 : 0.55;
      const kneeAmplitude = running ? 1.5 : 0.8;
      const armAmplitude = running ? 0.9 : 0.45;

      Object.assign(target, {
        hipLeft: sine * legAmplitude,
        hipRight: -sine * legAmplitude,
        kneeLeft: Math.max(0, -cosine) * kneeAmplitude + (running ? 0.15 : 0.05),
        kneeRight: Math.max(0, cosine) * kneeAmplitude + (running ? 0.15 : 0.05),
        shoulderLeft: -sine * armAmplitude,
        shoulderRight: sine * armAmplitude,
        elbowLeft: running ? -1.1 : -0.25,
        elbowRight: running ? -1.1 : -0.25,
        torsoX: running ? 0.18 : 0.04,
        torsoY: -sine * 0.12,
        bob: (running ? 0.05 : 0.02) * Math.abs(cosine),
      });
    } else {
      const breath = Math.sin(idleTime * 1.6);

      Object.assign(target, {
        hipLeft: 0,
        kneeLeft: 0,
        hipRight: 0,
        kneeRight: 0,
        shoulderLeft: 0.05 + breath * 0.03,
        elbowLeft: -0.12,
        shoulderRight: 0.05 - breath * 0.03,
        elbowRight: -0.12,
        torsoX: 0,
        torsoY: 0,
        bob: breath * 0.006,
      });
    }
  }

  function attackOverride(delta) {
    if (attackTime < 0) return null;

    attackTime += delta;
    const t = attackTime / ATTACK_DURATION;

    if (t >= 1) {
      attackTime = -1;
      return null;
    }

    const weight = Math.min(1, t / 0.12, (1 - t) / 0.3);
    let shoulder;
    let elbow;
    let twist;

    if (t < 0.4) {
      const k = 1 - (1 - t / 0.4) ** 2;
      shoulder = -2.4 * k;
      elbow = -0.6 * k;
      twist = -0.35 * k;
    } else if (t < 0.65) {
      const k = (t - 0.4) / 0.25;
      shoulder = -2.4 + 2.9 * k;
      elbow = -0.6 + 0.4 * k;
      twist = -0.35 + 0.75 * k;
    } else {
      shoulder = 0.5;
      elbow = -0.2;
      twist = 0.4;
    }

    return { weight, shoulder, elbow, twist };
  }

  function update(delta) {
    if (!(delta > 0)) return;

    const position = object.position;

    if (hasLastPosition) {
      const measured = Math.min(
        Math.hypot(position.x - lastPosition.x, position.z - lastPosition.z) / delta,
        MAX_SPEED
      );
      speed += (measured - speed) * dampFactor(SPEED_SMOOTHING, delta);
    }

    lastPosition.copy(position);
    hasLastPosition = true;

    const airborne = position.y > AIRBORNE_HEIGHT;
    const moving = speed > MOVE_THRESHOLD;
    const running = speed > RUN_THRESHOLD;

    idleTime += delta;
    if (moving && !airborne) {
      phase += (running ? 9 + speed * 0.8 : 3.2 + speed * 2.2) * delta;
    }

    computeTarget(airborne, moving, running);

    const factor = dampFactor(POSE_SMOOTHING, delta);
    for (const key of Object.keys(current)) {
      current[key] += (target[key] - current[key]) * factor;
    }

    const attack = attackOverride(delta);
    let shoulderRight = current.shoulderRight;
    let elbowRight = current.elbowRight;
    let torsoY = current.torsoY;

    if (attack) {
      shoulderRight += (attack.shoulder - shoulderRight) * attack.weight;
      elbowRight += (attack.elbow - elbowRight) * attack.weight;
      torsoY += (attack.twist - torsoY) * attack.weight;
    }

    hips.position.y = HIP_HEIGHT + current.bob;
    torso.rotation.set(current.torsoX, torsoY, 0);
    legLeft.hip.rotation.x = current.hipLeft;
    legLeft.knee.rotation.x = current.kneeLeft;
    legRight.hip.rotation.x = current.hipRight;
    legRight.knee.rotation.x = current.kneeRight;
    armLeft.shoulder.rotation.x = current.shoulderLeft;
    armLeft.elbow.rotation.x = current.elbowLeft;
    armRight.shoulder.rotation.x = shoulderRight;
    armRight.elbow.rotation.x = elbowRight;
  }

  function playAttack() {
    attackTime = 0;
  }

  setEquipment(options.equipment ?? appearance.equipment ?? {});

  return { object, update, playAttack, setEquipment };
}
