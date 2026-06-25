import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';

const DIFFICULTIES = ['hard', 'medium', 'easy'];
const TYPES = ['mcq_single', 'mcq_multi', 'truefalse'];
const TYPE_LABELS = { mcq_single: 'MCQ (single)', mcq_multi: 'MCQ (multi)', truefalse: 'True / False' };

// ── Option editor ─────────────────────────────────────────────────────────────
function OptionsEditor({ options, onChange, type }) {
  const add = () => onChange([...options, { id: String(Date.now()), text: '', isCorrect: false }]);
  const remove = (id) => onChange(options.filter(o => o.id !== id));
  const upd = (id, key, val) => onChange(options.map(o => o.id === id ? { ...o, [key]: val } : o));
  const setCorrect = (id) => {
    if (type === 'mcq_multi') {
      onChange(options.map(o => o.id === id ? { ...o, isCorrect: !o.isCorrect } : o));
    } else {
      onChange(options.map(o => ({ ...o, isCorrect: o.id === id })));
    }
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        Options {type === 'mcq_multi' ? '(multiple correct)' : '(one correct)'}
      </div>
      {options.map((opt, i) => (
        <div key={opt.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <input
            type={type === 'mcq_multi' ? 'checkbox' : 'radio'}
            checked={!!opt.isCorrect}
            onChange={() => setCorrect(opt.id)}
            title="Mark as correct"
          />
          <input
            value={opt.text}
            onChange={e => upd(opt.id, 'text', e.target.value)}
            placeholder={`Option ${i + 1}`}
            style={{ ...inp, flex: 1, padding: '7px 10px', fontSize: 13 }}
          />
          <button onClick={() => remove(opt.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ ...btnG, fontSize: 12, padding: '5px 12px', marginTop: 4 }}>+ Add Option</button>
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
    marks:       question?.marks || 1,
    explanation: question?.explanation || '',
    isActive:    question?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleTypeChange = (t) => {
    if (t === 'truefalse') {
      sf('options', [{ id: 'true', text: 'True', isCorrect: true }, { id: 'false', text: 'False', isCorrect: false }]);
    }
    sf('type', t);
  };

  const save = async () => {
    if (!form.skill.trim() || !form.text.trim()) { setError('Skill and question text are required.'); return; }
    if (form.options.length < 2) { setError('At least 2 options required.'); return; }
    if (!form.options.some(o => o.isCorrect)) { setError('Mark at least one option as correct.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, marks: Number(form.marks) || 1 };
      if (isEdit) {
        await api.updateSkillQuestion(question._id || question.id, payload);
      } else {
        await api.createSkillQuestion(payload);
      }
      onSave();
    } catch (e) { setError(e.message || 'Save failed'); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ ...card, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{isEdit ? 'Edit Question' : 'Add Question'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6B7280' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Skill *</label>
            <input value={form.skill} onChange={e => sf('skill', e.target.value)} list="skill-list"
              style={{ ...inp, padding: '8px 10px', fontSize: 13 }} placeholder="e.g. JavaScript" />
            <datalist id="skill-list">{skills.map(s => <option key={s} value={s} />)}</datalist>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Type *</label>
            <select value={form.type} onChange={e => handleTypeChange(e.target.value)} style={{ ...inp, padding: '8px 10px', fontSize: 13 }}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Difficulty *</label>
            <select value={form.difficulty} onChange={e => sf('difficulty', e.target.value)} style={{ ...inp, padding: '8px 10px', fontSize: 13 }}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Question Text *</label>
          <textarea value={form.text} onChange={e => sf('text', e.target.value)} rows={3}
            style={{ ...inp, resize: 'vertical', fontSize: 13, padding: '8px 10px' }} placeholder="Enter the question…" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <OptionsEditor options={form.options} onChange={v => sf('options', v)} type={form.type} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Marks</label>
            <input type="number" min="1" max="10" value={form.marks} onChange={e => sf('marks', e.target.value)}
              style={{ ...inp, padding: '8px 10px', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Explanation (shown after submission)</label>
            <input value={form.explanation} onChange={e => sf('explanation', e.target.value)}
              style={{ ...inp, padding: '8px 10px', fontSize: 13 }} placeholder="Why is this the correct answer?" />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 18, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isActive} onChange={e => sf('isActive', e.target.checked)} />
          Active (included in assessments)
        </label>

        {error && <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ ...btnG }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ ...btnP }}>{saving ? 'Saving…' : 'Save Question'}</button>
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

  const [filters, setFilters]  = useState({ skill: '', difficulty: '', page: 1 });
  const [attFilt, setAttFilt]  = useState({ skill: '', status: '', page: 1 });
  const [seeding, setSeeding]  = useState(false);

  const loadQuestions = async (f = filters) => {
    setLoading(true);
    try {
      const res = await api.getSkillQuestions({ ...f, limit: 20 });
      setQuestions(res?.questions || []);
      setTotal(res?.total || 0);
    } catch { setMsg('Failed to load questions'); }
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
    if (!window.confirm('This will seed all built-in questions for 28 skills (Sales, BDM, JavaScript, etc.). Safe to run — skips skills that already have enough questions. Continue?')) return;
    setSeeding(true);
    try {
      const res = await api.seedSkillQuestions();
      setMsg(`✅ Seeded ${res.totalInserted} questions across ${res.seeded?.length || 0} skills`);
      loadQuestions();
      api.getAvailableSkills().then(r => setSkills(r?.skills || [])).catch(() => {});
    } catch (e) { setMsg(e.message || 'Seed failed'); }
    setSeeding(false);
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.deleteSkillQuestion(id);
      setMsg('Question deleted');
      loadQuestions();
    } catch (e) { setMsg(e.message || 'Delete failed'); }
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
        <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          {msg}
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>×</button>
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
          onSave={() => { setModal(null); loadQuestions(); setMsg(modal.question ? 'Question updated.' : 'Question added.'); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
