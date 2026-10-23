import * as THREE from 'three';
import { WIND } from './Wind.js';

const VERTEX = `
attribute float aSize;
attribute float aAlpha;
attribute float aRot;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying float vRot;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_PointSize = min( aSize * uScale / max( -mv.z, 0.1 ), 160.0 );
  vAlpha = aAlpha * smoothstep( 0.4, 1.6, -mv.z );
  vRot = aRot;
  vColor = aColor;
}`;

const FRAGMENT = `
uniform sampler2D uMap;
varying float vAlpha;
varying float vRot;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float s = sin( vRot );
  float k = cos( vRot );
  vec2 uv = vec2( k * c.x - s * c.y, s * c.x + k * c.y ) + 0.5;
  vec4 tex = texture2D( uMap, uv );
  float alpha = tex.a * vAlpha;
  if ( alpha < 0.004 ) discard;
  gl_FragColor = vec4( vColor * tex.rgb, alpha );
}`;

const textures = new Map();

function canvasTexture(draw, width = 64, height = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function radial(context, size, stops) {
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [position, alpha] of stops) gradient.addColorStop(position, `rgba(255,255,255,${alpha})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
}

export function spriteTexture(kind) {
  if (textures.has(kind)) return textures.get(kind);
  let texture;

  if (kind === 'puff') {
    texture = canvasTexture((context, size) => {
      radial(context, size, [[0, 0.95], [0.4, 0.55], [0.75, 0.15], [1, 0]]);
      for (let i = 0; i < 9; i += 1) {
        const x = size * (0.25 + 0.5 * ((i * 37) % 10) / 10);
        const y = size * (0.25 + 0.5 * ((i * 53) % 10) / 10);
        const gradient = context.createRadialGradient(x, y, 0, x, y, size * 0.22);
        gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
      }
    });
  } else if (kind === 'spark') {
    texture = canvasTexture((context, size) => radial(context, size, [[0, 1], [0.2, 0.85], [0.5, 0.25], [1, 0]]));
  } else if (kind === 'glow') {
    texture = canvasTexture((context, size) => radial(context, size, [[0, 1], [0.15, 0.6], [0.45, 0.2], [1, 0]]), 128, 128);
  } else if (kind === 'leaf') {
    texture = canvasTexture((context, size) => {
      context.translate(size / 2, size / 2);
      context.rotate(-0.5);
      context.fillStyle = 'rgba(255,255,255,1)';
      context.beginPath();
      context.ellipse(0, 0, size * 0.42, size * 0.2, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = 'rgba(120,120,120,1)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-size * 0.4, 0);
      context.lineTo(size * 0.4, 0);
      context.stroke();
    });
  } else if (kind === 'paper') {
    texture = canvasTexture((context, size) => {
      context.fillStyle = 'rgba(255,255,255,1)';
      context.fillRect(size * 0.18, size * 0.1, size * 0.64, size * 0.8);
      context.fillStyle = 'rgba(150,150,150,1)';
      context.fillRect(size * 0.18, size * 0.1, size * 0.28, size * 0.8);
      context.fillStyle = 'rgba(120,120,120,0.9)';
      for (let i = 0; i < 5; i += 1) context.fillRect(size * 0.52, size * (0.2 + i * 0.13), size * 0.24, 2);
    });
  } else if (kind === 'flame') {
    texture = canvasTexture((context, width, height) => {
      context.filter = 'blur(2px)';
      const gradient = context.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, 'rgba(255,245,200,1)');
      gradient.addColorStop(0.3, 'rgba(255,190,70,0.95)');
      gradient.addColorStop(0.7, 'rgba(255,110,30,0.6)');
      gradient.addColorStop(1, 'rgba(255,60,10,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(width / 2, 4);
      context.bezierCurveTo(width * 0.62, height * 0.3, width * 0.9, height * 0.55, width * 0.78, height * 0.82);
      context.bezierCurveTo(width * 0.7, height * 0.97, width * 0.3, height * 0.97, width * 0.22, height * 0.82);
      context.bezierCurveTo(width * 0.1, height * 0.55, width * 0.38, height * 0.3, width / 2, 4);
      context.fill();
    }, 64, 128);
  } else if (kind === 'moon') {
    texture = canvasTexture((context, size) => {
      const glow = context.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
      glow.addColorStop(0, 'rgba(220,230,255,0.5)');
      glow.addColorStop(1, 'rgba(220,230,255,0)');
      context.fillStyle = glow;
      context.fillRect(0, 0, size, size);
      context.fillStyle = 'rgba(232,236,246,1)';
      context.beginPath();
      context.arc(size / 2, size / 2, size * 0.16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(190,198,216,0.8)';
      for (const [x, y, r] of [[0.45, 0.46, 0.035], [0.55, 0.53, 0.028], [0.5, 0.42, 0.02]]) {
        context.beginPath();
        context.arc(size * x, size * y, size * r, 0, Math.PI * 2);
        context.fill();
      }
    }, 128, 128);
  }

  textures.set(kind, texture);
  return texture;
}

export function createParticleSystem({ max, texture, additive = false, gravity = 0, drag = 0, windPush = 0 }) {
  const positions = new Float32Array(max * 3);
  const sizes = new Float32Array(max);
  const alphas = new Float32Array(max);
  const rotations = new Float32Array(max);
  const colors = new Float32Array(max * 3);
  const velocity = new Float32Array(max * 3);
  const age = new Float32Array(max).fill(1);
  const life = new Float32Array(max).fill(1);
  const size0 = new Float32Array(max);
  const size1 = new Float32Array(max);
  const alpha0 = new Float32Array(max);
  const spin = new Float32Array(max);
  const fadeIn = new Float32Array(max);

  const geometry = new THREE.BufferGeometry();
  const attributes = {
    position: new THREE.BufferAttribute(positions, 3),
    aSize: new THREE.BufferAttribute(sizes, 1),
    aAlpha: new THREE.BufferAttribute(alphas, 1),
    aRot: new THREE.BufferAttribute(rotations, 1),
    aColor: new THREE.BufferAttribute(colors, 3),
  };
  for (const [name, attribute] of Object.entries(attributes)) {
    attribute.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, attribute);
  }

  const uniforms = { uMap: { value: texture }, uScale: { value: 800 } };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = additive ? 20 : 15;

  let cursor = 0;

  function spawn(options) {
    let slot = -1;
    for (let n = 0; n < max; n += 1) {
      const index = (cursor + n) % max;
      if (age[index] >= life[index]) {
        slot = index;
        break;
      }
    }
    if (slot < 0) slot = cursor;
    cursor = (slot + 1) % max;

    const { x, y, z, vx = 0, vy = 0, vz = 0, lifetime = 1, from = 0.1, to = 0.1, alpha = 1, rotation = 0, rotationSpeed = 0, r = 1, g = 1, b = 1, fade = 0.15 } = options;
    positions.set([x, y, z], slot * 3);
    velocity.set([vx, vy, vz], slot * 3);
    colors.set([r, g, b], slot * 3);
    age[slot] = 0;
    life[slot] = lifetime;
    size0[slot] = from;
    size1[slot] = to;
    alpha0[slot] = alpha;
    rotations[slot] = rotation;
    spin[slot] = rotationSpeed;
    fadeIn[slot] = fade;
  }

  function update(delta) {
    const windX = WIND.x * WIND.strength * windPush;
    const windZ = WIND.z * WIND.strength * windPush;
    for (let i = 0; i < max; i += 1) {
      if (age[i] >= life[i]) {
        if (alphas[i] !== 0) alphas[i] = 0;
        continue;
      }
      age[i] += delta;
      const t = Math.min(1, age[i] / life[i]);
      const o = i * 3;
      const damp = Math.max(0, 1 - drag * delta);
      velocity[o] = velocity[o] * damp + windX * delta;
      velocity[o + 1] = velocity[o + 1] * damp + gravity * delta;
      velocity[o + 2] = velocity[o + 2] * damp + windZ * delta;
      positions[o] += velocity[o] * delta;
      positions[o + 1] += velocity[o + 1] * delta;
      positions[o + 2] += velocity[o + 2] * delta;
      rotations[i] += spin[i] * delta;
      sizes[i] = size0[i] + (size1[i] - size0[i]) * t;
      alphas[i] = alpha0[i] * Math.min(1, t / fadeIn[i]) * (1 - t);
    }
    attributes.position.needsUpdate = true;
    attributes.aSize.needsUpdate = true;
    attributes.aAlpha.needsUpdate = true;
    attributes.aRot.needsUpdate = true;
    attributes.aColor.needsUpdate = true;
  }

  function commit() {
    attributes.position.needsUpdate = true;
    attributes.aSize.needsUpdate = true;
    attributes.aAlpha.needsUpdate = true;
    attributes.aRot.needsUpdate = true;
    attributes.aColor.needsUpdate = true;
  }

  function setScale(value) {
    uniforms.uScale.value = value;
  }

  return { points, spawn, update, commit, setScale, max, positions, sizes, alphas, rotations, colors };
}
