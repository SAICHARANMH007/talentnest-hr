import React, { useState, useEffect } from 'react';
import { btnP } from '../../constants/styles.js';

const SLIDES = [
  {
    title: "Vision & Mission",
    subtitle: "Connecting Potential to Opportunity",
    desc: "Our Vision: To become the world's most intelligent talent infrastructure. Our Mission: To eliminate recruitment friction through ethical AI, transparent automation, and a seamless end-to-end ecosystem for every stakeholder.",
    icon: "👁️",
    color: "#0176D3"
  },
  {
    title: "The Seamless Sync",
    subtitle: "A Unified Recruitment Loop",
    desc: "TalentNest connects everyone: Admins provision Orgs, Recruiters post jobs, AI matches Candidates, and Hiring Managers conduct interviews in native meeting rooms. One loop, zero external tools, total synchronization.",
    icon: "🔄",
    color: "#10B981"
  },
  {
    title: "JobTrack: Empowering Candidates",
    subtitle: "Transparency & Skill Validation",
    desc: "Candidates don't just apply; they grow. Real-time application tracking, AI-powered job matching, internal skill assessments, and integrated background verification (BGV) ensure a trust-based hiring journey.",
    icon: "🚀",
    color: "#7C3AED"
  },
  {
    title: "HireBoard: Recruiter Mastery",
    subtitle: "AI Matching & Pipeline Speed",
    desc: "Our Recruiters use HireBoard to automate the mundane. AI Talent Match surfaces the top 5% instantly, while our internal pipeline manages everything from initial screening to automated offer generation.",
    icon: "🎯",
    color: "#F59E0B"
  },
  {
    title: "Native Meeting Ecosystem",
    subtitle: "Internal Video & Real-time Sync",
    desc: "Say goodbye to fragmented Zoom links. TalentNest features internal, secure video meeting rooms that sync directly with your interview schedule and candidate records for a 360° hiring view.",
    icon: "🎥",
    color: "#00C2CB"
  },
  {
    title: "PeopleDesk: Admin Control",
    subtitle: "Multi-tenant Governance & Analytics",
    desc: "For enterprises, PeopleDesk provides total control. Manage multiple organizations, track outreach effectiveness, handle billing, and customize data fields to fit your unique business architecture.",
    icon: "🏢",
    color: "#64748B"
  },
  {
    title: "Why TalentNest? (The Edge)",
    subtitle: "Protection, Privacy & Performance",
    desc: "While others leave you vulnerable to scrapers and traffic theft, our proprietary Bot-Masking Layer protects your brand. We are an ecosystem, not just a board—delivering hires in 48-72 hours, not weeks.",
    icon: "🛡️",
    color: "#BA0517"
  },
  {
    title: "Ready to Scale?",
    subtitle: "Join the Global Talent Revolution",
    desc: "You are now part of a platform built for speed, intelligence, and security. Let's transform the world of work together.",
    icon: "🎊",
    color: "#0176D3",
    isFinal: true
  }
];

export default function PlatformPresentationModal() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if user is logged in and hasn't seen it
    const hasSeen = localStorage.getItem('tn_seen_pitch');
    const token   = sessionStorage.getItem('tn_token');
    if (!hasSeen && token) {
      setTimeout(() => setVisible(true), 1500);
    }
  }, []);

  const close = () => {
    localStorage.setItem('tn_seen_pitch', 'true');
    setVisible(false);
  };

  const next = () => {
    if (current < SLIDES.length - 1) setCurrent(current + 1);
    else close();
  };

  if (!visible) return null;

  const s = SLIDES[current];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(3, 14, 33, 0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        width: '100%', maxWidth: 800, minHeight: 480,
        background: '#fff', borderRadius: 24, overflow: 'hidden',
        display: 'flex', flexWrap: 'wrap',
        boxShadow: '0 32px 128px rgba(0,0,0,0.5)',
        position: 'relative'
      }}>
        {/* Progress Bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: '#F1F5F9', display: 'flex' }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{ 
              flex: 1, background: i <= current ? (s.color || '#0176D3') : 'transparent', 
              transition: 'all 0.4s', borderRight: '1px solid #fff' 
            }} />
          ))}
        </div>

        {/* Left Visual Area */}
        <div style={{ 
          flex: '1 1 340px', background: `linear-gradient(135deg, ${s.color} 0%, #032D60 100%)`, 
          padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#fff' 
        }}>
          <div style={{ fontSize: 100, marginBottom: 24, filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}>{s.icon}</div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8 }}>TalentNest HR</div>
        </div>

        {/* Right Content Area */}
        <div style={{ flex: '1 1 400px', padding: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: '#0F172A', marginBottom: 12, lineHeight: 1.1 }}>{s.title}</h2>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: s.color, marginBottom: 24 }}>{s.subtitle}</h3>
          <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.7, marginBottom: 40 }}>{s.desc}</p>

          <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
            {s.isFinal ? (
              <button onClick={close} style={{ ...btnP, padding: '14px 40px', fontSize: 15, borderRadius: 12, flex: 1, justifyContent: 'center' }}>
                🚀 Let's Scale Together
              </button>
            ) : (
              <>
                <button onClick={close} style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Skip intro</button>
                <button onClick={next} style={{ ...btnP, padding: '12px 32px', borderRadius: 12, marginLeft: 'auto' }}>Next →</button>
              </>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button onClick={close} style={{ 
          position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', 
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#64748B' 
        }}>×</button>
      </div>
    </div>
  );
}
