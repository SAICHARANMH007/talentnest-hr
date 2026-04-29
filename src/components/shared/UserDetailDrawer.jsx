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
function buildForm(u) {
  return {
    name:            u?.name            || '',
    email:           u?.email           || '',
    phone:           u?.phone           || '',
    title:           u?.title           || u?.jobRole || '',
    location:        u?.location        || '',
    experience:      u?.experience      || '',
    currentCompany:  u?.currentCompany  || '',
    linkedinUrl:     u?.linkedinUrl     || u?.linkedin || '',
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
    relevantExperience: u?.relevantExperience || '',
    candidateStatus: u?.candidateStatus  || '',
    role:            u?.role            || 'candidate',
    tenantId:        (typeof u?.tenantId === 'object' ? (u.tenantId?._id?.toString() || u.tenantId?.id || '') : u?.tenantId) || (typeof u?.orgId === 'object' ? (u.orgId?._id?.toString() || u.orgId?.id || '') : u?.orgId) || '',
    isActive:        u?.isActive !== false,
  };
}

export default function UserDetailDrawer({ user: u, app: initialApp, isSuperAdmin, currentUserRole, onClose, onDelete, onUpdated }) {
  const [tab, setTab] = useState('profile');
  const [app, setApp] = useState(initialApp);
  const [orgs, setOrgs] = useState([]);
  const [fullUser, setFullUser] = useState(u);
  const [form, setForm] = useState(() => buildForm(u));
  const [currentStage, setCurrentStage] = useState(initialApp?.stage || '');
  const [changingStage, setChangingStage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingApp, setLoadingApp] = useState(false);
  const [toast, setToast] = useState('');

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // When a partial candidate object is passed (populated from application.candidateId),
  // fetch the full Candidate profile so all fields are available for editing.
  useEffect(() => {
    const uid = u?.id || u?._id?.toString();
    if (!uid) return;
    const isCandidate = (u?.role || 'candidate') === 'candidate';
    if (!isCandidate) return;
    // Detect partial object — application populate only returns a handful of fields
    const hasFullData = u?.currentCTC !== undefined || u?.expectedCTC !== undefined || u?.workHistory !== undefined;
    if (hasFullData) return;
    // Fetch the full Candidate model record
    api.getCandidate(uid).then(full => {
      if (!full) return;
      const enriched = { role: 'candidate', ...full, id: full.id || full._id?.toString() };
      setFullUser(enriched);
      setForm(buildForm(enriched));
    }).catch(() => {
      // Fallback: try the Users endpoint (for self-registered candidates)
      api.getUser(uid).then(full => {
        if (!full) return;
        const enriched = { ...full, id: full.id || full._id?.toString() };
        setFullUser(enriched);
        setForm(buildForm(enriched));
      }).catch(() => {});
    });
  }, [u?.id, u?._id]); // eslint-disable-line

  // If we have a candidate but no app context, try to find the last application for context
  useEffect(() => {
    const isCandidate = (u?.role || 'candidate') === 'candidate';
    if (isCandidate && !app) {
      const uid = u?.id || u?._id?.toString();
      if (!uid) return;
      setLoadingApp(true);
      api.getApplications({ candidateId: uid }).then(apps => {
        const list = Array.isArray(apps) ? apps : (apps?.data || []);
        if (list.length > 0) {
          setApp(list[0]);
          setCurrentStage(list[0].stage);
        }
      }).catch(() => {}).finally(() => setLoadingApp(false));
    }
  }, [u?.id, u?._id, u?.role, app]); // eslint-disable-line

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
      const mid = fullUser?.id || fullUser?._id || u.id || u._id;
      const isUserModel = !!(fullUser?.role || u?.role); // User model records always have a role
      let updated;
      if (isUserModel) {
        const raw = await api.updateUser(mid, { ...form, skills });
        updated = raw?.data || raw;
      } else {
        // Candidate model record (added by recruiter/admin, no User account)
        const raw = await api.updateCandidate(mid, { ...form, skills });
        updated = raw?.data || raw;
        if (updated) updated = { role: 'candidate', ...updated, id: updated.id || updated._id?.toString() };
      }
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

      <div className="tn-drawer" style={{ background: '#F8FAFF', borderLeft: '1px solid #E2E8F0', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 42px rgba(0,0,0,0.15)', overflow: 'hidden' }}>

        {/* Header Section */}
        <div style={{ padding: 'clamp(14px,3vw,24px) clamp(16px,4vw,28px)', borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 18, flexShrink: 0, boxShadow: '0 4px 12px rgba(1,118,211,0.2)' }}>
              {(form.name || u.name || '?')[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ color: '#0A1628', fontSize: 'clamp(15px,3vw,20px)', fontWeight: 900, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.name || u.name || '—'}</h2>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={(form.role || u.role || 'candidate').replace('_', ' ')} color="#0176D3" />
                {app && <Badge label={(SM[currentStage]?.label || currentStage)} color={SM[currentStage]?.color || '#0176D3'} />}
                {(fullUser?.orgName || u.orgName) && <span style={{ color: '#706E6B', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>🏢 {fullUser?.orgName || u.orgName}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', color: '#64748B', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontSize: 18, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 0, marginTop: 16, borderBottom: '1px solid #F1F5F9', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <button style={tabStyle('profile')} onClick={() => setTab('profile')}>👤 Profile</button>
            {(form.role || u.role || 'candidate') === 'candidate' && <button style={tabStyle('pipeline')} onClick={() => setTab('pipeline')}>🔄 Pipeline</button>}
            <button style={tabStyle('resume')} onClick={() => setTab('resume')}>📋 Resume</button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ padding: 'clamp(14px,3vw,24px) clamp(16px,4vw,28px) 40px', overflowY: 'auto', flex: 1 }}>
          
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Dynamic Action Panel */}
              {app && (
                <div style={{ ...card, background: 'linear-gradient(135deg, #fff, #F8FAFF)', border: '1.5px solid #0176D320', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                         <p style={{ color: '#0176D3', fontSize: 10, fontWeight: 800, margin: '0 0 4px', letterSpacing: 1.2 }}>ACTIVE PIPELINE</p>
                         <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.job?.title || 'Job Application'}</h4>
                         <p style={{ margin: '2px 0 0', fontSize: 12, color: '#706E6B' }}>Stage: <strong>{SM[currentStage]?.label}</strong></p>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                       <label style={{ color: '#706E6B', fontSize: 9, fontWeight: 800, display: 'block', marginBottom: 4 }}>UPDATE STAGE</label>
                       <select
                        value={currentStage}
                        onChange={e => handleStageChange(e.target.value)}
                        disabled={changingStage}
                        style={{ padding: '7px 10px', borderRadius: 10, border: `2px solid ${STAGE_DROPDOWN_COLORS[currentStage] || '#DDDBDA'}`, background: '#fff', fontSize: 12, fontWeight: 800, color: STAGE_DROPDOWN_COLORS[currentStage], cursor: 'pointer', outline: 'none', maxWidth: '100%' }}
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
                  <Field label="LinkedIn URL" value={form.linkedinUrl} onChange={v => sf('linkedinUrl', v)} type="url" />
                  
                  {(isSuperAdmin || currentUserRole === 'admin') && (
                    <div className="span-2" style={{ background: '#f8fafc', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: '#475569' }}>⚙️ ADMINISTRATIVE SETTINGS</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 10 }}>
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
                            <select value={form.tenantId} onChange={e => sf('tenantId', e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #DDDBDA', fontSize: 13 }}>
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

                {(form.role || u?.role || 'candidate') === 'candidate' && (
                  <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 10, fontWeight: 800, color: '#475569', letterSpacing: 1 }}>📋 PLACEMENT DETAILS</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10 }}>
                      <Field label="Current CTC"          value={form.currentCTC}         onChange={v => sf('currentCTC', v)} placeholder="12 LPA" />
                      <Field label="Expected CTC"         value={form.expectedCTC}         onChange={v => sf('expectedCTC', v)} placeholder="18 LPA" />
                      <Field label="Relevant Experience"  value={form.relevantExperience}  onChange={v => sf('relevantExperience', v)} placeholder="3y Java" />
                      <Field label="Preferred Location"   value={form.preferredLocation}   onChange={v => sf('preferredLocation', v)} placeholder="Hyderabad" />
                      <Field label="Current Company"      value={form.currentCompany}      onChange={v => sf('currentCompany', v)} placeholder="TCS" />
                      <Field label="Client"               value={form.client}              onChange={v => sf('client', v)} placeholder="Infosys" />
                      <Field label="TA / Source Owner"    value={form.ta}                  onChange={v => sf('ta', v)} placeholder="Ravi Kumar" />
                      <Field label="Client SPOC"          value={form.clientSpoc}          onChange={v => sf('clientSpoc', v)} placeholder="Arun Mehta" />
                      <Field label="Candidate Status"     value={form.candidateStatus}     onChange={v => sf('candidateStatus', v)} placeholder="Active" />
                      <Field label="Certifications"       value={form.certifications}      onChange={v => sf('certifications', v)} placeholder="AWS, CKA" />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                 <button onClick={saveProfile} disabled={saving} style={{ ...btnP, flex: 1, minWidth: 140, padding: '11px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>{saving ? '⏳ Saving...' : '✓ Save Changes'}</button>
                 {onDelete && (
                    <button onClick={() => {
                      if (window.confirm(`Permanently delete "${u.name}"? This cannot be undone.`)) {
                        onDelete(u.id || u._id); onClose();
                      }
                    }} style={{ ...btnD, padding: '10px 16px', flexShrink: 0 }} title="Delete user permanently">🗑 Delete</button>
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
                <ResumeCard candidate={fullUser || u} />
             </div>
          )}

        </div>
      </div>
    </div>
  );
}
