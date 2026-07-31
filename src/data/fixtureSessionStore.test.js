import {createFixtureSessionStore} from './fixtureSessionStore';
import {localOffsetKm} from '../spatialRules';

it('fills the twenty kilomet field with history without fake active sessions', () => {
  const center = {lat: 25.033, lon: 121.5654};
  const store = createFixtureSessionStore({
    center,
    count: 20,
    maxRangeKm: 20,
  });
  let sessions;
  store.subscribeSessions((value) => { sessions = value; });

  expect(Object.keys(sessions)).toHaveLength(20);
  expect(Object.values(sessions).every((session) => session.leave === true))
    .toBe(true);

  const distances = Object.values(sessions).map((session) =>
    Math.round(localOffsetKm(session, center).distanceKm)
  );
  expect(new Set(distances)).toEqual(new Set([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  ]));
});

it('marks a session historical without deleting it', async () => {
  const store = createFixtureSessionStore({
    center: {lat: 25.033, lon: 121.5654},
    count: 0,
  });
  let sessions;
  store.subscribeSessions((value) => { sessions = value; });
  const id = store.reserveSessionId();

  await store.startSession(id, {
    lat: 25.033,
    lon: 121.5654,
    timeStamp: 1700000000000,
    showId: 'A001',
  });
  await store.endSession(id);

  expect(Object.keys(sessions)).toEqual([id]);
  expect(sessions[id]).toMatchObject({leave: true, showId: 'A001'});
  expect(sessions[id].endedAt).toEqual(expect.any(Number));
});

it('moves the same session and preserves its final position as history', async () => {
  const store = createFixtureSessionStore({
    center: {lat: 25.033, lon: 121.5654},
    count: 0,
  });
  let sessions;
  store.subscribeSessions((value) => { sessions = value; });
  const id = store.reserveSessionId();

  await store.startSession(id, {
    lat: 25.033,
    lon: 121.5654,
    timeStamp: 1700000000000,
    date: 'start',
    showId: 'A001',
  });
  await store.updatePosition(id, {
    lat: 25.091,
    lon: 121.602,
    timeStamp: 1700000005000,
    date: 'moved',
  });

  expect(Object.keys(sessions)).toEqual([id]);
  expect(sessions[id]).toMatchObject({
    lat: 25.091,
    lon: 121.602,
    timeStamp: 1700000005000,
    leave: false,
  });

  await store.endSession(id);
  expect(Object.keys(sessions)).toEqual([id]);
  expect(sessions[id]).toMatchObject({
    lat: 25.091,
    lon: 121.602,
    leave: true,
  });
});

it('can simulate one visitor moving outward and leaving their final node', () => {
  jest.useFakeTimers();
  const store = createFixtureSessionStore({
    center: {lat: 25.033, lon: 121.5654},
    count: 1,
    motionEnabled: true,
    motionIntervalMs: 1000,
  });
  let sessions;
  store.subscribeSessions((value) => { sessions = value; });
  const initial = {...sessions['fixture-0001']};

  jest.advanceTimersByTime(10000);

  expect(sessions['fixture-0001']).toMatchObject({leave: false});

  jest.advanceTimersByTime(1000);

  expect(sessions['fixture-0001']).toMatchObject({leave: true});
  expect(sessions['fixture-0001'].endedAt).toEqual(expect.any(Number));
  expect(sessions['fixture-0001'].lat).not.toBe(initial.lat);
  expect(sessions['fixture-0001'].lon).not.toBe(initial.lon);
  store.dispose();
  jest.useRealTimers();
});
