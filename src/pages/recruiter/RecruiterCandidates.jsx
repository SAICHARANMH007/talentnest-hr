import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';
import InviteModal from '../../components/shared/InviteModal.jsx';
import BulkWhatsAppModal from '../../components/shared/BulkWhatsAppModal.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

import { usePresence } from '../../hooks/usePresence.js';
import PresenceBadge from '../../components/shared/PresenceBadge.jsx';

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 640);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const parseJ = (s, fb = []) => { try { return typeof s === 'string' ? JSON.parse(s || '[]') : (Array.isArray(s) ? s : fb); } catch { return fb; } };

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function expYears(c) {
  const wh = parseJ(c.workHistory);
  if (wh.length) {
    let total = 0;
    wh.forEach(w => {
      const from = parseInt(w.from) || 0;
      const to   = w.current ? new Date().getFullYear() : (parseInt(w.to) || from);
      if (from) total += Math.max(0, to - from);
    });
    if (total > 0) return total;
  }
  // fallback: experienceYears field
  const n = parseFloat(c.experienceYears || c.experience || 0);
  return isNaN(n) ? 0 : n;
}

function matchCandidate(c, filters) {
  const { designation, skills, location, expMin, expMax } = filters;
  if (!designation && !skills && !location && expMin === '' && expMax === '') return true;

  const title    = (c.title || c.currentRole || '').toLowerCase();
  const loc      = (c.location || '').toLowerCase();
  const skillStr = (Array.isArray(c.skills) ? c.skills.join(',') : (c.skills || '')).toLowerCase();
  const summary  = (c.summary || '').toLowerCase();
  const exp      = expYears(c);

  if (designation) {
    const kw = designation.toLowerCase();
    if (!title.includes(kw) && !summary.includes(kw)) return false;
  }
  if (skills) {
    const kwds = skills.toLowerCase().split(/[,\s]+/).filter(Boolean);
    if (!kwds.some(k => skillStr.includes(k) || title.includes(k))) return false;
  }
  if (location) {
    if (!loc.includes(location.toLowerCase())) return false;
  }
  if (expMin !== '') {
    if (exp < parseFloat(expMin)) return false;
  }
  if (expMax !== '') {
    if (exp > parseFloat(expMax)) return false;
  }
  return true;
}

// ── CandidateCard ─────────────────────────────────────────────────────────────
function CandidateCard({ c, jobs, onAddPipeline, onViewResume, onReachOut, onInvite, onToast, onEditProfile, isOnline }) {
  const isMobile  = useIsMobile();
  const [selJobs, setSelJobs]   = useState([]);
  const [dropOpen, setDropOpen] = useState(false);
  const [adding,   setAdding]   = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note,     setNote]     = useState('');
  const [marking,  setMarking]  = useState(false);
  const dropRef = React.useRef(null);

  useEffect(() => {
    if (!dropOpen) return;
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropOpen]);

  const toggleJob   = (id) => setSelJobs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const exp         = expYears(c);
  const allSkills   = Array.isArray(c.skills) ? c.skills : (c.skills || '').split(',').map(s => s.trim()).filter(Boolean);
  const skills      = allSkills.slice(0, isMobile ? 4 : 5);

  const markReached = async () => {
    setMarking(true);
    try { await onReachOut(c.id || c._id, note); setNote(''); setShowNote(false); }
    catch (e) { onToast?.(`❌ ${e?.message || 'Failed to save outreach note'}`); }
    setMarking(false);
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10, padding: isMobile ? '12px 14px' : undefined }}>

      {/* ── Header: avatar + identity + resume button ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: isMobile ? 40 : 44, height: isMobile ? 40 : 44, borderRadius: '50%', background: 'linear-gradient(135deg,#0176D3,#032D60)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: isMobile ? 16 : 18 }}>
            {(c.name || '?')[0].toUpperCase()}
          </div>
        </div>

        {/* Identity */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
            <div style={{ color: '#181818', fontWeight: 700, fontSize: isMobile ? 14 : 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {c.name || '—'}
            </div>
            <PresenceBadge userId={c.id || c._id} showLabel={true} />
          </div>

          {/* Title */}
          {c.title && (
            <div style={{ color: '#0176D3', fontSize: 12, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.title}
            </div>
          )}

          {/* Meta row — location / exp / phone, always wraps */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {c.location && (
              <span style={{ color: '#706E6B', fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
                📍 <span style={{ maxWidth: isMobile ? 90 : 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{c.location}</span>
              </span>
            )}
            {exp > 0 && <span style={{ color: '#706E6B', fontSize: 11, whiteSpace: 'nowrap' }}>⏱ {exp}y exp</span>}
            {c.phone && <span style={{ color: '#706E6B', fontSize: 11, whiteSpace: 'nowrap' }}>📞 {c.phone}</span>}
          </div>

          {/* Email */}
          {c.email && (
            <div style={{ color: '#706E6B', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✉ {c.email}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {onEditProfile && (
            <button onClick={() => onEditProfile(c)}
              style={{ ...btnP, padding: isMobile ? '6px 10px' : '6px 14px', fontSize: 11, flexShrink: 0, minHeight: 36 }}>
              {isMobile ? '✏️' : '✏️ Edit Profile'}
            </button>
          )}
          <button onClick={() => onViewResume(c)}
            style={{ ...btnG, padding: isMobile ? '6px 10px' : '6px 14px', fontSize: 11, borderColor: 'rgba(1,118,211,0.4)', color: '#0176D3', flexShrink: 0, minHeight: 36 }}>
            {isMobile ? '📋' : '📋 Resume'}
          </button>
        </div>
      </div>

      {/* ── Skills ── */}
      {skills.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {skills.map(s => <Badge key={s} label={s.trim()} color="#0154A4" />)}
          {allSkills.length > (isMobile ? 4 : 5) && (
            <span style={{ color: '#9E9D9B', fontSize: 11, alignSelf: 'center' }}>+{allSkills.length - (isMobile ? 4 : 5)} more</span>
          )}
        </div>
      )}

      {/* ── Summary ── */}
      {c.summary && (
        <div style={{ color: '#706E6B', fontSize: 12, lineHeight: 1.55, borderLeft: '2px solid rgba(1,118,211,0.25)', paddingLeft: 10 }}>
          {c.summary.slice(0, isMobile ? 120 : 180)}{c.summary.length > (isMobile ? 120 : 180) ? '…' : ''}
        </div>
      )}

      {/* ── Outreach tracker ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {c.lastReachedOutAt ? (
          <span style={{ fontSize: 11, color: '#0176D3', background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '3px 10px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            📬 {timeAgo(c.lastReachedOutAt)}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#C9C7C5', borderRadius: 20, padding: '3px 8px' }}>Not contacted</span>
        )}
        {c.reachOutNote && !isMobile && (
          <span style={{ fontSize: 11, color: '#706E6B', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>"{c.reachOutNote}"</span>
        )}
        <button
          onClick={() => setShowNote(p => !p)}
          style={{ fontSize: 11, background: 'rgba(1,118,211,0.08)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#0176D3', padding: '4px 10px', cursor: 'pointer', fontWeight: 600, minHeight: 32 }}
        >
          {showNote ? '✕ Cancel' : '+ Log Outreach'}
        </button>
      </div>

      {showNote && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (e.g. Sent LinkedIn, called…)"
            style={{ width: '100%', padding: '9px 12px', background: '#F8FAFF', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={markReached} disabled={marking} style={{ flex: 1, background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, padding: '9px 0', cursor: 'pointer', opacity: marking ? 0.6 : 1, minHeight: 40 }}>
              {marking ? '…' : '✓ Save Note'}
            </button>
            <button onClick={() => setShowNote(false)} style={{ background: '#fff', border: '1px solid #DDDBDA', borderRadius: 8, color: '#706E6B', fontSize: 13, padding: '9px 14px', cursor: 'pointer', minHeight: 40 }}>✕</button>
          </div>
        </div>
      )}

      {/* ── Add to pipeline ── */}
      <div style={{ paddingTop: 8, borderTop: '1px solid #F3F2F2' }}>
        <div style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, marginBottom: 6 }}>ADD TO PIPELINE</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} ref={dropRef}>
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => setDropOpen(p => !p)}
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#fff', border: '1.5px solid #DDDBDA', borderRadius: 8, color: '#181818', outline: 'none', fontFamily: 'inherit', minHeight: 38 }}
            >
              <span style={{ color: selJobs.length > 0 ? '#181818' : '#9E9D9B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selJobs.length > 0 ? `${selJobs.length} role${selJobs.length > 1 ? 's' : ''} selected` : '— Select role(s) —'}
              </span>
              <span style={{ fontSize: 10, opacity: 0.5, flexShrink: 0, marginLeft: 4 }}>{dropOpen ? '▲' : '▼'}</span>
            </button>
            {dropOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: '#fff', border: '1px solid #DDDBDA', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
                {jobs.length === 0 ? (
                  <div style={{ padding: 14, color: '#9E9D9B', fontSize: 12 }}>No jobs available</div>
                ) : jobs.map(j => {
                  const checked = selJobs.includes(j.id);
                  return (
                    <div key={j.id} onClick={() => toggleJob(j.id)}
                      style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 12px', cursor: 'pointer', background: checked ? 'rgba(1,118,211,0.06)' : '#fff', borderBottom: '1px solid #F3F2F2' }}
                      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#F3F2F2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = checked ? 'rgba(1,118,211,0.06)' : '#fff'; }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? '#0176D3' : '#DDDBDA'}`, background: checked ? '#0176D3' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {checked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#181818', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                        <div style={{ color: '#706E6B', fontSize: 11 }}>{j.company}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button
            disabled={selJobs.length === 0 || adding}
            onClick={async () => {
              if (!selJobs.length) return;
              setAdding(true);
              for (const jobId of selJobs) await onAddPipeline(c, jobId);
              setSelJobs([]); setDropOpen(false); setAdding(false);
            }}
            style={{ ...btnP, padding: '8px 14px', fontSize: 12, whiteSpace: 'nowrap', opacity: (selJobs.length === 0 || adding) ? 0.5 : 1, minHeight: 38, flexShrink: 0 }}
          >
            {adding ? <Spinner /> : `➕${selJobs.length > 1 ? ` (${selJobs.length})` : ' Add'}`}
          </button>
        </div>

        <button
          onClick={() => onInvite(c)}
          style={{ marginTop: 8, width: '100%', padding: '9px 0', background: 'rgba(1,118,211,0.05)', border: '1.5px dashed rgba(1,118,211,0.35)', borderRadius: 8, color: '#0176D3', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 40 }}
        >
          📧 Send Invite to Apply
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecruiterCandidates({ user }) {
  const navigate = useNavigate();
  const [allCandidates, setAllCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [inviteCandidate, setInviteCandidate] = useState(null);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [waModal, setWaModal] = useState(false);
  const [waTemplate, setWaTemplate] = useState('Hi {candidateName}, we have an exciting opportunity for {jobTitle} at {companyName}. Please reply to express your interest. Regards, {recruiterName}');
  const [waSending, setWaSending] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [drawerCandidate, setDrawerCandidate] = useState(null);
  const { onlineUsers } = usePresence();
  const onlineIds = new Set(onlineUsers.map(u => String(u.id)));

  const [filters, setFilters] = useState({
    designation: '',
    skills: '',
    location: '',
    expMin: '',
    expMax: '',
    roles: [], // multi-select role categories
  });
  const sf = (k, v) => setFilters(p => ({ ...p, [k]: v }));
  const toggleRoleFilter = (r) => setFilters(p => ({ ...p, roles: p.roles.includes(r) ? p.roles.filter(x => x !== r) : [...p.roles, r] }));

  const ROLE_CATS = ['IT', 'Cybersecurity', 'Non-IT', 'Finance', 'HR', 'Sales', 'Operations', 'Management'];
  const roleMatch = (c) => {
    if (!filters.roles.length) return true;
    const hay = `${c.title||''} ${c.skills||''} ${c.summary||''}`.toLowerCase();
    const map = { IT:['developer','engineer','devops','cloud','software','it','fullstack','frontend','backend','data','ml','ai','mobile','qa','architect'],Cybersecurity:['security','soc','pentest','grc','ciso','infosec','compliance','cyber'],Finance:['finance','accounting','analyst','cfo','auditor','tax','banking'],HR:['hr','recruiter','people','talent','payroll','hrbp'],Sales:['sales','business development','account','revenue','growth','marketing'],Operations:['operations','supply chain','logistics','procurement'],Management:['manager','director','vp','head','lead','ceo','cto'] };
    return filters.roles.some(r => (map[r]||[r.toLowerCase()]).some(kw => hay.includes(kw)));
  };

  // load candidates + recruiter's jobs on mount — show all candidates immediately
  useEffect(() => {
    (async () => {
      try {
        const [cands, myJobs] = await Promise.all([
          api.getUsers('candidate'),
          api.getJobs(user.id),
        ]);
        const rawCands = Array.isArray(cands) ? cands : (Array.isArray(cands?.data) ? cands.data : []);
        // Deduplicate candidates by ID to prevent ghost/duplicate items
        const cMap = new Map();
        rawCands.forEach(item => {
          const id = (item.id || item._id)?.toString();
          if (id) cMap.set(id, { ...item, id });
        });
        const normalized = Array.from(cMap.values());
        setAllCandidates(normalized);

        // Normalize jobs and deduplicate them too
        const rawJobs = Array.isArray(myJobs) ? myJobs : (Array.isArray(myJobs?.data) ? myJobs.data : []);
        const jMap = new Map();
        rawJobs.forEach(item => {
          const id = (item.id || item._id)?.toString();
          if (id) jMap.set(id, { ...item, id });
        });
        setJobs(Array.from(jMap.values()));

        // Auto-show all candidates on load
        setResults(normalized);
        setSearched(true);
      } catch (e) {
        setToast('❌ ' + e.message);
      }
      setLoading(false);
    })();
  }, [user.id]);

  // Auto-open detail modal if coming from notification deep-link
  useEffect(() => {
    if (loading || !allCandidates.length) return;
    const targetId = sessionStorage.getItem('tn_open_candidate_id');
    if (targetId) {
      const u = allCandidates.find(x => String(x.id || x._id) === String(targetId));
      if (u) {
        setDetailUser(u);
        sessionStorage.removeItem('tn_open_candidate_id');
      }
    }
  }, [loading, allCandidates]);

  const applyFilters = (candidates, onlyOnline) => {
    let res = candidates.filter(c => matchCandidate(c, filters) && roleMatch(c));
    if (onlyOnline) res = res.filter(c => onlineIds.has(c.id || c._id?.toString()));
    return res;
  };

  const search = () => {
    setResults(applyFilters(allCandidates, onlineOnly));
    setSearched(true);
  };

  const reset = () => {
    setFilters({ designation: '', skills: '', location: '', expMin: '', expMax: '', roles: [] });
    setOnlineOnly(false);
    setResults(allCandidates);
    setSearched(true);
  };

  // Re-apply online filter live as online status changes
  useEffect(() => {
    if (!searched) return;
    setResults(applyFilters(allCandidates, onlineOnly));
  }, [onlineIds]); // eslint-disable-line

  const addToPipeline = async (candidate, jobId) => {
    try {
      await api.applyToJob(jobId, candidate.id);
      const job = jobs.find(j => j.id === jobId);
      setToast(`✅ ${candidate.name} added to pipeline for "${job?.title || 'job'}"`);
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('duplicate')) {
        setToast(`⚠️ ${candidate.name} is already in the pipeline for this job`);
      } else {
        setToast(`❌ ${msg}`);
      }
    }
  };

  const handleReachOut = async (candidateId, note) => {
    try {
      const updated = await api.markReachOut(candidateId, note);
      const upd = updated?.data || updated;
      setAllCandidates(prev => prev.map(c => (c.id || c._id) === (upd.id || upd._id) ? { ...c, ...upd } : c));
      setResults(prev => prev.map(c => (c.id || c._id) === (upd.id || upd._id) ? { ...c, ...upd } : c));
      setToast('✅ Outreach logged!');
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
  };

  const hasFilters = filters.designation || filters.skills || filters.location || filters.expMin || filters.expMax || filters.roles.length > 0 || onlineOnly;

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Invite modal */}
      {inviteCandidate && (
        <InviteModal
          candidates={[inviteCandidate]}
          onClose={() => setInviteCandidate(null)}
          onSent={() => { setInviteCandidate(null); setToast(`✅ Invite sent to ${inviteCandidate.name}`); }}
        />
      )}

      <PageHeader
        title="Talent Pool"
        subtitle={`${allCandidates.length} candidate${allCandidates.length !== 1 ? 's' : ''} in pool · filter by designation, skills, location or experience`}
      />

      {loading ? (
        <div style={{ color: '#706E6B', display: 'flex', gap: 8, alignItems: 'center' }}><Spinner /> Loading candidate pool…</div>
      ) : (
        <>
          {/* ── Filter Panel ── */}
          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🔍 SEARCH FILTERS</div>
            <FormRow cols={2}>
              <Field label="Designation / Title" value={filters.designation} onChange={v => sf('designation', v)} placeholder="e.g. React Developer" />
              <Field label="Skills (comma-separated)" value={filters.skills} onChange={v => sf('skills', v)} placeholder="e.g. React, Node.js, SQL" />
              <Field label="Location" value={filters.location} onChange={v => sf('location', v)} placeholder="e.g. Hyderabad" />
              <FormRow cols={2} gap={8} style={{ alignItems: 'end' }}>
                <Field label="Min Exp (yrs)" type="number" min="0" max="50" value={filters.expMin} onChange={v => sf('expMin', v)} placeholder="0" />
                <Field label="Max Exp (yrs)" type="number" min="0" max="50" value={filters.expMax} onChange={v => sf('expMax', v)} placeholder="30" />
              </FormRow>
            </FormRow>

            {/* Role category multi-select */}
            <div style={{ marginTop: 14 }}>
              <div style={{ color: '#706E6B', fontSize: 11, marginBottom: 6 }}>Role Category (multi-select)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLE_CATS.map(r => {
                  const active = filters.roles.includes(r);
                  return (
                    <button key={r} onClick={() => toggleRoleFilter(r)}
                      style={{ padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${active ? '#0176D3' : '#DDDBDA'}`, background: active ? '#0176D3' : '#fff', color: active ? '#fff' : '#706E6B', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={search} style={btnP}>🔍 Search</button>
              <button
                onClick={() => {
                  const next = !onlineOnly;
                  setOnlineOnly(next);
                  setResults(applyFilters(allCandidates, next));
                  setSearched(true);
                }}
                style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${onlineOnly ? '#22c55e' : '#DDDBDA'}`, background: onlineOnly ? '#f0fdf4' : '#fff', color: onlineOnly ? '#15803D' : '#706E6B', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: onlineOnly ? '#22c55e' : '#d1d5db', display: 'inline-block' }} />
                {onlineOnly ? `Online Now (${onlineIds.size})` : 'Online Now'}
              </button>
              {hasFilters && <button onClick={reset} style={btnG}>✕ Clear</button>}
              <span style={{ color: '#9E9D9B', fontSize: 12 }}>
                {allCandidates.length} candidate{allCandidates.length !== 1 ? 's' : ''} in pool
              </span>
            </div>
          </div>

          {/* ── Results ── */}
          {!searched && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9E9D9B' }}>
              <Spinner />
            </div>
          )}

          {searched && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔎</div>
              <div style={{ color: '#706E6B', fontSize: 14 }}>No candidates match your filters</div>
              <div style={{ color: '#9E9D9B', fontSize: 12, marginTop: 6 }}>Try broadening your search criteria</div>
            </div>
          )}

          {searched && results.length > 0 && (
            <>
              <div className="tn-bulk-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
                  👥 {results.length} CANDIDATE{results.length !== 1 ? 'S' : ''} {hasFilters ? 'FOUND' : 'IN POOL'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {selectedIds.length > 0 && (
                    <button onClick={() => setWaModal(true)} style={{ ...btnP, fontSize: 12, padding: '6px 14px', background: '#25D366', borderColor: '#25D366' }}>
                      📲 WhatsApp {selectedIds.length} Selected
                    </button>
                  )}
                  <button onClick={() => setSelectedIds(selectedIds.length === results.length ? [] : results.map(c => c.id || c._id?.toString()))}
                    style={{ ...btnG, fontSize: 12, padding: '6px 14px' }}>
                    {selectedIds.length === results.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {jobs.length === 0 && (
                <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: '#F59E0B', fontSize: 12 }}>
                  ⚠️ You have no active jobs yet. Create a job first to add candidates to your pipeline.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map(c => {
                  const cId = c.id || c._id?.toString();
                  const isChecked = selectedIds.includes(cId);
                  return (
                    <div key={cId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => setSelectedIds(p => isChecked ? p.filter(x => x !== cId) : [...p, cId])}
                        style={{ marginTop: 14, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <CandidateCard
                          c={c}
                          jobs={jobs}
                          onAddPipeline={addToPipeline}
                          onViewResume={(cand) => navigate(`/app/resume/${cand.id || cand._id?.toString()}`)}
                          onReachOut={handleReachOut}
                          onToast={setToast}
                          onInvite={setInviteCandidate}
                          onEditProfile={(cand) => setDrawerCandidate({ role: 'candidate', ...cand, id: cand.id || cand._id?.toString(), _partial: true })}
                          isOnline={onlineIds.has(c.id || c._id?.toString())}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bulk WhatsApp Modal */}
              {waModal && (
                <BulkWhatsAppModal
                  candidates={results.filter(c => selectedIds.includes(c.id || c._id?.toString()))}
                  jobTitle={jobs[0]?.title || ''}
                  companyName={jobs[0]?.company || ''}
                  recruiterName={user?.name || ''}
                  onClose={() => setWaModal(false)}
                  onComplete={summary => {
                    setToast(`WhatsApp: ${summary}`);
                    setWaModal(false);
                    setSelectedIds([]);
                  }}
                />
              )}
            </>
          )}
        </>
      )}
      {drawerCandidate && (
        <UserDetailDrawer
          user={drawerCandidate}
          onClose={() => setDrawerCandidate(null)}
          onUpdated={() => setDrawerCandidate(null)}
        />
      )}
    </div>
  );
}