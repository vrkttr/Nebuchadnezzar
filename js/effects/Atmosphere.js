import * as THREE from 'three';
import { computeDay, createDayState, readPhaseOverride } from './DayCycle.js';
import { updateWind, WIND } from './Wind.js';
import { createParticleSystem, spriteTexture } from './Particles.js';
import { createFx } from './Fx.js';
import { createBirds } from './Birds.js';
import { setSunOffset } from '../core/Scene.js';
import { windowMaterials } from '../world/Textures.js';
import { puddleMaterial } from '../world/builders/Puddles.js';
import { graphics } from './Graphics.js';

const SUN_DISTANCE = 40;
const SKY_INTERVAL = 0.5;
const FOG_NEAR = 170;
const FOG_FAR = 620;
const BOX = { dust: 14, leaves: 28, fireflies: 18 };
const COUNT = { dust: 80, leaves: 26, papers: 10, fireflies: 22 };
const CLOUD_SIZE = 2200;
const CLOUD_HEIGHT = 190;

function createCloudTexture() {
  const size = 256;
  let seed = 90731;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const layers = [4, 8, 16, 32].map((period) => {
    const grid = new Float32Array(period * period);
    for (let i = 0; i < grid.length; i += 1) grid[i] = random();
    return { period, grid };
  });
  const sample = ({ period, grid }, x, y) => {
    const fx = x * period;
    const fy = y * period;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const at = (a, b) => grid[(b % period) * period + (a % period)];
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
    return top + (bottom - top) * sy;
  };

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  const weights = [0.5, 0.27, 0.15, 0.08];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      layers.forEach((layer, index) => {
        value += sample(layer, x / size, y / size) * weights[index];
      });
      const alpha = THREE.MathUtils.smoothstep(value, 0.5, 0.74);
      const offset = (y * size + x) * 4;
      const shade = 225 + 30 * (1 - alpha);
      image.data[offset] = shade;
      image.data[offset + 1] = shade;
      image.data[offset + 2] = shade;
      image.data[offset + 3] = alpha * 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createClouds() {
  const geometry = new THREE.PlaneGeometry(CLOUD_SIZE, CLOUD_SIZE);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: createCloudTexture() },
      uOffset: { value: new THREE.Vector2() },
      uColor: { value: new THREE.Color(0xffffff) },
      uOpacity: { value: 0.55 },
    },
    vertexShader: `
      varying vec2 vWorld;
      varying float vDist;
      void main() {
        vec4 world = modelMatrix * vec4( position, 1.0 );
        vWorld = world.xz;
        vDist = length( world.xz - cameraPosition.xz );
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec2 uOffset;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vWorld;
      varying float vDist;
      void main() {
        vec4 cloud = texture2D( uMap, ( vWorld + uOffset ) / 1100.0 );
        float alpha = cloud.a * uOpacity * ( 1.0 - smoothstep( 350.0, 950.0, vDist ) );
        if ( alpha < 0.01 ) discard;
        gl_FragColor = vec4( uColor * ( 0.8 + 0.2 * cloud.r ), alpha );
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  mesh.name = 'Wolken';
  return mesh;
}

function createStars() {
  const count = 360;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const y = 0.06 + Math.random() * 0.94;
    const angle = Math.random() * Math.PI * 2;
    const ring = Math.sqrt(1 - y * y);
    positions.set([Math.cos(angle) * ring * 780, y * 780, Math.sin(angle) * ring * 780], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xd4dcff, size: 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
  const stars = new THREE.Points(geometry, material);
  stars.frustumCulled = false;
  stars.renderOrder = -10;
  return stars;
}

function createSprite(kind, color, size) {
  const material = new THREE.SpriteMaterial({ map: spriteTexture(kind), color, transparent: true, depthWrite: false, fog: false, blending: kind === 'moon' ? THREE.NormalBlending : THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(size);
  sprite.renderOrder = -9;
  return sprite;
}

export function createAtmosphere({ scene, camera, renderer }) {
  const env = { time: 0, night: 0, indoor: false };
  const day = createDayState();
  const override = readPhaseOverride();
  const group = new THREE.Group();
  group.name = 'Atmosphaere';
  scene.add(group);

  const clouds = createClouds();
  const stars = createStars();
  const sun = createSprite('glow', 0xfff0c8, 170);
  const moon = createSprite('moon', 0xffffff, 70);
  group.add(clouds, stars, sun, moon);

  const sparks = createParticleSystem({ max: 220, texture: spriteTexture('spark'), additive: true, windPush: 0.2, drag: 0.4 });
  const smoke = createParticleSystem({ max: 260, texture: spriteTexture('puff'), windPush: 0.12, drag: 0.15 });
  const dust = createParticleSystem({ max: COUNT.dust, texture: spriteTexture('puff') });
  const leaves = createParticleSystem({ max: COUNT.leaves, texture: spriteTexture('leaf') });
  const papers = createParticleSystem({ max: COUNT.papers, texture: spriteTexture('paper') });
  const fireflies = createParticleSystem({ max: COUNT.fireflies, texture: spriteTexture('spark'), additive: true });
  const systems = [sparks, smoke, dust, leaves, papers, fireflies];
  for (const system of systems) group.add(system.points);

  const fx = createFx({ scene, sparks, smoke, env });
  const birds = createBirds(scene);

  const tracks = (count, spread) =>
    Array.from({ length: count }, () => ({
      x: (Math.random() * 2 - 1) * spread,
      y: Math.random(),
      z: (Math.random() * 2 - 1) * spread,
      phase: Math.random() * 6.28,
      speed: 0.6 + Math.random() * 0.8,
    }));
  const dustTracks = tracks(COUNT.dust, BOX.dust);
  const leafTracks = tracks(COUNT.leaves, BOX.leaves);
  const paperTracks = tracks(COUNT.papers, BOX.leaves);
  const fireflyTracks = tracks(COUNT.fireflies, BOX.fireflies);

  const LEAF_COLORS = [[0.5, 0.55, 0.28], [0.58, 0.48, 0.22], [0.42, 0.38, 0.2], [0.62, 0.6, 0.3]];
  leafTracks.forEach((track, index) => {
    track.color = LEAF_COLORS[index % LEAF_COLORS.length];
    track.spin = 1 + Math.random() * 3;
    leaves.rotations[index] = Math.random() * 6;
  });
  paperTracks.forEach((track, index) => {
    track.spin = 0.8 + Math.random() * 2;
    papers.rotations[index] = Math.random() * 6;
  });

  let active = false;
  let base = { hemisphere: 1.8, sun: 2.5 };
  let ownsFog = false;
  let hazeFog = null;
  let skyTimer = SKY_INTERVAL;
  let ground = 0;
  const cloudOffset = new THREE.Vector2();
  const windowTint = new THREE.Color();
  const sunRaw = new THREE.Vector3();

  function drawSky() {
    const { sky } = scene.userData.environment;
    const context = sky.image.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 0, sky.image.height);
    gradient.addColorStop(0, `#${day.top.getHexString()}`);
    gradient.addColorStop(0.55, `#${day.mid.getHexString()}`);
    gradient.addColorStop(1, `#${day.bottom.getHexString()}`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, sky.image.width, sky.image.height);
    sky.needsUpdate = true;
  }

  function setWorld(world) {
    const { hemisphere, sun: sunLight } = scene.userData.environment;
    env.indoor = Boolean(world.indoor);
    active = !env.indoor;
    base = { hemisphere: hemisphere.intensity, sun: sunLight.intensity };
    ownsFog = false;
    if (active && !scene.fog) {
      hazeFog = new THREE.Fog(0xd4cdb6, FOG_NEAR, FOG_FAR);
      scene.fog = hazeFog;
      ownsFog = true;
    }
    if (!active) {
      for (const material of windowMaterials) material.color.setScalar(1);
      puddleMaterial.color.setHex(0x6f7a80);
    }
    fx.reset();
    fx.scan();
    skyTimer = SKY_INTERVAL;
  }

  function applyDay() {
    const { hemisphere, sun: sunLight } = scene.userData.environment;
    hemisphere.color.copy(day.hemiSky);
    hemisphere.groundColor.copy(day.hemiGround);
    hemisphere.intensity = base.hemisphere * day.hemiI;
    sunLight.color.copy(day.sun);
    sunLight.intensity = base.sun * day.sunI;
    sunLight.castShadow = graphics.shadows;
    setSunOffset(day.lightDirection.x * SUN_DISTANCE, day.lightDirection.y * SUN_DISTANCE, day.lightDirection.z * SUN_DISTANCE);

    if (ownsFog) {
      const wanted = graphics.haze ? hazeFog : null;
      if (scene.fog !== wanted) scene.fog = wanted;
      hazeFog.color.copy(day.bottom);
    }

    const brightness = 0.58 + 0.42 * Math.max(day.night, 1 - THREE.MathUtils.smoothstep(day.sinElevation, -0.1, 0.35));
    windowTint.setScalar(brightness);
    for (const material of windowMaterials) material.color.copy(windowTint);
    puddleMaterial.color.copy(day.bottom).multiplyScalar(0.62);
    puddleMaterial.visible = graphics.puddles;
  }

  function updateSky(delta, player) {
    const cameraPosition = camera.position;
    clouds.visible = graphics.clouds;
    dust.points.visible = graphics.dust;
    leaves.points.visible = graphics.debris;
    papers.points.visible = graphics.debris;
    fireflies.points.visible = graphics.insects;
    clouds.position.set(cameraPosition.x, CLOUD_HEIGHT, cameraPosition.z);
    cloudOffset.x += WIND.x * WIND.strength * 3.2 * delta;
    cloudOffset.y += WIND.z * WIND.strength * 3.2 * delta;
    clouds.material.uniforms.uOffset.value.copy(cloudOffset);
    clouds.material.uniforms.uColor.value.copy(day.cloud);
    clouds.material.uniforms.uOpacity.value = 0.34 + 0.26 * (1 - day.night);

    stars.position.copy(cameraPosition);
    stars.material.opacity = day.stars * 0.9;
    stars.visible = active && day.stars > 0.02;

    const angle = (day.phase - 0.25) * Math.PI * 2;
    sunRaw.set(Math.cos(angle), Math.sin(angle), 0.35).normalize();
    sun.position.copy(cameraPosition).addScaledVector(sunRaw, 720);
    sun.material.color.copy(day.sun);
    sun.material.opacity = 0.7 * THREE.MathUtils.smoothstep(day.sinElevation, -0.08, 0.22);
    sun.visible = active && sun.material.opacity > 0.01;
    moon.position.copy(cameraPosition).addScaledVector(sunRaw, -720);
    moon.material.opacity = 0.9 * day.night * THREE.MathUtils.smoothstep(-day.sinElevation, -0.05, 0.2);
    moon.visible = active && moon.material.opacity > 0.01;
  }

  function wrap(value, center, half) {
    const span = half * 2;
    return center + ((((value - center + half) % span) + span) % span) - half;
  }

  function updateAmbient(delta, player) {
    const t = env.time;
    const daylight = 1 - day.night;

    for (let i = 0; i < COUNT.dust; i += 1) {
      const track = dustTracks[i];
      track.x += (Math.sin(t * 0.3 + track.phase) * 0.12 + WIND.x * 0.12 * WIND.strength) * delta;
      track.z += (Math.cos(t * 0.27 + track.phase) * 0.12 + WIND.z * 0.12 * WIND.strength) * delta;
      track.y = (track.y + (0.02 + Math.sin(t * 0.4 + track.phase) * 0.015) * delta / 6 + 1) % 1;
      const x = wrap(player.x + track.x, player.x, BOX.dust);
      const z = wrap(player.z + track.z, player.z, BOX.dust);
      track.x = x - player.x;
      track.z = z - player.z;
      dust.positions.set([x, ground + 0.3 + track.y * 6, z], i * 3);
      dust.sizes[i] = 0.07 + 0.05 * Math.sin(track.phase * 3);
      dust.alphas[i] = 0.2 * daylight * (0.55 + 0.45 * Math.sin(t * 1.1 + track.phase * 2));
      dust.colors.set([0.85, 0.82, 0.74], i * 3);
    }
    dust.commit();

    const gust = WIND.strength;
    for (let i = 0; i < COUNT.leaves; i += 1) {
      const track = leafTracks[i];
      const speed = (0.7 + track.speed * 1.6) * gust;
      track.x += (WIND.x * speed + Math.sin(t * 1.3 + track.phase) * 0.6) * delta;
      track.z += (WIND.z * speed + Math.cos(t * 1.1 + track.phase) * 0.6) * delta;
      const x = wrap(player.x + track.x, player.x, BOX.leaves);
      const z = wrap(player.z + track.z, player.z, BOX.leaves);
      track.x = x - player.x;
      track.z = z - player.z;
      leaves.positions.set([x, ground + 0.35 + (Math.sin(t * 0.8 + track.phase * 2) + 1) * 0.9 * (0.5 + 0.5 * gust), z], i * 3);
      leaves.rotations[i] += track.spin * delta * gust;
      leaves.sizes[i] = 0.2;
      leaves.alphas[i] = 0.92;
      leaves.colors.set(track.color, i * 3);
    }
    leaves.commit();

    for (let i = 0; i < COUNT.papers; i += 1) {
      const track = paperTracks[i];
      const speed = (0.6 + track.speed * 1.3) * gust;
      track.x += (WIND.x * speed + Math.sin(t * 1.7 + track.phase) * 0.5) * delta;
      track.z += (WIND.z * speed + Math.cos(t * 1.5 + track.phase) * 0.5) * delta;
      const x = wrap(player.x + track.x, player.x, BOX.leaves);
      const z = wrap(player.z + track.z, player.z, BOX.leaves);
      track.x = x - player.x;
      track.z = z - player.z;
      papers.positions.set([x, ground + 0.3 + (Math.sin(t * 0.9 + track.phase * 2) + 1) * 0.7 * (0.5 + 0.5 * gust), z], i * 3);
      papers.rotations[i] += track.spin * delta * gust;
      papers.sizes[i] = 0.26;
      papers.alphas[i] = 0.85;
      papers.colors.set([0.76, 0.74, 0.68], i * 3);
    }
    papers.commit();

    for (let i = 0; i < COUNT.fireflies; i += 1) {
      const track = fireflyTracks[i];
      const x = wrap(player.x + track.x, player.x, BOX.fireflies) + Math.sin(t * 0.4 + track.phase) * 1.4;
      const z = wrap(player.z + track.z, player.z, BOX.fireflies) + Math.cos(t * 0.35 + track.phase) * 1.4;
      fireflies.positions.set([x, ground + 0.6 + track.y * 1.8 + Math.sin(t * 0.7 + track.phase * 2) * 0.3, z], i * 3);
      const pulse = Math.max(0, Math.sin(t * 1.5 + track.phase * 3));
      fireflies.sizes[i] = 0.16;
      fireflies.alphas[i] = THREE.MathUtils.smoothstep(day.night, 0.5, 0.9) * pulse * pulse * 0.9;
      fireflies.colors.set([0.82, 1, 0.38], i * 3);
    }
    fireflies.commit();
  }

  function update(delta, player) {
    env.time += delta;
    updateWind(delta, graphics.wind);
    const step = Math.min(delta, 0.1);

    computeDay(day, Date.now(), graphics.daynight ? override : 0.5);
    env.night = active ? day.night : 0;

    if (active) {
      applyDay();
      skyTimer += delta;
      if (skyTimer >= SKY_INTERVAL) {
        skyTimer = 0;
        drawSky();
      }
      updateSky(delta, player);
      ground = player.y;
      updateAmbient(step, player);
    } else {
      for (const part of [clouds, stars, sun, moon, dust.points, leaves.points, papers.points, fireflies.points]) part.visible = false;
    }

    const scale = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    for (const system of systems) {
      system.setScale(scale);
    }
    sparks.update(step);
    smoke.update(step);

    fx.update(step, camera.position);
    sparks.points.visible = graphics.fire;
    smoke.points.visible = graphics.smoke;
    birds.update(step, player, active && graphics.birds && day.night < 0.55);
  }

  function scan() {
    fx.scan();
  }

  return { setWorld, update, scan, isNight: () => env.night > 0.5 };
}
