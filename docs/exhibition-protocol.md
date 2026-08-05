# Song of Distances — exhibition web protocol

This branch defaults to a completely local fixture mode. It does not connect to
Firebase or Socket.IO unless those services are explicitly enabled.

## Local rehearsal

Copy `.env.example` to `.env.local` if overrides are needed. The checked-in
defaults provide fixed GPS and deterministic current/history sessions.

By default, `fixture-0001` moves from the center through all nine distance
layers, then becomes historical at its final coordinate. The interval can be
changed with `REACT_APP_FIXTURE_MOTION_INTERVAL`, or disabled with
`REACT_APP_FIXTURE_MOTION=false`.

Install the Socket.IO v4 relay dependencies once:

```sh
npm ci --prefix node-for-max
```

Load `node-for-max/index.js` with `node.script` inside Max, then start the web
artwork in exhibition mode:

```sh
npm run start:exhibition
```

Open `http://localhost:3000` on the exhibition computer. Its diagnostics should
show `SOCKET CONNECTED` and `OSC ON`. The public GitHub Pages preview continues
to use `SOCKET OFF`; a static host cannot run the local Node for Max process,
and browsers may block an HTTPS page from contacting an HTTP loopback relay.

This preset is equivalent to configuring:

```text
REACT_APP_SOCKET_MODE=client
REACT_APP_SOCKET_URL=http://127.0.0.1:3001
REACT_APP_OSC_OUTPUT=on
```

Fixture mode rejects non-loopback Socket.IO URLs.

## Socket.IO compatibility

The browser client and the included Node for Max relay are pinned to Socket.IO
4.8.3. The relay listens only on `127.0.0.1:3001` by default, rejects Engine.IO
v3 clients, limits packet size, and permits only local development origins.
Override the port or comma-separated origins with
`SOD_SOCKET_PORT` and `SOD_ALLOWED_ORIGINS` before starting `node.script`.

Messages arriving from the browser leave the Node for Max outlet as:

```text
osc <address> <value...>
```

Send the same shape into `node.script` to broadcast from Max to the browser.

The transport event name remains `osc` and the envelope remains:

```js
{address, args: [{value}]}
```

`/gps/radio` has a numeric degree value. `/gps/trigger` has a JSON-string value
with the legacy fields `degree`, `dist`, `id`, `data`, `leave`, `timeStamp`, and
`time_to_now_second`. Despite its historical name, the last field is measured in
milliseconds.

OSC output is opt-in. Browser audio remains the source-of-truth behavior while
the restored exhibition route is tested.

## Firebase safety

The production project has no checked-in configuration and is completely blocked
on the revival branch. Local development must use fixtures or a separate staging
project. Production access remains disabled until authentication, database rules,
and staging validation are complete.

Ending a session updates `leave: true` and `endedAt`; it never removes the node.
Browser GPS updates overwrite the coordinates of the same active session rather
than creating a new node for every sample. Closing or disconnecting preserves
the last known coordinates as the historical node.

Active sessions update `lastSeen` with a Firebase server timestamp every 15
seconds. The display treats `leave: false` as active only while `lastSeen` (or a
legacy `timeStamp`) is no more than 60 seconds old. This prevents stale sessions
left by unreliable browser unload events from appearing permanently online; the
database record and final coordinates remain untouched.
