import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const ff  = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const AC  = '#059669';
const GR  = 'linear-gradient(135deg,#059669,#0891B2)';

const SECTIONS = [
  {
    heading: '📊 Analytics & Visibility',
    items: [
      { icon:'📈', name:'Real-time analytics dashboard', detail:'Fill rate, time-in-stage, applications by source (career page, LinkedIn, invite, platform), top-performing jobs, recruiter leaderboard — all live, no manual reporting.' },
      { icon:'👥', name:'Recruiter performance tracking', detail:'See every recruiter\'s pipeline — how many active roles, how many candidates moved this week, average time to close. Leaderboard updated in real time.' },
      { icon:'📋', name:'All applications across all jobs', detail:'See every application across every job in your org — candidate name, source, stage, date applied. Filter, sort, and drill into any record.' },
      { icon:'📤', name:'Export candidates + pipeline to Excel', detail:'Export your full candidate list or pipeline to Excel in one click. Choose by role, stage, or date range.' },
    ],
  },
  {
    heading: '💼 Jobs & Recruitment Control',
    items: [
      { icon:'🖊️', name:'Post and manage all jobs', detail:'Create jobs with full details — skills, salary, urgency, department, screening questions, external careers URL. Assign recruiters. Manage active, draft, and closed roles.' },
      { icon:'✅', name:'Job approval workflows', detail:'Recruiters submit jobs for review. You approve or reject with notes before a role goes live. Keeps job quality consistent across the org.' },
      { icon:'🌐', name:'Org-branded career page', detail:'Your org gets a career page at talentnesthr.com/[your-org]/careers. Choose which jobs appear on it. Embed it on your own website with one iframe line of code.' },
      { icon:'📣', name:'Job distribution to external boards', detail:'Push job postings to external job boards and track which channels send the most applications and conversions.' },
    ],
  },
  {
    heading: '📜 Hiring & Onboarding',
    items: [
      { icon:'📜', name:'Digital offer letter generation', detail:'Generate branded offer letters from candidate data. Approve and send digitally. Candidates e-sign with their name — IP, timestamp, and signed PDF archived automatically.' },
      { icon:'📋', name:'Pre-boarding checklist management', detail:'When a candidate is hired, a pre-boarding checklist is created automatically — Aadhaar, PAN, salary slips, experience letter, background verification, IT setup, orientation. Track progress per candidate.' },
      { icon:'✅', name:'Background document verification', detail:'Candidates upload their documents. You review each one and mark it verified, rejected, or request resubmission — with notes sent back to the candidate.' },
      { icon:'📅', name:'Joining date & CTC tracking', detail:'Record CTC offered and joining date when a candidate is hired. Visible in the pre-boarding record and the candidate\'s onboarding checklist.' },
    ],
  },
  {
    heading: '⚙️ Team, Org & Automation',
    items: [
      { icon:'🔐', name:'Secure team invite system', detail:'Invite recruiters and admins via a secure link. They set their own password — no plain-text passwords ever sent. Resend invite from the admin panel if needed.' },
      { icon:'🏢', name:'Org settings + branding', detail:'Update your org name, logo, domain. Your logo appears on the career page and offer letters. Custom fields let you capture any data specific to your process.' },
      { icon:'🔒', name:'Audit logs + Enterprise security', detail:'Every action in the platform is logged — who changed what, when. Session management, role-based access control (RBAC), and SOC-2 compliant logging.' },
      { icon:'💰', name:'Billing + plan management', detail:'View your current plan, usage, and invoices. Upgrade, downgrade, or contact the team — all from the billing panel.' },
    ],
  },
  {
    heading: '🌐 Multi-tenant & Enterprise Scale',
    items: [
      { icon:'🏙️', name:'Manage Multiple Organisations', detail:'Perfect for staffing agencies or conglomerates. Manage multiple separate organisations with unique branding, pipelines, and users from one admin account.' },
      { icon:'👥', name:'Bulk user provisioning', detail:'Provision dozens of recruiter accounts in seconds. Set default permissions, team assignments, and notification rules in bulk.' },
      { icon:'📈', name:'Consolidated Org Analytics', detail:'Roll up data across multiple departments or sub-organisations to see your total hiring health, spend, and recruiter efficiency at scale.' },
      { icon:'🛠️', name:'White-label career portals', detail:'Deploy fully-branded career portals for each of your clients or subsidiaries with their own logo, color scheme, and unique URL.' },
      { icon:'📬', name:'Centralized candidate requests', detail:'Admins can review and approve staffing requests from across the entire organisation. Assign the best recruiters to high-priority mandates.' },
    ],
  },
];

export default function ProductPeopleDesk() {
  useMarketingTheme();
  useEffect(() => {
    document.title = 'PeopleDesk — For HR Admins | TalentNest HR';
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
      <section style={{ background:'linear-gradient(160deg,#020817,#064e3b,#022c22)', padding:'clamp(110px,14vw,150px) clamp(16px,5vw,80px) clamp(64px,8vw,96px)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:'-10%',right:'5%',width:'500px',height:'500px',borderRadius:'50%',background:'radial-gradient(circle,rgba(5,150,105,0.2),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ maxWidth:1100,margin:'0 auto',position:'relative' }} className="tn-prod-grid">
          <div>
            <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6EE7B7',background:'rgba(5,150,105,0.15)',border:'1px solid rgba(5,150,105,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:22 }}>
              For HR Admins & Org Managers
            </span>
            <h1 className="mkt-reveal" style={{ fontSize:'clamp(34px,5.5vw,62px)',fontWeight:900,color:'#fff',letterSpacing:'-0.04em',lineHeight:1.06,margin:'0 0 18px' }}>
              PeopleDesk
            </h1>
            <p className="mkt-reveal" style={{ fontSize:'clamp(15px,1.6vw,18px)',color:'rgba(255,255,255,0.65)',lineHeight:1.75,margin:'0 0 14px',maxWidth:520 }}>
              Full HR control — analytics, team management, offer letters, pre-boarding, document verification, automation — in one dashboard.
            </p>
            <p className="mkt-reveal" style={{ fontSize:'clamp(13px,1.3vw,15px)',color:'rgba(255,255,255,0.45)',lineHeight:1.7,margin:'0 0 32px',maxWidth:500 }}>
              HR admins see everything above the recruiter level. Every job, every application, every hire, every document — with controls to approve, verify, automate, and export.
            </p>
            <div className="mkt-reveal" style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              <Link to="/login" style={{ display:'inline-flex',alignItems:'center',gap:8,background:GR,color:'#fff',padding:'13px 28px',borderRadius:12,fontWeight:800,fontSize:14,textDecoration:'none' }}>Start Free →</Link>
              <Link to="/products" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.18)',padding:'13px 20px',borderRadius:12,fontWeight:700,fontSize:14,textDecoration:'none' }}>← All Products</Link>
            </div>
          </div>
          <div className="mkt-reveal" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            {[
              { n:'Real-time', l:'analytics — no manual reporting, ever', c:'#059669' },
              { n:'One view', l:'across all recruiters, all roles, all pipelines', c:'#0891B2' },
              { n:'Automated', l:'pre-boarding from the moment someone is hired', c:'#7c3aed' },
              { n:'Digital', l:'offer letters signed in under 10 minutes', c:'#F59E0B' },
            ].map(s => (
              <div key={s.n} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'18px 16px' }}>
                <div style={{ fontSize:18,fontWeight:900,color:s.c,marginBottom:4 }}>{s.n}</div>
                <div style={{ fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.5 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRE-BOARDING FLOW */}
      <section style={{ padding:'clamp(32px,4vw,48px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)', borderBottom:'1px solid var(--mkt-card-border)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',textAlign:'center' }}>
          <div className="mkt-reveal" style={{ fontSize:13,fontWeight:700,color:AC,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:14 }}>The hiring-to-onboarding flow you manage</div>
          <div style={{ display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8 }}>
            {['Candidate Hired','Checklist Auto-Created','Docs Uploaded','HR Verifies','Offer Letter Sent','Candidate Signs','Day 1 Ready'].map((step,i) => (
              <div key={step} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ background:i===6?GR:`rgba(5,150,105,${0.1+i*0.04})`,border:i===6?'none':`1px solid rgba(5,150,105,${0.2+i*0.05})`,borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700,color:i===6?'#fff':'var(--mkt-text-heading)',whiteSpace:'nowrap' }}>{step}</span>
                {i<6 && <span style={{ color:'var(--mkt-text-muted)',fontSize:13 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE SECTIONS */}
      <section style={{ padding:'clamp(56px,8vw,88px) clamp(16px,5vw,80px)', background:'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          {SECTIONS.map((sec, si) => (
            <div key={sec.heading} style={{ marginBottom: si < SECTIONS.length-1 ? 56 : 0 }}>
              <h2 className="mkt-reveal" style={{ fontSize:'clamp(18px,2.5vw,24px)',fontWeight:900,color:'var(--mkt-text-heading)',margin:'0 0 24px',letterSpacing:'-0.02em' }}>{sec.heading}</h2>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16 }}>
                {sec.items.map((item,i) => (
                  <div key={item.name} className="mkt-reveal" style={{ display:'flex',gap:14,padding:'18px 20px',background:'var(--mkt-card-bg)',border:'1px solid var(--mkt-card-border)',borderRadius:14,animationDelay:`${i*0.04}s`,transition:'all 0.2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(5,150,105,0.35)';e.currentTarget.style.transform='translateY(-2px)';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--mkt-card-border)';e.currentTarget.style.transform='none';}}>
                    <span style={{ fontSize:22,flexShrink:0,marginTop:2 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize:14,fontWeight:800,color:'var(--mkt-text-heading)',marginBottom:5 }}>{item.name}</div>
                      <div style={{ fontSize:12,color:'var(--mkt-text-secondary)',lineHeight:1.6 }}>{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'clamp(56px,7vw,88px) clamp(16px,5vw,80px)', background:GR, textAlign:'center' }}>
        <div style={{ maxWidth:580,margin:'0 auto' }}>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(24px,3.5vw,42px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>Run HR without the chaos.</h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.75)',fontSize:15,margin:'0 0 28px',lineHeight:1.7 }}>PeopleDesk is live the moment you log in. Everything is set up automatically based on your org.</p>
          <Link to="/login" style={{ background:'#fff',color:AC,padding:'13px 30px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none',display:'inline-block' }}>Open PeopleDesk →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
