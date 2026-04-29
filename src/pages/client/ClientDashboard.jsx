import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import KpiCard from '../../components/charts/KpiCard.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import { card, btnG } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const STAGE_COLOR = {
  Applied: '#64748b', Screening: '#0176D3', Shortlisted: '#7C3AED',
  'Interview Round 1': '#F59E0B', 'Interview Round 2': '#a78bfa',
  Offer: '#059669', Hired: '#2E844A', Rejected: '#e53e3e',
};

function scoreColor(s) {
  if (s >= 75) return '#34d399';
  if (s >= 50) return '#F59E0B';
  return '#BA0517';
}

export default function ClientDashboard({ user }) {
  const navigate = useNavigate();
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.getApplications({ limit: 500 })
      .then(r => setApps(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const shortlisted = apps.filter(a => ['Shortlisted','Interview Round 1','Interview Round 2','Technical Interview'].includes(a.currentStage));
  const offers      = apps.filter(a => a.currentStage === 'Offer');
  const hired       = apps.filter(a => a.currentStage === 'Hired');
  const active      = apps.filter(a => !['Hired','Rejected'].includes(a.currentStage));
  const total       = apps.length;

  const avgScore    = apps.filter(a => a.aiMatchScore > 0).reduce((s, a, _, arr) => s + a.aiMatchScore / arr.length, 0);

  // Stage breakdown for bar chart
  const stageData = Object.entries(STAGE_COLOR).map(([s, color]) => ({
    label: s, value: apps.filter(a => a.currentStage === s).length, color,
  })).filter(s => s.value > 0);

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease both' }}>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Client'} 🏢`}
        subtitle="Your recruitment pipeline overview"
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner /></div>
      ) : error ? (
        <div style={{ color: '#BA0517', padding: 20 }}>❌ {error}</div>
      ) : (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
            <KpiCard icon="📋" label="Total Applications" value={total}            color="#0176D3" sparkValues={[0, 1, 2, total > 3 ? total - 2 : 0, total]} />
            <KpiCard icon="⭐" label="Shortlisted"        value={shortlisted.length} color="#7C3AED" />
            <KpiCard icon="📄" label="Offers Extended"    value={offers.length}     color="#059669" />
            <KpiCard icon="🎊" label="Hired"              value={hired.length}      color="#2E844A" trend={hired.length > 0 ? 100 : 0} />
            <KpiCard icon="🤖" label="Avg AI Score"       value={avgScore > 0 ? `${Math.round(avgScore)}%` : '—'} color={scoreColor(avgScore)} sub="match quality" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>

            {/* Pipeline funnel */}
            <div style={{ ...card }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', margin: '0 0 16px', letterSpacing: 1 }}>📊 PIPELINE STAGES</p>
              {stageData.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageData.map(s => (
                    <HorizBar key={s.label} label={s.label} value={s.value} max={total || 1} color={s.color} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9D9B', fontSize: 13 }}>No pipeline data yet</div>
              )}
            </div>

            {/* Top shortlisted candidates */}
            <div style={{ ...card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', margin: 0, letterSpacing: 1 }}>⭐ TOP SHORTLISTED</p>
                <button onClick={() => navigate('/app/shortlists')} style={{ ...btnG, padding: '4px 10px', fontSize: 11 }}>View All →</button>
              </div>
              {shortlisted.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9E9D9B', fontSize: 13 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                  No shortlisted candidates yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shortlisted
                    .sort((a, b) => (b.aiMatchScore || 0) - (a.aiMatchScore || 0))
                    .slice(0, 6)
                    .map(a => {
                      const name   = a.candidateId?.name || a.candidate?.name || 'Candidate';
                      const jTitle = a.jobId?.title || a.job?.title || '—';
                      const score  = a.aiMatchScore || 0;
                      return (
                        <div key={a.id || a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #F3F2F2' }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5b21b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                            {name[0]?.toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#181818', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            <div style={{ fontSize: 11, color: '#706E6B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jTitle}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: scoreColor(score) }}>{score > 0 ? `${score}%` : '—'}</div>
                            <div style={{ fontSize: 10, color: '#706E6B' }}>{a.currentStage}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Hires */}
          {hired.length > 0 && (
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#2E844A', margin: '0 0 14px', letterSpacing: 1 }}>🎊 RECENT HIRES</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {hired.slice(0, 5).map(a => {
                  const name   = a.candidateId?.name || a.candidate?.name || 'Candidate';
                  const jTitle = a.jobId?.title || a.job?.title || '—';
                  const hiredAt = a.stageHistory?.filter(s => s.stage === 'Hired').slice(-1)[0]?.movedAt;
                  return (
                    <div key={a.id || a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(52,211,153,0.06)', borderRadius: 10, border: '1px solid rgba(52,211,153,0.2)' }}>
                      <span style={{ fontSize: 20 }}>🎊</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{name}</div>
                        <div style={{ fontSize: 11, color: '#706E6B' }}>{jTitle}</div>
                      </div>
                      {hiredAt && <div style={{ fontSize: 11, color: '#706E6B', flexShrink: 0 }}>{new Date(hiredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
