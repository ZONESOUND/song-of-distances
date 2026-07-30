import {createFirebaseSessionStore} from './firebaseSessionStore';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return {promise, resolve};
};

const createFakeFirebase = () => {
  const activationStarted = deferred();
  const releaseActivation = deferred();
  const state = {};
  const writes = [];
  let connectedHandler = null;

  const sessionRef = (id) => ({
    onDisconnect: () => ({
      async update(patch) {
        writes.push({type: 'disconnect-update', id, patch});
        activationStarted.resolve();
        await releaseActivation.promise;
      },
      async cancel() {
        writes.push({type: 'disconnect-cancel', id});
      },
    }),
    async update(patch) {
      state[id] = {...(state[id] || {}), ...patch};
      writes.push({type: 'update', id, patch});
    },
  });

  const sessionsRef = {
    child: sessionRef,
    push: () => ({key: 'generated-id'}),
    on: () => {},
    off: () => {},
  };
  const connectedRef = {
    on(event, handler) { connectedHandler = handler; },
    off() { connectedHandler = null; },
  };
  const database = {
    ref(path) {
      return path === '.info/connected' ? connectedRef : sessionsRef;
    },
  };
  const databaseNamespace = () => database;
  databaseNamespace.ServerValue = {TIMESTAMP: 'SERVER_TIMESTAMP'};
  const app = {name: 'song-of-distance-revival', database: () => database};
  const firebase = {
    apps: [],
    initializeApp: () => app,
    database: databaseNamespace,
  };

  return {
    firebase,
    state,
    writes,
    activationStarted,
    releaseActivation,
    getConnectedHandler: () => connectedHandler,
  };
};

it('serializes an in-flight activation before ending the session', async () => {
  const fake = createFakeFirebase();
  const store = createFirebaseSessionStore({
    firebase: {
      projectId: 'song-of-distance-staging',
      databaseURL: 'https://song-of-distance-staging.firebaseio.com',
    },
  }, fake.firebase);

  const start = store.startSession('session-a', {
    lat: 25.033,
    lon: 121.5654,
    timeStamp: 1700000000000,
  });
  await fake.activationStarted.promise;
  const end = store.endSession('session-a');
  fake.releaseActivation.resolve();
  await Promise.all([start, end]);

  const directUpdates = fake.writes.filter((write) => write.type === 'update');
  expect(directUpdates.map((write) => write.patch.leave)).toEqual([false, true]);
  expect(fake.state['session-a']).toMatchObject({
    leave: true,
    endedAt: 'SERVER_TIMESTAMP',
  });
  expect(fake.getConnectedHandler()).toBeNull();
});
