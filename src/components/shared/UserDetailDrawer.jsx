import { useState, useEffect } from 'react';
import Field from '../ui/Field.jsx';
import Badge from '../ui/Badge.jsx';
import Toast from '../ui/Toast.jsx';
import StageHistory from '../pipeline/StageHistory.jsx';
import ResumeCard from '../shared/ResumeCard.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';
import { SM, STAGES } from '../../constants/stages.js';

/**
 * Unified Master Record Drawer
 * Handles both "User/Admin Edit" and "Candidate/Pipeline Stage Management".
 * Props: user (required), app (optional), onClose, onUpdated
 */
export default function UserDetailDrawer({ user: u, app: initialApp, isSuperAdmin, currentUserRole, onClose, onDelete, onUpdated }) {
  const [tab, setTab] = useState('profile');
  const [app, setApp] = useState(initialApp);
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState({
    name:            u?.name            || '',
    email:           u?.email           || '',
    phone:           u?.phone           || '',
    title:           u?.title           || u?.jobRole || '',
    location:        u?.location        || '',
    experience:      u?.experience      || '',
    currentCompany:  u?.currentCompany  || '',
    education:       u?.education       || '',
    linkedin:        u?.linkedin        || '',
    skills:          Array.isArray(u?.skills) ? u.skills.join(', ') : (u?.skills || ''),
    availability:    u?.availability    || 'immediate',
    summary:         u?.summary         || '',
    client:          u?.client          || '',
    ta:              u?.ta              || '',
    clientSpoc:      u?.clientSpoc      || '',
    currentCTC:      u?.currentCTC      || '',
    expectedCTC:     u?.expectedCTC     || '',
    certifications:  u?.certifications  || '',
    preferredLocation: u?.preferredLocation || '',
    role:            u?.role            || 'candidate',
    orgId:           (typeof u?.orgId === 'object' ? (u.orgId?._id?.toString() || u.orgId?.id || '') : u?.orgId) || u?._id?.$oid || '',
    isActive:        u?.isActive !== false,
  });
  const [currentStage, setCurrentStage] = useState(initialApp?.stage || '');
  const [changingStage, setChangingStage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingApp, setLoadingApp] = useState(false);
  const [toast, setToast] = useState('');

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // If we have a candidate but no app context, try to find the last application for context
  useEffect(() => {
    if (u?.role === 'candidate' && !app) {
       setLoadingApp(true);
       api.getApplications({ candidateId: u.id || u._id }).then(apps => {
         const list = Array.isArray(apps) ? apps : (apps?.data || []);
         if (list.length > 0) {
           setApp(list[0]);
           setCurrentStage(list[0].stage);
         }
       }).catch(() => {}).finally(() => setLoadingApp(false));
    }
  }, [u?.id, u?.role, app]);

  useEffect(() => {
    if (isSuperAdmin) {
      api.getOrgs().then(res => setOrgs(Array.isArray(res) ? res : (res?.data || []))).catch(() => {});
    }
  }, [isSuperAdmin]);

  if (!u) return null;

  const saveProfile = async () => {
    if (!form.name || !form.email) { setToast('❌ Name and email are required'); return; }
    setSaving(true);
    try {
      const skills = typeof form.skills === 'string' ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(form.skills) ? form.skills : []);
      const mid = u.id || u._id;
      const updated = await api.updateUser(mid, { ...form, skills });
      setToast('✅ Profile saved!');
      onUpdated?.(updated);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleStageChange = async (newStage) => {
    const appId = app?.id || app?._id;
    if (!appId || newStage === currentStage) return;
    setChangingStage(true);
    try {
      await api.updateStage(appId, newStage);
      setCurrentStage(newStage);
      setApp(prev => ({ ...prev, stage: newStage }));
      setToast(`✅ Stage updated → ${SM[newStage]?.label || newStage}`);
      onUpdated?.(); // Notify parent of change
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
    setChangingStage(false);
  };

  const STAGE_DROPDOWN_COLORS = {
    applied: '#706E6B', screening: '#0176D3', shortlisted: '#014486',
    interview_scheduled: '#F59E0B', interview_completed: '#A07E00',
    offer_extended: '#7c3aed', selected: '#10b981', rejected: '#BA0517',
  };

  const tabStyle = (t) => ({
    padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: 'none', background: 'none',
    color: tab === t ? '#0176D3' : '#706E6B',
    borderBottom: tab === t ? '3px solid #0176D3' : '3px solid transparent',
    transition: 'all 0.2s', letterSpacing: 0.5
  });

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div onClick={onClose} style={{ flex: 1, background: 'rgba(5, 13, 26, 0.4)', backdropFilter: 'blur(4px)' }} />

      <div className="tn-drawer" style={{ background: '#F8FAFF', borderLeft: '1px solid #E2E8F0', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 42px rgba(0,0,0,0.15)' }}>
        
        {/* Header Section */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 60, height: 60, borderRadius: 20, background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 24, boxShadow: '0 8px 16px rgba(1,118,211,0.2)' }}>
              {(u.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ color: '#0A1628', fontSize: 20, fontWeight: 900, margin: '0 0 6px' }}>{u.name || '—'}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={u.role?.replace('_', ' ').toUpperCase()} color="#0176D3" />
                {app && <Badge label={SM[currentStage]?.icon + ' ' + (SM[currentStage]?.label || currentStage)} color={SM[currentStage]?.color || '#0176D3'} />}
                {u.orgName && <span style={{ color: '#706E6B', fontSize: 13, fontWeight: 500 }}>🏢 {u.orgName}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', color: '#64748B', width: 36, height: 36, borderRadius: 12, cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24, borderBottom: '1px solid #F1F5F9' }}>
            <button style={tabStyle('profile')} onClick={() => setTab('profile')}>👤 PROFILE</button>
            {u.role === 'candidate' && <button style={tabStyle('pipeline')} onClick={() => setTab('pipeline')}>🔄 PIPELINE</button>}
            <button style={tabStyle('resume')} onClick={() => setTab('resume')}>📋 RESUME</button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: '24px 32px 40px', overflowY: 'auto', flex: 1 }}>
          
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Dynamic Action Panel */}
              {app && (
                <div style={{ ...card, background: 'linear-gradient(135deg, #fff, #F8FAFF)', border: '1.5px solid #0176D320', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                         <p style={{ color: '#0176D3', fontSize: 10, fontWeight: 800, margin: '0 0 4px', letterSpacing: 1.2 }}>ACTIVE PIPELINE</p>
                         <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{app.job?.title || 'Job Application'}</h4>
                         <p style={{ margin: 0, fontSize: 12, color: '#706E6B' }}>Current Stage: <strong>{SM[currentStage]?.label}</strong></p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                       <label style={{ color: '#706E6B', fontSize: 9, fontWeight: 800, display: 'block', marginBottom: 4 }}>UPDATE STAGE</label>
                       <select
                        value={currentStage}
                        onChange={e => handleStageChange(e.target.value)}
                        disabled={changingStage}
                        style={{ padding: '8px 12px', borderRadius: 10, border: `2px solid ${STAGE_DROPDOWN_COLORS[currentStage] || '#DDDBDA'}`, background: '#fff', fontSize: 12, fontWeight: 800, color: STAGE_DROPDOWN_COLORS[currentStage], cursor: 'pointer', outline: 'none' }}
                       >
                         {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                       </select>
                    </div>
                  </div>
                </div>
              )}

                <div style={card}>
                <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, letterSpacing: 1, margin: '0 0 16px' }}>MASTER DETAILS</p>
                <div className="form-grid-2" style={{ gap: 14 }}>
                  <Field label="Full Name *"  value={form.name}     onChange={v => sf('name', v)} />
                  <Field label="Email Address *" value={form.email} onChange={v => sf('email', v)} type="email" />
                  <Field label="Phone Number"  value={form.phone}    onChange={v => sf('phone', v)} type="tel" />
                  <Field label="Location"     value={form.location} onChange={v => sf('location', v)} />
                  <Field label="Current Title" value={form.title}    onChange={v => sf('title', v)} />
                  <Field label="Exp. (Years)" value={form.experience} onChange={v => sf('experience', v)} type="number" min="0" max="60" />
                  <Field label="Availability" value={form.availability} onChange={v => sf('availability', v)} />
                  <Field label="LinkedIn URL" value={form.linkedin}   onChange={v => sf('linkedin', v)} type="url" />
                  
                  {(isSuperAdmin || currentUserRole === 'admin') && (
                    <div style={{ background: '#f8fafc', gridColumn: 'span 2', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: '#475569' }}>⚙️ ADMINISTRATIVE SETTINGS</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={{ fontSize: 11, color: '#3E3E3C', marginBottom: 4, display: 'block' }}>Account Role</label>
                          <select value={form.role} onChange={e => sf('role', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #DDDBDA', fontSize: 13 }}>
                            <option value="candidate">Candidate</option>
                            <option value="recruiter">Recruiter</option>
                            <option value="admin">Admin</option>
                            {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                          </select>
                        </div>
                        {isSuperAdmin && (
                          <div>
                            <label style={{ fontSize: 11, color: '#3E3E3C', marginBottom: 4, display: 'block' }}>Organization</label>
                            <select value={form.orgId} onChange={e => sf('orgId', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #DDDBDA', fontSize: 13 }}>
                              <option value="">No Organization</option>
                              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: isSuperAdmin ? 'span 2' : 'span 1' }}>
                          <input type="checkbox" checked={form.isActive} onChange={e => sf('isActive', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#0176D3' }} id="isActiveCheck" />
                          <label htmlFor="isActiveCheck" style={{ fontSize: 13, color: '#181818', cursor: 'pointer' }}>Active Account Access</label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 14 }}>
                   <Field label="Professional Summary" value={form.summary} onChange={v => sf('summary', v)} type="textarea" />
                </div>
                <div style={{ marginTop: 14 }}>
                   <Field label="Skills (comma-separated)" value={form.skills} onChange={v => sf('skills', v)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                 <button onClick={saveProfile} disabled={saving} style={{ ...btnP, flex: 1, padding: '12px', fontSize: 13 }}>{saving ? '⏳ Saving...' : '✓ Update Profile Details'}</button>
                 {onDelete && (
                    <button onClick={() => {
                      if (window.confirm(`Permanently delete "${u.name}"? This cannot be undone.`)) {
                        onDelete(u.id || u._id); onClose();
                      }
                    }} style={{ ...btnD, padding: '10px 20px' }} title="Delete user permanently">🗑 Delete</button>
                 )}
              </div>
            </div>
          )}

          {tab === 'pipeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {loadingApp ? <div style={{ textAlign: 'center', padding: 40 }}>Analysing career footprint...</div> : (
                <>
                  {!app ? <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94A3B8' }}>No active job applications found for this candidate.</div> : (
                    <>
                      <div style={card}>
                         <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Stage Timeline</h4>
                         <StageHistory history={app.stageHistory} />
                      </div>
                      {app.rejectionReason && (
                        <div style={{ ...card, background: 'rgba(186,5,23,0.06)', border: '1.5px solid rgba(186,5,23,0.2)' }}>
                           <p style={{ color: '#BA0517', fontSize: 11, fontWeight: 800, margin: '0 0 4px' }}>REJECTION INSIGHT</p>
                           <p style={{ margin: 0, fontSize: 13, color: '#BA0517' }}>{app.rejectionReason}</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'resume' && (
             <div style={{ border: '2px solid #F1F5F9', borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
                <ResumeCard candidate={u} />
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
