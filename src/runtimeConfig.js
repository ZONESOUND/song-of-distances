const PRODUCTION_PROJECT_ID = 'song-of-distance-47ab8';

const readBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return value === 'true' || value === 'on' || value === '1';
};

const readNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const dataMode = process.env.REACT_APP_DATA_MODE || 'fixture';
const locationMode = process.env.REACT_APP_LOCATION_MODE ||
  (dataMode === 'fixture' ? 'fixture' : 'browser');
const socketMode = process.env.REACT_APP_SOCKET_MODE || 'off';

if (!['fixture', 'firebase'].includes(dataMode)) {
  throw new Error(`Unsupported REACT_APP_DATA_MODE: ${dataMode}`);
}

if (!['fixture', 'browser'].includes(locationMode)) {
  throw new Error(`Unsupported REACT_APP_LOCATION_MODE: ${locationMode}`);
}

if (!['off', 'client'].includes(socketMode)) {
  throw new Error(`Unsupported REACT_APP_SOCKET_MODE: ${socketMode}`);
}

export const runtimeConfig = {
  dataMode,
  locationMode,
  fixedLocation: {
    lat: readNumber(process.env.REACT_APP_FIXED_LAT, 25.033),
    lon: readNumber(process.env.REACT_APP_FIXED_LON, 121.5654),
  },
  fixtureCount: Math.max(0, Math.floor(
    readNumber(process.env.REACT_APP_FIXTURE_COUNT, 180)
  )),
  socketMode,
  socketUrl: (process.env.REACT_APP_SOCKET_URL || '').trim(),
  oscOutputEnabled: readBoolean(process.env.REACT_APP_OSC_OUTPUT),
  showDiagnostics: readBoolean(
    process.env.REACT_APP_SHOW_DIAGNOSTICS,
    dataMode === 'fixture'
  ),
  firebase: {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  },
};

const databaseUrlTargetsProduction = (databaseURL) => {
  try {
    const parsed = new URL(databaseURL);
    const hostname = parsed.hostname.toLowerCase();
    const namespace = parsed.searchParams.get('ns');
    return namespace === PRODUCTION_PROJECT_ID ||
      hostname === `${PRODUCTION_PROJECT_ID}.firebaseio.com` ||
      (
        hostname.startsWith(`${PRODUCTION_PROJECT_ID}-`) &&
        hostname.endsWith('.firebasedatabase.app')
      );
  } catch (error) {
    throw new Error('REACT_APP_FIREBASE_DATABASE_URL must be a valid URL.');
  }
};

export const assertFirebaseAccessIsSafe = (config = runtimeConfig) => {
  const firebaseConfig = config.firebase;
  if (!firebaseConfig.projectId || !firebaseConfig.databaseURL) {
    throw new Error(
      'Firebase mode requires REACT_APP_FIREBASE_PROJECT_ID and ' +
      'REACT_APP_FIREBASE_DATABASE_URL.'
    );
  }

  const projectTargetsProduction =
    firebaseConfig.projectId === PRODUCTION_PROJECT_ID;
  const databaseTargetsProduction =
    databaseUrlTargetsProduction(firebaseConfig.databaseURL);

  if (projectTargetsProduction !== databaseTargetsProduction) {
    throw new Error(
      'Firebase project ID and database URL are inconsistent; access is blocked.'
    );
  }

  if (projectTargetsProduction || databaseTargetsProduction) {
    throw new Error(
      'Production Firebase is disabled on the revival branch. Use fixture or staging mode.'
    );
  }
};

const isLoopbackUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
  } catch (error) {
    return false;
  }
};

export const assertSocketAccessIsSafe = (config = runtimeConfig) => {
  if (config.socketMode === 'off') return;
  if (!config.socketUrl) {
    throw new Error('Socket client mode requires REACT_APP_SOCKET_URL.');
  }
  if (config.dataMode === 'fixture' && !isLoopbackUrl(config.socketUrl)) {
    throw new Error('Fixture mode only permits a localhost Socket.IO server.');
  }
};
