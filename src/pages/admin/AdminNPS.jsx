import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card } from '../../constants/styles.js';

const scoreColor = (s) => {
  if (s === null || s === undefined) return '#9CA3AF';
  if (s >= 8) return '#059669';
  if (s >= 6) return '#0176D3';
  if (s >= 4) return '#D97706';
  return '#DC2626';
};

const scoreLabel = (s) => {
  if (s === null || s === undefined) return '—';
  if (s >= 9) return 'Excellent';
  if (s >= 7) return 'Good';
  if (s >= 5) return 'Average';
  return 'Poor';
};

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || '#0A1628' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminNPS() {
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    api.getNpsStats()
      .then(r => { setData(r?.data || r); setLoad(false); })
      .catch(() => setLoad(false));
  }, []);

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Loading NPS data…</div>;
  if (!data)   return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>No NPS data available.</div>;

  const avgAll = data.avgScoreMonth ?? data.avgScore ?? null;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Candidate NPS Dashboard</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Hiring experience scores from candidates</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Responses" value={data.totalResponses} color="#0176D3" />
        <StatCard label="Avg Score (Month)" value={avgAll != null ? `${avgAll}/10` : '—'} sub={scoreLabel(avgAll)} color={scoreColor(parseFloat(avgAll))} />
        <StatCard label="Avg Score (Hired)" value={data.avgScoreHired != null ? `${data.avgScoreHired}/10` : '—'} sub="Hired candidates" color={scoreColor(parseFloat(data.avgScoreHired))} />
        <StatCard label="Avg Score (Rejected)" value={data.avgScoreRejected != null ? `${data.avgScoreRejected}/10` : '—'} sub="Rejected candidates" color={scoreColor(parseFloat(data.avgScoreRejected))} />
      </div>

      {/* Recent feedback */}
      <div style={{ ...card }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A1628', margin: '0 0 16px' }}>Recent Feedback</h2>
        {(data.recentFeedback || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#9CA3AF' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            No feedback received yet.
          </div>
        ) : (
          (data.recentFeedback || []).map((f, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: i < data.recentFeedback.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {f.score != null && (
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: `${scoreColor(f.score)}15`,
                    border: `2px solid ${scoreColor(f.score)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 16, color: scoreColor(f.score),
                  }}>
                    {f.score}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: '#0A1628', lineHeight: 1.5 }}>"{f.feedbackText}"</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, display: 'flex', gap: 12 }}>
                    <span>{f.applicationOutcome === 'hired' ? '🏆 Hired' : '📩 Rejected'}</span>
                    <span>{f.respondedAt ? new Date(f.respondedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                  </div>
                </div>
                {f.score != null && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor(f.score), flexShrink: 0 }}>{scoreLabel(f.score)}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
