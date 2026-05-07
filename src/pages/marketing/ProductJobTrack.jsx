import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';

const ff = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const A  = '#7c3aed';
const G  = 'linear-gradient(135deg,#7c3aed,#0176D3)';

// What a candidate can actually do — based on real platform code
const WHAT_YOU_CAN_DO = [
  { icon:'🔍', action:'Browse jobs from all companies on the platform', detail:'See all active job postings from every organisation on TalentNest HR — IT, non-IT, startups, corporates. Filter by role, type, location, urgency, and work mode. Apply directly from the listing.' },
  { icon:'🤖', action:'See your AI match score before you apply', detail:'Every job shows your match score — how well your profile fits the role based on your skills, experience, and location. Know your fit before you spend time applying.' },
  { icon:'📋', action:'Track every application you\'ve submitted', detail:'Applied, Screening, Shortlisted, Interview Scheduled, Interview Completed, Offer Extended, Hired, Rejected — see exactly where each of your applications stands, updated in real time.' },
  { icon:'📅', action:'See your interview details the moment they\'re scheduled', detail:'When a recruiter schedules your interview, the date, time, format, and the video room join link appear in your application. No email digging. No "what\'s the link?" — it\'s right there.' },
  { icon:'📹', action:'Join your interview directly from the platform', detail:'Click the join link in your application — you\'re in the interview room. No Zoom account needed. No downloads. Works from your phone browser.' },
  { icon:'📜', action:'View and sign your offer letter digitally', detail:'When a company sends your offer, it appears in your TalentNest account. Read it, type your name, and submit. Your signature is captured with a timestamp. The signed PDF is saved and sent to you.' },
  { icon:'✅', action:'Complete your pre-boarding checklist', detail:'Once hired, a checklist appears in your Onboarding section — Aadhaar, PAN, salary slips, experience letter, background verification consent, bank details, IT setup tasks, and compliance training. Upload each document from your phone.' },
  { icon:'📬', action:'Respond to job invites from recruiters', detail:'Recruiters can invite you directly to a role. You receive the invite by email — click Interested or Not Interested. If you\'re interested, you\'re automatically added to their pipeline.' },
  { icon:'🔔', action:'Set up job alerts for roles you want', detail:'Tell the platform what roles, skills, and locations matter to you. When a matching job goes live, you get an alert. You don\'t need to check the board every day.' },
  { icon:'👤', action:'Build and maintain your candidate profile', detail:'Name, phone, email, current title, skills, experience, CTC, notice period, LinkedIn, resume upload, video resume. Recruiters search and shortlist from this profile — keep it complete.' },
  { icon:'📊', action:'See your full application history', detail:'Every job you\'ve applied to, with the current stage, the date you applied, the role details, and whether the recruiter has left any stage-specific notes visible to you.' },
  { icon:'📲', action:'Get WhatsApp and email updates automatically', detail:'Every time your application moves to a new stage — shortlisted, interview scheduled, offer extended — you receive a WhatsApp message and an email automatically. No more checking and wondering.' },
];

export default function ProductJobTrack() {
  useMarketingTheme();
  useEffect(() => {
    document.title = 'JobTrack — For Job Seekers | TalentNest HR';
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
      <section style={{ background:'linear-gradient(160deg,#020817,#1e1b4b,#0f0c29)', padding:'clamp(110px,14vw,150px) clamp(16px,5vw,80px) clamp(64px,8vw,96px)', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:'-10%',left:'50%',transform:'translateX(-50%)',width:'600px',height:'600px',borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.2),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ position:'relative',maxWidth:780,margin:'0 auto' }}>
          <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#C4B5FD',background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:24 }}>
            For Job Seekers & Candidates
          </span>
          <h1 className="mkt-reveal" style={{ fontSize:'clamp(36px,6vw,68px)', fontWeight:900, color:'#fff', letterSpacing:'-0.04em', lineHeight:1.06, margin:'0 0 20px' }}>
            JobTrack
          </h1>
          <p className="mkt-reveal" style={{ fontSize:'clamp(18px,2.2vw,22px)', color:'rgba(255,255,255,0.6)', fontWeight:400, margin:'0 0 12px', lineHeight:1.4 }}>
            Apply for jobs. Know where you stand. Sign your offer. All in one place.
          </p>
          <p className="mkt-reveal" style={{ fontSize:'clamp(14px,1.5vw,16px)', color:'rgba(255,255,255,0.5)', margin:'0 0 36px', lineHeight:1.7, maxWidth:560, marginLeft:'auto', marginRight:'auto' }}>
            JobTrack is the candidate side of TalentNest HR. Browse jobs from real companies, track every application in real time, attend interviews from your browser, and sign your offer letter from your phone — without creating 10 different accounts.
          </p>
          <div className="mkt-reveal" style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/login" style={{ background:G,color:'#fff',padding:'13px 30px',borderRadius:12,fontWeight:800,fontSize:14,textDecoration:'none' }}>Create Account →</Link>
            <Link to="/careers" style={{ background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.18)',padding:'13px 22px',borderRadius:12,fontWeight:700,fontSize:14,textDecoration:'none' }}>Browse Jobs</Link>
          </div>
          <div className="mkt-reveal" style={{ marginTop:8 }}>
            <Link to="/products" style={{ fontSize:13,color:'rgba(255,255,255,0.4)',textDecoration:'none',fontWeight:600 }}>← All Products</Link>
          </div>
        </div>
      </section>

      {/* WHAT YOU CAN DO */}
      <section style={{ padding:'clamp(64px,8vw,96px) clamp(16px,5vw,80px)', background:'var(--mkt-section-bg)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>
          <div className="mkt-reveal" style={{ marginBottom:12 }}>
            <span style={{ fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:A }}>What you can do inside JobTrack</span>
          </div>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(26px,3.5vw,42px)',fontWeight:900,color:'var(--mkt-text-heading)',letterSpacing:'-0.03em',margin:'0 0 48px',lineHeight:1.15 }}>
            Everything from your first application<br />to your first day.
          </h2>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20 }}>
            {WHAT_YOU_CAN_DO.map((item,i) => (
              <div key={item.action} className="mkt-reveal" style={{ display:'flex',gap:14,padding:'20px 22px',background:'var(--mkt-card-bg)',border:'1px solid var(--mkt-card-border)',borderRadius:16,animationDelay:`${i*0.04}s`,transition:'all 0.2s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,0.35)';e.currentTarget.style.transform='translateY(-2px)';}}
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

      {/* YOUR JOURNEY */}
      <section style={{ padding:'clamp(48px,6vw,80px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)' }}>
        <div style={{ maxWidth:900,margin:'0 auto',textAlign:'center' }}>
          <h3 className="mkt-reveal" style={{ fontSize:'clamp(22px,3vw,36px)',fontWeight:900,color:'var(--mkt-text-heading)',margin:'0 0 12px',letterSpacing:'-0.02em' }}>
            Your candidate journey on the platform
          </h3>
          <p className="mkt-reveal" style={{ color:'var(--mkt-text-muted)',fontSize:14,margin:'0 0 40px' }}>
            You see every stage of your application — live.
          </p>
          <div className="mkt-reveal" style={{ display:'flex',flexWrap:'wrap',justifyContent:'center',gap:10 }}>
            {[['Applied','#94A3B8'],['Screening','#F59E0B'],['Shortlisted','#0176D3'],['Interview Scheduled','#7c3aed'],['Offer Extended','#059669'],['Hired','#10B981']].map(([s,c],i) => (
              <div key={s} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ background:`${c}15`,color:c,border:`1.5px solid ${c}30`,borderRadius:100,padding:'7px 16px',fontSize:12,fontWeight:700,whiteSpace:'nowrap' }}>{s}</span>
                {i<5 && <span style={{ color:'var(--mkt-text-muted)' }}>→</span>}
              </div>
            ))}
          </div>
          <p className="mkt-reveal" style={{ marginTop:20,fontSize:13,color:'var(--mkt-text-muted)' }}>
            You get a WhatsApp + email notification every time your status changes.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding:'clamp(64px,8vw,96px) clamp(16px,5vw,80px)', background:G, textAlign:'center' }}>
        <div style={{ maxWidth:600,margin:'0 auto' }}>
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(26px,4vw,44px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>
            Stop guessing. Start tracking.
          </h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.75)',fontSize:15,margin:'0 0 32px',lineHeight:1.7 }}>
            Create your free account, build your profile, and every application you make is tracked — with updates sent to your phone the moment anything changes.
          </p>
          <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/login" style={{ background:'#fff',color:A,padding:'14px 32px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none',display:'inline-block' }}>
              Create Free Account →
            </Link>
            <Link to="/careers" style={{ background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',padding:'14px 24px',borderRadius:12,fontWeight:700,fontSize:15,textDecoration:'none' }}>
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
