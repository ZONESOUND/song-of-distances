import {createFixtureSessionStore} from './fixtureSessionStore';
import {calcLayerFromDistance, projectGpsPoint} from '../spatialRules';

it('contains both current and historical sessions without network access', () => {
  const store = createFixtureSessionStore({
    center: {lat: 25.033, lon: 121.5654},
    count: 8,
  });
  let sessions;
  store.subscribeSessions((value) => { sessions = value; });

  expect(Object.keys(sessions)).toHaveLength(8);
  expect(Object.values(sessions).some((session) => session.leave === false)).toBe(true);
  expect(Object.values(sessions).some((session) => session.leave === true)).toBe(true);

  const center = {lat: 25.033, lon: 121.5654};
  const layers = Object.values(sessions).map((session) => {
    const point = projectGpsPoint(session, center, 250000, 0.58);
    return Math.round(calcLayerFromDistance(point.distance, 250000, 0.58));
  });
  expect(new Set(layers)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
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
