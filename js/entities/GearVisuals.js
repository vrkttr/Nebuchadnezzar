import * as THREE from 'three';
import { getMaterial } from '../world/Textures.js';

const cloth = (color) => getMaterial('cloth', { color });
const metal = (color) => getMaterial('rust_metal', { color });
const dark = () => getMaterial('plastic', { color: 0x15191b });

function box(width, height, depth, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  return mesh;
}

function accentStrip(group, look, width, y, depth, z = 0) {
  if (look.accent === null || look.accent === undefined) return;
  group.add(box(width, 0.025, depth, cloth(look.accent), 0, y, z));
}

const ARMOR = {
  head(group, look) {
    const t = look.tier;
    const main = t >= 1 ? metal(look.main) : cloth(look.main);
    const trim = metal(look.trim);
    if (t === 0) {
      group.add(box(0.29, 0.1, 0.29, main, 0, 0.27, 0));
      group.add(box(0.29, 0.02, 0.1, cloth(look.trim), 0, 0.22, 0.17));
    } else if (t <= 2) {
      group.add(box(0.31, 0.14, 0.31, main, 0, 0.27, 0));
      group.add(box(0.34, 0.03, 0.34, trim, 0, 0.21, 0));
    } else if (t <= 4) {
      group.add(box(0.32, 0.16, 0.32, main, 0, 0.26, 0));
      group.add(box(0.34, 0.03, 0.34, trim, 0, 0.2, 0));
      group.add(box(0.03, 0.14, 0.2, trim, 0.165, 0.15, -0.02));
      group.add(box(0.03, 0.14, 0.2, trim, -0.165, 0.15, -0.02));
      group.add(box(0.26, 0.06, 0.03, dark(), 0, 0.17, 0.165));
    } else if (t <= 6) {
      group.add(box(0.33, 0.2, 0.33, main, 0, 0.25, 0));
      group.add(box(0.27, 0.14, 0.05, trim, 0, 0.11, 0.155));
      group.add(box(0.07, 0.07, 0.1, metal(0x55554f), 0, 0.07, 0.22));
      group.add(box(0.07, 0.04, 0.03, dark(), 0.07, 0.17, 0.185));
      group.add(box(0.07, 0.04, 0.03, dark(), -0.07, 0.17, 0.185));
    } else {
      group.add(box(0.34, 0.22, 0.34, main, 0, 0.25, 0));
      group.add(box(0.06, 0.05, 0.32, trim, 0, 0.375, 0));
      group.add(box(0.3, 0.14, 0.05, main, 0, 0.12, -0.17));
      group.add(box(0.28, 0.06, 0.03, dark(), 0, 0.17, 0.175));
      group.add(box(0.03, 0.16, 0.22, trim, 0.175, 0.14, 0));
      group.add(box(0.03, 0.16, 0.22, trim, -0.175, 0.14, 0));
    }
    accentStrip(group, look, 0.335, 0.215 + (t >= 5 ? 0.04 : 0), 0.335);
  },
  chest(group, look) {
    const t = look.tier;
    const main = cloth(look.main);
    const trim = t >= 3 ? metal(look.trim) : cloth(look.trim);
    const wide = 0.5 + Math.min(t, 8) * 0.006;
    group.add(box(wide, 0.42, 0.29 + Math.min(t, 8) * 0.006, main, 0, 0.4, 0));
    if (t <= 2) {
      group.add(box(0.13, 0.1, 0.04, trim, 0.12, 0.3, 0.16));
      group.add(box(0.13, 0.1, 0.04, trim, -0.12, 0.3, 0.16));
    } else {
      group.add(box(0.36, 0.26, 0.04, trim, 0, 0.44, 0.17));
      group.add(box(0.1, 0.06, 0.31, trim, 0.14, 0.62, 0));
      group.add(box(0.1, 0.06, 0.31, trim, -0.14, 0.62, 0));
    }
    if (t >= 5) {
      group.add(box(0.34, 0.3, 0.05, trim, 0, 0.42, -0.17));
      group.add(box(0.04, 0.28, 0.2, trim, 0.27, 0.42, 0));
      group.add(box(0.04, 0.28, 0.2, trim, -0.27, 0.42, 0));
    }
    accentStrip(group, look, wide + 0.01, 0.27, 0.31);
  },
  belt(group, look) {
    const t = look.tier;
    group.add(box(0.48, 0.07, 0.28, cloth(look.main), 0, 0.1, 0));
    group.add(box(0.08, 0.07, 0.03, metal(look.trim), 0, 0.1, 0.15));
    if (t >= 2) {
      group.add(box(0.1, 0.1, 0.08, cloth(look.trim), 0.18, 0.04, 0.14));
      group.add(box(0.1, 0.1, 0.08, cloth(look.trim), -0.18, 0.04, 0.14));
    }
    if (t >= 5) {
      group.add(box(0.1, 0.1, 0.08, metal(look.trim), 0, 0.04, -0.15));
      group.add(box(0.5, 0.025, 0.3, metal(look.trim), 0, 0.14, 0));
    }
    accentStrip(group, look, 0.49, 0.138, 0.29);
  },
  legs(group, look) {
    const t = look.tier;
    const trim = t >= 3 ? metal(look.trim) : cloth(look.trim);
    group.add(box(0.15, 0.12, 0.03, trim, 0, -0.02, 0.12));
    if (t >= 4) group.add(box(0.2, 0.3, 0.03, trim, 0, 0.2, 0.115));
    if (t >= 7) group.add(box(0.03, 0.3, 0.18, trim, 0.11, 0.2, 0));
    accentStrip(group, look, 0.21, -0.14, 0.23);
  },
  feet(group, look) {
    const t = look.tier;
    const main = t >= 5 ? metal(look.main) : cloth(look.main);
    const trim = metal(look.trim);
    group.add(box(0.2, 0.14 + t * 0.012, 0.22, main, 0, -0.33 - t * 0.003, 0));
    group.add(box(0.2, 0.1, 0.32, main, 0, -0.36, 0.05));
    group.add(box(0.21, 0.04, 0.34, dark(), 0, -0.415, 0.05));
    if (t >= 3) group.add(box(0.21, 0.03, 0.22, trim, 0, -0.26 - t * 0.006, 0));
    if (t >= 5) group.add(box(0.19, 0.09, 0.1, trim, 0, -0.37, 0.2));
    accentStrip(group, look, 0.21, -0.3, 0.23);
  },
  hands(group, look) {
    const t = look.tier;
    const main = cloth(look.main);
    group.add(box(0.12, 0.12, 0.12, main, 0, -0.04, 0));
    group.add(box(0.14, 0.05 + Math.min(t, 6) * 0.008, 0.14, cloth(look.trim), 0, 0.04, 0));
    if (t >= 4) group.add(box(0.1, 0.035, 0.05, metal(look.trim), 0, -0.07, 0.065));
    if (t >= 7) group.add(box(0.15, 0.1, 0.15, metal(look.trim), 0, 0.09, 0));
    accentStrip(group, look, 0.145, 0.07, 0.145);
  },
  shoulders(group, look, side) {
    const t = look.tier;
    const main = t >= 4 ? metal(look.main) : cloth(look.main);
    const size = 0.17 + Math.min(t, 8) * 0.01;
    group.add(box(size, 0.06 + t * 0.006, size + 0.02, main, side * 0.045, 0.05, 0));
    group.add(box(size + 0.02, 0.025, size + 0.04, metal(look.trim), side * 0.05, 0.02, 0));
    if (t >= 5) group.add(box(size - 0.04, 0.05, size - 0.02, main, side * 0.06, 0.1, 0));
    if (t >= 8) group.add(box(0.04, 0.1, 0.04, metal(look.trim), side * 0.09, 0.17, 0));
    accentStrip(group, look, size + 0.02, 0.083 + t * 0.003, size + 0.04);
  },
};

const WEAPON = {
  knife(group, look) {
    const v = look.variant;
    group.add(box(0.02, 0.2 + v * 0.015, 0.05, metal(look.main), 0, -0.14, 0.01));
    group.add(box(0.03, 0.09, 0.035, cloth(look.grip), 0, 0.0, 0));
    if (v >= 2) group.add(box(0.03, 0.03, 0.07, metal(0x3a3a38), 0, -0.04, 0));
  },
  blade(group, look) {
    const v = look.variant;
    const length = 0.55 + v * 0.04;
    group.add(box(0.03, length, 0.07 + (v === 0 ? 0.03 : 0), metal(look.main), 0, -0.1 - length / 2, 0.01));
    group.add(box(0.035, 0.12, 0.04, cloth(look.grip), 0, 0.04, 0));
    group.add(box(0.04, 0.03, 0.1, metal(0x3a3a38), 0, -0.1, 0));
    if (v === 2) group.add(box(0.03, 0.1, 0.1, metal(look.main), 0, -0.62, 0.07));
    if (v === 3) group.add(box(0.03, 0.12, 0.14, metal(look.main), 0, -0.72, 0.1));
  },
  chainsaw(group, look) {
    group.add(box(0.1, 0.14, 0.16, metal(0x7a2a22), 0, -0.06, -0.02));
    group.add(box(0.03, 0.04, 0.55, metal(look.main), 0, -0.1, 0.38));
    group.add(box(0.045, 0.02, 0.5, metal(0x3a3a38), 0, -0.1, 0.38));
    group.add(box(0.04, 0.12, 0.04, cloth(look.grip), 0, 0.04, -0.1));
  },
  axe(group, look) {
    const v = look.variant;
    group.add(box(0.035, 0.85, 0.035, cloth(look.grip), 0, -0.3, 0));
    group.add(box(0.05, 0.16 + (v === 1 ? 0.04 : 0), 0.2 + (v === 1 ? 0.04 : 0), metal(look.main), 0, -0.68, 0.09));
    group.add(box(0.03, 0.1, 0.1, metal(0x9a9a92), 0, -0.68, 0.2 + (v === 1 ? 0.02 : 0)));
    if (v === 2) group.add(box(0.05, 0.16, 0.2, metal(look.main), 0, -0.68, -0.09));
    if (v === 3) group.add(box(0.04, 0.05, 0.16, metal(0x8a2a22), 0, -0.68, -0.1));
  },
  hammer(group, look) {
    const v = look.variant;
    group.add(box(0.04, 0.8 + (v >= 2 ? 0.15 : 0), 0.04, cloth(look.grip), 0, -0.3, 0));
    group.add(box(0.12 + v * 0.01, 0.14 + (v >= 2 ? 0.04 : 0), 0.24 + v * 0.01, metal(look.main), 0, -0.72 - (v >= 2 ? 0.1 : 0), 0));
  },
  club(group, look) {
    const v = look.variant;
    if (v === 5) {
      group.add(box(0.04, 0.7, 0.04, cloth(look.grip), 0, -0.3, 0));
      group.add(box(0.14, 0.14, 0.14, metal(look.main), 0, -0.72, 0));
      return;
    }
    const wood = v === 1 || v === 3 || v === 4 ? metal(look.main) : cloth(look.grip);
    group.add(box(0.035, 0.5, 0.035, wood, 0, -0.3, 0));
    group.add(box(0.06 + (v === 4 ? 0.02 : 0), 0.3, 0.06 + (v === 4 ? 0.02 : 0), wood, 0, -0.62, 0));
    if (v === 0 || v === 2) {
      group.add(box(0.03, 0.03, 0.03, metal(0x8a6a50), 0.05, -0.56, 0));
      group.add(box(0.03, 0.03, 0.03, metal(0x8a6a50), -0.05, -0.66, 0));
    }
    group.add(box(0.04, 0.12, 0.04, cloth(0x3a3a38), 0, 0, 0));
  },
  spear(group, look) {
    const long = look.variant === 1;
    group.add(box(0.03, long ? 1.2 : 0.9, 0.03, cloth(look.grip), 0, long ? -0.4 : -0.25, 0));
    group.add(box(0.035, 0.18, 0.08, metal(look.main), 0, long ? -1.05 : -0.75, 0));
  },
};

function gun(group, look, parts) {
  const dark1 = metal(0x2a2a28);
  const wood = cloth(look.grip);
  parts({ dark1, wood, steel: metal(look.main), black: metal(0x1e1e1c) });
}

const RANGED = {
  pistol(group, look) {
    gun(group, look, ({ dark1, steel }) => {
      const long = look.variant === 1 ? 0.04 : 0;
      group.add(box(0.045, 0.2 + long, 0.06, dark1, 0, -0.1, 0));
      group.add(box(0.04, 0.09, 0.05, cloth(0x1e1e1c), 0, -0.04, -0.05));
      group.add(box(0.036, 0.04, 0.1 + long, steel, 0, -0.17, 0.08));
      if (look.variant === 4) group.add(box(0.05, 0.05, 0.14, dark1, 0, -0.14, 0.1));
    });
  },
  revolver(group, look) {
    gun(group, look, ({ dark1, steel, wood }) => {
      group.add(box(0.04, 0.12, 0.05, wood, 0, -0.05, -0.02));
      group.add(box(0.04, 0.05, 0.14 + look.variant * 0.04, dark1, 0, -0.12, 0.05));
      group.add(box(0.05, 0.06, 0.05, steel, 0, -0.12, 0));
      group.add(box(0.03, 0.03, 0.16, steel, 0, -0.14, 0.13));
    });
  },
  smg(group, look) {
    gun(group, look, ({ dark1, black }) => {
      group.add(box(0.05, 0.12, 0.34, dark1, 0, -0.1, 0.08));
      group.add(box(0.04, 0.18, 0.05, black, 0, -0.22, 0.04));
      group.add(box(0.04, 0.1, 0.05, black, 0, -0.04, -0.04));
      group.add(box(0.03, 0.03, 0.14, dark1, 0, -0.1, 0.3));
      if (look.variant >= 2) group.add(box(0.04, 0.04, 0.12, dark1, 0, -0.04, -0.2));
    });
  },
  rifle(group, look) {
    gun(group, look, ({ dark1, wood, black }) => {
      group.add(box(0.05, 0.14, 0.26, wood, 0, -0.1, -0.12));
      group.add(box(0.045, 0.07, 0.5, dark1, 0, -0.12, 0.2));
      group.add(box(0.025, 0.025, 0.2, dark1, 0, -0.12, 0.55));
      group.add(box(0.04, 0.16, 0.06, black, 0, -0.2, 0.08));
      if (look.variant >= 2) group.add(box(0.04, 0.05, 0.18, black, 0, -0.04, 0.15));
    });
  },
  shotgun(group, look) {
    gun(group, look, ({ dark1, wood }) => {
      group.add(box(0.05, 0.14, 0.2, wood, 0, -0.1, -0.12));
      if (look.variant === 0) {
        group.add(box(0.03, 0.05, 0.55, dark1, 0.02, -0.14, 0.2));
        group.add(box(0.03, 0.05, 0.55, dark1, -0.02, -0.14, 0.2));
      } else {
        group.add(box(0.045, 0.06, 0.55, dark1, 0, -0.14, 0.2));
        group.add(box(0.05, 0.05, 0.22, wood, 0, -0.2, 0.18));
      }
    });
  },
  sniper(group, look) {
    gun(group, look, ({ dark1, wood, black }) => {
      group.add(box(0.05, 0.14, 0.26, wood, 0, -0.1, -0.12));
      group.add(box(0.035, 0.05, 0.75, dark1, 0, -0.14, 0.32));
      group.add(box(0.04, 0.05, 0.22, black, 0, -0.04, 0.08));
      group.add(box(0.04, 0.12, 0.04, black, 0.0, -0.2, 0.62));
    });
  },
  mg(group, look) {
    gun(group, look, ({ dark1, black }) => {
      group.add(box(0.06, 0.14, 0.5, dark1, 0, -0.1, 0.12));
      group.add(box(0.05, 0.1, 0.2, cloth(look.grip), 0, -0.1, -0.2));
      group.add(box(0.08, 0.1, 0.1, black, 0, -0.2, 0.05));
      group.add(box(0.03, 0.03, 0.2, dark1, 0, -0.1, 0.45));
    });
  },
  crossbow(group, look) {
    gun(group, look, ({ wood, steel }) => {
      group.add(box(0.05, 0.1, 0.5, wood, 0, -0.1, 0.1));
      group.add(box(0.5, 0.03, 0.04, steel, 0, -0.08, 0.34));
      group.add(box(0.02, 0.02, 0.3, metal(0xa8a8a0), 0, -0.07, 0.3));
    });
  },
};

export function buildGearVisual(slot, look, side = 1) {
  if (!look) return null;

  const builder = slot === 'weapon' ? WEAPON[look.kind] ?? RANGED[look.kind] : ARMOR[slot];
  if (!builder) return null;

  return (group) => builder(group, look, side);
}

export function pantsColorFor(look) {
  return look?.main ?? null;
}
