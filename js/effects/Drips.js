import * as THREE from 'three';

const MAX_DROPS = 48;
const MAX_RIPPLES = 48;
const ACTIVE_RANGE = 34;
const REFRESH_INTERVAL = 0.4;
const GRAVITY = 9.8;
const SOUND_RANGE = 24;
const SOUND_GAP = 0.09;
const RIPPLE_LIFE = 1.1;
const RIPPLE_GROWTH = 4.2;

export function createDrips(scene, audio) {
  let sources = [];
  let active = [];
  let refreshTimer = 0;
  let soundCooldown = 0;
  const ripples = [];

  const positions = new Float32Array(MAX_DROPS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xd2e4dc, size: 0.075, transparent: true, opacity: 0.85, depthWrite: false })
  );
  points.frustumCulled = false;
  points.name = 'Tropfen';
  points.visible = false;
  scene.add(points);

  const ringGeometry = new THREE.RingGeometry(0.07, 0.11, 14);
  ringGeometry.rotateX(-Math.PI / 2);
  const rings = new THREE.InstancedMesh(
    ringGeometry,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    MAX_RIPPLES
  );
  rings.frustumCulled = false;
  rings.count = 0;
  rings.name = 'Wellen';
  rings.visible = false;
  scene.add(rings);

  const matrix = new THREE.Matrix4();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const tint = new THREE.Color();

  function setSources(list) {
    sources = list.map((source) => ({ ...source, wait: Math.random() * (source.intervall ?? 2), falling: false, dropY: 0, speed: 0 }));
    active = [];
    ripples.length = 0;
    refreshTimer = 0;
    points.visible = sources.length > 0;
    rings.visible = sources.length > 0;
    geometry.setDrawRange(0, 0);
    rings.count = 0;
  }

  function refresh(player) {
    const near = [];
    for (const source of sources) {
      const distance = Math.hypot(source.x - player.x, source.z - player.z);
      if (distance <= ACTIVE_RANGE) near.push({ source, distance });
    }
    near.sort((a, b) => a.distance - b.distance);
    for (const source of active) if (source.falling) source.falling = false;
    active = near.slice(0, MAX_DROPS).map((entry) => entry.source);
  }

  function land(source, player) {
    if (ripples.length < MAX_RIPPLES) ripples.push({ x: source.x, y: source.y + 0.02, z: source.z, age: 0 });
    if (soundCooldown <= 0 && Math.hypot(source.x - player.x, source.z - player.z) < SOUND_RANGE) {
      audio.playAt('drip', source.x, source.z, source.laut ?? 1);
      soundCooldown = SOUND_GAP;
    }
  }

  function update(delta, playerPosition) {
    if (sources.length === 0) return;

    refreshTimer -= delta;
    if (refreshTimer <= 0) {
      refresh(playerPosition);
      refreshTimer = REFRESH_INTERVAL;
    }
    soundCooldown -= delta;

    let count = 0;
    for (const source of active) {
      if (!source.falling) {
        source.wait -= delta;
        if (source.wait <= 0) {
          source.falling = true;
          source.dropY = source.hoehe - 0.05;
          source.speed = 0;
        }
        continue;
      }

      source.speed += GRAVITY * delta;
      source.dropY -= source.speed * delta;
      if (source.dropY <= source.y) {
        source.falling = false;
        source.wait = (source.intervall ?? 2) * (0.5 + Math.random());
        land(source, playerPosition);
        continue;
      }

      positions[count * 3] = source.x;
      positions[count * 3 + 1] = source.dropY;
      positions[count * 3 + 2] = source.z;
      count += 1;
    }
    geometry.setDrawRange(0, count);
    geometry.attributes.position.needsUpdate = true;

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      ripples[i].age += delta;
      if (ripples[i].age >= RIPPLE_LIFE) ripples.splice(i, 1);
    }
    rings.count = ripples.length;
    for (let i = 0; i < ripples.length; i += 1) {
      const ripple = ripples[i];
      const progress = ripple.age / RIPPLE_LIFE;
      const size = 1 + progress * RIPPLE_GROWTH;
      position.set(ripple.x, ripple.y, ripple.z);
      scale.set(size, 1, size);
      matrix.compose(position, rotation, scale);
      rings.setMatrixAt(i, matrix);
      const fade = (1 - progress) * 0.55;
      tint.setRGB(fade, fade, fade);
      rings.setColorAt(i, tint);
    }
    rings.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
  }

  return { setSources, update };
}
