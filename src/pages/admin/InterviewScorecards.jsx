import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

const RECOMMEND_LABELS = {
  hire       : { label: '✅ Hire', color: '#059669' },
  no_hire    : { label: '❌ No Hire', color: '#DC2626' },
  maybe      : { label: '🤔 Maybe', color: '#D97706' },
  next_round : { label: '➡️ Next Round', color: '#0176D3' },
  hold       : { label: '⏸ Hold', color: '#6B7280' },
};

function ScoreBar({ label, value, max = 10 }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const color = pct >= 70 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color }}>{value ?? '—'}/{max}</span>
      </div>
      <div style={{ height: 5, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function InterviewScorecards() {
  const [jobs, setJobs]       = useState([]);
  const [jobId, setJobId]     = useState('');
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLJ]  = useState(true);

  useEffect(() => {
    api.getJobs({ limit: 100, status: 'active' })
      .then(r => { setJobs(Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : [])); setLJ(false); })
      .catch(() => setLJ(false));
  }, []);

  const loadScorecards = async (id) => {
    setJobId(id);
    if (!id) { setData([]); return; }
    setLoading(true);
    try {
      const cards = await api.getScorecards(id);
      setData(cards || []);
    } catch { setData([]); }
    setLoading(false);
  };

  const withFeedback = data.filter(a => a.rounds.some(r => r.hasFeedback));
  const pending      = data.filter(a => a.rounds.some(r => !r.hasFeedback));

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Interview Scorecards</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>View all interviewer feedback for a job</p>
      </div>

      {/* Job selector */}
      <div style={{ ...card, marginBottom: 24, padding: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginRight: 12 }}>Select Job:</label>
        {loadingJobs ? (
          <span style={{ color: '#9CA3AF', fontSize: 13 }}>Loading jobs…</span>
        ) : (
          <select value={jobId} onChange={e => loadScorecards(e.target.value)} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 14, minWidth: 280 }}>
            <option value="">— Select a job —</option>
            {jobs.map(j => (
              <option key={j._id || j.id} value={j._id || j.id}>{j.title} {j.company ? `(${j.company})` : ''}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>Loading scorecards…</div>
      ) : jobId && data.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ color: '#9CA3AF', fontSize: 14 }}>No interviews found for this job yet.</div>
        </div>
      ) : data.length > 0 ? (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Candidates', value: data.length },
              { label: 'Interviewed', value: withFeedback.length },
              { label: 'Pending Feedback', value: pending.length },
              { label: 'Hire Recommendations', value: withFeedback.reduce((acc, a) => acc + a.rounds.filter(r => r.feedback?.recommendation === 'hire').length, 0) },
            ].map((s, i) => (
              <div key={i} style={{ ...card, textAlign: 'center', padding: '14px 12px' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0A1628' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Scorecards list */}
          {data.map(app => (
            <div key={String(app.applicationId)} style={{ ...card, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0A1628' }}>{app.candidate}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>Current Stage: {app.currentStage}</div>
                </div>
                <span style={{ fontSize: 12, background: app.rounds.some(r => r.hasFeedback) ? '#D1FAE5' : '#FEF3C7', color: app.rounds.some(r => r.hasFeedback) ? '#065F46' : '#92400E', borderRadius: 20, padding: '4px 12px', fontWeight: 700 }}>
                  {app.rounds.filter(r => r.hasFeedback).length}/{app.rounds.length} scored
                </span>
              </div>

              {app.rounds.length === 0 && (
                <div style={{ color: '#9CA3AF', fontSize: 13 }}>No interview rounds scheduled.</div>
              )}

              {app.rounds.map((r, i) => (
                <div key={i} style={{ background: '#F8FAFC', borderRadius: 10, padding: '14px 16px', marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: r.hasFeedback ? 12 : 0 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0A1628' }}>Round {i + 1}</span>
                      {r.format && <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>{r.format}</span>}
                      {r.interviewerName && <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 8 }}>· {r.interviewerName}</span>}
                    </div>
                    {!r.hasFeedback && <span style={{ fontSize: 11, color: '#D97706', fontWeight: 600 }}>⏳ Pending</span>}
                  </div>

                  {r.hasFeedback && r.feedback && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                        <ScoreBar label="Technical"      value={r.feedback.technicalScore}      max={10} />
                        <ScoreBar label="Communication"  value={r.feedback.communicationScore}  max={10} />
                        <ScoreBar label="Problem Solving"value={r.feedback.problemSolvingScore} max={10} />
                        <ScoreBar label="Culture Fit"    value={r.feedback.cultureFitScore}     max={10} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                        {r.feedback.recommendation && (
                          <span style={{ background: `${RECOMMEND_LABELS[r.feedback.recommendation]?.color}15`, color: RECOMMEND_LABELS[r.feedback.recommendation]?.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                            {RECOMMEND_LABELS[r.feedback.recommendation]?.label || r.feedback.recommendation}
                          </span>
                        )}
                        {r.feedback.rating != null && (
                          <span style={{ fontSize: 12, color: '#6B7280' }}>Overall: {'★'.repeat(r.feedback.rating)}{'☆'.repeat(Math.max(0, 5 - r.feedback.rating))}</span>
                        )}
                      </div>
                      {r.feedback.strengths && <div style={{ fontSize: 12, color: '#374151', marginTop: 8 }}>✅ Strengths: {r.feedback.strengths}</div>}
                      {r.feedback.weaknesses && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>⚠️ Areas: {r.feedback.weaknesses}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
