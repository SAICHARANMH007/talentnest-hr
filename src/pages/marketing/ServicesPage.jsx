import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const SERVICES = [
  {
    slug: 'it-staffing',
    icon: '💻',
    title: 'IT Staffing',
    badge: 'Most Popular',
    badgeColor: '#014486',
    accent: '#014486',
    color: 'rgba(37,99,235,0.08)',
    coverImg: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80',
    desc: 'Software engineers, cloud architects, DevOps specialists, data scientists — vetted and delivered in 5 business days.',
    bullets: ['Full-Stack & Backend Developers', 'Cloud & DevOps Engineers', 'Data & ML Engineers', 'Mobile & QA Engineers'],
  },
  {
    slug: 'cybersecurity',
    icon: '🔐',
    title: 'Cybersecurity Staffing',
    badge: 'High Demand',
    badgeColor: '#BA0517',
    accent: '#BA0517',
    color: 'rgba(186,5,23,0.08)',
    coverImg: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
    desc: 'SOC analysts, penetration testers, GRC specialists, and CISO-level leadership — screened by security professionals.',
    bullets: ['SOC Analysts (Tiers 1, 2 and 3)', 'Penetration Testers & Red Team', 'GRC & Compliance Specialists', 'CISO & vCISO Placement'],
  },
  {
    slug: 'non-it-staffing',
    icon: '🏢',
    title: 'Non-IT Staffing',
    badge: 'All Functions',
    badgeColor: '#10b981',
    accent: '#10b981',
    coverImg: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&auto=format&fit=crop&q=80',
    color: 'rgba(16,185,129,0.08)',
    desc: 'Finance, HR, operations, sales, and executive roles — the same rigour and speed as our technical placements.',
    bullets: ['Finance & Accounting Leaders', 'HR & People Operations', 'Sales & Business Development', 'C-Suite & Executive Search'],
  },
  {
    slug: 'c2h',
    icon: '🔄',
    title: 'Contract to Hire',
    badge: 'Zero Risk',
    badgeColor: '#F59E0B',
    accent: '#F59E0B',
    color: 'rgba(245,158,11,0.08)',
    coverImg: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    desc: 'Evaluate candidates on the job for 3–6 months before making a permanent offer. Full contractor administration included.',
    bullets: ['3–6 Month Trial Periods', 'Flexible Conversion Timeline', 'Full Payroll Administration', '78% Conversion Rate'],
  },
  {
    slug: 'c2c',
    icon: '🤝',
    title: 'Corp to Corp (C2C)',
    badge: 'Fully Compliant',
    badgeColor: '#014486',
    accent: '#014486',
    color: 'rgba(1,68,134,0.08)',
    coverImg: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&auto=format&fit=crop&q=80',
    desc: 'Business-to-business contracting with full compliance management, SOW drafting, and consolidated vendor billing.',
    bullets: ['Vendor Entity Verification', 'SOW & Contract Drafting', 'Consolidated Billing', 'Zero Misclassification Risk'],
  },
  {
    slug: 'permanent-staffing',
    icon: '🎯',
    title: 'Permanent Staffing',
    badge: 'Direct Hire',
    badgeColor: '#0369a1',
    accent: '#0369a1',
    color: 'rgba(3,105,161,0.08)',
    coverImg: 'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&auto=format&fit=crop&q=80',
    desc: 'Direct permanent placement for roles that demand long-term commitment — culture-aligned candidates who stay and thrive, backed by a 90-day guarantee.',
    bullets: ['Direct Full-Time Placement', '90-Day Replacement Guarantee', 'Culture-Fit Assessment', 'Background & Reference Verified'],
  },
  {
    slug: 'hrms-platform',
    icon: '⚙️',
    title: 'HRMS Platform',
    badge: 'Smart Platform',
    badgeColor: '#0176D3',
    accent: '#0176D3',
    color: 'rgba(1,118,211,0.06)',
    coverImg: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&auto=format&fit=crop&q=80',
    desc: 'Faceify by RNIT: a smart facial recognition HRMS for contactless attendance, access control, and real-time HR analytics. TalentNest HR is an authorised reseller.',
    bullets: ['Smart Facial Recognition Attendance', 'Access Control Integration', 'Real-Time HR Dashboard', 'On-Site Setup & Support'],
  },
];

const SERVICE_PROMISES = [
  { icon: '⚡', title: 'Fast response cycles', desc: 'Shortlists and recruiter feedback move quickly so hiring does not stall.' },
  { icon: '🧪', title: 'Practical screening', desc: 'We look beyond CV keywords with role-fit, communication, and delivery context.' },
  { icon: '📊', title: 'Clear hiring visibility', desc: 'You know what is happening, what is blocked, and what comes next.' },
];

export default function ServicesPage() {
  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="mkt-page" style={{ 
      fontFamily: "var(--font-primary)", 
      background: "var(--mkt-section-bg)", 
      color: "var(--mkt-text)",
      minHeight: '100vh' 
    }}>
      <MarketingNav active="services" />

      {/* ── HERO ── */}
      <section style={{
        background: "var(--mkt-darker)",
        paddingTop: 160,
        paddingBottom: 120,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
        }} />
        {/* Orbs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, rgba(3,45,96,0.15) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div className="container mkt-reveal" style={{ position: 'relative' }}>
          <span className="section-tag">Our Services</span>
          <h1 style={{ color: "var(--mkt-text-on-dark, #fff)", fontSize: 'clamp(2.2rem,6vw,3.8rem)', fontWeight: 900, margin: '16px 0 24px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Comprehensive Talent Solutions<br />
            <span className="mkt-gradient-text">For Every Business Need</span>
          </h1>
          <p style={{ color: "var(--mkt-text-on-dark-muted, rgba(255,255,255,0.7))", fontSize: '1.15rem', maxWidth: 620, margin: '0 auto 40px', lineHeight: 1.7 }}>
            From elite technical squads to strategic executive placements — we partner with you to build high-performance teams with precision and speed.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg">Hire Talent Now →</Link>
            <Link to="/careers" className="btn btn-secondary btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>Browse Open Jobs</Link>
          </div>
        </div>
      </section>

      {/* ── SERVICE PROMISES ── */}
      <section style={{ background: "var(--mkt-section-bg)", padding: '0 0 60px', marginTop: '-40px', position: 'relative', zIndex: 5 }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 }}>
            {SERVICE_PROMISES.map((item, idx) => (
              <div key={item.title} className="mkt-reveal-delayed" style={{ 
                background: "var(--mkt-card-bg)", 
                border: "1px solid var(--mkt-card-border)", 
                borderRadius: 24, 
                padding: 32,
                boxShadow: "var(--shadow-lg)",
                animationDelay: `${0.1 + idx * 0.1}s`
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,var(--mkt-primary),var(--mkt-accent))", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20, color: '#fff' }}>
                  {item.icon}
                </div>
                <h3 style={{ color: "var(--mkt-text-heading)", fontSize: 19, fontWeight: 800, margin: '0 0 10px' }}>{item.title}</h3>
                <p style={{ color: "var(--mkt-text-muted)", fontSize: 15, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES GRID ── */}
      <section style={{ background: "var(--mkt-section-bg)", padding: '80px 0 120px' }}>
        <div className="container">
          <div className="section-header mkt-reveal">
            <span className="section-tag">Solutions Portfolio</span>
            <h2 className="section-title">Specialized <span>Hiring Models</span></h2>
            <p className="section-subtitle">Tailored recruitment strategies designed to match your specific business velocity and budget.</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(360px,1fr))', gap: 32 }}>
            {(Array.isArray(SERVICES) ? SERVICES : []).map((s, i) => (
              <div
                key={s.slug}
                className="mkt-card-hover mkt-reveal-delayed"
                style={{
                  background: "var(--mkt-card-bg)",
                  border: "1px solid var(--mkt-card-border)",
                  borderRadius: 24,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  animationDelay: `${0.1 + (i % 3) * 0.1}s`
                }}
              >
                {/* 240px image strip */}
                <div style={{ height: 240, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  <img
                    src={s.coverImg}
                    alt={s.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,13,26,0.1) 0%, rgba(5,13,26,0.85) 100%)' }} />
                  {/* Icon circle */}
                  <div style={{ position: 'absolute', bottom: 20, left: 24, width: 60, height: 60, borderRadius: 16, background: "rgba(255,255,255,0.1)", backdropFilter: 'blur(12px)', border: "1px solid rgba(255,255,255,0.2)", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                    {s.icon}
                  </div>
                  {/* Badge */}
                  {s.badge && (
                    <div style={{ position: 'absolute', top: 20, right: 24, background: s.badgeColor || "var(--mkt-primary)", color: 'white', fontSize: 11, fontWeight: 800, padding: '5px 14px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      {s.badge}
                    </div>
                  )}
                </div>

                {/* Card content */}
                <div style={{ padding: '32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h2 style={{ color: "var(--mkt-text-heading)", fontWeight: 800, fontSize: '1.3rem', margin: '0 0 12px' }}>{s.title}</h2>
                  <p style={{ color: "var(--mkt-text-muted)", fontSize: '0.95rem', lineHeight: 1.8, marginBottom: 24, flex: 1 }}>{s.desc}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
                    {(Array.isArray(s.bullets) ? s.bullets : []).map(b => (
                      <span key={b} style={{ background: "var(--mkt-surface-bg)", color: "var(--mkt-text)", border: "1px solid var(--mkt-card-border)", borderRadius: 8, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 600 }}>✓ {b}</span>
                    ))}
                  </div>
                  <Link
                    to={`/services/${s.slug}`}
                    className="btn btn-outline btn-full"
                    style={{ justifyContent: 'center', borderRadius: 14 }}
                  >
                    Explore Service Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DELIVERY MODEL ── */}
      <section style={{ background: "var(--mkt-surface-bg)", padding: '100px 0', borderTop: "1px solid var(--mkt-card-border)" }}>
        <div className="container">
          <div className="grid-2 mkt-reveal" style={{ gap: 40, alignItems: 'center' }}>
            <div style={{ background: "var(--mkt-card-bg)", border: "1px solid var(--mkt-card-border)", borderRadius: 32, padding: '48px', boxShadow: "var(--shadow-xl)" }}>
              <span className="section-tag" style={{ marginBottom: 24 }}>Strategic Partner</span>
              <h2 style={{ color: "var(--mkt-text-heading)", fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', margin: '0 0 20px' }}>
                Flexible hiring support for <span className="mkt-gradient-text">Urgent Roles</span> and growth
              </h2>
              <p style={{ color: "var(--mkt-text-muted)", fontSize: 16, lineHeight: 1.8, margin: '0 0 32px' }}>
                Whether you need a single critical hire or an outsourced staffing partner to scale an entire department — our delivery model adapts to your velocity.
              </p>
              <div style={{ display: 'grid', gap: 16 }}>
                {[
                  'Customized SLAs for time-to-hire and quality metrics',
                  'Rigorous multi-stage vetting (Technical + Culture)',
                  'End-to-end administration and compliance management',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: "rgba(16,185,129,0.1)", color: "var(--mkt-success)", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✓</div>
                    <span style={{ color: "var(--mkt-text)", fontSize: 15, fontWeight: 500 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mkt-glass-dark" style={{ borderRadius: 32, padding: '48px', color: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.15em', color: "var(--mkt-accent)", marginBottom: 24, textTransform: 'uppercase' }}>Delivery Lifecycle</div>
              <div style={{ display: 'grid', gap: 20 }}>
                {[
                  { title: '01. Discovery', desc: 'Deep-dive into team culture, stack requirements, and success milestones.' },
                  { title: '02. Execution', desc: 'Smart sourcing combined with human-led technical evaluation.' },
                  { title: '03. Placement', desc: 'Shortlist review, interview coordination, and offer normalization.' },
                ].map(item => (
                  <div key={item.title} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 24, transition: 'all 0.3s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                    <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{item.title}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.6)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: "var(--mkt-darker)", padding: '100px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(3,118,211,0.1) 0%, transparent 70%)', top: -300, right: -100, pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative' }}>
          <h2 style={{ color: "#fff", fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 900, marginBottom: 20 }}>
            Ready to scale your team?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: '1.2rem', marginBottom: 48, maxWidth: 540, margin: '0 auto 48px' }}>
            Schedule a strategy call with our delivery leads today and receive a curated talent plan in 24 hours.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg" style={{ borderRadius: 14 }}>
              Request a Consultation →
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
