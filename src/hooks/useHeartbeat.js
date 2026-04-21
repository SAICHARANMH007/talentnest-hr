import { useEffect, useRef } from 'react';
import { api } from '../api/api.js';

export default function useHeartbeat(user) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user?.id && !user?._id) return;

    const ping = () => api.presenceHeartbeat().catch(() => {});
    ping(); // immediate on mount

    timerRef.current = setInterval(ping, 30_000);
    return () => clearInterval(timerRef.current);
  }, [user?.id]);
}
