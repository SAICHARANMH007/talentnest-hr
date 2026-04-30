import { useState, useEffect } from 'react';
import api from '../api/api.js';

let globalOnlineCache = [];
let globalPresenceSubscribers = new Set();
let globalPresenceInterval = null;

const fetchOnlineUsers = async () => {
  try {
    const res = await api.getOnlineUsers();
    if (res?.data) {
      globalOnlineCache = res.data;
      globalPresenceSubscribers.forEach(sub => sub(globalOnlineCache));
    }
  } catch (error) {
    // Ignore presence errors to avoid spamming the console
  }
};

const startPresencePolling = () => {
  if (!globalPresenceInterval) {
    fetchOnlineUsers();
    globalPresenceInterval = setInterval(fetchOnlineUsers, 60000); // 1 minute
  }
};

const stopPresencePolling = () => {
  if (globalPresenceSubscribers.size === 0 && globalPresenceInterval) {
    clearInterval(globalPresenceInterval);
    globalPresenceInterval = null;
  }
};

export const usePresence = () => {
  const [onlineUsers, setOnlineUsers] = useState(globalOnlineCache);

  useEffect(() => {
    const subscriber = (users) => setOnlineUsers(users);
    globalPresenceSubscribers.add(subscriber);
    startPresencePolling();

    return () => {
      globalPresenceSubscribers.delete(subscriber);
      stopPresencePolling();
    };
  }, []);

  const isUserOnline = (userId) => {
    if (!userId) return false;
    return onlineUsers.some(u => String(u.id) === String(userId));
  };

  return { onlineUsers, isUserOnline };
};
