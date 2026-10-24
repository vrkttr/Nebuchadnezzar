export function createCounter(max, windowMs) {
  const entries = new Map();

  function live(key, now) {
    const entry = entries.get(key);
    if (!entry) return null;
    if (now - entry.start >= windowMs) {
      entries.delete(key);
      return null;
    }
    return entry;
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const key of entries.keys()) live(key, now);
  }, windowMs);
  timer.unref();

  return {
    blocked(key, now = Date.now()) {
      return (live(key, now)?.count ?? 0) >= max;
    },
    add(key, now = Date.now()) {
      const entry = live(key, now);
      if (entry) entry.count += 1;
      else entries.set(key, { start: now, count: 1 });
    },
    clear(key) {
      entries.delete(key);
    },
  };
}
