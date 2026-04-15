import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { btnP, btnG, card } from '../../constants/styles.js';

const TYPE_ICONS = { mcq_single: '⭕', mcq_multi: '☑️', text: '📝', code: '💻' };
const RESULT_STYLES = {
  pass:    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', color: '#34d399', label: '✅ Passed' },
  fail:    { bg: 'rgba(186,5,23,0.12)',  border: 'rgba(186,5,23,0.4)',  color: '#FE5C4C', label: '❌ Not Passed' },
  pending: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', color: '#F59E0B', label: '⏳ Pending Review' },
};

function fmtSecs(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export default function AssessmentReviewPage({ user }) {
  const { assessmentId, submissionId } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview]   = useState('');
  const [result, setResult]   = useState('');
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState("");
  const [showFloat, setShowFloat] = useState(false);
  const moderationRef = React.useRef(null);

  useEffect(() => {
    setLoading(true);
    api.getAssessmentSubmission(assessmentId, submissionId)
      .then(d => {
        setData(d);
        setReview(d.submission.recruiterReview || '');
        setResult(d.submission.result || 'pending');
      })
      .catch((e) => {
        setToast(`❌ Error: ${e.message}`);
      })
      .finally(() => setLoading(false));
  }, [assessmentId, submissionId]);

  useEffect(() => {
    if (loading || !moderationRef.current) return;
    const obs = new IntersectionObserver(([e]) => setShowFloat(!e.isIntersecting), { threshold: 0.1 });
    obs.observe(moderationRef.current);
    return () => obs.disconnect();
  }, [loading]);

  const save = async () => {
    setSaving(true);
    try {
      await api.reviewSubmission(assessmentId, submissionId, { result, recruiterReview: review });
      setToast('✅ Review saved successfully');
      setTimeout(() => navigate(-1), 1500);
    } catch (e) {
      setToast(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const print = () => {
    window.print();
  };

  if (loading) return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0' }}>
      <Skeleton height="32px" width="180px" style={{ marginBottom: 24 }} />
      <div className="tn-page-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1,2,3].map(i => <Skeleton key={i} height="180px" />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton height="140px" />
          <Skeleton height="300px" />
        </div>
      </div>
    </div>
  );

  const { submission: sub, assessment } = data || {};
  const qs = assessment?.questions || [];
  const answers = sub?.answers || [];
  const rs = RESULT_STYLES[result] || RESULT_STYLES.pending;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', animation: 'tn-fadein 0.3s ease both' }}>
      <Toast msg={toast} onClose={() => setToast("")} />
      
      <div style={{ marginBottom: 20 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0 }}>
          ← Back to List
        </button>
      </div>

      <PageHeader 
        title={`📋 Assessment Review: ${assessment?.title}`} 
        className="tn-no-print"
        subtitle={`Detailed breakdown of candidate performance and automated scoring.`}
        action={<button onClick={print} style={btnG} className="tn-no-print">🖨 Print Report</button>}
      />

      <div className="dash-split" style={{ marginTop: 24, alignItems: 'start' }}>
        
        {/* Main Content: Questions & Answers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {qs.map((q, i) => {
            const ans = answers.find(a => a.questionId === q.id);
            return (
              <div key={q.id} style={{ ...card, padding: '24px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                  <span style={{ color: '#0176D3', fontWeight: 800, fontSize: 13 }}>QUESTION {i + 1}</span>
                  <Badge label={TYPE_ICONS[q.type]} color="#0176D3" />
                  <span style={{ color: '#64748B', fontSize: 12 }}>{q.marks} marks</span>
                </div>
                <p style={{ color: '#111827', fontSize: 15, fontWeight: 500, margin: '0 0 16px', lineHeight: 1.6 }}>{q.text}</p>

                {(q.type === 'mcq_single' || q.type === 'mcq_multi') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(q.options || []).map(opt => {
                      const selected = Array.isArray(ans?.value) ? ans.value.includes(opt.id) : ans?.value === opt.id;
                      const correct = opt.isCorrect;
                      let bg = '#fff', border = '#E5E7EB', color = '#374151';
                      
                      if (correct && selected) { bg = '#DCFCE7'; border = '#86EFAC'; color = '#15803D'; }
                      else if (correct) { bg = '#F0FDF4'; border = '#B9F6CA'; color = '#10B981'; }
                      else if (selected) { bg = '#FEF2F2'; border = '#FECACA'; color = '#B91C1C'; }

                      return (
                        <div key={opt.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px', color, fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{ fontSize: 16 }}>{correct ? '✓' : selected ? '✕' : '○'}</span>
                          <span style={{ flex: 1 }}>{opt.text}</span>
                          {selected && <Badge label="Candidate's Choice" color={correct ? '#166534' : '#991B1B'} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {(q.type === 'text' || q.type === 'code') && (
                  <div style={{ background: q.type === 'code' ? '#1E293B' : '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px', color: q.type === 'code' ? '#F8FAFC' : '#111827', fontSize: 14, fontFamily: q.type === 'code' ? 'JetBrains Mono, monospace' : 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 80 }}>
                    {ans?.value || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No answer provided.</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar: Scoring & Review */}
        <div className="tn-no-print" style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ ...card, background: '#fff' }}>
            <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>📊 PERFORMANCE SUMMARY</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#F8FAFB', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                   <div style={{ color: '#64748B', fontSize: 11 }}>Raw Score</div>
                   <div style={{ color: '#111827', fontSize: 20, fontWeight: 800 }}>{sub?.score ?? '—'}<span style={{ fontSize: 13, color: '#64748B' }}>/{sub?.maxScore}</span></div>
                </div>
                <div style={{ background: '#F8FAFB', padding: 12, borderRadius: 10, textAlign: 'center' }}>
                   <div style={{ color: '#64748B', fontSize: 11 }}>Percentage</div>
                   <div style={{ color: '#111827', fontSize: 20, fontWeight: 800 }}>{sub?.percentage ?? '—'}%</div>
                </div>
            </div>
            <div style={{ marginTop: 12, background: rs.bg, border: `1px solid ${rs.border}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ color: rs.color, fontSize: 14, fontWeight: 700 }}>{rs.label}</div>
            </div>
          </div>

          <div ref={moderationRef} style={{ ...card, background: '#fff', border: '2px solid rgba(245,158,11,0.15)' }}>
            <p style={{ color: '#F59E0B', fontSize: 11, fontWeight: 800, margin: '0 0 16px', letterSpacing: 1 }}>📝 RECRUITER MODERATION</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {['pass','fail','pending'].map(r => (
                <button 
                  key={r} 
                  onClick={() => setResult(r)}
                  style={{ 
                    padding: '10px', 
                    borderRadius: 10, 
                    border: `1.5px solid ${result === r ? RESULT_STYLES[r].border : '#E5E7EB'}`, 
                    background: result === r ? RESULT_STYLES[r].bg : '#fff', 
                    color: result === r ? RESULT_STYLES[r].color : '#6B7280', 
                    fontSize: 13, 
                    fontWeight: result === r ? 700 : 500, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                  {result === r ? '●' : '○'} {RESULT_STYLES[r].label}
                </button>
              ))}
            </div>

            <label style={{ fontSize: 12, color: '#374151', fontWeight: 600, display: 'block', marginBottom: 6 }}>Review Notes</label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="Add feedback for the candidate or internal notes..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />

            <button onClick={save} disabled={saving} style={{ ...btnP, width: '100%', marginTop: 16, opacity: saving ? 0.6 : 1 }}>
              {saving ? '⏳ Saving Review...' : '💾 Confirm & Save'}
            </button>
          </div>
        </div>
      </div>

      {showFloat && (
        <div className="tn-floating-bar tn-no-print">
          <div style={{ color: '#111827', fontSize: 13, fontWeight: 700, borderRight: '1px solid #E5E7EB', paddingRight: 16, marginRight: 8 }}>
            Moderate Result
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['pass','fail','pending'].map(r => (
              <button 
                key={r}
                onClick={() => setResult(r)}
                style={{ 
                  background: result === r ? RESULT_STYLES[r].bg : 'none',
                  border: 'none',
                  color: result === r ? RESULT_STYLES[r].color : '#6B7280',
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>
                {RESULT_STYLES[r].label}
              </button>
            ))}
          </div>
          <button onClick={save} disabled={saving} style={{ ...btnP, padding: '8px 16px', fontSize: 12 }}>
            {saving ? '⏳ Saving...' : '💾 Save Review'}
          </button>
        </div>
      )}
    </div>
  );
}
