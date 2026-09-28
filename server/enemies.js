const SPAWNS = [
  { name: 'Plünderer', level: 1, x: 10, y: 0, z: -9, healthMax: 60 },
  { name: 'Plünderer', level: 1, x: 12, y: 0, z: -7, healthMax: 60 },
  { name: 'Plünderer', level: 2, x: 8, y: 0, z: -11, healthMax: 80 },
];

export function createEnemies() {
  const enemies = new Map();

  SPAWNS.forEach((spawn, index) => {
    const id = `enemy-${index + 1}`;
    enemies.set(id, {
      id,
      name: spawn.name,
      level: spawn.level,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      rotationY: 0,
      health: spawn.healthMax,
      healthMax: spawn.healthMax,
    });
  });

  return enemies;
}

export function serializeEnemies(enemies) {
  return Array.from(enemies.values()).map((enemy) => ({
    id: enemy.id,
    name: enemy.name,
    level: enemy.level,
    x: enemy.x,
    y: enemy.y,
    z: enemy.z,
    rotationY: enemy.rotationY,
    health: enemy.health,
    healthMax: enemy.healthMax,
  }));
}
