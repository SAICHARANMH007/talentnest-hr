import { createContext, useContext, useState, useEffect } from 'react';

export const THEMES = {
  dark: {
    id: 'dark',
    label: 'Dark',
    // Brand colors
    primary:     '#3B82F6',
    primaryDark: '#1D4ED8',
    accent:      '#06B6D4',
    accentDark:  '#0891B2',
    dark:        '#0F172A',
    darker:      '#050A14',
    gradStart:   '#0F172A',
    gradEnd:     '#1E3A5F',
    // Section / surface colors
    sectionBg:   '#0A0F1E',
    surfaceBg:   '#0F172A',
    cardBg:      '#141C2E',
    cardBorder:  'rgba(255,255,255,0.07)',
    // Text
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textMuted:   'rgba(255,255,255,0.5)',
    textOnDark:  '#ffffff',
    textOnDarkMuted: 'rgba(255,255,255,0.7)',
    // Nav
    navBg:       'rgba(5,10,20,0.95)',
    navText:     '#CBD5E1',
    navActive:   '#3B82F6',
    // Hero overlay
    heroOverlay: 'linear-gradient(160deg, rgba(5,10,20,0.95) 0%, rgba(15,23,42,0.90) 100%)',
    // Theme pill
    dot:         '#3B82F6',
    dotGradient: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
    // RGB
    primaryRgb: '59,130,246',
    accentRgb:  '6,182,212',
    darkRgb:    '15,23,42',
    // Extra semantics
    textHeading: '#F1F5F9',
  },
  light: {
    id: 'light',
    label: 'Light',
    primary:     '#0176D3',
    primaryDark: '#014486',
    accent:      '#0891B2',
    accentDark:  '#0E7490',
    dark:        '#1E3A5F',
    darker:      '#0F2744',
    gradStart:   '#1E40AF',
    gradEnd:     '#0176D3',
    sectionBg:   '#FFFFFF',
    surfaceBg:   '#F8FAFC',
    cardBg:      '#FFFFFF',
    cardBorder:  '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted:   '#64748B',
    textOnDark:  '#ffffff',
    textOnDarkMuted: 'rgba(255,255,255,0.7)',
    navBg:       'rgba(255,255,255,0.97)',
    navText:     '#334155',
    navActive:   '#0176D3',
    heroOverlay: 'linear-gradient(160deg, rgba(30,58,95,0.88) 0%, rgba(1,118,211,0.82) 100%)',
    dot:         '#0176D3',
    dotGradient: 'linear-gradient(135deg, #0176D3, #06B6D4)',
    primaryRgb:  '1,118,211',
    accentRgb:   '8,145,178',
    darkRgb:     '30,58,95',
    textHeading: '#0F172A',
  },
  mixed: {
    id: 'mixed',
    label: 'Dark + Light',
    primary:     '#0176D3',
    primaryDark: '#014486',
    accent:      '#06B6D4',
    accentDark:  '#0891B2',
    dark:        '#032D60',
    darker:      '#050D1A',
    gradStart:   '#032D60',
    gradEnd:     '#0176D3',
    sectionBg:   '#FFFFFF',
    surfaceBg:   '#F8FAFC',
    cardBg:      '#FFFFFF',
    cardBorder:  '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted:   '#64748B',
    textOnDark:  '#ffffff',
    textOnDarkMuted: 'rgba(255,255,255,0.7)',
    navBg:       'rgba(5,13,26,0.95)',
    navText:     '#CBD5E1',
    navActive:   '#06B6D4',
    heroOverlay: 'linear-gradient(160deg, rgba(5,13,26,0.92) 0%, rgba(1,36,86,0.88) 60%, rgba(5,13,26,0.95) 100%)',
    dot:         '#06B6D4',
    dotGradient: 'linear-gradient(135deg, #032D60, #06B6D4)',
    primaryRgb:  '1,118,211',
    accentRgb:   '6,182,212',
    darkRgb:     '3,45,96',
    textHeading: '#0F172A',
  },
};

const MarketingThemeContext = createContext(null);

export function MarketingThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    try {
      const saved = localStorage.getItem('tn_mkt_theme');
      if (saved && THEMES[saved]) return saved;
      // First visit: respect OS preference
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'mixed';
    } catch (e) {
      return 'mixed';
    }
  });
  const theme = THEMES[themeId] || THEMES.mixed;

  useEffect(() => {
    try { localStorage.setItem('tn_mkt_theme', themeId); } catch (e) {}
    const r = document.documentElement;

    // Core brand colors
    r.style.setProperty('--mkt-primary',      theme.primary);
    r.style.setProperty('--mkt-primary-dark',  theme.primaryDark);
    r.style.setProperty('--mkt-accent',        theme.accent);
    r.style.setProperty('--mkt-accent-dark',   theme.accentDark);
    r.style.setProperty('--mkt-dark',          theme.dark);
    r.style.setProperty('--mkt-darker',        theme.darker);
    r.style.setProperty('--mkt-grad-start',    theme.gradStart);
    r.style.setProperty('--mkt-grad-end',      theme.gradEnd);
    r.style.setProperty('--mkt-primary-rgb',   theme.primaryRgb);
    r.style.setProperty('--mkt-accent-rgb',    theme.accentRgb);

    // Surface / section
    r.style.setProperty('--mkt-section-bg',    theme.sectionBg);
    r.style.setProperty('--mkt-surface-bg',    theme.surfaceBg);
    r.style.setProperty('--mkt-card-bg',       theme.cardBg);
    r.style.setProperty('--mkt-card-border',   theme.cardBorder);

    // Text — all variants
    r.style.setProperty('--mkt-text',              theme.textPrimary);
    r.style.setProperty('--mkt-text-secondary',    theme.textSecondary);
    r.style.setProperty('--mkt-text-muted',        theme.textMuted);
    r.style.setProperty('--mkt-text-heading',      theme.textHeading);
    r.style.setProperty('--mkt-text-on-dark',      theme.textOnDark);
    r.style.setProperty('--mkt-text-on-dark-muted',theme.textOnDarkMuted);

    // Nav
    r.style.setProperty('--mkt-nav-bg',            theme.navBg);
    r.style.setProperty('--mkt-nav-text',          theme.navText);
    r.style.setProperty('--mkt-nav-active',        theme.navActive);

    // CTA button in nav — always visible
    r.style.setProperty('--mkt-nav-cta-bg',
      `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`);
    r.style.setProperty('--mkt-nav-cta-hover',
      `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})`);

    // Shadows
    const shadowColor = themeId === 'dark'
      ? 'rgba(0,0,0,0.5)'
      : 'rgba(15,23,42,0.14)';
    r.style.setProperty('--shadow-sm', `0 1px 3px ${shadowColor}`);
    r.style.setProperty('--shadow-md', `0 4px 16px ${shadowColor}`);
    r.style.setProperty('--shadow-lg', `0 12px 40px ${shadowColor}`);
    r.style.setProperty('--shadow-xl', `0 24px 64px ${shadowColor}`);

    // RGB helpers for transparency effects
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '255,255,255';
    };
    r.style.setProperty('--mkt-surface-bg-rgb', hexToRgb(theme.surfaceBg));
    r.style.setProperty('--mkt-section-bg-rgb', hexToRgb(theme.sectionBg));
    r.style.setProperty('--mkt-dark-rgb',        theme.darkRgb);

    // Set data attribute for CSS selector overrides
    document.body.setAttribute('data-mkt-theme', themeId);
  }, [themeId, theme]);

  return (
    <MarketingThemeContext.Provider value={{ theme, themeId, setThemeId }}>
      {children}
    </MarketingThemeContext.Provider>
  );
}

export function useMarketingTheme() {
  return useContext(MarketingThemeContext) || { theme: THEMES.mixed, themeId: 'mixed', setThemeId: () => {} };
}
