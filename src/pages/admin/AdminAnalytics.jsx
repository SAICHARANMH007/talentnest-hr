import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api, downloadBlob } from '../../api/api.js';
import Toast from '../../components/ui/Toast.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import AreaChart from '../../components/charts/AreaChart.jsx';
import VertBarChart from '../../components/charts/VertBarChart.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import KpiCard from '../../components/charts/KpiCard.jsx';
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
  const [loading,       setLoading]       = useState(true);
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

  // ── NPS ───────────────────────────────────────────────────────────────────
  const [npsData, setNpsData] = useState(null);

  // ── Export loading ────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState({});

  const unwrap = (r) => Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);

  // ── Core data load ────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    const days = PERIODS[period].days;
    const end = new Date().toISOString().split('T')[0];
    const start = days ? new Date(Date.now() - days * 86400000).toISOString().split('T')[0] : null;

    Promise.all([
      api.getApplications({ limit: 100 }).then(unwrap).catch(() => []), // Only for recent-activity feed; KPI metrics use serverStats
      api.getJobs({ limit: 5000 }).then(unwrap).catch(() => []),        // Fetch all jobs (no realistic org has >5000)
      api.getUsers('candidate').then(unwrap).catch(() => []),
      api.getRecruiterLeaderboard().catch(() => []),
      api.getDashboardStats().catch(() => null),
      api.getAnalytics(start, end).catch(() => null),
      api.getTrends().catch(() => ({ data: [] })),
    ])
      .then(([a, j, c, l, s, an, t]) => {
        setAllApps(a);
        setAllJobs(j);
        setAllCandidates(c);
        setLeaderboard(Array.isArray(l) ? l : (l?.data || []));
        setServerStats(s?.data || null);
        setAnalyticsData(an?.data || null);
        setTrendData(t?.data || []);
      })
      .catch(err => setToast('❌ Failed to load analytics: ' + (err.message || 'Unknown error')))
      .finally(() => setLoading(false));
    api.getNpsStats().then(r => setNpsData(r?.data || null)).catch(() => {});
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // ── Advanced section fetchers (rebuild when dates change) ─────────────────
  const dateParams = useMemo(
    () => ({ startDate: appliedStart, endDate: appliedEnd }),
    [appliedStart, appliedEnd],
  );

  const funnelSection     = useSection(useCallback(() => api.getFunnel(dateParams), [dateParams]));
  const sourceSection     = useSection(useCallback(() => api.getSourceBreakdown(dateParams), [dateParams]));
  const tthSection        = useSection(useCallback(() => api.getTimeToHire(dateParams), [dateParams]));
  const velocitySection   = useSection(useCallback(() => api.getStageVelocity(dateParams), [dateParams]));
  const offerSection      = useSection(useCallback(() => api.getOfferAcceptance(dateParams), [dateParams]));
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
        placements:      serverStats.placements || 0,
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

    return { name: 'Candidate', user: null };
  }, [allCandidates]);

  const stageBreakdown = useMemo(() => {
    if (analyticsData?.byStage) {
      return STAGES.map((s, i) => ({
        label: STAGE_LABELS[s] || s,
        value: analyticsData.byStage.find(x => x.stage === s)?.count || 0,
        color: STAGE_COLORS[i],
        stageKey: s,
      }));
    }
    return STAGES.map((s, i) => ({
      label: STAGE_LABELS[s],
      value: allApps.filter(a => a.stage === s || a.currentStage === s).length,
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

  const recentActivity = useMemo(
    () => [...allApps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8),
    [allApps],
  );

  // ── Drill-down helpers ────────────────────────────────────────────────────
  const openCandidatesDrill = () => {
    if (isSuperAdmin && allCandidates.length > 0) {
      setDrillDown({ title: `Candidate Database (${allCandidates.length})`, type: 'user', items: allCandidates.map(c => ({ id: c.id || c._id, name: c.name || 'Candidate', email: c.email || '', sub: c.title || c.location || 'Registered Candidate' })) });
      return;
    }
    const seen = new Set(), items = [];
    allApps.forEach(a => {
      const cid = extractId(a.candidateId);
      if (cid && !seen.has(cid)) {
        seen.add(cid);
        const { name } = getCandidateData(a);
        items.push({ id: cid, name, email: a.candidateId?.email || '', sub: `${allApps.filter(x => extractId(x.candidateId) === cid).length} application(s)` });
      }
    });
    setDrillDown({ title: `Candidate Database (${items.length})`, type: 'user', items });
  };

  const openActiveJobsDrill = () => {
    const items = allJobs.filter(j => j.status === 'active' || j.status === 'Open').map(j => ({ ...j, id: j.id || j._id, name: j.title, sub: `${j.companyName || 'Internal'} · ${allApps.filter(a => extractId(a.jobId) === String(j.id || j._id)).length} applicants` }));
    setDrillDown({ title: `Active Postings (${items.length})`, type: 'job', items });
  };

  const openAppsDrill = () => {
    setDrillDown({ title: `New Applications (${filteredApps.length})`, type: 'app', items: filteredApps.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || 'Unknown Job'} · ${STAGE_LABELS[a.stage || a.currentStage] || a.stage || a.currentStage}` })) });
  };

  const openPlacementsDrill = () => {
    const items = filteredApps.filter(a => a.stage === 'selected' || a.stage === 'hired' || a.currentStage === 'Hired').map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || 'Unknown Job'} · Hired` }));
    setDrillDown({ title: `Total Placements (${items.length})`, type: 'app', items });
  };

  const openStageDrill = (seg) => {
    if (!seg.stageKey || seg.value === 0) return;
    const items = filteredApps.filter(a => a.stage === seg.stageKey || a.currentStage === seg.stageKey).map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || 'Unknown Job'} · ${STAGE_LABELS[seg.stageKey]}` }));
    setDrillDown({ title: `${STAGE_LABELS[seg.stageKey]} (${items.length})`, type: 'app', items });
  };

  const openJobBarDrill = (bar) => {
    const items = filteredApps.filter(a => extractId(a.jobId) === bar.id).map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${STAGE_LABELS[a.stage || a.currentStage] || a.stage || a.currentStage}` }));
    setDrillDown({ title: `${bar.label} — Applicants (${items.length})`, type: 'app', items });
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
        <TrendCard label="New Applications" value={stats.totalApps} icon="📨" color="#7c3aed"
          sub={PERIODS[period].days ? `+${Math.round(stats.totalApps / PERIODS[period].days)} avg/day` : `${stats.totalApps} total`}
          onClick={openAppsDrill} />
        <TrendCard label="Total Placements" value={stats.placements} icon="🎉" color="#10b981" onClick={openPlacementsDrill} />
        <TrendCard label="Fill Reliability" value={`${stats.fillRate}%`} icon="📈" color="#032D60" />
      </div>

      {/* ── Charts Row ── */}
      <div className="analytics-chart-row">
        <div style={glassPanel}>
          <AreaChart data={trends} color="#0176D3" height={220} title="Application Velocity"
            subtitle="Candidates joining the pipeline across all jobs (Last 14 days)" />
        </div>
        <div style={{ ...glassPanel, cursor: 'pointer' }}>
          <DonutChart segments={stageBreakdown} size={160} title="Hiring Pipeline"
            centerValue={filteredApps.length} centerLabel="TOTAL" onItemClick={openStageDrill} />
          <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, margin: '8px 0 0' }}>Click segment to drill down</p>
        </div>
      </div>

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
              <div key={r.recruiterId || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ width: 24, fontWeight: 900, color: '#CBD5E1' }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#0176D3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>{(r.name || '?')[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: '#706E6B' }}>{r.jobs} Active Postings</div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#0176D3' }}>{r.candidates}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>APPS</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#10B981' }}>{r.hired}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>HIRED</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 800, color: '#F59E0B' }}>{r.conversion}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>CONV</div></div>
                </div>
                <button
                  onClick={() => {
                    const rid = r.recruiterId;
                    const recApps = allApps.filter(a => {
                      const job = allJobs.find(j => String(j.id || j._id) === extractId(a.jobId));
                      return job && job.assignedRecruiters?.some(x => String(x) === String(rid) || String(x?.id || x?._id) === String(rid));
                    }).map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || 'Unknown Job'} · ${STAGE_LABELS[a.stage || a.currentStage] || a.stage || a.currentStage}` }));
                    setDrillDown({ title: `${r.name}'s Pipeline`, type: 'app', items: recApps });
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
                    const userToEdit = fullUser || allCandidates.find(c => String(c.id || c._id) === id) || { id, name: candidateName, email: a.candidateEmail };
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

      {/* ── Offer Acceptance KPIs ── */}
      <div style={{ marginBottom: 24 }}>
        {offerSection.loading && <SectionSkeleton />}
        {offerSection.error   && <SectionError message={offerSection.error} onRetry={offerSection.reload} />}
        {!offerSection.loading && !offerSection.error && (() => {
          const d = offerSection.data?.data || {};
          return (
            <div style={{ ...glassPanel }}>
              <h3 style={sectionTitle}>Offer Acceptance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                <KpiCard icon="📤" label="Offers Sent"     value={d.offersSent ?? 0}     color="#0176D3" />
                <KpiCard icon="✅" label="Offers Accepted" value={d.offersAccepted ?? 0} color="#10b981" />
                <KpiCard icon="📊" label="Acceptance Rate"  value={`${d.acceptanceRate ?? 0}%`} color="#7c3aed" />
              </div>
            </div>
          );
        })()}
      </div>

      <div className="analytics-2col">

        {/* ── Stage Velocity ── */}
        <div style={glassPanel}>
          <h3 style={sectionTitle}>Stage Velocity (Avg Hours per Stage)</h3>
          {velocitySection.loading && <SectionSkeleton />}
          {velocitySection.error   && <SectionError message={velocitySection.error} onRetry={velocitySection.reload} />}
          {!velocitySection.loading && !velocitySection.error && (() => {
            const rows = Array.isArray(velocitySection.data?.data) ? velocitySection.data.data : [];
            if (!rows.length) return <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>Not enough stage transition data yet</div>;
            const max = Math.max(...rows.map(r => r.avgHours), 1);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rows.map(row => {
                  const isHigh = row.avgHours > 72;
                  const isMed  = !isHigh && row.avgHours > 48;
                  const color  = isHigh ? '#ef4444' : isMed ? '#F59E0B' : '#10b981';
                  return (
                    <div key={row.stage}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0A1628' }}>{row.stage}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>
                          {row.avgHours < 24 ? `${row.avgHours}h` : `${(row.avgHours / 24).toFixed(1)}d`}
                          <span style={{ color: '#94A3B8', fontWeight: 400 }}> ({row.sampleCount} moves)</span>
                        </span>
                      </div>
                      <HorizBar value={row.avgHours} max={max} color={color} height={8} />
                    </div>
                  );
                })}
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>🟡 &gt;48h · 🔴 &gt;72h indicates SLA risk</div>
              </div>
            );
          })()}
        </div>

        {/* ── Dropout Analysis ── */}
        <div style={glassPanel}>
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
            if (!rows.length) return <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>No dropout data for this period</div>;
            const chartData = rows.map(r => ({ label: r.stage, value: r.count, color: '#ef4444' }));
            return (
              <div>
                <VertBarChart data={chartData} height={180} defaultColor="#ef4444" showValues />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rows.slice(0, 4).map(r => (
                    <div key={r.stage} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                      <span style={{ fontWeight: 600, color: '#0A1628' }}>{r.stage}</span>
                      <span style={{ color: '#ef4444' }}>{r.count} ({r.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
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
                    <tr key={r.jobId || i} style={{ borderBottom: '1px solid #F1F5F9' }}
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
          const headers = ['Name', 'Detail', 'Date'];
          const rows = filtered.map(item => [
            item.name || item.title || 'Record',
            item.sub || item.email || '',
            item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
          const blob = new Blob([`${headers.join(',')}\n${rows.join('\n')}`], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `talentnest_${drillDown.type}_export.csv`; a.click();
        };

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
            <div onClick={() => { setDrillDown(null); setDrillDownSearch(''); }} style={{ position: 'absolute', inset: 0, background: 'rgba(5, 13, 26, 0.4)', backdropFilter: 'blur(10px)' }} />
            <div style={{ width: '100%', maxWidth: 840, background: '#fff', borderRadius: 28, position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)', boxShadow: '0 32px 64px rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0176D3', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Deep Dive Inspection</div>
                  <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>{drillDown.title}</h3>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={downloadCSV} style={{ padding: '8px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>⬇ Export CSV</button>
                  <button onClick={() => { setDrillDown(null); setDrillDownSearch(''); }} style={{ width: 40, height: 40, border: 'none', background: '#F8FAFC', borderRadius: 12, cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
              </div>
              <div style={{ padding: '16px 32px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                <input placeholder={`Search in ${drillDown.title}...`} value={drillDownSearch} onChange={e => setDrillDownSearch(e.target.value)} style={{ width: '100%', padding: '12px 20px', borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px 32px' }}>
                {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No records found.</div>}
                {filtered.map(item => {
                  const itemId = item.id || item._id;
                  return (
                    <div key={itemId} style={{ padding: '16px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0A1628', fontSize: 14 }}>{item.name || item.title || 'Record'}</div>
                        <div style={{ color: '#706E6B', fontSize: 12, marginTop: 2 }}>{item.sub || item.email || (item.createdAt ? `Added ${new Date(item.createdAt).toLocaleDateString()}` : '')}</div>
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
                            const userToEdit = allCandidates.find(c => String(c.id || c._id) === String(id)) || item;
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

      {/* ── NPS Dashboard ── */}
      {npsData && (
        <div style={{ ...glassPanel, marginTop: 24 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 20 }}>🌟 Candidate NPS — Experience Scores</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Avg Score This Month', value: npsData.avgScoreMonth ? `${npsData.avgScoreMonth}/10` : '—', color: '#0176D3' },
              { label: 'Avg Score (Hired)',    value: npsData.avgScoreHired    ? `${npsData.avgScoreHired}/10`    : '—', color: '#10b981' },
              { label: 'Avg Score (Rejected)', value: npsData.avgScoreRejected ? `${npsData.avgScoreRejected}/10` : '—', color: '#ef4444' },
              { label: 'Total Responses',      value: npsData.totalResponses ?? 0, color: '#7c3aed' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 14, padding: '16px 20px' }}>
                <div style={{ color, fontSize: 24, fontWeight: 900 }}>{value}</div>
                <div style={{ color: '#706E6B', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          {npsData.recentFeedback?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3E3E3C', marginBottom: 10 }}>Recent Feedback</div>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {npsData.recentFeedback.map((fb, i) => (
                  <div key={i} style={{ padding: '10px 14px', background: '#FAFAF9', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: fb.applicationOutcome === 'hired' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                        {fb.applicationOutcome === 'hired' ? '✅ Hired' : '❌ Rejected'} · Score: {fb.score}/10
                      </span>
                      <span style={{ fontSize: 10, color: '#9E9D9B' }}>{new Date(fb.respondedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div style={{ color: '#3E3E3C', fontSize: 12, lineHeight: 1.5 }}>{fb.feedbackText}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
