import { useState, useEffect } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 },
  kpi: { background: '#fff', border: '1px solid #EAF5FE', borderRadius: 14, padding: '18px 20px' },
  kpiNum: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: '#706E6B', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function SkeletonRow() {
  return <tr>{[1,2,3,4].map(i => <td key={i} style={S.td}><div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '70%' }} /></td>)}</tr>;
}

export default function ClientPlacements({ user }) {
  const [placements, setPlacements] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    setLoading(true);
    api.getApplications({ stage: 'Hired' })
      .then(r => {
        const arr = Array.isArray(r) ? r : (r?.data || []);
        setPlacements(arr.filter(a => a.currentStage === 'Hired'));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const thisMonth = placements.filter(p => {
    const d = new Date(p.updatedAt || p.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div>
      <PageHeader title="🏆 Placements" subtitle="Your full placement history" />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
      ) : error ? (
        <div style={{ color: '#BA0517', padding: 20 }}>❌ {error}</div>
      ) : (
        <>
          <div style={S.kpiGrid}>
            {[
              ['Total Placements', placements.length, '#34d399'],
              ['This Month', thisMonth, '#0176D3'],
            ].map(([label, val, color]) => (
              <div key={label} style={S.kpi}>
                <div style={{ ...S.kpiNum, color }}>{val}</div>
                <div style={S.kpiLabel}>{label}</div>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#032D60', marginBottom: 14 }}>🏆 Placement History</div>
            {placements.length === 0 ? (
              <div style={S.empty}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
                <div style={{ fontWeight: 600 }}>No placements yet</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Hired candidates will appear here</div>
              </div>
            ) : (
              <table style={S.table}>
                <thead><tr>{['Candidate','Role','Match Score','Hired Date'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {placements.map(p => {
                    const cName = p.candidateId?.name || 'Candidate';
                    const jTitle = p.jobId?.title || '—';
                    const score = p.aiMatchScore || 0;
                    return (
                      <tr key={p.id || p._id}
                        onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                        onMouseLeave={e => e.currentTarget.style.background=''}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600 }}>{cName}</div>
                          {p.candidateId?.email && <div style={{ fontSize: 11, color: '#706E6B' }}>{p.candidateId.email}</div>}
                        </td>
                        <td style={S.td}>{jTitle}</td>
                        <td style={S.td}>
                          <div style={{ fontWeight: 700, color: score >= 70 ? '#34d399' : score >= 50 ? '#F59E0B' : '#BA0517' }}>{score}%</div>
                          {p.matchBreakdown && (
                            <div style={{ fontSize: 10, color: '#9E9D9B', marginTop: 2 }}>
                              Skills {p.matchBreakdown.skillScore}% · Exp {p.matchBreakdown.experienceScore}%
                            </div>
                          )}
                        </td>
                        <td style={S.td}>{fmt(p.updatedAt || p.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
