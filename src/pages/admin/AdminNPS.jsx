import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnG } from '../../constants/styles.js';

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

const npsColor = (n) => {
  if (n === null || n === undefined) return '#9CA3AF';
  if (n >= 50) return '#059669';
  if (n >= 0)  return '#0176D3';
  return '#DC2626';
};

const npsLabel = (n) => {
  if (n === null || n === undefined) return '—';
  if (n >= 70) return 'World Class';
  if (n >= 50) return 'Excellent';
  if (n >= 30) return 'Great';
  if (n >= 0)  return 'Good';
  return 'Needs Work';
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
  const [data, setData]       = useState(null);
  const [loading, setLoad]    = useState(true);
  const [startDate, setStart] = useState('');
  const [endDate, setEnd]     = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const load = (s, e) => {
    setLoad(true);
    const params = {};
    if (s) params.startDate = s;
    if (e) params.endDate   = e;
    api.getNpsStats(params)
      .then(r => { setData(r?.data || r); setLoad(false); })
      .catch(() => setLoad(false));
  };

  useEffect(() => { load('', ''); }, []);

  const inp = { padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: 12, background: '#fff' };

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>Loading NPS data…</div>;
  if (!data)   return <div style={{ padding: 48, textAlign: 'center', color: '#9CA3AF' }}>No NPS data available.</div>;

  const nps         = data.npsScore;
  const promoters   = data.promoters  ?? 0;
  const passives    = data.passives   ?? 0;
  const detractors  = data.detractors ?? 0;
  const total       = data.totalResponses ?? 0;
  const sent        = data.totalSent ?? total;
  const responseRate = sent > 0 ? Math.round((total / sent) * 100) : null;
  const avgAll      = data.avgScoreMonth ?? data.avgScore ?? null;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Candidate NPS Dashboard</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Hiring experience scores from candidates</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" style={inp} value={startDate} onChange={e => setStart(e.target.value)} />
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>to</span>
          <input type="date" style={inp} value={endDate} onChange={e => setEnd(e.target.value)} />
          <button style={{ background: '#0176D3', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }} onClick={() => load(startDate, endDate)}>Apply</button>
          {(startDate || endDate) && <button style={btnG} onClick={() => { setStart(''); setEnd(''); load('', ''); }}>Clear</button>}
        </div>
      </div>

      {total === 0 ? (
        /* Empty state — no NPS responses yet */
        <div style={{ ...card, textAlign: 'center', padding: '48px 32px', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#374151', marginBottom: 8 }}>No NPS responses yet</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            NPS surveys are sent automatically to candidates after they are hired or rejected.
            Data appears here as candidates respond.
          </div>
          <button onClick={async () => {
            setSeeding(true); setSeedMsg('');
            try {
              const r = await api.seedNPS();
              if (r?.success === false) setSeedMsg(r.message || 'No NPS data could be generated for this organization.');
              else load('', '');
            } catch (e) { setSeedMsg(e?.message || 'Failed to generate NPS data.'); }
            setSeeding(false);
          }} disabled={seeding}
            style={{ marginTop: 20, padding: '10px 22px', borderRadius: 10, border: '1px dashed #0176D3', background: '#EFF6FF', color: '#1D4ED8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {seeding ? 'Generating from your hires & applications…' : '📥 Generate NPS Data from Recent Activity'}
          </button>
          {seedMsg && <div style={{ marginTop: 12, fontSize: 12, color: '#DC2626' }}>{seedMsg}</div>}
        </div>
      ) : (
        <>
          {/* NPS Score — the headline metric */}
          {nps !== null && (
            <div style={{ ...card, padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: npsColor(nps), lineHeight: 1 }}>{nps > 0 ? `+${nps}` : nps}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 4 }}>Net Promoter Score</div>
                <div style={{ fontSize: 12, color: npsColor(nps), fontWeight: 600, marginTop: 2 }}>{npsLabel(nps)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>NPS = % Promoters (9–10) − % Detractors (0–6)</div>
                {[
                  { label: 'Promoters (9–10)', count: promoters, color: '#059669', bg: '#D1FAE5' },
                  { label: 'Passives (7–8)',   count: passives,  color: '#D97706', bg: '#FEF3C7' },
                  { label: 'Detractors (0–6)', count: detractors,color: '#DC2626', bg: '#FEE2E2' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, color: '#374151', fontWeight: 500 }}>{row.label}</div>
                    <span style={{ background: row.bg, color: row.color, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{row.count}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 34, textAlign: 'right' }}>{total > 0 ? Math.round((row.count / total) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
              {responseRate !== null && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#7C3AED' }}>{responseRate}%</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 4 }}>Response Rate</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{total} of {sent} surveys</div>
                </div>
              )}
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard label="Total Responses" value={total} color="#0176D3" />
            <StatCard label="Avg Score (This Month)" value={avgAll != null ? `${avgAll}/10` : '—'} sub={scoreLabel(parseFloat(avgAll))} color={scoreColor(parseFloat(avgAll))} />
            <StatCard label="Avg Score (Hired)" value={data.avgScoreHired != null ? `${data.avgScoreHired}/10` : '—'} sub="Hired candidates" color={scoreColor(parseFloat(data.avgScoreHired))} />
            <StatCard label="Avg Score (Rejected)" value={data.avgScoreRejected != null ? `${data.avgScoreRejected}/10` : '—'} sub="Rejected candidates" color={scoreColor(parseFloat(data.avgScoreRejected))} />
          </div>
        </>
      )}

      {/* What NPS means */}
      <div style={{ ...card, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: '#1e40af', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {[['World Class', '70+', '#059669'], ['Excellent', '50–69', '#059669'], ['Great', '30–49', '#0176D3'], ['Good', '0–29', '#0176D3'], ['Needs Work', '< 0', '#DC2626']].map(([l, r, c]) => (
            <span key={l}><strong style={{ color: c }}>{l}</strong>: NPS {r}</span>
          ))}
        </div>
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
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>{f.applicationOutcome === 'hired' ? '🏆 Hired' : '📩 Rejected'}</span>
                    <span>{f.respondedAt ? new Date(f.respondedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                    {f.score != null && <span style={{ fontWeight: 700, color: scoreColor(f.score) }}>{scoreLabel(f.score)}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
