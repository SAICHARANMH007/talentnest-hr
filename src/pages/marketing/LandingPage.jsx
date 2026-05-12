import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';
import { api } from '../../api/api.js';
import { API_BASE_URL } from '../../api/config.js';
import PublicApplyModal from '../../components/modals/PublicApplyModal.jsx';

// ─── shared tiny helpers ────────────────────────────────────────────────────
const G  = 'linear-gradient(135deg,#0176D3 0%,#00C2CB 100%)';
const G2 = 'linear-gradient(135deg,#FF6B35 0%,#F59E0B 100%)';

function Tag({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `rgba(var(--mkt-accent-rgb), 0.12)`, border: `1px solid rgba(var(--mkt-accent-rgb), 0.25)`,
      borderRadius: 100, padding: '5px 14px',
      fontSize: 12, fontWeight: 700, color: 'var(--mkt-accent)', letterSpacing: '0.04em',
    }}>{children}</span>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="mkt-reveal" style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
      <Tag>
        <span className="mkt-glass-dark" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mkt-accent)', display: 'inline-block', boxShadow: '0 0 10px var(--mkt-accent)' }} />
        {children}
      </Tag>
    </div>
  );
}

function SectionHeading({ children, sub, center = true, color = 'var(--mkt-text-heading)', subColor = 'var(--mkt-text-muted)' }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: sub ? 12 : 0 }}>
      <h2 style={{
        fontSize: 'clamp(32px, 4.5vw, 52px)', fontWeight: 900,
        letterSpacing: '-0.035em', lineHeight: 1.08, color, margin: 0,
      }}>{children}</h2>
      {sub && <p style={{ fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: subColor, marginTop: 16, lineHeight: 1.75, maxWidth: 620, margin: '16px auto 0', fontWeight: 500 }}>{sub}</p>}
    </div>
  );
}

// ─── Apply Modal ─────────────────────────────────────────────────────────────
// Replaced simplified ApplyModal with shared PublicApplyModal

// ─── Data ────────────────────────────────────────────────────────────────────
const SERVICES = [
  { slug: 'it-staffing',        icon: '💻', title: 'IT Staffing',           desc: 'Full-stack, cloud, DevOps, and data engineers — sourced and delivered in 5 business days.', accent: '#0176D3' },
  { slug: 'cybersecurity',      icon: '🛡️', title: 'Cybersecurity',          desc: 'SOC analysts, pen testers, GRC specialists, and CISO-level leadership.', accent: '#BA0517' },
  { slug: 'non-it-staffing',    icon: '🏢', title: 'Non-IT Staffing',         desc: 'Finance, HR, operations, and executive roles across every business function.', accent: '#10B981' },
  { slug: 'permanent-staffing', icon: '🎯', title: 'Permanent Staffing',      desc: 'Direct hire with a 90-day replacement guarantee. Culture fit is non-negotiable.', accent: '#0369A1' },
  { slug: 'c2h',                icon: '🔄', title: 'Contract to Hire',        desc: 'Evaluate candidates on the job before making a permanent commitment.', accent: '#F59E0B' },
  { slug: 'hrms-platform',      icon: '⚙️', title: 'HRMS Platform',           desc: 'Faceify by RNIT: Advanced facial recognition, attendance, and workforce management.', accent: '#7C3AED' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: '📝', title: 'Share Your Brief', desc: 'Tell us the role, skills needed, and timeline. Our intake takes under 5 minutes.' },
  { step: '02', icon: '🎯', title: 'Advanced Matching', desc: 'Our system scans thousands of profiles and surfaces the best-fit candidates for your review.' },
  { step: '03', icon: '👥', title: 'Curated Shortlist', desc: 'Receive a selection of fully-vetted candidates with detailed profiles.' },
  { step: '04', icon: '🎯', title: 'Interview & Select', desc: 'We coordinate interviews, gather feedback, and manage offer negotiations.' },
  { step: '05', icon: '🚀', title: 'Onboard & Succeed', desc: 'Background checks, onboarding support, and 90-day check-ins included.' },
];

const STATS = [
  { key: 'clientsServed',   fallback: 3,  suffix: '+', label: 'Happy Clients' },
  { key: 'candidatesHired', fallback: 20, suffix: '+', label: 'Placements Done' },
  { key: 'satisfactionRate', fallback: 100, suffix: '%',   label: 'Client Satisfaction' },
  { key: 'avgTimeToHire',   fallback: 72,  suffix: ' hrs', label: 'Avg. Time-to-Fill' },
];

const TESTIMONIALS = [
  { name: 'Rajesh Kumar', role: 'CTO · FinTech Startup, Hyderabad', initials: 'RK', color: '#0176D3', text: 'TalentNest filled 3 senior engineering roles in under 72 hours. All 3 are still with us 18 months later. Exceptional quality.' },
  { name: 'Priya Sharma', role: 'HR Director · Healthcare IT, Bangalore', initials: 'PS', color: '#10B981', text: 'We struggled for months to find a CISO. TalentNest delivered 6 qualified candidates within record time. We hired within the week.' },
  { name: 'Amit Patel', role: 'Founder · E-commerce Platform, Mumbai', initials: 'AP', color: '#F59E0B', text: 'The HRMS platform transformed our hiring. What took weeks now takes days. The candidate matching is genuinely impressive.' },
];

const TRUST_BADGES = [
  'Startups',
  'SaaS Teams',
  'Cybersecurity Hiring',
  'Contract-to-Hire',
  'Executive Search',
  'HRMS Automation',
];

const VALUE_PILLARS = [
  {
    icon: '🚀',
    title: 'Public Job Board & Portal',
    desc: 'List your openings on India’s most specialized job board. Attract high-intent tech and executive talent with streamlined application tracking.',
    points: ['Advanced candidate matching', 'Direct application tracking', 'High-intent tech talent pool'],
    accent: '#0176D3',
  },
  {
    icon: '⚙️',
    title: 'Complete Recruitment Stack',
    desc: 'A unified workspace for jobs, pipelines, outreach, and interviews. Stop juggling tools and start hiring in record time.',
    points: ['Automated hiring workflows', 'Unified ATS dashboard', 'Live pipeline visibility'],
    accent: '#00C2CB',
  },
  {
    icon: '🎯',
    title: 'Strategic Staffing Support',
    desc: 'Our expert recruiters provide rapid shortlist delivery and a 90-day replacement support for peace of mind.',
    points: ['Rapid response cycle', '90-day replacement support', 'Expert industry sourcing'],
    accent: '#F59E0B',
  },
];

const HERO_SPOTLIGHTS = [
  { label: 'Advanced screening', value: 'Quick match', tone: '#00C2CB' },
  { label: 'Recruiter-led review', value: 'Human signal', tone: '#FF6B35' },
  { label: 'Hiring visibility', value: 'Live pipeline', tone: '#38BDF8' },
];

const HERO_VALUE_CARDS = [
  {
    title: 'Rapid Shortlist Delivery',
    desc: 'Submit a role brief and receive pre-screened, interview-ready profiles tailored to your needs.',
    accent: '#00C2CB',
  },
  {
    title: '90-Day replacement guarantee',
    desc: "If a placed candidate doesn't work out in 90 days, we replace them at no extra cost.",
    accent: '#FF6B35',
  },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LandingPage() {
  useMarketingTheme();
  const [liveStats, setLiveStats] = useState(null);
  const [applying, setApplying]   = useState(null);
  const [liveJobs,  setLiveJobs]  = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [urgentJobs, setUrgentJobs] = useState(0);
  const [jobTick,   setJobTick]   = useState(0);

  const loadLiveData = () => {
    fetch(`${API_BASE_URL}/stats/public`)
      .then(r => r.json())
      .then(setLiveStats)
      .catch(() => {});
    fetch(`${API_BASE_URL}/jobs/public?limit=50`)
      .then(r => r.json())
      .then(d => {
        let arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
        // Randomize the order of jobs for a fresh look every visit
        arr = [...arr].sort(() => Math.random() - 0.5);
        setLiveJobs(arr);
        setTotalJobs(d?.pagination?.total || arr.length);
        setUrgentJobs(arr.filter(j => (j.urgency || '').toLowerCase() === 'high').length);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadLiveData();
    // SEO & Meta
    document.title = "TalentNest HR | India's #1 Recruitment Stack & Job Board";
    const meta = document.querySelector('meta[name="description"]') || document.createElement('meta');
    meta.name = "description";
    meta.content = "Transform your hiring with TalentNest. The leading job board for IT, Cybersecurity, and Executive roles. Rapid shortlists with a 90-day replacement guarantee.";
    if (!document.querySelector('meta[name="description"]')) document.head.appendChild(meta);
  }, []);

  // Cycle highlighted job every 2.5 seconds for animation
  useEffect(() => {
    if (liveJobs.length < 2) return;
    const t = setInterval(() => setJobTick(p => (p + 1) % liveJobs.length), 2500);
    return () => clearInterval(t);
  }, [liveJobs.length]);

  const getStatNum = s => {
    const val = liveStats?.[s.key] ?? s.fallback;
    return `${Math.max(val, s.fallback)}${s.suffix || ''}`;
  };

  return (
    <div className="mkt-page" style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", background: 'var(--mkt-section-bg)', color: 'var(--mkt-text)' }}>
      <MarketingNav active="home" />
      {applying && <PublicApplyModal job={applying} onClose={() => setApplying(null)} />}

      {/* ══════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════ */}
      <section style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', overflow: 'hidden', paddingTop: 80 }}>
        {/* BG */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&auto=format&fit=crop&q=65')", backgroundSize: 'cover', backgroundPosition: 'center top' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(3,17,38,0.96) 0%,rgba(1,36,86,0.92) 100%)' }} />
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(1,118,211,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,194,203,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div className="tn-container mkt-hero-grid" style={{ position: 'relative', zIndex: 1, padding: 'clamp(80px, 12vw, 120px) 24px clamp(60px, 10vw, 100px)', gap: 'clamp(32px, 8vw, 64px)' }}>
          {/* Left */}
          <div className="mkt-reveal">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 100, padding: '8px 20px', marginBottom: 32 }}>
              <span className="mkt-glass-dark" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--mkt-accent)', boxShadow: '0 0 12px var(--mkt-accent)', display: 'inline-block' }} />
              <span style={{ color: 'var(--mkt-accent)', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>India's #1 Job Board &amp; Recruitment Platform</span>
            </div>

            <h1 style={{ fontSize: 'clamp(36px, 6.5vw, 86px)', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 0.95, color: '#fff', marginBottom: 16, textShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              The Future of <span className="mkt-gradient-text">Hiring.</span><br />
              Simpler. Faster.<br />
              <span style={{ fontSize: 'clamp(20px, 3.2vw, 44px)', color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '-0.02em' }}>Job Board &amp; Recruitment Stack.</span>
            </h1>

            <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, maxWidth: 520, marginBottom: 48, marginTop: 20, fontWeight: 500 }}>
              The leading job board for IT, Cybersecurity, and Executive roles. Manage your entire hiring lifecycle — from job posting to onboarding — in one powerful platform.
            </p>

            <div className="mkt-reveal-delayed" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
              {HERO_SPOTLIGHTS.map(item => (
                <div key={item.label} className="mkt-glass" style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '16px 20px', minWidth: 140, backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-lg)' }}>
                  <span style={{ color: item.tone, fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{item.label}</span>
                  <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div className="mkt-reveal-delayed" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 48 }}>
              <Link to="/contact" className="btn btn-primary btn-lg" style={{ borderRadius: 14 }}>Find Your Next Hire →</Link>
              <Link to="/careers" className="btn btn-outline btn-lg" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14 }}>Browse Open Roles</Link>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { icon: '⚡', text: 'Rapid Shortlist Delivery', color: '#00C2CB' },
                { icon: '✓',  text: '90-Day Replacement Support', color: '#34D399' },
                { icon: '🔒', text: '100% Confidential', color: '#A78BFA' },
              ].map(p => (
                <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '7px 16px' }}>
                  <span style={{ fontSize: 13, color: p.color }}>{p.icon}</span>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700 }}>{p.text}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14, marginTop: 28 }}>
              {HERO_VALUE_CARDS.map(card => (
                <div key={card.title} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))', border: `1px solid ${card.title.includes('urgent') ? 'rgba(255,107,53,0.28)' : 'rgba(0,194,203,0.22)'}`, borderRadius: 18, padding: 18, backdropFilter: 'blur(12px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: card.accent, boxShadow: `0 0 10px ${card.accent}` }} />
                    <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{card.title}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, lineHeight: 1.65, margin: 0 }}>{card.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Live Jobs Panel — min-height reserves space to prevent CLS when jobs load */}
          <div className="mkt-reveal-delayed" style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 480, width: '100%', margin: '0 auto', minHeight: 320 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#34D399', display: 'inline-block', boxShadow: '0 0 10px #34D399', animation: 'tn-pulse 2s ease-in-out infinite' }} />
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live Openings</span>
              </div>
              <Link to="/careers" style={{ color: 'var(--mkt-accent)', fontSize: 12, fontWeight: 700, textDecoration: 'none', background: 'rgba(0,194,203,0.1)', border: '1px solid rgba(0,194,203,0.2)', borderRadius: 100, padding: '5px 14px' }}>
                View All →
              </Link>
            </div>

            {/* Randomly Selected 6 Jobs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {liveJobs.length > 0 ? liveJobs.slice(0, 6).map((job, i) => {
                const isActive = i === jobTick;
                const urgColor = (job.urgency || '').toLowerCase() === 'high' ? '#F87171' : (job.urgency || '').toLowerCase() === 'medium' ? '#FBBF24' : '#34D399';
                return (
                  <div
                    key={job._id || job.id || i}
                    onClick={() => setApplying(job)}
                    style={{
                      background: isActive ? 'rgba(1,118,211,0.18)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isActive ? 'rgba(1,118,211,0.45)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 16,
                      padding: '14px 18px',
                      cursor: 'pointer',
                      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
                      transform: isActive ? 'translateX(6px)' : 'translateX(0)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {job.title}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          {job.location && <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600 }}>📍 {job.location}</span>}
                          {job.salaryRange && <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600 }}>💰 {job.salaryRange}</span>}
                          {job.type && <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{job.type}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        {job.urgency && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: urgColor, background: `${urgColor}18`, border: `1px solid ${urgColor}40`, borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {job.urgency}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Apply →</span>
                      </div>
                    </div>
                    {isActive && job.skills?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                        {job.skills.slice(0, 4).map(sk => (
                          <span key={sk} style={{ fontSize: 10, fontWeight: 700, color: 'var(--mkt-accent)', background: 'rgba(0,194,203,0.1)', border: '1px solid rgba(0,194,203,0.2)', borderRadius: 6, padding: '3px 8px' }}>{sk}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }) : (
                // Skeleton placeholders while loading
                [1,2,3,4,5].map(i => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 18px', height: 64 }}>
                    <div style={{ height: 12, width: '60%', background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: 8 }} />
                    <div style={{ height: 10, width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
                  </div>
                ))
              )}
            </div>

            {/* Footer nudge */}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link to="/contact" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                Don't see your role? <span style={{ color: 'var(--mkt-accent)' }}>Tell us what you need →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: 'tn-float 2s ease-in-out infinite' }}>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: '0.1em' }}>SCROLL</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom,rgba(255,255,255,0.4),transparent)' }} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TRUST STRIP
      ══════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--mkt-surface-bg)', borderTop: `1px solid var(--mkt-card-border)`, borderBottom: `1px solid var(--mkt-card-border)`, padding: '22px 0' }}>
        <div className="tn-container" style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ minWidth: 220, textAlign: 'center' }} className="mkt-trust-label">
            <div style={{ color: 'var(--mkt-text-heading)', fontSize: 14, fontWeight: 800 }}>Built for modern hiring teams</div>
            <div style={{ color: 'var(--mkt-text-muted)', fontSize: 12, marginTop: 4 }}>From urgent staffing to full recruitment operations</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', flex: 1 }}>
            {TRUST_BADGES.map(item => (
              <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--mkt-card-bg)', color: 'var(--mkt-text)', border: `1px solid var(--mkt-card-border)`, borderRadius: 999, padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--mkt-accent)', display: 'inline-block' }} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          STATS BAR
      ══════════════════════════════════════════════════════════════ */}
      <section className="mkt-reveal" style={{ background: 'var(--mkt-primary-dark)', padding: 'clamp(40px, 8vw, 60px) 0', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.2)' }}>
        <div className="tn-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'clamp(20px, 4vw, 32px)' }}>
          {STATS.map((s, i) => (
            <div key={i} className="mkt-stat-item" style={{ textAlign: 'center', padding: '12px 10px' }}>
              <div style={{ fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{getStatNum(s)}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          VALUE PILLARS
      ══════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--mkt-surface-bg)', padding: 'clamp(60px, 10vw, 120px) 0' }}>
        <div className="tn-container">
          <SectionLabel>Why TalentNest</SectionLabel>
          <SectionHeading sub="A complete recruitment ecosystem for teams that need speed, clarity, and execution.">
            More than an agency.<br /><span style={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>The Ultimate Job Board &amp; ATS Stack.</span>
          </SectionHeading>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22, marginTop: 52 }}>
            {VALUE_PILLARS.map((pillar, idx) => (
              <div key={pillar.title} className={`mkt-reveal ${idx === 1 ? 'mkt-reveal-delayed' : ''}`} style={{ 
                background: 'var(--mkt-card-bg)', 
                border: `1px solid var(--mkt-card-border)`, 
                borderRadius: 24, padding: 32, 
                boxShadow: 'var(--shadow-lg)',
                transition: 'transform 0.3s ease'
              }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: `${pillar.accent}12`, border: `1px solid ${pillar.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 24 }}>
                  {pillar.icon}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: 'var(--mkt-text-heading)', margin: '0 0 12px', letterSpacing: '-0.03em' }}>{pillar.title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--mkt-text-muted)', margin: '0 0 24px', fontWeight: 500 }}>{pillar.desc}</p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {pillar.points.map(point => (
                    <div key={point} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--mkt-text)', fontWeight: 600 }}>
                      <span className="mkt-glass" style={{ width: 22, height: 22, borderRadius: '50%', background: `${pillar.accent}15`, color: pillar.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, border: `1px solid ${pillar.accent}20` }}>✓</span>
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTS STRIP ─────────────────────────────────────────── */}
      <section style={{ background: 'var(--mkt-surface-bg)', padding: 'clamp(48px,6vw,72px) clamp(16px,5vw,80px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <p className="mkt-reveal" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mkt-accent)', marginBottom: 12 }}>
            Three products. One platform.
          </p>
          <h2 className="mkt-reveal" style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, color: 'var(--mkt-text-heading)', margin: '0 0 40px', letterSpacing: '-0.03em' }}>
            Built for every person in the hiring journey
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20, marginBottom: 40 }}>
            {[
              { emoji: '🎯', name: 'HireBoard',  role: 'For Recruiters', desc: 'Pipeline board, advanced match scores, video interviews, offer letters — one screen.', color: '#0176D3', gradient: 'linear-gradient(135deg,#0176D3,#00C2CB)', to: '/products/hireboard' },
              { emoji: '🏢', name: 'PeopleDesk', role: 'For HR Admins',  desc: 'Analytics, pre-boarding, background verification, org career page — total control.', color: '#059669', gradient: 'linear-gradient(135deg,#059669,#0891B2)', to: '/products/peopledesk' },
              { emoji: '🚀', name: 'JobTrack',   role: 'For Job Seekers', desc: 'Browse jobs, track every application live, join interviews, sign offer from phone.', color: '#7c3aed', gradient: 'linear-gradient(135deg,#7c3aed,#0176D3)', to: '/products/jobtrack' },
            ].map(p => (
              <Link key={p.name} to={p.to} className="mkt-reveal" style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '20px 22px',
                background: 'var(--mkt-card-bg)', border: '1px solid var(--mkt-card-border)',
                borderRadius: 16, textDecoration: 'none', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = p.color + '50'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'var(--mkt-card-border)'; }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, boxShadow: `0 6px 18px ${p.color}30` }}>
                  {p.emoji}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--mkt-text-heading)', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: p.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{p.role}</div>
                  <div style={{ fontSize: 13, color: 'var(--mkt-text-muted)', lineHeight: 1.5 }}>{p.desc}</div>
                </div>
              </Link>
            ))}
          </div>
          <Link to="/products" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff',
            padding: '12px 28px', borderRadius: 12, fontWeight: 800, fontSize: 14,
            textDecoration: 'none', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            Explore All Products →
          </Link>
        </div>
      </section>

      {/* ── ADVANCED FEATURES SECTION ── */}
      <section style={{ background: 'var(--mkt-section-bg)', padding: 'clamp(60px, 10vw, 120px) 0', borderTop: '1px solid var(--mkt-card-border)' }}>
        <div className="tn-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div className="mkt-reveal">
              <SectionLabel>Process Automation</SectionLabel>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'var(--mkt-text-heading)', margin: '0 0 24px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                Hiring that feels <span className="mkt-gradient-text">Seamless.</span>
              </h2>
              <p style={{ fontSize: 16, color: 'var(--mkt-text-muted)', lineHeight: 1.8, marginBottom: 32, fontWeight: 500 }}>
                Stop manually reviewing hundreds of resumes. Our matching engine ranks candidates based on skill resonance, experience depth, and culture markers.
              </p>
              <div style={{ display: 'grid', gap: 20 }}>
                {[
                  { t: 'Automated Screening', d: 'Filter out unqualified applicants instantly with custom qualification criteria.' },
                  { t: 'One-Click Interviews', d: 'Synced with your calendar. Send invites and gather feedback in a single flow.' },
                  { t: 'Live Pipeline Health', d: 'Visual heatmaps of your hiring funnel to identify bottlenecks before they happen.' }
                ].map(item => (
                  <div key={item.t} style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--mkt-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, flexShrink: 0 }}>✓</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--mkt-text-heading)', marginBottom: 4 }}>{item.t}</div>
                      <div style={{ fontSize: 13, color: 'var(--mkt-text-muted)', lineHeight: 1.5 }}>{item.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mkt-reveal-delayed" style={{ position: 'relative' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(1,118,211,0.1), rgba(0,194,203,0.1))', borderRadius: 32, padding: 40, border: '1px solid var(--mkt-card-border)', backdropFilter: 'blur(10px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>Hiring Efficiency</div>
                  <Tag>+42% Faster</Tag>
                </div>
                <div style={{ display: 'grid', gap: 24 }}>
                  {[
                    { l: 'Sourcing Speed', v: 88, c: '#0176D3' },
                    { l: 'Candidate Quality', v: 94, c: '#00C2CB' },
                    { l: 'Cost Reduction', v: 76, c: '#10B981' }
                  ].map(stat => (
                    <div key={stat.l}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                        <span>{stat.l}</span>
                        <span>{stat.v}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${stat.v}%`, background: stat.c, borderRadius: 3, boxShadow: `0 0 12px ${stat.c}50` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Decorative elements */}
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'var(--mkt-accent)', opacity: 0.1, filter: 'blur(30px)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SERVICES
      ══════════════════════════════════════════════════════════════ */}
      <section className="mkt-reveal" style={{ background: 'var(--mkt-section-bg)', padding: 'clamp(60px, 10vw, 120px) 0' }}>
        <div className="tn-container">
          <SectionLabel>Expertise</SectionLabel>
          <SectionHeading sub="World-class teams require world-class talent. We curate shortlists that don't just fill roles—they drive revenue.">
            Tailored solutions for<br /><span className="mkt-gradient-text">every function</span>
          </SectionHeading>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 28, marginTop: 72 }}>
            {SERVICES.map((s, idx) => (
              <Link key={s.slug} to={`/services/${s.slug}`} style={{ textDecoration: 'none' }} className={`mkt-reveal ${idx % 2 === 0 ? '' : 'mkt-reveal-delayed'}`}>
                <div style={{ background: 'var(--mkt-card-bg)', border: `1px solid var(--mkt-card-border)`, borderRadius: 24, padding: 36, height: '100%', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 20, boxShadow: 'var(--shadow-md)' }}
                  className="mkt-card"
                  onMouseEnter={e => { e.currentTarget.style.borderColor = s.accent; e.currentTarget.style.boxShadow = `0 20px 40px ${s.accent}15`; e.currentTarget.style.transform = 'translateY(-8px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--mkt-card-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: `${s.accent}12`, border: `1px solid ${s.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{s.icon}</div>
                  <div>
                    <h3 style={{ fontSize: 20, fontWeight: 900, color: 'var(--mkt-text-heading)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>{s.title}</h3>
                    <p style={{ fontSize: 15, color: 'var(--mkt-text-muted)', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{s.desc}</p>
                  </div>
                  <span style={{ marginTop: 'auto', fontSize: 14, fontWeight: 800, color: s.accent, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.02em' }}>Explore Capability →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--mkt-surface-bg)', padding: 'clamp(60px, 10vw, 120px) 0' }}>
        <div className="tn-container">
          <SectionLabel>The Process</SectionLabel>
          <SectionHeading sub="From brief to hire in 5 clear steps. No surprises, no wasted time.">
            How TalentNest works
          </SectionHeading>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 0, marginTop: 80, position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', top: 36, left: '12%', right: '12%', height: 1, background: `linear-gradient(90deg, transparent, var(--mkt-accent), var(--mkt-primary), var(--mkt-accent), transparent)`, opacity: 0.4, zIndex: 0 }} className="tn-desktop" />
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: 74, height: 74, borderRadius: 24, background: i % 2 === 0 ? G : G2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, boxShadow: '0 12px 30px rgba(1,118,211,0.25)', marginBottom: 24, border: `4px solid var(--mkt-surface-bg)`, transform: 'rotate(5deg)' }}>
                  <div style={{ transform: 'rotate(-5deg)' }}>{step.icon}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--mkt-primary)', letterSpacing: '0.15em', marginBottom: 10, textTransform: 'uppercase' }}>Step {step.step}</div>
                <h4 style={{ fontSize: 16, fontWeight: 900, color: 'var(--mkt-text-heading)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>{step.title}</h4>
                <p style={{ fontSize: 14, color: 'var(--mkt-text-muted)', lineHeight: 1.8, margin: 0, fontWeight: 500 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════════════════════════════ */}
      <section className="mkt-reveal" style={{ background: 'var(--mkt-surface-bg)', padding: 'clamp(60px, 10vw, 120px) 0' }}>
        <div className="tn-container">
          <SectionLabel>Client Success</SectionLabel>
          <SectionHeading sub="Industry leaders trust TalentNest to power their high-growth teams.">
            Trusted by the <span className="mkt-gradient-text">Best in Business</span>
          </SectionHeading>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 32, marginTop: 72 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className={`mkt-card mkt-reveal ${i === 1 ? 'mkt-reveal-delayed' : ''}`} style={{ background: 'var(--mkt-card-bg)', border: `1px solid var(--mkt-card-border)`, borderRadius: 24, padding: 40, boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
                  {Array(5).fill(0).map((_, s) => <span key={s} style={{ color: '#F59E0B', fontSize: 18 }}>★</span>)}
                </div>
                <p style={{ fontSize: '1.1rem', color: 'var(--mkt-text)', lineHeight: 1.8, fontStyle: 'italic', margin: '0 0 32px', fontWeight: 500 }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="mkt-glass" style={{ width: 52, height: 52, borderRadius: '50%', background: `${t.color}15`, border: `2px solid ${t.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: t.color, flexShrink: 0 }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--mkt-text-heading)', letterSpacing: '-0.01em' }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--mkt-text-muted)', fontWeight: 600 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════════ */}
      <section className="mkt-reveal" style={{ 
        background: 'linear-gradient(135deg, var(--mkt-primary) 0%, var(--mkt-primary-dark) 50%, #000 100%)', 
        padding: '120px 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
        
        <div className="tn-container" style={{ textAlign: 'center', position: 'relative', zIndex: 1, padding: '0 24px' }}>
          <h2 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', marginBottom: 24, lineHeight: 1 }}>
            Ready to lead the <span style={{ color: 'var(--mkt-accent)' }}>Future of Work?</span>
          </h2>
          <p style={{ fontSize: 'clamp(1rem, 1.5vw, 1.25rem)', color: 'rgba(255,255,255,0.7)', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.8, fontWeight: 500 }}>
            Stop settling for volume. Start hiring for resonance. Your first shortlist of pre-vetted elite talent is just a few clicks away.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg mkt-cta-btn" style={{ borderRadius: 14, padding: 'clamp(14px, 3vw, 20px) clamp(24px, 5vw, 48px)', fontSize: 'clamp(16px, 2vw, 18px)' }}>
              Get Started Now →
            </Link>
            <Link to="/careers" className="btn btn-outline btn-lg mkt-cta-btn" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14, padding: 'clamp(14px, 3vw, 20px) clamp(24px, 5vw, 48px)', fontSize: 'clamp(16px, 2vw, 18px)', backdropFilter: 'blur(10px)' }}>
              Browse Talent Pool
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {applying && <PublicApplyModal job={applying} onClose={() => setApplying(null)} />}

      <style>{`
        @keyframes tn-float { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(8px)} }
        
        .mkt-stat-item { border-right: 1px solid rgba(255,255,255,0.1); }
        .mkt-stat-item:last-child { border-right: none; }

        @media(max-width:768px){
          .tn-desktop{display:none!important}
          .mkt-hero-grid{grid-template-columns:1fr!important; text-align: center; }
          .mkt-hero-grid h1, .mkt-hero-grid p { margin-left: auto; margin-right: auto; }
          .mkt-hero-grid .mkt-reveal-delayed { justify-content: center; }
          .mkt-trust-label { text-align: center!important; }
          .mkt-stat-item { border-right: none!important; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 20px 0!important; }
          .mkt-stat-item:last-child { border-bottom: none!important; }
          .mkt-cta-btn { width: 100%; max-width: 320px; }
        }
      `}</style>
    </div>
  );
}
