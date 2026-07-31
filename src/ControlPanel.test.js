import React from 'react';
import ReactDOM from 'react-dom';
import {act} from 'react-dom/test-utils';
import LocData from './ControlPanel';
import {gpsData, setupGPS} from './gps';

let mockP5Props = null;

jest.mock('react-p5-wrapper', () => (props) => {
  mockP5Props = props;
  return null;
});
jest.mock('./NameModal', () => ({NameModal: () => null}));
jest.mock('./IntroModal', () => ({IntroModal: () => null}));
jest.mock('./LocHintModal', () => ({LocHintModal: () => null}));
jest.mock('./gps', () => ({
  gpsData: {},
  setupGPS: jest.fn(),
  clearWatchGPS: jest.fn(),
}));

it('keeps one session id while GPS and the client center move together', () => {
  let onSessions;
  const store = {
    subscribeSessions: jest.fn((listener) => {
      onSessions = listener;
      listener({});
      return jest.fn();
    }),
    reserveSessionId: jest.fn(() => 'session-a'),
    startSession: jest.fn(() => Promise.resolve()),
    updatePosition: jest.fn(() => Promise.resolve()),
    renameSession: jest.fn(() => Promise.resolve()),
    endSession: jest.fn(() => Promise.resolve()),
    dispose: jest.fn(),
  };
  const container = document.createElement('div');

  act(() => {
    ReactDOM.render(<LocData sessionStore={store}/>, container);
  });
  const gpsCallback = setupGPS.mock.calls[0][0];
  const now = Date.now();
  const first = {
    lat: 25.033,
    lon: 121.5654,
    timeStamp: now,
    date: 'start',
    leave: false,
  };
  Object.assign(gpsData, first);
  act(() => gpsCallback(true, first));

  const topologyPanel = document.querySelector('.dg.main');
  expect(topologyPanel).not.toBeNull();
  expect(topologyPanel.style.display).toBe('none');
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'h'}));
  });
  expect(topologyPanel.style.display).toBe('');
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'H'}));
  });
  expect(topologyPanel.style.display).toBe('none');

  const second = {
    lat: 25.091,
    lon: 121.602,
    timeStamp: now + 5000,
    date: 'moved',
    leave: false,
  };
  act(() => gpsCallback(true, second));
  act(() => onSessions({
    'session-a': {...second, key: 'session-a'},
    'stale-session': {
      lat: 25.04,
      lon: 121.57,
      timeStamp: now - 60001,
      leave: false,
    },
  }));

  expect(store.reserveSessionId).toHaveBeenCalledTimes(1);
  expect(store.startSession).toHaveBeenCalledWith(
    'session-a',
    expect.objectContaining(first)
  );
  expect(store.updatePosition).toHaveBeenLastCalledWith('session-a', second);
  expect(mockP5Props.configData).toMatchObject({
    lat: second.lat,
    lon: second.lon,
  });
  expect(mockP5Props.dataPoint).toHaveLength(1);
  expect(mockP5Props.dataPoint[0]).toMatchObject({
    key: 'stale-session',
    leave: true,
  });
  expect(mockP5Props.myId).toBe('session-a');

  act(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
});
