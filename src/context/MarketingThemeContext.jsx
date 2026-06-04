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
    heroOverlay: 'linear-gradient(160deg, rgba(5,10,20,0.96) 0%, rgba(15,23,42,0.92) 100%)',
    navUnscrolledBg: 'rgba(5,10,20,0.95)',
    // Theme pill
    dot:         '#3B82F6',
    dotGradient: 'linear-gradient(135deg, #1D4ED8, #06B6D4)',
    // RGB
    primaryRgb: '59,130,246',
    accentRgb:  '6,182,212',
    darkRgb:    '15,23,42',
    // Extra semantics
    textHeading: '#F1F5F9',
    statsBg:       '#141C2E',
    statsTextColor:'#F1F5F9',
    statsLabelColor:'rgba(241,245,249,0.6)',
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
    // Pure white — clearly different from mixed theme's blue-tinted bg
    sectionBg:   '#FFFFFF',
    surfaceBg:   '#F8FAFC',
    cardBg:      '#FFFFFF',
    cardBorder:  '#D1D9E6',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted:   '#6B7280',
    textOnDark:  '#ffffff',
    textOnDarkMuted: 'rgba(255,255,255,0.7)',
    navBg:       'rgba(255,255,255,0.97)',
    navText:     '#1E293B',
    navActive:   '#0176D3',
    heroOverlay: 'linear-gradient(160deg, rgba(0,20,70,0.95) 0%, rgba(0,50,140,0.88) 50%, rgba(0,80,180,0.82) 100%)',
    navUnscrolledBg: 'rgba(0,18,65,0.95)',
    dot:         '#0176D3',
    dotGradient: 'linear-gradient(135deg, #0176D3, #06B6D4)',
    primaryRgb:  '1,118,211',
    accentRgb:   '8,145,178',
    darkRgb:     '30,58,95',
    textHeading: '#111827',
    statsBg:       '#EEF2FF',
    statsTextColor:'#1E3A5F',
    statsLabelColor:'rgba(30,58,95,0.65)',
  },
  mixed: {
    id: 'mixed',
    label: 'Ocean',
    primary:     '#00B4D8',
    primaryDark: '#0096C7',
    accent:      '#06D6A0',
    accentDark:  '#059669',
    dark:        '#023E58',
    darker:      '#011929',
    gradStart:   '#012A3A',
    gradEnd:     '#005F73',
    // Deep ocean midnight
    sectionBg:   '#03111F',
    surfaceBg:   '#071E33',
    cardBg:      '#0A2744',
    cardBorder:  'rgba(0,180,216,0.22)',
    // Crisp white-cyan text — maximum readability
    textPrimary:   '#E8F8FF',
    textSecondary: '#A8D8EA',
    textMuted:     'rgba(168,216,234,0.75)',
    textOnDark:    '#ffffff',
    textOnDarkMuted: 'rgba(255,255,255,0.8)',
    navBg:       'rgba(3,17,31,0.97)',
    navText:     '#A8D8EA',
    navActive:   '#00B4D8',
    heroOverlay: 'linear-gradient(160deg, rgba(1,10,22,0.97) 0%, rgba(2,30,55,0.93) 60%, rgba(0,80,110,0.88) 100%)',
    navUnscrolledBg: 'rgba(1,10,22,0.96)',
    dot:         '#00B4D8',
    dotGradient: 'linear-gradient(135deg, #0096C7, #06D6A0)',
    primaryRgb:  '0,180,216',
    accentRgb:   '6,214,160',
    darkRgb:     '2,62,88',
    textHeading: '#FFFFFF',
    statsBg:       '#071E33',
    statsTextColor:'#E8F8FF',
    statsLabelColor:'rgba(168,216,234,0.7)',
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

    // Stats bar
    r.style.setProperty('--mkt-stats-bg',        theme.statsBg);
    r.style.setProperty('--mkt-stats-text',       theme.statsTextColor);
    r.style.setProperty('--mkt-stats-label',      theme.statsLabelColor);

    // Hero overlay (photo section tinted gradient)
    r.style.setProperty('--mkt-hero-overlay',    theme.heroOverlay);

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
    r.style.setProperty('--mkt-surface-bg-rgb',      hexToRgb(theme.surfaceBg));
    r.style.setProperty('--mkt-section-bg-rgb',      hexToRgb(theme.sectionBg));
    r.style.setProperty('--mkt-dark-rgb',             theme.darkRgb);
    r.style.setProperty('--mkt-nav-unscrolled-bg',    theme.navUnscrolledBg || 'rgba(5,10,20,0.95)');

    // Text selection highlight color matches theme accent
    let selStyle = document.getElementById('tn-selection-style');
    if (!selStyle) { selStyle = document.createElement('style'); selStyle.id = 'tn-selection-style'; document.head.appendChild(selStyle); }
    selStyle.textContent = `::selection { background: ${theme.primary}55; color: ${themeId === 'light' ? '#fff' : theme.textOnDark}; }`;

    // Set data attribute for CSS selector overrides (on html so it works before React renders too)
    document.documentElement.setAttribute('data-mkt-theme', themeId);
    document.body?.setAttribute('data-mkt-theme', themeId);
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
