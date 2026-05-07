import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const A  = '#059669';
const G  = 'linear-gradient(135deg,#059669,#0891B2)';

// What an admin/HR manager can actually do — based on real platform code
const WHAT_YOU_CAN_DO = [
  { icon:'📊', action:'See your org\'s full hiring analytics', detail:'Applications by stage, source breakdown (career page vs LinkedIn vs invite), recruiter performance, fill rate, time-in-stage, top-performing jobs — all in one dashboard. Updated in real time.' },
  { icon:'👥', action:'Manage all your recruiters', detail:'Create recruiter accounts, assign them to specific jobs, set role-based access, and track each recruiter\'s pipeline from your admin view. You see everything they see, plus more.' },
  { icon:'💼', action:'Post and manage jobs', detail:'Create job postings with full details — title, skills, salary, urgency, screening questions, work mode, external careers URL. Publish to your org\'s career page. Manage active, draft, and closed roles.' },
  { icon:'🌐', action:'Get your own branded career page', detail:'Every org on TalentNest HR gets a public career page at talentnesthr.com/[your-org]/careers. You choose which jobs appear on it. The page can be embedded on your own website with one line of code.' },
  { icon:'📋', action:'Manage pre-boarding for every new hire', detail:'When a candidate is hired, a pre-boarding checklist is created automatically — Aadhaar, PAN, salary slips, experience letters, background verification consent, IT setup, orientation. You track who has submitted what, in real time.' },
  { icon:'✅', action:'Verify background documents', detail:'When candidates upload documents (Aadhaar, PAN, salary slips, etc.), you review and verify each one. Accept, reject, or request resubmission — all from the admin panel with notes sent back to the candidate.' },
  { icon:'📜', action:'Create and send offer letters', detail:'Generate a branded offer letter with the candidate\'s name, designation, CTC, joining date, and company details. Send it digitally. The candidate signs it electronically. The signed PDF is stored on the platform.' },
  { icon:'🔔', action:'Receive candidate request submissions', detail:'As a client org, you can submit staffing requests to TalentNest HR. When TalentNest assigns candidates to your request, you see their profiles and receive a notification immediately.' },
  { icon:'🏢', action:'Manage organisation settings', detail:'Update your org name, logo, domain, plan, and team. Upload a custom logo that shows across your career page and offer letters. All branding is your own.' },
  { icon:'📈', action:'Track all applications across all jobs', detail:'See every application across every job in your org — who applied, when, from which source, and where they are in the pipeline. Filter, sort, and export to Excel.' },
  { icon:'📄', action:'Run onboarding for hired candidates', detail:'The admin onboarding section shows all active pre-boarding records. See which documents are verified, which are pending, and which candidates are fully ready for Day 1. Start BVD checks from here.' },
  { icon:'🔐', action:'Invite and manage team members securely', detail:'All accounts are created via secure invite link. You invite a recruiter, they set their own password. No plain-text passwords ever sent. Inactive accounts show a Resend Invite button.' },
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
      <section style={{ background:'linear-gradient(160deg,#020817,#064e3b,#022c22)', padding:'clamp(110px,14vw,150px) clamp(16px,5vw,80px) clamp(64px,8vw,96px)', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:'-10%',left:'50%',transform:'translateX(-50%)',width:'600px',height:'600px',borderRadius:'50%',background:'radial-gradient(circle,rgba(5,150,105,0.2),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ position:'relative',maxWidth:780,margin:'0 auto' }}>
          <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6EE7B7',background:'rgba(5,150,105,0.15)',border:'1px solid rgba(5,150,105,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:24 }}>
            For HR Admins & Org Managers
          </span>
          <h1 className="mkt-reveal" style={{ fontSize:'clamp(36px,6vw,68px)', fontWeight:900, color:'#fff', letterSpacing:'-0.04em', lineHeight:1.06, margin:'0 0 20px' }}>
            PeopleDesk
          </h1>
          <p className="mkt-reveal" style={{ fontSize:'clamp(18px,2.2vw,22px)', color:'rgba(255,255,255,0.6)', fontWeight:400, margin:'0 0 12px', lineHeight:1.4 }}>
            Full HR control — from job posting to Day 1 — in one dashboard.
          </p>
          <p className="mkt-reveal" style={{ fontSize:'clamp(14px,1.5vw,16px)', color:'rgba(255,255,255,0.5)', margin:'0 0 36px', lineHeight:1.7, maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            HR admins and org managers use PeopleDesk to run everything above the recruiter level — analytics, team management, offer letters, pre-boarding verification, and org settings. One dashboard. Total visibility.
          </p>
          <div className="mkt-reveal" style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/login" style={{ background:G,color:'#fff',padding:'13px 30px',borderRadius:12,fontWeight:800,fontSize:14,textDecoration:'none' }}>Start Free →</Link>
            <Link to="/products" style={{ background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.18)',padding:'13px 22px',borderRadius:12,fontWeight:700,fontSize:14,textDecoration:'none' }}>← All Products</Link>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN DO */}
      <section style={{ padding:'clamp(64px,8vw,96px) clamp(16px,5vw,80px)', background:'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div className="mkt-reveal" style={{ marginBottom:12 }}>
            <span style={{ fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:A }}>What you can do inside PeopleDesk</span>
          </div>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(26px,3.5vw,42px)',fontWeight:900,color:'var(--mkt-text-heading)',letterSpacing:'-0.03em',margin:'0 0 48px',lineHeight:1.15 }}>
            Everything HR runs,<br />organised in one place.
          </h2>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20 }}>
            {WHAT_YOU_CAN_DO.map((item,i) => (
              <div key={item.action} className="mkt-reveal" style={{ display:'flex',gap:14,padding:'20px 22px',background:'var(--mkt-card-bg)',border:'1px solid var(--mkt-card-border)',borderRadius:16,animationDelay:`${i*0.04}s`,transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(5,150,105,0.35)';e.currentTarget.style.transform='translateY(-2px)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--mkt-card-border)';e.currentTarget.style.transform='none';}}>
                <span style={{ fontSize:24,flexShrink:0,marginTop:2 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize:14,fontWeight:800,color:'var(--mkt-text-heading)',marginBottom:6 }}>{item.action}</div>
                  <div style={{ fontSize:13,color:'var(--mkt-text-secondary)',lineHeight:1.6 }}>{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRE-BOARDING FLOW */}
      <section style={{ padding:'clamp(48px,6vw,80px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)' }}>
        <div style={{ maxWidth:900,margin:'0 auto',textAlign:'center' }}>
          <h3 className="mkt-reveal" style={{ fontSize:'clamp(22px,3vw,36px)',fontWeight:900,color:'var(--mkt-text-heading)',margin:'0 0 12px',letterSpacing:'-0.02em' }}>
            The pre-boarding flow you manage
          </h3>
          <p className="mkt-reveal" style={{ color:'var(--mkt-text-muted)',fontSize:14,margin:'0 0 40px' }}>
            From hire to Day 1 — every step tracked in PeopleDesk.
          </p>
          <div className="mkt-reveal" style={{ display:'flex',flexWrap:'wrap',justifyContent:'center',gap:12 }}>
            {['Candidate Hired','Pre-boarding Created','Docs Uploaded by Candidate','HR Verifies Documents','Offer Letter Generated','Candidate Signs Offer','Day 1 Ready'].map((step,i) => (
              <div key={step} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ background:i===6?G:`rgba(5,150,105,${0.1+i*0.04})`,border:`1.5px solid rgba(5,150,105,${0.2+i*0.05})`,borderRadius:10,padding:'8px 14px',fontSize:12,fontWeight:700,color:i===6?'#fff':'var(--mkt-text-heading)',whiteSpace:'nowrap' }}>
                  {step}
                </div>
                {i<6 && <span style={{ color:'var(--mkt-text-muted)',fontSize:14 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'clamp(64px,8vw,96px) clamp(16px,5vw,80px)', background:G, textAlign:'center' }}>
        <div style={{ maxWidth:600,margin:'0 auto' }}>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>
            Run HR without the chaos.
          </h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.75)',fontSize:15,margin:'0 0 32px',lineHeight:1.7 }}>
            PeopleDesk is live the moment you log in. Analytics, team, jobs, pre-boarding — all set up automatically.
          </p>
          <Link to="/login" style={{ background:'#fff',color:A,padding:'14px 32px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none',display:'inline-block' }}>
            Open PeopleDesk →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
