// Exhibition preset: run the artwork locally and connect only to the loopback
// Node for Max relay. Explicit shell environment values still take precedence.
process.env.REACT_APP_DATA_MODE =
  process.env.REACT_APP_DATA_MODE || 'fixture';
process.env.REACT_APP_LOCATION_MODE =
  process.env.REACT_APP_LOCATION_MODE || 'fixture';
process.env.REACT_APP_SOCKET_MODE =
  process.env.REACT_APP_SOCKET_MODE || 'client';
process.env.REACT_APP_SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL || 'http://127.0.0.1:3001';
process.env.REACT_APP_OSC_OUTPUT =
  process.env.REACT_APP_OSC_OUTPUT || 'on';
process.env.REACT_APP_SHOW_DIAGNOSTICS =
  process.env.REACT_APP_SHOW_DIAGNOSTICS || 'true';

require('./start');
