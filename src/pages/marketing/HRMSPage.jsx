import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const FEATURES = [
  { icon: '🎯', title: 'AI Facial Recognition', desc: 'Accurately identifies employees in real time using advanced deep-learning facial recognition — even with masks, glasses, or lighting changes.' },
  { icon: '⏱️', title: 'Automated Attendance', desc: 'Employees mark attendance with a glance. No punch cards, no PINs, no buddy-punching. 100% contactless and tamper-proof.' },
  { icon: '🚪', title: 'Access Control Integration', desc: 'Grant or restrict building and room access based on facial identity. Integrate with existing door locks and security systems.' },
  { icon: '📊', title: 'Real-Time HR Dashboard', desc: 'Live attendance reports, late arrivals, absenteeism trends, and work-hour summaries — all visible in one clean dashboard.' },
  { icon: '🛡️', title: 'Anti-Spoofing Technology', desc: 'Liveness detection prevents photos or videos from fooling the system. Only a real, present face will be accepted.' },
  { icon: '📱', title: 'Mobile & Multi-Device', desc: 'Deploy on tablets, kiosks, or smartphones. Works across multiple office locations with a single cloud-based admin panel.' },
  { icon: '🔗', title: 'Payroll Integration', desc: 'Attendance data flows directly into your payroll system. Eliminate manual timesheet errors and salary disputes.' },
  { icon: '🌐', title: 'Multi-Branch Support', desc: 'Manage employees across multiple locations from one platform. Consolidate attendance data from all branches in real time.' },
  { icon: '📁', title: 'Employee Profile Management', desc: 'Centralized employee records — face data, department, designation, shift schedules, and leave balances in one place.' },
];

const USECASES = [
  { icon: '🏢', title: 'Corporate Offices', desc: 'Streamline attendance for large workforces without queues or hardware tokens.', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=85' },
  { icon: '🏭', title: 'Manufacturing & Warehouses', desc: 'Track shift workers accurately in high-turnover, multi-shift environments.', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&auto=format&fit=crop&q=85' },
  { icon: '🏥', title: 'Healthcare & Clinics', desc: 'Contactless check-in for hygiene-sensitive environments with 24/7 shift tracking.', img: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&auto=format&fit=crop&q=85' },
  { icon: '🏫', title: 'Educational Institutions', desc: 'Faculty and staff attendance with zero manual effort and instant reports.', img: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&auto=format&fit=crop&q=85' },
];

export default function HRMSPage() {
  const { theme } = useMarketingTheme();
  
  useEffect(() => {
    if (!document.getElementById('marketing-css')) {
      const link = document.createElement('link'); link.id = 'marketing-css'; link.rel = 'stylesheet'; link.href = '/marketing.css';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="mkt-page" style={{ fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", background: 'var(--mkt-section-bg)', color: 'var(--mkt-text)' }}>
      <MarketingNav active="hrms" />

      {/* ── HERO ── */}
      <section style={{ 
        background: 'linear-gradient(135deg, rgba(3,17,38,0.96) 0%, rgba(1,36,86,0.92) 100%)', 
        padding: '160px 0 100px', 
        textAlign: 'center', 
        position: 'relative', 
        overflow: 'hidden' 
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 60%, rgba(6,182,212,0.12) 0%, transparent 55%), radial-gradient(circle at 75% 20%, rgba(1,118,211,0.15) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div className="container" style={{ position: 'relative' }}>
          <span className="section-tag" style={{ background: 'rgba(255,255,255,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)', backdropFilter: 'blur(8px)' }}>
            🤝 Authorised Reseller: RNIT Faceify
          </span>
          <h1 style={{ color: 'var(--mkt-text-on-dark, #fff)', fontSize: 'clamp(2.5rem,6vw,4rem)', fontWeight: 900, margin: '20px 0 24px', lineHeight: 1.05, letterSpacing: '-0.04em' }}>
            Smart & Contactless<br />
            <span style={{ background: 'linear-gradient(90deg, var(--mkt-accent), #60a5fa)', display: 'inline-block', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Facial Recognition HRMS
            </span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.2rem', maxWidth: 650, margin: '0 auto 16px', lineHeight: 1.6 }}>
            Powered by <strong style={{ color: 'var(--mkt-accent)' }}>Faceify by RNIT</strong>: contactless attendance, smart access control, and real-time HR analytics.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.6 }}>
            TalentNest HR is an authorised reseller of Faceify in Hyderabad. Get implementation, training, and ongoing support from our team.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg">Request a Demo →</Link>
            <Link to="/contact" className="btn btn-secondary btn-lg">Get Pricing</Link>
          </div>
        </div>
      </section>

      {/* ── WHAT IS FACEIFY ── */}
      <section className="section mkt-section-light" style={{ padding: '100px 0' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: 60 }}>
            <div>
              <span className="section-tag" style={{ marginBottom: 20 }}>🧠 About Faceify</span>
              <h2 className="section-title" style={{ textAlign: 'left', color: 'var(--mkt-text-heading)', margin: '0 0 24px' }}>
                Next-Generation <span>HR Technology</span>
              </h2>
              <p style={{ color: 'var(--mkt-text)', lineHeight: 1.8, marginBottom: 20, fontSize: '1.05rem' }}>
                Faceify is an enterprise-grade Smart HRMS platform developed by <strong>RNIT</strong>, built around facial recognition technology. It eliminates traditional time-tracking problems — proxy attendance, lost ID cards, manual errors — replacing them with a seamless, contactless experience.
              </p>
              <p style={{ color: 'var(--mkt-text-muted)', lineHeight: 1.8, marginBottom: 32 }}>
                As TalentNest HR's authorised reseller, we handle everything locally — from demo and procurement to on-site installation, employee enrollment, and post-go-live support.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['99.9% Recognition Accuracy', 'Contactless & Hygienic', 'Cloud + On-Premise', 'GDPR Compliant'].map(tag => (
                  <span key={tag} style={{ background: 'rgba(var(--mkt-primary-rgb), 0.08)', color: 'var(--mkt-primary)', border: `1px solid var(--mkt-card-border)`, borderRadius: 50, padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700 }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, alignItems: 'stretch' }}>
              {[
                { icon: '⚡', title: 'Instant Recognition', desc: 'Identifies employees in under 0.5 seconds.' },
                { icon: '👥', title: 'Unlimited Employees', desc: 'Scales from 10 to 10,000+ employees.' },
                { icon: '☁️', title: 'Cloud-Based', desc: 'Access from anywhere, any device.' },
                { icon: '🔒', title: 'Secure & Encrypted', desc: 'Biometric data is encrypted end-to-end.' },
              ].map(item => (
                <div key={item.title} className="mkt-card" style={{ padding: 24, background: 'var(--mkt-card-bg)', borderRadius: 16, border: `1px solid var(--mkt-card-border)`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '1.6rem', marginBottom: 12 }}>{item.icon}</div>
                  <div style={{ fontWeight: 800, color: 'var(--mkt-text-heading)', fontSize: '0.95rem', marginBottom: 6 }}>{item.title}</div>
                  <div style={{ color: 'var(--mkt-text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section mkt-section-light" style={{ padding: '100px 0' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">✨ Features</span>
            <h2 className="section-title" style={{ color: 'var(--mkt-text-heading)' }}>Everything Faceify <span>Can Do</span></h2>
            <p className="section-subtitle" style={{ color: 'var(--mkt-text-muted)' }}>A complete HR management suite built on facial recognition — far beyond just attendance.</p>
          </div>
          <div className="grid-3" style={{ alignItems: 'stretch' }}>
            {(Array.isArray(FEATURES) ? FEATURES : []).map((f, i) => {
              const FEAT_GRADIENTS = ['#0176D3,#00C2CB','#8B5CF6,#7C3AED','#10B981,#059669','#F5A623,#F59E0B','#EF4444,#DC2626','#0176D3,#014486'];
              return (
              <div key={f.title} className="mkt-card" style={{ background: 'var(--mkt-card-bg)', borderRadius: 20, padding: 32, border: `1px solid var(--mkt-card-border)`, display: 'flex', flexDirection: 'column' }}>
                <div style={{width:54,height:54,borderRadius:14,background:`linear-gradient(135deg,${FEAT_GRADIENTS[i%FEAT_GRADIENTS.length]})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,marginBottom:20, boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}}>{f.icon}</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--mkt-text-heading)', marginBottom: 12 }}>{f.title}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--mkt-text-muted)', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="section mkt-section-dark" style={{ padding: '100px 0' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">🏆 Use Cases</span>
            <h2 className="section-title" style={{ color: 'var(--mkt-text-heading)' }}>Who Uses <span>Faceify?</span></h2>
            <p className="section-subtitle" style={{ color: 'var(--mkt-text-muted)' }}>Faceify adapts to any industry where people, time, and access matter.</p>
          </div>
          <div className="grid-4" style={{ gap: 24, alignItems: 'stretch' }}>
            {(Array.isArray(USECASES) ? USECASES : []).map(u => (
              <div key={u.title} className="mkt-card" style={{ background: 'var(--mkt-card-bg)', borderRadius: 24, overflow:'hidden', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', border: `1px solid var(--mkt-card-border)` }}>
                <div style={{height:140,width:'100%',overflow:'hidden',position:'relative'}}>
                  <img src={u.img} alt={u.title} loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom, transparent, rgba(5,13,26,0.8))'}} />
                  <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',fontSize:'2.5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))'}}>{u.icon}</div>
                </div>
                <div style={{padding:'24px 28px 32px'}}>
                  <h3 style={{ color: 'var(--mkt-text-heading)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 12 }}>{u.title}</h3>
                  <p style={{ color: 'var(--mkt-text-muted)', fontSize: '0.9rem', lineHeight: 1.7 }}>{u.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY BUY THROUGH TALENTNEST ── */}
      <section className="section mkt-section-light" style={{ padding: '100px 0' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-tag">🤝 Why Buy Through Us</span>
            <h2 className="section-title" style={{ color: 'var(--mkt-text-heading)' }}>Local Support, <span>Enterprise Product</span></h2>
            <p className="section-subtitle" style={{ color: 'var(--mkt-text-muted)' }}>As RNIT's authorised reseller, we don't just sell — we implement, train, and support.</p>
          </div>
          <div className="grid-3" style={{ alignItems: 'stretch' }}>
            {[
              { icon: '🛠️', title: 'On-Site Installation', desc: 'Our team handles hardware setup, camera placement, and system configuration at your location.' },
              { icon: '👨‍💼', title: 'Employee Enrollment', desc: 'We run face enrollment sessions for your entire workforce so go-live is smooth and adoption is fast.' },
              { icon: '📞', title: 'Dedicated Support', desc: 'Direct line to our team — not a ticketing system. Real people who know your setup.' },
              { icon: '🎓', title: 'Admin Training', desc: 'We train your HR team to manage reports, add employees, configure shifts, and use the dashboard confidently.' },
              { icon: '💡', title: 'Customisation Help', desc: 'Need specific reports or integrations? We work with RNIT to tailor the platform to your workflow.' },
              { icon: '🔄', title: 'Ongoing Maintenance', desc: 'Regular check-ins, updates, and troubleshooting included in our reseller support packages.' },
            ].map(item => (
              <div key={item.title} className="mkt-card" style={{ background: 'var(--mkt-card-bg)', borderRadius: 16, padding: 28, border: `1px solid var(--mkt-card-border)`, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontWeight: 800, color: 'var(--mkt-text-heading)', fontSize: '1rem', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ color: 'var(--mkt-text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT SHOWCASE ── */}
      <section className="mkt-section-light" style={{ padding:'100px 0', overflow:'hidden' }}>
        <div className="container">
          <div style={{textAlign:'center',marginBottom:48}}>
            <span className="section-tag">Platform Preview</span>
            <h2 style={{color: 'var(--mkt-text-heading)', fontWeight:900, fontSize:'clamp(28px,4vw,44px)', letterSpacing:'-0.03em', margin: '16px 0 0'}}>
              See It In <span style={{background:'linear-gradient(135deg,#0176D3,#00C2CB)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Action</span>
            </h2>
          </div>
          <div className="mkt-card" style={{position:'relative',borderRadius:20,overflow:'hidden',boxShadow:'0 32px 80px rgba(0,0,0,0.3)',border:`1px solid var(--mkt-card-border)`}}>
            <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80" alt="HRMS Platform Dashboard" loading="lazy" style={{width:'100%',display:'block'}} />
            <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 60%,rgba(5,13,26,0.8) 100%)'}} />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'linear-gradient(135deg, rgba(3,17,38,0.98) 0%, rgba(1,36,86,0.94) 100%)', padding: '100px 0', textAlign: 'center' }}>
        <div className="container">
          <span style={{ background: 'rgba(6,182,212,0.2)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 50, padding: '6px 20px', fontSize: '0.8rem', fontWeight: 800 }}>
            Powered by RNIT Faceify
          </span>
          <h2 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 900, margin: '24px 0 16px', letterSpacing: '-0.03em' }}>
            Ready to Go Contactless?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 36, fontSize: '1.1rem', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Request a live demo or get in touch to discuss pricing and implementation for your organisation.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/contact" className="btn btn-primary btn-lg">Book a Demo →</Link>
            <Link to="/contact" className="btn btn-secondary btn-lg">Talk to Us</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
