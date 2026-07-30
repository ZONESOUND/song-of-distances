import {
  encodeRadioValue,
  encodeTriggerValue,
  makeOscEnvelope,
  readTriggerId,
  TRIGGER_ADDRESS,
} from './oscProtocol';

it('keeps the legacy OSC envelope and radio numeric value', () => {
  expect(makeOscEnvelope('/gps/radio', -90)).toEqual({
    address: '/gps/radio',
    args: [{value: -90}],
  });
  expect(encodeRadioValue(-Math.PI / 2)).toBe(-90);
});

it('keeps trigger value as a JSON string and reads its id defensively', () => {
  const value = encodeTriggerValue({
    degree: -90,
    dist: 132.8442,
    key: '-FakeKey01',
    leave: true,
    timeStamp: 1700000000000,
  }, 1700000000500);
  const envelope = makeOscEnvelope(TRIGGER_ADDRESS, value);

  expect(typeof value).toBe('string');
  expect(JSON.parse(value)).toEqual({
    degree: -90,
    dist: 132.8442,
    id: '-FakeKey01',
    leave: true,
    timeStamp: 1700000000000,
    time_to_now_second: 500,
  });
  expect(readTriggerId(envelope)).toBe('-FakeKey01');
  expect(readTriggerId({address: TRIGGER_ADDRESS, args: [{value: '{'}]})).toBeNull();
});
