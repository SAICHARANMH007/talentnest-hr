import { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Toast from '../../components/ui/Toast.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { card, btnP, btnG, btnD, inp } from '../../constants/styles.js';
import { api } from '../../api/api.js';

const COMPETENCY_PRESETS = ['Technical Skills', 'Problem Solving', 'Communication', 'Culture Fit', 'Leadership', 'Domain Knowledge', 'Behavioural'];
const SQ_TYPES = [
  { value: 'text',             label: 'Text Answer',       hint: 'Candidate types a free-text response' },
  { value: 'yes_no',          label: 'Yes / No',          hint: 'Candidate picks Yes or No' },
  { value: 'multiple_choice', label: 'Multiple Choice',   hint: 'Candidate picks one from your options' },
];

const SL = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 };

function SectionHeader({ title, count, onAdd, addLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
        {count > 0 && <span style={{ background: '#EFF6FF', color: '#0176D3', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{count}</span>}
      </div>
      {onAdd && (
        <button onClick={onAdd} style={{ ...btnP, padding: '4px 12px', fontSize: 11 }}>{addLabel || '+ Add'}</button>
      )}
    </div>
  );
}

function KitModal({ kit, jobs, onClose, onSave }) {
  const isEdit = !!kit;

  // ── Core fields ──────────────────────────────────────────────────────────────
  const [name,      setName]      = useState(kit?.name || '');
  const [desc,      setDesc]      = useState(kit?.description || '');
  const [isDefault, setIsDefault] = useState(kit?.isDefault || false);

  // ── Interview questions ──────────────────────────────────────────────────────
  const [questions, setQuestions] = useState(
    kit?.questions?.length
      ? kit.questions.map(q => ({ competency: q.competency || '', question: q.question || '', scoringTip: q.scoringTip || '', maxScore: q.maxScore || 5 }))
      : [{ competency: '', question: '', scoringTip: '', maxScore: 5 }]
  );

  // ── Screening questions ──────────────────────────────────────────────────────
  const [screeningQs, setScreeningQs] = useState(
    kit?.screeningQuestions?.length
      ? kit.screeningQuestions.map(q => ({
          question      : q.question || '',
          type          : q.type || 'text',
          options       : Array.isArray(q.options) ? q.options.join(', ') : '',
          required      : q.required ?? false,
          knockout      : q.knockout ?? false,
          knockoutAnswer: q.knockoutAnswer || 'no',
        }))
      : []
  );

  // ── Linked jobs ──────────────────────────────────────────────────────────────
  const existingLinked = (kit?.linkedJobIds || []).map(j =>
    typeof j === 'object' ? (j._id || j.id)?.toString() : j?.toString()
  ).filter(Boolean);
  const [linkedJobIds,  setLinkedJobIds]  = useState(existingLinked);
  const [jobSearch,     setJobSearch]     = useState('');
  const [showJobPicker, setShowJobPicker] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  // ── Interview question helpers ────────────────────────────────────────────────
  const addQ    = () => setQuestions(p => [...p, { competency: '', question: '', scoringTip: '', maxScore: 5 }]);
  const removeQ = (i) => setQuestions(p => p.filter((_, j) => j !== i));
  const setQ    = (i, field, val) => setQuestions(p => p.map((q, j) => j === i ? { ...q, [field]: val } : q));

  // ── Screening question helpers ────────────────────────────────────────────────
  const addSQ    = () => setScreeningQs(p => [...p, { question: '', type: 'text', options: '', required: false, knockout: false, knockoutAnswer: 'no' }]);
  const removeSQ = (i) => setScreeningQs(p => p.filter((_, j) => j !== i));
  const setSQ    = (i, field, val) => setScreeningQs(p => p.map((q, j) => j === i ? { ...q, [field]: val } : q));

  // ── Job picker helpers ────────────────────────────────────────────────────────
  const toggleJob = (id) => setLinkedJobIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredJobs = (jobs || []).filter(j => {
    if (!jobSearch.trim()) return true;
    const q = jobSearch.toLowerCase();
    return (j.title || '').toLowerCase().includes(q) || (j.company || j.companyName || '').toLowerCase().includes(q);
  }).slice(0, 30);

  // ── Submit ────────────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!name.trim()) { setErr('Kit name is required'); return; }
    const validQs = questions.filter(q => q.competency.trim() && q.question.trim());
    if (validQs.length === 0) { setErr('Add at least one complete interview question (competency + question text)'); return; }

    const validSQs = screeningQs
      .filter(q => q.question.trim())
      .map(q => ({
        question      : q.question.trim(),
        type          : q.type,
        options       : q.type === 'multiple_choice' ? q.options.split(',').map(o => o.trim()).filter(Boolean) : [],
        required      : q.required,
        knockout      : q.type === 'yes_no' ? q.knockout : false,
        knockoutAnswer: q.type === 'yes_no' && q.knockout ? q.knockoutAnswer : '',
      }));

    setSaving(true);
    setErr('');
    try {
      await onSave({
        name         : name.trim(),
        description  : desc.trim(),
        isDefault,
        questions    : validQs,
        screeningQuestions: validSQs,
        linkedJobIds,
      });
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const linkedNames = linkedJobIds
    .map(id => (jobs || []).find(j => (j._id || j.id)?.toString() === id)?.title)
    .filter(Boolean);

  return (
    <Modal
      wide
      title={isEdit ? '✏️ Edit Interview Kit' : '📋 New Interview Kit'}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', width: '100%' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F3F2F2', color: '#706E6B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ ...btnP, padding: '9px 22px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : isEdit ? '💾 Save Changes' : '✅ Create Kit'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* ── Kit Details ────────────────────────────────────────────────────── */}
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '16px 18px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#0176D3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Kit Details</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={SL}>Kit Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Backend Engineer Kit" style={{ ...inp, fontSize: 13 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#0176D3' }} />
                Set as default
              </label>
            </div>
          </div>
          <div>
            <label style={SL}>Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional — what roles or use-cases is this kit for?" style={{ ...inp, fontSize: 13 }} />
          </div>
        </div>

        {/* ── Linked Jobs ────────────────────────────────────────────────────── */}
        <div>
          <SectionHeader
            title="Linked Jobs"
            count={linkedJobIds.length}
            onAdd={() => setShowJobPicker(p => !p)}
            addLabel={showJobPicker ? '▲ Close' : '🔍 Search Jobs'}
          />
          <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>
            Associate this kit with specific jobs — recruiters scheduling interviews for these jobs will see this kit suggested automatically.
          </p>

          {/* Selected chips */}
          {linkedJobIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {linkedJobIds.map(id => {
                const job = (jobs || []).find(j => (j._id || j.id)?.toString() === id);
                return (
                  <span key={id} style={{ background: '#EFF6FF', color: '#0176D3', border: '1px solid #BFDBFE', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    💼 {job?.title || id}
                    <button onClick={() => toggleJob(id)} style={{ background: 'none', border: 'none', color: '#0176D3', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Job picker */}
          {showJobPicker && (
            <div style={{ background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #E2E8F0' }}>
                <input
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  placeholder="Search by job title or company…"
                  style={{ ...inp, fontSize: 12 }}
                  autoFocus
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filteredJobs.length === 0 ? (
                  <div style={{ padding: '20px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
                    {(jobs || []).length === 0 ? 'No active jobs found.' : 'No jobs match your search.'}
                  </div>
                ) : filteredJobs.map(j => {
                  const jid = (j._id || j.id)?.toString();
                  const checked = linkedJobIds.includes(jid);
                  return (
                    <label key={jid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', background: checked ? 'rgba(1,118,211,0.04)' : 'transparent', borderBottom: '1px solid #F1F5F9' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleJob(jid)} style={{ width: 15, height: 15, accentColor: '#0176D3', flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: checked ? 700 : 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</div>
                        {(j.company || j.companyName) && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{j.company || j.companyName}</div>}
                      </div>
                      {j.status && (
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: j.status === 'active' ? '#059669' : '#9CA3AF', background: j.status === 'active' ? '#F0FDF4' : '#F3F4F6', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>
                          {j.status.toUpperCase()}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Screening Questions ─────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Screening Questions" count={screeningQs.length} onAdd={addSQ} addLabel="+ Add Screening Q" />
          <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>
            Candidates answer these when applying. Use knockout questions to auto-filter applicants who don't meet minimum requirements.
          </p>
          {screeningQs.length === 0 ? (
            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '20px', border: '1px dashed #D1D5DB', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>No screening questions yet — optional but recommended for high-volume roles</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {screeningQs.map((sq, i) => (
                <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <label style={SL}>Question *</label>
                      <input value={sq.question} onChange={e => setSQ(i, 'question', e.target.value)} placeholder="e.g. Are you open to relocating to Bangalore?" style={{ ...inp, fontSize: 12 }} />
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <label style={SL}>Type</label>
                      <select value={sq.type} onChange={e => setSQ(i, 'type', e.target.value)} style={{ ...inp, fontSize: 12, width: 148 }}>
                        {SQ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <button onClick={() => removeSQ(i)} style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, color: '#BA0517', padding: '6px 8px', fontSize: 12, cursor: 'pointer', marginTop: 22, flexShrink: 0 }}>✕</button>
                  </div>

                  {sq.type === 'multiple_choice' && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={SL}>Options <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(comma-separated)</span></label>
                      <input value={sq.options} onChange={e => setSQ(i, 'options', e.target.value)} placeholder="e.g. Less than 1 year, 1–3 years, 3–5 years, 5+ years" style={{ ...inp, fontSize: 12 }} />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                      <input type="checkbox" checked={sq.required} onChange={e => setSQ(i, 'required', e.target.checked)} style={{ accentColor: '#0176D3' }} />
                      Required
                    </label>
                    {sq.type === 'yes_no' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#374151' }}>
                        <input type="checkbox" checked={sq.knockout} onChange={e => setSQ(i, 'knockout', e.target.checked)} style={{ accentColor: '#BA0517' }} />
                        <span style={{ color: sq.knockout ? '#BA0517' : '#374151', fontWeight: sq.knockout ? 700 : 400 }}>Knockout question</span>
                      </label>
                    )}
                    {sq.type === 'yes_no' && sq.knockout && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>Reject if answer is</span>
                        <select value={sq.knockoutAnswer} onChange={e => setSQ(i, 'knockoutAnswer', e.target.value)} style={{ ...inp, width: 80, fontSize: 12, padding: '4px 8px' }}>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: '#9CA3AF' }}>{SQ_TYPES.find(t => t.value === sq.type)?.hint}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Interview Questions ─────────────────────────────────────────────── */}
        <div>
          <SectionHeader title="Interview Questions" count={questions.length} onAdd={addQ} addLabel="+ Add Question" />
          <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>
            Structured questions the interviewer asks during the interview round, each scored against a competency.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((q, i) => (
              <div key={i} style={{ background: '#F8FAFC', borderRadius: 12, padding: '14px 16px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={SL}>Competency *</label>
                    <input value={q.competency} onChange={e => setQ(i, 'competency', e.target.value)} list={`comp-${i}`} placeholder="e.g. Technical Skills" style={{ ...inp, fontSize: 12 }} />
                    <datalist id={`comp-${i}`}>{COMPETENCY_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
                  </div>
                  <div>
                    <label style={SL}>Max Score</label>
                    <select value={q.maxScore} onChange={e => setQ(i, 'maxScore', Number(e.target.value))} style={{ ...inp, fontSize: 12, width: 76 }}>
                      {[3, 4, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  {questions.length > 1 && (
                    <button onClick={() => removeQ(i)} style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, color: '#BA0517', padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}>✕</button>
                  )}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={SL}>Question *</label>
                  <input value={q.question} onChange={e => setQ(i, 'question', e.target.value)} placeholder="Enter the interview question" style={{ ...inp, fontSize: 12 }} />
                </div>
                <div>
                  <label style={SL}>Scoring Tip <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional — helps the interviewer score accurately)</span></label>
                  <input value={q.scoringTip} onChange={e => setQ(i, 'scoringTip', e.target.value)} placeholder="What does a high score look like for this question?" style={{ ...inp, fontSize: 12 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {err && <p style={{ color: '#EF4444', fontSize: 13, margin: 0, background: '#FEF2F2', borderRadius: 8, padding: '10px 14px' }}>{err}</p>}
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminInterviewKits({ user }) {
  const [kits,    setKits]    = useState([]);
  const [jobs,    setJobs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState('');
  const [modal,   setModal]   = useState(null); // null | 'new' | kit object

  const load = useCallback(async () => {
    try {
      const r = await api.getInterviewKits();
      setKits(Array.isArray(r) ? r : (r?.data || []));
    } catch { setKits([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    // Load jobs for the job picker (non-blocking)
    api.getJobs({ limit: 200 })
      .then(r => {
        const list = Array.isArray(r) ? r : (r?.data || r?.jobs || []);
        setJobs(list.map(j => ({ ...j, _id: (j._id || j.id)?.toString(), id: (j._id || j.id)?.toString() })));
      })
      .catch(() => {});
  }, [load]);

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
    <div style={{ padding: '24px 20px', maxWidth: 960, margin: '0 auto' }}>
      <Toast message={toast} onClose={() => setToast('')} />
      <PageHeader
        title="Interview Kits"
        subtitle="Define structured question sets with screening filters for consistent, scored interviews"
        action={<button onClick={() => setModal('new')} style={{ ...btnP, padding: '9px 20px', fontSize: 13 }}>+ New Kit</button>}
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : kits.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <h3 style={{ color: '#1F2937', margin: '0 0 8px', fontWeight: 700 }}>No interview kits yet</h3>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 20px' }}>Create structured question sets with job-specific screening to standardise interviews.</p>
          <button onClick={() => setModal('new')} style={{ ...btnP, padding: '10px 24px' }}>+ Create First Kit</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {kits.map(kit => {
            const linkedJobs = Array.isArray(kit.linkedJobIds) ? kit.linkedJobIds : [];
            const sqCount    = kit.screeningQuestions?.length || 0;
            return (
              <div key={kit._id} style={{ ...card, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>{kit.name}</h3>
                      {kit.isDefault && <span style={{ background: 'rgba(1,118,211,0.1)', color: '#0176D3', border: '1px solid rgba(1,118,211,0.3)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>Default</span>}
                    </div>

                    {kit.description && <p style={{ color: '#6B7280', fontSize: 13, margin: '0 0 10px' }}>{kit.description}</p>}

                    {/* Competency chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {(kit.questions || []).map((q, i) => (
                        <span key={i} style={{ background: '#F1F5F9', color: '#374151', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 500 }}>
                          {q.competency} <span style={{ color: '#9CA3AF' }}>({q.maxScore}pt)</span>
                        </span>
                      ))}
                    </div>

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9CA3AF' }}>📋 {kit.questions?.length || 0} interview questions</span>
                      {sqCount > 0 && <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>🔍 {sqCount} screening question{sqCount !== 1 ? 's' : ''}</span>}
                      {linkedJobs.length > 0 && (
                        <span style={{ fontSize: 11, color: '#0176D3', fontWeight: 600 }}>
                          💼 {linkedJobs.length} job{linkedJobs.length !== 1 ? 's' : ''} linked
                          {linkedJobs.map(j => (typeof j === 'object' ? j.title : null)).filter(Boolean).length > 0 && (
                            <span style={{ color: '#9CA3AF', fontWeight: 400 }}>
                              {' '}— {linkedJobs.filter(j => typeof j === 'object' && j.title).map(j => j.title).join(', ')}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setModal(kit)} style={{ ...btnG, padding: '7px 14px', fontSize: 12 }}>✏️ Edit</button>
                    <button onClick={() => handleDelete(kit)} style={{ ...btnD, padding: '7px 14px', fontSize: 12 }}>Delete</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <KitModal
          kit={modal === 'new' ? null : modal}
          jobs={jobs}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
