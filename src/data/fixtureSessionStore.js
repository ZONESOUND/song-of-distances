import {coordinateForLayer} from '../spatialRules';

const clone = (value) => JSON.parse(JSON.stringify(value));

const GLOBAL_SCALE = 250000;
const GLOBAL_POW = 0.58;
const FIXTURE_SEED = 20260801;
const FIXTURE_LAYER_SIGMA = 14;
const MAX_FIXTURE_LAYER = 32;

const createSeededRandom = (seed) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value = value ^ (
      value + Math.imul(value ^ (value >>> 7), value | 61)
    );
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const sampleGaussian = (random) => {
  const first = Math.max(Number.EPSILON, random());
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
};

export const createFixtureLayout = (
  count,
  seed = FIXTURE_SEED
) => {
  const random = createSeededRandom(seed);
  return Array.from({length: count}, () => ({
    angle: random() * Math.PI * 2,
    layer: Math.min(
      MAX_FIXTURE_LAYER,
      0.5 + Math.abs(sampleGaussian(random)) * FIXTURE_LAYER_SIGMA
    ),
  }));
};

const selectActiveIndices = ({
  count,
  activeCount,
  seed,
  excludedIndex,
}) => {
  const random = createSeededRandom(seed ^ 0xA5A5A5A5);
  const candidates = Array.from({length: count}, (_, index) => index)
    .filter((index) => index !== excludedIndex);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swapIndex]] =
      [candidates[swapIndex], candidates[index]];
  }
  return new Set(candidates.slice(0, Math.min(activeCount, candidates.length)));
};

const createFixtureSessions = ({
  center,
  count,
  activeCount,
  seed,
  excludedActiveIndex,
  now = Date.now(),
}) => {
  const sessions = {};
  const resolvedActiveCount = Math.min(count, Math.max(0, activeCount));
  const activeIndices = selectActiveIndices({
    count,
    activeCount: resolvedActiveCount,
    seed,
    excludedIndex: excludedActiveIndex,
  });
  const layout = createFixtureLayout(count, seed);
  for (let index = 0; index < count; index += 1) {
    const {angle, layer} = layout[index];
    const position = coordinateForLayer(
      center,
      layer,
      angle,
      GLOBAL_SCALE,
      GLOBAL_POW
    );
    const id = `fixture-${String(index + 1).padStart(4, '0')}`;
    const isHistory = !activeIndices.has(index);
    sessions[id] = {
      key: id,
      showId: `F${String(index + 1).padStart(3, '0')}`,
      lat: position.lat,
      lon: position.lon,
      timeStamp: now - index * 45000,
      date: new Date(now - index * 45000).toString(),
      leave: isHistory,
      ...(!isHistory ? {lastSeen: now} : {}),
      ...(isHistory ? {endedAt: now - index * 30000} : {}),
      data: {
        fixture: true,
        fixtureLayer: layer,
      },
    };
  }
  return sessions;
};

export const createFixtureSessionStore = ({
  center,
  count,
  activeCount = 10,
  seed = FIXTURE_SEED,
  motionEnabled = false,
  motionIntervalMs = 1500,
}) => {
  const movingSessionCount = motionEnabled && count > 0 ? 1 : 0;
  let sessions = createFixtureSessions({
    center,
    count,
    activeCount: Math.max(0, activeCount - movingSessionCount),
    seed,
    excludedActiveIndex: movingSessionCount ? 0 : null,
  });
  let nextId = count + 1;
  const listeners = new Set();
  let motionTimer = null;
  let motionStep = 0;

  if (motionEnabled && sessions['fixture-0001']) {
    sessions['fixture-0001'] = {
      ...sessions['fixture-0001'],
      lat: center.lat,
      lon: center.lon,
      timeStamp: Date.now(),
      date: new Date().toString(),
      leave: false,
      lastSeen: Date.now(),
      data: {
        ...sessions['fixture-0001'].data,
        fixtureMoving: true,
      },
    };
    delete sessions['fixture-0001'].endedAt;
  }

  const publish = () => {
    const snapshot = clone(sessions);
    listeners.forEach((listener) => listener(snapshot));
  };

  const startMotion = () => {
    if (!motionEnabled || motionTimer || !sessions['fixture-0001']) return;
    motionTimer = setInterval(() => {
      motionStep += 1;
      const moving = sessions['fixture-0001'];
      if (!moving) return;
      const layer = Math.min(motionStep, 9);
      const hasFinishedMoving = motionStep > 9;
      const position = coordinateForLayer(
        center,
        layer,
        Math.PI / 5,
        GLOBAL_SCALE,
        GLOBAL_POW
      );
      sessions['fixture-0001'] = {
        ...moving,
        ...(!hasFinishedMoving ? {
          ...position,
          timeStamp: Date.now(),
          date: new Date().toString(),
          lastSeen: Date.now(),
        } : {}),
        leave: hasFinishedMoving,
        ...(hasFinishedMoving ? {endedAt: Date.now()} : {}),
      };
      publish();
      if (hasFinishedMoving) {
        clearInterval(motionTimer);
        motionTimer = null;
      }
    }, motionIntervalMs);
  };

  return {
    mode: 'fixture',
    subscribeSessions(listener) {
      listeners.add(listener);
      listener(clone(sessions));
      startMotion();
      return () => listeners.delete(listener);
    },
    reserveSessionId() {
      const id = `local-${String(nextId).padStart(4, '0')}`;
      nextId += 1;
      return id;
    },
    startSession(id, payload) {
      sessions[id] = {
        ...(sessions[id] || {}),
        ...clone(payload),
        key: id,
        leave: false,
        lastSeen: Date.now(),
      };
      delete sessions[id].endedAt;
      publish();
      return Promise.resolve();
    },
    renameSession(id, showId) {
      if (sessions[id]) sessions[id].showId = showId;
      publish();
      return Promise.resolve();
    },
    updatePosition(id, position) {
      if (sessions[id] && sessions[id].leave === false) {
        sessions[id] = {
          ...sessions[id],
          lat: position.lat,
          lon: position.lon,
          timeStamp: position.timeStamp,
          date: position.date,
          lastSeen: Date.now(),
        };
        publish();
      }
      return Promise.resolve();
    },
    endSession(id) {
      if (sessions[id]) {
        sessions[id].leave = true;
        sessions[id].endedAt = Date.now();
        publish();
      }
      return Promise.resolve();
    },
    dispose() {
      if (motionTimer) clearInterval(motionTimer);
      motionTimer = null;
      listeners.clear();
    },
  };
};
