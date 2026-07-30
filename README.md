# Song of Distance — revival branch

This branch restores the maintainable source for the installation while keeping
the published `gh-pages` branch untouched.

`npm run deploy` is intentionally blocked on this branch. Publishing must be a
separate, explicit release step after local and staging validation.

## Safe local start

```sh
npm ci --legacy-peer-deps --no-audit
npm start
```

Open <http://localhost:3000>. With no `.env.local`, the application uses fixed
GPS, deterministic current/history fixtures, no Firebase connection, and no
Socket.IO connection.

Run the checks with:

```sh
npm test -- --watchAll=false
npm run build
```

The build still uses the legacy CRA/Webpack architecture. Webpack and Firebase
remain in their original major versions, with compatibility updates that allow
installation and builds on the current Mac/Node environment.

## Exhibition connection

Copy `.env.example` to `.env.local` and opt in to a local Socket.IO relay:

```text
REACT_APP_SOCKET_MODE=client
REACT_APP_SOCKET_URL=http://127.0.0.1:3001
REACT_APP_OSC_OUTPUT=on
```

See [docs/exhibition-protocol.md](docs/exhibition-protocol.md) for the legacy
`/gps/radio` and `/gps/trigger` message contract.

## Firebase

Local development should use fixture mode or a separate staging project. There
are no production Firebase credentials in this branch. Production database URLs
and project IDs are completely blocked until authentication, database rules, and
staging validation are complete.

Ending a session marks it as historical with `leave: true` and `endedAt`; session
nodes are never deleted by the web application.
