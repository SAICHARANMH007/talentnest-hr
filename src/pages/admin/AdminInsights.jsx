import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import VertBarChart from '../../components/charts/VertBarChart.jsx';
import { card, btnP, btnG } from '../../constants/styles.js';

const panel = { ...card, padding: 24, marginBottom: 20 };
const S = { label: { fontSize: 10, fontWeight: 700, color: '#706E6B', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 } };

function StatBox({ label, value, color = '#0176D3', sub }) {
  return (
    <div style={{ background: `${color}0d`, border: `1px solid ${color}30`, borderRadius: 14, padding: '16px 20px', textAlign: 'center', flex: 1, minWidth: 100 }}>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#706E6B', marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const SOURCE_LABELS = {
  manual: 'Manual Add', resume_upload: 'Resume Upload', bulk_import: 'Bulk Import',
  invite_link: 'Invite Link', career_page: 'Career Page', referral: 'Referral',
  platform: 'Platform', direct: 'Direct',
};
const SOURCE_COLORS = {
  manual: '#0176D3', resume_upload: '#7c3aed', bulk_import: '#F59E0B',
  invite_link: '#10b981', career_page: '#ef4444', referral: '#06b6d4',
  platform: '#014486', direct: '#94a3b8',
};

export default function AdminInsights({ user }) {
  const [alerts,       setAlerts]       = useState(null);
  const [stageTime,    setStageTime]    = useState(null);
  const [offerData,    setOfferData]    = useState(null);
  const [sourceData,   setSourceData]   = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getSmartAlerts().catch(() => null),
      api.getStageTime().catch(() => null),
      api.getOfferAnalytics().catch(() => null),
      api.getSourceEffectiveness().catch(() => null),
    ]).then(([a, st, o, src]) => {
      setAlerts(a?.data || null);
      setStageTime(st?.data || null);
      setOfferData(o?.data || null);
      setSourceData(src?.data || null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={36} /></div>;

  const totalAlerts = (alerts?.staleJobs?.length || 0) + (alerts?.stuckCandidates?.length || 0) + (alerts?.pendingOffers?.length || 0);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader
        title="📊 Hiring Insights"
        subtitle="Smart alerts, pipeline bottlenecks, source effectiveness and offer analytics — all in one place"
      />

      {/* ── SMART ALERTS ── */}
      <div style={panel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={S.label}>🚨 Smart Alerts</p>
          {totalAlerts > 0 && (
            <span style={{ background: '#BA051710', border: '1px solid #BA051730', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, color: '#BA0517' }}>
              {totalAlerts} action{totalAlerts !== 1 ? 's' : ''} needed
            </span>
          )}
        </div>

        {totalAlerts === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 20px', color: '#10B981' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>All clear! No alerts at this time.</div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Stale Jobs */}
          {alerts?.staleJobs?.length > 0 && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#92400E', marginBottom: 10 }}>
                ⏳ {alerts.staleJobs.length} job{alerts.staleJobs.length > 1 ? 's' : ''} open 30+ days with no hire
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.staleJobs.map(j => (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff8e7', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#1a1a1a' }}>{j.title}</span>
                    <span style={{ fontSize: 11, color: '#92400E', fontWeight: 700 }}>{j.daysOpen} days open</span>
                    {j.recruiters?.length > 0 && <span style={{ fontSize: 11, color: '#64748B' }}>👤 {j.recruiters.join(', ')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stuck Candidates */}
          {alerts?.stuckCandidates?.length > 0 && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#991B1B', marginBottom: 10 }}>
                🔴 {alerts.stuckCandidates.length} candidate{alerts.stuckCandidates.length > 1 ? 's' : ''} stuck 7+ days in stage
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.stuckCandidates.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff5f5', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#1a1a1a' }}>{c.candidateName}</span>
                    <Badge label={c.stage} color="#64748B" />
                    <span style={{ fontSize: 11, color: '#991B1B', fontWeight: 700 }}>{c.daysStuck}d stuck</span>
                    <span style={{ fontSize: 11, color: '#64748B', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.jobTitle}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Offers */}
          {alerts?.pendingOffers?.length > 0 && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#1E40AF', marginBottom: 10 }}>
                📄 {alerts.pendingOffers.length} offer{alerts.pendingOffers.length > 1 ? 's' : ''} unsigned for 3+ days
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alerts.pendingOffers.map(o => (
                  <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0f7ff', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: '#1a1a1a' }}>{o.candidateName}</span>
                    <Badge label={o.status} color="#1E40AF" />
                    <span style={{ fontSize: 11, color: '#1E40AF', fontWeight: 700 }}>{o.daysPending}d pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* ── OFFER ANALYTICS ── */}
        <div style={panel}>
          <p style={S.label}>📄 Offer Analytics</p>
          {offerData ? (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <StatBox label="Total Offers" value={offerData.total} color="#0176D3" />
                <StatBox label="Signed" value={offerData.signed} color="#10B981" />
                <StatBox label="Pending" value={offerData.pending} color="#F59E0B" />
                <StatBox label="Declined" value={offerData.declined} color="#EF4444" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', background: '#F8FAFC', borderRadius: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Acceptance Rate</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: offerData.acceptanceRate >= 70 ? '#10B981' : offerData.acceptanceRate >= 40 ? '#F59E0B' : '#EF4444' }}>
                  {offerData.acceptanceRate}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', background: '#F8FAFC', borderRadius: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Avg Days to Sign</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#0176D3' }}>{offerData.avgDaysToSign} days</span>
              </div>
            </>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No offer data yet</div>}
        </div>

        {/* ── PIPELINE STAGE TIME ── */}
        <div style={panel}>
          <p style={S.label}>⏱ Avg Days Per Stage (Bottleneck Finder)</p>
          {stageTime?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stageTime.slice(0, 8).map(s => (
                <div key={s.stage}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.stage}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.avgDays > 14 ? '#EF4444' : s.avgDays > 7 ? '#F59E0B' : '#10B981' }}>
                      {s.avgDays}d avg
                    </span>
                  </div>
                  <div style={{ height: 7, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${Math.min(100, (s.avgDays / (stageTime[0]?.avgDays || 1)) * 100)}%`,
                      background: s.avgDays > 14 ? '#EF4444' : s.avgDays > 7 ? '#F59E0B' : '#10B981',
                    }} />
                  </div>
                </div>
              ))}
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '8px 0 0' }}>
                🔴 &gt;14 days = bottleneck · 🟡 7-14 days = watch · 🟢 &lt;7 days = healthy
              </p>
            </div>
          ) : <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>Insufficient data — move more candidates through stages to see averages</div>}
        </div>
      </div>

      {/* ── SOURCE EFFECTIVENESS ── */}
      <div style={panel}>
        <p style={S.label}>🎯 Source Effectiveness — Where Your Best Hires Come From</p>
        {sourceData?.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Source', 'Applications', 'Shortlisted', 'Hired', 'Shortlist %', 'Hire %'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sourceData.map(s => (
                  <tr key={s.source} style={{ borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: SOURCE_COLORS[s.source] || '#94A3B8', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{SOURCE_LABELS[s.source] || s.source}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{s.applications.toLocaleString()}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#0176D3', fontWeight: 600 }}>{s.shortlisted}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: '#10B981', fontWeight: 700 }}>{s.hired}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: `#0176D310`, color: '#0176D3', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{s.shortlistRate}%</span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: s.hireRate > 10 ? '#10B98115' : s.hireRate > 3 ? '#F59E0B15' : '#EF444415', color: s.hireRate > 10 ? '#10B981' : s.hireRate > 3 ? '#F59E0B' : '#EF4444', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                        {s.hireRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '12px 0 0' }}>
              💡 Focus recruiting budget on sources with the highest Hire % — not just the most applications.
            </p>
          </div>
        ) : <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>No source data available yet</div>}
      </div>
    </div>
  );
}
