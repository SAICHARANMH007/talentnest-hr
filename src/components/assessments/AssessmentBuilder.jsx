import { useState } from 'react';
import { btnP, btnG } from '../../constants/styles.js';

const TYPE_LABELS = {
  mcq_single: 'MCQ — Single Answer',
  mcq_multi:  'MCQ — Multiple Answers',
  text:       'Text / Paragraph',
  code:       'Code Snippet',
};
const TYPE_ICONS = { mcq_single: '⭕', mcq_multi: '☑️', text: '📝', code: '💻' };

function newQuestion(type) {
  return {
    id: 'q_' + Math.random().toString(36).slice(2),
    type,
    text: '',
    required: true,
    marks: 1,
    options: (type === 'mcq_single' || type === 'mcq_multi')
      ? [
          { id: 'opt_' + Math.random().toString(36).slice(2), text: '', isCorrect: false },
          { id: 'opt_' + Math.random().toString(36).slice(2), text: '', isCorrect: false },
        ]
      : [],
    placeholder: '',
    maxChars: type === 'code' ? 3000 : 2000,
  };
}

function newOption() {
  return { id: 'opt_' + Math.random().toString(36).slice(2), text: '', isCorrect: false };
}

function QuestionCard({ q, index, onChange, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);

  const update = (field, val) => onChange({ ...q, [field]: val });

  const updateOption = (optId, field, val) => {
    const options = q.options.map(o => {
      if (o.id !== optId) {
        // For single-answer, uncheck all others when one is checked
        if (field === 'isCorrect' && val && q.type === 'mcq_single') return { ...o, isCorrect: false };
        return o;
      }
      return { ...o, [field]: val };
    });
    onChange({ ...q, options });
  };

  const addOption = () => onChange({ ...q, options: [...q.options, newOption()] });
  const removeOption = (optId) => onChange({ ...q, options: q.options.filter(o => o.id !== optId) });

  return (
    <div style={{ background: '#FAFAFA', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: collapsed ? 0 : 14 }}>
        <span style={{ color: '#0176D3', fontSize: 12, fontWeight: 700, minWidth: 24 }}>Q{index + 1}</span>
        <span style={{ background: 'rgba(1,118,211,0.12)', color: '#0176D3', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
          {TYPE_ICONS[q.type]} {TYPE_LABELS[q.type]}
        </span>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#706E6B', fontSize: 12 }}>
          {collapsed && q.text ? q.text.slice(0, 60) + (q.text.length > 60 ? '…' : '') : ''}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="number" min="1" max="100" value={q.marks}
            onChange={e => update('marks', Math.max(1, parseInt(e.target.value) || 1))}
            title="Marks"
            style={{ width: 52, padding: '4px 6px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 6, color: '#181818', fontSize: 12, textAlign: 'center' }}
          />
          <span style={{ color: '#9E9D9B', fontSize: 11, alignSelf: 'center' }}>pts</span>
          <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}>
            {collapsed ? '▼' : '▲'}
          </button>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', color: '#FE5C4C', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }} title="Delete question">✕</button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Question text */}
          <textarea
            value={q.text}
            onChange={e => update('text', e.target.value)}
            placeholder="Enter your question here..."
            rows={2}
            style={{ width: '100%', padding: '8px 12px', background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.15)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />

          {/* MCQ Options */}
          {(q.type === 'mcq_single' || q.type === 'mcq_multi') && (
            <div>
              <div style={{ color: '#706E6B', fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                OPTIONS — {q.type === 'mcq_single' ? 'select one correct answer' : 'select all correct answers'}
              </div>
              {q.options.map((opt, oi) => (
                <div key={opt.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  {q.type === 'mcq_single' ? (
                    <input type="radio" checked={opt.isCorrect} onChange={() => updateOption(opt.id, 'isCorrect', true)}
                      title="Mark as correct" style={{ accentColor: '#10b981', flexShrink: 0 }} />
                  ) : (
                    <input type="checkbox" checked={opt.isCorrect} onChange={e => updateOption(opt.id, 'isCorrect', e.target.checked)}
                      title="Mark as correct" style={{ accentColor: '#10b981', flexShrink: 0 }} />
                  )}
                  <input
                    value={opt.text}
                    onChange={e => updateOption(opt.id, 'text', e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    style={{ flex: 1, padding: '6px 10px', background: opt.isCorrect ? 'rgba(16,185,129,0.08)' : '#FFFFFF', border: `1px solid ${opt.isCorrect ? 'rgba(16,185,129,0.3)' : '#DDDBDA'}`, borderRadius: 6, color: opt.isCorrect ? '#34d399' : '#181818', fontSize: 12, outline: 'none' }}
                  />
                  {q.options.length > 2 && (
                    <button onClick={() => removeOption(opt.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}>✕</button>
                  )}
                </div>
              ))}
              {q.options.length < 8 && (
                <button onClick={addOption} style={{ ...btnG, padding: '5px 12px', fontSize: 11, marginTop: 4 }}>+ Add Option</button>
              )}
            </div>
          )}

          {/* Text / Code settings */}
          {(q.type === 'text' || q.type === 'code') && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#706E6B', fontSize: 11, display: 'block', marginBottom: 4 }}>Placeholder hint</label>
                <input value={q.placeholder || ''} onChange={e => update('placeholder', e.target.value)}
                  placeholder={q.type === 'code' ? 'e.g. Write a function that...' : 'e.g. Describe your approach...'}
                  style={{ width: '100%', padding: '6px 10px', background: '#FFFFFF', border: '1px solid #DDDBDA', borderRadius: 6, color: '#181818', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ width: 100 }}>
                <label style={{ color: '#706E6B', fontSize: 11, display: 'block', marginBottom: 4 }}>Max chars</label>
                <input type="number" min="100" max="10000" value={q.maxChars || 2000}
                  onChange={e => update('maxChars', Math.max(100, parseInt(e.target.value) || 2000))}
                  style={{ width: '100%', padding: '6px 10px', background: '#FFFFFF', border: '1px solid #DDDBDA', borderRadius: 6, color: '#181818', fontSize: 12, outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* Required toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={q.required} onChange={e => update('required', e.target.checked)} style={{ accentColor: '#0176D3' }} />
            <span style={{ color: '#706E6B', fontSize: 12 }}>Required question</span>
          </label>
        </div>
      )}
    </div>
  );
}

export default function AssessmentBuilder({ questions, onChange, disabled }) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const qs = Array.isArray(questions) ? questions : [];
  const totalMarks = qs.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

  const addQuestion = (type) => {
    setShowAddMenu(false);
    onChange([...qs, newQuestion(type)]);
  };

  const updateQuestion = (idx, updated) => {
    const next = [...qs];
    next[idx] = updated;
    onChange(next);
  };

  const deleteQuestion = (idx) => onChange(qs.filter((_, i) => i !== idx));

  if (disabled) return (
    <div style={{ color: '#9E9D9B', fontSize: 13, padding: '12px 0' }}>
      Save the job first to add assessment questions.
    </div>
  );

  return (
    <div>
      {qs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#706E6B', fontSize: 13 }}>
          No questions yet. Add your first question below.
        </div>
      )}

      {qs.map((q, i) => (
        <QuestionCard
          key={q.id}
          q={q}
          index={i}
          total={qs.length}
          onChange={(updated) => updateQuestion(i, updated)}
          onDelete={() => deleteQuestion(i)}
        />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            disabled={qs.length >= 50}
            style={{ ...btnP, padding: '8px 16px', fontSize: 12, opacity: qs.length >= 50 ? 0.5 : 1 }}
          >
            + Add Question
          </button>
          {showAddMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#F3F2F2', border: '1px solid rgba(1,118,211,0.25)', borderRadius: 10, zIndex: 100, minWidth: 210, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
              {Object.entries(TYPE_LABELS).map(([type, label]) => (
                <button key={type} onClick={() => addQuestion(type)}
                  style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: '#181818', fontSize: 13, cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F3F2F2' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(1,118,211,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {TYPE_ICONS[type]} {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {qs.length > 0 && (
          <span style={{ color: '#9E9D9B', fontSize: 12 }}>
            {qs.length} question{qs.length !== 1 ? 's' : ''} · {totalMarks} total mark{totalMarks !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
