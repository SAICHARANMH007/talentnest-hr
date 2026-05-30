import { useState, useEffect, useCallback } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';

const panel = { ...card, padding: 24, marginBottom: 20 };
const LABEL = { fontSize: 10, fontWeight: 700, color: '#706E6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16, margin: '0 0 16px' };

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

  const alertsSection    = useSection(useCallback(() => api.getSmartAlerts(), []));
  const stageSection     = useSection(useCallback(() => api.getStageTime(), []));
  const offerSection     = useSection(useCallback(() => api.getOfferAnalytics(), []));
  const sourceSection    = useSection(useCallback(() => api.getSourceEffectiveness(), []));
  const recruiterSection = useSection(useCallback(() => api.getRecruiterLeaderboard(), []));
  const funnelSection    = useSection(useCallback(() => api.getHiringFunnel(), []));

  const reloadAll = () => {
    alertsSection.reload(); stageSection.reload();
    offerSection.reload();  sourceSection.reload();
    recruiterSection.reload(); funnelSection.reload();
  };

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

  const totalAlerts =
    (alerts?.staleJobs?.length || 0) +
    (alerts?.stuckCandidates?.length || 0) +
    (alerts?.pendingOffers?.length || 0);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 10 }}>
        <PageHeader
          title="📊 Hiring Insights"
          subtitle="Smart alerts, pipeline bottlenecks, source effectiveness and offer analytics"
        />
        <button onClick={reloadAll} style={{ ...btnG, padding: '9px 18px', fontSize: 12, flexShrink: 0 }}>
          ↻ Refresh All
        </button>
      </div>

      {/* ── SMART ALERTS ── */}
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <p style={LABEL}>🚨 Smart Alerts</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {totalAlerts > 0 && (
              <span style={{ background: '#BA051710', border: '1px solid #BA051730', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, color: '#BA0517' }}>
                {totalAlerts} action{totalAlerts !== 1 ? 's' : ''} needed
              </span>
            )}
            <button onClick={alertsSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
        </div>

        {alertsSection.loading && <SectionLoader />}
        {alertsSection.error   && <SectionError onRetry={alertsSection.reload} />}
        {!alertsSection.loading && !alertsSection.error && (
          <>
            {totalAlerts === 0 && (
              <div style={{ textAlign: 'center', padding: '28px 20px', color: '#10B981' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>All clear — no alerts right now.</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Stale Jobs */}
              {alerts?.staleJobs?.length > 0 && (
                <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#92400E', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>⏳ Jobs open {alerts.thresholds?.staleJobDays || 30}+ days with no hire</span>
                    {alerts.totals?.staleJobs > alerts.staleJobs.length && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#92400E' }}>
                        Showing {alerts.staleJobs.length} of {alerts.totals.staleJobs}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerts.staleJobs.map(j => (
                      <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff8e7', borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#1a1a1a', minWidth: 120 }}>{j.title}</span>
                        <span style={{ fontSize: 11, color: '#64748B' }}>{j.company}</span>
                        <span style={{ fontSize: 11, color: '#92400E', fontWeight: 800, background: '#FDE68A', padding: '2px 8px', borderRadius: 20 }}>{j.daysOpen}d open</span>
                        {j.recruiters?.length > 0 && <span style={{ fontSize: 11, color: '#64748B' }}>👤 {j.recruiters.join(', ')}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stuck Candidates */}
              {alerts?.stuckCandidates?.length > 0 && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#991B1B', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🔴 Candidates stuck {alerts.thresholds?.stuckCandDays || 7}+ days without stage move</span>
                    {alerts.totals?.stuckCandidates > alerts.stuckCandidates.length && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#991B1B' }}>
                        Showing {alerts.stuckCandidates.length} worst of {alerts.totals.stuckCandidates} total in pipeline
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerts.stuckCandidates.map(c => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff5f5', borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#1a1a1a', minWidth: 100 }}>{c.candidateName}</span>
                        <Badge label={c.stage} color="#64748B" />
                        <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 800, background: '#FECACA', padding: '2px 8px', borderRadius: 20 }}>{c.daysStuck}d stuck</span>
                        <span style={{ fontSize: 11, color: '#64748B', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.jobTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Offers */}
              {alerts?.pendingOffers?.length > 0 && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#1E40AF', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📄 Offer letters unsigned for {alerts.thresholds?.pendingOfferDays || 3}+ days</span>
                    {alerts.totals?.pendingOffers > alerts.pendingOffers.length && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1E40AF' }}>
                        Showing {alerts.pendingOffers.length} of {alerts.totals.pendingOffers}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {alerts.pendingOffers.map(o => (
                      <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0f7ff', borderRadius: 8, padding: '8px 12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#1a1a1a' }}>{o.candidateName}</span>
                        <Badge label={o.status} color="#1E40AF" />
                        <span style={{ fontSize: 11, color: '#1E40AF', fontWeight: 800, background: '#BFDBFE', padding: '2px 8px', borderRadius: 20 }}>{o.daysPending}d pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
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
                <StatBox label="Total Offers" value={offerData.total}   color="#0176D3" />
                <StatBox label="Signed"       value={offerData.signed}  color="#10B981" />
                <StatBox label="Pending"      value={offerData.pending} color="#F59E0B" />
                <StatBox label="Declined"     value={offerData.declined} color="#EF4444" />
              </div>
              {[
                { label: 'Acceptance Rate', value: `${offerData.acceptanceRate}%`, color: offerData.acceptanceRate >= 70 ? '#10B981' : offerData.acceptanceRate >= 40 ? '#F59E0B' : '#EF4444' },
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
                🔴 &gt;14d = bottleneck · 🟡 7-14d = watch · 🟢 &lt;7d = healthy
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

        {/* Recruiter Leaderboard */}
        <div style={panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ ...LABEL, marginBottom: 0 }}>🏆 Recruiter Leaderboard</p>
            <button onClick={recruiterSection.reload} style={{ ...btnG, padding: '5px 12px', fontSize: 11 }}>↻</button>
          </div>
          {recruiterSection.loading && <SectionLoader />}
          {recruiterSection.error   && <SectionError onRetry={recruiterSection.reload} />}
          {!recruiterSection.loading && !recruiterSection.error && (recruiterData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recruiterData.slice(0, 6).map((r, i) => {
                const MEDAL = ['🥇', '🥈', '🥉'];
                const convPct = typeof r.conversion === 'string' && r.conversion.includes('%')
                  ? r.conversion
                  : `${r.conversion ?? 0}%`;
                return (
                  <div key={r.recruiterId || r._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: i === 0 ? 'rgba(1,118,211,0.05)' : '#F8FAFC', border: `1px solid ${i === 0 ? 'rgba(1,118,211,0.2)' : '#E2E8F0'}` }}>
                    <div style={{ width: 22, fontWeight: 900, fontSize: 16, textAlign: 'center', flexShrink: 0 }}>
                      {MEDAL[i] || <span style={{ color: '#CBD5E1', fontWeight: 700, fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</span>}
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
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                💡 Conv = hire rate. Go to Analytics for full recruiter performance breakdown.
              </p>
            </div>
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
                  const prev = idx > 0 ? (funnelData[idx - 1].count || 0) : null;
                  const dropoff = prev && prev > 0 ? Math.round((1 - (s.count || 0) / prev) * 100) : null;
                  const isHired = (s.stage || s.label || '').toLowerCase().includes('hired');
                  const isRej   = (s.stage || s.label || '').toLowerCase().includes('reject');
                  const barColor = isHired ? '#10B981' : isRej ? '#EF4444' : '#0176D3';
                  const pct = s.percentage ?? Math.round(((s.count || 0) / maxCount) * 100);
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
    </div>
  );
}
