import {coordinateForLayer} from '../spatialRules';

const clone = (value) => JSON.parse(JSON.stringify(value));

const GLOBAL_SCALE = 250000;
const GLOBAL_POW = 0.58;

const createFixtureSessions = ({center, count, now = Date.now()}) => {
  const sessions = {};
  for (let index = 0; index < count; index += 1) {
    const angle = (index * 137.508) * Math.PI / 180;
    const ring = 1 + (index % 9);
    const position = coordinateForLayer(
      center,
      ring,
      angle,
      GLOBAL_SCALE,
      GLOBAL_POW
    );
    const id = `fixture-${String(index + 1).padStart(4, '0')}`;
    const isHistory = index % 4 !== 0;
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
      data: {fixture: true},
    };
  }
  return sessions;
};

export const createFixtureSessionStore = ({
  center,
  count,
  motionEnabled = false,
  motionIntervalMs = 1500,
}) => {
  let sessions = createFixtureSessions({center, count});
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
