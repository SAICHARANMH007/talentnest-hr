import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'middle' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  stars: { display: 'flex', gap: 3 },
  stageColor: { Shortlisted: '#a78bfa', 'Interview Round 1': '#0176D3', 'Interview Round 2': '#7c3aed', Offer: '#F59E0B', Hired: '#34d399', Rejected: '#BA0517' },
};

function StarRating({ rating, onRate }) {
  return (
    <div style={S.stars}>
      {[1,2,3,4,5].map(r => (
        <button key={r} onClick={() => onRate?.(r)} style={{ background: 'none', border: 'none', cursor: onRate ? 'pointer' : 'default', fontSize: 16, color: rating >= r ? '#F59E0B' : '#DDDBDA', padding: '0 1px' }}>★</button>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return <tr>{[1,2,3,4,5,6].map(i => <td key={i} style={S.td}><div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '70%' }} /></td>)}</tr>;
}

export default function ClientShortlists({ user }) {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [toast,   setToast]   = useState('');
  const [ratings, setRatings] = useState({});
  const [savingId,setSavingId]= useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.getApplications({ limit: 500 })
      .then(r => {
        const arr = Array.isArray(r) ? r : (r?.data || []);
        const sl  = arr.filter(a => ['Shortlisted','Interview Round 1','Interview Round 2','Offer','Hired'].includes(a.currentStage));
        setApps(sl);
        const rMap = {};
        sl.forEach(a => { if (a.clientRating) rMap[a.id || a._id] = a.clientRating; });
        setRatings(rMap);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRate = async (appId, rating) => {
    setRatings(p => ({ ...p, [appId]: rating }));
    setSavingId(appId);
    try {
      await api.addFeedback(appId, { rating, comment: '' });
      setToast('✅ Rating saved');
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSavingId('');
  };

  const handleApprove = async (appId) => {
    setSavingId(appId);
    try {
      await api.updateStage(appId, 'Interview Round 1', 'Approved by client');
      setToast('✅ Candidate approved — moved to Interview');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSavingId('');
  };

  const handleReject = async (appId) => {
    setSavingId(appId);
    try {
      await api.updateStage(appId, 'Rejected', 'Rejected by client');
      setToast('✅ Candidate rejected');
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSavingId('');
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="🌟 Shortlists" subtitle="Review and rate shortlisted candidates" />

      {error && <div style={{ ...card, color: '#BA0517', marginBottom: 16 }}>❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button></div>}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','Match','Stage','Your Rating','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3,4].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : apps.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌟</div>
            <div style={{ fontWeight: 600 }}>No shortlisted candidates yet</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Candidates will appear here once your recruiter shortlists them</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','Match %','Stage','Your Rating','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {apps.map(a => {
                const appId = a.id || a._id?.toString();
                const cName = a.candidateId?.name || a.candidate?.name || 'Candidate';
                const jTitle = a.jobId?.title || '—';
                const score = a.aiMatchScore || 0;
                const isSaving = savingId === appId;
                const rating = ratings[appId] || a.rating || 0;
                return (
                  <tr key={appId}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{cName}</div>
                      {a.candidateId?.email && <div style={{ fontSize: 11, color: '#706E6B' }}>{a.candidateId.email}</div>}
                    </td>
                    <td style={S.td}>{jTitle}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 700, color: score >= 70 ? '#34d399' : score >= 50 ? '#F59E0B' : '#BA0517' }}>{score}%</div>
                    </td>
                    <td style={S.td}><Badge label={a.currentStage || '—'} color={S.stageColor[a.currentStage] || '#706E6B'} /></td>
                    <td style={S.td}>
                      <StarRating rating={rating} onRate={r => handleRate(appId, r)} />
                      {isSaving && <span style={{ fontSize: 11, color: '#706E6B', marginTop: 4, display: 'block' }}>Saving…</span>}
                    </td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {a.currentStage === 'Shortlisted' && (
                          <>
                            <button onClick={() => handleApprove(appId)} disabled={isSaving} style={{ ...btnP, fontSize: 12 }}>Approve</button>
                            <button onClick={() => handleReject(appId)} disabled={isSaving} style={{ ...btnD, fontSize: 12 }}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
