import React, { useEffect, useState } from 'react';
import { api } from '../../api/api.js';
import { card, btnP, btnG, btnD } from '../../constants/styles.js';

function SequenceModal({ seq, onClose, onSaved }) {
  const blank = { name: '', isActive: true, steps: [] };
  const [form, setForm] = useState(seq || blank);
  const [saving, setSaving] = useState(false);
  const [stepDraft, setSD] = useState({ delayDays: 1, subject: '', body: '' });

  const addStep = () => {
    if (!stepDraft.subject.trim() || !stepDraft.body.trim()) return;
    setForm(f => ({ ...f, steps: [...f.steps, { ...stepDraft }] }));
    setSD({ delayDays: 1, subject: '', body: '' });
  };
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name?.trim() || !form.steps.length) return;
    setSaving(true);
    const data = { name: form.name, isActive: form.isActive, steps: form.steps };
    const r = form._id ? await api.updateEmailSequence(form._id, data) : await api.createEmailSequence(data);
    onSaved(r);
  };

  const iS = { width: '100%', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 4, boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>{form._id ? 'Edit Sequence' : 'New Email Sequence'}</h3>

        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Sequence Name *</label>
        <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Interview Follow-Up" style={iS} />

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={!!form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
          Active (will send scheduled emails)
        </label>

        <h4 style={{ fontSize: 14, fontWeight: 700, margin: '20px 0 10px', color: '#374151' }}>Email Steps ({form.steps.length})</h4>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 12px' }}>Use {'{{name}}'} in subject/body as a placeholder for the candidate's name.</p>

        {form.steps.map((s, i) => (
          <div key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', marginBottom: 8, position: 'relative' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0A1628', marginBottom: 4 }}>Step {i + 1} · Day {s.delayDays}</div>
            <div style={{ fontSize: 12, color: '#374151', marginBottom: 2 }}>Subject: {s.subject}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.body.slice(0, 80)}…</div>
            <button onClick={() => removeStep(i)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        ))}

        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '14px 16px', marginTop: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#065F46', marginBottom: 10 }}>Add New Step</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: '#6B7280' }}>Send after (days)</label>
              <input type="number" min={0} value={stepDraft.delayDays} onChange={e => setSD(d => ({ ...d, delayDays: Number(e.target.value) }))} style={{ ...iS, marginTop: 2 }} />
            </div>
          </div>
          <label style={{ fontSize: 11, color: '#6B7280' }}>Subject</label>
          <input value={stepDraft.subject} onChange={e => setSD(d => ({ ...d, subject: e.target.value }))} placeholder="e.g. Following up on your interview…" style={iS} />
          <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginTop: 8 }}>Body (HTML allowed)</label>
          <textarea value={stepDraft.body} onChange={e => setSD(d => ({ ...d, body: e.target.value }))} rows={4} placeholder="Hi {{name}}, just wanted to follow up…" style={{ ...iS, resize: 'vertical' }} />
          <button onClick={addStep} style={{ ...btnP, marginTop: 8, fontSize: 13 }}>+ Add Step</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={btnG}>Cancel</button>
          <button onClick={save} disabled={saving || !form.name?.trim() || !form.steps.length} style={btnP}>{saving ? 'Saving…' : 'Save Sequence'}</button>
        </div>
      </div>
    </div>
  );
}

export default function EmailSequences() {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);

  const load = () => {
    api.getEmailSequences().then(data => { setSequences(data || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSaved = () => { setShowModal(false); setEditing(null); load(); };
  const handleDelete = async (id) => {
    if (!confirm('Delete this sequence?')) return;
    await api.deleteEmailSequence(id);
    load();
  };
  const toggleActive = async (seq) => {
    await api.updateEmailSequence(seq._id, { isActive: !seq.isActive });
    load();
  };

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0A1628', margin: 0 }}>Email Sequences</h1>
          <p style={{ color: '#6B7280', fontSize: 14, margin: '4px 0 0' }}>Automated multi-step email follow-ups for candidates</p>
        </div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} style={btnP}>+ New Sequence</button>
      </div>

      {loading ? (
        <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 48 }}>Loading…</div>
      ) : sequences.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 56 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: 6 }}>No sequences yet</div>
          <div style={{ color: '#9CA3AF', fontSize: 13, marginBottom: 20 }}>Create a sequence to automate follow-up emails for candidates</div>
          <button onClick={() => setShowModal(true)} style={btnP}>Create First Sequence</button>
        </div>
      ) : (
        sequences.map(seq => (
          <div key={seq._id} style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: '#0A1628' }}>{seq.name}</span>
                  <span style={{ background: seq.isActive ? '#D1FAE5' : '#F3F4F6', color: seq.isActive ? '#065F46' : '#6B7280', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {seq.isActive ? '✅ Active' : '⏸ Paused'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(seq.steps || []).map((s, i) => (
                    <span key={i} style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 20, padding: '2px 10px', fontSize: 11 }}>
                      Day {s.delayDays}: {s.subject?.slice(0, 30)}{s.subject?.length > 30 ? '…' : ''}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                  {seq.steps?.length} step{seq.steps?.length !== 1 ? 's' : ''} · {(seq.enrollments || []).filter(e => !e.completed).length} active enrollments
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleActive(seq)} style={{ ...btnG, fontSize: 12, padding: '6px 12px' }}>{seq.isActive ? 'Pause' : 'Activate'}</button>
                <button onClick={() => { setEditing(seq); setShowModal(true); }} style={{ ...btnG, fontSize: 12, padding: '6px 12px' }}>Edit</button>
                <button onClick={() => handleDelete(seq._id)} style={{ ...btnD, fontSize: 12, padding: '6px 12px' }}>Delete</button>
              </div>
            </div>
          </div>
        ))
      )}

      {showModal && (
        <SequenceModal
          seq={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
