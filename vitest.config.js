import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/test/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/data/**', 'src/workers/**'],
    },
  },
  define: {
    'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(''),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:5000/api'),
    'import.meta.env.PROD': JSON.stringify(false),
    'import.meta.env.VITE_RENDER': JSON.stringify(undefined),
    'import.meta.env.VITE_RAILWAY_STATIC_URL': JSON.stringify(undefined),
  },
})
