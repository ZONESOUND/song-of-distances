export const OSC_EVENT = 'osc';
export const RADIO_ADDRESS = '/gps/radio';
export const TRIGGER_ADDRESS = '/gps/trigger';

export const makeOscEnvelope = (address, value) => ({
  address,
  args: [{value}],
});

export const encodeRadioValue = (radioRadians) =>
  Number((radioRadians / Math.PI * 180).toFixed(5));

export const encodeTriggerValue = (point, now = Date.now()) => JSON.stringify({
  degree: point.degree,
  dist: point.dist,
  id: point.key,
  data: point.data,
  leave: point.leave,
  timeStamp: point.timeStamp,
  time_to_now_second: now - point.timeStamp,
});

export const readTriggerId = (envelope) => {
  if (!envelope || envelope.address !== TRIGGER_ADDRESS) return null;
  const value = envelope.args && envelope.args[0] && envelope.args[0].value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value).id || null;
  } catch (error) {
    return null;
  }
};
