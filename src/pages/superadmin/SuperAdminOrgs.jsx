import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';

const card  = { background: '#FFFFFF', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 16, padding: 20 };
const btnP  = { background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 20px', cursor: 'pointer' };
const btnG  = { background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#3E3E3C', fontWeight: 600, fontSize: 13, padding: '10px 20px', cursor: 'pointer' };
const btnD  = { background: 'rgba(186,5,23,0.1)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 10, color: '#BA0517', fontWeight: 600, fontSize: 13, padding: '10px 20px', cursor: 'pointer' };

const PLAN_COLORS = { free: '#64748b', trial: '#F59E0B', starter: '#0176D3', growth: '#014486', enterprise: '#7c3aed' };
const STATUS_COLORS = { active: '#2E844A', trial: '#A07E00', suspended: '#BA0517', inactive: '#706E6B' };

const EMPTY_FORM = { name: '', domain: '', industry: '', size: '1-10', plan: 'trial', logo: '', isStaffingAgency: false };
const INVITE_EMPTY = { name: '', email: '' };

function Lbl({ children, required }) {
  return <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>{children}{required && <span style={{ color: '#BA0517', marginLeft: 3 }}>*</span>}</label>;
}

function OrgAvatar({ org, size = 48 }) {
  if (org.logo) {
    return <img src={org.logo} alt={org.name} style={{ width: size, height: size, borderRadius: size * 0.25, objectFit: 'contain', background: '#F3F2F2', border: '1px solid #DDDBDA' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, color: '#fff', fontWeight: 800, flexShrink: 0 }}>
      {(org.name || '?')[0].toUpperCase()}
    </div>
  );
}

function OrgDetailView({ org, onClose, onRefresh, onInvite }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({
    name: org.name || '',
    domain: org.domain || '',
    industry: org.industry || '',
    size: org.size || '1-10',
    logo: org.logo || '',
    plan: org.plan || 'trial',
    status: org.status || 'active',
    isStaffingAgency: org.isStaffingAgency || false,
  });
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'recruiter' });
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Member management
  const [orgUsers, setOrgUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState(null); // prevents double-click
  const [mergeSource, setMergeSource]     = useState(null);
  const [merging, setMerging]             = useState(false);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const orgId = String(org.id || org._id || '');

  const loadOrgUsers = async () => {
    if (!orgId) return;
    setLoadingUsers(true);
    try {
      const res = await api.getUsers({ orgId, limit: 200 });
      const list = Array.isArray(res) ? res : (res?.data || []);
      // Sort: super_admin first, then admin, then others
      const roleOrder = { super_admin: 0, admin: 1, recruiter: 2, candidate: 3 };
      list.sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
      setOrgUsers(list);
    } catch (e) { console.error('Failed to load users', e); }
    setLoadingUsers(false);
  };

  useEffect(() => { loadOrgUsers(); }, [orgId]);

  const toggleUserStatus = async (user) => {
    if (user.role === 'super_admin') {
      setToast('❌ Super Admin accounts cannot be deactivated.');
      return;
    }
    const uid = user.id || user._id;
    if (togglingUserId === uid) return; // already in-flight
    setTogglingUserId(uid);
    const newStatus = !user.isActive;
    try {
      await api.updateUser(uid, { isActive: newStatus });
      setToast(`✅ User ${user.email} is now ${newStatus ? 'Active' : 'Inactive'}`);
      loadOrgUsers();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setTogglingUserId(null);
  };

  const createUser = async () => {
    if (!userForm.name || !userForm.email) { setToast('❌ Name and email are required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) { setToast('❌ Please enter a valid email address'); return; }
    setCreatingUser(true);
    try {
      await api.createUser({ name: userForm.name, email: userForm.email, role: userForm.role, tenantId: orgId, domain: org.domain });
      setToast(`✅ Invitation email sent to ${userForm.email}`);
      setShowCreateUser(false);
      setUserForm({ name: '', email: '', role: 'recruiter' });
      loadOrgUsers();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setCreatingUser(false);
  };

  const handleMerge = async (primaryId, duplicateId) => {
    if (!window.confirm('Are you sure you want to merge these accounts? This will move all applications/data to the primary account and DELETE the duplicate.')) {
      setMergeSource(null);
      return;
    }
    setMerging(true);
    try {
      await api.mergeUsers(primaryId, duplicateId);
      setToast('✅ Users merged successfully!');
      setMergeSource(null);
      loadOrgUsers(); // Standardize on consistent refresh method
      if (onRefresh) onRefresh(true); // Keep current view open but update parent list
    } catch (e) { 
      setToast(`❌ ${e.message}`); 
    } finally {
      setMerging(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.updateOrg(orgId, form);
      setToast('✅ Organisation updated!');
      setEditing(false);
      onRefresh(true);
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteOrg(orgId);
      onRefresh();
      onClose();
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  const handleStatus = async (status) => {
    try {
      await api.updateOrg(orgId, { status });
      onRefresh();
      onClose();
    } catch (e) { setToast(`❌ ${e.message}`); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 'calc(100vh - 64px)' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      
      {/* Back Button & Main Container */}
      <div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 6, color: '#0176D3', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: 20 }}>
          <span>←</span> Back to Organisations
        </button>

        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #E2E8F0' }}>

          {/* Header */}
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #032D60, #0176D3)', color: '#fff' }}>
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 20 }}>
              <OrgAvatar org={org} size={64} />
              <div>
                <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{org.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600 }}>{org.domain || 'No Domain Set'}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>•</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'monospace' }}>ID: {org.id || org._id}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
               {/* Controls moved to bottom */}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '32px', background: '#F8FAFC' }}>
          {!editing ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {/* Dashboard Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
                   <div style={card}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Platform Users</div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#0176D3' }}>{org.userCount || 0}</div>
                   </div>
                   <div style={card}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Subscription Plan</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: PLAN_COLORS[org.plan], background: `${PLAN_COLORS[org.plan]}15`, padding: '4px 10px', borderRadius: 8, display: 'inline-block' }}>{(org.plan || 'free').toUpperCase()}</div>
                   </div>
                   <div style={card}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Current Status</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: STATUS_COLORS[org.status], background: `${STATUS_COLORS[org.status]}15`, padding: '4px 10px', borderRadius: 8, display: 'inline-block' }}>{(org.status || 'active').toUpperCase()}</div>
                   </div>
                </div>

                {/* Info Sections */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                   <div>
                      <h4 style={{ color: '#032D60', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>🏢</span> Core Information</div>
                         <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(1,118,211,0.08)'} onMouseLeave={e => e.target.style.background = 'none'}>✏️ Edit</button>
                      </h4>
                      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
                         <div><Lbl>Legal Name</Lbl><div style={{ fontSize: 14, fontWeight: 600 }}>{org.name}</div></div>
                         <div><Lbl>Industry</Lbl><div style={{ fontSize: 14, fontWeight: 600 }}>{org.industry || 'Not specified'}</div></div>
                         <div><Lbl>Domain</Lbl><div style={{ fontSize: 14, fontWeight: 600, color: '#0176D3' }}>{org.domain || 'Not set'}</div></div>
                      </div>
                   </div>
                   <div>
                      <h4 style={{ color: '#032D60', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                         <span>🛡️</span> Security Policy
                      </h4>
                      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
                         <div><Lbl>MFA Policy</Lbl><div style={{ fontSize: 14, fontWeight: 600 }}>{org.config?.mfaRequired ? '✅ Strictly Enforced' : '❌ Optional'}</div></div>
                         <div><Lbl>IP Restriction</Lbl><div style={{ fontSize: 12, color: '#64748B' }}>{org.config?.allowedIps || 'All IP ranges permitted'}</div></div>
                      </div>
                   </div>
                </div>

                {/* Team Management Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                   <h4 style={{ color: '#032D60', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span>👥</span> Organization Members</div>
                      {!showCreateUser && <button onClick={() => setShowCreateUser(true)} style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Add Member</button>}
                   </h4>

                   {/* Create User fragment */}
                   {showCreateUser && (
                      <div style={{ padding: 24, borderRadius: 16, border: '1px dashed #0176D3', background: 'rgba(1,118,211,0.03)' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                           <h4 style={{ margin: 0, color: '#0176D3', fontSize: 14 }}>Add Direct User to Platform</h4>
                           <button onClick={() => setShowCreateUser(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>✕</button>
                         </div>
                         <FormRow cols={2} style={{ marginBottom: 16 }}>
                           <Field label="User Full Name" required value={userForm.name} onChange={v => setUserForm({...userForm, name: v})} />
                           <Field label="Primary Email" required type="email" value={userForm.email} onChange={v => setUserForm({...userForm, email: v})} />
                         </FormRow>
                         <div style={{ width: '50%', marginBottom: 20 }}>
                           <Field label="Platform Role" value={userForm.role} onChange={v => setUserForm({...userForm, role: v})}
                             options={[{value:'recruiter',label:'Recruiter'},{value:'admin',label:'Admin'},{value:'candidate',label:'Candidate'}]} />
                         </div>
                         <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={createUser} disabled={creatingUser} style={btnP}>{creatingUser ? 'Provisioning...' : 'Provision Account'}</button>
                            <button onClick={() => setShowCreateUser(false)} style={btnG}>Cancel</button>
                         </div>
                      </div>
                   )}

                   <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                      {loadingUsers && <div style={{ padding: 32, textAlign: 'center', color: '#64748B' }}>Loading members…</div>}
                      {!loadingUsers && orgUsers.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#64748B', fontSize: 13 }}>No direct members found.</div>}
                      {!loadingUsers && orgUsers.map((u, idx) => (
                         <div key={u.id || u._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, padding: '12px 20px', borderBottom: idx < orgUsers.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                               <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#032D60,#0176D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                  {(u.name || '?')[0].toUpperCase()}
                               </div>
                               <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#181818', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                                  <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                               </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                               <span style={{ fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#0176D3', padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase' }}>{(u.role || 'user').replace('_',' ')}</span>
                               <span style={{ fontSize: 11, fontWeight: 700, color: u.isActive ? '#2E844A' : '#BA0517' }}>{u.isActive ? '● Active' : '● Inactive'}</span>
                               
                               {/* Merge Tool */}
                               {mergeSource ? (
                                 mergeSource.id !== (u.id || u._id) && mergeSource.role === u.role && (
                                   <button 
                                     onClick={() => handleMerge(u.id || u._id, mergeSource.id)}
                                     disabled={merging}
                                     style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                                   >
                                     {merging ? 'Merging...' : '🎯 Set as Primary'}
                                   </button>
                                 )
                               ) : (
                                 <button 
                                   onClick={() => setMergeSource({ id: u.id || u._id, role: u.role, name: u.name })}
                                   title="Consolidate duplicate"
                                   style={{ background: 'none', border: '1px solid #E2E8F0', color: '#64748B', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                                 >
                                   🔗 Merge
                                 </button>
                               )}

                               {mergeSource?.id === (u.id || u._id) && (
                                 <button 
                                   onClick={() => setMergeSource(null)}
                                   style={{ background: '#BA0517', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}
                                 >
                                   ✕ Cancel
                                 </button>
                               )}

                               {u.role === 'super_admin' ? (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', padding: '3px 8px', background: '#F1F5F9', borderRadius: 4 }}>PROTECTED</span>
                               ) : (
                                  <button onClick={() => toggleUserStatus(u)} disabled={togglingUserId === (u.id || u._id)}
                                     style={{ background: u.isActive ? 'rgba(186,5,23,0.08)' : 'rgba(46,132,74,0.1)', color: u.isActive ? '#BA0517' : '#2E844A', border: `1px solid ${u.isActive ? 'rgba(186,5,23,0.2)' : 'rgba(46,132,74,0.2)'}`, borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 800, cursor: 'pointer', opacity: togglingUserId === (u.id || u._id) ? 0.5 : 1 }}>
                                     {togglingUserId === (u.id || u._id) ? '…' : (u.isActive ? 'Deactivate' : 'Activate')}
                                  </button>
                               )}
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                {/* Footer Actions */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 20, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                   <button onClick={() => setEditing(true)} style={btnP}>✏️ Update Profile</button>
                   <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleStatus(org.status === 'suspended' ? 'active' : 'suspended')}
                        style={{ ...btnG, color: org.status === 'suspended' ? '#2E844A' : '#BA0517' }}
                      >
                        {org.status === 'suspended' ? '✅ Reactivate' : '⏸ Suspend'}
                      </button>
                      <button onClick={handleDelete} style={btnD}>🗑 Delete</button>
                   </div>
                </div>
             </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: '#fff', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: '20px 20px 24px' }}>
                  <h4 style={{ color: '#032D60', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 20, margin: '0 0 20px' }}>Update Organisation Profile</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    <Field label="Organisation Name" required value={form.name} onChange={v => sf('name', v)} />
                    <Field label="Company Domain" value={form.domain} onChange={v => sf('domain', v)} hint="e.g. company.com (www/https stripped automatically)" />
                    <Field label="Industry" value={form.industry} onChange={v => sf('industry', v)} />
                    <Field label="Company Size" value={form.size} onChange={v => sf('size', v)}
                      options={['1-10','11-50','51-200','201-500','500+'].map(s => ({value:s,label:s}))} placeholder="Select size" />
                    <Field label="Service Plan" value={form.plan} onChange={v => sf('plan', v)}
                      options={['trial','free','starter','growth','enterprise'].map(p => ({value:p,label:p.toUpperCase()}))} placeholder="Select plan" />
                    <Field label="Account Status" value={form.status} onChange={v => sf('status', v)}
                      options={['active','trial','suspended','inactive'].map(s => ({value:s,label:s.toUpperCase()}))} placeholder="Select status" />
                  </div>
                  {/* Staffing Agency toggle */}
                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 12, background: form.isStaffingAgency ? 'rgba(1,118,211,0.06)' : '#F8FAFC', borderRadius: 10, padding: '12px 14px', border: `1px solid ${form.isStaffingAgency ? 'rgba(1,118,211,0.25)' : '#E2E8F0'}`, cursor: 'pointer' }} onClick={() => sf('isStaffingAgency', !form.isStaffingAgency)}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: form.isStaffingAgency ? '#0176D3' : '#CBD5E1', transition: 'background 0.2s', flexShrink: 0, position: 'relative', marginTop: 2 }}>
                      <div style={{ position: 'absolute', top: 2, left: form.isStaffingAgency ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#181818' }}>Staffing Agency Organisation</div>
                      <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>When enabled, this org gets full candidate-pool, job-posting, and client-request management capabilities.</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                   <button onClick={save} disabled={saving} style={{ ...btnP, padding: '11px 28px' }}>{saving ? 'Saving...' : '💾 Save Changes'}</button>
                   <button onClick={() => setEditing(false)} style={btnG}>Cancel</button>
                </div>
             </div>
           )}
        </div>
      </div>
      </div>
    </div>
  );
}

export default function SuperAdminOrgs() {
  const [orgs, setOrgs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [inviteForm, setInviteForm] = useState(INVITE_EMPTY);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [toast, setToast]       = useState('');
  const sf  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const sif = (k, v) => setInviteForm(p => ({ ...p, [k]: v }));

  const load = async () => {
    setLoading(true);
    let list = [];
    try { const r = await api.getOrgs(); list = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []); setOrgs(list); } catch { setOrgs([]); }
    setLoading(false);
    return list;
  };
  useEffect(() => { load(); }, []);

  const createOrg = async () => {
    if (!form.name) { setToast('❌ Organisation name is required'); return; }
    if (!form.domain) { setToast('❌ Domain is required (e.g. company.com)'); return; }
    // Client-side domain format check
    const cleanDomain = form.domain.trim().toLowerCase()
      .replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    if (!/^[a-z0-9][a-z0-9\-\.]{0,253}[a-z0-9]\.[a-z]{2,}$/.test(cleanDomain)) {
      setToast('❌ Invalid domain format — use: company.com'); return;
    }
    setSaving(true);
    try {
      await api.createOrg({ ...form, domain: cleanDomain });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setToast('✅ Organisation created!');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  const inviteAdmin = async () => {
    if (!inviteForm.name || !inviteForm.email) { setToast('❌ Name and email required'); return; }
    setSaving(true);
    try {
      await api.createUser({ name: inviteForm.name, email: inviteForm.email, role: 'admin', tenantId: showInvite, orgId: showInvite });
      setShowInvite(null);
      setInviteForm(INVITE_EMPTY);
      setToast('✅ Admin invitation sent — they will receive an email to set their password');
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSaving(false);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />

      {selectedOrg ? (
        <OrgDetailView
          org={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onRefresh={async (keepOpen) => {
            const freshList = await load();
            if (!keepOpen) {
              setSelectedOrg(null);
            } else {
              // Update selectedOrg with the refreshed data so the detail view shows latest values
              const fresh = freshList.find(o => String(o.id || o._id) === String(selectedOrg?.id || selectedOrg?._id));
              if (fresh) setSelectedOrg(fresh);
            }
          }}
          onInvite={(orgId) => { setShowInvite(orgId); }}
        />
      ) : (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>Organisations</h1>
          <p style={{ color: '#706E6B', fontSize: 13, marginTop: 4 }}>{orgs.length} total organisations — click to manage</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flex: 1, justifyContent: 'flex-end', minWidth: 280 }}>
          <Field
            value={search}
            onChange={v => setSearch(v)}
            placeholder="Search by name or domain…"
            prefix="🔍"
            style={{ flex: 1, maxWidth: 300 }}
          />
          <button onClick={() => setShowCreate(true)} style={btnP}>+ Create Organisation</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#706E6B' }}><Spinner /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {orgs.filter(o => !search || o.name?.toLowerCase().includes(search.toLowerCase()) || o.domain?.toLowerCase().includes(search.toLowerCase())).map(org => (
            <div key={org.id} onClick={() => setSelectedOrg(org)}
              style={{ ...card, cursor: 'pointer', transition: 'box-shadow 0.2s', ':hover': { boxShadow: '0 4px 20px rgba(1,118,211,0.15)' } }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(1,118,211,0.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                <OrgAvatar org={org} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#181818', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{org.name}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ background: PLAN_COLORS[org.plan] || '#64748b', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{(org.plan || 'free').toUpperCase()}</span>
                      <span style={{ background: `${STATUS_COLORS[org.status] || '#706E6B'}20`, color: STATUS_COLORS[org.status] || '#706E6B', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, border: `1px solid ${STATUS_COLORS[org.status] || '#706E6B'}40` }}>{(org.status || 'active').toUpperCase()}</span>
                      {org.isStaffingAgency && <span style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, border: '1px solid rgba(124,58,237,0.3)' }}>AGENCY</span>}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newStatus = org.status === 'suspended' ? 'active' : 'suspended';
                          const label = newStatus === 'suspended' ? 'suspend' : 'reactivate';
                          if (window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} "${org.name}"?`)) {
                            api.updateOrg(String(org.id || org._id), { status: newStatus }).then(() => { load(); setToast(`✅ Organisation ${newStatus}`); }).catch(e => setToast(`❌ ${e.message}`));
                          }
                        }}
                        title={org.status === 'suspended' ? 'Reactivate org' : 'Suspend org'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: 0.6 }}
                      >
                        🔄
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, color: '#706E6B' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span>🌐</span>
                  <span style={{ color: org.domain ? '#0176D3' : '#9E9D9B' }}>{org.domain || 'No domain set'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span>🏭</span>
                  <span>{org.industry || 'No industry'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span>👥</span>
                  <span>{org.size ? `${org.size} employees` : 'Size unknown'} · <strong style={{ color: '#181818' }}>{org.userCount || 0}</strong> platform users</span>
                </div>
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F3F2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ color: '#9E9D9B', fontSize: 11 }}>{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}</span>
                </div>
                <span style={{ color: '#0176D3', fontSize: 11, fontWeight: 600 }}>Manage →</span>
              </div>
            </div>
          ))}
          {orgs.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#706E6B' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏢</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#3E3E3C' }}>No organisations yet</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Create your first organisation to get started</div>
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* Create Org Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: 'calc(100vh - 48px)', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Super Admin</div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 800 }}>🏢 Create Organisation</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '4px 0 0' }}>Set up the org — then invite admin accounts to manage it</p>
              </div>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 15, flexShrink: 0, marginLeft: 12 }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
              <Field label="Organisation Name" required value={form.name} onChange={v => sf('name', v)} placeholder="TechCorp India Pvt. Ltd." />
              <Field label="Company Domain" required value={form.domain} onChange={v => sf('domain', v)} placeholder="techcorp.in" hint="Employers use this domain to verify and log in (www/https stripped automatically)" />
              {/* Staffing Agency Toggle */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: form.isStaffingAgency ? 'rgba(1,118,211,0.06)' : '#F8FAFC', borderRadius: 10, padding: '12px 14px', border: `1px solid ${form.isStaffingAgency ? 'rgba(1,118,211,0.25)' : '#E2E8F0'}`, cursor: 'pointer' }} onClick={() => sf('isStaffingAgency', !form.isStaffingAgency)}>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: form.isStaffingAgency ? '#0176D3' : '#CBD5E1', transition: 'background 0.2s', flexShrink: 0, position: 'relative', marginTop: 2 }}>
                  <div style={{ position: 'absolute', top: 2, left: form.isStaffingAgency ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#181818' }}>Staffing Agency Organisation</div>
                  <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>Enable if this org is a staffing agency — they get full candidate-pool, job-posting, and client-request features like the Super Admin.</div>
                </div>
              </div>
              <div>
                <Field label="Logo URL" value={form.logo} onChange={v => sf('logo', v)} placeholder="https://company.com/logo.png" hint="Direct link to company logo image" />
                {form.logo && <img src={form.logo} alt="logo preview" style={{ marginTop: 8, height: 40, borderRadius: 6, objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />}
              </div>
              <FormRow cols={2}>
                <Field label="Industry" value={form.industry} onChange={v => sf('industry', v)} placeholder="Information Technology" />
                <Field label="Company Size" value={form.size} onChange={v => sf('size', v)}
                  options={['1-10','11-50','51-200','201-500','500+'].map(s => ({value:s,label:`${s} employees`}))} placeholder="Select size" />
              </FormRow>
              <Field label="Plan" value={form.plan} onChange={v => sf('plan', v)}
                options={[{value:'trial',label:'Trial (14 days)'},{value:'starter',label:'Starter'},{value:'growth',label:'Growth'},{value:'enterprise',label:'Enterprise'}]} />
            </div>
            <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #F1F5F9', background: '#fff', display: 'flex', gap: 12 }}>
              <button onClick={createOrg} disabled={saving} style={{ ...btnP, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? 'Creating…' : '🏢 Create Organisation'}</button>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }} style={btnG}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: 'calc(100vh - 48px)', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Access Control</div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 800 }}>👤 Invite Admin</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '4px 0 0' }}>They'll manage this org's recruiters and candidates</p>
              </div>
              <button onClick={() => { setShowInvite(null); setInviteForm(INVITE_EMPTY); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 15, flexShrink: 0, marginLeft: 12 }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
              <Field label="Full Name" required value={inviteForm.name} onChange={v => sif('name', v)} placeholder="Priya Sharma" />
              <Field label="Email" required type="email" value={inviteForm.email} onChange={v => sif('email', v)} placeholder="admin@company.com" />
            </div>
            <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #F1F5F9', background: '#fff', display: 'flex', gap: 12 }}>
              <button onClick={inviteAdmin} disabled={saving} style={{ ...btnP, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? 'Creating…' : '✅ Create Admin Account'}</button>
              <button onClick={() => { setShowInvite(null); setInviteForm(INVITE_EMPTY); }} style={btnG}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
