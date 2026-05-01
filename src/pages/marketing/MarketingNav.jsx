import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LOGO_PATH } from '../../config/logo.js';
import { useLogo } from '../../context/LogoContext.jsx';
import { useMarketingTheme, THEMES } from '../../context/MarketingThemeContext.jsx';

const SERVICE_ITEMS = [
  { slug: 'it-staffing',        icon: '💻', title: 'IT Staffing',           desc: 'Software, cloud, DevOps & tech roles' },
  { slug: 'cybersecurity',      icon: '🛡️', title: 'Cybersecurity Staffing', desc: 'SOC, GRC, pen-test & infosec experts' },
  { slug: 'non-it-staffing',    icon: '🏢', title: 'Non-IT Staffing',        desc: 'Finance, ops, sales & admin talent' },
  { slug: 'c2h',                icon: '🔄', title: 'Contract to Hire',       desc: 'Try before you commit — flexible hiring' },
  { slug: 'c2c',                icon: '🤝', title: 'Corp to Corp (C2C)',     desc: 'B2B contractor placements' },
  { slug: 'permanent-staffing', icon: '🎯', title: 'Permanent Staffing',     desc: 'Full-time hires with replacement guarantee' },
  { slug: 'hrms-platform',      icon: '⚙️', title: 'HRMS Platform',          desc: 'Faceify Smart attendance & workforce mgmt' },
];

const NAV_LINKS = [
  { id: 'home',     label: 'Home',     to: '/' },
  { id: 'services', label: 'Services', to: '/services', hasDropdown: true },
  { id: 'hrms',     label: 'HRMS',     to: '/hrms' },
  { id: 'about',    label: 'About',    to: '/about' },
  { id: 'blog',     label: 'Blog',     to: '/blog' },
  { id: 'contact',  label: 'Contact',  to: '/contact' },
];

export default function MarketingNav({ active = 'home' }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const closeTimer = useRef(null);
  const navigate = useNavigate();
  const { customLogoUrl } = useLogo() || {};
  const logoSrc = customLogoUrl || LOGO_PATH;
  const { theme, themeId, setThemeId } = useMarketingTheme();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const openSvc  = () => { clearTimeout(closeTimer.current); setServicesOpen(true); };
  const closeSvc = () => { closeTimer.current = setTimeout(() => setServicesOpen(false), 150); };



  // When not scrolled the nav floats over the dark hero — always use white text.
  // When scrolled in light theme the nav gets a white background — switch to dark text.
  const onDarkHero     = !scrolled;
  const navTextColor   = onDarkHero ? 'rgba(255,255,255,0.9)' : 'var(--mkt-nav-text)';
  const logoNameColor  = onDarkHero ? '#fff'                  : 'var(--mkt-nav-text)';
  const logoSubColor   = onDarkHero ? 'rgba(255,255,255,0.55)': 'var(--mkt-text-muted)';
  const hamburgerColor = onDarkHero ? '#fff'                  : 'var(--mkt-nav-text)';
  const hamburgerBg   = 'rgba(var(--mkt-accent-rgb), 0.1)';
  const hamburgerBorder = '1px solid rgba(var(--mkt-accent-rgb), 0.2)';

  // Theme switcher pill colors
  const switcherBg     = 'var(--mkt-surface-bg)';
  const switcherBorder = '1px solid var(--mkt-card-border)';
  const switcherActiveBg = 'var(--mkt-primary)';
  const switcherActiveColor = '#fff';
  const switcherInactiveColor = 'var(--mkt-text-muted)';

  const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";

  return (
    <>
      <style>{`
        @keyframes tn-dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes tn-slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tn-nav-link {
          font-size: 14px; font-weight: 600; text-decoration: none;
          transition: all 0.2s; padding: 4px 0; white-space: nowrap;
          display: flex; align-items: center; gap: 4px;
        }
        .svc-dropdown {
          position: absolute; top: calc(100% + 15px); left: 50%;
          transform: translateX(-50%);
          background: var(--mkt-card-bg); border-radius: 20px;
          box-shadow: 0 30px 90px rgba(0,0,0,0.2);
          border: 1px solid var(--mkt-card-border);
          padding: 12px; display: grid;
          grid-template-columns: repeat(2, 1fr); gap: 4px;
          width: 460px; max-width: calc(100vw - 32px);
          z-index: 10000; animation: tn-dropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .svc-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          text-decoration: none; transition: all 0.15s;
          border-left: 2px solid transparent;
        }
        .svc-item:hover { background: rgba(var(--mkt-accent-rgb), 0.1); border-left-color: var(--mkt-accent); }
        .svc-footer { grid-column: 1 / -1; border-top: 1px solid var(--mkt-card-border); margin-top: 8px; padding-top: 12px; display: flex; justify-content: center; }
        .svc-view-all { font-size: 13px; font-weight: 800; color: var(--mkt-accent); text-decoration: none; }
        .svc-view-all:hover { filter: brightness(1.2); }

        /* ── Mobile overlay ── */
        .tn-mobile-nav {
          position: fixed; inset: 0; z-index: 9999;
          background: var(--mkt-section-bg);
          display: flex; flex-direction: column;
          font-family: ${ff};
          animation: tn-slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .tn-mobile-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid var(--mkt-card-border);
        }
        .tn-mobile-body {
          flex: 1; overflow-y: auto; padding: 8px 20px 0;
        }
        .tn-mobile-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 0; font-size: 1.1rem; font-weight: 800;
          color: var(--mkt-text-heading); text-decoration: none;
          border-bottom: 1px solid var(--mkt-card-border);
          transition: all 0.2s;
        }
        .tn-mobile-link:hover, .tn-mobile-link.active { color: var(--mkt-accent); padding-left: 8px; }
        .tn-mobile-svc-list {
          padding: 8px 0 8px 20px;
          border-left: 3px solid var(--mkt-accent);
          margin-bottom: 8px;
        }
        .tn-mobile-svc-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 10px; border-radius: 12px; font-size: 15px; font-weight: 700;
          color: var(--mkt-text); text-decoration: none; transition: all 0.2s;
        }
        .tn-mobile-svc-item:hover { background: rgba(var(--mkt-accent-rgb),0.1); color: var(--mkt-accent); }
        .tn-mobile-footer {
          padding: 24px 20px;
          border-top: 1px solid var(--mkt-card-border);
          background: var(--mkt-card-bg);
        }
        .tn-mobile-cta-row {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;
        }
        .tn-mobile-cta {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 16px 12px; border-radius: 16px; text-decoration: none;
          font-size: 13px; font-weight: 800; text-align: center; gap: 6px;
          transition: all 0.2s;
        }
        .tn-mobile-cta-contact {
          background: rgba(var(--mkt-accent-rgb),0.12); border: 1.5px solid rgba(var(--mkt-accent-rgb),0.35); color: var(--mkt-accent);
        }
        .tn-mobile-cta-contact:hover { background: rgba(var(--mkt-accent-rgb),0.22); }
        .tn-mobile-cta-platform {
          background: rgba(1,118,211,0.15); border: 1.5px solid rgba(1,118,211,0.4); color: #4BA3E3;
        }
        .tn-mobile-cta-platform:hover { background: rgba(1,118,211,0.25); }
        .tn-mobile-getstarted {
          display: block; width: 100%; padding: 16px; border-radius: 14px;
          background: linear-gradient(135deg, var(--mkt-primary), var(--mkt-primary-dark));
          border: none; color: #fff; font-weight: 800; font-size: 16px;
          cursor: pointer; text-align: center; text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 8px 20px rgba(var(--mkt-primary-rgb), 0.3);
        }
        .tn-mobile-getstarted:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(var(--mkt-primary-rgb), 0.4); }

        @media (max-width: 900px) {
          .tn-desktop-only { display: none !important; }
          .tn-hamburger-btn { display: flex !important; }
        }
        @media (min-width: 901px) {
          .tn-hamburger-btn { display: none !important; }
        }
      `}</style>

      <header style={{
        background: scrolled ? 'var(--mkt-nav-bg)' : 'transparent',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: scrolled ? '1px solid var(--mkt-card-border)' : '1px solid transparent',
        boxShadow: scrolled ? '0 10px 40px rgba(0,0,0,0.15)' : 'none',
        height: 66,
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center',
        fontFamily: ff,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 20px',
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ height: 44, width: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src={logoSrc} alt="TalentNest HR" style={{ maxHeight: 38, maxWidth: 38, width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', lineHeight: 1 }}>
              <span style={{ fontWeight: 900, fontSize: 18, color: logoNameColor, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                Talent<span style={{ color: 'var(--mkt-accent)' }}>Nest</span> HR
              </span>
              <span style={{ fontSize: 10, color: logoSubColor, fontWeight: 800, letterSpacing: '0.2em', marginTop: 4, whiteSpace: 'nowrap' }}>
                FIND · HIRE · GROW
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="tn-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 1, justifyContent: 'center' }}>
            {NAV_LINKS.map(n => {
              if (n.hasDropdown) {
                return (
                  <div key={n.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }} onMouseEnter={openSvc} onMouseLeave={closeSvc}>
                    <Link
                      to={n.to}
                      className="tn-nav-link"
                      style={{ color: active === n.id ? 'var(--mkt-primary)' : navTextColor, display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      {n.label}
                      <span style={{ fontSize: 9, transition: 'transform 0.3s', transform: servicesOpen ? 'rotate(180deg)' : 'none', color: 'var(--mkt-text-muted)' }}>▾</span>
                    </Link>
                    {servicesOpen && (
                      <div className="svc-dropdown" onMouseEnter={openSvc} onMouseLeave={closeSvc}>
                        {SERVICE_ITEMS.map(s => (
                          <Link key={s.slug} to={`/services/${s.slug}`} className="svc-item" onClick={() => setServicesOpen(false)}>
                            <span style={{ width: 36, height: 36, borderRadius: 10, background: `rgba(var(--mkt-accent-rgb), 0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{s.icon}</span>
                            <span>
                              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--mkt-text-heading)', display: 'block', marginBottom: 2 }}>{s.title}</span>
                              <span style={{ fontSize: 12, color: 'var(--mkt-text-muted)', display: 'block', lineHeight: 1.4 }}>{s.desc}</span>
                            </span>
                          </Link>
                        ))}
                        <div className="svc-footer">
                          <Link to="/services" className="svc-view-all" onClick={() => setServicesOpen(false)}>View All Services →</Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={n.id} to={n.to} className="tn-nav-link"
                  style={{ color: active === n.id ? 'var(--mkt-primary)' : navTextColor }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--mkt-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = active === n.id ? 'var(--mkt-primary)' : navTextColor; }}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop right CTAs */}
          <div className="tn-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <Link
              to="/careers"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#10B981', textDecoration: 'none', padding: '10px 16px', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, background: 'rgba(16,185,129,0.08)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.transform = 'none'; }}
            >
              <span style={{ fontSize: 15 }}>💼</span> Jobs
            </Link>
            <Link
              to="/app"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 22px', fontSize: 13, fontWeight: 900, textDecoration: 'none', boxShadow: `0 4px 12px rgba(var(--mkt-primary-rgb),0.30)`, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})`; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 18px rgba(var(--mkt-primary-rgb),0.40)`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark})`; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 12px rgba(var(--mkt-primary-rgb),0.30)`; }}
            >
              🔐 Login
            </Link>
          </div>

          {/* Hamburger Btn */}
          <button
            className="tn-hamburger-btn"
            onClick={() => setMobileOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 12px',
              background: hamburgerBg, border: hamburgerBorder, borderRadius: 10,
              cursor: 'pointer', color: hamburgerColor, flexShrink: 0
            }}
          >
            <span style={{ width: 22, height: 2, background: 'currentColor', borderRadius: 2 }} />
            <span style={{ width: 22, height: 2, background: 'currentColor', borderRadius: 2 }} />
            <span style={{ width: 16, height: 2, background: 'currentColor', borderRadius: 2 }} />
          </button>
        </div>
      </header>

      {/* ───── FLOATING ELITE THEME CONTROLLER (Fixed Right) ───── */}
      <div className="tn-desktop-only" style={{
        position: 'fixed',
        right: '24px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 10001,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '8px',
        background: themeId === 'light'
          ? 'rgba(255,255,255,0.92)'
          : 'rgba(var(--mkt-surface-bg-rgb), 0.82)',
        backdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '100px',
        border: themeId === 'light'
          ? '1px solid rgba(0,0,0,0.10)'
          : '1px solid var(--mkt-card-border)',
        boxShadow: themeId === 'light'
          ? '0 8px 32px rgba(0,0,0,0.12)'
          : '0 20px 50px rgba(0,0,0,0.35)',
        animation: 'tn-slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}>
        {[
          { id: 'light', icon: '☀️', label: 'Light' },
          { id: 'mixed', icon: '◑', label: 'Mixed' },
          { id: 'dark',  icon: '🌙', label: 'Dark' }
        ].map((t) => {
          const isActive = themeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setThemeId(t.id)}
              title={`${t.label} Mode`}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: isActive ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
                background: isActive ? 'var(--mkt-primary)' : 'transparent',
                color: isActive ? '#fff' : (themeId === 'light' ? '#475569' : 'var(--mkt-nav-text)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isActive ? '0 0 20px var(--mkt-primary)' : 'none',
                position: 'relative'
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(var(--mkt-accent-rgb), 0.15)';
                  e.currentTarget.style.transform = 'scale(1.15)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              {t.icon}
            </button>
          );
        })}
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="tn-mobile-nav">
          <div className="tn-mobile-header">
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
              <div style={{ height: 40, width: 40, background: 'var(--mkt-card-bg)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoSrc} alt="Logo" style={{ maxHeight: 32 }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--mkt-text-heading)' }}>
                Talent<span style={{ color: 'var(--mkt-accent)' }}>Nest</span>
              </span>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(var(--mkt-accent-rgb), 0.1)', border: '1px solid rgba(var(--mkt-accent-rgb), 0.2)', color: 'var(--mkt-text-heading)', fontSize: 18, cursor: 'pointer' }}
            >✕</button>
          </div>

          <div className="tn-mobile-body">
            {NAV_LINKS.map(n => (
              <div key={n.id}>
                {n.hasDropdown ? (
                  <>
                    <button
                      onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                      className={`tn-mobile-link ${active === n.id ? 'active' : ''}`}
                      style={{ width: '100%', border: 'none', background: 'none' }}
                    >
                      <span>🏢 {n.label}</span>
                      <span style={{ transform: mobileServicesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>▾</span>
                    </button>
                    {mobileServicesOpen && (
                      <div className="tn-mobile-svc-list">
                        {SERVICE_ITEMS.map(s => (
                          <Link key={s.slug} to={`/services/${s.slug}`} className="tn-mobile-svc-item" onClick={() => setMobileOpen(false)}>
                            <span>{s.icon}</span> {s.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link to={n.to} className={`tn-mobile-link ${active === n.id ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                    <span>{n.id === 'home' ? '🏠' : n.id === 'hrms' ? '⚙️' : n.id === 'about' ? 'ℹ️' : n.id === 'blog' ? '📰' : '📞'} {n.label}</span>
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="tn-mobile-footer">
            <div className="tn-mobile-cta-row">
              <Link to="/contact" className="tn-mobile-cta tn-mobile-cta-contact" onClick={() => setMobileOpen(false)}>
                📞 Contact Us
              </Link>
              <a href="https://www.talentnesthr.com/app" className="tn-mobile-cta tn-mobile-cta-platform" onClick={() => setMobileOpen(false)}>
                🔐 Login
              </a>
            </div>
            <div style={{ marginTop: 24, padding: '0 4px' }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--mkt-text-muted)', letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>Appearance</div>
              <div style={{ display: 'flex', background: 'var(--mkt-surface-bg)', borderRadius: 16, padding: 4, border: '1px solid var(--mkt-card-border)' }}>
                {[
                  { id: 'light', icon: '☀️', label: 'Light' },
                  { id: 'mixed', icon: '◑', label: 'Mixed' },
                  { id: 'dark',  icon: '🌙', label: 'Dark' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setThemeId(t.id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '12px 0', border: 'none', borderRadius: 12,
                      background: themeId === t.id ? 'var(--mkt-primary)' : 'transparent',
                      color: themeId === t.id ? '#fff' : 'var(--mkt-text)',
                      fontSize: 14, fontWeight: 800, transition: 'all 0.2s', cursor: 'pointer'
                    }}
                  >
                    <span>{t.icon}</span> {t.label}
                  </button>
                )) }
              </div>
            </div>
            <Link to="/careers" className="tn-mobile-getstarted" style={{ marginTop: 20 }} onClick={() => setMobileOpen(false)}>
              Browse Available Jobs
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
