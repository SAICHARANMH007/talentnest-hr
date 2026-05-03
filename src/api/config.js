const IS_PROD = import.meta.env.PROD || !!import.meta.env.VITE_RENDER || !!import.meta.env.VITE_RAILWAY_STATIC_URL;

// In production, Vercel proxies /api/* to Render via vercel.json rewrites,
// so relative "/api" works. Use VITE_API_URL override if explicitly set.
export const API_BASE_URL = import.meta.env.VITE_API_URL || (IS_PROD ? '/api' : 'http://localhost:5000/api');

// Socket.IO must be absolute (sockets don't go through Vercel proxy)
export const SOCKET_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : (IS_PROD ? 'https://talentnest-hr.onrender.com' : 'http://localhost:5000');
