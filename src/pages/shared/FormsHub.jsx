import { useNavigate } from 'react-router-dom';
import { card, btnP, btnG } from '../../constants/styles.js';
import PageHeader from '../../components/ui/PageHeader.jsx';

/**
 * Forms Hub: The centralized entry point for all platform forms.
 * Provides a categorized, role-aware dashboard of available workflows.
 * Route: /app/forms
 */
export default function FormsHub({ user }) {
  const navigate = useNavigate();
  const rk = user.role === 'super_admin' ? 'superadmin' : user.role;

  // Grouped form actions
  const SECTIONS = [
    {
      title: 'Recruit & Pipeline',
      icon: '🎯',
      roles: ['recruiter', 'admin', 'superadmin'],
      items: [
        { id: 'jobs/create', icon: '💼', name: 'Post a New Job', desc: 'Create a job listing, set screening questions, and define roles.', color: '#0176D3' },
        { id: 'add-candidate', icon: '👤', name: 'Add Candidate', desc: 'Upload a resume for AI extraction or enter candidate details manually.', color: '#10B981' },
        { id: 'forms/invite', icon: '📧', name: 'Invite Candidates', desc: 'Send personalized job invitation emails to selected candidates.', color: '#8B5CF6' },
        { id: 'forms/interview', icon: '📅', name: 'Schedule Interview', desc: 'Coordinate with interviewers and candidates for upcoming rounds.', color: '#F59E0B' },
        { id: 'forms/offer', icon: '📄', name: 'Generate Offer', desc: 'Create professional offer letters with custom salary/benefit clauses.', color: '#EF4444' },
      ]
    },
    {
      title: 'Organization & Team',
      icon: '🏢',
      roles: ['admin', 'superadmin'],
      items: [
        { id: 'forms/provision', icon: '🔑', name: 'Provision User', desc: 'Add new team members, assign roles, and grant platform access.', color: '#06B6D4' },
        { id: 'org-settings', icon: '⚙️', name: 'Org Settings', desc: 'Update organization profile, logo, industry, and core domain.', color: '#64748B' },
        { id: 'custom-fields', icon: '🧩', name: 'Custom Fields', desc: 'Define extra data points for candidates, jobs, or placements.', color: '#EC4899' },
      ]
    },
    {
      title: 'Platform Management',
      icon: '🌐',
      roles: ['superadmin'],
      items: [
        { id: 'forms/create-org', icon: '🚀', name: 'Create Brand New Org', desc: 'Onboard a new company/tenant to the TalentNest platform.', color: '#0176D3' },
        { id: 'security', icon: '🛡️', name: 'Security Policy', desc: 'Configure global MFA, IP restrictions, and session policies.', color: '#BA0517' },
        { id: 'automation', icon: '⚡', name: 'Automation Engine', desc: 'Set up rules for auto-moving candidates or sending notifications.', color: '#FACC15' },
      ]
    },
    {
      title: 'My Settings',
      icon: '👤',
      roles: ['candidate', 'recruiter', 'admin', 'superadmin', 'client', 'hiring_manager'],
      items: [
        { id: 'profile', icon: '🖼️', name: 'Profile Settings', desc: 'Update your avatar, bio, and personal contact information.', color: '#0176D3' },
        { id: 'settings/password', icon: '🔒', name: 'Change Password', desc: 'Keep your account secure by updating your credentials.', color: '#D946EF' },
        { id: 'settings/email', icon: '📧', name: 'Email Settings', desc: 'Configure SMTP or Gmail integration for outgoing outreaches.', color: '#3B82F6' },
      ]
    }
  ];

  // Filter sections by role
  const visibleSections = SECTIONS.filter(s => s.roles.includes(rk));

  return (
    <div className="tn-forms-hub" style={{ maxWidth: 1200, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <PageHeader 
        title="📋 Forms & Workflows" 
        subtitle="The centralized hub for all platform interactions. Access any form or configuration page directly."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, marginTop: 12 }}>
        {visibleSections.map((section, idx) => (
          <section key={idx}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingLeft: 4 }}>
              <span style={{ fontSize: 24 }}>{section.icon}</span>
              <h2 style={{ fontSize: 13, fontWeight: 800, color: '#032D60', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section.title}</h2>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #E2E8F0 0%, transparent 100%)', marginLeft: 16 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {section.items.map((item, i) => (
                <div 
                  key={i} 
                  onClick={() => navigate(`/app/${item.id}`)}
                  style={{ ...card, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', border: '1.5px solid rgba(1,118,211,0.1)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 12px 24px rgba(1,118,211,0.12)';
                    e.currentTarget.style.borderColor = item.color;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'rgba(1,118,211,0.1)';
                  }}
                >
                  {/* Subtle color highlight */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: item.color }} />
                  
                  <div style={{ padding: 20, flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                        {item.icon}
                      </div>
                      <span style={{ fontSize: 16, color: '#CBD5E1' }}>↗</span>
                    </div>
                    
                    <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#181818' }}>{item.name}</h3>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>

                  <div style={{ padding: '10px 20px', background: `${item.color}05`, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ color: item.color, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Open Workflow →</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <style>{`
        @keyframes tn-fadein {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
