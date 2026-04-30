import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api, downloadBlob } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import AreaChart from '../../components/charts/AreaChart.jsx';
import VertBarChart from '../../components/charts/VertBarChart.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import TrendCard from '../../components/shared/TrendCard.jsx';
import ActivityDot from '../../components/misc/ActivityDot.jsx';
import TimeAgo from '../../components/misc/TimeAgo.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import ErrorReportBoundary from '../../components/shared/ErrorReportBoundary.jsx';
import { STAGES as MASTER_STAGES, SM } from '../../constants/stages.js';
import { card, btnP, btnG } from '../../constants/styles.js';

// ── Design Tokens ────────────────────────────────────────────────────────────
const glassPanel = {
  background    : '#FFFFFF',
  border        : '1px solid #E2E8F0',
  borderRadius  : 24,
  padding       : 32,
  boxShadow     : '0 4px 24px rgba(0, 0, 0, 0.06)',
  transition    : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

const sectionTitle = {
  fontSize  : 18,
  fontWeight: 800,
  color     : '#0A1628',
  margin    : '0 0 20px',
};

const STAGES      = MASTER_STAGES.map(s => s.id);
const STAGE_LABELS = Object.fromEntries(MASTER_STAGES.map(s => [s.id, s.label]));
const STAGE_COLORS = MASTER_STAGES.map(s => s.color);

// Maps DB title-case currentStage values → frontend lowercase stage IDs
const DB_TO_FRONTEND_STAGE = {
  'Applied'          : 'applied',
  'Screening'        : 'screening',
  'Shortlisted'      : 'shortlisted',
  'Interview Round 1': 'interview_scheduled',
  'Interview Round 2': 'interview_completed',
  'Offer'            : 'offer_extended',
  'Hired'            : 'selected',
  'Rejected'         : 'rejected',
};
// Reverse map: frontend stage ID → DB title-case stage name (for API queries)
const FRONTEND_TO_DB_STAGE = Object.fromEntries(Object.entries(DB_TO_FRONTEND_STAGE).map(([k, v]) => [v, k]));

const PERIODS = [
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'All time',     days: null },
];

const SOURCE_COLORS = {
  manual       : '#0176D3',
  resume_upload: '#7c3aed',
  bulk_import  : '#F59E0B',
  invite_link  : '#10b981',
  career_page  : '#ef4444',
  referral     : '#06b6d4',
  direct       : '#94a3b8',
};

const extractId = (v) => {
  if (!v) return '';
  if (typeof v === 'object') return v.id || v._id?.toString() || '';
  return String(v);
};

// ── Skeleton Loader ──────────────────────────────────────────────────────────
function SectionSkeleton() {
  return (
    <div style={{ ...glassPanel, minHeight: 180 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 18, background: 'linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', borderRadius: 8, marginBottom: 14, animation: 'shimmer 1.5s infinite', opacity: 1 - i * 0.2 }} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  );
}

// ── Section Error State ──────────────────────────────────────────────────────
function SectionError({ message, onRetry }) {
  return (
    <div style={{ ...glassPanel, textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
      <div style={{ color: '#706E6B', fontSize: 14, marginBottom: 16 }}>{message || 'Could not load data'}</div>
      <button onClick={onRetry} style={{ ...btnP, borderRadius: 10 }}>↻ Retry</button>
    </div>
  );
}

// ── Export Helper ─────────────────────────────────────────────────────────────
// Uses the shared downloadBlob() which carries the in-memory access token.
// (sessionStorage does NOT hold the token — it lives in client.js memory only.)
async function downloadExport(url, filename) {
  const blob = await downloadBlob(url);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

// ── useSection hook ──────────────────────────────────────────────────────────
// Manages load/error/data state for each analytics section independently.
function useSection(fetcher) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback(() => {
    setState({ loading: true, error: null, data: null });
    fetcher()
      .then(r => setState({ loading: false, error: null, data: r }))
      .catch(e => setState({ loading: false, error: e.message || 'Failed to load', data: null }));
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}

// ════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════
export default function AdminAnalytics({ user, onNavigate }) {
  const isSuperAdmin = user?.role === 'super_admin';

  // ── Core data (legacy + existing cards) ─────────────────────────────────
  const [allApps,       setAllApps]       = useState([]);
  const [allJobs,       setAllJobs]       = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [serverStats,   setServerStats]   = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [trendData,     setTrendData]     = useState([]);
  const [applicantRows, setApplicantRows] = useState([]);
  const [candidateRecords, setCandidateRecords] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [platformWide,  setPlatformWide]  = useState(false); // super_admin: false = own org, true = all orgs
  const [period,        setPeriod]        = useState(1); // default 30 days
  const [drillDown,     setDrillDown]     = useState(null);
  const [drillDownSearch, setDrillDownSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast,         setToast]         = useState('');
  const [drawerUser,    setDrawerUser]    = useState(null);

  // ── Date range for advanced analytics ────────────────────────────────────
  const defaultStart = () => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };
  const defaultEnd = () => new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate,   setEndDate]   = useState(defaultEnd);
  const [appliedStart, setAppliedStart] = useState(defaultStart);
  const [appliedEnd,   setAppliedEnd]   = useState(defaultEnd);

  // ── Sort state for recruiter perf table ──────────────────────────────────
  const [recSort, setRecSort] = useState({ col: 'hired', dir: 'desc' });

  // ── Export loading ────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState({});

  // ── Drill-down pagination ──────────────────────────────────────────────────
  const [drillPage, setDrillPage] = useState(1);
  const DRILL_PAGE_SIZE = 40;

  const unwrap = (r) => Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);

  // ── Core data load ────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    const days = PERIODS[period].days;
    const end = new Date().toISOString().split('T')[0];
    const start = days ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0] : null;

    // Phase 1: FAST STATS — unblocks KPI cards immediately (Critical Path)
    Promise.all([
      api.getDashboardStats(platformWide).catch(() => null),
      api.getRecruiterLeaderboard().catch(() => []),
    ]).then(([s, l]) => {
      setServerStats(s?.data || null);
      setLeaderboard(Array.isArray(l) ? l : (l?.data || []));
      setLoading(false);
      
      // Phase 2: Progressively load heavier data in chunks to avoid blocking main thread
      setTimeout(() => {
        api.getTrends().then(r => setTrendData(r?.data || [])).catch(() => setTrendData([]));
        api.getAnalytics(start, end).then(r => setAnalyticsData(r?.data || null)).catch(() => setAnalyticsData(null));
      }, 50);

      setTimeout(() => {
        api.getJobs({ limit: 100 }).then(unwrap).then(setAllJobs).catch(() => setAllJobs([]));
        api.getApplications({ limit: 100 }).then(unwrap).then(setAllApps).catch(() => setAllApps([]));
      }, 150);

      setTimeout(() => {
        api.getUsers({ role: 'candidate', limit: 100 }).then(unwrap).then(setAllCandidates).catch(() => setAllCandidates([]));
        api.getApplicants({ limit: 200 }).then(r => setApplicantRows(Array.isArray(r?.data) ? r.data : [])).catch(() => setApplicantRows([]));
        api.getCandidateRecords({ limit: 200 }).then(r => setCandidateRecords(Array.isArray(r?.data) ? r.data : [])).catch(() => setCandidateRecords([]));
      }, 300);
    }).catch(() => setLoading(false));
  }, [period, platformWide]);

  useEffect(() => { load(); }, [load]);

  // ── Advanced section fetchers (rebuild when dates change) ─────────────────
  const dateParams = useMemo(
    () => ({ startDate: appliedStart, endDate: appliedEnd }),
    [appliedStart, appliedEnd],
  );

  const funnelSection     = useSection(useCallback(() => api.getFunnel(dateParams), [dateParams]));
  const sourceSection     = useSection(useCallback(() => api.getSourceBreakdown(dateParams), [dateParams]));
  const tthSection        = useSection(useCallback(() => api.getTimeToHire(dateParams), [dateParams]));
  const recPerfSection    = useSection(useCallback(() => api.getRecruiterPerformance(dateParams), [dateParams]));
  const dropoutSection    = useSection(useCallback(() => api.getDropoutAnalysis(dateParams), [dateParams]));

  // ── Apply date filter ─────────────────────────────────────────────────────
  const applyFilter = () => {
    if (startDate && endDate && startDate > endDate) {
      setToast('❌ Start date cannot be after end date.');
      return;
    }
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  };

  // ── Inline update ─────────────────────────────────────────────────────────
  const handleInlineUpdate = async (type, id, updates) => {
    try {
      const targetId = String(id);
      if (type === 'job') {
        await api.patchJob(targetId, updates);
        setAllJobs(p => p.map(j => String(j.id || j._id) === targetId ? { ...j, ...updates } : j));
      } else if (type === 'app') {
        if (updates.stage) await api.updateStage(targetId, updates.stage);
        setAllApps(p => p.map(a => String(a.id || a._id) === targetId ? { ...a, ...updates } : a));
      }
      setDrillDown(p => p ? { ...p, items: p.items.map(i => String(i.id || i._id) === targetId ? { ...i, ...updates } : i) } : p);
      setToast('✅ Record updated successfully');
      setConfirmAction(null);
    } catch (e) {
      setToast('❌ ERROR: ' + (e.message || 'Action failed'));
      setConfirmAction(null);
    }
  };

  const triggerUpdate = (type, id, updates, message) => {
    setConfirmAction({
      message,
      onConfirm: () => handleInlineUpdate(type, id, updates),
      onCancel : () => setConfirmAction(null),
    });
  };

  // ── Derived Stats ─────────────────────────────────────────────────────────
  // ── Derived Stats ─────────────────────────────────────────────────────────
  const filteredApps = useMemo(() => {
    const days = PERIODS[period].days;
    if (!days) return allApps;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return allApps.filter(a => new Date(a.createdAt) >= cutoff);
  }, [allApps, period]);

  const stats = useMemo(() => {
    if (serverStats) {
      return {
        totalCandidates: serverStats.candidates || 0,
        activeJobs:      serverStats.openJobs || 0,
        totalApps:       serverStats.applications || 0,
        appsLast30:      serverStats.appsLast30 || 0,
        placements:      serverStats.placements || 0,
        placementsLast30: serverStats.placementsLast30 || 0,
        fillRate:        serverStats.fillRate || 0,
        avgTimeToHire:   serverStats.avgTimeToHire || 0,
      };
    }
    // Fallback if API fails
    const hiredCount = allApps.filter(a => ['selected', 'hired', 'Hired'].includes(a.stage || a.currentStage)).length;
    return {
      totalCandidates: allCandidates.length,
      activeJobs:      allJobs.filter(j => j.status === 'active' || j.status === 'Open').length,
      totalApps:       allApps.length,
      placements:      hiredCount,
      fillRate:        allJobs.length > 0 ? Math.round((hiredCount / allJobs.length) * 100) : 0,
      avgTimeToHire:   null,
    };
  }, [serverStats, allApps, allCandidates, allJobs]);
  
  // ── Name & User Resolver ──────────────────────────────────────────────────
  const getCandidateData = useCallback((app) => {
    if (!app) return { name: 'Candidate', user: null };
    
    // 1. Try populated candidateId/candidate
    const u = app.candidateId || app.candidate;
    if (u && typeof u === 'object' && (u.name || u.email)) {
      return { name: u.name || u.email || 'Candidate', user: { ...u, id: u.id || u._id } };
    }
    
    // 2. Try explicit candidateName
    if (app.candidateName) return { name: app.candidateName, user: null };

    // 3. Search in allCandidates cache
    const cid = extractId(app.candidateId || app.candidate);
    if (cid) {
      const found = allCandidates.find(c => String(c.id || c._id) === cid);
      if (found) return { name: found.name || found.email || 'Candidate', user: { ...found, id: found.id || found._id } };
    }

    // 4. Fallback: use email or generic label
    const email = app.candidateEmail || app.email;
    return { name: email ? email.split('@')[0] : 'Candidate', user: null };
  }, [allCandidates]);

  const stageBreakdown = useMemo(() => {
    if (analyticsData?.byStage && analyticsData.byStage.length > 0) {
      // Backend returns title-case currentStage values ('Applied', 'Interview Round 1', etc.)
      // Map them to frontend lowercase IDs before matching against STAGES.
      const countMap = {};
      analyticsData.byStage.forEach(x => {
        const fId = DB_TO_FRONTEND_STAGE[x.stage] || x.stage?.toLowerCase().replace(/\s+/g, '_');
        if (fId) countMap[fId] = (countMap[fId] || 0) + x.count;
      });
      return STAGES.map((s, i) => ({
        label: STAGE_LABELS[s] || s,
        value: countMap[s] || 0,
        color: STAGE_COLORS[i],
        stageKey: s,
      }));
    }
    // Fallback: compute from local allApps sample (normalizeApp already sets a.stage)
    return STAGES.map((s, i) => ({
      label: STAGE_LABELS[s],
      value: allApps.filter(a => {
        const fId = a.stage || DB_TO_FRONTEND_STAGE[a.currentStage];
        return fId === s;
      }).length,
      color: STAGE_COLORS[i],
      stageKey: s,
    }));
  }, [analyticsData, allApps]);

  const topJobs = useMemo(() => {
    if (analyticsData?.topJobs) {
      return analyticsData.topJobs.map(j => ({
        label: j.title,
        value: j.applications,
        color: '#0176D3',
        id: j.jobId,
      }));
    }
    return [];
  }, [analyticsData]);

  const trends = useMemo(() => trendData, [trendData]);

  const recentActivity = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const a of [...allApps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
      const jobKey = extractId(a.jobId);
      const candKey = extractId(a.candidateId || a.candidate);
      const stageKey = a.stage || a.currentStage || '';
      const key = `${candKey}|${jobKey}|${stageKey}`;
      if (!seen.has(key)) { seen.add(key); out.push(a); }
      if (out.length >= 15) break;
    }
    return out;
  }, [allApps]);

  // ── Drill-down helpers ────────────────────────────────────────────────────
  // Shared: sets loading title, fetches, then populates drawer
  const fetchDrill = useCallback(async (loadingTitle, type, fetcher) => {
    setDrillDown({ title: `${loadingTitle} — Loading…`, type, items: [] });
    try {
      const items = await fetcher();
      setDrillDown({ title: `${loadingTitle} (${items.length})`, type, items });
    } catch {
      setDrillDown({ title: loadingTitle, type, items: [] });
    }
  }, []);

  const openCandidatesDrill = () => {
    if (isSuperAdmin && onNavigate) {
      onNavigate('all-candidates');
      return;
    }
    fetchDrill('Candidate Database', 'user', async () => {
      const raw = await api.getCandidateRecords({ limit: 'all' }).catch(() => ({ data: [] }));
      const list = Array.isArray(raw?.data) ? raw.data : [];
      return list.map(c => ({
        ...c,
        id: c.applicationId || c.candidateId || c.userId || `${c.email}-${c.jobTitle}`,
        name: c.candidateName || c.email || 'Candidate',
        email: c.email || '',
        sub: `${c.email || 'No email'}${c.phone ? ` · ${c.phone}` : ''}${c.organisation ? ` · ${c.organisation}` : ''}`,
      }));
    });
  };

  const openActiveJobsDrill = () => fetchDrill('Active Postings', 'job', async () => {
    const raw = await api.getJobs({ status: 'active', limit: 500 }).then(unwrap).catch(() => []);
    return raw.map(j => ({ ...j, id: j.id || j._id, name: j.title, sub: `${j.companyName || 'Internal'} · ${j.location || ''}` }));
  });

  const openAppsDrill = () => fetchDrill('All Applications', 'app', async () => {
    const raw = await api.getApplicants({ limit: 'all' }).catch(() => ({ data: [] }));
    const list = raw?.data || [];
    return list.map(r => ({
      ...r,
      id: r.applicationId,
      name: r.candidateName || r.email || 'Candidate',
      sub: `${r.jobTitle || 'Unknown Job'} · ${r.stage || 'Applied'} · ${r.email || 'No email'}${r.phone ? ` · ${r.phone}` : ''}`,
      stage: DB_TO_FRONTEND_STAGE[r.stage] || r.stage,
      currentStage: r.stage,
    }));
  });

  const openVelocityDrill = (point = null) => fetchDrill(point?.date ? `Applications on ${point.label}` : 'Application Velocity — Last 14 Days', 'app', async () => {
    const params = point?.date
      ? { startDate: point.date, endDate: point.date, limit: 'all' }
      : { startDate: new Date(Date.now() - 13 * 86400000).toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], limit: 'all' };
    const raw = await api.getApplicants(params).catch(() => ({ data: [] }));
    return (raw?.data || []).map(r => ({
      ...r,
      id: r.applicationId,
      name: r.candidateName || r.email || 'Candidate',
      sub: `${r.appliedAt ? new Date(r.appliedAt).toLocaleDateString() : ''} · ${r.jobTitle || 'Unknown Job'} · ${r.stage || 'Applied'} · ${r.email || 'No email'}${r.phone ? ` · ${r.phone}` : ''}${r.assignedRecruiters ? ` · ${r.assignedRecruiters}` : ''}`,
      stage: DB_TO_FRONTEND_STAGE[r.stage] || r.stage,
      currentStage: r.stage,
    }));
  });

  const openPlacementsDrill = () => fetchDrill('Total Placements', 'app', async () => {
    const raw = await api.getApplications({ stage: 'Hired', limit: 500 }).then(unwrap).catch(() => []);
    return raw.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || 'Unknown Job'} · Hired` }));
  });

  const openStageDrill = (seg) => {
    if (!seg.stageKey || seg.value === 0) return;
    const dbStage = FRONTEND_TO_DB_STAGE[seg.stageKey] || seg.stageKey;
    fetchDrill(STAGE_LABELS[seg.stageKey] || seg.stageKey, 'app', async () => {
      const raw = await api.getApplications({ stage: dbStage, limit: 500 }).then(unwrap).catch(() => []);
      return raw.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || 'Unknown Job'} · ${STAGE_LABELS[seg.stageKey]}` }));
    });
  };

  const openJobBarDrill = (bar) => {
    if (!bar.id) return;
    fetchDrill(bar.label, 'app', async () => {
      const raw = await api.getApplications({ jobId: bar.id, limit: 500 }).then(unwrap).catch(() => []);
      return raw.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${STAGE_LABELS[a.stage || a.currentStage] || a.currentStage || a.stage}` }));
    });
  };

  // ── Export handler ────────────────────────────────────────────────────────
  const handleExport = async (key, url, filename) => {
    setExporting(p => ({ ...p, [key]: true }));
    try {
      await downloadExport(url, filename);
    } catch (e) {
      setToast('❌ Export failed: ' + e.message);
    } finally {
      setExporting(p => ({ ...p, [key]: false }));
    }
  };

  // ── Recruiter perf sorting ────────────────────────────────────────────────
  const sortedRecPerf = useMemo(() => {
    const rows = Array.isArray(recPerfSection.data?.data) ? recPerfSection.data.data : [];
    return [...rows].sort((a, b) => {
      const aVal = a[recSort.col] ?? 0;
      const bVal = b[recSort.col] ?? 0;
      return recSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [recPerfSection.data, recSort]);

  const toggleSort = (col) => {
    setRecSort(p => ({ col, dir: p.col === col && p.dir === 'desc' ? 'asc' : 'desc' }));
  };

  // ── Early return for initial load ─────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 24, animation: 'pulse 2s infinite', color: '#0176D3' }}>📊 Synchronizing Analytics Engine...</div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <ErrorReportBoundary componentName="AdminAnalytics">
      <div style={{ maxWidth: '100%', paddingBottom: 80 }}>

      {/* ── Unified Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: '#0A1628', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Analytics Command Center</h1>
          <p style={{ color: '#706E6B', fontSize: 14, margin: 0 }}>Unified Intelligence Platform · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {onNavigate && (
            <button
              onClick={() => onNavigate(isSuperAdmin ? 'candidate-requests' : 'candidate-request')}
              style={{ background: isSuperAdmin ? 'linear-gradient(135deg,#0176D3,#015AA1)' : 'linear-gradient(135deg,#BA0517,#e02d3c)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {isSuperAdmin ? '📋 Track Agency Requests' : '🚨 Request Candidates from TalentNest'}
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => setPlatformWide(p => !p)}
              style={{ padding: '7px 16px', borderRadius: 10, border: `2px solid ${platformWide ? '#F59E0B' : '#E2E8F0'}`, background: platformWide ? '#FEF3C7' : '#F8FAFC', color: platformWide ? '#92400E' : '#706E6B', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
              {platformWide ? '🌐 All Orgs' : '🏢 My Org'}
            </button>
          )}
          <button
            disabled={exporting.candidates}
            onClick={() => handleExport('candidates', '/dashboard/candidate-records/export', `candidate-records-${new Date().toISOString().split('T')[0]}.xlsx`)}
            style={{ padding: '7px 16px', borderRadius: 10, border: '2px solid #E2E8F0', background: '#fff', color: '#0176D3', fontSize: 12, fontWeight: 800, cursor: exporting.candidates ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: exporting.candidates ? 0.6 : 1 }}>
            {exporting.candidates ? 'Exporting…' : '⬇ Export Candidate Excel'}
          </button>
          <button
            disabled={exporting.applicants}
            onClick={() => handleExport('applicants', '/dashboard/applicants/export', `applicants-${new Date().toISOString().split('T')[0]}.xlsx`)}
            style={{ padding: '7px 16px', borderRadius: 10, border: '2px solid #E2E8F0', background: '#fff', color: '#7c3aed', fontSize: 12, fontWeight: 800, cursor: exporting.applicants ? 'wait' : 'pointer', whiteSpace: 'nowrap', opacity: exporting.applicants ? 0.6 : 1 }}>
            {exporting.applicants ? 'Exporting…' : '⬇ Export Applicants Excel'}
          </button>
          <div style={{ display: 'flex', background: 'rgba(1,118,211,0.06)', padding: 4, borderRadius: 14, flexWrap: 'wrap', gap: 2 }}>
            {PERIODS.map((p, i) => (
              <button key={i} onClick={() => setPeriod(i)} style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: period === i ? '#0176D3' : 'transparent', color: period === i ? '#fff' : '#0176D3', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <TrendCard label="Total Candidates" value={stats.totalCandidates} icon="👤" color="#0176D3" onClick={openCandidatesDrill} />
        <TrendCard label="Active Job Postings" value={stats.activeJobs} icon="💼" color="#F59E0B" onClick={openActiveJobsDrill} />
        <TrendCard label="Total Applications" value={stats.totalApps} icon="📨" color="#7c3aed"
          sub={stats.appsLast30 ? `${stats.appsLast30} in last 30 days` : undefined}
          onClick={openAppsDrill} />
        <TrendCard label="Total Placements" value={stats.placements} icon="🎉" color="#10b981"
          sub={stats.placementsLast30 ? `${stats.placementsLast30} hired last 30 days` : undefined}
          onClick={openPlacementsDrill} />
        <TrendCard label="Fill Rate" value={`${stats.fillRate}%`} icon="📈" color="#032D60"
          sub="hires ÷ total job positions" />
      </div>

      {/* ── Charts Row ── */}
      <div className="analytics-chart-row">
        <div style={{ ...glassPanel }} title="Click a date to view candidate records behind that point">
          <AreaChart data={trends} color="#0176D3" height={220} title="Application Velocity"
            subtitle="Candidates joining the pipeline across all jobs (Last 14 days)" onItemClick={openVelocityDrill} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <p style={{ color: '#94A3B8', fontSize: 11, margin: 0 }}>Click any date on the chart to drill into actual applicant records.</p>
            {onNavigate && <button onClick={() => onNavigate('applicants')} style={{ ...btnG, padding: '6px 12px', fontSize: 11 }}>Open Applicants</button>}
          </div>
        </div>
        <div style={{ ...glassPanel, cursor: 'pointer' }}>
          <DonutChart segments={stageBreakdown} size={160} title="Hiring Pipeline"
            centerValue={filteredApps.length} centerLabel="TOTAL" onItemClick={openStageDrill} />
          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, margin: '8px 0 0' }}>Click segment to drill down</p>
        </div>
      </div>

      {isSuperAdmin && (
        <div style={{ ...glassPanel, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h3 style={{ ...sectionTitle, margin: 0 }}>Applicants Applying For Jobs</h3>
              <div style={{ color: '#706E6B', fontSize: 12, marginTop: 4 }}>
                One row per submitted application, with candidate contact details and job context.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={openAppsDrill} style={{ ...btnG, borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>View Applicants</button>
              <button
                disabled={exporting.applicants}
                onClick={() => handleExport('applicants', '/dashboard/applicants/export', `applicants-${new Date().toISOString().split('T')[0]}.xlsx`)}
                style={{ ...btnP, borderRadius: 10, padding: '8px 14px', fontSize: 12, opacity: exporting.applicants ? 0.6 : 1 }}>
                {exporting.applicants ? 'Exporting…' : 'Export Applicants Excel'}
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 920 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Candidate', 'Email', 'Mobile', 'Organisation', 'Job', 'Stage', 'Source', 'Applied'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#0A1628', borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applicantRows.slice(0, 8).map((r, i) => (
                  <tr key={r.applicationId || r.candidateId || r.userId || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700 }}>{r.candidateName || 'Candidate'}</td>
                    <td style={{ padding: '10px 12px', color: '#0176D3' }}>{r.email || '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{r.phone || '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{r.organisation || '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{r.jobTitle || '-'}</td>
                    <td style={{ padding: '10px 12px' }}><Badge label={r.stage || r.recordType || 'Profile'} color="#0176D3" /></td>
                    <td style={{ padding: '10px 12px', color: '#706E6B' }}>{r.source || '-'}</td>
                    <td style={{ padding: '10px 12px', color: '#706E6B', whiteSpace: 'nowrap' }}>{r.appliedAt ? new Date(r.appliedAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
                {applicantRows.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#94A3B8' }}>No applicants found yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div style={{ ...glassPanel, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <h3 style={{ ...sectionTitle, margin: 0 }}>All Candidate Records</h3>
              <div style={{ color: '#706E6B', fontSize: 12, marginTop: 4 }}>
                Candidate accounts and profiles, including those who have not applied yet.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={openCandidatesDrill} style={{ ...btnG, borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>View All Candidates</button>
              <button
                disabled={exporting.candidates}
                onClick={() => handleExport('candidates', '/dashboard/candidate-records/export', `candidate-records-${new Date().toISOString().split('T')[0]}.xlsx`)}
                style={{ ...btnP, borderRadius: 10, padding: '8px 14px', fontSize: 12, opacity: exporting.candidates ? 0.6 : 1 }}>
                {exporting.candidates ? 'Exporting…' : 'Export Candidate Excel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="analytics-chart-row-rev">
        <div style={glassPanel}>
          <VertBarChart data={topJobs} height={260} title="Top Performance Jobs"
            subtitle="Click a bar to see applicants" showValues onItemClick={openJobBarDrill} />
        </div>

        {/* ── Leaderboard ── */}
        <div style={glassPanel}>
          <h3 style={sectionTitle}>Recruiter Leaderboard</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(leaderboard || []).slice(0, 6).map((r, i) => (
              <div key={r.recruiterId || r._id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ width: 24, fontWeight: 900, color: '#CBD5E1' }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{(r.name || '?')[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#706E6B' }}>{r.jobs} Jobs Assigned</div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#0176D3' }}>{r.candidates}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>APPS</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#10B981' }}>{r.hired}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>HIRED</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#F59E0B' }}>{r.conversion}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>CONV</div></div>
                </div>
                <button
                  onClick={async () => {
                    const rid = String(r.recruiterId);
                    setDrillDown({ title: `${r.name}'s Pipeline — Loading…`, type: 'app', items: [] });
                    try {
                      const raw = await api.getApplications({ recruiterId: rid, limit: 500 }).then(unwrap).catch(() => []);
                      const items = raw.map(a => ({
                        ...a,
                        id: a.id || a._id,
                        name: getCandidateData(a).name,
                        sub: `${a.jobId?.title || 'Unknown Job'} · ${STAGE_LABELS[a.stage || a.currentStage] || a.stage || a.currentStage}`,
                      }));
                      setDrillDown({ title: `${r.name}'s Pipeline (${items.length})`, type: 'app', items });
                    } catch {
                      setDrillDown({ title: `${r.name}'s Pipeline`, type: 'app', items: [] });
                    }
                  }}
                  style={{ padding: '6px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  ANALYZE
                </button>
              </div>
            ))}
            {leaderboard.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>No recruiter data available yet.</div>}
          </div>
        </div>
      </div>

      {/* ── Platform Pulse ── */}
      <div style={{ ...glassPanel, marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>⚡ Platform Pulse (Recent Activity)</h3>
          <button onClick={load} style={{ border: 'none', background: 'none', color: '#0176D3', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>↻ Refresh Live Feed</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {recentActivity.map(a => {
            const stg = a.stage || a.currentStage || '';
            const s = SM[stg] || { color: '#0176D3', label: stg };
            const jobId = extractId(a.jobId);
            const j = allJobs.find(jb => String(jb.id || jb._id) === jobId);
            const { name: candidateName, user: fullUser } = getCandidateData(a);
            
            return (
              <div key={a.id || a._id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(241,245,249,0.3)', borderRadius: 16, border: '1px solid #F1F5F9', transition: 'all 0.2s' }}>
                <div onClick={() => setDrillDown({ title: 'Application Detail', type: 'app', items: [{ ...a, id: a.id || a._id, name: candidateName, sub: `${a.jobId?.title || j?.title || 'Unknown Job'} · ${STAGE_LABELS[stg] || stg}` }] })}
                     style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                  <ActivityDot stage={stg} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{candidateName.split(' ')[0]}</span>
                      <span style={{ color: '#94A3B8', fontSize: 11 }}>→</span>
                      <span style={{ color: s.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j?.title || a.jobId?.title || 'Job'} @ {j?.companyName || 'Internal'}</div>
                  </div>
                  <TimeAgo date={a.createdAt} />
                </div>
                {/* Senior Developer Addition: Direct Edit Shortcut */}
                <button 
                  onClick={() => {
                    const id = extractId(a.candidateId || a.candidate);
                    const candObj = a.candidateId && typeof a.candidateId === 'object' ? a.candidateId : null;
                    const userToEdit = fullUser
                      || allCandidates.find(c => String(c.id || c._id) === id)
                      || (candObj ? { role: 'candidate', ...candObj, id: candObj.id || candObj._id?.toString() } : null)
                      || { role: 'candidate', id, name: candidateName, email: a.candidateEmail };
                    setDrawerUser(userToEdit);
                  }}
                  style={{ background: 'none', border: 'none', color: '#0176D3', fontSize: 14, cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Edit Candidate Profile"
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(1,118,211,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  ✏️
                </button>
              </div>
            );
          })}
          {recentActivity.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#94A3B8' }}>No recent activity.</div>}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ADVANCED ANALYTICS SECTION
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Date Range Picker ── */}
      <div style={{ ...glassPanel, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0A1628', whiteSpace: 'nowrap' }}>📅 Advanced Analytics</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#706E6B', whiteSpace: 'nowrap' }}>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#706E6B', whiteSpace: 'nowrap' }}>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, outline: 'none' }} />
          </div>
          <button onClick={applyFilter} style={{ ...btnP, borderRadius: 10, padding: '8px 20px' }}>Apply Filter</button>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>Showing: {appliedStart} → {appliedEnd}</span>
        </div>
      </div>

      <div className="analytics-2col">

        {/* ── Hiring Funnel ── */}
        <div style={glassPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>Hiring Funnel</h3>
            <button
              disabled={exporting.funnel}
              onClick={() => handleExport('funnel', `/dashboard/funnel/export?startDate=${appliedStart}&endDate=${appliedEnd}`, `funnel-${appliedStart}.xlsx`)}
              style={{ ...btnG, borderRadius: 10, padding: '7px 14px', fontSize: 12, opacity: exporting.funnel ? 0.6 : 1 }}>
              {exporting.funnel ? '…' : '⬇ Export Excel'}
            </button>
          </div>
          {funnelSection.loading && <SectionSkeleton />}
          {funnelSection.error   && <SectionError message={funnelSection.error} onRetry={funnelSection.reload} />}
          {!funnelSection.loading && !funnelSection.error && (() => {
            const rows = Array.isArray(funnelSection.data?.data) ? funnelSection.data.data : [];
            const max  = Math.max(...rows.map(r => r.count), 1);
            if (!rows.length) return <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>No data for this period</div>;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map((row, idx) => {
                  const prev = idx > 0 ? rows[idx - 1].count : null;
                  const dropoff = prev && prev > 0 ? Math.round((1 - row.count / prev) * 100) : null;
                  return (
                    <div key={row.stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{row.stage}</span>
                        <span style={{ fontSize: 12, color: '#706E6B' }}>{row.count} ({row.percentage}%)</span>
                      </div>
                      <HorizBar value={row.count} max={max} color={row.stage === 'Hired' ? '#10b981' : row.stage === 'Rejected' ? '#ef4444' : '#0176D3'} height={8} />
                      {dropoff !== null && dropoff > 0 && (
                        <div style={{ fontSize: 10, color: '#ef4444', marginTop: 2 }}>↓ {dropoff}% drop from previous stage</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* ── Source Breakdown ── */}
        <div style={glassPanel}>
          <h3 style={sectionTitle}>Candidate Sources</h3>
          {sourceSection.loading && <SectionSkeleton />}
          {sourceSection.error   && <SectionError message={sourceSection.error} onRetry={sourceSection.reload} />}
          {!sourceSection.loading && !sourceSection.error && (() => {
            const rows = Array.isArray(sourceSection.data?.data) ? sourceSection.data.data : [];
            if (!rows.length) return <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>No source data available</div>;
            const segments = rows.map(r => ({
              label: r.source || 'direct',
              value: r.count,
              color: SOURCE_COLORS[r.source] || '#94a3b8',
            }));
            return <DonutChart segments={segments} size={160} title="" />;
          })()}
        </div>
      </div>

      {/* ── Dropout Analysis ── */}
      <div style={{ ...glassPanel, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>Dropout Analysis</h3>
            <button
              disabled={exporting.dropout}
              onClick={() => handleExport('dropout', `/dashboard/dropout-analysis/export?startDate=${appliedStart}&endDate=${appliedEnd}`, `dropout-${appliedStart}.xlsx`)}
              style={{ ...btnG, borderRadius: 10, padding: '7px 14px', fontSize: 12, opacity: exporting.dropout ? 0.6 : 1 }}>
              {exporting.dropout ? '…' : '⬇ Export Excel'}
            </button>
          </div>
          {dropoutSection.loading && <SectionSkeleton />}
          {dropoutSection.error   && <SectionError message={dropoutSection.error} onRetry={dropoutSection.reload} />}
          {!dropoutSection.loading && !dropoutSection.error && (() => {
            const rows = Array.isArray(dropoutSection.data?.data) ? dropoutSection.data.data : [];
            const total = dropoutSection.data?.total || 0;
            if (!rows.length) return <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>No rejections in this period</div>;
            return (
              <div>
                <div style={{ marginBottom: 12, fontSize: 12, color: '#706E6B' }}>
                  <strong>{total}</strong> candidate{total !== 1 ? 's' : ''} rejected — stage where they dropped out:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rows.map(r => {
                    const pct = r.percentage;
                    return (
                      <div key={r.stage}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Dropped at: {r.stage}</span>
                          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 700 }}>{r.count} ({pct}%)</span>
                        </div>
                        <HorizBar value={r.count} max={Math.max(...rows.map(x => x.count), 1)} color="#ef4444" height={7} />
                        {r.topReasons?.length > 0 && (
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                            Top reason: {r.topReasons[0].reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
      </div>

      {/* ── Time to Hire ── */}
      <div style={{ ...glassPanel, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>Time to Hire by Job</h3>
          <button
            disabled={exporting.tth}
            onClick={() => handleExport('tth', `/dashboard/time-to-hire/export?startDate=${appliedStart}&endDate=${appliedEnd}`, `time-to-hire-${appliedStart}.xlsx`)}
            style={{ ...btnG, borderRadius: 10, padding: '7px 14px', fontSize: 12, opacity: exporting.tth ? 0.6 : 1 }}>
            {exporting.tth ? '…' : '⬇ Export Excel'}
          </button>
        </div>
        {tthSection.loading && <SectionSkeleton />}
        {tthSection.error   && <SectionError message={tthSection.error} onRetry={tthSection.reload} />}
        {!tthSection.loading && !tthSection.error && (() => {
          const rows = Array.isArray(tthSection.data?.data) ? tthSection.data.data : [];
          if (!rows.length) return <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>No hired applications in this period</div>;
          return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Job Title', 'Recruiter', 'Avg Days to Hire', 'Total Hires'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#0A1628', fontSize: 12, borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.jobTitle}-${i}`} style={{ borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#0A1628' }}>{r.jobTitle}</td>
                      <td style={{ padding: '10px 16px', color: '#706E6B' }}>{r.recruiterName}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontWeight: 700, color: r.avgDaysToHire > 30 ? '#ef4444' : r.avgDaysToHire > 14 ? '#F59E0B' : '#10b981' }}>
                          {r.avgDaysToHire} days
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0176D3' }}>{r.hiredCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* ── Recruiter Performance ── */}
      <div style={{ ...glassPanel, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>Recruiter Performance</h3>
          <button
            disabled={exporting.recPerf}
            onClick={() => handleExport('recPerf', `/dashboard/recruiter-performance/export?startDate=${appliedStart}&endDate=${appliedEnd}`, `recruiter-perf-${appliedStart}.xlsx`)}
            style={{ ...btnG, borderRadius: 10, padding: '7px 14px', fontSize: 12, opacity: exporting.recPerf ? 0.6 : 1 }}>
            {exporting.recPerf ? '…' : '⬇ Export Excel'}
          </button>
        </div>
        {recPerfSection.loading && <SectionSkeleton />}
        {recPerfSection.error   && <SectionError message={recPerfSection.error} onRetry={recPerfSection.reload} />}
        {!recPerfSection.loading && !recPerfSection.error && (() => {
          if (!sortedRecPerf.length) return <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>No recruiter data in this period</div>;
          const cols = [
            { key: 'recruiterName',   label: 'Recruiter',    numeric: false },
            { key: 'jobsAssigned',    label: 'Jobs',         numeric: true  },
            { key: 'candidatesAdded', label: 'Candidates',   numeric: true  },
            { key: 'shortlisted',     label: 'Shortlisted',  numeric: true  },
            { key: 'offers',          label: 'Offers',       numeric: true  },
            { key: 'hired',           label: 'Hired',        numeric: true  },
            { key: 'avgDaysToShortlist', label: 'Avg Days→SL', numeric: true },
          ];
          return (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {cols.map(c => (
                      <th key={c.key}
                        onClick={() => c.numeric && toggleSort(c.key)}
                        style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#0A1628', fontSize: 12, borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap', cursor: c.numeric ? 'pointer' : 'default', userSelect: 'none' }}>
                        {c.label}
                        {c.numeric && recSort.col === c.key && (recSort.dir === 'asc' ? ' ▲' : ' ▼')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRecPerf.map((r, i) => (
                    <tr key={r.recruiterId || i} style={{ borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{r.recruiterName}</td>
                      <td style={{ padding: '10px 16px', color: '#706E6B' }}>{r.jobsAssigned}</td>
                      <td style={{ padding: '10px 16px', color: '#0176D3', fontWeight: 700 }}>{r.candidatesAdded}</td>
                      <td style={{ padding: '10px 16px', color: '#7c3aed', fontWeight: 700 }}>{r.shortlisted}</td>
                      <td style={{ padding: '10px 16px', color: '#F59E0B', fontWeight: 700 }}>{r.offers}</td>
                      <td style={{ padding: '10px 16px', color: '#10b981', fontWeight: 700 }}>{r.hired}</td>
                      <td style={{ padding: '10px 16px', color: r.avgDaysToShortlist > 14 ? '#ef4444' : '#10b981', fontWeight: 700 }}>{r.avgDaysToShortlist}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* ── Drill-down Modal ── */}
      {drillDown && (() => {
        const filtered = drillDown.items.filter(item => {
          if (!drillDownSearch) return true;
          const q = drillDownSearch.toLowerCase();
          return (item.name || item.title || '').toLowerCase().includes(q) || (item.sub || item.email || '').toLowerCase().includes(q);
        });

        const downloadCSV = () => {
          if (!filtered.length) return;
          const columns = [
            ['name', 'Name'],
            ['email', 'Email'],
            ['phone', 'Mobile'],
            ['organisation', 'Organisation'],
            ['jobTitle', 'Job'],
            ['jobCompany', 'Hiring Company'],
            ['assignedRecruiters', 'Assigned Recruiters'],
            ['currentStage', 'Stage'],
            ['status', 'Status'],
            ['source', 'Source'],
            ['aiMatchScore', 'AI Match Score'],
            ['skills', 'Skills'],
            ['experience', 'Experience'],
            ['currentCompany', 'Current Company'],
            ['location', 'Location'],
            ['currentCTC', 'Current CTC'],
            ['expectedCTC', 'Expected CTC'],
            ['appliedAt', 'Applied At'],
            ['recruiterNotes', 'Recruiter Notes'],
            ['coverLetter', 'Cover Letter'],
          ];
          const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
          const rows = filtered.map(item => columns.map(([key]) => {
            const value = key === 'appliedAt' && item[key] ? new Date(item[key]).toLocaleDateString() : item[key];
            return esc(value);
          }).join(','));
          const headers = columns.map(([, label]) => label);
          const blob = new Blob([`${headers.join(',')}\n${rows.join('\n')}`], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `talentnest_${drillDown.type}_export.csv`; a.click();
        };

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
            <div onClick={() => { setDrillDown(null); setDrillDownSearch(''); }} style={{ position: 'absolute', inset: 0, background: 'rgba(5, 13, 26, 0.4)', backdropFilter: 'blur(10px)' }} />
            <div style={{ width: '100%', maxWidth: 860, background: '#fff', borderRadius: '28px 0 0 28px', position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh', boxShadow: '-32px 0 64px rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0176D3', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Deep Dive Inspection</div>
                  <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{drillDown.title}</h3>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => { setDrillDown(null); setDrillDownSearch(''); }} style={{ width: 40, height: 40, border: 'none', background: '#F8FAFC', borderRadius: 12, cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
              </div>
              <div style={{ padding: '16px 32px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                <input placeholder={`Search in ${drillDown.title}...`} value={drillDownSearch} onChange={e => setDrillDownSearch(e.target.value)} style={{ width: '100%', padding: '12px 20px', borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px 32px' }}>
                {drillDown.title.endsWith('Loading…') && (
                  <div style={{ textAlign: 'center', padding: 60, color: '#0176D3' }}>
                    <div style={{ fontSize: 32, marginBottom: 12, animation: 'pulse 1.2s infinite' }}>⏳</div>
                    <div style={{ fontWeight: 700 }}>Fetching data…</div>
                  </div>
                )}
                {!drillDown.title.endsWith('Loading…') && filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No records found.</div>}
                {filtered.slice(0, drillPage * DRILL_PAGE_SIZE).map(item => {
                  const itemId = item.id || item._id;
                  return (
                    <div key={itemId} style={{ padding: '16px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0A1628', fontSize: 14 }}>{item.name || item.title || 'Record'}</div>
                        <div style={{ color: '#706E6B', fontSize: 12, marginTop: 2 }}>{item.sub || item.email || (item.createdAt ? `Added ${new Date(item.createdAt).toLocaleDateString()}` : '')}</div>
                        {(item.email || item.phone || item.organisation || item.source || item.currentCompany || item.skills) && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            {item.email && <span style={{ background: '#EFF6FF', color: '#1d4ed8', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.email}</span>}
                            {item.phone && <span style={{ background: '#F0FDF4', color: '#166534', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.phone}</span>}
                            {item.organisation && <span style={{ background: '#F8FAFC', color: '#475569', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.organisation}</span>}
                            {item.source && <span style={{ background: '#FFF7ED', color: '#9A3412', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.source}</span>}
                            {item.currentCompany && <span style={{ background: '#F8FAFC', color: '#475569', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.currentCompany}</span>}
                            {item.skills && <span style={{ background: '#F5F3FF', color: '#6D28D9', fontSize: 11, padding: '3px 8px', borderRadius: 20, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.skills}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {drillDown.type === 'app' && (
                          <select value={item.stage || item.currentStage || ''}
                            onChange={e => triggerUpdate('app', itemId, { stage: e.target.value }, `Move candidate to ${STAGE_LABELS[e.target.value]}?`)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                          </select>
                        )}
                        {/* Senior Developer Addition: Contextual Edit in Drill-down */}
                        <button 
                          onClick={() => {
                            const id = extractId(item.candidateId || item.candidate) || item.id || item._id;
                            const candObj = item.candidateId && typeof item.candidateId === 'object' ? item.candidateId : null;
                            const userToEdit = allCandidates.find(c => String(c.id || c._id) === String(id))
                              || (candObj ? { role: 'candidate', ...candObj, id: candObj.id || candObj._id?.toString() } : null)
                              || { role: 'candidate', id, name: item.name || item._displayName, email: item.email };
                            setDrawerUser(userToEdit);
                          }}
                          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0176D3', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                          onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}


      {/* ── Confirm Modal ── */}
      {confirmAction && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
          <div style={{ background: '#fff', padding: 24, borderRadius: 20, position: 'relative', width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800 }}>Confirm Action</h4>
            <p style={{ color: '#706E6B', fontSize: 14, margin: '0 0 24px' }}>{confirmAction.message}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmAction.onConfirm} style={{ flex: 1, padding: 10, borderRadius: 12, background: '#0176D3', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Yes, proceed</button>
              <button onClick={confirmAction.onCancel}  style={{ flex: 1, padding: 10, borderRadius: 12, background: '#F1F5F9', color: '#706E6B', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast} onClose={() => setToast('')} />
      {drawerUser && <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
      </div>
    </ErrorReportBoundary>
  );
}
