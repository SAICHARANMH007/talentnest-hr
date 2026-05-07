import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const A  = '#0176D3';
const G  = 'linear-gradient(135deg,#0176D3,#00C2CB)';

// What a recruiter can actually do inside the platform — based on real code
const WHAT_YOU_CAN_DO = [
  { icon:'🗂️', action:'Manage your pipeline board', detail:'See every candidate per stage — Applied, Screening, Shortlisted, Interview R1, Interview R2, Offer, Hired, Rejected — in one view. Change a candidate\'s stage with one click.' },
  { icon:'🤖', action:'See AI match scores on every candidate', detail:'Every candidate gets a weighted match score against the job requirements before you even open their profile. Sort by score to call the best fits first.' },
  { icon:'📹', action:'Schedule and run interviews inside the platform', detail:'Pick a slot — HireBoard generates a unique video room link and sends it to the candidate via email and WhatsApp automatically. You interview directly in-platform. No Zoom needed.' },
  { icon:'📲', action:'Let the system follow up for you', detail:'Every stage move triggers an automatic WhatsApp + email to the candidate. Shortlisted? They know. Interview confirmed? They know. You stop writing follow-up emails.' },
  { icon:'✉️', action:'Invite candidates directly to a role', detail:'Send a formal invite to any candidate in the database. They receive an email with the role details and an "Interested / Not Interested" button. Their response moves them into your pipeline automatically.' },
  { icon:'🏊', action:'Park candidates in the Talent Pool', detail:'A candidate is good but not right for this role? Move them to the Talent Pool. They stay visible, searchable, and ready to be re-engaged when the right role opens.' },
  { icon:'📊', action:'See your pipeline numbers and recruiter leaderboard', detail:'How many candidates at each stage? Which recruiter is moving fastest? How many roles are active? The analytics update in real time — no manual reporting.' },
  { icon:'⬇️', action:'Export your pipeline to Excel', detail:'One click — every candidate, every role, every stage, every contact detail — exported to a formatted Excel sheet for sharing with leadership or clients.' },
  { icon:'📋', action:'Add and manage jobs', detail:'Create a job posting with title, department, skills, salary, urgency, screening questions, and an external careers URL. Assign recruiters. The job appears on the public job board immediately.' },
  { icon:'👤', action:'View and edit every candidate\'s full profile', detail:'Name, phone, email, skills, experience, CTC, notice period, LinkedIn, resume, video resume, work history, certifications — all in one place. Editable from the pipeline card.' },
];

export default function ProductHireBoard() {
  useMarketingTheme();
  useEffect(() => {
    document.title = 'HireBoard — For Recruiters | TalentNest HR';
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
        <div style={{ position:'absolute',top:'-15%',left:'50%',transform:'translateX(-50%)',width:'600px',height:'600px',borderRadius:'50%',background:'radial-gradient(circle,rgba(1,118,211,0.18),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ position:'relative',maxWidth:780,margin:'0 auto' }}>
          <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#7DD3FC',background:'rgba(1,118,211,0.15)',border:'1px solid rgba(1,118,211,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:24 }}>
            For Recruiters & Talent Teams
          </span>
          <h1 className="mkt-reveal" style={{ fontSize:'clamp(36px,6vw,68px)', fontWeight:900, color:'#fff', letterSpacing:'-0.04em', lineHeight:1.06, margin:'0 0 20px' }}>
            HireBoard
          </h1>
          <p className="mkt-reveal" style={{ fontSize:'clamp(18px,2.2vw,22px)', color:'rgba(255,255,255,0.6)', fontWeight:400, margin:'0 0 12px', lineHeight:1.4 }}>
            Your recruitment pipeline, from first application to signed offer — in one place.
          </p>
          <p className="mkt-reveal" style={{ fontSize:'clamp(14px,1.5vw,16px)', color:'rgba(255,255,255,0.5)', margin:'0 0 36px', lineHeight:1.7, maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            Recruiters on TalentNest manage their entire hiring workflow inside HireBoard — sourcing, screening, scheduling, interviewing, and offering. No spreadsheets. No separate tools. Every candidate, every role, every update in one board.
          </p>
          <div className="mkt-reveal" style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/login" style={{ background:G,color:'#fff',padding:'13px 30px',borderRadius:12,fontWeight:800,fontSize:14,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8 }}>Start Free →</Link>
            <Link to="/products" style={{ background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.18)',padding:'13px 22px',borderRadius:12,fontWeight:700,fontSize:14,textDecoration:'none' }}>← All Products</Link>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN DO */}
      <section style={{ padding:'clamp(64px,8vw,96px) clamp(16px,5vw,80px)', background:'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div className="mkt-reveal" style={{ marginBottom:12 }}>
            <span style={{ fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:A }}>What you can do inside HireBoard</span>
          </div>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(26px,3.5vw,42px)',fontWeight:900,color:'var(--mkt-text-heading)',letterSpacing:'-0.03em',margin:'0 0 48px',lineHeight:1.15 }}>
            Every action a recruiter takes,<br />built into one platform.
          </h2>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20 }}>
            {WHAT_YOU_CAN_DO.map((item,i) => (
              <div key={item.action} className="mkt-reveal" style={{ display:'flex',gap:14,padding:'20px 22px',background:'var(--mkt-card-bg)',border:'1px solid var(--mkt-card-border)',borderRadius:16,animationDelay:`${i*0.04}s`,transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(1,118,211,0.35)';e.currentTarget.style.transform='translateY(-2px)';}}
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

      {/* STAGES VISUAL */}
      <section style={{ padding:'clamp(48px,6vw,80px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',textAlign:'center' }}>
          <h3 className="mkt-reveal" style={{ fontSize:'clamp(22px,3vw,36px)',fontWeight:900,color:'var(--mkt-text-heading)',margin:'0 0 12px',letterSpacing:'-0.02em' }}>
            The pipeline stages you manage
          </h3>
          <p className="mkt-reveal" style={{ color:'var(--mkt-text-muted)',fontSize:14,margin:'0 0 40px' }}>
            Candidates flow through these stages. You control every move.
          </p>
          <div className="mkt-reveal" style={{ display:'flex',alignItems:'center',gap:0,overflowX:'auto',padding:'8px 0',justifyContent:'center',flexWrap:'wrap',gap:8 }}>
            {[['Applied','#94A3B8'],['Screening','#F59E0B'],['Shortlisted','#0176D3'],['Interview R1','#7c3aed'],['Interview R2','#6d28d9'],['Offer','#059669'],['Hired','#10B981'],['Rejected','#EF4444']].map(([s,c]) => (
              <span key={s} style={{ background:`${c}15`,color:c,border:`1.5px solid ${c}30`,borderRadius:100,padding:'7px 16px',fontSize:13,fontWeight:700,whiteSpace:'nowrap' }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'clamp(64px,8vw,96px) clamp(16px,5vw,80px)', background:G, textAlign:'center' }}>
        <div style={{ maxWidth:600,margin:'0 auto' }}>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>
            Start recruiting smarter today.
          </h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.75)',fontSize:15,margin:'0 0 32px',lineHeight:1.7 }}>
            Log in to TalentNest HR and your HireBoard is ready. No setup. No training. You're live in minutes.
          </p>
          <Link to="/login" style={{ background:'#fff',color:A,padding:'14px 32px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none',display:'inline-block' }}>
            Open HireBoard →
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
