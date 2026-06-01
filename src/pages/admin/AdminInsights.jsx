import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';

const panel = { ...card, padding: 24, marginBottom: 20 };
const LABEL = { fontSize: 10, fontWeight: 700, color: '#706E6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, margin: '0 0 16px' };

const PG = 10; // rows per page for all paginated sections

function SectionLoader() {
  return <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={28} /></div>;
}
function SectionEmpty({ msg }) {
  return <div style={{ textAlign: 'center', padding: 32, color: '#94A3B8', fontSize: 13 }}>{msg}</div>;
}
function SectionError({ onRetry }) {
  return (
    <div style={{ textAlign: 'center', padding: 32 }}>
      <div style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>Failed to load data.</div>
      <button onClick={onRetry} style={{ ...btnG, padding: '8px 18px', fontSize: 12 }}>↻ Retry</button>
    </div>
  );
}
function StatBox({ label, value, color = '#0176D3', sub }) {
  return (
    <div style={{ background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: 14, padding: '16px 18px', textAlign: 'center', flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 26, fontWeight: 900, color }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div style={{ fontSize: 11, color: '#706E6B', marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Pagination controls ───────────────────────────────────────────────────────
const pgBtnStyle = disabled => ({
  padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0',
  background: disabled ? '#F8FAFC' : '#fff',
  color: disabled ? '#CBD5E1' : '#374151',
  fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 700, lineHeight: 1,
});
function Paginator({ page, setPage, total, pageSize = PG }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 11, color: '#94A3B8' }}>
        Showing {start}–{end} of <strong style={{ color: '#374151' }}>{total.toLocaleString()}</strong>
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button onClick={() => setPage(1)}         disabled={page === 1}          style={pgBtnStyle(page === 1)}>«</button>
        <button onClick={() => setPage(p => p-1)}  disabled={page === 1}          style={pgBtnStyle(page === 1)}>‹</button>
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 700, padding: '0 8px', minWidth: 60, textAlign: 'center' }}>
          {page} / {totalPages}
        </span>
        <button onClick={() => setPage(p => p+1)}  disabled={page === totalPages} style={pgBtnStyle(page === totalPages)}>›</button>
        <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={pgBtnStyle(page === totalPages)}>»</button>
      </div>
    </div>
  );
}

const SOURCE_LABELS = {
  manual: 'Manual Add', resume_upload: 'Resume Upload', bulk_import: 'Bulk Import',
  invite_link: 'Invite Link', career_page: 'Career Page', referral: 'Referral',
  platform: 'Platform', direct: 'Direct', talent_match: 'Talent Match',
};
const SOURCE_COLORS = {
  manual: '#0176D3', resume_upload: '#7c3aed', bulk_import: '#F59E0B',
  invite_link: '#10b981', career_page: '#ef4444', referral: '#06b6d4',
  platform: '#014486', direct: '#94a3b8', talent_match: '#7c3aed',
};

function useSection(fetcher) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const load = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }));
    fetcher()
      .then(r => setState({ loading: false, error: null, data: r?.data ?? r }))
      .catch(e => setState({ loading: false, error: e.message || 'Error', data: null }));
  }, [fetcher]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export default function AdminInsights({ user }) {
  const [toast, setToast] = useState('');
  const isSA = user?.role === 'super_admin';

  // ── Section fetchers ──────────────────────────────────────────────────────
  // Fetch all smart alerts without server-side limit so every item is visible
  const alertsSection    = useSection(useCallback(() => api.getSmartAlerts({ limit: 10000 }), []));
  const stageSection     = useSection(useCallback(() => api.getStageTime(), []));
  const offerSection     = useSection(useCallback(() => api.getOfferAnalytics(), []));
  const sourceSection    = useSection(useCallback(() => api.getSourceEffectiveness(), []));
  const recruiterSection = useSection(useCallback(() => api.getRecruiterLeaderboard(), []));
  const funnelSection    = useSection(useCallback(() =>
    api.getHiringFunnel().catch(() => api.getFunnel().catch(() => null)), []));
  const statsSection     = useSection(useCallback(() => api.getDashboardStats(), []));
  const slaSection       = useSection(useCallback(() => api.getSlaCompliance(), []));
  const interviewSection = useSection(useCallback(() =>
    api.getUpcomingInterviews().catch(() => []), []));
  const velocitySection  = useSection(useCallback(() => api.getStageVelocity(), []));
  const timeToHireSection = useSection(useCallback(() => api.getTimeToHire(), []));
  const dropoutSection    = useSection(useCallback(() => api.getDropoutAnalysis(), []));

  // ── Pagination state ──────────────────────────────────────────────────────
  const [recPage,    setRecPage]    = useState(1);
  const [tthPage,    setTthPage]    = useState(1);
  const [intPage,    setIntPage]    = useState(1);
  // Smart-alert per-category pagination
  const [stalePage,  setStalePage]  = useState(1);
  const [stuckPage,  setStuckPage]  = useState(1);
  const [offerPage,  setOfferPage]  = useState(1);
  // Optional date filter for pending offers
  const [offerDateFrom, setOfferDateFrom] = useState('');
  const [offerDateTo,   setOfferDateTo]   = useState('');

  const reloadAll = () => {
    alertsSection.reload(); stageSection.reload();
    offerSection.reload();  sourceSection.reload();
    recruiterSection.reload(); funnelSection.reload();
    statsSection.reload(); slaSection.reload();
    interviewSection.reload(); velocitySection.reload();
    timeToHireSection.reload(); dropoutSection.reload();
    setRecPage(1); setTthPage(1); setIntPage(1);
    setStalePage(1); setStuckPage(1); setOfferPage(1);
  };

  // Reset pages when underlying data changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setRecPage(1); }, [recruiterSection.data]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTthPage(1); }, [timeToHireSection.data]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setIntPage(1); }, [interviewSection.data]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setStalePage(1); setStuckPage(1); setOfferPage(1); }, [alertsSection.data]);

  // ── Data derivations ──────────────────────────────────────────────────────
  const alerts    = alertsSection.data;
  const stageTime = stageSection.data;
  const offerData = offerSection.data;
  const sourceData    = Array.isArray(sourceSection.data) ? sourceSection.data : [];
  const recruiterData = Array.isArray(recruiterSection.data)
    ? recruiterSection.data
    : Array.isArray(recruiterSection.data?.data)
    ? recruiterSection.data.data
    : [];
  const funnelRaw  = funnelSection.data;
  const funnelData = Array.isArray(funnelRaw?.stages)
    ? funnelRaw.stages
    : Array.isArray(funnelRaw?.data)
    ? funnelRaw.data
    : Array.isArray(funnelRaw)
    ? funnelRaw
    : [];

  const statsData    = statsSection.data;
  const slaRaw       = slaSection.data;
  const slaCompRate  = slaRaw?.complianceRate ?? slaRaw?.rate ?? null;
  const slaList      = Array.isArray(slaRaw?.byStage)  ? slaRaw.byStage
    : Array.isArray(slaRaw?.stages) ? slaRaw.stages
    : Array.isArray(slaRaw?.data)   ? slaRaw.data
    : Array.isArray(slaRaw)         ? slaRaw : [];
  const upcomingInts = Array.isArray(interviewSection.data)                    ? interviewSection.data
    : Array.isArray(interviewSection.data?.interviews)                         ? interviewSection.data.interviews
    : Array.isArray(interviewSection.data?.upcoming)                           ? interviewSection.data.upcoming
    : Array.isArray(interviewSection.data?.results)                            ? interviewSection.data.results
    : Array.isArray(interviewSection.data?.items)                              ? interviewSection.data.items
    : Array.isArray(interviewSection.data?.data)                               ? interviewSection.data.data : [];
  const velocityData = Array.isArray(velocitySection.data)                     ? velocitySection.data
    : Array.isArray(velocitySection.data?.data)                                ? velocitySection.data.data : [];

  const tthRaw  = timeToHireSection.data;
  const tthAvg  = tthRaw?.avgDays ?? tthRaw?.average ?? tthRaw?.avg ?? (typeof tthRaw === 'number' ? tthRaw : null);
  const tthList = Array.isArray(tthRaw?.byJob)  ? tthRaw.byJob
    : Array.isArray(tthRaw?.jobs)               ? tthRaw.jobs
    : Array.isArray(tthRaw?.data)               ? tthRaw.data
    : Array.isArray(tthRaw)                     ? tthRaw : [];
  const dropRaw  = dropoutSection.data;
  const dropList = Array.isArray(dropRaw?.byStage) ? dropRaw.byStage
    : Array.isArray(dropRaw?.stages)              ? dropRaw.stages
    : Array.isArray(dropRaw?.data)                ? dropRaw.data
    : Array.isArray(dropRaw)                      ? dropRaw : [];

  const totalAlerts =
    (alerts?.staleJobs?.length || 0) +
    (alerts?.stuckCandidates?.length || 0) +
    (alerts?.pendingOffers?.length || 0);

  // ── Paginated slices ──────────────────────────────────────────────────────
  const recSlice = recruiterData.slice((recPage - 1) * PG, recPage * PG);
  const tthSlice = tthList.slice((tthPage - 1) * PG, tthPage * PG);
  const intSlice = upcomingInts.slice((intPage - 1) * PG, intPage * PG);

  // Smart alert full lists (all returned by backend — no frontend cap)
  const staleJobs  = alerts?.staleJobs || [];
  const stuckCands = alerts?.stuckCandidates || [];
  // Pending offers with optional date filter
  const allPendingOffers = alerts?.pendingOffers || [];
  const pendingOffers = allPendingOffers.filter(o => {
    const ts = o.sentAt || o.createdAt || o.offerDate || '';
    if (offerDateFrom && ts && ts.slice(0, 10) < offerDateFrom) return false;
    if (offerDateTo   && ts && ts.slice(0, 10) > offerDateTo)   return false;
    return true;
  });
  const staleSlice = staleJobs.slice((stalePage - 1) * PG, stalePage * PG);
  const stuckSlice = stuckCands.slice((stuckPage - 1) * PG, stuckPage * PG);
  const offerSlice = pendingOffers.slice((offerPage - 1) * PG, offerPage * PG);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <PageHeader
          title="📊 Hiring Insights"
          subtitle="Live org KPIs, smart alerts, SLA compliance, pipeline velocity, source effectiveness, and offer analytics"
        />
        <button onClick={reloadAll} style={{ ...btnG, padding: '9px 18px', fontSize: 12, flexShrink: 0 }}>
          ↻ Refresh All
        </button>
      </div>

      {/* ── ORG KPI SUMMARY BAR ── */}
      {!statsSection.loading && statsData && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatBox label="Open Positions"    value={statsData.openJobs     ?? statsData.activeJobs   ?? statsData.openPositions ?? '—'} color="#0176D3" />
          <StatBox label="Total Candidates"  value={statsData.applications ?? statsData.totalApps     ?? statsData.candidates    ?? '—'} color="#7C3AED" />
          <StatBox label="New This Month"    value={statsData.appsLast30   ?? statsData.newThisMonth  ?? '—'} color="#F59E0B" sub="applications in last 30d" />
          <StatBox label="Hires Made"        value={statsData.hired ?? statsData.totalHired ?? statsData.hiredCount ?? (statsData.pipeline ? (statsData.pipeline['Selected'] ?? statsData.pipeline['Hired'] ?? statsData.pipeline['selected'] ?? 0) : '—')} color="#10B981" />
          {(statsData.totalRecruiters ?? statsData.recruiters) != null && (
            <StatBox label="Active Recruiters" value={statsData.totalRecruiters ?? statsData.recruiters} color="#064E3B" />
          )}
        </div>
      )}
      {statsSection.loading && (
        <div style={{ ...panel, padding: '18px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {[1,2,3,4].map(i => <div key={i} className="tn-skeleton" style={{ flex: 1, height: 72, borderRadius: 14 }} />)}
          </div>
        </div>
      )}
      {statsSection.error && (
        <div style={{ ...panel, padding: '16px 24px', marginBottom: 20 }}>
          <p style={{ ...LABEL, marginBottom: 0 }}>📊 Org KPI Summary</p>
          <SectionError onRetry={statsSection.reload} />
        </div>
      )}

      {/* ── SMART ALERTS SUMMARY ── compact card linking to full SLA Alerts page ── */}
      <div style={{ ...panel, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🚨</span>
            <div>
              <p style={{ ...LABEL, marginBottom: 0 }}>Smart Alerts</p>
              {alertsSection.loading ? (
                <span style={{ fontSize: 12, color: '#94A3B8' }}>Loading…</span>
              ) : totalAlerts === 0 ? (
                <span style={{ fontSize: 12, color: '#10B981', fontWeight: 700 }}>✅ All clear — no actions needed</span>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  {staleJobs.length > 0   && <span style={{ fontSize: 12, background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>⏳ {staleJobs.length} stale job{staleJobs.length !== 1 ? 's' : ''}</span>}
                  {stuckCands.length > 0  && <span style={{ fontSize: 12, background: '#FEF2F2', color: '#991B1B', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>🔴 {stuckCands.length} stuck candidate{stuckCands.length !== 1 ? 's' : ''}</span>}
                  {allPendingOffers.length > 0 && <span style={{ fontSize: 12, background: '#EFF6FF', color: '#1E40AF', borderRadius: 20, padding: '2px 10px', fontWeight: 700 }}>📄 {allPendingOffers.length} pending offer{allPendingOffers.length !== 1 ? 's' : ''}</span>}
                </div>
              )}
            </div>
          </div>
          <a href="/app/sla-alerts" style={{ fontSize: 12, fontWeight: 700, color: '#0176D3', textDecoration: 'none', background: '#EFF6FF', borderRadius: 8, padding: '6px 14px', border: '1px solid #BFDBFE', whiteSpace: 'nowrap' }}>
            View SLA Alerts & Details →
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* ── OFFER ANALYTICS ── */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>📄 Offer Analytics</p>
            <button onClick={offerSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {offerSection.loading && <SectionLoader />}
          {offerSection.error   && <SectionError onRetry={offerSection.reload} />}
          {!offerSection.loading && !offerSection.error && (offerData ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatBox label="Total Offers" value={offerData.total}    color="#0176D3" />
                <StatBox label="Signed"       value={offerData.signed}   color="#10B981" />
                <StatBox label="Pending"      value={offerData.pending}  color="#F59E0B" />
                <StatBox label="Declined"     value={offerData.declined} color="#EF4444" />
              </div>
              {[
                { label: 'Acceptance Rate',  value: `${offerData.acceptanceRate}%`, color: offerData.acceptanceRate >= 70 ? '#10B981' : offerData.acceptanceRate >= 40 ? '#F59E0B' : '#EF4444' },
                { label: 'Avg Days to Sign', value: `${offerData.avgDaysToSign} days`, color: '#0176D3' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: r.color }}>{r.value}</span>
                </div>
              ))}
            </>
          ) : <SectionEmpty msg="No offer letters yet." />)}
        </div>

        {/* ── PIPELINE STAGE TIME ── */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>⏱ Stage Bottleneck Finder</p>
            <button onClick={stageSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {stageSection.loading && <SectionLoader />}
          {stageSection.error   && <SectionError onRetry={stageSection.reload} />}
          {!stageSection.loading && !stageSection.error && (stageTime?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stageTime.map(s => (
                <div key={s.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.stage}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: '#94A3B8' }}>{s.count} moves</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: s.avgDays > 14 ? '#EF4444' : s.avgDays > 7 ? '#F59E0B' : '#10B981',
                        background: s.avgDays > 14 ? '#EF444415' : s.avgDays > 7 ? '#F59E0B15' : '#10B98115',
                        padding: '2px 8px', borderRadius: 20 }}>
                        {s.avgDays}d avg
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 7, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4,
                      width: `${Math.min(100, (s.avgDays / (stageTime[0]?.avgDays || 1)) * 100)}%`,
                      background: s.avgDays > 14 ? 'linear-gradient(90deg,#EF4444,#DC2626)' : s.avgDays > 7 ? 'linear-gradient(90deg,#F59E0B,#D97706)' : 'linear-gradient(90deg,#10B981,#059669)',
                    }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                🔴 &gt;14d = bottleneck · 🟡 7–14d = watch · 🟢 &lt;7d = healthy
              </p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>
                Based on all {stageTime.reduce((s,x) => s + x.count, 0).toLocaleString()} stage transitions in the database.
              </p>
            </div>
          ) : <SectionEmpty msg="Not enough stage transitions yet. Move candidates through the pipeline to see averages." />)}
        </div>
      </div>

      {/* ── SOURCE EFFECTIVENESS ── */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <p style={{ ...LABEL, marginBottom: 0 }}>🎯 Source Effectiveness — Where Your Best Hires Come From</p>
          <button onClick={sourceSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
        </div>
        {sourceSection.loading && <SectionLoader />}
        {sourceSection.error   && <SectionError onRetry={sourceSection.reload} />}
        {!sourceSection.loading && !sourceSection.error && (sourceData.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Source', 'Applications', 'Shortlisted', 'Hired', 'Shortlist %', 'Hire %'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sourceData.map(s => (
                    <tr key={s.source} style={{ borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: SOURCE_COLORS[s.source] || '#94A3B8', flexShrink: 0 }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{SOURCE_LABELS[s.source] || s.source}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{s.applications.toLocaleString()}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: '#0176D3', fontWeight: 600 }}>{s.shortlisted.toLocaleString()}</td>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: '#10B981', fontWeight: 700 }}>{s.hired.toLocaleString()}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: '#0176D310', color: '#0176D3', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{s.shortlistRate}%</span>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <span style={{ background: s.hireRate > 10 ? '#10B98115' : s.hireRate > 3 ? '#F59E0B15' : '#EF444415', color: s.hireRate > 10 ? '#10B981' : s.hireRate > 3 ? '#F59E0B' : '#EF4444', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                          {s.hireRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: '#F8FAFC', fontWeight: 800, borderTop: '2px solid #E2E8F0' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0A1628' }}>TOTAL</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#374151' }}>{sourceData.reduce((s,r) => s+r.applications,0).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0176D3' }}>{sourceData.reduce((s,r) => s+r.shortlisted,0).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#10B981' }}>{sourceData.reduce((s,r) => s+r.hired,0).toLocaleString()}</td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0' }}>
              💡 Focus recruiting budget on sources with the highest Hire % — not just the most applications.
            </p>
          </>
        ) : <SectionEmpty msg="No source data available." />)}
      </div>

      {/* ── RECRUITER LEADERBOARD + HIRING FUNNEL ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* Recruiter Leaderboard — paginated, no data cap */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <p style={{ ...LABEL, marginBottom: 0 }}>🏆 Recruiter Leaderboard</p>
              {recruiterData.length > 0 && (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{recruiterData.length} recruiter{recruiterData.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <button onClick={recruiterSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {recruiterSection.loading && <SectionLoader />}
          {recruiterSection.error   && <SectionError onRetry={recruiterSection.reload} />}
          {!recruiterSection.loading && !recruiterSection.error && (recruiterData.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recSlice.map((r, idx) => {
                  const i = (recPage - 1) * PG + idx; // global rank index
                  const MEDAL = ['🥇', '🥈', '🥉'];
                  const convPct = typeof r.conversion === 'string' && r.conversion.includes('%')
                    ? r.conversion
                    : `${r.conversion ?? 0}%`;
                  return (
                    <div key={r.recruiterId || r._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: i === 0 ? 'rgba(1,118,211,0.05)' : '#F8FAFC', border: `1px solid ${i === 0 ? 'rgba(1,118,211,0.2)' : '#E2E8F0'}` }}>
                      <div style={{ width: 22, fontWeight: 900, fontSize: 16, textAlign: 'center', flexShrink: 0 }}>
                        {i < 3 ? MEDAL[i] : <span style={{ color: '#CBD5E1', fontWeight: 700, fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>}
                      </div>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: i === 0 ? 'linear-gradient(135deg,#0176D3,#00C2CB)' : 'linear-gradient(135deg,#64748B,#475569)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                        {(r.name || r.recruiterName || '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name || r.recruiterName || '—'}</div>
                        <div style={{ fontSize: 10, color: '#706E6B' }}>{r.jobs ?? r.jobsAssigned ?? 0} jobs assigned</div>
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#0176D3' }}>{r.candidates ?? r.candidatesAdded ?? 0}</div>
                          <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Apps</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#10B981' }}>{r.hired ?? 0}</div>
                          <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Hired</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#F59E0B' }}>{convPct}</div>
                          <div style={{ fontSize: 9, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>Conv</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Paginator page={recPage} setPage={setRecPage} total={recruiterData.length} />
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0' }}>
                💡 Conv = hire rate. Go to Analytics for full recruiter performance breakdown.
              </p>
            </>
          ) : <SectionEmpty msg="No recruiter data yet. Assign recruiters and start moving candidates." />)}
        </div>

        {/* Hiring Funnel Snapshot */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>🔽 Hiring Funnel Snapshot</p>
            <button onClick={funnelSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {funnelSection.loading && <SectionLoader />}
          {funnelSection.error   && <SectionError onRetry={funnelSection.reload} />}
          {!funnelSection.loading && !funnelSection.error && (funnelData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const maxCount = Math.max(...funnelData.map(s => s.count || 0), 1);
                return funnelData.map((s, idx) => {
                  const prev    = idx > 0 ? (funnelData[idx - 1].count || 0) : null;
                  const dropoff = prev && prev > 0 ? Math.round((1 - (s.count || 0) / prev) * 100) : null;
                  const isHired = (s.stage || s.label || '').toLowerCase().includes('hired');
                  const isRej   = (s.stage || s.label || '').toLowerCase().includes('reject');
                  const barColor = isHired ? '#10B981' : isRej ? '#EF4444' : '#0176D3';
                  return (
                    <div key={s.stage || s.label || idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.stage || s.label || `Stage ${idx + 1}`}</span>
                        <span style={{ fontSize: 12, color: '#706E6B' }}>
                          {(s.count || 0).toLocaleString()}
                          {s.percentage != null && <span style={{ color: '#94A3B8', marginLeft: 4 }}>({s.percentage}%)</span>}
                        </span>
                      </div>
                      <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, (s.count || 0) / maxCount * 100)}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`, transition: 'width 0.6s ease' }} />
                      </div>
                      {dropoff !== null && dropoff > 0 && (
                        <div style={{ fontSize: 10, color: dropoff > 60 ? '#EF4444' : '#F59E0B', marginTop: 2 }}>
                          ↓ {dropoff}% drop from previous stage
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                Large drop-offs show where candidates are being lost in your process.
              </p>
            </div>
          ) : <SectionEmpty msg="No pipeline data yet. Candidates need to move through stages to build a funnel." />)}
        </div>
      </div>

      {/* ── SLA COMPLIANCE + STAGE VELOCITY ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* SLA Compliance */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>🕐 SLA Compliance</p>
            <button onClick={slaSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {slaSection.loading && <SectionLoader />}
          {slaSection.error   && <SectionError onRetry={slaSection.reload} />}
          {!slaSection.loading && !slaSection.error && (slaRaw ? (
            <div>
              {slaCompRate != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '14px 16px', background: slaCompRate >= 80 ? 'rgba(16,185,129,0.07)' : slaCompRate >= 60 ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${slaCompRate >= 80 ? 'rgba(16,185,129,0.2)' : slaCompRate >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12 }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: slaCompRate >= 80 ? '#10B981' : slaCompRate >= 60 ? '#F59E0B' : '#EF4444' }}>{slaCompRate}%</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>Overall SLA Compliance</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {slaRaw.onTrackCount != null ? `${slaRaw.onTrackCount} on track` : ''}
                      {slaRaw.breachedCount != null ? ` · ${slaRaw.breachedCount} breached` : ''}
                    </div>
                  </div>
                </div>
              )}
              {slaList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {slaList.map((s, i) => {
                    const total  = (s.onTrack || s.ontrack || 0) + (s.breached || s.violated || 0);
                    const rate   = total > 0 ? Math.round(((s.onTrack || s.ontrack || 0) / total) * 100) : null;
                    const color  = rate == null ? '#94A3B8' : rate >= 80 ? '#10B981' : rate >= 60 ? '#F59E0B' : '#EF4444';
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.stage || s.name || `Stage ${i+1}`}</span>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {s.breached != null && s.breached > 0 && (
                              <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 700, background: '#EF444415', padding: '1px 7px', borderRadius: 20 }}>{s.breached || s.violated} breached</span>
                            )}
                            {rate != null && (
                              <span style={{ fontSize: 11, fontWeight: 800, color }}>{rate}%</span>
                            )}
                          </div>
                        </div>
                        {rate != null && (
                          <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${rate}%`, borderRadius: 3, background: color, transition: 'width 0.5s ease' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {slaCompRate == null && slaList.length === 0 && <SectionEmpty msg="No SLA data available yet." />}
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0' }}>
                🔴 &lt;60% = at risk · 🟡 60–80% = needs attention · 🟢 &gt;80% = healthy
              </p>
            </div>
          ) : <SectionEmpty msg="No SLA data available. Move candidates through stages to generate SLA tracking." />)}
        </div>

        {/* Stage Velocity */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>⚡ Stage Velocity</p>
            <button onClick={velocitySection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {velocitySection.loading && <SectionLoader />}
          {velocitySection.error   && <SectionError onRetry={velocitySection.reload} />}
          {!velocitySection.loading && !velocitySection.error && (velocityData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {velocityData.map((s, i) => {
                const hours    = s.avgHours ?? s.avgTime ?? s.hours ?? 0;
                const days     = (hours / 24).toFixed(1);
                const color    = hours > 168 ? '#EF4444' : hours > 72 ? '#F59E0B' : '#10B981';
                const maxHours = Math.max(...velocityData.map(x => x.avgHours ?? x.avgTime ?? x.hours ?? 0), 1);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.stage || s.name || `Stage ${i+1}`}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {s.count != null && <span style={{ fontSize: 10, color: '#94A3B8' }}>{s.count} candidates</span>}
                        <span style={{ fontSize: 12, fontWeight: 800, color, background: `${color}15`, padding: '2px 8px', borderRadius: 20 }}>{days}d avg</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (hours / maxHours) * 100)}%`, borderRadius: 3, background: `linear-gradient(90deg,${color},${color}cc)`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                Shows avg time candidates spend in each stage. Fast-moving stages are healthy; slow ones need attention.
              </p>
            </div>
          ) : <SectionEmpty msg="Not enough data yet. Stage moves are tracked as candidates progress through the pipeline." />)}
        </div>
      </div>

      {/* ── UPCOMING INTERVIEWS — paginated ── */}
      <div style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 6 }}>
          <div>
            <p style={{ ...LABEL, marginBottom: 0 }}>📅 Upcoming Interviews</p>
            {upcomingInts.length > 0 && (
              <span style={{ fontSize: 11, color: '#94A3B8' }}>{upcomingInts.length} scheduled</span>
            )}
          </div>
          <button onClick={interviewSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
        </div>
        {interviewSection.loading && <SectionLoader />}
        {interviewSection.error   && <SectionError onRetry={interviewSection.reload} />}
        {!interviewSection.loading && !interviewSection.error && (upcomingInts.length > 0 ? (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {['Candidate', 'Job', 'Date & Time', 'Format', 'Interviewer', 'Round'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.4, borderBottom: '2px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {intSlice.map((iv, i) => {
                    const dt      = iv.scheduledAt || iv.date || iv.dateTime;
                    const dateStr = dt ? new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
                    const timeStr = dt ? new Date(dt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }) : '';
                    const isToday = dt && new Date(dt).toDateString() === new Date().toDateString();
                    const isPast  = dt && new Date(dt) < new Date();
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9', background: isToday ? 'rgba(245,158,11,0.04)' : '' }}
                        onMouseEnter={e => e.currentTarget.style.background = isToday ? 'rgba(245,158,11,0.08)' : '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = isToday ? 'rgba(245,158,11,0.04)' : ''}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>{iv.candidateName || iv.candidate?.name || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iv.jobTitle || iv.job?.title || '—'}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#D97706' : isPast ? '#94A3B8' : '#374151' }}>
                              {isToday ? '🔔 Today' : dateStr}
                            </span>
                            {timeStr && <span style={{ fontSize: 11, color: '#94A3B8' }}>{timeStr}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: 11, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: 20 }}>
                            {iv.format === 'video' ? '📹 Video' : iv.format === 'phone' ? '📞 Phone' : iv.format === 'in_person' ? '🏢 In-Person' : iv.format || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#374151' }}>{iv.interviewerName || iv.interviewer?.name || '—'}</td>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: '#706E6B' }}>{iv.round ? `Round ${iv.round}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginator page={intPage} setPage={setIntPage} total={upcomingInts.length} />
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0' }}>
              {upcomingInts.length} interview{upcomingInts.length !== 1 ? 's' : ''} scheduled · 🔔 Today rows highlighted
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No upcoming interviews at org level</div>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
              Interviews are scheduled inside each recruiter&apos;s pipeline.<br />
              Go to <strong>Applicants → Pipeline</strong> or check each recruiter&apos;s view to see scheduled interviews.
            </div>
          </div>
        ))}
      </div>

      {/* ── TIME TO HIRE + DROPOUT ANALYSIS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* Time to Hire — paginated per-job list, no cap */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 6 }}>
            <div>
              <p style={{ ...LABEL, marginBottom: 0 }}>⏳ Time to Hire</p>
              {tthList.length > 0 && (
                <span style={{ fontSize: 11, color: '#94A3B8' }}>{tthList.length} job{tthList.length !== 1 ? 's' : ''} tracked</span>
              )}
            </div>
            <button onClick={timeToHireSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {timeToHireSection.loading && <SectionLoader />}
          {timeToHireSection.error   && <SectionError onRetry={timeToHireSection.reload} />}
          {!timeToHireSection.loading && !timeToHireSection.error && (tthRaw ? (
            <div>
              {tthAvg != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: tthAvg <= 21 ? 'rgba(16,185,129,0.07)' : tthAvg <= 45 ? 'rgba(245,158,11,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${tthAvg <= 21 ? 'rgba(16,185,129,0.2)' : tthAvg <= 45 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: tthAvg <= 21 ? '#10B981' : tthAvg <= 45 ? '#F59E0B' : '#EF4444' }}>{tthAvg}<span style={{ fontSize: 14 }}>d</span></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>Avg Days to Hire</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {tthAvg <= 21 ? '🟢 Fast — industry benchmark is 21d' : tthAvg <= 45 ? '🟡 Average — aim for under 30d' : '🔴 Slow — investigate bottlenecks'}
                    </div>
                  </div>
                </div>
              )}
              {tthList.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Per Job</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tthSlice.map((j, i) => {
                      const days  = j.avgDays ?? j.days ?? j.timeToHire ?? 0;
                      const color = days <= 21 ? '#10B981' : days <= 45 ? '#F59E0B' : '#EF4444';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ flex: 1, fontSize: 12, color: '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title || j.jobTitle || j.job || `Job ${(tthPage-1)*PG+i+1}`}</span>
                          {(j.hireCount ?? j.count) != null && (
                            <span style={{ fontSize: 10, color: '#94A3B8', flexShrink: 0 }}>{j.hireCount ?? j.count} hire{(j.hireCount ?? j.count) !== 1 ? 's' : ''}</span>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 800, color, background: `${color}15`, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>{days}d</span>
                        </div>
                      );
                    })}
                  </div>
                  <Paginator page={tthPage} setPage={setTthPage} total={tthList.length} />
                </>
              )}
              {tthAvg == null && tthList.length === 0 && <SectionEmpty msg="No completed hires yet." />}
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '10px 0 0' }}>
                🟢 &lt;21d great · 🟡 21–45d average · 🔴 &gt;45d needs action
              </p>
            </div>
          ) : <SectionEmpty msg="No hire data available yet. Make your first hire to start tracking." />)}
        </div>

        {/* Dropout / Falloff Analysis */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>📉 Candidate Dropout Analysis</p>
            <button onClick={dropoutSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {dropoutSection.loading && <SectionLoader />}
          {dropoutSection.error   && <SectionError onRetry={dropoutSection.reload} />}
          {!dropoutSection.loading && !dropoutSection.error && (dropList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dropList.map((s, i) => {
                const rate  = s.dropoutRate ?? s.rate ?? s.percentage ?? 0;
                const count = s.dropoutCount ?? s.count ?? s.dropped ?? 0;
                const color = rate >= 50 ? '#EF4444' : rate >= 25 ? '#F59E0B' : '#10B981';
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.stage || s.name || `Stage ${i+1}`}</span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {count > 0 && <span style={{ fontSize: 10, color: '#94A3B8' }}>{count} dropped</span>}
                        <span style={{ fontSize: 11, fontWeight: 800, color, background: `${color}15`, padding: '2px 8px', borderRadius: 20 }}>{rate}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, rate)}%`, borderRadius: 3, background: `linear-gradient(90deg,${color},${color}cc)`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
              {dropRaw?.topDropoutStage && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(239,68,68,0.05)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
                  <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>⚠️ Highest dropout: {dropRaw.topDropoutStage}</span>
                </div>
              )}
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                Shows where candidates exit before progressing. High dropout stages need process review.
              </p>
            </div>
          ) : <SectionEmpty msg="No dropout data yet. Candidates need to move through stages to generate this analysis." />)}
        </div>
      </div>

    </div>
  );
}
