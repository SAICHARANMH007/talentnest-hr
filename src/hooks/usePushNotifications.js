import { useEffect, useRef } from 'react';

const STORAGE_KEY = 'tn_push_subscribed';
const PROMPT_DELAY_MS = 30_000; // 30 seconds after login

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications({ isLoggedIn, apiBaseUrl, getToken }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    if (Notification.permission === 'denied') return;

    timerRef.current = setTimeout(async () => {
      try {
        // Get VAPID key
        const res = await fetch(`${apiBaseUrl}/push/vapid-public-key`);
        const { data } = await res.json();
        if (!data?.publicKey) return;

        // Request permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Subscribe
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });

        // Save to backend
        const token = getToken();
        await fetch(`${apiBaseUrl}/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Requested-With': 'TalentNest',
          },
          body: JSON.stringify({ subscription }),
        });

        localStorage.setItem(STORAGE_KEY, 'true');
      } catch (err) {
        console.warn('[push] subscription failed:', err.message);
      }
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timerRef.current);
  }, [isLoggedIn, apiBaseUrl, getToken]);
}
