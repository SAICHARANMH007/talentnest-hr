import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
};

const FORMAT_ICON = { video: '📹', phone: '📞', in_person: '🏢' };

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function SkeletonRow() {
  return <tr>{[1,2,3,4,5].map(i => <td key={i} style={S.td}><div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '70%' }} /></td>)}</tr>;
}

const EMPTY_FEEDBACK = { rating: 3, strengths: '', weaknesses: '', recommendation: 'hold', notes: '' };

export default function ClientInterviews({ user }) {
  const [interviews, setInterviews] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedback,       setFeedback]       = useState(EMPTY_FEEDBACK);
  const [submitting,     setSubmitting]      = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.getApplications({})
      .then(r => {
        const arr = Array.isArray(r) ? r : (r?.data || []);
        const all = [];
        arr.forEach(app => {
          (app.interviewRounds || []).forEach((round, idx) => {
            all.push({ app, round, idx });
          });
        });
        setInterviews(all);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sf = (k, v) => setFeedback(p => ({ ...p, [k]: v }));

  const handleSubmitFeedback = async () => {
    if (!feedbackTarget) return;
    setSubmitting(true);
    try {
      await api.submitScorecard(feedbackTarget.app.id || feedbackTarget.app._id, feedbackTarget.idx, feedback);
      setToast('✅ Interview feedback submitted');
      setFeedbackTarget(null);
      setFeedback(EMPTY_FEEDBACK);
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSubmitting(false);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="📅 Interviews" subtitle="Review your scheduled interviews and provide feedback" />

      {error && <div style={{ ...card, color: '#BA0517', marginBottom: 16 }}>❌ {error}</div>}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','Round','Date','Format','Feedback'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : interviews.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
            <div style={{ fontWeight: 600 }}>No interviews scheduled yet</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','Round','Date','Format','Feedback'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {interviews.map(({ app, round, idx }) => {
                const cName = app.candidateId?.name || 'Candidate';
                const jTitle = app.jobId?.title || '—';
                const hasFeedback = round.feedback?.submittedBy;
                const isPast = round.scheduledAt && new Date(round.scheduledAt) <= new Date();
                return (
                  <tr key={`${app.id}-${idx}`}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={S.td}><div style={{ fontWeight: 600 }}>{cName}</div></td>
                    <td style={S.td}>{jTitle}</td>
                    <td style={S.td}>Round {idx + 1}</td>
                    <td style={S.td}><div style={{ whiteSpace: 'nowrap', color: isPast ? '#706E6B' : '#0176D3' }}>{fmt(round.scheduledAt)}</div></td>
                    <td style={S.td}>{FORMAT_ICON[round.format] || '—'} {round.format}</td>
                    <td style={S.td}>
                      {hasFeedback ? (
                        <Badge label="Submitted" color="#34d399" />
                      ) : isPast ? (
                        <button onClick={() => { setFeedbackTarget({ app, idx }); setFeedback(EMPTY_FEEDBACK); }} style={{ ...btnP, fontSize: 12 }}>Add Feedback</button>
                      ) : (
                        <span style={{ color: '#9E9D9B', fontSize: 12 }}>After interview</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {feedbackTarget && (
        <Modal title={`📊 Interview Feedback — Round ${feedbackTarget.idx + 1}`} onClose={() => setFeedbackTarget(null)} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setFeedbackTarget(null)} style={btnG}>Cancel</button>
            <button onClick={handleSubmitFeedback} disabled={submitting} style={btnP}>{submitting ? 'Saving…' : 'Submit Feedback'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 8 }}>RATING</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(r => (
                  <button key={r} onClick={() => sf('rating', r)} style={{ width: 40, height: 40, borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer', border: feedback.rating >= r ? '2px solid #F59E0B' : '1px solid #EAF5FE', background: feedback.rating >= r ? 'rgba(245,158,11,0.15)' : '#fff', color: feedback.rating >= r ? '#F59E0B' : '#9E9D9B' }}>★</button>
                ))}
              </div>
            </div>
            <Field label="Strengths" value={feedback.strengths} onChange={v => sf('strengths', v)} type="textarea" placeholder="What impressed you?" />
            <Field label="Concerns" value={feedback.weaknesses} onChange={v => sf('weaknesses', v)} type="textarea" placeholder="Any concerns or areas to probe further?" />
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>RECOMMENDATION</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['proceed','✅ Proceed'],['hold','⏸ Hold'],['reject','❌ Reject']].map(([v, l]) => (
                  <button key={v} onClick={() => sf('recommendation', v)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: feedback.recommendation === v ? '2px solid #0176D3' : '1px solid #EAF5FE', background: feedback.recommendation === v ? 'rgba(1,118,211,0.1)' : '#fff', color: feedback.recommendation === v ? '#0176D3' : '#706E6B' }}>{l}</button>
                ))}
              </div>
            </div>
            <Field label="Additional Notes" value={feedback.notes} onChange={v => sf('notes', v)} type="textarea" />
          </div>
        </Modal>
      )}
    </div>
  );
}
