import { useState, useEffect, useRef } from 'react';
import Toast from '../../components/ui/Toast.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Field from '../../components/ui/Field.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { STAGES, SM } from '../../constants/stages.js';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { api, downloadBlob } from '../../api/api.js';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import ChangePasswordModal from '../../components/shared/ChangePasswordModal.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import InviteModal from '../../components/shared/InviteModal.jsx';

// ── Recruiter activity panel ────────────────────────────────────────────────
function RecruiterActivityPanel({ recruiterId }) {
  const [state, setState] = useState({ loading: true, jobs: [], apps: [], error: false });
  const [stageFilter, setSF] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const jobsRes = await api.getJobs(recruiterId);
        const jobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes?.data || []);
        const nested = await Promise.all(
          jobs.map(j =>
            api.getApplications({ jobId: j.id })
              .then(res => { const apps = Array.isArray(res) ? res : (res?.data || []); return apps.map(a => ({ ...a, jobTitle: j.title })); })
              .catch(() => [])
          )
        );
        setState({ loading: false, jobs, apps: nested.flat(), error: false });
      } catch {
        setState({ loading: false, jobs: [], apps: [], error: true });
      }
    })();
  }, [recruiterId]);

  if (state.loading) return <p style={{ color: "#706E6B", fontSize: 12, margin: "10px 0 0" }}><Spinner /> Loading activity…</p>;
  if (state.error) return <p style={{ color: "#BA0517", fontSize: 12, margin: "10px 0 0" }}>⚠️ Could not load activity data.</p>;
  if (!state.apps.length && !state.jobs.length) return <p style={{ color: "#9E9D9B", fontSize: 12, margin: "10px 0 0" }}>No active jobs or candidates yet.</p>;

  const stageCounts = STAGES.reduce((acc, s) => { acc[s.id] = state.apps.filter(a => a.stage === s.id).length; return acc; }, {});
  const visibleApps = stageFilter === 'all' ? state.apps : state.apps.filter(a => a.stage === stageFilter);

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F3F2F2" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ color: "#0176D3", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>📊 PIPELINE ACTIVITY</span>
        <span style={{ color: "#706E6B", fontSize: 11 }}>{state.jobs.length} job{state.jobs.length !== 1 ? "s" : ""} · {state.apps.length} candidate{state.apps.length !== 1 ? "s" : ""}</span>
        {stageFilter !== 'all' && (
          <button onClick={() => setSF('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#706E6B', fontSize: 10, padding: '2px 6px', borderRadius: 4, textDecoration: 'underline' }}>
            Clear filter
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
        {STAGES.filter(s => stageCounts[s.id] > 0).map(s => {
          const active = stageFilter === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSF(active ? 'all' : s.id)}
              style={{ background: active ? `${s.color}30` : `${s.color}15`, border: `1px solid ${active ? s.color : `${s.color}33`}`, borderRadius: 8, padding: "3px 10px", fontSize: 11, display: "flex", gap: 5, alignItems: "center", cursor: "pointer", outline: 'none', transition: 'all 0.15s' }}
            >
              <span style={{ color: s.color, fontWeight: active ? 800 : 600 }}>{s.icon} {s.label}</span>
              <span style={{ background: `${s.color}33`, color: s.color, borderRadius: 10, padding: "0 6px", fontWeight: 700 }}>{stageCounts[s.id]}</span>
            </button>
          );
        })}
        {!state.apps.length && <span style={{ color: "#9E9D9B", fontSize: 11 }}>No applicants yet</span>}
      </div>
      {state.apps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
          {visibleApps.length === 0 && (
            <p style={{ color: '#9E9D9B', fontSize: 12, margin: '4px 0', textAlign: 'center' }}>No candidates in this stage.</p>
          )}
          {visibleApps.map(a => {
            const st = SM[a.stage] || { color: "#0176D3", label: a.stage, icon: "•" };
            return (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderRadius: 7, background: "rgba(255,255,255,0.03)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#0176D3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
                    {(a.candidateId?.name || a.candidate?.name || "?")[0].toUpperCase()}
                  </div>
                  <span style={{ color: "#181818", fontSize: 12 }}>{a.candidateId?.name || a.candidate?.name || a.candidateName || 'Candidate'}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: "#9E9D9B", fontSize: 10 }}>{a.jobTitle}</span>
                  <span style={{ color: st.color, fontSize: 10, fontWeight: 700, background: `${st.color}15`, padding: "2px 7px", borderRadius: 8 }}>{st.icon} {st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Multi-select dropdown picklist ─────────────────────────────────────────
function MultiSelect({ label, options, selected, onChange, icon = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = (val) => onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  const active = selected.length > 0;
  const visible = options.filter(o => !search || o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
        borderRadius: 20, border: `1.5px solid ${active ? '#0176D3' : '#e2e8f0'}`,
        background: active ? '#0176D3' : '#fff',
        color: active ? '#fff' : '#374151',
        fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap',
        boxShadow: active ? '0 2px 8px rgba(1,118,211,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'all 0.18s',
      }}>
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
        <span>{label}</span>
        {active && (
          <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
            {selected.length}
          </span>
        )}
        <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          background: '#fff', borderRadius: 14, zIndex: 1500,
          minWidth: 210, maxHeight: 280, display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 28px rgba(0,0,0,0.14)', border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {/* Search inside dropdown */}
          {options.length > 6 && (
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <input
                autoFocus
                placeholder={`Search ${label.toLowerCase()}…`}
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box', background: '#f8fafc', color: '#181818' }}
              />
            </div>
          )}
          {/* Actions */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f1f5f9' }}>
            <button onClick={() => onChange(options)} style={{ flex: 1, background: 'none', border: 'none', padding: '8px 0', color: '#0176D3', fontSize: 11, fontWeight: 700, cursor: 'pointer', borderRight: '1px solid #f1f5f9' }}>All</button>
            <button onClick={() => { onChange([]); setSearch(''); }} style={{ flex: 1, background: 'none', border: 'none', padding: '8px 0', color: '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Clear</button>
          </div>
          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visible.map(opt => {
              const checked = selected.includes(opt);
              return (
                <label key={opt} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                  cursor: 'pointer', transition: 'background 0.12s',
                  background: checked ? 'rgba(1,118,211,0.06)' : 'transparent',
                  borderLeft: checked ? '3px solid #0176D3' : '3px solid transparent',
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(opt)}
                    style={{ accentColor: '#0176D3', width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: checked ? '#0176D3' : '#374151', fontWeight: checked ? 600 : 400, flex: 1 }}>{opt}</span>
                </label>
              );
            })}
            {visible.length === 0 && <p style={{ color: '#9E9D9B', fontSize: 12, padding: '12px 14px', margin: 0 }}>No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assign to Job modal (multi-job select) ───────────────────────────────
function AssignToJobModal({ count, onClose, onDone }) {
  const [jobs, setJobs]       = useState([]);
  const [selJobs, setSelJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    api.getJobs().then(j => {
      const arr = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);
      // Normalize _id → id so toggleJob/checked work correctly with lean() results
      setJobs(arr
        .map(x => ({ ...x, id: x.id || x._id?.toString() || String(x._id) }))
        .filter(x => x.status === 'Open' || x.status === 'active')
      );
    }).finally(() => setLoading(false));
  }, []);

  const toggleJob = (id) => setSelJobs(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);

  return (
    <Modal title={`Assign ${count} Candidate${count !== 1 ? 's' : ''} to Jobs`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: '#706E6B', fontSize: 13, margin: 0 }}>
          Select one or more open jobs — candidates will be added to each job's pipeline.
        </p>
        {loading ? <Spinner /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 10, padding: 8 }}>
            {jobs.length === 0 && <p style={{ color: '#9E9D9B', fontSize: 13, textAlign: 'center', padding: '12px 0', margin: 0 }}>No open jobs available.</p>}
            {jobs.map(j => {
              const checked = selJobs.includes(j.id);
              return (
                <label key={j.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: checked ? 'rgba(1,118,211,0.06)' : 'transparent', border: `1px solid ${checked ? 'rgba(1,118,211,0.3)' : 'transparent'}`, transition: 'all 0.15s' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleJob(j.id)} style={{ accentColor: '#0176D3', width: 15, height: 15, marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>{j.title}</div>
                    <div style={{ color: '#706E6B', fontSize: 11, marginTop: 2 }}>{j.company}{j.location ? ` · ${j.location}` : ''}</div>
                  </div>
                </label>
              );
            })}
          </div>
        )}
        {selJobs.length > 0 && (
          <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '8px 12px', color: '#0176D3', fontSize: 12, fontWeight: 600 }}>
            {selJobs.length} job{selJobs.length !== 1 ? 's' : ''} selected · {count} candidate{count !== 1 ? 's' : ''} = {selJobs.length * count} pipeline entries
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={async () => { if (!selJobs.length) return; setAssigning(true); await onDone(selJobs); onClose(); }}
            disabled={!selJobs.length || assigning}
            style={{ ...btnP, opacity: (!selJobs.length || assigning) ? 0.6 : 1 }}
          >
            {assigning ? 'Assigning…' : `Assign to ${selJobs.length || '?'} Job${selJobs.length !== 1 ? 's' : ''} →`}
          </button>
          <button onClick={onClose} style={btnG}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Dismissible chip tag ───────────────────────────────────────────────────
function Chip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px 3px 11px', borderRadius: 20,
      background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.22)',
      color: '#0176D3', fontSize: 11, fontWeight: 600,
    }}>
      {label}
      <button onClick={onRemove} style={{
        background: 'rgba(1,118,211,0.15)', border: 'none', padding: '0 3px',
        cursor: 'pointer', color: '#0176D3', fontSize: 13, lineHeight: 1,
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 16, height: 16, flexShrink: 0,
      }}>×</button>
    </span>
  );
}

// ── Pill-styled select dropdown ────────────────────────────────────────────
function PillSelect({ value, onChange, placeholder, options, icon = '', fullWidth = false }) {
  const active = !!value;
  return (
    <div style={{ position: 'relative', display: fullWidth ? 'flex' : 'inline-flex', alignItems: 'center' }}>
      {icon && (
        <span style={{ position: 'absolute', left: 11, fontSize: 12, pointerEvents: 'none', zIndex: 1, lineHeight: 1 }}>{icon}</span>
      )}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          padding: `7px 28px 7px ${icon ? '30px' : '14px'}`,
          borderRadius: 20,
          border: `1.5px solid ${active ? '#0176D3' : '#e2e8f0'}`,
          background: active ? '#0176D3' : '#fff',
          color: active ? '#fff' : '#374151',
          fontSize: 13, fontWeight: active ? 600 : 500, cursor: 'pointer',
          boxShadow: active ? '0 2px 8px rgba(1,118,211,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'all 0.18s', outline: 'none',
          width: fullWidth ? '100%' : 'auto', minWidth: 120, boxSizing: 'border-box',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ position: 'absolute', right: 10, pointerEvents: 'none', fontSize: 9, color: active ? 'rgba(255,255,255,0.8)' : '#9ca3af' }}>▼</span>
    </div>
  );
}

// ── Filter card wrapper ─────────────────────────────────────────────────────
function FilterCard({ label, icon, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e8ecf0',
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>{icon}</span>
        <span>{label.toUpperCase()}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AdminUsers({ filterRole, isSuperAdmin, recruiterView = false, recruiterId, user }) {
  const [users, setUsers]         = useState([]);
  const [loading, setLoad]        = useState(true);
  const [showModal, setShow]      = useState(false);
  const [form, setForm]           = useState({ name: '', email: '', role: filterRole || 'candidate', domain: '' });
  const [toast, setToast]         = useState('');
  const [expandedRec, setExpandedRec] = useState(null);
  const [detailUser, setDetailUser]   = useState(null);
  const [resetPwdUser, setResetPwdUser] = useState(null);
  const [drawerUser, setDrawerUser]   = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAssign, setShowAssign]   = useState(false);
  const [showInvite, setShowInvite]   = useState(false);
  const [advOpen, setAdvOpen]         = useState(false);
  const [useTempPwd, setUseTempPwd]   = useState(false);
  const [activeTab, setActiveTab]     = useState('users'); // 'users' | 'pending'
  const [pendingInvites, setPending]  = useState([]);
  const [pendingLoad, setPendingLoad] = useState(false);

  // ── basic filters ──
  const [search, setSearch]       = useState('');
  const [availFilter, setAvailFilter] = useState('');

  // ── multi-select filters ──
  const [skillsSel, setSkillsSel] = useState([]);
  const [locsSel, setLocsSel]     = useState([]);

  // ── advanced candidate-record filters ──
  const [clientFilter, setClientFilter]   = useState('');
  const [taFilter, setTaFilter]           = useState('');
  const [jobRoleFilter, setJobRoleFilter] = useState([]);
  const [certFilter, setCertFilter]       = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [expMin, setExpMin]               = useState('');
  const [expMax, setExpMax]               = useState('');

  const showDomainField = isSuperAdmin || filterRole === 'admin' || filterRole === 'recruiter';
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── derived option lists ──
  const allSkills  = [...new Set(users.flatMap(u => (Array.isArray(u.skills) ? u.skills : (u.skills || '').split(',')).map(s => s.trim()).filter(Boolean)))].sort();
  const allLocs    = [...new Set(users.map(u => u.location).filter(Boolean))].sort();
  const allClients = [...new Set(users.map(u => u.client).filter(Boolean))].sort();
  const allTAs     = [...new Set(users.map(u => u.ta).filter(Boolean))].sort();
  const allRoles   = [...new Set(users.map(u => u.jobRole).filter(Boolean))].sort();

  const isCandidates = filterRole === 'candidate';

  const hasBasicFilters = !!(search || skillsSel.length || locsSel.length || availFilter);
  const hasAdvFilters   = !!(clientFilter || taFilter || jobRoleFilter.length || certFilter || companyFilter || expMin || expMax);
  const hasFilters      = hasBasicFilters || hasAdvFilters;

  // ── filter logic ──
  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name?.toLowerCase().includes(q) &&
          !u.email?.toLowerCase().includes(q) &&
          !u.title?.toLowerCase().includes(q) &&
          !u.currentCompany?.toLowerCase().includes(q) &&
          !u.jobRole?.toLowerCase().includes(q)) return false;
    }
    if (skillsSel.length) { const sk = (Array.isArray(u.skills) ? u.skills.join(',') : (u.skills || '')).toLowerCase(); if (!skillsSel.some(s => sk.includes(s.toLowerCase()))) return false; }
    if (locsSel.length && !locsSel.includes(u.location)) return false;
    if (availFilter && u.availability !== availFilter) return false;
    if (clientFilter && u.client !== clientFilter) return false;
    if (taFilter && u.ta !== taFilter) return false;
    if (jobRoleFilter.length && !jobRoleFilter.some(r => (u.jobRole || '').toLowerCase().includes(r.toLowerCase()))) return false;
    if (certFilter) {
      const certArr = Array.isArray(u.certifications) ? u.certifications : (() => { try { return JSON.parse(u.certifications || '[]'); } catch { return []; } })();
      const hasCert = certArr.length > 0;
      if (certFilter === 'Yes' && !hasCert) return false;
      if (certFilter === 'No' && hasCert) return false;
    }
    if (companyFilter && !(u.currentCompany || '').toLowerCase().includes(companyFilter.toLowerCase())) return false;
    if (expMin !== '' && (Number(u.experience) || 0) < Number(expMin)) return false;
    if (expMax !== '' && (Number(u.experience) || 0) > Number(expMax)) return false;
    return true;
  });

  const clearAll = () => {
    setSearch(''); setSkillsSel([]); setLocsSel([]); setAvailFilter('');
    setClientFilter(''); setTaFilter(''); setJobRoleFilter([]); setCertFilter('');
    setCompanyFilter(''); setExpMin(''); setExpMax('');
    setSelectedIds(new Set());
  };

  const load = async () => {
    setLoad(true);
    try {
      let all = await api.getUsers(filterRole);
      const allArr = Array.isArray(all) ? all : (all.data || []);
      // Standardize: ensure each user has a string 'id' from either .id or ._id
      const normalized = allArr.map(u => ({
        ...u,
        id: u.id || u._id?.toString() || String(u._id || '')
      }));
      const filtered2 = recruiterView && recruiterId ? normalized.filter(u => String(u.addedBy) === String(recruiterId)) : normalized;
      setUsers(filtered2);
    } catch (e) { setToast(`❌ Failed to load users: ${e.message}`); setUsers([]); }
    setLoad(false);
  };
  useEffect(() => { load(); setExpandedRec(null); setSelectedIds(new Set()); setActiveTab('users'); }, [filterRole, recruiterId]);

  // Auto-open detail drawer if coming from notification deep-link
  useEffect(() => {
    if (loading || !users.length) return;
    const targetId = sessionStorage.getItem('tn_open_candidate_id');
    if (targetId) {
      const u = users.find(x => String(x.id || x._id) === String(targetId));
      if (u) {
        setDrawerUser(u);
        sessionStorage.removeItem('tn_open_candidate_id');
      }
    }
  }, [loading, users]);

  const loadPending = async () => {
    setPendingLoad(true);
    try { const r = await api.getPendingInvites(); setPending(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])); } catch { setPending([]); }
    setPendingLoad(false);
  };
  useEffect(() => { if (activeTab === 'pending') loadPending(); }, [activeTab]);

  const save = async () => {
    if (!form.name || !form.email) { setToast('❌ Name and email are required'); return; }
    const effectiveRole = form.role || filterRole;
    const isAdminRole = effectiveRole === 'admin';
    if (isAdminRole && !form.domain?.trim()) { setToast('❌ Company Website / Domain is required for admin accounts'); return; }
    try {
      const orgId = user?.orgId || JSON.parse(sessionStorage.getItem('tn_user') || '{}')?.orgId;
      if (effectiveRole === 'admin') {
        await api.inviteAdmin({ name: form.name, email: form.email, orgId, useTemporaryPassword: useTempPwd });
      } else if (effectiveRole === 'recruiter') {
        await api.inviteRecruiter({ name: form.name, email: form.email, orgId, useTemporaryPassword: useTempPwd });
      } else {
        await api.createUser({ ...form });
      }
      setToast(useTempPwd
        ? '✅ Account created — temporary password sent by email'
        : '✅ Invitation email sent — they will set their own password via the secure link');
      setShow(false);
      setForm({ name: '', email: '', role: filterRole, domain: '' });
      setUseTempPwd(false);
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
  };
  const resendInvite = async (u) => {
    try {
      await api.resendUserInvite(u.id || u._id);
      setToast(`✅ Invite resent to ${u.email}`);
    } catch (e) { setToast(`❌ ${e.message}`); }
  };
  const del = async (id) => {
    if (!window.confirm('Delete user?')) return;
    await api.deleteUser(id); load(); setToast('✅ Deleted');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll  = () => setSelectedIds(new Set(filtered.map(u => u.id)));
  const clearSel   = () => setSelectedIds(new Set());

  const handleAssignDone = async (jobIds) => {
    let count = 0;
    for (const jobId of jobIds) {
      for (const id of selectedIds) {
        try { await api.applyToJob(jobId, id); count++; } catch {}
      }
    }
    setToast(`✅ ${count} pipeline entr${count !== 1 ? 'ies' : 'y'} created across ${jobIds.length} job${jobIds.length !== 1 ? 's' : ''}`);
    clearSel();
  };

  const lbl         = recruiterView ? 'Candidate' : filterRole.charAt(0).toUpperCase() + filterRole.slice(1);
  const pageTitle   = recruiterView ? 'My Candidates' : `Manage ${lbl}s`;
  const pageSubtitle = hasFilters
    ? `${filtered.length} of ${users.length} ${lbl.toLowerCase()}s`
    : recruiterView
      ? `${users.length} candidates you added`
      : `${users.length} total`;


  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      {drawerUser && (
        <UserDetailDrawer 
          user={drawerUser} 
          isSuperAdmin={isSuperAdmin}
          currentUserRole={user?.role}
          onClose={() => setDrawerUser(null)} 
          onDelete={(id) => { del(id); setDrawerUser(null); }} 
          onUpdated={(updated) => { 
            setUsers(prev => prev.map(u => u.id === (updated?.id || updated?._id) ? { ...u, ...updated } : u)); 
            setDrawerUser(updated); 
            setToast('✅ Profile updated!'); 
            load(); // reload to ensure lists are fresh
          }} 
        />
      )}
      {resetPwdUser && <ChangePasswordModal user={user} targetUser={resetPwdUser} isSuperAdminReset={true} onClose={() => setResetPwdUser(null)} />}
      {showAssign && <AssignToJobModal count={selectedIds.size} onClose={() => setShowAssign(false)} onDone={handleAssignDone} />}
      {showInvite && (
        <InviteModal
          candidates={filtered.filter(u => selectedIds.has(u.id))}
          onClose={() => setShowInvite(false)}
          onSent={(n, title) => { setToast(`✅ ${n} invite${n !== 1 ? 's' : ''} sent for ${title}`); clearSel(); }}
        />
      )}

      {/* Resume modal */}
      {detailUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div style={{ width: '100%', maxWidth: 900, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}>
            <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>Candidate Profile</div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>📋 {detailUser.name}</div>
              </div>
              <button onClick={() => setDetailUser(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ background: '#fff', overflowY: 'auto', flex: 1 }}>
              <ResumeCard candidate={detailUser} />
            </div>
          </div>
        </div>
      )}

      <PageHeader title={pageTitle} subtitle={pageSubtitle} action={
        !recruiterView && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={async () => {
              try {
                const roleParam = filterRole ? `?role=${filterRole}` : '';
                const blob = await downloadBlob(`/users/export${roleParam}`);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `${filterRole || 'users'}-export.xlsx`; a.click();
                URL.revokeObjectURL(url);
              } catch { setToast('❌ Export failed'); }
            }} style={{ ...btnG, fontSize: 12, padding: '7px 14px' }}>⬇ Export</button>
            <button onClick={() => setShow(true)} style={btnP}>+ Add {lbl}</button>
          </div>
        )
      } />

      {/* Tabs — only for non-candidate, non-recruiterView */}
      {!isCandidates && !recruiterView && (
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e8ecf0', marginBottom: 16 }}>
          {[{ id: 'users', label: `All ${lbl}s` }, { id: 'pending', label: '📧 Pending Invites' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: 'none', border: 'none', padding: '10px 20px', fontSize: 13,
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#0176D3' : '#6b7280', cursor: 'pointer',
              borderBottom: activeTab === t.id ? '2px solid #0176D3' : '2px solid transparent',
              marginBottom: -2,
            }}>{t.label}</button>
          ))}
        </div>
      )}

      {/* ── Pending Invites tab panel ──────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <div>
          {pendingLoad ? <p style={{ color: '#706E6B' }}><Spinner /></p> : (
            pendingInvites.length === 0
              ? <p style={{ color: '#9E9D9B', textAlign: 'center', padding: '40px 0' }}>No pending invites. All team members have accepted.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {pendingInvites.map(inv => (
                    <div key={inv.id} style={{ ...card, border: '1px solid rgba(245,158,11,0.3)', background: '#fffbeb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                            {(inv.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#181818', fontWeight: 600 }}>{inv.name}</div>
                            <div style={{ color: '#0176D3', fontSize: 12 }}>{inv.email}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                              <span style={{ color: '#706E6B', fontSize: 11 }}>Role: <strong>{inv.role}</strong></span>
                              {inv.invitedBy?.name && <span style={{ color: '#706E6B', fontSize: 11 }}>Invited by: {inv.invitedBy.name}</span>}
                              {inv.invitedAt && <span style={{ color: '#706E6B', fontSize: 11 }}>Sent: {new Date(inv.invitedAt).toLocaleDateString()}</span>}
                              {inv.isExpired && <span style={{ color: '#BA0517', fontSize: 11, fontWeight: 700 }}>⚠️ Link expired</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={async () => { try { await api.resendInvite(inv.id); setToast(`✅ Invite resent to ${inv.email}`); loadPending(); } catch (e) { setToast(`❌ ${e.message}`); } }}
                            style={{ ...btnG, fontSize: 11, padding: '5px 12px', borderColor: 'rgba(245,158,11,0.5)', color: '#A07E00' }}
                          >📧 Resend</button>
                          <button
                            onClick={async () => { if (!window.confirm(`Revoke invite for ${inv.name}?`)) return; try { await api.revokeInvite(inv.id); setToast(`✅ Invite revoked for ${inv.email}`); loadPending(); } catch (e) { setToast(`❌ ${e.message}`); } }}
                            style={btnD}
                          >Revoke</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}
        </div>
      )}

      {/* ── Filter panel ─────────────────────────────────────────────────────── */}
      {activeTab === 'users' && !loading && users.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e8ecf0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

            {/* Row 1 — quick filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '14px 16px' }}>
              {/* Search pill */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none', color: '#9ca3af' }}>🔍</span>
                <input
                  placeholder="Search name, email, title, company…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 34px', borderRadius: 20,
                    border: `1.5px solid ${search ? '#0176D3' : '#e2e8f0'}`,
                    background: search ? 'rgba(1,118,211,0.04)' : '#f8fafc',
                    color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    transition: 'all 0.18s',
                  }}
                />
              </div>
              {allSkills.length > 0 && (
                <MultiSelect label="Skills" icon="🛠" options={allSkills} selected={skillsSel} onChange={setSkillsSel} />
              )}
              {allLocs.length > 0 && (
                <MultiSelect label="Location" icon="📍" options={allLocs} selected={locsSel} onChange={setLocsSel} />
              )}
              {isCandidates && (
                <PillSelect
                  value={availFilter} onChange={setAvailFilter}
                  placeholder="Availability" icon="🕐"
                  options={[
                    { value: 'Immediate',          label: 'Immediate' },
                    { value: '15 days notice',     label: '15 Days Notice' },
                    { value: '30 days notice',     label: '30 Days Notice' },
                    { value: '60 days notice',     label: '60 Days Notice' },
                    { value: '90 days notice',     label: '90 Days Notice' },
                    { value: 'Currently Employed', label: 'Currently Employed' },
                  ]}
                />
              )}
              {isCandidates && (
                <button onClick={() => setAdvOpen(v => !v)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20,
                  border: `1.5px solid ${hasAdvFilters ? '#0176D3' : '#e2e8f0'}`,
                  background: hasAdvFilters ? '#0176D3' : '#fff',
                  color: hasAdvFilters ? '#fff' : '#374151',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  boxShadow: hasAdvFilters ? '0 2px 8px rgba(1,118,211,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'all 0.18s',
                }}>
                  <span>⚙️</span>
                  <span>Filters</span>
                  {hasAdvFilters && (
                    <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                      {[clientFilter, taFilter, ...jobRoleFilter, certFilter, companyFilter, expMin, expMax].filter(Boolean).length}
                    </span>
                  )}
                  <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{advOpen ? '▲' : '▼'}</span>
                </button>
              )}
              {hasFilters && (
                <button onClick={clearAll} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '7px 13px', borderRadius: 20,
                  border: '1.5px solid #fee2e2', background: '#fff', color: '#BA0517',
                  fontSize: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.18s',
                }}>
                  ✕ Clear all
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {hasFilters && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 16px 12px', alignItems: 'center' }}>
                <span style={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, marginRight: 2 }}>Active:</span>
                {search && <Chip label={`🔍 "${search}"`} onRemove={() => setSearch('')} />}
                {skillsSel.map(s => <Chip key={s} label={`🛠 ${s}`} onRemove={() => setSkillsSel(skillsSel.filter(v => v !== s))} />)}
                {locsSel.map(l => <Chip key={l} label={`📍 ${l}`} onRemove={() => setLocsSel(locsSel.filter(v => v !== l))} />)}
                {availFilter && <Chip label={`🕐 ${availFilter}`} onRemove={() => setAvailFilter('')} />}
                {clientFilter && <Chip label={`🏢 ${clientFilter}`} onRemove={() => setClientFilter('')} />}
                {taFilter && <Chip label={`👤 ${taFilter}`} onRemove={() => setTaFilter('')} />}
                {jobRoleFilter.map(r => <Chip key={r} label={`💼 ${r}`} onRemove={() => setJobRoleFilter(jobRoleFilter.filter(v => v !== r))} />)}
                {certFilter && <Chip label={certFilter === 'Yes' ? '✓ Certified' : '✗ Not Certified'} onRemove={() => setCertFilter('')} />}
                {companyFilter && <Chip label={`🏭 ${companyFilter}`} onRemove={() => setCompanyFilter('')} />}
                {(expMin || expMax) && <Chip label={`🎓 ${expMin || '0'}–${expMax || '∞'} yrs`} onRemove={() => { setExpMin(''); setExpMax(''); }} />}
              </div>
            )}

            {/* Advanced filter panel */}
            {isCandidates && advOpen && (
              <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #f8fafc 0%, #f0f7ff 100%)', borderRadius: '0 0 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, letterSpacing: '0.8px' }}>⚙️ ADVANCED FILTERS</span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(1,118,211,0.25) 0%, transparent 100%)' }} />
                  {hasAdvFilters && (
                    <button onClick={() => { setClientFilter(''); setTaFilter(''); setJobRoleFilter([]); setCertFilter(''); setCompanyFilter(''); setExpMin(''); setExpMax(''); }}
                      style={{ background: 'none', border: 'none', color: '#BA0517', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
                      ✕ Clear
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 10 }}>

                  {allClients.length > 0 && (
                    <FilterCard label="Client" icon="🏢">
                      <PillSelect fullWidth value={clientFilter} onChange={setClientFilter} placeholder="All Clients"
                        options={allClients.map(c => ({ value: c, label: c }))} />
                    </FilterCard>
                  )}

                  {allTAs.length > 0 && (
                    <FilterCard label="TA / Recruiter" icon="👤">
                      <PillSelect fullWidth value={taFilter} onChange={setTaFilter} placeholder="All TAs"
                        options={allTAs.map(t => ({ value: t, label: t }))} />
                    </FilterCard>
                  )}

                  <FilterCard label="Job Role" icon="💼">
                    {allRoles.length > 0
                      ? <MultiSelect label="Job Roles" options={allRoles} selected={jobRoleFilter} onChange={setJobRoleFilter} />
                      : <input placeholder="e.g. SOC Analyst" value={jobRoleFilter[0] || ''} onChange={e => setJobRoleFilter(e.target.value ? [e.target.value] : [])}
                          style={{ width: '100%', padding: '7px 12px', borderRadius: 20, border: `1.5px solid ${jobRoleFilter.length ? '#0176D3' : '#e2e8f0'}`, background: '#fff', color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    }
                  </FilterCard>

                  <FilterCard label="Certifications" icon="🏅">
                    <PillSelect fullWidth value={certFilter} onChange={setCertFilter} placeholder="All"
                      options={[{ value: 'Yes', label: 'Certified ✓' }, { value: 'No', label: 'Not Certified' }]} />
                  </FilterCard>

                  <FilterCard label="Current Company" icon="🏭">
                    <input placeholder="Company name…" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
                      style={{ width: '100%', padding: '7px 12px', borderRadius: 20, border: `1.5px solid ${companyFilter ? '#0176D3' : '#e2e8f0'}`, background: companyFilter ? 'rgba(1,118,211,0.04)' : '#fff', color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'all 0.18s' }} />
                  </FilterCard>

                  <FilterCard label="Experience (yrs)" icon="🎓">
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="number" placeholder="Min" value={expMin} onChange={e => setExpMin(e.target.value)} min={0} max={50}
                        style={{ width: '100%', padding: '7px 8px', borderRadius: 20, border: `1.5px solid ${expMin ? '#0176D3' : '#e2e8f0'}`, background: expMin ? 'rgba(1,118,211,0.04)' : '#fff', color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
                      <span style={{ color: '#9ca3af', fontSize: 12, flexShrink: 0 }}>–</span>
                      <input type="number" placeholder="Max" value={expMax} onChange={e => setExpMax(e.target.value)} min={0} max={50}
                        style={{ width: '100%', padding: '7px 8px', borderRadius: 20, border: `1.5px solid ${expMax ? '#0176D3' : '#e2e8f0'}`, background: expMax ? 'rgba(1,118,211,0.04)' : '#fff', color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
                    </div>
                  </FilterCard>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bulk selection action bar ─────────────────────────────────────── */}
      {activeTab === 'users' && isCandidates && !loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: selectedIds.size > 0 ? 'rgba(1,118,211,0.08)' : '#FAFAFA', border: `1px solid ${selectedIds.size > 0 ? 'rgba(1,118,211,0.3)' : '#F3F2F2'}`, borderRadius: 10, transition: 'all 0.2s' }}>
          <input
            type="checkbox"
            checked={selectedIds.size > 0 && selectedIds.size === filtered.length}
            ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length; }}
            onChange={e => e.target.checked ? selectAll() : clearSel()}
            style={{ accentColor: '#0176D3', width: 15, height: 15, cursor: 'pointer' }}
          />
          <span style={{ color: '#706E6B', fontSize: 12 }}>
            {selectedIds.size > 0 ? <strong style={{ color: '#0176D3' }}>{selectedIds.size} selected</strong> : `Select candidates to assign`}
          </span>
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => setShowInvite(true)} style={{ ...btnP, padding: '5px 14px', fontSize: 12, background: '#0154A4' }}>
                📧 Invite to Apply
              </button>
              <button onClick={() => setShowAssign(true)} style={{ ...btnP, padding: '5px 14px', fontSize: 12 }}>
                Assign to Job →
              </button>
              <button onClick={clearSel} style={{ background: 'none', border: 'none', color: '#706E6B', fontSize: 12, cursor: 'pointer' }}>Clear</button>
            </>
          )}
          {selectedIds.size === 0 && filtered.length > 1 && (
            <button onClick={selectAll} style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Select all {filtered.length}</button>
          )}
        </div>
      )}

      {/* ── User list ─────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (loading ? <p style={{ color: '#706E6B' }}><Spinner /></p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 && users.length > 0 && (
            <p style={{ color: '#9E9D9B', textAlign: 'center', padding: '32px 0' }}>No {lbl.toLowerCase()}s match your filters.</p>
          )}
          {users.length === 0 && (
            <p style={{ color: '#9E9D9B', textAlign: 'center', padding: '40px 0' }}>No {lbl.toLowerCase()}s found.</p>
          )}
          {filtered.map(u => {
            const isExpanded = filterRole === 'recruiter' && expandedRec === u.id;
            const isSelected = selectedIds.has(u.id);
            return (
              <div key={u.id} style={{ ...card, border: `1px solid ${isSelected ? 'rgba(1,118,211,0.4)' : 'transparent'}`, background: isSelected ? 'rgba(1,118,211,0.03)' : '#fff', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Checkbox for candidates */}
                    {isCandidates && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(u.id)}
                        onClick={e => e.stopPropagation()}
                        style={{ accentColor: '#0176D3', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
                      {(u.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ color: '#181818', fontWeight: 600 }}>{u.name}</div>
                      </div>
                      <div style={{ color: '#0176D3', fontSize: 12 }}>{u.email}</div>
                      {u.title && <div style={{ color: '#706E6B', fontSize: 11 }}>{u.title}{u.location ? ` · ${u.location}` : ''}</div>}
                      {/* Candidate extra fields */}
                      {isCandidates && (u.client || u.ta || u.jobRole) && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                          {u.client && <span style={{ color: '#706E6B', fontSize: 10 }}>🏢 {u.client}</span>}
                          {u.ta && <span style={{ color: '#706E6B', fontSize: 10 }}>👤 TA: {u.ta}</span>}
                          {u.jobRole && <span style={{ color: '#706E6B', fontSize: 10 }}>💼 {u.jobRole}</span>}
                          {u.experience ? <span style={{ color: '#706E6B', fontSize: 10 }}>🎓 {u.experience} yrs</span> : null}
                          {u.currentCTC && <span style={{ color: '#2E844A', fontSize: 10 }}>💰 {u.currentCTC}</span>}
                          {(() => { try { const c = Array.isArray(u.certifications) ? u.certifications : JSON.parse(u.certifications || '[]'); return c.length > 0 ? <span style={{ color: '#A07E00', fontSize: 10 }}>✓ Certified</span> : null; } catch { return null; } })()}
                        </div>
                      )}
                      {u.skills && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {(Array.isArray(u.skills) ? u.skills : (u.skills || '').split(',').map(s => s.trim()).filter(Boolean)).slice(0, 4).map(s => <Badge key={s} label={s.trim()} color="#0154A4" />)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge label={u.role} color="#0176D3" />
                    {filterRole === 'candidate' && (
                      <button onClick={() => setDetailUser(u)} style={{ ...btnG, padding: '6px 12px', fontSize: 11, borderColor: 'rgba(1,118,211,0.4)', color: '#0176D3' }}>
                        📋 Resume
                      </button>
                    )}
                    {filterRole === 'recruiter' && (
                      <button onClick={() => setExpandedRec(isExpanded ? null : u.id)} style={{ ...btnG, padding: '6px 12px', fontSize: 11, borderColor: isExpanded ? '#0176D3' : '', color: isExpanded ? '#0176D3' : '' }}>
                        {isExpanded ? '▲ Hide' : '👁 Activity'}
                      </button>
                    )}
                    <button onClick={() => setDrawerUser(u)} style={{ ...btnP, fontSize: 11, padding: '5px 12px' }}>✏️ Edit</button>
                    {u.isActive === false && <button onClick={() => resendInvite(u)} style={{ ...btnG, fontSize: 11, padding: '5px 10px', borderColor: 'rgba(245,158,11,0.5)', color: '#A07E00' }}>📧 Resend Invite</button>}
                    {isSuperAdmin && u.isActive !== false && <button onClick={() => setResetPwdUser(u)} style={{ ...btnG, fontSize: 11, padding: '5px 10px' }}>🔒 Reset Pwd</button>}
                    {!recruiterView && <button onClick={() => del(u.id)} style={btnD}>Delete</button>}
                  </div>
                </div>
                {isExpanded && <RecruiterActivityPanel recruiterId={u.id} />}
              </div>
            );
          })}
        </div>
      ))}

      {/* Add user modal */}
      {showModal && (
        <Modal title={`Add ${lbl}`} onClose={() => { setShow(false); setUseTempPwd(false); }}
          footer={<><button onClick={save} style={btnP}>Create</button><button onClick={() => setShow(false)} style={btnG}>Cancel</button></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Full Name *" value={form.name} onChange={v => sf('name', v)} />
            <Field label="Email *" value={form.email} onChange={v => sf('email', v)} type="email" />
            {isSuperAdmin && <Dropdown label="Role" value={form.role} onChange={v => { sf('role', v); setUseTempPwd(false); }} options={[{ value: 'candidate', label: 'Candidate' }, { value: 'recruiter', label: 'Recruiter' }, { value: 'admin', label: 'Admin' }]} />}

            {/* Invite method toggle — only for admin/recruiter */}
            {(form.role === 'admin' || form.role === 'recruiter' || filterRole === 'admin' || filterRole === 'recruiter') && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Delivery Method</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setUseTempPwd(false)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${!useTempPwd ? '#0176D3' : '#e2e8f0'}`,
                    background: !useTempPwd ? 'rgba(1,118,211,0.08)' : '#fff',
                    color: !useTempPwd ? '#0176D3' : '#64748b',
                  }}>
                    🔗 Secure invite link
                    <div style={{ fontWeight: 400, fontSize: 10, marginTop: 2 }}>They set their own password</div>
                  </button>
                  <button type="button" onClick={() => setUseTempPwd(true)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${useTempPwd ? '#f59e0b' : '#e2e8f0'}`,
                    background: useTempPwd ? 'rgba(245,158,11,0.08)' : '#fff',
                    color: useTempPwd ? '#A07E00' : '#64748b',
                  }}>
                    🔑 Temp password
                    <div style={{ fontWeight: 400, fontSize: 10, marginTop: 2 }}>Email them credentials</div>
                  </button>
                </div>
              </div>
            )}

            {/* Info banner */}
            {!useTempPwd ? (
              <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 12, color: '#2E844A' }}>
                📧 A branded invite email will be sent — they set their own password via a secure link (expires in 7 days).
              </div>
            ) : (
              <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, fontSize: 12, color: '#A07E00' }}>
                🔑 Temporary password <strong>TalentNest@2024</strong> will be emailed — they must change it on first login.
              </div>
            )}
            {showDomainField && (
              <Field
                label="Company Website / Domain"
                value={form.domain}
                onChange={v => sf('domain', v)}
                placeholder="e.g. acme.com or https://acme.com"
                required={form.role === 'admin' || filterRole === 'admin'}
                hint={(form.role === 'admin' || filterRole === 'admin') ? 'Required — scopes this admin to their org' : undefined}
              />
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
