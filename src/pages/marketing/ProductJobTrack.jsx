import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingNav from './MarketingNav.jsx';
import MarketingFooter from './MarketingFooter.jsx';
import { useMarketingTheme } from '../../context/MarketingThemeContext.jsx';
import { SearchTalentIllustration, ChatSupportIllustration, AnalyticsChartIllustration, IdentityCardIllustration, GrowthRocketIllustration } from '../../components/marketing/Illustrations.jsx';

const ff  = "'Plus Jakarta Sans','Segoe UI',sans-serif";
const AC  = '#7c3aed';
const GR  = 'linear-gradient(135deg,#7c3aed,#0176D3)';

const SECTIONS = [
  {
    heading: '🔍 Job Discovery',
    items: [
      { icon:'🗂️', name:'Browse all jobs on the platform', detail:'See every active job from every company on TalentNest HR — IT, non-IT, startups, corporates, staffing. Filter by role, type, location, work mode, urgency, and salary.' },
      { icon:'🎯', name:'Smart Match Score before you apply', detail:'Every job shows your percentage fit — based on your skills, experience, and location versus the role requirements. Know your chances before you spend time applying.' },
      { icon:'🔔', name:'Job alerts — never miss a role', detail:'Set alerts by job title, skills, and preferred location. When a matching job goes live, you get an alert by email or in the platform. Check once, get notified automatically.' },
      { icon:'📍', name:'Location-based job discovery', detail:'Allow your location once and JobTrack surfaces roles near you first, prioritises local opportunities, and shows proximity-aware job alerts.' },
    ],
  },
  {
    heading: '💬 Stay Connected With Recruiters',
    items: [
      { icon:'💬', name:'Real-time chat with the recruiter', detail:'Once you\'re in a company\'s pipeline, you can open a chat thread directly with the recruiter. Ask questions, share availability, respond to requests — all inside the platform.' },
      { icon:'📞', name:'Receive voice calls from recruiters', detail:'A recruiter can call you directly through TalentNest. Your phone rings inside the app — no unknown numbers, no spam calls.' },
      { icon:'📹', name:'Join video interviews from the platform', detail:'Your interview room link is in your application. Click it — you\'re in the interview. HD video, no Zoom account, no downloads. Works from your phone browser.' },
      { icon:'📲', name:'WhatsApp + email updates automatically', detail:'Every time your application moves to a new stage, you get a WhatsApp message and email — automatically. Shortlisted? Interview confirmed? Offer sent? You know immediately.' },
    ],
  },
  {
    heading: '📋 Track Every Application',
    items: [
      { icon:'📊', name:'Live application stage tracking', detail:'Every application you\'ve submitted shows its current stage in real time — Applied, Screening, Shortlisted, Interview Scheduled, Offer Extended, Hired, Rejected. Updated the moment the recruiter moves you.' },
      { icon:'📅', name:'Interview details in your dashboard', detail:'When an interview is scheduled, the date, time, format, and video room join link appear in your application immediately. No email searching. No "what\'s the link?"' },
      { icon:'✉️', name:'Respond to recruiter invites', detail:'Companies can invite you directly to a role. You receive it in your account — click Interested or Not Interested. If you\'re interested, you enter their pipeline automatically.' },
      { icon:'📁', name:'Full application history', detail:'Every job you\'ve ever applied to, with the stage it reached, when you applied, and any updates — all in one place, forever.' },
    ],
  },
  {
    heading: '📜 Offers, Onboarding & Profile',
    items: [
      { icon:'📜', name:'View and sign offer letters digitally', detail:'When a company sends your offer, it appears in your JobTrack account. Read it carefully, type your full name to sign — captured with timestamp. Signed PDF saved instantly.' },
      { icon:'✅', name:'Complete your pre-boarding checklist', detail:'Once hired, a checklist appears in your Onboarding section — Aadhaar, PAN, salary slips, experience letter, background verification consent, bank details, IT setup, compliance training. Upload each from your phone.' },
      { icon:'🧩', name:'Take skills assessments for jobs', detail:'Some roles require a skills assessment at apply time. Complete it inside JobTrack — your score is sent to the recruiter alongside your application automatically.' },
      { icon:'👤', name:'Build your candidate profile', detail:'Name, phone, email, current title, skills, work experience, preferred location, notice period, current CTC, expected CTC, LinkedIn URL, resume upload, and video resume. Recruiters search this profile.' },
    ],
  },
  {
    heading: '🛠️ Candidate Career Tools',
    items: [
      { icon:'📝', name:'Built-in Resume Builder', detail:'Create a professional, ATS-friendly resume directly in JobTrack. Choose templates, add your skills, and export to PDF in one click — ready for any application.' },
      { icon:'📱', name:'Mobile-first candidate dashboard', detail:'Manage your entire career search from your phone. Optimized for mobile viewports, ensuring you never miss a recruiter message or interview invite.' },
      { icon:'🎬', name:'Record and attach video resumes', detail:'Stand out from the crowd by recording a 60-second video introduction. Attach it to your profile so recruiters can see your communication skills and personality.' },
      { icon:'🏅', name:'BGV document vault', detail:'Upload and store your compliance documents (ID, Education, Experience) in a secure vault. Share them with hiring teams for instant verification once hired.' },
      { icon:'🔒', name:'Privacy & Visibility controls', detail:'Choose who can see your profile. Set your visibility to Public, Private, or Incognito. You have total control over your career data.' },
    ],
  },
];

const SECTION_ILLUSTRATIONS = {
  '💬 Stay Connected With Recruiters': ChatSupportIllustration,
  '📋 Track Every Application': AnalyticsChartIllustration,
  '📜 Offers, Onboarding & Profile': IdentityCardIllustration,
  '🛠️ Candidate Career Tools': GrowthRocketIllustration,
};

export default function ProductJobTrack() {
  useMarketingTheme();
  useEffect(() => {
    document.title = 'JobTrack — For Candidates | TalentNest HR';
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
      <section style={{ background:'linear-gradient(160deg,#020817,#1e1b4b,#0f0c29)', padding:'clamp(110px,14vw,150px) clamp(16px,5vw,80px) clamp(64px,8vw,96px)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,0.04) 1px,transparent 1px)',backgroundSize:'28px 28px',pointerEvents:'none' }} />
        <div style={{ position:'absolute',top:'-10%',right:'5%',width:'500px',height:'500px',borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.2),transparent 65%)',pointerEvents:'none' }} />
        <div style={{ maxWidth:1100,margin:'0 auto',position:'relative' }} className="tn-prod-grid">
          <div>
            <span className="mkt-reveal" style={{ display:'inline-block',fontSize:12,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#C4B5FD',background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.3)',borderRadius:100,padding:'5px 16px',marginBottom:22 }}>
              For Job Seekers & Candidates
            </span>
            <h1 className="mkt-reveal" style={{ fontSize:'clamp(34px,5.5vw,62px)',fontWeight:900,color:'#fff',letterSpacing:'-0.04em',lineHeight:1.06,margin:'0 0 18px' }}>
              JobTrack
            </h1>
            <p className="mkt-reveal" style={{ fontSize:'clamp(15px,1.6vw,18px)',color:'rgba(255,255,255,0.65)',lineHeight:1.75,margin:'0 0 14px',maxWidth:520 }}>
              Apply for jobs. Chat with recruiters. Attend video interviews. Sign your offer. All from one account.
            </p>
            <p className="mkt-reveal" style={{ fontSize:'clamp(13px,1.3vw,15px)',color:'rgba(255,255,255,0.45)',lineHeight:1.7,margin:'0 0 32px',maxWidth:500 }}>
              JobTrack is what a job board should have always been — not a place to apply and wonder, but a place to apply, communicate, interview, and get hired without switching between 10 different apps.
            </p>
            <div className="mkt-reveal" style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              <Link to="/login" style={{ display:'inline-flex',alignItems:'center',gap:8,background:GR,color:'#fff',padding:'13px 28px',borderRadius:12,fontWeight:800,fontSize:14,textDecoration:'none' }}>Create Free Account →</Link>
              <Link to="/careers" style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.8)',border:'1px solid rgba(255,255,255,0.18)',padding:'13px 20px',borderRadius:12,fontWeight:700,fontSize:14,textDecoration:'none' }}>Browse Jobs</Link>
            </div>
            <div style={{ marginTop:12 }}>
              <Link to="/products" style={{ fontSize:13,color:'rgba(255,255,255,0.35)',textDecoration:'none',fontWeight:600 }}>← All Products</Link>
            </div>
          </div>
          <div className="mkt-reveal">
            <SearchTalentIllustration style={{ width:'100%', maxWidth:340, height:'auto', display:'block', margin:'0 auto 16px' }} />
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
              {[
                { n:'Live', l:'application status — know exactly where you stand at all times', c:'#7c3aed' },
                { n:'Chat', l:'with your recruiter directly inside the platform', c:'#C4B5FD' },
                { n:'Zero', l:'downloads — video interviews from your phone browser', c:'#0176D3' },
                { n:'2 min', l:'to sign your offer letter digitally, from anywhere', c:'#10B981' },
              ].map(s => (
                <div key={s.n} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:14,padding:'18px 16px' }}>
                  <div style={{ fontSize:18,fontWeight:900,color:s.c,marginBottom:4 }}>{s.n}</div>
                  <div style={{ fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.5 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STAGE VISIBILITY */}
      <section style={{ padding:'clamp(32px,4vw,48px) clamp(16px,5vw,80px)', background:'var(--mkt-surface-bg)', borderBottom:'1px solid var(--mkt-card-border)' }}>
        <div style={{ maxWidth:1100,margin:'0 auto',textAlign:'center' }}>
          <div className="mkt-reveal" style={{ fontSize:13,fontWeight:700,color:AC,letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:14 }}>Your application journey — visible at every step</div>
          <div style={{ display:'flex',flexWrap:'wrap',justifyContent:'center',gap:8 }}>
            {[['Applied','#94A3B8'],['Screening','#F59E0B'],['Shortlisted','#0176D3'],['Interview Scheduled','#7c3aed'],['Offer Extended','#059669'],['Hired','#10B981']].map(([s,c],i) => (
              <div key={s} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <span style={{ background:`${c}14`,color:c,border:`1.5px solid ${c}28`,borderRadius:100,padding:'6px 14px',fontSize:12,fontWeight:700,whiteSpace:'nowrap' }}>{s}</span>
                {i < 5 && <span style={{ color:'var(--mkt-text-muted)',fontSize:13 }}>→</span>}
              </div>
            ))}
          </div>
          <p style={{ marginTop:14,fontSize:12,color:'var(--mkt-text-muted)' }}>WhatsApp + email sent automatically on every stage change. You always know what happens next.</p>
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
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,0.35)';e.currentTarget.style.transform='translateY(-2px)';}}
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
          <h2 className="mkt-reveal" style={{ fontSize:'clamp(24px,3.5vw,42px)',fontWeight:900,color:'#fff',margin:'0 0 14px',letterSpacing:'-0.03em' }}>Stop guessing. Start tracking.</h2>
          <p className="mkt-reveal" style={{ color:'rgba(255,255,255,0.75)',fontSize:15,margin:'0 0 28px',lineHeight:1.7 }}>Create your free account, upload your resume, set job alerts, and track every application — with automatic updates to your phone the moment anything changes.</p>
          <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/login" style={{ background:'#fff',color:AC,padding:'13px 30px',borderRadius:12,fontWeight:900,fontSize:15,textDecoration:'none' }}>Create Free Account →</Link>
            <Link to="/careers" style={{ background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',padding:'13px 22px',borderRadius:12,fontWeight:700,fontSize:15,textDecoration:'none' }}>Browse Jobs</Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
