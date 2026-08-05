const assert = require('node:assert/strict');
const {test} = require('node:test');
const {io: createClient} = require('socket.io-client');
const {createRelay, isOscEnvelope} = require('../relay');

const waitFor = (subscribe) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Timed out')), 3000);
  subscribe((value) => {
    clearTimeout(timer);
    resolve(value);
  });
});

test('relays v4 OSC envelopes in both directions', async (context) => {
  const handlers = {};
  const outlets = [];
  const maxApi = {
    addHandler(name, handler) { handlers[name] = handler; },
    outlet(...message) { outlets.push(message); },
  };
  const relay = createRelay({maxApi, port: 0});
  const address = await relay.start();
  const client = createClient(`http://127.0.0.1:${address.port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  context.after(async () => {
    client.disconnect();
    await relay.close();
  });

  await waitFor((done) => client.once('connect', done));
  client.emit('osc', {address: '/gps/radio', args: [{value: 42.5}]});
  await waitFor((done) => {
    const interval = setInterval(() => {
      const message = outlets.find((entry) =>
        entry[0] === 'osc' && entry[1] === '/gps/radio'
      );
      if (message) {
        clearInterval(interval);
        done(message);
      }
    }, 10);
  });
  assert.deepEqual(
    outlets.find((entry) => entry[0] === 'osc'),
    ['osc', '/gps/radio', 42.5]
  );

  const fromMax = waitFor((done) => client.once('osc', done));
  handlers.osc('/gps/trigger', '{"id":"fixture-0001"}');
  assert.deepEqual(await fromMax, {
    address: '/gps/trigger',
    args: [{value: '{"id":"fixture-0001"}'}],
  });
});

test('rejects malformed envelopes before they reach Max', () => {
  assert.equal(isOscEnvelope(null), false);
  assert.equal(isOscEnvelope({address: 'gps/radio', args: [{value: 1}]}), false);
  assert.equal(isOscEnvelope({address: '/gps/radio', args: []}), false);
  assert.equal(isOscEnvelope({address: '/gps/radio', args: [{value: 1}]}), true);
});
