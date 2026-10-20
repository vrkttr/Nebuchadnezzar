import { createPlattenbau } from './builders/Plattenbau.js';
import { createWaterTower } from './builders/Tower.js';
import { createGarages } from './builders/Garages.js';
import { createTree, createForest, createBush, createGrassTufts } from './builders/Vegetation.js';
import {
  createBarrel,
  createCrate,
  createBin,
  createBench,
  createPlayground,
  createRaisedBed,
  createClothesline,
  createLamp,
  createFence,
  createGateLeaf,
  createCar,
  createStall,
  createBarricade,
  createTent,
  createPole,
  createContainer,
} from './builders/Props.js';

export function createAssetLibrary() {
  const factories = new Map();

  function register(kind, factory) {
    factories.set(kind, factory);
  }

  function create(kind, params = {}) {
    const factory = factories.get(kind);
    if (!factory) throw new Error(`Unbekannter Asset-Typ: ${kind}`);
    return factory(params);
  }

  register('plattenbau', (params) => createPlattenbau(params).object);
  register('wasserturm', createWaterTower);
  register('garagen', createGarages);
  register('baum', createTree);
  register('wald', createForest);
  register('busch', createBush);
  register('grasbueschel', createGrassTufts);
  register('fass', createBarrel);
  register('kiste', createCrate);
  register('muelltonne', createBin);
  register('bank', createBench);
  register('spielplatz', createPlayground);
  register('hochbeet', createRaisedBed);
  register('waescheleine', createClothesline);
  register('laterne', createLamp);
  register('zaun', createFence);
  register('torfluegel', createGateLeaf);
  register('auto', createCar);
  register('marktstand', createStall);
  register('barrikade', createBarricade);
  register('zelt', createTent);
  register('mast', createPole);
  register('container', createContainer);

  return { register, create };
}
