const WALK_STRIDE = 1.25;
const RUN_STRIDE = 2;
const RUN_SPEED = 2.7;
const MIN_SPEED = 0.35;
const TELEPORT_DISTANCE = 4;
const GROUND_HEIGHT = 0.12;

export function createFootsteps(audio, isInWater = () => false) {
  const tracked = new Map();
  let ownAirborne = false;
  let groundX = 0;
  let groundZ = 0;

  function setGroundVelocity(x, z) {
    groundX = x;
    groundZ = z;
  }

  function advance(key, x, z, delta, velocityX = 0, velocityZ = 0) {
    let entry = tracked.get(key);

    if (!entry) {
      entry = { x, z, travelled: 0, seen: true };
      tracked.set(key, entry);
      return null;
    }

    const distance = Math.hypot(x - entry.x - velocityX * delta, z - entry.z - velocityZ * delta);
    entry.x = x;
    entry.z = z;
    entry.seen = true;

    if (distance > TELEPORT_DISTANCE || delta <= 0) return null;

    const speed = distance / delta;
    if (speed < MIN_SPEED) {
      entry.travelled = 0;
      return null;
    }

    const running = speed >= RUN_SPEED;
    entry.travelled += distance;

    if (entry.travelled < (running ? RUN_STRIDE : WALK_STRIDE)) return null;

    entry.travelled = 0;
    return { running };
  }

  function update(delta, own, others, groundY = 0) {
    for (const entry of tracked.values()) entry.seen = false;

    const ownStep = advance('own', own.x, own.z, delta, groundX, groundZ);
    const grounded = own.y - groundY < GROUND_HEIGHT;

    if (!grounded && !ownAirborne) {
      ownAirborne = true;
      audio.play('jump');
    } else if (grounded && ownAirborne) {
      ownAirborne = false;
      audio.play('land');
    }

    if (ownStep && grounded) audio.play(isInWater(own.x, own.z) ? 'splash' : 'step', { volume: ownStep.running ? 1 : 0.65 });

    for (const other of others) {
      const result = advance(other.key, other.x, other.z, delta);
      if (result) audio.playAt(isInWater(other.x, other.z) ? 'splash' : 'step', other.x, other.z, result.running ? 0.9 : 0.6);
    }

    for (const [key, entry] of tracked) {
      if (!entry.seen) tracked.delete(key);
    }
  }

  return { update, setGroundVelocity };
}
