import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

// ── tiny helpers ──────────────────────────────────────────────────────────────
const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";

function Tag({ children, accent = 'var(--mkt-accent)' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `rgba(var(--mkt-accent-rgb),0.12)`,
      border: `1px solid rgba(var(--mkt-accent-rgb),0.28)`,
      borderRadius: 100, padding: '5px 16px',
      fontSize: 12, fontWeight: 700, color: accent, letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>{children}</span>
  );
}

function Pill({ children, color = '#0176D3', bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 50,
      fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
      background: bg || `${color}18`, color,
      border: `1px solid ${color}30`,
    }}>{children}</span>
  );
}

// Counter animation
function CountUp({ target, suffix = '', prefix = '', duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// Floating orb background
function FloatingOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {[
        { w: 400, h: 400, top: '-10%', left: '-8%', c: 'rgba(1,118,211,0.18)', d: '18s' },
        { w: 300, h: 300, top: '40%', right: '-5%', c: 'rgba(0,194,203,0.14)', d: '22s' },
        { w: 250, h: 250, bottom: '5%', left: '30%', c: 'rgba(124,58,237,0.12)', d: '16s' },
      ].map((o, i) => (
        <div key={i} style={{
          position: 'absolute', width: o.w, height: o.h,
          borderRadius: '50%', background: `radial-gradient(circle, ${o.c}, transparent 70%)`,
          top: o.top, left: o.left, right: o.right, bottom: o.bottom,
          animation: `tnFloatOrb ${o.d} ease-in-out infinite alternate`,
          animationDelay: `${i * 2}s`,
        }} />
      ))}
    </div>
  );
}

// Dashboard UI mockup (pure CSS/SVG — no screenshots needed)
function DashboardMockup({ product }) {
  const configs = {
    scout: {
      accent: '#0176D3',
      title: 'Pipeline · 24 Active Roles',
      rows: [
        { name: 'Priya Sharma', role: 'Senior React Dev', stage: 'Interview R2', score: 94, stageColor: '#7c3aed' },
        { name: 'Rahul Verma', role: 'DevOps Engineer', stage: 'Offer Extended', score: 88, stageColor: '#059669' },
        { name: 'Anjali Nair', role: 'Product Manager', stage: 'Shortlisted', score: 91, stageColor: '#0176D3' },
        { name: 'Karan Singh', role: 'Data Scientist', stage: 'Screening', stage_color: '#F59E0B', score: 76, stageColor: '#F59E0B' },
      ],
    },
    command: {
      accent: '#059669',
      title: 'Org Overview · 3 Active Orgs',
      rows: [
        { name: 'NuSummit', role: '16 open roles', stage: '↑ 23% this week', score: 94, stageColor: '#059669' },
        { name: 'TechCorp India', role: '8 open roles', stage: 'Interview stage', score: 81, stageColor: '#0176D3' },
        { name: 'Acme Finance', role: '4 open roles', stage: '2 offers sent', score: 88, stageColor: '#7c3aed' },
        { name: 'StartupXYZ', role: '12 open roles', stage: 'Active sourcing', score: 72, stageColor: '#F59E0B' },
      ],
    },
    launchpad: {
      accent: '#7c3aed',
      title: 'My Applications · 5 Active',
      rows: [
        { name: 'Kafka Consultant', role: 'NuSummit · Mumbai', stage: '📅 Interview Set', score: 92, stageColor: '#7c3aed' },
        { name: 'GoLang Developer', role: 'TechCorp · Remote', stage: '✅ Shortlisted', score: 88, stageColor: '#059669' },
        { name: 'DevOps Engineer', role: 'Acme · Bangalore', stage: '📋 Under Review', score: 79, stageColor: '#F59E0B' },
        { name: 'AI Product Lead', role: 'StartupXYZ · Pune', stage: '⏳ Applied', score: 65, stageColor: '#94A3B8' },
      ],
    },
  };
  const c = configs[product];
  return (
    <div style={{
      background: 'var(--mkt-card-bg)', borderRadius: 16, border: '1px solid var(--mkt-card-border)',
      overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', fontFamily: ff,
    }}>
      {/* Toolbar */}
      <div style={{ background: `${c.accent}12`, padding: '10px 16px', borderBottom: '1px solid var(--mkt-card-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        {['#EF4444','#F59E0B','#10B981'].map(col => (
          <span key={col} style={{ width: 10, height: 10, borderRadius: '50%', background: col, display: 'inline-block' }} />
        ))}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mkt-text-muted)', marginLeft: 8 }}>{c.title}</span>
        <span style={{ marginLeft: 'auto', background: c.accent, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 20 }}>● Live</span>
      </div>
      {/* Rows */}
      <div style={{ padding: '8px 0' }}>
        {c.rows.map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
            borderBottom: i < c.rows.length - 1 ? '1px solid var(--mkt-card-border)' : 'none',
            animation: `tnFadeSlideIn 0.4s ${i * 0.08}s both`,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${c.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 900, color: c.accent }}>
              {r.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mkt-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontSize: 10, color: 'var(--mkt-text-muted)', marginTop: 1 }}>{r.role}</div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: r.stageColor, background: `${r.stageColor}14`, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{r.stage}</span>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: c.accent }}>{r.score}%</div>
              <div style={{ width: 36, height: 3, background: 'var(--mkt-card-border)', borderRadius: 2, marginTop: 2 }}>
                <div style={{ width: `${r.score}%`, height: '100%', background: c.accent, borderRadius: 2 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Feature check list
function FeatureList({ items, accent = '#0176D3' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} className="mkt-reveal" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, animationDelay: `${i * 0.06}s` }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, background: `${accent}18`, border: `1.5px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 11, color: accent, fontWeight: 800 }}>✓</span>
          <span style={{ fontSize: 14, color: 'var(--mkt-text-secondary)', lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

// Stat card
function StatCard({ value, label, icon, accent = '#0176D3', suffix = '', prefix = '' }) {
  return (
    <div className="mkt-reveal" style={{
      background: 'var(--mkt-card-bg)', border: '1px solid var(--mkt-card-border)', borderRadius: 16,
      padding: '24px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${accent}10` }} />
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 900, color: accent, lineHeight: 1 }}>
        <CountUp target={value} suffix={suffix} prefix={prefix} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--mkt-text-muted)', marginTop: 6, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// Competitor comparison row
function CompareRow({ feature, us, them }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1,
      borderBottom: '1px solid var(--mkt-card-border)',
    }}>
      <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--mkt-text-secondary)', fontWeight: 500 }}>{feature}</div>
      <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#059669' }}>✓</span> {us}
      </div>
      <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--mkt-text-muted)' }}>
        {them === '✗' ? <span style={{ color: '#EF4444' }}>✗ Not available</span> : them}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { theme } = useMarketingTheme();
  const [activeProduct, setActiveProduct] = useState('scout');

  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link');
      link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
    document.title = 'Products — TalentNest HR Platform';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const products = [
    {
      id: 'scout',
      emoji: '🎯',
      name: 'Scout',
      tagline: 'For Recruiters & Talent Teams',
      headline: 'Your hiring pipeline,\nalways moving.',
      sub: 'Scout is where recruiters live. Source, screen, shortlist, schedule, and hire — from a single screen. Built for speed, designed for humans.',
      accent: '#0176D3',
      accentRgb: '1,118,211',
      gradient: 'linear-gradient(135deg,#0176D3,#00C2CB)',
      features: [
        'AI-powered candidate matching (not just keyword search)',
        'Pipeline board: Applied → Hired in one drag',
        'One-click interview scheduling with calendar invite',
        'Built-in video interview room — zero Zoom needed',
        'WhatsApp + email alerts on every stage move',
        'Talent pool to park and re-engage warm candidates',
        'Bulk actions: shortlist 20 candidates in one click',
        'Leaderboard to track team performance in real time',
      ],
    },
    {
      id: 'command',
      emoji: '🏢',
      name: 'Command',
      tagline: 'For HR Leaders & Org Admins',
      headline: 'Full HR control,\nzero spreadsheets.',
      sub: 'Command gives HR managers and org admins total visibility — across every team, every hire, every offer. Run your people operations from one place.',
      accent: '#059669',
      accentRgb: '5,150,105',
      gradient: 'linear-gradient(135deg,#059669,#0891B2)',
      features: [
        'Real-time analytics: fill rate, time-to-hire, source ROI',
        'Multi-recruiter management with role-based access',
        'Automated pre-boarding checklists for every new hire',
        'Digital offer letter generation + e-signature',
        'Background verification document collection',
        'Org-branded career page — embed on your own website',
        'Candidate request system to source from TalentNest',
        'Complete audit trail for every action on the platform',
      ],
    },
    {
      id: 'launchpad',
      emoji: '🚀',
      name: 'Launchpad',
      tagline: 'For Job Seekers & Candidates',
      headline: 'Apply smarter.\nGet hired faster.',
      sub: 'Launchpad puts the job seeker first. Browse thousands of roles, track every application, get real-time updates, and sign your offer — all in one place. No more chasing HR.',
      accent: '#7c3aed',
      accentRgb: '124,58,237',
      gradient: 'linear-gradient(135deg,#7c3aed,#0176D3)',
      features: [
        'Browse jobs from 100+ companies on one platform',
        'AI match score shows you your fit before you apply',
        'Live application status — know exactly where you stand',
        'Interview scheduled? See date, time, room link instantly',
        'Digital offer letter — read, sign, and submit in 2 minutes',
        'Pre-boarding checklist so Day 1 is stress-free',
        'Job alerts for your skills and preferred locations',
        'Location-based job discovery — roles near you first',
      ],
    },
  ];

  const active = products.find(p => p.id === activeProduct);

  return (
    <div className="mkt-page" style={{ fontFamily: ff, background: 'var(--mkt-section-bg)', color: 'var(--mkt-text)', overflowX: 'hidden' }}>
      <MarketingNav active="products" />

      <style>{`
        @keyframes tnFloatOrb {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(30px,20px) scale(1.08); }
        }
        @keyframes tnFadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tnPulseRing {
          0%  { transform: scale(1);   opacity: 0.6; }
          70% { transform: scale(1.5); opacity: 0; }
          100%{ transform: scale(1.5); opacity: 0; }
        }
        @keyframes tnBounceIn {
          0%   { opacity: 0; transform: scale(0.85) translateY(24px); }
          60%  { opacity: 1; transform: scale(1.03) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tnTickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .tn-prod-tab {
          cursor: pointer; border-radius: 12px; padding: 12px 20px;
          border: 1.5px solid transparent; transition: all 0.25s;
          display: flex; align-items: center; gap: 10px;
        }
        .tn-prod-tab:hover { background: rgba(var(--mkt-accent-rgb),0.06); }
        .tn-feature-card {
          background: var(--mkt-card-bg); border: 1px solid var(--mkt-card-border);
          border-radius: 16px; padding: 24px; transition: all 0.25s;
        }
        .tn-feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          border-color: rgba(var(--mkt-accent-rgb),0.35);
        }
        .tn-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 12px; font-weight: 800;
          font-size: 14px; text-decoration: none; transition: all 0.2s;
          cursor: pointer; border: none; font-family: inherit;
        }
        .tn-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .tn-ticker-wrap { overflow: hidden; white-space: nowrap; padding: 14px 0; }
        .tn-ticker { display: inline-flex; gap: 40px; animation: tnTickerScroll 28s linear infinite; }
        @media (max-width: 768px) {
          .tn-prod-grid { grid-template-columns: 1fr !important; }
          .tn-compare-grid { grid-template-columns: 1fr !important; }
          .tn-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .tn-hero-text { font-size: clamp(32px,8vw,52px) !important; }
        }
        @media (max-width: 480px) {
          .tn-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── HERO ───────────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '88vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg,rgba(2,8,23,0.97) 0%,rgba(1,36,86,0.93) 60%,rgba(0,30,60,0.96) 100%)',
        position: 'relative', padding: 'clamp(100px,14vw,140px) clamp(16px,5vw,80px) 80px',
        textAlign: 'center', overflow: 'hidden',
      }}>
        <FloatingOrbs />
        {/* Dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 820, margin: '0 auto' }}>
          <div className="mkt-reveal" style={{ marginBottom: 20 }}>
            <Tag>The Complete Talent Platform</Tag>
          </div>
          <h1 className="tn-hero-text" style={{
            fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, color: '#fff',
            letterSpacing: '-0.04em', lineHeight: 1.06, margin: '0 0 24px',
          }}>
            One platform.<br />
            <span style={{ background: 'linear-gradient(90deg,#0176D3,#00C2CB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Every hiring need.
            </span>
          </h1>
          <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(255,255,255,0.72)', maxWidth: 620, margin: '0 auto 40px', lineHeight: 1.7, fontWeight: 400 }}>
            A job board candidates love, an ATS recruiters trust, and an HR command centre admins actually want to use — all in one product, built for India and beyond.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="tn-cta-btn" style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff' }}>
              Start Free Trial →
            </Link>
            <Link to="/careers" className="tn-cta-btn" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
              Browse Jobs
            </Link>
          </div>

          {/* Trust bar */}
          <div style={{ marginTop: 56, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[['3 Products', 'in one platform'],['Zero', 'extra tools needed'],['Real-time', 'across all users']].map(([bold, sub]) => (
              <div key={bold} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{bold}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--mkt-primary)', overflow: 'hidden' }}>
        <div className="tn-ticker-wrap">
          <div className="tn-ticker">
            {[
              '🎯 AI Talent Matching','📅 Auto Interview Scheduling','📹 Built-in Video Rooms','📜 Digital Offer Letters',
              '🌍 Location-Based Jobs','📲 WhatsApp Alerts','📊 Real-Time Analytics','🔒 Multi-Tenant Security',
              '📄 Background Verification','🚀 5-Day Shortlists','🎯 AI Talent Matching','📅 Auto Interview Scheduling',
              '📹 Built-in Video Rooms','📜 Digital Offer Letters','🌍 Location-Based Jobs','📲 WhatsApp Alerts',
              '📊 Real-Time Analytics','🔒 Multi-Tenant Security','📄 Background Verification','🚀 5-Day Shortlists',
            ].map((t, i) => (
              <span key={i} style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap' }}>
                {t} &nbsp;·&nbsp;
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── WHAT MAKES US DIFFERENT (vs Naukri / LinkedIn) ─────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)', background: 'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mkt-reveal" style={{ textAlign: 'center', marginBottom: 16 }}>
            <Tag>Why TalentNest HR</Tag>
          </div>
          <h2 className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: 'var(--mkt-text-heading)', letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Everything job boards<br />forgot to build
          </h2>
          <p className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(15px,1.6vw,18px)', color: 'var(--mkt-text-muted)', maxWidth: 580, margin: '0 auto 60px', lineHeight: 1.7 }}>
            Naukri tells you who applied. We tell you who to hire — and then help you onboard them, all in the same tab.
          </p>

          {/* Comparison table */}
          <div className="mkt-reveal" style={{ background: 'var(--mkt-card-bg)', border: '1px solid var(--mkt-card-border)', borderRadius: 20, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: 'var(--mkt-surface-bg)' }}>
              <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--mkt-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Feature</div>
              <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: 1 }}>TalentNest HR ✓</div>
              <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: 'var(--mkt-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Traditional Job Boards</div>
            </div>
            {[
              ['AI candidate matching', 'Match score before you apply', 'Keyword search only'],
              ['Application tracking', 'Live stage updates for candidates', 'Email if you\'re lucky'],
              ['Video interviews', 'Built-in rooms, no Zoom', '✗'],
              ['Offer letter + e-sign', 'Digital, tracked, instant', '✗'],
              ['Background verification', 'Docs collected on platform', '✗'],
              ['Pre-boarding checklist', 'Day 1 ready from Day 0', '✗'],
              ['Embedded career pages', 'Your brand, our infra', '✗'],
              ['WhatsApp notifications', 'Candidates always informed', '✗'],
              ['Location-based discovery', 'GPS-powered job matching', 'City filter only'],
              ['Multi-company ATS', 'One admin for all orgs', '✗'],
            ].map(([f, us, them]) => (
              <CompareRow key={f} feature={f} us={us} them={them} />
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)', background: 'var(--mkt-surface-bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mkt-reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <Tag>Real Time Saved</Tag>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, color: 'var(--mkt-text-heading)', marginTop: 16, letterSpacing: '-0.03em' }}>
              Numbers that matter to HR teams
            </h2>
          </div>
          <div className="tn-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            <StatCard value={5} suffix=" days" label="Average time-to-shortlist vs 45-day industry average" icon="⚡" accent="#0176D3" />
            <StatCard value={80} suffix="%" label="Reduction in manual follow-up emails with auto WhatsApp alerts" icon="📲" accent="#059669" />
            <StatCard value={3} suffix="x" label="Faster offer-to-joining with digital offer letters + e-sign" icon="📜" accent="#7c3aed" />
            <StatCard value={100} suffix="%" label="Of pre-boarding done digitally — no paper, no manual chasing" icon="✅" accent="#F59E0B" />
          </div>
        </div>
      </section>

      {/* ── THREE PRODUCTS ────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)', background: 'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="mkt-reveal" style={{ textAlign: 'center', marginBottom: 16 }}>
            <Tag>Three Products. One Login.</Tag>
          </div>
          <h2 className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: 'var(--mkt-text-heading)', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
            Built for every person in hiring
          </h2>
          <p className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(15px,1.5vw,17px)', color: 'var(--mkt-text-muted)', maxWidth: 560, margin: '0 auto 48px' }}>
            Scout for recruiters. Command for HR leaders. Launchpad for the people you're hiring.
          </p>

          {/* Product tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {products.map(p => (
              <button key={p.id}
                className="tn-prod-tab"
                onClick={() => setActiveProduct(p.id)}
                style={{
                  background: activeProduct === p.id ? `${p.accent}14` : 'var(--mkt-card-bg)',
                  borderColor: activeProduct === p.id ? p.accent : 'var(--mkt-card-border)',
                  color: activeProduct === p.id ? p.accent : 'var(--mkt-text-secondary)',
                  fontFamily: ff,
                }}>
                <span style={{ fontSize: 20 }}>{p.emoji}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{p.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{p.tagline}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Active product detail */}
          {active && (
            <div key={active.id} className="tn-prod-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center', animation: 'tnBounceIn 0.4s both' }}>
              {/* Left: text */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: active.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: `0 8px 24px ${active.accent}40` }}>
                    {active.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--mkt-text-heading)' }}>{active.name}</div>
                    <Pill color={active.accent}>{active.tagline}</Pill>
                  </div>
                </div>
                <h3 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 900, color: 'var(--mkt-text-heading)', letterSpacing: '-0.03em', whiteSpace: 'pre-line', margin: '0 0 16px', lineHeight: 1.15 }}>
                  {active.headline}
                </h3>
                <p style={{ fontSize: 15, color: 'var(--mkt-text-secondary)', lineHeight: 1.7, margin: '0 0 28px' }}>{active.sub}</p>
                <FeatureList items={active.features} accent={active.accent} />
                <div style={{ marginTop: 28 }}>
                  <Link to="/login" className="tn-cta-btn" style={{ background: active.gradient, color: '#fff', fontSize: 13 }}>
                    Try {active.name} Free →
                  </Link>
                </div>
              </div>
              {/* Right: mockup */}
              <div style={{ animation: 'tnFadeSlideIn 0.5s 0.1s both' }}>
                <DashboardMockup product={active.id} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── JOB BOARD ────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)',
        background: 'linear-gradient(160deg,rgba(2,8,23,0.97),rgba(1,36,86,0.93))',
        position: 'relative', overflow: 'hidden',
      }}>
        <FloatingOrbs />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="mkt-reveal" style={{ textAlign: 'center', marginBottom: 16 }}>
            <Tag>TalentNest Jobs</Tag>
          </div>
          <h2 className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,52px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
            The job board that<br />
            <span style={{ background: 'linear-gradient(90deg,#00C2CB,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>treats you like a person</span>
          </h2>
          <p style={{ textAlign: 'center', fontSize: 'clamp(15px,1.6vw,18px)', color: 'rgba(255,255,255,0.68)', maxWidth: 580, margin: '0 auto 56px', lineHeight: 1.7 }}>
            Most job boards are black holes — you apply, you wait, you wonder. TalentNest Jobs shows you exactly where your application stands, sends you updates the moment anything changes, and matches you to roles your skills actually fit.
          </p>

          <div className="tn-prod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { icon: '🔍', title: 'Smarter Search', desc: 'Filter by role, skills, location, salary, urgency, and notice period — not just a keyword box. Our AI scores each match so you see the best roles first.' },
              { icon: '📍', title: 'Location-First Discovery', desc: 'Allow location once. We surface roles near you, prioritize local opportunities, and remember your preferred cities — no manual filter every time.' },
              { icon: '🔔', title: 'Job Alerts That Actually Alert', desc: 'Set alerts by role + skill + salary range. Get notified on WhatsApp or email the moment a matching role goes live — not 3 days later.' },
              { icon: '📊', title: 'Live Application Status', desc: 'Applied? Track every stage in real time. Interview scheduled? See the date and join link. Offer out? Sign it digitally. All from your dashboard.' },
              { icon: '🤖', title: 'AI Match Score Before You Apply', desc: 'Know your fit percentage before you click Apply. Our AI analyses your profile against the job\'s requirements — saving you time on roles that won\'t move forward.' },
              { icon: '🏢', title: '100+ Companies, One Login', desc: 'Browse jobs from IT, non-IT, fintech, healthcare, and consulting companies — all on one platform, without creating 12 different accounts.' },
            ].map((f, i) => (
              <div key={i} className="tn-feature-card mkt-reveal" style={{ animationDelay: `${i * 0.06}s` }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{f.title}</h4>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link to="/careers" className="tn-cta-btn" style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', fontSize: 15 }}>
              Browse All Jobs →
            </Link>
          </div>
        </div>
      </section>

      {/* ── VIDEO & CALLING ──────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)', background: 'var(--mkt-surface-bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mkt-reveal" style={{ textAlign: 'center', marginBottom: 12 }}>
            <Tag>Native Video & Calls</Tag>
          </div>
          <h2 className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: 'var(--mkt-text-heading)', letterSpacing: '-0.03em', margin: '0 0 16px' }}>
            Interview. Call. Connect.<br />No third-party tools.
          </h2>
          <p className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(15px,1.5vw,17px)', color: 'var(--mkt-text-muted)', maxWidth: 560, margin: '0 auto 56px', lineHeight: 1.7 }}>
            Forget Zoom links, Google Meet invites, and "can you hear me?" confusion. TalentNest HR ships with a built-in interview room and direct audio calling — every recruiter gets the tools, every candidate gets a seamless experience.
          </p>

          <div className="tn-prod-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: '📹', title: 'One-Click Video Rooms', desc: 'Every scheduled interview automatically gets a unique video room link — sent to the candidate by email and WhatsApp. No login required for candidates.' },
                { icon: '📞', title: 'Direct Audio Calls', desc: 'Recruiters can call candidates directly from the platform. Candidates hear the ring, accept, and you\'re talking — no number sharing, no spam calls.' },
                { icon: '📅', title: 'Calendar + iCal Invite', desc: 'Scheduling an interview automatically fires a calendar invite (.ics file) to all attendees. Works with Google Calendar, Outlook, and Apple Calendar.' },
                { icon: '🎙️', title: 'Noise Cancellation Built In', desc: 'Audio calls use browser-native echo cancellation and noise suppression so interviews sound professional — even from a noisy office.' },
              ].map((f, i) => (
                <div key={i} className="mkt-reveal" style={{ display: 'flex', gap: 16, animationDelay: `${i * 0.08}s` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(1,118,211,0.12)', border: '1px solid rgba(1,118,211,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--mkt-text-heading)', margin: '0 0 4px' }}>{f.title}</h4>
                    <p style={{ fontSize: 13, color: 'var(--mkt-text-secondary)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Visual: fake video call UI */}
            <div className="mkt-reveal" style={{ background: '#0F172A', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>
              <div style={{ background: '#1E293B', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>● Interview Room — Priya Sharma × Rahul (Recruiter)</span>
                <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>● Live  12:34</span>
              </div>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { name: 'Priya Sharma', role: 'Candidate', color: '#7c3aed', initials: 'PS' },
                  { name: 'Rahul Verma', role: 'Recruiter', color: '#0176D3', initials: 'RV' },
                ].map(u => (
                  <div key={u.name} style={{ background: '#1E293B', borderRadius: 12, aspectRatio: '4/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: u.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: `0 0 0 3px ${u.color}40` }}>
                      {u.initials}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#CBD5E1' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: '#64748B' }}>{u.role}</div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 4 }}>
                      {['🎙️','📹'].map(ic => (
                        <span key={ic} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 6px', fontSize: 11 }}>{ic}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 20px 16px', display: 'flex', justifyContent: 'center', gap: 12 }}>
                {[['🎙️','Mute'],['📹','Video'],['📵','End','#DC2626']].map(([ic,lbl,bg]) => (
                  <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg || 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{ic}</div>
                    <span style={{ fontSize: 10, color: '#64748B' }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHO IS THIS FOR ────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)', background: 'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mkt-reveal" style={{ textAlign: 'center', marginBottom: 16 }}>
            <Tag>Built For You</Tag>
          </div>
          <h2 className="mkt-reveal" style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: 'var(--mkt-text-heading)', letterSpacing: '-0.03em', margin: '0 0 48px' }}>
            Why every user wins
          </h2>

          <div className="tn-prod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28 }}>
            {[
              {
                emoji: '🎯',
                name: 'Scout',
                role: 'For Recruiters',
                accent: '#0176D3',
                gradient: 'linear-gradient(135deg,#0176D3,#00C2CB)',
                why: 'Stop switching between your ATS, LinkedIn, WhatsApp, and a spreadsheet. Scout puts sourcing, pipeline, interviews, and offers in one flow. The average Scout user saves 4–6 hours a week on manual follow-ups alone.',
                wins: ['Pipeline that moves on its own with auto reminders','Interview links sent automatically — no copy-paste','Stage change triggers WhatsApp to candidate instantly'],
              },
              {
                emoji: '🏢',
                name: 'Command',
                role: 'For HR Leaders',
                accent: '#059669',
                gradient: 'linear-gradient(135deg,#059669,#0891B2)',
                why: 'You manage people, not paperwork. Command gives you organisation-wide visibility: who\'s being hired, how fast, at what cost, and where the pipeline is stalling — in a dashboard you can actually read in 30 seconds.',
                wins: ['Analytics that tell you WHY hiring is slow, not just that it is','Pre-boarding runs itself — you approve, the system does the rest','Org career page embeds in your website with one line of code'],
              },
              {
                emoji: '🚀',
                name: 'Launchpad',
                role: 'For Job Seekers',
                accent: '#7c3aed',
                gradient: 'linear-gradient(135deg,#7c3aed,#0176D3)',
                why: 'You\'ve applied on Naukri and heard nothing for 3 weeks. Launchpad shows you your application status in real time, tells you your match score before you apply, and lets you sign your offer letter from your phone. No chasing. No anxiety.',
                wins: ['Know where you stand — Applied → Shortlisted → Hired, live','Smart match scoring before you waste time applying','Sign your offer and complete BVD docs — no office visit needed'],
              },
            ].map((p, i) => (
              <div key={i} className="tn-feature-card mkt-reveal" style={{ animationDelay: `${i * 0.1}s`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 0 0 80px', background: `${p.accent}10`, pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: `0 6px 20px ${p.accent}30` }}>
                    {p.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--mkt-text-heading)' }}>{p.name}</div>
                    <Pill color={p.accent}>{p.role}</Pill>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: 'var(--mkt-text-secondary)', lineHeight: 1.7, margin: '0 0 20px' }}>{p.why}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {p.wins.map((w, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: p.accent, fontWeight: 800, fontSize: 12, marginTop: 2, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 13, color: 'var(--mkt-text-muted)', lineHeight: 1.5 }}>{w}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24 }}>
                  <Link to="/login" className="tn-cta-btn" style={{ background: p.gradient, color: '#fff', fontSize: 12, padding: '10px 20px' }}>
                    Get Started →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HRMS ─────────────────────────────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(64px,8vw,100px) clamp(16px,5vw,80px)',
        background: 'linear-gradient(135deg,rgba(2,8,23,0.96),rgba(5,80,50,0.9))',
        position: 'relative', overflow: 'hidden',
      }}>
        <FloatingOrbs />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
          <div className="tn-prod-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <div className="mkt-reveal" style={{ marginBottom: 16 }}>
                <Tag>HRMS Platform</Tag>
              </div>
              <h2 className="mkt-reveal" style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '0 0 20px', lineHeight: 1.1 }}>
                Attendance, workforce<br />
                <span style={{ color: '#34d399' }}>& people ops — unified</span>
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.68)', lineHeight: 1.7, margin: '0 0 32px' }}>
                Powered by the Faceify smart attendance engine, our HRMS module handles everything post-hire — attendance, leave, payroll inputs, shift management, and compliance reporting — so HR never has to touch a spreadsheet again.
              </p>
              <FeatureList
                accent="#34d399"
                items={[
                  'Faceify smart face-recognition attendance',
                  'Shift scheduling with auto conflict detection',
                  'Leave management with approval workflows',
                  'Payroll input export (salary slips, deductions)',
                  'Compliance: PF, ESI, TDS — automated reports',
                  'Mobile attendance for remote & field teams',
                ]}
              />
              <div style={{ marginTop: 32 }}>
                <Link to="/hrms" className="tn-cta-btn" style={{ background: 'linear-gradient(135deg,#059669,#34d399)', color: '#fff' }}>
                  Explore HRMS →
                </Link>
              </div>
            </div>

            {/* HRMS mockup */}
            <div className="mkt-reveal" style={{ background: '#0F172A', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
              <div style={{ background: '#1E293B', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8' }}>📋 Workforce Overview — May 2025</span>
                <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>✓ Synced</span>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Present Today', value: '142 / 160', pct: 89, color: '#34d399' },
                  { label: 'On Leave', value: '12', pct: 7, color: '#F59E0B' },
                  { label: 'Remote Check-in', value: '6', pct: 4, color: '#0176D3' },
                  { label: 'Payroll Ready', value: '98%', pct: 98, color: '#7c3aed' },
                ].map(r => (
                  <div key={r.label} style={{ background: '#1E293B', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{r.label}</span>
                      <span style={{ fontSize: 12, color: r.color, fontWeight: 800 }}>{r.value}</span>
                    </div>
                    <div style={{ height: 4, background: '#334155', borderRadius: 2 }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', background: r.color, borderRadius: 2, transition: 'width 1.2s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(80px,10vw,120px) clamp(16px,5vw,80px)', background: 'var(--mkt-section-bg)', textAlign: 'center' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="mkt-reveal" style={{ marginBottom: 16 }}>
            <Tag>Ready to start?</Tag>
          </div>
          <h2 className="mkt-reveal" style={{ fontSize: 'clamp(30px,5vw,56px)', fontWeight: 900, color: 'var(--mkt-text-heading)', letterSpacing: '-0.04em', margin: '0 0 20px', lineHeight: 1.08 }}>
            Hiring that works.<br />HR that breathes.
          </h2>
          <p className="mkt-reveal" style={{ fontSize: 'clamp(15px,1.5vw,17px)', color: 'var(--mkt-text-muted)', margin: '0 0 36px', lineHeight: 1.7 }}>
            Whether you're a recruiter chasing the next placement, an HR manager tired of spreadsheets, or a candidate who just wants to know where their application stands — TalentNest HR was built for you.
          </p>
          <div className="mkt-reveal" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="tn-cta-btn" style={{ background: 'linear-gradient(135deg,#0176D3,#00C2CB)', color: '#fff', fontSize: 15 }}>
              Get Started Free →
            </Link>
            <Link to="/contact" className="tn-cta-btn" style={{ background: 'var(--mkt-card-bg)', color: 'var(--mkt-text)', border: '1px solid var(--mkt-card-border)', fontSize: 15 }}>
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
