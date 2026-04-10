import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import KpiCard from '../../components/charts/KpiCard.jsx';
import HorizBar from '../../components/charts/HorizBar.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import { card, btnG, inp } from '../../constants/styles.js';

const STAGE_COLOR = {
  Applied: '#64748b', Screening: '#0176D3', Shortlisted: '#7C3AED',
  'Interview Round 1': '#F59E0B', 'Interview Round 2': '#a78bfa',
  'Technical Interview': '#0369A1', Offer: '#059669', Hired: '#2E844A', Rejected: '#e53e3e',
};

function scoreColor(s) {
  if (s >= 75) return '#34d399';
  if (s >= 50) return '#F59E0B';
  return '#BA0517';
}

export default function HiringManagerDashboard({ user }) {
  const navigate = useNavigate();
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // recent | score | name

  useEffect(() => {
    api.getApplications({ limit: 200 })
      .then(r => setApps(Array.isArray(r) ? r : (r?.data || [])))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = apps
    .filter(a => {
      if (stageFilter && (a.currentStage || a.stage) !== stageFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (a.candidateId?.name || a.candidate?.name || '').toLowerCase().includes(q) ||
        (a.jobId?.title || a.job?.title || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.aiMatchScore || 0) - (a.aiMatchScore || 0);
      if (sortBy === 'name') return (a.candidateId?.name || '').localeCompare(b.candidateId?.name || '');
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  const totalApps = apps.length;
  const inInterview = apps.filter(a => (a.currentStage || '').toLowerCase().includes('interview')).length;
  const offerCount  = apps.filter(a => ['Offer', 'Hired'].includes(a.currentStage)).length;
  const hiredCount  = apps.filter(a => a.currentStage === 'Hired').length;
  const rejectedCount = apps.filter(a => a.currentStage === 'Rejected').length;

  // Stage distribution for donut
  const stageKeys = Object.keys(STAGE_COLOR);
  const stageCounts = stageKeys.map(s => ({
    label: s, value: apps.filter(a => (a.currentStage || a.stage) === s).length,
    color: STAGE_COLOR[s],
  })).filter(s => s.value > 0);

  // Avg AI score
  const scored = apps.filter(a => a.aiMatchScore > 0);
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, a) => s + a.aiMatchScore, 0) / scored.length) : 0;

  // Upcoming interviews (next 7 days)
  const today = new Date(); today.setHours(0,0,0,0);
  const in7   = new Date(today.getTime() + 7 * 86400000);
  const upcoming = apps
    .filter(a => {
      const lastRound = Array.isArray(a.interviewRounds) && a.interviewRounds.length
        ? a.interviewRounds[a.interviewRounds.length - 1] : null;
      if (!lastRound?.scheduledAt) return false;
      const d = new Date(lastRound.scheduledAt);
      return d >= today && d <= in7;
    })
    .map(a => {
      const lastRound = a.interviewRounds[a.interviewRounds.length - 1];
      return { ...a, nextRound: lastRound, nextDate: new Date(lastRound.scheduledAt) };
    })
    .sort((a, b) => a.nextDate - b.nextDate);

  const allStages = [...new Set(apps.map(a => a.currentStage || a.stage).filter(Boolean))];

  return (
    <div style={{ animation: 'tn-fadein 0.3s ease both' }}>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'Hiring Manager'} 👋`}
        subtitle={`View-only hiring overview · ${totalApps} total candidates`}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
        <KpiCard icon="👤" label="Total Candidates"   value={totalApps}      color="#0176D3" sparkValues={[0, 2, 4, totalApps > 4 ? totalApps - 3 : 0, totalApps]} />
        <KpiCard icon="📅" label="In Interview"        value={inInterview}    color="#F59E0B" />
        <KpiCard icon="🤝" label="Offers Extended"     value={offerCount}     color="#059669" />
        <KpiCard icon="🎊" label="Hired"               value={hiredCount}     color="#2E844A" />
        <KpiCard icon="🤖" label="Avg AI Score"        value={avgScore > 0 ? `${avgScore}%` : '—'} color={scoreColor(avgScore)} sub="match quality" />
      </div>

      {/* Two-col: stage donut + upcoming interviews */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>

        <div style={{ ...card }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', margin: '0 0 16px', letterSpacing: 1 }}>📊 PIPELINE BREAKDOWN</p>
          {stageCounts.length > 0 ? (
            <>
              <DonutChart segments={stageCounts} size={120} />
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stageCounts.map(s => (
                  <HorizBar key={s.label} label={s.label} value={s.value} max={totalApps} color={s.color} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9E9D9B', fontSize: 13 }}>No pipeline data yet</div>
          )}
        </div>

        <div style={{ ...card }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', margin: '0 0 16px', letterSpacing: 1 }}>⏰ UPCOMING INTERVIEWS (7 DAYS)</p>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9E9D9B', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              No interviews scheduled in the next 7 days
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcoming.slice(0, 6).map(a => {
                const name = a.candidateId?.name || a.candidate?.name || 'Candidate';
                const job  = a.jobId?.title || a.job?.title || '—';
                const round = a.nextRound;
                const dateStr = a.nextDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
                const timeStr = a.nextDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={a.id || a._id} style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#181818' }}>{name}</div>
                        <div style={{ fontSize: 11, color: '#706E6B', marginTop: 1 }}>{job}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>{dateStr}</div>
                        <div style={{ fontSize: 11, color: '#706E6B' }}>{timeStr}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <Badge label={round.format === 'video' ? '📹 Video' : round.format === 'phone' ? '📞 Phone' : '🏢 In-Person'} color="#F59E0B" />
                      {round.interviewerName && <Badge label={`👤 ${round.interviewerName}`} color="#64748b" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="🔍 Search by name or job title…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, minWidth: 220, maxWidth: 320 }}
        />
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ ...inp, width: 180 }}>
          <option value="">All Stages</option>
          {allStages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inp, width: 160 }}>
          <option value="recent">Sort: Recent</option>
          <option value="score">Sort: AI Score</option>
          <option value="name">Sort: Name A–Z</option>
        </select>
        <span style={{ marginLeft: 'auto', color: '#706E6B', fontSize: 12 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Candidate Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px', color: '#706E6B' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
          <div style={{ fontWeight: 600 }}>No candidates match your filters</div>
        </div>
      ) : (
        <div style={{ ...card, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Candidate', 'Job', 'Stage', 'AI Score', 'Last Updated'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const name    = a.candidateId?.name || a.candidate?.name || 'Unknown';
                const email   = a.candidateId?.email || a.candidate?.email || '';
                const jobTitle = a.jobId?.title || a.job?.title || '—';
                const stage   = a.currentStage || a.stage || 'Applied';
                const score   = a.aiMatchScore || 0;
                const movedAt = a.stageHistory?.slice(-1)[0]?.movedAt || a.updatedAt || a.createdAt;
                return (
                  <tr key={a.id || a._id}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #F3F2F2', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#181818' }}>{name}</div>
                      {email && <div style={{ fontSize: 11, color: '#706E6B', marginTop: 1 }}>{email}</div>}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #F3F2F2', fontSize: 13, color: '#181818' }}>{jobTitle}</td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #F3F2F2' }}>
                      <span style={{ background: STAGE_COLOR[stage] || '#64748b', color: '#fff', padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{stage}</span>
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #F3F2F2' }}>
                      {score > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, maxWidth: 80, background: '#F3F2F2', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                            <div style={{ width: `${score}%`, height: '100%', background: scoreColor(score), borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(score), minWidth: 32 }}>{score}%</span>
                        </div>
                      ) : <span style={{ color: '#9E9D9B', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', borderBottom: '1px solid #F3F2F2', fontSize: 12, color: '#706E6B' }}>
                      {movedAt ? new Date(movedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
