import React, { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';

const glass = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 24 };
const ROLES = [
  { key: 'candidate', label: 'Candidate', color: '#0176D3' },
  { key: 'recruiter', label: 'Recruiter', color: '#014486' },
  { key: 'admin',     label: 'Admin',     color: '#F59E0B' },
];

const PERMISSION_SCHEMA = [
  {
    resource: 'User Profile',
    icon: '👤',
    fields: [
      { key: 'profile.name',         label: 'Name' },
      { key: 'profile.email',        label: 'Email' },
      { key: 'profile.phone',        label: 'Phone' },
      { key: 'profile.location',     label: 'Location' },
      { key: 'profile.resume',       label: 'Resume Data' },
      { key: 'profile.skills',       label: 'Skills' },
      { key: 'profile.experience',   label: 'Work Experience' },
      { key: 'profile.education',    label: 'Education' },
    ],
  },
  {
    resource: 'Job Posting',
    icon: '💼',
    fields: [
      { key: 'job.title',            label: 'Job Title' },
      { key: 'job.description',      label: 'Description' },
      { key: 'job.salary',           label: 'Salary / CTC' },
      { key: 'job.requirements',     label: 'Requirements' },
      { key: 'job.benefits',         label: 'Benefits' },
      { key: 'job.recruiterName',    label: 'Recruiter Name' },
      { key: 'job.screeningQuestions', label: 'Screening Questions' },
    ],
  },
  {
    resource: 'Application',
    icon: '📋',
    fields: [
      { key: 'app.stage',            label: 'Pipeline Stage' },
      { key: 'app.recruiterNotes',   label: 'Recruiter Notes' },
      { key: 'app.interviewFeedback',label: 'Interview Feedback' },
      { key: 'app.tags',             label: 'Tags' },
      { key: 'app.aiScore',          label: 'Talent Match Score' },
      { key: 'app.offerStatus',      label: 'Offer Status' },
      { key: 'app.timeline',         label: 'Activity Timeline' },
    ],
  },
  {
    resource: 'Recruitment Pipeline',
    icon: '🔄',
    fields: [
      { key: 'pipeline.view',        label: 'View Pipeline' },
      { key: 'pipeline.moveStage',   label: 'Move Stages' },
      { key: 'pipeline.schedule',    label: 'Schedule Interviews' },
      { key: 'pipeline.sendOffer',   label: 'Send Offer Letters' },
      { key: 'pipeline.reject',      label: 'Reject Candidates' },
    ],
  },
  {
    resource: 'Analytics & Reports',
    icon: '📈',
    fields: [
      { key: 'analytics.dashboard',  label: 'Analytics Dashboard' },
      { key: 'analytics.export',     label: 'Export Data (CSV)' },
      { key: 'analytics.billing',    label: 'Billing & Usage' },
      { key: 'analytics.orgSettings',label: 'Org Settings' },
    ],
  },
];

// Default permissions — sensible starting point
const DEFAULT_PERMISSIONS = {
  candidate: {
    'profile.name': { view: true,  edit: true  },
    'profile.email': { view: true,  edit: true  },
    'profile.phone': { view: true,  edit: true  },
    'profile.location': { view: true,  edit: true  },
    'profile.resume': { view: true,  edit: true  },
    'profile.skills': { view: true,  edit: true  },
    'profile.experience': { view: true,  edit: true  },
    'profile.education': { view: true,  edit: true  },
    'job.title': { view: true,  edit: false },
    'job.description': { view: true,  edit: false },
    'job.salary': { view: true,  edit: false },
    'job.requirements': { view: true,  edit: false },
    'job.benefits': { view: true,  edit: false },
    'job.recruiterName': { view: false, edit: false },
    'job.screeningQuestions': { view: true,  edit: false },
    'app.stage': { view: true,  edit: false },
    'app.recruiterNotes': { view: false, edit: false },
    'app.interviewFeedback': { view: false, edit: false },
    'app.tags': { view: false, edit: false },
    'app.aiScore': { view: false, edit: false },
    'app.offerStatus': { view: true,  edit: false },
    'app.timeline': { view: true,  edit: false },
    'pipeline.view': { view: false, edit: false },
    'pipeline.moveStage': { view: false, edit: false },
    'pipeline.schedule': { view: false, edit: false },
    'pipeline.sendOffer': { view: false, edit: false },
    'pipeline.reject': { view: false, edit: false },
    'analytics.dashboard': { view: false, edit: false },
    'analytics.export': { view: false, edit: false },
    'analytics.billing': { view: false, edit: false },
    'analytics.orgSettings': { view: false, edit: false },
  },
  recruiter: {
    'profile.name': { view: true,  edit: false },
    'profile.email': { view: true,  edit: false },
    'profile.phone': { view: true,  edit: false },
    'profile.location': { view: true,  edit: false },
    'profile.resume': { view: true,  edit: false },
    'profile.skills': { view: true,  edit: false },
    'profile.experience': { view: true,  edit: false },
    'profile.education': { view: true,  edit: false },
    'job.title': { view: true,  edit: true  },
    'job.description': { view: true,  edit: true  },
    'job.salary': { view: true,  edit: true  },
    'job.requirements': { view: true,  edit: true  },
    'job.benefits': { view: true,  edit: true  },
    'job.recruiterName': { view: true,  edit: false },
    'job.screeningQuestions': { view: true,  edit: true  },
    'app.stage': { view: true,  edit: true  },
    'app.recruiterNotes': { view: true,  edit: true  },
    'app.interviewFeedback': { view: true,  edit: true  },
    'app.tags': { view: true,  edit: true  },
    'app.aiScore': { view: true,  edit: false },
    'app.offerStatus': { view: true,  edit: true  },
    'app.timeline': { view: true,  edit: false },
    'pipeline.view': { view: true,  edit: false },
    'pipeline.moveStage': { view: true,  edit: true  },
    'pipeline.schedule': { view: true,  edit: true  },
    'pipeline.sendOffer': { view: true,  edit: true  },
    'pipeline.reject': { view: true,  edit: true  },
    'analytics.dashboard': { view: false, edit: false },
    'analytics.export': { view: false, edit: false },
    'analytics.billing': { view: false, edit: false },
    'analytics.orgSettings': { view: false, edit: false },
  },
  admin: {
    'profile.name': { view: true,  edit: true  },
    'profile.email': { view: true,  edit: true  },
    'profile.phone': { view: true,  edit: true  },
    'profile.location': { view: true,  edit: true  },
    'profile.resume': { view: true,  edit: true  },
    'profile.skills': { view: true,  edit: true  },
    'profile.experience': { view: true,  edit: true  },
    'profile.education': { view: true,  edit: true  },
    'job.title': { view: true,  edit: true  },
    'job.description': { view: true,  edit: true  },
    'job.salary': { view: true,  edit: true  },
    'job.requirements': { view: true,  edit: true  },
    'job.benefits': { view: true,  edit: true  },
    'job.recruiterName': { view: true,  edit: false },
    'job.screeningQuestions': { view: true,  edit: true  },
    'app.stage': { view: true,  edit: true  },
    'app.recruiterNotes': { view: true,  edit: true  },
    'app.interviewFeedback': { view: true,  edit: true  },
    'app.tags': { view: true,  edit: true  },
    'app.aiScore': { view: true,  edit: false },
    'app.offerStatus': { view: true,  edit: true  },
    'app.timeline': { view: true,  edit: true  },
    'pipeline.view': { view: true,  edit: false },
    'pipeline.moveStage': { view: true,  edit: true  },
    'pipeline.schedule': { view: true,  edit: true  },
    'pipeline.sendOffer': { view: true,  edit: true  },
    'pipeline.reject': { view: true,  edit: true  },
    'analytics.dashboard': { view: true,  edit: false },
    'analytics.export': { view: true,  edit: false },
    'analytics.billing': { view: true,  edit: false },
    'analytics.orgSettings': { view: true,  edit: true  },
  },
};

const Toggle = React.memo(({ checked, onChange, color }) => {
  const [hover, setHover] = useState(false);
  
  return (
    <div 
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 20,
        background: checked ? color : '#E5E7EB',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 4px',
        boxShadow: checked ? `0 4px 12px ${color}40` : 'inset 0 2px 4px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.08)',
        transform: hover ? 'scale(1.05)' : 'scale(1)',
        margin: '0 auto'
      }}
    >
      <div style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: '#fff',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: `translateX(${checked ? 18 : 0}px)`,
        boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: checked ? color : '#D1D5DB', opacity: 0.4 }} />
      </div>
    </div>
  );
});


export default function SuperAdminPermissions() {
  const [orgs, setOrgs]         = useState([]);
  const [selOrgId, setSelOrgId] = useState('');
  const [perms, setPerms]       = useState(() => JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState('');

  useEffect(() => {
    api.getOrgs().then(data => {
      const list = Array.isArray(data) ? data : (data.data || []);
      setOrgs(list);
      if (list.length > 0) setSelOrgId(list[0].id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // When org changes, load its permissions
  useEffect(() => {
    if (!selOrgId) return;
    const org = orgs.find(o => o.id === selOrgId);
    if (org?.settings?.permissions) {
      // Merge with defaults so any missing keys still have values
      const merged = {};
      ROLES.forEach(r => {
        merged[r.key] = { ...DEFAULT_PERMISSIONS[r.key], ...(org.settings.permissions[r.key] || {}) };
      });
      setPerms(merged);
    } else {
      setPerms(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
    }
  }, [selOrgId, orgs]);

  const setFieldPerm = (role, fieldKey, type, value) => {
    setPerms(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [fieldKey]: {
          ...(prev[role]?.[fieldKey] || { view: false, edit: false }),
          [type]: value,
          // If disabling view, also disable edit
          ...(type === 'view' && !value ? { edit: false } : {}),
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!selOrgId) { setToast('❌ Select an organisation first'); return; }
    setSaving(true);
    try {
      const org = orgs.find(o => o.id === selOrgId);
      const currentSettings = org?.settings || {};
      await api.updateOrg(selOrgId, {
        settings: { ...currentSettings, permissions: perms },
      });
      setToast('✅ Permissions saved!');
      setOrgs(prev => prev.map(o => o.id === selOrgId ? { ...o, settings: { ...o.settings, permissions: perms } } : o));
    } catch (e) {
      setToast(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPerms(JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)));
    setToast('↩️ Reset to defaults');
  };

  if (loading) return <div style={{ color: '#706E6B', textAlign: 'center', marginTop: 60 }}>Loading…</div>;

  if (!orgs.length) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: '#706E6B' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#3E3E3C' }}>No organisations yet</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>Create an organisation in the Organisations tab first, then configure its permissions here.</div>
    </div>
  );

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>Permission Matrix</h1>
        <p style={{ color: '#706E6B', fontSize: 13, marginTop: 4 }}>
          Control what each role can view and edit — per organisation
        </p>
      </div>

      {/* Org selector + actions */}
      <div style={{ ...glass, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ color: '#706E6B', fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>SELECT ORGANISATION</label>
          <select
            value={selOrgId}
            onChange={e => setSelOrgId(e.target.value)}
            style={{ width: '100%', padding: '9px 14px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 10, color: '#181818', fontSize: 13, outline: 'none' }}
          >
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingBottom: 1 }}>
          <button
            onClick={handleReset}
            style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#706E6B', fontSize: 12, fontWeight: 600, padding: '9px 16px', cursor: 'pointer' }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: '#0176D3', border: 'none',
              borderRadius: 10, color: '#fff',
              fontSize: 13, fontWeight: 700, padding: '9px 22px', cursor: 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {saving ? 'Saving…' : 'Save Permissions'}
          </button>
        </div>
      </div>

      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
        {[{ icon: '👁', label: 'Can View', desc: 'User can see this field' }, { icon: '✏️', label: 'Can Edit', desc: 'User can modify this field' }].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#706E6B', fontSize: 12 }}>
            <span style={{ fontSize: 14 }}>{item.icon}</span>
            <strong style={{ color: '#181818' }}>{item.label}</strong>
            <span>— {item.desc}</span>
          </div>
        ))}
      </div>

      {/* Permission Tables per resource */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {PERMISSION_SCHEMA.map(section => (
          <div key={section.resource} style={glass}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 20 }}>{section.icon}</span>
              <h3 style={{ color: '#181818', fontSize: 15, fontWeight: 700, margin: 0 }}>{section.resource}</h3>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#706E6B', fontSize: 11, fontWeight: 700, padding: '0 0 12px', width: '30%', letterSpacing: '0.5px' }}>FIELD</th>
                    {ROLES.map(role => (
                      <th key={role.key} colSpan={2} style={{ textAlign: 'center', padding: '0 0 12px', width: `${70/ROLES.length}%` }}>
                        <span style={{ color: role.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', background: `${role.color}18`, border: `1px solid ${role.color}40`, borderRadius: 20, padding: '3px 10px' }}>
                          {role.label.toUpperCase()}
                        </span>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ paddingBottom: 8 }} />
                    {ROLES.map(role => (
                      <React.Fragment key={role.key}>
                        <td style={{ textAlign: 'center', color: '#706E6B', fontSize: 10, paddingBottom: 8, fontWeight: 600 }}>👁 VIEW</td>
                        <td style={{ textAlign: 'center', color: '#706E6B', fontSize: 10, paddingBottom: 8, fontWeight: 600 }}>✏️ EDIT</td>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.fields.map((field, idx) => (
                    <tr key={field.key} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '9px 0', color: '#181818', fontSize: 12, fontWeight: 500 }}>{field.label}</td>
                      {ROLES.map(role => {
                        const fp = perms[role.key]?.[field.key] || { view: false, edit: false };
                        return (
                          <React.Fragment key={role.key}>
                            <td style={{ textAlign: 'center', padding: '9px 8px' }}>
                              <Toggle checked={fp.view} onChange={v => setFieldPerm(role.key, field.key, 'view', v)} color={role.color} />
                            </td>
                            <td style={{ textAlign: 'center', padding: '9px 8px' }}>
                              <Toggle checked={fp.edit} onChange={v => setFieldPerm(role.key, field.key, 'edit', v)} color={role.color} />
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom save bar */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={handleReset}
          style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#706E6B', fontSize: 13, fontWeight: 600, padding: '11px 20px', cursor: 'pointer' }}
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#0176D3', border: 'none',
            borderRadius: 10, color: '#fff',
            fontSize: 13, fontWeight: 700, padding: '11px 28px', cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}
