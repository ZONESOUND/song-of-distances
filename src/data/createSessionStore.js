import {runtimeConfig} from '../runtimeConfig';
import {createFixtureSessionStore} from './fixtureSessionStore';
import {createFirebaseSessionStore} from './firebaseSessionStore';

export const createSessionStore = (config = runtimeConfig) => {
  if (config.dataMode === 'firebase') {
    return createFirebaseSessionStore(config);
  }
  return createFixtureSessionStore({
    center: config.fixedLocation,
    count: config.fixtureCount,
    maxRangeKm: config.maxRangeKm,
    motionEnabled: config.fixtureMotionEnabled,
    motionIntervalMs: config.fixtureMotionIntervalMs,
  });
};
