import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/api.js';
import Spinner from '../../components/ui/Spinner.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Anti-cheat constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_VIOLATIONS   = 3;   // warn on 1st & 2nd, auto-submit on 3rd
const GRACE_PERIOD_MS  = 3000; // 3s after start before violations count

// Keyboard shortcuts blocked during assessment
const BLOCKED_KEYS = new Set(['c','v','a','u','p','s','i','j','f','g','r','w','n','t']);
const BLOCKED_FUNCTION_KEYS = new Set(['F12','F11','F10','F5','F4']);

// ─────────────────────────────────────────────────────────────────────────────
const RESULT_INFO = {
  pass:    { icon: '🎉', color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)',  text: 'You passed!' },
  fail:    { icon: '😔', color: '#FE5C4C', bg: 'rgba(186,5,23,0.08)', border: 'rgba(186,5,23,0.3)',  text: 'Not quite there' },
  pending: { icon: '⏳', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', text: 'Under Review' },
};

function formatTime(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CandidateAssessment({ user, onBack }) {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase]       = useState('loading'); // loading | pre-start | active | submitted | expired | error
  const [assessment, setAssmt]  = useState(null);
  const [submission, setSub]    = useState(null);
  const [answers, setAnswers]   = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [confirmSubmit, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Anti-cheat state
  const [violationWarning, setViolationWarning] = useState(null); // null | 'tab' | 'fullscreen' | 'focus'
  const violationsRef   = useRef(0);
  const phaseRef        = useRef('loading');
  const startedAtRef    = useRef(null); // when 'active' phase began — for grace period
  const fsEnteredRef    = useRef(false); // did we successfully enter fullscreen?
  const lastViolationTs = useRef(0);     // debounce double-fire

  const timerRef       = useRef(null);
  const autoSubmitRef  = useRef(false);

  // Always-fresh submit ref — avoids stale closures in event listeners
  const handleSubmitRef = useRef(null);

  // ── Keep phaseRef in sync ──────────────────────────────────────────────────
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Load assessment ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!assessmentId) { setPhase('error'); return; }
    api.getAssessmentForJob(assessmentId.startsWith('job:') ? assessmentId.slice(4) : assessmentId)
      .then(a => { setAssmt(a); setPhase('pre-start'); })
      .catch(() => setPhase('error'));
  }, [assessmentId]);

  // ── Timer ──────────────────────────────────────────────────────────────────
  const startTimer = useCallback((limitMins, startedAt) => {
    if (!limitMins) return;
    const endMs = new Date(startedAt).getTime() + limitMins * 60_000;
    const tick = () => {
      const remaining = Math.max(0, Math.round((endMs - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        handleSubmitRef.current?.(true);
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Fullscreen: enter on active, exit on done ──────────────────────────────
  useEffect(() => {
    if (phase === 'active') {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' })
        .then(() => { fsEnteredRef.current = true; })
        .catch(() => { fsEnteredRef.current = false; }); // fullscreen denied — still allow assessment
    }
    if (['submitted', 'expired', 'error'].includes(phase)) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }, [phase]);

  // ── Anti-cheat listeners (only when active) ────────────────────────────────
  useEffect(() => {
    if (phase !== 'active') return;

    const triggerViolation = (reason) => {
      if (phaseRef.current !== 'active') return;
      // Grace period — ignore violations in first 3s (browser may fire blur on fullscreen request)
      if (Date.now() - (startedAtRef.current || 0) < GRACE_PERIOD_MS) return;
      // Debounce: ignore if another violation fired < 1.5s ago
      const now = Date.now();
      if (now - lastViolationTs.current < 1500) return;
      lastViolationTs.current = now;

      violationsRef.current += 1;

      if (violationsRef.current >= MAX_VIOLATIONS) {
        // Auto-submit — no more chances
        setViolationWarning(null);
        autoSubmitRef.current = true;
        handleSubmitRef.current?.(true);
      } else {
        // Show warning overlay — re-request fullscreen
        setViolationWarning(reason);
        document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      }
    };

    const onVisibility   = () => { if (document.hidden) triggerViolation('tab_switch'); };
    const onBlur         = () => triggerViolation('focus_loss');
    const onFsChange     = () => { if (fsEnteredRef.current && !document.fullscreenElement) triggerViolation('fullscreen_exit'); };
    const noContextMenu  = (e) => e.preventDefault();
    const blockKeys      = (e) => {
      if (BLOCKED_FUNCTION_KEYS.has(e.key)) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && BLOCKED_KEYS.has(e.key.toLowerCase())) {
        e.preventDefault();
        // ctrl+c/v are the most suspicious — count as violations
        if (['c','v'].includes(e.key.toLowerCase())) triggerViolation('copy_paste_attempt');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('contextmenu', noContextMenu);
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('contextmenu', noContextMenu);
      document.removeEventListener('keydown', blockKeys);
    };
  }, [phase]);

  // ── Start ──────────────────────────────────────────────────────────────────
  const handleStart = async () => {
    try {
      const data = await api.startAssessment(assessment.id);
      setSub(data.submission);
      setAssmt(prev => ({ ...prev, questions: data.assessment.questions }));
      const existing = {};
      (data.submission.answers || []).forEach(a => { existing[a.questionId] = a.value; });
      setAnswers(existing);
      violationsRef.current = 0;
      startedAtRef.current  = Date.now();
      setPhase('active');
      if (data.assessment.timeLimitMins > 0) {
        startTimer(data.assessment.timeLimitMins, data.submission.startedAt);
      }
    } catch (e) {
      if (e.message.includes('already completed')) setPhase('submitted');
      else if (e.message.includes('expired'))      setPhase('expired');
      else alert(e.message);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (auto = false) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setConfirm(false);
    setViolationWarning(null);
    try {
      const answersArr = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        type: assessment.questions.find(q => q.id === questionId)?.type || 'text',
        value,
      }));
      // Collect violations snapshot from ref
      const violationsSnapshot = Array.from({ length: violationsRef.current }, (_, i) => ({
        type: 'recorded',
        index: i + 1,
        timestamp: new Date().toISOString(),
      }));
      const result = await api.submitAssessment(assessment.id, answersArr, !!auto, violationsSnapshot);
      setSub(result);
      setPhase('submitted');
    } catch (e) {
      if (e.message.includes('expired')) setPhase('expired');
      else { setSubmitting(false); alert(e.message); }
    }
  }, [submitting, answers, assessment]);

  // Keep handleSubmitRef fresh on every render
  handleSubmitRef.current = handleSubmit;

  const updateAnswer = (qId, value) => setAnswers(prev => ({ ...prev, [qId]: value }));

  const answeredCount = assessment ? (assessment.questions || []).filter(q => {
    const v = answers[q.id];
    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
  }).length : 0;

  // ── Shell wrapper ──────────────────────────────────────────────────────────
  const shell = (content) => (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#F3F2F2,#F3F2F2)', color: '#181818', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {content}
    </div>
  );

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (phase === 'loading') return shell(<><Spinner /><p style={{ color: '#0176D3', marginTop: 12 }}>Loading assessment…</p></>);
  if (phase === 'error')   return shell(
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 32 }}>⚠️</p>
      <p style={{ color: '#FE5C4C', fontSize: 15 }}>Could not load assessment.</p>
      <button onClick={onBack} style={{ marginTop: 16, background: '#FAFAF9', border: '1px solid #EAF5FE', borderRadius: 10, color: '#181818', padding: '10px 24px', cursor: 'pointer' }}>← Back</button>
    </div>
  );

  // ── Profile completeness check before assessment ──────────────────────────
  const missingFields = [];
  if (user) {
    if (!user.name)       missingFields.push('Full Name');
    if (!user.phone)      missingFields.push('Mobile Number');
    if (!user.email)      missingFields.push('Email');
    if (user.experience === undefined || user.experience === null || user.experience === '') missingFields.push('Overall Experience');
  }

  if (phase === 'pre-start' && missingFields.length > 0) return shell(
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 20, padding: 36, maxWidth: 480, width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
      <h2 style={{ color: '#181818', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>Complete Your Profile First</h2>
      <p style={{ color: '#706E6B', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        The following fields are required before you can take an assessment:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {missingFields.map(f => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10 }}>
            <span style={{ color: '#F59E0B', fontSize: 16 }}>⚠️</span>
            <span style={{ color: '#181818', fontSize: 13, fontWeight: 600 }}>{f} is missing</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 12, color: '#706E6B', padding: '12px 0', cursor: 'pointer', fontWeight: 600 }}>← Back</button>
        <button onClick={() => onBack('profile')} style={{ flex: 2, background: '#0176D3', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, padding: '12px 0', cursor: 'pointer' }}>
          Go to My Profile →
        </button>
      </div>
    </div>
  );

  // ── Pre-start ──────────────────────────────────────────────────────────────
  if (phase === 'pre-start') return shell(
    <div style={{ background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 20, padding: 36, maxWidth: 560, width: '100%' }}>
      <div style={{ fontSize: 36, marginBottom: 12, textAlign: 'center' }}>📝</div>
      <h2 style={{ color: '#181818', fontSize: 20, fontWeight: 800, textAlign: 'center', margin: '0 0 4px' }}>{assessment.title}</h2>
      {jobTitle && <p style={{ color: '#0176D3', textAlign: 'center', fontSize: 13, margin: '0 0 20px' }}>for {jobTitle}</p>}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ color: '#0176D3', fontSize: 20, fontWeight: 700 }}>{(assessment.questions || []).length}</div>
          <div style={{ color: '#706E6B', fontSize: 11 }}>Questions</div>
        </div>
        <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ color: '#0176D3', fontSize: 20, fontWeight: 700 }}>
            {assessment.timeLimitMins > 0 ? `${assessment.timeLimitMins}m` : '∞'}
          </div>
          <div style={{ color: '#706E6B', fontSize: 11 }}>Time Limit</div>
        </div>
        {assessment.passingScore > 0 && (
          <div style={{ flex: 1, background: '#FFFFFF', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
            <div style={{ color: '#0176D3', fontSize: 20, fontWeight: 700 }}>{assessment.passingScore}%</div>
            <div style={{ color: '#706E6B', fontSize: 11 }}>Passing Score</div>
          </div>
        )}
      </div>

      {assessment.instructions && (
        <div style={{ background: 'rgba(1,118,211,0.06)', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, margin: '0 0 6px' }}>INSTRUCTIONS</p>
          <p style={{ color: '#3E3E3C', fontSize: 13, margin: 0, lineHeight: 1.6 }}>{assessment.instructions}</p>
        </div>
      )}

      {/* Anti-cheat notice */}
      <div style={{ background: 'rgba(186,5,23,0.06)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
        <p style={{ color: '#BA0517', fontSize: 12, fontWeight: 700, margin: '0 0 6px' }}>🛡️ PROCTORED ASSESSMENT</p>
        <ul style={{ color: '#3E3E3C', fontSize: 12, margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>The assessment runs in <strong>full-screen mode</strong> — do not exit</li>
          <li>Switching tabs or windows will be <strong>recorded as a violation</strong></li>
          <li>3 violations will <strong>auto-submit</strong> your assessment immediately</li>
          <li>Right-click and context menu are <strong>disabled</strong> during the test</li>
          <li>You have <strong>one attempt only</strong> — you cannot restart once begun</li>
        </ul>
      </div>

      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 24 }}>
        <p style={{ color: '#F59E0B', fontSize: 12, margin: 0 }}>⚠️ Once started, the timer begins and you cannot pause. Ensure you are in a quiet place with stable internet.</p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 12, color: '#706E6B', padding: '12px 0', flex: 1, cursor: 'pointer', fontWeight: 600 }}>← Back</button>
        <button onClick={handleStart} style={{ flex: 2, background: '#0176D3', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 15, padding: '12px 0', cursor: 'pointer' }}>
          🚀 Start Assessment →
        </button>
      </div>
    </div>
  );

  // ── Active ─────────────────────────────────────────────────────────────────
  if (phase === 'active') {
    const qs = assessment.questions || [];
    const q  = qs[currentQ];
    if (!q) return shell(<Spinner />);
    const answered    = answers[q.id];
    const isAnswered  = answered !== undefined && answered !== '' && !(Array.isArray(answered) && answered.length === 0);
    const timerColor  = timeLeft !== null ? (timeLeft < 60 ? '#FE5C4C' : timeLeft < 300 ? '#F59E0B' : '#34d399') : '#34d399';
    const remaining   = MAX_VIOLATIONS - violationsRef.current;

    return (
      <div
        style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', display: 'flex', flexDirection: 'column', userSelect: 'none' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* ── Top bar ── */}
        <div style={{ background: 'rgba(6,13,26,0.95)', borderBottom: '1px solid rgba(1,118,211,0.2)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0, backdropFilter: 'blur(8px)' }}>
          <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📝 {assessment.title}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{answeredCount}/{qs.length} answered</span>
          {/* Violation indicator */}
          <span style={{ color: remaining <= 1 ? '#FE5C4C' : '#F59E0B', fontSize: 11, fontWeight: 600, background: 'rgba(186,5,23,0.15)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 20, padding: '2px 10px' }}>
            🛡️ {violationsRef.current === 0 ? 'Proctored' : `${remaining} warning${remaining !== 1 ? 's' : ''} left`}
          </span>
          {timeLeft !== null && (
            <span style={{ color: timerColor, fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right', background: `${timerColor}18`, border: `1px solid ${timerColor}44`, borderRadius: 8, padding: '3px 10px' }}>
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Question navigator */}
          <div style={{ width: 56, background: 'rgba(6,13,26,0.7)', borderRight: '1px solid rgba(1,118,211,0.1)', padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flexShrink: 0 }}>
            {qs.map((qItem, i) => {
              const ans  = answers[qItem.id];
              const done = ans !== undefined && ans !== '' && !(Array.isArray(ans) && ans.length === 0);
              return (
                <button key={qItem.id} onClick={() => setCurrentQ(i)}
                  style={{ width: 38, height: 38, borderRadius: 8, border: `2px solid ${i === currentQ ? '#0176D3' : done ? 'rgba(52,211,153,0.5)' : '#30363d'}`, background: i === currentQ ? 'rgba(1,118,211,0.25)' : done ? 'rgba(52,211,153,0.1)' : 'transparent', color: i === currentQ ? '#58a6ff' : done ? '#34d399' : '#8b949e', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Question area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', maxWidth: 800, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#58a6ff', fontWeight: 700, fontSize: 13 }}>Question {currentQ + 1} of {qs.length}</span>
              {q.required && <span style={{ color: '#FE5C4C', fontSize: 11 }}>* Required</span>}
              <span style={{ marginLeft: 'auto', color: '#8b949e', fontSize: 12 }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
            </div>

            <p style={{ color: '#e6edf3', fontSize: 16, lineHeight: 1.7, margin: '0 0 24px', fontWeight: 500 }}>{q.text}</p>

            {/* MCQ single */}
            {q.type === 'mcq_single' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(q.options || []).map(opt => {
                  const sel = answers[q.id] === opt.id;
                  return (
                    <button key={opt.id} onClick={() => updateAnswer(q.id, opt.id)}
                      style={{ textAlign: 'left', padding: '14px 18px', borderRadius: 10, border: `2px solid ${sel ? '#0176D3' : '#30363d'}`, background: sel ? 'rgba(1,118,211,0.2)' : 'rgba(255,255,255,0.03)', color: sel ? '#58a6ff' : '#c9d1d9', cursor: 'pointer', fontSize: 14, display: 'flex', gap: 12, alignItems: 'center', transition: 'all .15s' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? '#0176D3' : '#484f58'}`, background: sel ? '#0176D3' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {sel && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* MCQ multi */}
            {q.type === 'mcq_multi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ color: '#8b949e', fontSize: 12, margin: '0 0 4px' }}>Select all that apply</p>
                {(q.options || []).map(opt => {
                  const selected = Array.isArray(answers[q.id]) ? answers[q.id].includes(opt.id) : false;
                  const toggleMulti = () => {
                    const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                    updateAnswer(q.id, selected ? prev.filter(x => x !== opt.id) : [...prev, opt.id]);
                  };
                  return (
                    <button key={opt.id} onClick={toggleMulti}
                      style={{ textAlign: 'left', padding: '14px 18px', borderRadius: 10, border: `2px solid ${selected ? '#0176D3' : '#30363d'}`, background: selected ? 'rgba(1,118,211,0.2)' : 'rgba(255,255,255,0.03)', color: selected ? '#58a6ff' : '#c9d1d9', cursor: 'pointer', fontSize: 14, display: 'flex', gap: 12, alignItems: 'center', transition: 'all .15s' }}>
                      <span style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? '#0176D3' : '#484f58'}`, background: selected ? '#0176D3' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>
                        {selected && '✓'}
                      </span>
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text */}
            {q.type === 'text' && (
              <div>
                <textarea
                  value={answers[q.id] || ''}
                  onChange={e => { const max = q.maxChars || 2000; if (e.target.value.length <= max) updateAnswer(q.id, e.target.value); }}
                  placeholder={q.placeholder || 'Type your answer here…'}
                  rows={6}
                  style={{ width: '100%', padding: '12px 16px', background: '#161b22', border: '1px solid #30363d', borderRadius: 10, color: '#e6edf3', fontSize: 14, lineHeight: 1.6, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ color: '#484f58', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                  {(answers[q.id] || '').length}/{q.maxChars || 2000}
                </div>
              </div>
            )}

            {/* Code */}
            {q.type === 'code' && (
              <div>
                <div style={{ color: '#8b949e', fontSize: 11, marginBottom: 6 }}>💻 Write your code below</div>
                <textarea
                  value={answers[q.id] || ''}
                  onChange={e => { const max = q.maxChars || 3000; if (e.target.value.length <= max) updateAnswer(q.id, e.target.value); }}
                  placeholder={q.placeholder || '// Write your code here…'}
                  rows={12}
                  spellCheck={false}
                  style={{ width: '100%', padding: '14px 18px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 10, color: '#a5f3fc', fontSize: 13, fontFamily: "'Fira Code','Cascadia Code','Courier New',monospace", lineHeight: 1.7, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ color: '#484f58', fontSize: 11, textAlign: 'right', marginTop: 4 }}>
                  {(answers[q.id] || '').length}/{q.maxChars || 3000}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: 32 }}>
              <button onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}
                style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 10, color: '#8b949e', padding: '10px 20px', cursor: currentQ === 0 ? 'not-allowed' : 'pointer', opacity: currentQ === 0 ? 0.4 : 1 }}>← Prev</button>
              {currentQ < qs.length - 1 ? (
                <button onClick={() => setCurrentQ(i => i + 1)}
                  style={{ flex: 1, background: 'rgba(1,118,211,0.2)', border: '1px solid rgba(1,118,211,0.4)', borderRadius: 10, color: '#58a6ff', fontWeight: 600, padding: '10px 0', cursor: 'pointer' }}>Next →</button>
              ) : (
                <button onClick={() => setConfirm(true)}
                  style={{ flex: 1, background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '10px 0', cursor: 'pointer' }}>
                  Submit Assessment
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Violation Warning Overlay ── */}
        {violationWarning && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
            <div style={{ background: '#161b22', border: '2px solid rgba(186,5,23,0.5)', borderRadius: 20, padding: 36, maxWidth: 440, textAlign: 'center', boxShadow: '0 0 60px rgba(186,5,23,0.3)' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
              <h2 style={{ color: '#FE5C4C', fontSize: 20, fontWeight: 800, margin: '0 0 10px' }}>Violation Detected!</h2>
              <p style={{ color: '#c9d1d9', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>
                {violationWarning === 'tab'
                  ? 'You switched tabs or minimized the window.'
                  : violationWarning === 'fullscreen'
                  ? 'You exited full-screen mode.'
                  : 'The assessment window lost focus.'}
              </p>
              <div style={{ background: 'rgba(186,5,23,0.12)', border: '1px solid rgba(186,5,23,0.3)', borderRadius: 10, padding: '10px 16px', marginBottom: 24 }}>
                <p style={{ color: '#FE5C4C', fontSize: 13, margin: 0, fontWeight: 700 }}>
                  ⛔ {MAX_VIOLATIONS - violationsRef.current} more violation{MAX_VIOLATIONS - violationsRef.current !== 1 ? 's' : ''} will AUTO-SUBMIT your assessment
                </p>
              </div>
              <button
                onClick={() => {
                  setViolationWarning(null);
                  document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
                }}
                style={{ background: '#0176D3', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, padding: '13px 40px', cursor: 'pointer', fontSize: 15 }}
              >
                I Understand — Return to Assessment
              </button>
            </div>
          </div>
        )}

        {/* ── Confirm Submit Dialog ── */}
        {confirmSubmit && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
            <div style={{ background: '#161b22', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 20, padding: 32, maxWidth: 400, textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 12px' }}>📤</p>
              <h3 style={{ color: '#e6edf3', margin: '0 0 8px' }}>Submit Assessment?</h3>
              <p style={{ color: '#8b949e', fontSize: 13, margin: '0 0 8px' }}>
                {answeredCount} of {qs.length} questions answered.
              </p>
              {answeredCount < qs.length && (
                <p style={{ color: '#F59E0B', fontSize: 12, margin: '0 0 16px' }}>
                  ⚠️ {qs.length - answeredCount} question{qs.length - answeredCount !== 1 ? 's' : ''} unanswered.
                </p>
              )}
              <p style={{ color: '#8b949e', fontSize: 12, margin: '0 0 24px' }}>You cannot change answers after submission.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirm(false)} style={{ flex: 1, background: '#21262d', border: '1px solid #30363d', borderRadius: 10, color: '#8b949e', padding: '11px 0', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleSubmit(false)} disabled={submitting}
                  style={{ flex: 1, background: '#0176D3', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '11px 0', cursor: 'pointer' }}>
                  {submitting ? 'Submitting…' : 'Yes, Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Submitted ──────────────────────────────────────────────────────────────
  if (phase === 'submitted') {
    const res  = submission?.result || 'pending';
    const info = RESULT_INFO[res] || RESULT_INFO.pending;
    return shell(
      <div style={{ background: '#FFFFFF', border: `1px solid ${info.border}`, borderRadius: 20, padding: 36, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{info.icon}</div>
        <h2 style={{ color: info.color, fontSize: 22, fontWeight: 800, margin: '0 0 6px' }}>{info.text}</h2>
        {submission && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '16px 0 20px', flexWrap: 'wrap' }}>
            {submission.score !== null && submission.score !== undefined && (
              <div style={{ background: '#F3F2F2', borderRadius: 10, padding: '10px 20px' }}>
                <div style={{ color: '#0176D3', fontSize: 22, fontWeight: 700 }}>{submission.score}<span style={{ fontSize: 13 }}>/{submission.maxScore}</span></div>
                <div style={{ color: '#9E9D9B', fontSize: 11 }}>Score</div>
              </div>
            )}
            {submission.percentage !== null && submission.percentage !== undefined && (
              <div style={{ background: '#F3F2F2', borderRadius: 10, padding: '10px 20px' }}>
                <div style={{ color: '#0176D3', fontSize: 22, fontWeight: 700 }}>{submission.percentage}%</div>
                <div style={{ color: '#9E9D9B', fontSize: 11 }}>Percentage</div>
              </div>
            )}
          </div>
        )}
        {res === 'pending' && (
          <p style={{ color: '#706E6B', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
            Your written/code answers are being reviewed by the recruiter. You'll be notified once reviewed.
          </p>
        )}
        {submission?.recruiterReview && (
          <div style={{ background: '#F3F2F2', borderRadius: 10, padding: '12px 16px', margin: '0 0 20px', textAlign: 'left' }}>
            <p style={{ color: '#0176D3', fontSize: 11, fontWeight: 700, margin: '0 0 6px' }}>RECRUITER FEEDBACK</p>
            <p style={{ color: '#3E3E3C', fontSize: 13, margin: 0 }}>{submission.recruiterReview}</p>
          </div>
        )}
        <button onClick={onBack} style={{ background: '#0176D3', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, padding: '12px 32px', cursor: 'pointer', fontSize: 14 }}>
          ← Back to Applications
        </button>
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (phase === 'expired') return shell(
    <div style={{ textAlign: 'center', maxWidth: 400 }}>
      <p style={{ fontSize: 48, margin: '0 0 12px' }}>⌛</p>
      <h3 style={{ color: '#FE5C4C', fontSize: 18, margin: '0 0 10px' }}>Assessment Session Expired</h3>
      <p style={{ color: '#706E6B', fontSize: 13, marginBottom: 24 }}>Your session has timed out or was auto-submitted due to violations. Contact the recruiter if you believe this was an error.</p>
      <button onClick={onBack} style={{ background: '#FAFAF9', border: '1px solid #EAF5FE', borderRadius: 10, color: '#181818', padding: '10px 24px', cursor: 'pointer' }}>← Back to Applications</button>
    </div>
  );

  return null;
}
