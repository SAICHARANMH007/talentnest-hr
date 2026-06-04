import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../api/config.js';
import { getToken } from '../api/client.js';

/**
 * Connects to the /platform Socket.IO namespace and calls the provided
 * callback whenever a stage change happens anywhere in the tenant.
 * Safe to use in multiple components — each creates its own connection.
 */
export function usePlatformSocket(onStageChanged) {
  const cbRef = useRef(onStageChanged);
  cbRef.current = onStageChanged;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(`${SOCKET_BASE_URL}/platform`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('application:stageChanged', data => {
      cbRef.current?.(data);
    });

    return () => {
      socket.off('application:stageChanged');
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Connects to /platform and listens for one or more events.
 * handlers: { 'event:name': callbackFn, ... }
 */
export function usePlatformEvents(handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const socket = io(`${SOCKET_BASE_URL}/platform`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    const events = Object.keys(handlersRef.current || {});
    events.forEach(evt => {
      socket.on(evt, data => handlersRef.current?.[evt]?.(data));
    });

    return () => {
      events.forEach(evt => socket.off(evt));
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
