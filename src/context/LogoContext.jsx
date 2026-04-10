import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api/config.js';
import { getToken } from '../api/client.js';

const LogoContext = createContext(null);

export function LogoProvider({ children }) {
  const [customLogoUrl, setCustomLogoUrl] = useState(() => {
    try {
      return localStorage.getItem('orgLogoUrl') || null;
    } catch {
      return null;
    }
  });
  const [logoLoading, setLogoLoading] = useState(true);

  // Centralized fetch — uses authenticated endpoint if token is in memory,
  // falls back to public endpoint for unauthenticated visitors (marketing pages).
  const fetchLogo = useCallback(async () => {
    const token = getToken();
    try {
      if (token) {
        const res = await fetch(`${API_BASE_URL}/orgs/logo`, {
          headers: { Authorization: `Bearer ${token}`, 'X-Requested-With': 'TalentNest' },
          credentials: 'include',
        });
        if (res.ok) {
          const d = await res.json();
          const url = d?.logoUrl || null;
          setCustomLogoUrl(url);
          try {
            if (url) localStorage.setItem('orgLogoUrl', url);
            else localStorage.removeItem('orgLogoUrl');
          } catch {}
          return;
        }
      }
      // No token or authenticated fetch failed — use public endpoint
      const res = await fetch(`${API_BASE_URL}/orgs/logo/public`);
      if (res.ok) {
        const d = await res.json();
        if (d?.logoUrl) {
          setCustomLogoUrl(d.logoUrl);
          try {
            localStorage.setItem('orgLogoUrl', d.logoUrl);
          } catch {}
        }
      }
    } catch {
      // Network error — leave cached logo from localStorage as-is
    } finally {
      setLogoLoading(false);
    }
  }, []);

  // Initial fetch on mount (public logo for visitors, or authenticated if already logged in)
  useEffect(() => {
    fetchLogo();
  }, [fetchLogo]);

  // Re-fetch with auth once App.jsx completes initAuth() — resolves the race condition
  // where getToken() is null on first mount because the refresh cookie hasn't been
  // exchanged for an access token yet.
  useEffect(() => {
    const handler = () => fetchLogo();
    window.addEventListener('tn_auth_ready', handler);
    return () => window.removeEventListener('tn_auth_ready', handler);
  }, [fetchLogo]);

  const updateLogo = (newUrl) => {
    setCustomLogoUrl(newUrl || null);
    try {
      if (newUrl) localStorage.setItem('orgLogoUrl', newUrl);
      else localStorage.removeItem('orgLogoUrl');
    } catch {}
    // Update favicon dynamically
    const link = document.querySelector("link[rel='icon']") || document.createElement('link');
    link.rel = 'icon';
    link.href = newUrl || '/favicon.svg';
    document.head.appendChild(link);
    window.dispatchEvent(new CustomEvent('logoUpdated', { detail: { url: newUrl } }));
  };

  useEffect(() => {
    const handler = (e) => setCustomLogoUrl(e.detail.url || null);
    window.addEventListener('logoUpdated', handler);
    return () => window.removeEventListener('logoUpdated', handler);
  }, []);

  return (
    <LogoContext.Provider value={{ customLogoUrl, logoLoading, updateLogo }}>
      {children}
    </LogoContext.Provider>
  );
}

export const useLogo = () => useContext(LogoContext);
