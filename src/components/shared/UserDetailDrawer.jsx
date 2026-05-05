import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Field from '../ui/Field.jsx';
import Badge from '../ui/Badge.jsx';
import Toast from '../ui/Toast.jsx';
import StageHistory from '../pipeline/StageHistory.jsx';
import ResumeCard from './ResumeCard.jsx';
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
  const [isCandidateModel, setIsCandidateModel] = useState(false);

  // Track whether user has started editing — if they have, don't overwrite with fetch
  const userEditedRef = useRef(false);
  const sf = (k, v) => { userEditedRef.current = true; setForm(p => ({ ...p, [k]: v })); };

  // When a partial candidate object is passed, fetch full profile for editing.
  // Guard: never overwrite form once user has started typing.
  useEffect(() => {
    userEditedRef.current = false; // reset on new candidate
    const uid = u?.id || u?._id?.toString();
    if (!uid) return;
    const isCandidate = (u?.role || 'candidate') === 'candidate';
    if (!isCandidate) return;

    const hasFullData = u?._fullRecord === true
      || (Array.isArray(u?.workHistory))
      || (typeof u?.currentCTC === 'number')
      || (typeof u?.currentCTC === 'string' && u.currentCTC.length > 0 && !u._partial);
    
    if (hasFullData && !u?._partial) return;

    // Fetch full record. If candidate fetch fails or returns empty, try user fetch.
    api.getCandidate(uid).then(full => {
      // Check if we got a valid record (must have at least name or email)
      if (full && (full.name || full.email)) {
        if (userEditedRef.current) return;
        const enriched = { ...u, ...full, role: 'candidate', id: full.id || full._id?.toString() };
        setFullUser(enriched);
        setForm(buildForm(enriched));
        setIsCandidateModel(true);
      } else {
        throw new Error('Not found in candidates');
      }
    }).catch(() => {
      api.getUser(uid).then(full => {
        if (!full || userEditedRef.current) return;
        const enriched = { ...u, ...full, id: full.id || full._id?.toString() };
        setFullUser(enriched);
        setForm(buildForm(enriched));
        setIsCandidateModel(false);
      }).catch(() => {
        // If both fail, keep the initial prop data in the form
      });
    });
  }, [u?.id, u?._id]); // eslint-disable-line

  // If we have a candidate but no app context, try to find the last application for context
  // Always fetch ALL applications for this candidate so the pipeline shows complete history
  const [allFetchedApps, setAllFetchedApps] = useState([]);
  useEffect(() => {
    const isCandidate = (u?.role || 'candidate') === 'candidate';
    if (!isCandidate) return;
    const uid = u?.id || u?._id?.toString();
    if (!uid) return;
    setLoadingApp(true);
    api.getApplications({ candidateId: uid, limit: 200 }).then(res => {
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setAllFetchedApps(list);
      if (!app && list.length > 0) {
        setApp(list[0]);
        setCurrentStage(list[0].stage);
      }
    }).catch(() => setAllFetchedApps([])).finally(() => setLoadingApp(false));
  }, [u?.id, u?._id, u?.role]); // eslint-disable-line

  useEffect(() => {
    if (isSuperAdmin) {
      api.getOrgs().then(res => setOrgs(Array.isArray(res) ? res : (res?.data || []))).catch(() => {});
    }
  }, [isSuperAdmin]);

  if (!u) return null;

  const saveProfile = async () => {
    if (!form.name || !form.email) {
      setToast('❌ Name and Email are required');
      return;
    }
    // Phone is strongly recommended but not a hard blocker for profile edits —
    // it is required for WhatsApp/calling but not for stage moves or note updates.
    // We warn but allow save so HR isn't blocked editing other fields.
    if (!form.phone?.trim()) {
      setToast('⚠️ No mobile number — WhatsApp/calls won\'t work for this candidate. Saving anyway…');
      // don't return — continue to save
    }
    setSaving(true);
    try {
      const skills = typeof form.skills === 'string' ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : (Array.isArray(form.skills) ? form.skills : []);
      const mid = fullUser?.id || fullUser?._id || u.id || u._id;
      let updated;
      if (isCandidateModel) {
        // Record lives in the Candidate collection (added by recruiter/admin, no User account)
        const raw = await api.updateCandidate(mid, { ...form, skills });
        updated = raw?.data || raw;
        if (updated) updated = { role: 'candidate', ...updated, id: updated.id || updated._id?.toString() };
      } else {
        // Record lives in the User collection (self-registered or invited candidate)
        const raw = await api.updateUser(mid, { ...form, skills });
        updated = raw?.data || raw;
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

  const navigate = useNavigate();

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
                <span style={{ color: '#706E6B', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>🏢 {fullUser?.orgName || u.orgName || 'TalentNest HR'}</span>
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
                  <Field label={`Phone Number${form.phone ? '' : ' ⚠️ Missing'}`} value={form.phone} onChange={v => sf('phone', v)} type="tel" placeholder="Required for calls & WhatsApp" />
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
              {loadingApp ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spinner /> Analysing career footprint...</div>
              ) : (
                <>
                  {/* Activity List: Show all applications */}
                  {(() => {
                    // Prefer dashboard allApplications (from candidate-records API) which
                    // includes job titles. Fall back to individually-fetched apps.
                    const allApps = (u.allApplications && u.allApplications.length > 0)
                      ? u.allApplications
                      : allFetchedApps.map(a => ({
                          id: a.id || a._id?.toString(),
                          jobId: a.jobId?._id?.toString() || a.jobId?.toString(),
                          jobTitle: (a.jobId && typeof a.jobId === 'object' ? a.jobId.title : null) || a.job?.title || 'Unknown Job',
                          stage: a.stage || a.currentStage,
                          status: a.status,
                          appliedAt: a.createdAt,
                          updatedAt: a.updatedAt,
                          rejectionReason: a.rejectionReason,
                          stageHistory: a.stageHistory,
                        }));
                    // If we only have one app or it's the active one, show details.
                    // But if there are multiple, show a summary list first.
                    if (allApps.length === 0 && !app) {
                      return <div style={{ ...card, textAlign: 'center', padding: 40, color: '#94A3B8' }}>No active job applications found for this candidate.</div>;
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={card}>
                          <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, letterSpacing: 1, margin: '0 0 16px' }}>CAREER FOOTPRINT — {allApps.length || (app?1:0)} APPLICATIONS</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Current/Latest App Details */}
                            {app && (
                              <div style={{ padding: '12px 14px', background: 'rgba(1,118,211,0.05)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#0176D3' }}>{app.job?.title || app.jobTitle || 'Active Application'}</h4>
                                  <Badge label={SM[currentStage]?.label || currentStage} color={SM[currentStage]?.color} />
                                </div>
                                <StageHistory history={app.stageHistory} />
                              </div>
                            )}

                            {/* Other Applications — each with own stage change */}
                            {allApps.filter(a => String(a.id || a._id) !== String(app?.id || app?._id)).map(a => {
                              const appId = String(a.id || a._id);
                              const appStage = a.stage || a.currentStage || 'applied';
                              return (
                                <div key={appId} style={{ padding: '14px 16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                    <div>
                                      <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{a.jobTitle || 'Job'}</div>
                                      <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                                        Applied {a.appliedAt ? new Date(a.appliedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                                      </div>
                                    </div>
                                    <Badge label={SM[appStage]?.label || appStage} color={SM[appStage]?.color || '#64748B'} />
                                  </div>
                                  {/* Stage change for this application */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>Move to:</span>
                                    <select
                                      value={appStage}
                                      disabled={changingStage}
                                      onChange={async (e) => {
                                        const newStage = e.target.value;
                                        setChangingStage(true);
                                        try {
                                          await api.updateStage(appId, newStage);
                                          // Update both sources so UI reflects change immediately
                                          setFullUser(prev => prev ? {
                                            ...prev,
                                            allApplications: (prev.allApplications || []).map(x =>
                                              String(x.id || x._id) === appId ? { ...x, stage: newStage, currentStage: newStage } : x
                                            )
                                          } : prev);
                                          setAllFetchedApps(prev => prev.map(x =>
                                            String(x.id || x._id) === appId ? { ...x, stage: newStage, currentStage: newStage } : x
                                          ));
                                          if (app && String(app.id || app._id) === appId) setCurrentStage(newStage);
                                          setToast(`✅ Stage updated to ${SM[newStage]?.label || newStage}`);
                                        } catch (err) { setToast(`❌ ${err.message}`); }
                                        setChangingStage(false);
                                      }}
                                      style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${STAGE_DROPDOWN_COLORS[appStage] || '#DDDBDA'}`, background: '#fff', fontSize: 11, fontWeight: 700, color: STAGE_DROPDOWN_COLORS[appStage] || '#374151', cursor: 'pointer', outline: 'none' }}>
                                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                                    </select>
                                    <button
                                      onClick={() => { setApp(a); setCurrentStage(appStage); }}
                                      style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                      History →
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {app?.rejectionReason && (
                          <div style={{ ...card, background: 'rgba(186,5,23,0.06)', border: '1.5px solid rgba(186,5,23,0.2)' }}>
                             <p style={{ color: '#BA0517', fontSize: 11, fontWeight: 800, margin: '0 0 4px' }}>REJECTION INSIGHT</p>
                             <p style={{ margin: 0, fontSize: 13, color: '#BA0517' }}>{app.rejectionReason}</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {tab === 'resume' && (
            <div>
              {/* Full-page resume button */}
              <div style={{ marginBottom: 12, display: 'flex', gap: 10 }}>
                <button
                  onClick={() => {
                    const cid = fullUser?.id || u?.id || fullUser?._id?.toString() || u?._id?.toString();
                    if (cid) navigate(`/app/resume/${cid}`);
                  }}
                  style={{ ...btnP, padding: '8px 18px', fontSize: 13 }}
                >
                  🖥️ View Full-Page Resume
                </button>
              </div>
              <div style={{ border: '2px solid #F1F5F9', borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
                <ResumeCard candidate={fullUser || u} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
