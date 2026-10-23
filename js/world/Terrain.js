import { createBatch } from './Batch.js';
import { getMaterial } from './Textures.js';

const CAP_THICKNESS = 0.03;

export function createTerrain(scene) {
  let group = null;
  let cells = null;
  let width = 0;
  let height = 0;
  let halfWidth = 0;
  let halfHeight = 0;
  let unit = 0;

  function clear() {
    if (group) {
      scene.remove(group);
      group.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
      });
    }
    group = null;
    cells = null;
  }

  function heightAt(x, z) {
    if (!cells) return 0;
    const ix = Math.floor(x + halfWidth);
    const iz = Math.floor(z + halfHeight);
    if (ix < 0 || iz < 0 || ix >= width || iz >= height) return 0;
    return cells[iz * width + ix] * unit;
  }

  function setZone(world) {
    clear();
    if (!world.heights || world.heights.cells.length === 0) return;

    width = world.width;
    height = world.height;
    halfWidth = width / 2;
    halfHeight = height / 2;
    unit = world.heights.unit;
    cells = new Int16Array(width * height);
    for (const [ix, iz, value] of world.heights.cells) cells[iz * width + ix] = value;

    const batch = createBatch();
    const top = getMaterial('slab');
    const side = getMaterial('concrete_panel', { color: 0xa8a49a });

    for (const [ix, iz, value] of world.heights.cells) {
      const h = value * unit;
      const x = ix + 0.5 - halfWidth;
      const z = iz + 0.5 - halfHeight;
      batch.box(side, 1, h - CAP_THICKNESS, 1, { x, y: (h - CAP_THICKNESS) / 2, z, tile: 1 });
      batch.box(top, 1, CAP_THICKNESS, 1, { x, y: h - CAP_THICKNESS / 2, z, tile: 1 });
    }

    group = batch.build('Gelaende');
    scene.add(group);
  }

  return { setZone, clear, heightAt };
}
