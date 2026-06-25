import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import { card, btnP, btnG } from '../../constants/styles.js';

// ── Timer ─────────────────────────────────────────────────────────────────────
function useCountdown(expiresAt) {
  const [secs, setSecs] = useState(null);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secs;
}

function fmtTime(s) {
  if (s === null) return '--:--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Result screen ─────────────────────────────────────────────────────────────
function ResultScreen({ result, skill, onRetake, onDone }) {
  const { passed, score, maxScore, percentage, correctCount, hardCorrect, questionReview = [] } = result;
  const [expanded, setExpanded] = React.useState(null);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 16 }}>{passed ? '🏆' : '📚'}</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: passed ? '#059669' : '#DC2626', margin: '0 0 8px' }}>
        {passed ? 'Assessment Passed!' : 'Not Passed Yet'}
      </h2>
      <p style={{ color: '#6B7280', fontSize: 15, margin: '0 0 32px' }}>
        {passed
          ? `Great job! You've demonstrated proficiency in ${skill}.`
          : `Keep practising — you can retake after 24 hours.`}
      </p>

      <div style={{ ...card, padding: 28, marginBottom: 24, textAlign: 'left' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <ScoreBox label="Score" value={`${score}/${maxScore}`} color="#0176D3" />
          <ScoreBox label="Percentage" value={`${percentage}%`} color={percentage >= 60 ? '#059669' : '#DC2626'} />
          <ScoreBox label="Correct Answers" value={`${correctCount}/6`} color="#7C3AED" />
          <ScoreBox label="Hard Q Correct" value={`${hardCorrect}/3`} color="#D97706" />
        </div>
        <div style={{ background: passed ? '#D1FAE5' : '#FEE2E2', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: passed ? '#065F46' : '#991B1B', fontWeight: 600 }}>
          {passed
            ? '✓ Pass criteria met: ≥4/6 correct with at least 1 hard question correct.'
            : `Pass criteria: ≥4/6 correct AND ≥1 hard question correct. You got ${correctCount}/6 correct (${hardCorrect} hard).`}
        </div>
      </div>

      {/* ── Per-question review ── */}
      {questionReview.length > 0 && (
        <div style={{ textAlign: 'left', marginBottom: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#374151', marginBottom: 12 }}>Answer Review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {questionReview.map((q, idx) => {
              const open = expanded === idx;
              const yourIds = q.yourAnswer === null ? []
                : Array.isArray(q.yourAnswer) ? q.yourAnswer.map(String) : [String(q.yourAnswer)];
              const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
              return (
                <div key={q.questionId} style={{
                  border: `1.5px solid ${q.wasCorrect ? '#A7F3D0' : q.yourAnswer !== null ? '#FECACA' : '#E5E7EB'}`,
                  borderRadius: 12, overflow: 'hidden',
                  background: q.wasCorrect ? '#F0FDF4' : q.yourAnswer !== null ? '#FFF7F7' : '#FAFAFA',
                }}>
                  <button
                    onClick={() => setExpanded(open ? null : idx)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>
                        {q.wasCorrect ? '✅' : q.yourAnswer !== null ? '❌' : '⬜'}
                      </span>
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 }}>
                          Q{idx + 1} · {q.difficulty}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {q.text}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                  </button>

                  {open && (
                    <div style={{ borderTop: '1px solid #E5E7EB', padding: '14px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12, whiteSpace: 'pre-wrap' }}>{q.text}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {q.options.map(opt => {
                          const isCorrectOpt = opt.isCorrect;
                          const yourChose = yourIds.includes(opt.id);
                          let bg = '#F9FAFB', border = '#E5E7EB', color = '#374151';
                          if (isCorrectOpt) { bg = '#D1FAE5'; border = '#6EE7B7'; color = '#065F46'; }
                          if (yourChose && !isCorrectOpt) { bg = '#FEE2E2'; border = '#FCA5A5'; color = '#991B1B'; }
                          return (
                            <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontSize: 13 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                                {isCorrectOpt ? '✓' : yourChose ? '✗' : '○'}
                              </span>
                              {opt.text}
                              {yourChose && !isCorrectOpt && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#DC2626' }}>Your answer</span>}
                              {isCorrectOpt && yourChose && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#059669' }}>Correct ✓</span>}
                              {isCorrectOpt && !yourChose && <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#059669' }}>Correct answer</span>}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div style={{ background: '#FEF3C7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
                          <strong>Explanation:</strong> {q.explanation}
                        </div>
                      )}
                      {!q.yourAnswer && (
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8, fontStyle: 'italic' }}>You did not answer this question.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onDone} style={{ ...btnP, padding: '12px 28px' }}>← Back to Profile</button>
        {passed && (
          <button onClick={onRetake} style={{ ...btnG, padding: '12px 28px' }}>Retake (for fun)</button>
        )}
      </div>
    </div>
  );
}

function ScoreBox({ label, value, color }) {
  return (
    <div style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Question card ─────────────────────────────────────────────────────────────
function QuestionCard({ question, qIndex, total, answer, onAnswer }) {
  const isMulti = question.type === 'mcq_multi';
  const selected = Array.isArray(answer) ? answer : (answer ? [answer] : []);

  const toggle = (optId) => {
    if (isMulti) {
      const next = selected.includes(optId) ? selected.filter(x => x !== optId) : [...selected, optId];
      onAnswer(next);
    } else {
      onAnswer(optId);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#9CA3AF' }}>Question {qIndex + 1} of {total}</span>
        <span style={{
          background: question.difficulty === 'hard' ? '#FEF3C7' : '#EDE9FE',
          color: question.difficulty === 'hard' ? '#92400E' : '#5B21B6',
          borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        }}>{question.difficulty}</span>
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', lineHeight: 1.6, marginBottom: 24, whiteSpace: 'pre-wrap' }}>
        {question.text}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {question.options.map(opt => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              style={{
                textAlign: 'left', padding: '14px 18px', borderRadius: 12, cursor: 'pointer',
                border: active ? '2px solid #0176D3' : '1.5px solid #E5E7EB',
                background: active ? '#EFF6FF' : '#FAFAFA',
                color: active ? '#0176D3' : '#374151',
                fontWeight: active ? 700 : 400, fontSize: 14,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: isMulti ? 4 : '50%',
                border: active ? '2px solid #0176D3' : '1.5px solid #D1D5DB',
                background: active ? '#0176D3' : 'white',
                marginRight: 12, flexShrink: 0,
              }}>
                {active && <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>✓</span>}
              </span>
              {opt.text}
            </button>
          );
        })}
      </div>
      {isMulti && (
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>Select all that apply</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SkillAssessmentPage({ user }) {
  const { skill: skillParam } = useParams();
  const navigate = useNavigate();
  const skill = decodeURIComponent(skillParam || '');

  const [phase, setPhase]       = useState('intro');  // intro | active | submitting | result
  const [attempt, setAttempt]   = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]   = useState({});
  const [current, setCurrent]   = useState(0);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState(null);

  const secsLeft = useCountdown(attempt?.expiresAt);
  const cooldownSecs = useCountdown(cooldownEndsAt);
  const inCooldown = !!cooldownEndsAt && cooldownSecs !== null && cooldownSecs > 0;

  // Auto-submit when timer hits 0
  const submitRef = useRef(null);
  useEffect(() => {
    if (secsLeft === 0 && phase === 'active') {
      submitRef.current?.();
    }
  }, [secsLeft, phase]);

  // Check for active in-progress attempt on mount
  useEffect(() => {
    if (!skill) return;
    setLoading(true);
    api.getActiveSkillAttempt(skill)
      .then(res => {
        if (res?.attempt) {
          setAttempt(res.attempt);
          setQuestions(res.attempt.questions || []);
          setPhase('active');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [skill]);

  const startAttempt = async () => {
    setLoading(true);
    setError('');
    setCooldownEndsAt(null);
    try {
      const res = await api.startSkillAttempt(skill);
      setAttempt({ attemptId: res.attemptId, expiresAt: res.expiresAt, skill: res.skill });
      setQuestions(res.questions || []);
      setAnswers({});
      setCurrent(0);
      setPhase('active');
    } catch (e) {
      if (e?.cooldownEndsAt) {
        setCooldownEndsAt(e.cooldownEndsAt);
        setError('');
      } else {
        setError(e?.message || 'Failed to start assessment');
      }
    }
    setLoading(false);
  };

  const submitAttempt = useCallback(async () => {
    if (phase !== 'active' || !attempt?.attemptId) return;
    setPhase('submitting');
    const answersArr = Object.entries(answers).map(([questionId, value]) => ({ questionId, value }));
    try {
      const res = await api.submitSkillAttempt(attempt.attemptId, answersArr);
      setResult(res);
      setPhase('result');
    } catch (e) {
      setError(e?.message || 'Submission failed');
      setPhase('active');
    }
  }, [phase, attempt, answers]);

  submitRef.current = submitAttempt;

  const answered = Object.keys(answers).length;
  const timerColor = secsLeft !== null && secsLeft < 120 ? '#DC2626' : '#0176D3';

  if (loading && phase === 'intro') {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ color: '#9CA3AF', fontSize: 15 }}>Loading…</div>
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <ResultScreen
        result={result}
        skill={skill}
        onDone={() => navigate('/app/profile?tab=skills')}
        onRetake={() => { setPhase('intro'); setAttempt(null); setResult(null); setAnswers({}); }}
      />
    );
  }

  if (phase === 'intro') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
        <button onClick={() => navigate('/app/profile?tab=skills')} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 13, fontWeight: 700, padding: 0, marginBottom: 24 }}>
          ← Back to Skills
        </button>
        <div style={{ ...card, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0A1628', margin: '0 0 8px' }}>{skill} Assessment</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 32px', lineHeight: 1.7 }}>
            Test your {skill} knowledge with 6 questions. You need to score at least 4/6 correct (including at least 1 hard question) to pass.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
            {[['6', 'Questions'],['30', 'Minutes'],['4/6', 'to Pass']].map(([v, l]) => (
              <div key={l} style={{ background: '#F8FAFF', borderRadius: 12, padding: '14px 8px' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0176D3' }}>{v}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FEF3C7', borderRadius: 12, padding: '14px 18px', marginBottom: 28, fontSize: 13, color: '#92400E', textAlign: 'left' }}>
            <strong>Rules:</strong> Answer all questions. The timer starts immediately. You cannot pause. Results are available right after submission.
          </div>

          {inCooldown && (
            <div style={{ background: '#FEF3C7', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '16px 20px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>⏳</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>Cooldown Active</div>
              <div style={{ fontSize: 13, color: '#92400E' }}>You can retake this assessment in</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#D97706', margin: '8px 0', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(cooldownSecs)}</div>
              <div style={{ fontSize: 11, color: '#A16207' }}>24-hour cooldown applies after a failed attempt</div>
            </div>
          )}

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13 }}>{error}</div>
          )}

          <button onClick={startAttempt} disabled={loading || inCooldown} style={{ ...btnP, padding: '14px 40px', fontSize: 16, width: '100%', opacity: inCooldown ? 0.5 : 1, cursor: inCooldown ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Starting…' : inCooldown ? '⏳ Cooldown Active' : 'Start Assessment →'}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0A1628' }}>{skill} Assessment</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{answered}/{questions.length} answered</div>
        </div>
        <div style={{ background: secsLeft !== null && secsLeft < 120 ? '#FEF2F2' : '#EFF6FF', border: `2px solid ${timerColor}20`, borderRadius: 12, padding: '8px 18px', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(secsLeft)}</div>
          <div style={{ fontSize: 10, color: timerColor, fontWeight: 600, opacity: 0.7 }}>REMAINING</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#E5E7EB', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#0176D3', width: `${(answered / questions.length) * 100}%`, transition: 'width 0.3s ease', borderRadius: 4 }} />
      </div>

      {/* Question navigation pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: i === current ? '#0176D3' : answers[questions[i]?.questionId] !== undefined ? '#D1FAE5' : '#F3F4F6',
              color: i === current ? 'white' : answers[questions[i]?.questionId] !== undefined ? '#065F46' : '#374151',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Question */}
      <div style={{ ...card, padding: 28, marginBottom: 20 }}>
        {q && (
          <QuestionCard
            question={q}
            qIndex={current}
            total={questions.length}
            answer={answers[q.questionId]}
            onAnswer={(val) => setAnswers(prev => ({ ...prev, [q.questionId]: val }))}
          />
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          style={{ ...btnG, opacity: current === 0 ? 0.4 : 1 }}
        >
          ← Previous
        </button>

        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(c => c + 1)} style={{ ...btnP }}>
            Next →
          </button>
        ) : (
          <button
            onClick={submitAttempt}
            disabled={phase === 'submitting'}
            style={{ ...btnP, background: 'linear-gradient(135deg, #059669, #047857)', minWidth: 140 }}
          >
            {phase === 'submitting' ? 'Submitting…' : `Submit (${answered}/${questions.length})`}
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 10, padding: '10px 16px', marginTop: 16, fontSize: 13 }}>{error}</div>
      )}
    </div>
  );
}
