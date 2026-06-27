import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';

const DIFFICULTIES = ['hard', 'medium', 'easy'];
const TYPES = ['mcq_single', 'mcq_multi', 'truefalse'];
const TYPE_LABELS = { mcq_single: 'MCQ (single answer)', mcq_multi: 'MCQ (multiple answers)', truefalse: 'True / False' };
const DIFF_META = {
  hard:   { color: '#92400E', bg: '#FEF3C7', marks: 2, label: 'Hard' },
  medium: { color: '#5B21B6', bg: '#EDE9FE', marks: 1, label: 'Medium' },
  easy:   { color: '#065F46', bg: '#D1FAE5', marks: 1, label: 'Easy' },
};
const OPT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Option editor ─────────────────────────────────────────────────────────────
function OptionsEditor({ options, onChange, type, locked }) {
  const add = () => onChange([...options, { id: String(Date.now()), text: '', isCorrect: false }]);
  const remove = (id) => onChange(options.filter(o => o.id !== id));
  const upd = (id, val) => onChange(options.map(o => o.id === id ? { ...o, text: val } : o));
  const setCorrect = (id) => {
    if (type === 'mcq_multi') {
      onChange(options.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o));
    } else {
      onChange(options.map(o => ({ ...o, isCorrect: o.id === id })));
    }
  };

  if (locked) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        {options.map(o => (
          <div key={o.id} style={{ flex: 1, background: o.isCorrect ? '#D1FAE5' : '#F9FAFB', border: `1.5px solid ${o.isCorrect ? '#10B981' : '#E5E7EB'}`, borderRadius: 8, padding: '8px 12px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: o.isCorrect ? '#065F46' : '#374151' }}>
            {o.text} {o.isCorrect && '✓'}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {options.map((opt, i) => {
        const letter = OPT_LETTERS[i] || String(i + 1);
        const isCorrectOpt = !!opt.isCorrect;
        return (
          <div key={opt.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <button
              type="button"
              onClick={() => setCorrect(opt.id)}
              title={type === 'mcq_multi' ? 'Toggle correct' : 'Mark as correct'}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: `2px solid ${isCorrectOpt ? '#10B981' : '#D1D5DB'}`,
                background: isCorrectOpt ? '#10B981' : '#fff', color: isCorrectOpt ? '#fff' : '#9CA3AF',
                fontWeight: 800, fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {letter}
            </button>
            <input
              value={opt.text}
              onChange={e => upd(opt.id, e.target.value)}
              placeholder={`Option ${letter}…`}
              style={{ ...inp, flex: 1, padding: '7px 10px', fontSize: 13, borderColor: isCorrectOpt ? '#10B981' : undefined, background: isCorrectOpt ? '#F0FDF4' : undefined }}
            />
            {options.length > 2 && (
              <button onClick={() => remove(opt.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>×</button>
            )}
          </div>
        );
      })}
      {options.length < 6 && (
        <button onClick={add} style={{ ...btnG, fontSize: 12, padding: '5px 12px', marginTop: 4 }}>+ Add Option</button>
      )}
      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
        {type === 'mcq_multi' ? 'Click the circle to toggle correct answers (multiple allowed)' : 'Click the circle to mark the correct answer'}
      </div>
    </div>
  );
}

// ── Candidate preview pane ────────────────────────────────────────────────────
function PreviewPane({ form }) {
  const dm = DIFF_META[form.difficulty] || DIFF_META.medium;
  const correctCount = form.options.filter(o => o.isCorrect).length;
  return (
    <div style={{ background: '#F8FAFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 18, height: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Candidate Preview</div>

      {/* Tags row */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {form.skill && (
          <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{form.skill}</span>
        )}
        <span style={{ background: dm.bg, color: dm.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{dm.label}</span>
        <span style={{ background: '#F1F5F9', color: '#475569', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{form.marks} mark{form.marks !== 1 ? 's' : ''}</span>
      </div>

      {/* Question text */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', lineHeight: 1.6, marginBottom: 14, minHeight: 40 }}>
        {form.text || <span style={{ color: '#D1D5DB', fontStyle: 'italic' }}>Question text will appear here…</span>}
      </div>

      {/* Options preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {form.options.map((opt, i) => {
          const letter = OPT_LETTERS[i] || String(i + 1);
          return (
            <div key={opt.id} style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', opacity: opt.text ? 1 : 0.4 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#6B7280', flexShrink: 0 }}>{letter}</span>
              <span style={{ fontSize: 13, color: '#374151' }}>{opt.text || `Option ${letter}`}</span>
            </div>
          );
        })}
      </div>

      {/* Validation hints */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!form.skill && <div style={{ fontSize: 11, color: '#F59E0B' }}>⚠ No skill selected</div>}
        {!form.text && <div style={{ fontSize: 11, color: '#F59E0B' }}>⚠ Question text is empty</div>}
        {correctCount === 0 && <div style={{ fontSize: 11, color: '#EF4444' }}>✕ No correct answer marked</div>}
        {correctCount > 0 && form.type === 'mcq_single' && correctCount > 1 && <div style={{ fontSize: 11, color: '#EF4444' }}>✕ MCQ single allows only one correct answer</div>}
        {form.options.some(o => !o.text.trim()) && <div style={{ fontSize: 11, color: '#F59E0B' }}>⚠ Some options are empty</div>}
        {correctCount > 0 && form.text && !form.options.some(o => !o.text.trim()) && (
          <div style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>✓ Question looks good</div>
        )}
      </div>
    </div>
  );
}

// ── Question form modal ───────────────────────────────────────────────────────
function QuestionModal({ question, skills, onSave, onClose }) {
  const isEdit = !!question;
  const defaultOpts = question?.options?.length
    ? question.options
    : [{ id: 'a', text: '', isCorrect: true }, { id: 'b', text: '', isCorrect: false }];

  const [form, setForm] = useState({
    skill:       question?.skill || '',
    type:        question?.type  || 'mcq_single',
    difficulty:  question?.difficulty || 'medium',
    text:        question?.text || '',
    options:     defaultOpts,
    marks:       question?.marks ?? (DIFF_META[question?.difficulty || 'medium'].marks),
    explanation: question?.explanation || '',
    isActive:    question?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Preserve truefalse options when switching type away and back, so the
  // correct answer (True or False) is not silently reset to the default.
  const savedTfOpts = React.useRef(null);

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleDifficultyChange = (d) => {
    // Auto-update marks only if user hasn't manually changed them from the default
    const currentDefault = DIFF_META[form.difficulty]?.marks;
    const autoMarks = form.marks === currentDefault ? DIFF_META[d]?.marks ?? form.marks : form.marks;
    setForm(p => ({ ...p, difficulty: d, marks: autoMarks }));
  };

  const handleTypeChange = (t) => {
    setForm(prev => {
      let newOpts = prev.options;
      if (t === 'truefalse') {
        // Restore saved truefalse options (preserves which answer is correct)
        newOpts = savedTfOpts.current || [
          { id: 'true', text: 'True', isCorrect: true },
          { id: 'false', text: 'False', isCorrect: false },
        ];
        savedTfOpts.current = null;
      } else if (prev.type === 'truefalse') {
        savedTfOpts.current = prev.options; // save before resetting
        newOpts = [{ id: 'a', text: '', isCorrect: true }, { id: 'b', text: '', isCorrect: false }];
      }
      return { ...prev, type: t, options: newOpts };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.skill.trim()) e.skill = 'Skill is required';
    if (!form.text.trim()) e.text = 'Question text is required';
    if (form.options.length < 2) e.options = 'At least 2 options required';
    if (!form.options.some(o => o.isCorrect)) e.options = 'Mark at least one correct answer';
    if (form.type === 'mcq_single' && form.options.filter(o => o.isCorrect).length > 1) e.options = 'Single-answer MCQ can only have one correct option';
    if (form.options.some(o => !o.text.trim())) e.options = 'All options must have text';
    return e;
  };

  const save = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, marks: Number(form.marks) || 1 };
      if (isEdit) {
        await api.updateSkillQuestion(question._id || question.id, payload);
      } else {
        await api.createSkillQuestion(payload);
      }
      onSave();
    } catch (err) { setErrors({ save: err.message || 'Save failed' }); }
    setSaving(false);
  };

  const isTrueFalse = form.type === 'truefalse';
  const dm = DIFF_META[form.difficulty] || DIFF_META.medium;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.55)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...card, width: '100%', maxWidth: 960, maxHeight: '92vh', overflow: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>{isEdit ? '✏️' : '➕'}</span>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0A1628' }}>{isEdit ? 'Edit Question' : 'New Question'}</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>Fill in the form — preview updates live on the right</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: 'pointer', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Body: form + preview side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', flex: 1, overflow: 'hidden' }}>

          {/* Left: form */}
          <div style={{ padding: 24, overflow: 'auto', borderRight: '1px solid #E5E7EB' }}>

            {/* Row 1: skill / type / difficulty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Skill *</label>
                <input value={form.skill} onChange={e => { sf('skill', e.target.value); setErrors(p => ({ ...p, skill: '' })); }}
                  list="skill-list-modal" style={{ ...inp, padding: '8px 10px', fontSize: 13, borderColor: errors.skill ? '#EF4444' : undefined }}
                  placeholder="e.g. JavaScript" />
                <datalist id="skill-list-modal">{skills.map(s => <option key={s} value={s} />)}</datalist>
                {errors.skill && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.skill}</div>}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Question Type *</label>
                <select value={form.type} onChange={e => handleTypeChange(e.target.value)} style={{ ...inp, padding: '8px 10px', fontSize: 13 }}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Difficulty *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DIFFICULTIES.map(d => {
                    const m = DIFF_META[d];
                    const active = form.difficulty === d;
                    return (
                      <button key={d} type="button" onClick={() => handleDifficultyChange(d)}
                        style={{ flex: 1, padding: '7px 4px', borderRadius: 8, border: `2px solid ${active ? m.color : '#E5E7EB'}`, background: active ? m.bg : '#fff', color: active ? m.color : '#6B7280', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Question text */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Question Text *</label>
                <span style={{ fontSize: 11, color: form.text.length > 400 ? '#EF4444' : '#9CA3AF' }}>{form.text.length}/500</span>
              </div>
              <textarea value={form.text} onChange={e => { sf('text', e.target.value.slice(0, 500)); setErrors(p => ({ ...p, text: '' })); }}
                rows={3} maxLength={500}
                style={{ ...inp, resize: 'vertical', fontSize: 13, padding: '8px 10px', borderColor: errors.text ? '#EF4444' : undefined }}
                placeholder="Type the question here. You can include code snippets, scenarios, or direct knowledge checks." />
              {errors.text && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 3 }}>{errors.text}</div>}
            </div>

            {/* Options */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  Answer Options * {isTrueFalse ? <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(fixed for True/False)</span> : ''}
                </label>
                {!isTrueFalse && (
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {form.type === 'mcq_multi' ? 'Highlight multiple correct answers' : 'Highlight the one correct answer'}
                  </span>
                )}
              </div>
              <OptionsEditor options={form.options} onChange={v => { sf('options', v); setErrors(p => ({ ...p, options: '' })); }} type={form.type} locked={isTrueFalse} />
              {errors.options && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>{errors.options}</div>}
            </div>

            {/* Marks + Explanation */}
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Marks</label>
                <input type="number" min="1" max="10" value={form.marks} onChange={e => sf('marks', Math.max(1, Math.min(10, Number(e.target.value))))}
                  style={{ ...inp, padding: '8px 10px', fontSize: 13, textAlign: 'center' }} />
                <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2, textAlign: 'center' }}>Default: {dm.marks}</div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Explanation <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(shown to candidates after submission)</span></label>
                <textarea value={form.explanation} onChange={e => sf('explanation', e.target.value)} rows={2}
                  style={{ ...inp, resize: 'vertical', fontSize: 13, padding: '8px 10px' }}
                  placeholder="Explain why the correct answer is right. Helps candidates learn from the assessment." />
              </div>
            </div>

            {/* Active toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 4 }}>
              <div style={{ position: 'relative', width: 36, height: 20 }}>
                <input type="checkbox" checked={form.isActive} onChange={e => sf('isActive', e.target.checked)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: form.isActive ? '#10B981' : '#D1D5DB', transition: 'background 0.2s' }} />
                <div style={{ position: 'absolute', top: 2, left: form.isActive ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{form.isActive ? 'Active' : 'Inactive'}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{form.isActive ? 'Included in live assessments' : 'Hidden from candidates'}</div>
              </div>
            </label>
          </div>

          {/* Right: preview */}
          <div style={{ padding: 20, overflow: 'auto', background: '#F8FAFF' }}>
            <PreviewPane form={form} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid #E5E7EB', background: '#FAFAFA' }}>
          <div>
            {errors.save && <div style={{ fontSize: 13, color: '#EF4444' }}>⚠ {errors.save}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ ...btnG, padding: '9px 20px' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...btnP, padding: '9px 24px', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : isEdit ? '💾 Update Question' : '✅ Add Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────
export default function AdminSkillAssessments() {
  const [activeTab, setTab]      = useState('questions');
  const [questions, setQuestions]= useState([]);
  const [attempts, setAttempts]  = useState([]);
  const [skills, setSkills]      = useState([]);
  const [total, setTotal]        = useState(0);
  const [attTotal, setAttTotal]  = useState(0);
  const [loading, setLoading]    = useState(true);
  const [modal, setModal]        = useState(null);  // null | { question? }
  const [deleting, setDeleting]  = useState(null);
  const [msg, setMsg]            = useState('');
  const [msgIsErr, setMsgIsErr]  = useState(false);

  const [filters, setFilters]  = useState({ skill: '', difficulty: '', page: 1 });
  const [attFilt, setAttFilt]  = useState({ skill: '', status: '', page: 1 });
  const [seeding, setSeeding]  = useState(false);

  const loadQuestions = async (f = filters) => {
    setLoading(true);
    try {
      const res = await api.getSkillQuestions({ ...f, limit: 20 });
      setQuestions(res?.questions || []);
      setTotal(res?.total || 0);
    } catch { setMsg('Failed to load questions'); setMsgIsErr(true); }
    setLoading(false);
  };

  const loadAttempts = async (f = attFilt) => {
    setLoading(true);
    try {
      const res = await api.getSkillAttempts({ ...f, limit: 20 });
      setAttempts(res?.attempts || []);
      setAttTotal(res?.total || 0);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    api.getAvailableSkills().then(r => setSkills(r?.skills || [])).catch(() => {});
    loadQuestions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'attempts') loadAttempts();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSeed = async () => {
    if (!window.confirm('This will seed built-in questions for Sales, Marketing, HR, Communication and more. Safe to run — skips questions that already exist. Continue?')) return;
    setSeeding(true); setMsg(''); setMsgIsErr(false);
    try {
      const res = await api.seedBuiltInSkillQuestions();
      setMsg(`✅ ${res.message || `Seeded ${res.totalInserted} questions across ${res.skillsSeeded?.length || 0} skills`}`);
      setMsgIsErr(false);
      loadQuestions();
      api.getAvailableSkills().then(r => setSkills(r?.skills || [])).catch(() => {});
    } catch (e) { setMsg(e?.message || 'Seed failed'); setMsgIsErr(true); }
    setSeeding(false);
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.deleteSkillQuestion(id);
      setMsg('✅ Question deleted'); setMsgIsErr(false);
      loadQuestions();
    } catch (e) { setMsg(e.message || 'Delete failed'); setMsgIsErr(true); }
    setDeleting(null);
  };

  const DIFF_COLORS = { hard: { bg: '#FEF3C7', color: '#92400E' }, medium: { bg: '#EDE9FE', color: '#5B21B6' }, easy: { bg: '#D1FAE5', color: '#065F46' } };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Skill Assessment Bank</h1>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Manage questions and review candidate assessment attempts</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid #E5E7EB' }}>
        {[['questions', `Questions (${total})`], ['attempts', `Attempts (${attTotal})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '10px 24px', fontSize: 14, fontWeight: 700,
            color: activeTab === t ? '#0176D3' : '#6B7280',
            borderBottom: activeTab === t ? '2px solid #0176D3' : '2px solid transparent',
            marginBottom: -2,
          }}>{label}</button>
        ))}
      </div>

      {msg && (
        <div style={{ background: msgIsErr ? '#FEE2E2' : '#D1FAE5', color: msgIsErr ? '#991B1B' : '#065F46', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          {msg}
          <button onClick={() => { setMsg(''); setMsgIsErr(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filters.skill} onChange={e => { const f = {...filters, skill: e.target.value, page: 1}; setFilters(f); loadQuestions(f); }}
              style={{ ...inp, width: 200, padding: '8px 10px', fontSize: 13 }}>
              <option value="">All Skills</option>
              {skills.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.difficulty} onChange={e => { const f = {...filters, difficulty: e.target.value, page: 1}; setFilters(f); loadQuestions(f); }}
              style={{ ...inp, width: 160, padding: '8px 10px', fontSize: 13 }}>
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={runSeed} disabled={seeding} style={{ ...btnG, padding: '9px 20px', marginRight: 8 }}>
              {seeding ? '⏳ Seeding…' : '🌱 Seed Built-in Questions'}
            </button>
            <button onClick={() => setModal({ question: null })} style={{ ...btnP, padding: '9px 20px' }}>+ Add Question</button>
          </div>

          {loading ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading questions…</div>
          ) : questions.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 16 }}>No questions found.</div>
              <button onClick={runSeed} disabled={seeding} style={{ ...btnP, padding: '10px 24px' }}>
                {seeding ? '⏳ Seeding…' : '🌱 Seed Built-in Questions (Sales, BDM, JavaScript + 25 more)'}
              </button>
            </div>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFF', borderBottom: '1px solid #E5E7EB' }}>
                    {['Skill', 'Difficulty', 'Type', 'Question', 'Marks', 'Active', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {questions.map(q => {
                    const dc = DIFF_COLORS[q.difficulty] || DIFF_COLORS.easy;
                    return (
                      <tr key={q._id || q.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0A1628', whiteSpace: 'nowrap' }}>{q.skill}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: dc.bg, color: dc.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{q.difficulty}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>{TYPE_LABELS[q.type] || q.type}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151', maxWidth: 320 }}>
                          <span title={q.text} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q.text}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151', textAlign: 'center' }}>{q.marks}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: 16 }}>{q.isActive !== false ? '✅' : '❌'}</span>
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                          <button onClick={() => setModal({ question: q })} style={{ ...btnG, padding: '5px 12px', fontSize: 12, marginRight: 6 }}>Edit</button>
                          <button onClick={() => deleteQuestion(q._id || q.id)} disabled={deleting === (q._id || q.id)} style={{ ...btnD, padding: '5px 12px', fontSize: 12 }}>Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {total > 20 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Showing {((filters.page - 1) * 20) + 1}–{Math.min(filters.page * 20, total)} of {total}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { const f = {...filters, page: filters.page - 1}; setFilters(f); loadQuestions(f); }} disabled={filters.page === 1} style={{ ...btnG, padding: '6px 14px', fontSize: 12 }}>← Prev</button>
                    <button onClick={() => { const f = {...filters, page: filters.page + 1}; setFilters(f); loadQuestions(f); }} disabled={filters.page * 20 >= total} style={{ ...btnG, padding: '6px 14px', fontSize: 12 }}>Next →</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ATTEMPTS TAB */}
      {activeTab === 'attempts' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select value={attFilt.skill} onChange={e => { const f = {...attFilt, skill: e.target.value, page: 1}; setAttFilt(f); loadAttempts(f); }}
              style={{ ...inp, width: 200, padding: '8px 10px', fontSize: 13 }}>
              <option value="">All Skills</option>
              {skills.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={attFilt.status} onChange={e => { const f = {...attFilt, status: e.target.value, page: 1}; setAttFilt(f); loadAttempts(f); }}
              style={{ ...inp, width: 160, padding: '8px 10px', fontSize: 13 }}>
              <option value="">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="in_progress">In Progress</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {loading ? (
            <div style={{ ...card, padding: 40, textAlign: 'center', color: '#9CA3AF' }}>Loading attempts…</div>
          ) : attempts.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
              <div style={{ color: '#6B7280', fontSize: 14 }}>No attempts yet.</div>
            </div>
          ) : (
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFF', borderBottom: '1px solid #E5E7EB' }}>
                    {['Candidate', 'Skill', 'Status', 'Score', 'Pass', 'Date'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attempts.map(a => (
                    <tr key={a._id || a.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>{String(a.candidateId).slice(-6)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0A1628' }}>{a.skill}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: a.status === 'submitted' ? '#D1FAE5' : a.status === 'in_progress' ? '#FEF3C7' : '#FEE2E2', color: a.status === 'submitted' ? '#065F46' : a.status === 'in_progress' ? '#92400E' : '#991B1B', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>
                        {a.status === 'submitted' ? `${a.score}/${a.maxScore} (${a.percentage}%)` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 16 }}>
                        {a.status === 'submitted' ? (a.passed ? '✅' : '❌') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>
                        {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : new Date(a.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {modal !== null && (
        <QuestionModal
          question={modal.question}
          skills={skills}
          onSave={() => { setModal(null); loadQuestions(); setMsg(modal.question ? '✅ Question updated.' : '✅ Question added.'); setMsgIsErr(false); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
