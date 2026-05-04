import React from 'react';
import { Link } from 'react-router-dom';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';
import { LOGO_PATH } from '../../config/logo.js';

const QUICK_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/careers', label: 'Careers' },
  { to: '/hrms', label: 'HRMS Platform' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

const SERVICE_LINKS = [
  { to: '/services/it-staffing', label: 'IT Staffing' },
  { to: '/services/cybersecurity', label: 'Cybersecurity Staffing' },
  { to: '/services/non-it-staffing', label: 'Non-IT Staffing' },
  { to: '/services/c2h', label: 'Contract to Hire (C2H)' },
  { to: '/services/c2c', label: 'Corp to Corp (C2C)' },
  { to: '/services/permanent-staffing', label: 'Permanent Staffing' },
  { to: '/services/hrms-platform', label: 'HRMS Platform' },
];

const CONTACT_ITEMS = [
  { icon: '📍', label: 'Ganesh Nagar, Ameenpur, Hyderabad, Telangana 500049, India' },
  { icon: '📞', label: '+91 79955 35539', href: 'tel:+917995535539' },
  { icon: '✉️', label: 'hr@talentnesthr.com', href: 'mailto:hr@talentnesthr.com' },
  { icon: '🕐', label: 'Mon to Fri: 9 AM to 7 PM IST' },
];

const SOCIALS = [
  { label: 'LinkedIn',  icon: '🔗', href: 'https://www.linkedin.com/company/talent-nest-hr/' },
  { label: 'Instagram', icon: '📸', href: 'https://www.instagram.com/talentnesthr/' },
  { label: 'Facebook',  icon: '👤', href: 'https://www.facebook.com/profile.php?id=61576949728635' },
];

export default function MarketingFooter() {
  const { theme } = useMarketingTheme();

  const colHeaderStyle = {
    fontSize: '0.75rem',
    fontWeight: 900,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: 'var(--mkt-text-on-dark, #fff)',
    marginBottom: '24px',
    display: 'block',
  };

  const linkStyle = {
    display: 'block',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '12px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  };

  return (
    <footer style={{
      background: 'var(--mkt-darker, #050A14)',
      color: 'rgba(255,255,255,0.8)',
      paddingTop: '80px',
      paddingBottom: '40px',
      borderTop: '1px solid var(--mkt-card-border)',
      fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif"
    }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '60px 40px', marginBottom: '80px' }}>

          {/* Brand & Socials */}
          <div style={{ maxWidth: 320 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '24px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={LOGO_PATH} alt="TalentNest HR" style={{ height: 32 }} />
              </div>
              <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#fff', letterSpacing: '-0.04em' }}>
                Talent<span style={{ color: 'var(--mkt-accent)' }}>Nest</span> HR
              </span>
            </div>
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.5)', marginBottom: '32px' }}>
              Redefining recruitment through technology and precision. Your trusted partner for IT, cybersecurity, and strategic staffing globally.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              {SOCIALS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.3s', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--mkt-primary)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  title={s.label}
                >
                  <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Site Map */}
          <div>
            <span style={colHeaderStyle}>Company</span>
            {QUICK_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                style={linkStyle}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--mkt-accent)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Solutions */}
          <div>
            <span style={colHeaderStyle}>Solutions</span>
            {SERVICE_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                style={linkStyle}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--mkt-accent)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* HQ Info */}
          <div>
            <span style={colHeaderStyle}>Global HQ</span>
            {CONTACT_ITEMS.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, marginBottom: '18px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.2rem', color: 'var(--mkt-accent)', flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                {c.href ? (
                  <a
                    href={c.href}
                    style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--mkt-accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  >
                    {c.label}
                  </a>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>{c.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Legal & Copyright */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontWeight: 500 }}>
            © 2026 TalentNest HR. Building the future of work.
          </p>
          <div style={{ display: 'flex', gap: '32px' }}>
            <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>Privacy</Link>
            <Link to="/terms" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
