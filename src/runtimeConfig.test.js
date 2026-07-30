import {
  assertFirebaseAccessIsSafe,
  assertSocketAccessIsSafe,
  runtimeConfig,
} from './runtimeConfig';

it('defaults every unconfigured build to local fixture mode', () => {
  expect(runtimeConfig.dataMode).toBe('fixture');
  expect(runtimeConfig.locationMode).toBe('fixture');
  expect(runtimeConfig.socketMode).toBe('off');
  expect(runtimeConfig.oscOutputEnabled).toBe(false);
});

it('blocks the production Firebase project on the revival branch', () => {
  expect(() => assertFirebaseAccessIsSafe({
    firebase: {
      projectId: 'song-of-distance-47ab8',
      databaseURL: 'https://song-of-distance-47ab8.firebaseio.com',
    },
  })).toThrow('Production Firebase is disabled');
});

it('cannot bypass the production guard with an inconsistent project id', () => {
  expect(() => assertFirebaseAccessIsSafe({
    firebase: {
      projectId: 'fake-staging-project',
      databaseURL: 'https://song-of-distance-47ab8.firebaseio.com',
    },
  })).toThrow('inconsistent');

  expect(() => assertFirebaseAccessIsSafe({
    firebase: {
      projectId: 'song-of-distance-47ab8',
      databaseURL: 'https://fake-staging-project.firebaseio.com',
    },
  })).toThrow('inconsistent');
});

it('only permits loopback Socket.IO in fixture mode', () => {
  expect(() => assertSocketAccessIsSafe({
    dataMode: 'fixture',
    socketMode: 'client',
    socketUrl: 'https://example.com',
  })).toThrow('localhost');

  expect(() => assertSocketAccessIsSafe({
    dataMode: 'fixture',
    socketMode: 'client',
    socketUrl: 'http://127.0.0.1:3001',
  })).not.toThrow();
});
