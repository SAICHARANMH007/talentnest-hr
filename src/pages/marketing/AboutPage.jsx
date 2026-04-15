import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const VALUES = [
  { icon: '🎯', title: 'Quality Over Volume', desc: 'We send 3 perfect candidates, not 30 average ones. Every submission is intentional, vetted, and worth your time.' },
  { icon: '⚡', title: 'Speed Without Shortcuts', desc: 'First shortlist delivered within 5 business days — because the best candidates are off the market within 10 days of searching.' },
  { icon: '🔁', title: 'Full Replacement Guarantee', desc: 'If a placement does not work out, we replace them at zero cost. Our incentives are aligned with your long-term success.' },
  { icon: '📞', title: 'Named Consultant, Always', desc: 'You speak to the same specialist who sourced your candidates — not a rotating call centre. Direct access, direct accountability.' },
  { icon: '💡', title: 'Transparent Pricing', desc: 'No hidden fees, no surprise invoices. We quote clearly upfront and that is exactly what you pay.' },
  { icon: '📈', title: 'Retention-Focused', desc: 'We measure success at the 12-month mark, not the offer letter. Long-term fit is the only metric that matters to us.' },
];

const PROCESS = [
  { step: '01', icon: '📋', title: 'Deep Role Brief', desc: 'We spend 45 minutes understanding not just the job description — but the team, the culture, and what success looks like at 6 months.' },
  { step: '02', icon: '🎯', title: 'Smart + Human Sourcing', desc: 'Our targeted matching logic scans thousands of profiles. Our specialist recruiters manually screen the top matches with live assessments.' },
  { step: '03', icon: '👥', title: 'Curated Shortlist of 3', desc: 'You receive 3 fully-vetted candidates with written assessment notes, culture commentary, and our recommendation rationale.' },
  { step: '04', icon: '🚀', title: 'Offer to Onboard', desc: 'We manage negotiations, background checks, reference calls, and 90-day post-hire check-ins to ensure a smooth start.' },
];

const DIFFERENTIATORS = [
  { icon: '📈', title: 'Technology-backed sourcing', desc: 'Advanced selection tools help us move faster, but every shortlist is still owned by a human recruiter.' },
  { icon: '📍', title: 'India-focused execution', desc: 'We understand hiring realities across Hyderabad, Bangalore, Mumbai, Chennai, and remote-first teams.' },
  { icon: '🤝', title: 'Built for long-term partnerships', desc: 'We optimize for retention, speed, communication, and operational trust from day one.' },
];

export default function AboutPage() {
  const { theme } = useMarketingTheme();
  
  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link'); link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
  }, []);

  const VALUE_GRADIENTS = [
    'linear-gradient(135deg,#0176D3,#00C2CB)',
    'linear-gradient(135deg,#F5A623,#F59E0B)',
    'linear-gradient(135deg,#10B981,#059669)',
    'linear-gradient(135deg,#8B5CF6,#7C3AED)',
    'linear-gradient(135deg,#EF4444,#DC2626)',
    'linear-gradient(135deg,#0176D3,#014486)',
  ];

  return (
    <div className="mkt-page" style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", background: 'var(--mkt-section-bg)', color: 'var(--mkt-text)' }}>
      <MarketingNav active="about" />

      {/* ── HERO ── */}
      <section style={{
        padding: '160px 0 100px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(3,17,38,0.96) 0%, rgba(1,36,86,0.92) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 25% 50%, rgba(6,182,212,0.12) 0%, transparent 55%), radial-gradient(circle at 80% 25%, rgba(1,118,211,0.15) 0%, transparent 50%)', pointerEvents:'none' }} />
        <div className="container" style={{ position:'relative' }}>
          <h1 style={{ color: 'var(--mkt-text-on-dark, #fff)', fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 24 }}>
            About <span style={{ background: 'linear-gradient(135deg, var(--mkt-accent), #fff)', display: 'inline-block', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>TalentNest</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.25rem', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            Redefining recruitment through integrity, transparency, and deep domain expertise since 2018.
          </p>
        </div>
      </section>

      {/* ── DIFFERENTIATORS ── */}
      <section className="mkt-section-light" style={{ padding: '32px 0 88px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {DIFFERENTIATORS.map(item => (
              <div key={item.title} className="mkt-card" style={{ background: 'var(--mkt-card-bg)', borderRadius: 18, border: `1px solid var(--mkt-card-border)`, padding: 24 }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: `linear-gradient(135deg, var(--mkt-primary), var(--mkt-accent))`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 16 }}>
                  {item.icon}
                </div>
                <h3 style={{ color: 'var(--mkt-text-heading)', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>{item.title}</h3>
                <p style={{ color: 'var(--mkt-text-muted)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="mkt-section-light" style={{ padding: '100px 0' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems:'center', gap:60 }}>
            <div>
              <h2 style={{ fontSize: 'clamp(2.2rem,4vw,3.2rem)', fontWeight: 900, color: 'var(--mkt-text-heading)', marginBottom: 24, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                Our Journey to <span style={{ color: 'var(--mkt-primary)' }}>Excellence</span>
              </h2>
              <div style={{ color: 'var(--mkt-text)', fontSize: '1.1rem', lineHeight: 1.8 }}>
                <p style={{ marginBottom:20 }}>
                  TalentNest HR was built with a clear purpose — to make great hiring accessible to every company without the noise, delays, and disappointment that come with large impersonal agencies. We are a focused team of specialists who care deeply about every single placement.
                </p>
                <p style={{ marginBottom:32, color: 'var(--mkt-text-muted)' }}>
                  We combine deep domain expertise with cutting-edge selection tools to deliver staffing solutions that are faster, more accurate, and more cost-effective than traditional approaches. Every client gets a named consultant — not a call centre.
                </p>
              </div>
              <Link to="/contact" className="btn btn-primary">Get in Touch →</Link>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <div style={{ borderRadius:20, overflow:'hidden', height:220, position:'relative', boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80" alt="TalentNest HR office" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, rgba(3,45,96,0.3), rgba(1,118,211,0.2))' }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap:16 }}>
                {[{n:'3+',l:'Happy Clients'},{n:'20+',l:'Placements Made'},{n:'48 hrs',l:'Avg. Time-to-Hire'},{n:'100%',l:'Satisfaction Rate'}].map(s => (
                  <div key={s.l} style={{ background: 'var(--mkt-surface-bg)', borderRadius:16, padding:24, textAlign:'center', border: `1px solid var(--mkt-card-border)` }}>
                    <div style={{ fontSize:'2.2rem', fontWeight:900, color: 'var(--mkt-primary)', marginBottom:6 }}>{s.n}</div>
                    <div style={{ color: 'var(--mkt-text-muted)', fontSize:'0.85rem', fontWeight: 600 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="mkt-section-light" style={{ padding: '100px 0', textAlign: 'center' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">💎 Our Values</span>
            <h2 className="section-title" style={{ color: 'var(--mkt-text-heading)' }}>What We Stand For, <span>Every Single Hire</span></h2>
          </div>
          <div className="grid-3" style={{ alignItems:'stretch' }}>
            {(Array.isArray(VALUES) ? VALUES : []).map((v, i) => (
              <div key={v.title} className="mkt-card"
                style={{ background: 'var(--mkt-card-bg)', borderRadius:20, padding:32, border: `1px solid var(--mkt-card-border)`, display:'flex', flexDirection:'column' }}
              >
                <div style={{width:60,height:60,borderRadius:16,background:VALUE_GRADIENTS[i%VALUE_GRADIENTS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,marginBottom:20, boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}}>
                  {v.icon}
                </div>
                <h4 style={{ fontWeight:800, color: 'var(--mkt-text-heading)', marginBottom:12, fontSize:'1.1rem' }}>{v.title}</h4>
                <p style={{ color: 'var(--mkt-text-muted)', fontSize:'0.95rem', lineHeight:1.7, margin:0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="mkt-section-light" style={{ padding: '96px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <span className="section-tag">⚙️ Our Process</span>
            <h2 style={{ color: 'var(--mkt-text-heading)', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '16px 0 14px', lineHeight: 1.1 }}>
              A tighter hiring workflow<br />with less noise and more signal
            </h2>
            <p style={{ color: 'var(--mkt-text-muted)', maxWidth: 620, margin: '0 auto', lineHeight: 1.8, fontSize: 15 }}>
              Our model is designed to reduce decision fatigue for hiring teams while increasing confidence in every submission.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 22 }}>
            {PROCESS.map(step => (
              <div key={step.step} className="mkt-card" style={{ background: 'var(--mkt-card-bg)', border: `1px solid var(--mkt-card-border)`, borderRadius: 24, padding: 32 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--mkt-primary)', letterSpacing: '0.15em', marginBottom: 16 }}>STEP {step.step}</div>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: `rgba(var(--mkt-accent-rgb), 0.12)`, border: `1px solid rgba(var(--mkt-accent-rgb), 0.22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 20 }}>
                  {step.icon}
                </div>
                <h3 style={{ color: 'var(--mkt-text-heading)', fontSize: 19, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.3 }}>{step.title}</h3>
                <p style={{ color: 'var(--mkt-text-muted)', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, rgba(3,17,38,0.98) 0%, rgba(1,36,86,0.94) 100%)', padding:'80px 0', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.12) 0%, transparent 60%)', pointerEvents:'none' }} />
        <div className="container" style={{ position:'relative' }}>
          <h2 style={{ color: '#fff', fontSize:'2.5rem', fontWeight:900, marginBottom:16, letterSpacing: '-0.03em' }}>Ready to Work With Us?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom:32, maxWidth:440, margin:'0 auto 24px', lineHeight:1.7, fontSize: '1.1rem' }}>
            Tell us your hiring challenge. We will respond within 2 hours with a clear plan.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', marginBottom:32 }}>
            {[
              { icon:'📧', text:'hr@talentnesthr.com', href:'mailto:hr@talentnesthr.com' },
              { icon:'📩', text:'info@talentnesthr.com', href:'mailto:info@talentnesthr.com' },
              { icon:'📞', text:'+91 79955 35539', href:'tel:+917995535539' },
              { icon:'🌐', text:'www.talentnesthr.com', href:'https://www.talentnesthr.com' },
            ].map(c => (
              <a key={c.text} href={c.href} target={c.icon==='🌐'?'_blank':'_self'} rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.85)', fontSize:'0.875rem', textDecoration:'none', background:'rgba(255,255,255,0.1)', padding:'8px 16px', borderRadius:50, border:'1px solid rgba(255,255,255,0.2)', transition:'all 0.2s', backdropFilter:'blur(8px)' }}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(6,182,212,0.25)'; e.currentTarget.style.borderColor='rgba(6,182,212,0.5)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.2)'; }}
              >
                <span>{c.icon}</span><span>{c.text}</span>
              </a>
            ))}
          </div>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg">Start a Conversation →</Link>
            <Link to="/blog" className="btn btn-secondary btn-lg">Read Our Insights</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
