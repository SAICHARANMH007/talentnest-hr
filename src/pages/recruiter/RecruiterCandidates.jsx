import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Field from '../../components/ui/Field.jsx';
import FormRow from '../../components/ui/FormRow.jsx';
import ResumeCard from '../../components/shared/ResumeCard.jsx';
import InviteModal from '../../components/shared/InviteModal.jsx';
import BulkWhatsAppModal from '../../components/shared/BulkWhatsAppModal.jsx';
import { btnP, btnG, btnD, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

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
function CandidateCard({ c, jobs, onAddPipeline, onViewResume, onReachOut, onInvite, onToast }) {
  const [selJobs, setSelJobs] = useState([]); // multi-select job IDs
  const [dropOpen, setDropOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const dropRef = React.useRef(null);

  useEffect(() => {
    if (!dropOpen) return;
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropOpen]);

  const toggleJob = (id) => setSelJobs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [marking, setMarking] = useState(false);
  const exp = expYears(c);
  const skills = (Array.isArray(c.skills) ? c.skills : (c.skills || '').split(',').map(s => s.trim()).filter(Boolean)).slice(0, 5);

  const markReached = async () => {
    setMarking(true);
    try { await onReachOut(c.id || c._id, note); setNote(''); setShowNote(false); }
    catch (e) { onToast?.(`❌ ${e?.message || 'Failed to save outreach note'}`); }
    setMarking(false);
  };

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
            {(c.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: '#181818', fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
            {c.title && <div style={{ color: '#0176D3', fontSize: 12, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              {c.location && <span style={{ color: '#706E6B', fontSize: 11 }}>📍 {c.location}</span>}
              {exp > 0 && <span style={{ color: '#706E6B', fontSize: 11 }}>⏱ {exp}y exp</span>}
              {c.phone && <span style={{ color: '#706E6B', fontSize: 11 }}>📞 {c.phone}</span>}
            </div>
            {c.email && <div style={{ color: '#706E6B', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>✉ {c.email}</div>}
          </div>
        </div>
        <button onClick={() => onViewResume(c)} style={{ ...btnG, padding: '6px 14px', fontSize: 12, borderColor: 'rgba(1,118,211,0.4)', color: '#0176D3', flexShrink: 0 }}>
          📋 Resume
        </button>
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {skills.map(s => <Badge key={s} label={s.trim()} color="#0154A4" />)}
          {(Array.isArray(c.skills) ? c.skills : (c.skills || '').split(',').map(s => s.trim()).filter(Boolean)).length > 5 && (
            <span style={{ color: '#4c9bbf', fontSize: 11, alignSelf: 'center' }}>+{(Array.isArray(c.skills) ? c.skills : (c.skills || '').split(',').map(s => s.trim()).filter(Boolean)).length - 5} more</span>
          )}
        </div>
      )}

      {/* Summary */}
      {c.summary && (
        <div style={{ color: '#706E6B', fontSize: 12, lineHeight: 1.5, borderLeft: '2px solid rgba(1,118,211,0.3)', paddingLeft: 10 }}>
          {c.summary.slice(0, 180)}{c.summary.length > 180 ? '…' : ''}
        </div>
      )}

      {/* Recruiter collab tracker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
        {c.lastReachedOutAt ? (
          <span style={{ fontSize: 11, color: '#0176D3', background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
            📬 Last contact: {timeAgo(c.lastReachedOutAt)}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#C9C7C5', background: '#FFFFFF', border: '1px solid #FAFAF9', borderRadius: 20, padding: '2px 10px' }}>
            Not yet contacted
          </span>
        )}
        {c.reachOutNote && <span style={{ fontSize: 11, color: '#706E6B', fontStyle: 'italic' }}>"{c.reachOutNote}"</span>}
        <button
          onClick={() => setShowNote(!showNote)}
          style={{ fontSize: 11, background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#0176D3', padding: '2px 10px', cursor: 'pointer', fontWeight: 600 }}
        >
          + Log Outreach
        </button>
      </div>
      {showNote && (
        <div className="tn-note-row" style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (e.g. Sent LinkedIn, called…)"
            style={{ flex: 1, minWidth: 160, padding: '8px 10px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={markReached} disabled={marking} style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, padding: '8px 14px', cursor: 'pointer', opacity: marking ? 0.6 : 1, whiteSpace: 'nowrap' }}>
              {marking ? '…' : '✓ Mark'}
            </button>
            <button onClick={() => setShowNote(false)} style={{ background: '#FFFFFF', border: '1px solid #DDDBDA', borderRadius: 8, color: '#706E6B', fontSize: 13, padding: '8px 10px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      {/* Multi-select add to pipeline */}
      <div style={{ paddingTop: 6, borderTop: '1px solid #F3F2F2' }}>
        <span style={{ color: '#706E6B', fontSize: 12 }}>Add to pipeline:</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }} ref={dropRef}>
          {/* Multi-select job picklist */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => setDropOpen(!dropOpen)}
              style={{ width: '100%', padding: '5px 10px', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: '#fff', textAlign: 'left', border: '1px solid #DDDBDA', borderRadius: 4, color: '#181818', outline: 'none', fontFamily: 'inherit' }}
            >
              <span style={{ color: selJobs.length > 0 ? '#181818' : '#9E9D9B' }}>
                {selJobs.length > 0 ? `${selJobs.length} role${selJobs.length > 1 ? 's' : ''} selected` : '— Select role(s) —'}
              </span>
              <span style={{ fontSize: 9, opacity: 0.6 }}>{dropOpen ? '▲' : '▼'}</span>
            </button>
            {dropOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid #DDDBDA', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
                {jobs.length === 0 ? (
                  <div style={{ padding: '12px', color: '#9E9D9B', fontSize: 12 }}>No jobs available</div>
                ) : jobs.map(j => {
                  const checked = selJobs.includes(j.id);
                  return (
                    <div key={j.id} onClick={() => toggleJob(j.id)}
                      style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', cursor: 'pointer', background: checked ? 'rgba(1,118,211,0.06)' : '#fff', borderBottom: '1px solid #F3F2F2' }}
                      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#F3F2F2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = checked ? 'rgba(1,118,211,0.06)' : '#fff'; }}>
                      <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${checked ? '#0176D3' : '#DDDBDA'}`, background: checked ? '#0176D3' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {checked && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#181818', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</div>
                        <div style={{ color: '#706E6B', fontSize: 10 }}>{j.company}</div>
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
              setSelJobs([]);
              setDropOpen(false);
              setAdding(false);
            }}
            style={{ ...btnP, padding: '6px 16px', fontSize: 12, whiteSpace: 'nowrap', opacity: (selJobs.length === 0 || adding) ? 0.5 : 1 }}
          >
            {adding ? <Spinner /> : `➕ Add${selJobs.length > 1 ? ` (${selJobs.length})` : ''}`}
          </button>
        </div>
        <button
          onClick={() => onInvite(c)}
          style={{ marginTop: 8, width: '100%', padding: '7px 0', background: 'rgba(1,118,211,0.07)', border: '1.5px dashed rgba(1,118,211,0.35)', borderRadius: 8, color: '#0176D3', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          📧 Send Invite to Apply
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RecruiterCandidates({ user }) {
  const [allCandidates, setAllCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [detailUser, setDetailUser] = useState(null);
  const [inviteCandidate, setInviteCandidate] = useState(null);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [waModal, setWaModal] = useState(false);
  const [waTemplate, setWaTemplate] = useState('Hi {candidateName}, we have an exciting opportunity for {jobTitle} at {companyName}. Please reply to express your interest. Regards, {recruiterName}');
  const [waSending, setWaSending] = useState(false);

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

  // load candidates + recruiter's jobs on mount
  useEffect(() => {
    (async () => {
      try {
        const [cands, myJobs] = await Promise.all([
          api.getUsers('candidate'),
          api.getJobs(user.id),
        ]);
        const rawCands = Array.isArray(cands) ? cands : (Array.isArray(cands?.data) ? cands.data : []);
        setAllCandidates(rawCands.map(c => ({ ...c, id: c.id || c._id?.toString() || String(c._id || '') })));
        // Normalize _id → id so CandidateCard's toggleJob/checked work with lean() results
        const rawJobs = Array.isArray(myJobs) ? myJobs : (Array.isArray(myJobs?.data) ? myJobs.data : []);
        setJobs(rawJobs.map(j => ({ ...j, id: j.id || j._id?.toString() || String(j._id) })));
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

  const search = () => {
    const res = allCandidates.filter(c => matchCandidate(c, filters) && roleMatch(c));
    setResults(res);
    setSearched(true);
  };

  const reset = () => {
    setFilters({ designation: '', skills: '', location: '', expMin: '', expMax: '', roles: [] });
    setResults([]);
    setSearched(false);
  };

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

  const hasFilters = filters.designation || filters.skills || filters.location || filters.expMin || filters.expMax || filters.roles.length > 0;

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

      {/* Resume modal */}
      {detailUser && (
        <div className="tn-resume-modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div className="tn-resume-modal" style={{ width: '100%', maxWidth: 880, maxHeight: 'calc(100dvh - 48px)', display: 'flex', flexDirection: 'column', borderRadius: 20, overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E5E7EB', flexShrink: 0, background: '#fff' }}>
              <div style={{ color: '#181818', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📋 Resume — {detailUser.name}</div>
              <button onClick={() => setDetailUser(null)} style={{ background: '#DDDBDA', border: '1px solid #C9C7C5', color: '#3E3E3C', borderRadius: 8, padding: '5px 14px', cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>✕ Close</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <ResumeCard candidate={detailUser} />
            </div>
          </div>
        </div>
      )}

      <PageHeader
        title="Import Candidates"
        subtitle="Search the talent pool by designation, skills, experience or location"
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

            <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center' }}>
              <button onClick={search} style={btnP}>🔍 Search</button>
              {hasFilters && <button onClick={reset} style={btnG}>✕ Clear</button>}
              <span style={{ color: '#9E9D9B', fontSize: 12 }}>
                {allCandidates.length} candidate{allCandidates.length !== 1 ? 's' : ''} in pool
              </span>
            </div>
          </div>

          {/* ── Results ── */}
          {!searched && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9E9D9B' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <div style={{ fontSize: 14, color: '#706E6B' }}>Enter filters above and click Search to find candidates</div>
              <div style={{ fontSize: 12, color: '#9E9D9B', marginTop: 6 }}>You can search by designation, skills, location, or experience range</div>
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
                  ✅ {results.length} CANDIDATE{results.length !== 1 ? 'S' : ''} FOUND
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
                          onViewResume={setDetailUser}
                          onReachOut={handleReachOut}
                          onToast={setToast}
                          onInvite={setInviteCandidate}
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
    </div>
  );
}