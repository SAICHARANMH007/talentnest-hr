import React, { useState, useEffect, useRef } from 'react';
import { btnP, btnG, Z } from '../../constants/styles.js';

const TOUR_STEPS = {
  candidate: [
    { id: 'dashboard', title: "Your Control Center", desc: "View your daily snapshot, application status, and upcoming tasks here." },
    { id: 'smart-match', title: "Find Jobs", desc: "Discover jobs tailored to your skills using our Smart Match engine." },
    { id: 'applications', title: "Application Tracker", desc: "Monitor your journey from 'Applied' to 'Hired' in real-time." },
    { id: 'profile', title: "Your Profile", desc: "Keep your profile 100% complete to stand out to top recruiters." }
  ],
  recruiter: [
    { id: 'dashboard', title: "Recruitment Dashboard", desc: "Track active jobs, upcoming interviews, and pipeline health at a glance." },
    { id: 'applicants', title: "Applicant Tracking", desc: "Search and manage all candidates across your open roles." },
    { id: 'pipeline', title: "Visual Pipeline", desc: "Move candidates through stages with our high-performance Kanban board." },
    { id: 'assessments', title: "Skill Assessments", desc: "Create and review technical tests to verify candidate expertise." }
  ],
  admin: [
    { id: 'analytics', title: "Organisation Overview", desc: "Monitor hiring KPIs, revenue impact, and team performance data." },
    { id: 'job-approvals', title: "Job Governance", desc: "Review and approve new job postings to ensure quality standards." },
    { id: 'org-settings', title: "Organisation Control", desc: "Manage your branding, logo, and organisation-wide preferences." },
    { id: 'billing', title: "Billing & Plans", desc: "Control your subscription, track usage, and manage enterprise plans." }
  ],
  super_admin: [
    { id: 'analytics', title: "Global Overview", desc: "The high-level pulse of the entire TalentNest ecosystem." },
    { id: 'organisations', title: "Org Management", desc: "Provision, manage, and support multi-tenant organisations." },
    { id: 'platform', title: "System Controls", desc: "Manage feature flags, security layers, and platform-wide config." },
    { id: 'playbooks', title: "Documentation Hub", desc: "Generate and download stakeholder playbooks and pitch decks." }
  ]
};

export default function PlatformPresentationModal() {
  const [step, setStep] = useState(-1); // -1: Welcome, 0+: Tour
  const [visible, setVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [spotlight, setSpotlight] = useState(null);
  const requestRef = useRef();

  useEffect(() => {
    const hasSeen = localStorage.getItem('tn_onboarded_v1');
    const storedUser = sessionStorage.getItem('tn_user');
    if (!hasSeen && storedUser) {
      setUser(JSON.parse(storedUser));
      setTimeout(() => setVisible(true), 1500);
    }
  }, []);

  // Update spotlight position when step changes
  useEffect(() => {
    if (step >= 0 && user) {
      const role = user.role === 'super_admin' ? 'super_admin' : user.role;
      const steps = TOUR_STEPS[role] || TOUR_STEPS['candidate'];
      const current = steps[step];
      
      const update = () => {
        const el = document.querySelector(`[data-tour-id="${current.id}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          setSpotlight({
            top: rect.top - 5,
            left: rect.left - 5,
            width: rect.width + 10,
            height: rect.height + 10
          });
        }
        requestRef.current = requestAnimationFrame(update);
      };
      update();
      return () => cancelAnimationFrame(requestRef.current);
    } else {
      setSpotlight(null);
    }
  }, [step, user]);

  const close = () => {
    localStorage.setItem('tn_onboarded_v1', 'true');
    setVisible(false);
  };

  if (!visible || !user) return null;

  const role = user.role === 'super_admin' ? 'super_admin' : user.role;
  const steps = TOUR_STEPS[role] || TOUR_STEPS['candidate'];
  const currentStep = steps[step];
  const firstName = user.name?.split(' ')[0] || 'User';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: Z.SPOTLIGHT, overflow: 'hidden' }}>
      {/* Dimmed Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(3, 14, 33, 0.75)',
        backdropFilter: 'blur(4px)',
        clipPath: spotlight ? `polygon(0% 0%, 0% 100%, ${spotlight.left}px 100%, ${spotlight.left}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px 100%, 100% 100%, 100% 0%)` : 'none',
        transition: 'clip-path 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }} onClick={close} />

      {/* Content Area */}
      <div style={{
        position: 'absolute',
        top: spotlight ? (spotlight.top + spotlight.height / 2) : '50%',
        left: spotlight ? (spotlight.left + spotlight.width + 40) : '50%',
        transform: spotlight ? 'translateY(-50%)' : 'translate(-50%, -50%)',
        width: '100%', maxWidth: 400,
        background: '#fff', borderRadius: 24, padding: 32,
        boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: Z.SPOTLIGHT + 1
      }}>
        {step === -1 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0F172A', marginBottom: 12 }}>Welcome, {firstName}!</h2>
            <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.6, marginBottom: 32 }}>
              Your account is ready. Let's take a quick 30-second tour to show you where everything is.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={close} style={{ ...btnG, flex: 1 }}>Skip</button>
              <button onClick={() => setStep(0)} style={{ ...btnP, flex: 1, background: '#0176D3' }}>Show Me Around</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#0176D3', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Step {step + 1} of {steps.length}
              </span>
              <button onClick={close} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>{currentStep.title}</h3>
            <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>{currentStep.desc}</p>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                {steps.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i === step ? '#0176D3' : '#E2E8F0' }} />
                ))}
              </div>
              <button 
                onClick={() => step < steps.length - 1 ? setStep(step + 1) : close()} 
                style={{ ...btnP, padding: '10px 24px', borderRadius: 10, background: '#0176D3' }}
              >
                {step < steps.length - 1 ? 'Next →' : 'Got it!'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pointer line - only if spotlight active */}
      {spotlight && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: Z.SPOTLIGHT + 1 }}>
          <line 
            x1={spotlight.left + spotlight.width} 
            y1={spotlight.top + spotlight.height / 2} 
            x2={spotlight.left + spotlight.width + 40} 
            y2={spotlight.top + spotlight.height / 2} 
            stroke="#fff" 
            strokeWidth="2" 
            strokeDasharray="4 4" 
          />
        </svg>
      )}
    </div>
  );
}
