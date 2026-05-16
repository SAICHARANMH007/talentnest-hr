import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api, downloadBlob } from '../../api/api.js';
import { req } from '../../api/client.js';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import AreaChart from '../../components/charts/AreaChart.jsx';
import VertBarChart from '../../components/charts/VertBarChart.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import WorldMap from '../../components/charts/WorldMap.jsx';
import TrendCard from '../../components/shared/TrendCard.jsx';
import ActivityDot from '../../components/misc/ActivityDot.jsx';
import TimeAgo from '../../components/misc/TimeAgo.jsx';
import UserDetailDrawer from '../../components/shared/UserDetailDrawer.jsx';
import ErrorReportBoundary from '../../components/shared/ErrorReportBoundary.jsx';
import { STAGES as MASTER_STAGES, SM, DB_TO_FRONTEND_STAGE, FRONTEND_TO_DB_STAGE } from '../../constants/stages.js';
import { card, btnP, btnG } from '../../constants/styles.js';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Design Tokens ────────────────────────────────────────────────────────────
const glassPanel = {
  background    : '#FFFFFF',
  border        : '1px solid #E2E8F0',
  borderRadius  : 24,
  padding       : 32,
  boxShadow     : '0 4px 24px rgba(0, 0, 0, 0.06)',
  transition    : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  minHeight     : 180, 
};

const skeletonStyles = `
@keyframes tn-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.tn-skeleton {
  background: linear-gradient(90deg, #f8f9fa 25%, #eef0f2 50%, #f8f9fa 75%);
  background-size: 200% 100%;
  animation: tn-shimmer 2s infinite linear;
}
.analytics-chart-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}
.analytics-chart-row-rev {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;
  margin-bottom: 24px;
}
@media (max-width: 900px) {
  .analytics-chart-row, .analytics-chart-row-rev {
    grid-template-columns: 1fr;
  }
}
`;

function KPICard({ label, value, icon, color, sub, onClick, loading }) {
  if (loading) return <div className="tn-skeleton" style={{ ...glassPanel, minHeight: 110, borderRadius: 24 }} />;
  return (
    <div 
      onClick={onClick}
      style={{ 
        ...glassPanel, 
        minHeight: 'auto', 
        padding: '24px', 
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', fontWeight: 900, color: '#0A1628', lineHeight: 1.2 }}>{value}</div>
        </div>
        <div style={{ fontSize: 24, background: `${color}15`, width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      </div>
      {sub && <div style={{ fontSize: 11, color: color, fontWeight: 700, marginTop: 12, opacity: 0.9 }}>{sub}</div>}
    </div>
  );
}

// Placeholder shown inside chart panels when data is loading or unavailable
function ChartPlaceholder({ loading = false, label = 'Chart', height = 160 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height, gap: 10, color: '#CBD5E1' }}>
      {loading
        ? <><div className="tn-skeleton" style={{ width: 180, height: 12, borderRadius: 6, marginBottom: 6 }} /><div className="tn-skeleton" style={{ width: 120, height: 10, borderRadius: 6 }} /></>
        : <><span style={{ fontSize: 32 }}>📊</span><span style={{ fontSize: 13, fontWeight: 600 }}>No data available yet</span></>
      }
    </div>
  );
}

const sectionTitle = {
  fontSize  : 18,
  fontWeight: 800,
  color     : '#0A1628',
  margin    : '0 0 20px',
};

const STAGES      = MASTER_STAGES.map(s => s.id);
const STAGE_LABELS = Object.fromEntries(MASTER_STAGES.map(s => [s.id, s.label]));
const STAGE_COLORS = MASTER_STAGES.map(s => s.color);

// DB_TO_FRONTEND_STAGE and FRONTEND_TO_DB_STAGE imported from constants/stages.js

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
    <div style={{ ...glassPanel, minHeight: 220 }}>
      <div className="tn-skeleton" style={{ height: 12, width: '40%', borderRadius: 6, marginBottom: 24 }} />
      {[1, 2, 3].map(i => (
        <div key={i} className="tn-skeleton" style={{ height: 16, width: '100%', borderRadius: 8, marginBottom: 14, opacity: 1 - i * 0.2 }} />
      ))}
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
  const [recentApps,   setRecentApps]    = useState([]); // fast 20-record feed for Platform Pulse
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [mergeReview, setMergeReview] = useState(null); // { groups: { primary, dupes, candCount }[] }
  const [merging, setMerging] = useState(false);
  const [mergeSummary, setMergeSummary] = useState(null); // { totalMoved, details: { title, count }[] }
  const [jobCounts, setJobCounts] = useState({ active: 0, total: 0 });
  const [localAppStats, setLocalAppStats] = useState({ total: 0, pipeline: {} });
  const [loading,       setLoading]       = useState(true);
  const [platformWide,  setPlatformWide]  = useState(isSuperAdmin); // super_admin defaults to all-orgs view
  const [period,        setPeriod]        = useState(1); // default 30 days
  const [drillDown,     setDrillDown]     = useState(null);
  const [drillDownSearch, setDrillDownSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast,         setToast]         = useState('');
  const [error,         setError]         = useState(null);
  const [drawerUser,    setDrawerUser]    = useState(null);
  const [selectedItems, setSelectedItems] = useState([]); // For bulk actions

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

    // Phase 1: FAST STATS — unblocks KPI cards + Platform Pulse immediately
    Promise.all([
      api.getDashboardStats(platformWide).catch(() => null),
      api.getRecruiterLeaderboard().catch(() => []),
    ]).then(([s, l]) => {
      const statsObj = s?.data || s || {};
      setServerStats(statsObj);
      setLeaderboard(Array.isArray(l) ? l : (l?.data || []));
      
      if (statsObj.recent) {
        setRecentApps(statsObj.recent);
      } else {
        // Fallback: load only the last 100 for the activity feed — never dump all records
        api.getApplications({ limit: 100, platform: platformWide }).then(unwrap).then(setRecentApps).catch(() => []);
      }
      
      setLoading(false);

      // Phase 2: Progressively load heavier data
      setTimeout(() => {
        api.getTrends().then(r => setTrendData(r?.data || [])).catch(() => setTrendData([]));
        api.getAnalytics({ startDate: start, endDate: end, platform: platformWide }).then(r => setAnalyticsData(r?.data || null)).catch(() => setAnalyticsData(null));
      }, 50);

      setTimeout(() => {
        // High-Capacity Job Scan (Rely on aggregated stats where possible)
        // Use server-computed job counts from stats — no raw record dump needed for KPIs
        setJobCounts({
          active: statsObj.openJobs  ?? 0,
          total:  statsObj.totalJobs ?? 0,
        });
        // Load all jobs for chart/table detail (no cap — admins see everything)
        api.getJobs({ limit: 10000000, platform: platformWide }).then(unwrap).then(list => {
          setAllJobs(list);
        }).catch(() => setAllJobs([]));
        
        // Use backend pipeline aggregation (Production Standard)
        if (statsObj.pipeline) {
          const pipe = {};
          MASTER_STAGES.forEach(s => {
            // DB stores title-case stage names like 'Interview Round 1', 'Offer', etc.
            // Use FRONTEND_TO_DB_STAGE for correct key lookup, fall back to label then id
            const dbKey = FRONTEND_TO_DB_STAGE[s.id] || s.label;
            pipe[s.id] = statsObj.pipeline[dbKey] || statsObj.pipeline[s.label] || statsObj.pipeline[s.id] || 0;
          });
          const pipeSum = Object.values(pipe).reduce((a, b) => a + b, 0);
          setLocalAppStats({ total: pipeSum, pipeline: pipe, last30: statsObj.appsLast30 || 0 });
        } else {
          // Fallback: build pipeline from stats counts — no record dump
          const pipe = {};
          MASTER_STAGES.forEach(st => { pipe[st.id] = 0; });
          setLocalAppStats({ total: statsObj.applications || 0, pipeline: pipe, last30: statsObj.appsLast30 || 0 });
        }
      }, 150);

      setTimeout(() => {
        // Removed aggressive 10M pre-fetches here to restore fast page loads.
        // The drill-downs still use 10M limits on-demand, so full data visibility is preserved.
        // api.getUsers({ role: 'candidate', limit: 10000000, platform: platformWide }).then(unwrap).then(setAllCandidates).catch(() => setAllCandidates([]));
        // api.getApplicants({ limit: 10000000, platform: platformWide }).then(r => setApplicantRows(Array.isArray(r?.data) ? r.data : [])).catch(() => setApplicantRows([]));
      }, 300);

      setError(null);
    }).catch(e => {
      setError(e.message || 'Failed to sync platform analytics');
      setLoading(false);
    });
  }, [period, platformWide]);

  useEffect(() => { load(); }, [load]);

  // ── Advanced section fetchers (rebuild when dates change) ─────────────────
  const dateParams = useMemo(
    () => ({ startDate: appliedStart, endDate: appliedEnd }),
    [appliedStart, appliedEnd],
  );

  const funnelSection     = useSection(useCallback(() => api.getFunnel({ ...dateParams, platform: platformWide }), [dateParams, platformWide]));
  const sourceSection     = useSection(useCallback(() => api.getSourceBreakdown({ ...dateParams, platform: platformWide }), [dateParams, platformWide]));
  const tthSection        = useSection(useCallback(() => api.getTimeToHire({ ...dateParams, platform: platformWide }), [dateParams, platformWide]));
  const recPerfSection    = useSection(useCallback(() => api.getRecruiterPerformance({ ...dateParams, platform: platformWide }), [dateParams, platformWide]));
  const dropoutSection    = useSection(useCallback(() => api.getDropoutAnalysis({ ...dateParams, platform: platformWide }), [dateParams, platformWide]));

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

  const handleBulkUpdate = async (type, ids, updates) => {
    try {
      if (type === 'job') {
        await Promise.all(ids.map(id => api.patchJob(id, updates)));
      } else if (type === 'app' && updates.stage) {
        await Promise.all(ids.map(id => api.updateStage(id, updates.stage)));
      }
      setDrillDown(p => p ? { ...p, items: p.items.map(i => ids.includes(String(i.id || i._id)) ? { ...i, ...updates } : i) } : p);
      setSelectedItems([]);
      setToast(`✅ ${ids.length} records updated successfully`);
      setConfirmAction(null);
    } catch (e) {
      setToast('❌ ERROR: ' + (e.message || 'Bulk action failed'));
      setConfirmAction(null);
    }
  };

  const triggerBulkUpdate = (type, ids, updates, message) => {
    setConfirmAction({
      message,
      onConfirm: () => handleBulkUpdate(type, ids, updates),
      onCancel : () => setConfirmAction(null),
    });
  };

  const findDuplicates = () => {
    const items = allJobs;
    if (items.length === 0) return;
    
    const groups = {};
    items.forEach(j => {
      const title = (j.title || j.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const company = (j.company || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      const key = `${title}|${company}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(j);
    });

    const groupList = Object.values(groups).filter(g => g.length > 1).map(g => {
      const sorted = [...g].sort((a,b) => (b.applicantsCount||0) - (a.applicantsCount||0));
      return {
        primary: sorted[0],
        duplicates: sorted.slice(1)
      };
    });

    if (groupList.length === 0) {
      setToast('✅ No duplicates found');
      return;
    }
    setMergeReview(groupList);
  };

  const executeMerge = async () => {
    if (!mergeReview) return;
    setMerging(true);
    setToast('🧹 Starting migration...');
    let totalMerged = 0;
    let totalMoved = 0;
    const details = [];
    
    try {
      for (const group of mergeReview) {
        const primary = group.primary;
        const primaryId = String(primary.id);
        let groupMoved = 0;
        
        for (const dupe of group.duplicates) {
          const dupeId = String(dupe.id);
          const res = await api.getApplications({ jobId: dupeId, limit: 10000000 }).catch(() => []);
          const apps = Array.isArray(res) ? res : (res?.data || []);
          const candIds = apps.map(a => String(a.candidateId || a.candidate?._id)).filter(id => id && id !== 'undefined');
          
          if (candIds.length > 0) {
            await api.assignCandidatesToJob(primaryId, candIds);
            groupMoved += candIds.length;
          }
          await api.patchJob(dupeId, { status: 'closed' });
          totalMerged++;
        }
        if (groupMoved > 0) {
          details.push({ title: primary.title, count: groupMoved });
        }
        totalMoved += groupMoved;
      }
      setMergeSummary({ totalMoved, totalMerged, details });
      setMergeReview(null);
      load();
    } catch (e) {
      setToast(`❌ Error: ${e.message}`);
    }
    setMerging(false);
  };

  // ── Derived Stats ─────────────────────────────────────────────────────────
  const filteredApps = useMemo(() => {
    const days = PERIODS[period].days;
    if (!days) return allApps;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return allApps.filter(a => new Date(a.createdAt) >= cutoff);
  }, [allApps, period]);

  const stats = useMemo(() => {
    // Priority 1: Use Backend Aggregates (Most Reliable for High Volume)
    // serverStats.openJobs comes from a real DB countDocuments — no cap.
    // Never use the frontend job list length, which is limited to 1000.
    const hiredCount  = serverStats?.placements ?? localAppStats.pipeline.selected ?? 0;
    const totalApps   = serverStats?.applications ?? localAppStats.total ?? 0;
    const candCount   = serverStats?.candidates ?? allCandidates.length ?? 0;
    // Always prefer server aggregate for open jobs count (no limit)
    const activeJobs  = serverStats?.openJobs || jobCounts.active || 0;
    const totalJobs   = serverStats?.totalJobs || jobCounts.total || 0;
    const last30Hired = serverStats?.placementsLast30 ?? 0;

    if (serverStats) {
      return {
        ...serverStats,
        totalCandidates: candCount,
        activeJobs:      activeJobs,   // show clean count, no "X / Y" fraction
        totalApps:       totalApps,
        appsLast30:      serverStats.appsLast30 || localAppStats.last30 || 0,
        placements:      hiredCount,
        placementsLast30: last30Hired,
        revenue:         serverStats?.revenue || 0,
        fillRate:        totalJobs > 0 ? Math.round((hiredCount / totalJobs) * 100) : (serverStats.fillRate || 0),
        avgTimeToHire:   serverStats.avgTimeToHire || 0,
      };
    }
    // Fallback if API fails
    return {
      totalCandidates: candCount,
      activeJobs:      activeJobs,
      totalApps:       totalApps,
      placements:      hiredCount,
      revenue:         0,
      fillRate:        totalJobs > 0 ? Math.round((hiredCount / totalJobs) * 100) : 0,
      avgTimeToHire:   null,
    };
  }, [serverStats, allCandidates, jobCounts, localAppStats]);
  
  const stageBreakdown = useMemo(() => {
    // 1. Priority: Backend Aggregates — only when byStage has actual data.
    // IMPORTANT: check .length > 0, not just truthiness — [] is truthy but empty.
    if (analyticsData?.byStage?.length > 0) {
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
    // 2. Fallback: all-time local stats from the non-date-filtered getApplications call
    if (localAppStats.pipeline && Object.keys(localAppStats.pipeline).length > 0) {
      return STAGES.map((s, i) => ({
        label: STAGE_LABELS[s] || s,
        value: localAppStats.pipeline[s] || 0,
        color: STAGE_COLORS[i],
        stageKey: s,
      }));
    }
    return STAGES.map((s, i) => ({ label: STAGE_LABELS[s], value: 0, color: STAGE_COLORS[i], stageKey: s }));
  }, [localAppStats, analyticsData]);

  const sourceBreakdown = useMemo(() => {
    if (!analyticsData?.bySource) return [];
    // Consolidate any duplicate sources (safety fallback)
    const map = {};
    analyticsData.bySource.forEach(r => {
      const src = (r.source || 'direct').toLowerCase();
      map[src] = (map[src] || 0) + r.count;
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, e) => s + e[1], 0);
    return entries.map(([source, count], i) => ({
      label: source,
      value: count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: SOURCE_COLORS[source] || STAGE_COLORS[i % STAGE_COLORS.length],
    }));
  }, [analyticsData]);
  
  // ── Name & User Resolver ──────────────────────────────────────────────────
  const getCandidateData = useCallback((app) => {
    if (!app) return { name: 'Unknown', user: null };

    // 1. Try populated candidateId or candidate (from .populate())
    const u = (app.candidateId && typeof app.candidateId === 'object') ? app.candidateId
            : (app.candidate   && typeof app.candidate   === 'object') ? app.candidate
            : null;
    if (u && (u.name || u.email)) {
      return { name: u.name || u.email.split('@')[0], user: { ...u, id: String(u.id || u._id) } };
    }

    // 2. Top-level candidateName (set by normalizeApp / applicants endpoint)
    if (app.candidateName && app.candidateName !== 'candidate') return { name: app.candidateName, user: null };

    // 3. Search in allCandidates / allApps cache by ID
    const cid = extractId(app.candidateId || app.candidate);
    if (cid) {
      const found = allCandidates.find(c => String(c.id || c._id) === cid)
                 || allApps?.find?.(a => {
                      const ac = a.candidateId && typeof a.candidateId === 'object' ? a.candidateId : null;
                      return ac && String(ac.id || ac._id) === cid;
                    });
      if (found) {
        const nm = found.name || (found.candidateId && typeof found.candidateId === 'object' ? found.candidateId.name : null) || found.email;
        if (nm) return { name: nm, user: { ...found, id: String(found.id || found._id) } };
      }
    }

    // 4. Fallback: email prefix or "Candidate"
    const email = app.candidateEmail || app.email || u?.email;
    if (email) return { name: email.split('@')[0], user: null };
    
    return { name: app.name || 'Candidate', user: null };
  }, [allCandidates, allApps]);

  const topJobs = useMemo(() => {
    // Primary: analytics endpoint (date-filtered)
    if (analyticsData?.topJobs?.length > 0) {
      return analyticsData.topJobs.map(j => ({
        label: j.title,
        value: j.applications,
        color: '#0176D3',
        id: j.jobId,
      }));
    }
    // Fallback: compute from allJobs (Phase 3 data — all-time, no date filter)
    if (allJobs?.length > 0) {
      return [...allJobs]
        .sort((a, b) => (b.applicationCount || b.applicantsCount || 0) - (a.applicationCount || a.applicantsCount || 0))
        .slice(0, 5)
        .filter(j => (j.applicationCount || j.applicantsCount || 0) > 0)
        .map(j => ({
          label: j.title || j.companyName || 'Untitled Job',
          value: j.applicationCount || j.applicantsCount || 0,
          color: '#0176D3',
          id: j._id || j.id,
        }));
    }
    return [];
  }, [analyticsData, allJobs]);

  const trends = useMemo(() => trendData, [trendData]);

  const recentActivity = useMemo(() => {
    // Prefer recentApps (20 records, loaded in Phase 1 for instant display).
    // Fall back to allApps (2000 records, Phase 3) once it loads for completeness.
    const source = recentApps.length > 0 ? recentApps : allApps;
    const seen = new Set();
    const out = [];
    for (const a of [...source].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
      const jobKey  = extractId(a.jobId);
      const candKey = extractId(a.candidateId || a.candidate);
      const stageKey = a.stage || a.currentStage || '';
      const key = `${candKey}|${jobKey}|${stageKey}`;
      if (!seen.has(key)) { seen.add(key); out.push(a); }
      if (out.length >= 30) break; // Increased from 15 to 30 for better visibility
    }
    return out;
  }, [recentApps, allApps]);

  // ── Drill-down helpers ────────────────────────────────────────────────────
  // Shared: sets loading title, fetches, then populates drawer
  const fetchDrill = useCallback(async (loadingTitle, type, fetcher) => {
    setSelectedItems([]); // Reset selection
    setDrillDown({ title: `${loadingTitle} — Loading…`, type, items: [] });
    try {
      const items = await fetcher();
      setDrillDown({ title: loadingTitle, type, items });
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
      const raw = await api.getCandidateRecords({ limit: 10000000 }).catch(() => ({ data: [] }));
      const list = Array.isArray(raw?.data) ? raw.data : [];
      return list.map(c => ({
        ...c,
        id: c.applicationId || c.candidateId || c.userId || `${c.email}-${c.jobTitle}`,
        name: c.candidateName || c.email || 'Candidate',
        email: c.email || '',
        sub: `${c.email || 'No email'}${c.phone ? ` · ${c.phone}` : ''} · ${c.organisation || 'TalentNest HR'}`,
      }));
    });
  };

  const openActiveJobsDrill = () => fetchDrill('Active Postings', 'job', async () => {
    const raw = await api.getJobs({ status: 'active', limit: 10000000 }).then(unwrap).catch(() => []);
    return raw.map(j => ({ ...j, id: j.id || j._id, name: j.title, sub: `${j.companyName || 'Internal'} · ${j.location || ''}`, status: j.status }));
  });

  const openAppsDrill = () => fetchDrill('All Applications', 'app', async () => {
    const raw = await api.getApplicants({ limit: 10000000 }).catch(() => ({ data: [] }));
    const list = raw?.data || [];
    return list.map(c => ({
      ...c,
      id: c.id || c._id,
      name: c.name || c._displayName || c.candidateName || c.email || 'Candidate',
      sub: `${c.jobTitle || c.title || 'Unknown Job'} · ${c.stage || c.currentStage || 'Applied'} · ${c.email || 'No email'}${c.phone ? ` · ${c.phone}` : ''}`,
      stage: DB_TO_FRONTEND_STAGE[c.stage] || c.stage,
      currentStage: c.stage,
    }));
  });

  const openVelocityDrill = (point = null) => fetchDrill(point?.date ? `Applications on ${point.label}` : 'Application Velocity — Last 14 Days', 'app', async () => {
    const params = point?.date
      ? { startDate: point.date, endDate: point.date, limit: 10000000 }
      : { startDate: new Date(Date.now() - 13 * 86400000).toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], limit: 10000000 };
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

  const openPlacementsDrill = () => fetchDrill('Total Placements (Last 30 Days)', 'app', async () => {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const raw = await api.getApplications({ stage: 'Hired', startDate: thirtyDaysAgo.toISOString().split('T')[0], limit: 10000000, platform: platformWide }).then(unwrap).catch(() => []);
    return raw.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || a.job?.title || 'Unknown Job'} · Hired on ${fmtDate(a.updatedAt || a.createdAt)}` }));
  });

  const openStageDrill = (seg) => {
    if (!seg.stageKey || seg.value === 0) return;
    const dbStage = FRONTEND_TO_DB_STAGE[seg.stageKey] || seg.stageKey;
    fetchDrill(STAGE_LABELS[seg.stageKey] || seg.stageKey, 'app', async () => {
      const raw = await api.getApplications({ stage: dbStage, limit: 10000000 }).then(unwrap).catch(() => []);
      return raw.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${a.jobId?.title || 'Unknown Job'} · ${STAGE_LABELS[seg.stageKey]}` }));
    });
  };

  const openJobBarDrill = (bar) => {
    if (!bar.id) return;
    fetchDrill(bar.label, 'app', async () => {
      const raw = await api.getApplications({ jobId: bar.id, limit: 10000000 }).then(unwrap).catch(() => []);
      return raw.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${STAGE_LABELS[a.stage || a.currentStage] || a.currentStage || a.stage}` }));
    });
  };

  // ── Candidate Source drill-down ───────────────────────────────────────────
  const openSourceDrill = (seg) => {
    if (!seg?.label || seg.value === 0) return;
    const sourceLabel = seg.label;
    fetchDrill(`Source: ${sourceLabel} (${seg.value} applications)`, 'app', async () => {
      // Fetch applicants and filter by source client-side (backend /applicants supports source via search)
      const raw = await api.getApplicants({ limit: 10000000, platform: platformWide }).catch(() => ({ data: [] }));
      const rows = Array.isArray(raw?.data) ? raw.data : [];
      return rows
        .filter(r => (r.source || 'platform').toLowerCase() === sourceLabel.toLowerCase())
        .map(r => ({
          ...r,
          id: r.applicationId || r.id,
          name: r.candidateName || r.email || 'Candidate',
          sub: `${r.jobTitle || 'Unknown Job'} · ${r.stage || 'Applied'} · ${r.email || ''}${r.phone ? ` · ${r.phone}` : ''}`,
        }));
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

  if (error) return (
    <div style={{ padding: 60, textAlign: 'center', background:'#fff', borderRadius:24, border:'1px solid #fee2e2', margin:20 }}>
      <div style={{ fontSize:40, marginBottom:16 }}>📡</div>
      <h2 style={{ margin:'0 0 8px', color:'#991b1b' }}>Platform Sync Interrupted</h2>
      <p style={{ color:'#b91c1c', fontSize:14, marginBottom:24, maxWidth:400, marginInline:'auto' }}>{error}</p>
      <button onClick={() => window.location.reload()} style={{ ...btnP, padding:'12px 32px' }}>↻ Reconnect to Dashboard</button>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <ErrorReportBoundary componentName="AdminAnalytics">
      <div style={{ maxWidth: '100%', paddingBottom: 80 }}>
        <style>{skeletonStyles}</style>
        <Toast msg={toast} onClose={() => setToast('')} />

      {/* ── Merge Review Modal ── */}
      {mergeReview && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.72)', backdropFilter:'blur(8px)', zIndex:11000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:600, maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,0.25)' }}>
            <div style={{ padding:'24px 32px', background:'linear-gradient(135deg,#032D60,#0176D3)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ margin:0, color:'#fff', fontSize:20, fontWeight:800 }}>🪄 Review Job Migration</h2>
                <p style={{ margin:'4px 0 0', color:'rgba(255,255,255,0.7)', fontSize:13 }}>Merging {mergeReview.length} groups of duplicate jobs</p>
              </div>
              <button onClick={() => setMergeReview(null)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:32, height:32, borderRadius:8, cursor:'pointer' }}>✕</button>
            </div>
            
            <div style={{ flex:1, overflowY:'auto', padding:32 }}>
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:12, padding:'16px 20px', marginBottom:24, display:'flex', gap:12 }}>
                <div style={{ fontSize:20 }}>🛡️</div>
                <div style={{ color:'#991B1B', fontSize:13, lineHeight:1.5 }}>
                  <strong>Safety Protocol Active:</strong> Candidates from duplicate jobs will be linked to the primary job <strong>before</strong> the duplicates are closed. No data will be lost.
                </div>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {mergeReview.map((group, i) => (
                  <div key={i} style={{ border:'1px solid #E2E8F0', borderRadius:16, overflow:'hidden' }}>
                    <div style={{ background:'#F8FAFF', padding:'12px 20px', borderBottom:'1px solid #E2E8F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:800, color:'#032D60' }}>GROUP {i+1}</span>
                      <span style={{ fontSize:11, color:'#0176D3', background:'rgba(1,118,211,0.1)', padding:'2px 8px', borderRadius:20 }}>{group.duplicates.length + 1} Identical Postings</span>
                    </div>
                    <div style={{ padding:20 }}>
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#706E6B', letterSpacing:1, marginBottom:6 }}>KEEPING AS PRIMARY</div>
                        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                          <div style={{ background:'#2E844A', color:'#fff', padding:'4px 10px', borderRadius:8, fontSize:11, fontWeight:800 }}>PRIMARY</div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:14 }}>{group.primary.title}</div>
                            <div style={{ fontSize:12, color:'#706E6B' }}>{group.primary.company} · {group.primary.applicantsCount || 0} existing apps</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:10, fontWeight:700, color:'#706E6B', letterSpacing:1, marginBottom:6 }}>CONSOLIDATING (TO BE CLOSED)</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                          {group.duplicates.map(d => (
                            <div key={d.id} style={{ display:'flex', alignItems:'center', gap:12, opacity:0.8 }}>
                              <div style={{ background:'#BA0517', color:'#fff', padding:'4px 10px', borderRadius:8, fontSize:11, fontWeight:800 }}>CLOSE</div>
                              <div style={{ fontSize:13 }}>{d.title} <span style={{ color:'#706E6B' }}>({d.applicantsCount || 0} to migrate)</span></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding:24, borderTop:'1px solid #E2E8F0', display:'flex', gap:12 }}>
              <button onClick={executeMerge} disabled={merging} style={{ ...btnP, flex:1, height:48, fontSize:15, justifyContent:'center' }}>
                {merging ? '⚙️ Migrating Candidates...' : '✓ Confirm & Merge All'}
              </button>
              <button onClick={() => setMergeReview(null)} style={{ ...btnG, flex:1, height:48, fontSize:15, justifyContent:'center' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {mergeSummary && (
        <div style={{ position:'fixed', inset:0, background:'rgba(5,13,26,0.72)', backdropFilter:'blur(8px)', zIndex:11000, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:480, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 32px 64px rgba(0,0,0,0.25)' }}>
            <div style={{ padding:'24px 32px', background:'#2E844A', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ margin:0, color:'#fff', fontSize:20, fontWeight:800 }}>🎉 Migration Complete</h2>
              <button onClick={() => setMergeSummary(null)} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:32, height:32, borderRadius:8, cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ padding:32 }}>
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#181818' }}>{mergeSummary.totalMoved} Candidates Moved</div>
                <div style={{ color:'#706E6B', fontSize:14, marginTop:4 }}>{mergeSummary.totalMerged} duplicate jobs closed successfully</div>
              </div>
              
              <div style={{ background:'#F8FAFF', borderRadius:16, padding:20, border:'1px solid #E2E8F0' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#032D60', letterSpacing:1, marginBottom:12, textTransform:'uppercase' }}>Migration Details</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {mergeSummary.details.map((d, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                      <span style={{ fontWeight:600, color:'#181818' }}>{d.title}</span>
                      <span style={{ color:'#2E844A', fontWeight:700 }}>+{d.count} candidates</span>
                    </div>
                  ))}
                  {mergeSummary.details.length === 0 && <div style={{ color:'#706E6B', fontSize:12 }}>No candidates were found in duplicates.</div>}
                </div>
              </div>
              
              <button onClick={() => setMergeSummary(null)} style={{ ...btnP, width:'100%', height:48, marginTop:24, justifyContent:'center', fontSize:15 }}>Great, thanks!</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: '#0A1628', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Analytics Command Center</h1>
          <p style={{ color: '#706E6B', fontSize: 14, margin: 0 }}>Unified Intelligence Platform · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {onNavigate && (
            <button
              onClick={() => onNavigate('candidate-requests')}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <KPICard loading={loading} label="Total Candidates" value={analyticsData?.total ?? stats.totalCandidates} icon="👤" color="#0176D3" onClick={openCandidatesDrill} />
        <KPICard loading={loading} label="PLATFORM REVENUE" value={`₹${(stats.revenue || 0).toLocaleString('en-IN')}`} icon="💰" color="#10B981" />
        <KPICard loading={loading} label="OPEN POSITIONS" value={stats.activeJobs} icon="💼" color="#F59E0B" onClick={openActiveJobsDrill} />
        <KPICard loading={loading} label="Total Applications" value={stats.totalApps} icon="📨" color="#7c3aed"
          sub={stats.appsLast30 ? `${stats.appsLast30} in last 30 days` : undefined}
          onClick={openAppsDrill} />
        <KPICard loading={loading} label="Total Placements" value={stats.placements} icon="🎉" color="#10b981"
          sub={stats.placementsLast30 ? `${stats.placementsLast30} hired last 30 days` : undefined}
          onClick={openPlacementsDrill} />
        <KPICard loading={loading} label="Fill Rate" value={`${stats.fillRate}%`} icon="📈" color="#032D60"
          sub="hires ÷ total job positions" />
      </div>

      {/* ── Charts Row ── */}
      <div className="analytics-chart-row">
        <div style={{ ...glassPanel }} title="Click a date to view candidate records behind that point">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Application Velocity</div>
            {trends.length > 0 && (() => {
              const todayVal = trends[trends.length - 1]?.value ?? 0;
              const yestVal  = trends[trends.length - 2]?.value ?? 0;
              return (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0176D3', lineHeight: 1 }}>{todayVal}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>
                    today{yestVal > 0 ? ` · ${yestVal} yesterday` : ''}
                  </div>
                </div>
              );
            })()}
          </div>
          <div style={{ color: '#9E9D9B', fontSize: 10, marginBottom: 8 }}>Candidates joining the pipeline across all jobs (Last 14 days)</div>
          {trends.length > 0
            ? <AreaChart data={trends} color="#0176D3" height={220} onItemClick={openVelocityDrill} />
            : <ChartPlaceholder loading={loading} label="Application Velocity" height={220} />
          }
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <p style={{ color: '#94A3B8', fontSize: 11, margin: 0 }}>Click any date on the chart to drill into actual applicant records.</p>
            {onNavigate && <button onClick={() => onNavigate('applicants')} style={{ ...btnG, padding: '6px 12px', fontSize: 11 }}>Open Applicants</button>}
          </div>
        </div>
        <div style={{ ...glassPanel, cursor: 'pointer' }}>
          {loading
            ? <ChartPlaceholder loading label="Hiring Pipeline" height={180} />
            : <>
                <DonutChart segments={stageBreakdown} size={160} title="Hiring Pipeline"
                  centerValue={stageBreakdown.reduce((s, x) => s + (x.value || 0), 0) || stats.totalApps} centerLabel="TOTAL" onItemClick={openStageDrill} />
                <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, margin: '8px 0 0' }}>Click segment to drill down</p>
              </>
          }
        </div>
      </div>

      <div className="analytics-chart-row-rev">
        <div style={glassPanel}>
          <div style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Top Performance Jobs</div>
          <div style={{ color: '#9E9D9B', fontSize: 10, marginBottom: 8 }}>Click a bar to see applicants</div>
          {topJobs.length > 0
            ? <VertBarChart data={topJobs} height={260} showValues onItemClick={openJobBarDrill} />
            : <ChartPlaceholder loading={loading} label="Top Performance Jobs" height={260} />
          }
        </div>

        {/* ── Leaderboard ── */}
        <div style={glassPanel}>
          <h3 style={sectionTitle}>Recruiter Leaderboard</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(leaderboard || []).map((r, i) => (
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
                    const rid = r.recruiterId ? String(r.recruiterId) : null;
                    if (!rid) { setDrillDown({ title: `${r.name}'s Pipeline`, type: 'app', items: [] }); return; }
                    setDrillDown({ title: `${r.name}'s Pipeline — Loading…`, type: 'app', items: [] });
                    try {
                      const raw = await api.getApplications({ recruiterId: rid, limit: 10000000 }).then(unwrap).catch(() => []);
                      const items = raw.map(a => {
                        const cand = getCandidateData(a);
                        const jobTitle = (typeof a.jobId === 'object' ? a.jobId?.title : null) || a.job?.title || 'Unknown Job';
                        const stage = STAGE_LABELS[a.stage] || STAGE_LABELS[a.currentStage] || a.currentStage || a.stage || 'Applied';
                        const email = cand.user?.email || a.candidateEmail || a.email || '';
                        const phone = cand.user?.phone || a.candidatePhone || a.phone || '';
                        // Use candidateName field directly when getCandidateData couldn't resolve
                        const displayName = (cand.name && cand.name !== 'Unknown')
                          ? cand.name
                          : (a.candidateName || email.split('@')[0] || 'Candidate');
                        return {
                          ...a,
                          id: a.id || a._id,
                          name: displayName,
                          sub: `${jobTitle} · ${stage}${email ? ` · ${email}` : ''}${phone ? ` · ${phone}` : ''}`,
                        };
                      });
                      setDrillDown({ title: `${r.name}'s Pipeline (${items.length} applications)`, type: 'app', items });
                    } catch {
                      setDrillDown({ title: `${r.name}'s Pipeline`, type: 'app', items: [] });
                    }
                  }}
                  style={{ padding: '6px 12px', borderRadius: 8, background: '#0176D3', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  ANALYZE
                </button>
              </div>
            ))}
            {leaderboard.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 13 }}>No recruiter data available yet.</div>}
          </div>
        </div>
      </div>

      {/* ── Application Location Map ── */}
      <div style={{ ...glassPanel, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0A1628' }}>🌍 Applications World Map</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>Where candidates are applying from — hover a dot to see candidate names</p>
          </div>
        </div>
        <WorldMap height={400} />
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
            const total = rows.reduce((s, r) => s + (r.count || 0), 0);
            const segments = rows.map(r => ({
              label: r.source || 'direct',
              value: r.count,
              color: SOURCE_COLORS[r.source] || '#94a3b8',
              stageKey: r.source || 'direct',
            }));
            return (
              <div>
                <DonutChart segments={segments} size={160} title="" centerValue={total} centerLabel="TOTAL" onItemClick={openSourceDrill} hideLegend={true} />
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {segments.map(s => (
                    <div key={s.label}
                      onClick={() => openSourceDrill(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', background: '#F8FAFC', border: '1px solid #E2E8F0', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
                      onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{s.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.value}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{total > 0 ? `${Math.round((s.value / total) * 100)}%` : '0%'}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 10 }}>Click a source to drill into its candidates</p>
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
            ['aiMatchScore', 'Talent Match Score'],
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
                  <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>
                    {drillDown.title} 
                    <span style={{ marginLeft: 12, fontSize: 16, color: '#64748B', fontWeight: 500 }}>
                      ({filtered.length} {filtered.length === drillDown.items.length ? 'total' : `of ${drillDown.items.length}`})
                    </span>
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {drillDown.type === 'job' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        onClick={findDuplicates}
                        style={{ ...btnG, background: '#032D60', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700 }}>
                        🪄 Merge & Keep One
                      </button>
                    </div>
                  )}
                  {selectedItems.length > 0 && (
                    <button 
                      onClick={() => triggerBulkUpdate(drillDown.type, selectedItems, drillDown.type === 'job' ? { status: 'closed' } : { stage: 'rejected' }, `Close/Reject ${selectedItems.length} selected records?`)}
                      style={{ ...btnG, background: '#BA0517', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700 }}>
                      🚫 Close All Selected ({selectedItems.length})
                    </button>
                  )}
                  <button onClick={downloadCSV} style={{ ...btnG, padding: '8px 16px', fontSize: 12, borderRadius: 10 }}>⬇ CSV</button>
                  <button onClick={() => { setDrillDown(null); setDrillDownSearch(''); setSelectedItems([]); }} style={{ width: 40, height: 40, border: 'none', background: '#F8FAFC', borderRadius: 12, cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
              </div>
              <div style={{ padding: '16px 32px', borderBottom: '1px solid #F1F5F9', background: '#F8FAFC', display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input placeholder={`Search in ${drillDown.title}...`} value={drillDownSearch} onChange={e => setDrillDownSearch(e.target.value)} style={{ width: '100%', padding: '12px 20px', borderRadius: 14, border: '1px solid #E2E8F0', fontSize: 14, outline: 'none' }} />
                </div>
                {drillDown.type === 'job' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                      onClick={() => {
                        const counts = {};
                        drillDown.items.forEach(j => {
                          const k = `${(j.name || j.title || '').toLowerCase().trim()}|${(j.sub || '').toLowerCase().trim()}`;
                          counts[k] = (counts[k] || 0) + 1;
                        });
                        const dupeKeys = Object.entries(counts).filter(([k,v]) => v > 1).map(([k]) => k);
                        if (dupeKeys.length > 0) {
                          setDrillDownSearch(dupeKeys[0].split('|')[0]);
                          setToast(`🔍 Found ${dupeKeys.length} groups of duplicates.`);
                        } else {
                          setToast('✅ No duplicates found.');
                        }
                      }}
                      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#706E6B' }}>
                      🔍 Find Duplicates
                    </button>
                    <button 
                      onClick={() => {
                        const allIds = filtered.map(item => String(item.id || item._id));
                        setSelectedItems(allIds);
                        setToast(`✅ Selected all ${allIds.length} visible records.`);
                      }}
                      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#0176D3' }}>
                      ☑️ Select All Visible
                    </button>
                  </div>
                )}
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
                  const isSel = selectedItems.includes(String(itemId));
                  return (
                    <React.Fragment key={itemId}>
                      <div style={{ padding: '16px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSel ? '#FFF1F2' : 'transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <input type="checkbox" checked={isSel} 
                            onChange={e => {
                              const sid = String(itemId);
                              setSelectedItems(p => e.target.checked ? [...p, sid] : p.filter(x => x !== sid));
                            }}
                            style={{ width: 18, height: 18, cursor: 'pointer' }} />
                          <div>
                            <div style={{ fontWeight: 700, color: '#0A1628', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                              {item.name || item.title || 'Record'}
                              {drillDown.type === 'job' && drillDown.items.filter(x => 
                                (x.name || x.title || '').toLowerCase().trim() === (item.name || item.title || '').toLowerCase().trim() &&
                                (x.sub || '').toLowerCase().trim() === (item.sub || '').toLowerCase().trim()
                              ).length > 1 && (
                                <span style={{ fontSize: 9, background: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 6, fontWeight: 900 }}>DUPLICATE</span>
                              )}
                            </div>
                            <div style={{ color: '#706E6B', fontSize: 12, marginTop: 2 }}>{item.sub || item.email || (item.createdAt ? `Added ${new Date(item.createdAt).toLocaleDateString()}` : '')}</div>
                          {(item.email || item.phone || item.organisation || item.source || item.currentCompany || item.skills) && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                              {item.email && <span style={{ background: '#EFF6FF', color: '#1d4ed8', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.email}</span>}
                                {(item.phone || item.candidatePhone) ? (
                                  <span style={{ background: '#F0FDF4', color: '#166534', fontSize: 11, padding: '3px 8px', borderRadius: 20, border: '1px solid rgba(22,101,52,0.2)', fontWeight: 600 }}>
                                    📞 {item.phone || item.candidatePhone}
                                  </span>
                                ) : null}
                              {item.organisation && <span style={{ background: '#F8FAFC', color: '#475569', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.organisation}</span>}
                              {item.source && <span style={{ background: '#FFF7ED', color: '#9A3412', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.source}</span>}
                              {item.currentCompany && <span style={{ background: '#F8FAFC', color: '#475569', fontSize: 11, padding: '3px 8px', borderRadius: 20 }}>{item.currentCompany}</span>}
                              {item.skills && <span style={{ background: '#F5F3FF', color: '#6D28D9', fontSize: 11, padding: '3px 8px', borderRadius: 20, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.skills}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {drillDown.type === 'app' && (
                            <select value={DB_TO_FRONTEND_STAGE[item.stage] || item.stage || DB_TO_FRONTEND_STAGE[item.currentStage] || item.currentStage || ''}
                              onChange={e => triggerUpdate('app', itemId, { stage: e.target.value }, `Move candidate to ${STAGE_LABELS[e.target.value]}?`)}
                              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                            </select>
                          )}
                          {drillDown.type === 'job' && (
                            <select value={item.status || ''}
                              onChange={e => triggerUpdate('job', itemId, { status: e.target.value }, `Change job status to ${e.target.value}?`)}
                              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              <option value="active">Active</option>
                              <option value="closed">Closed</option>
                              <option value="draft">Draft</option>
                            </select>
                          )}
                            {/* Only show Applicants button on job rows, not on candidate/app rows */}
                            {drillDown.type === 'job' && (
                            <button
                              onClick={() => {
                                fetchDrill(item.name || item.title || 'Applicants', 'app', async () => {
                                  const raw = await api.getApplications({ jobId: itemId, limit: 10000000 }).then(unwrap).catch(() => []);
                                  return raw.map(a => ({ ...a, id: a.id || a._id, name: getCandidateData(a).name, sub: `${STAGE_LABELS[a.stage || a.currentStage] || a.currentStage || a.stage}` }));
                                });
                              }}
                              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#7c3aed', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
                              onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}
                            >
                              👥 Applicants
                            </button>
                            )}
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
                    </React.Fragment>
                  );
                })}
                {filtered.length > drillPage * DRILL_PAGE_SIZE && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <button 
                      onClick={() => setDrillPage(p => p + 1)} 
                      style={{ ...btnP, padding: '10px 32px', borderRadius: 14 }}
                    >
                      Load More Records ({filtered.length - drillPage * DRILL_PAGE_SIZE} remaining)
                    </button>
                  </div>
                )}
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

      {drawerUser && <UserDetailDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
      </div>
    </ErrorReportBoundary>
  );
}
