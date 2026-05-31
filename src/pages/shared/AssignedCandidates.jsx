import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import JobRecruiterHistory from '../../components/shared/JobRecruiterHistory.jsx';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { btnG, card } from '../../constants/styles.js';

const STAGE_COLOR = {
  Applied: '#64748b', Screening: '#0176D3', Shortlisted: '#7C3AED',
  'Interview Round 1': '#F59E0B', 'Interview Round 2': '#a78bfa',
  Offer: '#059669', Hired: '#2E844A', Rejected: '#e53e3e',
};
const STAGES = Object.keys(STAGE_COLOR);

const fmt      = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
const initials = name => (name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const CAND_PG = 10; // candidates shown per job card per page

const pgBtn = disabled => ({
  padding: '3px 9px', borderRadius: 6, border: '1px solid #E2E8F0',
  background: disabled ? '#F8FAFC' : '#fff', color: disabled ? '#CBD5E1' : '#374151',
  fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, lineHeight: 1,
});
function CandPaginator({ page, setPage, total }) {
  const totalPages = Math.ceil(total / CAND_PG);
  if (totalPages <= 1) return null;
  const start = (page - 1) * CAND_PG + 1;
  const end   = Math.min(page * CAND_PG, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid #F1F5F9', background: '#FAFBFF' }}>
      <span style={{ fontSize: 11, color: '#94A3B8' }}>
        {start}–{end} of <strong style={{ color: '#374151' }}>{total}</strong> candidates
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={() => setPage(1)}         disabled={page === 1}          style={pgBtn(page === 1)}>«</button>
        <button onClick={() => setPage(p => p-1)}  disabled={page === 1}          style={pgBtn(page === 1)}>‹</button>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', padding: '0 6px' }}>{page}/{totalPages}</span>
        <button onClick={() => setPage(p => p+1)}  disabled={page === totalPages} style={pgBtn(page === totalPages)}>›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtn(page === totalPages)}>»</button>
      </div>
    </div>
  );
}

// ── First recruiter banner — shown when this recruiter is the first/only one ──
function FirstRecruiterBanner({ assignedAt, onViewHistory }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,rgba(1,118,211,0.06),rgba(1,118,211,0.02))',
      borderBottom: '1px solid rgba(1,118,211,0.15)',
      padding: '9px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#0176D3,#00C2CB)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 900, fontSize: 10,
        }}>1st</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', letterSpacing: 0.3 }}>
            👤 YOU ARE THE FIRST RECRUITER FOR THIS JOB
          </div>
          <div style={{ fontSize: 11, color: '#0176D3', marginTop: 2, opacity: 0.75 }}>
            No previous recruiter — all pipeline activity started with you{assignedAt ? ` · Assigned ${fmt(assignedAt)}` : ''}
          </div>
        </div>
      </div>
      <button
        onClick={onViewHistory}
        style={{ background: 'rgba(1,118,211,0.1)', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#0176D3', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
      >
        📋 View History
      </button>
    </div>
  );
}

// ── Handoff banner — shown at the top of any job that was reassigned ──────────
function HandoffBanner({ prev, totalPrev, onViewHistory }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
      borderBottom: '1px solid #FCD34D',
      padding: '9px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Previous recruiter avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#92400E,#B45309)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 12,
        }}>
          {initials(prev?.recruiterName || '?')}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#92400E', letterSpacing: 0.3 }}>
            🔄 HANDOFF — previously managed by {prev?.recruiterName || 'Unknown Recruiter'}
            {totalPrev > 1 && (
              <span style={{ fontWeight: 400, color: '#B45309' }}> (+{totalPrev - 1} more)</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#92400E', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {prev?.recruiterEmail && (
              <a href={`mailto:${prev.recruiterEmail}`}
                style={{ color: '#B45309', textDecoration: 'none' }}
                onClick={e => e.stopPropagation()}>
                ✉️ {prev.recruiterEmail}
              </a>
            )}
            {prev?.recruiterPhone && (
              <a href={`tel:${prev.recruiterPhone}`}
                style={{ color: '#B45309', textDecoration: 'none' }}
                onClick={e => e.stopPropagation()}>
                📞 {prev.recruiterPhone}
              </a>
            )}
            {prev?.removedAt && (
              <span>Reassigned {fmt(prev.removedAt)}</span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onViewHistory(); }}
        style={{
          background: 'rgba(146,64,14,0.12)', border: '1px solid rgba(146,64,14,0.3)',
          borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#92400E',
          cursor: 'pointer', fontWeight: 700, flexShrink: 0,
        }}
      >
        View Full History →
      </button>
    </div>
  );
}

// ── Single candidate row inside a job card ────────────────────────────────────
function CandidateRow({ a, onOpenDrawer, onChangeStage }) {
  const [showHistory, setShowHistory] = useState(false);
  const c            = a.candidateId || a.candidate || {};
  const name         = c.name || a.candidateName || 'Unknown';
  const stage        = a.currentStage || a.stage || 'Applied';
  const stageColor   = STAGE_COLOR[stage] || '#64748b';
  const interviewCnt = Array.isArray(a.interviewRounds) ? a.interviewRounds.length : 0;
  const hasScore     = a.talentMatchScore != null && a.talentMatchScore !== '';
  const hasAssess    = a.assessmentScore  != null && a.assessmentScore  !== '';
  const hasNotes     = a.recruiterNotes && String(a.recruiterNotes).trim();
  const noticeDays   = c.noticePeriodDays || a.noticePeriodDays;

  return (
    <div
      onClick={() => c._id && onOpenDrawer(c)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
        borderBottom: '1px solid #F1F5F9', background: '#fff',
        cursor: c._id ? 'pointer' : 'default', transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (c._id) e.currentTarget.style.background = '#F0F7FF'; }}
      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
    >
      {/* Avatar */}
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg,#032D60,#0176D3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 800, fontSize: 14,
      }}>
        {initials(name)}
      </div>

      {/* Info block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + contact */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#181818' }}>{name}</span>
          {c.email && (
            <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: '#64748B', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}>
              {c.email}
            </a>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} style={{ fontSize: 11, color: '#64748B', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}>
              {c.phone}
            </a>
          )}
        </div>

        {/* Title / company */}
        {(c.title || c.currentCompany) && (
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
            {[c.title, c.currentCompany].filter(Boolean).join(' · ')}
          </div>
        )}

        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
          <span style={{ fontSize: 10, color: '#64748B', background: '#F1F5F9', padding: '2px 7px', borderRadius: 20 }}>
            📅 Applied {fmtShort(a.createdAt || a.appliedAt)}
          </span>
          {noticeDays && (
            <span style={{ fontSize: 10, color: '#64748B', background: '#F1F5F9', padding: '2px 7px', borderRadius: 20 }}>
              ⏱ {noticeDays}d notice
            </span>
          )}
          {(c.location || a.location) && (
            <span style={{ fontSize: 10, color: '#64748B', background: '#F1F5F9', padding: '2px 7px', borderRadius: 20 }}>
              📍 {c.location || a.location}
            </span>
          )}
          {hasScore && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(5,150,105,0.1)', color: '#059669', padding: '2px 7px', borderRadius: 20 }}>
              ✦ {a.talentMatchScore}% match
            </span>
          )}
          {hasAssess && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7C3AED', padding: '2px 7px', borderRadius: 20 }}>
              📝 {a.assessmentScore}% assessment
            </span>
          )}
          {interviewCnt > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.1)', color: '#D97706', padding: '2px 7px', borderRadius: 20 }}>
              🗓 {interviewCnt} interview{interviewCnt !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Recruiter notes left by previous recruiter */}
        {hasNotes && (
          <div style={{
            marginTop: 6, fontSize: 11, color: '#374151',
            background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 6, padding: '4px 9px', maxWidth: 500,
          }}>
            📝 <span style={{ fontStyle: 'italic' }}>
              {String(a.recruiterNotes).slice(0, 160)}
              {a.recruiterNotes.length > 160 ? '…' : ''}
            </span>
          </div>
        )}

        {/* Stage history toggle */}
        {(a.stageHistory || []).length > 0 && (
          <div style={{ marginTop: 6 }}>
            <button
              onClick={e => { e.stopPropagation(); setShowHistory(v => !v); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#0176D3', padding: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {showHistory ? '▲' : '▼'} Pipeline history ({(a.stageHistory || []).length} change{(a.stageHistory || []).length !== 1 ? 's' : ''})
            </button>
            {showHistory && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5, paddingLeft: 10, borderLeft: '2px solid #E2E8F0' }}>
                {[...(a.stageHistory || [])].reverse().map((h, i) => {
                  const ts = h.movedAt || h.changedAt || h.date;
                  const stageName = h.stage || h.stageId || 'Stage Change';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0176D3', flexShrink: 0, marginTop: 3 }} />
                      <div>
                        <span style={{ fontWeight: 700, color: '#374151' }}>{stageName}</span>
                        {ts && <span style={{ color: '#94A3B8', marginLeft: 5 }}>{fmtShort(ts)}</span>}
                        {h.note && <div style={{ fontSize: 10, color: '#64748B', fontStyle: 'italic', marginTop: 1 }}>"{h.note}"</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stage selector */}
      <div onClick={e => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <select
          value={stage}
          onChange={e => onChangeStage(a, e.target.value)}
          style={{
            background: `${stageColor}18`, color: stageColor,
            border: `1px solid ${stageColor}40`,
            borderRadius: 20, padding: '5px 10px', fontSize: 11, fontWeight: 700,
            outline: 'none', cursor: 'pointer',
          }}
        >
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

const JOB_LIST_PG = 10; // jobs shown per page

// ── Job-list paginator ────────────────────────────────────────────────────────
function JobListPaginator({ page, setPage, total }) {
  const totalPages = Math.ceil(total / JOB_LIST_PG);
  if (totalPages <= 1) return null;
  const start = (page - 1) * JOB_LIST_PG + 1;
  const end   = Math.min(page * JOB_LIST_PG, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', marginTop: 8 }}>
      <span style={{ fontSize: 12, color: '#94A3B8' }}>
        Jobs {start}–{end} of <strong style={{ color: '#374151' }}>{total}</strong>
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button onClick={() => setPage(1)}         disabled={page === 1}          style={pgBtn(page === 1)}>«</button>
        <button onClick={() => setPage(p => p-1)}  disabled={page === 1}          style={pgBtn(page === 1)}>‹</button>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', padding: '0 8px' }}>{page}/{totalPages}</span>
        <button onClick={() => setPage(p => p+1)}  disabled={page === totalPages} style={pgBtn(page === totalPages)}>›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtn(page === totalPages)}>»</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AssignedCandidates({ user }) {
  const navigate = useNavigate();

  const [jobs,        setJobs]        = useState([]);
  // Per-job candidate cache: jid → { apps[], loading, loaded }
  const [jobApps,     setJobApps]     = useState({});
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoad]        = useState(true);
  const [search,      setSearch]      = useState('');
  const [drawer,      setDrawer]      = useState(null);
  const [historyJob,  setHistoryJob]  = useState(null);
  const [candPages,   setCandPages]   = useState({});
  const [jobListPage, setJobListPage] = useState(1);
  // Global pool loaded on-demand when search is active
  const [globalApps,        setGlobalApps]        = useState(null);
  const [globalAppsLoading, setGlobalAppsLoading] = useState(false);
  const [totalJobs,         setTotalJobs]         = useState(0);
  const fetchingRef = useRef(new Set());

  // Explicit role flags — super_admin has their own separate panel and nav,
  // so this page is strictly for org admins and recruiters.
  const isOrgAdmin  = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'super_admin';
  // isAdmin = org-level admin view (can manage assignments, see all org jobs)
  // super_admin uses platform:true so they don't bleed into org-scoped queries
  const isAdmin = isOrgAdmin || isSuperAdmin;
  const getCandPage = jid => candPages[jid] || 1;
  const setCandPage = (jid, pg) => setCandPages(prev => ({ ...prev, [jid]: pg }));

  // ── Lazy-load candidates for one job ────────────────────────────────────────
  const loadJobApps = useCallback(async (jid) => {
    if (fetchingRef.current.has(jid)) return;
    fetchingRef.current.add(jid);
    setJobApps(prev => ({ ...prev, [jid]: { apps: [], loading: true, loaded: false } }));
    try {
      const res  = await api.getApplications({ jobId: jid });
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setJobApps(prev => ({ ...prev, [jid]: { apps: list, loading: false, loaded: true } }));
    } catch {
      setJobApps(prev => ({ ...prev, [jid]: { apps: [], loading: false, loaded: true } }));
    }
  }, []);

  // ── Jobs fetch: server-side pagination for admin, all-assigned for recruiter ──
  useEffect(() => {
    fetchingRef.current.clear();
    setJobApps({});
    setGlobalApps(null);
    setLoad(true);

    if (isAdmin) {
      // Org admin: backend scopes to their org via JWT
      // Super admin: platform:true to fetch all orgs' jobs correctly
      const platform = isSuperAdmin ? true : undefined;
      // Main list: all statuses (admin needs to manage draft/closed assignments too)
      const params       = { limit: JOB_LIST_PG, page: jobListPage, ...(platform ? { platform } : {}) };
      // Count query: active only — matches Analytics "Open Positions" definition (no cap, countDocuments)
      const countParams  = { limit: 1, page: 1, status: 'active', ...(platform ? { platform } : {}) };
      Promise.all([
        api.getJobs(params),
        api.getJobs(countParams),
      ]).then(([raw, countRaw]) => {
          const list  = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.jobs) ? raw.jobs : []));
          // Dedicated active-jobs count — matches Analytics "Open Positions" KPI
          const total = countRaw?.pagination?.total || raw?.pagination?.total || raw?.total || list.length;
          setJobs(list);
          setTotalJobs(total);
        })
        .catch(() => { setJobs([]); setTotalJobs(0); })
        .finally(() => setLoad(false));
    } else {
      // Recruiter: load only their assigned jobs at once (typically small count)
      Promise.all([
        api.getJobs({ recruiterId: user?.id || user?._id }).catch(() => []),
        api.getCandidateRequests().catch(() => []),
      ]).then(([j, r]) => {
        const allJobs = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : (Array.isArray(j?.jobs) ? j.jobs : []));
        setJobs(allJobs);
        setTotalJobs(allJobs.length);
        const reqArr = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
        setRequests(reqArr.filter(req => req.status === 'in_progress' || req.status === 'fulfilled'));
      }).finally(() => setLoad(false));
    }
  }, [isAdmin, jobListPage, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Paginated job list ───────────────────────────────────────────────────────
  // Admin: backend already returns only the current page — use jobs directly.
  // Recruiter: all their jobs are loaded at once — client-side slice.
  const pagedJobs = useMemo(
    () => isAdmin ? jobs : jobs.slice((jobListPage - 1) * JOB_LIST_PG, jobListPage * JOB_LIST_PG),
    [isAdmin, jobs, jobListPage]
  );

  // ── Load candidates for the current page of jobs ─────────────────────────────
  useEffect(() => {
    pagedJobs.forEach(j => loadJobApps(String(j._id || j.id)));
  }, [pagedJobs, loadJobApps]);

  // ── Search: load global pool once when user starts typing ────────────────────
  const handleSearch = useCallback(async (value) => {
    setSearch(value);
    if (value.trim() && globalApps === null && !globalAppsLoading) {
      setGlobalAppsLoading(true);
      try {
        const res  = await api.getApplications({ limit: 10000 });
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setGlobalApps(list);
      } catch {
        setGlobalApps([]);
      }
      setGlobalAppsLoading(false);
    }
  }, [globalApps, globalAppsLoading]);

  // ── Stage change: update per-job cache and global pool ───────────────────────
  const changeStage = async (app, stage) => {
    try {
      const appId = app.id || app._id;
      await api.updateStage(appId, stage);
      const jid = String(app.jobId?._id || app.jobId || '');
      setJobApps(prev => {
        const entry = prev[jid];
        if (!entry) return prev;
        return { ...prev, [jid]: { ...entry, apps: entry.apps.map(a => (a.id || a._id) === appId ? { ...a, currentStage: stage, stage } : a) } };
      });
      setGlobalApps(prev => prev ? prev.map(a => (a.id || a._id) === appId ? { ...a, currentStage: stage, stage } : a) : prev);
    } catch (_e) {}
  };

  const jobMap = useMemo(() => Object.fromEntries(jobs.map(j => [String(j._id || j.id), j])), [jobs]);

  // ── View derivations ─────────────────────────────────────────────────────────
  const searchActive = Boolean(search.trim());

  // When search is active, build byJob from global pool; else from per-page cache
  const searchByJob = useMemo(() => {
    if (!searchActive) return null;
    const pool = globalApps || [];
    const q = search.toLowerCase();
    const map = {};
    pool.forEach(a => {
      const c = a.candidateId || a.candidate || {};
      if (
        (c.name  || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (a.jobId?.title || '').toLowerCase().includes(q)
      ) {
        const jid = String(a.jobId?._id || a.jobId || 'unknown');
        if (!map[jid]) map[jid] = [];
        map[jid].push(a);
      }
    });
    return map;
  }, [searchActive, globalApps, search]);

  // Which jobs to render: search mode = any job with matches; normal = current page
  const displayJobs = searchActive
    ? jobs.filter(j => searchByJob?.[String(j._id || j.id)])
    : pagedJobs;

  // Total loaded candidate count for subtitle
  const totalCands = useMemo(() => {
    if (globalApps) return globalApps.length;
    return Object.values(jobApps).reduce((s, e) => s + (e.apps?.length || 0), 0);
  }, [globalApps, jobApps]);

  function handoffInfo(fullJob) {
    const history = fullJob?.recruiterHistory || [];
    const prev    = history.filter(h => h.removedAt);
    if (prev.length > 0) {
      const sorted = [...prev].sort((a, b) => new Date(b.removedAt) - new Date(a.removedAt));
      return { isHandoff: true, isFirst: false, lastPrev: sorted[0], totalPrev: prev.length };
    }
    const current = history.find(r => !r.removedAt) || history[0];
    return { isHandoff: false, isFirst: history.length > 0, currentRecruiter: current };
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Spinner />
    </div>
  );

  return (
    <div>
      {/* ── Modals ── */}
      {drawer && <UserDetailDrawer user={drawer} onClose={() => setDrawer(null)} />}
      {historyJob && (
        <Modal
          title={`📋 Recruiter History — ${historyJob.jobTitle}`}
          onClose={() => setHistoryJob(null)}
          width="520px"
          footer={<button onClick={() => setHistoryJob(null)} style={{ ...btnG, width: '100%' }}>Close</button>}
        >
          <JobRecruiterHistory
            jobId={historyJob.jobId}
            jobTitle={historyJob.jobTitle}
            fallbackHistory={historyJob.recruiterHistory || []}
            currentRecruiterName={historyJob.recruiterName || (!isAdmin ? user?.name : undefined)}
            currentRecruiterId={historyJob.recruiterId || (!isAdmin ? user?.id || user?._id : undefined)}
            isAdmin={isAdmin}
            onRecruiterChanged={() => {
              setHistoryJob(null);
              setLoad(true);
              const platform = isSuperAdmin ? true : undefined;
              const p = { limit: JOB_LIST_PG, page: jobListPage, ...(platform ? { platform } : {}) };
              const cp = { limit: 1, page: 1, status: 'active', ...(platform ? { platform } : {}) };
              Promise.all(
                isAdmin
                  ? [api.getJobs(p), api.getJobs(cp)]
                  : [api.getJobs({ recruiterId: user?.id || user?._id }), Promise.resolve(null)]
              ).then(([raw, countRaw]) => {
                  const list  = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.jobs) ? raw.jobs : []));
                  setJobs(list);
                  if (isAdmin) setTotalJobs(countRaw?.pagination?.total || raw?.pagination?.total || list.length);
                })
                .catch(() => {})
                .finally(() => setLoad(false));
            }}
          />
        </Modal>
      )}

      <PageHeader
        title={isAdmin ? '🎯 Assignments Overview' : '🎯 Assigned to Me'}
        subtitle={isAdmin
          ? `${totalJobs} open position${totalJobs !== 1 ? 's' : ''} · ${totalCands > 0 ? `${totalCands} candidates loaded` : 'select a job to view candidates'}`
          : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} assigned · ${totalCands} candidate${totalCands !== 1 ? 's' : ''}`}
      />

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search by candidate name, email or job title…"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 16px',
            border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13,
            outline: 'none', background: '#F8FAFC',
          }}
        />
        {searchActive && globalAppsLoading && (
          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Spinner size={12} /> Loading all candidates for search…
          </div>
        )}
      </div>

      {/* Staffing requests (recruiter only) */}
      {!isAdmin && requests.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', margin: '0 0 12px', letterSpacing: 1 }}>
            📨 YOUR STAFFING REQUESTS — CANDIDATES ASSIGNED
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(r => (
              <div key={r.id || r._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{r.roleTitle}</div>
                  <div style={{ fontSize: 11, color: '#706E6B', marginTop: 2 }}>
                    {(r.submittedCandidates || []).length} candidate{(r.submittedCandidates || []).length !== 1 ? 's' : ''} assigned
                    {r.adminNotes && <span> · 📝 {r.adminNotes}</span>}
                  </div>
                </div>
                <Badge label={r.status.replace('_', ' ')} color={r.status === 'fulfilled' ? '#34d399' : '#0176D3'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty / search-no-results states ── */}
      {jobs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '60px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
          <h3 style={{ color: '#181818', fontWeight: 700, margin: '0 0 8px' }}>No assignments yet</h3>
          <p style={{ color: '#706E6B', fontSize: 14, margin: '0 0 20px' }}>
            {isAdmin ? 'Jobs will appear here once created and assigned.' : 'When an admin assigns a job to you, it will appear here.'}
          </p>
          {isAdmin && (
            <button onClick={() => navigate('/app/jobs')} style={{ ...btnG, padding: '10px 20px', fontSize: 13 }}>
              Go to Jobs →
            </button>
          )}
        </div>
      ) : searchActive && !globalAppsLoading && displayJobs.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#9E9D9B', fontSize: 13 }}>No candidates match "{search}".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Unified job list (paginated in normal mode, all matches in search mode) ── */}
          {displayJobs.map(j => {
            const jid      = String(j._id || j.id);
            const fullJob  = jobMap[jid] || j;
            const { isHandoff, isFirst, lastPrev, totalPrev, currentRecruiter } = handoffInfo(fullJob);
            const jobTitle = fullJob.title || 'Unknown Job';

            const resolvedRecruiterName = fullJob.recruiterName || (!isAdmin ? user?.name : undefined);
            const resolvedRecruiterId   = fullJob.recruiterId   || (!isAdmin ? user?.id || user?._id : undefined);
            const patchedHistory = (fullJob.recruiterHistory || []).map(h =>
              (!h.removedAt && !h.recruiterName && resolvedRecruiterName) ? { ...h, recruiterName: resolvedRecruiterName } : h
            );
            const openHistory = async () => {
              let rName = resolvedRecruiterName;
              let rId   = resolvedRecruiterId;
              let rHist = patchedHistory;
              // For admin: list API may omit recruiter fields — fetch full job details
              if (isAdmin) {
                try {
                  const d = await api.getJob(jid);
                  const details = d?.data || d || {};
                  // Try every field name the backend might use
                  rName = rName
                    || details.recruiterName
                    || details.recruiter?.name
                    || details.assignedRecruiterName;
                  rId = rId
                    || details.recruiterId
                    || details.recruiter?._id?.toString()
                    || details.recruiter?.id;
                  const detailHistory = Array.isArray(details.recruiterHistory) ? details.recruiterHistory : [];
                  if (detailHistory.length > rHist.length) {
                    rHist = detailHistory;
                  }
                } catch {}
                // If we still have an ID but no name, look up the user
                if (rId && !rName) {
                  try {
                    const u = await api.getUser(rId);
                    const ud = u?.data || u || {};
                    rName = ud.name;
                  } catch {}
                }
              }
              setHistoryJob({
                jobId: jid, jobTitle,
                recruiterHistory: rHist,
                recruiterName: rName,
                recruiterId:   rId,
              });
            };

            // Candidates: search mode uses global pool slice, normal uses per-job cache
            const entry     = searchActive
              ? { apps: searchByJob?.[jid] || [], loading: false, loaded: true }
              : (jobApps[jid] || { apps: [], loading: false, loaded: false });
            const appsForJob = entry.apps;
            const isLoading  = entry.loading;
            const isLoaded   = entry.loaded;

            // Stage breakdown
            const stageCounts = {};
            appsForJob.forEach(a => {
              const s = a.currentStage || a.stage || 'Applied';
              stageCounts[s] = (stageCounts[s] || 0) + 1;
            });

            // Per-job candidate pagination
            const pg    = getCandPage(jid);
            const slice = appsForJob.slice((pg - 1) * CAND_PG, pg * CAND_PG);

            return (
              <div key={jid} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                {isHandoff && <HandoffBanner prev={lastPrev} totalPrev={totalPrev} onViewHistory={openHistory} />}
                {!isHandoff && isFirst && !isAdmin && <FirstRecruiterBanner assignedAt={currentRecruiter?.assignedAt} onViewHistory={openHistory} />}

                {/* Job header */}
                <div style={{ padding: '14px 16px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>{jobTitle}</span>
                        {isHandoff && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 20, letterSpacing: 0.5 }}>HANDOFF</span>
                        )}
                        <Badge label={fullJob.status || 'active'} color={fullJob.status === 'active' ? '#34d399' : '#706E6B'} />
                        {fullJob.urgency === 'urgent' && (
                          <span style={{ fontSize: 10, fontWeight: 800, background: 'rgba(220,38,38,0.1)', color: '#DC2626', padding: '2px 8px', borderRadius: 20 }}>🔴 URGENT</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#706E6B', marginTop: 3 }}>
                        {fullJob.location && <span>📍 {fullJob.location}</span>}
                        {fullJob.department && <span> · {fullJob.department}</span>}
                        {isLoaded && <span> · {appsForJob.length} candidate{appsForJob.length !== 1 ? 's' : ''}</span>}
                        {isLoading && <span style={{ color: '#94A3B8' }}> · loading candidates…</span>}
                        {!isLoaded && !isLoading && <span style={{ color: '#94A3B8' }}> · pending</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={openHistory} title="View full recruiter handoff history"
                        style={{ background: 'rgba(1,118,211,0.07)', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#0176D3', cursor: 'pointer', fontWeight: 600 }}>
                        📋 History
                      </button>
                      <button onClick={() => navigate('/app/pipeline')} style={{ ...btnG, padding: '5px 14px', fontSize: 12 }}>
                        Pipeline →
                      </button>
                    </div>
                  </div>

                  {/* Stage breakdown chips */}
                  {Object.keys(stageCounts).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                      {STAGES.filter(s => stageCounts[s]).map(s => (
                        <span key={s} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: `${STAGE_COLOR[s]}12`, color: STAGE_COLOR[s],
                          border: `1px solid ${STAGE_COLOR[s]}28`,
                          borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                        }}>
                          {s} <span style={{ fontWeight: 900 }}>{stageCounts[s]}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Candidate rows */}
                {isLoading ? (
                  <div style={{ borderTop: '1px solid #F1F5F9', padding: '16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spinner size={16} />
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>Loading candidates…</span>
                  </div>
                ) : appsForJob.length > 0 ? (
                  <>
                    <div style={{ borderTop: '1px solid #F1F5F9' }}>
                      {slice.map(a => (
                        <CandidateRow key={a._id || a.id} a={a} onOpenDrawer={setDrawer} onChangeStage={changeStage} />
                      ))}
                    </div>
                    <CandPaginator page={pg} setPage={pg => setCandPage(jid, pg)} total={appsForJob.length} />
                  </>
                ) : isLoaded ? (
                  <div style={{ borderTop: '1px solid #F1F5F9', padding: '12px 16px', fontSize: 12, color: '#94A3B8' }}>
                    No candidates yet for this job.
                  </div>
                ) : null}
              </div>
            );
          })}

          {/* Job-list pagination (normal mode only) */}
          {!searchActive && <JobListPaginator page={jobListPage} setPage={setJobListPage} total={isAdmin ? totalJobs : jobs.length} />}
        </div>
      )}
    </div>
  );
}
