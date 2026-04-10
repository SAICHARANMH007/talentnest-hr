import { useState, useEffect } from 'react';
import { api } from '../../api/api.js';
import Spinner from '../ui/Spinner.jsx';

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

export default function AssessmentReviewModal({ assessmentId, submissionId, onClose, onDone }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview]   = useState('');
  const [result, setResult]   = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.getAssessmentSubmission(assessmentId, submissionId)
      .then(d => {
        setData(d);
        setReview(d.submission.recruiterReview || '');
        setResult(d.submission.result || 'pending');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assessmentId, submissionId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.reviewSubmission(assessmentId, submissionId, { result, recruiterReview: review });
      onDone('✅ Review saved');
      onClose();
    } catch (e) {
      onDone(`❌ ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const print = () => {
    if (!data) return;
    const { submission: sub, assessment } = data;
    const qs = assessment.questions || [];
    const answers = sub.answers || [];
    let html = `<html><head><title>Assessment Review</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}h2{font-size:15px;margin-top:24px;border-bottom:1px solid #ccc;padding-bottom:4px}.ans{background:#f5f5f5;padding:8px 12px;border-radius:4px;margin-top:6px;white-space:pre-wrap}.correct{color:green;font-weight:bold}.wrong{color:red}</style></head><body>`;
    html += `<h1>${assessment.title}</h1>`;
    html += `<p>Score: ${sub.score ?? '—'} / ${sub.maxScore} (${sub.percentage ?? '—'}%) &nbsp;|&nbsp; Result: ${sub.result?.toUpperCase() || 'PENDING'} &nbsp;|&nbsp; Time: ${fmtSecs(sub.timeSpentSecs)}</p>`;
    qs.forEach((q, i) => {
      const ans = answers.find(a => a.questionId === q.id);
      html += `<h2>Q${i + 1}. ${q.text} [${q.marks} mark${q.marks !== 1 ? 's' : ''}]</h2>`;
      if (q.type === 'mcq_single' || q.type === 'mcq_multi') {
        html += '<ul>';
        (q.options || []).forEach(opt => {
          const selected = Array.isArray(ans?.value) ? ans.value.includes(opt.id) : ans?.value === opt.id;
          const cls = opt.isCorrect ? 'correct' : (selected && !opt.isCorrect ? 'wrong' : '');
          html += `<li class="${cls}">${opt.isCorrect ? '✓' : ''} ${opt.text}${selected ? ' ← candidate' : ''}</li>`;
        });
        html += '</ul>';
      } else {
        html += `<div class="ans">${ans?.value || '(no answer)'}</div>`;
      }
    });
    if (sub.recruiterReview) html += `<h2>Recruiter Notes</h2><div class="ans">${sub.recruiterReview}</div>`;
    html += '</body></html>';
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 700, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        {/* Sticky Header */}
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Assessment</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>📋 Assessment Review</h3>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={print} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }}>🖨 Print</button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spinner /> Loading…</div>}

          {!loading && data && (() => {
            const { submission: sub, assessment } = data;
            const qs = assessment.questions || [];
            const answers = sub.answers || [];
            const rs = RESULT_STYLES[sub.result] || RESULT_STYLES.pending;

            return (
              <>
                {/* Summary row */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
                  <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', flex: '1 1 120px' }}>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Score</div>
                    <div style={{ color: '#032D60', fontSize: 18, fontWeight: 800 }}>{sub.score ?? '—'}<span style={{ fontSize: 13, color: '#0176D3' }}>/{sub.maxScore}</span></div>
                  </div>
                  <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', flex: '1 1 120px' }}>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Percentage</div>
                    <div style={{ color: '#032D60', fontSize: 18, fontWeight: 800 }}>{sub.percentage ?? '—'}<span style={{ fontSize: 13, color: '#0176D3' }}>%</span></div>
                  </div>
                  <div style={{ background: '#F0F7FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', flex: '1 1 120px' }}>
                    <div style={{ color: '#64748B', fontSize: 11, fontWeight: 600 }}>Time Spent</div>
                    <div style={{ color: '#032D60', fontSize: 16, fontWeight: 800 }}>{fmtSecs(sub.timeSpentSecs)}</div>
                  </div>
                  <div style={{ background: rs.bg, border: `1px solid ${rs.border}`, borderRadius: 10, padding: '10px 16px', flex: '1 1 140px' }}>
                    <div style={{ color: '#9E9D9B', fontSize: 11 }}>Result</div>
                    <div style={{ color: rs.color, fontSize: 14, fontWeight: 700 }}>{rs.label}</div>
                  </div>
                </div>

                {/* Questions */}
                {qs.map((q, i) => {
                  const ans = answers.find(a => a.questionId === q.id);
                  return (
                    <div key={q.id} style={{ marginBottom: 16, padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #F3F2F2' }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: '#0176D3', fontWeight: 700, fontSize: 12 }}>Q{i + 1}</span>
                        <span style={{ background: 'rgba(1,118,211,0.1)', color: '#0176D3', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{TYPE_ICONS[q.type]}</span>
                        <span style={{ color: '#706E6B', fontSize: 11 }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      </div>
                      <p style={{ color: '#181818', fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>{q.text}</p>

                      {(q.type === 'mcq_single' || q.type === 'mcq_multi') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {(q.options || []).map(opt => {
                            const selected = Array.isArray(ans?.value) ? ans.value.includes(opt.id) : ans?.value === opt.id;
                            const correct = opt.isCorrect;
                            let bg = 'rgba(255,255,255,0.03)', border = '#FAFAF9', color = '#706E6B';
                            if (correct && selected) { bg = 'rgba(16,185,129,0.15)'; border = 'rgba(16,185,129,0.4)'; color = '#34d399'; }
                            else if (correct) { bg = 'rgba(16,185,129,0.07)'; border = 'rgba(16,185,129,0.2)'; color = '#6ee7b7'; }
                            else if (selected) { bg = 'rgba(186,5,23,0.1)'; border = 'rgba(186,5,23,0.3)'; color = '#FE5C4C'; }
                            return (
                              <div key={opt.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '6px 12px', color, fontSize: 12, display: 'flex', gap: 8 }}>
                                <span>{correct ? '✓' : selected ? '✗' : '○'}</span>
                                <span>{opt.text}</span>
                                {selected && <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>candidate's answer</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(q.type === 'text' || q.type === 'code') && (
                        <div style={{ background: q.type === 'code' ? 'rgba(0,0,0,0.3)' : '#FFFFFF', borderRadius: 8, padding: '10px 14px', color: '#181818', fontSize: 12, fontFamily: q.type === 'code' ? 'monospace' : 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 60, border: '1px solid #FAFAF9' }}>
                          {ans?.value || <span style={{ color: '#706E6B' }}>(no answer provided)</span>}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Manual result override */}
                <div style={{ padding: '16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginTop: 8 }}>
                  <p style={{ color: '#F59E0B', fontSize: 12, fontWeight: 700, margin: '0 0 12px' }}>📝 Recruiter Review</p>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {['pass','fail','pending'].map(r => (
                      <button key={r} onClick={() => setResult(r)}
                        style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: `1px solid ${result === r ? RESULT_STYLES[r].border : '#DDDBDA'}`, background: result === r ? RESULT_STYLES[r].bg : '#FFFFFF', color: result === r ? RESULT_STYLES[r].color : '#9E9D9B', fontSize: 12, fontWeight: result === r ? 700 : 400, cursor: 'pointer' }}>
                        {RESULT_STYLES[r].label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="Add notes about text/code answers (visible to candidate after review)..."
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', background: '#FFFFFF', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, color: '#181818', fontSize: 12, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(1,118,211,0.1)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={save} disabled={saving || loading}
            style={{ flex: 1, background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '11px 0', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Review'}
          </button>
          <button onClick={onClose} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#181818', fontWeight: 600, padding: '11px 20px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}
