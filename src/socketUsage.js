import {io} from 'socket.io-client';
import {runtimeConfig, assertSocketAccessIsSafe} from './runtimeConfig';
import {makeOscEnvelope, OSC_EVENT} from './oscProtocol';
import {publishRuntimeEvent} from './runtimeEvents';

let socket = null;
let isSocketConnect = false;

const getSocket = () => {
    if (runtimeConfig.socketMode === 'off') return null;
    if (socket) return socket;
    assertSocketAccessIsSafe(runtimeConfig);
    socket = io(runtimeConfig.socketUrl, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
        timeout: 5000,
    });
    socket.on('connect', () => {
        isSocketConnect = true;
        publishRuntimeEvent({type: 'socket', status: 'connected'});
        console.log('socket connect to server');
    });
    socket.on('disconnect', () => {
        isSocketConnect = false;
        publishRuntimeEvent({type: 'socket', status: 'disconnected'});
    });
    socket.on('connect_error', (error) => {
        isSocketConnect = false;
        publishRuntimeEvent({
            type: 'socket',
            status: `error: ${error.message}`,
        });
    });
    socket.on(OSC_EVENT, (envelope) => {
        publishRuntimeEvent({type: 'osc', direction: 'in', envelope});
    });
    publishRuntimeEvent({type: 'socket', status: 'connecting'});
    return socket;
};

if (runtimeConfig.socketMode === 'off') {
    publishRuntimeEvent({type: 'socket', status: 'off'});
}

export let emitOSC = (address, value) => {
    const envelope = makeOscEnvelope(address, value);
    publishRuntimeEvent({type: 'osc', direction: 'out', envelope});
    const activeSocket = getSocket();
    if (activeSocket) activeSocket.emit(OSC_EVENT, envelope);
};

export let receiveOSC = (func) => {
    const activeSocket = getSocket();
    if (!activeSocket) return () => {};
    activeSocket.on(OSC_EVENT, func);
    return () => activeSocket.off(OSC_EVENT, func);
};

export const disconnectSocket = () => {
    if (!socket) return;
    socket.disconnect();
    socket = null;
    isSocketConnect = false;
};

export {isSocketConnect};
