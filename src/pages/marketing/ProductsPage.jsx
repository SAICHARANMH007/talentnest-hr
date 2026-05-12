import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";

const PRODUCTS = [
  {
    to:       '/products/hireboard',
    name:     'HireBoard',
    for:      'For Recruiters & Talent Teams',
    icon:     '🎯',
    accent:   '#0176D3',
    gradient: 'linear-gradient(135deg,#0176D3,#00C2CB)',
    tagline:  'Your complete recruitment workspace — pipeline, chat, calls, interviews, offers.',
    what:     'HireBoard is where recruiters manage their entire workflow — source candidates, communicate via chat and calls, run video interviews, and close with digital offer letters — all in one screen.',
    bullets: [
      'Visual pipeline board — Track candidates from "Applied" to "Hired" in one view',
      'Advanced match scores — Instantly rank candidates based on skill resonance and experience',
      'Unified Communication — Integrated real-time chat, voice calls, and HD video interviews',
      'Automated Outreach — Smart WhatsApp and email triggers on every stage movement',
      'Digital Offer Letters — One-click generation with secure e-signature and PDF export',
      'Advanced Sourcing — Built-in talent pool, assessments, and bulk outreach tools',
      'Resume Parsing — High-accuracy data extraction from any PDF or Word resume',
    ],
  },
  {
    to:       '/products/peopledesk',
    name:     'PeopleDesk',
    for:      'For HR Admins & Org Managers',
    icon:     '🏢',
    accent:   '#059669',
    gradient: 'linear-gradient(135deg,#059669,#0891B2)',
    tagline:  'Full HR control — analytics, team, pre-boarding, automation, org branding.',
    what:     'HR admins see everything — every recruiter, every job, every application, every hire — with tools to approve, verify documents, automate notifications, and brand the entire hiring operation.',
    bullets: [
      'Live Analytics — Real-time insights into fill rates, source ROI, and recruiter performance',
      'Governance & Compliance — Job approval workflows and role-based access control',
      'Custom Branding — Host your own branded org career page with live job distribution',
      'Automated Pre-boarding — Self-service checklists triggered immediately upon hiring',
      'Document Verification — Secure portal for candidate document uploads and admin review',
      'Platform Hardening — Enterprise-grade security with 2FA, audit logs, and billing control',
      'Integrations — Export payroll data and sync with external HR tools seamlessly',
    ],
  },
  {
    to:       '/products/jobtrack',
    name:     'JobTrack',
    for:      'For Job Seekers & Candidates',
    icon:     '🚀',
    accent:   '#7c3aed',
    gradient: 'linear-gradient(135deg,#7c3aed,#0176D3)',
    tagline:  'Apply, track, chat, interview, sign — one account for the full journey.',
    what:     'JobTrack gives candidates everything in one place — not just apply and wait, but apply, set alerts, chat with recruiters, attend video interviews, sign offers, and complete pre-boarding from their phone.',
    bullets: [
      'Intelligent Discovery — Browse thousands of jobs with personalized match scores',
      'Intelligent Alerts — Get notified of roles matching your specific skills and location',
      'Live Progress — Real-time transparency with stage tracking via WhatsApp and Email',
      'Candidate Engagement — Direct real-time chat and voice calls with hiring teams',
      'Mobile Interviews — Join high-fidelity video interviews directly from your browser',
      'Digital Onboarding — Sign offers and upload pre-boarding documents from your phone',
      'Profile Builder — Create a professional, recruiter-ready profile in under 2 minutes',
    ],
  },
];

export default function ProductsPage() {
  useMarketingTheme();
  useEffect(() => {
    document.title = 'Products — TalentNest HR';
    window.scrollTo({ top:0, behavior:'instant' });
    if (!document.getElementById('marketing-css')) {
      const l = document.createElement('link');
      l.id='marketing-css'; l.rel='stylesheet'; l.href='/marketing.css';
      document.head.appendChild(l);
    }
  }, []);

  return (
    <div className="mkt-page" style={{ fontFamily:ff, background:'var(--mkt-section-bg)', color:'var(--mkt-text)', overflowX:'hidden' }}>
      <MarketingNav active="products" />

      {/* HERO */}
      <section style={{ background:'linear-gradient(160deg,#020817,#012456,#001e3c)', padding:'clamp(110px,14vw,150px) clamp(16px,5vw,80px) clamp(64px,8vw,96px)', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:'-15%',left:'50%',transform:'translateX(-50%)',width:'700px',height:'700px',borderRadius:'50%',background:'radial-gradient(circle,rgba(1,118,211,0.15),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ position:'relative',maxWidth:720,margin:'0 auto' }}>
          <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#7DD3FC',background:'rgba(1,118,211,0.15)',border:'1px solid rgba(1,118,211,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:24 }}>
            Three products. One login.
          </span>
          <h1 className="mkt-reveal" style={{ fontSize:'clamp(36px,5.5vw,64px)', fontWeight:900, color:'#fff', letterSpacing:'-0.04em', lineHeight:1.06, margin:'0 0 20px' }}>
            Built for every person<br />in the hiring journey.
          </h1>
          <p className="mkt-reveal" style={{ fontSize:'clamp(15px,1.6vw,18px)', color:'rgba(255,255,255,0.62)', margin:'0 0 12px', lineHeight:1.75, maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            TalentNest HR is one platform with three distinct products — each designed for the person using it, with features built around exactly what they need to do.
          </p>
        </div>
      </section>

      {/* THREE PRODUCTS */}
      <section style={{ padding:'clamp(64px,8vw,100px) clamp(16px,5vw,80px)', background:'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',display:'flex',flexDirection:'column',gap:32 }}>
          {PRODUCTS.map((p,i) => (
            <div key={p.name} className="mkt-reveal tn-prod-card-grid" style={{ background:'var(--mkt-card-bg)',border:'1px solid var(--mkt-card-border)',borderRadius:24,overflow:'hidden',animationDelay:`${i*0.1}s` }}>
              {/* Left: info */}
              <div style={{ padding:'clamp(28px,4vw,48px)', borderRight:'1px solid var(--mkt-card-border)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:20 }}>
                  <div style={{ width:52,height:52,borderRadius:16,background:p.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0,boxShadow:`0 6px 20px ${p.accent}30` }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontSize:22,fontWeight:900,color:'var(--mkt-text-heading)' }}>{p.name}</div>
                    <div style={{ fontSize:12,fontWeight:700,color:p.accent,textTransform:'uppercase',letterSpacing:'0.05em' }}>{p.for}</div>
                  </div>
                </div>
                <p style={{ fontSize:15,fontWeight:600,color:'var(--mkt-text-heading)',lineHeight:1.5,margin:'0 0 10px' }}>{p.tagline}</p>
                <p style={{ fontSize:13,color:'var(--mkt-text-secondary)',lineHeight:1.7,margin:'0 0 24px' }}>{p.what}</p>
                <Link to={p.to} style={{ display:'inline-flex',alignItems:'center',gap:8,background:p.gradient,color:'#fff',padding:'11px 24px',borderRadius:11,fontWeight:800,fontSize:13,textDecoration:'none',transition:'all 0.2s' }}
                  onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='none'}>
                  Explore {p.name} →
                </Link>
              </div>
              {/* Right: feature list */}
              <div style={{ padding:'clamp(28px,4vw,48px)', background:'var(--mkt-surface-bg)' }}>
                <div style={{ fontSize:11,fontWeight:700,color:'var(--mkt-text-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:16 }}>What you can do</div>
                <ul style={{ listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:12 }}>
                  {p.bullets.map(b => (
                    <li key={b} style={{ display:'flex',alignItems:'flex-start',gap:10 }}>
                      <span style={{ width:20,height:20,borderRadius:6,background:`${p.accent}14`,border:`1.5px solid ${p.accent}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:p.accent,fontWeight:900,flexShrink:0,marginTop:1 }}>✓</span>
                      <span style={{ fontSize:13,color:'var(--mkt-text-secondary)',lineHeight:1.55 }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ALSO: HRMS + JOB BOARD */}
      <section style={{ padding:'clamp(48px,6vw,80px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div className="mkt-reveal" style={{ marginBottom:32,textAlign:'center' }}>
            <span style={{ fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--mkt-accent)' }}>Also included</span>
            <h2 style={{ fontSize:'clamp(22px,3vw,36px)',fontWeight:900,color:'var(--mkt-text-heading)',margin:'8px 0 0',letterSpacing:'-0.02em' }}>More from TalentNest HR</h2>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20 }}>
            {[
              { to:'/careers', icon:'📋', name:'Job Board', accent:'#0176D3', gradient:'linear-gradient(135deg,#0176D3,#00C2CB)', desc:'Browse all active jobs from every company on TalentNest HR. Candidates apply directly. Companies get applications in their HireBoard pipeline instantly.' },
              { to:'/hrms',    icon:'⚙️', name:'HRMS',      accent:'#059669', gradient:'linear-gradient(135deg,#059669,#34d399)', desc:'Powered by Faceify — face-recognition attendance, shift scheduling, leave management, and payroll input exports for your workforce.' },
            ].map(p => (
              <div key={p.name} className="mkt-reveal" style={{ background:'var(--mkt-card-bg)',border:'1px solid var(--mkt-card-border)',borderRadius:20,padding:'28px 24px' }}>
                <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
                  <div style={{ width:44,height:44,borderRadius:13,background:p.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>{p.icon}</div>
                  <div style={{ fontSize:18,fontWeight:900,color:'var(--mkt-text-heading)' }}>{p.name}</div>
                </div>
                <p style={{ fontSize:13,color:'var(--mkt-text-secondary)',lineHeight:1.65,margin:'0 0 20px' }}>{p.desc}</p>
                <Link to={p.to} style={{ fontSize:13,fontWeight:700,color:p.accent,textDecoration:'none' }}>Learn more →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'clamp(64px,8vw,96px) clamp(16px,5vw,80px)', background:'linear-gradient(135deg,#0176D3,#00C2CB)', textAlign:'center' }}>
        <div style={{ maxWidth:600,margin:'0 auto' }}>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>
            One login. All three products.
          </h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.78)',fontSize:15,margin:'0 0 32px',lineHeight:1.7 }}>
            Sign up once and access HireBoard, PeopleDesk, or JobTrack based on your role. No separate accounts. No separate subscriptions.
          </p>
          <Link to="/login" style={{ background:'#fff',color:'#0176D3',padding:'14px 36px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none',display:'inline-block' }}>
            Get Started Free →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
