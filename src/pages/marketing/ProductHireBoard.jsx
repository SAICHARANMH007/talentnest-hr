import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';
import useSEO from '../../hooks/useSEO.js';
import { PipelineBoardIllustration, VideoInterviewIllustration, JobAnalyticsIllustration, EnterpriseControlIllustration } from '../../components/marketing/Illustrations.jsx';

const ff  = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const AC  = '#0176D3';
const GR  = 'linear-gradient(135deg,#0176D3,#00C2CB)';

const SECTIONS = [
  {
    heading: '🗂️ Pipeline & Candidate Management',
    items: [
      { icon:'📊', name:'Visual pipeline board', detail:'Every candidate in one view — Applied, Screening, Shortlisted, Interview R1, Interview R2, Offer, Hired, Rejected. Change a stage with one click.' },
      { icon:'🎯', name:'Advanced Match Score on every candidate', detail:'Weighted scoring across skills, experience, and location before you even open a profile. Sort by match to call the best fits first.' },
      { icon:'🏊', name:'Talent pool', detail:'Candidate is great but not right for this role? Move them to the Talent Pool. They stay searchable and ready to be re-engaged when the right role opens.' },
      { icon:'📋', name:'Assigned candidates', detail:'See all candidates specifically assigned to you by your admin. Never lose track of who you are responsible for.' },
      { icon:'📁', name:'Full candidate profiles', detail:'Name, phone, email, skills, experience, CTC, notice period, LinkedIn, resume, video resume, work history, certifications — editable from the pipeline card.' },
    ],
  },
  {
    heading: '💬 Communication & Calling',
    items: [
      { icon:'💬', name:'Real-time chat with candidates', detail:'Open a chat thread with any candidate directly inside the platform. Messages, files, and call history all in one thread — no WhatsApp needed for follow-ups.' },
      { icon:'📞', name:'Voice calls to candidates', detail:'Call any candidate directly from their profile. They hear a ring on their TalentNest account and accept — no phone number sharing, no spam call risk.' },
      { icon:'📹', name:'Video interview rooms', detail:'Schedule an interview and a unique HD video room is created automatically. You and the candidate both click one link — no Zoom, no Google Meet required.' },
      { icon:'📲', name:'Auto WhatsApp + email on every stage move', detail:'Every time you move a candidate — shortlisted, interview scheduled, offer sent — they get an automatic WhatsApp message and email. Zero manual follow-up.' },
      { icon:'📤', name:'Bulk WhatsApp campaigns', detail:'Send a WhatsApp message to hundreds of candidates in one action — for event invites, job openings, or re-engagement campaigns.' },
    ],
  },
  {
    heading: '📅 Interviews & Offers',
    items: [
      { icon:'📅', name:'Interview scheduling with calendar invites', detail:'Pick a slot — an iCal (.ics) invite fires to the candidate and interviewer automatically. Works with Google Calendar, Outlook, and Apple Calendar.' },
      { icon:'✉️', name:'Candidate invite flow', detail:'Send a formal invite to any candidate for a specific role. They receive it by email and click Interested or Not Interested. Their response adds them to your pipeline automatically.' },
      { icon:'📜', name:'Digital offer letter + e-signature', detail:'Generate a branded offer letter from candidate data. The candidate signs digitally with their name — IP and timestamp captured. Signed PDF auto-generated.' },
      { icon:'🏆', name:'Interview scorecards', detail:'Submit structured feedback after each interview round — technical score, communication, problem-solving, culture fit, recommendation. Visible to the hiring team.' },
    ],
  },
  {
    heading: '📊 Jobs, Assessments & Analytics',
    items: [
      { icon:'💼', name:'Post and manage jobs', detail:'Create jobs with title, skills, salary, urgency, work mode, screening questions, and external careers URL. Publish to the job board instantly.' },
      { icon:'🧩', name:'Screening assessments', detail:'Create skills-based assessments for any job role. Candidates complete them at application time. You review scores and responses in the platform.' },
      { icon:'📈', name:'Recruiter analytics + leaderboard', detail:'Time-in-stage per role, candidate drop-off points, which job boards convert best, and a live leaderboard showing which recruiter closes fastest.' },
      { icon:'📤', name:'Outreach tracker', detail:'Log every email, call, and message to a candidate. Full outreach history per candidate so your team never duplicates contact.' },
      { icon:'⬇️', name:'Export pipeline to Excel', detail:'One click — every candidate, every role, every contact detail, every stage — exported to a formatted Excel sheet.' },
      { icon:'🔗', name:'Job distribution', detail:'Distribute job postings to external job boards and track performance per channel — see which source sends the most applications.' },
    ],
  },
  {
    heading: '🛡️ Compliance & Enterprise Controls',
    items: [
      { icon:'🏅', name:'BGV Tracking & Verification', detail:'Send background verification requests to candidates. Track status of identity, address, and employment checks directly in their profile.' },
      { icon:'⚙️', name:'Custom fields & configurations', detail:'Define custom fields for candidates and jobs that match your specific industry needs. Full control over data capture.' },
      { icon:'👥', name:'Hiring Manager & Client sharing', detail:'Share specific candidate profiles or shortlists with external Hiring Managers or Clients for feedback without giving them full platform access.' },
      { icon:'🔒', name:'Granular role-based access', detail:'Define exactly what recruiters, admins, and partners can see and do. Protect sensitive PII with precision permissioning.' },
      { icon:'📝', name:'Full audit logging', detail:'Every action — from stage moves to data exports — is logged with timestamp and user ID for complete transparency and compliance.' },
    ],
  },
];

const SECTION_ILLUSTRATIONS = {
  '📅 Interviews & Offers': VideoInterviewIllustration,
  '📊 Jobs, Assessments & Analytics': JobAnalyticsIllustration,
  '🛡️ Compliance & Enterprise Controls': EnterpriseControlIllustration,
};

export default function ProductHireBoard() {
  useMarketingTheme();
  useSEO({
    title: 'HireBoard — Recruitment Workspace for Recruiters | TalentNest HR',
    description: 'HireBoard is the all-in-one recruitment workspace — visual pipeline board, smart match scores, integrated chat & video interviews, and one-click digital offer letters.',
    path: '/products/hireboard',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'HireBoard',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      brand: { '@type': 'Brand', name: 'TalentNest HR' },
      description: 'HireBoard is the all-in-one recruitment workspace for recruiters — visual pipeline board, smart match scores, integrated chat, calling, video interviews, and digital offer letters.',
      url: 'https://www.talentnesthr.com/products/hireboard',
    },
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
      <section style={{ background:'linear-gradient(160deg,#020817,#012456,#001e3c)', padding:'clamp(110px,14vw,150px) clamp(16px,5vw,80px) clamp(64px,8vw,96px)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:'-15%',right:'5%',width:'500px',height:'500px',borderRadius:'50%',background:'radial-gradient(circle,rgba(1,118,211,0.18),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ maxWidth:1100,margin:'0 auto',position:'relative' }} className="tn-prod-grid">
          <div>
            <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#7DD3FC',background:'rgba(1,118,211,0.15)',border:'1px solid rgba(1,118,211,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:22 }}>
              For Recruiters & Talent Teams
            </span>
            <h1 className="mkt-reveal" style={{ fontSize:'clamp(34px,5.5vw,62px)',fontWeight:900,color:'#fff',letterSpacing:'-0.04em',lineHeight:1.06,margin:'0 0 18px' }}>
              HireBoard
            </h1>
            <p className="mkt-reveal" style={{ fontSize:'clamp(15px,1.6vw,18px)',color:'rgba(255,255,255,0.65)',lineHeight:1.75,margin:'0 0 14px',maxWidth:520 }}>
              Your complete recruitment workspace — pipeline, chat, calls, interviews, assessments, and offers — all in one screen.
            </p>
            <p className="mkt-reveal" style={{ fontSize:'clamp(13px,1.3vw,15px)',color:'rgba(255,255,255,0.45)',lineHeight:1.7,margin:'0 0 32px',maxWidth:500 }}>
              Recruiters on TalentNest never need to leave HireBoard to do their job. Source, communicate, screen, schedule, interview, and close — it's all here.
            </p>
            <div className="mkt-reveal" style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              <Link to="/login" style={{ display:'inline-flex',alignItems:'center',gap:8,background:GR,color:'#fff',padding:'13px 28px',borderRadius:12,fontWeight:800,fontSize:14,textDecoration:'none' }}>Start Free →</Link>
              <Link to="/products" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.18)',padding:'13px 20px',borderRadius:12,fontWeight:700,fontSize:14,textDecoration:'none' }}>← All Products</Link>
            </div>
          </div>
          {/* Stats block */}
          <div className="mkt-reveal">
            <PipelineBoardIllustration style={{ width:'100%', maxWidth:360, height:'auto', display:'block', margin:'0 auto 16px' }} />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
              {[
                { n:'5 days', l:'average time to shortlist vs 45-day industry average', c:'#0176D3' },
                { n:'Zero', l:'extra tools — pipeline, chat, calls, and offers in one place', c:'#00C2CB' },
                { n:'Auto', l:'WhatsApp + email on every candidate stage move', c:'#7c3aed' },
                { n:'1 click', l:'interview scheduling with video room + calendar invite', c:'#059669' },
              ].map(s => (
                <div key={s.n} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'18px 16px' }}>
                  <div style={{ fontSize:20,fontWeight:900,color:s.c,marginBottom:4 }}>{s.n}</div>
                  <div style={{ fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.5 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PIPELINE STAGES */}
      <section style={{ padding:'clamp(36px,5vw,56px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)', borderBottom:'1px solid var(--mkt-card-border)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',textAlign:'center' }}>
          <div className="mkt-reveal" style={{ fontSize:13,fontWeight:700,color:AC,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:14 }}>The pipeline you manage</div>
          <div style={{ display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8 }}>
            {[['Applied','#94A3B8'],['Screening','#F59E0B'],['Shortlisted','#0176D3'],['Interview R1','#7c3aed'],['Interview R2','#6d28d9'],['Offer','#059669'],['Hired','#10B981'],['Rejected','#EF4444']].map(([s,c]) => (
              <span key={s} style={{ background:`${c}14`,color:c,border:`1.5px solid ${c}28`,borderRadius:100,padding:'6px 14px',fontSize:12,fontWeight:700,whiteSpace:'nowrap' }}>{s}</span>
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
              {SECTION_ILLUSTRATIONS[sec.heading] && (() => { const SecIll = SECTION_ILLUSTRATIONS[sec.heading]; return <SecIll style={{ width:'100%', maxWidth:280, height:'auto', display:'block', margin:'0 auto 24px' }} />; })()}
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16 }}>
                {sec.items.map((item,i) => (
                  <div key={item.name} className="mkt-reveal" style={{ display:'flex',gap:14,padding:'18px 20px',background:'var(--mkt-card-bg)',border:'1px solid var(--mkt-card-border)',borderRadius:14,animationDelay:`${i*0.04}s`,transition:'all 0.2s' }}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=`rgba(1,118,211,0.35)`;e.currentTarget.style.transform='translateY(-2px)';}}
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
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(24px,3.5vw,42px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>Start hiring faster today.</h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.75)',fontSize:15,margin:'0 0 28px',lineHeight:1.7 }}>Log in to TalentNest HR and your HireBoard is ready. No setup. No training. Live in minutes.</p>
          <Link to="/login" style={{ background:'#fff',color:AC,padding:'13px 30px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none',display:'inline-block' }}>Open HireBoard →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
