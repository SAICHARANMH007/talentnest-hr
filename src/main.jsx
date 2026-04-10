import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import './mobile-additions.css'
import './marketing-themes.css'
import { LogoProvider } from './context/LogoContext.jsx'
import { MarketingThemeProvider } from './context/MarketingThemeContext.jsx'

// Register service worker (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[SW] registered:', reg.scope))
      .catch(err => console.warn('[SW] registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LogoProvider>
        <MarketingThemeProvider>
          <App />
        </MarketingThemeProvider>
      </LogoProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
