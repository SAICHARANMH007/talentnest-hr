import React, { useState, useEffect } from 'react';
import { btnP } from '../../constants/styles.js';

const ROLE_CONTENT = {
  candidate: [
    { title: "Welcome to TalentNest, [Name]!", subtitle: "Your Career Launchpad", desc: "You're now part of an AI-powered talent ecosystem. Let's get you hired for your dream role.", icon: "👋", color: "#0176D3" },
    { title: "Build a Winning Profile", subtitle: "Stand out to Recruiters", desc: "Complete all 7 tabs of your profile. A high profile score increases your visibility in our Talent Match engine.", icon: "👤", color: "#7C3AED" },
    { title: "Smart Job Matching", subtitle: "AI-Powered Opportunities", desc: "Use 'Talent Match Search' to see jobs that fit your skills perfectly—ranked by our Gemini AI matching engine.", icon: "🎯", color: "#10B981" },
    { title: "Track Your Journey", subtitle: "Real-time Pipeline Tracking", desc: "Monitor your applications from 'Applied' to 'Hired'. Take assessments and attend video interviews directly in-app.", icon: "🚀", color: "#F59E0B" }
  ],
  recruiter: [
    { title: "Welcome back, [Name]!", subtitle: "Recruitment Excellence Awaits", desc: "Your pipeline is ready. Let's find and hire the top 5% of talent today.", icon: "💼", color: "#0176D3" },
    { title: "Effortless Job Posting", subtitle: "AI-Assisted JDs", desc: "Upload a JD and let Gemini auto-fill the details. Submit jobs for admin approval in seconds.", icon: "📝", color: "#10B981" },
    { title: "AI Talent Matching", subtitle: "Stop Searching, Start Matching", desc: "Our HireBoard engine ranks candidates by fit score. Review pre-vetted profiles and shortlist with one click.", icon: "🧠", color: "#7C3AED" },
    { title: "Native Interviewing", subtitle: "No External Links Needed", desc: "Conduct secure video interviews in our internal rooms. Everything syncs with your pipeline automatically.", icon: "🎥", color: "#00C2CB" }
  ],
  admin: [
    { title: "Hello, [Name]!", subtitle: "Organisation Governance", desc: "Manage your organisation's hiring pulse from a single, high-performance dashboard.", icon: "🏢", color: "#0176D3" },
    { title: "Overview & Analytics", subtitle: "Data-Driven Decisions", desc: "Monitor real-time KPIs, pipeline health, and recruiter performance with our Overview charts.", icon: "📈", color: "#10B981" },
    { title: "Governance & Approvals", subtitle: "Maintain High Standards", desc: "Approve or reject job postings, manage recruiter roles, and handle organisation-wide settings.", icon: "⚖️", color: "#F59E0B" },
    { title: "Resource Hub", subtitle: "Empower Your Team", desc: "Access the Sales & Investor Hub to download pitch decks, technical papers, and team playbooks.", icon: "📚", color: "#7C3AED" }
  ],
  super_admin: [
    { title: "Systems Ready, [Name]!", subtitle: "Platform Infrastructure", desc: "You have total control over the TalentNest global ecosystem and multi-tenant organisations.", icon: "👑", color: "#0176D3" },
    { title: "Org Management", subtitle: "Provisioning & Support", desc: "Create new organisations, invite admins via secure tokens, and manage global security flags.", icon: "🌐", color: "#10B981" },
    { title: "Security & Audits", subtitle: "Total Transparency", desc: "Monitor audit logs, manage granular permissions, and use user impersonation for deep debugging.", icon: "🛡️", color: "#BA0517" },
    { title: "The Playbook Center", subtitle: "Platform Knowledge", desc: "Generate and distribute developer, sales, and tester playbooks to keep your global team aligned.", icon: "📚", color: "#7C3AED" }
  ]
};

export default function PlatformPresentationModal() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const hasSeen = localStorage.getItem('tn_seen_welcome_guide');
    const storedUser = sessionStorage.getItem('tn_user');
    if (!hasSeen && storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setTimeout(() => setVisible(true), 1200);
    }
  }, []);

  const close = () => {
    localStorage.setItem('tn_seen_welcome_guide', 'true');
    setVisible(false);
  };

  const next = (slides) => {
    if (current < slides.length - 1) setCurrent(current + 1);
    else close();
  };

  if (!visible || !user) return null;

  const role = user.role || 'candidate';
  const slides = ROLE_CONTENT[role] || ROLE_CONTENT['candidate'];
  const s = slides[current];
  const firstName = user.name?.split(' ')[0] || 'User';
  
  const title = s.title.replace('[Name]', firstName);
  const isFinal = current === slides.length - 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      background: 'rgba(3, 14, 33, 0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 840, minHeight: 500,
        background: '#fff', borderRadius: 32, overflow: 'hidden',
        display: 'flex', flexWrap: 'wrap',
        boxShadow: '0 32px 128px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        {/* Top Progress Track */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: '#F1F5F9', display: 'flex' }}>
          {slides.map((_, i) => (
            <div key={i} style={{ 
              flex: 1, background: i <= current ? (s.color || '#0176D3') : 'transparent', 
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', borderRight: '2px solid #fff' 
            }} />
          ))}
        </div>

        {/* Left Side: Dynamic Visual */}
        <div style={{ 
          flex: '1 1 360px', background: `linear-gradient(165deg, ${s.color} 0%, #032D60 100%)`, 
          padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff',
          position: 'relative', overflow: 'hidden'
        }}>
          {/* Decorative Background Elements */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(0,0,0,0.2)', filter: 'blur(30px)' }} />
          
          <div style={{ fontSize: 120, marginBottom: 30, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))', animation: 'float 3s ease-in-out infinite' }}>{s.icon}</div>
          <style>{`@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }`}</style>
          
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.9, border: '2px solid rgba(255,255,255,0.3)', padding: '6px 20px', borderRadius: 50 }}>
            TalentNest Guide
          </div>
        </div>

        {/* Right Side: Onboarding Content */}
        <div style={{ flex: '1 1 420px', padding: '60px clamp(30px, 5vw, 60px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fff' }}>
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, color: '#0F172A', marginBottom: 14, lineHeight: 1.1, letterSpacing: '-0.02em' }}>{title}</h2>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 28, opacity: 0.95 }}>{s.subtitle}</h3>
            <div style={{ width: 40, height: 4, background: s.color, borderRadius: 2, marginBottom: 28 }} />
            <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.8, fontWeight: 500 }}>{s.desc}</p>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 'auto', alignItems: 'center' }}>
            {isFinal ? (
              <button onClick={close} style={{ ...btnP, padding: '16px 48px', fontSize: 16, borderRadius: 16, flex: 1, justifyContent: 'center', boxShadow: `0 10px 25px ${s.color}44` }}>
                🚀 Get Started
              </button>
            ) : (
              <>
                <button onClick={close} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontWeight: 700, fontSize: 15, cursor: 'pointer', padding: '10px 0' }}>Skip for now</button>
                <button onClick={() => next(slides)} style={{ ...btnP, padding: '14px 40px', borderRadius: 16, marginLeft: 'auto', background: s.color, boxShadow: `0 8px 20px ${s.color}33` }}>
                  Next Step →
                </button>
              </>
            )}
          </div>
        </div>

        {/* Top-Right Close Icon */}
        <button onClick={close} style={{ 
          position: 'absolute', top: 24, right: 24, width: 36, height: 36, borderRadius: '50%', background: '#F1F5F9', 
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#64748B',
          transition: 'all 0.2s'
        }} onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'} onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}>×</button>
      </div>
    </div>
  );
}
