import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { api } from '../../api/api.js';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const CONTACT_ITEMS = [
  { icon: '📍', label: 'Address', value: 'Ganesh Nagar, Ameenpur, Hyderabad, Telangana 500049, India' },
  { icon: '📞', label: 'Call / WhatsApp', value: '+91 79955 35539', href: 'tel:+917995535539' },
  { icon: '✉️', label: 'Email Us', value: 'hr@talentnesthr.com', href: 'mailto:hr@talentnesthr.com' },
  { icon: '🕐', label: 'Business Hours', value: 'Monday to Friday, 9 AM to 7 PM IST' },
];

const CONTACT_REASONS = [
  'Urgent hiring for open roles',
  'Need a staffing partner for ongoing growth',
  'Exploring HRMS or recruitment automation',
];

export default function ContactPage() {
  const { theme, themeId } = useMarketingTheme();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', service: '', message: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* ── Derived Styles (Inside component to access theme) ── */
  const inpStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 16px',
    borderRadius: 12,
    border: `1.5px solid var(--mkt-card-border)`,
    fontSize: '0.95rem',
    fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif",
    outline: 'none',
    background: 'var(--mkt-surface-bg)',
    color: 'var(--mkt-text)',
    transition: 'all 0.2s ease',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 700,
    color: 'var(--mkt-text-muted)',
    fontSize: '0.75rem',
    marginBottom: 8,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link'); link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      await api.submitLead({ ...form, source: 'contact-page' });
      setSent(true);
      setForm({ name: '', email: '', phone: '', company: '', service: '', message: '' });
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please email us directly at hr@talentnesthr.com');
    }
    setSubmitting(false);
  };

  return (
    <div className="mkt-page" style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", background: 'var(--mkt-section-bg)', minHeight: '100vh', color: 'var(--mkt-text)' }}>
      <style>{`
        /* Contact Page specific responsive behavior */
        @media (min-width: 901px) {
          .mkt-sidebar-cont {
            position: sticky;
            top: 90px;
          }
        }
        @media (max-width: 900px) {
          .mkt-sidebar-cont {
            position: relative;
            top: 0;
            margin-bottom: 24px;
          }
        }
      `}</style>
      <MarketingNav active="contact" />

      {/* ── HERO ── */}
      <section style={{
        paddingTop: 130,
        paddingBottom: 100,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&auto=format&fit=crop&q=80')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        {/* Overlay - uses primary/dark tokens */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(3,17,38,0.96) 0%, rgba(1,36,86,0.92) 100%)',
        }} />
        {/* Grid dot */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
        }} />
        {/* Orb */}
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: `radial-gradient(circle, rgba(${theme.accentRgb}, 0.18) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div className="tn-container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(var(--mkt-accent-rgb), 0.1)',border:'1px solid rgba(var(--mkt-accent-rgb), 0.25)',borderRadius:100,padding:'8px 20px',marginBottom:20 }}>
            <span style={{ width:7,height:7,borderRadius:'50%',background:'var(--mkt-accent)',boxShadow:'0 0 8px var(--mkt-accent)',display:'inline-block' }} />
            <span style={{ color:'var(--mkt-accent)',fontSize:12,fontWeight:600,letterSpacing:'0.06em' }}>Contact Us</span>
          </div>
          <h1 style={{ color: 'var(--mkt-text-on-dark, #fff)', fontSize: 'clamp(2.5rem,6vw,4rem)', fontWeight: 900, margin: '0 0 20px', lineHeight: 1.05, letterSpacing: '-0.04em' }}>
            Let's Find Your Next<br />
            <span style={{ background: 'linear-gradient(135deg, var(--mkt-primary), var(--mkt-accent))', display: 'inline-block', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Great Hire
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            Tell us your hiring challenge. We'll respond within 2 hours on business days.
          </p>
          <div style={{ display:'flex', gap:20, justifyContent:'center', marginTop:36, flexWrap:'wrap' }}>
            {[{ icon:'⚡', text:'2hr Response Time' }, { icon:'🤝', text:'Free Consultation' }, { icon:'🔒', text:'100% Confidential' }].map(p => (
              <div key={p.text} style={{ display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:100,padding:'8px 16px' }}>
                <span style={{ fontSize:13 }}>{p.icon}</span>
                <span style={{ color:'rgba(255,255,255,0.7)',fontSize:13,fontWeight:500 }}>{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUICK REASONS ── */}
      <section className="mkt-section-light" style={{ padding: '0 0 34px' }}>
        <div className="tn-container">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {CONTACT_REASONS.map(item => (
              <div key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--mkt-surface-bg)', border: `1px solid var(--mkt-card-border)`, borderRadius: 999, padding: '10px 16px', color: 'var(--mkt-text)', fontSize: 13, fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--mkt-accent)', display: 'inline-block' }} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT — 40/60 split ── */}
      <section className="mkt-section-light" style={{ padding: '60px 0 100px' }}>
        <div className="tn-container">
          <div className="mkt-split">

            {/* LEFT — contact info panel (dark card) */}
            <div className="mkt-sidebar-cont" style={{
              background: `linear-gradient(160deg, var(--mkt-dark) 0%, var(--mkt-darker) 100%)`,
              border: `1px solid var(--mkt-card-border)`,
              borderRadius: 24,
              padding: 'clamp(24px, 5vw, 48px)',
              color: '#fff',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display:'inline-flex',alignItems:'center',gap:6,background:`rgba(var(--mkt-accent-rgb), 0.1)`,border:`1px solid rgba(var(--mkt-accent-rgb), 0.2)`,borderRadius:100,padding:'6px 16px',marginBottom:24 }}>
                <span style={{ color:'var(--mkt-accent)',fontSize:11,fontWeight:800,letterSpacing:'0.08em',textTransform:'uppercase' }}>Get In Touch</span>
              </div>
              <h2 style={{ color: '#fff', fontSize: 'clamp(1.6rem,2.5vw,2.2rem)', fontWeight: 900, marginBottom: 40, lineHeight: 1.1, letterSpacing: '-0.03em' }}>
                Let's Start a Conversation
              </h2>

              {(Array.isArray(CONTACT_ITEMS) ? CONTACT_ITEMS : []).map(c => (
                <div key={c.label} style={{ display: 'flex', gap: 16, marginBottom: 28, alignItems: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `rgba(var(--mkt-accent-rgb), 0.12)`, border: `1px solid rgba(var(--mkt-accent-rgb), 0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{c.icon}</div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{c.label}</div>
                    {c.href ? (
                      <a href={c.href} style={{ color: 'var(--mkt-accent)', fontSize: '1rem', fontWeight: 700, textDecoration: 'none', lineHeight: 1.5, transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.target.style.color = '#fff'; }}
                        onMouseLeave={e => { e.target.style.color = 'var(--mkt-accent)'; }}
                      >{c.value}</a>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', fontWeight: 600 }}>{c.value}</span>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ borderTop: `1px solid rgba(255,255,255,0.1)`, paddingTop: 28, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a
                  href="https://www.linkedin.com/company/talent-nest-hr/?viewAsMember=true"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--mkt-accent)', fontSize: '0.95rem', fontWeight: 800, textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--mkt-accent)'; }}
                >
                  🔗 LinkedIn Company Page
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61576949728635"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--mkt-accent)', fontSize: '0.95rem', fontWeight: 800, textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--mkt-accent)'; }}
                >
                  👤 Facebook Page
                </a>
              </div>
            </div>

            {/* RIGHT — form card (theme-aware) */}
            <div className="mkt-card" style={{
              background: 'var(--mkt-card-bg)',
              border: `1px solid var(--mkt-card-border)`,
              borderRadius: 24,
              padding: 'clamp(24px, 5vw, 48px)',
              boxShadow: themeId === 'light' ? '0 12px 40px rgba(15,23,42,0.08)' : '0 18px 60px rgba(0,0,0,0.4)',
            }}>
              {sent ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg, var(--mkt-primary), var(--mkt-accent))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2rem',margin:'0 auto 24px', boxShadow: '0 10px 30px rgba(var(--mkt-primary-rgb), 0.3)' }}>✅</div>
                  <h3 style={{ color: 'var(--mkt-text-heading)', fontWeight: 900, marginBottom: 12, fontSize: '1.8rem', letterSpacing: '-0.02em' }}>Message Sent!</h3>
                  <p style={{ color: 'var(--mkt-text-muted)', marginBottom: 32, lineHeight: 1.7, fontSize: '1.05rem' }}>We've received your request. A recruitment specialist will reach out to you within 2 business hours.</p>
                  <button onClick={() => setSent(false)} style={{ padding: '14px 32px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, var(--mkt-primary), var(--mkt-accent))', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 15, boxShadow: '0 8px 20px rgba(var(--mkt-primary-rgb), 0.3)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>Send Another Message</button>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <h3 style={{ fontWeight: 900, color: 'var(--mkt-text-heading)', marginBottom: 12, fontSize: '1.6rem', letterSpacing: '-0.03em' }}>Request a Consultation</h3>
                  <p style={{ color: 'var(--mkt-text-muted)', fontSize: '0.95rem', marginBottom: 36, lineHeight: 1.6 }}>We'll respond within 2 business hours. Your hiring challenge is our priority.</p>

                  {/* Name + Email row */}
                  <div className="mkt-form-row" style={{ marginBottom: 18 }}>
                    <div>
                      <label style={labelStyle}>Full Name *</label>
                      <input type="text" placeholder="Your full name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inpStyle}
                        onFocus={e => { e.target.style.borderColor = 'var(--mkt-primary)'; e.target.style.boxShadow = `0 0 0 4px rgba(var(--mkt-primary-rgb),0.12)`; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--mkt-card-border)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Work Email *</label>
                      <input type="email" placeholder="you@company.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inpStyle}
                        onFocus={e => { e.target.style.borderColor = 'var(--mkt-primary)'; e.target.style.boxShadow = `0 0 0 4px rgba(var(--mkt-primary-rgb),0.12)`; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--mkt-card-border)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Phone + Company row */}
                  <div className="mkt-form-row" style={{ marginBottom: 18 }}>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inpStyle}
                        onFocus={e => { e.target.style.borderColor = 'var(--mkt-primary)'; e.target.style.boxShadow = `0 0 0 4px rgba(var(--mkt-primary-rgb),0.12)`; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--mkt-card-border)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Company</label>
                      <input type="text" placeholder="Company name" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} style={inpStyle}
                        onFocus={e => { e.target.style.borderColor = 'var(--mkt-primary)'; e.target.style.boxShadow = `0 0 0 4px rgba(var(--mkt-primary-rgb),0.12)`; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--mkt-card-border)'; e.target.style.boxShadow = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Service */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>Service Needed</label>
                    <select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
                      style={{ ...inpStyle, WebkitAppearance: 'menulist', appearance: 'auto', cursor: 'pointer' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--mkt-accent)'; e.target.style.boxShadow = `0 0 0 4px rgba(var(--mkt-accent-rgb),0.15)`; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--mkt-card-border)'; e.target.style.boxShadow = 'none'; }}
                    >
                      <option value="">Select service...</option>
                      <option>Permanent Staffing</option>
                      <option>IT Staffing</option>
                      <option>Cybersecurity Staffing</option>
                      <option>Non-IT Staffing</option>
                      <option>Contract to Hire (C2H)</option>
                      <option>Corp to Corp (C2C)</option>
                      <option>HRMS Platform</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Message *</label>
                    <textarea rows={4} placeholder="Tell us about your hiring challenge..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                      style={{ ...inpStyle, resize: 'vertical' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--mkt-accent)'; e.target.style.boxShadow = `0 0 0 4px rgba(var(--mkt-accent-rgb),0.15)`; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--mkt-card-border)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {submitError && <p style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: 12, fontWeight: 600, background: themeId === 'light' ? '#fef2f2' : 'rgba(220,38,38,0.1)', padding:'10px 14px', borderRadius:8, border:'1px solid rgba(220,38,38,0.2)' }}>⚠ {submitError}</p>}

                   <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: '100%',
                      height: 56,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, var(--mkt-primary), var(--mkt-accent))',
                      border: 'none',
                      color: '#fff',
                      fontWeight: 900,
                      fontSize: 16,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 8px 24px rgba(var(--mkt-primary-rgb), 0.35)',
                    }}
                    onMouseEnter={e => { if (!submitting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(var(--mkt-primary-rgb), 0.5)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(var(--mkt-primary-rgb), 0.35)'; }}
                  >
                    {submitting ? 'Sending Request…' : 'Send Message →'}
                  </button>

                  <p style={{ color: theme.textMuted, fontSize: '0.8rem', textAlign: 'center', marginTop: 12 }}>
                    We'll respond within 2 business hours.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── EXPECTATION STRIP ── */}
      <section className="mkt-section-light" style={{ padding: '80px 0' }}>
        <div className="tn-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
          {[
            { title: 'Fast reply', desc: 'Most enquiries get a response within 2 business hours.', icon: '⚡' },
            { title: 'Clear next steps', desc: 'We align on urgency, role type, and expected hiring path quickly.', icon: '🧭' },
            { title: 'No-pressure consultation', desc: 'We focus on fit first, not pushing a generic package.', icon: '🤝' },
          ].map(item => (
            <div key={item.title} className="mkt-card" style={{ background: 'var(--mkt-card-bg)', border: `1px solid var(--mkt-card-border)`, borderRadius: 20, padding: 32 }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: `linear-gradient(135deg, var(--mkt-primary), var(--mkt-accent))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}>
                {item.icon}
              </div>
              <h3 style={{ color: 'var(--mkt-text-heading)', fontSize: 19, fontWeight: 800, margin: '0 0 12px' }}>{item.title}</h3>
              <p style={{ color: 'var(--mkt-text-muted)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
