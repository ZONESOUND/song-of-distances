const http = require('node:http');
const {Server} = require('socket.io');

const OSC_EVENT = 'osc';
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3001;
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const parseAllowedOrigins = (value) => {
  if (!value) return DEFAULT_ALLOWED_ORIGINS;
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const isOscEnvelope = (envelope) =>
  Boolean(
    envelope &&
    typeof envelope.address === 'string' &&
    envelope.address.startsWith('/') &&
    Array.isArray(envelope.args) &&
    envelope.args.length > 0 &&
    envelope.args.length <= 16 &&
    envelope.args.every((argument) =>
      argument && Object.prototype.hasOwnProperty.call(argument, 'value')
    )
  );

const createRelay = ({
  maxApi,
  host = process.env.SOD_SOCKET_HOST || DEFAULT_HOST,
  port = Number(process.env.SOD_SOCKET_PORT || DEFAULT_PORT),
  allowedOrigins = parseAllowedOrigins(process.env.SOD_ALLOWED_ORIGINS),
} = {}) => {
  const httpServer = http.createServer((request, response) => {
    response.writeHead(200, {'content-type': 'application/json'});
    response.end(JSON.stringify({
      service: 'song-of-distances-node-for-max-relay',
      socketIO: '4.8.3',
    }));
  });
  const io = new Server(httpServer, {
    serveClient: false,
    allowEIO3: false,
    maxHttpBufferSize: 100000,
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`Origin not allowed: ${origin}`));
      },
      methods: ['GET', 'POST'],
    },
  });

  const outlet = (...message) => {
    if (maxApi && typeof maxApi.outlet === 'function') {
      maxApi.outlet(...message);
    }
  };

  io.on('connection', (socket) => {
    outlet('socket', 'connected', socket.id);
    socket.on(OSC_EVENT, (envelope) => {
      if (!isOscEnvelope(envelope)) {
        outlet('socket', 'invalid-envelope', socket.id);
        return;
      }
      const values = envelope.args.map((argument) => argument.value);
      outlet(OSC_EVENT, envelope.address, ...values);
    });
    socket.on('disconnect', (reason) => {
      outlet('socket', 'disconnected', socket.id, reason);
    });
  });

  if (maxApi && typeof maxApi.addHandler === 'function') {
    maxApi.addHandler(OSC_EVENT, (address, ...values) => {
      if (typeof address !== 'string' || !address.startsWith('/')) return;
      io.emit(OSC_EVENT, {
        address,
        args: values.map((value) => ({value})),
      });
    });
    maxApi.addHandler('socket-status', () => {
      outlet('socket', 'clients', io.engine.clientsCount);
    });
  }

  return {
    io,
    httpServer,
    async start() {
      if (httpServer.listening) return httpServer.address();
      await new Promise((resolve, reject) => {
        httpServer.once('error', reject);
        httpServer.listen(port, host, () => {
          httpServer.removeListener('error', reject);
          resolve();
        });
      });
      return httpServer.address();
    },
    async close() {
      if (!httpServer.listening) return;
      await new Promise((resolve) => io.close(resolve));
    },
  };
};

module.exports = {
  createRelay,
  isOscEnvelope,
  parseAllowedOrigins,
};
