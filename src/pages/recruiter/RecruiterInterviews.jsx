import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Field from '../../components/ui/Field.jsx';
import { btnP, btnG, btnD, card, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

// ── Styles outside component ───────────────────────────────────────────────────
const S = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#706E6B', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #F3F2F2' },
  td: { padding: '12px 14px', fontSize: 13, color: '#181818', borderBottom: '1px solid #F3F2F2', verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: '60px 24px', color: '#706E6B', fontSize: 14 },
  filters: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' },
  sectionHead: { fontWeight: 700, fontSize: 13, color: '#032D60', marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #EAF5FE' },
};

const FORMAT_LABELS = { video: '📹 Video', phone: '📞 Phone', in_person: '🏢 In Person' };

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}
function isUpcoming(dt) { return dt && new Date(dt) > new Date(); }
function isPast(dt) { return dt && new Date(dt) <= new Date(); }

function SkeletonRow() {
  return (
    <tr>{[1,2,3,4,5,6].map(i => (
      <td key={i} style={S.td}>
        <div className="tn-skeleton" style={{ height: 14, borderRadius: 6, width: '70%' }} />
      </td>
    ))}</tr>
  );
}

const SCORECARD_EMPTY = { rating: 3, technicalScore: 70, communicationScore: 70, problemSolvingScore: 70, cultureFitScore: 70, strengths: '', weaknesses: '', recommendation: 'hold', notes: '' };

export default function RecruiterInterviews({ user }) {
  const [apps,      setApps]     = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState('');
  const [toast,     setToast]    = useState('');
  const [tab,       setTab]      = useState('upcoming'); // upcoming | past
  const [schedApp,  setSchedApp] = useState(null); // app to schedule interview for
  const [scorecardApp, setScorecardApp] = useState(null); // { app, roundIndex }
  const [schedForm, setSchedForm] = useState({ date: '', time: '', format: 'video', interviewerName: '', interviewerEmail: '', videoLink: '', notes: '' });
  const [scorecard, setScorecard] = useState(SCORECARD_EMPTY);
  const [submitting,setSubmitting]= useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.getApplications({})
      .then(r => setApps(Array.isArray(r) ? r : (r?.data || [])))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Flatten all interview rounds
  const allInterviews = [];
  apps.forEach(app => {
    (app.interviewRounds || []).forEach((round, idx) => {
      allInterviews.push({ app, round, idx });
    });
  });
  const upcoming = allInterviews.filter(({ round }) => isUpcoming(round.scheduledAt));
  const past     = allInterviews.filter(({ round }) => isPast(round.scheduledAt));
  const displayed = tab === 'upcoming' ? upcoming : past;

  // Apps in Interview stages with no rounds yet
  // normalizeApp() maps DB title-case → frontend slug in a.stage; never use a.currentStage in UI
  const interviewApps = apps.filter(a =>
    ['interview_scheduled', 'interview_completed', 'shortlisted'].includes(a.stage) &&
    (!a.interviewRounds || a.interviewRounds.length === 0)
  );

  const sf = (k, v) => setSchedForm(p => ({ ...p, [k]: v }));
  const sc = (k, v) => setScorecard(p => ({ ...p, [k]: v }));

  const handleSchedule = async () => {
    if (!schedForm.date || !schedForm.time) { setToast('❌ Date and time are required'); return; }
    setSubmitting(true);
    try {
      await api.scheduleInterview(schedApp.id || schedApp._id, schedForm);
      setToast('✅ Interview scheduled — calendar invite sent');
      setSchedApp(null);
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSubmitting(false);
  };

  const handleScorecard = async () => {
    setSubmitting(true);
    try {
      await api.submitScorecard(scorecardApp.app.id || scorecardApp.app._id, scorecardApp.idx, scorecard);
      setToast('✅ Scorecard saved');
      setScorecardApp(null);
      setScorecard(SCORECARD_EMPTY);
      load();
    } catch (e) { setToast(`❌ ${e.message}`); }
    setSubmitting(false);
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />
      <PageHeader title="📅 Interviews" subtitle="Schedule and manage interviews" />

      {/* Pending schedule */}
      {interviewApps.length > 0 && (
        <div style={{ ...card, marginBottom: 20, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
          <div style={S.sectionHead}>⚠️ {interviewApps.length} Application{interviewApps.length > 1 ? 's' : ''} Awaiting Interview Schedule</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {interviewApps.map(a => {
              const cName = a.candidateId?.name || a.candidate?.name || 'Candidate';
              const jTitle = a.jobId?.title || '—';
              return (
                <div key={a.id || a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F2F2' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{cName}</div>
                    <div style={{ fontSize: 12, color: '#706E6B' }}>{jTitle} · {a.currentStage}</div>
                  </div>
                  <button onClick={() => setSchedApp(a)} style={btnP}>Schedule Interview</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['upcoming','past'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 18px', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: tab === t ? '#0176D3' : '#F3F2F2', color: tab === t ? '#fff' : '#706E6B' }}>
            {t === 'upcoming' ? `📅 Upcoming (${upcoming.length})` : `📁 Past (${past.length})`}
          </button>
        ))}
      </div>

      {error && <div style={{ ...card, color: '#BA0517', marginBottom: 16 }}>❌ {error} <button onClick={load} style={{ ...btnG, marginLeft: 12 }}>Retry</button></div>}

      <div style={card}>
        {loading ? (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','Round','Date','Format','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
          </table>
        ) : displayed.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'upcoming' ? '📅' : '📁'}</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No {tab} interviews</div>
            <div style={{ fontSize: 12 }}>{tab === 'upcoming' ? 'Schedule interviews for shortlisted candidates above' : 'Past interviews will appear here'}</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Candidate','Job','Round','Date','Format','Actions'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {displayed.map(({ app, round, idx }, i) => {
                const cName = app.candidateId?.name || app.candidate?.name || 'Candidate';
                const jTitle = app.jobId?.title || '—';
                const hasFeedback = round.feedback && round.feedback.submittedBy;
                return (
                  <tr key={`${app.id}-${idx}`}
                    onMouseEnter={e => e.currentTarget.style.background='#FAFAF9'}
                    onMouseLeave={e => e.currentTarget.style.background=''}>
                    <td style={S.td}><div style={{ fontWeight: 600 }}>{cName}</div></td>
                    <td style={S.td}>{jTitle}</td>
                    <td style={S.td}>Round {idx + 1}</td>
                    <td style={S.td}><div style={{ whiteSpace: 'nowrap' }}>{fmt(round.scheduledAt)}</div></td>
                    <td style={S.td}>{FORMAT_LABELS[round.format] || round.format || '—'}</td>
                    <td style={S.td}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {round.videoLink && <a href={/^https?:\/\//i.test(round.videoLink) ? round.videoLink : `https://${round.videoLink}`} target="_blank" rel="noreferrer noopener" style={{ ...btnG, fontSize: 12, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Join</a>}
                        {isPast(round.scheduledAt) && !hasFeedback && (
                          <button onClick={() => { setScorecardApp({ app, idx }); setScorecard(SCORECARD_EMPTY); }} style={{ ...btnP, fontSize: 12 }}>Scorecard</button>
                        )}
                        {hasFeedback && <Badge label="Scored" color="#34d399" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Modal */}
      {schedApp && (
        <Modal title="📅 Schedule Interview" onClose={() => setSchedApp(null)} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setSchedApp(null)} style={btnG}>Cancel</button>
            <button onClick={handleSchedule} disabled={submitting} style={btnP}>{submitting ? 'Scheduling…' : 'Schedule & Send Invite'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...card, background: 'rgba(1,118,211,0.05)', border: '1px solid rgba(1,118,211,0.15)', fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{schedApp.candidateId?.name || schedApp.candidate?.name || 'Candidate'}</span> · {schedApp.jobId?.title || '—'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
              <Field label="Date *" value={schedForm.date} onChange={v => sf('date', v)} type="date" />
              <Field label="Time *" value={schedForm.time} onChange={v => sf('time', v)} type="time" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>FORMAT</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['video','phone','in_person'].map(f => (
                  <button key={f} onClick={() => sf('format', f)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: schedForm.format === f ? '2px solid #0176D3' : '1px solid #EAF5FE', background: schedForm.format === f ? 'rgba(1,118,211,0.1)' : '#fff', color: schedForm.format === f ? '#0176D3' : '#706E6B' }}>
                    {FORMAT_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Interviewer Name" value={schedForm.interviewerName} onChange={v => sf('interviewerName', v)} />
            <Field label="Interviewer Email" value={schedForm.interviewerEmail} onChange={v => sf('interviewerEmail', v)} type="email" />
            {schedForm.format === 'video' && <Field label="Video Call Link" value={schedForm.videoLink} onChange={v => sf('videoLink', v)} placeholder="https://meet.google.com/…" />}
            <Field label="Notes" value={schedForm.notes} onChange={v => sf('notes', v)} type="textarea" placeholder="Preparation notes…" />
          </div>
        </Modal>
      )}

      {/* Scorecard Modal */}
      {scorecardApp && (
        <Modal title={`📊 Scorecard — Round ${scorecardApp.idx + 1}`} onClose={() => setScorecardApp(null)} footer={
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setScorecardApp(null)} style={btnG}>Cancel</button>
            <button onClick={handleScorecard} disabled={submitting} style={btnP}>{submitting ? 'Saving…' : 'Submit Scorecard'}</button>
          </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Rating */}
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 8 }}>OVERALL RATING</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1,2,3,4,5].map(r => (
                  <button key={r} onClick={() => sc('rating', r)} style={{ width: 40, height: 40, borderRadius: 8, fontWeight: 700, fontSize: 16, cursor: 'pointer', border: scorecard.rating >= r ? '2px solid #F59E0B' : '1px solid #EAF5FE', background: scorecard.rating >= r ? 'rgba(245,158,11,0.15)' : '#fff', color: scorecard.rating >= r ? '#F59E0B' : '#9E9D9B' }}>★</button>
                ))}
              </div>
            </div>
            {/* Scores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
              {[['technicalScore','Technical'],['communicationScore','Communication'],['problemSolvingScore','Problem Solving'],['cultureFitScore','Culture Fit']].map(([key, label]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 4 }}>{label.toUpperCase()} — {scorecard[key]}%</label>
                  <input type="range" min={0} max={100} value={scorecard[key]} onChange={e => sc(key, Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              ))}
            </div>
            <Field label="Strengths" value={scorecard.strengths} onChange={v => sc('strengths', v)} type="textarea" placeholder="What went well?" />
            <Field label="Areas for Improvement" value={scorecard.weaknesses} onChange={v => sc('weaknesses', v)} type="textarea" placeholder="Where can they improve?" />
            <div>
              <label style={{ fontSize: 11, color: '#706E6B', fontWeight: 600, display: 'block', marginBottom: 6 }}>RECOMMENDATION</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['proceed','✅ Proceed'],['hold','⏸ Hold'],['reject','❌ Reject']].map(([v, l]) => (
                  <button key={v} onClick={() => sc('recommendation', v)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: scorecard.recommendation === v ? '2px solid #0176D3' : '1px solid #EAF5FE', background: scorecard.recommendation === v ? 'rgba(1,118,211,0.1)' : '#fff', color: scorecard.recommendation === v ? '#0176D3' : '#706E6B' }}>{l}</button>
                ))}
              </div>
            </div>
            <Field label="Notes" value={scorecard.notes} onChange={v => sc('notes', v)} type="textarea" />
          </div>
        </Modal>
      )}
    </div>
  );
}
