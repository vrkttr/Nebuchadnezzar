import * as THREE from 'three';
import { applyWind } from '../effects/Wind.js';

const TEXTURE_PATH = 'assets/textures/';
const loader = new THREE.TextureLoader();
const textures = new Map();
const materials = new Map();

export const windowMaterials = [];

export function getTexture(name) {
  if (textures.has(name)) return textures.get(name);

  const texture = loader.load(`${TEXTURE_PATH}${name}.png`);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  textures.set(name, texture);
  return texture;
}

export function getMaterial(name, options = {}) {
  const key = `${name}|${JSON.stringify(options)}`;
  if (materials.has(key)) return materials.get(key);

  const { unlit = false, ...rest } = options;
  const Material = unlit ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
  const material = new Material({ map: getTexture(name), ...rest });
  if (name === 'leaves') applyWind(material, 'crown');
  else if (name === 'foliage') applyWind(material, 'grass');
  else if (name === 'window_lit') windowMaterials.push(material);
  materials.set(key, material);
  return material;
}

export function getColorMaterial(color, options = {}) {
  const key = `color:${color}|${JSON.stringify(options)}`;
  if (materials.has(key)) return materials.get(key);

  const { unlit = false, ...rest } = options;
  const Material = unlit ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
  const material = new Material({ color, ...rest });
  materials.set(key, material);
  return material;
}

export const OVERLAY = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
export const OVERLAY_TOP = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 };
