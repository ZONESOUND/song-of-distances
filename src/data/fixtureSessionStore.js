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
      ...(isHistory ? {endedAt: now - index * 30000} : {}),
      data: {fixture: true},
    };
  }
  return sessions;
};

export const createFixtureSessionStore = ({center, count}) => {
  let sessions = createFixtureSessions({center, count});
  let nextId = count + 1;
  const listeners = new Set();

  const publish = () => {
    const snapshot = clone(sessions);
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    mode: 'fixture',
    subscribeSessions(listener) {
      listeners.add(listener);
      listener(clone(sessions));
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
    endSession(id) {
      if (sessions[id]) {
        sessions[id].leave = true;
        sessions[id].endedAt = Date.now();
        publish();
      }
      return Promise.resolve();
    },
    dispose() {
      listeners.clear();
    },
  };
};
