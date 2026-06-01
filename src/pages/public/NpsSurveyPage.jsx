import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { req } from '../../api/client.js';

const SCORE_LABELS = {
  1: 'Terrible', 2: 'Very Bad', 3: 'Bad', 4: 'Poor', 5: 'Neutral',
  6: 'Okay', 7: 'Good', 8: 'Very Good', 9: 'Great', 10: 'Excellent!',
};

const scoreColor = (s) => {
  if (s >= 9) return '#059669';
  if (s >= 7) return '#0176D3';
  if (s >= 5) return '#D97706';
  return '#DC2626';
};

export default function NpsSurveyPage() {
  const { token } = useParams();
  const [info, setInfo]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [score, setScore]       = useState(null);
  const [recommend, setRecommend] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid survey link.'); setLoading(false); return; }
    req('GET', `/nps/survey/${token}`)
      .then(r => { setInfo(r); setLoading(false); if (r.alreadySubmitted) setSubmitted(true); })
      .catch(() => { setError('Survey not found or link expired.'); setLoading(false); });
  }, [token]);

  const handleSubmit = async () => {
    if (score === null) return;
    setSubmitting(true);
    try {
      await req('POST', `/nps/survey/${token}`, { score, wouldRecommend: recommend, feedbackText: feedback }, false);
      setSubmitted(true);
    } catch (e) {
      alert(e?.response?.data?.message || 'Could not submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center', color: '#6B7280' }}>Loading survey…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: '#0A1628' }}>Survey Not Found</h2>
        <p style={{ color: '#6B7280' }}>{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans',Arial,sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 440, padding: 40, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🙏</div>
        <h2 style={{ color: '#0A1628', fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Thank You!</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.6 }}>
          {info?.alreadySubmitted
            ? "You've already submitted feedback for this application. We appreciate your time!"
            : 'Your feedback helps us continuously improve the hiring experience for everyone.'}
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans',Arial,sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.08)', padding: 36, maxWidth: 520, width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⭐</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A1628', margin: 0 }}>How was your experience?</h1>
          {info?.jobTitle && (
            <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0' }}>
              {info.jobTitle}{info.company ? ` · ${info.company}` : ''}
              {info.outcome ? ` · ${info.outcome === 'hired' ? '🎉 Hired' : '📩 Outcome shared'}` : ''}
            </p>
          )}
        </div>

        {/* Score picker */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textAlign: 'center' }}>
            How would you rate your overall hiring experience? <span style={{ color: '#DC2626' }}>*</span>
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setScore(n)} style={{
                width: 42, height: 42, borderRadius: 10,
                border: score === n ? `2px solid ${scoreColor(n)}` : '1px solid #E2E8F0',
                background: score === n ? `${scoreColor(n)}15` : '#fff',
                color: score === n ? scoreColor(n) : '#374151',
                fontWeight: score === n ? 800 : 400,
                fontSize: 15, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {n}
              </button>
            ))}
          </div>
          {score !== null && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 15, fontWeight: 700, color: scoreColor(score) }}>
              {SCORE_LABELS[score]}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
            <span>1 = Very Poor</span>
            <span>10 = Excellent</span>
          </div>
        </div>

        {/* Recommend */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10, textAlign: 'center' }}>
            Would you recommend applying here to a friend?
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {[true, false].map(v => (
              <button key={String(v)} onClick={() => setRecommend(v)} style={{
                padding: '8px 24px', borderRadius: 10, border: recommend === v ? `2px solid ${v ? '#059669' : '#DC2626'}` : '1px solid #E2E8F0',
                background: recommend === v ? (v ? '#D1FAE5' : '#FEE2E2') : '#fff',
                color: recommend === v ? (v ? '#065F46' : '#991B1B') : '#374151',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}>
                {v ? '👍 Yes' : '👎 No'}
              </button>
            ))}
          </div>
        </div>

        {/* Open feedback */}
        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
            Anything you'd like to share? (optional)
          </label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={3}
            placeholder="What went well? What could be improved?"
            style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={score === null || submitting}
          style={{ width: '100%', background: score !== null ? 'linear-gradient(135deg,#0176D3,#00C2CB)' : '#E5E7EB', color: score !== null ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 16, cursor: score !== null ? 'pointer' : 'default' }}>
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </button>
        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 11, marginTop: 12 }}>
          Your feedback is anonymous and helps improve the candidate experience.
        </p>
      </div>
    </div>
  );
}
