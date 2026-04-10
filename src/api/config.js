const IS_PROD = import.meta.env.PROD || !!import.meta.env.VITE_RENDER || !!import.meta.env.VITE_RAILWAY_STATIC_URL;

export const API_BASE_URL = import.meta.env.VITE_API_URL || (IS_PROD ? "/api" : "http://localhost:5000/api");
