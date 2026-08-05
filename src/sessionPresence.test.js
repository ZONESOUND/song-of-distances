import {
  ACTIVE_SESSION_TIMEOUT_MS,
  isSessionActive,
  withEffectivePresence,
} from './sessionPresence';

const NOW = 1700000100000;

it('treats only explicitly active and recently seen sessions as online', () => {
  expect(isSessionActive({leave: false, lastSeen: NOW - 1000}, NOW)).toBe(true);
  expect(isSessionActive({leave: false, timeStamp: NOW - 1000}, NOW)).toBe(true);
  expect(isSessionActive({leave: true, lastSeen: NOW - 1000}, NOW)).toBe(false);
  expect(isSessionActive({timeStamp: NOW - 1000}, NOW)).toBe(false);
});

it('renders stale leave:false sessions as history without changing source data', () => {
  const stale = {
    leave: false,
    lat: 25.033,
    lon: 121.5654,
    timeStamp: NOW - ACTIVE_SESSION_TIMEOUT_MS - 1,
  };
  const effective = withEffectivePresence(stale, NOW);

  expect(effective.leave).toBe(true);
  expect(stale.leave).toBe(false);
});

it('keeps fixture active state stable for long-running visual tests', () => {
  const fixture = {
    leave: false,
    lastSeen: NOW - ACTIVE_SESSION_TIMEOUT_MS * 10,
    data: {fixture: true},
  };

  expect(withEffectivePresence(fixture, NOW).leave).toBe(false);
});
