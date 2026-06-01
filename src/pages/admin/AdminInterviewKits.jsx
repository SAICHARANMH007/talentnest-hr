import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const COMPETENCY_PRESETS = ['Technical Skills', 'Problem Solving', 'Communication', 'Culture Fit', 'Leadership', 'Domain Knowledge', 'Behavioural'];

function KitModal({ kit, onClose, onSave }) {
  const isEdit = !!kit;
  const [name, setName]       = useState(kit?.name || '');
  const [desc, setDesc]       = useState(kit?.description || '');
  const [isDefault, setIsDefault] = useState(kit?.isDefault || false);
  const [questions, setQuestions] = useState(
    kit?.questions?.length
      ? kit.questions.map(q => ({ competency: q.competency, question: q.question, scoringTip: q.scoringTip || '', maxScore: q.maxScore || 5 }))
      : [{ competency: '', question: '', scoringTip: '', maxScore: 5 }]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const addQ = () => setQuestions(p => [...p, { competency: '', question: '', scoringTip: '', maxScore: 5 }]);
  const removeQ = (i) => setQuestions(p => p.filter((_, j) => j !== i));
  const setQ = (i, field, val) => setQuestions(p => p.map((q, j) => j === i ? { ...q, [field]: val } : q));

  const submit = async () => {
    if (!name.trim()) { setErr('Name is required'); return; }
    const validQs = questions.filter(q => q.competency.trim() && q.question.trim());
    if (validQs.length === 0) { setErr('Add at least one complete question'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave({ name, description: desc, isDefault, questions: validQs });
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,13,26,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#032D60,#0176D3)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>Interview Kits</div>
            <h3 style={{ color: '#fff', margin: 0, fontSize: 16, fontWeight: 800 }}>{isEdit ? '✏️ Edit Kit' : '+ New Interview Kit'}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Kit Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Backend Engineer Kit" style={{ ...inp, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ width: 16, height: 16 }} />
                Default kit
              </label>
            </div>
          </div>
          <div>
            <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional description" style={{ ...inp, fontSize: 13 }} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ color: '#3E3E3C', fontSize: 12, fontWeight: 700 }}>Questions ({questions.length})</label>
              <button onClick={addQ} style={{ ...btnP, padding: '5px 14px', fontSize: 12 }}>+ Add Question</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {questions.map((q, i) => (
                <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2E8F0', position: 'relative' }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Competency *</label>
                      <input
                        value={q.competency}
                        onChange={e => setQ(i, 'competency', e.target.value)}
                        list={`comp-presets-${i}`}
                        placeholder="e.g. Technical Skills"
                        style={{ ...inp, fontSize: 12 }}
                      />
                      <datalist id={`comp-presets-${i}`}>
                        {COMPETENCY_PRESETS.map(p => <option key={p} value={p} />)}
                      </datalist>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <label style={{ color: '#6B7280', fontSize: 11, fontWeight: 600 }}>Max Score</label>
                      <select value={q.maxScore} onChange={e => setQ(i, 'maxScore', Number(e.target.value))} style={{ ...inp, fontSize: 12, width: 72 }}>
                        {[3, 4, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    {questions.length > 1 && (
                      <button onClick={() => removeQ(i)} style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, color: '#BA0517', padding: '4px 8px', fontSize: 12, cursor: 'pointer', alignSelf: 'flex-end' }}>✕</button>
                    )}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <label style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Question *</label>
                    <input value={q.question} onChange={e => setQ(i, 'question', e.target.value)} placeholder="Enter interview question" style={{ ...inp, fontSize: 12 }} />
                  </div>
                  <div>
                    <label style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Scoring Tip (optional)</label>
                    <input value={q.scoringTip} onChange={e => setQ(i, 'scoringTip', e.target.value)} placeholder="What does a high score look like?" style={{ ...inp, fontSize: 12 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {err && <p style={{ color: '#EF4444', fontSize: 13, margin: 0 }}>{err}</p>}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F3F2F2', color: '#706E6B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...btnP, padding: '9px 20px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Kit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInterviewKits({ user }) {
  const [kits, setKits]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | kit object

  const load = useCallback(async () => {
    try {
      const r = await api.getInterviewKits();
      setKits(Array.isArray(r) ? r : (r?.data || []));
    } catch { setKits([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data) => {
    if (modal && modal !== 'new') {
      await api.updateInterviewKit(modal._id, data);
      setToast('✅ Kit updated!');
    } else {
      await api.createInterviewKit(data);
      setToast('✅ Kit created!');
    }
    load();
  };

  const handleDelete = async (kit) => {
    if (!window.confirm(`Delete "${kit.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteInterviewKit(kit._id);
      setToast('✅ Kit deleted');
      load();
    } catch (e) {
      setToast(`❌ ${e.message}`);
    }
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <Toast message={toast} onClose={() => setToast('')} />
      <PageHeader
        title="Interview Kits"
        subtitle="Define structured question sets for consistent, scored interviews"
        action={<button onClick={() => setModal('new')} style={{ ...btnP, padding: '9px 20px', fontSize: 13 }}>+ New Kit</button>}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : kits.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h3 style={{ color: '#1F2937', margin: '0 0 8px', fontWeight: 700 }}>No interview kits yet</h3>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 20px' }}>Create structured question sets to standardise your interviews.</p>
          <button onClick={() => setModal('new')} style={{ ...btnP, padding: '10px 24px' }}>+ Create First Kit</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {kits.map(kit => (
            <div key={kit._id} style={{ ...card, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{kit.name}</h3>
                    {kit.isDefault && <span style={{ background: 'rgba(1,118,211,0.1)', color: '#0176D3', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Default</span>}
                  </div>
                  {kit.description && <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 10px' }}>{kit.description}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(kit.questions || []).map((q, i) => (
                      <span key={i} style={{ background: '#F1F5F9', color: '#374151', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>
                        {q.competency} ({q.maxScore}pt)
                      </span>
                    ))}
                  </div>
                  <p style={{ color: '#9CA3AF', fontSize: 11, margin: '8px 0 0' }}>{kit.questions?.length || 0} questions</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setModal(kit)} style={{ ...btnG, padding: '7px 14px', fontSize: 12 }}>✏️ Edit</button>
                  <button onClick={() => handleDelete(kit)} style={{ ...btnD, padding: '7px 14px', fontSize: 12 }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <KitModal
          kit={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
