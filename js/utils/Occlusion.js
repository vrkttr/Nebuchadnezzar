export function createOcclusion() {
  let blockers = [];

  function setBlockers(list) {
    blockers = list.map((blocker) => ({
      x: blocker.x,
      z: blocker.z,
      halfX: blocker.halfX,
      halfZ: blocker.halfZ,
      height: blocker.height,
      cos: Math.cos(blocker.rotation),
      sin: Math.sin(blocker.rotation),
    }));
  }

  function isBlocked(from, to) {
    for (const blocker of blockers) {
      const fx = from.x - blocker.x;
      const fz = from.z - blocker.z;
      const tx = to.x - blocker.x;
      const tz = to.z - blocker.z;
      const start = [fx * blocker.cos - fz * blocker.sin, fx * blocker.sin + fz * blocker.cos];
      const end = [tx * blocker.cos - tz * blocker.sin, tx * blocker.sin + tz * blocker.cos];
      const half = [blocker.halfX, blocker.halfZ];
      let enter = 0;
      let leave = 1;
      let hit = true;

      for (let axis = 0; axis < 2; axis += 1) {
        const delta = end[axis] - start[axis];

        if (Math.abs(delta) < 1e-9) {
          if (Math.abs(start[axis]) > half[axis]) hit = false;
          continue;
        }

        let near = (-half[axis] - start[axis]) / delta;
        let far = (half[axis] - start[axis]) / delta;
        if (near > far) [near, far] = [far, near];
        enter = Math.max(enter, near);
        leave = Math.min(leave, far);
      }

      if (!hit || enter > leave || leave <= 0 || enter >= 1) continue;
      if (from.y + (to.y - from.y) * Math.max(enter, 0) > blocker.height) continue;
      return true;
    }

    return false;
  }

  return { setBlockers, isBlocked };
}
