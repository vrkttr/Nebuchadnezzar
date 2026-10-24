import * as THREE from 'three';
import { addObject, createBuildContext, finishObjects } from './ZoneBuilder.js';

const LOAD_RADIUS = 600;
const UNLOAD_RADIUS = 700;
const MAX_REQUEST = 16;
const DETAIL_KINDS = new Set(['grasbueschel', 'busch', 'kiste', 'muelltonne', 'bank', 'hochbeet', 'waescheleine', 'barrikade']);
const DETAIL_FRACTION = 0.5;
const SPANNING_KINDS = new Set(['flaeche', 'leitung', 'flecken', 'weg', 'strasse']);
const READY_TIMEOUT_MS = 25000;
const RETRY_MS = 8000;

function disposeNode(root) {
  root.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
  });
}

export function createZoneStreamer({ scene, zoneGroup, world, send, onBlockers, onEmitters, onPath, onPathRemoved }) {
  const size = world.chunkSize;
  const halfWidth = world.width / 2;
  const halfHeight = world.height / 2;
  const columns = Math.ceil(world.width / size);
  const rows = Math.ceil(world.height / size);

  const chunks = new Map();
  const spans = new Map();
  const blockers = new Map();
  const waiters = [];
  let budgetMs = 5;
  let viewRadius = Infinity;
  let lastX = 0;
  let lastZ = 0;
  let blockersDirty = false;
  let emittersDirty = false;

  function keyOf(cx, cz) {
    return `${cx}|${cz}`;
  }

  function centerOf(cx, cz) {
    return [-halfWidth + (cx + 0.5) * size, -halfHeight + (cz + 0.5) * size];
  }

  function boundsOf(cx, cz) {
    const minX = -halfWidth + cx * size;
    const minZ = -halfHeight + cz * size;
    return [minX, minZ, minX + size, minZ + size];
  }

  function retainSpan(object, chunk) {
    let span = spans.get(object.id);

    if (!span) {
      const holder = new THREE.Group();
      if (object.kind === 'weg') onPath?.(object);
      else {
        addObject(holder, createBuildContext(), object);
        zoneGroup.add(holder);
      }
      span = { holder, refs: 0, id: object.id, kind: object.kind };
      spans.set(object.id, span);
    }

    span.refs += 1;
    chunk.spanIds.push(object.id);
  }

  function releaseSpans(chunk) {
    for (const id of chunk.spanIds) {
      const span = spans.get(id);
      if (!span) continue;
      span.refs -= 1;
      if (span.refs <= 0) {
        if (span.kind === 'weg') onPathRemoved?.(id);
        zoneGroup.remove(span.holder);
        disposeNode(span.holder);
        spans.delete(id);
      }
    }
    chunk.spanIds = [];
  }

  function retainBlockers(chunk) {
    for (const blocker of chunk.data.blockers) {
      const entry = blockers.get(blocker.id);
      if (entry) entry.refs += 1;
      else blockers.set(blocker.id, { blocker, refs: 1 });
      chunk.blockerIds.push(blocker.id);
    }
    if (chunk.blockerIds.length > 0) blockersDirty = true;
  }

  function releaseBlockers(chunk) {
    for (const id of chunk.blockerIds) {
      const entry = blockers.get(id);
      if (!entry) continue;
      entry.refs -= 1;
      if (entry.refs <= 0) blockers.delete(id);
    }
    if (chunk.blockerIds.length > 0) blockersDirty = true;
    chunk.blockerIds = [];
  }

  function unload(key) {
    const chunk = chunks.get(key);
    if (!chunk) return;

    if (chunk.group) {
      scene.remove(chunk.group);
      zoneGroup.remove(chunk.group);
      disposeNode(chunk.group);
    }
    if (chunk.state !== 'requested') {
      releaseSpans(chunk);
      releaseBlockers(chunk);
    }
    if (chunk.context?.emitters.length > 0) emittersDirty = true;
    chunks.delete(key);
  }

  function finishChunk(chunk) {
    finishObjects(chunk.group, chunk.context, chunk.detail);
    chunk.state = 'ready';
    if (chunk.context.emitters.length > 0) emittersDirty = true;
    chunk.data = null;
  }

  function receive(message) {
    if (message.zoneId !== world.id) return;

    for (const data of message.chunks ?? []) {
      const key = keyOf(data.cx, data.cz);
      const chunk = chunks.get(key);
      if (!chunk || chunk.state !== 'requested') continue;

      chunk.data = data;
      chunk.cursor = 0;
      chunk.spanIds = [];
      chunk.blockerIds = [];
      chunk.group = new THREE.Group();
      chunk.group.name = `Chunk_${key}`;
      chunk.detail = new THREE.Group();
      chunk.detail.name = `Detail_${key}`;
      chunk.group.add(chunk.detail);
      chunk.context = createBuildContext();
      zoneGroup.add(chunk.group);
      retainBlockers(chunk);

      chunk.state = data.objects.length > 0 ? 'queued' : 'empty';
      if (chunk.state === 'empty') finishChunk(chunk);
    }
  }

  function requestMissing(px, pz) {
    const wanted = [];
    const reach = Math.ceil(LOAD_RADIUS / size) + 1;
    const pcx = Math.floor((px + halfWidth) / size);
    const pcz = Math.floor((pz + halfHeight) / size);

    for (let cx = Math.max(0, pcx - reach); cx <= Math.min(columns - 1, pcx + reach); cx += 1) {
      for (let cz = Math.max(0, pcz - reach); cz <= Math.min(rows - 1, pcz + reach); cz += 1) {
        const key = keyOf(cx, cz);
        const existing = chunks.get(key);
        if (existing && !(existing.state === 'requested' && performance.now() - existing.requestedAt > RETRY_MS)) continue;
        const [x, z] = centerOf(cx, cz);
        const distance = Math.hypot(x - px, z - pz);
        if (distance <= LOAD_RADIUS + size * 0.5) wanted.push({ cx, cz, key, distance });
      }
    }

    if (wanted.length === 0) return;
    wanted.sort((a, b) => a.distance - b.distance);

    for (let start = 0; start < wanted.length; start += MAX_REQUEST) {
      const batch = wanted.slice(start, start + MAX_REQUEST);
      for (const entry of batch) chunks.set(entry.key, { cx: entry.cx, cz: entry.cz, state: 'requested', requestedAt: performance.now() });
      send({ type: 'chunk-request', keys: batch.map((entry) => [entry.cx, entry.cz]) });
    }
  }

  function unloadFar(px, pz) {
    for (const [key, chunk] of Array.from(chunks)) {
      const [x, z] = centerOf(chunk.cx, chunk.cz);
      if (Math.hypot(x - px, z - pz) > UNLOAD_RADIUS + size * 0.5) unload(key);
    }
  }

  function nextQueued(px, pz) {
    let best = null;
    let bestDistance = Infinity;

    for (const chunk of chunks.values()) {
      if (chunk.state !== 'queued') continue;
      const [x, z] = centerOf(chunk.cx, chunk.cz);
      const distance = Math.hypot(x - px, z - pz);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = chunk;
      }
    }

    return best;
  }

  function build(px, pz) {
    const deadline = performance.now() + budgetMs;

    while (performance.now() < deadline) {
      const chunk = nextQueued(px, pz);
      if (!chunk) return;

      const objects = chunk.data.objects;
      const clip = boundsOf(chunk.cx, chunk.cz);

      while (chunk.cursor < objects.length && performance.now() < deadline) {
        const object = objects[chunk.cursor];
        chunk.cursor += 1;

        if (SPANNING_KINDS.has(object.kind)) retainSpan(object, chunk);
        else addObject(DETAIL_KINDS.has(object.kind) ? chunk.detail : chunk.group, chunk.context, object, clip);
      }

      if (chunk.cursor >= objects.length) finishChunk(chunk);
      else return;
    }
  }

  function flush() {
    if (blockersDirty) {
      blockersDirty = false;
      onBlockers(Array.from(blockers.values(), (entry) => entry.blocker));
    }

    if (emittersDirty) {
      emittersDirty = false;
      const list = [];
      for (const chunk of chunks.values()) if (chunk.context && chunk.state === 'ready') list.push(...chunk.context.emitters);
      onEmitters(list);
    }
  }

  function resolveWaiters() {
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];
      const done = Array.from(waiter.keys).every((key) => {
        const chunk = chunks.get(key);
        return chunk && (chunk.state === 'ready' || chunk.state === 'empty');
      });

      if (done || performance.now() - waiter.since > READY_TIMEOUT_MS) {
        waiters.splice(index, 1);
        waiter.resolve();
      }
    }
  }

  function applyVisibility() {
    for (const chunk of chunks.values()) {
      if (!chunk.group) continue;
      const [x, z] = centerOf(chunk.cx, chunk.cz);
      const distance = Math.hypot(x - lastX, z - lastZ);
      chunk.group.visible = distance <= viewRadius + size * 0.75;
      chunk.detail.visible = distance <= viewRadius * DETAIL_FRACTION + size * 0.75;
    }
  }

  function setViewRadius(radius) {
    if (radius === viewRadius) return;
    viewRadius = radius;
    applyVisibility();
  }

  function update(px, pz) {
    lastX = px;
    lastZ = pz;
    requestMissing(px, pz);
    unloadFar(px, pz);
    build(px, pz);
    flush();
    applyVisibility();
    if (waiters.length > 0) resolveWaiters();
  }

  function whenReady(px, pz, radius) {
    const keys = new Set();
    const reach = Math.ceil(radius / size) + 1;
    const pcx = Math.floor((px + halfWidth) / size);
    const pcz = Math.floor((pz + halfHeight) / size);

    for (let cx = Math.max(0, pcx - reach); cx <= Math.min(columns - 1, pcx + reach); cx += 1) {
      for (let cz = Math.max(0, pcz - reach); cz <= Math.min(rows - 1, pcz + reach); cz += 1) {
        const [x, z] = centerOf(cx, cz);
        if (Math.hypot(x - px, z - pz) <= radius + size * 0.5) keys.add(keyOf(cx, cz));
      }
    }

    update(px, pz);
    return new Promise((resolve) => waiters.push({ keys, resolve, since: performance.now() }));
  }

  function progress(px, pz, radius) {
    const reach = Math.ceil(radius / size) + 1;
    const pcx = Math.floor((px + halfWidth) / size);
    const pcz = Math.floor((pz + halfHeight) / size);
    let total = 0;
    let ready = 0;

    for (let cx = Math.max(0, pcx - reach); cx <= Math.min(columns - 1, pcx + reach); cx += 1) {
      for (let cz = Math.max(0, pcz - reach); cz <= Math.min(rows - 1, pcz + reach); cz += 1) {
        const [x, z] = centerOf(cx, cz);
        if (Math.hypot(x - px, z - pz) > radius + size * 0.5) continue;
        total += 1;
        const chunk = chunks.get(keyOf(cx, cz));
        if (chunk && (chunk.state === 'ready' || chunk.state === 'empty')) ready += 1;
      }
    }

    return total === 0 ? 1 : ready / total;
  }

  function setBudget(ms) {
    budgetMs = ms;
  }

  function dispose() {
    for (const key of Array.from(chunks.keys())) unload(key);
    for (const span of spans.values()) {
      if (span.kind === 'weg') onPathRemoved?.(span.id);
      disposeNode(span.holder);
    }
    spans.clear();
    blockers.clear();
    waiters.splice(0).forEach((waiter) => waiter.resolve());
  }

  function stats() {
    let ready = 0;
    for (const chunk of chunks.values()) if (chunk.state === 'ready' || chunk.state === 'empty') ready += 1;
    return { chunks: chunks.size, ready, spans: spans.size, blockers: blockers.size };
  }

  return { receive, update, whenReady, progress, setBudget, setViewRadius, dispose, stats };
}
