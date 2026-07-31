import {coordinateForDistanceKm} from '../spatialRules';

const clone = (value) => JSON.parse(JSON.stringify(value));

const createFixtureSessions = ({
  center,
  count,
  maxRangeKm,
  now = Date.now(),
}) => {
  const sessions = {};
  const distanceSteps = Math.max(1, Math.round(maxRangeKm));
  for (let index = 0; index < count; index += 1) {
    const angle = (index * 137.508) * Math.PI / 180;
    const distanceKm = Math.min(maxRangeKm, 1 + (index % distanceSteps));
    const position = coordinateForDistanceKm(center, distanceKm, angle);
    const id = `fixture-${String(index + 1).padStart(4, '0')}`;
    sessions[id] = {
      key: id,
      showId: `F${String(index + 1).padStart(3, '0')}`,
      lat: position.lat,
      lon: position.lon,
      timeStamp: now - index * 45000,
      date: new Date(now - index * 45000).toString(),
      leave: true,
      endedAt: now - index * 30000,
      data: {fixture: true, distanceKm},
    };
  }
  return sessions;
};

export const createFixtureSessionStore = ({
  center,
  count,
  maxRangeKm = 20,
  motionEnabled = false,
  motionIntervalMs = 1500,
}) => {
  let sessions = createFixtureSessions({center, count, maxRangeKm});
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
      const distanceKm = Math.min(motionStep * 2, maxRangeKm);
      const hasFinishedMoving = motionStep * 2 > maxRangeKm;
      const position = coordinateForDistanceKm(
        center,
        distanceKm,
        Math.PI / 5
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
