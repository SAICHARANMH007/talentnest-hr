import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';
import { CampusHubIllustration } from '../../components/marketing/Illustrations.jsx';
import useSEO from '../../hooks/useSEO.js';

const ff  = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const AC  = '#F59E0B';
const GR  = 'linear-gradient(135deg,#F59E0B,#EA580C)';

const SECTIONS = [
  {
    heading: '🎓 Student & Talent Pool Management',
    items: [
      { icon:'📥', name:'Bulk add candidates', detail:'Add your entire student roster in one go — no need for every student to register individually before they can be tracked for placements.' },
      { icon:'🧑‍🎓', name:'Student directory', detail:'See every student linked to your college — profile, skills, education history, and current placement status — in one searchable list.' },
      { icon:'📇', name:'Placement records', detail:'Track every registration against every drive — who applied, who was shortlisted, selected, or rejected — across companies and drive types.' },
      { icon:'🏅', name:'Verified student profiles', detail:'Students who complete TalentNest identity verification carry a Verified Candidate badge — giving your placement cell and recruiting companies trusted, fraud-resistant placement records.' },
      { icon:'📈', name:'Skill-gap recommendations', detail:'See which in-demand skills your students are missing compared to active jobs platform-wide, with suggested courses to close the gap.' },
    ],
  },
  {
    heading: '📣 Placement Drives, Internships & Exams',
    items: [
      { icon:'🎯', name:'Create placement drives', detail:'Publish on-campus or virtual placement drives with company name (autocomplete from verified employers), role details, mode, location, and date.' },
      { icon:'💼', name:'Internship & exam listings', detail:'Beyond placements, list internships and exams/tests (e.g. TCS NQT) with registration links and linked assessments for students to take directly on the platform.' },
      { icon:'✅', name:'Eligibility & registrations', detail:'Students see only drives they\'re eligible for, register in one click, and you track registration status for every opportunity you post.' },
      { icon:'📡', name:'Auto-published to your community', detail:'Every drive you create automatically appears in your college\'s official community feed under Placement Drives — no separate announcement needed.' },
    ],
  },
  {
    heading: '🏘️ College Community & Career Network',
    items: [
      { icon:'🏛️', name:'Official college community', detail:'Your college gets an auto-created community space where current students and alumni connect, see updates, and discuss opportunities.' },
      { icon:'💬', name:'Career community feed', detail:'Post announcements, tips, and updates to your students — Hiring, Tips, Questions, Wins, Resources, Milestones and News, all in one feed.' },
      { icon:'🤝', name:'My Network', detail:'Build a network across students, alumni, recruiters and companies hiring from your campus — staying connected long after placement season.' },
      { icon:'⭐', name:'Company reviews', detail:'See honest reviews and interview experiences shared by your students about the companies that visit your campus.' },
    ],
  },
  {
    heading: '⚙️ Dashboard, Branding & Profile',
    items: [
      { icon:'📈', name:'Placement overview dashboard', detail:'A real-time summary of your students, active drives, registrations, and placement outcomes for the current year.' },
      { icon:'🏢', name:'Org settings & branding', detail:'Manage your college\'s name and branding as it appears across the platform and in your official community.' },
      { icon:'👤', name:'Placement officer profile', detail:'Maintain your own profile so recruiters and students know who\'s running placements at your campus.' },
    ],
  },
];

export default function ProductCampusHub() {
  useMarketingTheme();
  useSEO({
    title: 'CampusHub — Campus Placement Portal | TalentNest HR',
    description: 'CampusHub helps placement officers run campus recruitment — bulk student onboarding, placement drives with verified employers, internships, exams, and skill-gap insights.',
    path: '/products/campushub',
  });
  useEffect(() => {
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
      <section style={{ background:'linear-gradient(160deg,#020817,#451a03,#1c0a00)', padding:'clamp(110px,14vw,150px) clamp(16px,5vw,80px) clamp(64px,8vw,96px)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:'-10%',right:'5%',width:'500px',height:'500px',borderRadius:'50%',background:'radial-gradient(circle,rgba(245,158,11,0.2),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ maxWidth:1100,margin:'0 auto',position:'relative' }} className="tn-prod-grid">
          <div>
            <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#FCD34D',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:22 }}>
              For Placement Officers & Colleges
            </span>
            <h1 className="mkt-reveal" style={{ fontSize:'clamp(34px,5.5vw,62px)',fontWeight:900,color:'#fff',letterSpacing:'-0.04em',lineHeight:1.06,margin:'0 0 18px' }}>
              CampusHub
            </h1>
            <p className="mkt-reveal" style={{ fontSize:'clamp(15px,1.6vw,18px)',color:'rgba(255,255,255,0.65)',lineHeight:1.75,margin:'0 0 14px',maxWidth:520 }}>
              Run placements for your entire campus — students, drives, internships, exams, and your college's career community — from one dashboard.
            </p>
            <p className="mkt-reveal" style={{ fontSize:'clamp(13px,1.3vw,15px)',color:'rgba(255,255,255,0.45)',lineHeight:1.7,margin:'0 0 32px',maxWidth:500 }}>
              Add your student roster, publish placement drives with verified companies, and watch every update flow straight into your official college community — automatically.
            </p>
            <div className="mkt-reveal" style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              <Link to="/login" style={{ display:'inline-flex',alignItems:'center',gap:8,background:GR,color:'#fff',padding:'13px 28px',borderRadius:12,fontWeight:800,fontSize:14,textDecoration:'none' }}>Start Free →</Link>
              <Link to="/products" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.18)',padding:'13px 20px',borderRadius:12,fontWeight:700,fontSize:14,textDecoration:'none' }}>← All Products</Link>
            </div>
          </div>
          <div className="mkt-reveal">
            <CampusHubIllustration style={{ width:'100%', maxWidth:380, height:'auto', display:'block', margin:'0 auto' }} />
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section style={{ padding:'clamp(32px,4vw,48px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)', borderBottom:'1px solid var(--mkt-card-border)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',textAlign:'center' }}>
          <div className="mkt-reveal" style={{ fontSize:13,fontWeight:700,color:AC,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:14 }}>From roster to result, in your community</div>
          <div style={{ display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8 }}>
            {['Add Students','Publish Drive','Students Register','Track Status','Posted to Community','Placement Outcome'].map((step,i) => (
              <div key={step} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ background:i===5?GR:`rgba(245,158,11,${0.1+i*0.04})`,border:i===5?'none':`1px solid rgba(245,158,11,${0.2+i*0.05})`,borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700,color:i===5?'#fff':'var(--mkt-text-heading)',whiteSpace:'nowrap' }}>{step}</span>
                {i<5 && <span style={{ color:'var(--mkt-text-muted)',fontSize:13 }}>→</span>}
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
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(245,158,11,0.35)';e.currentTarget.style.transform='translateY(-2px)';}}
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
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(24px,3.5vw,42px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>Bring your placement cell online.</h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.8)',fontSize:15,margin:'0 0 28px',lineHeight:1.7 }}>CampusHub is ready the moment you log in — add your students and publish your first drive today.</p>
          <Link to="/login" style={{ background:'#fff',color:AC,padding:'13px 30px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none',display:'inline-block' }}>Open CampusHub →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
