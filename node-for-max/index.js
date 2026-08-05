const maxApi = require('max-api');
const {createRelay} = require('./relay');

const relay = createRelay({maxApi});

relay.start().then((address) => {
  maxApi.post(
    `Song of Distances Socket.IO relay listening on ` +
    `${address.address}:${address.port}`
  );
  maxApi.outlet('socket', 'listening', address.address, address.port);
}).catch((error) => {
  maxApi.post(`Socket.IO relay failed: ${error.stack || error.message}`);
  maxApi.outlet('socket', 'error', error.message);
});

const shutdown = async () => {
  await relay.close();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
