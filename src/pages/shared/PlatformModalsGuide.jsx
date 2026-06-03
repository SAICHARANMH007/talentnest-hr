import React, { useState } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';

const ROLE_COLORS = {
  'Candidate':       { bg: 'rgba(1,118,211,0.08)',   color: '#0176D3' },
  'Recruiter':       { bg: 'rgba(14,165,233,0.1)',    color: '#0369A1' },
  'Admin':           { bg: 'rgba(34,197,94,0.1)',     color: '#15803D' },
  'Super Admin':     { bg: 'rgba(124,58,237,0.1)',    color: '#7C3AED' },
  'Public':          { bg: 'rgba(249,115,22,0.1)',    color: '#C2410C' },
  'All Logged In':   { bg: 'rgba(100,116,139,0.1)',   color: '#475569' },
};

const MODALS = [
  {
    icon: '📅',
    name: 'Schedule Interview',
    file: 'InterviewModal',
    roles: ['Recruiter', 'Admin'],
    where: 'Pipeline → candidate card → "Schedule Interview" button',
    what: 'Schedule a video, phone, or in-person interview for a candidate. Sets the date, time, and meeting link, then sends a formatted confirmation email to the candidate automatically.',
    output: 'Interview saved to the candidate\'s application record. Candidate receives an email with all interview details.',
    trigger: 'Recruiter clicks "Schedule Interview" on any candidate card in the pipeline or applicants view.',
  },
  {
    icon: '📄',
    name: 'Generate Offer Letter',
    file: 'OfferLetterModal',
    roles: ['Recruiter', 'Admin'],
    where: 'Pipeline → candidate card → "Generate Offer" button',
    what: 'Generates a fully formatted, Indian-labour-law-compliant offer letter with CTC breakdown (Basic, HRA, EPF, Gratuity, etc.). Lets you preview, print, and send the letter to the candidate by email.',
    output: 'Offer letter saved to the candidate record. Application stage moves to "Offer Extended". Candidate receives the offer by email.',
    trigger: 'Recruiter clicks "Generate Offer" on a shortlisted candidate.',
  },
  {
    icon: '❌',
    name: 'Reject Candidate',
    file: 'RejectModal',
    roles: ['Recruiter', 'Admin'],
    where: 'Pipeline / Applicants → candidate card → "Reject" button',
    what: 'Formally rejects a candidate from a role. Lets you pick a rejection reason from your custom list and optionally send a professional rejection email to the candidate.',
    output: 'Candidate stage moves to "Rejected". Optional rejection email sent. Reason logged to the application record.',
    trigger: 'Recruiter clicks "Reject" on any candidate in the pipeline.',
  },
  {
    icon: '✅',
    name: 'Hired — Joining Details',
    file: 'HiredDetailsModal',
    roles: ['Recruiter', 'Admin'],
    where: 'Automatically shown when a candidate\'s stage is moved to "Hired"',
    what: 'Collects the final CTC offered, joining date, designation, and department for the newly hired candidate. This data is used to create the pre-boarding record.',
    output: 'Pre-boarding record created. Joining details saved to the candidate\'s application. Candidate appears in Onboarding section.',
    trigger: 'Triggered automatically when a recruiter/admin moves a candidate to the "Hired" pipeline stage.',
  },
  {
    icon: '🤝',
    name: 'Refer & Earn',
    file: 'ReferEarnModal',
    roles: ['All Logged In'],
    where: 'Job listings / Careers page → "Refer & Earn" button on a job card',
    what: 'Generates a unique, trackable referral link for a specific job. The link ties any resulting application back to the referrer. If the referred candidate is hired, the referrer earns the configured reward amount.',
    output: 'Unique referral URL generated. Can be copied, shared via WhatsApp, or shared via email. Referrer is notified when their referral applies and when reward is processed.',
    trigger: 'Any logged-in user clicks "Refer & Earn" on a job they want to refer someone to.',
  },
  {
    icon: '📝',
    name: 'Public Job Application',
    file: 'PublicApplyModal',
    roles: ['Public', 'Candidate'],
    where: 'Careers page → any job card → "Apply Now" button',
    what: 'Full job application form accessible without logging in. Collects name, email, phone, resume, experience, and answers to any screening questions set for that job. Supports resume upload with auto-extraction.',
    output: 'Application submitted and visible in the recruiter\'s pipeline. Candidate receives an application confirmation email.',
    trigger: 'Visitor or candidate clicks "Apply Now" on the public careers page or job detail page.',
  },
  {
    icon: '🏢',
    name: 'Organisation Job Listings',
    file: 'CareerListingModal',
    roles: ['Super Admin'],
    where: 'Organisations page → org card → "View Jobs" / careers icon',
    what: 'Shows all active job postings for a specific organisation. Lets the super admin view, manage urgency levels, and access the public careers link for that org\'s jobs.',
    output: 'Read-only view of org jobs with urgency badges and public careers URL. Super admin can open the careers page directly from here.',
    trigger: 'Super admin clicks the careers/jobs icon on an organisation card in the Organisations list.',
  },
  {
    icon: '🔀',
    name: 'Merge Duplicate Candidates',
    file: 'CandidateMergeWizard',
    roles: ['Admin', 'Super Admin'],
    where: 'Merge Duplicates page (Admin nav) → select duplicates → "Merge" button',
    what: 'Step-by-step wizard to merge two or more duplicate candidate profiles into a single master record. You choose which profile to keep as primary, and all applications, notes, and history from the others are merged in.',
    output: 'Duplicate profiles deleted. All data consolidated under the primary profile. No application history is lost.',
    trigger: 'Admin selects duplicate candidate records on the Merge Duplicates page and clicks "Merge Selected".',
  },
  {
    icon: '🚀',
    name: 'Platform Onboarding Tour',
    file: 'PlatformPresentationModal',
    roles: ['All Logged In'],
    where: 'Shown automatically on first login, or triggered via the "Take Tour" button',
    what: 'A guided spotlight tour of the most important pages for your role. Walks through each key section with a description of what it does and where to find features. Role-aware — candidates, recruiters, admins, and super admins each see their own relevant tour steps.',
    output: 'User understands the platform layout. Tour can be dismissed and re-triggered at any time.',
    trigger: 'Auto-shown once on first login. Can also be triggered manually from the dashboard.',
  },
];

const ALL_ROLES = ['Candidate', 'Recruiter', 'Admin', 'Super Admin', 'Public', 'All Logged In'];

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color, display: 'inline-block' }}>
      {role}
    </span>
  );
}

function ModalCard({ m, expanded, onToggle }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        border: `1.5px solid ${expanded ? '#0176D3' : '#E2E8F0'}`,
        boxShadow: expanded ? '0 8px 32px rgba(1,118,211,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
          textAlign: 'left',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: expanded ? 'linear-gradient(135deg,#0176D3,#014486)' : '#F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          transition: 'background 0.2s',
        }}>
          {m.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628', marginBottom: 4 }}>{m.name}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {m.roles.map(r => <RoleBadge key={r} role={r} />)}
          </div>
        </div>
        <span style={{ color: expanded ? '#0176D3' : '#9CA3AF', fontSize: 18, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14, borderTop: '1px solid #F1F5F9' }}>

          {/* Where to find */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#0176D3', letterSpacing: '0.1em', marginBottom: 4 }}>WHERE TO FIND IT</div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{m.where}</div>
          </div>

          {/* What it does */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.1em', marginBottom: 6 }}>WHAT IT DOES</div>
            <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.7 }}>{m.what}</div>
          </div>

          {/* Trigger */}
          <div style={{ background: 'rgba(249,115,22,0.05)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(249,115,22,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#C2410C', letterSpacing: '0.1em', marginBottom: 4 }}>WHAT TRIGGERS IT</div>
            <div style={{ fontSize: 13, color: '#7C2D12', lineHeight: 1.6 }}>{m.trigger}</div>
          </div>

          {/* Output */}
          <div style={{ background: 'rgba(34,197,94,0.05)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#15803D', letterSpacing: '0.1em', marginBottom: 4 }}>WHAT HAPPENS AFTER</div>
            <div style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>{m.output}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlatformModalsGuide({ user }) {
  const [expanded, setExpanded] = useState(null);
  const [roleFilter, setRoleFilter] = useState('All');

  const rk = user?.role === 'super_admin' ? 'Super Admin'
    : user?.role === 'admin' ? 'Admin'
    : user?.role === 'recruiter' ? 'Recruiter'
    : user?.role === 'candidate' ? 'Candidate'
    : null;

  const filtered = MODALS.filter(m => {
    if (roleFilter === 'All') return true;
    return m.roles.includes(roleFilter) || m.roles.includes('All Logged In');
  });

  const toggle = (name) => setExpanded(p => p === name ? null : name);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <PageHeader
        title="Platform Modals Guide"
        subtitle={`${MODALS.length} screens and pop-ups across the platform — what each one is for and who can access it`}
      />

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Modals',     value: MODALS.length,                                               color: '#0176D3' },
          { label: 'Recruiter / Admin',value: MODALS.filter(m => m.roles.some(r => r === 'Recruiter' || r === 'Admin')).length, color: '#15803D' },
          { label: 'Candidate / Public',value: MODALS.filter(m => m.roles.some(r => r === 'Candidate' || r === 'Public' || r === 'All Logged In')).length, color: '#C2410C' },
          { label: 'Super Admin Only', value: MODALS.filter(m => m.roles.includes('Super Admin') && m.roles.length === 1).length, color: '#7C3AED' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Role filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {['All', ...ALL_ROLES].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
              borderColor: roleFilter === r ? '#0176D3' : '#E2E8F0',
              background: roleFilter === r ? '#0176D3' : '#fff',
              color: roleFilter === r ? '#fff' : '#374151',
              fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
            }}>
            {r}
          </button>
        ))}
      </div>

      {/* Modal cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontSize: 14 }}>
            No modals for this role filter.
          </div>
        ) : (
          filtered.map(m => (
            <ModalCard key={m.name} m={m} expanded={expanded === m.name} onToggle={() => toggle(m.name)} />
          ))
        )}
      </div>

      <div style={{ marginTop: 24, padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: '#374151' }}>Note:</strong> Modals open on top of the current page — your data and navigation are preserved underneath. All modals can be closed by pressing <kbd style={{ background: '#E5E7EB', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>Esc</kbd> or clicking the ✕ button.
        </p>
      </div>
    </div>
  );
}
