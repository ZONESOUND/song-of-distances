# Song of Distance — exhibition web protocol

This branch defaults to a completely local fixture mode. It does not connect to
Firebase or Socket.IO unless those services are explicitly enabled.

## Local rehearsal

Copy `.env.example` to `.env.local` if overrides are needed. The checked-in
defaults provide fixed GPS and deterministic current/history sessions.

To feed a local Node for Max relay, configure:

```text
REACT_APP_SOCKET_MODE=client
REACT_APP_SOCKET_URL=http://127.0.0.1:3001
REACT_APP_OSC_OUTPUT=on
```

Fixture mode rejects non-loopback Socket.IO URLs.

## Socket.IO compatibility

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
