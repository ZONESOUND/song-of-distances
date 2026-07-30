import {assertFirebaseAccessIsSafe} from '../runtimeConfig';

const APP_NAME = 'song-of-distance-revival';

const getOrCreateApp = (firebase, firebaseConfig) => {
  const existing = firebase.apps.find((app) => app.name === APP_NAME);
  return existing || firebase.initializeApp(firebaseConfig, APP_NAME);
};

export const createFirebaseSessionStore = (runtimeConfig, firebaseOverride) => {
  assertFirebaseAccessIsSafe(runtimeConfig);
  // Loading only the browser database modules avoids the legacy Firestore gRPC
  // binary and keeps fixture/test mode completely free of Firebase side effects.
  const firebase = firebaseOverride || require('firebase/app');
  if (!firebaseOverride) require('firebase/database');
  const app = getOrCreateApp(firebase, runtimeConfig.firebase);
  const database = app.database();
  const sessionsRef = database.ref('earthlocations');
  const connectedRef = database.ref('.info/connected');
  let activeSession = null;
  let connectedHandler = null;
  let presenceQueue = Promise.resolve();

  const enqueuePresence = (operation) => {
    const result = presenceQueue.then(operation, operation);
    presenceQueue = result.catch(() => {});
    return result;
  };

  const activateSession = async () => {
    if (!activeSession) return;
    const {id, payload} = activeSession;
    const sessionRef = sessionsRef.child(id);
    await sessionRef.onDisconnect().update({
      leave: true,
      endedAt: firebase.database.ServerValue.TIMESTAMP,
    });
    await sessionRef.update({
      ...payload,
      key: id,
      leave: false,
      endedAt: null,
    });
  };

  return {
    mode: 'firebase',
    subscribeSessions(listener) {
      const handler = (snapshot) => listener(snapshot.val() || {});
      sessionsRef.on('value', handler);
      return () => sessionsRef.off('value', handler);
    },
    reserveSessionId() {
      return sessionsRef.push().key;
    },
    startSession(id, payload) {
      const result = enqueuePresence(async () => {
        activeSession = {id, payload};
        await activateSession();
      });
      if (!connectedHandler) {
        connectedHandler = (snapshot) => {
          if (snapshot.val() === true) {
            enqueuePresence(activateSession).catch((error) => {
              console.error('Failed to restore Firebase presence', error);
            });
          }
        };
        connectedRef.on('value', connectedHandler);
      }
      return result;
    },
    renameSession(id, showId) {
      return sessionsRef.child(id).update({showId});
    },
    endSession(id) {
      return enqueuePresence(async () => {
        if (!activeSession || activeSession.id !== id) return;
        const sessionRef = sessionsRef.child(id);
        activeSession = null;
        await sessionRef.update({
          leave: true,
          endedAt: firebase.database.ServerValue.TIMESTAMP,
        });
        // Cancel only after the explicit history update succeeds. If the browser
        // closes mid-write, the registered onDisconnect operation remains as the
        // reliable fallback.
        await sessionRef.onDisconnect().cancel();
        if (connectedHandler) connectedRef.off('value', connectedHandler);
        connectedHandler = null;
      });
    },
    dispose() {
      if (connectedHandler) connectedRef.off('value', connectedHandler);
      connectedHandler = null;
    },
  };
};
